"""Quick cache generator that reads companies from CSV and fetches routes.

This is a simpler alternative when the database connection is unavailable.
It reads companies directly from the CSV dataset instead of querying the DB.

Usage::

    cd backend
    .venv\\Scripts\\activate.bat
    python scripts/generate_cache_from_csv.py
"""

import asyncio
import csv
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

# Load .env
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_ROOT / ".env")

# Add booth_cache to path for import
sys.path.insert(0, str(_BACKEND_ROOT))
from app.services.booth_cache import build_cache_key

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
GOOGLE_FIELD_MASK = (
    "routes.duration,"
    "routes.legs.steps.travelMode,"
    "routes.legs.steps.staticDuration,"
    "routes.legs.steps.transitDetails.transitLine.vehicle,"
    "routes.legs.steps.transitDetails.transitLine.nameShort,"
    "routes.legs.steps.transitDetails.transitLine.name"
)
OUTPUT_PATH = _BACKEND_ROOT / "booth_route_cache.json"
CSV_PATH = _BACKEND_ROOT.parent / "datasets" / "company_locations_cleaned_ready.csv"

_BANGKOK_UTC_OFFSET = timezone(timedelta(hours=7))
REQUEST_SLEEP_S = 1.5
MAX_RETRIES = 3
RETRY_BACKOFF_S = 2.0

# Frontend default home + additional demo origins
DEMO_ORIGINS: list[tuple[float, float]] = [
    (13.7745, 100.5392),  # Frontend default home
    (13.7563, 100.5018),  # Siam
    (13.7300, 100.5750),  # On Nut
    (13.8000, 100.5500),  # Chatuchak
]


def _next_monday_8am() -> datetime:
    """Next Monday 08:00 Bangkok time as UTC."""
    now = datetime.now(_BANGKOK_UTC_OFFSET)
    days_ahead = 0 - now.weekday()  # Monday is 0
    if days_ahead <= 0:
        days_ahead += 7
    monday = now + timedelta(days=days_ahead)
    monday_8am = monday.replace(hour=8, minute=0, second=0, microsecond=0)
    return monday_8am


def _fetch_directions(origin: tuple[float, float], destination: tuple[float, float]) -> dict[str, Any] | None:
    """Fetch one route from the Routes API with retries."""
    departure_time = _next_monday_8am()
    departure_iso = departure_time.isoformat().replace("+07:00", "Z")

    payload = {
        "origin": {"location": {"latLng": {"latitude": origin[0], "longitude": origin[1]}}},
        "destination": {"location": {"latLng": {"latitude": destination[0], "longitude": destination[1]}}},
        "travelMode": "TRANSIT",
        "departureTime": departure_iso,
        # NOTE: "routingPreference" is only valid for DRIVE/TWO_WHEELER travel
        # modes; the Routes API rejects it with HTTP 400 INVALID_ARGUMENT when
        # travelMode is TRANSIT, which previously mis-cached every new pair as
        # "no route available" (null) instead of fetching the real route.
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(GOOGLE_ROUTES_COMPUTE_URL, json=payload, headers=headers, timeout=15)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code >= 500:
                sleep_time = RETRY_BACKOFF_S * (attempt + 1)
                print(f"  {resp.status_code} on attempt {attempt + 1}, sleeping {sleep_time}s...", flush=True)
                time.sleep(sleep_time)
            else:
                print(f"  {resp.status_code}: {resp.text[:200]}", flush=True)
                return None
        except requests.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                sleep_time = RETRY_BACKOFF_S * (attempt + 1)
                print(f"  Request failed: {e}, sleeping {sleep_time}s...", flush=True)
                time.sleep(sleep_time)
            else:
                print(f"  Final attempt failed: {e}", flush=True)
                return None

    return None


def _extract_route(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Extract duration and segments from the Routes API response."""
    if "routes" not in payload or not payload["routes"]:
        return None

    route = payload["routes"][0]
    if "duration" not in route:
        return None

    duration_str = route["duration"]  # e.g. "1800s"
    duration_secs = int(duration_str.rstrip("s"))
    duration_mins = round(duration_secs / 60)

    segments = []
    legs = route.get("legs", [])
    for leg in legs:
        for step in leg.get("steps", []):
            mode = step.get("travelMode", "")
            static_duration = step.get("staticDuration", "0s")
            step_secs = int(static_duration.rstrip("s"))
            step_mins = round(step_secs / 60)

            if step_mins > 0:
                mode_display = mode.replace("_", " ").title()
                segments.append({"mode": mode_display, "minutes": step_mins})

    return {"duration_mins": duration_mins, "segments": segments}


def _load_companies_from_csv() -> list[tuple[int, float, float]]:
    """Load companies from CSV file (id, latitude, longitude)."""
    companies = []
    try:
        with open(CSV_PATH, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    company_id = int(float(row["id"]))
                    lat = float(row["latitude"])
                    lng = float(row["longitude"])
                    companies.append((company_id, lat, lng))
                except (ValueError, KeyError) as e:
                    continue
    except UnicodeDecodeError:
        # Fallback to latin-1
        with open(CSV_PATH, encoding="latin-1") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    company_id = int(float(row["id"]))
                    lat = float(row["latitude"])
                    lng = float(row["longitude"])
                    companies.append((company_id, lat, lng))
                except (ValueError, KeyError) as e:
                    continue
    return companies


def _load_existing_cache() -> dict[str, Any]:
    """Load existing cache to resume interrupted runs."""
    if OUTPUT_PATH.exists():
        try:
            return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
    return {}


def _save_cache(cache: dict[str, Any]) -> None:
    """Save cache incrementally."""
    OUTPUT_PATH.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    """Generate the booth route cache from CSV."""
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    print(f"Loading companies from {CSV_PATH}...", flush=True)
    companies = _load_companies_from_csv()
    print(f"Loaded {len(companies)} companies", flush=True)

    cache = _load_existing_cache()
    total_pairs = len(DEMO_ORIGINS) * len(companies)
    processed = len(cache)

    print(f"Starting from {processed} cached pairs out of {total_pairs} total", flush=True)

    for origin_idx, origin in enumerate(DEMO_ORIGINS):
        for company_id, dest_lat, dest_lng in companies:
            key = build_cache_key(origin, (dest_lat, dest_lng))
            
            if key in cache:
                continue

            processed += 1
            status = f"[{processed}/{total_pairs}]"
            
            print(f"{status} Fetching {origin} -> company {company_id}...", flush=True)
            result = _fetch_directions(origin, (dest_lat, dest_lng))
            
            if result is None:
                cache[key] = None
                print(f"  No route available (cached as null)", flush=True)
            else:
                route = _extract_route(result)
                if route is None:
                    cache[key] = None
                    print(f"  No route in response (cached as null)", flush=True)
                else:
                    cache[key] = route
                    duration = route["duration_mins"]
                    segment_count = len(route["segments"])
                    print(f"  ✓ {duration} mins, {segment_count} segments", flush=True)

            _save_cache(cache)
            time.sleep(REQUEST_SLEEP_S)

    print(f"\nDone! Cache saved to {OUTPUT_PATH} with {len(cache)} entries", flush=True)


if __name__ == "__main__":
    main()
