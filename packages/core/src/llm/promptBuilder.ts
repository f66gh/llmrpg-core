import type { PlayerAction } from "../schema/step";

type BuildPromptArgs = {
  worldSummary: string;
  stateDigest: unknown;
  playerAction: PlayerAction;
};

export function buildPrompt(args: BuildPromptArgs): { system: string; user: string } {
  const system = [
    "You are an LLM narrative assistant. Respond with STRICT JSON ONLY (no prose, no Markdown).",
    "Output must match LlmReply: {\"narrative\":string,\"choices\":[{id:\"A\"|\"B\"|\"C\"|\"D\",text:string},x4],\"effects\":[{op:\"inc\"|\"set\"|\"addTag\"|\"removeTag\"|\"pushLog\"|\"moveLocation\",...}],\"warnings\"?:string[],\"meta\"?:{phase?:string}}",
    "Never add extra keys. Exactly 4 choices A-D. Effects must use only allowed ops. No commentary.",
    "Allowed effect shapes: inc{path,amount}, set{path,value}, addTag{tag}, removeTag{tag}, pushLog{entry}, moveLocation{zone,place}.",
    "Example: {\"narrative\":\"...\",\"choices\":[{\"id\":\"A\",\"text\":\"...\"},{\"id\":\"B\",\"text\":\"...\"},{\"id\":\"C\",\"text\":\"...\"},{\"id\":\"D\",\"text\":\"...\"}],\"effects\":[]}"
  ].join(" ");

  const user = [
    `World summary: ${args.worldSummary}`,
    `State digest: ${JSON.stringify(args.stateDigest)}`,
    `Player action: ${JSON.stringify(args.playerAction)}`
  ].join("\n");

  return { system, user };
}
