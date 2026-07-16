"""Booth Demo Mode static route cache (Phase 2 interceptor).

Loads the pre-computed ``booth_route_cache.json`` (produced offline by
``scripts/generate_route_cache.py``, Phase 1) into memory exactly once, and
exposes a normalized lookup used by :class:`~app.services.time_client.TimeEstimationClient`
to serve commute estimates without ever calling the live Google API while
``settings.booth_demo_mode`` is enabled.

Architectural constraints this module enforces:

1. **Environment toggle** -- every function here is a no-op/pass-through when
   ``settings.booth_demo_mode`` is false; the live Google API path in
   :mod:`app.services.time_client` is untouched and remains the default.
2. **In-memory initialization** -- :func:`init_booth_cache` performs the one
   disk read for the process lifetime (intended to be called from the FastAPI
   startup hook in :mod:`app.main`); :func:`get_booth_cache` never re-reads the
   file, it only lazily triggers the same single load if startup hasn't run yet
   (e.g. scripts, ad-hoc REPL use).
3. **Key normalization** -- :func:`build_cache_key` rounds every coordinate to
   :data:`BOOTH_COORD_DECIMALS` (6 dp) before formatting the
   ``"origin_lat,origin_lng_company_lat,company_lng"`` key. This exact function
   is also imported and used by ``scripts/generate_route_cache.py`` (Phase 1),
   so the writer and reader can never disagree on key format -- eliminating the
   most common cause of "catastrophic cache misses" from divergent
   floating-point formatting between the two phases.
4. **Deterministic fallback** -- :func:`lookup_booth_route` never issues a live
   API call. A key absent from the cache is logged as
   ``"BOOTH CACHE MISS: <key>"`` and resolved as
   ``(commute_time_mins=None, transit_segments=None)``. A key present with a
   cached ``null`` value (Phase 1 already determined no transit route exists)
   resolves the same way but silently, since it is an already-resolved answer,
   not a miss.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

from app.config import settings
from app.schemas.response import TransitSegment

logger = logging.getLogger(__name__)

# Decimal places every coordinate is rounded to before key construction. MUST
# match the precision baked into booth_route_cache.json by
# scripts/generate_route_cache.py -- both share build_cache_key() below so this
# is enforced by construction rather than by convention.
BOOTH_COORD_DECIMALS = 6

# Module-level singleton. `None` means "not yet loaded"; a loaded-but-empty
# cache is `{}`, which is falsy but distinct from "not yet loaded" -- so the
# sentinel check below is `is None`, never truthiness.
_booth_cache: dict[str, dict | None] | None = None


def _round_coord(value: float) -> float:
    """Round a single coordinate to :data:`BOOTH_COORD_DECIMALS` places."""
    return round(float(value), BOOTH_COORD_DECIMALS)


def build_cache_key(
    origin: tuple[float, float], destination: tuple[float, float]
) -> str:
    """Build the ``"origin_lat,origin_lng_company_lat,company_lng"`` cache key.

    Both coordinate pairs are rounded to :data:`BOOTH_COORD_DECIMALS` decimal
    places before formatting. This is the single source of truth for the cache
    key format: ``scripts/generate_route_cache.py`` (Phase 1, the writer) and
    this module (Phase 2, the reader) both call this exact function, so a
    coordinate that produces one key at write time is guaranteed to produce the
    identical key at read time regardless of incidental floating-point noise
    (e.g. extra trailing digits picked up from a DB round trip).
    """
    o_lat, o_lng = _round_coord(origin[0]), _round_coord(origin[1])
    d_lat, d_lng = _round_coord(destination[0]), _round_coord(destination[1])
    return f"{o_lat},{o_lng}_{d_lat},{d_lng}"


def _resolve_cache_path() -> Path:
    """Resolve ``settings.booth_route_cache_path`` relative to ``backend/``."""
    path = Path(settings.booth_route_cache_path)
    if path.is_absolute():
        return path
    # This file lives at backend/app/services/booth_cache.py, so backend/ is
    # three parents up.
    backend_root = Path(__file__).resolve().parent.parent.parent
    return backend_root / path


def init_booth_cache() -> None:
    """Load ``booth_route_cache.json`` into memory exactly once.

    Intended to be called from the FastAPI startup hook (see ``app.main``'s
    lifespan) so no ``/search`` request ever performs this disk read. Safe to
    call more than once: only the first call (per process) performs I/O.

    When ``settings.booth_demo_mode`` is false, this still initializes the
    singleton to an empty dict (a cheap no-op) so :func:`get_booth_cache` never
    needs to re-check the flag; the live Google API path never consults this
    cache at all regardless.

    On any read/parse failure, logs a warning and initializes to an empty
    cache rather than raising, so a missing/corrupt cache file degrades to
    "every lookup is a miss" instead of crashing the application at startup.
    """
    global _booth_cache
    if _booth_cache is not None:
        return

    if not settings.booth_demo_mode:
        _booth_cache = {}
        return

    path = _resolve_cache_path()
    try:
        loaded = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "BOOTH CACHE LOAD FAILED: could not read %s (%s); booth mode will "
            "report every lookup as a cache miss.",
            path,
            exc,
        )
        _booth_cache = {}
        return

    if not isinstance(loaded, dict):
        logger.warning(
            "BOOTH CACHE LOAD FAILED: %s did not contain a JSON object; booth "
            "mode will report every lookup as a cache miss.",
            path,
        )
        _booth_cache = {}
        return

    _booth_cache = loaded
    logger.info("Booth route cache loaded: %d entries from %s", len(loaded), path)


def get_booth_cache() -> dict[str, dict | None]:
    """Return the in-memory booth cache, lazily loading it if needed.

    :func:`init_booth_cache` (called from the app startup hook) is the intended
    single load point; this lazy-load is a defensive fallback for call sites
    that might run before startup has fired (e.g. a script or REPL use), and it
    still only ever reads the file once per process.
    """
    if _booth_cache is None:
        init_booth_cache()
    assert _booth_cache is not None
    return _booth_cache


@dataclass(frozen=True, slots=True)
class BoothRouteResult:
    """The outcome of a single booth-cache route lookup.

    Attributes:
        commute_time_mins: The cached whole-minute duration, or ``None`` on a
            cache miss or when Phase 1 recorded "no route available" for this
            pair.
        transit_segments: The cached ordered transit legs, or ``None`` under
            the same conditions as ``commute_time_mins``.
    """

    commute_time_mins: int | None
    transit_segments: list[TransitSegment] | None


_NO_ROUTE = BoothRouteResult(commute_time_mins=None, transit_segments=None)


def lookup_booth_route(
    origin: tuple[float, float], destination: tuple[float, float]
) -> BoothRouteResult:
    """Look up one origin/destination pair in the in-memory booth cache.

    Never issues a live API call under any circumstances -- this is the
    deterministic cache fallback required for Booth Demo Mode. Two distinct
    null-producing cases are handled differently:

    - **Cache miss** (key absent entirely -- never pre-computed by Phase 1):
      logs ``"BOOTH CACHE MISS: <key>"`` at WARNING level, then returns
      ``BoothRouteResult(None, None)``.
    - **Resolved no-route** (key present, cached value is ``null`` -- Phase 1
      already determined no transit route exists for this pair): returns
      ``BoothRouteResult(None, None)`` silently, since this is an
      already-resolved, expected answer rather than a miss.

    Args:
        origin: The user's ``(latitude, longitude)``.
        destination: The candidate company's ``(latitude, longitude)``.

    Returns:
        A :class:`BoothRouteResult`. Both fields are populated together on a
        cache hit with data, and both are ``None`` together in every other
        case (miss, resolved no-route, or malformed cached segments).
    """
    cache = get_booth_cache()
    key = build_cache_key(origin, destination)

    if key not in cache:
        logger.warning("BOOTH CACHE MISS: %s", key)
        return _NO_ROUTE

    entry = cache[key]
    if entry is None:
        return _NO_ROUTE

    duration = entry.get("duration_mins") if isinstance(entry, dict) else None
    commute_time_mins = duration if isinstance(duration, int) else None

    raw_segments = entry.get("segments") if isinstance(entry, dict) else None
    transit_segments: list[TransitSegment] | None = None
    if isinstance(raw_segments, list):
        try:
            transit_segments = [
                TransitSegment(mode=leg["mode"], minutes=leg["minutes"])
                for leg in raw_segments
            ]
        except (KeyError, TypeError, ValueError):
            logger.warning(
                "BOOTH CACHE MALFORMED SEGMENTS: %s -- treating as no segments",
                key,
            )
            transit_segments = None

    return BoothRouteResult(
        commute_time_mins=commute_time_mins,
        transit_segments=transit_segments,
    )
