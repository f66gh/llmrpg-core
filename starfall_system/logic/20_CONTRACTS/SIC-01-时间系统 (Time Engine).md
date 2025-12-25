# SIC-01-时间系统 (Time Engine) v0.3（含星期）

> **定位**：L3 规则演算层（Tick）
>  **职责**：推进世界时间锚点（day / 精确时刻 / 时段 / 星期），并发出结算节拍信号供其他 Tick 系统使用。
>  **原则**：只推进时间与触发结算；不做叙事、不算危险度/费洛蒙、不推进剧情 flags。

------

## 0) L2 时间字段（本系统拥有维护权）

> 下列字段属于 **L2.world**，由 Time Engine 负责保持一致性（不允许别的系统只改其中一个）。

- `world.day`（当前第几天：用于跨日累计与存档显示）
- `world.weekday`（星期枚举：MON|TUE|WED|THU|FRI|SAT|SUN；用于课程/商店营业/固定事件）
- `world.minute_of_day`（当天分钟数：0–1439；例如 12:34 = 754）
- `world.time_slot`（当前时段：MORNING/AFTERNOON/EVENING/NIGHT；由 minute_of_day 映射得到）
- `world.slot_index`（当天时段序号：0..slot_per_day-1；由 time_slot 映射得到）
- `world.slot_per_day`（一天有多少个时段：默认 4；用于未来扩展）
- `world.last_advanced_turn`（上一次成功推进时间发生在第几 turn；用于防止同回合重复推进）

### 一致性公约（必须满足）

- `minute_of_day` 是**精确真相**；`time_slot/slot_index` 必须由 Time Engine 根据“时段边界表”重算并同步写入。
- `weekday` 必须在跨日时按规则推进（MON→TUE…→SUN→MON），不得由外部系统单独修改。

------

## 1) 触发点（When）

- **主触发**：每次玩家完成一次“主行动”后，引擎调用 `TimeEngine.advance()` 推进时间。
- **事件触发**：事件执行器在事件内部需要消耗时间时，调用 `TimeEngine.advance()` 推进额外时间。

------

## 2) 输入参数（Input）

Time Engine 接受两种推进方式（二选一，建议优先 minutes）：

### 2.1 `advance_minutes`（推荐）

- `advance_minutes`（推进多少分钟：例如 37 / 120 / 480；用于让 LLM 返回时间增量）

### 2.2 `advance_slots`（可选）

- `advance_slots`（推进多少个时段：例如 1 个时段；用于“睡觉/上课/训练”等整段活动）

> **LLM 协作约束**：LLM 只能“建议增量”，不能直接改 `world.*` 字段；最终推进由 L4 动作语义 + 时间规则裁剪后交给 Time Engine。

------

## 3) 读取字段（Read Set）

- `meta.turn`（当前第几轮行动/结算计数：用于记录 last_advanced_turn）
- `world.day`（当前天数）
- `world.weekday`（当前星期）
- `world.minute_of_day`（当前分钟数）
- `world.slot_per_day`（一天的时段数：用于映射）
- `session.mode`（FREE/EVENT/COMBAT：用于判断是否允许推进/延后推进）
- `session.event_id`（事件ID：用于判断是否锁时）
- `session.combat.round`（战斗回合：用于可选的“战斗内是否推进时间”规则）

------

## 4) 写入字段（Write Set）

> 只通过 Apply 写入，不允许直接改 L2。

- `meta.turn`（推进后的行动计数，例如 +1）
- `world.minute_of_day`（推进后的分钟数，必要时跨日归零）
- `world.day`（跨日时 +1）
- `world.weekday`（跨日时按规则推进到下一天的星期）
- `world.time_slot`（由 minute_of_day 重算得到）
- `world.slot_index`（由 time_slot 重算得到）
- `world.last_advanced_turn`（写入当前 meta.turn，用于防重复）

------

## 5) 时段映射规则（Slot Mapping）

> 规则表不入存档，建议在 L0 或 L1 定义（统一口径）。

示例（4 时段）：

- MORNING：06:00–11:59
- AFTERNOON：12:00–17:59
- EVENING：18:00–21:59
- NIGHT：22:00–05:59（跨日边界）

------

## 6) 星期推进规则（Weekday Rule）

> 星期是“跨日真相”，用于固定课程/营业日/周末事件。

- 当 `minute_of_day` 推进导致跨日（DayChanged）时：
  - `weekday = next(weekday)`
  - 顺序：MON→TUE→WED→THU→FRI→SAT→SUN→MON

### （可选）开局对齐

- 存档初始化时需要约定：`world.day=1` 对应哪个 `weekday`（例如 MON）。
   这个约定属于 L0 不变量。

------

## 7) 输出结果类型（Outputs）

用于调度其它系统的“时间事件”：

- `TimeAdvanced`（推进结果：推进分钟数、推进前后 day/minute_of_day、推进前后 time_slot、是否跨日）
- `SlotChanged`（跨时段：MORNING→AFTERNOON 等；供“按时段结算”的系统触发）
- `DayChanged`（跨日：day+1；供“按日结算”的系统触发）
- `WeekdayChanged`（跨日导致星期变化：MON→TUE 等；供“周末/工作日事件”触发）

> 注意：`WeekdayChanged` 通常与 `DayChanged` 同时发生；不跨日就不会触发星期变化。

------

## 8) 安全阈值与裁剪（强烈建议）

防止 LLM 一句“过了三天”跳过大量结算：

- 普通主行动：`advance_minutes ≤ 120`
- 明确耗时动作（睡觉/训练/上课）：由动作定义允许范围或直接推进到目标时刻（例如次日 06:00）
- 事件内部：由事件脚本定义上限

如超限：返回 `TimeAdvanceClamped`（被裁剪）或拒绝推进（由引擎策略决定）。

------

## 9) 禁止项（Hard No）

- ❌ 不写入派生值：危险度、费洛蒙、商店是否开门等都不算
- ❌ 不推进剧情 flags（时间系统不负责剧情推进）
- ❌ 不依赖 L4/L5 模块（只读 L2；Digest 也无需读）

------

## 10) 与其他系统的接口约定（Contract）

- 其它 L3 Tick 系统（生理/治安/经济/欲望漂移等）应监听：
  - `SlotChanged` 做“按时段结算”
  - `DayChanged` 做“按日结算”
  - `WeekdayChanged` 做“按周几触发的固定规则/事件刷新”
- L4 行为系统若要消耗时间，只能提交 `advance_minutes/advance_slots`，不得直接改 `world.*`。

------

## 11) 建议补进 L2 的字段（本卡已纳入正文）

> 你之前认可的字段都已经并入 “0) L2 时间字段”，无需再单列。
>  若你想更强的“日程”能力，后续可以再加：

- `world.calendar_week`（第几周：用于“每周结算/学期周数”）
- `world.term_day`（学期第几天：用于课程进度）

（这两个先不加也完全能跑。）