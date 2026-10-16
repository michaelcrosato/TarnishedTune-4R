# Verification — 16 October 2026

The tested story is: title/controller input → fixed-step my-3dge simulation → rendered gameplay and audio → persisted checkpoint → Continue, with an isolated autonomous showcase that reaches the ending and repeats.

## Results

| Requirement                              | Evidence                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned supplied engine is the foundation | `npm run check:engine`: upstream SHA-256 matches; real scene, ECS, Rapier, navigation, hit cones, synthesis and capture/restore APIs are imported and executed                                          |
| Complete original level                  | Ten normal-rules AI runs reach the final bell after the court, nave, optional garden, checkpoint, shortcut and two-phase boss; each finishes in 6,473 simulation ticks                                  |
| Combat and resources                     | Headless behavioral tests cover directional single-hit strikes, stamina gating/regeneration, invulnerability, parries/ripostes, guard/counter, delayed/interrupted healing, death and recovery          |
| Progression and inventory                | Tests cover shrine respawn, exact upgrade costs, save/continue, unique collectibles, verse/skill unlocks, one-way shortcut activation, fog seal and final bell                                          |
| Reproducible architecture                | Exact engine hash after capture/restore and repeated intents; all content anchors pass navigation checks; normal play rejects QA fixtures                                                               |
| Endless attract mode                     | 100 title/idle/interrupt cycles in a state-machine test; real browser enters after 10 seconds, AI completes and restarts; 30 engine snapshot resets return to the same state and empty replay history   |
| Demo save isolation                      | Browser compares the exact saved JSON before/after demo; headless storage-isolation test also passes                                                                                                    |
| Controller-first UI                      | Browser checks focus navigation, standard PS5 Cross confirmation, stick-based demo interruption, settings, pause, checkpoint menus, retry and ending; keyboard uses the same action model               |
| Phone/tablet showroom                    | Screenshots show only game, menu icon and FPS; no touch combat overlays                                                                                                                                 |
| Browser/viewport coverage                | 24 viewport/engine combinations, with the five initially failing Firefox cases repaired and rerun cleanly; screenshots visually inspected                                                               |
| Actual GPU performance                   | Headless Windows Chrome, NVIDIA/Ampere WebGPU on host RTX 3060 Ti, 1920×1080, full quality: 7,631 measured frames over 127.176 seconds, **60.003 average FPS**, **16.666 ms mean**, **16.8 ms p95/p99** |
| Full-loop performance scope              | Samples include the garden, shrine, boss phase two and a second autonomous cycle; no page/console errors in the benchmark                                                                               |
| Renderer recovery                        | Fault-injected device destruction plus the production device-loss callback transitions to WebGL2, pauses play, retains 120 HP and renders the pause scene without JS errors                             |
| Runtime packaging                        | Production Vite build succeeds with all assets local; no runtime API, credentials or CDN dependency                                                                                                     |
| Source and handoff                       | README, HTML/About screen, title draw, licenses, engine lock, separate evaluation, architecture handoff and CI workflow are included                                                                    |

`npm test`: **25 passing tests**, including ten complete normal-rules pilgrimages inside the full-route test. `npm run build` and the engine integrity check pass. The browser suite records **13 complete UI/input/persistence/attract checks**, all passing with no page or console errors.

## Viewport matrix

Phones: iPhone SE (375×667), iPhone 17 Pro (402×681), Pro Max (440×763), landscape (756×352), Pixel 10 (360×732). Foldable: Galaxy Z Fold 7 open (984×1016). Tablets: iPad Mini (768×1024), iPad Pro landscape (1194×834), Galaxy Tab S9 (640×1024).

Desktop sizes, each in Chromium, WebKit and Firefox: 1024×768, 1366×768, 1440×900, 1920×1080 and 2560×1080. Reports contain no horizontal overflow, failed requests or runtime errors after the Firefox repair. The combined visual contact sheet was inspected along with full-size title, gameplay, mobile, tablet, pause, victory and recovery captures.

## Local evidence

The machine’s toolkit writes screenshots outside the repository, as requested:

- `/tmp/tarnished-tune-qa/hardware-benchmark.json` — external requestAnimationFrame measurement and five campaign checkpoints.
- `/tmp/tarnished-tune-qa/browser-check.json` — end-to-end browser assertions and adapter/audio diagnostics.
- `/tmp/tarnished-tune-qa/matrix/report.json` — the initial 24-case matrix.
- `/tmp/tarnished-tune-qa/firefox-fixed/report.json` — all five Firefox cases after the compatibility fix.
- `/tmp/tarnished-tune-qa/matrix-reviewed.png` — combined, repaired visual matrix.
- `/tmp/tarnished-tune-qa/recovery.json` — fault-injected graphics recovery results.
- `docs/verification-summary.json` — portable summary retained in the repository.

Reproduce the logical and build checks with `npm run verify`. Run `npm run test:browser` against a running local server, or set `TUNE_CDP` to a headless hardware browser. Run `viewport-matrix http://127.0.0.1:43187/ --dpr1 -o /tmp/your-review` for a fresh viewport sweep. No public tunnel was created and no headed browser was required.

## Practical limits

WebKit with iPhone/iPad profiles is engine/profile emulation, not real iOS Safari. PS5 input was exercised with standard Gamepad API values; a physical DualSense, its vibration and audible speaker/headphone quality were not verified. Browser audio begins after a permitted user gesture; a never-touched kiosk can remain silent under autoplay policy.

Software-rendered Linux browsers are used for compatibility and screenshots and may run below 25 FPS. The hardware target was measured separately on the actual RTX 3060 Ti. The recorded 1080p performance does not claim every resolution, device, driver or concurrent workload will match it. The adaptive quality setting reduces visual cost independently of simulation rules.

The optimized pilot’s duration is not a measured human playthrough duration. The slice is a single original authored level; it does not include multiplayer or an open-world streaming service.
