/** Headless end-to-end game checks. Start `npm run dev` on 43187 first; optional TUNE_CDP uses an existing headless browser. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const url = process.env.TUNE_URL || 'http://127.0.0.1:43187';
const out = process.env.TUNE_QA_OUT || '/tmp/tarnished-tune-qa';
mkdirSync(out, { recursive: true });
let executablePath = process.env.TUNE_CHROMIUM;
if (!process.env.TUNE_CDP && !executablePath && !existsSync(chromium.executablePath())) {
  const cache = path.join(homedir(), '.cache/ms-playwright');
  const dir = readdirSync(cache).find((v) => /^chromium-\d+$/.test(v));
  executablePath = path.join(cache, dir, 'chrome-linux64/chrome');
}
const browser = process.env.TUNE_CDP
  ? await chromium.connectOverCDP(process.env.TUNE_CDP)
  : await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
  page = await context.newPage();
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const ready = () => page.waitForFunction(() => window.__tune?.ready, null, { timeout: 60000 });
const mode = (m) => page.waitForFunction((m) => __tune.mode === m, m, { timeout: 15000 });
const screen = (s) => page.waitForFunction((s) => __tune.screen === s, s, { timeout: 15000 });
const click = (name) => page.getByRole('button', { name, exact: true }).click({ timeout: 10000 });
const fixture = (args) => page.evaluate((a) => __tune.fixture(a), args);
const snap = () => page.evaluate(() => __tune.state());
function check(name) {
  checks.push(name);
  console.log('PASS', name);
}
try {
  await page.goto(`${url}/?qa${process.env.TUNE_CDP ? '' : '&webgl'}`);
  await ready();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await screen('guide');
  assert.ok(await page.getByText('Listen. Commit. Endure.').isVisible());
  await page.keyboard.press('Escape');
  await screen('title');
  await page.keyboard.press('Enter');
  await mode('play');
  check('keyboard focus navigation, guide, and title-to-game entry');
  const start = (await snap()).p.z;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  assert.ok((await snap()).p.z < start - 1);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(180);
  assert.ok((await snap()).c.stats.attacks > 0);
  check('camera-relative movement and attack inputs reach the simulation');
  await page.keyboard.press('Escape');
  await screen('pause');
  const tick = (await snap()).c.tick;
  await page.waitForTimeout(350);
  assert.equal((await snap()).c.tick, tick);
  check('pause freezes simulation');
  await click('Settings');
  await screen('settings');
  await page.getByRole('button', { name: /Sound/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => __tune.settings.volume === 0.6);
  assert.equal(await page.evaluate(() => __tune.settings.volume), 0.6);
  await page.getByRole('button', { name: /Reduced motion/ }).click();
  assert.equal(await page.evaluate(() => __tune.settings.reducedMotion), true);
  await page.keyboard.press('Escape');
  await screen('pause');
  await click('Continue the journey');
  check('controller-style settings change and persist');
  const enemies = (await snap()).enemies.map((e) => ({ id: e.id, hp: 0 }));
  await fixture({ player: { x: 29, z: 106, echoes: 200 }, enemies });
  await page.keyboard.press('KeyE');
  await screen('shrine');
  await page.getByRole('button', { name: /Strengthen your vow/ }).click();
  assert.equal((await snap()).p.level, 1);
  await click('Leave the flame');
  await screen('');
  check('shrine, upgrade and departure UI');
  await page.keyboard.press('Escape');
  await click('Return to title');
  await screen('title');
  await page.reload();
  await ready();
  assert.equal(await page.evaluate(() => __tune.settings.reducedMotion), true);
  await click('Continue the pilgrimage');
  await mode('play');
  assert.equal((await snap()).p.level, 1);
  assert.equal((await snap()).p.echoes, 120);
  check('saved checkpoint survives reload and Continue restores progression');
  await fixture({
    player: { x: 32, z: 102, hp: 1, invulnerable: 0 },
    enemies: [
      {
        id: 'watcher-1',
        x: 32,
        z: 100,
        hp: 78,
        active: true,
        state: 'strike',
        timer: 20,
        yaw: 0,
        hit: false,
      },
    ],
  });
  await screen('death');
  await click('Rise again');
  await screen('');
  assert.ok((await snap()).p.hp > 0);
  assert.ok((await snap()).c.drop);
  check('death presentation and checkpoint retry');
  await fixture({ player: { x: 32, z: 7 }, campaign: { bossDead: true, bossStarted: false }, enemies });
  await page.keyboard.press('KeyE');
  await screen('won');
  assert.ok(await page.getByText('DAWN, RETURNED.').isVisible());
  await page.screenshot({ path: path.join(out, 'victory.png') });
  await click('Return to title');
  check('final interaction produces the ending');
  const saveBefore = await page.evaluate(() => localStorage.getItem('tarnished-tune-4r-save-v1'));
  const before = Date.now();
  await mode('demo');
  assert.ok(Date.now() - before >= 9000);
  check('ten-second title inactivity starts actual autonomous gameplay');
  const demoStart = (await snap()).c.tick;
  await page.waitForTimeout(400);
  assert.ok((await snap()).c.tick > demoStart);
  await page.keyboard.press('KeyF');
  await mode('title');
  assert.equal(await page.evaluate(() => localStorage.getItem('tarnished-tune-4r-save-v1')), saveBefore);
  check('keyboard interrupts attract immediately and demo cannot overwrite a player save');
  await page.waitForTimeout(500);
  await page.evaluate(() => __tune.action('demo'));
  await mode('demo');
  const cycle = await page.evaluate(() => __tune.cycles);
  assert.equal(await page.evaluate(() => __tune.advanceDemo(15000)), 'won');
  await page.waitForFunction((n) => __tune.cycles > n && __tune.state().c.tick < 600, cycle, {
    timeout: 12000,
  });
  check('complete demo reaches victory and autonomously restarts');
  await page.mouse.move(111, 117);
  await mode('title');
  await page.waitForTimeout(500);
  const pad = {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
  };
  pad.buttons[0] = { pressed: true, value: 1 };
  await page.evaluate((p) => __tune.setGamepad(p), pad);
  await mode('play');
  pad.buttons[0] = { pressed: false, value: 0 };
  await page.evaluate((p) => __tune.setGamepad(p), pad);
  check('standard PS5 Cross confirms the focused title item');
  await page.evaluate(() => __tune.action('title'));
  await page.evaluate(() => __tune.action('demo'));
  await mode('demo');
  pad.axes = [0.8, 0, 0, 0];
  await page.evaluate((p) => __tune.setGamepad(p), pad);
  await mode('title');
  await page.evaluate(() => __tune.setGamepad(null));
  check('gamepad stick input interrupts demo');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  const result = { checks, errors, diagnostics: await page.evaluate(() => __tune.diagnostics) };
  writeFileSync(path.join(out, 'browser-check.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await context.close();
  await browser.close();
}
