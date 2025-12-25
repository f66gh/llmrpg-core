# L2-世界状态定义 (L2 - The Truth) v0.1

**定位**：L2（唯一真相）
**作用**：这是游戏存档的 **Schema（结构定义）**。所有“会变的数据”都在这里。
**原则**：只存数据，不存描写；描写由 L4.5 Digest / L5 叙事层根据数据生成。
**写入规则**：任何变化都必须通过统一“写入通道/结算结果集（Apply）”落到 L2（L3/L4 只产出变更，不直接手改字段）。

------

## 0) 存档元信息 (Save Meta)

**meta**（Object）

- **schema_version**: (string) `L2_v0.1`
  - 用途：存档迁移/兼容
- **seed**: (number) 随机种子（可选但推荐）
- **turn**: (number) 当前第几轮行动/结算计数（可选，用于回放/调试）

------

## Ⅰ) 玩家实体 (Player Entity: Yuna)

**ID**：`char_001_yuna`（原名：琪琪，仅作为别名，不作为引用ID）

### 1) 核心生存数值 (Core Stats)

**core**（Object）

- **hp**: (number) 当前体力。范围建议 `[0-100]`
- **mp**: (number) 当前魔力。范围建议 `[0-120]`
- **tp**: (number) 当前战意。范围建议 `[0-100]`
- **willpower**: (number) 意志力锚点/抗拒基准值
  - 范围建议 `[0-1000]`
  - 语义：默认作为“抗拒/自控阈值的基础参数”（可被事件长期改变，也可作为成长项）；如果未来你要做成“可消耗资源条”，再单独加 `willpower_current / willpower_max`。

### 2) 身体状态 (Body State)

**body**（Object）

- **lust**: (number) 当前欲望值。范围建议 `[0-200]`（可后续扩展）
- **erosion**: (number) **侵蚀度（魔物化倾向）**。
  - 范围建议：`0..100`
  - 含义：代表“思考/身体向魔物化滑落”的程度。由**侵蚀系统**维护。
- **erosion_stage**: (Enum) 侵蚀阶段（魔物化阶段）。
  - 示例取值：`NORMAL | TAINTED | MUTATING | MONSTROUS`
  - 含义：由 `erosion` 映射得到；用于门槛与剧情触发（可选入档）。
- **erosion_last_update_day**: (number) 上次侵蚀系统完成日结的 day（world.day）。
  - 含义：防止同一天重复推进侵蚀。
- **corruption**: (number) **堕落值（性开放程度）**。
  - 范围建议：`0..1000`（或你想用 0..100 也行，但要统一）
  - 含义：代表“对性行为的接受/开放程度”的长期轴。由**堕落系统**维护。
- **corruption_stage**: (Enum, 可选) 堕落阶段（性开放阶段）。
  - 示例取值：`PURE | TAINTED | FALLEN | BROKEN`（你可自定义）
  - 含义：由 `corruption` 映射得到；用于衣物门槛、剧情硬开关（可选入档）。
- **corruption_last_update_turn**: (number, 推荐) 上次堕落值发生变化的 turn（meta.turn）。
  - 含义：防止同一回合重复结算；也方便做“最近刚发生重大变化”的事件监听。

> 备注：`lust` 仍然是短期当下欲望，不等同于 `corruption`。

#### 2.1 体液残留 (Fluids)

**fluids**（Object）

> 单位：**毫升（ml）** 为主；若某项不是 ml，必须在字段名里写清楚单位/含义。

- **womb_ml**: (number) 子宫内残留量（ml）
- **stomach_ml**: (number) 胃内容物量（ml）
- **skin_coverage_pct**: (number) 皮肤表面覆盖度（百分比）范围 `[0-100]`

> 备注：之所以保留 `skin_coverage_pct` 是因为“覆盖度”更符合清洁/沾染的玩法；它不是 ml。

#### 2.2 身体开发度 (Body Development)

**bodyDev**（Object）

- **parts**（Object）各部位开发：
  - **mouth**: `{ level: 1, exp: 0 }`
  - **chest**: `{ level: 1, exp: 0 }`
  - **bottom**: `{ level: 1, exp: 0 }`
  - （可扩展：womb、anus、thigh 等）

> 规则：这里存的是“真相进度”。具体“升级所需经验表/效果”属于 L1 静态数据或 L3 规则。

### 3) 社会属性 (Social Stats)

**social**（Object）

- **gpa**: (number) 学分绩点。范围建议 `[0.0-4.0]`
- **reputation**: (Object) 派系声望（key 必须用 `factionId`）
  - 示例：
    - `faction_school`: 100
    - `faction_police`: 0
    - `faction_underground`: -50
  - 范围建议：`[-1000, 1000]`（或你自定，但要统一）
  - 未出现派系的默认值：建议视为 `0`

### 4) 经济属性 (Wallet)

**wallet**: (Object) 经济真相域（单位：SC）

- **money**: (number) 当前现金（身上可用的钱）。
  - 含义：购买/交易直接消耗的货币。
- **debt**: (number) 当前负债总额（欠款）。
  - 含义：借款、利息、罚金等累计在这里；还款会减少该值。
- **interest_rate_id**: (string) 利率方案 ID（指向 L1 利率配置表）。
  - 含义：决定“每天计息多少/逾期如何加罚金”的规则参数来源。
- **last_interest_day**: (number) 上一次执行“按日计息”的 day（world.day）。
  - 含义：防止同一天重复计息导致债务暴涨。
- **due_day**: (number) 下次还款截止日（world.day）。
  - 含义：当 `world.day > due_day` 时进入逾期状态。
- **debt_stage**: (Enum) 债务阶段。
  - 取值示例：`NORMAL | OVERDUE | COLLECTION`
  - 含义：用于触发催收剧情、限制借新债、改变事件池等。
- **penalty**: (number, 可选) 累计罚金/额外费用。
  - 含义：逾期罚金、催收成本等（也可以直接并入 debt，不单列）。
- **tags**: (Array<string>, 可选) 经济标签。
  - 示例：`["collection_active", "shop_blacklist"]`
  - 含义：硬开关型状态，供事件/商店规则读取。
- **ledger**: (Array, 可选) 流水记录（若启用）。
  - 含义：记录交易原因与金额（用于回溯/剧情证据），不想做可以先不加。

> 备注：以后如果加“利率/还款日/信用”等，都在 wallet 下扩展，避免散落顶层。

### 5) 元进度与剧情标记 (Meta Progress & Flags)

**progress**（Object）

- **traits**: (Array<string>) 已获得特质ID
  - 示例：`['trait_genius', 'trait_sensitive']`
- **titles**: (Array<string>) 已获得称号ID
  - 示例：`['title_debtor']`
- **achievements**: (Array<string>) 已解锁成就ID
  - 示例：`['ach_first_climax']`
- **flags**: (Object) 剧情开关（一次性/阶段性标记）
  - 示例：
    - `has_met_boss_01: true`
    - `is_virgin: true`

### 6）抗性 (Resistance)

> **说明**：抗性为长期真相数值，可正可负（正=更抗，负=更脆弱）。
>  抗性被战斗/事件/侵蚀系统/堕落系统/欲望系统读取用于判定与倍率修正。
>  具体换算公式与上限写在 L1 配置表中。

**resistance**: (Object) 抗性数值域（建议范围 `-100..+100`，默认 `0`）

- **miasma**: (number) 瘴气抗性（抵抗瘴气造成的侵蚀增长/战斗劣化）。
- **restraint**: (number) 拘束抗性（抵抗束缚/捆绑控制）。
- **shame**: (number) 羞耻抗性（抵抗暴露/不体面导致的心理冲击与社交惩罚倾向）。
- **hypnosis**: (number) 催眠抗性（抵抗催眠类状态）。
- **curse**: (number) 诅咒抗性（抵抗诅咒类持续负面，优先影响侵蚀相关结算）。
- **pleasure**: (number) 快感抗性（影响欲望值上升速度：抗性越低，上升越快）。
- **heat**: (number) 发情抗性（影响高潮/失控阈值：抗性越低，阈值越容易下降）。
- **trap**: (number) 陷阱抗性（抵抗陷阱触发/控制/伤害）。

------

## Ⅱ) 物品与装备 (Inventory & Wardrobe)

### 1) 衣柜 (Wardrobe)

记录当前身上穿的装备实例（**实例**意味着：同一 itemId 不同耐久/污渍状态）。

**wardrobe**（Object）

```js
wardrobe: {
  outer:  { itemId: "coat_school",  durability: 80,  stained: false },
  top:    { itemId: "shirt_white",  durability: 0,   stained: true  }, // 破损且脏
  bottom: { itemId: "skirt_plaid",  durability: 100, stained: false },
  intim_bot: null // 没穿/被拿走
}
```

字段说明（每个槽位实例）：

- **itemId**: (string) 指向 L1 物品模板
- **durability**: (number) 当前耐久（范围由 L1 的 `durabilityMax` 定）
- **stained**: (boolean) 是否污渍/沾染（更细分可扩展为 stainType / stainLevel）

### 2) 背包 (Inventory)

**inventory**（Object）

- **items**: (Array)
  - `[{ itemId: "item_bread", count: 2 }, { itemId: "item_condom", count: 1 }]`

------

## Ⅲ) 世界环境 (World Environment)

### 1) 时空锚点 (TimeSpace)

> **说明**：`minute_of_day` 是精确真相（当天分钟数）。
>  `time_slot / slot_index` 必须由 **时间系统 (Time Engine)** 根据 `minute_of_day` 自动换算并保持一致，外部系统不得只改其中一个字段。
>
> **时间推进规则（约定）**：
>
> - 任何系统不得直接修改 `day/weekday/minute_of_day/time_slot/slot_index`。
> - 若叙事/事件需要“过去了多久”，只能提交时间增量（分钟或时段），由时间系统结算并写入。
> - 跨日时：`day +1`，`weekday` 按 `MON→...→SUN→MON` 推进，`minute_of_day` 回到 0–1439 范围内。

**day**: (number) 当前第几天。（从 1 开始累计） 

**weekday**: (Enum) 当前星期。

- 取值：`MON | TUE | WED | THU | FRI | SAT | SUN`
- 用途：课程/商店营业日/周末事件等固定规则。

**minute_of_day**: (number) 当天分钟数（精确时间）。范围 `[0-1439]`。

- 示例：12:34 → `12*60+34=754`
- 用途：允许 LLM/事件返回时间增量（例如 +37 分钟），由时间系统推进。

**time_slot**: (Enum) 当前时段（粗粒度时间段）。

- 取值：`MORNING | AFTERNOON | EVENING | NIGHT`
- 维护规则：由 `minute_of_day` 自动映射得到，禁止外部手改。

**slot_index**: (number) 当前时段序号（用于计算推进几个时段）。

- 范围：`0..slot_per_day-1`
- 维护规则：由 `time_slot` 映射得到（或直接由 `minute_of_day` 推导）。

**slot_per_day**: (number) 一天总共有多少个时段。默认 `4`。

- 用途：未来你想把一天拆成 6 段时保持兼容。

**last_advanced_turn**: (number) 上一次“成功推进时间”的行动序号（turn）。

- 用途：防止同一回合重复推进时间（调试/防bug用）。

**location_id**: (string) 当前所在节点 ID（如：`loc_gym_locker`）

### 2) 周期状态 (Cycle)

> **说明**：周期系统（Bio Cycle）在 **DayChanged（跨日）** 时推进这些字段。
>  **方案A**：周期系统**不修改 lust**，只维护周期相关真相字段；欲望漂移由“欲望系统”负责。
>
> **派生不入档**：排卵概率、发情强度修正、费洛蒙强度等均由 Digest/规则推导，不写入 L2。

**cycle**: (Object) 生理周期真相字段：

- **cycle_stage**: (Enum) 当前周期阶段。
  - 取值：`SAFE | OVULATION | PERIOD`
  - 含义：用于事件门槛、规则修正、摘要生成。
- **day_in_cycle**: (number) 当前处于本次周期的第几天。
  - 范围：建议 `1..cycle_length_days`（周期总天数由 L1/规则参数定义）
  - 含义：用于推进与跨阶段判断（比只用 stage 更稳定）。
- **stage_progress**: (number) 当前阶段进度（百分比）。
  - 范围：`0..100`
  - 含义：用于阶段内精细变化（例如“接近排卵/经期末尾”）。
  - 备注：如果你不想做精细度，也可以一直用 `0/100` 粗跳，但字段先留着最省返工。
- **last_stage_change_day**: (number) 上一次“阶段切换”发生在哪一天（world.day）。
  - 含义：防止同一天内重复触发阶段切换/重复触发阶段事件。

### 3) 怀孕状态 (Pregnancy)

**pregnancy**: (Object | null)

> **说明**：怀孕字段属于“长期真相”，会跨天推进。
>  **写入权**：由独立的 **怀孕系统（Pregnancy Tick）** 或事件执行器写入；生理期系统只读取 pregnancy 来决定周期规则是否需要改变。

**pregnancy**: (Object | null) 若怀孕则存；未怀孕为 `null`。

- **father_id**: (string) 父方实体 ID。
  - 含义：指向 NPC/魔物/未知（用占位 ID）。
  - 备注：通常只在“怀孕确立的事件结算”那一刻写入一次。
- **progress**: (number) 怀孕进度。
  - 范围：`0..100`
  - 含义：表示孕期推进程度（按天推进或按阶段推进，规则由怀孕系统定义）。

> （可选建议）如果你后面更想按天做规则，可以把 `progress` 替换或并存为：
>
> - `days`（怀孕第几天）或 `countdown`（距离分娩倒计时）

### 4) 城市秩序 / 治安 (Order)

> **说明**：这是“全城治安底盘 + 区域修正 + 短期冲击”的真相字段。
>
> - **治安系统（L3 Tick）** 会在 `DayChanged`（跨日）时自动结算并更新 `order.global / order.shock / order.last_update_day`。
> - **剧情/固定事件/任务结果（L4 事件执行器）** 可以通过 Apply 改变 `order.zone_mod / order.tags / order.shock`。
> - “危险等级/遇敌概率/巡逻强度”等属于 **Digest 派生**，不入档。
> - **局部秩序（派生，不入档）**：
>   - 对于某个地点所属区域 `zoneId`，可用：
>      `local_order = clamp(order.global + order.zone_mod[zoneId] + order.shock, 0..100)`
>   - 由 `local_order + 时间段 + 地点标签` 推导“危险等级/遇敌权重/巡逻强度”（这些都属于 Digest）。

**order**: (Object) 城市治安/秩序真相域：

- **global**: (number) 全城治安度（秩序值）。
  - 范围建议：`0..100`（0=极度混乱，100=极度安全）
  - 含义：全地图共享的安全底盘，供商店/事件/遭遇系统推导使用。
- **zone_mod**: (Object) 区域治安修正值（地区偏移）。
  - 结构示例：`{ zoneA: +10, zoneB: 0, zoneC: -20 }`
  - 含义：不同区域相对 `global` 的偏移；会随剧情动态变化。
  - 备注：这里存的是“修正真相”，**不是**最终危险度。
- **shock**: (number) 短期治安冲击值（事件余波）。
  - 范围建议：`-100..+100`（负值更乱，正值更稳）
  - 含义：暴动/连环案件/大扫荡等造成的短期波动；会随时间衰减回到 0。
- **shock_decay_per_day**: (number) 冲击每日衰减量（shock 向 0 回归的速度）。
  - 范围建议：`0..100`
  - 含义：每天结算时，`shock` 会按该值减少（绝对值变小）直到接近 0。
  - 备注：也可以把该值移到 L1 配置表；若留在 L2 表示“当前世界处于特殊时期，恢复速度不同”。
- **last_update_day**: (number) 上一次完成“按日结算”的 day。
  - 含义：防止同一天重复结算治安（Debug/防bug）。
- **tags**: (Array<string>) 秩序标签（开关型真相）。
  - 示例：`["curfew_active", "riot_recent"]`
  - 含义：表示全城或某阶段的秩序状态，用于事件池/商店规则/剧情节点的硬开关。
  - 备注：标签的具体含义在 L1 或世界书规则里定义。

------

## Ⅳ) 会话态与跨步状态 (Session State)

> 目的：解决“战斗中/事件进行中/多步交互”刷新后丢失的问题。
> 这些不是 Digest，它们是**跨步必须保存的真相**。

**session**（Object）

- **mode**: (Enum) `FREE | EVENT | COMBAT`
- **event_id**: (string | null) 当前事件ID（当 mode=EVENT）
- **combat**: (Object | null) 战斗会话（当 mode=COMBAT）

**combat**（Object）建议最小字段：

- **enemies**: (Array<string>) 敌方实体ID列表（引用 L1 bestiary 的 monsterId 或运行时spawnId）
- **round**: (number) 当前回合数
- **turn_index**: (number) 当前行动序号（轮到谁）
- **escape_attempts**: (number) 逃跑尝试次数（若你需要）

------

# ❌ 排除列表 (Excluded - Do NOT Save)

以下属于 **L4.5 Digest（派生摘要）** 或纯叙事产物，**绝对不要**存进 L2（每次读取时重新计算/生成）：

1. **费洛蒙 (Pheromone)**：由 `lust + fluids + wardrobe + time/location` 等推导。
2. **当前危险度/遇敌概率 (Danger / Encounter Weight)**：由 `location + time + 治安/秩序相关真相字段 + 派生量` 推导。
3. **NPC 对话与叙事句子**：属于 L5 叙事生成。
4. **“当前可触发事件池”**：属于 Digest 结果（由 flags/时间/地点/派生风险推导）。
5. **纯展示用 UI 状态**：例如某个面板是否展开、鼠标停留等。

------

# ✅ 临时状态的存/不存判据（替代“临时Buff不存”的模糊说法）

- **必须存（应进入 L2）**：
  任何会影响下一步规则/选项/概率，且**无法仅从现有字段完整推导**出来的状态。
  例：中毒剩余回合数、流血层数、事件进行到第几段、战斗回合序列、饥饿层级（如果你做）。
- **不存（应进入 Digest 或直接生成）**：
  任何纯展示、纯推导、每回合可完全重算的量。
  例：费洛蒙强度、危险等级、商店是否开门（由时段+治安+flags推导）。

------

## （可选）最小存档示例骨架

```js
{
  meta: { schema_version: "L2_v0.1", seed: 12345, turn: 1 },
  player: {
    id: "char_001_yuna",
    core: { hp: 100, mp: 120, tp: 50, willpower: 60 },
    body: {
      lust: 20, corruption: 0,
      fluids: { womb_ml: 0, stomach_ml: 0, skin_coverage_pct: 0 },
      bodyDev: { parts: { mouth: {level:1, exp:0}, chest:{level:1, exp:0}, bottom:{level:1, exp:0} } }
    },
    social: { gpa: 3.2, reputation: { faction_school: 100 } },
    wallet: { money: 200, debt: 0 },
    progress: { traits: [], titles: [], achievements: [], flags: {} }
  },
  wardrobe: { /* ... */ },
  inventory: { items: [] },
  world: { day: 1, time_slot: "MORNING", location_id: "loc_home" },
  cycle: { cycle_stage: "SAFE" },
  pregnancy: null,
  session: { mode: "FREE", event_id: null, combat: null }
}
```

------

如果你接下来要继续“先写 L2 再重构系统”，下一步最划算的是：把 **“城市治安度 / 欲望 / 堕落 / 开发度 / 生理期”** 这些中层系统各自需要的 **L2 字段**补齐到这份字典里（哪怕先留空域），避免后面每写一个系统就回来改 Schema。