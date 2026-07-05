// Feature: urbanfit-jobs-frontend / urbanfit-ui-fixes (bugfix)
// Screen 2 — Assessment: Code_Editor (task 9.5, updated by task 3.2).
//
// A controlled multi-line answer-code editor. The parent owns the code text
// (per AssessmentState) and passes it in via `value`, receiving edits through
// `onChange`. The editor accepts multi-line entry up to a HARD CAP of 20,000
// characters (Req 9.7): input is both `maxLength`-limited and sliced on change
// so no code path can ever surface more than the cap to the parent.
//
// A submit control (Req 9.8) validates before delegating: if the current value
// is empty or whitespace-only, submission is rejected — `onSubmit` is NOT
// called, the entered content is retained, and a "non-empty answer code
// required" indication (T K.codeRequired) is shown in error styling with
// role="alert" (Req 9.11). A subsequent valid submit calls `onSubmit(value)`
// and clears the error indication.
//
// Req 2.4 (bugfix): the coding view SHALL render the code input as a
// Monaco-style editor (line numbers + token-colored code over a dark
// surface) instead of a plain textarea. Rather than depending on
// `@monaco-editor/react` (which does not run under jsdom), this renders a
// lightweight Monaco-style clone using the classic "transparent textarea
// overlaid on a syntax-highlighted <pre>" technique — the same approach
// libraries like react-simple-code-editor use. This keeps the exact
// controlled `value`/`onChange` contract, `capCode` cap, and
// empty/whitespace submit-validation contract identical, while presenting a
// genuinely different (non-plain-textarea) editor surface.
//
// `variant` selects which surface renders the code input:
//   - "textarea" (default): the original plain `<textarea
//     data-testid="code-editor-textarea">`. Preserved so CodeEditor's own
//     component tests continue to exercise the exact original DOM contract.
//   - "monaco": the Monaco-style editor described above, exposed as
//     `data-testid="monaco-editor"` with no `code-editor-textarea` present in
//     the tree, satisfying the corrected coding-view behavior (Req 2.4).
//
// AssessmentScreen renders CodeEditor with `variant="monaco"` in the coding
// phase (Req 2.4); the cap, whitespace-rejection, and submit behavior below
// are shared by both variants unchanged (preserves Req 3.4).

import { useState } from "react";
import { T } from "../../components";
import { K } from "../../i18n";

/** Hard cap on answer-code length (Req 9.7). */
export const CODE_MAX_LENGTH = 20000;

export interface CodeEditorProps {
  /** Current answer code (controlled; parent owns codeText per AssessmentState). */
  value: string;
  /** Called with the capped value whenever the candidate edits the code. */
  onChange: (value: string) => void;
  /** Called with the code when a valid (non-whitespace) submit occurs (Req 9.8). */
  onSubmit: (code: string) => void;
  /**
   * Which surface renders the code input. Defaults to "textarea" (the
   * original plain textarea). Pass "monaco" for the Monaco-style editor
   * (Req 2.4).
   */
  variant?: "textarea" | "monaco";
  /** Extra classes for the outer container. */
  className?: string;
}

/** Caps input to the hard limit so the parent never sees more than the cap (Req 9.7). */
function capCode(text: string): string {
  return text.length > CODE_MAX_LENGTH ? text.slice(0, CODE_MAX_LENGTH) : text;
}

/** Keyword set used by the lightweight syntax highlighter below. */
const KEYWORDS = new Set([
  "def", "return", "if", "else", "elif", "for", "while", "import", "from",
  "as", "class", "try", "except", "finally", "with", "lambda", "pass",
  "break", "continue", "in", "is", "not", "and", "or", "None", "True",
  "False", "function", "const", "let", "var", "await", "async",
]);

/** A single classified token for the syntax-highlighted overlay. */
interface Token {
  text: string;
  kind: "keyword" | "string" | "comment" | "number" | "plain";
}

/**
 * A small, dependency-free tokenizer that classifies code into
 * keyword/string/comment/number/plain runs so the Monaco-style overlay can
 * color them. It is intentionally simple — this is a visual approximation,
 * not a real language parser.
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(#.*$|\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), kind: "plain" });
    }
    const text = match[0];
    if (text.startsWith("#") || text.startsWith("//")) {
      tokens.push({ text, kind: "comment" });
    } else if (text.startsWith('"') || text.startsWith("'")) {
      tokens.push({ text, kind: "string" });
    } else if (/^\d/.test(text)) {
      tokens.push({ text, kind: "number" });
    } else if (KEYWORDS.has(text)) {
      tokens.push({ text, kind: "keyword" });
    } else {
      tokens.push({ text, kind: "plain" });
    }
    lastIndex = match.index + text.length;
  }
  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), kind: "plain" });
  }
  return tokens;
}

const TOKEN_CLASS: Record<Token["kind"], string> = {
  keyword: "text-[#569cd6]",
  string: "text-[#ce9178]",
  comment: "text-[#6a9955] italic",
  number: "text-[#b5cea8]",
  plain: "text-[#d4d4d4]",
};

/**
 * MonacoStyleEditor.
 *
 * A gutter (line numbers) beside a code surface that layers a
 * syntax-highlighted `<pre>` behind a transparent, fully-functional
 * `<textarea>` so typing, selection, and the caret all behave like a normal
 * text input while the visible text is colored by token kind (Req 2.4).
 */
function MonacoStyleEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const lines = value.length === 0 ? [""] : value.split("\n");

  return (
    <div
      data-testid="monaco-editor"
      className="flex overflow-hidden rounded-md border border-outline bg-[#1e1e1e] font-mono text-body-md"
    >
      {/* Gutter: line numbers (Req 2.4). */}
      <div
        aria-hidden="true"
        data-testid="monaco-editor-gutter"
        className="select-none border-r border-white/10 bg-[#252526] px-space-sm py-space-sm text-right text-on-surface-variant/70"
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Code surface: syntax-highlighted overlay + transparent input. */}
      <div className="relative min-h-[12rem] flex-1">
        <pre
          aria-hidden="true"
          className="pointer-events-none m-0 min-h-[12rem] w-full overflow-hidden whitespace-pre-wrap px-space-sm py-space-sm"
        >
          {lines.map((line, i) => (
            <div key={i}>
              {tokenizeLine(line).map((token, j) => (
                <span key={j} className={TOKEN_CLASS[token.kind]}>
                  {token.text}
                </span>
              ))}
              {line.length === 0 ? "\u00A0" : null}
            </div>
          ))}
        </pre>
        <textarea
          data-testid="monaco-editor-input"
          value={value}
          maxLength={CODE_MAX_LENGTH}
          rows={10}
          spellCheck={false}
          onChange={(e) => onChange(capCode(e.target.value))}
          className="absolute inset-0 h-full min-h-[12rem] w-full resize-none overflow-auto whitespace-pre-wrap bg-transparent px-space-sm py-space-sm text-transparent caret-white outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Code_Editor.
 *
 * Renders a labeled code input (plain textarea or Monaco-style editor,
 * selected via `variant`) plus a submit button. Empty/whitespace submissions
 * are rejected locally (error indication + retained content); valid
 * submissions clear the error and delegate to `onSubmit`.
 */
export function CodeEditor({
  value,
  onChange,
  onSubmit,
  variant = "textarea",
  className,
}: CodeEditorProps) {
  // Whether the last submit attempt was rejected for being empty/whitespace.
  const [showRequired, setShowRequired] = useState(false);

  const containerClasses = ["flex flex-col gap-space-sm", className]
    .filter(Boolean)
    .join(" ");

  function handleSubmit() {
    // Req 9.11: empty or whitespace-only content is not submitted; content is
    // retained (we never touch `value`) and the required indication is shown.
    if (value.trim().length === 0) {
      setShowRequired(true);
      return;
    }
    // Valid submit: clear the indication and delegate (Req 9.8).
    setShowRequired(false);
    onSubmit(value);
  }

  return (
    <div className={containerClasses}>
      <label className="flex flex-col gap-space-xs">
        <T
          k={K.codeEditorLabel}
          as="span"
          className="text-label-sm text-on-surface-variant"
        />
        {variant === "monaco" ? (
          <MonacoStyleEditor value={value} onChange={onChange} />
        ) : (
          <textarea
            data-testid="code-editor-textarea"
            value={value}
            maxLength={CODE_MAX_LENGTH}
            rows={10}
            spellCheck={false}
            onChange={(e) => onChange(capCode(e.target.value))}
            className="min-h-[12rem] w-full resize-y rounded-md border border-outline bg-surface-container px-space-md py-space-sm font-mono text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        )}
      </label>

      {/* Req 9.11: error indication, exposed detectably for downstream tests. */}
      {showRequired && (
        <p
          role="alert"
          data-testid="code-required-error"
          className="text-label-sm text-error"
        >
          <T k={K.codeRequired} />
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="code-submit"
          onClick={handleSubmit}
          className="rounded-md bg-primary px-space-lg py-space-sm text-body-md font-medium text-on-primary transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <T k={K.codeSubmit} />
        </button>
      </div>
    </div>
  );
}
