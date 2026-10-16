# my-3dge evaluation for Tarnished Tune

This evaluation is separate from the source/reference information in README.md and index.html.

## Foundation actually used

The vendored lean library is byte-for-byte upstream commit `ff439e25f23762908d0fae29391547c7ccc9d43c`, verified by SHA-256. It is the running simulation, not merely an attribution or unused dependency.

Used public APIs: `createHeadless`, `defineScene`, `defineComponent`, `defineSettings`, engine ECS world operations and events, `physicsOf` (fixed bodies, overlap and raycast), `compileLevel`, `NavGrid`, `inCone`, `pressed`, `held`, `Rng`, `defineSfx`, `renderSfx`, plus inspector stepping, input recording, state hashing and capture/restore. Core deterministic rules pass in Node, and the same scene runs in the browser.

## What worked well

- Headless initialization and public scene/component APIs allowed gameplay to be implemented and completed without a browser.
- The engine owns replayable, hashable state; capture/restore tests cover actual ongoing combat and movement.
- Rapier and level navigation are exposed without an application having to manage WASM loading.
- The lean artifact can be commit-pinned and served locally. The game requires no runtime CDN.
- Synthesis definitions produce reusable audio samples without external audio files.

## Gaps and game-specific extensions

1. **Custom presentation access.** `createEngine` owns its view but does not expose a supported hook to insert a full original scene graph. This game uses `createHeadless` as its runtime, and a separate three.js presentation adapter. A public renderer/view injection point would avoid custom loop wiring for games with distinct art direction.
2. **Controller-first application shell.** The game adds title/pause/settings/journal screens, focus snapping, input consumption on attract exit and a standard PS5 gamepad mapping. These use the engine’s ordinary intent boundary. The engine’s default touch UI is intentionally unused because the brief specifies a clean mobile showroom.
3. **Persistence.** The engine has no durable game store. The adapter owns versioned local checkpoint saves, schema validation, storage-failure reporting and strict separation of demo/player saves.
4. **Null in input payloads.** A checkpoint containing `drop: null` failed with `INPUT_BAD_INTENTS: game:load.drop is null inside a value`. The game carries serialized checkpoint JSON through its custom intent and parses it in the scene. Accepting JSON null inside nested custom values would make this less surprising.
5. **Scene dev actions.** The lean inspector exposes `scene.dump` but not a direct `scene.act`. QA fixtures are therefore recorded custom intents behind a scene setting, disabled for normal play. A public dev-action inspector entry would simplify test fixtures.
6. **Cross-browser rendering.** Upstream is WebGPU-only. The user explicitly authorized engine extensions and required WebKit/mobile checks. The game adds an explicit WebGL2 presentation backend while leaving the engine and CPU simulation unchanged. It reports its backend rather than silently claiming WebGPU. A WebGPU device loss in Linux Chromium/WSL motivated presentation recovery; the Windows NVIDIA path completed the full benchmark cleanly.
7. **Frame statistics.** The game adds a real FPS/frame-time overlay requested by the brief. It samples render intervals independently of the fixed-step accumulator, and automatically lowers visual resolution when needed.

8. **Firefox module initialization.** three.js r182 reads `self.GPUShaderStage` during module evaluation even when only WebGL2 will be used. Firefox without WebGPU does not expose that enum, causing a startup exception. `src/bootstrap.js` supplies the standard three enum values before importing the application; it does not emulate or claim WebGPU support. All five Firefox desktop viewports then rendered without errors.

## Cel-shaded art pass

The follow-up art pass additionally uses public `defineMaterial`, `createStyleSet({style:'toon', toon:{bands:3,rim:0.12}})`, `createOutline` and `twoBone` APIs. These supply banded/shadow-aware lighting, constant-pixel silhouette lines and foot/support-hand IK without changing the lean artifact.

One concrete material issue surfaced: cloning `MeshBandedToonNodeMaterial` with inherited `clone()` produces a white color instead of retaining the original palette color. The game copies the source color and toon settings explicitly for the cape and trim. A regression assertion checks the cloak color. An explicit public clone helper or complete `copy()` override would remove that workaround.

## Local engine patches

None. All extensions are game-side adapters or systems. The upstream library and license remain unchanged.

## Expansion limits

The game provides the systems for an action-RPG campaign, not a production network service, cinematic toolchain or streamed open world. Adding levels requires content, interaction anchors and procedural art recipes. The supplied engine’s rigid, reproducible CPU boundary remains suitable for extending those systems.
