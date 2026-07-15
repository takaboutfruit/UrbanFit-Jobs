"""SQLAlchemy ORM model for the ``stations`` table.

Maps ``coordinate_station.csv`` (``Station_Code``, ``Station_Name_EN``,
``Latitude``, ``Longitude``) to a PostGIS-backed table. Each station carries a
``geography(Point, 4326)`` column derived from its ``(longitude, latitude)``
pair and indexed with GiST so the nearest-station lookups used by the fallback
pricing pipeline are index-assisted.

Rows with empty or out-of-range coordinates are excluded from nearest-station
calculations by the loader (Requirement 7.5).

See design.md "Data Models > Station" (Requirement 7.3).
"""

from __future__ import annotations

from geoalchemy2 import Geography
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Station(Base):
    """A transit station sourced from the coordinate-station CSV.

    Attributes:
        station_code: Primary key, the station's code (``Station_Code``).
        station_name: Human-readable station name (``Station_Name_EN``).
        latitude: Latitude in decimal degrees (-90.0..90.0).
        longitude: Longitude in decimal degrees (-180.0..180.0).
        geog: PostGIS ``geography(Point, 4326)`` derived from
            ``(longitude, latitude)``, GiST-indexed for spatial queries.
    """

    __tablename__ = "stations"

    station_code: Mapped[str] = mapped_column(primary_key=True)
    station_name: Mapped[str] = mapped_column(nullable=False)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    geog: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,
        index=True,
    )
