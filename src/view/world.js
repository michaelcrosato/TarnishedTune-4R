/** The Hollow Belfry: hand-authored architecture, code-grown trees and distant silhouettes. */
import * as T from 'three/webgpu';
import { Rng } from '../../vendor/my3dge/my3dge.js';
import { LEVEL, SHRINES, onGround } from '../sim/content.js';
import { Builder } from './builder.js';
function column(b, x, z, h = 8) {
  b.box('dark', x, 0.25, z, 1.9, 0.5, 1.9);
  b.box('pale', x, 0.7, z, 1.5, 0.4, 1.5);
  b.cylinder('stone', x, h / 2 + 0.7, z, 0.48, 0.62, h, 10);
  b.cylinder('pale', x, h + 0.6, z, 0.8, 0.62, 0.5, 8);
  b.box('pale', x, h + 1, z, 1.75, 0.35, 1.75);
  for (const y of [1.4, h - 1]) b.cylinder('bronze', x, y, z, 0.63, 0.63, 0.12, 10);
}
function arch(b, x, z, w = 7, h = 9, ry = 0) {
  const root = new T.Vector3(x, 0, z);
  const transform = (a, y, c) => [
    x + Math.cos(ry) * a + Math.sin(ry) * c,
    y,
    z - Math.sin(ry) * a + Math.cos(ry) * c,
  ];
  for (const side of [-1, 1]) {
    const p = transform((side * w) / 2, 0, 0);
    column(b, p[0], p[2], h - w / 2);
  }
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const theta = ((i + 0.5) / steps) * Math.PI,
      px = (Math.cos(theta) * w) / 2,
      py = h - w / 2 + (Math.sin(theta) * w) / 2;
    const pos = transform(px, py, 0);
    const g = new T.BoxGeometry(((w * Math.PI) / steps) * 0.6, 0.8, 1.05);
    const obj = new T.Object3D();
    obj.rotation.set(0, ry, theta - Math.PI / 2);
    obj.position.set(...pos);
    obj.updateMatrix();
    g.applyMatrix4(obj.matrix);
    b.add(g, i % 3 === 0 ? 'pale' : 'stone');
    g.dispose();
  }
}
function tree(b, rng, x, z, scale = 1, golden = false) {
  const tips = [];
  function branch(a, len, radius, heading, lean, depth) {
    const end = [
      a[0] + Math.sin(heading) * len * lean,
      a[1] + len * (1 - lean * 0.4),
      a[2] + Math.cos(heading) * len * lean,
    ];
    b.beam(golden ? 'bronze' : 'dark', a, end, radius, radius * 0.57);
    if (depth <= 0) {
      tips.push(end);
      return;
    }
    for (let k = 0; k < (depth === 3 ? 3 : 2); k++)
      branch(
        end,
        len * rng.range(0.57, 0.78),
        radius * 0.53,
        heading + (k === 0 ? -1 : 1) * rng.range(0.6, 1.8),
        rng.range(0.48, 0.85),
        depth - 1,
      );
  }
  branch([x, 0, z], 6.8 * scale, 0.6 * scale, 1, 0.15, 3);
  for (const tip of tips)
    for (let i = 0; i < 9; i++)
      b.sphere(
        golden ? 'leaf' : 'moss',
        tip[0] + rng.range(-2, 2) * scale,
        tip[1] + rng.range(-0.5, 1) * scale,
        tip[2] + rng.range(-2, 2) * scale,
        rng.range(0.3, 0.8) * scale,
        1.6,
        0.35,
        1,
      );
  if (golden) for (const tip of tips) b.sphere('glow', tip[0], tip[1], tip[2], 0.07 * scale);
}
export function buildWorld(materials) {
  const b = new Builder(materials),
    rng = new Rng(926),
    dynamic = new T.Group();
  // One tile per metre in the union of regions: no overlapping floors, gaps or z-fighting.
  const plane = new T.PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);
  const edge = new T.BoxGeometry(1, 1, 1);
  for (let x = 2; x < 63; x++)
    for (let z = 2; z < 118; z++)
      if (onGround(x + 0.5, z + 0.5)) {
        b.add(plane, (x + z) % 17 === 0 ? 'moss' : 'floor', x + 0.5, 0, z + 0.5);
        if (
          !onGround(x - 1, z + 0.5) ||
          !onGround(x + 1.5, z + 0.5) ||
          !onGround(x + 0.5, z - 1) ||
          !onGround(x + 0.5, z + 1.5)
        ) {
          const depth = rng.range(6, 14);
          b.add(edge, 'rock', x + 0.5, -depth / 2 - 0.05, z + 0.5, 0, 0, 0, 1.2, depth, 1.2);
          b.sphere('rock', x + 0.5, -3, z + 0.5, 1.2, 1.2, 3, 1.2);
        }
      }
  plane.dispose();
  edge.dispose();
  // Processional paving and raised curbs frame the walking direction.
  for (let z = 44; z < 115; z += 2.1)
    for (let x = 29.1; x < 35; x += 1.9) {
      if ((z > 76 && z < 88) || z < 74 || z > 91) b.box('pale', x, 0.035, z, 1.75, 0.07, 1.95);
    }
  for (const side of [-1, 1])
    for (let z = 77; z < 89; z += 1.6) b.box('stone', 32 + side * 3.6, 0.38, z, 0.6, 0.76, 1.6);
  for (const o of LEVEL.obstacles) {
    if (o.type === 'column') column(b, o.x, o.z, o.h);
    else if (o.type === 'tomb') {
      b.box('dark', o.x, 0.55, o.z, o.w, 1.1, o.d);
      b.box('pale', o.x, 1.2, o.z, o.w + 0.3, 0.2, o.d + 0.3);
      b.box('bronze', o.x, 1.36, o.z, 0.16, 0.1, o.d * 0.7);
    } else b.sphere('rock', o.x, 0.8, o.z, 1.3, 1.2, 1.1, 1.3);
  }
  arch(b, 32, 88, 8, 10);
  arch(b, 32, 75, 12, 12);
  arch(b, 32, 45, 10, 14);
  arch(b, 32, 39, 9, 13);
  // Roofless nave, side bays and thin buttresses. The central aisle remains readable.
  for (const x of [19.6, 44.4])
    for (const z of [48, 58, 68]) {
      arch(b, x, z, 7.4, 11, Math.PI / 2);
      b.box('dark', x, 2, z + 4, 0.6, 4, 1.8);
      b.box('stone', x, 5.2, z + 4, 1.1, 0.3, 2.4);
    }
  for (const z of [48, 58, 68]) {
    b.beam('stone', [22, 8, z], [32, 14, z], 0.34, 0.3);
    b.beam('stone', [42, 8, z], [32, 14, z], 0.34, 0.3);
    b.box('bronze', 32, 14, z, 0.25, 0.6, 0.25);
  }
  // Broken upper tracery and a distant bell tower.
  for (const x of [18, 46]) {
    b.box('dark', x, 7.5, 41, 5, 15, 6);
    b.box('stone', x, 15.4, 41, 6, 0.7, 7);
    for (const dx of [-2, 2])
      for (const dz of [-2, 2]) {
        b.box('stone', x + dx, 18, 41 + dz, 0.65, 5, 0.65);
        b.cylinder('bronze', x + dx, 21, 41 + dz, 0, 0.6, 2, 6);
      }
    arch(b, x, 43, 3, 20);
    b.box('pale', x, 21, 41, 5, 0.4, 5);
  }
  // Belfry arena ring, broken columns and suspended bell.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2,
      x = 32 + Math.sin(a) * 17,
      z = 22 + Math.cos(a) * 17;
    if (z > 37) continue;
    column(b, x, z, i % 4 === 0 ? 11 : 5 + rng.range(0, 3));
    if (i % 3 !== 0) b.box('dark', x, 0.65, z, 2, 1.3, 1, a);
  }
  b.ring('bronze', 32, 0.04, 22, 12, 0.06, Math.PI / 2);
  b.ring('gold', 32, 0.06, 22, 8, 0.055, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.box('gold', 32 + Math.sin(a) * 10, 0.06, 22 + Math.cos(a) * 10, 0.12, 0.05, 1.2, a);
  }
  arch(b, 32, 7, 10, 19);
  b.cylinder('bronze', 32, 12.5, 7, 1.3, 2.7, 3.4, 20);
  b.ring('gold', 32, 10.8, 7, 2.75, 0.16, Math.PI / 2);
  b.cylinder('dark', 32, 10.7, 7, 0.3, 0.4, 2, 8);
  b.beam('dark', [32, 15, 7], [32, 19, 7], 0.1, 0.1);
  b.box('pale', 32, 0.3, 7, 5, 0.6, 4);
  b.cylinder('gold', 32, 1.2, 8, 0.12, 0.2, 1.7, 8);
  // Original golden ash tree is the skyline anchor, planted beyond the arena.
  tree(b, rng, 43, 5, 2.3, true);
  tree(b, rng, 6, 59, 0.65, true);
  tree(b, rng, 9, 86, 0.7, false);
  tree(b, rng, 45, 96, 0.95, true);
  for (let i = 0; i < 9; i++)
    tree(b, rng, rng.range(-20, 70), rng.range(-55, -15), rng.range(0.7, 1.5), i % 3 === 0);
  // Garden graves and candles.
  for (let i = 0; i < 18; i++) {
    const x = 4 + (i % 3) * 5.5,
      z = 57 + Math.floor(i / 3) * 6.2;
    if (Math.hypot(x - 10, z - 62) < 3) continue;
    b.box('stone', x, 0.55, z, 0.8, 1.1, 0.25, rng.range(-0.18, 0.18));
    b.box('pale', x, 1, z, 1.15, 0.18, 0.26);
  }
  for (const s of SHRINES) {
    b.cylinder('dark', s.x, 0.15, s.z, 1.35, 1.5, 0.3, 24);
    b.ring('gold', s.x, 0.31, s.z, 1.2, 0.055, Math.PI / 2);
    b.cylinder('gold', s.x, 0.65, s.z, 0.32, 0.55, 0.7, 8);
    b.sphere('glow', s.x, 1.15, s.z, 0.25, 0.6, 1.7, 0.6);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b.box('glow', s.x + Math.sin(a) * 0.85, 0.46, s.z + Math.cos(a) * 0.85, 0.08, 0.28, 0.08);
    }
  }
  // Grass, rubble and gold motes keep the foreground rich without additional draw calls.
  for (let i = 0; i < 1900; i++) {
    const x = rng.range(3, 60),
      z = rng.range(6, 116);
    if (!onGround(x, z, 0.4) || Math.abs(x - 32) < 3.7) continue;
    if (i % 6 === 0) b.sphere('stone', x, 0.13, z, rng.range(0.12, 0.4), 1.6, 0.7, 1);
    else {
      const h = rng.range(0.2, 0.65);
      b.beam(i % 4 ? 'grass' : 'leaf', [x, 0, z], [x + rng.range(-0.18, 0.18), h, z], 0.024, 0.005);
    }
  }
  // Mountains and ruins beyond the traversable floating promontory.
  for (let i = 0; i < 35; i++) {
    const x = rng.range(-180, 180),
      z = rng.range(-190, -60),
      h = rng.range(18, 95);
    b.sphere('dark', x, -9, z, h, 0.5, 1, 0.5);
    if (i % 3 === 0) {
      b.box('dark', x, h * 0.25, z, 4, h * 0.7, 5);
      b.cylinder('dark', x, h * 0.7, z, 0, 4, h * 0.25, 4);
    }
  }
  const water = new T.Mesh(new T.PlaneGeometry(900, 900), materials.water);
  water.rotation.x = -Math.PI / 2;
  water.position.set(20, -15, -20);
  dynamic.add(water);
  const gate = new T.Group();
  for (let i = 0; i < 7; i++) {
    const bar = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 3, 5), materials.bronze);
    bar.position.set(22, 1.5, 91 + i * 0.95);
    gate.add(bar);
  }
  dynamic.add(gate);
  const fog = new T.Mesh(new T.PlaneGeometry(8, 8), materials.ghost);
  fog.position.set(32, 4, 39);
  dynamic.add(fog);
  return { static: b.finish(), dynamic, gate, fog };
}
