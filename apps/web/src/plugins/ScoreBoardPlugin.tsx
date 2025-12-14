import type { GameState } from "@llmrpg/core";
import type { UIPlugin } from "./UIPlugin";

export const ScoreBoardPlugin: UIPlugin = {
  id: "score-board",
  render(state: GameState) {
    const score = (state as any).meters?.score ?? (state as any).score ?? 0;
    const credits = (state as any).meters?.credits ?? (state as any).credits ?? state.flags?.credits ?? 0;

    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Scoreboard</div>
        <div style={{ fontSize: 12, color: "#cbd5e1" }}>Score: {score}</div>
        <div style={{ fontSize: 12, color: "#cbd5e1" }}>Credits: {credits}</div>
      </div>
    );
  }
};
