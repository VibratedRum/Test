/**
 * 3D pirate deck — textured billboard enemies with bob / sway / strike.
 * Textures: Grok Imagine hyper-realistic character renders.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TEXTURES = [
  '/assets/pirate-2d-idle.png',
  '/assets/pirate-2d-attack.png',
  '/assets/pirate-2d-female-idle.png',
  '/assets/pirate-enemy-hero.png',
];

class Pirate3D {
  constructor(scene, texture, attackTexture, x, z) {
    this.scene = scene;
    this.attackTexture = attackTexture;
    this.idleTexture = texture;
    this.phase = Math.random() * Math.PI * 2;
    this.attackT = 0;
    this.state = 'idle';

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.05,
    });

    const geo = new THREE.PlaneGeometry(2.2, 3.2);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, 1.55, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Ground disc shadow proxy
    const shadowGeo = new THREE.CircleGeometry(0.55, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(x, 0.02, z);
    scene.add(this.shadow);

    this.baseY = 1.55;
    this.baseX = x;
    this.baseZ = z;
  }

  attack() {
    this.state = 'attack';
    this.attackT = 0.6;
    if (this.attackTexture) {
      this.mesh.material.map = this.attackTexture;
      this.mesh.material.needsUpdate = true;
    }
  }

  update(dt, camera) {
    this.phase += dt * 3.2;
    this.mesh.lookAt(camera.position.x, this.mesh.position.y, camera.position.z);

    const bob = Math.sin(this.phase) * 0.06;
    const sway = Math.sin(this.phase * 0.7) * 0.04;
    let strike = 0;

    if (this.state === 'attack') {
      this.attackT -= dt;
      strike = Math.sin((1 - this.attackT / 0.6) * Math.PI) * 0.35;
      if (this.attackT <= 0) {
        this.state = 'idle';
        this.mesh.material.map = this.idleTexture;
        this.mesh.material.needsUpdate = true;
      }
    }

    this.mesh.position.y = this.baseY + bob;
    this.mesh.position.x = this.baseX + sway + strike * 0.2;
    this.mesh.rotation.z = sway * 0.4 + strike * 0.15;
    this.shadow.position.x = this.mesh.position.x;
    this.shadow.scale.setScalar(1 + bob * 0.4);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.shadow);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }
}

export function createArena3D(container) {
  const countEl = document.getElementById('count-3d');
  const pirates = [];
  const loader = new THREE.TextureLoader();
  const textures = [];
  let attackTex = null;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050a0e, 0.045);
  scene.background = new THREE.Color(0x050a0e);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100,
  );
  camera.position.set(0, 3.2, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.4, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 4;
  controls.maxDistance = 16;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;

  // Lighting
  const hemi = new THREE.HemisphereLight(0x8eb6c8, 0x2a1810, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2b8, 1.35);
  key.position.set(4, 8, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4a7a9a, 0.45);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const lantern = new THREE.PointLight(0xc4a35a, 1.4, 18, 2);
  lantern.position.set(0, 3.5, 0);
  scene.add(lantern);

  // Deck
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x3a2618,
    roughness: 0.9,
    metalness: 0.05,
  });
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.4, 0.35, 48), deckMat);
  deck.position.y = -0.15;
  deck.receiveShadow = true;
  scene.add(deck);

  // Plank lines
  const plankMat = new THREE.MeshBasicMaterial({ color: 0x1a100a });
  for (let i = -6; i <= 6; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(13, 0.02, 0.04), plankMat);
    plank.position.set(0, 0.03, i * 0.85);
    scene.add(plank);
  }

  // Mast
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x2c1c12, roughness: 0.85 }),
  );
  mast.position.set(-2.5, 3, -2);
  mast.castShadow = true;
  scene.add(mast);

  // Ocean ring
  const ocean = new THREE.Mesh(
    new THREE.RingGeometry(7.5, 28, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0a2430,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.2;
  scene.add(ocean);

  let running = false;
  let raf = 0;
  let last = 0;
  let ready = false;

  async function init() {
    const loaded = await Promise.all(
      TEXTURES.map(
        (url) =>
          new Promise((resolve, reject) => {
            loader.load(
              url,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                resolve(tex);
              },
              undefined,
              reject,
            );
          }),
      ),
    );
    textures.push(...loaded);
    attackTex = loaded[1];
    ready = true;
    spawn();
    spawn();
    spawn();
    updateCount();
  }

  function spawn() {
    if (!ready) return;
    const tex = textures[Math.floor(Math.random() * textures.length)];
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 3.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    pirates.push(new Pirate3D(scene, tex, attackTex, x, z));
    updateCount();
  }

  function attackAll() {
    pirates.forEach((p) => p.attack());
  }

  function toggleOrbit() {
    controls.autoRotate = !controls.autoRotate;
  }

  function updateCount() {
    if (countEl) countEl.textContent = `Enemies: ${pirates.length}`;
  }

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', onResize);

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
    last = t;

    lantern.intensity = 1.25 + Math.sin(t * 0.004) * 0.2;
    controls.update();
    for (const p of pirates) p.update(dt, camera);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function resume() {
    if (running) return;
    running = true;
    last = performance.now();
    onResize();
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  init();

  return { spawn, attackAll, toggleOrbit, resume, pause };
}
