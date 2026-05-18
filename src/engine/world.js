import Matter from "matter-js";

const { Engine, Runner, World, Events } = Matter;

let engine = null;
let runner = null;

// Lazy import to avoid circular dependency
let _attachForceTicker = null;
let _detachForceTicker = null;
async function loadForces() {
  if (!_attachForceTicker) {
    const mod = await import("./forces.js");
    _attachForceTicker = mod.attachForceTicker;
    _detachForceTicker = mod.detachForceTicker;
  }
}

/**
 * Initialize the Matter.js physics engine and runner.
 */
export function initEngine() {
  engine = Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 },
    positionIterations: 10,
    velocityIterations: 8,
    constraintIterations: 4,
  });

  runner = Runner.create({ delta: 1000 / 60 });
  Runner.run(runner, engine);

  // Attach force ticker after engine is ready
  loadForces().then(() => _attachForceTicker?.());

  return { engine, runner };
}

export function getEngine() {
  return engine;
}

export function getRunner() {
  return runner;
}

export function getWorld() {
  return engine?.world ?? null;
}

export function setGravity(x, y) {
  if (!engine) return;
  engine.gravity.x = x;
  engine.gravity.y = y;
}

export function setTimeScale(scale) {
  if (!engine) return;
  engine.timing.timeScale = Math.max(0, Math.min(scale, 4));
}

export function pauseEngine() {
  if (runner) Runner.stop(runner);
}

export function resumeEngine() {
  if (runner && engine) Runner.run(runner, engine);
}

export function stepEngine(delta = 1000 / 60) {
  if (!engine) return;
  Engine.update(engine, delta);
}

export function clearWorld() {
  if (!engine) return;
  World.clear(engine.world);
  Engine.clear(engine);
}

export function onAfterUpdate(callback) {
  if (!engine) return () => {};
  Events.on(engine, "afterUpdate", callback);
  return () => Events.off(engine, "afterUpdate", callback);
}

export function destroyEngine() {
  if (runner) Runner.stop(runner);
  if (engine) {
    World.clear(engine.world);
    Engine.clear(engine);
  }
  engine = null;
  runner = null;
}
