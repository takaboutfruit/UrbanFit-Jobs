// Feature: urbanfit-ui-fixes (bugfix)
// PovToggle — floating Candidate/HR point-of-view switch (Req 2.2).
//
// Rendered once by AppShell, fixed to the bottom-right of the viewport, above
// the mobile bottom nav so it never overlaps it. Styled as a two-segment
// toggle switch: both "มุมมองผู้สมัคร" (Candidate) and "มุมมอง HR" (HR) labels
// are always present in the DOM as segments, with the active segment getting
// a distinct visual treatment; clicking a segment switches the POV.
//
// data-testid="pov-toggle" identifies the root element (asserted by
// AppShell.bug-condition.test.tsx, Req 1.2).

import { T } from "../components";
import { K } from "../i18n";
import { usePov } from "./pov-context";

export function PovToggle() {
  const { pov, setPov } = usePov();

  const segmentBase =
    "px-space-md py-space-xs text-label-sm rounded-full transition-colors";
  const activeSegment = "bg-primary text-on-primary font-medium";
  const inactiveSegment =
    "text-on-surface-variant hover:text-on-surface";

  return (
    <div
      data-testid="pov-toggle"
      role="group"
      aria-label="Point of view"
      className="fixed bottom-24 right-space-md z-[1100] flex items-center gap-1 rounded-full border border-surface-container bg-surface-container-low p-1 shadow-lg md:bottom-space-md"
    >
      <button
        type="button"
        data-testid="pov-toggle-candidate"
        aria-pressed={pov === "candidate"}
        onClick={() => setPov("candidate")}
        className={[segmentBase, pov === "candidate" ? activeSegment : inactiveSegment].join(" ")}
      >
        <T k={K.povCandidate} />
      </button>
      <button
        type="button"
        data-testid="pov-toggle-hr"
        aria-pressed={pov === "hr"}
        onClick={() => setPov("hr")}
        className={[segmentBase, pov === "hr" ? activeSegment : inactiveSegment].join(" ")}
      >
        <T k={K.povHr} />
      </button>
    </div>
  );
}
