"""Dev bootstrap: enable PostGIS, create tables, and load the CSV data.

This is a one-time setup utility for local/manual runs of the hybrid-routing
search backend. It is NOT a test — it prepares a live database so the
``GET /search`` endpoint can be exercised by hand.

Steps performed:
1. ``CREATE EXTENSION IF NOT EXISTS postgis`` — the spatial functions
   (ST_DWithin / ST_Distance / geography) require the PostGIS extension.
2. ``Base.metadata.create_all`` — creates the four tables (companies,
   job_postings, stations, demo_origins) with their GiST-indexed geography
   columns.
3. ``load_all`` — loads the four ``datasets/`` CSVs, skipping coordinate-invalid
   and dangling-foreign-key rows, then commits.

Usage (from the ``backend/`` directory, with backend/.env configured):

    python -m scripts.bootstrap_db

Pass ``--drop`` to drop and recreate all tables first (destructive):

    python -m scripts.bootstrap_db --drop
"""

from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import text

# Importing the models package registers every table on Base.metadata.
import app.models  # noqa: F401
from app.db.base import Base
from app.db.loader import load_all
from app.db.session import async_session_factory, engine


async def _bootstrap(drop: bool) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        if drop:
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        counts = await load_all(session)
        await session.commit()

    print("Loaded row counts:")
    for table, count in counts.items():
        print(f"  {table}: {count}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap the PostGIS database.")
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop all tables before recreating them (destructive).",
    )
    args = parser.parse_args()
    asyncio.run(_bootstrap(args.drop))


if __name__ == "__main__":
    main()
