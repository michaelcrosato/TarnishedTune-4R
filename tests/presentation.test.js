/** Kinematic and art-pipeline checks run without a browser, graphics device, server or simulation mutations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import { createMaterials, PALETTE } from '../src/view/materials.js';
import { character } from '../src/view/character.js';
import { sampleMotion, gaitParameters } from '../src/view/motion.js';
import { buildWorld } from '../src/view/world.js';
import { WEAPONS, ARCHETYPES } from '../src/sim/content.js';
const m = createMaterials({ textures: false });
const player = (extra = {}) => ({
  x: 32,
  z: 107,
  y: 0,
  yaw: Math.PI,
  hp: 120,
  state: 'idle',
  weapon: 'sword',
  elapsed: 0,
  combo: 0,
  ...extra,
});
test('the palette uses engine banded lighting and pixel-width outlines', () => {
  for (const key of Object.keys(PALETTE)) assert.equal(m[key].type, 'MeshBandedToonNodeMaterial', key);
  assert.deepEqual(m.styles.toon.values(), { bands: 3, rim: 0.12 });
  const rig = character(m);
  assert.ok(rig.report().outlines > 20);
  assert.ok(
    rig.root.getObjectByName('articulated-cape').material.color.equals(m.cloth.color),
    'Cloned toon cloth retains its palette color',
  );
  assert.ok(rig.joints.foreL && rig.joints.shinR && rig.joints.wristR);
});
test('stance feet stay on the ground and planted in world space during steady travel', () => {
  const rig = character(m);
  let prior = null,
    measured = 0;
  for (let i = 0; i < 180; i++) {
    rig.animate(player({ z: 107 - i * 0.05 }), i / 60, 1 / 60, i);
    const report = rig.report(),
      phase = report.phase % 1;
    if (
      i > 60 &&
      phase > 0.05 &&
      phase < gaitParameters(report.speed).stance - 0.04 &&
      prior &&
      prior.phase < phase
    ) {
      assert.ok(Math.abs(report.feet[0][1] - 0.1) < 0.015, 'planted ankle height');
      assert.ok(Math.abs(report.feet[0][2] - prior.z) < 0.012, 'foot must not slide with the body');
      measured++;
    }
    assert.ok(
      report.feet.every((p) => p[1] > 0.08),
      'soles never penetrate the floor',
    );
    prior = { phase, z: report.feet[0][2] };
  }
  assert.ok(measured > 35);
  rig.dispose();
});
test('strafing feet hold their direction between simulation ticks', () => {
  const rig = character(m);
  for (let i = 0; i < 80; i++) rig.animate(player({ x: 32 + i * 0.05 }), i / 60, 1 / 60, i);
  const first = rig.report().feet;
  rig.animate(player({ x: 32 + 79 * 0.05 }), 79 / 60 + 0.004, 1 / 240, 79);
  const second = rig.report().feet;
  assert.ok(Math.abs(first[0][0] - second[0][0]) < 0.005);
  assert.ok(Math.abs(first[0][2] - second[0][2]) < 0.005);
});
test('attack accents coincide with the sim hit windows and combo directions differ', () => {
  for (const weapon of Object.keys(WEAPONS))
    for (const attack of ['light', 'heavy']) {
      const move = WEAPONS[weapon][attack];
      for (const elapsed of [
        0,
        move.windup - 1,
        move.windup,
        move.windup + move.active - 1,
        move.windup + move.active,
        move.windup + move.active + move.recovery,
      ]) {
        const pose = sampleMotion(player({ weapon, attack, state: 'attack', elapsed }), {
          time: 0,
          phase: 0,
          speed: 0,
          age: 0,
        });
        assert.equal(pose.trail, elapsed >= move.windup && elapsed < move.windup + move.active ? 1 : 0);
      }
    }
  const a = sampleMotion(player({ state: 'attack', attack: 'light', elapsed: 10, combo: 0 }), {
    time: 0,
    phase: 0,
    speed: 0,
    age: 0,
  });
  const b = sampleMotion(player({ state: 'attack', attack: 'light', elapsed: 10, combo: 1 }), {
    time: 0,
    phase: 0,
    speed: 0,
    age: 0,
  });
  assert.ok(a.chest[1] * b.chest[1] < 0);
});
test('all player and enemy states produce finite articulated transforms without changing their input', () => {
  const states = ['idle', 'attack', 'roll', 'parry', 'heal', 'skill', 'hurt', 'stagger', 'dead'];
  for (const kind of ['player', 'hollow', 'knight', 'cantor', 'boss']) {
    const rig = character(m, kind);
    const list =
      kind === 'player'
        ? states
        : ['idle', 'chase', 'windup', 'strike', 'recover', 'stagger', 'phase', 'dead'];
    for (const state of list)
      for (const elapsed of [0, 7, 16, 30, 60]) {
        const unit = Object.freeze(
          player({
            kind,
            state,
            elapsed,
            hp: state === 'dead' ? 0 : 120,
            attack: kind === 'player' ? 'heavy' : 2,
            timer: Math.max(0, (ARCHETYPES[kind]?.windup || 60) - elapsed),
            phase: 2,
            dx: 1,
            dz: 0,
          }),
        );
        rig.animate(unit, elapsed / 60, 1 / 60, elapsed);
        rig.root.updateMatrixWorld(true);
        rig.root.traverse((n) =>
          assert.ok(n.matrixWorld.elements.every(Number.isFinite), `${kind} ${state} ${n.name}`),
        );
      }
    rig.dispose();
  }
});
test('the level has regional details while geometry remains finite and batched', () => {
  const world = buildWorld(m);
  assert.equal(world.details.counts.banners, 10);
  assert.equal(world.details.counts.statues, 6);
  assert.ok(world.details.counts.ferns >= 40);
  assert.ok(world.details.counts.flowers >= 70);
  assert.equal(world.details.counts.rosettes, 2);
  let triangles = 0;
  world.static.traverse((n) => {
    if (n.isMesh) {
      triangles += n.geometry.attributes.position.count / 3;
      assert.ok([...n.geometry.attributes.position.array].every(Number.isFinite));
    }
  });
  assert.ok(world.static.children.length < 35);
  assert.ok(triangles < 200000);
  world.details.update(3);
  world.details.update(3, true);
  const banners = [];
  world.dynamic.traverse((n) => {
    if (n.material === m.banner) banners.push(n);
  });
  const frozen = banners.map((n) => Array.from(n.geometry.attributes.position.array));
  world.details.update(12, true);
  assert.deepEqual(
    banners.map((n) => Array.from(n.geometry.attributes.position.array)),
    frozen,
    'Reduced motion freezes all decorative banner axes',
  );
});
test('starting locomotion eases the feet out of the resting pose', () => {
  const rig = character(m);
  rig.animate(player(), 0, 1 / 60, 0);
  const before = rig.report().feet;
  rig.animate(player({ z: 106.95 }), 1 / 60, 1 / 60, 1);
  const after = rig.report().feet;
  assert.ok(after.every((foot, i) => Math.hypot(...foot.map((v, k) => v - before[i][k])) < 0.14));
  rig.dispose();
});
test('the death fall finishes even when the death screen stops simulation ticks', () => {
  const rig = character(m);
  rig.animate(player(), 0, 1 / 60, 0);
  const corpse = Object.freeze(player({ hp: 0, state: 'dead' }));
  for (let i = 1; i < 90; i++) rig.animate(corpse, i / 60, 1 / 60, 1);
  assert.ok(rig.report().age > 1);
  assert.ok(rig.joints.head.getWorldPosition(new T.Vector3()).y < 0.65);
  rig.dispose();
});
test('jog and sprint use a natural cadence while retaining distance-matched stance speed', () => {
  for (const speed of [4.3, 6.7]) {
    const { stride, stance } = gaitParameters(speed);
    const cyclesPerSecond = speed / (stride / stance);
    assert.ok(
      cyclesPerSecond > 1.2 && cyclesPerSecond < 2.5,
      'Avoid rapid shuffling at game movement speeds',
    );
  }
});
