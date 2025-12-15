import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { NarrateInput, NarrateOutput } from "@llmrpg/core/src/llm/narrator";
import { buildNarratePrompt } from "@llmrpg/core/src/llm/promptBuilder";
import { isNarrateOutput } from "@llmrpg/core/src/llm/narrator";
import { buildRandomEncounterPrompt } from "@llmrpg/core/src/llm/randomEncounterPrompt";
import { mapAdHocEventToEnvelope, mapNarrateToEnvelope } from "@llmrpg/core/src/llm/envelopeAdapters";
import { validateAndSanitizeAdHocEvent } from "@llmrpg/core/src/llm/adHocEvent";
import { validateAndSanitizeLLMEnvelope, type LLMReplyEnvelope } from "@llmrpg/core/src/schema/llm";

type EncounterPayload = {
  mode: "encounter";
  worldId: string;
  time: { day: number; slot: string };
  location: { zone: string; place: string };
  meters?: Record<string, number>;
  recentLogs?: string[];
};

type NarratePayload = NarrateInput & { mode?: "narrate" | undefined };

type RequestBody = EncounterPayload | NarratePayload;

const FALLBACK_NARRATE = (input: NarrateInput): LLMReplyEnvelope => {
  const choiceText = findChoiceText(input);
  return {
    story: {
      narrative: input.eventNarrative,
      choiceResult: `你选择了 ${input.selectedChoiceId}${choiceText ? `: ${choiceText}` : ""}`
    }
  };
};

const FALLBACK_ENCOUNTER: LLMReplyEnvelope = {
  story: { narrative: "（LLM 不可用，使用本地默认遭遇。）" },
  nextMoves: [
    { id: "A", text: "继续观察" },
    { id: "B", text: "稍作休整" }
  ]
};

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as RequestBody | null;

  // Determine mode
  const mode: "narrate" | "encounter" =
    (payload as any)?.mode === "encounter" ? "encounter" : "narrate";

  if (mode === "narrate" && !isValidNarrateInput(payload)) {
    console.error("Invalid NarrateInput:", payload);
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  if (mode === "encounter" && !isValidEncounterInput(payload)) {
    console.error("Invalid Encounter payload:", payload);
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    const fallback = mode === "narrate" ? FALLBACK_NARRATE(payload as NarrateInput) : FALLBACK_ENCOUNTER;
    return NextResponse.json(fallback, { status: 200 });
  }

  try {
    if (mode === "narrate") {
      const narrateInput = payload as NarrateInput;
      const { system, user } = buildNarratePrompt(narrateInput);
      const promptText = `<SYSTEM>\n${system}\n</SYSTEM>\n\n${user}`;
      const promptChars = promptText.length;
      const { rawText, usageMeta } = await callGemini(promptText, apiKey);
      const parsed = safeParseNarrate(rawText);
      const envelopeBase = parsed ? mapNarrateToEnvelope(parsed) : FALLBACK_NARRATE(narrateInput);
      const { envelope, warnings } = validateAndSanitizeLLMEnvelope(envelopeBase);
      if (usageMeta) {
        envelope.debug = { ...(envelope.debug ?? {}), rawText, promptChars, ...usageMeta };
      } else {
        envelope.debug = { ...(envelope.debug ?? {}), rawText, promptChars };
      }
      if (warnings.length > 0) {
        envelope.debug = { ...(envelope.debug ?? {}), warnings: warnings.join(",") };
      }
      return NextResponse.json(envelope, { status: 200 });
    }

    // encounter mode
    const encounterInput = payload as EncounterPayload;
    const { system, user } = buildRandomEncounterPrompt({
      worldId: encounterInput.worldId,
      time: encounterInput.time,
      location: encounterInput.location,
      meters: encounterInput.meters,
      recentLogs: encounterInput.recentLogs
    });
    const promptText = `<SYSTEM>\n${system}\n</SYSTEM>\n\n${user}`;
    const promptChars = promptText.length;
    const { rawText, usageMeta } = await callGemini(promptText, apiKey);
    const parsed = safeParseAdHoc(rawText);
    const warnings: string[] = [];

    // Try envelope first
    let envelopeBase: LLMReplyEnvelope | null = null;
    if (parsed && typeof parsed === "object" && ("story" in (parsed as any) || "nextMoves" in (parsed as any))) {
      const { envelope, warnings: warn } = validateAndSanitizeLLMEnvelope(parsed);
      envelopeBase = envelope;
      warnings.push(...warn);
    }

    // Fallback: ad-hoc event -> envelope
    if (!envelopeBase) {
      const sanitized = parsed ? validateAndSanitizeAdHocEvent(parsed) : { event: undefined as any, warnings: ["parse-failed"] as string[] };
      const mapped = sanitized.event ? mapAdHocEventToEnvelope(sanitized.event) : FALLBACK_ENCOUNTER;
      const { envelope, warnings: warn } = validateAndSanitizeLLMEnvelope(mapped);
      envelopeBase = envelope;
      warnings.push(...(sanitized.warnings ?? []), ...warn);
    }

    const envelope = envelopeBase ?? FALLBACK_ENCOUNTER;
    envelope.debug = {
      ...(envelope.debug ?? {}),
      rawText,
      promptChars,
      warnings: warnings.join(",") || undefined,
      ...usageMeta
    };
    return NextResponse.json(envelope, { status: 200 });
  } catch (err) {
    console.error("Gemini API error:", err);
    const fallback = mode === "narrate" ? FALLBACK_NARRATE(payload as NarrateInput) : FALLBACK_ENCOUNTER;
    return NextResponse.json(fallback, { status: 200 });
  }
}

function isValidNarrateInput(input: unknown): input is NarrateInput {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  const hasStrings =
    typeof obj.worldId === "string" &&
    typeof obj.eventId === "string" &&
    typeof obj.eventNarrative === "string" &&
    typeof obj.selectedChoiceId === "string";
  const hasChoices =
    Array.isArray(obj.choices) &&
    obj.choices.length > 0 &&
    obj.choices.every((c) => typeof c?.id === "string" && typeof c?.text === "string");
  const time = obj.time as any;
  const loc = obj.location as any;
  const hasTime = time && typeof time.day === "number" && typeof time.slot === "string";
  const hasLocation = loc && typeof loc.zone === "string" && typeof loc.place === "string";
  return hasStrings && hasChoices && hasTime && hasLocation;
}

function isValidEncounterInput(input: unknown): input is EncounterPayload {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  const time = obj.time as any;
  const loc = obj.location as any;
  return (
    obj.mode === "encounter" &&
    typeof obj.worldId === "string" &&
    time &&
    typeof time.day === "number" &&
    typeof time.slot === "string" &&
    loc &&
    typeof loc.zone === "string" &&
    typeof loc.place === "string"
  );
}

function safeParseNarrate(raw: string): NarrateOutput | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!isNarrateOutput(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch (err) {
    console.error("Narrate parse failed:", err, "raw:", raw);
    return null;
  }
}

function safeParseAdHoc(raw: string): unknown | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/gi, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("AdHoc parse failed:", err, "raw:", raw);
    return null;
  }
}

function findChoiceText(input: NarrateInput): string {
  const match = input.choices.find((c) => c.id === input.selectedChoiceId);
  return match?.text ?? "未知选项";
}

async function callGemini(promptText: string, apiKey: string): Promise<{ rawText: string; usageMeta?: Record<string, unknown> }> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: promptText }] }]
  });

  const rawText = response.text ?? "";
  const usageMeta = response.usageMetadata ? { usageMetadata: response.usageMetadata } : undefined;

  return { rawText, usageMeta };
}
