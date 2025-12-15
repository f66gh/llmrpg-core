import type { Dispatch, SetStateAction } from "react";
import type { GameState, StepResult } from "@llmrpg/core";
import type { NarrateInput } from "@llmrpg/core/src/llm/narrator";
import type { LLMReplyEnvelope } from "@llmrpg/core/src/schema/llm";

type RewriteParams = {
  choiceId: StepResult["choices"][number]["id"];
  state: GameState;
  step: StepResult;
  worldId: string;
  setStepResult: Dispatch<SetStateAction<StepResult>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

type GameStateWithMemory = GameState & {
  memory?: {
    summary?: string;
    recentTurns?: Array<{
      turn: number;
      time: { day: number; slot: string };
      location: { zone: string; place: string };
      eventId?: string;
      moveId?: string;
      choiceId?: string;
      brief: string;
      effects?: string;
    }>;
  };
};

export async function rewriteNarrative({
  choiceId,
  state,
  step,
  worldId,
  setStepResult,
  setLoading
}: RewriteParams) {
  const mem = (state as GameStateWithMemory).memory;

  const narrateInput: NarrateInput = {
    worldId,
    time: state.time,
    location: state.location,
    eventId: String(state.flags.__lastEventId ?? "unknown"),
    eventTitle: undefined,
    eventNarrative: step.narrative,
    choices: step.choices.map((c) => ({ id: c.id, text: c.text })),
    selectedChoiceId: choiceId,
    stateSummary: {
      meters: state.meters,
      tags: state.tags,
      flags: state.flags,
      memory: {
        summary: mem?.summary ?? "",
        recentTurns: mem?.recentTurns?.slice(-5) ?? []
      }
    }
  };

  const fallback: LLMReplyEnvelope = {
    story: {
      narrative: step.narrative,
      choiceResult: `你选择了 ${choiceId}: ${step.choices.find((c) => c.id === choiceId)?.text ?? ""}`
    }
  };

  try {
    setLoading(true);
    const resp = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "narrate", ...narrateInput })
    });
    if (!resp.ok) {
      throw new Error(`llm-http-${resp.status}`);
    }
    const data = (await resp.json()) as LLMReplyEnvelope;
    const story = data?.story ?? fallback.story!;
    const storyText =
      `${story.narrative ?? ""}${story.choiceResult ? `\n${story.choiceResult}` : ""}`.trim() ||
      step.narrative;
    const usageMeta = (data?.debug as any)?.usageMetadata;
    const usageStr = usageMeta ? `usage: ${JSON.stringify(usageMeta)}` : undefined;
    const promptChars = (data?.debug as any)?.promptChars;
    const promptStr = typeof promptChars === "number" ? `promptChars:${promptChars}` : undefined;
    setStepResult((prev) => ({
      ...prev,
      storyText,
      rawEventNarrative: step.narrative,
      debug: [...(prev.debug ?? []), ...(usageStr ? [usageStr] : []), ...(promptStr ? [promptStr] : [])]
    }));
  } catch (err) {
    console.warn("narration failed", err);
    setStepResult((prev) => ({
      ...prev,
      storyText: `${fallback.story?.narrative ?? step.narrative}${
        fallback.story?.choiceResult ? `\n${fallback.story.choiceResult}` : ""
      }`,
      rawEventNarrative: step.narrative
    }));
  } finally {
    setLoading(false);
  }
}
