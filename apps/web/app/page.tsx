"use client";

import { useMemo, useState } from "react";
import type { Effect, EventDef, GameState, LlmReply, StepResult } from "@llmrpg/core";
import {
  Engine,
  applyEffects,
  buildPrompt,
  buildStateDigest
} from "@llmrpg/core";
import eventsJson from "../../../packages/worlds/starfall-city/events.json";
import world from "../../../packages/worlds/starfall-city/world.json";

const worldSummary = world.summary ?? world.name ?? "World";
const initialState = world.initialState as GameState;
const events = eventsJson as EventDef[];

const DEFAULT_CHOICES: StepResult["choices"] = [
  { id: "A", text: "Choice A" },
  { id: "B", text: "Choice B" },
  { id: "C", text: "Choice C" },
  { id: "D", text: "Choice D" }
];

const SEED_STEP: StepResult = {
  state: initialState,
  narrative: "Booted.",
  choices: DEFAULT_CHOICES,
  applied: [],
  warnings: []
};

export default function Page() {
  const engine = useMemo(
    () => Engine.createFromWorld(initialState, events),
    []
  );

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [stepResult, setStepResult] = useState<StepResult>(SEED_STEP);
  const [started, setStarted] = useState(false);
  const [llmMode, setLlmMode] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const onChoose = async (id: StepResult["choices"][number]["id"]) => {
    setStarted(true);
    if (llmMode) {
      await handleLlmChoice(id);
    } else {
      const res = engine.step({ type: "choice", id });
      setGameState(res.state);
      setStepResult(res);
      setWarnings(res.warnings ?? []);
    }
  };

  const handleLlmChoice = async (id: StepResult["choices"][number]["id"]) => {
    try {
      setLoading(true);
      const digest = buildStateDigest(gameState);
      const prompt = buildPrompt({
        worldSummary,
        stateDigest: digest,
        playerAction: { type: "choice", id }
      });

      let reply: LlmReply | null = null;
      let fetchWarnings: string[] = [];
      try {
        const resp = await fetch("/api/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prompt)
        });
        if (!resp.ok) {
          fetchWarnings.push(`llm-http-${resp.status}`);
        }
        reply = (await resp.json()) as LlmReply;
      } catch {
        fetchWarnings.push("llm-fetch-error");
      }

      const validated = validateLlmReply(reply);
      const effects: Effect[] = [
        { op: "set", path: "meta.turn", value: gameState.meta.turn + 1 },
        { op: "pushLog", entry: validated.narrative },
        ...validated.effects
      ];

      if (validated.warnings && validated.warnings.length > 0) {
        effects.push(
          ...validated.warnings.map((w) => ({ op: "pushLog", entry: `warning:${w}` } as Effect))
        );
      }
      if (fetchWarnings.length > 0) {
        effects.push(
          ...fetchWarnings.map((w) => ({ op: "pushLog", entry: `warning:${w}` } as Effect))
        );
      }

      const { state: nextState, warnings: effectWarnings } = applyEffects(gameState, effects);
      const allWarnings = [...fetchWarnings, ...(validated.warnings ?? []), ...effectWarnings];

      setGameState(nextState);
      setStepResult({
        state: nextState,
        narrative: validated.narrative,
        choices: validated.choices,
        applied: effects,
        warnings: allWarnings,
      });
      setWarnings(allWarnings);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setLlmMode((prev) => !prev);
  };

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, padding: 16 }}>
      <section style={{ border: "1px solid #333", borderRadius: 12, padding: 12, minHeight: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Story</h1>
          <button onClick={toggleMode} style={{ marginLeft: 8 }}>
            LLM Mode: {llmMode ? "On" : "Off"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gameState.log.map((text, i) => (
            <div key={i} style={{ lineHeight: 1.5 }}>
              {text}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {!started ? (
            <button onClick={() => onChoose("A")}>Start</button>
          ) : (
            stepResult.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onChoose(choice.id)}
                disabled={loading}
              >
                {choice.text}
              </button>
            ))
          )}
        </div>

        {warnings.length > 0 && (
          <div style={{ marginTop: 12, color: "#d97757" }}>
            <div style={{ fontWeight: 600 }}>Warnings:</div>
            {warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}
      </section>

      <aside style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>HUD</h2>
        <div>turn: {String(gameState.meta.turn)}</div>
        <div>phase: {gameState.meta.phase}</div>
        <div>
          location: {gameState.location.zone} / {gameState.location.place}
        </div>
        <div>
          time: Day {gameState.time.day}, {gameState.time.slot}
        </div>
        {Object.keys(gameState.meters).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Meters</div>
            {Object.entries(gameState.meters).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </div>
        )}
      </aside>
    </main>
  );
}

function validateLlmReply(reply: LlmReply | null): LlmReply {
  if (!reply) {
    return {
      narrative: "(LLM reply missing)",
      choices: DEFAULT_CHOICES,
      effects: [],
      warnings: ["llm-missing"]
    };
  }

  const narrativeOk = typeof reply.narrative === "string";
  const choicesOk =
    Array.isArray(reply.choices) &&
    reply.choices.length === 4 &&
    reply.choices.map((c) => c?.id).sort().join(",") === "A,B,C,D";

  const effectsOk = Array.isArray(reply.effects);

  if (narrativeOk && choicesOk && effectsOk) {
    return reply;
  }

  const warnings: string[] = ["llm-invalid"];
  if (!narrativeOk) warnings.push("narrative");
  if (!choicesOk) warnings.push("choices");
  if (!effectsOk) warnings.push("effects");

  return {
    narrative: "(LLM output invalid)",
    choices: DEFAULT_CHOICES,
    effects: [],
    warnings
  };
}
