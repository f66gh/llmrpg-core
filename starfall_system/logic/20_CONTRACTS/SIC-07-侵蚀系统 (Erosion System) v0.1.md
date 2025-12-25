# SIC-07-侵蚀系统 (Erosion System) v0.1

> **定位**：L3 规则演算层（Tick）为主；L4 事件/战斗结算可追加侵蚀增量
> **侵蚀度定义**：`player.body.erosion` = **魔物化倾向**（长期轴，0 起步向上累积）
> **核心职责**：在“跨日/时段/特定事件”发生时，结算侵蚀度增长（或少量恢复），并输出阈值跨越信号供事件/剧情监听。
> **不做**：不生成叙事；不直接改堕落值（corruption）；不计算危险度/费洛蒙。

------

## 1) 触发点（When）

### 1.1 主触发（推荐，先跑通）

- **DayChanged**：每次跨日触发一次 `ErosionTick.onDayTick()`
  - 用途：最稳定，适合做“环境长期侵蚀”“诅咒持续侵蚀”等。

### 1.2 可选触发（后续再加）

- **SlotChanged**：按时段触发 `onSlotTick()`（例如深夜瘴气更强）
- **Combat/Event Resolution（L4）**：事件/战斗结果可以额外提交 `erosion_delta`（例如被诅咒命中、接触污染源）

> 规则：同一回合不要重复跑 DayTick；用 `last_update_day` 防重。

------

## 2) 读取字段（Read Set）（字段后中文注释）

### 2.1 时间与位置锚点

- `world.day`（当前第几天：日结与防重依据）
- `world.time_slot`（当前时段：若启用 SlotTick，用于时段修正）
- `world.location_id`（当前位置节点ID：用于读取该地点的瘴气/污染/诅咒环境参数）
- `world.weekday`（星期：通常不需要；除非你做“某些日子污染更强”的规则）

### 2.2 角色侵蚀真相

- `player.body.erosion`（当前侵蚀度：魔物化倾向数值）
- `player.body.corruption`（堕落值：通常不参与侵蚀结算；仅当你未来做“高堕落更易被侵蚀”的耦合时才用，可先不读）

### 2.3 抗性输入（来自抗性系统 L2）

- `player.resistance.miasma`（瘴气抗性：抵抗环境瘴气导致的侵蚀增长）
- `player.resistance.curse`（诅咒抗性：抵抗诅咒类侵蚀增长）

### 2.4 秩序/环境输入（可选）

- `order.global`（全城治安：通常不影响侵蚀；除非你设定“混乱时期污染扩散更快”）
- `order.tags`（秩序标签：可选，例如 "miasma_storm" 这种全城异常期）

### 2.5 规则参数来源（L1 静态）

- `Map_Data[location_id].miasma_level`（地点瘴气强度：静态环境参数）
- `Map_Data[location_id].curse_level`（地点诅咒强度：静态环境参数）
- `Erosion_Config`（侵蚀规则配置：增长基准、抗性换算、阈值表等）

> 说明：L2 不存 `miasma_level` 这种环境强度，它属于 L1 地图静态数据。

------

## 3) 写入字段（Write Set）

> 只通过 Apply 写入，不允许直接改 L2。

- `player.body.erosion`（侵蚀度：按日/时段/事件增量更新）
- （可选）`player.body.erosion_stage`（侵蚀阶段：由阈值映射得到的枚举；如果你决定让阶段入档）
- （可选）`player.body.erosion_last_update_day`（上次侵蚀日结发生在哪一天：防止重复日结）

> 你也可以不存 `erosion_stage`，让 Digest 每次从 erosion 数值推导阶段；但如果阶段会影响“玩家可选项锁定”，存一个 stage 会更稳。

------

## 4) 输出结果类型（Outputs）

- `ErosionTicked`（侵蚀日结完成：本次增加了多少）
- `ErosionThresholdCrossed`（跨越阈值：例如从阶段1进入阶段2）
- `ErosionSuppressed`（本次被抑制：例如抗性很高/在安全屋净化区，增量为0或为负）
- `ErosionEventSuggested`（可选：达到某阈值建议触发固定事件；真正触发由事件系统决定）

------

## 5) 侵蚀增长的口径（只定“从哪来”，不定公式）

侵蚀增量 `Δerosion` 建议由以下部分组成（公式细节放 L1 配置）：

1. **环境侵蚀（主来源）**
   - 来源：地点的 `miasma_level`（瘴气强度）
   - 抗性：用 `resistance.miasma` 折减
2. **诅咒侵蚀（次来源）**
   - 来源：地点或状态带来的 `curse_level` / curse tag
   - 抗性：用 `resistance.curse` 折减
3. **事件追加（外部输入）**
   - 来源：战斗/事件结算提交的 `erosion_delta`（例如接触污染物、被诅咒命中）
   - 抗性：可由提交方决定是否已包含抗性折减，或统一让侵蚀系统做折减（推荐统一由侵蚀系统折减，避免重复/漏算）
4. **净化/恢复（可选）**
   - 来源：安全屋/洗浴/净化仪式等
   - 表达：允许 `Δerosion` 为负（但通常有下限不低于 0）

------

## 6) 阈值与阶段（Stage）建议

如果你想做“思考魔物化阶段”，建议用枚举（示例）：

- `NORMAL | TAINTED | MUTATING | MONSTROUS`

阈值表放 L1：例如

- 0–199 = NORMAL
- 200–499 = TAINTED
- 500–799 = MUTATING
- 800+ = MONSTROUS

> **契约**：
>
> - 阶段用于 **约束系统/衣物门槛/剧情节点** 的“硬开关”。
> - 阶段值要么入档（`erosion_stage`），要么由 Digest 推导，但必须全局统一口径。

------

## 7) 禁止项（Hard No）

- ❌ 不修改 `player.body.corruption`（堕落值属于另一套系统）
- ❌ 不修改 `player.body.lust`（欲望属于欲望系统/事件结算）
- ❌ 不生成危险度/遇敌概率（Digest 处理）
- ❌ 不写 L1 地图/配置（静态表只读）

