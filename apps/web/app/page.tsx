"use client";

import { useMemo, useState } from "react";
import type { GameState, StepResult } from "@llmrpg/core";
import { Engine } from "@llmrpg/core";

const INITIAL_STATE: GameState = {
  meta: { version: "0.1.0", seed: 1, phase: "story", turn: 0 },
  time: { day: 1, slot: "morning" },
  location: { zone: "boot", place: "landing" },
  meters: { energy: 10 },
  tags: [],
  inventory: [],
  flags: {},
  log: ["Booted."]
};

const SEED_CHOICES: StepResult["choices"] = [
  { id: "A", text: "Choice A" },
  { id: "B", text: "Choice B" },
  { id: "C", text: "Choice C" },
  { id: "D", text: "Choice D" }
];

const SEED_STEP: StepResult = {
  state: INITIAL_STATE,
  narrative: "",
  choices: SEED_CHOICES,
  applied: [],
  warnings: []
};

export default function Page() {
  const engine = useMemo(() => Engine.createDemo(INITIAL_STATE), []);

  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [stepResult, setStepResult] = useState<StepResult>(SEED_STEP);

  const onChoose = (id: StepResult["choices"][number]["id"]) => {
    const res = engine.step({ type: "choice", id });
    setGameState(res.state);
    setStepResult(res);
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
          {stepResult.choices.map((choice) => (
            <button key={choice.id} onClick={() => onChoose(choice.id)}>
              {choice.text}
            </button>
          ))}
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
