# 星陨市：LLM 协议（输入/输出结构体草案）

目的：让 LLM **解析玩家文本/选项文本**，并填充“可落账”的结构化字段；本地只做校验/裁剪/应用（最终以本地为准）。

本协议尽量复用现有代码结构：`llmrpg-core/packages/core/src/schema/llm.ts` 的 `LLMReplyEnvelope`（输出），并通过 `proposedEffects` 表达状态变更。

---

## 1) LLM 输入结构体（LLMRequest，发给模型）

> 这是你自己定义的输入 JSON（目前仓库里没有强类型），建议固定字段名，后续你可以在代码里加 TS type。

```jsonc
{
  "protocol": {
    "name": "llmrpg-llm-protocol",
    "version": "0.1.0"
  },
  "world": { "id": "starfall-city" },
  "event": {
    "id": "sf-prof-class-2",
    "title": "王教授上课 2",
    "sceneHint": "classroom",
    "mode": "in_event" // "story" | "in_event"
  },
  "player": {
    "inputText": "去厕所冷静一下", // 如果是点击按钮：传“按钮文案”即可
    "inputKind": "free_text" // "choice_text" | "free_text"
  },
  "stateSummary": {
    "meta": { "phase": "story", "turn": 12 },
    "time": { "day": 1, "slot": "morning" },
    "location": { "zone": "campus", "place": "classroom" },
    "meters": { "money": 820, "lust": 35, "corruption": 20 },
    "tags": ["met_prof_wang"],
    "flags": {
      "outfit": "uniform",
      "activeEventId": "",
      "returnLocation": null
    }
  },
  "constraints": {
    "timeAuthority": "local",              // 固定：local
    "locationAuthority": "local",          // 固定：local（LLM只能提案）
    "allowTempPlace": true,
    "allowedZones": ["campus"],
    "allowedPlaces": [
      { "zone": "campus", "place": "dorm", "label": "宿舍" },
      { "zone": "campus", "place": "classroom", "label": "教室" },
      { "zone": "campus", "place": "office", "label": "办公室" }
    ],
    "deltaBudget": {
      "meters.lust": { "min": -30, "max": 30 },
      "meters.corruption": { "min": 0, "max": 15 },
      "meters.money": { "min": -500, "max": 500 }
    },
    "tiers": {
      "lust": { "tier": "微热", "range": [25, 49] },
      "corruption": { "tier": "A", "range": [0, 50] }
    },
    "rulesText": [
      "玩家可以提出任何动作；但如果动作越界（不符合当前堕落阶段/地点常识/预算），必须在叙事中圆回来，并给出可行替代。",
      "不要擅自改写时间(day/slot)；时间只由本地推进，你最多可以通过 proposedEffects 提案 timeDelta。",
      "如果需要一个未建模地点（如厕所/走廊），可以创建 temp place：place = \"temp:<slug>\"，并写入 flags.tempPlaceLabel 与 flags.returnLocation。"
    ]
  },
  "eligibleEvents": [
    { "id": "sf-prof-class-2", "title": "王教授上课 2" },
    { "id": "sf-lust-distracted", "title": "分心风险" }
  ]
}
```

### 1.1 输入字段说明（关键点）
- `player.inputText`：永远只传“用户输入的文本/按钮文案”，不要求带 intent。
- `stateSummary`：给 LLM “当前事实”，避免它凭空编状态。
- `constraints.allowedPlaces/allowTempPlace`：决定 LLM 能否提案临时地点，以及临时地点怎么落账。
- `constraints.deltaBudget`：告诉 LLM “本轮最大能改多少”，并用于本地裁剪。
- `eligibleEvents`：让 LLM 把“可触发事件”包装成选项文案（但最终触发仍以本地校验为准）。

---

## 2) LLM 输出结构体（LLMReplyEnvelope，模型返回）

> 对齐现有：`llmrpg-core/packages/core/src/schema/llm.ts` 的 `LLMReplyEnvelope`。

```jsonc
{
  "story": {
    "narrative": "优奈压住躁热，举手向老师示意要去洗手间……",
    "choiceResult": "你离开座位时听见身后传来一声轻笑。"
  },
  "nextMoves": [
    { "id": "A", "text": "去洗手间冷静一下" },
    { "id": "B", "text": "硬撑着继续听课" },
    { "id": "C", "text": "下课后去办公室" },
    { "id": "D", "text": "回宿舍调整状态" }
  ],
  "proposedEffects": [
    { "op": "set", "path": "flags.returnLocation", "value": { "zone": "campus", "place": "classroom" } },
    { "op": "set", "path": "flags.tempPlaceLabel", "value": "教学楼洗手间" },
    { "op": "moveLocation", "zone": "campus", "place": "temp:restroom" },
    { "op": "inc", "path": "meters.lust", "amount": -10 },
    { "op": "inc", "path": "meters.corruption", "amount": 2 },
    { "op": "pushLog", "entry": "LLM: moved to temp restroom" }
  ],
  "timeDelta": { "slotAdvance": 0, "dayAdvance": 0 },
  "debug": { "rawText": "..." }
}
```

### 2.1 输出字段说明（你关心的点）
- `nextMoves`：只需要纯文本（+可选 hint），**不带 intent**。
- `proposedEffects`：LLM 把“解析结论”写成 effects（地点/数值/flag/phase 等）。
  - 本地会做：合法性校验、预算裁剪、越界拒绝/降级后再应用。
- `timeDelta`：LLM 可提案（例如某些行动应消耗时段），但本地最终决定是否采纳。

---

## 3) 临时地点（temp place）约定（不进世界数据库）

当玩家/叙事需要一个未建模地点（厕所、走廊、器材室）：
- LLM 使用：`place = "temp:<slug>"`
- 同时提案写入：
  - `flags.tempPlaceLabel = "<给 UI 展示的名字>"`
  - `flags.returnLocation = {zone, place}`（从哪里进入的，便于返回）

退出临时地点（两种）：
- 方案 1（推荐）：提供一个选项文案“返回教室”，LLM 在下一轮 `proposedEffects` 里把 `moveLocation` 回到 `flags.returnLocation`。
- 方案 2（更硬）：本地提供一个固定按钮“返回”，点击直接本地 move 回 `returnLocation`（不走 LLM）。

注意：当前 `applyEffects` 里 `set flags.*` 只接受 `string|number|boolean`，所以如果你要让 `flags.returnLocation` 直接存对象，后续需要扩展引擎（或临时把它拆成 `flags.returnZone` + `flags.returnPlace` 两个字符串）。

---

## 4) 本地必须做的校验/裁剪（即使你不关心可重放）

建议最低限度（避免偶发一次输出把状态写崩）：
- **budget**：把 `meters.*` 的 `inc` 裁剪到 `constraints.deltaBudget` 范围内。
- **meter 初始化**：`inc meters.X` 前确保 `meters.X` 已初始化为 number。
- **place 合法性**：
  - 如果 `place` 在 `allowedPlaces`：允许
  - 如果是 `temp:*` 且 `allowTempPlace=true`：允许
  - 否则：拒绝该 `moveLocation`（但保留叙事）
- **阈值钩子**（例）：结算后若 `lust >= 100`，本地强制在下一轮要求 LLM 给出“高潮/忍耐”分支（或本地直接生成固定选项）。

---

## 5) “可触发事件做成选项让玩家选”的约定

建议流程：
1) 本地算出 `eligibleEvents`（满足 `when` 的事件列表），传给 LLM。
2) LLM 把它们包装进 `nextMoves` 的文案（例如“触发：王教授上课 2”）。
3) 玩家点击后，本地把“玩家点的文案”和“eligibleEvents 列表”一起再发给 LLM，让它在 `proposedEffects` 里明确写：
   - `set flags.activeEventId = "<eventId>"` 或 `set flags.__pendingEventId = "<eventId>"`
4) 本地校验该 eventId 的确属于 eligibleEvents，才真正进入事件。

---

## 6) 下一步建议（你看完这页后我们该做的）

- 决定：`flags.returnLocation` 要不要存对象（需要改 `applyEffects`），还是拆成 `flags.returnZone/flags.returnPlace`（无需改引擎）。
- 决定：时间推进采用 `timeDelta.slotAdvance`（LLM 提案）还是完全本地固定推进。
- 然后再把这个协议落到代码：在 `apps/web/app/api/llm/route.ts` 或 `packages/core/src/llm/*` 里实现“预算裁剪 + 临时地点 + 越界降级”。

