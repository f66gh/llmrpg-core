# Sandbox World

一个用于测试引擎闭环的最小世界包，地点简单、事件可预测，方便验证时间槽、地点、数值变化与日结算钩子。

## 地点
- zone: `sandbox`
  - place: `home`
  - place: `street`

## 事件概览（5 个）
- `quiet-morning`：早晨在 `home`，纯叙事。
- `street-chatter`：下午在 `street`，纯叙事。
- `debt-notice`：晚间/夜间，money <= 0 时出现的欠费提示（分支基于 money 阈值）。
- `found-coin`：街上发现硬币，调整 money（可正可负）。
- `midnight-settlement`：午夜结算，用于 EconomyDailyTick 场景，扣除日常开销并记录日志。

## 初始状态
- meta: version `0.1.0`, seed `42`, phase `story`, turn `0`
- time: day `1`, slot `morning`
- location: zone `sandbox`, place `home`
- meters: money `0`, energy `5`, stress `0`
- flags: `{}`，log: `[]`

## 前端启用
1) 根目录执行 `pnpm install`，再 `pnpm --filter @llmrpg/core build`。
2) 启动前端：`pnpm --filter @llmrpg/web dev`（默认加载 sandbox 世界）。

## 手动验收用例
1) 在 home 连续推进 3 次：time.slot 应按 morning → afternoon → evening 推进。
2) 推进到跨日（night → morning）：logs 出现 “Daily cost ...”，money 扣固定值。
3) money < 0 时：触发 `debt-notice`，日志有欠费提示，flags.econ_debt = true。
4) 在 street 推进：触发 `found-coin` 或 `street-chatter`，money/energy/stress 按分支变化。
5) DebugHUD：显示最近一步的 eventId/pending/appliedEffects，Recent logs 下拉可切换 3/5/10 条并滚动查看。
