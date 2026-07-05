// Feature: urbanfit-jobs-frontend
// Screen 2 — AI Roleplay Assessment: AssessmentScreen composition (task 9.6).
// Requirements: 7.1, 7.2, 14.2.
//
// Composes the timed roleplay assessment from its feature components:
//
//   - A TOP BAR positioned ABOVE the left/right regions, hosting the
//     PromptTimer (Req 7.2). The top bar spans the full width and is always
//     rendered above the split so the countdown is visible regardless of
//     viewport size.
//   - A DESKTOP SPLIT (Req 7.1): at >=768px (Tailwind `md:`) the
//     ContextDataTable occupies a LEFT region and the ChatInterface + CodeEditor
//     occupy a RIGHT region, side by side and simultaneously visible. Each
//     region uses `min-w-0` + `overflow-hidden` so neither forces a horizontal
//     scrollbar (Req 7.1: no horizontal scrolling).
//   - A MOBILE STACK (Req 14.2): below 768px the container is `flex-col`, so
//     the Context region and the Chat+Code region stack into a single
//     vertically stacked column rather than sitting side by side.
//
// State ownership: the screen owns the local assessment interaction state —
// `messages` (chat history), `codeText` (controlled CodeEditor value), and a
// `loading` flag for the chat typing indicator. Submitting a chat message
// appends a candidate ChatMessage to `messages` (Req 9.3 wiring). The screen
// seeds itself from an in-file sample AssessmentState so the routed screen
// (rendered with no props) shows real content, while accepting optional props
// to override the sample so tests can drive it.
//
// Exported directly from this file (no shared assessment barrel) and
// re-exported from `src/screens/AssessmentScreen.tsx` so the router's lazy
// named import keeps working.

import { useState } from "react";
import type { AssessmentState, ChatMessage, ContextTable } from "../../domain";
import { T } from "../../components";
import { K } from "../../i18n";
import { PromptTimer } from "./PromptTimer";
import { ContextDataTable } from "./ContextDataTable";
import { ChatInterface } from "./ChatInterface";
import { CodeEditor } from "./CodeEditor";
import { ChallengeSelection } from "./ChallengeSelection";

/**
 * In-file sample assessment so the routed screen renders real content when
 * mounted with no props. A prompt with a 5-minute (300s) limit, a small
 * context table, and two seed AI messages.
 */
const sampleContextTable: ContextTable = {
  headers: ["สถานี", "PM2.5 (µg/m³)", "พิกัด (lat, lng)"],
  rows: [
    ["สยาม", "58", "13.7457, 100.5340"],
    ["อโศก", "63", "13.7373, 100.5601"],
    ["พร้อมพงษ์", "49", "13.7305, 100.5697"],
    ["ห้วยขวาง", "71", "13.7690, 100.5740"],
    ["จตุจักร", "66", "13.7998, 100.5501"],
  ],
};

const sampleMessages: ChatMessage[] = [
  {
    id: "ai-1",
    sender: "ai",
    text:
      "สวัสดีครับ วันนี้เราจะจำลองสถานการณ์วิเคราะห์ข้อมูลคุณภาพอากาศของกรุงเทพฯ " +
      "โปรดใช้ข้อมูลในตารางด้านซ้ายประกอบการตอบ",
  },
  {
    id: "ai-2",
    sender: "ai",
    text:
      "โจทย์: เขียนฟังก์ชันที่คืนค่าสถานีที่มีค่า PM2.5 สูงสุด พร้อมอธิบายวิธีคิดสั้น ๆ",
  },
];

/** The sample AssessmentState seeding this screen's initial local state. */
export const sampleAssessmentState: AssessmentState = {
  prompt: {
    id: "prompt-1",
    timeLimitSeconds: 300,
    contextTable: sampleContextTable,
  },
  remainingSeconds: 300,
  timerRunning: true,
  messages: sampleMessages,
  codeText: "",
};

export interface AssessmentScreenProps {
  /** Seed chat history. Defaults to the in-file sample. */
  initialMessages?: ChatMessage[];
  /** Context data for the left region. Defaults to the in-file sample; pass
   *  `null` to exercise the "no context data" state (Req 7.5). */
  contextTable?: ContextTable | null;
  /** Per-prompt time limit in seconds. Defaults to the sample (300). */
  timeLimitSeconds?: number;
  /** Identifier of the active prompt (restarts the timer when it changes). */
  promptId?: string;
  /** Whether the timer is running. Defaults to true. */
  timerRunning?: boolean;
}

/**
 * AssessmentScreen.
 *
 * Owns `messages`, `codeText`, and `loading`. Wires the four feature
 * components together and lays them out as a top bar over a responsive split.
 */
export function AssessmentScreen({
  initialMessages = sampleMessages,
  contextTable = sampleContextTable,
  timeLimitSeconds = sampleAssessmentState.prompt.timeLimitSeconds,
  promptId = sampleAssessmentState.prompt.id,
  timerRunning = true,
}: AssessmentScreenProps = {}) {
  // Req 2.3: the screen opens on a challenge-selection phase; only after a
  // card is clicked does the coding split (timer/context/chat/code) mount.
  // The timer therefore starts only once the coding view is entered
  // (preserves Req 3.7).
  const [assessmentPhase, setAssessmentPhase] = useState<"selection" | "coding">(
    "selection",
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [codeText, setCodeText] = useState<string>("");
  const [loading] = useState<boolean>(false);

  /**
   * Wire ChatInterface submit -> append a candidate message to local history
   * (Req 9.3). ChatInterface has already validated non-whitespace input and
   * cleared its own composer; here we just append the candidate message so it
   * appears in the conversation. A unique id is derived from the current
   * length + timestamp.
   */
  function handleChatSubmit(text: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `candidate-${prev.length}-${Date.now()}`,
        sender: "candidate",
        text,
      },
    ]);
  }

  /** Answer-code submit is a no-op placeholder for now (backend out of scope). */
  function handleCodeSubmit(code: string) {
    // eslint-disable-next-line no-console
    console.log("[AssessmentScreen] answer code submitted", code.length, "chars");
  }

  return (
    <section
      data-testid="assessment-screen"
      className="flex h-full flex-col gap-space-lg p-space-lg"
    >
      {/* Screen title. */}
      <T k={K.assessmentTitle} as="h2" className="text-headline-md text-on-surface" />

      {assessmentPhase === "selection" ? (
        // PHASE 1 — challenge selection (Req 2.3): shown first, with no
        // preceding top bar / split so the coding split is not present yet
        // (fixes bug condition 1.3).
        <ChallengeSelection onSelect={() => setAssessmentPhase("coding")} />
      ) : (
        <>
          {/* TOP BAR above the split regions, hosting the PromptTimer (Req 7.2). */}
          <div
            data-testid="assessment-topbar"
            className="flex w-full items-center justify-between rounded-md border border-outline bg-surface-container px-space-lg py-space-md"
          >
            <PromptTimer
              timeLimitSeconds={timeLimitSeconds}
              promptId={promptId}
              running={timerRunning}
            />
          </div>

          {/* Split container: single column on mobile (<768px), side-by-side at
              >=768px (md:). `min-w-0` + `overflow-hidden` on the regions keep both
              fully visible with no horizontal scroll (Req 7.1, 14.2). */}
          <div
            data-testid="assessment-split"
            className="flex min-w-0 flex-1 flex-col gap-space-lg overflow-hidden md:flex-row"
          >
            {/* LEFT region — Context_Data_Table (Req 7.1). */}
            <div
              data-testid="assessment-context-region"
              className="flex min-w-0 flex-col md:w-1/2 md:flex-1"
            >
              <ContextDataTable table={contextTable} className="h-full" />
            </div>

            {/* RIGHT region — Chat_Interface + Code_Editor stacked (Req 7.1). */}
            <div
              data-testid="assessment-answer-region"
              className="flex min-w-0 flex-col gap-space-lg md:w-1/2 md:flex-1"
            >
              <ChatInterface
                messages={messages}
                onSubmit={handleChatSubmit}
                loading={loading}
              />
              <CodeEditor
                value={codeText}
                onChange={setCodeText}
                onSubmit={handleCodeSubmit}
                variant="monaco"
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
