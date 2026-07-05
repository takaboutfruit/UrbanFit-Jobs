// Feature: urbanfit-jobs-frontend
// Icon component (Req 1.4).
//
// Wraps a Material Symbols Outlined glyph. The symbol `name` (e.g. "search",
// "work", "map") is rendered as the text content of a
// `<span className="material-symbols-outlined">`. The base styles for that
// class (and its `.filled` variant => FILL 1) live in src/index.css.
//
// Accessibility: icons are decorative by default and receive aria-hidden so
// assistive technology skips them. Passing an `aria-label` (or `title`, or an
// explicit `aria-hidden={false}`) promotes the icon to a meaningful image with
// role="img" so screen readers announce the provided label.

import type { AriaAttributes } from "react";

export interface IconProps extends AriaAttributes {
  /** Material Symbols Outlined symbol name, e.g. "search", "work", "map". */
  name: string;
  /** When true, applies the `.filled` class (FILL 1). Defaults to false. */
  filled?: boolean;
  /** Extra classes appended after the base Material Symbols classes. */
  className?: string;
  /** Tooltip text; also promotes the icon to a labeled, non-decorative image. */
  title?: string;
}

export function Icon({
  name,
  filled = false,
  className,
  title,
  ...aria
}: IconProps) {
  const classes = ["material-symbols-outlined"];
  if (filled) {
    classes.push("filled");
  }
  if (className) {
    classes.push(className);
  }

  // Decide accessibility semantics.
  const hasLabel =
    title !== undefined ||
    aria["aria-label"] !== undefined ||
    aria["aria-labelledby"] !== undefined;

  // Respect an explicit aria-hidden if the caller passed one; otherwise the
  // icon is decorative (hidden) unless it carries a label/title.
  const explicitHidden = aria["aria-hidden"];
  const ariaHidden =
    explicitHidden !== undefined ? explicitHidden : hasLabel ? undefined : true;

  // A labeled icon conveys meaning -> expose it as an image to AT.
  const role = hasLabel && ariaHidden !== true ? "img" : undefined;

  return (
    <span
      {...aria}
      className={classes.join(" ")}
      title={title}
      role={role}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}
