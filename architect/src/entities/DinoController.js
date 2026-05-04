/**
 * DinoController — player entity.
 *
 * Pure update logic; no DOM/canvas access.
 * Call update(dt) each frame, then read renderState and hitbox.
 * Dispatch actions via dispatch(action).
 */

export const DinoState = /** @type {const} */ ({
  RUN:  'RUN',
  JUMP: 'JUMP',
  DUCK: 'DUCK',
  DEAD: 'DEAD',
});

// Physics (px / s units)
const GRAVITY       = 2000;  // px/s^2
const JUMP_VELOCITY = -700;  // px/s (negative = upward)

// Geometry
export const DINO_X           = 80;
const DINO_WIDTH              = 44;
const DINO_HEIGHT             = 48;
const DUCK_HEIGHT             = 26;
export const GROUND_LINE_Y    = 150; // y-coordinate of ground surface

// Animation
const RUN_FPS  = 10;
const DUCK_FPS = 8;

/** @typedef {'RUN'|'JUMP'|'DUCK'|'DEAD'} DinoStateName */

/**
 * @typedef {Object} RenderState
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} animFrame
 * @property {string} type      - always 'dino'
 * @property {DinoStateName} state
 */

/**
 * @typedef {Object} HitboxRect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

export class DinoController {
  constructor() {
    /** @type {DinoStateName} */
    this.state = DinoState.RUN;
    this.x = DINO_X;
    this.y = GROUND_LINE_Y - DINO_HEIGHT;
    this._vy = 0;
    this._duckHeld = false;
    this._animTimer = 0;
    this._animFrame = 0;
  }

  /**
   * @param {'jump'|'duck'|'release_duck'} action
   */
  dispatch(action) {
    if (this.state === DinoState.DEAD) return;

    if (action === 'jump') {
      if (this.state === DinoState.RUN || this.state === DinoState.DUCK) {
        this.state = DinoState.JUMP;
        this._vy = JUMP_VELOCITY;
        this._duckHeld = false;
        this._animFrame = 0;
      }
    } else if (action === 'duck') {
      if (this.state !== DinoState.JUMP) {
        this.state = DinoState.DUCK;
        this._duckHeld = true;
        this._animFrame = 0;
      } else {
        this._duckHeld = true; // queue for landing
      }
    } else if (action === 'release_duck') {
      this._duckHeld = false;
      if (this.state === DinoState.DUCK) {
        this.state = DinoState.RUN;
        this._animFrame = 0;
      }
    }
  }

  kill() {
    this.state = DinoState.DEAD;
    this._vy = 0;
    this._animFrame = 0;
  }

  reset() {
    this.state = DinoState.RUN;
    this.y = GROUND_LINE_Y - DINO_HEIGHT;
    this._vy = 0;
    this._duckHeld = false;
    this._animTimer = 0;
    this._animFrame = 0;
  }

  /**
   * @param {number} dt - seconds since last frame
   */
  update(dt) {
    if (this.state === DinoState.DEAD) return;

    if (this.state === DinoState.JUMP) {
      this._vy += GRAVITY * dt;
      this.y  += this._vy * dt;

      const groundTop = GROUND_LINE_Y - DINO_HEIGHT;
      if (this.y >= groundTop) {
        this.y   = groundTop;
        this._vy = 0;
        this.state = this._duckHeld ? DinoState.DUCK : DinoState.RUN;
        this._animFrame = 0;
      }
    }

    const fps = this.state === DinoState.DUCK ? DUCK_FPS : RUN_FPS;
    const frameCount = this.state === DinoState.RUN || this.state === DinoState.DUCK ? 2 : 1;

    if (frameCount > 1) {
      this._animTimer += dt;
      if (this._animTimer >= 1 / fps) {
        this._animTimer -= 1 / fps;
        this._animFrame = (this._animFrame + 1) % frameCount;
      }
    }
  }

  /** @returns {RenderState} */
  get renderState() {
    const h = this.state === DinoState.DUCK ? DUCK_HEIGHT : DINO_HEIGHT;
    return {
      x: this.x,
      y: this.state === DinoState.DUCK ? GROUND_LINE_Y - DUCK_HEIGHT : this.y,
      width:      DINO_WIDTH,
      height:     h,
      animFrame:  this._animFrame,
      type:       'dino',
      state:      this.state,
    };
  }

  /** Slightly inset hitbox for gameplay fairness. @returns {HitboxRect} */
  get hitbox() {
    const rs = this.renderState;
    return {
      x:      rs.x + 6,
      y:      rs.y + 4,
      width:  rs.width  - 12,
      height: rs.height - 6,
    };
  }
}
