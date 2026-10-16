/** Isolated motion-review frames using the actual game rigs/materials. No gameplay fixtures replace the full pilot test. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
const out = process.env.TUNE_QA_OUT || '/tmp/tarnished-tune-cel',
  url = process.env.TUNE_URL || 'http://127.0.0.1:43187';
mkdirSync(out, { recursive: true });
let executablePath = process.env.TUNE_CHROMIUM;
if (!process.env.TUNE_CDP && !executablePath && !existsSync(chromium.executablePath())) {
  const cache = path.join(homedir(), '.cache/ms-playwright');
  const installed = readdirSync(cache).find((name) => /^chromium-\d+$/.test(name));
  if (installed) executablePath = path.join(cache, installed, 'chrome-linux64/chrome');
}
const browser = process.env.TUNE_CDP
  ? await chromium.connectOverCDP(process.env.TUNE_CDP)
  : await chromium.launch({
      headless: true,
      executablePath,
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    });
const context = await browser.newContext({ viewport: { width: 750, height: 750 } }),
  page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.route('**/__motion_review', (r) =>
  r.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><style>body{margin:0;background:#7295a3}canvas{display:block}p{position:absolute;left:25px;bottom:16px;color:#16293a;font:18px Georgia;margin:0}</style><canvas></canvas><p id="caption"></p><script type="module">
if(!globalThis.GPUShaderStage)globalThis.GPUShaderStage={VERTEX:1,FRAGMENT:2,COMPUTE:4};
const {mountReviewStage}=await import('/scripts/review-stage.js');await mountReviewStage();
</script></html>`,
  }),
);
try {
  await page.goto(url + '/__motion_review');
  await page.waitForFunction(() => window.__ready, null, { timeout: 45000 });
  const poses = [
    { state: 'idle', frame: 30, label: 'Ready stance' },
    { state: 'walk', frame: 76, label: 'Walk · planted foot' },
    { state: 'run', frame: 76, label: 'Sprint · lifted knee' },
    { state: 'attack', frame: 7, label: 'Light I · anticipation' },
    { state: 'attack', frame: 14, label: 'Light I · contact' },
    { state: 'attack', frame: 14, combo: 1, label: 'Light II · reverse cut' },
    { state: 'attack', frame: 14, combo: 2, label: 'Light III · thrust' },
    { state: 'attack', frame: 33, heavy: true, weapon: 'greatsword', label: 'Heavy · two-handed windup' },
    { state: 'attack', frame: 47, heavy: true, weapon: 'greatsword', label: 'Heavy · strike' },
    { state: 'attack', frame: 70, heavy: true, weapon: 'greatsword', label: 'Heavy · recovery' },
    { state: 'guard', frame: 30, label: 'Raised guard' },
    { state: 'parry', frame: 10, label: 'Parry · shield thrust' },
    { state: 'heal', frame: 40, label: 'Healing · phial raised' },
    { state: 'roll', frame: 8, label: 'Dodge · tuck' },
    { state: 'roll', frame: 17, label: 'Dodge · rotation' },
    { state: 'dead', frame: 65, label: 'Death · settled fall' },
    { kind: 'boss', state: 'windup', frame: 45, label: 'Vesper · anticipation' },
    { kind: 'boss', state: 'strike', frame: 9, label: 'Vesper · strike' },
    { kind: 'boss', state: 'phase', frame: 65, label: 'Vesper · unbound chorus' },
  ];
  const reports = [];
  for (let i = 0; i < poses.length; i++) {
    const report = await page.evaluate((p) => __pose(p), poses[i]);
    await page.screenshot({ path: path.join(out, `pose-${String(i).padStart(2, '0')}.png`) });
    reports.push({ spec: poses[i], feet: report.feet, parts: report.parts, outlines: report.outlines });
  }
  writeFileSync(path.join(out, 'poses.json'), JSON.stringify({ errors, reports }, null, 2));
  console.log(JSON.stringify({ poses: reports.length, errors: [...new Set(errors)] }));
  if (errors.length) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
