# SIC-02-生理期系统 (Bio Cycle) v0.2（对齐时间字段）

> **定位**：L3 规则演算层（Tick）
> **职责**：维护“生理周期”真相字段，并可对部分数值做**数值自动影响（规则漂移）**。
> **触发源**：严格由时间系统输出的 `DayChanged / SlotChanged` 驱动。
> **不做**：不生成叙事、不计算费洛蒙、不触发剧情（最多发事件信号供别的系统监听）。

------

## 1) 触发点（When）

- **主触发（推荐）**：收到 `DayChanged` 时执行一次（按天推进周期）

------

## 2) 读取字段（Read Set）

（每个字段后中文注释）

### 2.1 时间锚点（来自时间系统维护的一致字段）

- `world.day`（当前第几天，用于按天推进周期）
- `world.time_slot`（当前时段，用于可选的“时段影响强度”）
- `world.minute_of_day`（当天分钟数，用于极少数需要精确到分钟的规则；大多数情况下不用）
- `meta.turn`（当前第几轮行动，用于冷却/计时器类规则）

### 2.2 周期真相（你在 L2.cycle 域里）

- `cycle.cycle_stage`（当前周期阶段：SAFE/OVULATION/PERIOD）
- `cycle.day_in_cycle`（周期第几天：用于推进与跨阶段判断）
- `cycle.stage_progress`（当前阶段进度 0-100：用于阶段内细腻变化）
- `cycle.last_stage_change_day`（上次阶段变化发生在哪一天：防止重复触发阶段切换）

### 2.3 角色输入（仅用于“规则漂移”，不涉及叙事）

- `player.body.lust`（当前欲望值：用于阶段性自然增减）
- `player.body.corruption`（当前堕落/侵蚀度：用于可选的“漂移幅度修正”）
- `player.core.willpower`（意志力锚点：用于可选的“阶段对抗拒阈值修正”）

### 2.4 怀孕字段（**只读**，不在本模块写入）

- `pregnancy`（怀孕对象或 null：用于决定周期是否暂停/改变规则）

------

## 3) 写入字段（Write Set）

> 只通过 Apply 写入，不允许直接改 L2。

### 3.1 周期字段（Bio Cycle 模块拥有写入权）

- `cycle.cycle_stage`（周期阶段更新）
- `cycle.day_in_cycle`（周期日推进：+1 或按 slot 换算）
- `cycle.stage_progress`（阶段进度推进：按 day 或 slot 增长）
- `cycle.last_stage_change_day`（记录阶段切换发生的 day）

### 3.2 数值自动影响（可选，若启用“生理影响数值”）

> 建议：如果你未来还有“欲望系统（Lust Drift）”也会自然改 lust，就要在契约里选一种：
>
> - **方案A**：周期系统只写周期字段，不碰 lust；lust 漂移全在欲望系统里

------

## 4) 周期阶段模型（Stage Model）

你目前用 3 阶段枚举 `SAFE | OVULATION | PERIOD`，可以继续用。

**规则参数（每阶段几天 / 周期总天数）不进 L2**，放 L1（配置表）：

- `cycle.length_days`（周期总天数：做“极速生理期”就把它设小）
- `cycle.stage_lengths_days`（每阶段长度：例如 PERIOD=2天，SAFE=2天，OVULATION=1天）

> L2 只需要存“今天第几天/当前阶段/阶段进度”。

------

## 5) 输出结果类型（Outputs）

- `CycleTicked`（周期推进了一步：day_in_cycle 或 stage_progress 变化）
- `CycleStageChanged`（阶段变化：SAFE→OVULATION 等）
- `BaselineLustDrifted`（基础欲望漂移：lust +x/-x）

这些输出供：

- L4.5 Digest（摘要层）生成“处于排卵期/经期”的可读摘要
- 固定事件/剧情监听（例如第一次进入某阶段）

------

## 6) 怀孕的接口约定（强制写清）

- **Bio Cycle 只读 `pregnancy`**：用于决定周期规则是否变化（例如怀孕后周期暂停/改写）
- **怀孕字段的写入权**属于独立的 **Pregnancy Tick 子模块**（建议另出一张 `SIC-xx-怀孕系统`），写入：
  - `pregnancy.progress`（怀孕进度）
  - （建议未来改为）`pregnancy.days` 或 `pregnancy.countdown`（更适合按天 Tick）
  - `pregnancy.father_id`（通常由事件确立时写一次）

------

## 7) 建议你在 L2 里补的 Cycle 字段（为了对齐本卡）

你现在 L2 只有 `cycle_stage`，我建议把下面三项加进去（对应上面的 Read/Write）：

- `cycle.day_in_cycle`（周期第几天：用于推进）
- `cycle.stage_progress`（阶段进度 0-100：用于细腻变化）
- `cycle.last_stage_change_day`（记录上次阶段变更日：防止重复触发）

------

如果你确认这版 SIC-02，我下一条就按你 L2 v0.1 的文风，给你一段**可直接粘贴**的“ⅡΙΙ.世界环境 → 2.周期状态 (Cycle)”替换稿，把 `day_in_cycle/stage_progress/last_stage_change_day` 加进去，并给每个字段配中文注释与范围。