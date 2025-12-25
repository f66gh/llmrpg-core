# SIC-08-堕落值系统 (Corruption System) v0.1

> **堕落值定义**：`player.body.corruption` = **对性行为的开放程度（长期轴）**
> **区别**：
>
> - `lust`（欲望）= 当下短期冲动（会涨会掉）
> - `corruption`（堕落）= 长期观念/接受度（变化慢、偏不可逆或难逆转）
> - `erosion`（侵蚀）= 魔物化倾向（另一套轴，已单开）

------

## 1) 触发点（When）

### 1.1 主触发（推荐，先跑通）

- **L4 事件/战斗结算**：每次事件选择、战斗结果、社交互动等，产生 `corruption_delta` 并由堕落系统统一 Apply 落到 L2。
  - 用途：堕落的主要来源应该是“做了什么/选了什么”，而不是纯时间流逝。

### 1.2 可选触发（后续再加）

- **DayChanged（L3 Tick）**：按日做非常轻量的漂移或恢复（例如长期压抑/长期放纵的缓慢惯性）。
  - 这不是必须，一开始可以不做，避免变成“自动上涨”的顶层变量。

------

## 2) 读取字段（Read Set）（字段后中文注释）

### 2.1 时间锚点

- `world.day`（当前第几天：用于可选的按日漂移/防重复）
- `meta.turn`（当前第几轮行动：用于记录最近一次变化）

### 2.2 堕落真相

- `player.body.corruption`（堕落值数值：性开放程度主轴）
- （可选）`player.body.corruption_stage`（堕落阶段：由阈值映射；用于门槛/剧情开关）

### 2.3 相关输入（只作为修正项，不强制）

- `player.resistance.shame`（羞耻抗性：影响“羞耻冲击导致的堕落增量”是否更大/更小）
- `player.progress.flags`（剧情开关：某些剧情会改变堕落变化规则）
- `wardrobe` 或 Digest 暴露摘要（暴露/不体面程度：如果你允许“持续暴露”造成堕落惯性；可选）

> 说明：堕落系统**不需要依赖 lust 才能跑**。
> lust 可以作为“某些行为可选/失控”的门槛，但“做了行为 → 才改堕落”更稳定。

------

## 3) 写入字段（Write Set）

> 只通过 Apply 写入，不允许直接改 L2。

- `player.body.corruption`（堕落值更新：+Δ / -Δ）
- （可选）`player.body.corruption_stage`（阶段更新：例如 PURE→TAINTED→FALLEN）
- （推荐）`player.body.corruption_last_update_turn`（上次变化发生的 turn：用于防重复、成就监听、剧情判定）

------

## 4) 输出结果类型（Outputs）

- `CorruptionChanged`（堕落值变化：delta、newValue）
- `CorruptionStageChanged`（堕落阶段变化：from→to）
- `CorruptionMilestoneReached`（达到里程碑：用于成就/称号/剧情节点监听）

------

## 5) 阶段与阈值（Stage Mapping）约定

你可以选择两种实现方式：

- **方式B**：`corruption_stage` **入档**（更适合“阶段锁定选项/衣物门槛”），由堕落系统在结算时同步更新

阈值表（例如 0–199 / 200–499 …）放在 **L1 配置**，不要写进 L2。

------

## 6) 与衣物系统的接口约定（你后面要用）

- 衣物门槛读取：
  - `player.body.corruption` 或 `player.body.corruption_stage`（作为穿戴限制条件）
- 具体每件衣服的限制写在 L1 `ItemRegistry[itemId].requires`（例如 requires.corruption_stage >= TAINTED）

------

## 7) 禁止项（Hard No）

- ❌ 不修改 `player.body.erosion`（侵蚀系统专管）
- ❌ 不直接修改 `player.body.lust`（欲望系统/事件专管）
- ❌ 不生成叙事/对话
- ❌ 不在运行时改 L1 阈值表/物品门槛表

------

# L2-世界状态定义 v0.1 需要怎么改（堕落系统字段补丁）

你已经有：`player.body.corruption` ✅
建议新增 2 个字段（其中 1 个强烈建议）：

### 在 Ⅰ.玩家实体 → 2.身体状态 (Body State) 里新增

- **corruption_stage**: (Enum, 可选) 堕落阶段（性开放阶段）。
  - 示例取值：`PURE | TAINTED | FALLEN | BROKEN`（你可自定义）
  - 含义：由 `corruption` 映射得到；用于衣物门槛、剧情硬开关（可选入档）。
- **corruption_last_update_turn**: (number, 推荐) 上次堕落值发生变化的 turn（meta.turn）。
  - 含义：防止同一回合重复结算；也方便做“最近刚发生重大变化”的事件监听。

> 如果你想极简：只加 `corruption_last_update_turn` 也能跑；`corruption_stage` 后面再加也行，但你既然要做衣物门槛，早点加更省返工。

------

如果你确认这版堕落系统，下一步我建议就接 **SIC-05 衣物与装备系统 v0.2**：把 `canEquip()` 里正式加入 `corruption_stage/erosion_stage + resistance.shame` 的门槛检查，并写死“只能穿 L1 itemId”。