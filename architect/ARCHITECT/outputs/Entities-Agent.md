# Entities-Agent — Cross-Zone Contract

## Files produced

| File | Purpose |
|---|---|
| `src/entities/DinoController.js` | Player entity (physics, animation, hitbox) |
| `src/entities/ObstaclePool.js` | Pre-allocated obstacle instances |
| `src/entities/ObstacleGenerator.js` | Spawner (reads difficulty params, drives pool) |
| `src/entities/index.js` | Barrel export |

---

## Shared coordinate system

```
Canvas width  : 600 px
Ground line Y : 150 (GROUND_LINE_Y — exported constant)
Y increases downward (standard canvas)
Dino fixed X  : 80 px (DINO_X — exported constant)
```

---

## RenderState shape  ← Presentation / Renderer reads this

Both the dino and every active obstacle expose a `renderState` getter that
returns the same shape:

```ts
interface RenderState {
  x:         number;        // left edge (px)
  y:         number;        // top edge (px)
  width:     number;        // px
  height:    number;        // px
  animFrame: number;        // 0-based index into sprite sheet row
  type:      EntityType;    // see below
  state:     string;        // 'RUN' | 'JUMP' | 'DUCK' | 'DEAD' | 'ACTIVE'
}

type EntityType =
  | 'dino'
  | 'cactus_single'
  | 'cactus_double'
  | 'cactus_triple'
  | 'pterodactyl';
```

**Dino animFrame semantics**

| state | frames | meaning |
|---|---|---|
| RUN  | 0–1 | alternating legs |
| DUCK | 0–1 | alternating wings |
| JUMP | 0   | static mid-air pose |
| DEAD | 0   | death pose |

**Obstacle animFrame semantics**

| type | frames | meaning |
|---|---|---|
| cactus_* | 0 only | static |
| pterodactyl | 0–1 | wing up / wing down |

---

## HitboxRect shape  ← Game Logic / Collision reads this

```ts
interface HitboxRect {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}
```

All hitboxes are inset ~3–6 px from the render rect for gameplay fairness.

**DinoController.hitbox** — call each frame after `update(dt)`.  
**ObstacleGenerator.hitboxes** — returns `HitboxRect[]` for all active obstacles.

---

## DinoController API  ← Presentation / Input dispatches to this

```ts
class DinoController {
  // Lifecycle
  update(dt: number): void;   // dt in seconds; call once per frame
  reset(): void;              // restart — returns to RUN at ground
  kill():  void;              // transition to DEAD

  // Input — called by Input Handler
  dispatch(action: 'jump' | 'duck' | 'release_duck'): void;

  // Per-frame reads
  get renderState(): RenderState;
  get hitbox(): HitboxRect;
  get state(): 'RUN'|'JUMP'|'DUCK'|'DEAD';
}
```

Action semantics:
- `jump` — applies upward velocity; ignored while DEAD, ignored mid-jump
- `duck` — enters DUCK state; if mid-jump, queued and applied on landing
- `release_duck` — exits DUCK → RUN; clears the queued duck flag

---

## ObstacleGenerator API  ← Game Logic drives this

```ts
class ObstacleGenerator {
  constructor(pool?: ObstaclePool);  // pool is optional; creates one if omitted

  // Called by Difficulty Manager whenever params change
  setDifficultyParams(params: Partial<DifficultyParams>): void;

  // Call once per frame (speed passed separately so ramps are free)
  update(dt: number, speed: number): void;

  reset(): void;  // clears all active obstacles (on game restart)

  // Per-frame reads
  get renderList(): RenderState[];   // → Presentation / Renderer
  get hitboxes():   HitboxRect[];    // → Game Logic / Collision
  get pool():       ObstaclePool;    // direct pool access if needed
}

interface DifficultyParams {
  speed:              number;   // horizontal scroll speed px/s (default 300)
  spawnInterval:      number;   // base seconds between spawns (default 2.0)
  gapVariance:        number;   // ±fraction of spawnInterval (default 0.4)
  pterodactylEnabled: boolean;  // enable ptero spawns (default false)
}
```

`setDifficultyParams` does a shallow merge — only supply changed keys.

---

## ObstaclePool API (if Game Logic / Collision wants direct iteration)

```ts
class ObstaclePool {
  acquire(): Obstacle | null;       // null when pool exhausted (20 slots default)
  release(obs: Obstacle): void;
  releaseAll(): void;
  get active(): Obstacle[];
}

class Obstacle {
  readonly active:    boolean;
  readonly type:      ObstacleType;
  readonly x:         number;
  readonly y:         number;
  readonly width:     number;
  readonly height:    number;
  readonly animFrame: number;

  update(dt: number, speed: number): void;
  get renderState(): RenderState;
  get hitbox():      HitboxRect;
}
```

---

## Typical game-loop wiring

```js
import { DinoController, ObstacleGenerator, ObstaclePool } from './entities/index.js';

const pool      = new ObstaclePool(20);
const dino      = new DinoController();
const spawner   = new ObstacleGenerator(pool);

// Input Handler calls:
//   dino.dispatch('jump') / dino.dispatch('duck') / dino.dispatch('release_duck')

// Difficulty Manager calls:
//   spawner.setDifficultyParams({ speed, spawnInterval, gapVariance, pterodactylEnabled })

// Game loop (each frame):
function update(dt) {
  dino.update(dt);
  spawner.update(dt, currentSpeed);

  // Collision system reads:
  const dinoHitbox       = dino.hitbox;          // HitboxRect
  const obstacleHitboxes = spawner.hitboxes;      // HitboxRect[]

  // Renderer reads:
  const dinoRender      = dino.renderState;       // RenderState
  const obstacleRenders = spawner.renderList;     // RenderState[]
}
```
