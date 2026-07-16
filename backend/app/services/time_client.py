"""Time_Estimation_Service client.

Wraps the Google Distance Matrix API to estimate commute durations for a single
origin (the user's coordinates) against up to 25 destinations (candidate company
coordinates). Durations are returned as whole-minute ``commute_time_mins`` values
aligned to the destination order supplied by the caller.

Design references:
- design.md "TimeEstimationClient": single origin, up to 25 destinations,
  ``httpx.AsyncClient`` with a 1.5 s timeout, raising ``TimeEstimationError`` on
  non-200 status, malformed payload, per-element error status, or timeout.
- Requirement 3.8: ``commute_time_mins`` is the returned duration rounded to the
  nearest whole minute (Property 9 — whole-minute rounding).
- Requirement 3.9: a 1.5 s timeout keeps the call within the 3 s global SLA
  (Property 11 — timeout containment source).

Callers decide whether a raised ``TimeEstimationError`` is fatal
(fallback-selected strategy -> HTTP 502) or non-fatal (exact-match best-effort ->
drop the affected records).
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.config import settings
from app.schemas.response import TransitSegment
from app.services.booth_cache import lookup_booth_route


class TimeEstimationError(Exception):
    """Raised when the Time_Estimation_Service call cannot be completed.

    Covers non-200 HTTP responses, malformed payloads, per-element error
    statuses (an element ``status`` other than ``"OK"``), and timeouts.
    """


@dataclass(frozen=True, slots=True)
class EstimationResult:
    """One destination's resolved commute estimate.

    Returned by :meth:`TimeEstimationClient.estimate`, aligned to the caller's
    ``destinations`` order. In Booth Demo Mode a cache miss (or a
    pre-computed "no route available" entry) yields both fields ``None``
    rather than raising, per the deterministic cache-fallback contract (see
    :mod:`app.services.booth_cache`). On the live Google API path
    ``transit_segments`` is always ``None`` (Distance Matrix has no leg-level
    source), matching the pre-existing behavior.

    Attributes:
        commute_time_mins: The whole-minute commute duration, or ``None`` on a
            booth-mode cache miss / resolved no-route.
        transit_segments: The ordered transit legs, or ``None`` when
            unavailable (live mode, cache miss, or resolved no-route).
    """

    commute_time_mins: int | None
    transit_segments: list[TransitSegment] | None


def duration_seconds_to_commute_mins(duration_seconds: float) -> int:
    """Map a duration in seconds to whole-minute ``commute_time_mins``.

    The value is rounded to the nearest whole minute (Requirement 3.8,
    Property 9). Ties round to the nearest even integer, matching Python's
    built-in ``round`` semantics.
    """

    return int(round(duration_seconds / 60.0))


class TimeEstimationClient:
    """Client for the Google Distance Matrix API.

    Parameters mirror the domain configuration in :mod:`app.config` so the API
    key, base URL, and per-call timeout have a single source of truth. The
    client issues one batched request per :meth:`estimate_durations` call.
    """

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_s: float | None = None,
    ) -> None:
        self._api_key = (
            api_key if api_key is not None else settings.google_distance_matrix_api_key
        )
        self._base_url = (
            base_url if base_url is not None else settings.google_distance_matrix_url
        )
        self._timeout_s = (
            timeout_s if timeout_s is not None else settings.time_service_timeout_s
        )

    async def estimate_durations(
        self,
        origin: tuple[float, float],
        destinations: list[tuple[float, float]],
    ) -> list[int]:
        """Estimate whole-minute commute durations for each destination.

        Args:
            origin: The user's ``(latitude, longitude)`` coordinates.
            destinations: Up to 25 company ``(latitude, longitude)`` coordinates.

        Returns:
            A list of whole-minute durations aligned to ``destinations`` order.

        Raises:
            TimeEstimationError: On non-200 status, malformed payload, a
                per-element status other than ``"OK"``, or a request timeout.
            ValueError: If more than 25 destinations are supplied.
        """

        if not destinations:
            return []
        if len(destinations) > settings.candidate_company_limit:
            raise ValueError(
                "estimate_durations supports at most "
                f"{settings.candidate_company_limit} destinations, "
                f"got {len(destinations)}"
            )

        params = {
            "origins": self._format_coord(origin),
            "destinations": "|".join(self._format_coord(d) for d in destinations),
            "key": self._api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                response = await client.get(self._base_url, params=params)
        except httpx.TimeoutException as exc:
            raise TimeEstimationError(
                "Time_Estimation_Service request timed out after "
                f"{self._timeout_s}s"
            ) from exc
        except httpx.HTTPError as exc:
            raise TimeEstimationError(
                f"Time_Estimation_Service request failed: {exc}"
            ) from exc

        if response.status_code != 200:
            raise TimeEstimationError(
                "Time_Estimation_Service returned non-200 status "
                f"{response.status_code}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise TimeEstimationError(
                "Time_Estimation_Service returned a non-JSON payload"
            ) from exc

        return self._parse_durations(payload, expected=len(destinations))

    async def estimate(
        self,
        origin: tuple[float, float],
        destinations: list[tuple[float, float]],
    ) -> list[EstimationResult]:
        """Resolve commute estimates for each destination, booth-aware.

        This is the entry point strategies should call going forward: it
        transparently routes to the pre-computed Static Route Cache when
        ``settings.booth_demo_mode`` is true, and to the existing live Google
        Distance Matrix path (:meth:`estimate_durations`) otherwise. The live
        path is untouched by this method -- it is called as-is and its
        results are simply wrapped with ``transit_segments=None`` (Distance
        Matrix has no leg-level source, matching pre-existing behavior).

        Booth Demo Mode (Property: interceptor + deterministic fallback):
            Every destination is looked up in the in-memory booth cache via
            :func:`~app.services.booth_cache.lookup_booth_route`. No live API
            call is made under any circumstances while booth mode is active,
            including on a cache miss -- a miss is logged
            (``"BOOTH CACHE MISS: <key>"``) and resolves to
            ``EstimationResult(None, None)`` for that destination rather than
            falling back to the live API or raising.

        Args:
            origin: The user's ``(latitude, longitude)`` coordinates.
            destinations: Up to 25 company ``(latitude, longitude)``
                coordinates.

        Returns:
            A list of :class:`EstimationResult`, aligned to ``destinations``
            order.

        Raises:
            TimeEstimationError: Only on the live (non-booth) path; see
                :meth:`estimate_durations`. Never raised in booth mode.
            ValueError: If more than 25 destinations are supplied (live path
                only; booth mode has no such limit but callers still respect
                it upstream).
        """
        if settings.booth_demo_mode:
            results: list[EstimationResult] = []
            for destination in destinations:
                route = lookup_booth_route(origin, destination)
                results.append(
                    EstimationResult(
                        commute_time_mins=route.commute_time_mins,
                        transit_segments=route.transit_segments,
                    )
                )
            return results

        durations = await self.estimate_durations(origin, destinations)
        return [
            EstimationResult(commute_time_mins=d, transit_segments=None)
            for d in durations
        ]

    @staticmethod
    def _format_coord(coord: tuple[float, float]) -> str:
        """Format a ``(latitude, longitude)`` pair as ``"lat,lng"``."""

        latitude, longitude = coord
        return f"{latitude},{longitude}"

    @staticmethod
    def _parse_durations(payload: object, *, expected: int) -> list[int]:
        """Extract whole-minute durations from a Distance Matrix response.

        Validates the top-level status, the presence of a single origin row,
        and each element's per-destination status before mapping durations to
        whole minutes.
        """

        if not isinstance(payload, dict):
            raise TimeEstimationError(
                "Time_Estimation_Service payload was not an object"
            )

        top_status = payload.get("status")
        if top_status != "OK":
            raise TimeEstimationError(
                f"Time_Estimation_Service top-level status was {top_status!r}"
            )

        rows = payload.get("rows")
        if not isinstance(rows, list) or len(rows) != 1:
            raise TimeEstimationError(
                "Time_Estimation_Service payload did not contain a single "
                "origin row"
            )

        elements = rows[0].get("elements") if isinstance(rows[0], dict) else None
        if not isinstance(elements, list) or len(elements) != expected:
            raise TimeEstimationError(
                "Time_Estimation_Service payload elements did not match the "
                f"number of destinations (expected {expected})"
            )

        durations: list[int] = []
        for element in elements:
            if not isinstance(element, dict):
                raise TimeEstimationError(
                    "Time_Estimation_Service element was malformed"
                )
            element_status = element.get("status")
            if element_status != "OK":
                raise TimeEstimationError(
                    "Time_Estimation_Service element status was "
                    f"{element_status!r}"
                )
            duration = element.get("duration")
            if not isinstance(duration, dict) or "value" not in duration:
                raise TimeEstimationError(
                    "Time_Estimation_Service element was missing a duration "
                    "value"
                )
            duration_value = duration["value"]
            if not isinstance(duration_value, (int, float)) or isinstance(
                duration_value, bool
            ):
                raise TimeEstimationError(
                    "Time_Estimation_Service duration value was not numeric"
                )
            durations.append(duration_seconds_to_commute_mins(duration_value))

        return durations
