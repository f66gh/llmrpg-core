import React, { useMemo, useState } from "react";
import type { GameState, StepResult } from "@llmrpg/core";
import type { UIPlugin } from "./UIPlugin";

const LOG_COUNTS = [3, 5, 10];

type DebugHUDProps = {
  state: GameState;
  stepResult?: StepResult;
};

const DebugHUD: React.FC<DebugHUDProps> = ({ state, stepResult }) => {
  const [logCount, setLogCount] = useState<number>(LOG_COUNTS[LOG_COUNTS.length - 1]);
  const effects = stepResult?.applied ?? [];
  const debug = stepResult?.debug ?? [];
  const promptInfo = debug.find((d) => typeof d === "string" && d.startsWith("promptChars:"));
  const promptChars = promptInfo ? promptInfo.split(":")[1] : undefined;
  const effectProposalInfo = debug.find((d) => typeof d === "string" && d.startsWith("effectProposal:"));
  const summaryUpdated = debug.some((d) => typeof d === "string" && d === "summary-updated");

  const recentLogs = useMemo(() => {
    if (!Array.isArray(state.log)) return [];
    return state.log.slice(Math.max(state.log.length - logCount, 0));
  }, [state.log, logCount]);

  return (
    <div style={{ marginTop: 12, padding: 8, border: "1px solid #444", borderRadius: 8 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug HUD</div>
      <div>time: Day {state.time.day}, {state.time.slot}</div>
      <div>location: {state.location.zone} / {state.location.place}</div>
      <div style={{ marginTop: 6, fontWeight: 600 }}>Stats</div>
      <div>money: {state.meters.money ?? 0}</div>
      <div>energy: {state.meters.energy ?? 0}</div>
      <div>stress: {state.meters.stress ?? 0}</div>

      <div style={{ marginTop: 8, fontWeight: 600 }}>Last Step</div>
      <div>eventId: {state.flags.__lastEventId ?? "n/a"}</div>
      <div>pending: {state.flags.__pendingEventId ?? "n/a"}</div>
      <div>branch: {(stepResult?.choices ?? []).map((c) => c.id).join(",") || "n/a"}</div>
      <div>prompt size: {promptChars ?? "n/a"}</div>
      <div>memory summary chars: {state.memory?.summary?.length ?? 0}</div>
      <div>recentTurns count: {state.memory?.recentTurns?.length ?? 0}</div>
      <div>summary updated: {summaryUpdated ? "yes" : "no"}</div>
      <div>effect proposal: {effectProposalInfo ? effectProposalInfo.split(":")[1] : "unknown"}</div>
      <div style={{ wordBreak: "break-all" }}>
        llmProposedEffects: {stepResult?.llmProposedEffects ? JSON.stringify(stepResult.llmProposedEffects) : "[]"}
      </div>
      <div style={{ wordBreak: "break-all" }}>
        acceptedEffects: {stepResult?.acceptedEffects ? JSON.stringify(stepResult.acceptedEffects) : "[]"}
      </div>
      <div style={{ wordBreak: "break-all" }}>
        rejectedEffects: {stepResult?.rejectedEffects ? JSON.stringify(stepResult.rejectedEffects) : "[]"}
      </div>
      <div style={{ wordBreak: "break-all" }}>
        appliedEffects: {effects.length > 0 ? JSON.stringify(effects) : "[]"}
      </div>
      {debug && debug.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontWeight: 600 }}>Debug</div>
          {debug.map((d, i) => (
            <div key={i} style={{ fontSize: 12 }}>{d}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
        <span>Recent logs</span>
        <select
            value={logCount}
            onChange={(e) => setLogCount(Number(e.target.value))}
            style={{ fontSize: 12 }}
        >
          {LOG_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div style={{ maxHeight: 120, overflowY: "auto", paddingRight: 4 }}>
        {recentLogs.length === 0 ? (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>No logs</div>
        ) : (
          recentLogs.map((entry, i) => (
            <div key={i} style={{ fontSize: 12 }}>{entry}</div>
          ))
        )}
      </div>
    </div>
  );
};

export const DebugHUDPlugin: UIPlugin = {
  id: "debug-hud",
  render(state: GameState, stepResult?: StepResult) {
    return <DebugHUD state={state} stepResult={stepResult} />;
  }
};
