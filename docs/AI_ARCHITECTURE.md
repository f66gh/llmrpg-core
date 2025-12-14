# LLMRPG-Core – AI Architecture Contract

This document defines the **architectural contract** of LLMRPG-Core.
It is binding for:
- Human contributors
- AI code generation tools (ChatGPT, Codex, Copilot, etc.)

Any implementation that violates this contract is considered incorrect,
even if it "works".

---

## 1. Purpose

LLMRPG-Core is a **framework for building LLM-driven text RPGs**.

Core responsibilities:
- Own and manage all game state
- Enforce rules, progression, and determinism
- Execute events and apply effects
- Persist and restore saves

LLMs are used **only** to generate:
- Narrative text
- Dialogue
- Player-facing choices (text only)

LLMs must never be authoritative over game logic.

---

## 2. Non-Goals (Explicitly Not Supported)

The following are **out of scope by design**:

- Visual maps or character movement
- Real-time simulation or frame-based updates
- Chat-style freeform memory accumulation
- LLM-controlled state mutation
- Implicit or hidden game rules

If a feature requires violating these principles, it does not belong in core.

---

## 3. Core Design Principles

### 3.1 Single Source of Truth

- `GameState` is the single source of truth.
- All gameplay-relevant data must live in `GameState`.
- UI state and transient rendering state are excluded.

### 3.2 Determinism First

- Given the same `GameState` and player input,
  the engine must always produce the same result.
- Randomness must be explicit and seedable.

### 3.3 Explicit Over Implicit

- Time progression is explicit.
- Effects are explicit.
- No hidden side effects.

If something changes, it must be visible in state or patches.

---

## 4. Module Boundaries

### 4.1 Core Engine (`packages/core`)

- Contains **no UI code**
- Contains **no framework-specific dependencies** (React, Next.js, etc.)
- Can run in Node.js or browser environments

Core modules include:
- State management
- Rule evaluation
- Event execution
- LLM abstraction interfaces
- Save/load systems

### 4.2 Applications (`apps/*`)

- Thin presentation layers only
- Responsible for:
  - Rendering UI
  - Forwarding player actions
  - Displaying engine output
- Must not implement game logic

### 4.3 Worlds / Content

- Worlds are **data-only**
- No executable logic in world packages
- Events, items, NPCs, etc. are declarative

---

## 5. Engine Execution Model

### 5.1 Turn-Based Step Model

- The engine advances in discrete turns.
- One call to `Engine.step()` equals **exactly one turn**.

A turn may include:
- Time progression
- Event triggering
- Rule evaluation
- State mutation via effects

No partial turns are allowed.

---

### 5.2 State Mutation Rules

- The engine is the only authority allowed to mutate `GameState`.
- Mutations occur via:
  - Patches
  - Effects
  - Deterministic reducers

Direct mutation from UI or LLM output is forbidden.

---

## 6. Event System Rules

- Events are declarative definitions:
  - Trigger conditions
  - Branches
  - Effects
- Event execution must be:
  - Deterministic
  - Replayable
  - Serializable

Events must not:
- Call external services
- Depend on runtime environment

---

## 7. LLM Integration Rules

### 7.1 Role of the LLM

The LLM is a **narrative assistant**, not a game master.

Allowed:
- Describe outcomes
- Flavor text
- Rephrase structured choices

Forbidden:
- Creating or modifying state fields
- Making rule decisions
- Resolving randomness
- Skipping engine steps

---

### 7.2 Prompt Discipline

- Prompts must contain **minimal necessary context**
- Long-term memory must be summarized
- World data must be injected selectively

The engine controls what the LLM sees.

---

### 7.3 LLM Output Contract

- LLM output must conform to a strict schema
- Narrative text and structured data are separated
- Structured output is validated before use

Invalid output must be rejected or regenerated.

---

## 8. Save System Rules

- Saves must be fully serializable
- Loading a save must reproduce the same game state
- No hidden runtime-only state is allowed

---

## 9. Plugin & Extension Rules

- Plugins may extend:
  - Rules
  - Events
  - Content
  - UI (outside core)
- Plugins must declare:
  - Dependencies
  - Capabilities
  - Version compatibility

Plugins must not bypass core rules.

---

## 10. AI Coding Rules (Mandatory)

When generating code with AI tools:

- Follow existing folder structure strictly
- Do not introduce global mutable state
- Do not couple UI logic with engine logic
- Prefer simple, explicit implementations
- Do not add “smart” abstractions without justification

If uncertain, choose clarity over cleverness.

---

## 11. Enforcement

This document is authoritative.

If code conflicts with this contract:
- The contract wins
- The code must be revised
