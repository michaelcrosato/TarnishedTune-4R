/** Autonomous kiosk player. It reads the normal game snapshot and issues ordinary player intents, never fixtures. */
import { distance, angleTo } from './content.js';
import { NAV } from './state.js';
const ROUTE = [
  { x: 25, z: 102, talk: true },
  { x: 32, z: 95 },
  { x: 35, z: 88, item: 'verse-court' },
  { x: 32, z: 78 },
  { x: 28, z: 73 },
  { x: 39, z: 69 },
  { x: 26, z: 66 },
  { x: 38, z: 56, item: 'verse-nave' },
  { x: 32, z: 52 },
  { x: 22, z: 51, rest: true },
  { x: 15, z: 54 },
  { x: 7, z: 58, item: 'verse-garden' },
  { x: 10, z: 62, item: 'longsword' },
  { x: 12, z: 66 },
  { x: 6, z: 78, item: 'lore-2' },
  { x: 16, z: 85 },
  { x: 13, z: 89, item: 'flask' },
  { x: 19.1, z: 94, gate: true },
  { x: 27, z: 96 },
  { x: 32, z: 82 },
  { x: 28, z: 72 },
  { x: 28, z: 58 },
  { x: 22, z: 51, rest: true },
  { x: 32, z: 43 },
  { x: 32, z: 40, fog: true },
  { x: 32, z: 20, boss: true },
  { x: 32, z: 7, bell: true },
];
export function createPilot() {
  let stage = 0,
    rested = -1,
    lastPathTick = -999,
    path = [],
    lastGoal = '',
    stuck = 0,
    lastPos = null;
  return {
    get stage() {
      return stage;
    },
    next(s) {
      const { p, c, enemies } = s;
      if (c.status === 'dead') return { p: ['retry'] };
      if (c.status === 'won') return {};
      if (c.resting) {
        rested = stage;
        if (p.echoes >= 80 + p.level * 60 && p.level < 8) return { 'game:upgrade': true };
        stage++;
        return { 'game:depart': true };
      }
      const press = [],
        held = [];
      let target = enemies
        .filter((e) => e.hp > 0 && e.active && (e.kind === 'boss' || distance(p, e) < 10))
        .sort((a, b) => distance(p, a) - distance(p, b))[0];
      if (target && target.kind !== 'boss' && c.bossStarted) target = null;
      if (
        p.hp < p.maxHp * 0.54 &&
        p.flasks > 0 &&
        p.state === 'idle' &&
        (!target || target.state === 'recover' || distance(p, target) > 5)
      )
        return { p: ['heal'] };
      if (target) {
        const d = distance(p, target),
          dir = angleTo(p, target);
        if (p.lock !== target.id) {
          if (p.lock) press.push('cycle');
          else press.push('lock');
        }
        const danger = enemies
          .filter((e) => e.hp > 0 && e.active && e.state === 'windup' && distance(p, e) < 4.8)
          .sort((a, b) => a.timer - b.timer)[0];
        const wave = c.waves.find((v) => Math.abs(distance(p, v) - v.radius) < 2.3);
        if (wave && p.y === 0 && p.state === 'idle') press.push('jump');
        if (p.state === 'idle') {
          if (danger && danger.timer < 12 && p.stamina >= 12) {
            if (danger.kind === 'boss' && danger.attack % 3 === 2) press.push('jump');
            else press.push('parry');
          } else if (danger && danger.timer < 28) held.push('guard');
          else if (c.verses.length === 3 && p.skill === 0 && d < 6 && p.stamina > 45) press.push('skill');
          else if (
            d < 3.1 &&
            p.stamina > 38 &&
            (target.state === 'stagger' || (target.state === 'recover' && target.timer > 58))
          )
            press.push('heavy');
          else if (d < 2.5 && p.stamina > 23 && (!danger || danger.timer > 45)) press.push('light');
          else if (target.kind === 'cantor' && d < 3.1 && p.stamina > 20) press.push('light');
        }
        // Close only to sword distance. Side-step incoming ranged bolts while travelling.
        let move = d > 2.05 ? [Math.sin(dir), Math.cos(dir)] : [0, 0];
        if (target.kind === 'cantor' && target.state === 'windup' && target.timer < 30 && d > 3) {
          move = [Math.sin(dir + 0.65), Math.cos(dir + 0.65)];
          if (p.state === 'idle' && target.timer < 8) press.push('roll');
        }
        return { move, p: press, b: held };
      }
      if (p.lock) press.push('lock');
      const goal = ROUTE[Math.min(stage, ROUTE.length - 1)];
      const d = distance(p, goal);
      if (lastPos && distance(p, lastPos) < 0.002) stuck++;
      else stuck = 0;
      lastPos = { x: p.x, z: p.z };
      if (
        (goal.item && c.collected.includes(goal.item)) ||
        (goal.gate && c.shortcut) ||
        (goal.talk && c.talked) ||
        (goal.fog && (c.bossStarted || c.bossDead)) ||
        (goal.boss && c.bossDead)
      ) {
        stage++;
        return { p: press };
      }
      if (
        d <
        (goal.gate
          ? 0.2
          : goal.item || goal.rest || goal.talk || goal.gate || goal.fog || goal.bell
            ? 1.7
            : 1.0)
      ) {
        if (goal.item || goal.talk || goal.gate || goal.fog || goal.bell || (goal.rest && rested !== stage))
          press.push('interact');
        else if (!goal.boss) stage++;
        return { p: press };
      }
      const key = `${stage}:${goal.x}:${goal.z}`;
      if (c.tick - lastPathTick > 90 || key !== lastGoal || stuck > 30) {
        path = NAV.findPath(p, goal) || [goal];
        lastGoal = key;
        lastPathTick = c.tick;
      }
      while (path.length > 1 && distance(p, path[0]) < 1) path.shift();
      let next = d < 4 ? goal : path[0] || goal;
      const theta = angleTo(p, next);
      if (stuck > 30) {
        next = { x: p.x + Math.sin(theta + 1) * 2, z: p.z + Math.cos(theta + 1) * 2 };
      }
      const heading = angleTo(p, next);
      return { move: [Math.sin(heading), Math.cos(heading)], p: press, b: p.stamina > 40 ? ['sprint'] : [] };
    },
  };
}
