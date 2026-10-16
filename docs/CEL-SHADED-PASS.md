# Cel-shaded art and animation pass

The requested scope is a visible cel-shaded rendering style, materially improved animation, and richer level detail. The game remains the same playable Hollow Belfry campaign.

## Shading

All ordinary world and character materials now use my-3dge's `createStyleSet` toon lighting: three diffuse bands, banded shadow response, a small rim, cool blue stone/shadows and warm gold highlights. Characters receive pixel-width ink silhouettes through `createOutline`; static architecture receives merged edge strokes. Sparse painted stone cracks replace the repeated miniature brick texture. Glow effects remain emissive.

These are actual lighting/material changes, rather than a screen color filter. The same shader graph is used through WebGPU and the WebGL2 compatibility backend. Shader warm-up happens while the loading screen is visible.

## Animation

The new rigs have separate shoulder, elbow, wrist, hip, knee and ankle joints. Travel distance drives the gait phase. The engine's two-bone solver keeps the stance feet planted, including strafing and frames between simulation ticks. Movement weight eases into and out of locomotion. A bent-knee sprint, torso counter-rotation and cloth drag distinguish running from walking.

Each light combo has a different cut direction; the third is a thrust. Heavy attacks use a supporting-hand solve and an overhead anticipation. Blade orientation and narrow trails follow the simulation's windup/active/recovery intervals. Guard and parry have distinct shield poses; healing raises a visible phial. Rolling uses a tucked pose around the body’s center. Death eases into a settled fall and finishes even after the death screen stops simulation ticks. Vesper gains deliberate attacks and a full outstretched phase transition.

Capes have shaped hems and gold trim, speed-dependent drag and flutter. Crests, ten hanging banners and shrine flames also move. Reduced-motion mode suppresses decorative wind motion.

## Level detail

The pass adds ten heraldic banners, two stained-glass rosettes, six statues, four suspended lanterns, fluting and medallions on existing columns, four ivy runs, 44 fern clusters and 90 flowers. Shrines gain votive candles and etched rings; the arena gains a radial bronze score; graves gain inscriptions. Grass is formed from tapered blades rather than thin poles. Golden trees gain fine twig silhouettes. Off-path masonry and statuary sit on supporting rock stacks.

Large additions stay off the traversable surface or inside existing collision volumes. The original path, encounters, progression and controls remain playable through the normal pilot.

## Verification

- `npm run verify`: 34 tests pass and the production build succeeds. Nine presentation tests cover the actual material type/color, feet, gait cadence, action windows, all articulated states, start blending, death settling and bounded decoration geometry.
- All ten normal-rules pilot seeds reach the ending. Seed 17 still finishes at tick 6,473 with the exact pre-art-pass hash `8e043b0a823aa98e`.
- The production build passes all 13 browser input/UI/persistence/attract checks, with no runtime errors.
- All 24 viewport/engine combinations pass, including WebKit phones/tablets, Firefox and ultrawide desktops. Screenshots were visually inspected.
- Nineteen isolated action poses were rendered and inspected using the real materials and rigs. A startup blend and a too-fast gait cadence were corrected during review; normal jogging now uses about 1.65 cycles/second and sprinting about 1.91, with planted-foot speed still matched to distance travelled.
- The final full-quality Windows Chrome/WebGPU benchmark on the RTX 3060 Ti rendered 7,602 frames over 126.716 seconds at 1920×1080: **59.99 average FPS**, with **16.8 ms p95** frame time. It includes the boss's second phase and an autonomous restart; no runtime errors occurred.
- The vendored engine SHA-256 remains unchanged. `npm run check:engine`, formatting and whitespace checks pass.

WebKit coverage is engine/profile emulation, not a physical iPhone. Gamepad tests use standard API values. The GPU benchmark is separate from Linux software-rendered browser coverage.

The retained evidence summary is `docs/cel-verification.json`. Screenshots and detailed reports are kept outside the repository in `/tmp/tarnished-tune-cel/`. The art review uses the real rig and material modules, with separate normal-rules gameplay completion checks.

Primary implementation references: the pinned [my-3dge toon pipeline](https://github.com/michaelcrosato/my-3dge/blob/ff439e25f23762908d0fae29391547c7ccc9d43c/engine/gfx/materials/toon.ts), its [outline service](https://github.com/michaelcrosato/my-3dge/blob/ff439e25f23762908d0fae29391547c7ccc9d43c/engine/gfx/materials/outline.ts), and [three.js's WebGPU toon example](https://threejs.org/examples/webgpu_materials_toon.html). The engine artifact remains unchanged.
