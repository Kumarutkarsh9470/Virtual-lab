import React, { useState, useCallback, useEffect, useRef } from "react";
import PhysicsCanvas from "./ui/PhysicsCanvas";
import Toolbar from "./ui/Toolbar";
import PropertyPanel from "./ui/PropertyPanel";
import ScenarioPanel from "./ui/ScenarioPanel";
import { addBody, removeBodyById, getBodyById } from "./engine/bodies";
import { addConstraint } from "./engine/constraints";
import {
  clearWorld,
  setGravity,
  setTimeScale,
  pauseEngine,
  resumeEngine,
  stepEngine,
} from "./engine/world";
import { addBoundaries } from "./engine/bodies";
import { loadScenario } from "./engine/scenarios";
import { Play, Pause, SkipForward, RotateCcw, Eye, EyeOff } from "lucide-react";

const BODY_DEFAULTS = {
  box: { width: 60, height: 60 },
  circle: { radius: 30 },
  polygon: { radius: 35, sides: 6 },
  static: { width: 200, height: 20, isStatic: true },
  wedge: { width: 120, height: 80 },
  incline: { width: 200, height: 16, angle: 25 },
};

const CONSTRAINT_TOOLS = new Set(["rope", "spring", "pivot", "motor"]);

export default function App() {
  const [activeTool, setActiveTool] = useState("select");
  const [selectedBody, setSelectedBody] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timeScale, setTimeScaleState] = useState(1);
  const [gravity, setGravityState] = useState({ x: 0, y: 1 });
  const [showScenarios, setShowScenarios] = useState(false);
  const [showForceArrows, setShowForceArrows] = useState(true);
  const overlaysRef = useRef({ showForceArrows: true, showFieldLines: false });

  const [constraintState, setConstraintState] = useState(null);

  const [selectedBodyLive, setSelectedBodyLive] = useState(null);
  const selectedBodyIdRef = useRef(null);

  useEffect(() => {
    selectedBodyIdRef.current = selectedBody?.gameId ?? null;
    setSelectedBodyLive(selectedBody);
  }, [selectedBody]);

  useEffect(() => {
    const id = setInterval(() => {
      const gameId = selectedBodyIdRef.current;
      if (gameId) {
        const b = getBodyById(gameId);
        setSelectedBodyLive(b ? { ...b } : null);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    setConstraintState(null);
    if (!CONSTRAINT_TOOLS.has(tool)) return;
    setConstraintState({
      phase: "pickA",
      type: tool,
      fromBodyId: null,
      fromWorld: null,
    });
  }, []);

  const handleAddBody = useCallback((type, { x, y }) => {
    const defaults = BODY_DEFAULTS[type] ?? {};
    const body = addBody(type, { x, y, ...defaults });
    setSelectedBody(body);
    setActiveTool("select");
  }, []);

  const handleConstraintPoint = useCallback(
    (worldPos, bodyId) => {
      if (!constraintState) return;

      if (constraintState.phase === "pickA") {
        if (!bodyId) return;
        setConstraintState((prev) => ({
          ...prev,
          phase: "pickB",
          fromBodyId: bodyId,
          fromWorld: worldPos,
        }));
        return;
      }

      if (constraintState.phase === "pickB") {
        const { type, fromBodyId } = constraintState;
        if (type === "pivot" || type === "motor") {
          addConstraint(type, {
            bodyAId: fromBodyId,
            pointA: { x: 0, y: 0 },
            pointB: worldPos,
          });
        } else {
          if (!bodyId || bodyId === fromBodyId) {
            setConstraintState(null);
            setActiveTool("select");
            return;
          }
          addConstraint(type, {
            bodyAId: fromBodyId,
            bodyBId: bodyId,
            pointA: { x: 0, y: 0 },
            pointB: { x: 0, y: 0 },
          });
        }
        setConstraintState(null);
        setActiveTool("select");
      }
    },
    [constraintState],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedBodyIdRef.current) return;
    removeBodyById(selectedBodyIdRef.current);
    setSelectedBody(null);
  }, []);

  const handleClearAll = useCallback(() => {
    clearWorld();
    addBoundaries(3000, 2000);
    setSelectedBody(null);
  }, []);

  const handleLoadScenario = useCallback((id) => {
    const bodies = loadScenario(id);
    setSelectedBody(bodies?.[0] ?? null);
    setShowScenarios(false);
  }, []);

  const toggleForceArrows = useCallback(() => {
    setShowForceArrows((prev) => {
      const next = !prev;
      overlaysRef.current = { ...overlaysRef.current, showForceArrows: next };
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        document.activeElement.tagName !== "INPUT"
      ) {
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDeleteSelected]);

  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      if (p) resumeEngine();
      else pauseEngine();
      return !p;
    });
  }, []);

  const handleStep = useCallback(() => {
    stepEngine();
    setIsPaused(true);
  }, []);

  const handleReset = useCallback(() => {
    handleClearAll();
    setIsPaused(false);
    resumeEngine();
  }, [handleClearAll]);

  const handleTimeScale = useCallback((val) => {
    const n = parseFloat(val);
    setTimeScaleState(n);
    setTimeScale(n);
  }, []);

  const handleGravity = useCallback(
    (axis, val) => {
      const n = parseFloat(val);
      const next = { ...gravity, [axis]: n };
      setGravityState(next);
      setGravity(next.x, next.y);
    },
    [gravity],
  );

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] text-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-[#1e2130] border-b border-white/10 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base tracking-tight text-white">
            VIRTUAL<span className="text-indigo-400">-LAB</span>
          </span>
          <span className="text-[10px] text-white/25 bg-white/8 px-2 py-0.5 rounded-full">
            Phase 1 — Solo Canvas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-white/50">
            Speed
            <select
              value={timeScale}
              onChange={(e) => handleTimeScale(e.target.value)}
              className="bg-white/8 border border-white/10 rounded px-1.5 py-0.5 text-white/70 text-xs"
            >
              {[0.1, 0.25, 0.5, 1, 2, 4].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-white/50">
            Gravity Y
            <input
              type="number"
              step="0.1"
              min="-5"
              max="5"
              value={gravity.y}
              onChange={(e) => handleGravity("y", e.target.value)}
              className="w-14 bg-white/8 border border-white/10 rounded px-1.5 py-0.5 text-white/70 text-xs text-right"
            />
          </label>

          <div className="h-5 w-px bg-white/15" />

          <button
            onClick={togglePause}
            title={isPaused ? "Resume" : "Pause"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
          >
            {isPaused ? (
              <>
                <Play size={13} />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause size={13} />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            onClick={handleStep}
            title="Step one frame"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 text-xs transition-colors"
          >
            <SkipForward size={13} />
          </button>

          <button
            onClick={handleReset}
            title="Reset world"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 text-xs transition-colors"
          >
            <RotateCcw size={13} />
          </button>

          <div className="h-5 w-px bg-white/15" />

          <button
            onClick={toggleForceArrows}
            title={showForceArrows ? "Hide force arrows" : "Show force arrows"}
            className={[
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
              showForceArrows
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/8 text-white/40",
            ].join(" ")}
          >
            {showForceArrows ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Forces</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onDeleteSelected={handleDeleteSelected}
          onClearAll={handleClearAll}
          onOpenScenarios={() => setShowScenarios(true)}
          hasSelection={!!selectedBody}
        />

        <div className="flex-1 relative overflow-hidden">
          <PhysicsCanvas
            activeTool={activeTool}
            onAddBody={handleAddBody}
            onBodySelect={setSelectedBody}
            selectedBodyId={selectedBodyIdRef.current}
            constraintState={constraintState}
            onConstraintPoint={handleConstraintPoint}
            getOverlays={() => overlaysRef.current}
          />

          {constraintState && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2
              bg-[#1e2130]/90 backdrop-blur text-white/70 text-xs px-3 py-1.5
              rounded-full border border-white/10 pointer-events-none"
            >
              {constraintState.phase === "pickA"
                ? `Click first body for ${constraintState.type}`
                : `Click second body (or world point for pivot/motor)`}
            </div>
          )}

          <div
            className="absolute top-3 left-3
            bg-[#1e2130]/80 backdrop-blur text-white/50 text-[10px] px-2 py-1
            rounded border border-white/8 pointer-events-none capitalize"
          >
            {activeTool}
          </div>
        </div>

        {selectedBodyLive && (
          <PropertyPanel
            body={selectedBodyLive}
            onClose={() => setSelectedBody(null)}
            onDelete={(id) => {
              removeBodyById(id);
              setSelectedBody(null);
            }}
          />
        )}
      </div>

      {showScenarios && (
        <ScenarioPanel
          onLoad={handleLoadScenario}
          onClose={() => setShowScenarios(false)}
        />
      )}
    </div>
  );
}
