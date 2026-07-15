"""Pydantic request schemas for the search endpoint.

Defines :class:`SearchQuery`, the model that encapsulates all input validation
for Requirement 1. The model is bound as FastAPI query parameters (see the
transport-layer task), so every field maps to a single scalar query parameter
and carries ``Field`` range constraints. FastAPI raises HTTP 422 with per-field
detail automatically when any constraint fails, so no hand-written validation is
required.

See design.md "Request model — SearchQuery" (Requirements 1.1-1.9).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.services.enrichment import (
    DESIRED_SKILLS_MAX_TOKENS,
    normalize_skill_tokens,
)

SortMode = Literal["fit", "default"]


class SearchQuery(BaseModel):
    """Validated search input for ``GET /search``.

    All range constraints are expressed with Pydantic v2 ``Field`` bounds
    (``ge``/``le``) so that FastAPI returns an HTTP 422 response with per-field
    detail on invalid input and performs no search (Requirement 1.2-1.8). Only
    when every field validates does the request proceed (Requirement 1.9).

    Attributes:
        lat: Required user latitude in decimal degrees, constrained to
            -90 <= lat <= 90 (Requirements 1.2, 1.3).
        lng: Required user longitude in decimal degrees, constrained to
            -180 <= lng <= 180 (Requirements 1.2, 1.4).
        max_fare: Optional maximum fare in Thai Baht; when provided it is
            constrained to 0.01 <= max_fare <= 999999.99 (Requirement 1.5).
        max_time: Optional maximum commute time in whole minutes; when provided
            it is constrained to 1 <= max_time <= 1440 (Requirement 1.6).
        limit: Pagination limit, defaulting to 50, constrained to
            1 <= limit <= 200 (Requirements 1.1, 1.7).
        offset: Pagination offset, defaulting to 0, constrained to
            offset >= 0 (Requirements 1.1, 1.8).
        desired_skills: Optional comma-separated candidate skills used to compute
            the skill fit score. Constrained to at most 500 characters and, after
            normalization, at most ``DESIRED_SKILLS_MAX_TOKENS`` tokens; violations
            are surfaced by FastAPI as HTTP 422 (Requirements 1.1, 1.4, 1.5).
        sort: Optional ordering mode. ``"fit"`` orders by overall fit; ``"default"``
            (and omission) preserve the pre-existing ordering. Any other value is
            rejected as HTTP 422 (Requirements 4.1, 4.3).
    """

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    max_fare: float | None = Field(default=None, ge=0.01, le=999999.99)
    max_time: int | None = Field(default=None, ge=1, le=1440)
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    desired_skills: str | None = Field(default=None, max_length=500)
    sort: SortMode | None = Field(default=None)

    @field_validator("desired_skills")
    @classmethod
    def _validate_desired_skills_token_count(cls, value: str | None) -> str | None:
        """Reject inputs that normalize to more than the allowed token count.

        FastAPI surfaces the raised ``ValueError`` as an HTTP 422 response with
        per-field detail before any search runs (Requirement 1.5).
        """
        if value is None:
            return None
        tokens = normalize_skill_tokens(value)
        if len(tokens) > DESIRED_SKILLS_MAX_TOKENS:
            raise ValueError("too many desired skills supplied")
        return value
