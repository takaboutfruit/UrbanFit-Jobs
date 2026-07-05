// Feature: urbanfit-ui-fixes (bugfix)
// Assessment screen: ChallengeCard.
//
// A single challenge card shown in the challenge-selection phase, presenting
// a Title, Description, Required Skills, and Difficulty (Req 2.3). The whole
// card is a `<button>` so it is keyboard-focusable and activates on
// Enter/Space as well as click, mirroring the JobCard pattern. Selecting a
// card calls `onSelect(id)` so the parent can switch `assessmentPhase` to
// `"coding"`.
//
// Layout:
//   - The difficulty is shown as a small badge, absolutely positioned in the
//     top-right corner, color-coded by level (green/amber/red).
//   - Required skills render as a row of small rounded chips at the bottom
//     of the card.

import { resolveText } from "../../domain";
import { T } from "../../components";
import { K, strings } from "../../i18n";
import type { I18nKey } from "../../i18n";

export interface ChallengeCardProps {
  /** Stable identifier for this challenge, passed back via onSelect. */
  id: string;
  /** i18n key resolving to the card's Thai title. */
  titleKey: I18nKey;
  /** i18n key resolving to the card's Thai description. */
  descriptionKey: I18nKey;
  /** i18n key resolving to the card's required-skills text (comma-separated). */
  skillsKey: I18nKey;
  /** i18n key resolving to the card's difficulty label. */
  difficultyKey: I18nKey;
  /** Called with `id` when the card is activated. */
  onSelect: (id: string) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/** Difficulty badge color treatments, keyed by the Thai difficulty label. */
const DIFFICULTY_BADGE_CLASSES: Record<string, string> = {
  // ง่าย (Easy) -> green
  ง่าย: "bg-primary/15 text-primary border border-primary/40",
  // ปานกลาง (Medium) -> amber
  ปานกลาง: "bg-warning/15 text-warning border border-warning/40",
  // ยาก (Hard) -> red
  ยาก: "bg-error/15 text-error border border-error/40",
};

/** Fallback badge treatment for an unrecognized difficulty label. */
const DEFAULT_DIFFICULTY_BADGE_CLASSES =
  "bg-surface-container-high text-on-surface-variant border border-outline";

/**
 * Challenge_Card.
 *
 * Presentational card rendered in Dark Mode with Thai text (Req 3.1). Exposes
 * a stable `data-testid="challenge-card"` for the bug-condition test to count
 * (exactly 3 cards must render in the selection phase, Req 2.3).
 */
export function ChallengeCard({
  id,
  titleKey,
  descriptionKey,
  skillsKey,
  difficultyKey,
  onSelect,
  className,
}: ChallengeCardProps) {
  const difficultyLabel = resolveText(difficultyKey, strings);
  const skillsText = resolveText(skillsKey, strings);
  const skills = skillsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const badgeClasses =
    DIFFICULTY_BADGE_CLASSES[difficultyLabel] ?? DEFAULT_DIFFICULTY_BADGE_CLASSES;

  return (
    <button
      type="button"
      data-testid="challenge-card"
      onClick={() => onSelect(id)}
      className={[
        "relative flex w-full flex-col gap-space-md rounded-xl border border-surface-container-high bg-surface-container p-space-lg pt-space-xl text-left transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Difficulty badge, absolutely positioned in the top-right corner,
          color-coded by level. */}
      <span
        data-testid="challenge-difficulty-badge"
        className={[
          "absolute right-space-md top-space-md rounded-full px-space-sm py-space-xs text-label-sm font-medium",
          badgeClasses,
        ].join(" ")}
      >
        {difficultyLabel}
      </span>

      <T k={titleKey} as="h3" className="pr-space-xl text-body-lg font-semibold text-on-surface" />
      <T k={descriptionKey} as="p" className="text-body-md text-on-surface-variant" />

      {/* Required skills as a flex row of rounded chips at the bottom. */}
      <div
        data-testid="challenge-skills"
        className="mt-auto flex flex-wrap items-center gap-space-xs pt-space-sm"
      >
        <T
          k={K.challengeSkillsLabel}
          as="span"
          className="sr-only"
        />
        {skills.map((skill) => (
          <span
            key={skill}
            data-testid="challenge-skill-chip"
            className="rounded-full bg-surface-container-high px-space-sm py-space-xs text-label-sm text-on-surface-variant"
          >
            {skill}
          </span>
        ))}
      </div>
    </button>
  );
}
