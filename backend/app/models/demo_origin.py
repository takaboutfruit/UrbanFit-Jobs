"""SQLAlchemy ORM model for the ``demo_origins`` table.

Maps ``demo_routes.csv`` to a PostGIS-backed table of predefined demo origins.
Each demo origin links to a :class:`Company` via ``company_id`` (foreign key to
``companies.id``) and carries the exact fare/time for the curated route plus a
``geography(Point, 4326)`` column derived from its ``(origin_lng, origin_lat)``
pair. The ``geog`` column is GiST-indexed so the Hybrid_Router's
``ST_DWithin(origin_geog, user_point, 500)`` proximity lookup is index-assisted.

A Demo_Origin referencing a non-existent ``company_id`` is excluded from search
results (enforced at load time and reinforced by the job-fetch INNER JOIN).

See design.md "Data Models > Demo_Origin" (Requirement 7.4).
"""

from __future__ import annotations

from geoalchemy2 import Geography
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DemoOrigin(Base):
    """A predefined demo origin sourced from ``demo_routes.csv``.

    Attributes:
        id: Primary key, autoincrementing integer.
        origin_station: Name of the origin station for the curated route.
        origin_lat: Latitude in decimal degrees (-90.0..90.0).
        origin_lng: Longitude in decimal degrees (-180.0..180.0).
        company_id: Foreign key to ``companies.id`` for the matched company.
        exact_fare_thb: Exact fare (THB) for the curated origin-to-company route.
        exact_time_mins: Exact commute time (minutes) for the curated route.
        geog: PostGIS ``geography(Point, 4326)`` derived from
            ``(origin_lng, origin_lat)``, GiST-indexed for spatial queries.
    """

    __tablename__ = "demo_origins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    origin_station: Mapped[str] = mapped_column(nullable=False)
    origin_lat: Mapped[float] = mapped_column(nullable=False)
    origin_lng: Mapped[float] = mapped_column(nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    exact_fare_thb: Mapped[float] = mapped_column(nullable=False)
    exact_time_mins: Mapped[int] = mapped_column(nullable=False)
    geog: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,
        index=True,
    )
