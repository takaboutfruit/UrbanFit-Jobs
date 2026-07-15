"""SQLAlchemy ORM model for job postings.

Maps ``mock_job_postings.csv`` to the ``job_postings`` table. Each row links to
a :class:`Company` via ``company_id`` (foreign key to ``companies.id``). A
Job_Posting referencing a non-existent company is excluded from search results
(enforced at load time and by the INNER JOIN in the job-fetch query).
"""

from __future__ import annotations

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JobPosting(Base):
    """A job posting sourced from ``mock_job_postings.csv``.

    Source values may be absent on serialization; columns are declared nullable
    to tolerate incomplete source rows without failing the load.
    """

    __tablename__ = "job_postings"

    job_id: Mapped[str] = mapped_column(primary_key=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    job_title: Mapped[str | None] = mapped_column(nullable=True)
    salary: Mapped[int | None] = mapped_column(nullable=True)
    required_skills: Mapped[str | None] = mapped_column(nullable=True)
    employment_type: Mapped[str | None] = mapped_column(nullable=True)
