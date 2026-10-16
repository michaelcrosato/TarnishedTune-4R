/** Four enemy archetypes share readable attack states. Boss moves and phase changes use those same states. */
import { ARCHETYPES, distance, angleTo, angleDelta } from './content.js';
import { getPlayer, getCampaign, getEnemies, emit, notice, NAV } from './state.js';
import { move, lineClear } from './movement.js';
import { hurtPlayer, inReach } from './combat.js';
export function enemyStep(w) {
  const p = getPlayer(w),
    c = getCampaign(w);
  for (const e of getEnemies(w)) {
    e.flash = Math.max(0, e.flash - 1);
    if (e.hp <= 0 || !e.active) continue;
    const a = ARCHETYPES[e.kind],
      d = distance(p, e);
    if (e.kind === 'boss' && e.hp < e.maxHp * 0.5 && e.phase === 1) {
      e.phase = 2;
      c.phase = 2;
      e.state = 'phase';
      e.timer = 150;
      emit(w, 'phase', { x: e.x, z: e.z });
      notice(w, 'VESPER · THE UNBOUND CHORUS', 180);
    }
    if (['hurt', 'stagger', 'phase'].includes(e.state)) {
      e.timer--;
      if (e.timer <= 0) {
        e.state = 'recover';
        e.timer = 30;
      }
      continue;
    }
    if (e.state === 'windup') {
      e.timer--;
      e.elapsed++;
      if (e.timer > 18) e.yaw = angleTo(e, p);
      if (e.timer <= 0) {
        e.state = 'strike';
        e.timer = e.kind === 'boss' ? 24 : 14;
        e.hit = false;
        emit(w, 'enemy-swing', { x: e.x, z: e.z, kind: e.kind });
        if (e.kind === 'cantor') {
          const speed = 9;
          c.projectiles.push({
            x: e.x,
            z: e.z,
            vx: Math.sin(e.yaw) * speed,
            vz: Math.cos(e.yaw) * speed,
            life: 180,
            damage: a.damage,
          });
          e.hit = true;
        }
        if (e.kind === 'boss' && e.attack % 3 === 2) {
          c.waves.push({ x: e.x, z: e.z, radius: 0.2, life: 100, hit: false });
          e.hit = true;
          emit(w, 'wave', { x: e.x, z: e.z });
        }
      }
      continue;
    }
    if (e.state === 'strike') {
      if (
        !e.hit &&
        inReach(e, p, a.range + (e.phase === 2 ? 0.45 : 0), e.kind === 'boss' ? 1.8 : 1.1) &&
        lineClear(w, e, p)
      ) {
        hurtPlayer(w, a.damage * (e.phase === 2 ? 1.2 : 1), e);
        e.hit = true;
      }
      if (!e.hit)
        move(w, e, Math.sin(e.yaw) * 0.035, Math.cos(e.yaw) * 0.035, e.kind === 'boss' ? 0.9 : 0.38);
      if (--e.timer <= 0) {
        e.state = 'recover';
        e.timer = Math.round(a.recovery * (e.phase === 2 ? 0.8 : 1));
      }
      continue;
    }
    if (e.state === 'recover') {
      if (--e.timer <= 0) e.state = 'idle';
      continue;
    }
    if (d > a.aggro && e.state === 'idle') continue;
    if (d > a.aggro * 2 && e.kind !== 'boss') {
      e.state = 'idle';
      continue;
    }
    e.state = 'chase';
    e.yaw += angleDelta(angleTo(e, p), e.yaw) * 0.14;
    if (d <= a.range - 0.25 && lineClear(w, e, p)) {
      e.state = 'windup';
      e.timer = Math.round(a.windup * (e.phase === 2 ? 0.82 : 1));
      e.elapsed = 0;
      e.attack++;
      emit(w, 'telegraph', { x: e.x, z: e.z, kind: e.kind });
      continue;
    }
    let dest = p;
    if (!lineClear(w, e, p)) {
      const path = NAV.findPath(e, p);
      if (path?.length) dest = path[0];
    }
    const theta = angleTo(e, dest),
      speed = (a.speed * (e.phase === 2 ? 1.2 : 1)) / 60;
    move(w, e, Math.sin(theta) * speed, Math.cos(theta) * speed, e.kind === 'boss' ? 0.9 : 0.35);
  }
  for (const bolt of c.projectiles) {
    const old = { x: bolt.x, z: bolt.z };
    bolt.x += bolt.vx / 60;
    bolt.z += bolt.vz / 60;
    bolt.life--;
    if (!lineClear(w, old, bolt)) bolt.life = 0;
    if (distance(bolt, p) < 0.65) {
      hurtPlayer(w, bolt.damage, bolt);
      bolt.life = 0;
    }
  }
  c.projectiles = c.projectiles.filter((b) => b.life > 0);
  for (const wave of c.waves) {
    wave.radius += 0.13;
    wave.life--;
    if (!wave.hit && Math.abs(distance(wave, p) - wave.radius) < 0.55) {
      hurtPlayer(w, 24, wave, true);
      wave.hit = true;
    }
  }
  c.waves = c.waves.filter((v) => v.life > 0);
}
