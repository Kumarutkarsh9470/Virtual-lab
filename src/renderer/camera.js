/**
 * Camera — manages pan, zoom, and world ↔ screen coordinate transforms.
 * All other layers call worldToScreen / screenToWorld rather than doing math themselves.
 */

const camera = {
  x: 0, // world x of the top-left corner of the viewport
  y: 0, // world y of the top-left corner
  zoom: 1, // pixels per world-unit
  minZoom: 0.1,
  maxZoom: 8,
};

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getCamera() {
  return { ...camera };
}

export function setCamera(x, y, zoom) {
  camera.x = x;
  camera.y = y;
  camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, zoom));
}

// ─── Coordinate Transforms ────────────────────────────────────────────────────

/**
 * Convert world coordinates → canvas pixel coordinates.
 */
export function worldToScreen(wx, wy) {
  return {
    x: (wx - camera.x) * camera.zoom,
    y: (wy - camera.y) * camera.zoom,
  };
}

/**
 * Convert canvas pixel coordinates → world coordinates.
 */
export function screenToWorld(sx, sy) {
  return {
    x: sx / camera.zoom + camera.x,
    y: sy / camera.zoom + camera.y,
  };
}

/**
 * Scale a world-space length to screen pixels.
 */
export function worldLengthToScreen(len) {
  return len * camera.zoom;
}

// ─── Pan ──────────────────────────────────────────────────────────────────────

/**
 * Pan the camera by a screen-pixel delta.
 */
export function pan(dxScreen, dyScreen) {
  camera.x -= dxScreen / camera.zoom;
  camera.y -= dyScreen / camera.zoom;
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

/**
 * Zoom in/out toward a screen focal point (e.g. mouse cursor).
 * @param {number} delta  - positive = zoom in, negative = zoom out
 * @param {number} focalX - screen x of the zoom focal point
 * @param {number} focalY - screen y of the zoom focal point
 */
export function zoomAt(delta, focalX, focalY) {
  const prevZoom = camera.zoom;
  const factor = delta > 0 ? 1.1 : 0.9;
  const newZoom = Math.max(
    camera.minZoom,
    Math.min(camera.maxZoom, prevZoom * factor),
  );

  // Adjust camera.x/y so the focal world point stays under the cursor
  const worldFocalX = focalX / prevZoom + camera.x;
  const worldFocalY = focalY / prevZoom + camera.y;

  camera.zoom = newZoom;
  camera.x = worldFocalX - focalX / newZoom;
  camera.y = worldFocalY - focalY / newZoom;
}

/**
 * Reset camera to origin with default zoom.
 */
export function resetCamera(canvasWidth = 1200, canvasHeight = 700) {
  camera.zoom = 1;
  camera.x = -canvasWidth / 2 + 400; // center ~(400, 300) of world
  camera.y = -canvasHeight / 2 + 300;
}

/**
 * Focus camera on a specific world point, keeping it centered.
 */
export function focusOn(worldX, worldY, canvasWidth, canvasHeight) {
  camera.x = worldX - canvasWidth / (2 * camera.zoom);
  camera.y = worldY - canvasHeight / (2 * camera.zoom);
}
