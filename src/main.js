import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMaterials } from './world/materials.js';
import { PlanarReflection, makeWet } from './world/wet.js';
import { SITE } from './world/layout.js';
import { buildBase, buildStreet, buildPuddles } from './world/street.js';
import { buildKonbini, animateDoors, buildInteriorLights } from './world/konbini.js';
import { buildNeighbourhood, buildStreetFurniture, buildPowerLines, buildTrafficSignal, buildFarEdge } from './world/neighbourhood.js';
import { buildVendingMachine, buildBicycle, buildUmbrellaStand, buildTrashBins } from './world/props.js';
import { createRain, createDrips, createRipples, createGlassRain, createFlicker } from './world/effects.js';
import { createPipeline } from './core/pipeline.js';
import { setMaxAnisotropy } from './core/textures.js';

/* ------------------------------------------------------------------ *
 *  Rainy Night Konbini — a cel-shaded miniature diorama.
 * ------------------------------------------------------------------ */

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);
setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);
scene.fog = new THREE.FogExp2(0x101726, 0.0068);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.5, 220);
camera.layers.enable(1);
camera.position.set(15.2, 9.2, 19.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.0, 1.9, -1.6);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.rotateSpeed = 0.72;
controls.zoomSpeed = 0.85;
controls.panSpeed = 0.7;
controls.minDistance = 9;
controls.maxDistance = 78;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = Math.PI * 0.475;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.autoRotate = false;
controls.update();

// ------------------------------------------------------------------ lights
const hemi = new THREE.HemisphereLight(0x7d9be0, 0x35323f, 0.95);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xa8c4ff, 0.72);
moon.position.set(-14, 24, 16);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -22;
moon.shadow.camera.right = 22;
moon.shadow.camera.top = 22;
moon.shadow.camera.bottom = -22;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 70;
moon.shadow.bias = -0.0009;
moon.shadow.normalBias = 0.035;
scene.add(moon);

const fill = new THREE.DirectionalLight(0x6b8fd0, 0.38);
fill.position.set(18, 9, -12);
scene.add(fill);

// warm interior wash
const interiorLight = new THREE.PointLight(0xffc27a, 4.2, 9.5, 2);
interiorLight.position.set(0, 2.7, -1.4);
scene.add(interiorLight);

const interiorLight2 = new THREE.PointLight(0xffd6a0, 2.4, 7, 2);
interiorLight2.position.set(2.6, 2.4, -3.4);
scene.add(interiorLight2);

// storefront spill onto the wet forecourt
const spillLight = new THREE.PointLight(0xffb877, 5.2, 12, 2);
spillLight.position.set(0, 1.9, SITE.store.z1 + 2.4);
scene.add(spillLight);

// canopy downlight
const canopyLight = new THREE.PointLight(0xffd9a4, 2.6, 6.5, 2);
canopyLight.position.set(0, 2.6, SITE.store.z1 + 1.0);
scene.add(canopyLight);

// street lamp pools
const lampA = new THREE.PointLight(0xffc07a, 5.0, 11, 2);
lampA.position.set(-7.7, 4.1, 6.75);
scene.add(lampA);

const lampB = new THREE.PointLight(0xffc07a, 4.0, 10, 2);
lampB.position.set(5.8, 3.7, 6.75);
scene.add(lampB);

// vending machine cool glow in the alley
const vendLight = new THREE.PointLight(0xa8d4ff, 2.2, 7, 2);
vendLight.position.set(9.4, 1.5, 3.6);
scene.add(vendLight);

// ------------------------------------------------------------------- world
const reflection = new PlanarReflection(renderer, scene, camera, {
  planeY: SITE.roadY,
  every: 2,
});
reflection.setSize(window.innerWidth, window.innerHeight);

const M = buildMaterials(reflection);
const world = new THREE.Group();
world.name = 'diorama';
scene.add(world);

world.add(buildBase(M));
world.add(buildStreet(M));
world.add(buildPuddles(M));

const konbini = buildKonbini(M);
world.add(konbini.group);

// warm ceiling rig inside the shop
const interiorRig = buildInteriorLights();
for (const l of interiorRig) scene.add(l);

world.add(buildNeighbourhood(M));
world.add(buildStreetFurniture(M));
world.add(buildPowerLines(M));
world.add(buildFarEdge(M));

const signal = buildTrafficSignal(M);
world.add(signal.group);

// door-side props
world.add(buildUmbrellaStand(M, 2.75, 3.15));
world.add(buildBicycle(M, 4.55, 3.6, -0.42, 0));
world.add(buildBicycle(M, 5.3, 3.9, -0.3, 1));
world.add(buildBicycle(M, -6.5, 3.5, 0.35, 2));
world.add(buildTrashBins(M, -4.5, 3.0, 0.1));
world.add(buildVendingMachine(M, -11.9, 6.35, Math.PI));
// the classic pair against the shop's alley wall, fronts glowing toward the corner
world.add(buildVendingMachine(M, 5.86, -0.9, Math.PI / 2));
world.add(buildVendingMachine(M, 5.86, 0.32, Math.PI / 2));

// reflection should not include the sky or the rain particles
reflection.hide = [];
reflection.collect(world);

// ----------------------------------------------------------------- effects
const rain = createRain();
const drips = createDrips();
const ripples = createRipples();
const glassRainA = createGlassRain(3.4, 2.4, -2.45, 1.75, SITE.store.z1 + 0.045);
const glassRainB = createGlassRain(3.4, 2.4, 2.45, 1.75, SITE.store.z1 + 0.045);
scene.add(rain.mesh, drips.mesh, ripples.mesh, glassRainA.mesh, glassRainB.mesh);

const flicker = createFlicker([
  { mat: M.fascia, base: 0xfff6e8, buzz: 0.35, slow: 0.02 },
  { mat: M.poleSign, base: 0xffffff, buzz: 0.5, slow: 0.035 },
  { mat: M.openSign, base: 0xffffff, buzz: 0.6, slow: 0.05 },
  { mat: M.ceilPanel, base: 0xfff4dc, buzz: 0.08, slow: 0.012 },
  { mat: M.alleySign, base: 0xffffff, buzz: 0.55, slow: 0.04 },
]);

// ----------------------------------------------------------------- pipeline
const pipeline = createPipeline(renderer, scene, camera, {
  bloomStrength: 0.38,
  bloomRadius: 0.45,
  bloomThreshold: 0.9,
  outlineThickness: 1.7,
  outlineStrength: 0.95,
  outlineColor: 0x1a1426,
  exposure: 1.14,
  vignette: 0.4,
  grain: 0.02,
  saturation: 1.12,
  shadowTint: 0x8ea8dc,
  highTint: 0xffd8a8,
  far: 90,
});

// ------------------------------------------------------------------- loop
let lastT = performance.now() / 1000;
const startT = lastT;
let elapsed = 0;
let started = false;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  pipeline.setSize(w, h);
  reflection.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

function frame() {
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastT, 0.05);
  lastT = now;
  // animation runs on wall-clock time so slow machines keep the same tempo
  elapsed = now - startT;

  controls.update();

  rain.update(elapsed);
  drips.update(elapsed);
  ripples.update(elapsed);
  glassRainA.update(elapsed);
  glassRainB.update(elapsed);
  flicker.update(elapsed);
  signal.update(elapsed);
  animateDoors(konbini.leaves, elapsed);

  // gentle breathing of the warm interior light
  interiorLight.intensity = 4.2 + Math.sin(elapsed * 1.3) * 0.25;
  spillLight.intensity = 5.2 + Math.sin(elapsed * 0.9 + 1.2) * 0.4;

  reflection.update();
  pipeline.render(elapsed);

  if (!started) {
    started = true;
    app.classList.add('on');
  }
  requestAnimationFrame(frame);
}

// kick one frame so textures compile before revealing
requestAnimationFrame(frame);

// expose for debugging in the console
window.__diorama = { scene, camera, renderer, controls, world, pipeline, M, reflection, konbini, getTime: () => elapsed };

























