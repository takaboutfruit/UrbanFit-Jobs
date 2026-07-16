"""One-time CSV data loader for the hybrid-routing-search feature.

Loads the four ``datasets/`` CSVs into their PostGIS-backed tables. This module
begins with load-time validity helpers (task 4.1); the per-table load routines
(task 4.2) build on top of them.

The helpers implement the load-time data-validity guarantees of design
**Property 16** (Requirements 7.5, 7.6):

- Company ids arrive as float-formatted strings (e.g. ``"7.0"``) or floats and
  must be normalized to integers.
- Coordinate pairs with empty or out-of-range values must be treated as invalid
  so the owning row can be skipped from spatial calculations.

Both helpers are pure and standalone so the per-table load routines can reuse
them without side effects.
"""

from __future__ import annotations

# Coordinate validity bounds (decimal degrees). Latitude spans the poles and
# longitude spans the antimeridian; values outside these ranges are invalid.
LATITUDE_MIN = -90.0
LATITUDE_MAX = 90.0
LONGITUDE_MIN = -180.0
LONGITUDE_MAX = 180.0


def normalize_company_id(value: object) -> int | None:
    """Cast a float-formatted company id to an integer.

    Company ids appear in the CSVs as floats (e.g. ``7.0``) or float-formatted
    strings (e.g. ``"7.0"``). This helper coerces those, as well as already-int
    values, to a plain ``int``. Surrounding whitespace is tolerated.

    Args:
        value: The raw id value from a CSV cell. May be an ``int``, ``float``,
            or ``str`` (possibly padded with whitespace), or ``None``.

    Returns:
        The id as an ``int``, or ``None`` when the value is empty, ``None``,
        non-numeric, or a non-integral float (e.g. ``7.5``).
    """
    if value is None:
        return None

    # Already an int (but not a bool, which is an int subclass we don't want).
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return _float_to_int(value)

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            # Parse via float so "7", "7.0", and "7.00" all normalize; a plain
            # int() would reject the "7.0" form the CSVs actually contain.
            parsed = float(text)
        except ValueError:
            return None
        return _float_to_int(parsed)

    return None


def _float_to_int(value: float) -> int | None:
    """Convert a float to an int only when it is finite and integral.

    Returns ``None`` for NaN, infinities, and non-integral values (e.g.
    ``7.5``) so callers never silently truncate a fractional id.
    """
    if value != value:  # NaN
        return None
    if value in (float("inf"), float("-inf")):
        return None
    if not value.is_integer():
        return None
    return int(value)


def parse_coordinate_pair(
    latitude: object, longitude: object
) -> tuple[float, float] | None:
    """Parse and validate a ``(latitude, longitude)`` pair.

    A pair is valid only when both values are numeric, latitude falls within
    ``[-90, 90]``, and longitude falls within ``[-180, 180]``. Empty strings,
    ``None``, non-numeric input, and out-of-range values all make the pair
    invalid and yield the skip signal.

    Args:
        latitude: The raw latitude value from a CSV cell.
        longitude: The raw longitude value from a CSV cell.

    Returns:
        The validated ``(latitude, longitude)`` tuple as floats, or ``None`` as
        a skip signal when either value is empty, non-numeric, or out of range.
    """
    lat = _parse_float(latitude)
    lng = _parse_float(longitude)
    if lat is None or lng is None:
        return None

    if not (LATITUDE_MIN <= lat <= LATITUDE_MAX):
        return None
    if not (LONGITUDE_MIN <= lng <= LONGITUDE_MAX):
        return None

    return (lat, lng)


def _parse_float(value: object) -> float | None:
    """Parse a single coordinate value to a finite float.

    Tolerates already-numeric input and whitespace-padded strings. Returns
    ``None`` for empty strings, ``None``, non-numeric text, and non-finite
    numbers (NaN / infinity).
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            number = float(text)
        except ValueError:
            return None
    else:
        return None

    if number != number:  # NaN
        return None
    if number in (float("inf"), float("-inf")):
        return None
    return number


# ---------------------------------------------------------------------------
# Task 4.2 — per-table load routines with integrity enforcement
# ---------------------------------------------------------------------------
#
# The routines below read the four ``datasets/`` CSVs with the standard-library
# ``csv`` module and populate the ORM tables via an async SQLAlchemy session.
# They uphold design **Property 16** (Requirements 7.5, 7.6, 7.7):
#
# - Coordinate-invalid rows (empty or out-of-range lat/lng, e.g. station ``A10``)
#   are skipped via :func:`parse_coordinate_pair`.
# - Company ids are normalized from floats (e.g. ``7.0`` -> ``7``) via
#   :func:`normalize_company_id`; rows without a resolvable id are skipped.
# - Referential integrity is enforced at load time: companies are loaded first
#   and their ids collected into a ``valid_company_ids`` set; Job_Posting and
#   Demo_Origin rows whose ``company_id`` is not in that set (dangling foreign
#   key) are skipped.
#
# The ``geog`` column for each spatial table is built from ``(longitude,
# latitude)`` as a PostGIS ``geography(Point, 4326)`` value using a
# :class:`~geoalchemy2.elements.WKTElement` in ``POINT(lng lat)`` order.

import csv
from pathlib import Path

from geoalchemy2.elements import WKTElement
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, DemoOrigin, JobPosting, Station

# WGS84 spatial reference id used by every geography column in the schema.
_SRID = 4326

# ``datasets/`` sits at the repository root, four levels above this file:
# loader.py -> db -> app -> backend -> <repo root>/datasets
DATASETS_DIR = Path(__file__).resolve().parents[3] / "datasets"

COMPANIES_CSV = "company_locations_cleaned_ready.csv"
STATIONS_CSV = "coordinate_station.csv"
JOB_POSTINGS_CSV = "mock_job_postings.csv"
DEMO_ROUTES_CSV = "demo_routes.csv"


def _make_point(latitude: float, longitude: float) -> WKTElement:
    """Build a PostGIS geography point from a validated coordinate pair.

    WKT uses ``POINT(longitude latitude)`` (x=lng, y=lat) order, matching the
    ``(longitude, latitude)`` derivation documented for every spatial model.
    Coordinates are pre-validated by :func:`parse_coordinate_pair`, so the
    interpolated WKT is well-formed and free of injection risk.
    """
    return WKTElement(f"POINT({longitude} {latitude})", srid=_SRID)


def _parse_int(value: object) -> int | None:
    """Parse an integer-valued cell, tolerating float-formatted strings.

    Reuses the coordinate float parser so ``"88000"``, ``"88000.0"``, and
    numeric input all normalize; returns ``None`` for empty, non-numeric, or
    non-integral values so callers can store a null rather than a wrong number.
    """
    number = _parse_float(value)
    if number is None:
        return None
    if not number.is_integer():
        return None
    return int(number)


def _clean_str(value: object) -> str | None:
    """Trim a string cell, mapping empty/whitespace-only values to ``None``."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _open_csv(datasets_dir: Path, filename: str):
    """Open a dataset CSV for reading with UTF-8 (BOM-tolerant) decoding."""
    return open(datasets_dir / filename, newline="", encoding="utf-8-sig")


async def load_companies(session: AsyncSession, datasets_dir: Path) -> set[int]:
    """Load ``company_locations_cleaned_ready.csv`` into ``companies``.

    Maps the CSV ``id`` (via :func:`normalize_company_id`), the
    ``ชื่อนิติบุคคล`` column (via :func:`_clean_str`) into ``name``,
    ``latitude`` and ``longitude`` columns, and builds ``geog`` from
    ``(longitude, latitude)``.
    Rows whose id is unresolvable or whose coordinates are invalid/out-of-range
    are skipped (Requirement 7.6).

    Returns:
        The set of loaded company ids, used downstream to enforce referential
        integrity for Job_Posting and Demo_Origin rows.
    """
    valid_company_ids: set[int] = set()
    with _open_csv(datasets_dir, COMPANIES_CSV) as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            company_id = normalize_company_id(row.get("id"))
            if company_id is None:
                continue
            coordinates = parse_coordinate_pair(
                row.get("latitude"), row.get("longitude")
            )
            if coordinates is None:
                continue
            latitude, longitude = coordinates
            # Guard against duplicate ids within the source file.
            if company_id in valid_company_ids:
                continue
            session.add(
                Company(
                    id=company_id,
                    name=_clean_str(row.get("ชื่อนิติบุคคล")),
                    latitude=latitude,
                    longitude=longitude,
                    geog=_make_point(latitude, longitude),
                )
            )
            valid_company_ids.add(company_id)
    await session.flush()
    return valid_company_ids


async def load_stations(session: AsyncSession, datasets_dir: Path) -> int:
    """Load ``coordinate_station.csv`` into ``stations``.

    Maps ``Station_Code``, ``Station_Name_EN`` (-> ``station_name``),
    ``Latitude`` and ``Longitude``; builds ``geog`` from
    ``(longitude, latitude)``. Rows with empty or out-of-range coordinates
    (e.g. station ``A10``) are excluded from the load so they never participate
    in nearest-station calculations (Requirement 7.5).

    Returns:
        The count of stations loaded.
    """
    loaded = 0
    seen_codes: set[str] = set()
    with _open_csv(datasets_dir, STATIONS_CSV) as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            station_code = _clean_str(row.get("Station_Code"))
            if station_code is None or station_code in seen_codes:
                continue
            coordinates = parse_coordinate_pair(
                row.get("Latitude"), row.get("Longitude")
            )
            if coordinates is None:
                continue
            latitude, longitude = coordinates
            session.add(
                Station(
                    station_code=station_code,
                    station_name=_clean_str(row.get("Station_Name_EN")) or station_code,
                    latitude=latitude,
                    longitude=longitude,
                    geog=_make_point(latitude, longitude),
                )
            )
            seen_codes.add(station_code)
            loaded += 1
    await session.flush()
    return loaded


async def load_job_postings(
    session: AsyncSession, datasets_dir: Path, valid_company_ids: set[int]
) -> int:
    """Load ``mock_job_postings.csv`` into ``job_postings``.

    Maps ``job_id``, ``company_id`` (via :func:`normalize_company_id`),
    ``job_title``, ``salary``, ``required_skills``, ``employment_type``, and
    the qualification-schema columns ``work_model``, ``years_experience_required``,
    ``career_growth_index`` (all optional; absent/unrecognized values are
    stored as-is and validated downstream by
    :func:`app.services.enrichment.resolve_work_model` /
    :func:`~app.services.enrichment.resolve_career_growth_index`). Rows whose
    ``company_id`` has no matching Company (dangling foreign key) are skipped
    so they never surface in search results (Requirement 7.7).

    Returns:
        The count of job postings loaded.
    """
    loaded = 0
    seen_job_ids: set[str] = set()
    with _open_csv(datasets_dir, JOB_POSTINGS_CSV) as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            job_id = _clean_str(row.get("job_id"))
            if job_id is None or job_id in seen_job_ids:
                continue
            company_id = normalize_company_id(row.get("company_id"))
            if company_id is None or company_id not in valid_company_ids:
                continue
            session.add(
                JobPosting(
                    job_id=job_id,
                    company_id=company_id,
                    job_title=_clean_str(row.get("job_title")),
                    salary=_parse_int(row.get("salary")),
                    required_skills=_clean_str(row.get("required_skills")),
                    employment_type=_clean_str(row.get("employment_type")),
                    work_model=_clean_str(row.get("work_model")),
                    years_experience_required=_parse_int(
                        row.get("years_experience_required")
                    ),
                    career_growth_index=_clean_str(row.get("career_growth_index")),
                )
            )
            seen_job_ids.add(job_id)
            loaded += 1
    await session.flush()
    return loaded


async def load_demo_origins(
    session: AsyncSession, datasets_dir: Path, valid_company_ids: set[int]
) -> int:
    """Load ``demo_routes.csv`` into ``demo_origins``.

    Maps ``origin_station``, ``origin_lat``, ``origin_lng``, ``company_id`` (via
    :func:`normalize_company_id`), ``exact_fare_thb`` and ``exact_time_mins``;
    builds ``geog`` from ``(origin_lng, origin_lat)``. Rows are skipped when the
    ``company_id`` has no matching Company (dangling foreign key, Requirement
    7.7), when the coordinates are invalid/out-of-range (Requirement 7.6), or
    when the required exact fare/time values are missing.

    Returns:
        The count of demo origins loaded.
    """
    loaded = 0
    with _open_csv(datasets_dir, DEMO_ROUTES_CSV) as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            company_id = normalize_company_id(row.get("company_id"))
            if company_id is None or company_id not in valid_company_ids:
                continue
            coordinates = parse_coordinate_pair(
                row.get("origin_lat"), row.get("origin_lng")
            )
            if coordinates is None:
                continue
            origin_lat, origin_lng = coordinates
            exact_fare_thb = _parse_float(row.get("exact_fare_thb"))
            exact_time_mins = _parse_int(row.get("exact_time_mins"))
            if exact_fare_thb is None or exact_time_mins is None:
                continue
            session.add(
                DemoOrigin(
                    origin_station=_clean_str(row.get("origin_station")) or "",
                    origin_lat=origin_lat,
                    origin_lng=origin_lng,
                    company_id=company_id,
                    exact_fare_thb=exact_fare_thb,
                    exact_time_mins=exact_time_mins,
                    geog=_make_point(origin_lat, origin_lng),
                )
            )
            loaded += 1
    await session.flush()
    return loaded


async def load_all(
    session: AsyncSession, datasets_dir: Path | str | None = None
) -> dict[str, int]:
    """Load all four CSVs into their tables in dependency order.

    Companies are loaded first so their ids form the ``valid_company_ids`` set
    used to enforce referential integrity for job postings and demo origins.
    Stations have no foreign keys and are loaded independently. The caller owns
    the transaction (this routine flushes but does not commit) so loads can be
    composed into a larger unit of work or rolled back on failure.

    Args:
        session: An open async SQLAlchemy session.
        datasets_dir: Optional override for the datasets directory; defaults to
            the repository ``datasets/`` folder.

    Returns:
        A mapping of table name to the number of rows loaded, useful for the
        read-only data-load spot checks described in the design.
    """
    resolved_dir = Path(datasets_dir) if datasets_dir is not None else DATASETS_DIR

    valid_company_ids = await load_companies(session, resolved_dir)
    stations_loaded = await load_stations(session, resolved_dir)
    job_postings_loaded = await load_job_postings(
        session, resolved_dir, valid_company_ids
    )
    demo_origins_loaded = await load_demo_origins(
        session, resolved_dir, valid_company_ids
    )

    return {
        "companies": len(valid_company_ids),
        "stations": stations_loaded,
        "job_postings": job_postings_loaded,
        "demo_origins": demo_origins_loaded,
    }
