// Feature: urbanfit-jobs-frontend
// Component tests for AssessmentScreen composition (task 9.6 / Req 7.1, 7.2, 14.2).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AssessmentScreen } from "./AssessmentScreen";
import type { ChatMessage, ContextTable } from "../../domain";
import { strings, K } from "../../i18n";

const sampleTable: ContextTable = {
  headers: ["คอลัมน์ A", "คอลัมน์ B"],
  rows: [
    ["a1", "b1"],
    ["a2", "b2"],
  ],
};

const seedMessages: ChatMessage[] = [
  { id: "ai-1", sender: "ai", text: "สวัสดีครับ" },
];

beforeEach(() => {
  // jsdom does not implement scrollIntoView; ChatInterface calls it on mount.
  Element.prototype.scrollIntoView = vi.fn();
});

/**
 * Selects the first challenge card so the coding view (timer/context/chat/
 * code split) mounts (Req 2.3). The screen now opens on a
 * challenge-selection phase; tests exercising the coding view select a card
 * first.
 */
function selectFirstChallenge(container: HTMLElement) {
  const [firstCard] = within(container).getAllByTestId("challenge-card");
  fireEvent.click(firstCard);
}

describe("AssessmentScreen", () => {
  it("renders the top bar with the PromptTimer above the split regions (Req 7.2)", () => {
    const { container } = render(
      <AssessmentScreen
        initialMessages={seedMessages}
        contextTable={sampleTable}
        timeLimitSeconds={300}
      />,
    );
    selectFirstChallenge(container);

    const topbar = screen.getByTestId("assessment-topbar");
    const split = screen.getByTestId("assessment-split");

    // The top bar hosts the PromptTimer.
    expect(within(topbar).getByTestId("prompt-timer")).toBeInTheDocument();

    // The top bar appears BEFORE (above) the split in document order.
    const nodes = Array.from(
      container.querySelectorAll(
        '[data-testid="assessment-topbar"], [data-testid="assessment-split"]',
      ),
    );
    expect(nodes[0]).toBe(topbar);
    expect(nodes[1]).toBe(split);
  });

  it("renders the ContextDataTable (left) and Chat+Code (right) regions (Req 7.1)", () => {
    const { container } = render(
      <AssessmentScreen
        initialMessages={seedMessages}
        contextTable={sampleTable}
        timeLimitSeconds={300}
      />,
    );
    selectFirstChallenge(container);

    const contextRegion = screen.getByTestId("assessment-context-region");
    const answerRegion = screen.getByTestId("assessment-answer-region");

    // Left region hosts the context data table.
    expect(within(contextRegion).getByTestId("context-data-table")).toBeInTheDocument();

    // Right region hosts both the chat interface and the code editor
    // (Monaco-style editor, Req 2.4).
    expect(within(answerRegion).getByTestId("chat-interface")).toBeInTheDocument();
    expect(within(answerRegion).getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("uses md: breakpoint classes for side-by-side >=768 and single-column below (Req 7.1, 14.2)", () => {
    const { container } = render(<AssessmentScreen contextTable={sampleTable} />);
    selectFirstChallenge(container);

    const split = screen.getByTestId("assessment-split");
    // Stacked single column by default (mobile), row at md (>=768px).
    expect(split.className).toContain("flex-col");
    expect(split.className).toContain("md:flex-row");
    // No horizontal scroll: regions are constrained.
    expect(split.className).toContain("min-w-0");
    expect(split.className).toContain("overflow-hidden");

    const contextRegion = screen.getByTestId("assessment-context-region");
    const answerRegion = screen.getByTestId("assessment-answer-region");
    expect(contextRegion.className).toContain("min-w-0");
    expect(answerRegion.className).toContain("min-w-0");
    // Each region takes half the width at desktop size.
    expect(contextRegion.className).toContain("md:w-1/2");
    expect(answerRegion.className).toContain("md:w-1/2");
  });

  it("appends a submitted chat message to the history (Req 9.3 wiring)", () => {
    const { container } = render(
      <AssessmentScreen
        initialMessages={seedMessages}
        contextTable={sampleTable}
        timeLimitSeconds={300}
      />,
    );
    selectFirstChallenge(container);

    // Initially only the seed AI message is present.
    expect(screen.getAllByTestId("chat-message")).toHaveLength(1);

    const input = screen.getByTestId("chat-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "คำตอบของผมคือใช้ max()" } });
    fireEvent.click(screen.getByTestId("chat-send"));

    // The candidate message is appended to the conversation.
    const rows = screen.getAllByTestId("chat-message");
    expect(rows).toHaveLength(2);
    const newest = rows[rows.length - 1];
    expect(newest).toHaveAttribute("data-sender", "candidate");
    expect(within(newest).getByText("คำตอบของผมคือใช้ max()")).toBeInTheDocument();

    // Composer cleared after submit.
    expect(input.value).toBe("");
  });

  it("drives the CodeEditor value from local state (controlled)", () => {
    const { container } = render(<AssessmentScreen contextTable={sampleTable} />);
    selectFirstChallenge(container);

    // The coding view renders the Monaco-style editor (Req 2.4); its
    // transparent input carries the same controlled value/onChange contract.
    const editor = screen.getByTestId(
      "monaco-editor-input",
    ) as HTMLTextAreaElement;
    expect(editor.value).toBe("");

    fireEvent.change(editor, { target: { value: "def f():\n  return 1" } });
    expect(editor.value).toBe("def f():\n  return 1");
  });

  it("renders real sample content when mounted with no props", () => {
    const { container } = render(<AssessmentScreen />);

    // Screen title present.
    expect(screen.getByText(strings[K.assessmentTitle].th)).toBeInTheDocument();

    // The screen opens on the challenge-selection phase (Req 2.3); select a
    // card to reach the coding view where the sample content renders.
    selectFirstChallenge(container);

    // Sample context table renders (not the empty state).
    expect(screen.getByTestId("context-data-table")).toHaveAttribute(
      "data-empty",
      "false",
    );
    // Seed AI messages present.
    expect(screen.getAllByTestId("chat-message").length).toBeGreaterThan(0);
  });

  it("shows the no-context message while preserving the split layout (Req 7.5)", () => {
    const { container } = render(<AssessmentScreen contextTable={null} />);
    selectFirstChallenge(container);

    const table = screen.getByTestId("context-data-table");
    expect(table).toHaveAttribute("data-empty", "true");
    // Split layout is preserved.
    expect(screen.getByTestId("assessment-split")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-answer-region")).toBeInTheDocument();
  });
});
