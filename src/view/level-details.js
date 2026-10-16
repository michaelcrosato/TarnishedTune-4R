/** Authored set dressing. Solid additions sit outside traversal or within existing columns; hanging cloth clears heads. */
import * as T from 'three/webgpu';
import { Rng } from '../../vendor/my3dge/my3dge.js';
import { LEVEL, SHRINES, onGround } from '../sim/content.js';
const count = { banners: 0, ferns: 0, flowers: 0, ivy: 0, statues: 0, lanterns: 0, rosettes: 0 };
function rosette(b, x, y, z, r = 1.8) {
  b.ring('dark', x, y, z, r + 0.2, 0.18);
  b.ring('gold', x, y, z, r, 0.045);
  b.ring('gold', x, y, z, r * 0.35, 0.04);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      n = ((i + 1) / 12) * Math.PI * 2;
    b.beam(
      'bronze',
      [x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35, z],
      [x + Math.cos(a) * r, y + Math.sin(a) * r, z],
      0.025,
      0.025,
    );
    const vertices = [
      x + Math.cos(a) * r * 0.4,
      y + Math.sin(a) * r * 0.4,
      z,
      x + Math.cos(a) * r * 0.92,
      y + Math.sin(a) * r * 0.92,
      z,
      x + Math.cos(n) * r * 0.92,
      y + Math.sin(n) * r * 0.92,
      z,
    ];
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    b.add(g, ['glassBlue', 'glassRose', 'glassGold'][i % 3]);
    g.dispose();
  }
  b.sphere('gold', x, y, z, 0.22);
  count.rosettes++;
}
function fern(b, rng, x, z, size = 1) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rng.range(-0.3, 0.3),
      length = rng.range(0.35, 0.7) * size;
    const end = [x + Math.sin(a) * length, 0.24 * size, z + Math.cos(a) * length];
    b.beam('ivy', [x, 0.02, z], end, 0.009, 0.004);
    for (let j = 1; j < 5; j++)
      for (const side of [-1, 1]) {
        const t = j / 5,
          px = x + (end[0] - x) * t,
          pz = z + (end[2] - z) * t,
          h = Math.sin(t * Math.PI) * 0.25 * size;
        const tip = [
          px + Math.sin(a + side * 1.1) * (0.19 - t * 0.12) * size,
          h,
          pz + Math.cos(a + side * 1.1) * (0.19 - t * 0.12) * size,
        ];
        const g = new T.BufferGeometry();
        g.setAttribute(
          'position',
          new T.Float32BufferAttribute(
            [px, h - 0.035, pz, ...tip, px + Math.sin(a) * 0.08, h + 0.012, pz + Math.cos(a) * 0.08],
            3,
          ),
        );
        g.computeVertexNormals();
        b.add(g, j % 2 ? 'moss' : 'grass');
        g.dispose();
      }
  }
  count.ferns++;
}
function ivy(b, rng, x, z, h, side) {
  let prev = [x, 0, z];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12,
      next = [x + Math.sin(t * 8) * 0.16, t * h, z + Math.cos(t * 5) * 0.07];
    b.beam('wood', prev, next, 0.015, 0.01);
    for (const sign of [-1, 1])
      b.sphere('ivy', next[0] + sign * 0.14, next[1] - 0.06, next[2] + side * 0.09, 0.13, 1, 0.35, 0.75);
    prev = next;
  }
  count.ivy++;
}
function statue(b, x, z, angle) {
  b.cylinder('rock', x, -5, z, 1.3, 2.2, 10, 7);
  b.box('dark', x, 0.35, z, 2.6, 0.7, 2.6);
  b.box('pale', x, 0.8, z, 2.2, 0.2, 2.2);
  b.cylinder('stone', x, 1.65, z, 0.58, 0.85, 1.6, 8);
  b.sphere('pale', x, 2.8, z, 0.55, 0.8, 1.2, 0.8);
  for (const sign of [-1, 1]) {
    b.beam('pale', [x + sign * 0.6, 2.3, z], [x + sign * 0.26, 1.75, z + 0.55], 0.17, 0.13);
    b.beam('stone', [x + sign * 0.26, 1.75, z + 0.55], [x, 2.1, z + 0.6], 0.13, 0.1);
  }
  b.box('bronze', x, 1.7, z + 0.64, 0.12, 2.8, 0.1);
  b.ring('gold', x, 2.8, z - 0.12, 0.72, 0.025);
  count.statues++;
}
export function addLevelDetails(b, dynamic, materials) {
  for (const key of Object.keys(count)) count[key] = 0;
  const rng = new Rng(4702),
    banners = [],
    flames = [];
  function banner(x, y, z, yaw, width = 1.1, height = 2.6) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = yaw;
    const geometry = new T.PlaneGeometry(width, height, 6, 12),
      base = Float32Array.from(geometry.attributes.position.array);
    const mesh = new T.Mesh(geometry, materials.banner);
    mesh.position.y = -height / 2;
    mesh.castShadow = true;
    group.add(mesh);
    dynamic.add(group);
    banners.push({ mesh, base, height, phase: x + z });
    count.banners++;
    const dx = Math.cos(yaw) * width * 0.65,
      dz = -Math.sin(yaw) * width * 0.65;
    b.beam('bronze', [x - dx, y + 0.06, z - dz], [x + dx, y + 0.06, z + dz], 0.035, 0.035);
  }
  // Fluted columns, raised medallions and creeping ivy enrich the existing collision volumes.
  for (const o of LEVEL.obstacles.filter((o) => o.type === 'column')) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.beam(
        'pale',
        [o.x + Math.sin(a) * 0.53, 1.25, o.z + Math.cos(a) * 0.53],
        [o.x + Math.sin(a) * 0.45, o.h - 0.2, o.z + Math.cos(a) * 0.45],
        0.022,
        0.022,
      );
    }
    b.ring('gold', o.x, 2.2, o.z + 0.64, 0.25, 0.025);
    b.box('bronze', o.x, 2.2, o.z + 0.64, 0.07, 0.6, 0.035);
    if (o.z % 3 !== 0) ivy(b, rng, o.x - 0.49, o.z + 0.35, o.h * 0.62, 1);
  }
  for (const x of [21, 43]) for (const z of [48, 58, 68]) banner(x, 7.4, z + 0.8, 0, 1.25, 3.1);
  for (const x of [26.4, 37.6]) banner(x, 8.1, 88, 0, 1.05, 3.4);
  banner(18.3, 14.8, 44.2, 0, 2, 4.1);
  banner(45.7, 14.8, 44.2, 0, 2, 4.1);
  // Suspended lanterns stay above the player and cast readable warm points against the cool stone.
  for (const x of [22, 42])
    for (const z of [53, 63]) {
      b.beam('bronze', [x, 7, z], [x, 4.7, z], 0.018, 0.018);
      b.cylinder('gold', x, 4.2, z, 0.15, 0.3, 0.7, 6);
      b.cylinder('dark', x, 4.65, z, 0.35, 0.15, 0.2, 6);
      b.sphere('glow', x, 4.3, z, 0.16, 0.7, 1.3, 0.7);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        b.beam(
          'dark',
          [x + Math.sin(a) * 0.2, 3.9, z + Math.cos(a) * 0.2],
          [x + Math.sin(a) * 0.2, 4.6, z + Math.cos(a) * 0.2],
          0.022,
          0.022,
        );
      }
      count.lanterns++;
    }
  // Tracery above the nave entrance and the belfry; layered ribs give the roofless hall a finished silhouette.
  rosette(b, 32, 16.2, 44.7, 2.4);
  rosette(b, 32, 17.6, 7.1, 1.35);
  for (const z of [48, 58, 68])
    for (const side of [-1, 1]) {
      b.beam('pale', [32, 14, z], [32 + side * 6, 10.9, z], 0.09, 0.09);
      for (let i = 1; i < 5; i++)
        b.cylinder('bronze', 32 + side * i * 1.2, 14 - i * 0.58, z, 0.045, 0.045, 0.48, 6);
    }
  // Off-path votive plinths and pilgrim statues frame the approach and arena without narrowing the route.
  for (const [x, z] of [
    [16, 103],
    [48, 103],
    [9, 29],
    [55, 29],
    [15, 8],
    [49, 8],
  ])
    statue(b, x, z, 0);
  // Shrines gain offerings, wick flames and inset rings. These are ankle-height surface details.
  for (const s of SHRINES) {
    b.ring('bronze', s.x, 0.025, s.z, 1.8, 0.025, Math.PI / 2);
    b.ring('pale', s.x, 0.028, s.z, 1.95, 0.03, Math.PI / 2);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      b.box(
        i % 2 ? 'bronze' : 'gold',
        s.x + Math.sin(a) * 1.8,
        0.045,
        s.z + Math.cos(a) * 1.8,
        0.07,
        0.04,
        0.22,
        a,
      );
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2,
        x = s.x + Math.sin(a) * 1.55,
        z = s.z + Math.cos(a) * 1.55,
        h = rng.range(0.13, 0.32);
      b.cylinder('paper', x, h / 2, z, 0.055, 0.065, h, 6);
      b.sphere('glow', x, h + 0.045, z, 0.035, 0.6, 1.5, 0.6);
    }
    const flame = new T.Mesh(new T.ConeGeometry(0.12, 0.65, 7), materials.glow);
    flame.position.set(s.x, 1.47, s.z);
    dynamic.add(flame);
    flames.push(flame);
  }
  // The belfry floor carries a radial bronze score, stone petals and a sunburst around its bell.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2,
      x = 32 + Math.sin(a) * 12.8,
      z = 22 + Math.cos(a) * 12.8;
    b.box('bronze', x, 0.034, z, 0.07, 0.03, 0.7, a);
    b.box('pale', 32 + Math.sin(a) * 14, 0.018, 22 + Math.cos(a) * 14, 0.55, 0.025, 1.35, a);
    b.ring('gold', x, 0.045, z, 0.15, 0.012, Math.PI / 2);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.box('gold', 32 + Math.sin(a) * 2.7, 0.03, 7 + Math.cos(a) * 2.7, 0.055, 0.03, 1.5, a);
  }
  // Fern clusters follow garden edges and the bases of existing stones, leaving the combat aisle open.
  for (const [x, z] of [
    [5, 58],
    [5, 67],
    [18, 73],
    [7, 84],
    [18, 90],
    [21, 101],
    [43, 109],
    [20, 70],
    [43, 59],
    [23, 50],
    [14, 94],
  ]) {
    for (let i = 0; i < 4; i++)
      fern(b, rng, x + rng.range(-0.8, 0.8), z + rng.range(-1, 1), rng.range(0.65, 1.1));
  }
  for (let i = 0; i < 90; i++) {
    const x = rng.range(4, 19),
      z = rng.range(55, 92);
    if (!onGround(x, z, 0.5)) continue;
    const h = rng.range(0.15, 0.4);
    b.beam('ivy', [x, 0, z], [x, h, z], 0.012, 0.008);
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2;
      b.sphere('flower', x + Math.sin(a) * 0.055, h, z + Math.cos(a) * 0.055, 0.045, 1, 0.3, 1);
    }
    count.flowers++;
  }
  for (let i = 0; i < 170; i++) {
    const x = rng.range(4, 46),
      z = rng.range(46, 115);
    if (!onGround(x, z, 0.25) || Math.abs(x - 32) < 2) continue;
    const g = new T.PlaneGeometry(0.08, 0.18);
    b.add(g, i % 4 ? 'leaf' : 'paper', x, 0.025, z, -Math.PI / 2, rng.range(0, 6), rng.range(0, 6));
    g.dispose();
  }
  // Fallen masonry sits beyond the ledge, while the garden graves get recessed inscriptions.
  for (const x of [1, 49])
    for (const z of [57, 69, 101]) {
      b.box('rock', x, -5, z, 3.8, 10, 5.8);
      b.box('dark', x, -0.4, z, 4, 1, 6);
      b.cylinder('stone', x, 0.7, z, 0.8, 1, 1.4, 8);
      for (let i = 0; i < 3; i++)
        b.box('pale', x + rng.range(-1.4, 1.4), 0.1, z + rng.range(-2, 2), 0.8, 0.3, 0.6, rng.range(0, 3));
    }
  for (let i = 0; i < 18; i++) {
    const x = 4 + (i % 3) * 5.5,
      z = 57 + Math.floor(i / 3) * 6.2;
    if (Math.hypot(x - 10, z - 62) < 3) continue;
    for (let j = 0; j < 3; j++) b.box('dark', x, 0.35 + j * 0.16, z + 0.133, 0.31 - j * 0.055, 0.025, 0.008);
  }
  return {
    counts: { ...count },
    update(time, reducedMotion = false) {
      for (const { mesh, base, height, phase } of banners) {
        const a = mesh.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const x = base[i * 3],
            y = base[i * 3 + 1],
            t = (height / 2 - y) / height;
          a.setXYZ(
            i,
            x + (reducedMotion ? 0 : Math.sin(time * 1.1 + phase) * 0.04 * t),
            y - ((i % 7) % 2) * 0.12 * t * t,
            reducedMotion
              ? 0
              : Math.sin(time * 1.6 + phase + t * 4 + x) * (0.11 * t) +
                  Math.sin(time * 3 - t * 7) * 0.035 * t * t,
          );
        }
        a.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
      flames.forEach((f, i) => {
        f.scale.set(
          reducedMotion ? 1 : 1 + Math.sin(time * 5 + i) * 0.12,
          reducedMotion ? 1 : 1 + Math.sin(time * 7 + i) * 0.2,
          1,
        );
        f.rotation.z = reducedMotion ? 0 : Math.sin(time * 3 + i) * 0.12;
      });
    },
  };
}
