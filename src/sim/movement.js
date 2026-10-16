/** Swept Rapier collision queries and level boundaries. Presentation uses the same obstacle data. */
import { physicsOf } from '../../vendor/my3dge/my3dge.js';
import { LEVEL, LANDMARKS, onGround, distance } from './content.js';
import { getCampaign, getEnemies } from './state.js';
export function setupPhysics(w) {
  const physics = physicsOf(w);
  for (const o of LEVEL.obstacles)
    physics.addBody({
      type: 'fixed',
      position: [o.x, o.h / 2, o.z],
      colliders: [{ shape: { type: 'box', size: [o.w, o.h, o.d] } }],
    });
}
export function canOccupy(w, x, z, r = 0.38) {
  const c = getCampaign(w),
    { fog, shortcut } = LANDMARKS;
  if (!onGround(x, z, 0.15)) return false;
  if (!c.bossStarted && !c.bossDead && z < fog.boundaryZ && Math.abs(x - fog.x) < fog.halfWidth) return false;
  if (c.bossStarted && !c.bossDead && z > fog.boundaryZ) return false;
  if (!c.shortcut && x > shortcut.minX && x < shortcut.maxX && z > shortcut.minZ && z < shortcut.maxZ)
    return false;
  return physicsOf(w).overlap({ type: 'ball', radius: r }, [x, 0.8, z], { groups: ['world'] }).length === 0;
}
export function move(w, unit, dx, dz, r = 0.38) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  for (let i = 0; i < n; i++) {
    if (canOccupy(w, unit.x + dx / n, unit.z, r)) unit.x += dx / n;
    if (canOccupy(w, unit.x, unit.z + dz / n, r)) unit.z += dz / n;
  }
}
export function lineClear(w, a, b) {
  const d = distance(a, b);
  if (d < 0.01) return true;
  return !physicsOf(w).raycast([a.x, 1, a.z], [(b.x - a.x) / d, 0, (b.z - a.z) / d], {
    maxDistance: d,
    groups: ['world'],
  });
}
export function separate(w, p) {
  for (const e of getEnemies(w)) {
    if (e.hp <= 0 || !e.active) continue;
    const d = distance(p, e),
      r = e.kind === 'boss' ? 1.2 : 0.7;
    if (d < r && d > 0.001) move(w, p, ((p.x - e.x) / d) * (r - d) * 0.5, ((p.z - e.z) / d) * (r - d) * 0.5);
  }
}
