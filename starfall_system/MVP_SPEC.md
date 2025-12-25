# 星陨市 MVP 规格（可执行设计稿）

目标：把“星陨市”压缩成一个**最小可闭环 Demo**，可直接映射到现有引擎的数据结构（`world.json` + `EventDef` + hooks），并能存档/读档、可重放。

主角（MVP 口径）：星野优奈（后续可在世界包里完全替换/多主角扩展，这里只影响叙事文案，不影响引擎结构）。

本规格刻意偏“工程可落地”，不是世界观百科；所有字段以当前代码为准（`packages/core/src/schema/*`、`packages/worlds/sandbox/*`）。

---

## 1. MVP 目标与非目标

### 1.1 目标（MVP 必须有）
- **闭环**：新开档 → 选择行动/选项 → 触发事件 → 应用 effects → 时间推进 → 跨天结算（花费）→ 可存档/读档 → 继续游玩。
- **故事线最小**：围绕 1 个 NPC（王教授）+ 1 条短任务线（阶段推进）形成“有头有尾”的体验。
- **系统最小**：时间 + 金钱 + 欲望值 + 堕落值（4 个 meter），其余系统暂不引入（治安/开发度等作为后续扩展）。
- **校验最小**：事件结构有类型约束；effects 写错会产生 warning；关键 meterKey 必须在初始状态初始化。

### 1.2 非目标（明确不做，避免返工）
- 不做全城地图（A/B/C/S 区）与复杂交通。
- 不做完整衣柜/装备槽（先用 `flags.outfit` 表示“穿搭档位”）。
- 不做战斗数值与复杂胜负（先用事件分支 + meter 阈值）。
- 不做 LLM 强依赖（LLM 只负责“改写叙事/生成可选动作提案/返回增量”，规则结算仍由本地确定性引擎裁决）。

---

## 2. 运行时数据模型（严格映射到现有 `GameState`）

引擎状态类型：`packages/core/src/schema/game.ts` 的 `GameState`。

### 2.1 时间（`state.time`）
- `time.day`: number（从 1 开始）
- `time.slot`: string（MVP 目标枚举：`morning | noon | afternoon | evening | night | midnight`）
  - 说明：这会要求把时间推进 hook 的时段列表从 4 段扩到 6 段（后续落地到代码时一起改）。

时间权威来源（必须定死）：
- **本地为准**：`time.*` 只能通过本地 effects/hook 改动，确保可重放与可测试。
- **LLM 仅可提案**：LLM 可以返回“建议的时间增量/结束时间”，但最终必须被本地规则转换为确定性的 `set time.slot/day` 才会落账。

### 2.2 地点（`state.location`）
MVP 只做 1 个 `zone`：`campus`

`place` 枚举（先定 3 个，够闭环）：
- `dorm`：宿舍/公寓（休息、调整状态、结束时段）
- `classroom`：教学楼/课堂（上课、触发王教授相关剧情）
- `office`：办公室（任务执行、结算报酬）

### 2.3 计量条（`state.meters`）
MVP 固定初始化这些 key（避免 `inc` 时出现 “meter is not a number” warning）：
- `meters.money`: number（单位：SC）
- `meters.lust`: number（0–200，代表生理兴奋度/冲动水平；与世界设定对应，但实现先做“阈值事件/选项惩罚”）
- `meters.corruption`: number（0–1000+，代表堕落值阶段；MVP 先做“阶段映射 + 条件门槛”，不做复杂联动）

建议初始值（可按你偏好改）：
- `money = 1000`
- `lust = 10`
- `corruption = 0`

阶段映射（MVP 用于 UI 文案与条件门槛；规则本身仍由本地事件/阈值控制）：
- 欲望值（`meters.lust`）：
  - 清醒：0–24
  - 微热：25–49
  - 发情：50–74
  - 濒临崩溃：75–99
  - 绝顶：100
  - 强制寸止：101–200
- 堕落值（`meters.corruption`）：
  - A：0–50
  - B：51–150
  - C：151–300
  - D：301–500
  - E：501–1000
  - E+：1001+

### 2.4 标记与开关

#### `state.flags`（结构未稳定但需要持久的字段）
- `flags.outfit`: string（先用简单档位，后续再迁移到 inventory/equipment）
  - 建议：`"casual" | "uniform" | "sport"`
- `flags.__slotPrev`: string（由 `TurnIncrementPlugin` 写入，用于跨天结算判断）
- `flags.econ_debt`: boolean（由经济 hook 写入；后续可用来触发“欠费/强制打工”事件）
- `flags.activeEventId`: string（“事件运行中”状态机：当前事件 id；空字符串表示不在事件中）
- `flags.activeEventLocked`: boolean（可选：锁定事件时段，不允许在事件中改变时间）

说明：`__slotPrev` 这类以下划线开头的 flag 视为“系统内部字段”，世界内容不要依赖其语义以外的东西（仅用于 hooks 协作）。

#### `state.tags`（轻量 gating，用于事件条件）
建议仅用于“是否发生过某件事”的布尔标记，例如：
- `took_prof_job`（接下王教授的工作）
- `met_prof_wang`（正式见面）
- `sf_job_1_done` / `sf_job_1_paid`（用 tag 串起最小事件链，避免 EventCondition 直接依赖 flags 数值）

### 2.5 存档与可重放
存档系统抽象：`packages/core/src/storage/SaveSystem.ts`。

MVP 要求：
- 所有推进都由确定性 effects 构成（`applyEffects`），确保可重放。
- “随机性”如要加入，先用 `state.meta.seed` + 可重复的伪随机，而不是 `Math.random()`（后续再做）。

---

## 3. 事件与结算（映射到 `EventDef` / `Effect`）

事件类型：`packages/core/src/schema/events.ts` 的 `EventDef`。

### 3.1 事件条件（`when`）
MVP 只使用这些条件（够用且简单）：
- `timeSlotIn`
- `locationZoneIn`
- `locationPlaceIn`
- `meterGte` / `meterLte`
- `hasTags` / `lacksTags`
- `phaseIn`（可选，默认 `state.meta.phase = "story"`）

### 3.2 Effects（只用现有集合，不扩展）
Effects 类型：`packages/core/src/schema/effects.ts`
- `inc`：只能改 `meters.*`
- `set`：可改 `time.*`、`location.*`、`meta.*`、`meters.*`、`flags.*`
- `addTag/removeTag`
- `pushLog`
- `moveLocation`

约束：
- 任何 `inc` 的 `path` 必须是 `meters.<key>` 且该 key 在 `initialState.meters` 初始化为 number。
- `set flags.*` 的 value 必须是 `string | number | boolean`。

### 3.3 时间推进与日结（用 hooks 实现）
参考 sandbox：`packages/worlds/sandbox/index.ts`

MVP 建议 hooks（都放 `afterStep`）：
1) `TurnIncrementHook`：每次“事件结束/本回合确认”后推进 `time.slot`，并在跨天时 `time.day + 1`，同时写入 `flags.__slotPrev`。
   - 注意：如果引入“事件运行中（多轮对话）”，则 **事件运行中不推进时间**，只有结束事件才推进。
2) `EconomyDailyTickHook`：检测跨天（`__slotPrev` 从 `midnight` → `morning`），自动扣费。
   - 基础：`dailyCost = 180`
   - MVP+（采纳你的想法）：可按堕落阶段增加生活成本（示例表，后续边玩边调）：
     - A：180
     - B：360
     - C：540
     - D：720
     - E：900
     - E+：1080
   - 若余额不足：设置 `flags.econ_debt = true`，并写 log（后续可触发“强制打工/借贷”分支）。
3) `EventLogHook`：把 action 与关键状态写到 `state.log`，便于调试/复盘（可选，但很有用）。

欲望系统 MVP 不做复杂自动高潮逻辑（比如自动清零/寸止指数增长），只做两件事（用事件阈值即可）：
- `lust >= 75`：触发“难以集中/容易出意外”的事件，迫使玩家选择“回宿舍/冷静/硬撑”。
- `lust` 有可控的恢复渠道：在 `dorm` 通过“休息/冷却”等选项 `lust -X`（具体平衡后定）。

说明：如果要保留“绝顶=100→清零”的规则，建议做成一个**本地 hook**（检测 `lust >= 100` 时自动结算并把 `lust` 置 0），不要让 LLM 直接改 lust 到 0。

---

## 3.4 事件运行中（多轮对话）状态机（MVP 设计，落地时实现）

你希望的“事件内多轮对话、退出事件再推进时间”，建议抽象为：
- `meta.phase = "story"`：自由探索/可触发事件阶段（默认）
- `meta.phase = "in_event"`：事件运行中
- `flags.activeEventId = "<eventId>"`：当前事件

规则：
- 进入事件：设置 `phase=in_event` + `activeEventId=...`；此时不自动 pick 其它事件。
- 事件内交互：由 LLM 生成叙事与选项（`nextMoves`），本地只接受 **安全且预算内** 的 proposedEffects（或完全不接受，仅改叙事）。
- 退出事件：显式 action（例如 `endEvent` move）触发本地 effects：`phase=story`、`activeEventId=""`，并在退出时推进时间（TurnIncrementHook 在“退出事件”这一类 action 后生效）。

现状提醒（与代码对齐）：
- 现在的引擎已有 `flags.__pendingEventId`，可以覆盖“一次事件 → 立刻 A/B/C/D 结算”的单轮事件；但“多轮事件锁定”还需要按上面规则补齐实现。

---

## 4. 最小 UI/交互（先满足引擎输入输出）

现有 web UI（`apps/web/app/page.tsx`）支持：
- 事件 choices（A–D）
- move（自由输入动作，可被 LLM 改写叙事）
- 存档/读档（LocalStorage）

MVP 不强制 UI 插件开发，但建议至少在 HUD 显示：
- `time.day` / `time.slot`
- `location.zone` / `location.place`
- `meters.money` / `meters.lust` / `meters.corruption`（以及对应阶段名）
- `flags.outfit`
- `flags.activeEventId` / `meta.phase`（调试事件锁定用）

“可触发事件提示”（采纳的建议）：
- 理想交互：UI 在自由探索阶段显示“当前可触发事件列表”，玩家可以显式选择触发哪一个。
- 现状提醒：引擎目前会把 eligible 事件以 `interact:<eventId>` 的 move 形式“提示出来”，但还没有实现“选择 interact 就触发该 event”的解析逻辑（落地时一起补齐）。

---

## 5. 事件 ID/命名约定（便于后续自动校验）

建议约定：
- world id：`starfall-city`
- zone：`campus`
- place：`dorm | classroom | office`
- 事件 id 前缀：`sf-`（例如 `sf-wake-up`）

---

## 6. 验收用例（Definition of Done）

MVP 完成的“可验证”标准（能手动测试）：
- 新开档能在 `campus/dorm` 起床，并在 2–5 步内见到王教授（或接到任务引导）。
- 玩家能在 `classroom`/`office` 推进“王教授最小事件链”（用 tags 串起来），且过程中至少发生 1 次“金钱压力相关选择”和 1 次“欲望阈值相关选择”。
- 每次“事件结束/本回合确认”后 `time.slot` 推进，跨天会按堕落阶段扣除生活成本，并在余额不足时写入 `flags.econ_debt = true`（并能触发对应事件/提示）。
- 存档/读档后继续推进不崩溃，meters 不出现 `inc: meter ... is not a number` 的 warning。
