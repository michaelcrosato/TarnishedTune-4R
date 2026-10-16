/** Non-rendering proofs of attract timing, save isolation, storage failures and the PS5 standard mapping. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Flow } from '../src/platform/flow.js';
import { createStorage, validSave, SAVE_KEY } from '../src/platform/storage.js';
import { gamepadState, cameraMove } from '../src/platform/input.js';
import { createGame } from '../src/sim/game.js';
test('attract enters at 10 seconds, every input consumes exit, and it can repeat indefinitely', () => {
  const f = new Flow();
  for (let loop = 0; loop < 100; loop++) {
    assert.equal(f.step(9.999), null);
    assert.equal(f.mode, 'title');
    assert.equal(f.step(0.002), 'demo');
    assert.equal(f.mode, 'demo');
    assert.equal(f.physical(), true);
    assert.equal(f.mode, 'title');
    assert.equal(f.idle, 0);
  }
});
test('any title activity resets the idle interval; pause/play cannot launch attract', () => {
  const f = new Flow();
  f.step(9);
  f.physical();
  f.step(9);
  assert.equal(f.mode, 'title');
  f.play();
  f.step(60);
  assert.equal(f.mode, 'play');
});
test('terminal demo state has a four-second reset interval', () => {
  const f = new Flow();
  f.demo();
  assert.equal(f.ended(3.99), false);
  assert.equal(f.ended(0.02), true);
  assert.equal(f.endWait, 0);
});
test('corrupt and denied storage are recoverable', () => {
  const store = createStorage({
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('denied');
    },
  });
  assert.equal(store.load(), null);
  assert.equal(store.settings().quality, 'auto');
  assert.equal(store.save({}), false);
  assert.match(store.error, /could not be saved/);
  assert.equal(createStorage({ getItem: () => '{invalid' }).load(), null);
  assert.equal(validSave({ version: 42 }), false);
});
test('save/continue round-trips a checkpoint without sharing demo state', async () => {
  const map = new Map(),
    store = createStorage({ getItem: (k) => map.get(k) || null, setItem: (k, v) => map.set(k, v) }),
    player = await createGame();
  store.save(player.save());
  const before = map.get(SAVE_KEY);
  const demo = await createGame(77);
  for (let i = 0; i < 100; i++) demo.step({ move: [0, -1] });
  assert.equal(map.get(SAVE_KEY), before);
  const resumed = await createGame();
  resumed.load(store.load());
  assert.equal(resumed.read().p.hp, 120);
  assert.equal(resumed.read().c.checkpoint, 'kindle');
});
test('PS5 standard layout supports analog sticks, light/heavy, jump, guard and Resonance', () => {
  const pad = {
    axes: [0.7, -0.6, 0.3, 0.1],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
  };
  pad.buttons[5] = { pressed: true, value: 1 };
  let s = gamepadState(pad);
  assert.ok(s.held.includes('light'));
  assert.ok(s.move[0] > 0 && s.move[1] > 0);
  assert.equal(s.look[1], 0);
  pad.buttons[6] = { pressed: true, value: 1 };
  pad.buttons[7] = { pressed: true, value: 1 };
  s = gamepadState(pad);
  assert.ok(s.held.includes('skill'));
  assert.ok(!s.held.includes('parry'));
  assert.ok(!s.held.includes('heavy'));
  pad.buttons[0] = { pressed: true, value: 1 };
  assert.ok(gamepadState(pad).held.includes('jump'));
});

test('camera-relative right agrees with the displayed view in every cardinal heading', () => {
  const north = cameraMove(1, 0, Math.PI);
  assert.ok(north[0] > 0.99);
  assert.ok(Math.abs(north[1]) < 1e-9);
  const south = cameraMove(1, 0, 0);
  assert.equal(south[0], -1);
  const forward = cameraMove(0, 1, Math.PI);
  assert.ok(forward[1] < -0.99);
  assert.ok(Math.hypot(...cameraMove(1, 1, 1)) <= 1.000001);
});
