// Feature: urbanfit-jobs-frontend
// T (translation) component (Req 1.8, 1.9 / Property 17).
//
// Renders the resolved Thai-first UI string for a translation key. Resolution
// is delegated to the pure `resolveText`, which guarantees a non-empty result
// and never returns the raw key (Property 17). Because resolveText already
// enforces the fallback contract, T can render its output directly.
//
// By default T renders into a `<span>` so it can be used inline. Pass `as` to
// render into a different intrinsic element (e.g. "h1", "label", "p").

import { resolveText } from "../domain";
import { strings } from "../i18n";
import type { I18nKey } from "../i18n";
import type { I18nTable } from "../domain";

export interface TProps {
  /** Translation key to resolve. */
  k: I18nKey;
  /** String table to resolve against. Defaults to the app `strings` table. */
  table?: I18nTable;
  /** Intrinsic wrapper element to render into. Defaults to "span". */
  as?: keyof JSX.IntrinsicElements;
  /** Optional extra classes forwarded to the wrapper element. */
  className?: string;
}

export function T({ k, table, as, className }: TProps) {
  const Wrapper = (as ?? "span") as keyof JSX.IntrinsicElements;
  const text = resolveText(k, table ?? strings);

  return <Wrapper className={className}>{text}</Wrapper>;
}
