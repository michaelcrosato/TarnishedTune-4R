/** Application shell: fixed simulation clock, presentation, controller-first screens and isolated endless demo runs. */
import { createGame } from './sim/game.js';
import { createPilot } from './sim/pilot.js';
import { createRenderer } from './view/renderer.js';
import { createInput } from './platform/input.js';
import { createSound } from './platform/audio.js';
import { createStorage } from './platform/storage.js';
import { Flow } from './platform/flow.js';
import { createUI } from './ui/ui.js';
let persistent;
try {
  persistent = localStorage;
} catch {
  persistent = {
    getItem() {
      return null;
    },
    setItem() {
      throw Error('Unavailable');
    },
    removeItem() {},
  };
}
const storage = createStorage(persistent),
  settings = storage.settings();
const mobile = matchMedia('(pointer:coarse)').matches || innerWidth < 600;
document.body.classList.toggle('mobile', mobile);
document.body.classList.toggle('reduced-motion', settings.reducedMotion);
const flow = new Flow({ mobile }),
  sound = createSound(settings);
let padAudioAttempted = false;
let game,
  pilot,
  view,
  ui,
  snapshot,
  returnScreen = 'title',
  busy = false,
  ignoreClickUntil = 0,
  lastSavedEvent = 0,
  lastEffectEvent = 0,
  accumulator = 0,
  pendingPress = new Set();
const input = createInput((event) => {
  if (['keydown', 'pointerdown', 'touchstart'].includes(event.type)) void sound.unlock();
  if (event.type === 'gamepad' && !padAudioAttempted) {
    padAudioAttempted = true;
    void sound.unlock();
  }
  if (flow.physical()) {
    ignoreClickUntil = performance.now() + 450;
    input?.clear();
    pendingPress.clear();
    void title(false);
    return true;
  }
  return false;
});
function screen(name) {
  ui.show(name, snapshot, settings, { hasSave: !!storage.load(), backend: view?.backend });
}
function save() {
  if (flow.mode === 'play') {
    storage.save(game.save());
    lastSavedEvent = snapshot.c.eventId;
    document.querySelector('#save-status').textContent = storage.error;
  }
}
async function fresh(mode, load = false) {
  if (busy) return;
  busy = true;
  try {
    game.reset();
    if (load) {
      const data = storage.load();
      if (data) game.load(data);
    }
    game.step({ 'game:assist': mode === 'demo' ? false : settings.assist });
    snapshot = game.read();
    pilot = createPilot();
    accumulator = 0;
    pendingPress.clear();
    input.clear();
    lastSavedEvent = 0;
    lastEffectEvent = 0;
    ui.reset();
    sound.reset();
    view.reset();
    if (mode === 'demo') flow.demo();
    else flow.play();
    screen('');
    if (mode === 'play') save();
  } finally {
    busy = false;
  }
}
async function title(saveFirst = true) {
  if (saveFirst) save();
  flow.title();
  pendingPress.clear();
  accumulator = 0;
  // Title scenery can reuse the current world. Demo state never reaches durable storage.
  screen('title');
  view?.reset();
}
function adjust(key, direction) {
  if (key === 'quality') {
    const choices = ['auto', 'high', 'balanced', 'low'];
    settings[key] = choices[(choices.indexOf(settings[key]) + direction + choices.length) % choices.length];
    view.setQuality(settings[key]);
  } else if (key === 'volume' || key === 'music')
    settings[key] = Math.max(0, Math.min(1, Math.round((settings[key] + direction * 0.1) * 10) / 10));
  else settings[key] = !settings[key];
  storage.setSettings(settings);
  sound.configure(settings);
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  if (flow.mode === 'play' && key === 'assist') game.step({ 'game:assist': settings.assist });
  screen('settings');
}
async function action(name, value = 1) {
  if (busy || performance.now() < ignoreClickUntil) return;
  sound.play('select');
  if (name.startsWith('setting:')) {
    adjust(name.split(':')[1], value);
    return;
  }
  if (name === 'new') {
    if (storage.load()) {
      returnScreen = ui.screen;
      screen('confirm');
    } else await fresh('play');
  }
  if (name === 'new-confirmed') await fresh('play');
  if (name === 'continue') await fresh('play', true);
  if (name === 'title') await title();
  if (name === 'demo') await fresh('demo');
  if (name === 'resume') {
    screen('');
    accumulator = 0;
  }
  if (name === 'retry') {
    game.step({ p: ['retry'] });
    snapshot = game.read();
    view.reset();
    screen('');
    save();
  }
  if (name === 'depart') {
    game.step({ 'game:depart': true });
    snapshot = game.read();
    screen('');
    save();
  }
  if (name === 'upgrade') {
    game.step({ 'game:upgrade': true });
    snapshot = game.read();
    screen('shrine');
    save();
  }
  if (['settings', 'guide', 'journal', 'about'].includes(name)) {
    returnScreen = ui.screen || 'pause';
    screen(name);
  }
  if (name === 'back') {
    if (ui.screen === 'pause') {
      screen('');
      accumulator = 0;
    } else if (ui.screen === 'shrine') await action('depart');
    else if (ui.screen === 'title') return;
    else {
      screen(returnScreen || 'title');
    }
  }
}
async function boot() {
  game = await createGame(17, { qa: new URLSearchParams(location.search).has('qa') });
  snapshot = game.read();
  ui = createUI(action);
  view = await createRenderer(document.querySelector('#world'), settings);
  screen('title');
  document.querySelector('#loading').hidden = true;
  document.querySelector('#mobile-menu').addEventListener('click', () => {
    if (performance.now() < ignoreClickUntil) return;
    flow.title();
    returnScreen = 'title';
    screen('settings');
  });
  addEventListener('blur', () => {
    if (flow.mode === 'play' && !ui.screen) {
      screen('pause');
      save();
    }
  });
  addEventListener('visibilitychange', () => {
    if (document.hidden && flow.mode === 'play' && !ui.screen) {
      screen('pause');
      save();
    }
  });
  addEventListener('pagehide', save);
  document.addEventListener('tune:graphics-restoring', () => {
    if (flow.mode === 'play') {
      screen('pause');
      save();
    }
  });
  document.addEventListener('tune:graphics-failed', () => {
    if (flow.mode === 'play') {
      screen('pause');
      save();
    } else flow.title();
    const loading = document.querySelector('#loading');
    loading.hidden = false;
    loading.innerHTML =
      '<p>The graphics device became unavailable.</p><span>Your checkpoint is safe. Reload to return to the sanctuary.</span><button id=graphics-retry>Reload the sanctuary</button>';
    document.querySelector('#graphics-retry').addEventListener('click', () => location.reload());
  });
  let last = performance.now(),
    time = 0,
    perfTime = 0;
  if (mobile || new URLSearchParams(location.search).has('demo')) await fresh('demo');
  Object.defineProperty(window, '__engine', { get: () => game.engine });
  window.__tune = {
    get ready() {
      return !!view;
    },
    get mode() {
      return flow.mode;
    },
    get screen() {
      return ui.screen;
    },
    get cycles() {
      return flow.demoCycles;
    },
    get settings() {
      return { ...settings };
    },
    state: () => game.read(),
    get engine() {
      return game.engine;
    },
    get diagnostics() {
      return { ...view.diagnostics, audio: sound.info };
    },
    action,
    physical: () => {
      const exit = flow.physical();
      if (exit) void title(false);
      return exit;
    },
    setGamepad: (pad) => input.injectPad(pad),
    loseDevice() {
      if (!new URLSearchParams(location.search).has('qa')) throw Error('QA only');
      const previous = view.renderer;
      previous.backend.device?.destroy();
      void previous.onDeviceLost({ message: 'QA induced device loss', reason: 'unknown' });
    },
    // Inspector-driven fast-forward uses the identical AI and simulation; it never runs during a visible play session.
    advanceDemo(ticks) {
      if (flow.mode !== 'demo') throw Error('Start the demo first');
      for (let i = 0; i < ticks && game.read().c.status !== 'won'; i++) game.step(pilot.next(game.read()));
      snapshot = game.read();
      return snapshot.c.status;
    },
    fixture: (args) => {
      if (!new URLSearchParams(location.search).has('qa')) throw Error('Fixtures require ?qa');
      game.fixture(args);
      snapshot = game.read();
    },
    step: (n, intents) => {
      if (!new URLSearchParams(location.search).has('qa')) throw Error('Manual stepping requires ?qa');
      game.engine.step(n, intents);
      snapshot = game.read();
    },
  };
  function frame(now) {
    const raw = (now - last) / 1000,
      dt = Math.min(0.1, Math.max(0, raw));
    last = now;
    time += dt;
    const controls = input.poll(view.yaw, dt, time);
    if (settings.invertY) controls.look[1] *= -1;
    if (flow.mode === 'title') {
      ui.navigate(controls);
      const label = document.querySelector('#idle-label');
      if (label)
        label.textContent = `A pilgrimage begins in ${Math.max(0, Math.ceil(10 - flow.idle))} seconds`;
      if (flow.step(dt) === 'demo') void fresh('demo');
    } else if (flow.mode === 'play' && ui.screen) {
      ui.navigate(controls);
    } else if (flow.mode === 'play') {
      if (controls.p.includes('pause')) {
        screen('pause');
        save();
      } else if (controls.p.includes('journal')) {
        returnScreen = 'pause';
        screen('journal');
        save();
      }
    }
    if (!busy && (flow.mode === 'demo' || (flow.mode === 'play' && !ui.screen))) {
      controls.p.forEach((p) => pendingPress.add(p));
      accumulator = Math.min(accumulator + dt, 1 / 12);
      while (accumulator >= 1 / 60) {
        if (flow.mode === 'demo') {
          if (snapshot.c.status === 'won' || snapshot.c.status === 'dead') {
            if (flow.ended(1 / 60)) void fresh('demo');
          } else game.step(pilot.next(snapshot));
        } else {
          game.step({ ...controls, p: [...pendingPress] });
          pendingPress.clear();
        }
        snapshot = game.read();
        accumulator -= 1 / 60;
        if (busy) break;
      }
    }
    if (flow.mode === 'play') {
      if (!ui.screen) {
        if (snapshot.c.status === 'dead') screen('death');
        else if (snapshot.c.status === 'won') screen('won');
        else if (snapshot.c.resting) screen('shrine');
      }
      for (const e of snapshot.c.events)
        if (
          e.id > lastSavedEvent &&
          ['rest', 'pickup', 'upgrade', 'death', 'recover', 'gate', 'boss-dead', 'victory'].includes(e.type)
        ) {
          save();
          break;
        }
      for (const e of snapshot.c.events)
        if (e.id > lastEffectEvent) {
          if (['hit', 'parry', 'hurt'].includes(e.type)) input.rumble(e.type === 'parry' ? 0.8 : 0.35);
          lastEffectEvent = e.id;
        }
    }
    view.draw(snapshot, time, dt, flow.mode, controls.look, settings.reducedMotion, raw);
    ui.update(snapshot, flow.mode, input.device, dt, view);
    sound.frame(snapshot, time, flow.mode);
    perfTime += dt;
    if (perfTime > 0.5) {
      perfTime = 0;
      const d = view.diagnostics;
      document.querySelector('#performance').innerHTML =
        `${Math.round(d.fps)} FPS <span>${d.averageMs.toFixed(1)} ms</span>`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
boot().catch((error) => {
  console.error(error);
  document.querySelector('#loading').innerHTML =
    '<p>The sanctuary could not awaken.</p><span>Reload this page in a browser with WebGPU or WebGL2 enabled.</span><button id="retry-start" style="margin-top:24px;padding:12px 25px;background:#293c3d;border:1px solid #bca16b">Try again</button>';
  document.querySelector('#retry-start').addEventListener('click', () => location.reload());
});
