/**
 * collisionSystem.js — AABB collision between the dino and obstacles.
 *
 * All rects are { x, y, width, height } in canvas-space pixels.
 * Hitboxes are shrunk to 80% of the sprite rect for a forgiving feel.
 */

const SHRINK = 0.80;

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect
 */

/**
 * Shrink a rect symmetrically toward its center by `factor`.
 * @param {Rect} rect
 * @param {number} factor  0 < factor <= 1
 * @returns {Rect}
 */
function shrink(rect, factor) {
  const dw = rect.width  * (1 - factor) / 2;
  const dh = rect.height * (1 - factor) / 2;
  return {
    x:      rect.x      + dw,
    y:      rect.y      + dh,
    width:  rect.width  * factor,
    height: rect.height * factor,
  };
}

/**
 * Axis-aligned bounding box overlap test.
 * @param {Rect} a
 * @param {Rect} b
 * @returns {boolean}
 */
function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.width  &&
    a.x + a.width  > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Check whether the dino is hitting any obstacle.
 *
 * @param {Rect}   dinoRect       - Full sprite rect of the dino
 * @param {Rect[]} obstacleRects  - Full sprite rects of all active obstacles
 * @returns {Rect|null}  The first obstacle rect that collided, or null
 */
export function checkCollision(dinoRect, obstacleRects) {
  const dinoHitbox = shrink(dinoRect, SHRINK);
  for (const obs of obstacleRects) {
    const obsHitbox = shrink(obs, SHRINK);
    if (aabbOverlap(dinoHitbox, obsHitbox)) {
      return obs;
    }
  }
  return null;
}
