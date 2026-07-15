"""Offline pre-computation of booth-demo transit routes (Static Route Cache).

Standalone script -- NOT part of the running FastAPI app and NOT wired into
``GET /search``. It pre-computes Google Directions transit routes between a
handful of hardcoded demo origins (candidate home locations for the booth) and
every ``Company`` location in the database, then writes the results to
``backend/booth_route_cache.json`` for O(1) lookup at demo time. This avoids
live Google Directions API cost/latency during the actual booth demo.

Data flow:
1. Load ``DEMO_ORIGINS`` (1-3 hardcoded lat/lng pairs).
2. Query all ``Company`` rows via the existing async SQLAlchemy session
   (``app.db.session``), reusing the app's ``DATABASE_URL`` configuration.
3. For every (demo origin, company) pair, call the Google Directions API with
   ``mode=transit`` and ``departure_time`` set to next Monday 08:00 local time
   (typical morning rush hour), with retries on 5xx and a mandatory sleep
   between calls to respect QPS limits.
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
    GOOGLE_API_KEY   -- API key enabled for the Google Directions API.
    DATABASE_URL     -- Async SQLAlchemy URL (reused from app.config/.env).
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timedelta
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

# --- Configuration ----------------------------------------------------

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
OUTPUT_PATH = _BACKEND_ROOT / "booth_route_cache.json"

# Mandatory pause between Directions API calls to respect Google's QPS limits.
REQUEST_SLEEP_S = 1.5
# Retry budget for 5xx / transient network errors, with linear backoff.
MAX_RETRIES = 3
RETRY_BACKOFF_S = 2.0

# Candidate home locations for the booth demo (1-3 hardcoded lat/lng pairs).
# Replace with the actual candidate's real home coordinates before the demo.
DEMO_ORIGINS: list[tuple[float, float]] = [
    (13.7563, 100.5018),  # Siam / central Bangkok
    (13.7300, 100.5750),  # On Nut area
    (13.8000, 100.5500),  # Chatuchak area
]


def _next_monday_8am() -> datetime:
    """Return the local datetime for next Monday at 08:00 (morning rush hour).

    If today is already Monday, rolls forward to *next* Monday (7 days out)
    rather than today, since the cache is meant to represent a typical future
    commute, not one that may already be in the past today.
    """
    now = datetime.now()
    days_ahead = (7 - now.weekday()) % 7  # Monday == weekday() 0
    if days_ahead == 0:
        days_ahead = 7
    next_monday = now + timedelta(days=days_ahead)
    return next_monday.replace(hour=8, minute=0, second=0, microsecond=0)


def _cache_key(origin: tuple[float, float], destination: tuple[float, float]) -> str:
    """Build the ``"origin_lat,origin_lng_company_lat,company_lng"`` cache key."""
    return f"{origin[0]},{origin[1]}_{destination[0]},{destination[1]}"


def _fetch_directions(
    origin: tuple[float, float],
    destination: tuple[float, float],
    departure_ts: int,
) -> dict[str, Any] | None:
    """Call the Google Directions API for one origin/destination transit route.

    Retries on 5xx responses and network errors with linear backoff, up to
    ``MAX_RETRIES`` attempts. Returns the parsed JSON payload for any
    successfully received (2xx/4xx) response -- including a Google-side
    ``status`` of ``"ZERO_RESULTS"``, which the caller distinguishes from a
    hard failure. Returns ``None`` only when the call could not be completed
    at all (retries exhausted, or a non-retryable transport error), so the
    caller knows to leave that pair out of the cache and retry it on a
    subsequent run instead of permanently recording it as "no route".
    """
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "mode": "transit",
        "departure_time": departure_ts,
        "key": GOOGLE_API_KEY,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(GOOGLE_DIRECTIONS_URL, params=params, timeout=10)
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
            print(f"    non-200 status {response.status_code}, giving up on this pair")
            return None

        try:
            return response.json()
        except ValueError:
            print("    non-JSON response body, giving up on this pair")
            return None

    print(f"    exhausted {MAX_RETRIES} retries, giving up on this pair")
    return None


def _extract_route(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Extract ``{"duration_mins", "segments"}`` from a Directions payload.

    Returns ``None`` when Google reports no usable route (top-level status
    other than ``"OK"``, or no routes/legs present) -- callers cache this as
    ``null`` per the task's "no route available" handling.
    """
    if payload.get("status") != "OK":
        return None

    routes = payload.get("routes") or []
    if not routes:
        return None

    legs = routes[0].get("legs") or []
    if not legs:
        return None

    leg = legs[0]
    duration_value = leg.get("duration", {}).get("value")
    if duration_value is None:
        return None
    duration_mins = int(round(duration_value / 60.0))

    segments: list[dict[str, Any]] = []
    for step in leg.get("steps", []):
        travel_mode = step.get("travel_mode")
        step_duration_s = step.get("duration", {}).get("value", 0)
        step_minutes = int(round(step_duration_s / 60.0))

        if travel_mode == "TRANSIT":
            transit_details = step.get("transit_details") or {}
            line = transit_details.get("line") or {}
            vehicle = line.get("vehicle") or {}
            mode_label = (
                vehicle.get("name")
                or vehicle.get("type")
                or line.get("short_name")
                or "Transit"
            )
        else:
            mode_label = travel_mode.capitalize() if travel_mode else "Unknown"

        segments.append({"mode": mode_label, "minutes": step_minutes})

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
    departure_ts = int(departure_dt.timestamp())
    print(
        f"Using transit departure_time = {departure_dt.isoformat()} "
        f"(epoch {departure_ts})"
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
            payload = _fetch_directions(origin, destination, departure_ts)

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
