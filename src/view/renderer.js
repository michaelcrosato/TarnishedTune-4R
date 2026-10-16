/** Custom presentation adapter for the my-3dge headless runtime. WebGPU first, explicit WebGL2 compatibility. */
import * as T from 'three/webgpu';
import { createMaterials } from './materials.js';
import { buildWorld } from './world.js';
import { character } from './character.js';
import { createEffects, makeGlowTexture } from './effects.js';
import { ITEMS, NPC, LEVEL, distance } from '../sim/content.js';
export async function createRenderer(canvas, settings) {
  const query = new URLSearchParams(location.search);
  let adapter = null;
  if (!query.has('webgl'))
    try {
      adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    } catch {}
  let forceWebGL = !adapter || new URLSearchParams(location.search).has('webgl');
  const downgrades = [];
  let renderer = new T.WebGPURenderer({
    canvas,
    antialias: true,
    alpha: false,
    forceWebGL,
    powerPreference: 'high-performance',
  });
  try {
    await renderer.init();
  } catch (error) {
    if (forceWebGL) throw error;
    downgrades.push('GPU_INIT_FAILED: ' + String(error));
    const replacement = canvas.cloneNode();
    canvas.replaceWith(replacement);
    canvas = replacement;
    renderer = new T.WebGPURenderer({ canvas, antialias: true, forceWebGL: true });
    await renderer.init();
    forceWebGL = true;
  }
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  let backend = forceWebGL ? 'WebGL2 compatibility' : 'WebGPU';
  let recovering = false;
  renderer.onDeviceLost = async (info) => {
    if (recovering || backend === 'WebGL2 compatibility') return;
    recovering = true;
    document.dispatchEvent(new Event('tune:graphics-restoring'));
    downgrades.push('GPU_DEVICE_LOST: ' + info.message);
    console.warn('GPU_DEVICE_LOST: restarting the presentation on WebGL2. Gameplay state is preserved.');
    try {
      const replacement = canvas.cloneNode();
      canvas.replaceWith(replacement);
      canvas = replacement;
      renderer = new T.WebGPURenderer({ canvas, antialias: true, forceWebGL: true });
      await renderer.init();
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      backend = 'WebGL2 compatibility';
      resize();
      recovering = false;
    } catch (error) {
      document.dispatchEvent(new CustomEvent('tune:graphics-failed', { detail: String(error) }));
    }
  };
  const materials = createMaterials(),
    scene = new T.Scene();
  scene.background = new T.Color('#5b8194');
  scene.fog = new T.FogExp2('#789aa7', 0.006);
  const camera = new T.PerspectiveCamera(53, 1, 0.1, 420),
    world = buildWorld(materials);
  scene.add(world.static, world.dynamic);
  const hemi = new T.HemisphereLight('#b6d5e7', '#3c354c', 0.95);
  scene.add(hemi);
  const sun = new T.DirectionalLight('#ffdfad', 3.2);
  sun.position.set(-25, 55, -35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.08;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight('#adcfe4', 0.22);
  fill.position.set(20, 8, 60);
  scene.add(fill);
  const skyGeo = new T.SphereGeometry(350, 32, 16),
    colors = [];
  const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = T.MathUtils.clamp((pos.getY(i) + 20) / 240, 0, 1),
      color = new T.Color('#b8c8bc').lerp(new T.Color('#305a77'), t);
    colors.push(color.r, color.g, color.b);
  }
  skyGeo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const sky = new T.Mesh(
    skyGeo,
    new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false }),
  );
  scene.add(sky);
  const moon = new T.Mesh(
    new T.SphereGeometry(10, 32, 24),
    new T.MeshBasicMaterial({ color: '#e5d3a0', fog: false }),
  );
  moon.position.set(-45, 58, -100);
  scene.add(moon);
  const moonRing = new T.Mesh(
    new T.TorusGeometry(13, 0.09, 6, 80),
    new T.MeshBasicMaterial({ color: '#ddc99b', fog: false }),
  );
  moonRing.position.copy(moon.position);
  moonRing.rotation.z = 0.25;
  scene.add(moonRing);
  const pilgrim = character(materials);
  scene.add(pilgrim.root);
  const npcrig = character(materials, 'cantor');
  scene.add(npcrig.root);
  const actors = new Map(),
    pickups = new Map(),
    vessels = new Map(),
    effects = createEffects(scene, materials),
    glow = makeGlowTexture();
  for (const item of ITEMS) {
    const group = new T.Group(),
      core = new T.Mesh(
        new T.OctahedronGeometry(item.kind === 'verse' ? 0.23 : 0.16),
        materials[item.kind === 'verse' ? 'glow' : 'cyan'],
      );
    group.add(core);
    const halo = new T.Sprite(
      new T.SpriteMaterial({
        map: glow,
        color: item.kind === 'verse' ? 0xffdb88 : 0xb2e2d5,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    halo.scale.setScalar(2);
    group.add(halo);
    if (item.kind === 'verse') {
      const ring = new T.Mesh(new T.TorusGeometry(0.35, 0.018, 5, 24), materials.gold);
      group.add(ring);
    }
    group.position.set(item.x, 1, item.z);
    scene.add(group);
    pickups.set(item.id, group);
  }
  const drop = new T.Group();
  const dropCore = new T.Mesh(new T.OctahedronGeometry(0.2), materials.glow);
  drop.add(dropCore);
  const dHalo = new T.Sprite(
    new T.SpriteMaterial({ map: glow, blending: T.AdditiveBlending, depthWrite: false }),
  );
  dHalo.scale.setScalar(2.8);
  drop.add(dHalo);
  scene.add(drop);
  const target = new T.Vector3(32, 1.6, 104),
    desired = new T.Vector3(),
    lookAt = new T.Vector3(),
    projectPoint = new T.Vector3();
  let yaw = Math.PI,
    pitch = 0.25,
    first = true,
    quality = settings.quality || 'auto',
    resolution = 1,
    frameAverage = 16.7,
    slowFrames = 0,
    frameCount = 0,
    measurements = [],
    lastQualityChange = 0;
  const tiers = { high: 1, balanced: 0.8, low: 0.6 };
  function resize() {
    const w = innerWidth,
      h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dpr = Math.min(devicePixelRatio, 1.5) * (quality === 'auto' ? resolution : tiers[quality] || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
  }
  resize();
  addEventListener('resize', resize);
  return {
    get renderer() {
      return renderer;
    },
    get backend() {
      return backend;
    },
    camera,
    materials,
    get yaw() {
      return yaw;
    },
    get diagnostics() {
      return {
        backend,
        artStyle: {
          lighting: 'my-3dge banded toon',
          bands: materials.styles.toon.values().bands,
          outlines: true,
          details: world.details.counts,
        },
        downgrades,
        adapter: adapter?.info
          ? {
              vendor: adapter.info.vendor,
              architecture: adapter.info.architecture,
              device: adapter.info.device,
              description: adapter.info.description,
            }
          : null,
        quality,
        resolution,
        frames: frameCount,
        averageMs: frameAverage,
        fps: 1000 / frameAverage,
        drawCalls: renderer.info.render.drawCalls,
        triangles: renderer.info.render.triangles,
        samples: measurements.slice(-120),
      };
    },
    async warmup() {
      await renderer.compileAsync(scene, camera);
      frameCount = 0;
      measurements = [];
      frameAverage = 16.7;
    },
    setQuality(value) {
      quality = value;
      resize();
    },
    reset() {
      first = true;
      effects.reset();
      pilgrim.reset();
      npcrig.reset();
      for (const rig of actors.values()) rig.reset();
      yaw = Math.PI;
    },
    motionReport() {
      return { player: pilgrim.report(), enemies: [...actors].map(([id, rig]) => ({ id, ...rig.report() })) };
    },
    project(x, y, z) {
      projectPoint.set(x, y, z).project(camera);
      return {
        x: (projectPoint.x * 0.5 + 0.5) * innerWidth,
        y: (-0.5 * projectPoint.y + 0.5) * innerHeight,
        visible: projectPoint.z < 1 && projectPoint.z > -1,
      };
    },
    draw(s, time, dt, mode, look = [0, 0], reducedMotion = false, frameDt = dt) {
      if (recovering) return;
      frameCount++;
      if (frameDt > 0 && !document.hidden) {
        frameAverage = frameAverage * 0.96 + frameDt * 1000 * 0.04;
        if (frameCount % 30 === 0) measurements.push(frameDt * 1000);
        if (measurements.length > 300) measurements.shift();
      }
      if (quality === 'auto' && frameCount > 120) {
        slowFrames = frameAverage > 32 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames > 90 && resolution > 0.55 && time - lastQualityChange > 8) {
          resolution = Math.max(0.55, resolution - 0.15);
          sun.shadow.mapSize.set(1024, 1024);
          sun.shadow.map?.dispose();
          sun.shadow.map = null;
          if (resolution < 0.7) sun.castShadow = false;
          resize();
          lastQualityChange = time;
          slowFrames = 0;
        }
      }
      pilgrim.animate(s.p, time, dt, s.c.tick, reducedMotion);
      pilgrim.root.visible = mode !== 'title';
      npcrig.animate({ ...NPC, yaw: 0.5, hp: 1, state: 'idle' }, time, dt, s.c.tick, reducedMotion);
      for (const e of s.enemies) {
        if (!actors.has(e.id)) {
          const rig = character(materials, e.kind);
          actors.set(e.id, rig);
          scene.add(rig.root);
        }
        const rig = actors.get(e.id);
        rig.animate(e, time, dt, s.c.tick, reducedMotion);
        rig.root.visible = distance(s.p, e) < 52 || (mode === 'title' && e.kind === 'boss');
      }
      for (const item of ITEMS) {
        const g = pickups.get(item.id);
        g.visible = !s.c.collected.includes(item.id);
        g.position.y = 1 + Math.sin(time * 1.8 + item.x) * 0.14;
        g.rotation.y = time * 0.6;
      }
      for (const v of s.vessels) {
        if (!vessels.has(v.id)) {
          const mesh = new T.Mesh(new T.CylinderGeometry(0.25, 0.35, 0.8, 10), materials.bronze);
          mesh.position.set(v.x, 0.4, v.z);
          mesh.castShadow = true;
          scene.add(mesh);
          vessels.set(v.id, mesh);
        }
        vessels.get(v.id).visible = !v.broken;
      }
      drop.visible = !!s.c.drop;
      if (s.c.drop) {
        drop.position.set(s.c.drop.x, 0.8 + Math.sin(time * 2) * 0.15, s.c.drop.z);
        drop.rotation.y = time;
      }
      world.gate.position.y = s.c.shortcut ? -4 : 0;
      world.fog.visible = !s.c.bossDead;
      world.fog.material.opacity = 0.17 + Math.sin(time) * 0.05;
      effects.update(s, time, dt);
      world.details.update(time, reducedMotion);
      if (mode === 'title') {
        const drift = reducedMotion ? 0 : Math.sin(time * 0.06) * 2.5;
        desired.set(49 + drift, 9.5, 122);
        lookAt.set(28, 6.5, 83);
        camera.position.lerp(desired, first ? 1 : 0.025);
        camera.lookAt(lookAt);
      } else {
        const locked = s.enemies.find((e) => e.id === s.p.lock && e.hp > 0);
        if (locked) {
          const angle = Math.atan2(locked.x - s.p.x, locked.z - s.p.z);
          yaw += Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw)) * Math.min(1, dt * 3);
        } else {
          yaw -= look[0] * dt * 2.2;
          pitch = T.MathUtils.clamp(pitch + look[1] * dt * 1.2, -0.18, 0.8);
        }
        const forward = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const dist = locked && locked.kind === 'boss' ? 10.5 : 8.2;
        desired.set(
          s.p.x - forward.x * dist,
          3.9 + Math.sin(pitch) * 6 + s.p.y * 0.5,
          s.p.z - forward.z * dist,
        );
        // Bring the camera in before a solid pillar/tomb, with no effect on simulation.
        for (const o of LEVEL.obstacles) {
          if (o.h < desired.y) continue;
          const dx = desired.x - s.p.x,
            dz = desired.z - s.p.z;
          for (let t = 0.15; t < 1; t += 0.07) {
            if (
              Math.abs(s.p.x + dx * t - o.x) < o.w / 2 + 0.5 &&
              Math.abs(s.p.z + dz * t - o.z) < o.d / 2 + 0.5
            ) {
              desired.x = s.p.x + dx * Math.max(0.1, t - 0.15);
              desired.z = s.p.z + dz * Math.max(0.1, t - 0.15);
              break;
            }
          }
        }
        camera.position.lerp(desired, first ? 1 : 1 - Math.exp(-dt * 7));
        target.set(s.p.x, 1.6 + s.p.y * 0.6, s.p.z);
        if (locked) {
          target.x = T.MathUtils.lerp(s.p.x, locked.x, 0.24);
          target.z = T.MathUtils.lerp(s.p.z, locked.z, 0.24);
          target.y = locked.kind === 'boss' ? 2.1 : 1.6;
        }
        camera.lookAt(target);
      }
      first = false;
      sun.position.set(s.p.x - 28, 52, s.p.z - 25);
      sun.target.position.set(s.p.x, 0, s.p.z - 5);
      scene.fog.color.set(s.c.bossDead ? '#b0ba99' : '#789aa7');
      hemi.intensity = s.c.bossDead ? 1.15 : 0.95;
      renderer.info.reset();
      renderer.render(scene, camera);
    },
  };
}
