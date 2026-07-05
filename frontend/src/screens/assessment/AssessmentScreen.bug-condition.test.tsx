// Feature: urbanfit-ui-fixes (bugfix)
// Bug condition exploration tests for the Assessment screen (task 1).
//
// Encodes isBugCondition(X) clauses 1.3 and 1.4 from design.md/bugfix.md:
//   1.3  X.screen = "assessment" AND X.assessmentPhase = "coding"
//        AND X.challengeSelectionShown = false
//        -> the coding split renders immediately, with no preceding
//           challenge-selection view of 3 cards
//   1.4  X.screen = "assessment" AND X.codeInputKind = "plain-textarea"
//        -> the code input is a plain <textarea> instead of a Monaco-style
//           editor
//
// CRITICAL: These tests are EXPECTED TO FAIL on the current unfixed code.
// A failure here is the SUCCESS signal for task 1 — it proves defects 1.3 and
// 1.4 exist. Do NOT modify AssessmentScreen.tsx/CodeEditor.tsx to make these
// pass at this stage.
//
// **Validates: Requirements 1.3, 1.4** (Bug Condition — Property 1, design.md)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssessmentScreen } from "./AssessmentScreen";

beforeEach(() => {
  // jsdom does not implement scrollIntoView; ChatInterface calls it on mount.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Bug condition 1.3 — no challenge-selection phase precedes the coding view", () => {
  it("EXPECTED FAIL on unfixed code: 3 challenge cards render and the coding split is hidden until a card is clicked", () => {
    render(<AssessmentScreen />);

    // Corrected behavior (Req 2.3): mounting the screen should first show a
    // challenge-selection view with exactly 3 cards, and the coding split
    // (assessment-split) should NOT be present yet.
    const cards = screen.queryAllByTestId("challenge-card");
    expect(cards).toHaveLength(3);
    expect(screen.queryByTestId("assessment-split")).not.toBeInTheDocument();
  });
});

describe("Bug condition 1.4 — code input is a plain textarea, not a Monaco-style editor", () => {
  it("EXPECTED FAIL on unfixed code: the coding view renders a Monaco-style editor container instead of code-editor-textarea", () => {
    render(<AssessmentScreen />);

    // The coding view (and its code input) only mounts after a challenge is
    // selected (Req 2.3); select the first card to reach the coding view
    // whose code input this assertion inspects.
    const [firstCard] = screen.getAllByTestId("challenge-card");
    fireEvent.click(firstCard);

    // Corrected behavior (Req 2.4): the code input in the coding view should
    // be a Monaco-style editor (an editor container with line numbers),
    // rather than a plain <textarea data-testid="code-editor-textarea">.
    expect(screen.queryByTestId("code-editor-textarea")).not.toBeInTheDocument();
    expect(screen.queryByTestId("monaco-editor")).toBeInTheDocument();
  });
});
