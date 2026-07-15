// Feature: job-discovery-live-search
// Screen 1 — Job Discovery: LoadingState (task 11).
//
// Presentational Loading_State shown in the Job_List region while a
// Search_Request is in flight. Follows the existing JobList empty-state
// pattern: a centered message in the list region.
//
// Requirements:
//   - 5.1: while a Search_Request is in flight, the job list region shows a
//     loading indicator (K.discoveryLoading) instead of the job list.

import { T } from "../../components";
import { K } from "../../i18n";

/**
 * The Job_List region's Loading_State. Uses `role="status"` so assistive
 * technology announces the loading message.
 */
export function LoadingState() {
  return (
    <div
      data-testid="discovery-loading"
      role="status"
      className="flex items-center justify-center p-space-xl text-center text-body-md text-on-surface-variant"
    >
      <T k={K.discoveryLoading} />
    </div>
  );
}
