"use client";

import { useMemo, useState } from "react";
import type { EventDef, GameState, StepResult } from "@llmrpg/core";
import { Engine } from "@llmrpg/core";
import eventsJson from "../../../packages/worlds/starfall-city/events.json";
import world from "../../../packages/worlds/starfall-city/world.json";

const initialState = world.initialState as GameState;

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
    () => Engine.createFromWorld(initialState, eventsJson as EventDef[]),
    []
  );

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [stepResult, setStepResult] = useState<StepResult>(SEED_STEP);
  const [started, setStarted] = useState(false);

  const onChoose = (id: StepResult["choices"][number]["id"]) => {
    const res = engine.step({ type: "choice", id });
    setGameState(res.state);
    setStepResult(res);
    setStarted(true);
  };

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, padding: 16 }}>
      <section style={{ border: "1px solid #333", borderRadius: 12, padding: 12, minHeight: 400 }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Story</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gameState.log.map((text, i) => (
            <div key={i} style={{ lineHeight: 1.5 }}>
              {text}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {!started ? (
            <button onClick={() => onChoose("A")}>Start</button>
          ) : (
            stepResult.choices.map((choice) => (
              <button key={choice.id} onClick={() => onChoose(choice.id)}>
                {choice.text}
              </button>
            ))
          )}
        </div>
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
