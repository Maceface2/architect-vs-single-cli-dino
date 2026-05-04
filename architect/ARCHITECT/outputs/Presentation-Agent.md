# Presentation Agent — Task t-presentation

## Deliverable

`/Users/masonostman/Documents/Architect-file-audit/index.html` — self-contained single-file dino runner game.

## What was built

Since no other agent outputs were available at task time, the full game is implemented in one file covering all zones:

### Presentation layer (this zone)
- **Canvas Renderer** — procedural Canvas 2D drawing, 60 fps via rAF. Day/night toggle at score 700 (dark bg + stars).
- **Score Display** — 5-digit padded score + HI score top-right; milestone flash animation.
- **GAME OVER banner** — centered box with restart prompt.
- **Input Handler** — keydown/keyup for Space/ArrowUp (jump), ArrowDown (duck); touchstart + click for mobile; lazy AudioContext init on first gesture.
- **Audio Manager** — Web Audio API: sfxJump (frequency sweep), sfxDeath (sawtooth descend), sfxMilestone (3-note arpeggio every 100 pts). Lazy AudioContext.

### Game Logic layer
- **Game State** — IDLE → RUNNING → GAME_OVER state machine; score/hiScore/speed tracking; hi-score persisted to localStorage.
- **Difficulty** — speed scales from 5.5 to 15 every 80 pts; obstacle spawn cooldown shrinks; pterodactyls enabled at score 500.
- **Game Loop** — requestAnimationFrame, fixed logical update per frame.

### Entities layer
- **Dino** — RUN/JUMP/DUCK/DEAD states; gravity + jump velocity; leg animation driven by speed.
- **Obstacle Generator + Pool** — 4 cactus variants (small/medium/double/triple) + pterodactyl; object-pool via splice on scroll-off.
- **Clouds** — decorative, slow parallax.
- **Collision** — AABB with HIT_PAD=5 inset for forgiveness.

## Key constants
```
GROUND_Y = 240, GRAVITY = 0.65, JUMP_VEL = -13
BASE_SPEED = 5.5, MAX_SPEED = 15, NIGHT_AT = 700
HIT_PAD = 5 (forgiveness inset)
```

## Notes for other agents
If Game-Logic-Agent or Entities-Agent output separate JS modules, the single-file implementation here would need to be refactored to import them. For now everything is self-contained and playable.
