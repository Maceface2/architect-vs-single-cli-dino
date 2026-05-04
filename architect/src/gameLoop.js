/**
 * gameLoop.js — Fixed-timestep requestAnimationFrame loop.
 *
 * Drives update(dt) at a stable 60 Hz tick regardless of frame rate, then
 * calls render() on every real frame for smooth visuals.
 *
 * Pauses automatically when the browser tab is hidden; resumes on visibility.
 */

import {
  gameState,
  STATE,
  startGame,
  addScore,
  triggerDeath,
  incrementFrame,
} from './gameState.js';
import { updateDifficulty } from './difficultyManager.js';
import { checkCollision }   from './collisionSystem.js';

const FIXED_DT     = 1000 / 60; // ms — fixed timestep
const MAX_CATCHUP  = 5;         // max fixed steps per real frame (avoids spiral of death)

// ── Loop state ──────────────────────────────────────────────────────────────

let _rafId       = 0;
let _lastTs      = 0;
let _accumulator = 0;
let _running     = false;

/**
 * @typedef {Object} LoopCallbacks
 * @property {() => { dinoRect: import('./collisionSystem.js').Rect, obstacleRects: import('./collisionSystem.js').Rect[] }} getHitboxes
 *   Called each fixed step to fetch current hitbox data from Entities zone.
 * @property {(dt: number, params: import('./difficultyManager.js').DifficultyParams) => void} updateEntities
 *   Called each fixed step so Entities zone can advance physics.
 * @property {() => void} render
 *   Called once per real frame so Presentation can redraw.
 */

/** @type {LoopCallbacks|null} */
let _callbacks = null;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Wire up external callbacks and kick off the loop.
 * @param {LoopCallbacks} callbacks
 */
export function initLoop(callbacks) {
  _callbacks = callbacks;
  document.addEventListener('visibilitychange', _onVisibility);
  _requestFrame();
}

/** Hard-stop the loop (use for teardown / testing). */
export function stopLoop() {
  _running = false;
  cancelAnimationFrame(_rafId);
  document.removeEventListener('visibilitychange', _onVisibility);
}

// ── Core frame function ─────────────────────────────────────────────────────

function _tick(timestamp) {
  _rafId   = requestAnimationFrame(_tick);
  _running = true;

  if (_lastTs === 0) {
    _lastTs = timestamp;
  }

  const elapsed = Math.min(timestamp - _lastTs, FIXED_DT * MAX_CATCHUP);
  _lastTs       = timestamp;
  _accumulator += elapsed;

  // Fixed-step update
  let steps = 0;
  while (_accumulator >= FIXED_DT && steps < MAX_CATCHUP) {
    _fixedUpdate(FIXED_DT / 1000); // pass seconds to update functions
    _accumulator -= FIXED_DT;
    steps++;
  }

  // Render every real frame
  _callbacks?.render();
}

function _fixedUpdate(dtSec) {
  if (gameState.state === STATE.IDLE) return;
  if (gameState.state === STATE.GAME_OVER) return;

  incrementFrame();

  // Advance difficulty and write new speed into gameState
  const params = updateDifficulty();

  // Score: advance by speed-based points per second
  addScore(params.speed * dtSec / 10);

  // Let Entities zone advance their physics
  _callbacks?.updateEntities(dtSec, params);

  // Collision check
  const hitboxes = _callbacks?.getHitboxes();
  if (hitboxes) {
    const hit = checkCollision(hitboxes.dinoRect, hitboxes.obstacleRects);
    if (hit) {
      triggerDeath();
    }
  }
}

// ── Visibility handling ─────────────────────────────────────────────────────

function _onVisibility() {
  if (document.hidden) {
    // Reset timestamp so we don't accumulate a huge backlog
    _lastTs = 0;
    _accumulator = 0;
  }
  // rAF pauses automatically when hidden in all modern browsers
}

function _requestFrame() {
  _lastTs = 0;
  _accumulator = 0;
  _rafId = requestAnimationFrame(_tick);
}

// ── Space/tap → start on IDLE (convenience — Input Handler may also do this) ─

/**
 * Call from Input Handler when the player presses space/tap.
 * - If IDLE: starts the game.
 * - If GAME_OVER: restart is handled by Input Handler → restartGame() directly.
 */
export function handleStartInput() {
  if (gameState.state === STATE.IDLE) {
    startGame();
  }
}
