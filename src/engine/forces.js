/**
 * forces.js — Custom per-tick force application
 * Handles: Electrostatics, Magnetics, Atwood/Pulley constraints, Visual connections
 */
import Matter from "matter-js";
import { getEngine } from "./world";

const { Body, Events, Composite } = Matter;

// ─── Simulation constants ────────────────────────────────────────────────────
// Gravity in sim units ≈ 0.001 per tick (mass=1 body falls ~0.001 px/tick²)
// Scale electric/magnetic to be comparable
const K_ELECTRIC = 12; // Coulomb constant (sim units)
const K_MAGNETIC = 9; // Magnetic coupling constant
const MIN_DIST = 18; // Singularity guard (pixels)

// ─── Registries ──────────────────────────────────────────────────────────────
const atwoodConstraints = []; // { bodyA, bodyB, pulleyX, pulleyY, ropeLen }
const visualConnections = []; // { getA, worldB, color, label }

let attached = false;

// ─── Attach / Detach ─────────────────────────────────────────────────────────

export function attachForceTicker() {
  const engine = getEngine();
  if (!engine || attached) return;
  Events.on(engine, "beforeUpdate", forceTick);
  attached = true;
}

export function detachForceTicker() {
  const engine = getEngine();
  if (!engine) return;
  Events.off(engine, "beforeUpdate", forceTick);
  attached = false;
}

// ─── Atwood / Pulley Constraints ─────────────────────────────────────────────

/**
 * Register an inextensible-rope-over-pulley constraint.
 * Physics: enforces vy_A + vy_B ≈ 0 (one goes up, other goes down equally).
 * Total rope length = dist(A, pulley) + dist(B, pulley) = constant.
 */
export function registerAtwoodConstraint(bodyA, bodyB, pulleyX, pulleyY) {
  const lenA = Math.hypot(
    bodyA.position.x - pulleyX,
    bodyA.position.y - pulleyY,
  );
  const lenB = Math.hypot(
    bodyB.position.x - pulleyX,
    bodyB.position.y - pulleyY,
  );
  atwoodConstraints.push({
    bodyA,
    bodyB,
    pulleyX,
    pulleyY,
    ropeLen: lenA + lenB,
  });
}

export function clearAtwoodConstraints() {
  atwoodConstraints.length = 0;
}

// ─── Visual Connections (ropes/lines drawn without physics) ──────────────────

/**
 * Add a visual rope segment drawn each frame.
 * @param {Function} getA - returns current {x,y} of end A (can be from a body)
 * @param {{x,y}} worldB  - fixed world point for end B
 * @param {string} color
 * @param {string} label
 */
export function addVisualConnection(
  getA,
  worldB,
  color = "#c0a060",
  label = "",
) {
  visualConnections.push({ getA, worldB, color, label });
}

export function getVisualConnections() {
  return visualConnections;
}

export function clearVisualConnections() {
  visualConnections.length = 0;
}

export function clearAllSpecialConstraints() {
  atwoodConstraints.length = 0;
  visualConnections.length = 0;
}

// ─── Main tick ────────────────────────────────────────────────────────────────

function forceTick() {
  const engine = getEngine();
  if (!engine) return;

  const bodies = Composite.allBodies(engine.world).filter(
    (b) => !b.isStatic && b.bodyType !== "boundary",
  );

  applyElectrostatics(bodies);
  applyMagnetics(bodies);
  enforceAtwoodConstraints();
}

// ─── Electrostatics ───────────────────────────────────────────────────────────

function applyElectrostatics(bodies) {
  const charged = bodies.filter((b) => b.charge != null && b.charge !== 0);
  for (let i = 0; i < charged.length; i++) {
    for (let j = i + 1; j < charged.length; j++) {
      const a = charged[i];
      const b = charged[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dist = Math.max(Math.hypot(dx, dy), MIN_DIST);

      // F = K * q1 * q2 / r²  (+ve = repulsion, -ve = attraction)
      const F = (K_ELECTRIC * a.charge * b.charge) / (dist * dist);
      const fx = (dx / dist) * F;
      const fy = (dy / dist) * F;

      // Force on a: away from b if repulsive (same sign = positive F)
      Body.applyForce(a, a.position, { x: -fx, y: -fy });
      Body.applyForce(b, b.position, { x: fx, y: fy });
    }
  }
}

// ─── Magnetics (dipole model) ─────────────────────────────────────────────────

function applyMagnetics(bodies) {
  const magnets = bodies.filter(
    (b) => b.magneticStrength != null && b.magneticStrength !== 0,
  );
  for (let i = 0; i < magnets.length; i++) {
    for (let j = i + 1; j < magnets.length; j++) {
      const a = magnets[i];
      const b = magnets[j];

      const polesA = getMagneticPoles(a);
      const polesB = getMagneticPoles(b);

      let totalFxOnA = 0;
      let totalFyOnA = 0;

      // Dipole-dipole interaction: each pole pair contributes
      for (const pA of polesA) {
        for (const pB of polesB) {
          const dx = pB.x - pA.x;
          const dy = pB.y - pA.y;
          const dist = Math.max(Math.hypot(dx, dy), MIN_DIST);

          // Like poles (same polarity sign) → repel, unlike → attract
          const polarity = pA.polarity * pB.polarity;
          const F =
            (K_MAGNETIC *
              Math.abs(a.magneticStrength) *
              Math.abs(b.magneticStrength) *
              polarity) /
            (dist * dist);

          totalFxOnA += (dx / dist) * F;
          totalFyOnA += (dy / dist) * F;
        }
      }

      Body.applyForce(a, a.position, { x: -totalFxOnA, y: -totalFyOnA });
      Body.applyForce(b, b.position, { x: totalFxOnA, y: totalFyOnA });
    }
  }
}

/**
 * Returns [{x, y, polarity: +1|-1}] for the two poles of a magnet body.
 * The body's angle determines which end is North (+1) and which is South (-1).
 */
export function getMagneticPoles(body) {
  const halfLen = Math.max(body.bodyRadius ?? body.circleRadius ?? 28, 16);
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  const s = Math.sign(body.magneticStrength ?? 1);
  return [
    {
      x: body.position.x + cos * halfLen,
      y: body.position.y + sin * halfLen,
      polarity: s,
    }, // N
    {
      x: body.position.x - cos * halfLen,
      y: body.position.y - sin * halfLen,
      polarity: -s,
    }, // S
  ];
}

// ─── Atwood constraint enforcement ───────────────────────────────────────────

function enforceAtwoodConstraints() {
  for (const pc of atwoodConstraints) {
    const { bodyA, bodyB, pulleyX, pulleyY, ropeLen } = pc;
    if (!bodyA || !bodyB) continue;

    const dxA = bodyA.position.x - pulleyX;
    const dyA = bodyA.position.y - pulleyY;
    const lenA = Math.max(Math.hypot(dxA, dyA), 1);

    const dxB = bodyB.position.x - pulleyX;
    const dyB = bodyB.position.y - pulleyY;
    const lenB = Math.max(Math.hypot(dxB, dyB), 1);

    // ── Position correction (Baumgarte stabilization) ──
    const posError = lenA + lenB - ropeLen;

    if (Math.abs(posError) > 0.3) {
      const beta = 0.06;
      const corrA = posError * beta * 0.5;
      const corrB = posError * beta * 0.5;

      if (!bodyA.isStatic) {
        Body.setPosition(bodyA, {
          x: bodyA.position.x - (dxA / lenA) * corrA,
          y: bodyA.position.y - (dyA / lenA) * corrA,
        });
      }
      if (!bodyB.isStatic) {
        Body.setPosition(bodyB, {
          x: bodyB.position.x - (dxB / lenB) * corrB,
          y: bodyB.position.y - (dyB / lenB) * corrB,
        });
      }
    }

    // ── Velocity coupling: vy_A + vy_B ≈ 0 ──
    // Constraint: d(lenA)/dt + d(lenB)/dt = 0
    // d(lenA)/dt ≈ (dxA*vxA + dyA*vyA) / lenA  (radial velocity of A)
    // Same for B. Sum must = 0.
    const radVelA = (dxA * bodyA.velocity.x + dyA * bodyA.velocity.y) / lenA;
    const radVelB = (dxB * bodyB.velocity.x + dyB * bodyB.velocity.y) / lenB;
    const velError = radVelA + radVelB;

    if (Math.abs(velError) > 0.01) {
      const alpha = 0.45;
      const corr = velError * alpha;

      if (!bodyA.isStatic) {
        Body.setVelocity(bodyA, {
          x: bodyA.velocity.x - (dxA / lenA) * corr * 0.5,
          y: bodyA.velocity.y - (dyA / lenA) * corr * 0.5,
        });
      }
      if (!bodyB.isStatic) {
        Body.setVelocity(bodyB, {
          x: bodyB.velocity.x - (dxB / lenB) * corr * 0.5,
          y: bodyB.velocity.y - (dyB / lenB) * corr * 0.5,
        });
      }
    }
  }
}
