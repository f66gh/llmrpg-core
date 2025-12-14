# Project Structure

```
llmrpg-core/
├─ README.md
├─ docs/
│  └─ AI_ARCHITECTURE.md
├─ apps/
│  └─ web/                      # Next.js front-end
│     ├─ app/
│     │  ├─ api/llm/route.ts    # Gemini proxy endpoint
│     │  ├─ layout.tsx
│     │  └─ page.tsx            # Game UI with LLM toggle
│     ├─ components/            # UI atoms
│     │  ├─ ActionPanel.tsx
│     │  ├─ GameHUD.tsx
│     │  └─ StoryStream.tsx
│     ├─ public/
│     ├─ package.json
│     ├─ tailwind.config.ts
│     └─ tsconfig.json
├─ packages/
│  ├─ core/                     # Engine & schemas (UI-free)
│  │  ├─ src/
│  │  │  ├─ engine/             # Step/tick, rules, events
│  │  │  ├─ llm/                # Prompting helpers, digests
│  │  │  ├─ plugins/
│  │  │  ├─ schema/             # GameState, effects, events, LLM types
│  │  │  └─ storage/            # Save abstractions + adapters
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ worlds/
│     ├─ starfall-city/         # Example worldpack
│     │  ├─ world.json          # World metadata + initialState
│     │  ├─ events.json         # Event definitions
│     │  └─ README.md
│     └─ package.json
├─ pnpm-workspace.yaml
├─ package.json
└─ tsconfig.base.json
```
