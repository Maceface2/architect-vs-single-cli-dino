/**
 * ObstaclePool — pre-allocated obstacle instances, recycled to avoid GC spikes.
 *
 * Call acquire() to get an inactive instance; call release(obs) when it scrolls off.
 * Obstacle.update(dt, speed) advances position and animation.
 */

const ANIM_INTERVAL_PTERO = 0.12; // seconds per frame for pterodactyl wing flap

/**
 * @typedef {'cactus_single'|'cactus_double'|'cactus_triple'|'pterodactyl'} ObstacleType
 */

/**
 * @typedef {Object} RenderState
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} animFrame
 * @property {ObstacleType} type
 * @property {'ACTIVE'} state
 */

/**
 * @typedef {Object} HitboxRect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

export class Obstacle {
  constructor() {
    this.active = false;
    /** @type {ObstacleType} */
    this.type      = 'cactus_single';
    this.x         = 0;
    this.y         = 0;
    this.width     = 0;
    this.height    = 0;
    this.animFrame = 0;
    this._animTimer = 0;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {ObstacleType} type
   */
  init(x, y, width, height, type) {
    this.active     = true;
    this.x          = x;
    this.y          = y;
    this.width      = width;
    this.height     = height;
    this.type       = type;
    this.animFrame  = 0;
    this._animTimer = 0;
  }

  /**
   * @param {number} dt    - seconds
   * @param {number} speed - px/s (passed each frame so speed ramps are free)
   */
  update(dt, speed) {
    this.x -= speed * dt;

    if (this.type === 'pterodactyl') {
      this._animTimer += dt;
      if (this._animTimer >= ANIM_INTERVAL_PTERO) {
        this._animTimer -= ANIM_INTERVAL_PTERO;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    }
  }

  /** @returns {RenderState} */
  get renderState() {
    return {
      x:         this.x,
      y:         this.y,
      width:     this.width,
      height:    this.height,
      animFrame: this.animFrame,
      type:      this.type,
      state:     'ACTIVE',
    };
  }

  /** Inset hitbox. @returns {HitboxRect} */
  get hitbox() {
    return {
      x:      this.x + 3,
      y:      this.y + 3,
      width:  this.width  - 6,
      height: this.height - 6,
    };
  }
}

export class ObstaclePool {
  /**
   * @param {number} size - number of pre-allocated slots (default 20)
   */
  constructor(size = 20) {
    /** @type {Obstacle[]} */
    this._pool = Array.from({ length: size }, () => new Obstacle());
  }

  /** @returns {Obstacle|null} null if pool is exhausted */
  acquire() {
    return this._pool.find(o => !o.active) ?? null;
  }

  /** @param {Obstacle} obstacle */
  release(obstacle) {
    obstacle.active = false;
  }

  releaseAll() {
    for (const o of this._pool) o.active = false;
  }

  /** @returns {Obstacle[]} */
  get active() {
    return this._pool.filter(o => o.active);
  }
}
