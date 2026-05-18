import Matter from "matter-js";
import { worldToScreen, worldLengthToScreen, getCamera } from "./camera";
import { getMagneticPoles, getVisualConnections } from "../engine/forces";

const { Composite } = Matter;

let animFrameId = null;

// ─── Loop Control ─────────────────────────────────────────────────────────────

export function startRenderLoop(
  canvas,
  getWorldFn,
  getSelectedId,
  getConstraintPreview,
  getOverlays, // () => { showForceArrows, showFieldLines }
) {
  function loop() {
    const ctx = canvas.getContext("2d");
    const world = getWorldFn();
    if (ctx && world) {
      draw(
        ctx,
        canvas.width,
        canvas.height,
        world,
        getSelectedId?.(),
        getConstraintPreview?.(),
        getOverlays?.() ?? {},
      );
    }
    animFrameId = requestAnimationFrame(loop);
  }
  animFrameId = requestAnimationFrame(loop);
}

export function stopRenderLoop() {
  if (animFrameId != null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

// ─── Main Draw ────────────────────────────────────────────────────────────────

function draw(
  ctx,
  width,
  height,
  world,
  selectedId,
  constraintPreview,
  overlays = {},
) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#0f1117";
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height);

  // Visual rope connections (Atwood ropes, spring-mass lines etc.)
  drawVisualConnections(ctx);

  // Constraints behind bodies
  const constraints = Composite.allConstraints(world);
  for (const c of constraints) drawConstraint(ctx, c);

  if (constraintPreview) drawConstraintPreview(ctx, constraintPreview);

  // Charge field lines (between opposite charges)
  if (overlays.showFieldLines) drawChargeFieldLines(ctx, world);

  // Bodies
  const bodies = Composite.allBodies(world);
  for (const body of bodies) {
    drawBody(ctx, body, body.gameId === selectedId);
  }

  // Charge aura & magnetic pole overlays (above bodies)
  for (const body of bodies) {
    if (body.charge != null && body.charge !== 0) drawChargeAura(ctx, body);
    if (body.magneticStrength != null && body.magneticStrength !== 0)
      drawMagneticPoles(ctx, body);
  }

  // Force arrows (on selected body)
  if (overlays.showForceArrows && selectedId) {
    const sel = bodies.find((b) => b.gameId === selectedId);
    if (sel) drawForceArrows(ctx, sel);
  }
}

// ─── Visual Connections ───────────────────────────────────────────────────────

function drawVisualConnections(ctx) {
  const connections = getVisualConnections();
  for (const conn of connections) {
    const posA = conn.getA?.();
    const worldB = conn.worldB;
    if (!posA || !worldB) continue;

    const sA = worldToScreen(posA.x, posA.y);
    const sB = worldToScreen(worldB.x, worldB.y);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = conn.color ?? "#c0a060";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sA.x, sA.y);
    ctx.lineTo(sB.x, sB.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Anchor dot at world point
    ctx.beginPath();
    ctx.arc(sB.x, sB.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = conn.color ?? "#c0a060";
    ctx.fill();

    // Label near midpoint
    if (conn.label) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(conn.label, (sA.x + sB.x) / 2 + 12, (sA.y + sB.y) / 2);
    }
    ctx.restore();
  }
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function drawGrid(ctx, width, height) {
  const cam = getCamera();
  const baseSpacing = 50;
  const screenSpacing = worldLengthToScreen(baseSpacing);

  if (screenSpacing < 8) return;

  const startX = -((cam.x % baseSpacing) * cam.zoom);
  const startY = -((cam.y % baseSpacing) * cam.zoom);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let x = startX; x < width; x += screenSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = startY; y < height; y += screenSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Body ─────────────────────────────────────────────────────────────────────

function drawBody(ctx, body, isSelected) {
  const vertices = body.vertices;
  if (!vertices || vertices.length === 0) return;

  const screenVerts = vertices.map((v) => worldToScreen(v.x, v.y));

  ctx.save();

  // Shadow for depth
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;

  // Fill
  ctx.beginPath();
  ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
  for (let i = 1; i < screenVerts.length; i++) {
    ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
  }
  ctx.closePath();

  const color = body.bodyColor ?? body.render?.fillStyle ?? "#4f8ef7";
  ctx.fillStyle = body.isStatic ? adjustAlpha(color, 0.85) : color;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Stroke — selection highlight
  if (isSelected) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Selection glow
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (!body.isStatic) {
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Rotation indicator (small line from center)
  if (!body.isStatic) {
    const center = worldToScreen(body.position.x, body.position.y);
    const tipWorld = {
      x: body.position.x + Math.cos(body.angle) * 18,
      y: body.position.y + Math.sin(body.angle) * 18,
    };
    const tip = worldToScreen(tipWorld.x, tipWorld.y);
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Label
  if (body.bodyLabel) {
    const center = worldToScreen(body.position.x, body.position.y);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `${Math.max(10, worldLengthToScreen(12))}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(body.bodyLabel, center.x, center.y);
  }

  ctx.restore();
}

// ─── Constraint ───────────────────────────────────────────────────────────────

function drawConstraint(ctx, constraint) {
  const { bodyA, bodyB, pointA, pointB } = constraint;
  if (!bodyA && !bodyB) return;

  const worldA = bodyA
    ? {
        x: bodyA.position.x + (pointA?.x ?? 0),
        y: bodyA.position.y + (pointA?.y ?? 0),
      }
    : (pointA ?? { x: 0, y: 0 });

  const worldB = bodyB
    ? {
        x: bodyB.position.x + (pointB?.x ?? 0),
        y: bodyB.position.y + (pointB?.y ?? 0),
      }
    : (pointB ?? { x: 0, y: 0 });

  const sA = worldToScreen(worldA.x, worldA.y);
  const sB = worldToScreen(worldB.x, worldB.y);

  ctx.save();
  const type = constraint.constraintType ?? "rope";
  const color = constraint.render?.strokeStyle ?? "#c0a060";

  switch (type) {
    case "spring":
      drawSpring(ctx, sA, sB, color);
      break;
    case "pivot":
    case "motor":
      drawPivot(ctx, sA, color, type === "motor");
      break;
    default:
      drawRope(ctx, sA, sB, color);
  }

  ctx.restore();
}

function drawRope(ctx, sA, sB, color) {
  ctx.beginPath();
  ctx.moveTo(sA.x, sA.y);
  ctx.lineTo(sB.x, sB.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  drawAnchorDot(ctx, sA, color);
  drawAnchorDot(ctx, sB, color);
}

function drawSpring(ctx, sA, sB, color) {
  const dx = sB.x - sA.x;
  const dy = sB.y - sA.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const nx = dx / len;
  const ny = dy / len;
  const perp = { x: -ny, y: nx };
  const coils = 8;
  const amplitude = 6;

  ctx.beginPath();
  ctx.moveTo(sA.x, sA.y);

  for (let i = 0; i <= coils * 2; i++) {
    const t = i / (coils * 2);
    const along = t * len;
    const wave = (i % 2 === 0 ? 1 : -1) * amplitude;
    ctx.lineTo(
      sA.x + nx * along + perp.x * wave,
      sA.y + ny * along + perp.y * wave,
    );
  }

  ctx.lineTo(sB.x, sB.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawAnchorDot(ctx, sA, color);
  drawAnchorDot(ctx, sB, color);
}

function drawPivot(ctx, center, color, isMotor) {
  const r = 6;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
  ctx.fillStyle = isMotor ? "#f07040" : "#a060c0";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (isMotor) {
    // Motor arc arrow
    ctx.beginPath();
    ctx.arc(center.x, center.y, r + 5, -Math.PI * 0.75, Math.PI * 0.5);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawAnchorDot(ctx, point, color) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ─── Constraint Preview (placement) ──────────────────────────────────────────

function drawConstraintPreview(ctx, preview) {
  const { fromWorld, toScreen, type } = preview;
  if (!fromWorld || !toScreen) return;

  const sA = worldToScreen(fromWorld.x, fromWorld.y);

  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sA.x, sA.y);
  ctx.lineTo(toScreen.x, toScreen.y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawAnchorDot(ctx, sA, "#ffffff");
  ctx.restore();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adjustAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Charge Aura ──────────────────────────────────────────────────────────────

function drawChargeAura(ctx, body) {
  const pos = worldToScreen(body.position.x, body.position.y);
  const r = worldLengthToScreen(body.circleRadius ?? 28) + 12;
  const isPos = body.charge > 0;
  const color = isPos ? [255, 80, 80] : [80, 130, 255];

  ctx.save();
  const grd = ctx.createRadialGradient(
    pos.x,
    pos.y,
    r * 0.2,
    pos.x,
    pos.y,
    r * 1.6,
  );
  grd.addColorStop(0, `rgba(${color.join(",")},0.30)`);
  grd.addColorStop(0.5, `rgba(${color.join(",")},0.10)`);
  grd.addColorStop(1, `rgba(${color.join(",")},0.00)`);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Symbol
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = `rgba(${color.join(",")},0.90)`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isPos ? "+" : "−", pos.x, pos.y - r * 0.05);
  ctx.restore();
}

// ─── Charge Field Lines (optional overlay) ────────────────────────────────────

function drawChargeFieldLines(ctx, world) {
  const bodies = Composite.allBodies(world).filter(
    (b) => b.charge != null && b.charge !== 0,
  );
  if (bodies.length < 2) return;

  ctx.save();
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      if (a.charge * b.charge >= 0) continue; // only attract pairs
      const sA = worldToScreen(a.position.x, a.position.y);
      const sB = worldToScreen(b.position.x, b.position.y);
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(255,255,150,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sA.x, sA.y);
      ctx.lineTo(sB.x, sB.y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Magnetic Pole Overlay ────────────────────────────────────────────────────

function drawMagneticPoles(ctx, body) {
  const poles = getMagneticPoles(body);
  if (!poles) return;
  ctx.save();
  const POLE_COLORS = { N: ["255,60,60", "N"], S: ["60,100,255", "S"] };
  for (const pole of poles) {
    const sp = worldToScreen(pole.x, pole.y);
    const [rgb, label] = POLE_COLORS[pole.polarity === 1 ? "N" : "S"];
    const grd = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 14);
    grd.addColorStop(0, `rgba(${rgb},0.55)`);
    grd.addColorStop(1, `rgba(${rgb},0.00)`);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = `rgba(${rgb},0.90)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, sp.x, sp.y);
  }
  ctx.restore();
}

// ─── Force Arrows ─────────────────────────────────────────────────────────────

function drawForceArrows(ctx, body) {
  const pos = worldToScreen(body.position.x, body.position.y);
  const SCALE = 60;

  // Weight arrow (downward, blue)
  const weightMag = body.mass * 0.001 * SCALE; // gravity scale 0.001
  drawArrow(ctx, pos.x, pos.y, pos.x, pos.y + weightMag * 40, "#5599ff", "W");

  // Velocity arrow (green)
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > 0.5) {
    const sv = worldToScreen(
      body.position.x + vx * 3,
      body.position.y + vy * 3,
    );
    drawArrow(
      ctx,
      pos.x,
      pos.y,
      sv.x,
      sv.y,
      "#44dd88",
      `v=${speed.toFixed(1)}`,
    );
  }
}

function drawArrow(ctx, x1, y1, x2, y2, color, label) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 4) return;

  const headLen = Math.min(12, len * 0.35);
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.globalAlpha = 0.7;
    ctx.font = "10px monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(label, (x1 + x2) / 2 + 10, (y1 + y2) / 2);
  }
  ctx.restore();
}
