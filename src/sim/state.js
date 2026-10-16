/** Components are declared in the engine ECS; all mutable game state stays inside these records. */
import { defineComponent, compileLevel, NavGrid } from '../../vendor/my3dge/my3dge.js';
import { LEVEL, ARCHETYPES, onGround } from './content.js';
for (const name of ['pilgrim', 'foe', 'campaign', 'pickup', 'vessel'])
  defineComponent(name, {
    description: `Tarnished Tune ${name} state; plain data, captured and hashed by my-3dge.`,
    fields: { data: { type: 'object', default: {}, description: 'Serializable game state.' } },
  });
export function freshPlayer() {
  return {
    x: LEVEL.spawn[0],
    z: LEVEL.spawn[1],
    y: 0,
    yaw: Math.PI,
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    staminaDelay: 0,
    flasks: 3,
    maxFlasks: 3,
    echoes: 0,
    level: 0,
    weapon: 'sword',
    weapons: ['sword'],
    state: 'idle',
    timer: 0,
    elapsed: 0,
    attack: '',
    combo: 0,
    comboUntil: 0,
    hit: [],
    invulnerable: 0,
    guard: false,
    parry: 0,
    counter: 0,
    lock: '',
    dx: 0,
    dz: 0,
    vy: 0,
    speed: 0,
    skill: 0,
    buffer: '',
    bufferUntil: 0,
  };
}
export function freshCampaign() {
  return {
    status: 'playing',
    tick: 0,
    checkpoint: 'kindle',
    verses: [],
    collected: [],
    lore: [],
    shortcut: false,
    bossStarted: false,
    bossDead: false,
    phase: 1,
    deaths: 0,
    kills: 0,
    drop: null,
    projectiles: [],
    waves: [],
    events: [],
    eventId: 0,
    message: '',
    messageUntil: 0,
    talked: false,
    resting: false,
    wonAt: 0,
    stats: { attacks: 0, rolls: 0, parries: 0, blocks: 0, heals: 0, skills: 0, damage: 0 },
    assist: false,
  };
}
export function freshEnemy(spec, rng) {
  const a = ARCHETYPES[spec.kind];
  return {
    ...spec,
    homeX: spec.x,
    homeZ: spec.z,
    hp: a.hp,
    maxHp: a.hp,
    poise: a.poise,
    maxPoise: a.poise,
    yaw: Math.PI,
    state: 'idle',
    timer: rng.int(20, 70),
    elapsed: 0,
    attack: 0,
    hit: false,
    phase: 1,
    stagger: 0,
    flash: 0,
    active: spec.kind !== 'boss',
  };
}
export const getPlayer = (w) => w.query('pilgrim')[0].pilgrim.data;
export const getCampaign = (w) => w.query('campaign')[0].campaign.data;
export const getEnemies = (w) => w.query('foe').map((e) => e.foe.data);
export function emit(w, type, payload = {}) {
  const c = getCampaign(w);
  c.events.push({ id: ++c.eventId, tick: c.tick, type, ...payload });
  if (c.events.length > 48) c.events.shift();
  w.emit(type, payload);
}
export function notice(w, text, duration = 240) {
  const c = getCampaign(w);
  c.message = text;
  c.messageUntil = c.tick + duration;
}
const lines = [];
for (let row = 0; row < LEVEL.bounds.depth / LEVEL.bounds.tile; row++) {
  let s = '';
  for (let col = 0; col < LEVEL.bounds.width / LEVEL.bounds.tile; col++) {
    const x = (col + 0.5) * LEVEL.bounds.tile,
      z = (row + 0.5) * LEVEL.bounds.tile;
    s +=
      onGround(x, z, 0.1) &&
      !LEVEL.obstacles.some((o) => Math.abs(x - o.x) < o.w / 2 + 0.35 && Math.abs(z - o.z) < o.d / 2 + 0.35)
        ? '.'
        : '#';
  }
  lines.push(s);
}
export const NAV_LEVEL = compileLevel(`---\ntile: ${LEVEL.bounds.tile}\n---\n` + lines.join('\n'), {
  name: 'belfry-navigation',
});
export const NAV = new NavGrid(NAV_LEVEL, { radius: 0.28 });
