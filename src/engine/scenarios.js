/**
 * scenarios.js — Pre-built +2 level physics scenarios
 * Each builder clears the world and sets up bodies/constraints.
 */
import Matter from "matter-js";
import { v4 as uuidv4 } from "uuid";
import { addBody, addBoundaries } from "./bodies";
import { addConstraint, clearAllMotors } from "./constraints";
import { clearWorld, getWorld } from "./world";
import {
  registerAtwoodConstraint,
  clearAllSpecialConstraints,
  addVisualConnection,
} from "./forces";

const { Body, Bodies, World, Body: MBody } = Matter;

// ─── Scenario metadata (for UI) ───────────────────────────────────────────────

export const SCENARIOS = [
  {
    id: "atwood",
    label: "Atwood Machine",
    category: "Mechanics",
    description:
      "Two masses over a fixed pulley. Heavier mass falls, lighter rises. a = (m₂−m₁)g / (m₁+m₂)",
    icon: "⚖️",
  },
  {
    id: "monkey_rope",
    label: "Monkey on Rope",
    category: "Mechanics",
    description:
      "Mass hanging from fixed ceiling. Tension in rope = weight (mg). Classic tension problem.",
    icon: "🐒",
  },
  {
    id: "double_pulley",
    label: "Movable Pulley (MA = 2)",
    category: "Mechanics",
    description:
      "Movable pulley system. Mechanical advantage = 2: half the force lifts the load.",
    icon: "🔧",
  },
  {
    id: "inclined_friction",
    label: "Inclined Plane + Friction",
    category: "Mechanics",
    description:
      "Block on a 30° incline. Observe sliding vs static friction, normal force, and acceleration.",
    icon: "📐",
  },
  {
    id: "wedge_block",
    label: "Wedge & Block",
    category: "Mechanics",
    description:
      "Block on smooth movable wedge on frictionless floor. Both slide — wedge constraint problem.",
    icon: "🔺",
  },
  {
    id: "spring_shm",
    label: "Spring-Mass (SHM)",
    category: "Mechanics",
    description:
      "Mass oscillating on a spring. Demonstrates Simple Harmonic Motion. T = 2π√(m/k)",
    icon: "🌀",
  },
  {
    id: "coulomb_repulsion",
    label: "Coulomb Repulsion (+/+)",
    category: "Electrostatics",
    description:
      "Two positive charges repelling via Coulomb's law: F = kq₁q₂/r². Like charges repel.",
    icon: "⚡",
  },
  {
    id: "coulomb_attraction",
    label: "Coulomb Attraction (+/−)",
    category: "Electrostatics",
    description:
      "Opposite charges attracting each other. F = kq₁q₂/r², directed toward each other.",
    icon: "🔋",
  },
  {
    id: "bar_magnets",
    label: "Bar Magnets (N-S)",
    category: "Magnetism",
    description:
      "Two bar magnets with opposite poles facing. N-S poles attract, N-N/S-S poles repel.",
    icon: "🧲",
  },
  {
    id: "projectile",
    label: "Projectile Motion",
    category: "Kinematics",
    description:
      "Projectile launched at 45°. Demonstrates parabolic trajectory and range formula.",
    icon: "🎯",
  },
];

// ─── Reset helper ─────────────────────────────────────────────────────────────

function reset() {
  clearAllSpecialConstraints();
  clearAllMotors();
  clearWorld();
  addBoundaries(3000, 2000);
}

// ─── Builders ────────────────────────────────────────────────────────────────

function buildAtwood() {
  reset();

  // Fixed pulley (static circle)
  const pulleyX = 700;
  const pulleyY = 180;
  const pulley = addBody("circle", {
    x: pulleyX,
    y: pulleyY,
    radius: 22,
    isStatic: true,
    color: "#888fa8",
    label: "Pulley",
  });

  // Masses
  const m1 = addBody("box", {
    x: pulleyX - 55,
    y: 390,
    width: 48,
    height: 48,
    mass: 1,
    color: "#4f8ef7",
    label: "m₁=1 kg",
  });

  const m2 = addBody("box", {
    x: pulleyX + 55,
    y: 390,
    width: 48,
    height: 48,
    mass: 3,
    color: "#f75f4f",
    label: "m₂=3 kg",
  });

  // Physics: inextensible rope over pulley (custom Atwood constraint)
  registerAtwoodConstraint(m1, m2, pulleyX, pulleyY);

  // Visual ropes (drawn each frame, no physics)
  addVisualConnection(
    () => m1.position,
    { x: pulleyX, y: pulleyY },
    "#c0a060",
    "T",
  );
  addVisualConnection(
    () => m2.position,
    { x: pulleyX, y: pulleyY },
    "#c0a060",
    "T",
  );

  return [m1, m2];
}

function buildMonkeyRope() {
  reset();

  // Ceiling anchor (top-center of world)
  const anchorX = 700;
  const anchorY = 100;

  // The "monkey" (hanging mass)
  const monkey = addBody("circle", {
    x: anchorX,
    y: 350,
    radius: 28,
    mass: 5,
    color: "#f7a04f",
    label: "Monkey (5 kg)",
  });

  // Rope constraint to ceiling
  addConstraint("rope", {
    bodyAId: monkey.gameId,
    pointA: { x: 0, y: 0 },
    pointB: { x: anchorX, y: anchorY },
    length: 250,
  });

  // Visual anchor dot + label via visual connection
  addVisualConnection(
    () => monkey.position,
    { x: anchorX, y: anchorY },
    "#c0a060",
    "T=mg",
  );

  return [monkey];
}

function buildDoublePulley() {
  reset();

  const ceilY = 100;

  // Fixed pulley at ceiling
  const fixedPulley = addBody("circle", {
    x: 700,
    y: ceilY + 30,
    radius: 20,
    isStatic: true,
    color: "#888fa8",
    label: "Fixed",
  });

  // Movable pulley (attached to load)
  const movablePulley = addBody("circle", {
    x: 700,
    y: 350,
    radius: 20,
    mass: 0.5,
    color: "#60a8f7",
    label: "Movable",
  });

  // Heavy load attached to movable pulley
  const load = addBody("box", {
    x: 700,
    y: 420,
    width: 60,
    height: 60,
    mass: 4,
    color: "#f75f4f",
    label: "Load 4 kg",
  });

  // Effort (small mass representing applied force)
  const effort = addBody("box", {
    x: 780,
    y: 280,
    width: 38,
    height: 38,
    mass: 1,
    color: "#4ff7a0",
    label: "Effort 1 kg",
  });

  // String: fixed pulley → movable pulley
  addConstraint("rope", {
    bodyAId: fixedPulley.gameId,
    bodyBId: movablePulley.gameId,
    pointA: { x: 0, y: 0 },
    pointB: { x: 0, y: 0 },
    length: 220,
  });

  // String: movable pulley → effort (goes over fixed pulley conceptually)
  addConstraint("rope", {
    bodyAId: movablePulley.gameId,
    bodyBId: effort.gameId,
    pointA: { x: 0, y: 0 },
    pointB: { x: 0, y: 0 },
    length: 220,
  });

  // Load hangs from movable pulley
  addConstraint("rope", {
    bodyAId: movablePulley.gameId,
    bodyBId: load.gameId,
    pointA: { x: 0, y: 0 },
    pointB: { x: 0, y: 0 },
    length: 72,
  });

  return [load, effort, movablePulley];
}

function buildInclinedFriction() {
  reset();

  // Inclined plane (static rectangle, rotated 30°)
  const incline = addBody("incline", {
    x: 700,
    y: 520,
    width: 380,
    height: 18,
    angle: -30,
    friction: 0.35,
    restitution: 0.1,
    color: "#3a4060",
    label: "30°",
  });

  // Block on incline
  const block = addBody("box", {
    x: 680,
    y: 430,
    width: 50,
    height: 50,
    mass: 2,
    friction: 0.35,
    restitution: 0.1,
    color: "#4f8ef7",
    label: "Block 2 kg",
  });

  // Second block (no friction, frictionless comparison)
  const block2 = addBody("box", {
    x: 760,
    y: 400,
    width: 40,
    height: 40,
    mass: 1,
    friction: 0.0,
    restitution: 0.05,
    color: "#f7c44f",
    label: "μ=0 (1 kg)",
  });

  return [block, block2, incline];
}

function buildWedgeBlock() {
  reset();

  // Frictionless floor (already added by addBoundaries)
  // Wedge: dynamic trapezoid shape, initially at rest on floor
  const wedge = addBody("wedge", {
    x: 700,
    y: 545,
    width: 200,
    height: 120,
    angle: 0,
    friction: 0.0,
    restitution: 0.0,
    frictionAir: 0.005,
    color: "#3a4060",
    label: "Wedge (M)",
    mass: 4,
  });

  // Block on top of wedge slope
  const block = addBody("box", {
    x: 660,
    y: 445,
    width: 44,
    height: 44,
    mass: 1,
    friction: 0.0,
    restitution: 0.0,
    color: "#f75f4f",
    label: "Block (m)",
  });

  return [block, wedge];
}

function buildSpringShm() {
  reset();

  // Ceiling anchor
  const anchorX = 700;
  const anchorY = 120;

  // Mass
  const mass = addBody("circle", {
    x: anchorX,
    y: 370,
    radius: 28,
    mass: 2,
    color: "#c44ff7",
    label: "Mass (2 kg)",
    frictionAir: 0.01,
  });

  // Spring constraint (low stiffness = SHM)
  addConstraint("spring", {
    bodyAId: mass.gameId,
    pointA: { x: 0, y: 0 },
    pointB: { x: anchorX, y: anchorY },
    length: 200,
    stiffness: 0.02,
    damping: 0.005,
  });

  // Displace mass to start oscillation
  Body.setPosition(mass, { x: anchorX + 80, y: 330 });

  addVisualConnection(
    () => mass.position,
    { x: anchorX, y: anchorY },
    "#60c0a0",
    "k·x",
  );

  return [mass];
}

function buildCoulombRepulsion() {
  reset();

  const q1 = addBody("circle", {
    x: 580,
    y: 400,
    radius: 26,
    mass: 1,
    frictionAir: 0.02,
    color: "#f74f4f",
    label: "+3 μC",
    charge: 3,
  });

  const q2 = addBody("circle", {
    x: 820,
    y: 400,
    radius: 26,
    mass: 1,
    frictionAir: 0.02,
    color: "#f74f4f",
    label: "+3 μC",
    charge: 3,
  });

  return [q1, q2];
}

function buildCoulombAttraction() {
  reset();

  const q1 = addBody("circle", {
    x: 560,
    y: 400,
    radius: 26,
    mass: 1,
    frictionAir: 0.02,
    color: "#f74f4f",
    label: "+3 μC",
    charge: 3,
  });

  const q2 = addBody("circle", {
    x: 840,
    y: 400,
    radius: 26,
    mass: 1,
    frictionAir: 0.02,
    color: "#4f8ef7",
    label: "−3 μC",
    charge: -3,
  });

  return [q1, q2];
}

function buildBarMagnets() {
  reset();

  // Magnet A: N pole facing right (angle = 0)
  const magA = addBody("box", {
    x: 540,
    y: 400,
    width: 90,
    height: 36,
    mass: 1.5,
    frictionAir: 0.02,
    color: "#3a8af7",
    label: "Magnet A",
    magneticStrength: 4,
    angle: 0,
  });
  Body.setAngle(magA, 0);

  // Magnet B: S pole facing left (angle = π, so N faces right = away)
  // To make opposite poles face each other, angle = Math.PI (N faces away from A)
  const magB = addBody("box", {
    x: 860,
    y: 400,
    width: 90,
    height: 36,
    mass: 1.5,
    frictionAir: 0.02,
    color: "#3a8af7",
    label: "Magnet B",
    magneticStrength: 4,
    angle: Math.PI,
  });
  Body.setAngle(magB, Math.PI);

  return [magA, magB];
}

function buildProjectile() {
  reset();

  // Launch platform
  addBody("static", {
    x: 500,
    y: 590,
    width: 80,
    height: 20,
    isStatic: true,
    color: "#3a4060",
    label: "Launch",
  });

  // Projectile
  const proj = addBody("circle", {
    x: 500,
    y: 558,
    radius: 16,
    mass: 0.5,
    frictionAir: 0.0,
    friction: 0,
    restitution: 0.3,
    color: "#f7c44f",
    label: "Projectile",
  });

  // Launch at 45° upward
  const speed = 8;
  const angle = -45 * (Math.PI / 180); // negative y = upward
  Body.setVelocity(proj, {
    x: speed * Math.cos(angle),
    y: speed * Math.sin(angle),
  });

  return [proj];
}

// ─── Public builder map ───────────────────────────────────────────────────────

const BUILDERS = {
  atwood: buildAtwood,
  monkey_rope: buildMonkeyRope,
  double_pulley: buildDoublePulley,
  inclined_friction: buildInclinedFriction,
  wedge_block: buildWedgeBlock,
  spring_shm: buildSpringShm,
  coulomb_repulsion: buildCoulombRepulsion,
  coulomb_attraction: buildCoulombAttraction,
  bar_magnets: buildBarMagnets,
  projectile: buildProjectile,
};

/**
 * Load a scenario by id. Returns array of main bodies.
 */
export function loadScenario(id) {
  const builder = BUILDERS[id];
  if (!builder) return [];
  return builder();
}
