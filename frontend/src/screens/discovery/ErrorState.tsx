// Feature: job-discovery-live-search
// Screen 1 — Job Discovery: ErrorState (task 11).
//
// Presentational Error_State shown in the Job_List region when the latest
// Search_Request fails. Follows the existing JobList empty-state pattern: a
// centered message in the list region, plus a Retry_Action button.
//
// Requirements:
//   - 5.2: when the latest Search_Request fails, the job list region shows
//     an error message (K.discoveryErrorMessage) instead of the job list.
//   - 5.3: the error state includes a Retry_Action (K.discoveryRetryAction)
//     that re-issues the search when activated.

import { T } from "../../components";
import { K } from "../../i18n";

export interface ErrorStateProps {
  /** Called when the Retry_Action button is activated. */
  onRetry: () => void;
}

/**
 * The Job_List region's Error_State. Uses `role="alert"` so assistive
 * technology announces the error message, plus a `<button>` wired to
 * `onRetry` labeled with K.discoveryRetryAction.
 */
export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      data-testid="discovery-error"
      role="alert"
      className="flex flex-col items-center justify-center gap-space-md p-space-xl text-center text-body-md text-on-surface-variant"
    >
      <T k={K.discoveryErrorMessage} />
      <button
        type="button"
        onClick={onRetry}
        data-testid="discovery-retry"
        className="inline-flex items-center gap-space-xs rounded-md bg-primary px-space-md py-space-sm text-label-sm font-medium text-on-primary"
      >
        <T k={K.discoveryRetryAction} />
      </button>
    </div>
  );
}
