# LLMRPG-Core – AI Architecture Contract

This document defines the architectural contract for LLMRPG-Core.
It is binding for humans and AI code generators (Codex/Copilot/ChatGPT).

If code conflicts with this contract, the contract wins.

---

## 1. Purpose

LLMRPG-Core is a framework for LLM-driven text RPGs.

- The engine owns: **state, rules, events, persistence**
- The LLM provides: **narrative, dialogue, player-facing choices**
- The engine is authoritative for all state changes.

---

## 2. Non-Goals

- No visual map/movement engine
- No real-time simulation (turn-based only)
- No LLM-authoritative state mutation
- No UI logic inside `packages/core`

---

## 3. Repository Boundaries

- `packages/core`: engine, rules, events, schemas, save abstractions (NO React/Next)
- `apps/*`: thin UI only (NO game logic)
- `packages/worlds/*`: data-only worldpacks (NO executable logic)

---

## 4. Single Source of Truth

`GameState` is the single source of truth.

- All gameplay-relevant data must live in `GameState`
- UI may store transient rendering state, but must not be authoritative

---

## 5. Determinism & Authority

- Given the same `GameState` and `PlayerAction`, engine output must be deterministic.
- Randomness must be explicit and seedable.
- LLM output is **advisory** and must be validated before use.

---

## 6. Turn Model

The engine advances in discrete turns.

- `Engine.step(action)` advances **exactly one turn**
- `Engine.step` returns a structured result: `StepResult`
- No partial turns

---

## 7. Core Protocols (M1 must implement)

### 7.1 GameState (minimal, world-agnostic)

`GameState` MUST contain at least:

- `meta`
  - `version`: string
  - `seed`: number
  - `phase`: string (e.g. "story", "combat:auto", "combat:turn")
  - `turn`: number
- `time`
  - `day`: number
  - `slot`: string (e.g. "morning" | "afternoon" | "evening" | "night")
- `location`
  - `zone`: string
  - `place`: string
- `meters`: record of numeric meters (extensible by world)
- `tags`: string[] (status tags, buff/debuff tags)
- `inventory`: array of items (world-defined shape allowed via `any`/generic)
- `flags`: record<string, boolean|number|string>
- `log`: string[] (engine-owned history snippets)

Worldpacks may extend state with additional fields, but core relies only on this minimal set.

### 7.2 PlayerAction

`PlayerAction` MUST support the basic choice loop:

- `{ type: "choice", id: "A" | "B" | "C" }`

It may be extended later (e.g. free text, skill, item), but M1 uses A/B/C.

### 7.3 StepResult

`Engine.step(action)` returns:

- `state`: the updated authoritative `GameState`
- `narrative`: string (player-facing text for StoryStream)
- `choices`: array of `{ id, text }` (rendered as buttons)
- `applied`: list of applied effects/patches (for debug)
- `warnings`: list of validation or clamping warnings

---

## 8. Effects & Patches

### 8.1 Effect Model (preferred)

Core uses an Effect/Patch model for state mutation:

- Effects must be deterministic, serializable, and auditable.
- Effects are applied by engine code only.

Minimum Effect operations for early milestones:

- `inc` (increment numeric meter)
- `set` (set a field)
- `addTag` / `removeTag`
- `pushLog`
- `moveLocation`
- (optional) `spendMoney` as a specialized `inc`

### 8.2 Validation & Safety

- Clamp meters to their configured min/max (if defined by world or defaults)
- Reject or ignore writes to protected paths (readonly fields)
- Record warnings when clamping/rejecting happens

LLM must not be able to bypass these validations.

---

## 9. LLM Integration (later milestone)

### 9.1 LLM Role

LLM is a narrative assistant, not a game master.

Allowed:
- narrative text
- dialogue
- choice wording
- advisory "intent deltas" (suggested outcomes)

Forbidden:
- creating new state fields
- changing protected fields
- resolving randomness secretly

### 9.2 Minimal State Digest

When calling LLM, provide only a minimal `StateDigest`:

- phase/time/location
- meter stages (not full raw tables)
- relevant tags
- candidate events (ids only)
- short recent log summary

Full state remains local/authoritative.

---

## 10. Combat Modes (future, must be supported by design)

Combat is a phase/mode, not hardcoded gameplay.

- `combat:off` – no combat state machine
- `combat:auto` – one-step resolution
- `combat:turn` – turn-based combat loop

Worldpacks and systems decide when/how to enter combat.

---

## 11. AI Coding Rules (mandatory)

When using AI to generate code:

- Follow folder boundaries strictly
- Do not couple UI with engine logic
- No global mutable state
- Prefer explicit over clever abstractions
- If uncertain, implement the simplest working version

---
