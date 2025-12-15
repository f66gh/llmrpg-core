import type { GameState } from "../schema/game";

export type SummaryManagerOptions = {
  interval?: number; // every N turns
  maxChars?: number; // length budget for summary
};

const DEFAULT_INTERVAL = 10;
const DEFAULT_MAX_CHARS = 800;

export class SummaryManager {
  private readonly interval: number;
  private readonly maxChars: number;

  constructor(opts?: SummaryManagerOptions) {
    this.interval = opts?.interval && opts.interval > 0 ? opts.interval : DEFAULT_INTERVAL;
    this.maxChars = opts?.maxChars && opts.maxChars > 0 ? opts.maxChars : DEFAULT_MAX_CHARS;
  }

  shouldSummarize(state: GameState): boolean {
    const turn = state.meta.turn ?? 0;
    return turn > 0 && turn % this.interval === 0;
  }

  summarize(prevSummary: string, recentTurns: NonNullable<GameState["memory"]>["recentTurns"]): string {
    if (!recentTurns || recentTurns.length === 0) return prevSummary ?? "";
    // 拼接最近回合的简要信息，控制长度
    const chunks: string[] = [];
    for (const t of recentTurns.slice(-this.interval)) {
      const head = `回合${t.turn} 日${t.time.day} ${t.time.slot} ${t.location.zone}/${t.location.place}`;
      const brief = t.brief?.trim() ?? "";
      const fx = t.effects ? ` 效果:${t.effects}` : "";
      chunks.push(`${head}：${brief}${fx}`);
    }
    const text = chunks.join(" | ");
    const merged = prevSummary ? `${prevSummary} | ${text}` : text;
    return merged.length > this.maxChars ? merged.slice(-this.maxChars) : merged;
  }
}
