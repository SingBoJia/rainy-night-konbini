import * as THREE from 'three';
import { box, boxSpan, ground, plane, cyl, sphere, torus, addAll, group, cachedGeo } from '../core/utils.js';
import { toon, glow, additive } from '../core/toon.js';
import { SITE } from './layout.js';

const WALK = SITE.walkY;

/* ------------------------------------------------------------------ *
 *  Street-corner props, all built from one vocabulary of chamfered
 *  boxes and thin cylinders so the model reads as a single toy.
 * ------------------------------------------------------------------ */

export function buildVendingMachine(M, x, z, rotY = 0) {
  const g = group('vending');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;

  const w = 1.0;
  const d = 0.74;
  const h = 1.88;

  g.add(box(w, h, d, M.vendingBody, 0, h / 2, 0, { rounded: 0.04 }));
  const face = plane(w - 0.05, h - 0.05, M.vendingFront, 0, h / 2, d / 2 + 0.006);
  face.userData.noOutline = true;
  g.add(face);
  for (const s of [-1, 1]) {
    const side = plane(d - 0.05, h - 0.05, M.vendingSide, (s * w) / 2 + s * 0.003, h / 2, 0, [0, (s * Math.PI) / 2, 0]);
    side.userData.noOutline = true;
    g.add(side);
  }
  g.add(box(w + 0.05, 0.06, d + 0.05, M.vendingBody, 0, h + 0.02, 0, { rounded: 0.02 }));
  g.add(box(w + 0.02, 0.08, d + 0.02, M.metalDark, 0, 0.04, 0, { noOutline: true }));

  const spill = ground(w * 3.0, d * 3.6, additive(0xa8d4ff, 0.18, M.T.wetDecal), 0, 0.018, d * 0.85);
  spill.userData.noOutline = true;
  spill.renderOrder = 3;
  g.add(spill);

  const halo = plane(w * 1.3, h * 0.9, additive(0xbcd8ff, 0.06, M.T.wetDecal), 0, h * 0.55, d / 2 + 0.02);
  halo.userData.noOutline = true;
  g.add(halo);

  return g;
}

export function buildBicycle(M, x, z, rotY = 0, colorIdx = 0) {
  const g = group('bicycle');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;

  const wheelR = 0.32;
  const frameMat = M.bikeFrame[colorIdx % M.bikeFrame.length];

  const wheelGeo = cachedGeo('bikeWheel', () => new THREE.TorusGeometry(0.3, 0.026, 6, 20));
  const rimGeo = cachedGeo('bikeRim', () => new THREE.TorusGeometry(0.26, 0.008, 4, 20));
  const spokeGeo = cachedGeo('bikeSpoke', () => new THREE.CylinderGeometry(0.005, 0.005, 0.52, 4));
  for (const wz of [-0.5, 0.5]) {
    const wheel = new THREE.Group();
    const t = new THREE.Mesh(wheelGeo, M.bikeTire);
    t.castShadow = true;
    wheel.add(t);
    wheel.add(new THREE.Mesh(rimGeo, M.metal));
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(spokeGeo, M.metal);
      sp.rotation.z = (i / 8) * Math.PI;
      wheel.add(sp);
    }
    wheel.position.set(0, wheelR, wz);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
  }

  const tube = (x0, y0, z0, x1, y1, z1, r = 0.02) => {
    const a = new THREE.Vector3(x0, y0, z0);
    const b = new THREE.Vector3(x1, y1, z1);
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), frameMat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true;
    g.add(m);
  };

  const seatY = 0.74;
  const headY = 0.7;
  tube(0, wheelR, -0.5, 0, seatY, -0.16);
  tube(0, wheelR, -0.5, 0, 0.34, 0.04);
  tube(0, 0.34, 0.04, 0, seatY, -0.16);
  tube(0, 0.34, 0.04, 0, headY, 0.38);
  tube(0, seatY, -0.16, 0, headY, 0.38);
  tube(0, headY, 0.38, 0, wheelR, 0.5);
  tube(-0.18, headY + 0.07, 0.4, 0.18, headY + 0.07, 0.4, 0.016);
  tube(0, headY, 0.38, 0, headY + 0.09, 0.4, 0.016);
  g.add(box(0.085, 0.045, 0.24, M.plasticBlack, 0, seatY + 0.04, -0.18, { rounded: 0.02 }));

  const basket = group('basket', g);
  basket.position.set(0, 0.6, 0.5);
  basket.add(box(0.28, 0.19, 0.22, M.metal, 0, 0, 0, { rounded: 0.02 }));
  basket.add(box(0.24, 0.15, 0.18, toon({ color: 0x2b2e36, rimStrength: 0.1 }), 0, 0.01, 0, { noOutline: true }));

  g.add(cyl(0.07, 0.07, 0.02, 10, M.metalDark, 0.055, 0.32, 0.04, { rot: [0, 0, Math.PI / 2], noOutline: true }));
  g.add(box(0.15, 0.02, 0.28, M.metal, 0, wheelR + 0.27, -0.48, { noOutline: true }));
  tube(0.02, 0.29, -0.38, 0.15, 0.02, -0.4, 0.011);
  // kickstand shadow decal
  return g;
}

export function buildUmbrellaStand(M, x, z) {
  const g = group('umbrellas');
  g.position.set(x, WALK, z);
  g.add(cyl(0.18, 0.2, 0.5, 12, M.metalDark, 0, 0.25, 0));
  g.add(cyl(0.19, 0.19, 0.04, 12, M.metal, 0, 0.5, 0, { noOutline: true }));
  g.add(cyl(0.16, 0.16, 0.02, 12, M.plasticBlack, 0, 0.51, 0, { noOutline: true }));

  const umbrellas = [
    { tilt: 0.1, rot: 0.3, c: 0, len: 1.0 },
    { tilt: -0.12, rot: 1.8, c: 1, len: 0.94 },
    { tilt: 0.06, rot: 3.4, c: 2, len: 1.04 },
    { tilt: -0.08, rot: 4.9, c: 3, len: 0.88 },
  ];
  for (const u of umbrellas) {
    const ux = Math.cos(u.rot) * 0.065;
    const uz = Math.sin(u.rot) * 0.065;
    g.add(cyl(0.011, 0.011, u.len, 6, M.metal, ux, 0.52 + u.len / 2, uz, { rot: [u.tilt, 0, u.tilt * 0.7] }));
    const canopy = new THREE.Mesh(cachedGeo('umbCanopy', () => new THREE.ConeGeometry(0.08, 0.6, 6, 1, true)), M.umbrella[u.c]);
    canopy.position.set(ux, 0.52 + u.len * 0.72, uz);
    canopy.rotation.set(u.tilt, u.rot, u.tilt * 0.7);
    canopy.castShadow = true;
    g.add(canopy);
    g.add(torus(0.042, 0.01, M.woodDark, ux, 0.52 + u.len + 0.03, uz, [Math.PI / 2, 0, 0], { seg: 10 }));
  }
  return g;
}

export function buildTrashBins(M, x, z, rotY = 0) {
  const g = group('trash');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;
  const cols = [M.kGreen, M.kBlue, M.kRed];
  for (let i = 0; i < 3; i++) {
    const bx = i * 0.44 - 0.44;
    g.add(box(0.4, 0.82, 0.4, M.plasticWhite, bx, 0.41, 0, { rounded: 0.05 }));
    g.add(box(0.42, 0.07, 0.42, cols[i], bx, 0.84, 0, { rounded: 0.02, noOutline: true }));
    g.add(box(0.24, 0.09, 0.02, M.plasticBlack, bx, 0.64, 0.205, { noOutline: true }));
  }
  g.add(box(0.34, 0.16, 0.28, M.kBlue, 0.44, 0.98, 0, { rounded: 0.02 }));
  return g;
}

export function buildLampPost(M, x, z, rotY = 0, opts = {}) {
  const g = group('lamp');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;

  const h = opts.h ?? 4.6;
  g.add(cyl(0.07, 0.105, h, 10, M.metalDark, 0, h / 2, 0));
  g.add(cyl(0.15, 0.17, 0.15, 10, M.metalDark, 0, 0.075, 0));
  g.add(cyl(0.05, 0.05, 1.1, 8, M.metalDark, 0.5, h - 0.05, 0, { rot: [0, 0, Math.PI / 2] }));
  g.add(box(0.68, 0.12, 0.32, M.metalDark, 0.98, h - 0.12, 0, { rounded: 0.05 }));
  const lens = plane(0.54, 0.24, M.lampWarm, 0.98, h - 0.19, 0, [-Math.PI / 2, 0, 0]);
  lens.userData.noOutline = true;
  g.add(lens);
  const halo = plane(2.2, 2.2, additive(0xffc98a, 0.1, M.T.wetDecal), 0.98, h - 0.3, 0, [-Math.PI / 2, 0, 0]);
  halo.userData.noOutline = true;
  halo.renderOrder = 4;
  g.add(halo);
  // ground pool
  const pool = ground(3.6, 3.6, additive(0xffc07a, 0.1, M.T.wetDecal), 0.9, 0.02, 0);
  pool.userData.noOutline = true;
  pool.renderOrder = 3;
  g.add(pool);
  return g;
}

export function buildUtilityPole(M, x, z, opts = {}) {
  const g = group('utilitypole');
  g.position.set(x, WALK, z);
  const h = opts.h ?? 8.0;
  const r = 0.15;

  g.add(cyl(r * 0.7, r, h, 12, toon({ color: 0x8d8a86, rimStrength: 0.22 }), 0, h / 2, 0));
  g.add(cyl(r + 0.07, r + 0.1, 0.32, 12, M.concreteDark, 0, 0.16, 0));

  for (let i = 0; i < 2; i++) {
    const y = h - 0.7 - i * 0.72;
    g.add(box(1.8 - i * 0.34, 0.085, 0.1, M.metalDark, 0, y, 0, { rounded: 0.02 }));
    for (let k = -1; k <= 1; k++) {
      if (k === 0) continue;
      const ix = k * (0.74 - i * 0.13);
      g.add(cyl(0.045, 0.065, 0.13, 8, toon({ color: 0x9fb0b8, rimStrength: 0.4 }), ix, y + 0.1, 0, { noOutline: true }));
    }
  }
  g.add(cyl(0.26, 0.26, 0.7, 14, toon({ color: 0x9a9da6, rimStrength: 0.24 }), 0.4, h - 2.2, 0));
  g.add(cyl(0.27, 0.27, 0.05, 14, M.metalDark, 0.4, h - 2.56, 0, { noOutline: true }));
  for (let i = 0; i < 8; i++) {
    g.add(box(0.02, 0.02, 0.3, M.metalDark, 0.13, 1.2 + i * 0.5, 0.16, { noOutline: true }));
  }
  g.add(cyl(r + 0.005, r + 0.005, 0.46, 12, M.kBlue, 0, 2.3, 0, { noOutline: true }));
  g.add(box(0.22, 0.3, 0.02, M.plasticWhite, 0, 2.3, r + 0.02, { noOutline: true }));

  return g;
}

export function buildRoadSign(M, x, z, rotY = 0, type = 'pedestrian') {
  const g = group('roadsign');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;
  g.add(cyl(0.042, 0.048, 2.4, 8, M.metalDark, 0, 1.2, 0));
  const mat = type === 'pedestrian' ? M.signPed : M.signSpeed;
  const shape = cachedGeo('signDisc', () => new THREE.CircleGeometry(0.32, 24));
  const sign = new THREE.Mesh(shape, mat);
  sign.position.set(0, 2.24, 0.03);
  sign.castShadow = true;
  g.add(sign);
  const back = new THREE.Mesh(shape, M.signBack);
  back.position.set(0, 2.24, -0.005);
  back.rotation.y = Math.PI;
  g.add(back);
  g.add(box(0.05, 0.09, 0.05, M.metalDark, 0, 2.24, 0, { noOutline: true }));
  return g;
}

export function buildStreetPlate(M, x, y, z, rotY = 0) {
  const g = group('streetplate');
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.add(box(1.05, 0.26, 0.035, M.signBack, 0, 0, 0, { rounded: 0.01 }));
  const f = plane(1.0, 0.23, M.signStreet, 0, 0, 0.022);
  f.userData.noOutline = true;
  g.add(f);
  return g;
}

export function buildPosterBoard(M, x, z, rotY = 0) {
  const g = group('posterboard');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;
  const w = 1.45;
  const h = 1.0;
  for (const lx of [-w / 2 + 0.1, w / 2 - 0.1]) {
    g.add(cyl(0.032, 0.036, 1.6, 8, M.metalDark, lx, 0.8, 0));
  }
  g.add(box(w + 0.07, h + 0.07, 0.065, M.metalDark, 0, 1.35, 0, { rounded: 0.02 }));
  const face = plane(w, h, M.posterBoard, 0, 1.35, 0.04);
  face.userData.noOutline = true;
  g.add(face);
  g.add(box(w + 0.18, 0.045, 0.2, M.metalDark, 0, 1.9, 0.035, { rounded: 0.01 }));
  return g;
}

export function buildAircon(M, x, y, z, rotY = 0, scale = 1) {
  const g = group('aircon');
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.scale.setScalar(scale);
  g.add(box(0.82, 0.55, 0.3, M.plasticWhite, 0, 0, 0, { rounded: 0.03 }));
  const f = plane(0.76, 0.49, M.aircon, 0, 0, 0.155);
  f.userData.noOutline = true;
  g.add(f);
  g.add(box(0.08, 0.46, 0.08, M.metalDark, -0.28, -0.32, -0.09, { noOutline: true }));
  g.add(box(0.08, 0.46, 0.08, M.metalDark, 0.28, -0.32, -0.09, { noOutline: true }));
  g.add(cyl(0.028, 0.028, 0.85, 6, M.plasticWhite, 0.36, -0.48, -0.11, { noOutline: true }));
  return g;
}

export function buildPlanter(M, x, z, s = 1) {
  const g = group('planter');
  g.position.set(x, WALK, z);
  g.scale.setScalar(s);
  g.add(box(0.66, 0.4, 0.66, M.concreteDark, 0, 0.2, 0, { rounded: 0.04 }));
  g.add(box(0.58, 0.06, 0.58, toon({ color: 0x3a2f28, rimStrength: 0.1 }), 0, 0.42, 0, { noOutline: true }));
  const leaf = toon({ color: 0x3f6b4a, rimStrength: 0.2 });
  for (let i = 0; i < 4; i++) {
    g.add(sphere(0.19 - i * 0.018, leaf, (i - 1.5) * 0.13, 0.56 + (i % 2) * 0.11, i % 2 ? 0.09 : -0.09, { seg: 8, seg2: 6 }));
  }
  return g;
}

export function buildParkingSign(M, x, z) {
  const g = group('parksign');
  g.position.set(x, WALK, z);
  g.add(cyl(0.038, 0.042, 1.55, 8, M.metalDark, 0, 0.775, 0));
  g.add(box(0.38, 0.38, 0.03, M.signBack, 0, 1.5, 0, { rounded: 0.02 }));
  const f = plane(0.34, 0.34, M.bikeSign, 0, 1.5, 0.018);
  f.userData.noOutline = true;
  g.add(f);
  return g;
}

export function buildACUnitGround(M, x, z, rotY = 0) {
  const g = group('groundac');
  g.position.set(x, WALK, z);
  g.rotation.y = rotY;
  g.add(box(0.8, 0.66, 0.5, M.plasticWhite, 0, 0.33, 0, { rounded: 0.03 }));
  const f = plane(0.72, 0.6, M.aircon, 0, 0.35, 0.255);
  f.userData.noOutline = true;
  g.add(f);
  g.add(box(0.06, 0.66, 0.44, M.metalDark, -0.44, 0.33, 0, { noOutline: true }));
  g.add(cyl(0.05, 0.05, 0.5, 8, M.metal, 0.2, 0.72, -0.1, { noOutline: true }));
  return g;
}

export function buildCrate(M, x, y, z, s = 1) {
  const g = group('crate');
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.add(box(0.5, 0.34, 0.42, M.cardboard, 0, 0.17, 0, { rounded: 0.01 }));
  g.add(box(0.52, 0.05, 0.44, toon({ color: 0xa8c4d8, rimStrength: 0.1 }), 0, 0.33, 0, { noOutline: true }));
  g.add(box(0.34, 0.02, 0.02, toon({ color: 0xd8c8a0 }), 0, 0.35, 0, { noOutline: true }));
  return g;
}

