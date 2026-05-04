# Architect vs. single-CLI: Chrome dino runner

Three runs, identical user prompt:

> **build out this chrome dino game**

| Run | Setup | Output | Lines | Size |
|---|---|---|---:|---:|
| `single-cli-sonnet/` | One Claude Code session, Sonnet 4.6 | `dino.html` (single file) | 369 | 10 KB |
| `single-cli-opus/` | One Claude Code session, Opus 4.7 | `dino.html` (single file) | 514 | 13 KB |
| `architect/` | Architect — 3 zones, all Sonnet 4.6 | `index.html` + 8 ES modules | 1,405 | 43 KB |

This repo is the raw output of all three. Open the HTML files; read the source. Numbers above aren't the point — the structure of the work is.

## What's in `architect/`

`architect/` is a **verbatim snapshot of the working directory** after the Architect dispatch finished. The same prompt that produced the single-CLI runs went into Architect's user-prompt field; the canvas is what gave it the shape. Everything an Architect run leaves behind is preserved so you can browse it the way the agents saw it.

```
architect/
├── architect-canvas.json              ← the canvas (drafted by the Architect Assistant — zones + components + edges)
├── index.html                         ← project files (where the agents wrote real code)
├── src/                               ← project files
│   ├── gameLoop.js
│   ├── gameState.js
│   ├── collisionSystem.js
│   ├── difficultyManager.js
│   ├── gameLogic.test.mjs             ← Game-Logic-Agent wrote a test suite, unprompted
│   └── entities/
│       ├── DinoController.js
│       ├── ObstacleGenerator.js
│       └── ObstaclePool.js
├── conductor-decisions.md             ← human-readable extract of the Conductor's task bodies
└── ARCHITECT/                         ← coordination folder — Architect-generated, untouched
    ├── manifest.json                  ← slim canvas projection consumed by the agents
    ├── prompts/                       ← system prompts each agent was spawned with
    │   ├── conductor.md
    │   ├── Game-Logic-Agent.md
    │   ├── Entities-Agent.md
    │   └── Presentation-Agent.md
    ├── outputs/                       ← cross-zone contract docs each zone published
    │   ├── Game-Logic-Agent.md
    │   ├── Entities-Agent.md
    │   └── Presentation-Agent.md
    ├── runtime/<dispatchId>/
    │   ├── activity/                  ← per-participant JSONL activity logs
    │   │   ├── conductor.jsonl        ← every Conductor decision, frozen
    │   │   ├── Game-Logic-Agent.jsonl
    │   │   ├── Entities-Agent.jsonl
    │   │   └── Presentation-Agent.jsonl
    │   ├── state/                     ← per-participant key-value state snapshots
    │   ├── orchestration.jsonl        ← harness-only audit log
    │   └── bin/record                 ← helper script agents use to append activity lines
    ├── dispatches/                    ← durable dispatch record (resume metadata)
    └── sessions/                      ← captured CLI session ids per zone
```

If you want the shortest path through the planning, read `conductor-decisions.md` first, then dip into `ARCHITECT/outputs/` to see the contracts each zone published for the others.

## How the Architect run actually went

### 0. Architect Assistant drafted the canvas

The canvas itself wasn't drawn by hand. Architect ships with an architecture-mode assistant that reads the project and writes `architect-canvas.json` directly. The user told the assistant *"build me the chrome dino game architecture"* and it produced the three zones, eleven components, and fifteen component edges visible in `architect-canvas.json`. This is the assistant flow described in Architect's CLAUDE.md (it edits the canvas via `ARCHITECT_CANVAS_UPDATE` blocks; live-reload picks up the changes). So the actual user workflow was:

1. *(human, ~30 seconds)* — asked the Assistant to draft an architecture
2. *(Assistant, one CLI session)* — wrote `architect-canvas.json`
3. *(human, ~5 seconds)* — clicked Dispatch with the prompt **"build out this chrome dino game"**
4. *(three zone agents in parallel)* — built the system

Steps 1–2 take the place of the hand-drawn canvas. The user never touches the JSON.

### 1. Canvas → Conductor

Three zones the Assistant drew:

- **Game-Logic-Agent** — owns Game Loop, Game State, Collision System, Difficulty Manager
- **Entities-Agent** — owns Dino Controller, Obstacle Generator, Obstacle Pool
- **Presentation-Agent** — owns Canvas Renderer, Score Display, Input Handler, Audio Manager

Component edges describe the seams between them (e.g. Dino Controller's hitbox feeds the Collision System; Game State drives the Canvas Renderer).

The Conductor was spawned with `ARCHITECT/prompts/conductor.md`. It saw the full canvas projection (every zone, every component spec, every edge label) but **not** any zone's private system prompt — that's role/methodology, owned by each zone. See `ARCHITECT/manifest.json` for the exact projection that flowed in.

### 2. Conductor task bodies

The Conductor's job is to plan, not to implement. It distilled the canvas into three task bodies, one per zone, each shaped as **Goal / Cross-zone contract / Acceptance**. Excerpt from `Game-Logic-Agent`'s task (full thing in `conductor-decisions.md`):

> **Goal:** Drive per-frame updates at a fixed timestep, maintain a state machine (idle → running → game over), track score with a persistent hi-score in localStorage, pause when the tab is hidden, and ramp difficulty over time.
>
> **Cross-zone contract:**
> - Expose a single shared game state object that Presentation can read each frame: at minimum `{ state: "idle"|"running"|"gameOver", score, hiScore, speed }`.
> - Expose a collision-check interface that accepts the dino hitbox rect and an array of obstacle hitbox rects (both sourced from Entities zone) and returns whether a hit occurred.
> - Emit or expose hooks for game events (start, death, restart, new hi-score, score milestone).
> - Accept a restart action from Presentation.
>
> Leave your exported API surface in `ARCHITECT/outputs/Game-Logic-Agent.md` so Entities and Presentation can align on it.
>
> **Acceptance:** The game loop runs without errors, a collision drives state to gameOver, restarting resets score and resumes, and hi-score persists across page reloads.

Notice what's *not* there: no class names, no method names, no magic numbers, no sprite coordinates, no audio frequencies. The Conductor names the seam (`{ state, score, hiScore, speed }`) and walks away. The zone agent decides the rest.

### 3. Parallel zone work + async contracts

All three zones ran in parallel. Each zone published its API surface to `ARCHITECT/outputs/<zone>.md` so consumers could read the agreed shape — see `ARCHITECT/outputs/Entities-Agent.md` for the actual data contract Entities-Agent advertised. The Conductor only stepped in on `done` events to acknowledge progress, never to micromanage.

The full sequence is in `ARCHITECT/runtime/<dispatchId>/activity/conductor.jsonl` (raw) and `architect/conductor-decisions.md` (readable). The Conductor emitted exactly four decisions across the whole build:

1. **Initial assign** — three task bodies, one per zone
2. **Noop** when one zone reported done (others still working)
3. **Noop** when the second zone reported done
4. **Final** summary when all three reported done

Zero re-routing, zero blocking-questions back from zones. The contracts on the canvas were tight enough that the zones executed independently.

## What's in the single-CLI runs

`single-cli-sonnet/dino.html` and `single-cli-opus/dino.html` — one file each. Open them in a browser; they work. The code is fine for what it is. They're a fair baseline: the same prompt, given to a fresh single CLI session, with no extra scaffolding.

## What Architect gives you (that a single CLI doesn't)

Every claim below points at a real file in this repo so you can verify it.

### Prompt engineering — codified, not improvised

A single-CLI session lives or dies on whatever you remember to type at the start. Architect lifts the prompt-engineering work out of chat and into the canvas:

- **Per-zone role prompts** persist on the canvas and are passed verbatim as the agent's system prompt at spawn (`--append-system-prompt` for Claude; folded into the first turn for Codex/OpenCode/Gemini). See `architect/ARCHITECT/prompts/Game-Logic-Agent.md` — that's the system prompt Game-Logic-Agent ran with, written once when the canvas was drawn and applied automatically every dispatch.
- **A battle-tested Conductor template** with the Goal / Cross-zone contract / Acceptance shape baked in. See `architect/ARCHITECT/prompts/conductor.md` — it's ~100 lines of prompt that took dozens of iterations to land on (the lesson is in [Architect-restructure commit `c7b8669`](https://github.com/Maceface2/Architect-restructure/commit/c7b8669)). You don't have to reinvent it; the harness ships it.
- **A slim canvas projection** (`architect/ARCHITECT/manifest.json`) is what flows to the Conductor — strips out implementation bloat (positions, colors, runtime/model wiring, agent-private system prompts), leaving just the canvas: zones, components with full specs, edges. The Conductor sees what's on the canvas, not how the harness was wired.

A single CLI session has none of this. You re-paste the system prompt every time, or you don't, and the result is whatever the model's mood happens to be that day.

### Agent roles & skills — per-zone, not one-size-fits-all

A single CLI session is one agent with one runtime, one model, one tool surface. Architect lets each zone differ:

- **Per-zone runtime + model.** This dispatch ran all three zones on Sonnet 4.6, but the Frontend zone in another project might run on Opus while the Backend zone runs on Codex. The canvas stores `agentRuntime` and `providerModels` per zone.
- **Per-zone skills.** Skills are markdown files (`SKILL.md`) injected verbatim into the zone's system prompt. The canvas can attach `react-best-practices.md` to the Frontend zone and `typescript-strict.md` to the Backend zone — each agent reads only its own.
- **Per-zone tools.** `webSearch`, `codeExec`, `fileRead`, `fileWrite`, `shell`, `apiCalls` are gated per zone. Build a zone that's read-only by design; build another that owns shell.
- **Per-zone permissions and env vars.** Network access, file-write scope, per-zone API keys. The Frontend zone never sees the Backend zone's database credentials.

### Planning — explicit, decomposed, on disk

When a single CLI session "plans," the plan is in the model's head. With Architect, planning is a real artifact:

- **The Conductor decomposes the user prompt into per-zone task bodies** before any zone touches code. See `architect/conductor-decisions.md` — that's the Conductor's first activity-log line, with three task bodies (one per zone), each shaped Goal / Cross-zone contract / Acceptance.
- **Every task body is auditable.** Why does the dino have an 80%-shrunk hitbox? Because the Conductor's task body for Game-Logic-Agent literally says *"Use shrunk hitboxes (~80% of sprite) for a forgiving feel."* It's in the file. There's no "I think the model decided" — there's a citation.
- **The Conductor stays in its lane.** It assigns goals; zones decide internal class names, magic numbers, file layout. See the Goal/Contract/Acceptance excerpt above and notice what's *not* in the task body: no method names, no constants, no sprite coordinates. Zones aren't transcribers.

### Coordination — file-based, parallel, no polling

A single CLI session does work in sequence, by definition. Three Architect zones run **in parallel**, and they coordinate through the filesystem rather than a chat log:

- **Activity-log JSONL is the coordination spine.** Each participant (Conductor + each zone) owns one append-only `*.jsonl` file. Agents `cat >> "$ARCHITECT_RECORD" …` (one shell command) when they finish a task; the harness `fs.watch`-es the files and routes events. No polling loops, no mailbox scripts, no screen-scraping.
- **Cross-zone contracts are async.** When Game-Logic-Agent needed to know what shape Entities-Agent's hitbox would be, the Conductor told both zones to publish their API surface to `ARCHITECT/outputs/<zone>.md`. The consumer `cat`s the file when it needs the shape — no live conversation, no waiting on a peer to "respond." Read `architect/ARCHITECT/outputs/Entities-Agent.md` to see the actual contract published.
- **The harness drives turn-taking.** Zones don't poll. The Conductor doesn't loop. The scheduler watches activity logs and pty-writes one user turn per material event (`done`, `failed`, `ask`, stale, all-done). On this dispatch the Conductor emitted exactly **four** decisions for a 1,400-LOC game: one initial assign, two noops while peers caught up, one final summary.
- **Resume support.** Kill the dispatch mid-task, come back later — the scheduler reads `architect/ARCHITECT/dispatches/<id>.json`, redelivers any in-flight tasks with the same `taskId`, and the conversation picks up. A single CLI session that gets killed is just gone.

### Auditability — every byte is on disk

A single CLI session lives in a chat scrollback that decays. An Architect dispatch leaves a complete forensic record:

| Question | Where to look |
|---|---|
| What system prompt did this zone run with? | `architect/ARCHITECT/prompts/<zone>.md` |
| What did the Conductor see about the canvas? | `architect/ARCHITECT/manifest.json` |
| What task did the Conductor hand this zone? | `architect/ARCHITECT/runtime/<id>/activity/conductor.jsonl` (or the readable extract `architect/conductor-decisions.md`) |
| What did the zone report back? | `architect/ARCHITECT/runtime/<id>/activity/<zone>.jsonl` |
| What contract did the zone publish for peers? | `architect/ARCHITECT/outputs/<zone>.md` |
| What CLI session did this zone use, and how do I resume it? | `architect/ARCHITECT/sessions/<zone>/<sessionId>.json` and `architect/ARCHITECT/dispatches/<id>.json` |

Re-running the same canvas won't produce byte-identical code, but the **planning structure** is reproducible. That's what makes the difference between "the model built me something" and "I directed an engineering team."

### Composable output

The single-CLI files are good HTML. They aren't architectures. Architect's output is one ES module per concern — swap the renderer for WebGL, plug a leaderboard into `gameState.js`, replace `ObstaclePool.js` with a different allocation strategy: every change is local. The boundary lines on the canvas became boundary lines in the codebase.

## Run it yourself

Each finished build is just static files. Open them directly:

```bash
open single-cli-sonnet/dino.html
open single-cli-opus/dino.html
```

The Architect build uses `<script type=module>`, so on some setups you'll need a local server:

```bash
cd architect && python3 -m http.server 8000
# then open http://localhost:8000
```

## About Architect

Architect is an Electron desktop app that lets you visually compose software architecture with multi-agent build execution on a canvas and dispatch them as real CLI sessions — Claude Code, Codex, OpenCode, Gemini. The Conductor + zone-agent pattern, the v5 activity-log coordination spine, and the slim canvas projection that powered this build are all in the open-source repo.

The prompt-engineering lesson behind *why* this build came out so much cleaner than earlier attempts on the same canvas is documented in the Architect repo's commit `c7b8669` ("conductor prompt: assign goals, not blueprints"). Reading the conductor task bodies in this repo and that commit message back-to-back is the shortest path to understanding how to direct a multi-agent build well.
