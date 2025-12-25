# SIC-04-金钱系统 (Economy & Wallet) v0.1

> **定位**：
>
> - **L3：Economy Tick（按日结算）**：利息、固定支出、逾期推进等后台规则
> - **L4：Wallet Actions（玩家/事件交易）**：买卖、奖励、借款、还款等动作入口
>   **原则**：
> - 数值变化必须通过 Apply 写入 L2
> - “物价/商店是否营业/打折”等是 **Digest 派生或 L1 静态配置**，不入档
> - LLM 只能提出“交易意图/时长”，不能直接改钱和债（仍走 L4 的交易工具）

------

## 0) L2 经济字段（wallet 域：真相）

这些字段建议放在 `player.wallet`（或你目前顶层 `wallet`，二选一保持一致）。

- `wallet.money`（当前现金 SC：你身上可用的钱）
- `wallet.debt`（当前负债 SC：欠款总额）
- `wallet.interest_rate_id`（利率方案ID：指向 L1 配置，如 "loan_shark_30pct"）
- `wallet.last_interest_day`（上一次计息发生的 world.day：防重复日结）
- `wallet.due_day`（下次还款/结算截止日 world.day：用于逾期判定）
- `wallet.debt_stage`（债务阶段：NORMAL/OVERDUE/COLLECTION 等）
- `wallet.penalty`（累计罚金或额外费用 SC：可选）
- `wallet.tags`（经济标签：如 "blacklisted_shop"、"loan_locked"：可选）
- `wallet.ledger`（流水记录：可选；不想做可以不加）

> **注意**：`wallet.money/debt` 是硬真相；`debt_stage/due_day/last_interest_day` 解决“逾期/重复计息”问题，强烈建议一开始就有。

------

## 1) L3：Economy Tick（按日结算）

### 1.1 触发点（When）

- **主触发（推荐）**：收到 `DayChanged` 时执行一次 `EconomyTick.onDayTick()`（按日计息/结算最稳定）
- （可选）`WeekdayChanged`：如果你要“周末利息/营业规则不同”，可监听，但不必一开始做

### 1.2 读取字段（Read Set）（每字段中文注释）

- `world.day`（当前第几天：用于判断是否到计息日/是否逾期）
- `world.weekday`（当前星期：可选，用于周末规则）
- `player.wallet.money`（现金：用于扣固定支出/判断是否可自动还款）
- `player.wallet.debt`（负债：用于计算利息与逾期）
- `player.wallet.interest_rate_id`（利率方案ID：决定利息怎么计算，具体数值在 L1）
- `player.wallet.last_interest_day`（上次计息日：防止同一天重复计息）
- `player.wallet.due_day`（截止日：判断是否逾期）
- `player.wallet.debt_stage`（债务阶段：NORMAL/OVERDUE/…）
- `player.wallet.penalty`（罚金：若你要做逾期罚金/催债费用）
- `player.progress.flags`（剧情开关：可选，例如某剧情触发额外债务压力）

### 1.3 写入字段（Write Set）

> 只通过 Apply 写入，不允许直接改 L2。

- `player.wallet.debt`（加上利息/罚金后的新负债）
- `player.wallet.last_interest_day`（写入当前 world.day，表示已计息）
- `player.wallet.debt_stage`（债务阶段推进：例如到期→逾期→催收）
- `player.wallet.penalty`（罚金累积或衰减：可选）
- `player.wallet.tags`（经济标签变更：可选，例如进入催收期加 "collection_active"）

### 1.4 输出结果（Outputs）

- `InterestApplied`（已计息：利息金额是多少）
- `DebtStageChanged`（债务阶段变化：NORMAL→OVERDUE 等）
- `PenaltyApplied`（罚金变化：+多少）
- `PaymentDueSoon`（临近到期提示信号：供事件/剧情监听，可选）

### 1.5 禁止项（Hard No）

- ❌ 不决定“商店是否开门/是否打折”（这属于 Digest 或 L1 配置）
- ❌ 不生成叙事文本
- ❌ 不写 L1（静态利率表/物价表永远不写）

------

## 2) L4：Wallet Actions（交易/借贷/还款）

> 这部分是玩家/事件入口：买东西、赚工资、借钱、还钱、罚款等都走这里。

### 2.1 触发点（When）

- 玩家动作：购买/出售/还款/借款
- 事件结果：奖励/罚款/勒索/抢劫损失/学费支出等

### 2.2 读取字段（Read Set）

- `player.wallet.money`（现金：是否够付）
- `player.wallet.debt`（负债：还款/借款上限）
- `player.wallet.debt_stage`（债务阶段：是否允许借新债、是否触发催收）
- `player.wallet.tags`（经济标签：黑名单/冻结等）
- `inventory.items`（背包：买卖物品时用）
- `world.location_id`（地点：是否允许交易/是否有黑市等，具体由 Digest 判定）
- `session.mode`（模式：战斗中是否允许交易）

### 2.3 写入字段（Write Set）

- `player.wallet.money`（现金增减：买卖/奖励/罚款）
- `player.wallet.debt`（负债增减：借款/还款）
- `player.wallet.due_day`（设定或更新还款截止日：借款后）
- `player.wallet.debt_stage`（例如还清后回到 NORMAL）
- `player.wallet.ledger`（写入交易记录：可选）
- `inventory.items`（买卖导致物品变化）

### 2.4 输出结果（Outputs）

- `TransactionCompleted`（交易完成：类型、金额、原因）
- `TransactionRejected`（交易失败：钱不够/被限制/地点不允许）
- `DebtCleared`（清债：debt 归零）
- `DebtIncreased`（新增债务：借款成功）

------

## 3) 建议的“极速可跑”规则口径（不写公式，只定口径）

- 计息频率：**每日一次（DayChanged）**
- 利率来源：`wallet.interest_rate_id` → L1 利率表
- 逾期判定：`world.day > wallet.due_day` → `debt_stage=OVERDUE`
- 催收阶段：逾期若持续 N 天（N 在 L1）→ `debt_stage=COLLECTION` 并打 tag

------

## 4) 需要回填到 L2 的字段清单（你下一步要改 L2 文档）

至少加这 6 个（强烈建议）：

1. `wallet.money`（现金 SC）
2. `wallet.debt`（负债 SC）
3. `wallet.interest_rate_id`（利率方案ID）
4. `wallet.last_interest_day`（上次计息日）
5. `wallet.due_day`（截止日）
6. `wallet.debt_stage`（债务阶段）

可选加：

- `wallet.penalty`（罚金）
- `wallet.tags`（经济标签）
- `wallet.ledger`（流水）