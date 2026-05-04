/**
 * gameState.js — State machine and shared game state for the dino runner.
 *
 * State flow: IDLE → RUNNING → GAME_OVER → RUNNING (restart)
 *
 * Consumers read the exported `gameState` object directly each frame.
 * Events are dispatched on `gameState.events` (an EventTarget).
 */

export const STATE = /** @type {const} */ ({
  IDLE: 'idle',
  RUNNING: 'running',
  GAME_OVER: 'gameOver',
});

const HI_SCORE_KEY = 'dinoHiScore';
const SCORE_MILESTONE = 100; // emit scoreMilestone every N points

/** @typedef {'idle'|'running'|'gameOver'} GameStateName */

/**
 * @typedef {Object} GameStateSnapshot
 * @property {GameStateName} state
 * @property {number} score
 * @property {number} hiScore
 * @property {number} speed        - current horizontal scroll speed (px/s)
 * @property {number} frameCount
 */

/** Shared mutable state object — Presentation reads this each frame. */
export const gameState = {
  /** @type {GameStateName} */
  state: STATE.IDLE,
  score: 0,
  hiScore: _loadHiScore(),
  speed: 0,
  frameCount: 0,

  /** EventTarget for game lifecycle events. */
  events: new EventTarget(),
};

// ── Transitions ────────────────────────────────────────────────────────────

export function startGame() {
  if (gameState.state === STATE.RUNNING) return;
  gameState.state = STATE.RUNNING;
  gameState.score = 0;
  gameState.frameCount = 0;
  _dispatch('start');
}

export function restartGame() {
  if (gameState.state !== STATE.GAME_OVER) return;
  gameState.state = STATE.RUNNING;
  gameState.score = 0;
  gameState.frameCount = 0;
  _dispatch('restart');
}

export function triggerDeath() {
  if (gameState.state !== STATE.RUNNING) return;
  gameState.state = STATE.GAME_OVER;

  const isNewHi = gameState.score > gameState.hiScore;
  if (isNewHi) {
    gameState.hiScore = gameState.score;
    _saveHiScore(gameState.hiScore);
    _dispatch('newHiScore', { hiScore: gameState.hiScore });
  }

  _dispatch('death', { score: gameState.score, isNewHi });
}

// ── Per-frame score tick (called by game loop) ─────────────────────────────

let _lastMilestone = 0;

/**
 * Advance score by `points` and fire milestone events.
 * @param {number} points
 */
export function addScore(points) {
  if (gameState.state !== STATE.RUNNING) return;
  const prev = Math.floor(gameState.score);
  gameState.score += points;
  const curr = Math.floor(gameState.score);

  const prevMilestone = Math.floor(prev / SCORE_MILESTONE);
  const currMilestone = Math.floor(curr / SCORE_MILESTONE);
  if (currMilestone > prevMilestone || currMilestone > _lastMilestone) {
    _lastMilestone = currMilestone;
    _dispatch('scoreMilestone', { milestone: currMilestone, score: curr });
  }
}

export function incrementFrame() {
  gameState.frameCount++;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _dispatch(type, detail = {}) {
  gameState.events.dispatchEvent(new CustomEvent(type, { detail }));
}

function _loadHiScore() {
  try {
    return parseInt(localStorage.getItem(HI_SCORE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function _saveHiScore(value) {
  try {
    localStorage.setItem(HI_SCORE_KEY, String(value));
  } catch {
    // storage unavailable — silently skip persistence
  }
}
