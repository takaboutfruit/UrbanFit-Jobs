"""Disperse company coordinates across Greater Bangkok (dev data-generation
utility, not part of the request-serving code path).

Problem this fixes
-------------------
``datasets/company_locations_cleaned_ready.csv`` has almost all of its ~879
rows packed within a few kilometers of central Bangkok (empirically: 665 of
879 rows sit within 10km of the app's default home coordinate,
13.7745/100.5392). Combined with the Fallback_Estimation strategy's
nearest-company selection, this meant every returned job clustered into a
narrow 5-12 minute commute-time band, making the 15-120 minute tolerance
slider effectively a no-op.

This script rewrites ONLY the ``latitude``/``longitude`` columns of that CSV,
spreading companies across named distance bands/zones (including the outer
provinces of Nonthaburi, Pathum Thani, and Samut Prakan) so that, together
with the widened ``spatial_bounding_radius_m`` (50km, see ``app.config``) and
the stratified-sampling candidate selection (see ``app.db.repository``),
realistic 45-120 minute commute scenarios become reachable. Every other
column (id, company name, original address text, etc.) is left untouched --
this is a coordinate-only dispersal for demo/dev purposes, so the printed
address text may no longer match the (deliberately relocated) coordinate.

Determinism
------------
Uses a seeded ``random.Random`` instance so re-running this script against an
unchanged input file always reproduces the same output coordinates.

Usage (from the ``backend/`` directory)::

    python -m scripts.disperse_company_locations

Writes the result back to ``datasets/company_locations_cleaned_ready.csv``,
after first saving the untouched original to
``datasets/company_locations_cleaned_ready.csv.bak`` (only if that backup
does not already exist, so re-runs never overwrite the true original).
Pass ``--output PATH`` to write elsewhere instead of overwriting in place.
"""

from __future__ import annotations

import argparse
import csv
import math
import random
from dataclasses import dataclass
from pathlib import Path

_EARTH_RADIUS_KM = 6371.0
_SEED = 20240115  # Fixed seed for reproducible dispersal.

# The app's default candidate-home coordinate (frontend
# JobDiscoveryScreen.tsx DEFAULT_HOME) -- the reference point every zone's
# distance band is measured from.
_HOME_LAT = 13.7745
_HOME_LNG = 100.5392


@dataclass(frozen=True)
class Zone:
    """A named dispersal zone: a center point, a distance band (km) around
    that center, and the fraction of all companies to place in this zone."""

    name: str
    center_lat: float
    center_lng: float
    min_km: float
    max_km: float
    weight: float


# Zone centers are approximate province/district centroids. Distance bands
# are chosen so the resulting spread of distances-from-home covers roughly
# 0-45km, which (via real transit/driving estimation) realistically spans
# the full 5-120 minute commute range the tolerance slider offers.
ZONES: list[Zone] = [
    # Central Bangkok: short commutes (roughly 5-25 min).
    Zone("bangkok_core", _HOME_LAT, _HOME_LNG, min_km=0.5, max_km=6.0, weight=0.20),
    # Bangkok outer districts: medium commutes (roughly 20-45 min).
    Zone("bangkok_outer", _HOME_LAT, _HOME_LNG, min_km=6.0, max_km=15.0, weight=0.25),
    # Nonthaburi (north/north-west of central Bangkok).
    Zone("nonthaburi", 13.8621, 100.5144, min_km=0.0, max_km=12.0, weight=0.15),
    # Pathum Thani (further north).
    Zone("pathum_thani", 14.0208, 100.5250, min_km=0.0, max_km=12.0, weight=0.15),
    # Samut Prakan (south-east of central Bangkok).
    Zone("samut_prakan", 13.5991, 100.5998, min_km=0.0, max_km=12.0, weight=0.15),
    # Far outer scatter in any direction: long commutes (roughly 60-120+ min).
    Zone("far_outer", _HOME_LAT, _HOME_LNG, min_km=25.0, max_km=45.0, weight=0.10),
]

assert abs(sum(z.weight for z in ZONES) - 1.0) < 1e-9, "Zone weights must sum to 1.0"

COMPANIES_CSV = "company_locations_cleaned_ready.csv"
DATASETS_DIR = Path(__file__).resolve().parents[2] / "datasets"


def _destination_point(
    lat_deg: float, lng_deg: float, distance_km: float, bearing_deg: float
) -> tuple[float, float]:
    """Compute the destination coordinate `distance_km` from `(lat, lng)` at
    the given compass `bearing_deg` (0 = north, 90 = east), using the
    spherical-earth destination-point formula."""
    lat1 = math.radians(lat_deg)
    lng1 = math.radians(lng_deg)
    bearing = math.radians(bearing_deg)
    angular_distance = distance_km / _EARTH_RADIUS_KM

    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular_distance)
        + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
    )
    lng2 = lng1 + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
        math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
    )
    return math.degrees(lat2), math.degrees(lng2)


def _build_zone_assignment(row_count: int, rng: random.Random) -> list[Zone]:
    """Assign each row a zone so the exact proportions match each zone's
    weight (rounded), then shuffle so zone order has no relationship to the
    original row order."""
    assignment: list[Zone] = []
    remaining = row_count
    for zone in ZONES[:-1]:
        count = round(row_count * zone.weight)
        count = min(count, remaining)
        assignment.extend([zone] * count)
        remaining -= count
    # The last zone absorbs any rounding remainder.
    assignment.extend([ZONES[-1]] * remaining)
    rng.shuffle(assignment)
    return assignment


def disperse(input_path: Path, output_path: Path) -> int:
    """Read `input_path`, disperse latitude/longitude, write to `output_path`.

    Returns the number of rows written.
    """
    rng = random.Random(_SEED)

    with open(input_path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        rows = list(reader)

    if fieldnames is None:
        raise ValueError(f"{input_path} has no header row")

    zones_for_rows = _build_zone_assignment(len(rows), rng)

    for row, zone in zip(rows, zones_for_rows):
        distance_km = rng.uniform(zone.min_km, zone.max_km)
        bearing_deg = rng.uniform(0.0, 360.0)
        new_lat, new_lng = _destination_point(
            zone.center_lat, zone.center_lng, distance_km, bearing_deg
        )
        row["latitude"] = f"{new_lat:.7f}"
        row["longitude"] = f"{new_lng:.7f}"

    with open(output_path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Disperse company coordinates across Greater Bangkok."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help=(
            "Output CSV path. Defaults to overwriting "
            f"datasets/{COMPANIES_CSV} in place (after backing up the "
            "original to a .bak file on first run)."
        ),
    )
    args = parser.parse_args()

    input_path = DATASETS_DIR / COMPANIES_CSV
    output_path = args.output if args.output is not None else input_path

    if args.output is None:
        backup_path = input_path.with_suffix(input_path.suffix + ".bak")
        if not backup_path.exists():
            backup_path.write_bytes(input_path.read_bytes())
            print(f"Backed up original to {backup_path}")
        else:
            print(f"Backup already exists at {backup_path}; not overwriting it")

    count = disperse(input_path, output_path)
    print(f"Dispersed {count} company coordinates -> {output_path}")


if __name__ == "__main__":
    main()
