import React, { useRef, useEffect, useCallback } from "react";
import Matter from "matter-js";
import { initEngine, getWorld, destroyEngine } from "../engine/world";
import { addBoundaries, getAllBodies, getBodyById } from "../engine/bodies";
import { startRenderLoop, stopRenderLoop } from "../renderer/loop";
import {
  resetCamera,
  screenToWorld,
  worldToScreen,
  pan,
  zoomAt,
} from "../renderer/camera";

const { Events, Mouse, MouseConstraint, World, Composite } = Matter;

/**
 * PhysicsCanvas
 * Mounts the Matter.js engine into a <canvas> via useRef.
 * All physics + rendering is isolated from React's render cycle.
 *
 * Props:
 *  activeTool        string  - current toolbar selection
 *  addBodyOptions    object  - options forwarded to addBody()
 *  onBodySelect      fn(body | null)
 *  selectedBodyId    string | null
 *  constraintState   object  - { phase, fromBodyId, type } from constraint tool
 *  onConstraintPoint fn(worldPos, bodyId)
 */
export default function PhysicsCanvas({
  activeTool,
  addBodyOptions,
  onBodySelect,
  selectedBodyId,
  constraintState,
  onConstraintPoint,
  onAddBody,
  getOverlays,
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const mouseRef = useRef(null);
  const mouseConstraintRef = useRef(null);
  const isDraggingCanvasRef = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const constraintPreviewRef = useRef(null);

  // ─── Engine init & cleanup ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { engine } = initEngine();
    engineRef.current = engine;

    // Resize canvas to its CSS size
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Camera: start centered on (400,300) world
    resetCamera(canvas.width, canvas.height);

    // World boundaries
    addBoundaries(3000, 2000);

    // Mouse constraint for drag-to-move bodies
    const mouse = Mouse.create(canvas);
    mouseRef.current = mouse;

    const mc = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        damping: 0.1,
        render: { visible: false },
      },
    });
    mouseConstraintRef.current = mc;
    World.add(engine.world, mc);

    // Start custom render loop
    startRenderLoop(
      canvas,
      () => engine.world,
      () => selectedBodyId,
      () => constraintPreviewRef.current,
      getOverlays,
    );

    return () => {
      stopRenderLoop();
      observer.disconnect();
      destroyEngine();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Keep selectedBodyId accessible without re-mounting ───────────────────
  const selectedBodyIdRef = useRef(selectedBodyId);
  useEffect(() => {
    selectedBodyIdRef.current = selectedBodyId;
  }, [selectedBodyId]);

  // ─── Canvas interactions ───────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);

      // Middle button or Space+drag = pan
      if (e.button === 1 || activeTool === "pan") {
        isDraggingCanvasRef.current = true;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Place a body
      if (
        activeTool === "box" ||
        activeTool === "circle" ||
        activeTool === "polygon" ||
        activeTool === "static"
      ) {
        onAddBody?.(activeTool, { x: world.x, y: world.y });
        return;
      }

      // Constraint tool: pick attachment point
      if (
        activeTool === "rope" ||
        activeTool === "spring" ||
        activeTool === "pivot" ||
        activeTool === "motor"
      ) {
        const hitBody = getBodyAtScreen(sx, sy);
        onConstraintPoint?.(world, hitBody?.gameId ?? null);
        return;
      }

      // Select tool: pick body
      if (activeTool === "select" || activeTool === "drag") {
        const hitBody = getBodyAtScreen(sx, sy);
        onBodySelect?.(hitBody ?? null);
      }
    },
    [activeTool, onAddBody, onConstraintPoint, onBodySelect],
  );

  const handleMouseMove = useCallback(
    (e) => {
      // Pan
      if (isDraggingCanvasRef.current) {
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        pan(dx, dy);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Constraint placement preview
      if (constraintState?.phase === "pickB") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        constraintPreviewRef.current = {
          fromWorld: constraintState.fromWorld,
          toScreen: { x: e.clientX - rect.left, y: e.clientY - rect.top },
          type: constraintState.type,
        };
      } else {
        constraintPreviewRef.current = null;
      }
    },
    [constraintState],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingCanvasRef.current = false;
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    zoomAt(-e.deltaY, sx, sy);
  }, []);

  // Attach wheel with passive:false so we can preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Right-click = deselect
  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      onBodySelect?.(null);
    },
    [onBodySelect],
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ cursor: getCursor(activeTool) }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCursor(tool) {
  switch (tool) {
    case "pan":
      return "grab";
    case "select":
      return "default";
    case "drag":
      return "move";
    case "box":
    case "circle":
    case "polygon":
    case "static":
      return "crosshair";
    case "rope":
    case "spring":
    case "pivot":
    case "motor":
      return "cell";
    default:
      return "default";
  }
}

/**
 * Find the topmost non-boundary body under screen coordinates.
 */
function getBodyAtScreen(sx, sy) {
  const world = getWorld();
  if (!world) return null;

  const { x: wx, y: wy } = screenToWorld(sx, sy);
  const bodies = Composite.allBodies(world).filter(
    (b) => b.bodyType !== "boundary",
  );

  // Check in reverse (topmost first)
  for (let i = bodies.length - 1; i >= 0; i--) {
    if (Matter.Query.point([bodies[i]], { x: wx, y: wy }).length > 0) {
      return bodies[i];
    }
  }
  return null;
}
