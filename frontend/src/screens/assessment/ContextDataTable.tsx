// Feature: urbanfit-jobs-frontend
// Screen 2 — Assessment: Context_Data_Table (task 9.2).
//
// Renders the provided raw context data as an HTML <table> with visible column
// header labels (Req 7.3). The table lives inside a fixed-height scroll
// container so that, when the row count overflows the left region, the body
// scrolls vertically while the <thead> stays pinned via `position: sticky`
// (Req 7.4) — every row stays reachable and the headers remain visible.
//
// When there is no context data (null table, or a table with no headers or no
// rows) the component renders a "no context data" message (T K.contextEmpty)
// inside the same container box, so the split-screen layout is preserved and
// the region does not collapse (Req 7.5).

import { T } from "../../components";
import { K } from "../../i18n";
import type { ContextTable } from "../../domain";

export interface ContextDataTableProps {
  /** Raw context data to render, or null when none is available (Req 7.5). */
  table: ContextTable | null;
  /** Extra classes for the outer container box. */
  className?: string;
}

/** True when there is nothing meaningful to render as a table. */
function isEmpty(table: ContextTable | null): table is null {
  return (
    table === null ||
    table.headers.length === 0 ||
    table.rows.length === 0
  );
}

/**
 * Context_Data_Table.
 *
 * The outer element is always the same bordered, fixed-region container so the
 * component occupies its region whether or not data is present. Inside, we
 * render either the empty-state message or a vertically scrollable table with a
 * sticky header row.
 */
export function ContextDataTable({ table, className }: ContextDataTableProps) {
  const containerClasses = [
    "rounded-md border border-outline bg-surface-container",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (isEmpty(table)) {
    return (
      <div
        data-testid="context-data-table"
        data-empty="true"
        className={containerClasses}
      >
        <div className="flex h-full min-h-[8rem] items-center justify-center p-space-lg">
          <T
            k={K.contextEmpty}
            className="text-body-md text-on-surface-variant"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="context-data-table"
      data-empty="false"
      className={containerClasses}
    >
      {/* Scroll container: caps height and scrolls vertically on overflow (Req 7.4). */}
      <div
        data-testid="context-data-scroll"
        className="max-h-[24rem] overflow-y-auto"
      >
        <table className="w-full border-collapse text-left text-body-md text-on-surface">
          {/* Sticky header keeps column labels visible while the body scrolls (Req 7.4). */}
          <thead className="sticky top-0 z-10 bg-surface-container-high">
            <tr>
              {table.headers.map((header, i) => (
                <th
                  key={i}
                  scope="col"
                  className="sticky top-0 border-b border-outline bg-surface-container-high px-space-md py-space-sm text-label-sm font-medium text-on-surface-variant"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr
                key={r}
                className="border-b border-outline/60 last:border-b-0"
              >
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="px-space-md py-space-sm align-top text-on-surface"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
