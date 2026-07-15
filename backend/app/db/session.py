"""Async SQLAlchemy engine, session factory, and FastAPI session dependency.

This module configures the PostGIS-backed PostgreSQL connection using the
asyncpg driver. It exposes:

- ``engine``: a module-level ``AsyncEngine`` created from ``settings.database_url``.
- ``async_session_factory``: an ``async_sessionmaker`` bound to the engine.
- ``get_session``: a FastAPI dependency yielding an ``AsyncSession`` per request.

The database URL is read from ``app.config.settings`` (see task 1). The URL is
expected to use the ``postgresql+asyncpg://`` scheme so that async I/O is used
end-to-end, which keeps request handling within the 3-second SLA and lets the
single-connection-per-request model honor the query-budget bound.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

# A single AsyncEngine is created for the process. asyncpg maintains its own
# connection pool internally; SQLAlchemy layers its pool on top. ``future`` is
# implied in 2.x. We do not enable echo by default to keep logs clean.
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
)

# ``expire_on_commit=False`` keeps ORM instances usable after the session's
# transaction commits, which is convenient when serializing results after the
# request-scoped session's work is done.
async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a request-scoped ``AsyncSession``.

    The session is opened per request and always closed when the request ends,
    returning the underlying connection to the pool. Callers depend on this via
    ``db: AsyncSession = Depends(get_session)``.
    """
    async with async_session_factory() as session:
        yield session
