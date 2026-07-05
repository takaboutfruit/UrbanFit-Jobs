// Feature: urbanfit-jobs-frontend
// PromptTimer — per-prompt countdown for the AI Roleplay Assessment.
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7.
//
// Placed in its own feature folder and exported directly from this file to
// avoid touching a shared `src/screens/assessment/index.ts` barrel (another
// task may own it).

import { useEffect, useRef, useState } from "react";
import { formatMMSS } from "../../domain";
import { T } from "../../components";
import { K } from "../../i18n";

/** Recompute cadence for the monotonic countdown, in milliseconds. */
const TICK_MS = 250;

/**
 * High-resolution, monotonic wall clock in milliseconds.
 *
 * Prefers `performance.now()` — which is monotonic and immune to system-clock
 * adjustments — and falls back to `Date.now()` where it is unavailable. The
 * countdown is driven from deltas of this clock rather than by naively
 * decrementing a counter, keeping displayed time within ±1s of real elapsed
 * time (Req 8.4).
 */
function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export interface PromptTimerProps {
  /** Configured time limit for the active prompt, in seconds. */
  timeLimitSeconds: number;
  /**
   * Identifier of the active prompt. Changing it (a new prompt becoming
   * active) restarts the countdown from `timeLimitSeconds` (Req 8.3).
   */
  promptId?: string | number;
  /** Invoked exactly once when the countdown reaches 00:00. */
  onExpire?: () => void;
  /** Whether the countdown is running. Defaults to true. */
  running?: boolean;
  /** Extra classes forwarded to the outer wrapper. */
  className?: string;
}

/**
 * Displays the remaining time for the current assessment prompt in `MM:SS`
 * (via `formatMMSS`) rendered in the error-red color (Req 8.1, 8.2), counts
 * down using monotonic timestamp deltas (Req 8.4), holds at `00:00` and shows
 * a time-ended indication when it expires (Req 8.5, 8.6), and shows a
 * descriptive per-prompt label (Req 8.7).
 */
export function PromptTimer({
  timeLimitSeconds,
  promptId,
  onExpire,
  running = true,
  className,
}: PromptTimerProps) {
  const limit = Math.max(0, timeLimitSeconds);

  const [remainingSeconds, setRemainingSeconds] = useState(limit);
  const [isExpired, setIsExpired] = useState(limit <= 0);

  // Latest remaining value the countdown effect resumes from without needing
  // to list `remainingSeconds` in its dependency array.
  const remainingRef = useRef(limit);
  // Keep the latest onExpire without retriggering the countdown effect.
  const onExpireRef = useRef(onExpire);
  // Ensures onExpire fires at most once per prompt (Req 8.5/8.6).
  const expireFiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // (Re)initialize when a new prompt becomes active or the limit changes:
  // reset the displayed remaining time to the configured limit and begin the
  // countdown afresh (Req 8.3). Declared before the countdown effect so the
  // ref is reset before that effect captures its starting value.
  useEffect(() => {
    remainingRef.current = limit;
    expireFiredRef.current = false;
    setRemainingSeconds(limit);
    setIsExpired(false);
  }, [promptId, limit]);

  // Countdown driver (Req 8.4): capture a start timestamp, then on each tick
  // recompute remaining = startRemaining - elapsed from the monotonic clock.
  // Stops and holds at 00:00 on expiry (Req 8.5) and cleans up its interval on
  // unmount and whenever it stops.
  useEffect(() => {
    if (!running || isExpired) {
      return;
    }

    const startClock = nowMs();
    const startRemaining = remainingRef.current;

    // Returns true when the timer has reached zero.
    const tick = (): boolean => {
      const elapsedSeconds = (nowMs() - startClock) / 1000;
      const next = Math.max(0, startRemaining - elapsedSeconds);
      remainingRef.current = next;
      setRemainingSeconds(next);

      if (next <= 0) {
        setIsExpired(true);
        if (!expireFiredRef.current) {
          expireFiredRef.current = true;
          onExpireRef.current?.();
        }
        return true;
      }
      return false;
    };

    // Evaluate immediately so a zero (or already-elapsed) limit ends without
    // waiting for the first interval.
    if (tick()) {
      return;
    }

    const intervalId = setInterval(() => {
      if (tick()) {
        clearInterval(intervalId);
      }
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [promptId, limit, running, isExpired]);

  // Round up so the display holds at the full limit until a whole second has
  // elapsed, then decrements one second at a time (Req 8.1/8.4).
  const display = formatMMSS(Math.ceil(remainingSeconds));

  return (
    <div
      data-testid="prompt-timer"
      className={["flex flex-col gap-space-xs", className].filter(Boolean).join(" ")}
    >
      {/* Descriptive per-prompt label (Req 8.7). */}
      <T
        k={K.timerLabel}
        as="span"
        className="text-label-sm text-on-surface-variant"
      />

      {/* Remaining time in MM:SS, error red (Req 8.1, 8.2). */}
      <span
        data-testid="prompt-timer-value"
        role="timer"
        aria-live="off"
        className="text-headline-md font-semibold tabular-nums text-error"
      >
        {display}
      </span>

      {/* Time-ended indication once the countdown reaches 00:00 (Req 8.6). */}
      {isExpired && (
        <span
          data-testid="prompt-timer-ended"
          role="status"
          className="text-label-sm text-error"
        >
          <T k={K.timeEnded} />
        </span>
      )}
    </div>
  );
}
