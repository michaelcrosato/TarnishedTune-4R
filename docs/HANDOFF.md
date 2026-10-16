# Expansion handoff

## Start with evidence

Run `npm ci`, `npm test`, `npm run check:engine`, and `npm run build`. Use `npm run dev` only for browser-specific work. The reserved port is 43187. Screenshots belong under `/tmp`. Read the current verification report rather than assuming a prior test covers a new change.

## Runtime boundaries

`src/sim/game.js` registers `tune:belfry` with my-3dge. Its ECS holds campaign, pilgrim, foes, pickups and breakables as plain data. The engine owns fixed 60 Hz stepping, settings validation, named seeded random streams, portable math, Rapier queries, state hashing, capture/restore and input recording. Systems never read a clock, browser state, storage, audio or a rendering result.

The page is a presentation adapter. `src/main.js` accumulates real frame time and advances the game in fixed steps. `src/platform/input.js` converts standard gamepad controls and keyboard/mouse into the same world-space intent vocabulary. `src/view` reads copied state and draws it. The frame counter measures actual frame intervals; simulation delta clamps are not used to fake performance.

`Flow` owns title/play/demo transitions. Each demo cycle restores the initial engine capture and creates a fresh pilot. Restoring also resets the recorded input stream and releases/replaces Rapier snapshot state, so the indefinite loop does not accumulate runtimes. Player progress is written only in play mode. A physical input exits demo, clears pending actions, and briefly consumes click activation so an exit cannot also activate a title command.

## Content and reusable systems

| Authoring surface        | What to extend                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/sim/content.js`     | Walkable regions, collision obstacles, enemy placements/archetypes, weapon moves, items, shrines, NPC/lore and names |
| `src/sim/combat.js`      | Shared commitment, damage, posture, stamina, guard, counter, invulnerability and healing rules                       |
| `src/sim/enemies.js`     | Shared idle/chase/windup/strike/recover/stagger/death machine, ranged attacks, boss phases                           |
| `src/sim/progression.js` | Interaction dispatch, checkpoints, rewards, upgrades, death/recovery, save schema and victory                        |
| `src/sim/state.js`       | ECS data defaults, bounded event feed and navigation compiled through my-3dge                                        |
| `src/sim/pilot.js`       | An authored route plus reactive combat strategy, using ordinary intents only                                         |
| `src/view/world.js`      | Procedural visual composition of the level; architecture is content written as mesh recipes                          |
| `src/view/character.js`  | Articulated rigs and state-based presentation animation                                                              |
| `src/platform/audio.js`  | Engine-synthesized sound definitions, event mapping and procedural score                                             |

For another level, author its regions, obstacles, encounters, interactions and art recipe in the content layer, and bind another scene using the same combat/progression systems. The current module is one authored campaign; it does not claim a production streaming-world editor or multiplayer stack. Preserve one authoritative collision definition and update the navigation and visible composition together. Fog entry, final bell and shortcut bounds are declared in `content.js` under `LANDMARKS`; navigation dimensions and the spawn also come from the level definition.

Add an enemy archetype by supplying its health, poise, speed, range, damage, windup, recovery and reward. New attack patterns can use the same state machine, projectile list and radial-wave list. Add weapons through the same light/heavy records; the player’s inventory and UI already support switching. Add interaction kinds with explicit save behavior. Save fields are versioned; implement a migration before changing that version for an existing release.

All durations that affect gameplay are integer ticks. Combat cones come from the engine’s public `inCone`; world obstacles are Rapier shapes. The mesh recipe uses the same obstacle dimensions. Decorative distant scenery is not traversable.

## Presentation authoring

`src/view/materials.js` defines the shared palette through the engine's material registry and `createStyleSet({style:'toon'})`. Three lighting bands and a restrained rim are the default on both WebGPU and WebGL2. Character silhouettes use the engine's pixel-width `createOutline` shells; architecture edges are merged linework. Keep colors and painted texture contrast together when changing the palette.

`src/view/motion.js` samples named poses using actual weapon and archetype timings. `src/view/character.js` owns the articulated hierarchy, damped pose blending, distance-driven gait, the engine's `twoBone` foot placement, supporting-hand IK, cape deformation and bounded blade trails. Presentation state never writes to simulation components. Death settling may finish in render time while the death screen pauses the simulation. `__tune.motion()` returns pose/foot diagnostics for inspection.

`src/view/level-details.js` is the regional decoration pass. Large new structures sit outside walkable regions or within existing collision volumes; hanging banners and lanterns are above player height. New plants and surface engravings are decorative. The authored route and collision map remain authoritative.

Run the browser-free presentation tests before opening the art review. The review stage under `scripts/review-stage.js` imports the actual game modules through Vite so it shares one three.js/TSL instance. Do not mix a raw three.js build with Vite's optimized modules: duplicate TSL stacks break shader evaluation. Keep the separate normal-rules pilot proof; isolated poses are visual inspection, not gameplay completion evidence.

## Save behavior

Only local browser storage is used. The save records checkpoint, upgrades, echoes, inventory, collected items, lore, shortcut, boss victory and recoverable death drop. It deliberately resumes at a safe flame. New journey requires an in-game overwrite confirmation when a save exists. Corrupt/incompatible saves are ignored; denied writes report that progress is temporary without preventing play. The demo has no write path.

Engine custom intents reject nested null. The load and QA fixture boundaries therefore carry JSON strings, parsed inside the simulation; ordinary intent data remains typed plain values. Saves with a defeated boss restore that boss as dead.

## Inspector and QA

`window.__engine` is the current real my-3dge inspector. `help()`, `state()`, `hash()`, `capture()`, `restore()`, `input.record()` and `replay()` are available. `window.__tune` exposes read-only snapshots, mode, settings, adapter/frame diagnostics and audio state, plus application actions and a scripted gamepad bridge.

The `?qa` route enables recorded fixture intents and controlled stepping for isolated UI tests. Normal play refuses fixture writes. `advanceDemo(n)` advances the actual pilot only while in demonstration mode. It cannot complete a player’s journey. Use `scripts/prove-demo.mjs` for a full normal-rules proof; it never invokes fixtures.

For deterministic debugging: capture the run, execute the same intents twice after restore, and compare hashes. Visual and audio changes must not affect these hashes. A seed changes enemy initial timers, not the authored level layout.

## Rendering and performance

WebGPU is primary; the game adapter explicitly supports WebGL2. Static geometry is merged by material. Characters are articulated hierarchies; only nearby rigs are visible. Particles, event history and frame samples are bounded. Dynamic resolution lowers rendering cost independently of gameplay. Device loss attempts to replace the canvas and restart presentation on WebGL2 without replacing the simulation.

The hardware benchmark uses a real headless Windows Chrome WebGPU adapter reporting NVIDIA/Ampere on the host’s RTX 3060 Ti. Linux WebKit/Chromium software performance is not substituted for GPU performance. The full test scene includes exploration, combat, the boss transition, victory and restart.

A physical controller, tactile vibration, audible speaker/headphone quality and real iOS Safari require human/device verification. Automated tests cover standard pad values, menu focus, mapped gameplay and input interruption.

## Delivering changes

Keep source provenance, engine hash, test commands and current limitations accurate. Do not delete tests to accommodate behavior changes. If a new content route intentionally changes the complete-run hash, document why and re-prove all ten seeds. CI performs engine integrity, headless rules and the static build; browser checks use the installed platform toolkit locally.
