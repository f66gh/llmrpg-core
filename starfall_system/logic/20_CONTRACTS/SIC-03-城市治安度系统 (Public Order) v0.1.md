# SIC-03-城市治安度系统 (Public Order) v0.1（全局+区域修正）

> **定位**：L3 规则演算层（Tick）
> **职责**：维护“城市治安/秩序”的真相字段，提供一个稳定的环境底盘给遭遇、商店、剧情等系统。
> **不做**：不直接生成“危险等级/遇敌概率”（那是 Digest 派生）；不做叙事。

------

## 0) L2 治安字段（本系统拥有维护权）

> 下列字段建议放在 **L2.order** 域。治安系统维护其中“自动结算”的字段；故事/事件可以改“冲击/修正”字段。

### 0.1 全局底盘（全城）

- `order.global`（全城治安度/秩序值：城市总体安全程度，建议范围 0–100）
- `order.last_update_day`（上一次完成“按日结算”的 day，用于防止重复日结）

### 0.2 区域修正（地区差异，不同区域不同）

- `order.zone_mod`（Object：各区域治安修正值，示例 `{ zoneA: +10, zoneB: 0, zoneC: -20 }`）
  - 含义：区域相对全局的偏移（可以是加法偏移，也可以未来改倍率；但要统一口径）
  - 用途：让同一个 `order.global` 在不同区表现不同危险度（最终危险度仍由 Digest 推导）

### 0.3 外部冲击（动态变化的“原因”，由剧情/事件写入）

- `order.shock`（number：短期治安冲击值，例如 -15 代表暴动余波；通常会随天数回归 0）
- `order.shock_decay_per_day`（number：冲击每天衰减多少（让冲击自动恢复），也可放 L1 配置表）
- `order.tags`（Array<string>：秩序状态标签，例如 `["curfew_active", "riot_recent"]`，属于真相而不是派生）

> **说明**：`zone_mod / shock / tags` 都是“真相输入项”，可以被剧情改变；治安系统会读取它们参与结算。

------

## 1) 触发点（When）

- **主触发（推荐）**：收到 `DayChanged` 时执行一次 `OrderTick.onDayTick()`（按日结算最稳定）

------

## 2) 读取字段（Read Set）（每个字段带中文注释）

### 2.1 时间锚点

- `world.day`（当前第几天：用于按日结算、记录 last_update_day）
- `world.weekday`（当前星期：用于可选的“周末更乱/工作日更稳”规则）
- `world.time_slot`（当前时段：仅当你做按时段结算时使用）
- `world.location_id`（当前位置：治安系统一般不需要，但若你想“在危险区过夜影响更大”才会用）

### 2.2 治安真相输入项

- `order.global`（全城治安底盘）
- `order.zone_mod`（各区修正值：地区差异来源）
- `order.shock`（短期冲击值：暴动/案件余波等）
- `order.shock_decay_per_day`（冲击衰减速度：让冲击回归）
- `order.last_update_day`（上次日结 day：防重复）
- `order.tags`（秩序标签：宵禁/暴动后等开关）

### 2.3 可选输入（若你想治安受玩家影响）

- `player.social.reputation`（派系声望：例如警察声望高可略微提高治安恢复）
- `player.progress.flags`（剧情标记：例如主线推进导致治安长期走向变化）

> 如果你不想让治安受玩家影响，这一段可以先删掉，保持系统简单。

------

## 3) 写入字段（Write Set）（本系统自动结算写这些）

> 只通过 Apply 写入，不允许直接改 L2。

- `order.global`（更新后的全城治安）
- `order.shock`（衰减后的冲击值：逐步回归 0）
- `order.last_update_day`（写入当前 world.day，表示已完成当日日结）
- （可选）`order.tags`（某些标签可能在冲击恢复后自动移除，例如 riot_recent 过几天自动消失）

> **注意**：`order.zone_mod` 通常不由治安系统自动改（除非你设计“区域长期治理”机制）。它更多由剧情/事件写入。

------

## 4) 输出结果类型（Outputs）

- `OrderTicked`（治安完成日结：global/shock 等发生变化）
- `OrderThresholdCrossed`（跨越阈值：例如从“安全”跌到“混乱”；供事件系统/剧情监听）
- `OrderTagChanged`（秩序标签变化：例如宵禁解除）

> 这些输出给 Digest/固定事件/剧情监听用，不直接生成文本。

------

## 5) 禁止项（Hard No）

- ❌ 不生成“遇敌概率/危险等级”（那是 Digest 派生：由治安+地点标签+时段综合推导）
- ❌ 不直接触发剧情事件（最多发出 `ThresholdCrossed` 信号）
- ❌ 不写 L1 静态表

------

## 6) 地区修正值（zone_mod）的契约说明（对应你提出的想法）

你提出的“不同区域治安度修正值（会随故事动态变化）”——推荐采用如下契约：

- `order.global`：全城底盘（由治安系统按日漂移维护）
- `order.zone_mod[zoneId]`：地区偏移（由故事/事件/派系行为改变，是“可存档真相”）
- Digest 计算某地点的“局部秩序/风险”时用：
  `local_order = clamp(order.global + order.zone_mod[zoneId] + order.shock, 0..100)`（示意）
- 治安系统本身不需要把 `local_order` 存进 L2（避免派生值入档）

**谁来改 zone_mod？**

- 固定事件/剧情系统（例如“C区暴动”→ `zoneC: -30`）
- 任务结果/派系行动（例如“协助警局扫荡”→ `zoneC: +10`）
- 这些修改都通过 Apply 写入 `order.zone_mod`，治安系统在下一次日结自动纳入计算。