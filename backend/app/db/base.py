"""Declarative base for all SQLAlchemy ORM models.

All spatial and relational models (Company, Job_Posting, Station, Demo_Origin)
inherit from this single ``Base`` so that metadata is shared across the schema.
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy 2.x declarative base class.

    Serves as the single registry/metadata anchor for every ORM model in the
    application. Model modules import ``Base`` from here to keep table metadata
    unified for schema creation and reflection.
    """
