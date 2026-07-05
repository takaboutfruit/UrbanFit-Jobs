// Feature: urbanfit-jobs-frontend
// Component tests for ResidenceInput (task 7.1). Example-based coverage of the
// 100-character hard cap (Req 6.1 / 6.6) and label/placeholder rendering.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { ResidenceInput, capResidence, RESIDENCE_MAX_LENGTH } from "./ResidenceInput";
import { strings, K } from "../../i18n";

/** Controlled harness that mirrors how a screen would drive the input. */
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <ResidenceInput value={value} onChange={setValue} />
      <span data-testid="stored-length">{value.length}</span>
      <span data-testid="stored-value">{value}</span>
    </div>
  );
}

describe("ResidenceInput", () => {
  it("renders the residence label and placeholder", () => {
    render(<ResidenceInput value="" onChange={() => {}} />);
    expect(screen.getByText(strings[K.residenceLabel].th)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(strings[K.residencePlaceholder].th),
    ).toBeInTheDocument();
  });

  it("reflects the controlled value", () => {
    render(<ResidenceInput value="สุขุมวิท" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("สุขุมวิท");
  });

  it("emits the typed value up to 100 characters unchanged", () => {
    const onChange = vi.fn();
    render(<ResidenceInput value="" onChange={onChange} />);
    const exactly100 = "a".repeat(100);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: exactly100 } });
    expect(onChange).toHaveBeenCalledWith(exactly100);
    expect(onChange.mock.calls[0][0]).toHaveLength(100);
  });

  it("hard-caps input beyond 100 characters, retaining the first 100", () => {
    const onChange = vi.fn();
    render(<ResidenceInput value="" onChange={onChange} />);
    const over = "x".repeat(150);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: over } });
    const reported = onChange.mock.calls[0][0] as string;
    expect(reported).toHaveLength(RESIDENCE_MAX_LENGTH);
    expect(reported).toBe("x".repeat(100));
  });

  it("never stores more than 100 characters through the controlled loop", () => {
    render(<Harness />);
    const input = screen.getByRole("textbox");
    // Simulate a paste of 250 characters.
    fireEvent.change(input, { target: { value: "z".repeat(250) } });
    expect(screen.getByTestId("stored-length")).toHaveTextContent("100");
    expect(input).toHaveValue("z".repeat(100));
  });

  it("capResidence slices to the first 100 characters", () => {
    expect(capResidence("short")).toBe("short");
    expect(capResidence("q".repeat(100))).toHaveLength(100);
    expect(capResidence("q".repeat(101))).toHaveLength(100);
    expect(capResidence("q".repeat(101))).toBe("q".repeat(100));
  });
});
