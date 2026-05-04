/**
 * ObstacleGenerator — spawns cacti and pterodactyls at difficulty-scaled intervals.
 *
 * Drives obstacle movement and recycling via ObstaclePool.
 * Call setDifficultyParams(params) whenever the difficulty manager updates.
 * Call update(dt, speed) each frame (speed forwarded from game state).
 */

import { ObstaclePool } from './ObstaclePool.js';
import { GROUND_LINE_Y } from './DinoController.js';

const CANVAS_WIDTH = 600;
const MIN_SPAWN_GAP = 0.6; // seconds — hard floor to prevent overlap

/** @typedef {'cactus_single'|'cactus_double'|'cactus_triple'|'pterodactyl'} ObstacleType */

/** Pixel dimensions and ground anchoring per type. */
const SPECS = /** @type {Record<ObstacleType, {width:number, height:number}>} */ ({
  cactus_single: { width: 17, height: 35 },
  cactus_double: { width: 34, height: 35 },
  cactus_triple: { width: 51, height: 35 },
  pterodactyl:   { width: 46, height: 40 },
});

/** Pterodactyl flight heights (y of sprite top). Lower = closer to ground. */
const PTERO_Y_OPTIONS = [
  GROUND_LINE_Y - 80,   // high
  GROUND_LINE_Y - 60,   // mid
  GROUND_LINE_Y - 40,   // low (forces duck)
];

/**
 * @typedef {Object} DifficultyParams
 * @property {number}  speed              - horizontal scroll speed px/s
 * @property {number}  spawnInterval      - base seconds between spawns
 * @property {number}  gapVariance        - fraction of spawnInterval applied as ±random offset
 * @property {boolean} pterodactylEnabled - whether pterodactyls can spawn
 */

export class ObstacleGenerator {
  /**
   * @param {ObstaclePool} [pool] - optional externally-owned pool; creates one if omitted
   */
  constructor(pool) {
    this._pool  = pool ?? new ObstaclePool(20);
    this._timer = 0;

    /** @type {DifficultyParams} */
    this._params = {
      speed:              300,
      spawnInterval:      2.0,
      gapVariance:        0.4,
      pterodactylEnabled: false,
    };

    this._nextSpawnIn = this._params.spawnInterval;
  }

  /** @param {Partial<DifficultyParams>} params */
  setDifficultyParams(params) {
    this._params = { ...this._params, ...params };
  }

  /**
   * @param {number} dt    - seconds
   * @param {number} speed - current px/s (may differ from params.speed mid-frame)
   */
  update(dt, speed) {
    // Advance & recycle active obstacles
    for (const obs of this._pool.active) {
      obs.update(dt, speed);
      if (obs.x + obs.width < 0) {
        this._pool.release(obs);
      }
    }

    // Spawn timer
    this._timer += dt;
    if (this._timer >= this._nextSpawnIn) {
      this._timer -= this._nextSpawnIn;
      this._spawn(speed);
      this._scheduleNext();
    }
  }

  reset() {
    this._pool.releaseAll();
    this._timer = 0;
    this._nextSpawnIn = this._params.spawnInterval;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _scheduleNext() {
    const { spawnInterval, gapVariance } = this._params;
    const offset = (Math.random() * 2 - 1) * spawnInterval * gapVariance;
    this._nextSpawnIn = Math.max(MIN_SPAWN_GAP, spawnInterval + offset);
  }

  /** @param {number} speed */
  _spawn(speed) {
    const types = /** @type {ObstacleType[]} */ (
      ['cactus_single', 'cactus_double', 'cactus_triple']
    );
    if (this._params.pterodactylEnabled) types.push('pterodactyl');

    const type = types[Math.floor(Math.random() * types.length)];
    const spec = SPECS[type];

    const y = type === 'pterodactyl'
      ? PTERO_Y_OPTIONS[Math.floor(Math.random() * PTERO_Y_OPTIONS.length)]
      : GROUND_LINE_Y - spec.height;

    // Stagger spawn position by speed so fast runs give the same visual gap
    const spawnX = CANVAS_WIDTH + Math.max(0, (speed - 300) * 0.05);

    const obs = this._pool.acquire();
    if (!obs) return; // pool exhausted, skip (shouldn't happen in normal play)

    obs.init(spawnX, y, spec.width, spec.height, type);
  }

  // ── Per-frame accessors for cross-zone consumers ──────────────────────────

  /** Full render payload for the renderer. @returns {import('./ObstaclePool.js').RenderState[]} */
  get renderList() {
    return this._pool.active.map(o => o.renderState);
  }

  /** Hitbox rects for the collision system. @returns {import('./ObstaclePool.js').HitboxRect[]} */
  get hitboxes() {
    return this._pool.active.map(o => o.hitbox);
  }

  /** Direct pool reference if collision system wants to iterate. */
  get pool() {
    return this._pool;
  }
}
