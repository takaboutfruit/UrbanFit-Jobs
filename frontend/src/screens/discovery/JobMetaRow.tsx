// Feature: job-discovery-map-first
// Job_Card Job_Meta_Row (task 8.3): the demoted title/company row of a
// Map-First job card.
//
// Requirements:
//   - 6.1: displays the job's non-empty title (<=120 chars) and non-empty
//     company name (<=120 chars) in a muted-gray typography treatment whose
//     font size is smaller than the Fit_Badges value text.
//   - UI Refactor (eliminate redundancy): title and company are merged into
//     a single "{title} - {company}" line instead of two stacked lines, so
//     the company name is no longer duplicated elsewhere on the card.
//
// Typography: `text-label-sm` (12px) paired with `text-on-surface-variant`
// for the muted-gray treatment. This is strictly smaller than Primary_Row's
// `text-body-lg` (16px, task 8.1) and leaves headroom below any reasonable
// Fit_Badges value size (`text-body-md` 14px or `text-body-lg` 16px, task 8.4).

export interface JobMetaRowProps {
  /** Non-empty job title, up to 120 characters (Req 6.1). */
  title: string;
  /** Non-empty company name, up to 120 characters (Req 6.1). */
  company: string;
  /** Extra classes for the wrapper element. */
  className?: string;
}

/**
 * Renders the Job_Meta_Row: a single "{title} - {company}" line in
 * muted-gray text sized smaller than the Fit_Badges value text (Req 6.1).
 */
export function JobMetaRow({ title, company, className }: JobMetaRowProps) {
  return (
    <span
      data-testid="job-meta-row"
      className={["truncate text-label-sm text-on-surface-variant", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span data-testid="job-title">{title}</span>
      {" - "}
      <span data-testid="job-company">{company}</span>
    </span>
  );
}
