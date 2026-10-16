/** The real game runs inside a my-3dge scene at 60 Hz. This facade also drives headless tests and the kiosk pilot. */
import { createHeadless, defineScene, defineSettings, pressed, held } from '../../vendor/my3dge/my3dge.js';
import { ENEMIES, ITEMS, BREAKABLES, regionAt } from './content.js';
import { freshPlayer, freshCampaign, freshEnemy, getPlayer, getCampaign, getEnemies, emit } from './state.js';
import { setupPhysics, move, separate } from './movement.js';
import { playerCombat } from './combat.js';
import { enemyStep } from './enemies.js';
import { progressionStep, loadProgress, saveProgress, interaction } from './progression.js';
defineSettings({
  'tune.qa': {
    type: 'boolean',
    default: false,
    when: 'scene',
    description: 'Enable recorded QA fixture intents.',
  },
});
export const scene = defineScene('tune:belfry', {
  description: 'The complete Hollow Belfry campaign, reproducible on the my-3dge CPU simulation.',
  physics: true,
  setup(w) {
    w.spawn({ campaign: { data: freshCampaign() } });
    w.spawn({ pilgrim: { data: freshPlayer() } });
    for (const e of ENEMIES) w.spawn({ foe: { data: freshEnemy(e, w.rng('encounters')) } });
    for (const item of ITEMS) w.spawn({ pickup: { data: { ...item } } });
    for (const item of BREAKABLES) w.spawn({ vessel: { data: { ...item, broken: false } } });
    setupPhysics(w);
  },
  step(w, input) {
    const p = getPlayer(w),
      c = getCampaign(w);
    c.tick++;
    if (input['game:fixture'] && w.settings.get('tune.qa')) {
      scene.actions.fixture(w, JSON.parse(input['game:fixture']));
      return;
    }
    if (input['game:load']) {
      loadProgress(w, JSON.parse(input['game:load']));
      return;
    }
    progressionStep(w, input);
    if (c.status !== 'playing' || c.resting) return;
    playerCombat(w, input);
    const [mx, mz] = input.move || [0, 0],
      mag = Math.hypot(mx, mz),
      norm = Math.max(1, mag);
    p.speed = 0;
    if (['idle', 'guard', 'parry'].includes(p.state)) {
      if (mag > 0.05) {
        const sprint = held(input, 'sprint') && p.stamina > 1 && !p.guard;
        p.speed = (sprint ? 6.7 : 4.3) * (p.guard ? 0.45 : 1) * Math.min(1, mag);
        move(w, p, ((mx / norm) * p.speed) / 60, ((mz / norm) * p.speed) / 60);
        if (!p.lock) p.yaw = Math.atan2(mx, mz);
        if (sprint) {
          p.stamina -= 0.22;
          p.staminaDelay = 30;
        }
      }
      if (pressed(input, 'jump') && p.y === 0) {
        p.vy = 6.6;
        emit(w, 'jump');
      }
    }
    if (p.y > 0 || p.vy > 0) {
      p.y += p.vy / 60;
      p.vy -= 18 / 60;
      if (p.y < 0) {
        p.y = 0;
        p.vy = 0;
        emit(w, 'land');
      }
    }
    separate(w, p);
    enemyStep(w);
  },
  actions: {
    // QA fixtures operate through engine actions, which are recorded. The game and bot never invoke these.
    fixture(w, args) {
      const p = getPlayer(w),
        c = getCampaign(w);
      if (args.player) Object.assign(p, args.player);
      if (args.campaign) Object.assign(c, args.campaign);
      for (const spec of args.enemies || []) {
        const e = getEnemies(w).find((e) => e.id === spec.id);
        if (e) Object.assign(e, spec);
      }
    },
  },
});
export async function createGame(seed = 17, { qa = false } = {}) {
  const engine = await createHeadless({ scene, seed, settings: { 'tune.qa': qa } });
  const initial = engine.capture();
  return {
    engine,
    reset() {
      engine.restore(initial);
    },
    fixture(args) {
      if (!qa) throw Error('QA fixtures disabled');
      this.step({ 'game:fixture': JSON.stringify(args) });
    },
    step(input = {}) {
      engine.step(1, input);
    },
    read() {
      const entities = engine.state().entities;
      const p = entities.find((e) => e.pilgrim).pilgrim.data,
        c = entities.find((e) => e.campaign).campaign.data;
      return {
        p,
        c,
        enemies: entities.filter((e) => e.foe).map((e) => e.foe.data),
        vessels: entities.filter((e) => e.vessel).map((e) => e.vessel.data),
        region: regionAt(p.x, p.z),
        interaction: interaction(p, c),
      };
    },
    save() {
      const { p, c } = this.read();
      return saveProgress(p, c);
    },
    load(data) {
      this.step({ 'game:load': JSON.stringify(data) });
    },
  };
}
