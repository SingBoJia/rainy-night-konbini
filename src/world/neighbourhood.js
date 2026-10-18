import * as THREE from 'three';
import { box, boxSpan, ground, plane, cyl, sphere, addAll, group, cachedGeo, rr, rnd } from '../core/utils.js';
import { toon, glow, additive } from '../core/toon.js';
import { SITE } from './layout.js';
import {
  buildVendingMachine,
  buildLampPost,
  buildUtilityPole,
  buildRoadSign,
  buildStreetPlate,
  buildPosterBoard,
  buildAircon,
  buildPlanter,
  buildParkingSign,
  buildACUnitGround,
  buildCrate,
} from './props.js';

const WALK = SITE.walkY;

/* ------------------------------------------------------------------ *
 *  Buildings around the corner: the alley block on the right, the
 *  houses behind, and the far side of the street that closes the frame.
 * ------------------------------------------------------------------ */

export function buildNeighbourhood(M) {
  const g = group('neighbourhood');
  const S = SITE;

  // ================================================= right block (alley)
  const R = S.rightBlock;
  const block = group('alleyblock', g);
  const bh = 4.9;
  block.add(boxSpan(R.x0, R.x1, WALK, bh, R.z0, R.z1, M.tileWall));
  block.add(boxSpan(R.x0 - 0.1, R.x1 + 0.1, bh, bh + 0.42, R.z0 - 0.1, R.z1 + 0.1, M.concreteDark, { rounded: 0.03 }));
  for (let y = WALK + 3.0; y < bh; y += 3.0) {
    block.add(boxSpan(R.x0 - 0.05, R.x1 + 0.05, y, y + 0.11, R.z0 - 0.05, R.z1 + 0.05, M.concreteDark, { noOutline: true }));
  }
  // alley-facing windows
  const winLit = glow(0xffd9a0, 1.15);
  const winDark = toon({ color: 0x2a3242, rimStrength: 0.4 });
  const litMap = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1];
  let wi = 0;
  for (let fy = 0; fy < 2; fy++) {
    for (let fz = R.z0 + 1.0; fz < R.z1 - 0.8; fz += 1.85) {
      const y = WALK + 1.45 + fy * 2.9;
      const lit = litMap[wi % litMap.length] === 1;
      wi++;
      block.add(boxSpan(R.x0 - 0.14, R.x0 - 0.02, y, y + 1.05, fz, fz + 1.05, M.metalDark, { noOutline: true }));
      const pane = plane(0.94, 0.92, lit ? winLit : winDark, R.x0 - 0.15, y + 0.525, fz + 0.525, [0, -Math.PI / 2, 0]);
      pane.userData.noOutline = true;
      block.add(pane);
      if (lit && wi % 2 === 0) {
        block.add(boxSpan(R.x0 - 0.16, R.x0 - 0.14, y + 0.08, y + 0.98, fz + 0.7, fz + 0.98, toon({ color: 0xe8c79a, rimStrength: 0.08 }), { noOutline: true }));
      }
      if (wi % 3 === 0) {
        block.add(buildAircon(M, R.x0 - 0.28, y - 0.5, fz + 0.5, -Math.PI / 2, 0.85));
      }
    }
  }
  // fire escape
  for (let fy = 0; fy < 2; fy++) {
    const y = WALK + 2.75 + fy * 2.9;
    block.add(boxSpan(R.x0 - 0.85, R.x0 - 0.05, y, y + 0.055, R.z0 + 2.6, R.z0 + 5.6, M.metalDark, { noOutline: true }));
    block.add(boxSpan(R.x0 - 0.85, R.x0 - 0.8, y + 0.055, y + 0.95, R.z0 + 2.6, R.z0 + 5.6, M.metalDark, { noOutline: true }));
    for (let i = 0; i < 4; i++) {
      block.add(box(0.03, 0.9, 0.03, M.metalDark, R.x0 - 0.82, y + 0.5, R.z0 + 2.7 + i * 0.9, { noOutline: true }));
    }
  }
  // rooftop water tank + antenna
  block.add(cyl(0.7, 0.7, 1.25, 14, M.plasticWhite, R.x0 + 1.5, bh + 1.0, R.z0 + 2.6));
  for (let i = 0; i < 4; i++) {
    block.add(box(0.09, 0.85, 0.09, M.metalDark, R.x0 + 0.95 + (i % 2) * 1.1, bh + 0.42, R.z0 + 2.1 + Math.floor(i / 2) * 1.1, { noOutline: true }));
  }
  block.add(cyl(0.018, 0.018, 2.1, 5, M.metalDark, R.x0 + 3.0, bh + 1.3, R.z1 - 1.4, { noOutline: true }));
  block.add(boxSpan(R.x0 + 0.6, R.x0 + 1.5, bh + 0.42, bh + 0.85, R.z1 - 3.2, R.z1 - 2.6, M.concreteDark, { noOutline: true }));

  // alley shop sign (neon)
  const sign = plane(1.4, 0.7, M.alleySign, R.x0 - 0.11, WALK + 3.0, 1.4, [0, -Math.PI / 2, 0]);
  sign.userData.noOutline = true;
  g.add(sign);
  g.add(box(0.06, 0.8, 1.5, M.metalDark, R.x0 - 0.06, WALK + 3.0, 1.4, { noOutline: true }));
  const signSpill = ground(2.4, 3.4, additive(0xff7a9c, 0.13, M.T.wetDecal), R.x0 - 1.3, SITE.roadY + 0.02, 1.4);
  signSpill.userData.noOutline = true;
  signSpill.renderOrder = 3;
  g.add(signSpill);


  // crates + ground AC unit in the alley
  g.add(buildACUnitGround(M, R.x0 - 0.55, -1.6, -Math.PI / 2));
  g.add(buildCrate(M, R.x0 - 0.6, WALK, -3.0, 1.0));
  g.add(buildCrate(M, R.x0 - 0.62, WALK + 0.34, -3.0, 0.9));
  g.add(buildCrate(M, R.x0 - 1.3, WALK, -3.6, 0.8));

  // ================================================= back block (north)
  const B = S.backBlock;
  const back = group('backblock', g);
  back.add(boxSpan(B.x0, B.x1, WALK, 4.2, B.z0, B.z1, M.concrete));
  back.add(boxSpan(B.x0 - 0.1, B.x1 + 0.1, 4.2, 4.5, B.z0 - 0.1, B.z1 + 0.1, M.concreteDark, { rounded: 0.03 }));
  for (let fx = B.x0 + 1.2; fx < B.x1 - 1.4; fx += 2.1) {
    for (let fy = 0; fy < 2; fy++) {
      const y = WALK + 1.3 + fy * 2.5;
      const lit = rnd() > 0.45;
      back.add(boxSpan(fx, fx + 1.3, y, y + 1.0, B.z1 - 0.02, B.z1 + 0.1, M.metalDark, { noOutline: true }));
      const p = plane(1.2, 0.9, lit ? glow(0xffd6a2, 1.05) : toon({ color: 0x252c3a, rimStrength: 0.3 }), fx + 0.65, y + 0.5, B.z1 + 0.11);
      p.userData.noOutline = true;
      back.add(p);
    }
  }
  // roof clutter
  for (let i = 0; i < 5; i++) {
    back.add(box(rr(0.5, 1.2), rr(0.35, 0.9), rr(0.5, 1.0), M.concreteDark, rr(B.x0 + 1, B.x1 - 1), 4.3 + rr(0, 0.2), rr(B.z0 + 1, B.z1 - 1), { noOutline: true }));
  }

  const BE = S.backBlockE;
  const backE = group('backblockE', g);
  backE.add(boxSpan(BE.x0, BE.x1, WALK, 5.2, BE.z0, BE.z1, M.brick));
  backE.add(boxSpan(BE.x0 - 0.1, BE.x1 + 0.1, 5.2, 5.5, BE.z0 - 0.1, BE.z1 + 0.1, M.concreteDark, { rounded: 0.03 }));

  // ================================================= left house
  const H = S.leftHouse;
  const house = group('lefthouse', g);
  house.add(boxSpan(H.x0, H.x1, WALK, 3.4, H.z0, H.z1, M.brick));
  house.add(boxSpan(H.x0 - 0.22, H.x1 + 0.22, 3.4, 3.7, H.z0 - 0.22, H.z1 + 0.22, M.concreteDark, { rounded: 0.03 }));
  for (let i = 0; i < 2; i++) {
    const wz = H.z0 + 1.4 + i * 2.2;
    house.add(boxSpan(H.x1 - 0.02, H.x1 + 0.12, WALK + 1.4, WALK + 2.4, wz, wz + 1.1, M.metalDark, { noOutline: true }));
    const p = plane(1.0, 0.85, glow(0xffcf96, 1.0), H.x1 + 0.13, WALK + 1.9, wz + 0.55, [0, Math.PI / 2, 0]);
    p.userData.noOutline = true;
    house.add(p);
  }
  house.add(buildAircon(M, H.x1 + 0.2, 4.55, H.z0 + 1.2, Math.PI / 2, 0.95));
  house.add(boxSpan(H.x1 - 0.02, H.x1 + 0.55, WALK + 2.95, WALK + 3.0, H.z0 + 0.6, H.z1 - 0.6, M.metalDark, { noOutline: true }));

  // back yard wall between house and store
  const Y = S.backYard;
  const yard = group('yard', g);
  yard.add(boxSpan(Y.x0, Y.x1, WALK, WALK + 1.9, Y.z0, Y.z0 + 0.16, M.concreteDark));
  yard.add(boxSpan(Y.x0, Y.x1, WALK, WALK + 1.9, Y.z1 - 0.16, Y.z1, M.concreteDark));
  yard.add(boxSpan(Y.x1 - 0.16, Y.x1, WALK, WALK + 1.9, Y.z0, Y.z1, M.concreteDark));
  // AC units + bins in the yard
  yard.add(buildACUnitGround(M, Y.x0 + 1.6, Y.z0 + 1.3, 0));
  yard.add(buildACUnitGround(M, Y.x0 + 2.5, Y.z0 + 1.3, 0));
  yard.add(buildCrate(M, Y.x0 + 1.2, WALK, Y.z0 + 2.4, 1.1));
  // utility pipes on the store's back wall
  for (let i = 0; i < 2; i++) {
    yard.add(cyl(0.04, 0.04, 2.4, 6, M.metal, Y.x1 + 0.35 + i * 0.14, WALK + 1.2, Y.z0 + 1.6, { noOutline: true }));
  }


  return g;
}

/* ------------------------------------------------------------------ *
 *  Street furniture around the corner.                                */
/* ------------------------------------------------------------------ */

export function buildStreetFurniture(M) {
  const g = group('furniture');
  const S = SITE;

  // utility poles
  const poleA = buildUtilityPole(M, 10.65, 6.9, { h: 8.4 });
  const poleB = buildUtilityPole(M, 10.65, -6.0, { h: 8.0 });
  const poleC = buildUtilityPole(M, -13.4, 6.9, { h: 7.8 });
  addAll(g, poleA, poleB, poleC);

  // street lamps
  g.add(buildLampPost(M, -8.6, 6.75, Math.PI, { h: 4.6 }));
  g.add(buildLampPost(M, 4.9, 6.75, Math.PI, { h: 4.2 }));

  // poster board on the forecourt edge
  g.add(buildPosterBoard(M, 3.0, 6.0, 0.06));

  // parking signs
  g.add(buildParkingSign(M, S.parking.x1 - 0.35, S.parking.z0 + 0.3));
  g.add(buildParkingSign(M, S.parking.x1 - 0.35, S.parking.z1 - 0.35));

  // corner signs
  g.add(buildRoadSign(M, 5.55, 6.5, -0.15, 'pedestrian'));
  g.add(buildRoadSign(M, 6.35, 6.5, 0.1, 'speed'));
  g.add(buildStreetPlate(M, 5.95, WALK + 2.72, 6.5, -0.05));

  // planters
  g.add(buildPlanter(M, -11.6, 5.9, 0.95));
  g.add(buildPlanter(M, 11.6, 6.2, 0.9));

  // bollards along the forecourt edge
  for (let bx = -12.4; bx <= 4.4; bx += 3.1) {
    g.add(cyl(0.085, 0.095, 0.7, 8, M.plasticWhite, bx, WALK + 0.35, 6.9, { rounded: 0.02 }));
    g.add(cyl(0.09, 0.09, 0.09, 8, M.kRed, bx, WALK + 0.6, 6.9, { noOutline: true }));
  }


  return g;
}

/* ------------------------------------------------------------------ *
 *  Overhead wires — thin catenary tubes.
 * ------------------------------------------------------------------ */

export function buildPowerLines(M) {
  const g = group('wires');
  const wireMat = toon({ color: 0x1a1c22, rimStrength: 0.4 });

  const sag = (a, b, sagAmount, radius = 0.016) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= sagAmount;
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const geo = new THREE.TubeGeometry(curve, 22, radius, 4, false);
    const m = new THREE.Mesh(geo, wireMat);
    m.castShadow = false;
    m.userData.noOutline = true;
    g.add(m);
  };

  const A = new THREE.Vector3(10.65, SITE.walkY + 7.5, 6.9);
  const B = new THREE.Vector3(10.65, SITE.walkY + 7.1, -6.0);
  const C = new THREE.Vector3(-13.4, SITE.walkY + 6.9, 6.9);

  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * 0.4;
    sag(A.clone().add(new THREE.Vector3(off, 0, 0)), C.clone().add(new THREE.Vector3(off, -0.1, 0)), 0.8 + i * 0.12);
    sag(A.clone().add(new THREE.Vector3(off, -0.5, 0)), B.clone().add(new THREE.Vector3(off, -0.4, 0)), 0.55 + i * 0.1);
  }
  // service drops
  sag(A.clone().add(new THREE.Vector3(-0.3, -0.9, 0)), new THREE.Vector3(4.2, SITE.walkY + 3.85, 2.0), 0.32, 0.012);
  sag(C.clone().add(new THREE.Vector3(0.3, -0.8, 0)), new THREE.Vector3(-4.8, SITE.walkY + 3.75, 2.0), 0.4, 0.012);
  sag(A.clone().add(new THREE.Vector3(0.3, -0.9, 0)), new THREE.Vector3(10.7, SITE.walkY + 6.6, 2.4), 0.25, 0.011);


  return g;
}

/* ------------------------------------------------------------------ *
 *  Traffic signal with a slow, distant colour cycle.
 * ------------------------------------------------------------------ */

export function buildTrafficSignal(M) {
  const g = group('trafficlight');
  const x = 10.65;
  const z = 7.0;
  const baseY = SITE.walkY;

  g.add(cyl(0.085, 0.105, 5.0, 10, M.metalDark, x, baseY + 2.5, z));
  g.add(cyl(0.055, 0.055, 2.8, 8, M.metalDark, x - 1.4, baseY + 4.85, z, { rot: [0, 0, Math.PI / 2] }));

  const head = group('head', g);
  head.position.set(x - 2.7, baseY + 4.55, z);
  head.add(box(0.34, 0.96, 0.32, M.metalDark, 0, 0, 0, { rounded: 0.05 }));
  head.add(box(0.42, 0.05, 0.42, M.metalDark, 0, 0.5, 0.02, { noOutline: true }));

  const lamps = [];
  const colors = [0xff5a4a, 0xffc24a, 0x53e08a];
  for (let i = 0; i < 3; i++) {
    const y = 0.3 - i * 0.3;
    const lensGeo = cachedGeo('trafficLens', () => new THREE.CircleGeometry(0.105, 16));
    const dark = new THREE.Mesh(lensGeo, toon({ color: 0x1a1d24, rimStrength: 0.2 }));
    dark.position.set(0, y, 0.165);
    head.add(dark);
    const lit = new THREE.Mesh(lensGeo, glow(colors[i], 0.04));
    lit.position.set(0, y, 0.17);
    lit.userData.noOutline = true;
    head.add(lit);
    const halo = plane(0.7, 0.7, additive(colors[i], 0.0, M.T.wetDecal), 0, y, 0.19);
    halo.userData.noOutline = true;
    head.add(halo);
    lamps.push({ lens: lit, halo, color: colors[i] });
  }
  // pedestrian signal
  g.add(box(0.28, 0.46, 0.2, M.metalDark, x, baseY + 2.8, z + 0.19, { rounded: 0.04 }));
  const pedLens = plane(0.16, 0.3, glow(0x53e08a, 0.0), x, baseY + 2.8, z + 0.295);
  pedLens.userData.noOutline = true;
  g.add(pedLens);

  const spill = ground(3.6, 3.6, additive(0xff7a5a, 0.07, M.T.wetDecal), x - 2.7, SITE.roadY + 0.018, z + 0.5);
  spill.userData.noOutline = true;
  spill.renderOrder = 3;
  g.add(spill);

  return {
    group: g,
    update(t) {
      const c = t % 24;
      const active = c < 10 ? 2 : c < 13 ? 1 : 0;
      for (let i = 0; i < lamps.length; i++) {
        const on = i === active;
        lamps[i].lens.material.color.setHex(lamps[i].color).multiplyScalar(on ? 3.2 : 0.05);
        lamps[i].halo.material.opacity = on ? 0.24 : 0.0;
      }
      const pedOn = active === 2;
      pedLens.material.color.setHex(pedOn ? 0x53e08a : 0xff5a4a).multiplyScalar(pedOn ? 2.6 : 0.8);
      spill.material.opacity = active === 0 ? 0.11 : active === 2 ? 0.055 : 0.085;
    },
  };
}



/* ------------------------------------------------------------------ *
 *  Far edge: a low railing + shrubs close the plinth on the viewer's
 *  side without ever occluding the shop.
 * ------------------------------------------------------------------ */

export function buildFarEdge(M) {
  const g = group('faredge');
  const z = SITE.half - 0.55;
  const x0 = -SITE.half + 0.5;
  const x1 = SITE.half - 0.5;

  // low hedge row
  const leaf = toon({ color: 0x2f5a40, rimStrength: 0.22 });
  for (let x = x0; x < x1; x += 0.62) {
    const h = 0.5 + ((Math.sin(x * 3.1) + 1) / 2) * 0.16;
    g.add(sphere(0.3, leaf, x, SITE.walkY + h * 0.5, z, { seg: 8, seg2: 6, scale: [1, h, 0.9], cast: false }));
  }
  // stone kerb in front of the hedge
  g.add(boxSpan(x0 - 0.2, x1 + 0.2, SITE.walkY - 0.02, SITE.walkY + 0.18, z - 0.42, z + 0.05, M.curb));

  // two lamp posts marking the far corners
  g.add(buildLampPost(M, x0 + 0.8, z - 0.1, 0, { h: 3.4 }));
  g.add(buildLampPost(M, x1 - 0.8, z - 0.1, 0, { h: 3.4 }));

  return g;
}

