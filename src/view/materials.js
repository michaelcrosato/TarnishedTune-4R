/** Original code-generated tiling textures and restrained material palette. No external assets or requests. */
import * as T from 'three/webgpu';
import { Rng } from '../../vendor/my3dge/my3dge.js';
export function createMaterials() {
  const rng = new Rng(407),
    canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#89958b';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 11000; i++) {
    const c = rng.int(70, 160);
    ctx.fillStyle = `rgba(${c},${c},${c},.14)`;
    ctx.fillRect(rng.int(0, 255), rng.int(0, 255), rng.int(1, 4), rng.int(1, 3));
  }
  ctx.strokeStyle = '#4f5853';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
    for (let x = y % 128 ? 32 : 0; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 64);
      ctx.stroke();
    }
  }
  const stoneTex = new T.CanvasTexture(canvas);
  stoneTex.wrapS = stoneTex.wrapT = T.RepeatWrapping;
  stoneTex.colorSpace = T.SRGBColorSpace;
  stoneTex.anisotropy = 4;
  const mat = (color, roughness = 0.85, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const m = {
    stone: mat('#777b70'),
    pale: mat('#a2a58c'),
    dark: mat('#343d3c'),
    floor: mat('#909386'),
    rock: mat('#3b4b46'),
    moss: mat('#53624a'),
    gold: mat('#bd9960', 0.38, 0.72),
    bronze: mat('#76684b', 0.5, 0.6),
    iron: mat('#667d80', 0.4, 0.68),
    cloth: mat('#263d48'),
    red: mat('#5e3332'),
    bone: mat('#b2b5a4'),
    black: mat('#1b2427'),
    leaf: mat('#e0ad52'),
    grass: mat('#8c956b'),
  };
  m.stone.map = stoneTex;
  m.floor.map = stoneTex;
  m.pale.map = stoneTex;
  m.glow = new T.MeshBasicMaterial({ color: '#ffdb8e', toneMapped: false });
  m.cyan = new T.MeshBasicMaterial({ color: '#a4e8e2', toneMapped: false });
  m.ember = new T.MeshBasicMaterial({ color: '#ec8b5e', toneMapped: false });
  m.water = new T.MeshStandardMaterial({
    color: '#344d4d',
    roughness: 0.3,
    metalness: 0.4,
    transparent: true,
    opacity: 0.75,
  });
  m.ghost = new T.MeshBasicMaterial({
    color: '#dfd5aa',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: T.DoubleSide,
  });
  return m;
}
