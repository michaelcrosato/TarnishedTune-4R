# Working on Tarnished Tune

Read README.md, docs/HANDOFF.md and ENGINE-FEEDBACK.md. This is a separate game built on the pinned my-3dge lean distribution; upstream engine workspaces and their release workflow are not part of this repository.

- Keep `vendor/my3dge/my3dge.js` unchanged unless a required patch is documented and its hash updated. Game simulation imports the public library, not its private internals.
- Gameplay state lives in engine ECS components. Step at 60 Hz. No wall clock, DOM, storage, unseeded randomness or rendering result may decide game rules.
- Add content in src/sim/content.js and its procedural visual recipe in src/view/world.js. Keep collision geometry, interactions and visible landmarks aligned. The pilot must traverse new content through normal intents.
- Test logic first (`npm test`), then build. For UI changes use headless browser checks on reserved port 43187. Don't launch public tunnels unless the user asks.
- Check phones, tablets, wide screens and WebKit. Mobile is an autonomous showroom, with only menu and FPS overlay. Do not build touch combat controls.
- Screenshots and bulky test output go under /tmp, never in the repository. Inspect screenshots yourself.
- A physical DualSense and real iOS Safari are not available to automated tests. Report emulated controller and WebKit coverage accurately.
- Do not replace a full gameplay run with fixtures. Fixtures are for isolated failure/transition tests. The full pilot must win with the same rules as the player.
- Use `npm run check:engine` and `npm run verify` before committing. Document actual graphics adapter and measurement conditions with performance claims.
