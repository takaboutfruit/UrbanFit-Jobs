// Feature: urbanfit-jobs-frontend
// Screen 1 — Job Discovery: DiscoveryHeader.
//
// The header region of the Job Discovery screen.
//
// Onboarding-driven UX: the candidate's Job Role and Residence are already
// pre-selected during onboarding, so this header no longer shows a search
// input. Instead it shows a static context block (recommended role +
// residence-based subtitle) plus the Commuting Tolerance Slider, which
// remains the ONLY interactive control in the header.
//
// This component is presentational: it owns no state. The consuming screen
// (JobDiscoveryScreen) owns `toleranceMinutes` and passes it down along with
// the change handler.

import { T } from "../../components";
import { K, strings } from "../../i18n";
import { resolveText } from "../../domain";
import { ToleranceSlider } from "./ToleranceSlider";

export interface DiscoveryHeaderProps {
  /** The pre-selected job role from onboarding, e.g. "Data Analyst". */
  recommendedRole: string;
  /** Current maximum commute time in minutes. */
  toleranceMinutes: number;
  /** Called with the new minute value when the slider moves. */
  onToleranceChange: (minutes: number) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Job Discovery header: static role/residence context block + the
 * Commuting Tolerance Slider (the only interactive control).
 */
export function DiscoveryHeader({
  recommendedRole,
  toleranceMinutes,
  onToleranceChange,
  className,
}: DiscoveryHeaderProps) {
  const roleTitle = resolveText(K.discoveryRoleTemplate, strings).replace(
    "{role}",
    recommendedRole,
  );

  return (
    <header
      className={[
        "flex flex-col gap-space-lg p-space-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Static context header — the role and residence are pre-selected
          during onboarding, so no search input is shown here. */}
      <div className="flex flex-col gap-space-xs">
        <h1
          data-testid="discovery-role-title"
          className="text-headline-md text-on-surface"
        >
          {roleTitle}
        </h1>
        <T
          k={K.discoveryResidenceContext}
          as="p"
          className="text-body-md text-on-surface-variant"
        />
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
