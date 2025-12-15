import type { NarrateInput } from "./narrator";
import type { PlayerAction } from "../schema/step";
import type { GameState } from "../schema/game";

const RECENT_TURNS_LIMIT = 5;

type BuildPromptArgs = {
  worldSummary: string;
  stateDigest: unknown;
  playerAction: PlayerAction;
  memory?: GameState["memory"];
};

export function buildPrompt(args: BuildPromptArgs): { system: string; user: string } {
  const system = [
    "你是一个叙事助手，只能返回严格的 JSON（不要 Markdown，不要解释）。",
    "输出格式必须符合 LlmReply: {\"narrative\":string,\"choices\":[{id:\"A\"|\"B\"|\"C\"|\"D\",text:string} x4],\"effects\":[{op:\"inc\"|\"set\"|\"addTag\"|\"removeTag\"|\"pushLog\"|\"moveLocation\",...}],\"warnings\"?:string[],\"meta\"?:{phase?:string}}",
    "禁止添加额外字段，必须恰好 4 个选项 A-D。effects 只能使用白名单 op。叙事 narrative 必须用中文。"
  ].join(" ");

  const memory = args.memory ?? { summary: "", recentTurns: [] };
  const trimmedRecent = (memory.recentTurns ?? []).slice(-RECENT_TURNS_LIMIT);

  const user = [
    `World summary: ${args.worldSummary}`,
    `Memory summary: ${memory.summary ?? ""}`,
    `Recent turns (up to ${RECENT_TURNS_LIMIT}): ${JSON.stringify(trimmedRecent)}`,
    `State digest: ${JSON.stringify(args.stateDigest)}`,
    `Player action: ${JSON.stringify(args.playerAction)}`
  ].join("\n");

  return { system, user };
}

type NarratePromptArgs = NarrateInput;

/**
 * Stage 1: narrative rewrite only. LLM must not change numbers, effects, or choices.
 * Response format (JSON only): {\"rewrittenNarrative\": string, \"rewrittenChoiceResult\": string, \"tone\"?: string, \"style\"?: string}
 */
export function buildNarratePrompt(args: NarratePromptArgs): { system: string; user: string } {
  const system = [
    "你是文本改写助手，只负责改写叙事文本。",
    "选项仅供参考，不得改写/生成新选项；禁止修改游戏状态/数值/effects；不得增删选项；不得虚构 effects；不做分支逻辑。",
    "必须用中文改写，并严格返回 JSON（不要 Markdown，不要解释）。",
    "输出格式: {\"rewrittenNarrative\":string,\"rewrittenChoiceResult\":string,\"tone\"?:string,\"style\"?:string}",
    "不得包含额外字段，不得输出代码块。"
  ].join(" ");

  const minimalState = {
    meters: args.stateSummary?.meters ?? {},
    tags: args.stateSummary?.tags ?? [],
    flags: args.stateSummary?.flags ?? {},
    memory: {
      summary: args.stateSummary?.memory?.summary ?? "",
      recentTurns: (args.stateSummary?.memory?.recentTurns ?? []).slice(-RECENT_TURNS_LIMIT)
    }
  };

  const user = [
    `worldId: ${args.worldId}`,
    `time: ${args.time.day} ${args.time.slot}`,
    `location: ${args.location.zone} / ${args.location.place}`,
    `eventId: ${args.eventId}`,
    `eventTitle: ${args.eventTitle ?? ""}`,
    `eventNarrative: ${args.eventNarrative}`,
    `choices: ${JSON.stringify(args.choices)}`,
    `selectedChoiceId: ${args.selectedChoiceId}`,
    `stateSummary (minimal): ${JSON.stringify(minimalState)}`
  ].join("\n");

  return { system, user };
}
