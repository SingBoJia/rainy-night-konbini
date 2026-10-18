import * as THREE from 'three';
import { box, boxSpan, ground, plane, cyl, sphere, addAll, group, cachedGeo } from '../core/utils.js';
import { toon, glow, additive } from '../core/toon.js';
import { SITE } from './layout.js';

const ST = SITE.store;
const WALK = SITE.walkY;
const FLOOR = WALK + 0.02;

const FRONT = {
  x0: ST.x0 + 0.22,
  x1: ST.x1 - 0.22,
  doorW: 1.9,
};

/* ------------------------------------------------------------------ *
 *  The konbini: shell, glazing, canopy, signage and a fully dressed
 *  interior that reads clearly through the big glass front.
 * ------------------------------------------------------------------ */

export function buildKonbini(M) {
  const g = group('konbini');
  const { x0, x1, z0, z1, h } = ST;

  // ---------------------------------------------------------------- shell
  g.add(boxSpan(x0, x1, WALK - 0.06, FLOOR, z0, z1, M.floorIn));
  g.add(boxSpan(x0, x1, h - 0.16, h, z0, z1, M.ceilingIn));
  g.add(boxSpan(x0, x1, WALK, h, z0, z0 + 0.18, M.kWallShade));
  g.add(boxSpan(x0, x0 + 0.18, WALK, h, z0, z1, M.kWallShade));
  g.add(boxSpan(x1 - 0.18, x1, WALK, h, z0, z1, M.kWallShade));
  // roof slab + parapet
  g.add(boxSpan(x0 - 0.3, x1 + 0.3, h, h + 0.18, z0 - 0.18, z1 + 0.22, M.roof, { rounded: 0.03 }));
  // -------------------------------------------------------- rooftop clutter
  // The diorama is seen from above as often as from the street, so the
  // roof gets the same care as the facade.
  const ry = h + 0.18;
  g.add(boxSpan(x0 + 1.1, x0 + 2.7, ry, ry + 0.62, z0 + 1.3, z0 + 2.4, M.roofTrim, { rounded: 0.05 }));
  g.add(boxSpan(x0 + 1.35, x0 + 2.45, ry + 0.62, ry + 0.68, z0 + 1.5, z0 + 2.2, M.metalDark, { noOutline: true }));
  for (let i = 0; i < 5; i++) {
    g.add(boxSpan(x0 + 1.3, x0 + 2.5, ry + 0.1, ry + 0.14, z0 + 1.45 + i * 0.18, z0 + 1.52 + i * 0.18, M.grate, { noOutline: true }));
  }
  g.add(boxSpan(x1 - 2.9, x1 - 1.3, ry, ry + 0.52, z0 + 0.8, z0 + 1.9, M.roofTrim, { rounded: 0.05 }));
  g.add(boxSpan(x1 - 2.7, x1 - 1.5, ry + 0.52, ry + 0.57, z0 + 1.0, z0 + 1.7, M.metalDark, { noOutline: true }));
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.13, 0.15, 0.55, 10, M.roofTrim, x0 + 3.9 + i * 0.52, ry + 0.27, z0 + 3.0));
    g.add(cyl(0.17, 0.17, 0.05, 10, M.metalDark, x0 + 3.9 + i * 0.52, ry + 0.56, z0 + 3.0, { noOutline: true }));
  }
  g.add(boxSpan(x1 - 3.9, x1 - 2.9, ry, ry + 0.16, z0 + 3.4, z0 + 4.3, M.roofTrim, { rounded: 0.03 }));
  g.add(boxSpan(x1 - 3.75, x1 - 3.05, ry + 0.16, ry + 0.2, z0 + 3.5, z0 + 4.2, M.metal, { noOutline: true }));
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.035, 0.035, 6.4, 6, M.metalDark, x0 + 0.9 + i * 0.13, ry + 0.09, (z0 + z1) / 2 - 1.2, { rot: [Math.PI / 2, 0, 0], noOutline: true }));
  }
  for (let i = 0; i < 4; i++) {
    g.add(boxSpan(x0 + 0.7, x0 + 1.2, ry, ry + 0.12, z0 + 1.0 + i * 1.6, z0 + 1.16 + i * 1.6, M.metalDark, { noOutline: true }));
  }
  g.add(boxSpan(-1.4, 1.4, ry, ry + 0.24, z0 + 2.4, z0 + 3.4, M.roofTrim, { rounded: 0.03 }));
  const sky = plane(2.6, 0.86, glow(0xffe2b0, 0.55), 0, ry + 0.25, z0 + 2.9, [-Math.PI / 2, 0, 0]);
  sky.userData.noOutline = true;
  g.add(sky);
  g.add(boxSpan(x0 - 0.34, x1 + 0.34, h + 0.4, h + 0.44, z1 + 0.3, z1 + 0.52, M.metal, { noOutline: true }));
  for (let i = 0; i < 3; i++) {
    g.add(boxSpan(x0 + 2.0 + i * 3.0, x0 + 2.3 + i * 3.0, ry + 0.02, ry + 0.1, z1 + 0.1, z1 + 0.28, M.metalDark, { noOutline: true }));
  }
  // facade band above the glazing
  g.add(boxSpan(x0, x1, 2.66, h, z1 - 0.14, z1 + 0.02, M.kWall));

  // ------------------------------------------------------- glazing frames
  const fx0 = FRONT.x0;
  const fx1 = FRONT.x1;
  const doorHalf = FRONT.doorW / 2;
  const glassTop = 2.56;
  const glassBot = FLOOR + 0.05;

  g.add(boxSpan(fx0, fx1, glassBot - 0.09, glassBot, z1 - 0.07, z1 + 0.09, M.frame));
  g.add(boxSpan(fx0, fx1, glassTop, glassTop + 0.16, z1 - 0.07, z1 + 0.09, M.frame));
  const mullions = [fx0, -3.35, -1.55, -doorHalf - 0.09, doorHalf + 0.09, 1.55, 3.35, fx1];
  for (const mx of mullions) {
    g.add(boxSpan(mx - 0.055, mx + 0.055, glassBot, glassTop + 0.16, z1 - 0.07, z1 + 0.09, M.frame));
  }
  const panes = [
    [fx0, -3.35],
    [-3.35, -1.55],
    [-1.55, -doorHalf - 0.09],
    [doorHalf + 0.09, 1.55],
    [1.55, 3.35],
    [3.35, fx1],
  ];
  for (const [a, b] of panes) {
    if (b - a < 0.05) continue;
    const pane = plane(b - a, glassTop - glassBot, M.glass, (a + b) / 2, (glassTop + glassBot) / 2, z1 + 0.03);
    pane.userData.noOutline = true;
    pane.renderOrder = 6;
    g.add(pane);
  }

  // ------------------------------------------------------------- doorway
  const doorGroup = group('door', g);
  doorGroup.position.set(0, 0, z1);
  const leaves = [];
  for (let i = 0; i < 2; i++) {
    const leaf = new THREE.Group();
    const sign = i === 0 ? -1 : 1;
    const fw = FRONT.doorW / 2 - 0.04;
    const glass = box(fw - 0.08, 2.26, 0.03, M.glassDoor, sign * (fw / 2), FLOOR + 1.16, 0);
    glass.userData.noOutline = true;
    glass.renderOrder = 7;
    leaf.add(glass);
    leaf.add(box(0.06, 2.34, 0.08, M.frame, sign * 0.03, FLOOR + 1.18, 0));
    leaf.add(box(0.06, 2.34, 0.08, M.frame, sign * (fw - 0.03), FLOOR + 1.18, 0));
    leaf.add(box(fw, 0.09, 0.08, M.frame, sign * (fw / 2), FLOOR + 2.31, 0));
    leaf.add(box(fw, 0.14, 0.08, M.frame, sign * (fw / 2), FLOOR + 0.06, 0));
    leaf.add(box(0.035, 0.56, 0.035, M.metal, sign * (fw - 0.15), FLOOR + 1.12, 0.085, { rounded: 0.01 }));
    leaf.add(box(fw - 0.12, 0.09, 0.012, i === 0 ? M.kGreen : M.kBlue, sign * (fw / 2), FLOOR + 1.9, 0.035, { noOutline: true }));
    doorGroup.add(leaf);
    leaves.push({ obj: leaf, sign });
  }
  g.add(boxSpan(-doorHalf - 0.18, doorHalf + 0.18, 2.38, 2.56, z1 - 0.12, z1 + 0.06, M.frameDark));

  // -------------------------------------------------------------- canopy
  const cz0 = z1 + 0.05;
  const cz1 = z1 + 1.5;
  g.add(boxSpan(x0 - 0.22, x1 + 0.22, 2.9, 3.08, cz0, cz1, M.kWall, { rounded: 0.02 }));
  g.add(boxSpan(x0 - 0.22, x1 + 0.22, 2.82, 2.9, cz1 - 0.07, cz1, M.kGreen));
  g.add(boxSpan(x0 - 0.22, x1 + 0.22, 2.82, 2.9, cz0, cz0 + 0.07, M.kBlue));
  g.add(boxSpan(x0 - 0.22, x1 + 0.22, 2.8, 2.82, cz1 - 0.03, cz1, M.metalDark, { noOutline: true }));
  const dlGeo = cachedGeo('dl', () => new THREE.CircleGeometry(0.1, 12));
  for (let lx = x0 + 1.1; lx < x1; lx += 2.1) {
    const d = new THREE.Mesh(dlGeo, M.ceilPanel);
    d.rotation.x = Math.PI / 2;
    d.position.set(lx, 2.89, z1 + 0.75);
    d.userData.noOutline = true;
    g.add(d);
    const pool = ground(1.9, 1.9, M.spillWarm, lx, WALK + 0.017, z1 + 0.9);
    pool.userData.noOutline = true;
    pool.renderOrder = 3;
    g.add(pool);
  }
  for (const px of [x0 + 0.16, x1 - 0.16]) {
    g.add(box(0.09, 2.5, 0.09, M.frame, px, WALK + 1.25, cz1 - 0.1));
  }

  // --------------------------------------------------------------- fascia
  const fy0 = 3.42;
  const fy1 = 4.62;
  const fz0 = z1 + 0.2;
  const fz1 = z1 + 0.58;
  g.add(boxSpan(x0 - 0.34, x1 + 0.34, fy0, fy1, fz0, fz1, M.kWall, { rounded: 0.02 }));
  const fFace = plane(x1 - x0 + 0.68, fy1 - fy0 - 0.02, M.fascia, 0, (fy0 + fy1) / 2, fz1 + 0.004);
  fFace.userData.noOutline = true;
  g.add(fFace);
  for (const [sx, rot] of [
    [x1 + 0.343, Math.PI / 2],
    [x0 - 0.343, -Math.PI / 2],
  ]) {
    const sf = plane(fz1 - fz0, fy1 - fy0, M.fasciaSide, sx, (fy0 + fy1) / 2, (fz0 + fz1) / 2, [0, rot, 0]);
    sf.userData.noOutline = true;
    g.add(sf);
  }

  // ------------------------------------------------------------- pole sign
  const px = x1 + 0.95;
  const pz = z1 + 0.55;
  g.add(cyl(0.07, 0.085, 4.6, 10, M.metal, px, WALK + 2.3, pz));
  g.add(box(0.92, 2.0, 0.28, M.kWall, px, WALK + 4.6, pz, { rounded: 0.03 }));
  for (const s of [-1, 1]) {
    const face = plane(0.84, 1.92, M.poleSign, px, WALK + 4.6, pz + s * 0.145, [0, s > 0 ? 0 : Math.PI, 0]);
    face.userData.noOutline = true;
    g.add(face);
  }
  g.add(box(0.78, 0.05, 0.1, M.lightboxWhite, px, WALK + 3.56, pz, { noOutline: true }));


  // ------------------------------------------------------------ open sign
  const openSign = plane(0.6, 0.6, M.openSign, -2.35, 2.26, z1 + 0.11);
  openSign.userData.noOutline = true;
  openSign.renderOrder = 8;
  g.add(openSign);
  g.add(box(0.018, 0.2, 0.018, M.metalDark, -2.35, 2.54, z1 + 0.11, { noOutline: true }));

  // --------------------------------------------------- alley-side detail
  // The right-hand wall faces the alley: service door, meter box, pipes,
  // vents and a wall lamp so it never reads as a blank slab.
  const ax = x1 + 0.01;
  const wallG = group('alleywall', g);
  wallG.add(boxSpan(x1, x1 + 0.02, WALK, 2.1, z0 + 2.2, z0 + 3.0, M.metalDark));
  wallG.add(boxSpan(x1, x1 + 0.03, WALK + 1.02, WALK + 1.08, z0 + 2.55, z0 + 2.65, M.metal, { noOutline: true }));
  // meter box
  wallG.add(boxSpan(x1, x1 + 0.14, WALK + 1.3, WALK + 1.85, z0 + 3.4, z0 + 3.9, M.plasticWhite, { rounded: 0.02 }));
  wallG.add(plane(0.34, 0.3, M.register, x1 + 0.15, WALK + 1.6, z0 + 3.65, [0, Math.PI / 2, 0]));
  // conduit run
  for (let i = 0; i < 3; i++) {
    wallG.add(cyl(0.028, 0.028, 3.0, 6, M.metal, x1 + 0.06 + i * 0.05, WALK + 1.6, z0 + 4.6, { noOutline: true }));
  }
  // vent grille
  wallG.add(boxSpan(x1, x1 + 0.05, WALK + 2.35, WALK + 2.85, z0 + 1.4, z0 + 2.3, M.grate, { noOutline: true }));
  // wall lamp + glow
  wallG.add(boxSpan(x1, x1 + 0.22, WALK + 2.55, WALK + 2.66, z0 + 3.0, z0 + 3.3, M.metalDark, { noOutline: true }));
  wallG.add(plane(0.16, 0.05, M.lampWarm, x1 + 0.11, WALK + 2.54, z0 + 3.15, [Math.PI / 2, 0, 0]));
  const alleyPool = ground(1.2, 2.4, additive(0xffc98a, 0.1, M.T.wetDecal), x1 + 0.55, WALK + 0.018, z0 + 3.15);
  alleyPool.userData.noOutline = true;
  alleyPool.renderOrder = 3;
  wallG.add(alleyPool);
  // drainpipe down the corner
  wallG.add(cyl(0.06, 0.06, 3.4, 8, M.metal, x1 + 0.08, WALK + 1.7, z1 - 0.25, { noOutline: true }));
  for (let i = 0; i < 5; i++) {
    wallG.add(box(0.1, 0.04, 0.14, M.metalDark, x1 + 0.04, WALK + 0.5 + i * 0.7, z1 - 0.25, { noOutline: true }));
  }
  // small stencilled sign
  wallG.add(plane(0.5, 0.24, M.lightboxWhite, x1 + 0.16, WALK + 2.2, z0 + 2.6, [0, Math.PI / 2, 0]));
  // ------------------------------------------------------------- interior
  buildInterior(g, M);

  // --------------------------------------------------- door mat + spill
  const mat = ground(2.6, 1.1, M.doormat, 0, WALK + 0.02, z1 + 0.85);
  mat.userData.noOutline = true;
  mat.renderOrder = 3;
  g.add(mat);

  const spill = ground(11.5, 3.4, additive(0xffd9a0, 0.14, M.T.wetDecal), 0, WALK + 0.018, z1 + 2.0);
  spill.userData.noOutline = true;
  spill.renderOrder = 3;
  g.add(spill);

  return { group: g, leaves, doorGroup };
}

/* ------------------------------------------------------------------ */
/*  Interior                                                           */
/* ------------------------------------------------------------------ */

function buildInterior(root, M) {
  const g = group('interior', root);
  const x0 = ST.x0 + 0.2;
  const x1 = ST.x1 - 0.2;
  const z0 = ST.z0 + 0.2;
  const z1 = ST.z1 - 0.08;

  // lit ceiling header — a bright band read through the top of the glass
  g.add(boxSpan(x0 + 0.1, x1 - 0.1, 2.42, 2.54, z1 - 0.52, z1 - 0.14, M.ceilPanel, { noOutline: true }));
  g.add(boxSpan(x0 + 0.1, x1 - 0.1, 2.54, 2.6, z1 - 0.6, z1 - 0.08, M.ceilingIn, { noOutline: true }));
  for (let lx = x0 + 0.9; lx < x1 - 0.7; lx += 1.45) {
    g.add(boxSpan(lx, lx + 1.05, 2.44, 2.52, z1 - 0.88, z1 - 0.18, M.ceilPanel, { noOutline: true }));
  }

  // ceiling light panels
  const panelGeo = cachedGeo('ceilPanel', () => new THREE.BoxGeometry(1.0, 0.05, 0.5));
  for (let pz = z0 + 1.1; pz < z1 - 0.8; pz += 1.45) {
    for (const pxx of [-2.7, 0, 2.7]) {
      const p = new THREE.Mesh(panelGeo, M.ceilPanel);
      p.position.set(pxx, ST.h - 0.21, pz);
      p.userData.noOutline = true;
      g.add(p);
    }
    g.add(boxSpan(-4.1, 4.1, ST.h - 0.24, ST.h - 0.21, pz - 0.28, pz + 0.28, M.ceilingIn, { noOutline: true }));
  }

  // floor
  const floorTex = M.floorIn.map;
  if (floorTex) {
    floorTex.repeat.set((x1 - x0) / 1.2, (z1 - z0) / 1.2);
    floorTex.needsUpdate = true;
  }
  const floor = plane(x1 - x0, z1 - z0, M.floorIn, (x0 + x1) / 2, FLOOR + 0.005, (z0 + z1) / 2, [-Math.PI / 2, 0, 0]);
  floor.receiveShadow = true;
  g.add(floor);

  const seamMat = new THREE.MeshBasicMaterial({ color: 0xc9c5b8, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false });
  for (let sx = x0 + 1.1; sx < x1; sx += 1.1) {
    const s = plane(0.015, z1 - z0, seamMat, sx, FLOOR + 0.008, (z0 + z1) / 2, [-Math.PI / 2, 0, 0]);
    s.userData.noOutline = true;
    g.add(s);
  }
  for (let sz = z0 + 1.1; sz < z1; sz += 1.1) {
    const s = plane(x1 - x0, 0.015, seamMat, (x0 + x1) / 2, FLOOR + 0.008, sz, [-Math.PI / 2, 0, 0]);
    s.userData.noOutline = true;
    g.add(s);
  }

  const guide = plane(0.5, 1.0, M.floorGuide, 1.0, FLOOR + 0.012, z1 - 1.6, [-Math.PI / 2, 0, 0.35]);
  guide.userData.noOutline = true;
  g.add(guide);

  // magazine rack along the glass
  const magX0 = x0 + 0.3;
  const magX1 = -1.35;
  g.add(boxSpan(magX0, magX1, FLOOR, FLOOR + 0.62, z1 - 0.5, z1 - 0.1, M.shelfWhite, { rounded: 0.02 }));
  g.add(boxSpan(magX0, magX1, FLOOR + 0.62, FLOOR + 1.42, z1 - 0.46, z1 - 0.42, M.shelfBack, { noOutline: true }));
  const magGeo = cachedGeo('mag', () => new THREE.BoxGeometry(0.2, 0.28, 0.015));
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 21; i++) {
      const m = new THREE.Mesh(magGeo, M.magazine[(i + row * 7) % M.magazine.length]);
      m.position.set(magX0 + 0.22 + i * 0.235, FLOOR + 0.78 + row * 0.34, z1 - 0.34 - row * 0.06);
      m.rotation.x = -0.16;
      m.rotation.z = 0.03 * Math.sin(i * 1.7);
      m.castShadow = false;
      m.userData.noOutline = true;
      g.add(m);
    }
  }

  // drink coolers along the left wall
  const coolerX = x0 + 0.02;
  const coolerZ0 = z0 + 0.35;
  const coolerZ1 = z0 + 4.1;
  g.add(boxSpan(coolerX, coolerX + 0.58, FLOOR, FLOOR + 2.36, coolerZ0, coolerZ1, M.coolerFrame));
  const coolerFace = plane(coolerZ1 - coolerZ0 - 0.08, 2.16, M.cooler, coolerX + 0.59, FLOOR + 1.2, (coolerZ0 + coolerZ1) / 2, [0, Math.PI / 2, 0]);
  coolerFace.userData.noOutline = true;
  g.add(coolerFace);
  for (let i = 0; i <= 3; i++) {
    const zz = coolerZ0 + (i * (coolerZ1 - coolerZ0)) / 3;
    g.add(box(0.04, 2.16, 0.04, M.frameDark, coolerX + 0.61, FLOOR + 1.2, zz));
  }
  const coolerSpill = ground(1.4, coolerZ1 - coolerZ0, additive(0x9fd8ff, 0.1, M.T.wetDecal), coolerX + 0.9, FLOOR + 0.014, (coolerZ0 + coolerZ1) / 2);
  coolerSpill.userData.noOutline = true;
  g.add(coolerSpill);

  // central gondola shelves
  for (const sx of [-0.85, 1.95]) {
    buildShelfRun(g, M, sx, z0 + 1.1, z0 + 4.3, FLOOR, 1.5);
  }
  buildEndcap(g, M, 1.95, z0 + 4.45, FLOOR);

  // bento / onigiri wall along the back
  const backZ = z0 + 0.24;
  g.add(boxSpan(0.35, 4.4, FLOOR, FLOOR + 1.95, backZ - 0.02, backZ + 0.56, M.shelfWhite));
  for (let row = 0; row < 3; row++) {
    const y = FLOOR + 0.5 + row * 0.42;
    for (let i = 0; i < 11; i++) {
      const b = box(0.28, 0.22, 0.28, M.bento[(i + row * 3) % M.bento.length], 0.6 + i * 0.35, y + 0.11, backZ + 0.28, { noOutline: true });
      b.castShadow = false;
      g.add(b);
    }
    g.add(boxSpan(0.35, 4.4, y - 0.02, y + 0.02, backZ + 0.02, backZ + 0.56, M.shelfMetal, { noOutline: true }));
  }
  for (let i = 0; i < 12; i++) {
    const b = box(0.24, 0.18, 0.22, M.onigiri[i % M.onigiri.length], 0.6 + i * 0.32, FLOOR + 1.9, backZ + 0.28, { noOutline: true });
    b.castShadow = false;
    g.add(b);
  }
  g.add(boxSpan(0.35, 4.4, FLOOR + 1.84, FLOOR + 1.88, backZ + 0.02, backZ + 0.56, M.shelfMetal, { noOutline: true }));
  for (let row = 0; row < 4; row++) {
    const st = plane(3.9, 0.045, M.priceSticker, 2.35, FLOOR + 0.4 + row * 0.42, backZ + 0.57);
    st.userData.noOutline = true;
    g.add(st);
  }

  // counter + register
  const cx0 = 2.2;
  const cx1 = 4.75;
  const cz0 = z1 - 2.4;
  const cz1 = z1 - 1.05;
  g.add(boxSpan(cx0, cx1, FLOOR, FLOOR + 0.98, cz0, cz1, M.counterBase, { rounded: 0.02 }));
  g.add(boxSpan(cx0 - 0.05, cx1 + 0.05, FLOOR + 0.98, FLOOR + 1.04, cz0 - 0.05, cz1 + 0.05, M.counterTop));
  g.add(box(0.46, 0.32, 0.38, M.plasticBlack, cx1 - 0.55, FLOOR + 1.2, (cz0 + cz1) / 2));
  const regFace = plane(0.4, 0.26, M.register, cx1 - 0.55, FLOOR + 1.21, (cz0 + cz1) / 2 + 0.195);
  regFace.userData.noOutline = true;
  g.add(regFace);
  g.add(box(0.2, 0.12, 0.26, M.plasticWhite, cx1 - 1.1, FLOOR + 1.1, cz1 - 0.3, { rounded: 0.02 }));
  g.add(boxSpan(cx0 + 0.4, cx1, FLOOR + 1.04, FLOOR + 2.2, cz0 + 0.1, cz0 + 0.46, M.shelfWhite));
  for (let i = 0; i < 6; i++) {
    g.add(boxSpan(cx0 + 0.45, cx1 - 0.05, FLOOR + 1.1 + i * 0.18, FLOOR + 1.13 + i * 0.18, cz0 + 0.46, cz0 + 0.48, M.shelfMetal, { noOutline: true }));
  }

  // coffee + hot snack counter (back, right)
  g.add(boxSpan(2.5, 4.35, FLOOR, FLOOR + 0.92, z0 + 0.5, z0 + 1.28, M.counterBase, { rounded: 0.02 }));
  g.add(boxSpan(2.45, 4.4, FLOOR + 0.92, FLOOR + 0.98, z0 + 0.45, z0 + 1.33, M.counterTop));
  g.add(box(0.58, 0.86, 0.46, M.plasticBlack, 3.3, FLOOR + 1.41, z0 + 0.9, { rounded: 0.02 }));
  const cmFace = plane(0.52, 0.8, M.coffee, 3.3, FLOOR + 1.41, z0 + 0.9 + 0.235);
  cmFace.userData.noOutline = true;
  g.add(cmFace);
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.045, 0.036, 0.11, 10, M.plasticWhite, 2.95 + i * 0.1, FLOOR + 1.04, z0 + 1.15, { noOutline: true }));
  }

  // oden counter near the window (left front)
  const ox = -3.7;
  const oz = z1 - 1.8;
  g.add(boxSpan(ox - 0.72, ox + 0.72, FLOOR, FLOOR + 0.88, oz - 0.48, oz + 0.48, M.counterBase, { rounded: 0.02 }));
  g.add(boxSpan(ox - 0.78, ox + 0.78, FLOOR + 0.88, FLOOR + 0.94, oz - 0.54, oz + 0.54, M.counterTop));
  const odenTop = plane(1.28, 0.86, M.oden, ox, FLOOR + 0.95, oz, [-Math.PI / 2, 0, 0]);
  odenTop.userData.noOutline = true;
  g.add(odenTop);
  g.add(plane(1.36, 0.4, M.glassDoor, ox, FLOOR + 1.18, oz + 0.5));
  g.add(plane(1.36, 0.4, M.glassDoor, ox, FLOOR + 1.18, oz - 0.5));

  // in-store posters
  for (const [ppx, ppy, s] of [
    [-1.5, 1.85, 0.6],
    [4.55, 1.95, 0.5],
  ]) {
    const p = plane(s * 0.72, s, M.posterIn, ppx, FLOOR + ppy, z0 + 0.19);
    p.userData.noOutline = true;
    g.add(p);
  }

  // back room door + lockers
  g.add(boxSpan(4.75, 5.55, FLOOR, FLOOR + 2.1, z0 + 0.18, z0 + 0.24, M.kGreen));
  g.add(box(0.05, 0.05, 0.09, M.metal, 5.15, FLOOR + 1.02, z0 + 0.26, { noOutline: true }));
  g.add(plane(0.4, 0.14, M.lightboxWhite, 5.15, FLOOR + 2.24, z0 + 0.2));
  for (let i = 0; i < 3; i++) {
    g.add(boxSpan(4.78 + i * 0.25, 4.78 + i * 0.25 + 0.2, FLOOR, FLOOR + 1.62, z0 + 0.22, z0 + 0.4, M.metalDark));
  }

  // ATM corner (left back)
  g.add(boxSpan(-5.2, -4.5, FLOOR, FLOOR + 1.6, z0 + 0.22, z0 + 0.9, M.plasticWhite, { rounded: 0.03 }));
  g.add(plane(0.46, 0.32, M.lightboxWhite, -4.85, FLOOR + 1.2, z0 + 0.92));
  g.add(box(0.32, 0.18, 0.05, M.plasticBlack, -4.85, FLOOR + 0.92, z0 + 0.92, { noOutline: true }));

  // inside bins
  for (let i = 0; i < 3; i++) {
    g.add(box(0.32, 0.58, 0.32, M.plasticWhite, -1.15 + i * 0.36, FLOOR + 0.29, z1 - 0.8, { rounded: 0.03 }));
    g.add(box(0.28, 0.05, 0.28, [M.kGreen, M.kBlue, M.kRed][i], -1.15 + i * 0.36, FLOOR + 0.6, z1 - 0.8, { noOutline: true }));
  }

  return g;
}

function buildShelfRun(parent, M, x, z0, z1, floorY, hgt) {
  const g = group('shelf', parent);
  const depth = 0.6;
  g.add(boxSpan(x - depth / 2, x + depth / 2, floorY, floorY + 0.13, z0, z1, M.shelfWhite));
  g.add(boxSpan(x - 0.025, x + 0.025, floorY + 0.13, floorY + hgt, z0, z1, M.shelfBack, { noOutline: true }));

  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const y = floorY + 0.13 + r * ((hgt - 0.13) / rows);
    g.add(boxSpan(x - depth / 2, x + depth / 2, y, y + 0.03, z0, z1, M.shelfWhite));
    for (const side of [-1, 1]) {
      const px = x + side * (depth / 2 - 0.12);
      for (let i = 0; i < 7; i++) {
        const pz = z0 + 0.22 + i * 0.42;
        if (pz > z1 - 0.12) break;
        const b = box(0.19, 0.18, 0.28, M.product[(i + r * 5 + (side > 0 ? 7 : 0)) % M.product.length], px, y + 0.12, pz, { noOutline: true });
        b.castShadow = false;
        g.add(b);
      }
      g.add(boxSpan(px - 0.09, px + 0.09, y + 0.03, y + 0.07, z0, z1, M.shelfMetal, { noOutline: true }));
    }
  }
  g.add(boxSpan(x - depth / 2, x + depth / 2, floorY + hgt, floorY + hgt + 0.045, z0, z1, M.shelfWhite));
  for (const ez of [z0, z1]) {
    g.add(boxSpan(x - depth / 2, x + depth / 2, floorY, floorY + hgt + 0.045, ez - 0.025, ez + 0.025, M.shelfWhite));
  }
  return g;
}

function buildEndcap(parent, M, x, z, floorY) {
  const g = group('endcap', parent);
  g.add(boxSpan(x - 0.42, x + 0.42, floorY, floorY + 1.35, z - 0.26, z + 0.26, M.shelfWhite));
  for (let r = 0; r < 3; r++) {
    const y = floorY + 0.33 + r * 0.38;
    g.add(boxSpan(x - 0.4, x + 0.4, y, y + 0.028, z + 0.26, z + 0.3, M.shelfMetal, { noOutline: true }));
    for (let i = 0; i < 5; i++) {
      const b = box(0.13, 0.17, 0.13, M.product[(i + r * 4) % M.product.length], x - 0.3 + i * 0.15, y + 0.1, z + 0.34, { noOutline: true });
      b.castShadow = false;
      g.add(b);
    }
  }
  return g;
}

/* ------------------------------------------------------------------ */
/*  Automatic door animation                                           */
/* ------------------------------------------------------------------ */

function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function animateDoors(leaves, t) {
  // 19 s loop: closed → slide open → hold → slide shut
  const period = 19.0;
  const phase = t % period;
  const t0 = 5.5;
  const openTime = 1.3;
  const holdTime = 1.0;
  let open = 0;
  if (phase > t0 && phase < t0 + openTime * 2 + holdTime) {
    const p = phase - t0;
    if (p < openTime) open = easeInOut(p / openTime);
    else if (p < openTime + holdTime) open = 1;
    else open = easeInOut(Math.max(0, 1 - (p - openTime - holdTime) / openTime));
  }
  for (const { obj, sign } of leaves) {
    obj.position.x = sign * open * 0.86;
    obj.position.z = -open * 0.08;
  }
  return open;
}

/**
 * Warm ceiling rig inside the shop. Returned rather than added so the
 * scene stays free to re-parent them (and so they never leak into the
 * reflection pass).
 */
export function buildInteriorLights() {
  const specs = [
    [-2.7, 3.0, -4.2, 0xffb877, 1.5, 5.2],
    [2.7, 3.0, -4.2, 0xffb877, 1.5, 5.2],
    [-2.7, 3.0, -1.4, 0xffc07e, 1.6, 5.2],
    [2.7, 3.0, -1.4, 0xffc07e, 1.6, 5.2],
    [0, 2.4, 0.2, 0xffcf92, 1.0, 4.2],
  ];
  const lights = [];
  for (const [x, y, z, color, intensity, dist] of specs) {
    const l = new THREE.PointLight(color, intensity, dist, 1.7);
    l.position.set(x, y, z);
    lights.push(l);
  }
  return lights;
}


