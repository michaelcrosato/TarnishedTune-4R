/** Static mesh batching: authored pieces become a small number of draw calls, one per material. */
import * as T from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export class Builder {
  constructor(materials) {
    this.materials = materials;
    this.pieces = new Map();
    this.temp = new T.Object3D();
  }
  add(geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    this.temp.position.set(x, y, z);
    this.temp.rotation.set(rx, ry, rz);
    this.temp.scale.set(sx, sy, sz);
    this.temp.updateMatrix();
    const geo = geometry.clone().applyMatrix4(this.temp.matrix);
    if (geo.index) {
      const flat = geo.toNonIndexed();
      geo.dispose();
      geometry = flat;
    } else geometry = geo;
    // Geometry recipes agree on attributes so a material's batch can be merged.
    for (const name of Object.keys(geometry.attributes))
      if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        'uv',
        new T.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2),
      );
    if (!this.pieces.has(material)) this.pieces.set(material, []);
    this.pieces.get(material).push(geometry);
  }
  box(m, x, y, z, w, h, d, ry = 0, rz = 0) {
    const g = new T.BoxGeometry(w, h, d);
    this.add(g, m, x, y, z, 0, ry, rz);
    g.dispose();
  }
  cylinder(m, x, y, z, top, bottom, h, n = 8) {
    const g = new T.CylinderGeometry(top, bottom, h, n);
    this.add(g, m, x, y, z);
    g.dispose();
  }
  sphere(m, x, y, z, r, sx = 1, sy = 1, sz = 1) {
    const g = new T.IcosahedronGeometry(r, 0);
    this.add(g, m, x, y, z, 0, x, z, sx, sy, sz);
    g.dispose();
  }
  beam(m, a, b, r1 = 0.2, r2 = 0.15) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      v = end.clone().sub(start),
      g = new T.CylinderGeometry(r2, r1, v.length(), 7);
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()),
      matrix = new T.Matrix4().compose(start.add(end).multiplyScalar(0.5), q, new T.Vector3(1, 1, 1));
    g.applyMatrix4(matrix);
    this.add(g, m);
    g.dispose();
  }
  ring(m, x, y, z, r, tube, rx = 0, arc = Math.PI * 2) {
    const g = new T.TorusGeometry(r, tube, 6, 40, arc);
    this.add(g, m, x, y, z, rx);
    g.dispose();
  }
  finish() {
    const root = new T.Group();
    for (const [name, pieces] of this.pieces) {
      const geometry = mergeGeometries(pieces, false);
      pieces.forEach((g) => g.dispose());
      geometry.computeBoundingSphere();
      const mesh = new T.Mesh(geometry, this.materials[name]);
      mesh.castShadow = !['glow', 'cyan', 'ghost', 'grass'].includes(name);
      mesh.receiveShadow = true;
      mesh.name = `world-${name}`;
      root.add(mesh);
    }
    this.pieces.clear();
    return root;
  }
}
