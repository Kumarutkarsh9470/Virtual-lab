import Matter from "matter-js";
import { v4 as uuidv4 } from "uuid";
import { getWorld } from "./world";

const { Bodies, Body, World, Composite } = Matter;

/** Default body colors by type */
const TYPE_COLORS = {
  box: "#4f8ef7",
  circle: "#f75f4f",
  polygon: "#4ff7a0",
  static: "#888fa8",
  wedge: "#3a4060",
  incline: "#3a4060",
};

/**
 * Create and add a physics body to the world.
 * @param {string} type - 'box' | 'circle' | 'polygon' | 'static'
 * @param {object} options
 */
export function addBody(type, options = {}) {
  const world = getWorld();
  if (!world) return null;

  const {
    x = 400,
    y = 300,
    width = 50,
    height = 50,
    radius = 30,
    sides = 5,
    mass = 1,
    friction = 0.3,
    restitution = 0.5,
    frictionAir = 0.01,
    isStatic = false,
    color,
    label = "",
    createdBy = "local",
    // Physics extras
    charge = null,
    magneticStrength = null,
    angle = null, // initial rotation in degrees (or radians if |val| < 2π heuristic)
  } = options;

  let body;
  const bodyColor = color ?? TYPE_COLORS[type] ?? "#ffffff";
  const isStaticBody = type === "static" || isStatic;

  switch (type) {
    case "circle":
      body = Bodies.circle(x, y, radius, {
        restitution,
        friction,
        frictionAir,
        isStatic: isStaticBody,
        render: { fillStyle: bodyColor },
      });
      body.bodyRadius = radius;
      break;

    case "polygon":
      body = Bodies.polygon(x, y, sides, radius, {
        restitution,
        friction,
        frictionAir,
        isStatic: isStaticBody,
        render: { fillStyle: bodyColor },
      });
      body.bodyRadius = radius;
      break;

    case "static":
      body = Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        friction,
        restitution,
        frictionAir: 0,
        render: { fillStyle: bodyColor },
      });
      break;

    case "wedge": {
      // Right-triangle wedge (trapezoid with slope=1 gives triangle shape)
      const wH = height || 100;
      body = Bodies.trapezoid(x, y, width || 200, wH, 1, {
        isStatic: isStatic,
        friction,
        restitution,
        frictionAir,
        render: { fillStyle: bodyColor },
      });
      body.bodyRadius = Math.max(width || 200, wH) / 2;
      break;
    }

    case "incline":
      body = Bodies.rectangle(x, y, width || 300, height || 18, {
        isStatic: true,
        friction,
        restitution,
        frictionAir: 0,
        render: { fillStyle: bodyColor },
      });
      break;

    case "box":
    default:
      body = Bodies.rectangle(x, y, width, height, {
        restitution,
        friction,
        frictionAir,
        isStatic: isStaticBody,
        render: { fillStyle: bodyColor },
      });
      break;
  }

  // Attach metadata
  body.gameId = uuidv4();
  body.bodyType = type;
  body.bodyColor = bodyColor;
  body.bodyLabel = label;
  body.createdBy = createdBy;
  body.lockedBy = null;
  if (charge != null) body.charge = charge;
  if (magneticStrength != null) body.magneticStrength = magneticStrength;

  if (mass !== 1) Body.setMass(body, mass);

  // Apply initial rotation
  if (angle != null) {
    // Accept degrees (> 2π in absolute) or radians
    const rad =
      Math.abs(angle) > Math.PI * 2 + 0.01 ? (angle * Math.PI) / 180 : angle;
    Body.setAngle(body, rad);
  }

  World.add(world, body);
  return body;
}

/**
 * Add boundaries (floor, ceiling, left, right walls).
 */
export function addBoundaries(width = 3000, height = 2000) {
  const world = getWorld();
  if (!world) return;

  const thickness = 60;
  const opts = { isStatic: true, friction: 0.5, restitution: 0.3 };

  const boundaries = [
    // floor
    Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, {
      ...opts,
      label: "floor",
      render: { fillStyle: "#2a2d3e" },
    }),
    // ceiling
    Bodies.rectangle(width / 2, -thickness / 2, width, thickness, {
      ...opts,
      label: "ceiling",
      render: { fillStyle: "#2a2d3e" },
    }),
    // left wall
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height, {
      ...opts,
      label: "wall-left",
      render: { fillStyle: "#2a2d3e" },
    }),
    // right wall
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, {
      ...opts,
      label: "wall-right",
      render: { fillStyle: "#2a2d3e" },
    }),
  ];

  boundaries.forEach((b) => {
    b.gameId = uuidv4();
    b.bodyType = "boundary";
    b.bodyColor = "#2a2d3e";
  });

  World.add(world, boundaries);
  return boundaries;
}

/**
 * Remove a body from the world by its gameId.
 */
export function removeBodyById(gameId) {
  const world = getWorld();
  if (!world) return false;
  const body = getBodyById(gameId);
  if (!body) return false;
  World.remove(world, body);
  return true;
}

/**
 * Find a body in the world by gameId.
 */
export function getBodyById(gameId) {
  const world = getWorld();
  if (!world) return null;
  return Composite.allBodies(world).find((b) => b.gameId === gameId) ?? null;
}

/**
 * Get all non-boundary bodies.
 */
export function getAllBodies() {
  const world = getWorld();
  if (!world) return [];
  return Composite.allBodies(world).filter((b) => b.bodyType !== "boundary");
}

/**
 * Update a body's material properties by gameId.
 */
export function updateBodyMaterial(
  gameId,
  { mass, friction, restitution, frictionAir },
) {
  const body = getBodyById(gameId);
  if (!body) return;
  if (mass != null) Body.setMass(body, Math.max(0.01, mass));
  if (friction != null) body.friction = Math.max(0, friction);
  if (restitution != null)
    body.restitution = Math.max(0, Math.min(1, restitution));
  if (frictionAir != null) body.frictionAir = Math.max(0, frictionAir);
}

/**
 * Update a body's color by gameId.
 */
export function updateBodyColor(gameId, color) {
  const body = getBodyById(gameId);
  if (!body) return;
  body.bodyColor = color;
  body.render.fillStyle = color;
}
