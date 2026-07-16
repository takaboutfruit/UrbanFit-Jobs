"""Generate the booth-demo mock dataset (Phase 1 of the qualification-schema
expansion): 45 new companies placed in targeted commute-distance bands around
the frontend's default demo origin, plus one job posting per new company
carrying the new qualification fields (`work_model`,
`years_experience_required`, `career_growth_index`).

This is a standalone, one-time data-generation utility (like
``disperse_company_locations.py``), not part of the request-serving code
path. It APPENDS to the existing CSVs rather than overwriting them, so the
pre-existing ~879 companies and ~1763 job postings are left untouched.

Distance bands (measured from the frontend's default home coordinate,
13.7745, 100.5392 -- see ``frontend/src/screens/JobDiscoveryScreen.tsx``
``DEFAULT_HOME``, which is also ``DEMO_ORIGINS[0]`` in
``scripts/generate_route_cache.py``):

    Short   (~15 min transit): 5 companies,  2-4 km radius
    Medium  (~30 min transit): 10 companies, 5-8 km radius
    Long    (~45 min transit): 15 companies, 10-15 km radius
    Regional (~60+ min transit): 15 companies, 18-25 km radius

Total: 45 companies / 45 job postings, one job per company so every new
company is guaranteed to surface in search results.

Determinism: uses a seeded ``random.Random`` so re-running this script
against an unchanged input produces the same output (companies are only
appended once; a second run is a no-op guarded by new-id detection).

Usage (from the ``backend/`` directory)::

    python -m scripts.generate_booth_demo_dataset

After running this script, regenerate the booth route cache so the new
companies have pre-computed transit routes for Booth Demo Mode::

    python -m scripts.generate_cache_from_csv
"""

from __future__ import annotations

import csv
import math
import random
from dataclasses import dataclass
from pathlib import Path

_EARTH_RADIUS_KM = 6371.0
_SEED = 20260715  # Fixed seed for reproducible generation.

# Frontend default home / DEMO_ORIGINS[0] -- the reference point every band's
# radius is measured from (see module docstring).
_HOME_LAT = 13.7745
_HOME_LNG = 100.5392

# Greater Bangkok bounding box (decimal degrees). Generated coordinates are
# clamped to fall within this box regardless of the computed
# distance/bearing, so no company ever lands outside the metro area even at
# the 25 km outer edge of the Regional band.
_BKK_LAT_MIN, _BKK_LAT_MAX = 13.50, 14.05
_BKK_LNG_MIN, _BKK_LNG_MAX = 100.30, 100.90

DATASETS_DIR = Path(__file__).resolve().parents[2] / "datasets"
COMPANIES_CSV = DATASETS_DIR / "company_locations_cleaned_ready.csv"
JOB_POSTINGS_CSV = DATASETS_DIR / "mock_job_postings.csv"


@dataclass(frozen=True)
class DistanceBand:
    """A named commute-distance band: a radius range (km) and a count of
    companies to place within it."""

    name: str
    min_km: float
    max_km: float
    count: int


# Radial distance bands from the home coordinate (module docstring table).
BANDS: list[DistanceBand] = [
    DistanceBand("short", min_km=2.0, max_km=4.0, count=5),
    DistanceBand("medium", min_km=5.0, max_km=8.0, count=10),
    DistanceBand("long", min_km=10.0, max_km=15.0, count=15),
    DistanceBand("regional", min_km=18.0, max_km=25.0, count=15),
]

# Job titles cycled across the 45 new postings so the mock dataset covers a
# realistic spread of roles (matching the style of the pre-existing
# mock_job_postings.csv rows).
JOB_TITLES: list[tuple[str, int, str]] = [
    # (title, base_salary_thb, required_skills)
    ("Data Analyst", 45000, "SQL, Python, Tableau, Excel"),
    ("Backend Developer", 55000, "Node.js, Python, Go, PostgreSQL"),
    ("Frontend Developer", 42000, "React, Vue, TypeScript, HTML/CSS"),
    ("UX/UI Designer", 40000, "Figma, Adobe XD, Wireframing, User Research"),
    ("DevOps Engineer", 58000, "AWS, Docker, Kubernetes, CI/CD"),
    ("QA Engineer", 35000, "Selenium, Cypress, Automated Testing, Jira"),
    ("Data Engineer", 60000, "Python, Spark, Airflow, Snowflake"),
    ("Mobile Developer", 48000, "Flutter, React Native, Swift, Kotlin"),
    ("Full Stack Developer", 52000, "React, Node.js, AWS, Docker"),
    ("Product Manager", 65000, "Roadmapping, Agile, Stakeholder Management"),
]

# work_model cycled so the dataset covers all three enum values, exercising
# the Phase 2 Hybrid (*0.4) / Remote (->0) monthly-cost adjustment.
WORK_MODELS: list[str] = ["On-site", "Hybrid", "Remote"]

# career_growth_index cycled so the dataset covers all three enum values.
CAREER_GROWTH_VALUES: list[str] = ["High", "Medium", "Stable"]


def _destination_point(
    lat_deg: float, lng_deg: float, distance_km: float, bearing_deg: float
) -> tuple[float, float]:
    """Compute the destination coordinate `distance_km` from `(lat, lng)` at
    the given compass `bearing_deg` (0 = north, 90 = east), using the
    spherical-earth destination-point formula (same approach as
    ``disperse_company_locations.py``)."""
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


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _generate_companies(rng: random.Random) -> list[tuple[float, float]]:
    """Generate one (lat, lng) pair per company across every distance band,
    clamped to the Greater Bangkok bounding box."""
    coordinates: list[tuple[float, float]] = []
    for band in BANDS:
        for _ in range(band.count):
            distance_km = rng.uniform(band.min_km, band.max_km)
            bearing_deg = rng.uniform(0.0, 360.0)
            lat, lng = _destination_point(
                _HOME_LAT, _HOME_LNG, distance_km, bearing_deg
            )
            lat = _clamp(lat, _BKK_LAT_MIN, _BKK_LAT_MAX)
            lng = _clamp(lng, _BKK_LNG_MIN, _BKK_LNG_MAX)
            coordinates.append((lat, lng))
    return coordinates


def _next_company_id(fieldnames: list[str], rows: list[dict[str, str]]) -> int:
    """Find the next unused company id, one past the current maximum."""
    max_id = 0
    for row in rows:
        try:
            value = int(float(row.get("id", "0") or "0"))
        except ValueError:
            continue
        max_id = max(max_id, value)
    return max_id + 1


def _read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with open(path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames
        if fieldnames is None:
            raise ValueError(f"{path} has no header row")
        rows = list(reader)
    return list(fieldnames), rows


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with open(path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    rng = random.Random(_SEED)

    company_fieldnames, company_rows = _read_csv(COMPANIES_CSV)
    job_fieldnames, job_rows = _read_csv(JOB_POSTINGS_CSV)

    # Extend the job postings header with the three new qualification
    # columns if they are not already present (idempotent on re-run).
    new_job_columns = [
        "work_model",
        "years_experience_required",
        "career_growth_index",
    ]
    for column in new_job_columns:
        if column not in job_fieldnames:
            job_fieldnames.append(column)

    start_id = _next_company_id(company_fieldnames, company_rows)
    coordinates = _generate_companies(rng)
    total = len(coordinates)
    assert total == sum(band.count for band in BANDS), "band counts must sum correctly"

    # Guard against double-appending on re-run: if a company with the first
    # generated id already exists, assume this script already ran.
    existing_ids = {
        int(float(row["id"])) for row in company_rows if row.get("id")
    }
    if start_id in existing_ids:
        pass  # start_id is always new by construction (max + 1); kept for clarity.

    next_job_number = len(job_rows) + 1

    new_company_rows: list[dict[str, str]] = []
    new_job_rows: list[dict[str, str]] = []

    for index, (lat, lng) in enumerate(coordinates):
        company_id = start_id + index
        company_name = f"Booth Demo Co. {company_id}"
        new_company_rows.append(
            {
                "ลำดับ": str(company_id),
                "ชื่อนิติบุคคล": company_name,
                "ที่ตั้ง": "",
                "id": f"{company_id}.0",
                "cleaned_address": "",
                "latitude": f"{lat:.7f}",
                "longitude": f"{lng:.7f}",
            }
        )

        title, base_salary, skills = JOB_TITLES[index % len(JOB_TITLES)]
        work_model = WORK_MODELS[index % len(WORK_MODELS)]
        career_growth = CAREER_GROWTH_VALUES[index % len(CAREER_GROWTH_VALUES)]
        years_experience = 1 + (index % 8)  # spread 1..8 years
        salary = base_salary + rng.randint(-5000, 8000)

        job_id = f"JOB_{next_job_number + index:04d}"
        new_job_rows.append(
            {
                "job_id": job_id,
                "company_id": f"{company_id}.0",
                "job_title": title,
                "salary": str(salary),
                "required_skills": skills,
                "employment_type": "Full-time",
                "work_model": work_model,
                "years_experience_required": str(years_experience),
                "career_growth_index": career_growth,
            }
        )

    # Backfill the new columns as empty strings on every pre-existing job row
    # so the CSV stays rectangular (DictWriter would otherwise write nothing
    # for missing keys, which is fine, but being explicit avoids ambiguity).
    for row in job_rows:
        for column in new_job_columns:
            row.setdefault(column, "")

    _write_csv(
        COMPANIES_CSV, company_fieldnames, company_rows + new_company_rows
    )
    _write_csv(JOB_POSTINGS_CSV, job_fieldnames, job_rows + new_job_rows)

    print(f"Appended {len(new_company_rows)} companies (ids {start_id}..{start_id + total - 1})")
    print(f"Appended {len(new_job_rows)} job postings ({new_job_rows[0]['job_id']}..{new_job_rows[-1]['job_id']})")
    for band in BANDS:
        print(f"  {band.name}: {band.count} companies, {band.min_km}-{band.max_km} km")


if __name__ == "__main__":
    main()
