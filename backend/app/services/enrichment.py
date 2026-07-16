"""Pure enrichment layer for the Job Discovery Enrichment feature.

This module derives the fit scores, work model, commute costs, and transit
segments that hydrate the Candidate Job Discovery screen. Every function here is
pure and framework-agnostic: it takes plain values (and the request context) and
returns plain values, performing no I/O and no ORM access. This keeps the
derivation logic independently reviewable against the design's Correctness
Properties.

Design references:
- design.md "Enrichment layer": function signatures, constant values, and the
  rounding/clamping conventions used throughout.
- Requirements 1.3, 1.6 (token normalization), 2.1-2.8 (skill fit), and
  3.1-3.6 (commute fit).

The functions are added incrementally; this file is structured so later work can
append additional derivations (work model, costs, overall fit, transit segments)
without reworking what already exists.
"""

from __future__ import annotations

from app.schemas.response import TransitSegment

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Case-insensitive mapping from a Job_Posting ``employment_type`` to a frontend
# Work_Model value. Lookups fold the source value to lower case before indexing;
# there is deliberately no fallback default (unmapped -> None). Used only as a
# fallback when a job has no explicit ``work_model`` value of its own (see
# :func:`resolve_work_model`).
WORK_MODEL_MAP: dict[str, str] = {
    "remote": "Remote",
    "hybrid": "Hybrid",
    "full-time": "On-site",
    "part-time": "On-site",
    "contract": "On-site",
    "internship": "On-site",
    "freelance": "On-site",
}

# The only values an explicit Job_Posting.work_model column is recognized as.
# Any other value (including case-varied forms) is treated as unset, falling
# back to the employment_type-derived mapping above.
WORK_MODEL_VALUES: frozenset[str] = frozenset({"On-site", "Hybrid", "Remote"})

# The only values a Job_Posting.career_growth_index column is recognized as.
# Any other value (including case-varied forms) resolves to None.
CAREER_GROWTH_VALUES: frozenset[str] = frozenset({"High", "Medium", "Stable"})

# One outbound and one return trip per working day.
TRIPS_PER_DAY = 2

# Working days used to derive the monthly commute cost.
WORKING_DAYS_PER_MONTH = 22

# Monthly commute cost multiplier applied when work_model == "Hybrid": 2 days
# in the office per week instead of 5 (2/5 = 0.4).
HYBRID_MONTHLY_COST_MULTIPLIER = 0.4

# Upper bound on the number of normalized desired-skill tokens a request may
# supply before it is rejected as invalid (enforced by the request schema).
DESIRED_SKILLS_MAX_TOKENS = 50


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _clamp(value: int, low: int, high: int) -> int:
    """Constrain ``value`` to the inclusive ``[low, high]`` range."""

    return max(low, min(high, value))


# ---------------------------------------------------------------------------
# Token normalization
# ---------------------------------------------------------------------------


def normalize_skill_tokens(raw: str | None) -> list[str]:
    """Normalize a comma-separated skill string into comparison tokens.

    Splits ``raw`` on commas, strips surrounding whitespace from each token,
    drops empty tokens, folds each token for case-insensitive comparison, and
    de-duplicates while preserving first-seen order.

    Returns an empty list for ``None`` or a blank/comma-only input, which the
    callers treat as "no desired skills" (Requirements 1.3, 1.6).
    """

    if raw is None:
        return []

    tokens: list[str] = []
    seen: set[str] = set()
    for part in raw.split(","):
        token = part.strip().casefold()
        if not token or token in seen:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens


# ---------------------------------------------------------------------------
# Fit scores
# ---------------------------------------------------------------------------


def compute_skill_fit(desired: list[str], required_skills: str | None) -> int | None:
    """Compute the Skill_Fit_Score for a job.

    Args:
        desired: The normalized desired-skill tokens (as produced by
            :func:`normalize_skill_tokens`).
        required_skills: The job's raw ``required_skills`` string.

    Returns:
        ``None`` when ``desired`` is empty or ``required_skills`` is null/blank.
        Otherwise ``round(100 * matched / len(desired))`` clamped to ``0..100``,
        where ``matched`` counts desired tokens present in the job's normalized
        required-skills set (matched case-insensitively after trimming). This is
        ``100`` when every desired token is present and ``0`` when none are
        (Requirements 2.1-2.7).
    """

    if not desired:
        return None

    required_tokens = normalize_skill_tokens(required_skills)
    if not required_tokens:
        return None

    required_set = set(required_tokens)
    matched = sum(1 for token in desired if token in required_set)
    return _clamp(round(100 * matched / len(desired)), 0, 100)


def compute_commute_fit(commute_time_mins: int, max_time: int | None) -> int | None:
    """Compute the Commute_Fit_Score for a job.

    Args:
        commute_time_mins: The job's whole-minute commute time.
        max_time: The Commute_Tolerance from the request (``max_time``).

    Returns:
        ``None`` when ``max_time`` is ``None`` (Requirement 3.5). Otherwise
        ``clamp(round(100 * (max_time - t) / max_time), 0, 100)`` where ``t`` is
        ``commute_time_mins``: ``100`` when ``t == 0`` and ``0`` when
        ``t >= max_time`` (Requirements 3.1-3.4).
    """

    if max_time is None:
        return None
    if commute_time_mins <= 0:
        return 100
    if commute_time_mins >= max_time:
        return 0
    return _clamp(round(100 * (max_time - commute_time_mins) / max_time), 0, 100)


# ---------------------------------------------------------------------------
# Work model
# ---------------------------------------------------------------------------


def derive_work_model(employment_type: str | None) -> str | None:
    """Derive the frontend Work_Model from a job's ``employment_type``.

    Performs a case-insensitive lookup in :data:`WORK_MODEL_MAP` by trimming the
    source value and folding it to lower case before indexing.

    Returns:
        ``"Remote"``, ``"Hybrid"``, or ``"On-site"`` for a mapped value.
        ``None`` when ``employment_type`` is ``None``, blank/whitespace-only, or
        not present in the mapping. There is deliberately no fallback default
        (Requirements 8.1-8.4).
    """

    if employment_type is None:
        return None

    key = employment_type.strip().lower()
    if not key:
        return None

    return WORK_MODEL_MAP.get(key)


def resolve_work_model(
    work_model: str | None, employment_type: str | None
) -> str | None:
    """Resolve the final Work_Model for a job, preferring the explicit column.

    A job's own ``work_model`` column (schema-expansion field) wins when it is
    one of the three recognized values (case-sensitive exact match against
    :data:`WORK_MODEL_VALUES`, matching the strict enum the data-generation
    script writes). When ``work_model`` is ``None`` or not a recognized value,
    falls back to :func:`derive_work_model` on ``employment_type`` so
    pre-existing rows without the new column keep their prior behavior.
    """

    if work_model is not None and work_model in WORK_MODEL_VALUES:
        return work_model
    return derive_work_model(employment_type)


def resolve_career_growth_index(career_growth_index: str | None) -> str | None:
    """Validate a job's ``career_growth_index`` against the recognized enum.

    Returns:
        ``career_growth_index`` unchanged when it is exactly one of ``"High"``,
        ``"Medium"``, ``"Stable"`` (:data:`CAREER_GROWTH_VALUES`); ``None``
        otherwise (including ``None`` input, blank, or an unrecognized value).
    """

    if career_growth_index is not None and career_growth_index in CAREER_GROWTH_VALUES:
        return career_growth_index
    return None


# ---------------------------------------------------------------------------
# Commute cost
# ---------------------------------------------------------------------------


def per_trip_cost_baht(fare_thb: float) -> int:
    """Derive the single-trip commute cost in whole baht.

    Rounds ``fare_thb`` to the nearest whole baht (Python's built-in
    round-half-to-even) and floors the result at ``0`` so the returned value is
    always a non-negative whole number (Requirements 7.2, 7.4).
    """

    return max(0, round(fare_thb))


def monthly_commute_cost_baht(per_trip: int, work_model: str | None = None) -> int:
    """Derive the monthly commute cost from the per-trip cost.

    Multiplies ``per_trip`` by :data:`TRIPS_PER_DAY` (2) and
    :data:`WORKING_DAYS_PER_MONTH` (22), then adjusts for ``work_model``:

    - ``"Hybrid"``: the full 5-day cost is multiplied by
      :data:`HYBRID_MONTHLY_COST_MULTIPLIER` (0.4), reflecting 2 office days a
      week instead of 5, and rounded to the nearest whole baht.
    - ``"Remote"``: forced to ``0`` regardless of the per-trip fare.
    - Any other value (``"On-site"`` or ``None``): the unadjusted 5-day cost.

    A non-negative ``per_trip`` yields a non-negative whole number in every
    case.
    """

    base = per_trip * TRIPS_PER_DAY * WORKING_DAYS_PER_MONTH
    if work_model == "Remote":
        return 0
    if work_model == "Hybrid":
        return max(0, round(base * HYBRID_MONTHLY_COST_MULTIPLIER))
    return base


# ---------------------------------------------------------------------------
# Overall fit
# ---------------------------------------------------------------------------


def overall_fit_score(
    commute_fit: int | None, skill_fit: int | None
) -> float | None:
    """Derive the Overall_Fit_Score used for fit ordering.

    Computes the arithmetic mean of the non-null values among ``commute_fit``
    and ``skill_fit``.

    Returns:
        The single value when exactly one is non-null, their mean when both are
        non-null, and ``None`` when both are ``None`` (Requirements 4.4, 4.5).
    """

    present = [value for value in (commute_fit, skill_fit) if value is not None]
    if not present:
        return None
    return sum(present) / len(present)


# ---------------------------------------------------------------------------
# Transit segments
# ---------------------------------------------------------------------------

# Separator between legs in a leg-level transit source string.
_TRANSIT_LEG_SEPARATOR = ";"

# Separator between a leg's mode and its whole-minute duration.
_TRANSIT_FIELD_SEPARATOR = ":"


def parse_transit_segments(source: str | None) -> list[TransitSegment] | None:
    """Parse a leg-level transit source into ordered :class:`TransitSegment`s.

    There is currently no leg-level transit source in the data (``demo_routes.csv``
    carries a single fare and duration per route, with no legs column), so this
    resolver returns ``None`` for every result today. It is written so that, if a
    leg-level source is introduced later, segments populate without further schema
    change (design.md "Research"; Requirements 6.3, 6.6).

    Expected source format (defensively parsed):
        semicolon-separated legs, each ``"mode:minutes"`` in travel order, e.g.
        ``"BTS:15;Walk:5;MRT:20"``. The ``mode`` is passed through unchanged so
        both recognized (``Walk``/``BTS``/``MRT``/``BRT``/``Win``) and
        unrecognized modes are preserved; ``minutes`` must be a whole number
        ``>= 0`` (Requirements 6.2, 6.5, 6.7).

    Returns:
        An ordered list of segments for a well-formed source. ``None`` when
        ``source`` is ``None`` or blank, or when parsing/interpreting any leg
        fails for any reason. It never returns ``[]`` for the absent/failed cases
        so a bad source is indistinguishable from "no source" to the client
        (Requirements 6.6, 6.8).
    """

    if source is None:
        return None

    stripped = source.strip()
    if not stripped:
        return None

    try:
        segments: list[TransitSegment] = []
        for raw_leg in stripped.split(_TRANSIT_LEG_SEPARATOR):
            leg = raw_leg.strip()
            if not leg:
                # An empty leg (e.g. a trailing/duplicated separator) is malformed.
                return None

            if leg.count(_TRANSIT_FIELD_SEPARATOR) != 1:
                return None

            mode_part, minutes_part = leg.split(_TRANSIT_FIELD_SEPARATOR)
            mode = mode_part.strip()
            minutes_text = minutes_part.strip()
            if not mode or not minutes_text:
                return None

            # Require an integer literal; reject decimals, signs handled below.
            if not minutes_text.isdigit():
                return None
            minutes = int(minutes_text)
            if minutes < 0:
                return None

            segments.append(TransitSegment(mode=mode, minutes=minutes))

        # A well-formed non-empty source always yields at least one segment here;
        # guard defensively so an empty result never escapes as [].
        if not segments:
            return None
        return segments
    except (ValueError, TypeError):
        return None
