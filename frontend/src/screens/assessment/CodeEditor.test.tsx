// Feature: urbanfit-jobs-frontend
// Component tests for CodeEditor (task 9.5 / Req 9.7, 9.8, 9.11).

import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodeEditor, CODE_MAX_LENGTH } from "./CodeEditor";
import { strings, K } from "../../i18n";

/**
 * Controlled harness mirroring the parent's ownership of codeText
 * (per AssessmentState). It lets the textarea reflect capped edits so we can
 * assert on the effective value the parent would store.
 */
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

describe("CodeEditor", () => {
  it("renders the label and submit control (Req 9.7, 9.8)", () => {
    render(<CodeEditor value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText(strings[K.codeEditorLabel].th)).toBeInTheDocument();
    const submit = screen.getByTestId("code-submit");
    expect(submit).toHaveTextContent(strings[K.codeSubmit].th);
  });

  it("caps textarea input at 20,000 characters (Req 9.7)", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const textarea = screen.getByTestId(
      "code-editor-textarea",
    ) as HTMLTextAreaElement;

    // maxLength enforces the cap at the DOM level.
    expect(textarea).toHaveAttribute("maxlength", String(CODE_MAX_LENGTH));

    // Programmatic over-length change is sliced by the component (defense in depth).
    const tooLong = "a".repeat(CODE_MAX_LENGTH + 500);
    fireEvent.change(textarea, { target: { value: tooLong } });
    expect(textarea.value).toHaveLength(CODE_MAX_LENGTH);
  });

  it("rejects an empty submit: shows the required error and does not call onSubmit (Req 9.11)", () => {
    const onSubmit = vi.fn();
    render(<CodeEditor value="" onChange={() => {}} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId("code-submit"));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-testid", "code-required-error");
    expect(alert).toHaveTextContent(strings[K.codeRequired].th);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only submit and retains the entered content (Req 9.11)", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const whitespace = "   \n\t  ";
    render(
      <CodeEditor value={whitespace} onChange={onChange} onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByTestId("code-submit"));

    // Error shown, submit blocked.
    expect(screen.getByTestId("code-required-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    // Content retained: value untouched (no onChange side effect) and textarea keeps it.
    expect(onChange).not.toHaveBeenCalled();
    expect(
      (screen.getByTestId("code-editor-textarea") as HTMLTextAreaElement).value,
    ).toBe(whitespace);
  });

  it("submits valid code with the current value and clears the error (Req 9.8, 9.11)", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const textarea = screen.getByTestId(
      "code-editor-textarea",
    ) as HTMLTextAreaElement;

    // First: an empty submit surfaces the error.
    fireEvent.click(screen.getByTestId("code-submit"));
    expect(screen.getByTestId("code-required-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    // Then: enter valid multi-line code and submit.
    const code = "def solve():\n    return 42\n";
    fireEvent.change(textarea, { target: { value: code } });
    fireEvent.click(screen.getByTestId("code-submit"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(code);
    // Error indication cleared after a valid submit.
    expect(screen.queryByTestId("code-required-error")).not.toBeInTheDocument();
  });
});
