import type { EventDef } from "@llmrpg/core";

export const streetChatter: EventDef = {
  id: "street-chatter",
  when: { timeSlotIn: ["afternoon"], locationPlaceIn: ["street"] },
  title: "街头碎语",
  narrative: "街道上人来人往，你听到零碎的谈话与风声。",
  choices: [
    { id: "A", text: "打听消息", effects: [{ op: "pushLog", entry: "有人提到今晚会有巡逻。" }] },
    { id: "B", text: "观察路人", effects: [{ op: "pushLog", entry: "大多数人匆匆赶路。" }] },
    { id: "C", text: "闭目养神", effects: [{ op: "pushLog", entry: "你在喧嚣中放空片刻。" }] },
    { id: "D", text: "回家", effects: [{ op: "moveLocation", zone: "sandbox", place: "home" }] }
  ],
  weight: 1
};
