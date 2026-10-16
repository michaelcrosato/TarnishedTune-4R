/** Bounded presentation pool: sparks, leaves, healing motes, projectiles and ground warnings. */
import * as T from 'three/webgpu';
import { Rng } from '../../vendor/my3dge/my3dge.js';
import { ARCHETYPES } from '../sim/content.js';
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d'),
    g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,248,218,1)');
  g.addColorStop(0.12, 'rgba(255,220,150,.8)');
  g.addColorStop(0.4, 'rgba(255,198,110,.15)');
  g.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}
export function createEffects(scene, materials) {
  const rng = new Rng(800),
    particles = [],
    dummy = new T.Object3D(),
    color = new T.Color(),
    max = 320;
  const mesh = new T.InstancedMesh(
    new T.IcosahedronGeometry(0.035, 0),
    new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    max,
  );
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const glowTexture = makeGlowTexture(),
    glows = [];
  for (const [x, z] of [
    [29, 106],
    [22, 51],
    [43, 5],
  ]) {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: glowTexture,
        blending: T.AdditiveBlending,
        depthWrite: false,
        color: 0xffc875,
      }),
    );
    sprite.position.set(x, 1.5, z);
    sprite.scale.setScalar(3);
    scene.add(sprite);
    glows.push(sprite);
  }
  const warningGroup = new T.Group();
  scene.add(warningGroup);
  const warnings = new Map();
  const boltGroup = new T.Group();
  scene.add(boltGroup);
  const bolts = [];
  const waveGroup = new T.Group();
  scene.add(waveGroup);
  const waves = [];
  const lock = new T.Mesh(
    new T.RingGeometry(0.7, 0.75, 48),
    new T.MeshBasicMaterial({
      color: '#f4d6a0',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  lock.rotation.x = -Math.PI / 2;
  scene.add(lock);
  let lastEvent = 0;
  function burst(event) {
    const count = ['resonance', 'kill', 'phase'].includes(event.type)
      ? 42
      : ['hit', 'parry', 'heal', 'break'].includes(event.type)
        ? 20
        : 0;
    for (let i = 0; i < count && particles.length < max; i++)
      particles.push({
        x: event.x || 32,
        y: 0.8,
        z: event.z || 60,
        vx: rng.range(-3, 3),
        vy: rng.range(1, 5),
        vz: rng.range(-3, 3),
        life: rng.range(0.3, 0.9),
        color: event.type === 'heal' ? '#a3e0bf' : event.type === 'hurt' ? '#d65b46' : '#f4ce79',
      });
  }
  return {
    update(snapshot, time, dt) {
      for (const e of snapshot.c.events)
        if (e.id > lastEvent) {
          burst(e);
          lastEvent = e.id;
        }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.vy -= dt * 8;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      const ambient = 100;
      for (let i = 0; i < max; i++) {
        if (i < particles.length) {
          const p = particles[i];
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.setScalar(Math.min(2, p.life * 5));
          color.set(p.color);
        } else if (i < particles.length + ambient) {
          const n = i - particles.length;
          dummy.position.set(
            snapshot.p.x + Math.sin(n * 76.8 + time * 0.04) * 19,
            1 + (n % 15) * 0.5 + Math.sin(time * 0.3 + n),
            snapshot.p.z + Math.cos(n * 52.8 + time * 0.06) * 22,
          );
          dummy.scale.set(0.6, 0.15, 1.5);
          color.set(n % 4 ? '#b49e67' : '#f4d491');
        } else {
          dummy.scale.setScalar(0);
        }
        dummy.rotation.set(time + i, i, time * 0.4);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      for (const e of snapshot.enemies) {
        if (!warnings.has(e.id)) {
          const ring = new T.Mesh(
            new T.RingGeometry(0.95, 1, 48, 1, 0, Math.PI * 1.1),
            new T.MeshBasicMaterial({
              color: '#dba45d',
              side: T.DoubleSide,
              transparent: true,
              opacity: 0.4,
              depthWrite: false,
            }),
          );
          ring.rotation.x = -Math.PI / 2;
          warningGroup.add(ring);
          warnings.set(e.id, ring);
        }
        const ring = warnings.get(e.id),
          a = ARCHETYPES[e.kind];
        ring.visible = e.state === 'windup' && e.hp > 0;
        ring.position.set(e.x, 0.08, e.z);
        ring.rotation.z = -e.yaw - Math.PI * 0.05;
        ring.scale.setScalar(a.range);
        ring.material.opacity = 0.2 + 0.5 * (1 - e.timer / a.windup);
        ring.material.color.set(e.kind === 'boss' && e.attack % 3 === 2 ? '#d96b5d' : '#edc986');
      }
      for (let i = 0; i < snapshot.c.projectiles.length; i++) {
        if (!bolts[i]) {
          bolts[i] = new T.Mesh(new T.IcosahedronGeometry(0.15, 1), materials.cyan);
          boltGroup.add(bolts[i]);
        }
        const p = snapshot.c.projectiles[i];
        bolts[i].visible = true;
        bolts[i].position.set(p.x, 1, p.z);
        bolts[i].scale.set(1, 1, 2.5);
        bolts[i].rotation.y = Math.atan2(p.vx, p.vz);
      }
      bolts.forEach((m, i) => (m.visible = i < snapshot.c.projectiles.length));
      for (let i = 0; i < snapshot.c.waves.length; i++) {
        if (!waves[i]) {
          waves[i] = new T.Mesh(new T.TorusGeometry(1, 0.025, 5, 64), materials.ember);
          waves[i].rotation.x = -Math.PI / 2;
          waveGroup.add(waves[i]);
        }
        const v = snapshot.c.waves[i];
        waves[i].position.set(v.x, 0.18, v.z);
        waves[i].scale.setScalar(v.radius);
      }
      waves.forEach((m, i) => (m.visible = i < snapshot.c.waves.length));
      const target = snapshot.enemies.find((e) => e.id === snapshot.p.lock && e.hp > 0);
      lock.visible = !!target;
      if (target) {
        lock.position.set(target.x, 0.09, target.z);
        lock.scale.setScalar(target.kind === 'boss' ? 1.6 : 1);
      }
      glows.forEach((g, i) => (g.material.opacity = 0.65 + Math.sin(time * 2 + i) * 0.12));
    },
    reset() {
      lastEvent = 0;
      particles.length = 0;
    },
  };
}
