# Game Logic — Exported API

All files live in `src/`. They are plain ES modules with no build step required.

---

## `src/gameState.js`

### Shared state object (read each frame by Presentation)

```ts
gameState: {
  state:      'idle' | 'running' | 'gameOver',
  score:      number,   // float, advances per frame
  hiScore:    number,   // persisted to localStorage key 'dinoHiScore'
  speed:      number,   // px/s — written by difficultyManager each frame
  frameCount: number,   // increments each fixed step while RUNNING
  events:     EventTarget,
}
```

### State transitions

```ts
startGame()   // IDLE → RUNNING; emits 'start'
triggerDeath() // RUNNING → GAME_OVER; emits 'death', optionally 'newHiScore'
restartGame()  // GAME_OVER → RUNNING; emits 'restart'; resets score to 0
```

### Per-frame helpers (called by game loop internally)

```ts
addScore(points: number): void       // adds to score, fires 'scoreMilestone' every 100 pts
incrementFrame(): void
```

### Events (listen on `gameState.events`)

| Event name        | `detail` shape                              |
|-------------------|---------------------------------------------|
| `start`           | `{}`                                        |
| `death`           | `{ score: number, isNewHi: boolean }`       |
| `restart`         | `{}`                                        |
| `newHiScore`      | `{ hiScore: number }`                       |
| `scoreMilestone`  | `{ milestone: number, score: number }`      |

`milestone` is the tier number (1 = first 100 pts, 2 = 200 pts, …).

---

## `src/collisionSystem.js`

```ts
checkCollision(
  dinoRect:      { x, y, width, height },  // full sprite rect
  obstacleRects: { x, y, width, height }[] // full sprite rects of all active obstacles
): { x, y, width, height } | null
```

- Shrinks both rects to **80%** of their size before testing (forgiving AABB).
- Returns the first colliding obstacle rect, or `null`.
- Frame-rate independent (pure function, no internal state).

---

## `src/difficultyManager.js`

```ts
updateDifficulty(): DifficultyParams   // call once per fixed step while RUNNING
getDifficultyParams(): DifficultyParams // read-only snapshot, no side effects
```

```ts
type DifficultyParams = {
  speed:         number,   // px/s — also written into gameState.speed
  spawnInterval: number,   // ms between obstacle spawns (use in Obstacle Generator)
  gapVariance:   number,   // fractional variance on spawn gap [0.3, 0.6]
  pterodactyls:  boolean,  // true once score ≥ 500
  tier:          number,   // 0–12
}
```

Tier thresholds: every 100 points, capped at tier 12.
Speed formula: `300 + tier × 40` px/s.

---

## `src/gameLoop.js`

```ts
initLoop(callbacks: {
  getHitboxes():    { dinoRect: Rect, obstacleRects: Rect[] },
  updateEntities(dt: number, params: DifficultyParams): void,
  render():         void,
}): void

stopLoop(): void          // teardown / testing

handleStartInput(): void  // call from Input Handler on Space/tap to start from IDLE
```

- Fixed timestep: **1000/60 ms** per update step.
- Clamps backlog to **5 steps** per real frame to avoid spiral-of-death.
- Pauses on `visibilitychange` (hidden tab) by resetting timestamp accumulator.
- Calls `triggerDeath()` internally when `checkCollision` returns a hit.

---

## Integration notes for other zones

### Entities zone
- Implement `getHitboxes()` to return current dino and obstacle rects (full sprite bounds — the collision system applies the 80% shrink internally).
- Implement `updateEntities(dt, params)` to advance physics at the fixed `dt` (seconds) using `params.speed` for scroll velocity.
- `params.spawnInterval` and `params.pterodactyls` control the Obstacle Generator's spawn cadence.

### Presentation zone
- Import `gameState` and read `.state`, `.score`, `.hiScore`, `.speed` each render frame.
- Listen on `gameState.events` for `'start'`, `'death'`, `'restart'`, `'newHiScore'`, `'scoreMilestone'` to trigger audio and UI overlays.
- To restart: call `restartGame()` from `src/gameState.js` (wire to Input Handler's Space/tap handler when `state === 'gameOver'`).
- To start from IDLE: call `handleStartInput()` from `src/gameLoop.js` or call `startGame()` directly.
