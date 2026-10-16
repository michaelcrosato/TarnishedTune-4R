/** Behavioral proofs for combat, progression, collision, determinism and the complete AI pilgrimage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { createPilot } from '../src/sim/pilot.js';
import { ENEMIES, ITEMS, onGround, distance } from '../src/sim/content.js';
import { NAV } from '../src/sim/state.js';
const killed = () => ENEMIES.map((e) => ({ id: e.id, hp: 0 }));
async function fixture(player = {}, enemy = null, campaign = {}) {
  const g = await createGame(17, { qa: true });
  g.fixture({ player, enemies: killed(), campaign });
  if (enemy)
    g.fixture({
      enemies: [
        {
          id: 'watcher-1',
          hp: 78,
          maxHp: 78,
          active: true,
          state: 'recover',
          timer: 600,
          x: 32,
          z: 100,
          ...enemy,
        },
      ],
    });
  return g;
}
const steps = (g, n, intent = {}) => {
  for (let i = 0; i < n; i++) g.step(i === 0 ? intent : { ...intent, p: [] });
};
test('movement is fixed-step, bounded, and blocked by actual Rapier colliders', async () => {
  const g = await fixture({ x: 32, z: 107 });
  steps(g, 60, { move: [1, 0] });
  assert.ok(Math.abs(g.read().p.x - 36.3) < 0.001);
  g.fixture({ player: { x: 20, z: 48 } });
  steps(g, 90, { move: [1, 0] });
  assert.ok(g.read().p.x < 20.9);
  g.fixture({ player: { x: 32, z: 116 } });
  steps(g, 120, { move: [0, 1] });
  assert.ok(onGround(g.read().p.x, g.read().p.z));
  assert.ok(g.read().p.z < 117);
});
test('a light swing hits once, faces the target, and spends stamina', async () => {
  const g = await fixture({ x: 32, z: 102, yaw: Math.PI }, { x: 32, z: 100 });
  steps(g, 30, { p: ['light'] });
  assert.equal(g.read().enemies[0].hp, 53);
  assert.ok(g.read().p.stamina < 100);
  const behind = await fixture({ x: 32, z: 102, yaw: 0 }, { x: 32, z: 100 });
  steps(behind, 30, { p: ['light'] });
  assert.equal(behind.read().enemies[0].hp, 78);
});
test('insufficient stamina rejects attacks and idle restores it', async () => {
  const g = await fixture({ stamina: 0 });
  g.step({ p: ['heavy'] });
  assert.equal(g.read().p.state, 'idle');
  steps(g, 180);
  assert.equal(g.read().p.stamina, 100);
});
test('roll grants invulnerability but recovers into vulnerable idle', async () => {
  const g = await fixture(
    { x: 32, z: 102, yaw: Math.PI },
    { x: 32, z: 100, yaw: 0, state: 'strike', timer: 20, hit: false },
  );
  g.step({ p: ['roll'], move: [1, 0] });
  assert.equal(g.read().p.hp, 120);
  assert.ok(g.read().p.invulnerable > 0);
  steps(g, 40);
  assert.equal(g.read().p.state, 'idle');
  assert.equal(g.read().p.invulnerable, 0);
});
test('timed directional parry opens a heavy riposte', async () => {
  const g = await fixture(
    { x: 32, z: 102, yaw: Math.PI },
    { x: 32, z: 100, yaw: 0, state: 'strike', timer: 20, hit: false },
  );
  g.step({ p: ['parry'] });
  assert.equal(g.read().c.stats.parries, 1);
  assert.equal(g.read().p.hp, 120);
  assert.equal(g.read().enemies[0].state, 'stagger');
  steps(g, 31);
  steps(g, 45, { p: ['heavy'] });
  assert.equal(g.read().enemies[0].hp, 0);
});
test('guard prevents health damage at the cost of stamina and enables a counter', async () => {
  const g = await fixture(
    { x: 32, z: 102, yaw: Math.PI },
    { x: 32, z: 100, yaw: 0, state: 'strike', timer: 20, hit: false },
  );
  g.step({ b: ['guard'] });
  assert.equal(g.read().p.hp, 120);
  assert.ok(g.read().p.stamina < 100);
  assert.ok(g.read().p.counter > 0);
  assert.equal(g.read().c.stats.blocks, 1);
});
test('healing consumes one charge, heals after commitment and can be interrupted', async () => {
  const g = await fixture({ hp: 30 });
  g.step({ p: ['heal'] });
  assert.equal(g.read().p.flasks, 2);
  assert.equal(g.read().p.hp, 30);
  steps(g, 43);
  assert.equal(g.read().p.hp, 95);
  const danger = await fixture(
    { x: 32, z: 102, hp: 50 },
    { x: 32, z: 100, yaw: 0, state: 'strike', timer: 20, hit: false },
  );
  danger.step({ p: ['heal'] });
  steps(danger, 80);
  assert.equal(danger.read().p.hp, 32);
  assert.equal(danger.read().p.flasks, 2);
});
test('death drops echoes, retry restores the checkpoint, and recovery reclaims the drop', async () => {
  const g = await fixture(
    { x: 32, z: 102, hp: 1, echoes: 123 },
    { x: 32, z: 100, yaw: 0, state: 'strike', timer: 20, hit: false },
  );
  g.step();
  assert.equal(g.read().c.status, 'dead');
  assert.equal(g.read().p.echoes, 0);
  assert.equal(g.read().c.drop.echoes, 123);
  g.step({ p: ['retry'] });
  assert.equal(g.read().p.hp, 120);
  assert.equal(g.read().c.status, 'playing');
  g.fixture({ player: { x: 32, z: 102 }, enemies: killed() });
  g.step();
  assert.equal(g.read().p.echoes, 123);
  assert.equal(g.read().c.drop, null);
});
test('a second death replaces unrecovered echoes', async () => {
  const g = await fixture(
    { x: 32, z: 102, hp: 1, echoes: 10 },
    { x: 32, z: 100, yaw: 0, state: 'strike', timer: 20, hit: false },
    { drop: { x: 10, z: 60, echoes: 100 } },
  );
  g.step();
  assert.equal(g.read().c.drop.echoes, 10);
});
test('shrine upgrades spend exact currency, persist and respawn enemies', async () => {
  const g = await fixture({ x: 29, z: 106, hp: 40, flasks: 0, echoes: 200 });
  g.step({ p: ['interact'] });
  assert.equal(g.read().c.resting, true);
  assert.equal(g.read().p.flasks, 3);
  assert.equal(g.read().enemies[0].hp, 78);
  g.step({ 'game:upgrade': true });
  assert.equal(g.read().p.level, 1);
  assert.equal(g.read().p.echoes, 120);
  assert.equal(g.read().p.maxHp, 134);
  g.step({ 'game:upgrade': true });
  assert.equal(g.read().p.level, 1);
  const saved = g.save(),
    other = await createGame();
  other.load(saved);
  assert.equal(other.read().p.level, 1);
  assert.equal(other.read().p.echoes, 120);
  assert.equal(other.read().p.hp, 134);
});
test('collectibles cannot be duplicated and verses unlock Resonance', async () => {
  const g = await fixture();
  for (const item of ITEMS.filter((i) => i.kind === 'verse')) {
    g.fixture({ player: { x: item.x, z: item.z } });
    g.step({ p: ['interact'] });
    g.step({ p: ['interact'] });
  }
  assert.equal(g.read().c.verses.length, 3);
  g.step({ p: ['skill'] });
  steps(g, 40);
  assert.equal(g.read().c.stats.skills, 1);
  assert.ok(g.read().p.skill > 0);
});
test('shortcut is only opened from its garden side', async () => {
  const g = await fixture({ x: 24, z: 94 });
  g.step({ p: ['interact'] });
  assert.equal(g.read().c.shortcut, false);
  g.fixture({ player: { x: 19.2, z: 94 } });
  g.step({ p: ['interact'] });
  assert.equal(g.read().c.shortcut, true);
});
test('boss seal needs verses; boss changes phase and bell is required to win', async () => {
  const g = await fixture({ x: 32, z: 41 });
  g.step({ p: ['interact'] });
  assert.equal(g.read().c.bossStarted, false);
  g.fixture({
    campaign: { verses: ['verse-court', 'verse-nave'] },
    enemies: [{ id: 'bellkeeper', hp: 300, active: false }],
  });
  g.step({ p: ['interact'] });
  assert.equal(g.read().c.bossStarted, true);
  assert.equal(g.read().c.phase, 2);
  g.fixture({ campaign: { bossDead: true, bossStarted: false }, player: { x: 32, z: 7 } });
  assert.equal(g.read().c.status, 'playing');
  g.step({ p: ['interact'] });
  assert.equal(g.read().c.status, 'won');
});
test('all content anchors are grounded and navigable from the main path', () => {
  for (const point of [...ITEMS, ...ENEMIES]) {
    assert.ok(onGround(point.x, point.z), point.id);
    const route = NAV.findPath({ x: 32, z: 107 }, point);
    assert.ok(route?.length, `${point.id} is unreachable`);
  }
});
test('captures restore exact simulation state and continue deterministically', async () => {
  const g = await createGame(71);
  steps(g, 80, { move: [0, -1] });
  const capture = g.engine.capture();
  steps(g, 180, { move: [0.6, -0.8], p: ['light'] });
  const hash = g.engine.hash();
  g.engine.restore(capture);
  steps(g, 180, { move: [0.6, -0.8], p: ['light'] });
  assert.equal(g.engine.hash(), hash);
});
test('QA fixture boundary is disabled in a normal game', async () => {
  const g = await createGame();
  g.step({ 'game:fixture': JSON.stringify({ player: { hp: 999 } }) });
  assert.equal(g.read().p.hp, 120);
  assert.throws(() => g.fixture({ player: { hp: 999 } }));
});
test('the normal pilot reaches the ending on ten seeds, exercising the authored systems', async () => {
  for (let seed = 1; seed <= 10; seed++) {
    const g = await createGame(seed),
      pilot = createPilot();
    let n = 0;
    while (g.read().c.status !== 'won' && n++ < 15000) g.step(pilot.next(g.read()));
    const { p, c } = g.read();
    assert.equal(c.status, 'won', `seed ${seed}, pilot stage ${pilot.stage}`);
    assert.equal(c.verses.length, 3);
    assert.equal(c.shortcut, true);
    assert.equal(c.bossDead, true);
    assert.equal(c.phase, 2);
    assert.ok(p.level >= 2);
    assert.ok(p.weapons.includes('greatsword'));
    assert.equal(p.maxFlasks, 4);
    assert.ok(c.stats.parries > 0);
    assert.ok(c.stats.heals > 0);
    assert.ok(c.stats.skills > 0);
    assert.ok(c.stats.rolls > 0);
  }
});
test('repeated demo resets restore the initial engine, recording and physics without new runtimes', async () => {
  const g = await createGame(12),
    original = g.engine,
    hash = g.engine.hash();
  for (let n = 0; n < 30; n++) {
    steps(g, 60, { move: [0, -1], p: ['light'] });
    g.reset();
    assert.equal(g.engine, original);
    assert.equal(g.engine.hash(), hash);
    assert.equal(g.engine.input.record().inputs.length, 0);
  }
});
