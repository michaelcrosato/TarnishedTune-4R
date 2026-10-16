/** Browser-only inspection stage; Vite resolves one shared three.js/TSL instance for the real game rigs. */
import * as T from 'three/webgpu';
import { createMaterials } from '../src/view/materials.js';
import { character } from '../src/view/character.js';
export async function mountReviewStage() {
  const renderer = new T.WebGPURenderer({
    canvas: document.querySelector('canvas'),
    antialias: true,
    forceWebGL: !navigator.gpu,
  });
  await renderer.init();
  renderer.setSize(750, 750);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color('#91afbd');
  const m = createMaterials();
  scene.add(new T.HemisphereLight('#b6d5e7', '#3c354c', 0.95));
  const sun = new T.DirectionalLight('#ffdfad', 3.2);
  sun.position.set(-3, 7, 5);
  sun.castShadow = true;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.08;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -5;
  scene.add(sun);
  const floor = new T.Mesh(new T.CircleGeometry(8, 64), m.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(3.8, 2.4, 5.4);
  camera.lookAt(0, 1, 0);
  let rig;
  window.__pose = async (spec) => {
    if (rig) {
      scene.remove(rig.root);
      rig.dispose();
    }
    rig = character(m, spec.kind || 'player');
    scene.add(rig.root);
    const boss = spec.kind === 'boss';
    camera.position.set(boss ? 8 : 3.8, boss ? 4.5 : 2.4, boss ? 11 : 5.4);
    camera.lookAt(0, boss ? 2.2 : 1, 0);
    for (let i = -24; i <= spec.frame; i++) {
      const moving = spec.state === 'walk' || spec.state === 'run';
      const speed = spec.state === 'run' ? 6.7 : 3;
      const u = {
        x: 0,
        z: moving ? (Math.max(0, i) * speed) / 60 : 0,
        y: spec.state === 'jump' ? 0.65 : 0,
        yaw: 0,
        hp: spec.state === 'dead' && i >= 0 ? 0 : 120,
        kind: spec.kind || 'player',
        state: i < 0 ? 'idle' : moving ? 'idle' : spec.state,
        weapon: spec.weapon || 'sword',
        attack: spec.kind ? '2' : 'light',
        combo: spec.combo || 0,
        elapsed: Math.max(0, i),
        timer: Math.max(0, (spec.state === 'phase' ? 150 : spec.kind === 'boss' ? 62 : 42) - i),
        phase: spec.state === 'phase' ? 2 : 1,
        guard: spec.state === 'guard' && i >= 0,
        dx: 0,
        dz: 1,
        vy: 3,
      };
      if (spec.heavy) u.attack = 'heavy';
      if (spec.kind) u.attack = 2;
      rig.animate(u, (i + 24) / 60, 1 / 60, i + 24);
    }
    rig.root.position.x = 0;
    rig.root.position.z = 0;
    document.querySelector('#caption').textContent = spec.label;
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    return rig.report();
  };
  window.__ready = true;
}
