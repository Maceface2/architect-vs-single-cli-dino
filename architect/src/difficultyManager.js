/**
 * difficultyManager.js — Ramps game speed and spawn parameters as score grows.
 *
 * Called each frame by the game loop after score is updated.
 * Writes back to `gameState.speed` and returns a `DifficultyParams` object
 * that the Obstacle Generator reads each spawn cycle.
 */

import { gameState } from './gameState.js';

// ── Tuning constants ────────────────────────────────────────────────────────

const INITIAL_SPEED      = 300;   // px/s at score 0
const SPEED_PER_TIER     = 40;    // px/s added per tier
const TIER_INTERVAL      = 100;   // score points between tiers
const MAX_TIERS          = 12;    // cap so the game stays playable

const BASE_SPAWN_INTERVAL  = 1500; // ms between obstacle spawns at tier 0
const MIN_SPAWN_INTERVAL   = 600;  // floor
const SPAWN_REDUCTION      = 70;   // ms shaved per tier

const BASE_GAP_VARIANCE    = 0.3;  // ±30% randomness on gap at tier 0
const MAX_GAP_VARIANCE     = 0.6;  // caps at tier MAX_TIERS

const PTERODACTYL_THRESHOLD = 500; // score at which pterodactyls appear

/**
 * @typedef {Object} DifficultyParams
 * @property {number}  speed             - Current scroll speed (px/s)
 * @property {number}  spawnInterval     - Target ms between obstacle spawns
 * @property {number}  gapVariance       - Fractional variance [0, MAX_GAP_VARIANCE]
 * @property {boolean} pterodactyls      - Whether pterodactyls are enabled
 * @property {number}  tier              - Current difficulty tier (0-based)
 */

/** @type {DifficultyParams} */
const _params = {
  speed: INITIAL_SPEED,
  spawnInterval: BASE_SPAWN_INTERVAL,
  gapVariance: BASE_GAP_VARIANCE,
  pterodactyls: false,
  tier: 0,
};

/**
 * Recompute difficulty from current score and update `gameState.speed`.
 * Call once per frame while RUNNING.
 *
 * @returns {Readonly<DifficultyParams>}
 */
export function updateDifficulty() {
  const score = Math.floor(gameState.score);
  const tier  = Math.min(Math.floor(score / TIER_INTERVAL), MAX_TIERS);

  _params.tier          = tier;
  _params.speed         = INITIAL_SPEED + tier * SPEED_PER_TIER;
  _params.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - tier * SPAWN_REDUCTION);
  _params.gapVariance   = Math.min(MAX_GAP_VARIANCE, BASE_GAP_VARIANCE + tier * 0.025);
  _params.pterodactyls  = score >= PTERODACTYL_THRESHOLD;

  gameState.speed = _params.speed;

  return _params;
}

/**
 * Read-only snapshot of current difficulty params (does not advance state).
 * @returns {Readonly<DifficultyParams>}
 */
export function getDifficultyParams() {
  return _params;
}
