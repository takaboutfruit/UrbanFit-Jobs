// Feature: urbanfit-jobs-frontend
// Component tests for ToleranceSlider (task 7.1). Covers "{value} นาที" display
// (Req 6.3), immediate update (Req 6.4), and 15..120 step-5 range (Req 6.2).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import {
  ToleranceSlider,
  TOLERANCE_MIN,
  TOLERANCE_MAX,
  TOLERANCE_STEP,
} from "./ToleranceSlider";
import { strings, K } from "../../i18n";

const UNIT = strings[K.toleranceUnit].th; // "นาที"

function Harness({ initial = 30 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  return <ToleranceSlider value={value} onChange={setValue} />;
}

describe("ToleranceSlider", () => {
  it("renders the tolerance label", () => {
    render(<ToleranceSlider value={30} onChange={() => {}} />);
    expect(screen.getByText(strings[K.toleranceLabel].th)).toBeInTheDocument();
  });

  it('displays the current value as "{value} นาที"', () => {
    render(<ToleranceSlider value={45} onChange={() => {}} />);
    expect(screen.getByTestId("tolerance-display")).toHaveTextContent(`45 ${UNIT}`);
  });

  it("exposes slider semantics with the configured range", () => {
    render(<ToleranceSlider value={30} onChange={() => {}} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", String(TOLERANCE_MIN));
    expect(slider).toHaveAttribute("max", String(TOLERANCE_MAX));
    expect(slider).toHaveAttribute("step", String(TOLERANCE_STEP));
    expect(slider).toHaveAttribute("aria-valuemin", String(TOLERANCE_MIN));
    expect(slider).toHaveAttribute("aria-valuemax", String(TOLERANCE_MAX));
    expect(slider).toHaveAttribute("aria-valuenow", "30");
  });

  it("emits the new minute value on change", () => {
    const onChange = vi.fn();
    render(<ToleranceSlider value={30} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "60" } });
    expect(onChange).toHaveBeenCalledWith(60);
  });

  it("updates the displayed value immediately when the slider moves", () => {
    render(<Harness initial={15} />);
    const slider = screen.getByRole("slider");
    expect(screen.getByTestId("tolerance-display")).toHaveTextContent(`15 ${UNIT}`);
    fireEvent.change(slider, { target: { value: "120" } });
    expect(screen.getByTestId("tolerance-display")).toHaveTextContent(`120 ${UNIT}`);
    expect(slider).toHaveAttribute("aria-valuenow", "120");
  });

  it("emits step-5 values across the 15..120 range", () => {
    const emitted: number[] = [];
    // Controlled harness so every distinct step value fires a change event
    // (a native range input only emits onChange when its value actually moves).
    function Recorder() {
      const [value, setValue] = useState(TOLERANCE_MIN);
      return (
        <ToleranceSlider
          value={value}
          onChange={(m) => {
            emitted.push(m);
            setValue(m);
          }}
        />
      );
    }
    render(<Recorder />);
    const slider = screen.getByRole("slider");
    for (let m = TOLERANCE_MIN + TOLERANCE_STEP; m <= TOLERANCE_MAX; m += TOLERANCE_STEP) {
      fireEvent.change(slider, { target: { value: String(m) } });
    }
    expect(emitted[0]).toBe(20);
    expect(emitted[emitted.length - 1]).toBe(120);
    for (const v of emitted) {
      expect(v).toBeGreaterThanOrEqual(TOLERANCE_MIN);
      expect(v).toBeLessThanOrEqual(TOLERANCE_MAX);
      expect((v - TOLERANCE_MIN) % TOLERANCE_STEP).toBe(0);
    }
  });
});
