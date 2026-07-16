"""Backfill missing qualification-schema fields on ``mock_job_postings.csv``.

The booth-demo dataset expansion (``generate_booth_demo_dataset.py``) added
the ``work_model``, ``years_experience_required``, and ``career_growth_index``
columns to ``mock_job_postings.csv`` but only populated them on the 45 rows it
appended, leaving every pre-existing row blank. Since the application-layer
fallback derives ``work_model`` from ``employment_type`` (and nearly every
pre-existing row is ``employment_type == "Full-time"``, which maps to
``"On-site"``), effectively 100% of jobs showed up as On-site with no
experience/growth data.

This is a standalone, one-time data-generation utility (like
``generate_booth_demo_dataset.py``) — not part of the request-serving code
path. It fills in *only* the blank cells in the three qualification columns,
leaving every already-populated row (the 45 booth-demo rows) untouched.

Distribution (fixed requirement, not sampled per-row so exact percentages are
guaranteed regardless of row count):
    work_model: 50% "On-site", 40% "Hybrid", 10% "Remote"
    years_experience_required: uniform random integer in [1, 5]
    career_growth_index: uniform random choice of "High" | "Medium" | "Stable"

Determinism: uses a seeded ``random.Random`` so re-running this script against
an unchanged input produces the same output. Idempotent: rows that already
have a non-blank value in a given column are left as-is, so re-running after
new blank rows are appended (e.g. from a future data import) only backfills
the new rows.

Usage (from the ``backend/`` directory)::

    python -m scripts.backfill_job_qualifications

After running this script, reload the database so the backfilled values are
visible via ``GET /search``::

    python -m scripts.bootstrap_db --drop
"""

from __future__ import annotations

import csv
import random
from pathlib import Path

_SEED = 20260716  # Fixed seed for reproducible generation.

DATASETS_DIR = Path(__file__).resolve().parents[2] / "datasets"
JOB_POSTINGS_CSV = DATASETS_DIR / "mock_job_postings.csv"

# work_model distribution weights (Requirement: 50% On-site, 40% Hybrid, 10%
# Remote). Assigned via a shuffled bucket-fill (not per-row weighted
# sampling) so the realized distribution matches these percentages exactly,
# not just in expectation.
WORK_MODEL_WEIGHTS: list[tuple[str, float]] = [
    ("On-site", 0.5),
    ("Hybrid", 0.4),
    ("Remote", 0.1),
]

CAREER_GROWTH_VALUES: list[str] = ["High", "Medium", "Stable"]

YEARS_EXPERIENCE_MIN = 1
YEARS_EXPERIENCE_MAX = 5


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


def _is_blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def _build_work_model_assignments(rng: random.Random, count: int) -> list[str]:
    """Build a shuffled list of ``count`` work-model labels matching the
    50/40/10 distribution exactly (largest-remainder rounding so the counts
    always sum to ``count``)."""
    raw_counts = [(label, weight * count) for label, weight in WORK_MODEL_WEIGHTS]
    floors = [(label, int(value)) for label, value in raw_counts]
    remainder = count - sum(n for _, n in floors)
    # Distribute the remainder to the labels with the largest fractional part.
    fractional = sorted(
        range(len(raw_counts)),
        key=lambda i: raw_counts[i][1] - floors[i][1],
        reverse=True,
    )
    counts = dict(floors)
    for i in fractional[:remainder]:
        label = raw_counts[i][0]
        counts[label] += 1

    assignments: list[str] = []
    for label, _ in WORK_MODEL_WEIGHTS:
        assignments.extend([label] * counts[label])
    rng.shuffle(assignments)
    return assignments


def main() -> None:
    rng = random.Random(_SEED)

    fieldnames, rows = _read_csv(JOB_POSTINGS_CSV)

    blank_work_model_indices = [
        i for i, row in enumerate(rows) if _is_blank(row.get("work_model"))
    ]
    work_model_assignments = _build_work_model_assignments(
        rng, len(blank_work_model_indices)
    )

    filled_work_model = 0
    filled_years = 0
    filled_growth = 0

    for position, row_index in enumerate(blank_work_model_indices):
        rows[row_index]["work_model"] = work_model_assignments[position]
        filled_work_model += 1

    for row in rows:
        if _is_blank(row.get("years_experience_required")):
            row["years_experience_required"] = str(
                rng.randint(YEARS_EXPERIENCE_MIN, YEARS_EXPERIENCE_MAX)
            )
            filled_years += 1
        if _is_blank(row.get("career_growth_index")):
            row["career_growth_index"] = rng.choice(CAREER_GROWTH_VALUES)
            filled_growth += 1

    _write_csv(JOB_POSTINGS_CSV, fieldnames, rows)

    print(f"Backfilled work_model on {filled_work_model} rows")
    print(f"Backfilled years_experience_required on {filled_years} rows")
    print(f"Backfilled career_growth_index on {filled_growth} rows")
    print(f"Total rows in dataset: {len(rows)}")


if __name__ == "__main__":
    main()
