import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type LlmReply = {
  narrative: string;
  choices: Array<{ id: "A" | "B" | "C" | "D"; text: string }>;
  effects: unknown[];
  warnings?: string[];
  meta?: { phase?: string };
};

const FALLBACK_CHOICES: LlmReply["choices"] = [
  { id: "A", text: "Choice A" },
  { id: "B", text: "Choice B" },
  { id: "C", text: "Choice C" },
  { id: "D", text: "Choice D" }
];

const FALLBACK_REPLY: LlmReply = {
  narrative: "(LLM output invalid)",
  choices: FALLBACK_CHOICES,
  effects: [],
  warnings: ["invalid-json"]
};

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const system = payload?.system;
  const user = payload?.user;

  // Validate incoming request
  if (typeof system !== "string" || typeof user !== "string") {
    console.error("Invalid request payload:", payload);
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return NextResponse.json({ error: "missing GEMINI_API_KEY" }, { status: 500 });
  }

  // Construct the prompt text
  const promptText = `<SYSTEM>\n${system}\n</SYSTEM>\n\n${user}`;
  console.log("LLM PromptText:", promptText);

  let rawText = "";
  let warnings: string[] = [];

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Call Gemini generateContent
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          // According to official docs structure
          role: "user",
          parts: [{ text: promptText }]
        }
      ]
    });

    // response.text is what official example uses
    rawText = response.text ?? "";
    console.log("Raw Gemini text:", rawText);

  } catch (err) {
    console.error("Gemini API threw:", err);
    // Return fallback if call fails
    return NextResponse.json(
      {
        ...FALLBACK_REPLY,
        warnings: [...(FALLBACK_REPLY.warnings ?? []), "gemini-fetch-error"]
      },
      { status: 200 }
    );
  }

  // Try to parse the rawText into LlmReply
  const validated = safeParseReply(rawText, warnings);
  return NextResponse.json(validated, { status: 200 });
}

// Helper: clean and parse JSON-like text from LLM
function safeParseReply(raw: string, warnings: string[]): LlmReply {
  try {
    // Clean markdown code fences
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/gi, "")
      .trim();

    console.log("Cleaned LLM JSON:", cleaned);

    const parsed = JSON.parse(cleaned);

    if (typeof parsed.narrative !== "string")
      throw new Error("missing/invalid narrative");

    if (!Array.isArray(parsed.choices) || parsed.choices.length !== 4)
      throw new Error("missing/invalid choices");

    const ids = parsed.choices
      .map((c: { id?: string }) => c?.id)
      .sort()
      .join(",");
    if (ids !== "A,B,C,D") throw new Error("choice IDs invalid");

    if (!Array.isArray(parsed.effects)) parsed.effects = [];

    return {
      narrative: parsed.narrative,
      choices: parsed.choices,
      effects: parsed.effects,
      warnings: [...warnings, ...(parsed.warnings ?? [])],
      meta: parsed.meta
    };
  } catch (err) {
    console.error("LLM reply parse/validate failed:", err, "raw:", raw);
    return {
      ...FALLBACK_REPLY,
      warnings: [...(FALLBACK_REPLY.warnings ?? []), ...warnings]
    };
  }
}
