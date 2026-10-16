/** Checkpoints, inventory, recoverable echoes, persistent unlocks, upgrades and the ending. */
import { pressed } from '../../vendor/my3dge/my3dge.js';
import { SHRINES, NPC, ITEMS, ENEMIES, WEAPONS, LANDMARKS, distance } from './content.js';
import { freshPlayer, freshEnemy, getPlayer, getCampaign, getEnemies, emit, notice } from './state.js';
export function interaction(p, c, items = ITEMS) {
  if (c.status !== 'playing') return null;
  const candidates = [],
    { fog, bell, shortcut } = LANDMARKS;
  for (const s of SHRINES)
    if (distance(p, s) < 2.7) candidates.push({ ...s, kind: 'shrine', label: `Rest at ${s.name}` });
  for (const i of items)
    if (!c.collected.includes(i.id) && distance(p, i) < 2.3)
      candidates.push({ ...i, label: `Take ${i.name}` });
  if (distance(p, NPC) < 2.7) candidates.push({ ...NPC, kind: 'npc', label: 'Speak to Mara' });
  if (c.drop && distance(p, c.drop) < 2.5)
    candidates.push({ ...c.drop, id: 'drop', kind: 'drop', label: `Recover ${c.drop.echoes} echoes` });
  if (!c.shortcut && distance(p, shortcut) < 3.2)
    candidates.push({
      ...shortcut,
      id: 'shortcut',
      kind: 'shortcut',
      label: p.x < shortcut.x ? 'Open the pilgrim’s shortcut' : 'Sealed from the garden side',
    });
  if (!c.bossStarted && !c.bossDead && distance(p, fog) < 3)
    candidates.push({ ...fog, id: 'fog', kind: 'fog', label: 'Enter the Hollow Belfry' });
  if (c.bossDead && distance(p, bell) < 4)
    candidates.push({ ...bell, id: 'bell', kind: 'bell', label: 'Ring the silent bell' });
  return candidates.sort((a, b) => distance(p, a) - distance(p, b))[0] || null;
}
export function resetEnemies(w) {
  const c = getCampaign(w);
  for (const e of getEnemies(w)) {
    if (e.kind === 'boss' && c.bossDead) {
      e.hp = 0;
      e.state = 'dead';
      e.active = false;
      continue;
    }
    const seed = ENEMIES.find((v) => v.id === e.id);
    Object.assign(e, freshEnemy(seed, w.rng('encounters')));
  }
  for (const e of w.query('vessel')) e.vessel.data.broken = false;
  c.bossStarted = false;
  c.phase = 1;
  c.projectiles = [];
  c.waves = [];
}
export function respawn(w, rest = false) {
  const p = getPlayer(w),
    c = getCampaign(w),
    shrine = SHRINES.find((s) => s.id === c.checkpoint) || SHRINES[0];
  Object.assign(p, {
    x: shrine.x + 2,
    z: shrine.z + 1,
    y: 0,
    vy: 0,
    hp: p.maxHp,
    stamina: p.maxStamina,
    flasks: p.maxFlasks,
    state: 'idle',
    timer: 0,
    elapsed: 0,
    lock: '',
    invulnerable: 90,
    skill: 0,
    guard: false,
    parry: 0,
    buffer: '',
  });
  c.status = 'playing';
  c.resting = rest;
  resetEnemies(w);
  emit(w, rest ? 'rest' : 'respawn', { x: p.x, z: p.z });
}
export function progressionStep(w, input) {
  const p = getPlayer(w),
    c = getCampaign(w);
  if (input['game:assist'] !== undefined) c.assist = input['game:assist'] === true;
  if (pressed(input, 'retry') && c.status === 'dead') {
    respawn(w);
    return;
  }
  if (input['game:depart']) {
    c.resting = false;
    return;
  }
  if (input['game:upgrade'] && c.resting) {
    const cost = 80 + p.level * 60;
    if (p.echoes >= cost && p.level < 8) {
      p.echoes -= cost;
      p.level++;
      p.maxHp += 14;
      p.hp = p.maxHp;
      p.maxStamina += 5;
      p.stamina = p.maxStamina;
      emit(w, 'upgrade');
      notice(w, 'Your vow grows stronger.');
    } else notice(w, p.level >= 8 ? 'Your vow is complete.' : `You need ${cost} echoes.`);
    return;
  }
  if (c.status !== 'playing' || c.resting) return;
  if (c.drop && distance(p, c.drop) < 1.1) {
    p.echoes += c.drop.echoes;
    c.drop = null;
    notice(w, 'Lost echoes reclaimed');
    emit(w, 'recover');
  }
  if (!pressed(input, 'interact')) return;
  const target = interaction(p, c);
  if (!target) return;
  if (target.kind === 'shrine') {
    if (getEnemies(w).some((e) => e.hp > 0 && e.active && distance(p, e) < 6)) {
      notice(w, 'A hostile presence keeps the flame from you.');
      return;
    }
    c.checkpoint = target.id;
    respawn(w, true);
    notice(w, 'Restored · Enemies have returned');
    return;
  }
  if (target.kind === 'npc') {
    c.talked = true;
    notice(w, NPC.text, 840);
    if (!c.lore.includes('mara')) c.lore.push('mara');
    emit(w, 'talk');
    return;
  }
  if (target.kind === 'shortcut') {
    if (p.x < LANDMARKS.shortcut.x) {
      c.shortcut = true;
      notice(w, 'PILGRIM’S SHORTCUT OPENED');
      emit(w, 'gate');
    } else notice(w, 'The latch is on the garden side.');
    return;
  }
  if (target.kind === 'drop') {
    p.echoes += c.drop.echoes;
    c.drop = null;
    notice(w, 'Lost echoes reclaimed');
    emit(w, 'recover');
    return;
  }
  if (target.kind === 'fog') {
    if (c.verses.length < 2) {
      notice(w, 'The seal answers to two verses. Seek the amber lights.');
      return;
    }
    c.bossStarted = true;
    p.z = LANDMARKS.fog.entryZ;
    p.x = LANDMARKS.fog.x;
    const boss = getEnemies(w).find((e) => e.kind === 'boss');
    boss.active = true;
    p.lock = boss.id;
    emit(w, 'boss-enter');
    notice(w, 'VESPER, THE BELLKEEPER', 200);
    return;
  }
  if (target.kind === 'bell') {
    c.status = 'won';
    c.wonAt = c.tick;
    emit(w, 'victory');
    return;
  }
  c.collected.push(target.id);
  if (target.kind === 'verse') {
    c.verses.push(target.id);
    if (c.verses.length === 3)
      notice(w, 'RESONANCE AWAKENED · Unleash the three verses with L2 + R2 / R', 360);
    else notice(w, `${target.name} · ${c.verses.length} / 3 verses`);
  }
  if (target.kind === 'weapon') {
    if (!p.weapons.includes(target.weapon)) p.weapons.push(target.weapon);
    p.weapon = target.weapon;
    notice(w, 'CHOIRBREAKER ACQUIRED · D-pad right / Q to switch blades', 300);
  }
  if (target.kind === 'flask') {
    p.maxFlasks++;
    p.flasks++;
    notice(w, 'AMBER PHIAL · Healing charges increased');
  }
  if (target.kind === 'currency') {
    p.echoes += 80;
    notice(w, '80 echoes gathered');
  }
  if (target.kind === 'lore') {
    c.lore.push(target.id);
    notice(w, target.text, 660);
  }
  emit(w, 'pickup', { x: target.x, z: target.z, kind: target.kind, name: target.name });
}
export function saveProgress(p, c) {
  return {
    version: 1,
    checkpoint: c.checkpoint,
    echoes: p.echoes,
    level: p.level,
    weapon: p.weapon,
    weapons: [...p.weapons],
    maxFlasks: p.maxFlasks,
    verses: [...c.verses],
    collected: [...c.collected],
    lore: [...c.lore],
    shortcut: c.shortcut,
    bossDead: c.bossDead,
    deaths: c.deaths,
    kills: c.kills,
    talked: c.talked,
    drop: c.drop,
    assist: c.assist,
  };
}
export function loadProgress(w, save) {
  const p = getPlayer(w),
    c = getCampaign(w);
  const level = Math.max(0, Math.min(8, Number.isInteger(save.level) ? save.level : 0));
  Object.assign(p, {
    level,
    maxHp: 120 + level * 14,
    maxStamina: 100 + level * 5,
    echoes: Math.max(0, Math.min(100000, save.echoes || 0)),
    maxFlasks: save.maxFlasks === 4 ? 4 : 3,
    weapons: [...new Set(['sword', ...(save.weapons || []).filter((id) => WEAPONS[id])])],
  });
  p.weapon = p.weapons.includes(save.weapon) ? save.weapon : 'sword';
  for (const key of ['verses', 'collected', 'lore'])
    c[key] = Array.isArray(save[key]) ? save[key].filter((v) => typeof v === 'string') : [];
  for (const key of ['shortcut', 'bossDead', 'talked', 'assist']) c[key] = save[key] === true;
  c.checkpoint = SHRINES.some((s) => s.id === save.checkpoint) ? save.checkpoint : 'kindle';
  c.deaths = save.deaths || 0;
  c.kills = save.kills || 0;
  c.drop =
    save.drop &&
    Number.isFinite(save.drop.x) &&
    Number.isFinite(save.drop.z) &&
    Number.isFinite(save.drop.echoes)
      ? save.drop
      : null;
  respawn(w);
  emit(w, 'loaded');
}
