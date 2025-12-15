import type { EventDef } from "@llmrpg/core";

export const midnightSettlement: EventDef = {
  id: "midnight-settlement",
  when: { timeSlotIn: ["midnight"], locationPlaceIn: ["home"] },
  title: "午夜结算",
  narrative: "一天结束，系统开始自动结算日常开销与状态。",
  choices: [
    {
      id: "A",
      text: "执行日结算",
      effects: [
        { op: "inc", path: "meters.money", amount: -1 },
        { op: "inc", path: "meters.stress", amount: 1 },
        { op: "pushLog", entry: "日常开销扣除，压力+1。" }
      ]
    },
    {
      id: "B",
      text: "开启节流模式",
      effects: [
        { op: "inc", path: "meters.energy", amount: -1 },
        { op: "pushLog", entry: "你少开了一盏灯，试图节流。" }
      ]
    },
    {
      id: "C",
      text: "写下总结",
      effects: [{ op: "pushLog", entry: "你写下今日总结，准备入睡。" }]
    },
    {
      id: "D",
      text: "直接睡觉",
      effects: [{ op: "pushLog", entry: "你倒头就睡，任系统自动处理。" }]
    }
  ],
  weight: 1
};
