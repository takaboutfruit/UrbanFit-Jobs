// Feature: job-discovery-map-first
// Job_Card — Transit_Chain_Row (task 8.2).
//
// Renders a job's transit chain: 1-10 Transit_Segments left-to-right, each
// as a mode icon + "{minutes} นาที" duration, with exactly N-1 connectors
// between adjacent segments. A single Walk segment (N=1) naturally renders
// with zero connectors since N-1 = 0 (Req 5.4). Null/empty segment lists
// render only the commute-unavailable indicator (Req 5.6).
//
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

import { Icon, T } from "../../components";
import {
  formatSegmentDuration,
  resolveTransitIcon,
  type TransitSegment,
} from "../../domain";
import { K } from "../../i18n";

export interface TransitChainRowProps {
  /** Ordered transit legs; null/empty renders the unavailable indicator (Req 5.6). */
  segments: TransitSegment[] | null;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * The Transit_Chain_Row of a Job_Card.
 *
 * - 1-10 segments render left-to-right in their original order (Req 5.1).
 * - Each segment shows a per-mode Material Symbols icon followed by
 *   "{minutes} นาที" (Req 5.2, 5.5, 5.7).
 * - A row of N segments renders exactly N-1 connectors between adjacent
 *   pairs; a single segment (including a lone Walk leg) renders with no
 *   connector at all (Req 5.3, 5.4).
 * - A null or empty segment list renders only the commute-unavailable
 *   indicator, with zero segments, connectors, or icons (Req 5.6).
 */
export function TransitChainRow({ segments, className }: TransitChainRowProps) {
  const wrapperClass = ["flex items-center gap-space-xs", className]
    .filter(Boolean)
    .join(" ");

  if (segments === null || segments.length === 0) {
    return (
      <div data-testid="transit-chain-row" className={wrapperClass}>
        <T
          k={K.commuteUnavailable}
          as="span"
          className="text-body-sm text-on-surface-variant"
        />
      </div>
    );
  }

  return (
    <div data-testid="transit-chain-row" className={wrapperClass}>
      {segments.map((segment, index) => (
        <span
          key={index}
          data-testid="transit-segment"
          data-mode={segment.mode}
          className="flex items-center gap-space-xs"
        >
          <span className="flex items-center gap-1">
            <Icon
              name={resolveTransitIcon(segment.mode)}
              aria-hidden
              className="text-secondary text-body-md"
            />
            <span className="text-body-sm text-on-surface-variant">
              {formatSegmentDuration(segment.minutes)}
            </span>
          </span>
          {index < segments.length - 1 && (
            <Icon
              name="chevron_right"
              aria-hidden
              data-testid="transit-connector"
              className="text-on-surface-variant text-body-sm"
            />
          )}
        </span>
      ))}
    </div>
  );
}
