import type { Effect } from "../schema/effects";
import type { LLMReplyEnvelope } from "../schema/llm";
import type { NarrateOutput } from "./narrator";
import type { AdHocEvent } from "./adHocEvent";

export function mapNarrateToEnvelope(out: NarrateOutput): LLMReplyEnvelope {
  return {
    story: {
      narrative: out.rewrittenNarrative,
      choiceResult: out.rewrittenChoiceResult
    },
    debug: out.tone || out.style ? { rawText: JSON.stringify({ tone: out.tone, style: out.style }) } : undefined
  };
}

export function mapAdHocEventToEnvelope(event: AdHocEvent): LLMReplyEnvelope {
  const nextMoves = event.choices.map((c) => ({
    id: c.id,
    text: c.text
  }));

  // Proposed effects: event.effects + first choice effects (optional)
  const proposed: Effect[] = [];
  if (Array.isArray(event.effects)) {
    proposed.push(...event.effects);
  }
  for (const choice of event.choices) {
    if (Array.isArray(choice.effects)) {
      proposed.push(...(choice.effects as Effect[]));
    }
  }

  return {
    story: { narrative: event.narrative },
    nextMoves,
    proposedEffects: proposed
  };
}
