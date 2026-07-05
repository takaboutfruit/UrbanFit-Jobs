// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: JobList (task 7.3).
//
// Renders the ordered + filtered job list as a list of JobCards, or an
// empty-state message when there are no jobs.
//
// Requirements:
//   - 4.9: when the list contains zero jobs, show an empty-state message
//     indicating that no matching jobs were found (K.jobsEmpty).
//   - 4.8: exactly one card is selected at a time — driven by `selectedJobId`
//     (isSelected = job.id === selectedJobId).
//
// This component is presentational: the consuming screen (JobDiscoveryScreen,
// task 7.5) supplies the already ordered + filtered `jobs`, the current
// `selectedJobId`, and the `onSelect` handler.

import { T } from "../../components";
import { K } from "../../i18n";
import type { Job } from "../../domain";
import { JobCard } from "./JobCard";

export interface JobListProps {
  /** The already ordered + filtered jobs to render. */
  jobs: Job[];
  /** id of the currently selected job, or null when none (Req 4.8). */
  selectedJobId: string | null;
  /** Called with a job id when a card is activated. */
  onSelect: (id: string) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * The scrollable Job List.
 *
 * Uses a `<ul>`/`<li>` list structure. When `jobs` is empty it renders the
 * K.jobsEmpty message instead of the list (Req 4.9).
 */
export function JobList({ jobs, selectedJobId, onSelect, className }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div
        data-testid="jobs-empty"
        role="status"
        className={[
          "flex items-center justify-center p-space-xl text-center text-body-md text-on-surface-variant",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <T k={K.jobsEmpty} />
      </div>
    );
  }

  return (
    <ul
      data-testid="job-list"
      className={[
        "flex flex-col gap-space-md p-space-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard
            job={job}
            isSelected={job.id === selectedJobId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
