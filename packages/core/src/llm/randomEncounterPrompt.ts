type RandomEncounterContext = {
  worldId: string;
  time: { day: number; slot: string };
  location: { zone: string; place: string };
  meters?: Record<string, number>;
  recentLogs?: string[];
  interactables?: Array<{ id: string; text: string; hint?: string }>;
  memory?: {
    summary?: string;
    recentTurns?: Array<{
      turn: number;
      time: { day: number; slot: string };
      location: { zone: string; place: string };
      eventId?: string;
      moveId?: string;
      choiceId?: string;
      brief: string;
      effects?: string;
    }>;
  };
};

/**
 * Prompt to ask LLM for a safe encounter shaped as LLMReplyEnvelope.
 * Output must be pure JSON (no markdown), structure:
 * {
 *   "story": { "narrative": string, "choiceResult"?: string },
 *   "nextMoves": [{ "id": string, "text": string, "hint"?: string }],
 *   "proposedEffects"?: Effect[]
 * }
 * Constraints:
 * - story.narrative 必填，中文。
 * - nextMoves 必填，3~5 条动作建议；id 可用 A/B/C/D/E 或其他字符串。
 * - proposedEffects 可选，且数值变动要小（money/energy/stress 每次 -3..+3）。
 * - 仅允许 Effect 白名单：inc/set/addTag/removeTag/pushLog/moveLocation。
 * - 不要新增字段，不要返回代码块或说明。
 * - worldId 决定世界观（sandbox / starfall-city 等），不要突破设定。
 */
export function buildRandomEncounterPrompt(ctx: RandomEncounterContext): { system: string; user: string } {
  const system = [
    "你是事件生成器，只能返回严格的 JSON（不要 Markdown，不要解释）。",
    "输出必须符合 LLMReplyEnvelope：",
    "{ \"story\": { \"narrative\": string, \"choiceResult\"?: string }, \"nextMoves\": [{\"id\":string,\"text\":string,\"hint\"?:string}], \"proposedEffects\"?: Effect[] }",
    "Effect 仅允许：inc{path,amount}, set{path,value}, addTag{tag}, removeTag{tag}, pushLog{entry}, moveLocation{zone,place}。",
    "数值变动要小：money/energy/stress 的 inc.amount 在 -3..+3，必要时可再缩小。",
    "nextMoves 必须提供 3~5 条，id 可用 A/B/C/D/E 等；不要省略。",
    "保持 worldId 对应的氛围（sandbox 或 starfall-city），不要引入新的设定。",
    "只返回 JSON，不能有多余字段或代码块。"
  ].join(" ");

  const minimalState = {
    meters: ctx.meters ?? {},
    recentLogs: ctx.recentLogs ?? [],
    memory: {
      summary: ctx.memory?.summary ?? "",
      recentTurns: (ctx.memory?.recentTurns ?? []).slice(-3)
    },
    interactables: (ctx.interactables ?? []).slice(0, 5)
  };

  const user = [
    `worldId: ${ctx.worldId}`,
    `time: day ${ctx.time.day}, slot ${ctx.time.slot}`,
    `location: ${ctx.location.zone} / ${ctx.location.place}`,
    `minimalState: ${JSON.stringify(minimalState)}`
  ].join("\n");

  return { system, user };
}
