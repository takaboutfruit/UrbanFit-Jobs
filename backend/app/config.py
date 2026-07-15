"""Application configuration and domain constants.

Centralizes environment-driven settings (database URL, Google Distance Matrix
API credentials) and the fixed domain constants used by the Hybrid Routing
Strategy so they have a single source of truth (see design.md "Notes").
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from the environment.

    Values may be overridden via environment variables (optionally through a
    ``.env`` file). Defaults are provided for local development.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database ---------------------------------------------------------
    # Async SQLAlchemy URL (asyncpg driver) for the PostGIS-enabled database.
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/hybrid_routing"
    )

    # --- Time Estimation Service (Google Distance Matrix API) -------------
    google_distance_matrix_api_key: str = ""
    google_distance_matrix_url: str = (
        "https://maps.googleapis.com/maps/api/distancematrix/json"
    )

    # --- Domain constants (Hybrid Routing Strategy) -----------------------
    # Radius (meters) within which a user matches a Demo_Origin -> Exact_Match.
    hero_radius_m: float = 500.0
    # Straight-line radius (meters) bounding fallback candidate companies.
    # Widened from 20km to 50km so the Greater Bangkok outer zones
    # (Nonthaburi, Pathum Thani, Samut Prakan) are actually reachable as
    # fallback candidates -- at 20km, jobs placed in those provinces could
    # never be selected regardless of the dataset's spatial dispersal,
    # capping every possible commute time well below the 45-120 minute
    # range the tolerance slider is meant to exercise.
    spatial_bounding_radius_m: float = 50000.0
    # Distance (meters) beyond which a last-mile fare is added.
    last_mile_threshold_m: float = 800.0
    # Maximum companies whose commute times are requested in one batch call.
    candidate_company_limit: int = 25
    # Of candidate_company_limit, how many are the strict nearest companies
    # (guarantees close-by matches survive). The remainder
    # (candidate_company_limit - stratified_nearest_count) is filled by a
    # random sample from the rest of the 20km-bounded pool, so the candidate
    # set spans a wider spatial/commute-time spread instead of being entirely
    # the absolute closest companies.
    stratified_nearest_count: int = 10
    # Timeout (seconds) applied to each Time_Estimation_Service call.
    time_service_timeout_s: float = 1.5


settings = Settings()
"""Singleton settings instance imported across the application."""
