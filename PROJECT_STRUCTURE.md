# Project Structure（目录说明）

```
llmrpg-core/
|-- .gitignore                      - Git 忽略规则
|-- PROJECT_STRUCTURE.md            - 项目结构说明（本文档）
|-- README.md                       - 项目简介与快速开始
|-- docs/                           - 设计与技术文档
|   `-- AI_ARCHITECTURE.md          - LLM 架构与交互设计说明
|-- apps/                           - 应用层（前端/后端入口）
|   `-- web/                        - Next.js 前端客户端
|       |-- app/                    - 应用入口与路由
|       |   |-- api/
|       |   |   |-- llm/route.ts            - LLM 叙事改写接口
|       |   |   `-- llm/encounter/route.ts  - LLM 随机事件接口
|       |   |-- layout.tsx          - 前端布局
|       |   `-- page.tsx            - 游戏 UI 入口（加载 world + hooks + UI 插件）
|       |-- components/             - 通用 UI 组件
|       |   |-- ActionPanel.tsx
|       |   |-- GameHUD.tsx
|       |   `-- StoryStream.tsx
|       |-- src/
|       |   |-- plugins/            - 前端 UI 插件体系
|       |   |   |-- DebugHUDPlugin.tsx
|       |   |   |-- HealthBarPlugin.tsx
|       |   |   |-- ScoreBoardPlugin.tsx
|       |   |   `-- pluginManager.ts
|       |   |-- lib/                - 前端 LLM/事件辅助
|       |   |   |-- encounter.ts            - LLM 随机事件生成（前端调用）
|       |   |   `-- narration.ts           - 叙事改写调用/fallback
|       |   `-- worlds/             - 前端 world loader（选择世界、绑定 hooks/UI 插件）
|       |       `-- index.ts
|       |-- worlds/                 - 旧的前端 world 目录（可移除或留空）
|       |-- next-env.d.ts
|       |-- next.config.js
|       |-- package.json
|       |-- tailwind.config.ts
|       `-- tsconfig.json
|-- packages/                       - 可复用核心包
|   |-- core/                       - 游戏核心引擎与通用逻辑
|   |   |-- src/
|   |   |   |-- engine/             - 状态推进、事件执行、规则引擎
|   |   |   |-- llm/                - LLM 提示构建、记忆、摘要
|   |   |   |   |-- adHocEvent.ts           - LLM 临时事件结构与校验
|   |   |   |   |-- narrator.ts             - 文本改写输入/输出/守卫
|   |   |   |   |-- promptBuilder.ts        - 叙事/事件等提示构建
|   |   |   |   |-- randomEncounterPrompt.ts- 随机遭遇提示构建
|   |   |   |-- plugins/            - 引擎插件接口与插件管理
|   |   |   |-- schema/             - 类型定义（游戏/事件/效果/LLM）
|   |   |   `-- storage/            - 存档接口与浏览器/Node 适配器
|   |   |-- package.json            - 核心包元数据
|   |   `-- tsconfig.json
|   `-- worlds/                     - 世界数据包合集（可作为 workspace 包引用）
|       |-- package.json            - 导出各世界的 world/events/插件
|       |-- types.d.ts              - 世界包的类型声明
|       |-- sandbox/                - Sandbox 测试世界
|       |   |-- events/             - TS 事件定义（聚合 index.ts）
|       |   |-- plugins/            - Sandbox 专属引擎插件（TurnIncrement 等）
|       |   |-- world.json          - 世界元数据与初始状态
|       |   `-- README.md           - 世界说明与手动验收用例
|       `-- starfall-city/          - 示例世界数据
|           |-- events.json         - 事件定义
|           |-- README.md           - 世界说明
|           `-- world.json          - 世界配置与初始状态
|-- pnpm-lock.yaml                  - 依赖锁定文件
|-- pnpm-workspace.yaml             - Monorepo 工作区配置
|-- package.json                    - 根级依赖与脚本
`-- tsconfig.base.json              - 根级 TypeScript 配置
```
