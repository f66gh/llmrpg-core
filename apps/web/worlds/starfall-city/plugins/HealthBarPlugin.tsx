import type { GameState } from "@llmrpg/core";
import type { ReactElement } from "react";

export const HealthBarPlugin = {
  id: "world-health-bar",
  render(state: GameState): ReactElement {
    const energy = state.meters.energy ?? 0;
    const maxEnergy = state.meters.energyMax ?? 10;
    const pct = Math.max(0, Math.min(100, Math.round((energy / maxEnergy) * 100)));

    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Energy</div>
        <div
          style={{
            position: "relative",
            height: 12,
            borderRadius: 6,
            background: "#1f2937",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444",
              transition: "width 150ms ease"
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
          {energy} / {maxEnergy}
        </div>
      </div>
    );
  }
};
