// Feature: urbanfit-jobs-frontend
// Screen 2 — Assessment: Chat_Interface (task 9.3).
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.9, 9.10.
//
// Renders the conversation history between the candidate and the AI assistant
// and provides the message composer. Behavior:
//
//  - Distinct alignment + sender labeling for AI vs candidate messages
//    (Req 9.1). Each message row carries a `data-sender="ai" | "candidate"`
//    attribute so alignment/labeling distinction is assertable; AI messages
//    are left-aligned with the K.chatAiLabel, candidate messages right-aligned
//    with the K.chatCandidateLabel.
//  - A textarea composer hard-capped at 2,000 characters (Req 9.2): input is
//    sliced on change and `maxLength` is set. A send control (T K.chatSend).
//  - Valid submit (Req 9.3): when the text has ≥1 non-whitespace character,
//    onSubmit(text) is called with the exact text and the local input is
//    cleared synchronously. The parent owns appending to `messages`.
//  - Empty/whitespace submit (Req 9.6): onSubmit is NOT called and the input
//    content is retained.
//  - Loading/typing indicator (Req 9.4): when `loading` is true, a typing
//    indicator (T K.chatTyping) is shown.
//  - Streaming render (Req 9.5): a message with `streaming: true` renders its
//    current (partial) text and is marked with `data-streaming="true"` plus a
//    blinking cursor affordance. Incremental text arrives via updated props.
//  - Scroll retention + auto-scroll (Req 9.9, 9.10): the history is a
//    scrollable, height-capped container so every message stays reachable;
//    when the message count grows, an effect scrolls a bottom sentinel into
//    view (and sets scrollTop as a jsdom-safe fallback) to reveal the newest.
//
// Exported directly from this file (no shared assessment barrel) so it does
// not collide with sibling components authored by other tasks.

import { useEffect, useRef, useState } from "react";
import { T } from "../../components";
import { K, strings } from "../../i18n";
import { resolveText } from "../../domain";
import type { ChatMessage } from "../../domain";

/** Hard cap on the chat composer input length (Req 9.2). */
export const CHAT_MAX_CHARS = 2000;

export interface ChatInterfaceProps {
  /** Conversation history rendered in order (Req 9.1). Parent-owned. */
  messages: ChatMessage[];
  /**
   * Called with the exact submitted text when the candidate submits a message
   * containing at least one non-whitespace character (Req 9.3). The parent is
   * responsible for appending the resulting message to `messages`.
   */
  onSubmit: (text: string) => void;
  /**
   * Whether the AI is preparing/typing a response. When true, a typing
   * indicator is shown (Req 9.4). Defaults to false.
   */
  loading?: boolean;
  /** Extra classes for the outer container. */
  className?: string;
}

/**
 * Chat_Interface.
 *
 * Owns only its local composer text state; the message history is fully
 * controlled by the parent through `messages`.
 */
export function ChatInterface({
  messages,
  onSubmit,
  loading = false,
  className,
}: ChatInterfaceProps) {
  const [draft, setDraft] = useState("");

  // Bottom sentinel + scroll container refs used for auto-scroll (Req 9.10).
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest message whenever the history grows (Req 9.10).
  // jsdom does not perform layout, so we call scrollIntoView on a bottom
  // sentinel (guarded) and also set scrollTop = scrollHeight as a fallback so
  // the container is pinned to the bottom.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
    const container = historyRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  /**
   * Enforce the 2,000-character hard cap (Req 9.2). We slice defensively in
   * addition to the textarea `maxLength` so programmatic/pasted values that
   * bypass the native cap are still bounded.
   */
  function handleChange(value: string) {
    setDraft(value.slice(0, CHAT_MAX_CHARS));
  }

  /**
   * Submit handler. On valid (non-whitespace) input, call onSubmit with the
   * exact draft text and clear the composer (Req 9.3). On empty/whitespace
   * input, do nothing and retain the content (Req 9.6).
   */
  function handleSubmit() {
    if (draft.trim().length === 0) {
      return;
    }
    onSubmit(draft);
    setDraft("");
  }

  const containerClasses = [
    "flex flex-col gap-space-md rounded-md border border-outline bg-surface-container",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div data-testid="chat-interface" className={containerClasses}>
      {/* Scrollable message history: height-capped so all messages stay
          reachable (Req 9.9). */}
      <div
        ref={historyRef}
        data-testid="chat-history"
        className="flex max-h-[24rem] flex-1 flex-col gap-space-sm overflow-y-auto p-space-md"
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator while the AI prepares a response (Req 9.4). */}
        {loading && (
          <div
            data-testid="chat-typing"
            data-sender="ai"
            role="status"
            className="mr-auto flex max-w-[80%] items-center gap-space-xs rounded-md bg-surface-container-high px-space-md py-space-sm"
          >
            <T
              k={K.chatTyping}
              className="text-body-sm text-on-surface-variant"
            />
            <span className="chat-typing-dots inline-flex gap-[2px]" aria-hidden="true">
              <span className="h-1 w-1 animate-pulse rounded-full bg-on-surface-variant" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-on-surface-variant" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-on-surface-variant" />
            </span>
          </div>
        )}

        {/* Bottom sentinel used for auto-scroll to the newest message. */}
        <div ref={bottomRef} data-testid="chat-bottom-sentinel" />
      </div>

      {/* Composer (Req 9.2). */}
      <div className="flex items-end gap-space-sm border-t border-outline p-space-md">
        <textarea
          data-testid="chat-input"
          aria-label={resolveText(K.chatPlaceholder, strings)}
          value={draft}
          maxLength={CHAT_MAX_CHARS}
          rows={2}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter (without Shift) submits; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={resolveText(K.chatPlaceholder, strings)}
          className="min-h-[3rem] flex-1 resize-none rounded-md border border-outline bg-surface-container-low px-space-md py-space-sm text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          data-testid="chat-send"
          onClick={handleSubmit}
          className="shrink-0 rounded-md bg-primary px-space-lg py-space-sm text-label-md font-medium text-on-primary transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <T k={K.chatSend} />
        </button>
      </div>
    </div>
  );
}

/**
 * A single message row. AI messages are left-aligned and labeled with the AI
 * label; candidate messages are right-aligned and labeled with the candidate
 * label (Req 9.1). Streaming messages render their partial text plus a cursor
 * and are marked with `data-streaming="true"` (Req 9.5).
 */
function ChatBubble({ message }: { message: ChatMessage }) {
  const isCandidate = message.sender === "candidate";
  const isStreaming = message.streaming === true;

  const rowClasses = [
    "flex w-full flex-col gap-space-xs",
    isCandidate ? "items-end text-right" : "items-start text-left",
  ].join(" ");

  const bubbleClasses = [
    "inline-block max-w-[80%] whitespace-pre-wrap break-words rounded-md px-space-md py-space-sm text-body-md",
    isCandidate
      ? "bg-secondary text-on-secondary"
      : "bg-surface-container-high text-on-surface",
  ].join(" ");

  return (
    <div
      data-testid="chat-message"
      data-sender={message.sender}
      data-streaming={isStreaming ? "true" : undefined}
      className={rowClasses}
    >
      {/* Sender label distinguishes AI from candidate (Req 9.1). */}
      <span
        data-testid="chat-sender-label"
        className="text-label-sm text-on-surface-variant"
      >
        <T k={isCandidate ? K.chatCandidateLabel : K.chatAiLabel} />
      </span>

      <span data-testid="chat-message-text" className={bubbleClasses}>
        {message.text}
        {isStreaming && (
          <span
            data-testid="chat-streaming-cursor"
            aria-hidden="true"
            className="ml-[2px] inline-block h-[1em] w-[2px] animate-pulse bg-current align-text-bottom"
          />
        )}
      </span>
    </div>
  );
}

