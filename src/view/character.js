/** Articulated original pilgrim and Bellkeeper rigs. Animation reads simulation states; it cannot affect combat. */
import * as T from 'three/webgpu';
import { WEAPONS, ARCHETYPES } from '../sim/content.js';
const geo = {
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.SphereGeometry(1, 10, 8),
  cone: new T.ConeGeometry(1, 1, 8),
  cylinder: new T.CylinderGeometry(1, 1, 1, 10),
};
export function character(materials, kind = 'player') {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const color =
    kind === 'boss' ? 'bronze' : kind === 'player' ? 'iron' : kind === 'cantor' ? 'dark' : 'stone';
  function part(parent, shape, material, pos, scale) {
    const mesh = new T.Mesh(geo[shape], materials[material]);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function joint(parent, x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  const hips = joint(body, 0, 0.95, 0),
    chest = joint(hips, 0, 0.37, 0);
  part(hips, 'sphere', 'black', [0, 0, 0], [0.28, 0.24, 0.19]);
  part(chest, 'sphere', color, [0, 0.1, 0], [0.36, 0.4, 0.22]);
  part(chest, 'box', 'gold', [0, 0.12, 0.214], [0.07, 0.44, 0.03]);
  part(chest, 'box', 'bronze', [0, -0.18, 0.03], [0.62, 0.1, 0.4]);
  part(hips, 'cone', kind === 'player' ? 'cloth' : 'red', [0, -0.2, 0], [0.48, 0.65, 0.35]);
  const head = joint(chest, 0, 0.63, 0);
  part(head, 'sphere', kind === 'player' ? 'bone' : color, [0, 0, 0], [0.225, 0.285, 0.21]);
  part(head, 'box', 'black', [0, 0.02, 0.197], [0.32, 0.045, 0.028]);
  part(head, 'box', 'gold', [0, 0.02, 0.213], [0.09, 0.025, 0.012]);
  part(head, 'box', color, [0, -0.16, 0.17], [0.15, 0.25, 0.09]);
  part(head, 'cone', 'bronze', [0, 0.3, -0.015], [0.08, 0.22, 0.12]);
  const arms = [],
    legs = [];
  for (const side of [-1, 1]) {
    const arm = joint(chest, side * 0.4, 0.3, 0);
    arms.push(arm);
    part(arm, 'sphere', color, [side * 0.02, -0.05, 0], [0.22, 0.18, 0.24]);
    part(arm, 'cylinder', 'black', [0, -0.3, 0], [0.095, 0.45, 0.095]);
    part(arm, 'cylinder', color, [0, -0.5, 0.015], [0.12, 0.3, 0.13]);
    part(arm, 'sphere', 'black', [0, -0.72, 0.02], [0.11, 0.12, 0.1]);
    const leg = joint(hips, side * 0.16, -0.13, 0);
    legs.push(leg);
    part(leg, 'cylinder', 'black', [0, -0.28, 0], [0.12, 0.52, 0.12]);
    part(leg, 'sphere', color, [0, -0.4, 0.08], [0.14, 0.16, 0.14]);
    part(leg, 'cylinder', color, [0, -0.63, 0.01], [0.115, 0.38, 0.13]);
    part(leg, 'box', 'black', [0, -0.78, 0.09], [0.25, 0.18, 0.4]);
  }
  const shield = joint(arms[0], -0.09, -0.5, 0.03);
  const shieldMesh = part(
    shield,
    'sphere',
    kind === 'player' ? 'bronze' : 'dark',
    [0, 0, 0.07],
    [0.32, 0.43, 0.075],
  );
  part(shield, 'box', 'gold', [0, 0, 0.14], [0.035, 0.6, 0.015]);
  const weapon = joint(arms[1], 0, -0.7, 0.02);
  part(weapon, 'cylinder', 'black', [0, 0, 0], [0.05, 0.25, 0.05]);
  part(weapon, 'box', 'gold', [0, -0.15, 0], [0.35, 0.055, 0.09]);
  const blade = part(weapon, 'box', 'iron', [0, -0.8, 0], [0.11, 1.3, 0.035]);
  part(weapon, 'cone', 'iron', [0, -1.5, 0], [0.07, 0.2, 0.03]).rotation.z = Math.PI;
  part(weapon, 'box', 'gold', [0, -0.75, 0.022], [0.016, 1.15, 0.01]);
  if (kind === 'cantor') {
    shield.visible = false;
    blade.visible = false;
    part(weapon, 'cylinder', 'gold', [0, 0.1, 0], [0.04, 2.1, 0.04]);
    part(weapon, 'sphere', 'cyan', [0, 1.2, 0], [0.15, 0.15, 0.15]);
  }
  const capeGeo = new T.PlaneGeometry(0.85, 1.3, 6, 8);
  const capeMat = materials[kind === 'player' ? 'cloth' : 'red'].clone();
  capeMat.side = T.DoubleSide;
  const cape = new T.Mesh(capeGeo, capeMat);
  cape.position.set(0, 1.12, -0.26);
  cape.castShadow = true;
  body.add(cape);
  const base = Float32Array.from(capeGeo.attributes.position.array);
  const halo = new T.Mesh(new T.TorusGeometry(0.47, 0.035, 6, 40), materials.gold);
  halo.position.set(0, 2.1, -0.08);
  body.add(halo);
  halo.visible = kind === 'boss';
  if (kind === 'boss') {
    root.scale.setScalar(2.25);
    shield.visible = false;
    for (const s of [-1, 1]) {
      part(head, 'cone', 'gold', [s * 0.23, 0.38, 0], [0.08, 0.75, 0.09]).rotation.z = -s * 0.38;
    }
    weapon.scale.set(1.2, 1.6, 1.2);
  }
  if (kind === 'knight') root.scale.setScalar(1.18);
  const baseScale = root.scale.x;
  return {
    root,
    kind,
    animate(unit, time) {
      root.position.set(unit.x, unit.y || 0, unit.z);
      root.rotation.y = unit.state === 'roll' ? Math.atan2(unit.dx, unit.dz) : unit.yaw;
      body.rotation.set(0, 0, 0);
      body.position.set(0, 0, 0);
      const speed = unit.speed || (unit.state === 'chase' ? 2.2 : 0),
        phase = time * (speed > 5 ? 13 : 8),
        stride = Math.min(1, speed / 3);
      hips.rotation.y = Math.sin(phase) * 0.06 * stride;
      chest.rotation.set(0, Math.sin(phase) * -0.09 * stride, 0);
      legs[0].rotation.x = Math.sin(phase) * 0.65 * stride;
      legs[1].rotation.x = -Math.sin(phase) * 0.65 * stride;
      arms[0].rotation.set(-Math.sin(phase) * 0.35 * stride, 0, 0.08);
      arms[1].rotation.set(Math.sin(phase) * 0.35 * stride, 0, -0.08);
      body.position.y = Math.sin(phase * 2) * 0.035 * stride + Math.sin(time * 2) * 0.012;
      body.rotation.x = 0.08 * stride;
      weapon.scale.y = kind === 'boss' ? 1.6 : unit.weapon === 'greatsword' ? 1.3 : 1;
      if (unit.guard) {
        arms[0].rotation.x = -1.45;
        arms[1].rotation.x = -0.8;
        body.rotation.y = -0.25;
      }
      if (unit.state === 'parry') {
        arms[0].rotation.set(-1.7, 0, -0.6);
        chest.rotation.y = -0.4;
      }
      if (unit.state === 'attack') {
        const a = WEAPONS[unit.weapon][unit.attack],
          t = unit.elapsed;
        const wind = Math.min(1, t / a.windup),
          swing = T.MathUtils.clamp((t - a.windup) / a.active, 0, 1),
          recover = T.MathUtils.clamp((t - a.windup - a.active) / a.recovery, 0, 1);
        const power = 1 - recover;
        arms[1].rotation.set(
          (-2.9 * wind + 3.3 * swing) * power,
          unit.attack === 'light' ? (1.6 - 3.2 * swing) * power : 0,
          -0.35,
        );
        chest.rotation.y = (unit.attack === 'light' ? 0.7 - 1.5 * swing : 0) * power;
        body.rotation.x = (unit.attack === 'heavy' ? 0.3 * swing : 0) * power;
      }
      if (unit.state === 'windup') {
        const a = ARCHETYPES[kind],
          u = Math.min(1, unit.elapsed / (a?.windup || 60));
        arms[1].rotation.set(-2.7 * u, 0.6 * u, -0.4);
        chest.rotation.y = 0.35 * u;
      }
      if (unit.state === 'strike') {
        arms[1].rotation.set(-0.7, -1.3, -0.2);
        chest.rotation.y = -0.6;
        body.rotation.x = 0.2;
      }
      if (unit.state === 'roll') {
        body.position.y = 0.6;
        body.rotation.x = (-unit.elapsed / 32) * Math.PI * 2;
        legs[0].rotation.x = -1.2;
        legs[1].rotation.x = -1.2;
        arms[0].rotation.x = -1.8;
        arms[1].rotation.x = -1.8;
      }
      if (unit.state === 'heal') {
        arms[0].rotation.x = -2.6;
        head.rotation.x = -0.2;
      } else head.rotation.x = 0;
      if (unit.state === 'skill' || unit.state === 'phase') {
        arms[0].rotation.z = 1.5;
        arms[1].rotation.z = -1.5;
        body.position.y = 0.15 + Math.sin(time * 3) * 0.06;
      }
      if (unit.state === 'hurt' || unit.state === 'stagger') {
        body.rotation.x = -0.3;
        head.rotation.x = 0.3;
      }
      if (unit.hp <= 0) {
        body.rotation.x = -Math.PI / 2;
        body.position.y = 0.2;
        arms[0].rotation.z = 1;
        arms[1].rotation.z = -1;
      }
      if (unit.y > 0) {
        legs[0].rotation.x = -0.7;
        legs[1].rotation.x = 0.5;
      }
      const positions = capeGeo.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const y = base[i * 3 + 1],
          bottom = (0.65 - y) / 1.3;
        positions.setZ(
          i,
          Math.sin(time * 4 + base[i * 3] * 4 + bottom * 3) * 0.09 * bottom -
            bottom * 0.18 -
            stride * bottom * 0.3,
        );
      }
      positions.needsUpdate = true;
      halo.rotation.z = time * 0.15;
      halo.scale.setScalar(unit.phase === 2 ? 1.4 : 1);
      root.scale.setScalar(baseScale);
    },
    dispose() {
      capeGeo.dispose();
      capeMat.dispose();
    },
  };
}
