"use client";

import { useMemo, useState } from "react";
import { Engine } from "@llmrpg/core";

type LogItem = { text: string };

export default function Page() {
  const engine = useMemo(
    () =>
      Engine.createDemo({
        turn: 0,
        money: 100,
        location: "Boot",
        log: ["Booted."]
      }),
    []
  );

  // ✅ lazy initializer：只在第一次渲染时 tick 一次
  const [gameState, setGameState] = useState<any>(() => engine.tick());
  const [log, setLog] = useState<LogItem[]>([{ text: "Booted." }]);

  const onTick = () => {
    const next = engine.tick();
    setGameState(next);
    setLog((l) => [...l, { text: `Turn ${(next as any).turn}: tick` }]);
  };

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, padding: 16 }}>
      <section style={{ border: "1px solid #333", borderRadius: 12, padding: 12, minHeight: 400 }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>Story</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {log.map((x, i) => (
            <div key={i} style={{ lineHeight: 1.5 }}>
              {x.text}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onTick}>Tick</button>
        </div>
      </section>

      <aside style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>HUD</h2>
        <div>turn: {String(gameState?.turn ?? "")}</div>
        <div>money: {String(gameState?.money ?? "")}</div>
        <div>location: {String(gameState?.location ?? "")}</div>
      </aside>
    </main>
  );
}
