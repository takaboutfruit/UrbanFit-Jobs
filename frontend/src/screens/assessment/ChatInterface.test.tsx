// Feature: urbanfit-jobs-frontend
// Component tests for ChatInterface (task 9.3 / Req 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.9, 9.10).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ChatInterface, CHAT_MAX_CHARS } from "./ChatInterface";
import { strings, K } from "../../i18n";
import type { ChatMessage } from "../../domain";

const aiMsg = (id: string, text: string, streaming = false): ChatMessage => ({
  id,
  sender: "ai",
  text,
  streaming,
});
const candidateMsg = (id: string, text: string): ChatMessage => ({
  id,
  sender: "candidate",
  text,
});

beforeEach(() => {
  // jsdom does not implement scrollIntoView; provide a spy-able stub.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ChatInterface", () => {
  it("distinguishes AI vs candidate messages by alignment and sender label (Req 9.1)", () => {
    render(
      <ChatInterface
        messages={[
          aiMsg("m1", "สวัสดีครับ"),
          candidateMsg("m2", "สวัสดี ผมพร้อมแล้ว"),
        ]}
        onSubmit={() => {}}
      />,
    );

    const rows = screen.getAllByTestId("chat-message");
    expect(rows).toHaveLength(2);

    const aiRow = rows[0];
    const candidateRow = rows[1];

    // Distinct sender data attributes.
    expect(aiRow).toHaveAttribute("data-sender", "ai");
    expect(candidateRow).toHaveAttribute("data-sender", "candidate");

    // Distinct alignment classes.
    expect(aiRow.className).toContain("items-start");
    expect(candidateRow.className).toContain("items-end");
    expect(aiRow.className).not.toBe(candidateRow.className);

    // Distinct sender labels.
    expect(within(aiRow).getByText(strings[K.chatAiLabel].th)).toBeInTheDocument();
    expect(
      within(candidateRow).getByText(strings[K.chatCandidateLabel].th),
    ).toBeInTheDocument();
  });

  it("caps input at 2,000 characters (Req 9.2)", () => {
    render(<ChatInterface messages={[]} onSubmit={() => {}} />);
    const input = screen.getByTestId("chat-input") as HTMLTextAreaElement;

    const longText = "a".repeat(CHAT_MAX_CHARS + 500);
    fireEvent.change(input, { target: { value: longText } });

    expect(input.value.length).toBe(CHAT_MAX_CHARS);
    expect(CHAT_MAX_CHARS).toBe(2000);
  });

  it("calls onSubmit with the text and clears the input on valid submit (Req 9.3)", () => {
    const onSubmit = vi.fn();
    render(<ChatInterface messages={[]} onSubmit={onSubmit} />);
    const input = screen.getByTestId("chat-input") as HTMLTextAreaElement;

    fireEvent.change(input, { target: { value: "ขอคำใบ้หน่อยครับ" } });
    fireEvent.click(screen.getByTestId("chat-send"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("ขอคำใบ้หน่อยครับ");
    expect(input.value).toBe("");
  });

  it("does nothing and retains content on empty/whitespace submit (Req 9.6)", () => {
    const onSubmit = vi.fn();
    render(<ChatInterface messages={[]} onSubmit={onSubmit} />);
    const input = screen.getByTestId("chat-input") as HTMLTextAreaElement;

    // Whitespace-only.
    fireEvent.change(input, { target: { value: "   \n  \t " } });
    fireEvent.click(screen.getByTestId("chat-send"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(input.value).toBe("   \n  \t ");
  });

  it("shows the typing indicator when loading is true (Req 9.4)", () => {
    const { rerender } = render(
      <ChatInterface messages={[]} onSubmit={() => {}} loading={false} />,
    );
    expect(screen.queryByTestId("chat-typing")).not.toBeInTheDocument();

    rerender(<ChatInterface messages={[]} onSubmit={() => {}} loading={true} />);
    const typing = screen.getByTestId("chat-typing");
    expect(typing).toBeInTheDocument();
    expect(within(typing).getByText(strings[K.chatTyping].th)).toBeInTheDocument();
  });

  it("renders a streaming message's text and a streaming marker (Req 9.5)", () => {
    render(
      <ChatInterface
        messages={[aiMsg("s1", "กำลังวิเคราะห์ข้อมูล", true)]}
        onSubmit={() => {}}
      />,
    );

    const row = screen.getByTestId("chat-message");
    expect(row).toHaveAttribute("data-streaming", "true");
    expect(screen.getByText(/กำลังวิเคราะห์ข้อมูล/)).toBeInTheDocument();
    expect(screen.getByTestId("chat-streaming-cursor")).toBeInTheDocument();
  });

  it("keeps the message history in a scrollable container (Req 9.9)", () => {
    render(
      <ChatInterface
        messages={[aiMsg("m1", "1"), candidateMsg("m2", "2")]}
        onSubmit={() => {}}
      />,
    );
    const history = screen.getByTestId("chat-history");
    expect(history.className).toContain("overflow-y-auto");
    expect(history.className).toMatch(/max-h-/);
  });

  it("auto-scrolls to the newest message when a message is appended (Req 9.10)", () => {
    const scrollSpy = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    const { rerender } = render(
      <ChatInterface messages={[aiMsg("m1", "hi")]} onSubmit={() => {}} />,
    );

    scrollSpy.mockClear();

    // Append a new message -> effect should scroll the bottom sentinel.
    rerender(
      <ChatInterface
        messages={[aiMsg("m1", "hi"), candidateMsg("m2", "hello")]}
        onSubmit={() => {}}
      />,
    );

    expect(scrollSpy).toHaveBeenCalled();
  });
});
