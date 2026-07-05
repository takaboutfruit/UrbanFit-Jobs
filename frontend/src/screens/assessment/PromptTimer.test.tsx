// Feature: urbanfit-jobs-frontend
// Component tests for PromptTimer (Req 8.1-8.7).
//
// Uses fake timers with the `performance` clock also faked, so the component's
// monotonic delta math (which reads performance.now()) advances consistently
// with the interval, making the countdown deterministically testable.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PromptTimer } from "./PromptTimer";
import { formatMMSS } from "../../domain";
import { strings, K } from "../../i18n";

const timerLabel = strings[K.timerLabel].th;
const timeEnded = strings[K.timeEnded].th;

/** Advance both the interval clock and the monotonic clock together. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("PromptTimer", () => {
  beforeEach(() => {
    // Fake the interval timers AND the performance/Date clocks so the
    // component's delta math advances in lockstep with the interval.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date", "performance"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the initial remaining time as formatMMSS(limit) in error red", () => {
    render(<PromptTimer timeLimitSeconds={300} promptId="p1" />);

    const value = screen.getByTestId("prompt-timer-value");
    expect(value).toHaveTextContent(formatMMSS(300)); // "05:00"
    expect(value).toHaveClass("text-error");
  });

  it("renders the descriptive per-prompt label", () => {
    render(<PromptTimer timeLimitSeconds={300} promptId="p1" />);
    expect(screen.getByText(timerLabel)).toBeInTheDocument();
  });

  it("counts down based on elapsed time (monotonic delta)", () => {
    render(<PromptTimer timeLimitSeconds={300} promptId="p1" />);

    const value = screen.getByTestId("prompt-timer-value");
    expect(value).toHaveTextContent("05:00");

    advance(5_000); // 5 seconds elapsed
    expect(value).toHaveTextContent(formatMMSS(295)); // "04:55"

    advance(55_000); // 60 seconds total elapsed
    expect(value).toHaveTextContent(formatMMSS(240)); // "04:00"
  });

  it("holds at 00:00, shows the time-ended indication, and calls onExpire once", () => {
    const onExpire = vi.fn();
    render(<PromptTimer timeLimitSeconds={10} promptId="p1" onExpire={onExpire} />);

    const value = screen.getByTestId("prompt-timer-value");
    expect(value).toHaveTextContent("00:10");
    expect(screen.queryByTestId("prompt-timer-ended")).toBeNull();

    // Advance past the limit.
    advance(11_000);

    expect(value).toHaveTextContent("00:00");
    const ended = screen.getByTestId("prompt-timer-ended");
    expect(ended).toHaveTextContent(timeEnded);
    expect(onExpire).toHaveBeenCalledTimes(1);

    // Further ticks keep the display held at 00:00 and do not re-fire onExpire.
    advance(5_000);
    expect(value).toHaveTextContent("00:00");
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("restarts the countdown when a new prompt becomes active", () => {
    const { rerender } = render(
      <PromptTimer timeLimitSeconds={300} promptId="p1" />,
    );
    const value = screen.getByTestId("prompt-timer-value");

    advance(30_000); // 30s into prompt 1
    expect(value).toHaveTextContent(formatMMSS(270)); // "04:30"

    // New prompt with a different limit -> reinitialize to the new limit.
    rerender(<PromptTimer timeLimitSeconds={120} promptId="p2" />);
    expect(value).toHaveTextContent("02:00");

    advance(10_000);
    expect(value).toHaveTextContent(formatMMSS(110)); // "01:50"
  });

  it("does not count down while paused (running=false)", () => {
    render(<PromptTimer timeLimitSeconds={300} promptId="p1" running={false} />);
    const value = screen.getByTestId("prompt-timer-value");

    expect(value).toHaveTextContent("05:00");
    advance(10_000);
    expect(value).toHaveTextContent("05:00");
  });
});
