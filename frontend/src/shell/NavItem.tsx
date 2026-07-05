// Feature: urbanfit-jobs-frontend
// NavItem — a single navigation destination entry (Req 2.1, 2.2, 2.3).
//
// Renders a react-router Link to `route` showing the Material Symbols icon and
// the translated label. When `isActive` is true the entry receives a DISTINCT
// visual treatment (primary-container background + primary text) and exposes
// aria-current="page" so the active destination is programmatically detectable
// (Req 2.3 / Property 16). Inactive entries render in the on-surface-variant
// muted treatment.

import { Link } from "react-router-dom";
import { Icon, T } from "../components";
import type { I18nKey } from "../i18n";

export interface NavItemProps {
  /** Material Symbols Outlined icon name, e.g. "work", "radar". */
  icon: string;
  /** Translation key for the destination label. */
  labelKey: I18nKey;
  /** Target route path, e.g. "/jobs". */
  route: string;
  /** Whether this entry corresponds to the currently active route. */
  isActive: boolean;
  /**
   * Orientation of the entry. "vertical" (icon above label) suits the bottom
   * nav; "horizontal" (icon beside label) suits the side nav. Defaults to
   * "horizontal".
   */
  orientation?: "horizontal" | "vertical";
}

export function NavItem({
  icon,
  labelKey,
  route,
  isActive,
  orientation = "horizontal",
}: NavItemProps) {
  const base =
    "flex items-center gap-space-sm rounded-lg px-space-md py-space-sm text-label-lg transition-colors";
  const layout =
    orientation === "vertical"
      ? "flex-col gap-1 flex-1 justify-center px-space-sm text-label-sm"
      : "";

  // Distinct active vs inactive visual treatment (Req 2.3).
  const activeClasses = "bg-primary-container text-primary font-medium";
  const inactiveClasses =
    "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";

  return (
    <Link
      to={route}
      data-testid={`nav-item-${route}`}
      data-active={isActive ? "true" : "false"}
      aria-current={isActive ? "page" : undefined}
      className={[base, layout, isActive ? activeClasses : inactiveClasses]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon name={icon} filled={isActive} aria-hidden />
      <T k={labelKey} />
    </Link>
  );
}
