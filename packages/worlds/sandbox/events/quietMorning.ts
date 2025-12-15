import type { EventDef } from "@llmrpg/core";

export const quietMorning: EventDef = {
  id: "quiet-morning",
  when: { timeSlotIn: ["morning"], locationPlaceIn: ["home"] },
  title: "安静的早晨",
  narrative: "你在家里醒来，系统开始自检，空气里只有设备运转的轻微嗡鸣。",
  choices: [
    { id: "A", text: "查看状态", effects: [{ op: "pushLog", entry: "你检查了仪表，运作正常。" }] },
    { id: "B", text: "喝一杯水", effects: [{ op: "pushLog", entry: "简单补水，让头脑清醒。" }] },
    { id: "C", text: "思考今天的计划", effects: [{ op: "pushLog", entry: "你列出了今天要做的几件小事。" }] },
    { id: "D", text: "原地发呆", effects: [{ op: "pushLog", entry: "时间静静流逝，你什么也没做。" }] }
  ],
  weight: 1
};
