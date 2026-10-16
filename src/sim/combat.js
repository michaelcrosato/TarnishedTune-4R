/** Commitment-based combat, directional hits, poise, dodge windows, guard and parry. All durations are ticks. */
import { inCone, pressed, held } from '../../vendor/my3dge/my3dge.js';
import { WEAPONS, ARCHETYPES, distance, angleTo, angleDelta } from './content.js';
import { getPlayer, getCampaign, getEnemies, emit, notice } from './state.js';
import { move, lineClear } from './movement.js';
export function inReach(a, b, range, angle = 1.2) {
  return inCone(
    [a.x, a.y || 0, a.z],
    a.yaw,
    { range, halfAngle: angle, yMin: -0.5, yMax: 3.5 },
    { id: 0, x: b.x, y: b.y || 0, z: b.z, radius: b.kind === 'boss' ? 0.9 : 0.36, height: 1.8 },
  );
}
export function hitEnemy(w, e, damage, poise) {
  if (e.hp <= 0 || e.state === 'phase') return;
  const p = getPlayer(w),
    c = getCampaign(w);
  e.hp = Math.max(0, e.hp - damage);
  e.poise -= poise;
  e.flash = 12;
  c.stats.damage += damage;
  emit(w, 'hit', { x: e.x, z: e.z, amount: damage, boss: e.kind === 'boss' });
  if (e.hp === 0) {
    e.state = 'dead';
    e.timer = 90;
    p.echoes += ARCHETYPES[e.kind].reward;
    c.kills++;
    emit(w, 'kill', { x: e.x, z: e.z, kind: e.kind });
    if (e.kind === 'boss') {
      c.bossDead = true;
      c.bossStarted = false;
      c.projectiles = [];
      c.waves = [];
      p.lock = '';
      notice(w, 'THE BELLKEEPER FALLS · Ring the bell to restore the dawn.', 420);
      emit(w, 'boss-dead');
    }
  } else if (e.poise <= 0) {
    e.state = 'stagger';
    e.timer = e.kind === 'boss' ? 135 : 100;
    e.poise = e.maxPoise;
    emit(w, 'stagger', { x: e.x, z: e.z });
  } else if (e.kind !== 'boss' && e.state !== 'strike') {
    e.state = 'hurt';
    e.timer = 16;
  }
}
export function hurtPlayer(w, damage, source, unblockable = false) {
  const p = getPlayer(w),
    c = getCampaign(w);
  if (p.hp <= 0 || p.invulnerable > 0 || p.y > 1.1) return false;
  const facing = Math.abs(angleDelta(angleTo(p, source), p.yaw)) < 1.3;
  if (p.parry > 0 && facing && !unblockable) {
    if (source.kind) {
      source.state = 'stagger';
      source.timer = 150;
      source.poise = source.maxPoise;
    }
    p.stamina = Math.min(p.maxStamina, p.stamina + 20);
    p.counter = 120;
    c.stats.parries++;
    emit(w, 'parry', { x: p.x, z: p.z });
    notice(w, 'Perfect parry · Heavy attack to riposte', 100);
    return false;
  }
  if (p.guard && facing && !unblockable) {
    p.stamina -= damage * 1.15;
    p.staminaDelay = 55;
    p.counter = 80;
    c.stats.blocks++;
    emit(w, 'block', { x: p.x, z: p.z });
    if (p.stamina >= 0) return false;
    p.stamina = 0;
    p.state = 'hurt';
    p.timer = 60;
    notice(w, 'Guard broken', 90);
  }
  p.hp = Math.max(0, p.hp - Math.round(damage * (c.assist ? 0.6 : 1)));
  p.state = 'hurt';
  p.timer = 25;
  p.elapsed = 0;
  p.invulnerable = 30;
  p.guard = false;
  emit(w, 'hurt', { x: p.x, z: p.z, amount: damage });
  if (p.hp === 0) {
    c.drop = { x: p.x, z: p.z, echoes: p.echoes };
    p.echoes = 0;
    c.deaths++;
    c.status = 'dead';
    p.state = 'dead';
    p.timer = 180;
    p.lock = '';
    emit(w, 'death');
  }
  return true;
}
function spend(p, amount) {
  if (p.stamina < amount) return false;
  p.stamina -= amount;
  p.staminaDelay = 45;
  return true;
}
function beginAttack(w, type) {
  const p = getPlayer(w),
    c = getCampaign(w),
    a = WEAPONS[p.weapon][type];
  if (!spend(p, a.cost)) return;
  p.state = 'attack';
  p.attack = type;
  p.elapsed = 0;
  p.timer = a.windup + a.active + a.recovery;
  p.hit = [];
  if (type === 'light') {
    p.combo = c.tick < p.comboUntil ? (p.combo + 1) % 3 : 0;
    p.comboUntil = c.tick + 120;
  }
  c.stats.attacks++;
  emit(w, 'swing', { heavy: type === 'heavy' });
}
export function playerCombat(w, input) {
  const p = getPlayer(w),
    c = getCampaign(w);
  for (const k of ['invulnerable', 'parry', 'counter', 'staminaDelay', 'skill']) p[k] = Math.max(0, p[k] - 1);
  if (p.staminaDelay === 0 && p.state !== 'attack' && p.state !== 'roll')
    p.stamina = Math.min(p.maxStamina, p.stamina + (p.guard ? 0.22 : 0.62));
  if (pressed(input, 'lock')) {
    const near = getEnemies(w)
      .filter((e) => e.active && e.hp > 0 && distance(p, e) < 20)
      .sort((a, b) => distance(p, a) - distance(p, b));
    p.lock = p.lock ? '' : near[0]?.id || '';
  }
  if (pressed(input, 'cycle')) {
    const es = getEnemies(w).filter((e) => e.active && e.hp > 0 && distance(p, e) < 20);
    p.lock = es[(es.findIndex((e) => e.id === p.lock) + 1) % es.length]?.id || '';
  }
  const target = getEnemies(w).find((e) => e.id === p.lock && e.hp > 0 && distance(p, e) < 28);
  if (target) p.yaw = angleTo(p, target);
  else p.lock = '';
  for (const key of ['light', 'heavy', 'roll'])
    if (pressed(input, key)) {
      p.buffer = key;
      p.bufferUntil = c.tick + 10;
    }
  p.guard = held(input, 'guard') && ['idle', 'guard'].includes(p.state) && p.stamina > 0;
  if (pressed(input, 'parry') && p.state === 'idle' && spend(p, 12)) {
    p.state = 'parry';
    p.timer = 30;
    p.elapsed = 0;
    p.parry = 13;
    emit(w, 'parry-start');
  }
  if (p.state === 'idle' || p.state === 'guard') {
    if (pressed(input, 'weapon') && p.weapons.length > 1) {
      p.weapon = p.weapons[(p.weapons.indexOf(p.weapon) + 1) % p.weapons.length];
      notice(w, WEAPONS[p.weapon].name, 100);
      emit(w, 'equip');
    }
    if (p.buffer && c.tick <= p.bufferUntil) {
      if (p.buffer === 'roll' && spend(p, 24)) {
        const [x, z] = input.move || [Math.sin(p.yaw), Math.cos(p.yaw)],
          l = Math.hypot(x, z) || 1;
        p.dx = x / l;
        p.dz = z / l;
        p.state = 'roll';
        p.timer = 32;
        p.elapsed = 0;
        p.invulnerable = 22;
        p.guard = false;
        c.stats.rolls++;
        emit(w, 'roll');
      } else if (p.buffer !== 'roll') beginAttack(w, p.buffer);
      p.buffer = '';
    } else if (pressed(input, 'heal') && p.flasks > 0 && p.hp < p.maxHp) {
      p.state = 'heal';
      p.timer = 75;
      p.elapsed = 0;
      p.flasks--;
      c.stats.heals++;
      emit(w, 'heal-start');
    } else if (pressed(input, 'skill') && c.verses.length >= 3 && p.skill === 0 && spend(p, 38)) {
      p.state = 'skill';
      p.timer = 75;
      p.elapsed = 0;
      p.skill = 900;
      c.stats.skills++;
      emit(w, 'skill-start', { x: p.x, z: p.z });
    }
  }
  if (p.state === 'attack') {
    const a = WEAPONS[p.weapon][p.attack];
    if (p.elapsed >= a.windup && p.elapsed < a.windup + a.active) {
      move(w, p, Math.sin(p.yaw) * 0.045, Math.cos(p.yaw) * 0.045);
      for (const e of getEnemies(w))
        if (e.active && e.hp > 0 && !p.hit.includes(e.id) && inReach(p, e, a.range) && lineClear(w, p, e)) {
          const riposte = p.attack === 'heavy' && (e.state === 'stagger' || p.counter > 0);
          hitEnemy(
            w,
            e,
            Math.round(
              (a.damage + p.level * 4) *
                (riposte ? 1.8 : 1) *
                (p.combo === 2 && p.attack === 'light' ? 1.22 : 1),
            ),
            a.poise,
          );
          p.hit.push(e.id);
          if (riposte) {
            p.counter = 0;
            if (e.hp > 0) {
              e.state = 'recover';
              e.timer = 35;
              e.poise = e.maxPoise;
            }
            emit(w, 'riposte');
          }
        }
      for (const v of w.query('vessel'))
        if (!v.vessel.data.broken && inReach(p, v.vessel.data, a.range)) {
          v.vessel.data.broken = true;
          p.echoes += 8;
          emit(w, 'break', { x: v.vessel.data.x, z: v.vessel.data.z });
        }
    }
  }
  if (p.state === 'roll') move(w, p, p.dx * 0.16, p.dz * 0.16);
  if (p.state === 'heal' && p.elapsed === 42) {
    p.hp = Math.min(p.maxHp, p.hp + 65);
    emit(w, 'heal', { x: p.x, z: p.z });
  }
  if (p.state === 'skill' && p.elapsed === 35) {
    for (const e of getEnemies(w)) if (e.active && e.hp > 0 && distance(p, e) < 8) hitEnemy(w, e, 85, 100);
    emit(w, 'resonance', { x: p.x, z: p.z });
  }
  if (p.timer > 0) {
    p.timer--;
    p.elapsed++;
    if (p.timer === 0 && p.hp > 0) {
      p.state = 'idle';
      p.elapsed = 0;
    }
  }
}
