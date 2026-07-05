// Feature: urbanfit-ui-fixes (bugfix)
// Preservation property tests for CodeEditor cap + submit-validation (task 2).
//
// Observation-first methodology: `capCode` is private to CodeEditor.tsx, so
// these properties observe its EFFECT through the controlled textarea's
// onChange path (as the existing CodeEditor.test.tsx unit tests already do)
// across randomly generated code strings, including at/over the 20,000-char
// cap and whitespace-only strings. They MUST PASS on the unfixed code — this
// locks in the cap + submit-validation baseline the Monaco-editor fix
// (task 3.2) must preserve exactly (Req 3.4).
//
// **Validates: Requirements 3.4** (Preservation — Property 2, design.md)

import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import fc from "fast-check";
import { CodeEditor, CODE_MAX_LENGTH } from "./CodeEditor";

/** Controlled harness mirroring the parent's ownership of codeText. */
function Harness({
  initial = "",
  onSubmit,
}: {
  initial?: string;
  onSubmit: (code: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return <CodeEditor value={value} onChange={setValue} onSubmit={onSubmit} />;
}

describe("Preservation 3.4 — capCode never lets the effective value exceed 20,000 chars", () => {
  it("for any code string, the effective textarea value length is min(length, CODE_MAX_LENGTH)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: CODE_MAX_LENGTH + 500 }),
        (code) => {
          const onSubmit = vi.fn();
          try {
            const { container } = render(<Harness onSubmit={onSubmit} />);
            const textarea = container.querySelector(
              '[data-testid="code-editor-textarea"]',
            ) as HTMLTextAreaElement;

            fireEvent.change(textarea, { target: { value: code } });

            const expectedLength = Math.min(code.length, CODE_MAX_LENGTH);
            expect(textarea.value).toHaveLength(expectedLength);
            expect(textarea.value).toBe(code.slice(0, expectedLength));
          } finally {
            cleanup();
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it("code exactly at the cap is preserved in full, and code one char over the cap is truncated by exactly one char", () => {
    const atCap = "x".repeat(CODE_MAX_LENGTH);
    const overCap = "x".repeat(CODE_MAX_LENGTH + 1);
    const onSubmit = vi.fn();

    const { unmount: unmount1 } = render(<Harness onSubmit={onSubmit} />);
    const textarea1 = screen.getByTestId(
      "code-editor-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea1, { target: { value: atCap } });
    expect(textarea1.value).toHaveLength(CODE_MAX_LENGTH);
    unmount1();
    cleanup();

    const { unmount: unmount2 } = render(<Harness onSubmit={onSubmit} />);
    const textarea2 = screen.getByTestId(
      "code-editor-textarea",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea2, { target: { value: overCap } });
    expect(textarea2.value).toHaveLength(CODE_MAX_LENGTH);
    unmount2();
  });
});

describe("Preservation 3.4 — submit-validation: whitespace-only rejected, valid submit delegates", () => {
  // Generates strings composed only of whitespace characters (including "").
  const whitespaceOnlyArb = fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r"), { maxLength: 40 })
    .map((chars) => chars.join(""));

  it("for any whitespace-only (or empty) code, submit is rejected with role=alert and onSubmit is not called", () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (whitespace) => {
        const onSubmit = vi.fn();
        const onChange = vi.fn();
        try {
          const { container } = render(
            <CodeEditor value={whitespace} onChange={onChange} onSubmit={onSubmit} />,
          );

          fireEvent.click(
            container.querySelector('[data-testid="code-submit"]') as HTMLElement,
          );

          const alert = container.querySelector('[role="alert"]');
          expect(alert).toHaveAttribute("data-testid", "code-required-error");
          expect(onSubmit).not.toHaveBeenCalled();
          // Content retained: no onChange side effect from a rejected submit.
          expect(onChange).not.toHaveBeenCalled();
          // Note: real <textarea> elements (and jsdom, matching the HTML
          // spec) normalize lone "\r" to "\n" in their `.value`, so we assert
          // the retained content is still whitespace-only rather than a
          // byte-for-byte match of the original generated string.
          expect(
            (
              container.querySelector(
                '[data-testid="code-editor-textarea"]',
              ) as HTMLTextAreaElement
            ).value.trim(),
          ).toBe("");
        } finally {
          cleanup();
        }
      }),
      { numRuns: 25 },
    );
  });

  // Generates strings guaranteed to contain at least one non-whitespace char.
  const nonWhitespaceArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => s.trim().length > 0);

  it("for any code containing a non-whitespace character, submit delegates to onSubmit with the exact value and clears the error", () => {
    fc.assert(
      fc.property(nonWhitespaceArb, (code) => {
        const onSubmit = vi.fn();
        try {
          const { container } = render(
            <CodeEditor value={code} onChange={() => {}} onSubmit={onSubmit} />,
          );

          fireEvent.click(
            container.querySelector('[data-testid="code-submit"]') as HTMLElement,
          );

          expect(onSubmit).toHaveBeenCalledTimes(1);
          expect(onSubmit).toHaveBeenCalledWith(code);
          expect(
            container.querySelector('[data-testid="code-required-error"]'),
          ).not.toBeInTheDocument();
        } finally {
          cleanup();
        }
      }),
      { numRuns: 25 },
    );
  });
});
