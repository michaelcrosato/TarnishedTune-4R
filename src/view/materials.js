/** Three-band cel materials from my-3dge, with a coherent ink/ochre/teal palette and hand-drawn tile maps. */
import * as T from 'three/webgpu';
import { Rng, defineMaterial, createStyleSet, createOutline } from '../../vendor/my3dge/my3dge.js';
export const PALETTE = Object.freeze({
  stone: '#8498aa',
  pale: '#d5d3bb',
  dark: '#34445b',
  floor: '#9da79f',
  rock: '#394e63',
  moss: '#4f7763',
  gold: '#edbb60',
  bronze: '#aa7d4e',
  iron: '#acc7d1',
  cloth: '#286e8d',
  red: '#99465b',
  bone: '#ede5cd',
  black: '#1b2535',
  leaf: '#efbb4c',
  grass: '#7e9d72',
  wood: '#755650',
  flower: '#c88eaa',
  paper: '#d5bb86',
  water: '#386474',
  banner: '#934355',
  ivy: '#45776a',
  glassBlue: '#56acbb',
  glassRose: '#cc766b',
  glassGold: '#e4bf67',
});
for (const [name, color] of Object.entries(PALETTE))
  defineMaterial(`material:tune-${name}`, { color, roughness: 1 });
function tileTexture(floor = false) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d'),
    rng = new Rng(floor ? 61 : 89);
  ctx.fillStyle = floor ? '#ededde' : '#e0e2dc';
  ctx.fillRect(0, 0, 256, 256);
  // Sparse inked fissures and dry-brush marks read as large stone, without the old miniature brick grid.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (!floor) {
    ctx.strokeStyle = '#6e7a80';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 85) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      const x = y % 2 ? 80 : 168;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 85);
      ctx.stroke();
    }
  }
  for (let i = 0; i < (floor ? 4 : 7); i++) {
    const x = rng.range(0, 256),
      y = rng.range(0, 256);
    ctx.strokeStyle = floor ? '#8c9997' : '#89959b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12, y + 17);
    ctx.lineTo(x + 7, y + 27);
    ctx.lineTo(x + 24, y + 39);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff88';
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 14, y + 15);
    ctx.stroke();
  }
  for (let i = 0; i < 85; i++) {
    ctx.fillStyle = i % 3 ? '#53646a0b' : '#fff7da20';
    ctx.fillRect(rng.range(0, 256), rng.range(0, 256), rng.range(3, 20), 1);
  }
  const texture = new T.CanvasTexture(c);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function clothTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#934355';
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = '#e6bd72';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 112, 238);
  ctx.lineWidth = 2;
  ctx.strokeRect(13, 13, 102, 228);
  ctx.fillStyle = '#ead291';
  ctx.beginPath();
  ctx.arc(64, 91, 23, Math.PI, 0);
  ctx.lineTo(91, 133);
  ctx.lineTo(37, 133);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(60, 53, 8, 112);
  ctx.beginPath();
  ctx.arc(64, 91, 32, 0, Math.PI * 2);
  ctx.stroke();
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
export function createMaterials({ textures = true } = {}) {
  const styles = createStyleSet({ style: 'toon', toon: { bands: 3, rim: 0.12 } });
  const m = Object.fromEntries(
    Object.keys(PALETTE).map((name) => [name, styles.get(`material:tune-${name}`)]),
  );
  if (textures) {
    m.stone.map = tileTexture();
    m.floor.map = tileTexture(true);
    m.pale.map = tileTexture(true);
    m.banner.map = clothTexture();
    m.banner.color.set('#ffffff');
  }
  m.banner.side = T.DoubleSide;
  m.grass.side = T.DoubleSide;
  m.ivy.side = T.DoubleSide;
  m.glow = new T.MeshBasicMaterial({ color: '#ffe3a1', toneMapped: false });
  m.cyan = new T.MeshBasicMaterial({ color: '#a0eee3', toneMapped: false });
  m.ember = new T.MeshBasicMaterial({ color: '#ef9875', toneMapped: false });
  m.ghost = new T.MeshBasicMaterial({
    color: '#cbe4d6',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: T.DoubleSide,
  });
  m.ink = new T.LineBasicMaterial({ color: '#223246', transparent: true, opacity: 0.35, fog: true });
  const smooth = createOutline({ color: '#182539', width: 1.7, mode: 'normal' });
  const angular = createOutline({ color: '#182539', width: 1.45, mode: 'centre' });
  Object.defineProperties(m, {
    styles: { value: styles },
    outline: { value: (mesh, shape = 'sphere') => (shape === 'box' ? angular : smooth).shell(mesh) },
    dispose: {
      value: () => {
        styles.dispose();
        smooth.dispose();
        angular.dispose();
      },
    },
  });
  return m;
}
