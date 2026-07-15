"""SQLAlchemy ORM model for the ``companies`` table.

Maps ``company_locations_cleaned_ready.csv`` to a PostGIS-backed table. Each
company carries a ``geography(Point, 4326)`` column derived from its
``(longitude, latitude)`` pair and indexed with GiST so the fallback bounding
search (``ST_DWithin`` within 20 km) is index-assisted.

See design.md "Data Models > Company" (Requirement 7.1).
"""

from __future__ import annotations

from geoalchemy2 import Geography
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Company(Base):
    """A company location sourced from the cleaned company-locations CSV.

    Attributes:
        id: Primary key, normalized to an integer from the CSV ``id`` float
            (e.g. ``7.0`` → ``7``).
        name: Optional human-readable company name; nullable because not all
            source rows carry a name.
        latitude: Latitude in decimal degrees (-90.0..90.0).
        longitude: Longitude in decimal degrees (-180.0..180.0).
        geog: PostGIS ``geography(Point, 4326)`` derived from
            ``(longitude, latitude)``, GiST-indexed for spatial queries.
    """

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str | None] = mapped_column(nullable=True)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    geog: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,
        index=True,
    )
