import Matter from "matter-js";
import { v4 as uuidv4 } from "uuid";
import { getWorld, getEngine } from "./world";
import { getBodyById } from "./bodies";

const { Constraint, World, Composite, Body, Events } = Matter;

const CONSTRAINT_DEFAULTS = {
  rope: {
    stiffness: 0.9,
    damping: 0.0,
    render: { strokeStyle: "#c0a060", lineWidth: 2, type: "line" },
  },
  spring: {
    stiffness: 0.02,
    damping: 0.1,
    render: { strokeStyle: "#60c0a0", lineWidth: 2, type: "spring" },
  },
  pivot: {
    stiffness: 1.0,
    damping: 0.0,
    length: 0,
    render: { strokeStyle: "#a060c0", lineWidth: 2, type: "pin" },
  },
  motor: {
    stiffness: 1.0,
    damping: 0.0,
    length: 0,
    render: { strokeStyle: "#f07040", lineWidth: 2, type: "pin" },
  },
};

// Motor interval registry
const motorIntervals = new Map();

/**
 * Add a constraint between two bodies (or a body and a fixed world point).
 */
export function addConstraint(type, options = {}) {
  const world = getWorld();
  if (!world) return null;

  const {
    bodyAId,
    bodyBId = null,
    pointA = { x: 0, y: 0 },
    pointB = { x: 0, y: 0 },
    length,
    stiffness,
    damping,
    angularSpeed = 0.05,
  } = options;

  const bodyA = getBodyById(bodyAId);
  if (!bodyA) return null;

  const defaults = CONSTRAINT_DEFAULTS[type] ?? CONSTRAINT_DEFAULTS.rope;

  // Compute natural length if not specified
  let naturalLength = length;
  if (naturalLength == null) {
    if (bodyBId) {
      const bodyB = getBodyById(bodyBId);
      if (bodyB) {
        const dx = bodyB.position.x - bodyA.position.x;
        const dy = bodyB.position.y - bodyA.position.y;
        naturalLength = Math.sqrt(dx * dx + dy * dy);
      }
    }
    if (naturalLength == null) naturalLength = 100;
  }

  const constraintOpts = {
    bodyA,
    pointA,
    pointB: bodyBId ? undefined : pointB,
    length: type === "pivot" || type === "motor" ? 0 : naturalLength,
    stiffness: Math.min(stiffness ?? defaults.stiffness, 0.95),
    damping: damping ?? defaults.damping,
    render: { ...defaults.render },
  };

  if (bodyBId) {
    const bodyB = getBodyById(bodyBId);
    if (bodyB) {
      constraintOpts.bodyB = bodyB;
      constraintOpts.pointB = pointB;
    }
  }

  const constraint = Constraint.create(constraintOpts);
  constraint.gameId = uuidv4();
  constraint.constraintType = type;

  World.add(world, constraint);

  // Motor: apply angular velocity on every tick
  if (type === "motor" && bodyA) {
    const intervalId = setInterval(() => {
      Body.setAngularVelocity(bodyA, angularSpeed);
    }, 1000 / 60);
    motorIntervals.set(constraint.gameId, intervalId);
    constraint.angularSpeed = angularSpeed;
  }

  return constraint;
}

/**
 * Remove a constraint by gameId.
 */
export function removeConstraintById(gameId) {
  const world = getWorld();
  if (!world) return false;

  const constraint = getConstraintById(gameId);
  if (!constraint) return false;

  World.remove(world, constraint);

  if (motorIntervals.has(gameId)) {
    clearInterval(motorIntervals.get(gameId));
    motorIntervals.delete(gameId);
  }

  return true;
}

/**
 * Find a constraint in the world by gameId.
 */
export function getConstraintById(gameId) {
  const world = getWorld();
  if (!world) return null;
  return (
    Composite.allConstraints(world).find((c) => c.gameId === gameId) ?? null
  );
}

/**
 * Get all constraints.
 */
export function getAllConstraints() {
  const world = getWorld();
  if (!world) return [];
  return Composite.allConstraints(world);
}

/**
 * Update constraint parameters.
 */
export function updateConstraint(
  gameId,
  { stiffness, damping, length, angularSpeed },
) {
  const constraint = getConstraintById(gameId);
  if (!constraint) return;
  if (stiffness != null) constraint.stiffness = Math.min(stiffness, 0.95);
  if (damping != null) constraint.damping = damping;
  if (length != null) constraint.length = length;
  if (angularSpeed != null && constraint.constraintType === "motor") {
    constraint.angularSpeed = angularSpeed;
    const existing = motorIntervals.get(gameId);
    if (existing) clearInterval(existing);
    const newInterval = setInterval(() => {
      if (constraint.bodyA)
        Body.setAngularVelocity(constraint.bodyA, angularSpeed);
    }, 1000 / 60);
    motorIntervals.set(gameId, newInterval);
  }
}

/**
 * Clean up all motor intervals (call on world clear).
 */
export function clearAllMotors() {
  motorIntervals.forEach((id) => clearInterval(id));
  motorIntervals.clear();
}
