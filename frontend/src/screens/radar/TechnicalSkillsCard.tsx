// Feature: urbanfit-jobs-frontend
// Screen 3 — Radar dashboard: TechnicalSkillsCard.
//
// Card 2 in the left column of the redesigned Radar dashboard: shows each
// verified technical skill as a pass/fail status tag — a green outline for a
// passed check, a red outline for a failed one.

import { T } from "../../components";
import { K, strings } from "../../i18n";
import { resolveText } from "../../domain";
import type { TechnicalSkillCheck } from "../../domain";

export interface TechnicalSkillsCardProps {
  /** The verified technical skill checks to render as status tags. */
  skills: TechnicalSkillCheck[];
  /** Extra classes for the outer card wrapper. */
  className?: string;
}

/**
 * Card showing each technical skill as a pass ("ผ่าน", green outline) or
 * fail ("ไม่ผ่าน", red outline) status tag.
 */
export function TechnicalSkillsCard({ skills, className }: TechnicalSkillsCardProps) {
  return (
    <section
      data-testid="technical-skills-card"
      className={[
        "flex flex-col gap-space-md rounded-xl border border-outline bg-surface-container p-space-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <T
        k={K.radarTechnicalSkillsTitle}
        as="h3"
        className="text-body-lg font-semibold text-on-surface"
      />
      <div className="flex flex-wrap gap-space-sm">
        {skills.map((skill) => {
          const statusLabel = resolveText(
            skill.passed ? K.radarSkillPassed : K.radarSkillFailed,
            strings,
          );
          return (
            <span
              key={skill.skill}
              data-testid="technical-skill-tag"
              data-passed={skill.passed}
              className={[
                "rounded-full border px-space-md py-space-xs text-label-sm font-medium",
                skill.passed
                  ? "border-primary/60 text-primary"
                  : "border-error/60 text-error",
              ].join(" ")}
            >
              {skill.skill}: {statusLabel}
            </span>
          );
        })}
      </div>
    </section>
  );
}
