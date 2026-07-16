"""Offline pre-computation of booth-demo transit routes (Static Route Cache).

Standalone script -- NOT part of the running FastAPI app and NOT wired into
``GET /search``. It pre-computes transit routes between a handful of
hardcoded demo origins (candidate home locations for the booth) and every
``Company`` location in the database, then writes the results to
``backend/booth_route_cache.json`` for O(1) lookup at demo time. This avoids
live Google Routes API cost/latency during the actual booth demo.

Uses the **Routes API** (``computeRoutes``), NOT the legacy Directions API.
The legacy ``maps.googleapis.com/maps/api/directions/json`` endpoint returns
``REQUEST_DENIED`` on Cloud projects created after the legacy APIs were
deprecated ("You're calling a legacy API, which is not enabled for your
project"), which this script previously mis-cached as "no route available"
for every single pair. The Routes API is the current, supported replacement:
https://developers.google.com/maps/documentation/routes/transit-route

Data flow:
1. Load ``DEMO_ORIGINS`` (1-3 hardcoded lat/lng pairs).
2. Query all ``Company`` rows via the existing async SQLAlchemy session
   (``app.db.session``), reusing the app's ``DATABASE_URL`` configuration.
3. For every (demo origin, company) pair, POST to
   ``routes.googleapis.com/directions/v2:computeRoutes`` with
   ``travelMode="TRANSIT"`` and ``departureTime`` set to next Monday 08:00
   Bangkok time (typical morning rush hour, converted to UTC/RFC3339), with
   retries on 5xx and a mandatory sleep between calls to respect QPS limits.
4. Extract total transit duration (minutes) and step-level segments mapped to
   ``{"mode": ..., "minutes": ...}`` (matching the frontend ``TransitSegment``
   schema).
5. Persist incrementally to ``booth_route_cache.json`` as a flat
   ``"origin_lat,origin_lng_company_lat,company_lng" -> {...} | null`` map, so
   interrupted runs resume without re-requesting already-resolved pairs, and
   pairs with no available transit route are cached as ``null`` (not retried).

Usage (from the ``backend/`` directory, with ``backend/.env`` configured):

    python -m scripts.generate_route_cache

Required environment variables (see ``backend/.env``):
    GOOGLE_API_KEY   -- API key with the **Routes API** enabled (Google Cloud
                        Console > APIs & Services > Library > "Routes API").
    DATABASE_URL     -- Async SQLAlchemy URL (reused from app.config/.env).
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

# Allow running this file directly (``python scripts/generate_route_cache.py``)
# as well as via ``python -m scripts.generate_route_cache`` by ensuring the
# backend/ package root is importable either way.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

# Load backend/.env explicitly so GOOGLE_API_KEY (which is not part of
# app.config.Settings) is available via os.getenv, in addition to whatever
# app.db.session/app.config already load for DATABASE_URL.
load_dotenv(_BACKEND_ROOT / ".env")

from sqlalchemy import select  # noqa: E402

from app.db.session import async_session_factory  # noqa: E402
from app.models import Company  # noqa: E402
from app.services.booth_cache import build_cache_key  # noqa: E402

# --- Configuration ----------------------------------------------------

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
# Field mask requesting only what we extract: total duration plus each step's
# travel mode, static (schedule-independent) duration, and transit line/vehicle
# details when the step is a TRANSIT leg. Routes API requires an explicit field
# mask -- there is no default field set (unlike the legacy Directions API).
GOOGLE_FIELD_MASK = (
    "routes.duration,"
    "routes.legs.steps.travelMode,"
    "routes.legs.steps.staticDuration,"
    "routes.legs.steps.transitDetails.transitLine.vehicle,"
    "routes.legs.steps.transitDetails.transitLine.nameShort,"
    "routes.legs.steps.transitDetails.transitLine.name"
)
OUTPUT_PATH = _BACKEND_ROOT / "booth_route_cache.json"

# Bangkok has no DST; a fixed UTC+7 offset avoids a dependency on the tzdata
# package (zoneinfo's "Asia/Bangkok" is unavailable on some Windows Python
# installs without the optional tzdata wheel installed).
_BANGKOK_UTC_OFFSET = timezone(timedelta(hours=7))

# Mandatory pause between Directions API calls to respect Google's QPS limits.
REQUEST_SLEEP_S = 1.5
# Retry budget for 5xx / transient network errors, with linear backoff.
MAX_RETRIES = 3
RETRY_BACKOFF_S = 2.0

# Candidate home locations for the booth demo (1-3 hardcoded lat/lng pairs).
# Replace with the actual candidate's real home coordinates before the demo.
# (13.7745, 100.5392) matches the frontend's DEFAULT_HOME
# (frontend/src/screens/JobDiscoveryScreen.tsx) so the booth demo cache covers
# the coordinate the app actually loads with by default.
DEMO_ORIGINS: list[tuple[float, float]] = [
    (13.7745, 100.5392),  # Frontend default home (ย่านอารีย์-ish)
    (13.7563, 100.5018),  # Siam / central Bangkok
    (13.7300, 100.5750),  # On Nut area
    (13.8000, 100.5500),  # Chatuchak area
]


def _next_monday_8am() -> datetime:
    """Return next Monday 08:00 Bangkok time (typical morning rush hour) as
    a timezone-aware ``datetime`` (UTC+7, no DST in Thailand).

    If today is already Monday, rolls forward to *next* Monday (7 days out)
    rather than today, since the cache is meant to represent a typical future
    commute, not one that may already be in the past today.
    """
    now = datetime.now(_BANGKOK_UTC_OFFSET)
    days_ahead = (7 - now.weekday()) % 7  # Monday == weekday() 0
    if days_ahead == 0:
        days_ahead = 7
    next_monday = now + timedelta(days=days_ahead)
    return next_monday.replace(hour=8, minute=0, second=0, microsecond=0)


def _cache_key(origin: tuple[float, float], destination: tuple[float, float]) -> str:
    """Build the ``"origin_lat,origin_lng_company_lat,company_lng"`` cache key.

    Delegates to :func:`app.services.booth_cache.build_cache_key`, the single
    source of truth for the key format, so the writer here (Phase 1) and the
    Phase 2 interceptor reader can never disagree on rounding/formatting.
    """
    return build_cache_key(origin, destination)


def _parse_iso_seconds(value: str | None) -> float:
    """Parse a Routes API duration string like ``"1020s"`` into seconds.

    Returns ``0.0`` for ``None``/malformed input rather than raising, since a
    missing per-step duration should not abort extraction of the rest of the
    route.
    """
    if not value or not value.endswith("s"):
        return 0.0
    try:
        return float(value[:-1])
    except ValueError:
        return 0.0


def _fetch_directions(
    origin: tuple[float, float],
    destination: tuple[float, float],
    departure_time_rfc3339: str,
) -> dict[str, Any] | None:
    """Call the Routes API ``computeRoutes`` for one transit origin/destination.

    Retries on 5xx responses and network errors with linear backoff, up to
    ``MAX_RETRIES`` attempts. Returns the parsed JSON payload for any
    successfully received response, including HTTP 200 with an empty ``{}``
    body -- the Routes API's way of saying no route was found (no top-level
    ``status`` field the way the legacy Directions API had one), which the
    caller distinguishes from a hard failure. A non-2xx response (e.g. 400
    ``INVALID_ARGUMENT`` or 403 ``PERMISSION_DENIED`` for an API/billing
    misconfiguration) is treated as a hard failure and logged with the
    response body so a misconfigured project is diagnosable immediately
    rather than silently cached as "no route" for every pair. Returns
    ``None`` only when the call could not be completed at all (retries
    exhausted, a non-retryable transport error, or a non-2xx status), so the
    caller knows to leave that pair out of the cache and retry it on a
    subsequent run instead of permanently recording it as "no route".
    """
    body = {
        "origin": {
            "location": {
                "latLng": {"latitude": origin[0], "longitude": origin[1]}
            }
        },
        "destination": {
            "location": {
                "latLng": {"latitude": destination[0], "longitude": destination[1]}
            }
        },
        "travelMode": "TRANSIT",
        "departureTime": departure_time_rfc3339,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.post(
                GOOGLE_ROUTES_COMPUTE_URL, json=body, headers=headers, timeout=10
            )
        except requests.RequestException as exc:
            print(f"    request error (attempt {attempt}/{MAX_RETRIES}): {exc}")
            time.sleep(RETRY_BACKOFF_S * attempt)
            continue

        if 500 <= response.status_code < 600:
            print(
                f"    server error {response.status_code} "
                f"(attempt {attempt}/{MAX_RETRIES})"
            )
            time.sleep(RETRY_BACKOFF_S * attempt)
            continue

        if response.status_code != 200:
            print(
                f"    non-200 status {response.status_code}, giving up on "
                f"this pair. Body: {response.text[:500]}"
            )
            return None

        try:
            return response.json()
        except ValueError:
            print("    non-JSON response body, giving up on this pair")
            return None

    print(f"    exhausted {MAX_RETRIES} retries, giving up on this pair")
    return None


def merge_consecutive_segments(
    raw_segments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Collapse consecutive same-mode legs into one summed segment.

    The Routes API reports every individual walking maneuver (e.g. "walk to
    the corner", "walk across the street", "walk to the platform") as its own
    step, so a single real-world walking leg can arrive as 5-10 raw ``WALK``
    steps in a row. Rendering each one as a separate Transit_Chain_Row
    segment overflowed the Job_Card (a dozen tiny icon+duration pairs per
    job). This merges any run of consecutive segments sharing the same
    ``mode`` label into a single segment whose ``minutes`` is their sum,
    preserving overall order -- so "Walk 2 + Walk 3 + Walk 1" becomes one
    "Walk 6" segment, while a transit leg sandwiched between two walk runs
    still produces exactly 3 segments (walk, transit, walk).
    """
    merged: list[dict[str, Any]] = []
    for seg in raw_segments:
        if merged and merged[-1]["mode"] == seg["mode"]:
            merged[-1]["minutes"] += seg["minutes"]
        else:
            merged.append(dict(seg))
    return merged


def _extract_route(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Extract ``{"duration_mins", "segments"}`` from a computeRoutes payload.

    Returns ``None`` when Google reports no usable route -- an empty ``{}``
    body, no ``routes`` array, or no legs -- which callers cache as ``null``
    per the task's "no route available" handling.

    Consecutive same-mode raw steps (almost always a run of ``WALK``
    maneuvers) are merged into one summed segment via
    :func:`merge_consecutive_segments` before being cached, so the cached
    segment list matches what the Transit_Chain_Row is designed to render
    (a handful of mode+duration legs, not one per individual walking step).
    """
    routes = payload.get("routes") or []
    if not routes:
        return None

    legs = routes[0].get("legs") or []
    if not legs:
        return None

    total_duration_s = _parse_iso_seconds(routes[0].get("duration"))
    duration_mins = int(round(total_duration_s / 60.0))

    raw_segments: list[dict[str, Any]] = []
    for leg in legs:
        for step in leg.get("steps", []):
            travel_mode = step.get("travelMode")
            step_duration_s = _parse_iso_seconds(step.get("staticDuration"))
            step_minutes = int(round(step_duration_s / 60.0))

            if travel_mode == "TRANSIT":
                transit_details = step.get("transitDetails") or {}
                line = transit_details.get("transitLine") or {}
                vehicle = line.get("vehicle") or {}
                vehicle_name = vehicle.get("name") or {}
                mode_label = (
                    vehicle_name.get("text")
                    or vehicle.get("type")
                    or line.get("nameShort")
                    or line.get("name")
                    or "Transit"
                )
            else:
                mode_label = travel_mode.capitalize() if travel_mode else "Unknown"

            raw_segments.append({"mode": mode_label, "minutes": step_minutes})

    segments = merge_consecutive_segments(raw_segments)

    return {"duration_mins": duration_mins, "segments": segments}


async def _fetch_companies() -> list[tuple[int, float, float]]:
    """Query all valid ``Company`` locations from the database.

    Reuses the app's async session factory (``app.db.session``), which is
    already configured from ``DATABASE_URL`` via ``app.config.settings``, so
    this script never duplicates connection logic. "Valid" excludes rows with
    a null latitude/longitude.
    """
    async with async_session_factory() as session:
        result = await session.execute(
            select(Company.id, Company.latitude, Company.longitude)
        )
        return [
            (row.id, float(row.latitude), float(row.longitude))
            for row in result.all()
            if row.latitude is not None and row.longitude is not None
        ]


def _load_existing_cache() -> dict[str, Any]:
    """Load ``booth_route_cache.json`` if present, else an empty cache."""
    if OUTPUT_PATH.exists():
        try:
            return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"WARNING: could not read existing cache ({exc}); starting fresh.")
            return {}
    return {}


def _save_cache(cache: dict[str, Any]) -> None:
    """Persist the cache to disk, overwriting the previous file."""
    OUTPUT_PATH.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8"
    )


async def main() -> None:
    if not GOOGLE_API_KEY:
        print(
            "WARNING: GOOGLE_API_KEY is not set (add it to backend/.env). "
            "All Directions API calls will fail."
        )

    companies = await _fetch_companies()
    print(f"Loaded {len(companies)} valid company location(s) from the database.")

    departure_dt = _next_monday_8am()
    # Routes API requires RFC3339 UTC "Zulu" format, e.g. "2026-07-20T01:00:00Z".
    departure_rfc3339 = (
        departure_dt.astimezone(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )
    print(
        f"Using transit departureTime = {departure_dt.isoformat()} "
        f"({departure_rfc3339})"
    )

    cache = _load_existing_cache()
    print(f"Loaded {len(cache)} cached route(s) from {OUTPUT_PATH.name}.")

    total_pairs = len(DEMO_ORIGINS) * len(companies)
    print(f"Pre-computing up to {total_pairs} origin-company route(s)...")

    resolved = 0
    skipped_cached = 0
    skipped_failed = 0
    pair_index = 0

    for origin in DEMO_ORIGINS:
        for company_id, company_lat, company_lng in companies:
            pair_index += 1
            destination = (company_lat, company_lng)
            key = _cache_key(origin, destination)

            if key in cache:
                skipped_cached += 1
                continue

            print(
                f"[{pair_index}/{total_pairs}] origin={origin} "
                f"company_id={company_id} dest={destination}"
            )
            payload = _fetch_directions(origin, destination, departure_rfc3339)

            if payload is None:
                # Hard failure (retries exhausted / transport error): do NOT
                # cache, so this pair is retried on the next run instead of
                # being permanently marked as "no route".
                skipped_failed += 1
                time.sleep(REQUEST_SLEEP_S)
                continue

            route = _extract_route(payload)
            cache[key] = route  # None (no transit route) is cached as null.
            resolved += 1

            status = "OK" if route else "NO ROUTE (cached as null)"
            print(f"    -> {status}")

            _save_cache(cache)  # persist incrementally so progress isn't lost
            time.sleep(REQUEST_SLEEP_S)  # mandatory QPS-respecting delay

    print(
        f"Done. Resolved {resolved} new pair(s), skipped {skipped_cached} "
        f"already-cached pair(s), {skipped_failed} pair(s) failed and will be "
        "retried on the next run."
    )
    print(f"Cache written to {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
