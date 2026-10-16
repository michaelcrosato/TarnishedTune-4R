# Tarnished Tune–4R

**The Hollow Belfry** — an original, controller-first action RPG pilgrimage. A world has forgotten its song. Cross a ruined sanctuary, recover its verses, defeat Vesper the Bellkeeper, and ring the silent bell.

This is a complete single-level vertical slice built on [my-3dge](https://github.com/michaelcrosato/my-3dge). It features original procedural architecture, characters, textures, animation and audio. It is unaffiliated with Elden Ring or its creators and contains no extracted game assets.

## Run

Requires Node.js 22.12 or newer and a browser with WebGPU or WebGL2.

```bash
npm ci
npm run dev
```

Open **http://127.0.0.1:43187**. The reserved port is strict: the server fails instead of silently claiming another agent’s port. No account, API key, asset download, backend or external runtime CDN is required.

```bash
npm run build       # self-contained static output in dist/
npm run preview     # serve that build on the same reserved port
```

WebGPU is preferred. A game-specific WebGL2 adapter supports browsers without WebGPU. Graphics remain presentation-only; the same my-3dge simulation runs on either backend.

## The pilgrimage

- Deliberate sword combat: three-hit light chains, committed heavy attacks, posture breaks, ripostes, directional guarding, guard counters and timed parries.
- Stamina, invulnerable dodge windows, jumping over shockwaves, sprinting, camera-relative movement, orbit camera, lock-on and target cycling.
- Four enemy archetypes, projectile attacks and a two-phase guardian with a radial shockwave.
- A connected court, bridge, ruined nave, optional garden, refuge and belfry arena. Optional exploration awards a heavier sword, a fourth healing charge and the final Resonance verse.
- Checkpoint rest and enemy respawn, recoverable echoes after death, eight vow upgrades, breakable urns, inscriptions, Mara’s guidance, a persistent shortcut and a final bell interaction.
- Two weapon styles, rechargeable healing and a three-verse area skill.
- Save/continue, pause, field guide, journal, audio/graphics settings, reduced motion and an optional gentler difficulty. Checkpoints and unlocks save automatically; Continue returns to the last flame rather than resuming a mid-swing position.
- A real autonomous pilot starts after **10 seconds without input on the title or its menus**, plays the same game through normal intents, and restarts after victory or death. Any keyboard, mouse, touch or gamepad input immediately returns to title and is consumed. Demo state never overwrites the player’s save. Player pause screens remain paused.
- Phones and touch tablets start in demonstration mode. Only the menu and frame counter overlay the game; there are no touch combat controls.

The optimized pilot completes the full route in approximately two minutes. A first human playthrough is intended to take longer through exploration, combat learning and retries; no human completion-time claim has been measured.

## Controls

The standard Gamepad API layout supports PS5-compatible controllers. Connect a controller, then press a button to let the browser discover it. Actual device discovery and vibration depend on the browser and OS.

| Action               | PS5-compatible pad                           | Keyboard / mouse         |
| -------------------- | -------------------------------------------- | ------------------------ |
| Move / orbit         | Left / right stick                           | WASD / drag on the world |
| Sprint               | Click L3 while moving; release stick to stop | Hold Shift               |
| Light / heavy strike | R1 / R2                                      | J or left click / K      |
| Guard / parry        | L1 / L2                                      | L or right click / F     |
| Roll / jump          | Circle / Cross                               | Space / V                |
| Heal / interact      | Square / Triangle                            | H / E                    |
| Lock / cycle target  | R3 / D-pad left                              | Tab / C                  |
| Switch blade         | D-pad right                                  | Q                        |
| Resonance            | L2 + R2                                      | R                        |
| Journal / pause      | D-pad up / Options                           | M / Escape               |
| Menu navigation      | Stick or D-pad, Cross, Circle                | Arrows, Enter, Escape    |

Read windups; gold floor arcs show reach. Heavy attacks consume more stamina and take longer to recover. A successful parry staggers a foe; a heavy strike exploits that opening. Ordinary enemies return when you rest. Defeated Vesper stays defeated.

## Verification and expansion

```bash
npm test                    # headless rules, storage, input, determinism, ten complete pilot runs
npm run check:engine        # exact upstream library hash
npm run verify              # tests + production build
npm run demo:prove          # standalone full gameplay completion proof
npm run test:browser        # headless UI flow; start npm run dev first
```

The browser checker accepts `TUNE_URL`, `TUNE_QA_OUT`, `TUNE_CHROMIUM`, and `TUNE_CDP`. The latter connects to an already-running headless browser, useful for measuring a Windows GPU from WSL. The default checker uses software WebGL2 for portable functional coverage, not GPU performance claims.

[Verification evidence](docs/VERIFICATION.md) records actual test scope, adapters and limitations. [The handoff](docs/HANDOFF.md) explains content authoring, the state model, debugging and expansion. [The engine evaluation](ENGINE-FEEDBACK.md) is separate from the source information below. [The original title draw](docs/TITLES.md) includes all 50 candidates and the cryptographic random selection method.

## Source information

- **Initial date:** 2026-10-16, the first prompt in this thread.
- **SOURCE:** Elden Ring (2022). Inspiration: deliberate combat, recovery after death, atmospheric exploration and meaningful shortcuts. Reference: [the official game page](https://en.bandainamcoent.eu/elden-ring/elden-ring).
- **GAME ENGINE:** [michaelcrosato/my-3dge](https://github.com/michaelcrosato/my-3dge), version `0.0.0`, lean distribution pinned to commit `ff439e25f23762908d0fae29391547c7ccc9d43c`. Uses three.js `0.182.0` and Rapier SIMD `0.21.0`. The unchanged vendored artifact and its SHA-256 are recorded in `engine-lock.json`.
- **Environment:** Local CLI workspace, Bash, Ubuntu 26.04.1 on WSL2/Linux x64; primary Node.js 22.23.3. Browser application, tested headlessly with Chromium, WebKit and Firefox as detailed in verification. The Windows host has an NVIDIA GeForce RTX 3060 Ti (8 GB); Windows Chrome provides the hardware WebGPU test path. Node.js 24.16.0 was used for that Windows browser driver.
- **Model and effort level:** OpenAI GPT-6, acting as Codex. The exact model variant and reasoning effort are not exposed by the session and are not asserted.

## License and credits

Original game code and procedural assets: MIT, see [LICENSE](LICENSE). Engine and bundled math attribution: [vendor/my3dge/LICENSE](vendor/my3dge/LICENSE). See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). No purchased or extracted assets, remote fonts or recorded music are required.
