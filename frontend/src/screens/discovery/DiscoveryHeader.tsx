// Feature: job-discovery-map-first
// Screen 1 — Job Discovery: DiscoveryHeader.
//
// The header region of the Map-First Job Discovery screen.
//
// The header frames the screen around the "20-Minute City" concept: a
// headline title ("Find jobs within a 20-minute commute") immediately
// followed by a strictly-smaller subtitle, both sourced from the Thai-first
// i18n string table via `resolveText` (Req 1.1-1.5). Below the title block it
// hosts the Commuting Tolerance Slider, which remains the ONLY interactive
// control in the header (Req 3.3).
//
// This component is presentational: it owns no state. The consuming screen
// (JobDiscoveryScreen) owns `toleranceMinutes` and passes it down along with
// the change handler.
//
// Because `resolveText` always returns a non-empty string (Thai, then
// default, then the guaranteed global fallback), the title-above-subtitle DOM
// structure below is unconditional — there is no separate "fallback layout"
// branch, it is simply the same structure rendered with whichever non-empty
// text resolveText returns (Req 1.5).

import { K, strings } from "../../i18n";
import { resolveText } from "../../domain";
import { ToleranceSlider } from "./ToleranceSlider";

export interface DiscoveryHeaderProps {
  /** Current maximum commute time in minutes. */
  toleranceMinutes: number;
  /** Called with the new minute value when the slider moves. */
  onToleranceChange: (minutes: number) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Map-First Job Discovery header: headline title + smaller subtitle framing
 * the 20-minute commute concept, plus the Commuting Tolerance Slider (the
 * only interactive control).
 */
export function DiscoveryHeader({
  toleranceMinutes,
  onToleranceChange,
  className,
}: DiscoveryHeaderProps) {
  const title = resolveText(K.discoveryMapTitle, strings);
  const subtitle = resolveText(K.discoveryMapSubtitle, strings);

  return (
    <header
      className={[
        // Dark-mode surface token on the header region background (Req 3.3).
        "flex flex-col gap-space-lg bg-surface-container-low p-space-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Title block: headline title immediately followed by a strictly
          smaller subtitle, in that vertical order (Req 1.1-1.3, 1.5). */}
      <div className="flex flex-col gap-space-xs">
        <h1
          data-testid="discovery-map-title"
          className="text-headline-md text-on-surface"
        >
          {title}
        </h1>
        <p
          data-testid="discovery-map-subtitle"
          className="text-body-md text-on-surface-variant"
        >
          {subtitle}
        </p>
      </div>

      {/* The Commuting Tolerance Slider is the only interactive control. */}
      <ToleranceSlider
        value={toleranceMinutes}
        onChange={onToleranceChange}
        className="md:w-80"
      />
    </header>
  );
}
