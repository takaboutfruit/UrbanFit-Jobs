// Feature: urbanfit-ui-fixes (bugfix)
// Assessment screen: ChallengeSelection (task 3.2).
//
// The challenge-selection phase shown before the coding split (Req 2.3). It
// renders exactly 3 challenge cards; clicking any card delegates to
// `onSelect` so the parent (AssessmentScreen) can switch `assessmentPhase` to
// `"coding"` and mount the existing timer/context/chat/code split unchanged.

import { T } from "../../components";
import { K } from "../../i18n";
import { ChallengeCard } from "./ChallengeCard";

export interface ChallengeSelectionProps {
  /** Called with the selected challenge id. */
  onSelect: (id: string) => void;
  /** Extra classes for the outer container. */
  className?: string;
}

/**
 * Challenge_Selection.
 *
 * Presentational phase-1 view for the Assessment screen: a Thai heading plus
 * the 3 fixed challenge cards (Req 2.3). Rendered in Dark Mode (Req 3.1).
 */
export function ChallengeSelection({ onSelect, className }: ChallengeSelectionProps) {
  return (
    <div
      data-testid="challenge-selection"
      className={["flex flex-col gap-space-lg", className].filter(Boolean).join(" ")}
    >
      <T
        k={K.challengeSelectionTitle}
        as="h2"
        className="text-headline-md text-on-surface"
      />

      <div className="grid grid-cols-1 gap-space-lg md:grid-cols-3">
        <ChallengeCard
          id="pm25-analysis"
          titleKey={K.challenge1Title}
          descriptionKey={K.challenge1Description}
          skillsKey={K.challenge1Skills}
          difficultyKey={K.challenge1Difficulty}
          onSelect={onSelect}
        />
        <ChallengeCard
          id="query-optimization"
          titleKey={K.challenge2Title}
          descriptionKey={K.challenge2Description}
          skillsKey={K.challenge2Skills}
          difficultyKey={K.challenge2Difficulty}
          onSelect={onSelect}
        />
        <ChallengeCard
          id="commute-dashboard"
          titleKey={K.challenge3Title}
          descriptionKey={K.challenge3Description}
          skillsKey={K.challenge3Skills}
          difficultyKey={K.challenge3Difficulty}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
