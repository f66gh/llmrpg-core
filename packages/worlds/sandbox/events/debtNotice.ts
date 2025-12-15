import type { EventDef } from "@llmrpg/core";

export const debtNotice: EventDef = {
  id: "debt-notice",
  when: {
    timeSlotIn: ["evening", "night"],
    locationPlaceIn: ["home", "street"],
    meterLte: [{ key: "money", value: 0 }]
  },
  title: "欠费提示",
  narrative: "一则系统通知弹出：账户余额为负，需尽快补足。",
  choices: [
    { id: "A", text: "查看账单明细", effects: [{ op: "pushLog", entry: "账单列出了各种小额支出。" }] },
    { id: "B", text: "暂时无视", effects: [{ op: "pushLog", entry: "你把提示折叠到通知栏。" }] },
    { id: "C", text: "去街上找活", effects: [{ op: "moveLocation", zone: "sandbox", place: "street" }] },
    { id: "D", text: "深呼吸减压", effects: [{ op: "pushLog", entry: "你深呼吸，让自己冷静下来。" }] }
  ],
  weight: 1
};
