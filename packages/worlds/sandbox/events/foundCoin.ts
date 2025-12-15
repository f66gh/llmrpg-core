import type { EventDef } from "@llmrpg/core";

export const foundCoin: EventDef = {
  id: "found-coin",
  when: { timeSlotIn: ["morning", "afternoon"], locationPlaceIn: ["street"] },
  title: "意外的硬币",
  narrative: "路边闪过一枚硬币的光。",
  choices: [
    { id: "A", text: "捡起来", effects: [{ op: "inc", path: "meters.money", amount: 2 }] },
    { id: "B", text: "递给路人", effects: [{ op: "pushLog", entry: "路人点头致谢，你心情稍好。" }] },
    { id: "C", text: "继续前行", effects: [{ op: "pushLog", entry: "你没有在意这点小钱。" }] },
    { id: "D", text: "买杯廉价咖啡", effects: [{ op: "inc", path: "meters.money", amount: -1 }] }
  ],
  weight: 2
};
