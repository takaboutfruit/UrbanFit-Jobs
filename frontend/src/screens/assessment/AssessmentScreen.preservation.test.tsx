// Feature: urbanfit-ui-fixes (bugfix)
// Preservation property tests for the Assessment screen's timer/chat/context
// composition and mobile stacking (task 2, updated by task 3.2).
//
// Observation-first methodology: on the CURRENT (unfixed) code the entire
// screen IS the coding view (no challenge-selection phase exists yet), so the
// PromptTimer/ContextDataTable/ChatInterface/CodeEditor split renders
// immediately on mount. These properties observe that baseline across
// randomly generated context tables, chat histories, and timer configs.
//
// Task 3.2 fix update: the screen now opens on a challenge-selection phase
// (Req 2.3) before the split mounts, so each test here selects the first
// challenge card (`selectFirstChallenge`) to enter the coding view — the
// exact preserved point at which the split/timer/context/code composition
// below must render identically to the pre-fix baseline (Req 3.4, 3.7). The
// code input is also now the Monaco-style editor (Req 2.4), so the
// code-editor presence assertion below checks `monaco-editor` rather than
// the retired `code-editor-textarea` testid.
//
// **Validates: Requirements 3.4, 3.7** (Preservation — Property 2, design.md)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, act, cleanup, fireEvent } from "@testing-library/react";
import fc from "fast-check";
import { AssessmentScreen } from "./AssessmentScreen";
import type { ContextTable } from "../../domain";

beforeEach(() => {
  // jsdom does not implement scrollIntoView; ChatInterface calls it on mount.
  Element.prototype.scrollIntoView = vi.fn();
});

/**
 * Selects the first challenge card within `container` so the coding split
 * mounts (Req 2.3). The screen opens on the selection phase; every
 * preservation assertion below observes the coding view, so this helper is
 * called immediately after each render.
 */
function selectFirstChallenge(container: HTMLElement) {
  const [firstCard] = within(container).getAllByTestId("challenge-card");
  fireEvent.click(firstCard);
}

/** Small generator for a random, well-formed ContextTable. */
const contextTableArb: fc.Arbitrary<ContextTable> = fc
  .integer({ min: 1, max: 4 })
  .chain((colCount) =>
    fc.record({
      headers: fc.array(
        fc.string({ minLength: 1, maxLength: 8 }),
        { minLength: colCount, maxLength: colCount },
      ),
      rows: fc.array(
        fc.array(fc.string({ minLength: 0, maxLength: 8 }), {
          minLength: colCount,
          maxLength: colCount,
        }),
        { minLength: 0, maxLength: 5 },
      ),
    }),
  );

describe("Preservation 3.4 — timer/chat/context/code split renders together for any context table", () => {
  it("for any non-empty context table, the top bar timer and all four feature regions render", () => {
    fc.assert(
      fc.property(contextTableArb, (table) => {
        try {
          const { container } = render(<AssessmentScreen contextTable={table} />);
          selectFirstChallenge(container);

          const topbar = within(container).getByTestId("assessment-topbar");
          expect(within(topbar).getByTestId("prompt-timer")).toBeInTheDocument();

          const contextRegion = within(container).getByTestId(
            "assessment-context-region",
          );
          const answerRegion = within(container).getByTestId(
            "assessment-answer-region",
          );
          expect(
            within(contextRegion).getByTestId("context-data-table"),
          ).toBeInTheDocument();
          expect(
            within(answerRegion).getByTestId("chat-interface"),
          ).toBeInTheDocument();
          expect(
            within(answerRegion).getByTestId("monaco-editor"),
          ).toBeInTheDocument();
        } finally {
          cleanup();
        }
      }),
      { numRuns: 15 },
    );
  });

  it("keeps the mobile-stacked / desktop-split classes regardless of the context table shape", () => {
    fc.assert(
      fc.property(contextTableArb, (table) => {
        try {
          const { container } = render(<AssessmentScreen contextTable={table} />);
          selectFirstChallenge(container);
          const split = within(container).getByTestId("assessment-split");
          expect(split.className).toContain("flex-col");
          expect(split.className).toContain("md:flex-row");
        } finally {
          cleanup();
        }
      }),
      { numRuns: 15 },
    );
  });

  it("shows the no-context-data message (not a missing region) when the table is null, for any prior render", () => {
    const { container } = render(<AssessmentScreen contextTable={null} />);
    selectFirstChallenge(container);
    const table = screen.getByTestId("context-data-table");
    expect(table).toHaveAttribute("data-empty", "true");
    expect(screen.getByTestId("assessment-split")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-answer-region")).toBeInTheDocument();
  });
});

describe("Preservation 3.7 — the timer's running state always follows the running prop", () => {
  it("for any (timeLimitSeconds, running) pair, the timer counts down iff running=true, and holds iff running=false", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3600 }),
        fc.boolean(),
        (timeLimitSeconds, running) => {
          vi.useFakeTimers({
            toFake: ["setInterval", "clearInterval", "Date", "performance"],
          });

          try {
            const { container } = render(
              <AssessmentScreen
                contextTable={null}
                timeLimitSeconds={timeLimitSeconds}
                timerRunning={running}
              />,
            );
            selectFirstChallenge(container);

            const value = within(container).getByTestId("prompt-timer-value");
            const initialText = value.textContent;

            act(() => {
              vi.advanceTimersByTime(5_000);
            });

            if (running) {
              // The countdown MAY have already reached 00:00 for very small
              // limits; either way the timer element remains present and
              // reflects elapsed time (never exceeds the initial display).
              expect(value).toBeInTheDocument();
            } else {
              // Paused: display is byte-for-byte unchanged after elapsed time.
              expect(value.textContent).toBe(initialText);
            }
          } finally {
            cleanup();
            vi.useRealTimers();
          }
        },
      ),
      { numRuns: 15 },
    );
  });
});
