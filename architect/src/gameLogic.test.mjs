/**
 * Smoke tests for game logic modules.
 * Run with: node --experimental-vm-modules src/gameLogic.test.mjs
 * (No test framework required — plain assertions.)
 */

// ── Polyfill browser globals for Node ──────────────────────────────────────
// Node 21+ has native EventTarget and CustomEvent; only localStorage needs a shim.
globalThis.localStorage = (() => {
  const store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
})();

// ── Import modules ──────────────────────────────────────────────────────────
import {
  gameState, STATE,
  startGame, restartGame, triggerDeath, addScore, incrementFrame,
} from './gameState.js';

import { checkCollision } from './collisionSystem.js';
import { updateDifficulty, getDifficultyParams } from './difficultyManager.js';

// ── Helpers ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

console.log('\n=== gameState ===');

assert(gameState.state === STATE.IDLE, 'initial state is IDLE');
assert(gameState.score === 0, 'initial score is 0');
assert(typeof gameState.hiScore === 'number', 'hiScore is a number');

startGame();
assert(gameState.state === STATE.RUNNING, 'startGame() → RUNNING');

addScore(50);
assert(Math.floor(gameState.score) === 50, 'addScore accumulates');

let deathFired = false;
gameState.events.addEventListener('death', () => { deathFired = true; });

triggerDeath();
assert(gameState.state === STATE.GAME_OVER, 'triggerDeath() → GAME_OVER');
assert(deathFired, 'death event fired');

let restartFired = false;
gameState.events.addEventListener('restart', () => { restartFired = true; });

restartGame();
assert(gameState.state === STATE.RUNNING, 'restartGame() → RUNNING');
assert(gameState.score === 0, 'score reset on restart');
assert(restartFired, 'restart event fired');

// hi-score persistence
gameState.score = 200;
triggerDeath();
assert(gameState.hiScore === 200, 'hiScore updated after beating previous best');
assert(localStorage.getItem('dinoHiScore') === '200', 'hiScore persisted to localStorage');

restartGame();
gameState.score = 100;
triggerDeath();
assert(gameState.hiScore === 200, 'hiScore not overwritten by lower score');

// milestone events
let milestones = [];
gameState.events.addEventListener('scoreMilestone', (e) => milestones.push(e.detail.milestone));
restartGame();
addScore(150);
assert(milestones.length >= 1, 'scoreMilestone event fires past 100 pts');

console.log('\n=== collisionSystem ===');

const dino = { x: 100, y: 100, width: 50, height: 50 };

// clear miss
assert(
  checkCollision(dino, [{ x: 200, y: 100, width: 50, height: 50 }]) === null,
  'no collision when obstacle is far away',
);

// direct overlap
assert(
  checkCollision(dino, [{ x: 110, y: 110, width: 50, height: 50 }]) !== null,
  'collision detected on direct overlap',
);

// edge that only overlaps in the outer rect but not the shrunk hitbox
// Dino shrunk: x=105, y=105, w=40, h=40 (80%)
// Obstacle placed just outside shrunk dino but inside full rect
assert(
  checkCollision(dino, [{ x: 145, y: 100, width: 20, height: 50 }]) === null,
  'near-miss forgiveness: edge touch on full rect misses on shrunk hitbox',
);

console.log('\n=== difficultyManager ===');

restartGame();
gameState.score = 0;
let p0 = updateDifficulty();
assert(p0.tier === 0, 'tier 0 at score 0');
assert(p0.speed === 300, 'speed 300 at tier 0');
assert(p0.pterodactyls === false, 'no pterodactyls at score 0');
assert(p0.spawnInterval === 1500, 'base spawn interval at tier 0');

gameState.score = 300;
let p3 = updateDifficulty();
assert(p3.tier === 3, 'tier 3 at score 300');
assert(p3.speed === 420, 'speed 420 at tier 3');

gameState.score = 500;
let p5 = updateDifficulty();
assert(p5.pterodactyls === true, 'pterodactyls enabled at score 500');

gameState.score = 9999;
let pMax = updateDifficulty();
assert(pMax.tier === 12, 'tier caps at MAX_TIERS=12');

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
