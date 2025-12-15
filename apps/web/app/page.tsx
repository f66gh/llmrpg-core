"use client";

import { useMemo, useRef, useState } from "react";
import type { EventDef, GameState, StepResult } from "@llmrpg/core";
import { Engine } from "@llmrpg/core";
import { LocalStorageSaveSystem } from "../../../packages/core/src/storage/LocalStorageSaveSystem";
import { createAppPluginManager, getUiPlugins } from "../src/plugins";
import { loadWorld } from "../src/worlds";
import { rewriteNarrative } from "../src/lib/narration";

const { world, events, hooks } = loadWorld("sandbox");
const initialState = world.initialState as GameState;
const eventList = events as EventDef[];
const uiPluginsFromWorld = loadWorld("sandbox").uiPlugins ?? [];

type UiMove = { id: string; text: string; hint?: string };
type UiStepResult = StepResult & {
  nextMoves?: UiMove[];
  moveSource?: "static" | "llm" | "mixed";
  storyText?: string;
  rawEventNarrative?: string;
};

const DEFAULT_CHOICES: UiStepResult["choices"] = [
  { id: "A", text: "Choice A" },
  { id: "B", text: "Choice B" },
  { id: "C", text: "Choice C" },
  { id: "D", text: "Choice D" }
];

const SEED_STEP: UiStepResult = {
  state: initialState,
  narrative: "Booted.",
  storyText: "Booted.",
  choices: DEFAULT_CHOICES,
  applied: [],
  warnings: []
};

const ActionButtons = ({
  started,
  loading,
  choices,
  nextMoves,
  onChoose,
  onMove
}: {
  started: boolean;
  loading: boolean;
  choices: UiStepResult["choices"];
  nextMoves?: UiMove[];
  onChoose: (id: UiStepResult["choices"][number]["id"]) => Promise<void>;
  onMove: (id: string, text?: string) => Promise<void>;
}) => {
  if (!started) {
    return <button onClick={() => onChoose("A")}>Start</button>;
  }

  if (choices && choices.length > 0) {
    return (
      <>
        {choices.map((choice) => (
          <button key={choice.id} onClick={() => onChoose(choice.id)} disabled={loading}>
            {choice.text}
          </button>
        ))}
      </>
    );
  }

  return (
    <>
      {(nextMoves ?? []).map((move) => (
        <button key={move.id} onClick={() => onMove(move.id, move.text)} disabled={loading}>
          {move.text}
        </button>
      ))}
    </>
  );
};

const StoryPanel = ({
  storyText,
  warnings
}: {
  storyText: string;
  warnings: string[];
}) => (
  <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
    <div style={{ lineHeight: 1.5, marginBottom: 12 }}>{storyText}</div>
    {warnings.length > 0 && (
      <div style={{ color: "#d97757" }}>
        <div style={{ fontWeight: 600 }}>Warnings:</div>
        {warnings.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
    )}
  </div>
);

export default function Page() {
  const engineRef = useRef<Engine>(
    Engine.createFromWorld(initialState, eventList, {
      beforeStepHooks: hooks?.beforeStep,
      afterStepHooks: hooks?.afterStep
    })
  );
  const saveSystemRef = useRef(new LocalStorageSaveSystem("llmrpg"));
  const pluginManagerRef = useRef(createAppPluginManager());

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [stepResult, setStepResult] = useState<UiStepResult>(SEED_STEP);
  const [started, setStarted] = useState(false);
  const [llmMode, setLlmMode] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [freeText, setFreeText] = useState("");

  const onChoose = async (id: UiStepResult["choices"][number]["id"]) => {
    setStarted(true);
    const res = engineRef.current.step({ type: "choice", id } as any);
    const pluginState = pluginManagerRef.current?.applyPlugins(res.state) ?? res.state;
    setGameState(pluginState);
    setStepResult({ ...(res as UiStepResult), state: pluginState, storyText: res.narrative, rawEventNarrative: res.narrative });
    setWarnings(res.warnings ?? []);

    if (llmMode) {
      await rewriteNarrative({
        choiceId: id,
        state: pluginState,
        step: res,
        setStepResult,
        setLoading,
        worldId: world.id ?? "sandbox"
      });
    }
  };

  const onMove = async (id: string, text?: string) => {
    setStarted(true);
    const res = engineRef.current.step({ type: "move", id, text } as any);
    const pluginState = pluginManagerRef.current?.applyPlugins(res.state) ?? res.state;
    setGameState(pluginState);
    setStepResult({ ...(res as UiStepResult), state: pluginState, storyText: res.narrative, rawEventNarrative: res.narrative });
    setWarnings(res.warnings ?? []);

    if (llmMode) {
      await rewriteNarrative({
        choiceId: "A",
        state: pluginState,
        step: res,
        setStepResult,
        setLoading,
        worldId: world.id ?? "sandbox"
      });
    }
  };

  const handleSave = async () => {
    try {
      await saveSystemRef.current.save({ id: "slot-1", state: gameState });
      setWarnings([]);
    } catch (err) {
      console.warn("Save failed", err);
      setWarnings(["save-failed"]);
    }
  };

  const handleLoad = async () => {
    try {
      const loaded = await saveSystemRef.current.load("slot-1");
      if (!loaded) {
        setWarnings(["no-save-found"]);
        return;
      }
      const pluginState = pluginManagerRef.current?.applyPlugins(loaded) ?? loaded;
      engineRef.current = Engine.createFromWorld(pluginState, eventList, {
        beforeStepHooks: hooks?.beforeStep,
        afterStepHooks: hooks?.afterStep
      });
      setGameState(pluginState);
      setStepResult({
        state: pluginState,
        narrative: "Loaded.",
        choices: (loaded as any).choices ?? DEFAULT_CHOICES,
        applied: [],
        warnings: []
      });
      setWarnings([]);
      setStarted(true);
    } catch (err) {
      console.warn("Load failed", err);
      setWarnings(["load-failed"]);
    }
  };

  const handleNewGame = () => {
    engineRef.current = Engine.createFromWorld(initialState, eventList, {
      beforeStepHooks: hooks?.beforeStep,
      afterStepHooks: hooks?.afterStep
    });
    const pluginState = pluginManagerRef.current?.applyPlugins(initialState) ?? initialState;
    setGameState(pluginState);
    setStepResult({ ...SEED_STEP, state: pluginState });
    setWarnings([]);
    setStarted(false);
  };

  const toggleMode = () => {
    setLlmMode((prev) => !prev);
  };

  const handleFreeAction = async () => {
    if (!freeText.trim()) return;
    // Do not change state; just use narration pipeline to render text
    const syntheticStep: UiStepResult = {
      ...stepResult,
      narrative: freeText,
      storyText: freeText,
      rawEventNarrative: freeText,
      warnings: [],
      debug: [...(stepResult.debug ?? []), "free-action"]
    };
    setStepResult(syntheticStep);
    if (llmMode) {
      await rewriteNarrative({
        choiceId: "A",
        state: gameState,
        step: syntheticStep,
        setStepResult,
        setLoading,
        worldId: world.id ?? "sandbox"
      });
    }
    setFreeText("");
  };

  const uiPlugins = useMemo(
    () => (uiPluginsFromWorld.length > 0 ? uiPluginsFromWorld : getUiPlugins()),
    [uiPluginsFromWorld]
  );

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, padding: 16, height: "100vh", boxSizing: "border-box" }}>
      <section style={{ border: "1px solid #333", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Story</h1>
          <button onClick={toggleMode} style={{ marginLeft: 8 }}>
            LLM Mode: {llmMode ? "On" : "Off"}
          </button>
        </div>

        <StoryPanel storyText={stepResult.storyText ?? stepResult.narrative} warnings={warnings} />

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={handleSave}>Save</button>
          <button onClick={handleLoad}>Load</button>
          <button onClick={handleNewGame}>New Game</button>
          <input
            style={{ flex: 1, minWidth: 160, padding: "4px 8px" }}
            placeholder="输入自定义动作/叙事..."
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
          />
          <button onClick={handleFreeAction} disabled={loading}>
            Submit
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", position: "sticky", bottom: 0, paddingTop: 8, background: "#fff" }}>
          <ActionButtons
            started={started}
            loading={loading}
            choices={stepResult.choices}
            nextMoves={stepResult.nextMoves}
            onChoose={onChoose}
            onMove={onMove}
          />
        </div>
      </section>

      <aside style={{ border: "1px solid #333", borderRadius: 12, padding: 12, overflowY: "auto", height: "100%" }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>HUD</h2>
        <div>turn: {String(gameState.meta.turn)}</div>
        <div>phase: {gameState.meta.phase}</div>
        <div>
          location: {gameState.location.zone} / {gameState.location.place}
        </div>
        <div>
          time: Day {gameState.time.day}, {gameState.time.slot}
        </div>
        {Object.keys(gameState.meters).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Meters</div>
            {Object.entries(gameState.meters).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </div>
        )}
        {uiPlugins.map((plugin) => (
          <div key={plugin.id}>{plugin.render(gameState, stepResult)}</div>
        ))}
      </aside>
    </main>
  );
}
