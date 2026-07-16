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

    ``work_model``, ``years_experience_required``, and ``career_growth_index``
    are the qualification-schema fields added for the booth demo dataset
    expansion. ``work_model`` is an explicit source column (distinct from the
    pre-existing ``employment_type`` -> Work_Model derivation in
    :func:`app.services.enrichment.derive_work_model`): when present it is
    used as-is, and the derivation from ``employment_type`` remains as a
    fallback for older rows that only carry ``employment_type``.
    """

    __tablename__ = "job_postings"

    job_id: Mapped[str] = mapped_column(primary_key=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    job_title: Mapped[str | None] = mapped_column(nullable=True)
    salary: Mapped[int | None] = mapped_column(nullable=True)
    required_skills: Mapped[str | None] = mapped_column(nullable=True)
    employment_type: Mapped[str | None] = mapped_column(nullable=True)
    # Restricted to "On-site" | "Hybrid" | "Remote" at the application layer
    # (see app.services.enrichment.WORK_MODEL_VALUES); stored as free text and
    # validated on write by the loader, not by a DB-level CHECK constraint.
    work_model: Mapped[str | None] = mapped_column(nullable=True)
    years_experience_required: Mapped[int | None] = mapped_column(nullable=True)
    # Restricted to "High" | "Medium" | "Stable" at the application layer (see
    # app.services.enrichment.CAREER_GROWTH_VALUES).
    career_growth_index: Mapped[str | None] = mapped_column(nullable=True)
