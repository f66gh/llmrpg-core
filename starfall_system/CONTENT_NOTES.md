# 星陨市 MVP 内容设计稿（最小故事线：校园 + 王教授）

定位：这是一份“内容落地用的大纲”，用于把故事拆成可执行事件（`EventDef`）并映射到 `meters/flags/tags`。MVP 阶段优先保证**条件可判定、效果可结算、阶段可推进**；剧情文笔与细节留给 LLM 改写。

主角（MVP 口径）：星野优奈。

建议配合阅读：`llmrpg-core/starfall_system/MVP_SPEC.md`

---

## 1) 核心体验（30–60 分钟）
- **日常与身份压力**：上课/兼职/维持体面 → 时间被切碎。
- **生存压力**：跨天自动扣费（金额可随堕落阶段变化），钱不够会触发欠费线。
- **欲望阈值压力**：`lust` 高会触发“分心/失误风险”事件，迫使你先管理状态再推进主线。
- **一个闭环小目标**：围绕王教授完成“上课分流 → 办公室 → 兼职链 → 拿到第一笔报酬”。

---

## 2) 初始设定（MVP 仅用到的）

### 时间
- `time.slot`（MVP 目标 6 段）：`morning | noon | afternoon | evening | night | midnight`
- 事件本体不直接改时间；时间推进由本地 hook 在“事件结束/回合确认”时执行。

### 地点（zone/place）
- `campus/dorm`：起床、状态管理、保存点
- `campus/classroom`：上课分流（按 lust 阈值触发三段课）
- `campus/office`：兼职/结算/推进闭环

### 角色（只做 1 个 NPC）
- 王教授：兼职/任务的来源（具体性格后续写进叙事）

---

## 3) 最小事件链（用 tags 串起阶段）

事件链 tags（建议）：
- `met_prof_wang`：正式见面（上课任一分支都能置位）
- `took_prof_job`：接受兼职
- `sf_prof_job_1_done`：完成兼职 1
- `sf_prof_job_1_paid`：领取报酬（MVP 闭环点）

说明：当前 `EventCondition` 不支持直接判断 `flags` 数值；用 tags 先落地，后续再迁移到 `flags.wang_stage`。

---

## 4) 事件清单（对齐你表格的“王教授上课 1/2/3 + 兼职 1/2/3”）

> 写法：`when`（触发条件）+ 4 选项（A–D）+ effects（结算）。未定的增量，允许由 LLM 提案，但最终必须由本地 rules/guards 裁决并落账。

### E1：`sf-wake-up`（起床）
- when：`timeSlotIn:["morning"]` + `locationZoneIn:["campus"]` + `locationPlaceIn:["dorm"]`
- 目的：给玩家一个“今天去哪”的清晰入口，并展示当前 meters（money/lust/corruption）。
- choices：
  - A 去教室：`moveLocation campus/classroom`
  - B 去办公室：`moveLocation campus/office`
  - C 查看账单提醒：`pushLog`
  - D 换衣服：`set flags.outfit "uniform"`（或循环切换）

### E2：`sf-prof-class-1`（王教授上课 1：lust < 25）
- when：`timeSlotIn:["morning"]` + `locationPlaceIn:["classroom"]` + `meterLte:[{key:"lust",value:24}]`
- 概要：优奈状态稳定，被点名回答并表现出色（确立关系入口）。
- choices：
  - A 正常回答：`addTag met_prof_wang`
  - B 主动请教：`addTag met_prof_wang`，`pushLog`
  - C 下课去办公室：`addTag met_prof_wang`，`moveLocation campus/office`
  - D 回宿舍：`moveLocation campus/dorm`

### E3：`sf-prof-class-2`（王教授上课 2：25 <= lust < 50）
- when：`timeSlotIn:["morning"]` + `locationPlaceIn:["classroom"]` + `meterGte:[{key:"lust",value:25}]` + `meterLte:[{key:"lust",value:49}]`
- 概要：优奈出现轻微分心，被近距离交流；存在不适的越界感（强度由叙事决定，结算由规则控制）。
- choices：
  - A 结束并保持距离：`addTag met_prof_wang`，`inc meters.lust +5`
  - B 明确拒绝越界：`addTag met_prof_wang`，`inc meters.corruption +5`（可后调）
  - C 借口离开：`moveLocation campus/dorm`
  - D 去办公室：`addTag met_prof_wang`，`moveLocation campus/office`

### E4：`sf-prof-class-3`（王教授上课 3：lust >= 50 → office）
- when：`timeSlotIn:["morning"]` + `locationPlaceIn:["classroom"]` + `meterGte:[{key:"lust",value:50}]`
- 概要：优奈明显无法专注，被课后要求去办公室谈话（强引导到 office，方便闭环）。
- choices：
  - A 前往办公室：`addTag met_prof_wang`，`moveLocation campus/office`，`inc meters.lust +5`
  - B 当场拒绝：`addTag met_prof_wang`，`inc meters.corruption +10`
  - C 先回宿舍：`moveLocation campus/dorm`
  - D 请求改期：`pushLog`

### E5：`sf-prof-parttime-offer-1`（王教授兼职 1：提出）
- when：`locationPlaceIn:["office"]` + `hasTags:["met_prof_wang"]` + `lacksTags:["took_prof_job"]`
- 概要：教授提出整理档案/助教类兼职（带边界测试，强度由叙事决定）。
- choices：
  - A 接受：`addTag took_prof_job`
  - B 讨价还价后接受：`addTag took_prof_job`，`pushLog`
  - C 拒绝离开：`moveLocation campus/classroom`
  - D 回宿舍：`moveLocation campus/dorm`

### E6：`sf-prof-parttime-1`（兼职事件 1：执行）
- when：`locationPlaceIn:["office"]` + `hasTags:["took_prof_job"]` + `lacksTags:["sf_prof_job_1_done"]`
- 概要：第一次兼职，保证能给到固定收入与轻量的 lust/corruption 波动。
- choices：
  - A 稳妥完成：`inc meters.money +200`，`addTag sf_prof_job_1_done`
  - B 多接一点：`inc meters.money +220`，`inc meters.lust +5`，`addTag sf_prof_job_1_done`
  - C 中止：`removeTag took_prof_job`，`pushLog`
  - D 回宿舍：`moveLocation campus/dorm`

### E7：`sf-prof-parttime-2`（兼职事件 2：升级）
- when：`locationPlaceIn:["office"]` + `hasTags:["sf_prof_job_1_done"]` + `lacksTags:["sf_prof_job_1_paid"]`
- 概要：第二次兼职，收入更高，且更容易推高 lust/corruption（具体增量可让 LLM 提案，本地做预算与上限）。
- choices：
  - A 正常完成：`inc meters.money +250`，`addTag sf_prof_job_1_paid`
  - B 风险更高：`inc meters.money +250`，`inc meters.lust +10`，`addTag sf_prof_job_1_paid`
  - C 中止：`removeTag took_prof_job`
  - D 回宿舍：`moveLocation campus/dorm`

### E8：`sf-prof-parttime-3`（兼职事件 3：阶段门槛）
- when：`locationPlaceIn:["office"]` + `hasTags:["sf_prof_job_1_paid"]` + `meterGte:[{key:"corruption",value:51}]` + `meterGte:[{key:"lust",value:50}]`
- 概要：门槛事件（对应你表格里“堕落>50 且 欲望>50”）。MVP 可以只做“解锁后可触发”的提示与轻量结算。
- choices：
  - A 接受并推进：`inc meters.money +300`，`pushLog "MVP extension"`
  - B 保持距离：`pushLog`
  - C 结束并离开：`moveLocation campus/classroom`
  - D 回宿舍：`moveLocation campus/dorm`

### E9：`sf-lust-distracted`（lust >= 75：分心/失误风险）
- when：`meterGte:[{key:"lust",value:75}]` + `locationPlaceIn:["classroom","office"]`
- 目的：制造“系统压力”，逼玩家去 dorm 管理状态或退出事件。
- choices：
  - A 硬撑：`inc meters.lust +5`，`inc meters.corruption +5`
  - B 冷静一下：`inc meters.lust -20`
  - C 回宿舍：`moveLocation campus/dorm`
  - D 结束当前事件（若实现 in_event）：`set meta.phase "story"`，`set flags.activeEventId ""`

### E10：`sf-dorm-relief`（宿舍：状态管理）
- when：`locationPlaceIn:["dorm"]`
- 目的：给玩家一个“把 lust 拉回可控范围”的通道；是否清零由本地规则决定。
- choices：
  - A 冷却/洗漱：`inc meters.lust -25`
  - B 休息与整理思路：`pushLog`
  - C 查看账单/计划：`pushLog`
  - D 出门：`moveLocation campus/classroom`

### E11：`sf-debt-warning`（欠费提醒）
- when：`meterLte:[{key:"money",value:0}]`（或 `flags.econ_debt == true`，取决于 hook 的实现）
- choices：
  - A 记录欠费：`set flags.econ_debt true`，`pushLog`
  - B 去办公室找机会：`moveLocation campus/office`
  - C 先回宿舍：`moveLocation campus/dorm`
  - D 保持日常：`moveLocation campus/classroom`

### E12：`sf-free-roam`（空事件：避免卡死）
- when：仅限制 `locationZoneIn:["campus"]`（或不写 when）
- choices：
  - A 去教室：`moveLocation campus/classroom`
  - B 去办公室：`moveLocation campus/office`
  - C 回宿舍：`moveLocation campus/dorm`
  - D 稍作调整：`inc meters.lust -10`

---

## 5) 权重建议（避免事件互相抢）

注意：当前 `EventDirector.pickEvent()` 是“匹配到的第一个事件”（确定性，但对事件顺序敏感）。

建议：
- 把“阈值分流（上课 1/2/3）”写得互斥（靠 `meterLte/meterGte` 范围），避免同时满足多个。
- 把“欠费/分心风险”放在列表前面或提高权重（如果未来改为 weight 随机挑选）。

---

## 6) 后续扩展挂钩（先写在这里，暂不实现）
- 把 `flags.outfit` 迁移为 `inventory + equipmentSlots`（需要新增 schema/effects）
- 把“阶段 tags”迁移为统一的 `flags.wang_stage`（需要 `EventCondition` 支持读 flags，或用 plugin 派生 tags）
- 实现“事件运行中（多轮对话）”状态机：`phase=in_event + activeEventId`，并在 UI 显示“退出事件”按钮
- 实现“可触发事件列表 → 显式选择触发”：当前引擎只会提示 `interact:<eventId>` moves，还需要补齐解析与执行逻辑
