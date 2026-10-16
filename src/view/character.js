/** Articulated, ink-outlined pilgrims. Engine two-bone IK plants feet; combat poses follow sim timing. */
import * as T from 'three/webgpu';
import { twoBone } from '../../vendor/my3dge/my3dge.js';
import { sampleMotion, gaitParameters, clamp, smooth } from './motion.js';
const geo = {
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.SphereGeometry(1, 12, 10),
  cone: new T.ConeGeometry(1, 1, 8),
  cylinder: new T.CylinderGeometry(1, 1, 1, 10),
};
const DOWN = new T.Vector3(0, -1, 0);
export function character(materials, kind = 'player') {
  const root = new T.Group(),
    body = new T.Group();
  root.name = `${kind}-rig`;
  root.add(body);
  const armour =
    kind === 'boss' ? 'bronze' : kind === 'player' ? 'iron' : kind === 'cantor' ? 'dark' : 'stone';
  const joints = {},
    meshes = [],
    outlineMeshes = [];
  function part(parent, shape, material, pos, scale, outline = true) {
    const mesh = new T.Mesh(geo[shape], materials[material]);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    meshes.push(mesh);
    if (outline && materials.outline) outlineMeshes.push(materials.outline(mesh, shape));
    return mesh;
  }
  function joint(name, parent, x, y, z) {
    const g = new T.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    return g;
  }
  const hips = joint('hips', body, 0, 0.98, 0),
    chest = joint('chest', hips, 0, 0.27, 0);
  part(hips, 'sphere', 'black', [0, 0, 0], [0.26, 0.18, 0.18]);
  part(chest, 'sphere', armour, [0, 0.1, 0], [0.32, 0.34, 0.21]);
  part(chest, 'cone', armour, [0, -0.06, 0.03], [0.33, 0.27, 0.22]);
  part(chest, 'box', 'gold', [0, 0.15, 0.208], [0.045, 0.41, 0.018], false);
  for (const side of [-1, 1])
    part(chest, 'box', 'bronze', [side * 0.13, 0.18, 0.19], [0.15, 0.04, 0.04], false).rotation.z =
      side * 0.3;
  part(hips, 'box', 'bronze', [0, 0.015, 0.005], [0.57, 0.09, 0.37]);
  part(hips, 'box', 'gold', [0, 0.015, 0.205], [0.12, 0.12, 0.04]);
  // Separate tassets expose knees in motion and give the coat a shaped silhouette.
  const tassets = [];
  for (const side of [-1, 1]) {
    const t = joint(`tasset${side}`, hips, side * 0.18, -0.04, 0.12);
    part(t, 'box', kind === 'player' ? 'cloth' : 'red', [0, -0.2, 0], [0.22, 0.37, 0.07]);
    tassets.push(t);
    part(hips, 'box', 'wood', [side * 0.3, -0.08, 0], [0.13, 0.22, 0.16]);
  }
  const head = joint('head', chest, 0, 0.56, 0);
  part(head, 'sphere', kind === 'player' ? 'bone' : armour, [0, 0, 0], [0.205, 0.26, 0.19]);
  part(head, 'box', 'black', [0, 0.025, 0.18], [0.3, 0.05, 0.03], false);
  part(head, 'box', 'gold', [0, 0.025, 0.198], [0.12, 0.015, 0.009], false);
  part(head, 'cone', armour, [0, -0.13, 0.14], [0.15, 0.23, 0.12]).rotation.x = 0.2;
  part(head, 'box', 'gold', [0, 0.15, 0.17], [0.025, 0.24, 0.025], false);
  for (const side of [-1, 1]) part(head, 'box', armour, [side * 0.18, -0.08, 0.025], [0.07, 0.23, 0.16]);
  const crest = joint('crest', head, 0, 0.2, -0.04);
  for (let i = 0; i < 5; i++)
    part(
      crest,
      'cone',
      kind === 'player' ? 'cloth' : 'red',
      [0, 0.12 + i * 0.025, -i * 0.055],
      [0.045, 0.3 - i * 0.025, 0.065],
      false,
    ).rotation.x = -i * 0.13;
  const arms = [],
    legs = [];
  for (const side of [-1, 1]) {
    const tag = side < 0 ? 'L' : 'R';
    const upper = joint(`arm${tag}`, chest, side * 0.38, 0.32, 0);
    part(upper, 'sphere', armour, [side * 0.015, -0.025, 0], [0.19, 0.15, 0.22]);
    part(upper, 'box', 'gold', [side * 0.02, 0.05, 0.13], [0.21, 0.03, 0.06], false);
    part(upper, 'cylinder', 'black', [0, -0.17, 0], [0.082, 0.32, 0.085]);
    const fore = joint(`fore${tag}`, upper, 0, -0.32, 0);
    part(fore, 'sphere', armour, [0, 0, -0.025], [0.1, 0.1, 0.11]);
    part(fore, 'cylinder', armour, [0, -0.15, 0], [0.1, 0.28, 0.105]);
    part(fore, 'cylinder', 'gold', [0, -0.25, 0], [0.106, 0.035, 0.11], false);
    const wrist = joint(`wrist${tag}`, fore, 0, -0.31, 0);
    part(wrist, 'sphere', 'black', [0, -0.03, 0], [0.095, 0.11, 0.085]);
    arms.push({ upper, fore, wrist });
    const thigh = joint(`thigh${tag}`, hips, side * 0.17, 0, 0);
    part(thigh, 'cylinder', 'black', [0, -0.22, 0], [0.11, 0.44, 0.115]);
    part(thigh, 'box', armour, [0, -0.18, 0.08], [0.18, 0.27, 0.08]);
    const shin = joint(`shin${tag}`, thigh, 0, -0.46, 0);
    part(shin, 'sphere', armour, [0, 0, 0.065], [0.13, 0.13, 0.11]);
    part(shin, 'cylinder', armour, [0, -0.22, 0], [0.095, 0.4, 0.11]);
    part(shin, 'box', 'gold', [0, -0.22, 0.109], [0.025, 0.27, 0.015], false);
    const ankle = joint(`foot${tag}`, shin, 0, -0.45, 0);
    part(ankle, 'box', 'black', [0, -0.005, 0.055], [0.22, 0.17, 0.35]);
    part(ankle, 'box', armour, [0, 0.035, 0.15], [0.22, 0.08, 0.19]);
    legs.push({ upper: thigh, fore: shin, wrist: ankle });
  }
  const shield = joint('shield', arms[0].wrist, -0.055, -0.035, 0.035);
  part(shield, 'sphere', kind === 'player' ? 'bronze' : 'dark', [0, 0, 0.04], [0.33, 0.44, 0.06]);
  part(shield, 'sphere', 'gold', [0, 0, 0.104], [0.065, 0.065, 0.025]);
  for (const a of [0, Math.PI / 2])
    part(shield, 'box', 'gold', [0, 0, 0.106], [0.035, 0.64, 0.013], false).rotation.z = a;
  const weapon = joint('weapon', arms[1].wrist, 0, -0.03, 0),
    bladeRoot = new T.Group();
  weapon.add(bladeRoot);
  part(bladeRoot, 'cylinder', 'black', [0, 0.02, 0], [0.045, 0.25, 0.045]);
  part(bladeRoot, 'sphere', 'gold', [0, 0.18, 0], [0.07, 0.07, 0.06]);
  part(bladeRoot, 'box', 'gold', [0, -0.12, 0], [0.36, 0.05, 0.075]);
  part(bladeRoot, 'box', 'iron', [0, -0.83, 0], [0.115, 1.35, 0.04]);
  part(bladeRoot, 'cone', 'iron', [0, -1.57, 0], [0.075, 0.19, 0.025]).rotation.z = Math.PI;
  part(bladeRoot, 'box', 'bone', [0.032, -0.8, 0.024], [0.025, 1.3, 0.008], false);
  const bladeTip = joint('bladeTip', bladeRoot, 0, -1.66, 0),
    bladeBase = joint('bladeBase', bladeRoot, 0, -0.2, 0);
  const staff = new T.Group();
  weapon.add(staff);
  staff.visible = kind === 'cantor';
  bladeRoot.visible = kind !== 'cantor';
  if (kind === 'cantor') {
    shield.visible = false;
    part(staff, 'cylinder', 'wood', [0, 0.35, 0], [0.045, 2.2, 0.045]);
    part(staff, 'sphere', 'gold', [0, 1.43, 0], [0.2, 0.25, 0.15]);
    part(staff, 'sphere', 'cyan', [0, 1.44, 0.02], [0.1, 0.15, 0.1]);
  }
  const flask = joint('flask', arms[0].wrist, 0, -0.12, 0.03);
  flask.visible = false;
  part(flask, 'sphere', 'gold', [0, 0, 0], [0.1, 0.15, 0.08]);
  part(flask, 'cylinder', 'glow', [0, 0.08, 0], [0.06, 0.15, 0.05], false);
  part(flask, 'box', 'bronze', [0, 0.18, 0], [0.08, 0.04, 0.07], false);
  const capeGeo = new T.PlaneGeometry(0.74, 1.16, 8, 12),
    capeMaterial = materials[kind === 'player' ? 'cloth' : 'red'].clone();
  if (capeMaterial.toon) capeMaterial.toon.set(materials.styles?.toon.values() || { bands: 3, rim: 0.12 });
  capeMaterial.color.copy(materials[kind === 'player' ? 'cloth' : 'red'].color);
  capeMaterial.side = T.DoubleSide;
  const cape = new T.Mesh(capeGeo, capeMaterial);
  cape.name = 'articulated-cape';
  cape.position.set(0, -0.16, -0.235);
  cape.castShadow = true;
  chest.add(cape);
  const capeBase = Float32Array.from(capeGeo.attributes.position.array);
  // Narrow gold hem strips share the cloth deformation, without an outline shell on a two-sided plane.
  const hemGeo = capeGeo.clone(),
    hemMat = materials.gold.clone();
  hemMat.color.copy(materials.gold.color);
  if (hemMat.toon) hemMat.toon.set(materials.styles.toon.values());
  hemMat.side = T.DoubleSide;
  const hem = new T.Mesh(hemGeo, hemMat);
  hem.position.copy(cape.position);
  hem.position.z -= 0.003;
  chest.add(hem);
  const hidx = [];
  const cols = 8,
    rows = 12;
  for (let r = 0; r < rows; r++)
    for (const col of [0, cols - 1]) {
      const a = r * (cols + 1) + col,
        b = a + 1,
        c = a + cols + 1,
        d = c + 1;
      hidx.push(a, c, b, b, c, d);
    }
  hemGeo.setIndex(hidx);
  const halo = new T.Mesh(new T.TorusGeometry(0.47, 0.025, 6, 48), materials.gold);
  halo.position.set(0, 0.1, -0.08);
  head.add(halo);
  halo.visible = kind === 'boss';
  if (kind === 'boss') {
    root.scale.setScalar(2.25);
    shield.visible = false;
    weapon.scale.set(1.2, 1.6, 1.2);
    for (const side of [-1, 1]) {
      part(head, 'cone', 'gold', [side * 0.22, 0.37, 0], [0.07, 0.75, 0.09]).rotation.z = -side * 0.4;
    }
  } else if (kind === 'knight') root.scale.setScalar(1.18);
  const trailGeo = new T.BufferGeometry(),
    trailPosition = new Float32Array(8 * 6 * 3),
    trailColor = new Float32Array(8 * 6 * 3);
  trailGeo.setAttribute('position', new T.BufferAttribute(trailPosition, 3));
  trailGeo.setAttribute('color', new T.BufferAttribute(trailColor, 3));
  const trail = new T.Mesh(
    trailGeo,
    new T.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.14,
      side: T.DoubleSide,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  trail.frustumCulled = false;
  root.add(trail);
  let first = true,
    lastX = 0,
    lastZ = 0,
    lastY = 0,
    lastTick = -1,
    lastState = '',
    age = 0,
    phase = 0,
    speed = 0,
    locomotion = 0,
    landing = 1,
    lastPose = null,
    worldDirX = 0,
    worldDirZ = 1;
  const temporary = new T.Quaternion(),
    parentQ = new T.Quaternion(),
    a = new T.Vector3(),
    b = new T.Vector3(),
    goal = new T.Vector3(),
    pole = new T.Vector3(),
    pair = [new T.Vector3(), new T.Vector3()],
    tip = new T.Vector3(),
    base = new T.Vector3(),
    history = [];
  function rotate(node, euler, dt, rate = 23) {
    temporary.setFromEuler(new T.Euler(...euler));
    node.quaternion.slerp(temporary, first ? 1 : 1 - Math.exp(-rate * dt));
  }
  function solve(limb, target, upper, lower, bend) {
    a.copy(limb.upper.position);
    twoBone(a, target, upper, lower, bend, pair);
    b.copy(pair[0]).sub(a).normalize();
    limb.upper.quaternion.setFromUnitVectors(DOWN, b);
    b.copy(pair[1]).sub(pair[0]).normalize().applyQuaternion(temporary.copy(limb.upper.quaternion).invert());
    limb.fore.quaternion.setFromUnitVectors(DOWN, b);
  }
  return {
    root,
    kind,
    joints,
    bladeTip,
    trail,
    reset() {
      first = true;
      lastTick = -1;
      phase = 0;
      age = 0;
      speed = 0;
      locomotion = 0;
      history.length = 0;
      lastState = '';
    },
    animate(unit, time, dt = 1 / 60, tick = Math.round(time * 60), reducedMotion = false) {
      dt = Math.max(0, Math.min(0.1, dt));
      const moved = Math.hypot(unit.x - lastX, unit.z - lastZ),
        teleport = first || moved > 3 || tick < lastTick;
      if (teleport) {
        first = true;
        speed = 0;
        locomotion = 0;
        phase = 0;
        history.length = 0;
      }
      const advances = tick !== lastTick,
        stepTime = lastTick < 0 ? dt : Math.max(1 / 60, (tick - lastTick) / 60);
      const currentSpeed = advances && !teleport ? Math.min(8, moved / stepTime) : speed;
      speed = T.MathUtils.lerp(speed, unit.hp > 0 ? currentSpeed : 0, 1 - Math.exp(-dt * 14));
      locomotion = T.MathUtils.lerp(locomotion, clamp(speed / 0.7), 1 - Math.exp(-dt * 10));
      if (advances && !teleport) {
        const { stride, stance } = gaitParameters(speed);
        phase += moved / (stride / stance);
      }
      if (unit.state !== lastState || teleport) {
        age = 0;
        lastState = unit.state;
      } else if (advances || unit.hp <= 0) age += advances ? stepTime : dt;
      if (lastY > 0 && (unit.y || 0) === 0 && unit.hp > 0) landing = 0;
      else landing += dt;
      const dx = teleport ? 0 : unit.x - lastX,
        dz = teleport ? 0 : unit.z - lastZ,
        d = Math.hypot(dx, dz);
      const yaw = unit.state === 'roll' ? Math.atan2(unit.dx, unit.dz) : unit.yaw;
      root.rotation.y +=
        Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y)) *
        (first ? 1 : 1 - Math.exp(-dt * 24));
      root.position.set(unit.x, unit.hp <= 0 ? (unit.y || 0) * (1 - smooth(age / 0.6)) : unit.y || 0, unit.z);
      if (d > 1e-5) {
        worldDirX = dx / d;
        worldDirZ = dz / d;
      }
      const localX = worldDirX * Math.cos(root.rotation.y) - worldDirZ * Math.sin(root.rotation.y),
        localZ = worldDirX * Math.sin(root.rotation.y) + worldDirZ * Math.cos(root.rotation.y);
      const pose = sampleMotion(unit, {
        time,
        phase,
        speed,
        age,
        moveWeight: locomotion,
        moveX: localX,
        moveZ: localZ,
        landing,
      });
      lastPose = pose;
      rotate(body, pose.body, dt, 35);
      hips.position.y = pose.hipY;
      rotate(hips, pose.hips, dt);
      rotate(chest, pose.chest, dt);
      rotate(head, pose.head, dt);
      body.position.set(0, pose.bodyY, pose.bodyZ);
      if (unit.state === 'roll') body.rotation.x = pose.body[0];
      if (unit.hp > 0) {
        a.set(0, pose.hipY, 0).applyQuaternion(body.quaternion);
        body.position.add(b.set(0, pose.hipY, 0).sub(a));
      }
      for (const tag of ['L', 'R']) {
        rotate(joints[`arm${tag}`], pose[`arm${tag}`], dt, unit.state === 'attack' ? 40 : 22);
        rotate(joints[`fore${tag}`], pose[`fore${tag}`], dt, 32);
        rotate(joints[`wrist${tag}`], pose[`wrist${tag}`], dt, 32);
      }
      if (pose.aimWeight > 0) {
        root.updateMatrixWorld(true);
        const [heading, elevation] = pose.bladeAim;
        goal.set(
          Math.sin(heading) * Math.cos(elevation),
          Math.sin(elevation),
          Math.cos(heading) * Math.cos(elevation),
        );
        root.getWorldQuaternion(temporary);
        goal.applyQuaternion(temporary);
        temporary.setFromUnitVectors(DOWN, goal);
        arms[1].fore.getWorldQuaternion(parentQ);
        parentQ.invert().multiply(temporary);
        arms[1].wrist.quaternion.slerp(parentQ, pose.aimWeight);
      }
      if (pose.twoHand > 0.1) {
        root.updateMatrixWorld(true);
        arms[1].wrist.getWorldPosition(goal);
        arms[1].wrist.getWorldQuaternion(temporary);
        goal.add(a.set(0, 0.11, 0).applyQuaternion(temporary));
        chest.worldToLocal(goal);
        pole.set(-1, 0, 0.5);
        solve(arms[0], goal, 0.32, 0.31, pole);
      }
      shield.visible = kind !== 'boss' && kind !== 'cantor' && pose.twoHand < 0.2 && pose.flask < 0.1;
      flask.visible = unit.state === 'heal';
      weapon.scale.y = kind === 'boss' ? 1.6 : unit.weapon === 'greatsword' ? 1.45 : 1;
      root.updateMatrixWorld(true);
      for (let i = 0; i < 2; i++) {
        const leg = legs[i];
        if (unit.state === 'roll' || unit.hp <= 0) {
          rotate(leg.upper, [unit.hp <= 0 ? -0.15 : -1.25, 0, 0], dt, 32);
          rotate(leg.fore, [unit.hp <= 0 ? 0.35 : 2.1, 0, 0], dt, 32);
          rotate(leg.wrist, [-0.2, 0, 0], dt);
        } else {
          goal.set(...pose.feet[i]);
          root.localToWorld(goal);
          hips.worldToLocal(goal);
          pole.set(0, 0, 1);
          solve(leg, goal, 0.46, 0.45, pole);
          root.updateMatrixWorld(true);
          leg.fore.getWorldQuaternion(parentQ);
          root.getWorldQuaternion(temporary);
          leg.wrist.quaternion.copy(parentQ.invert()).multiply(temporary);
        }
        tassets[i].rotation.x = legs[i].upper.rotation.x * 0.45;
      }
      const positions = capeGeo.attributes.position,
        hemPositions = hemGeo.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = capeBase[i * 3],
          y = capeBase[i * 3 + 1],
          u = (0.58 - y) / 1.16,
          width = 1 + 0.23 * u;
        const flutter = reducedMotion
          ? 0
          : Math.sin(time * 5 + u * 4 + x * 6) * 0.045 * u + Math.sin(time * 8 - u * 6) * 0.025 * u;
        const z = -u * u * (0.14 + speed * 0.05) + flutter;
        const hemY = y - 0.055 * Math.sin((x / 0.74 + 0.5) * Math.PI * 5) * u * u;
        positions.setXYZ(i, x * width, hemY, z);
        hemPositions.setXYZ(i, x * width, hemY, z - 0.003);
      }
      positions.needsUpdate = true;
      hemPositions.needsUpdate = true;
      capeGeo.computeVertexNormals();
      hemGeo.computeVertexNormals();
      crest.rotation.x = reducedMotion ? 0 : Math.sin(time * 6) * 0.055 + speed * 0.025;
      halo.rotation.z = reducedMotion ? 0 : time * 0.15;
      halo.scale.setScalar(unit.phase === 2 ? 1.35 : 1);
      root.updateMatrixWorld(true);
      bladeTip.getWorldPosition(tip);
      bladeBase.getWorldPosition(base);
      root.worldToLocal(tip);
      root.worldToLocal(base);
      if (pose.trail && !reducedMotion && unit.hp > 0) {
        history.unshift({ tip: tip.clone(), base: tip.clone().lerp(base, 0.12) });
        if (history.length > 9) history.pop();
      } else if (history.length) history.pop();
      let cursor = 0;
      for (let i = 0; i < 8; i++) {
        const h = history[i],
          n = history[i + 1];
        const points =
          h && n ? [h.base, h.tip, n.base, h.tip, n.tip, n.base] : [base, base, base, base, base, base];
        for (const point of points) {
          trailPosition[cursor] = point.x;
          trailColor[cursor++] = 1;
          trailPosition[cursor] = point.y;
          trailColor[cursor++] = 0.75 * (1 - i / 9);
          trailPosition[cursor] = point.z;
          trailColor[cursor++] = 0.3 * (1 - i / 9);
        }
      }
      trail.visible = history.length > 1;
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;
      if (advances) {
        lastX = unit.x;
        lastZ = unit.z;
        lastY = unit.y || 0;
        lastTick = tick;
      }
      first = false;
    },
    report() {
      root.updateMatrixWorld(true);
      return {
        kind,
        age,
        phase,
        speed,
        state: lastState,
        feet: legs.map((l) => l.wrist.getWorldPosition(new T.Vector3()).toArray()),
        pose: lastPose,
        parts: meshes.length,
        outlines: outlineMeshes.length,
      };
    },
    dispose() {
      capeGeo.dispose();
      capeMaterial.dispose();
      hemGeo.dispose();
      hemMat.dispose();
      trailGeo.dispose();
      trail.material.dispose();
    },
  };
}
