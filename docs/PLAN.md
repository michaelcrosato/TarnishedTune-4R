# Tarnished Tune — The Hollow Belfry

One complete original third-person action RPG level, built from the pinned my-3dge lean library. The pilgrimage moves from the Kindled Court through the Processional, with an optional Mourning Garden, to the Hollow Belfry and the two-phase Bellkeeper. Recover three resonant verses and ring the silent bell after defeating its guardian.

## Completion contract

- Original procedural 3D art, articulated characters, attack/roll/hit/death animations, atmospheric lighting, particles and reactive audio.
- Camera-relative controller movement, camera orbit, lock-on/cycle, light combo, heavy attack, dodge with invulnerability, guard, timed parry, guard counter, heal, sprint, jump, resonant skill and weapon/stance switching.
- Melee, ranged and elite enemies; readable windups, stagger/poise, projectiles and boss phase transition.
- Traversable connected level, optional reward path, breakable objects, lore/NPC, checkpoint/rest, shortcut gate, death/currency recovery, upgrades, item collection, victory and replay.
- Save/continue, settings persistence, local storage failure recovery; pause/help/journal/settings screens with focus snapping and gamepad navigation.
- 10-second idle attract trigger; an actual AI pilot using normal intents; endless restart on victory/death; every physical input returns immediately to title; demo does not overwrite player saves. Mobile is a clean demo with only a menu button and performance meter.
- Headless rules tests, deterministic capture/restore, seeded bot completion, collision/navigation and progression coverage. Then headless browser checks, controller simulation, cross-engine/viewport screenshots and measured performance.
- Live FPS and frame time, automatic visual quality scaling; document exact benchmark adapter and never substitute software performance for hardware evidence.
- Public GitHub repository, CI, reproducible installation/build, source information in README and HTML, engine evaluation and expansion handoff.

## Architecture

`vendor/my3dge` is the unchanged, hash-checked engine library. It owns the scene registry, ECS, fixed simulation steps, portable math, seeded streams, physics queries, event trace and replay/capture/hash interfaces. `src/sim` extends these with game rules and declarative content. `src/view` is a presentation-only three.js scene; `src/platform` bridges controller, audio and durable storage. UI produces intents and never mutates simulation state. Render-rate and quality never change game rules.

The supplied engine's default presentation has no custom scene graph extension point. This game uses its public headless runtime with a custom renderer. WebGPU is preferred; the game's renderer also explicitly supports WebGL2 for browsers whose WebGPU implementation is unavailable, reporting that choice in settings and diagnostics. This game-specific extension is authorized by the request to modify and expand the supplied engine; the upstream artifact remains unchanged.
