import * as THREE from 'three';
import { box, boxSpan, ground, plane, cyl, addAll, group } from '../core/utils.js';
import { toon, glow } from '../core/toon.js';
import { SITE } from './layout.js';

/* ------------------------------------------------------------------ *
 *  The square collectible plinth, the streets around it and every
 *  painted line on the wet asphalt.
 * ------------------------------------------------------------------ */

export function buildBase(M) {
  const g = group('base');
  const half = SITE.half;
  const top = SITE.top;

  // lacquered wooden plinth
  g.add(boxSpan(-half, half, -1.15, top - 0.07, -half, half, M.plinth, { rounded: 0.1, cast: false }));
  // brass trim
  g.add(boxSpan(-half - 0.05, half + 0.05, top - 0.12, top - 0.03, -half - 0.05, half + 0.05, M.brass, { cast: false }));
  // foot
  g.add(boxSpan(-half + 0.7, half - 0.7, -1.55, -1.1, -half + 0.7, half - 0.7, M.plinthFoot, { cast: false }));
  // engraved nameplate on the front edge
  const plate = plane(3.6, 0.52, M.nameplate, 0, -0.55, half + 0.065);
  plate.userData.noOutline = true;
  g.add(plate);

  // asphalt layer (the reflection plane lives at this height)
  const asphalt = ground(half * 2 - 0.08, half * 2 - 0.08, M.asphalt, 0, top, 0);
  asphalt.receiveShadow = true;
  g.add(asphalt);

  return g;
}

const paint = (color, opacity = 0.9) =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

export function buildStreet(M) {
  const g = group('street');
  const S = SITE;
  const WY = S.walkY;
  const RY = S.roadY;

  // ---------------------------------------------------------- walk surfaces
  // forecourt apron in front of the store
  g.add(boxSpan(S.forecourt.x0, S.forecourt.x1, RY, WY, S.forecourt.z0, S.forecourt.z1, M.sidewalk, { rounded: 0.015 }));
  // alley floor (runs north between store and right block)
  g.add(boxSpan(S.alley.x0, S.alley.x1, RY, WY - 0.03, S.alley.z0 + 0.15, S.alley.z1, M.asphalt, { rounded: 0.01 }));
  // front sidewalk strips either side of the alley
  g.add(boxSpan(-S.half, S.alley.x0, RY, WY, S.forecourt.z1 - 0.05, S.road.z0 + 0.02, M.sidewalk, { rounded: 0.012 }));
  // far sidewalk running out to the plinth edge
  g.add(boxSpan(-S.half, S.half, RY, WY, S.farWalk.z0, S.half - 0.15, M.sidewalk, { rounded: 0.012 }));
  // curbs
  g.add(boxSpan(-S.half, S.alley.x0, RY, WY + 0.05, S.road.z0 - 0.16, S.road.z0, M.curb));
  g.add(boxSpan(-S.half, S.half, RY, WY + 0.05, S.farWalk.z0, S.farWalk.z0 + 0.16, M.curb));
  // alley kerbs
  g.add(boxSpan(S.alley.x0 - 0.16, S.alley.x0, RY, WY + 0.03, S.alley.z0 + 0.2, S.forecourt.z1 - 0.05, M.curb));
  g.add(boxSpan(S.alley.x1, S.alley.x1 + 0.16, RY, WY + 0.03, S.alley.z0 + 0.2, S.forecourt.z1 - 0.05, M.curb));

  // parking pad beside the store (sunken asphalt lot)
  g.add(boxSpan(S.parking.x0, S.parking.x1, RY, WY - 0.02, S.parking.z0, S.parking.z1, M.asphalt, { rounded: 0.01 }));
  g.add(boxSpan(S.parking.x1 - 0.14, S.parking.x1, RY, WY + 0.04, S.parking.z0, S.parking.z1, M.curb));
  // east sidewalk in front of the right block
  g.add(boxSpan(S.alley.x1, S.half - 0.1, RY, WY, 5.2, S.road.z0 - 0.05, M.sidewalk, { rounded: 0.012 }));

  // gutter channel along the near curb
  g.add(boxSpan(-S.half, S.half, RY - 0.01, RY + 0.014, S.road.z0, S.road.z0 + 0.34, M.concreteDark));

  // ------------------------------------------------------------ road paint
  const white = paint(0xe8e4d4, 0.8);
  const yellow = paint(0xe0bd68, 0.68);

  // crosswalk
  const stripeW = 0.56;
  const gap = 0.34;
  for (let x = S.crosswalk.x0; x + stripeW < S.crosswalk.x1; x += stripeW + gap) {
    const m = ground(stripeW, S.road.z1 - S.road.z0 - 1.6, white, x + stripeW / 2, RY + 0.006, (S.road.z0 + S.road.z1) / 2);
    m.userData.noOutline = true;
    m.renderOrder = 2;
    g.add(m);
  }
  // stop line
  const sl = ground(0.4, S.road.z1 - S.road.z0 - 1.8, white, 11.0, RY + 0.006, (S.road.z0 + S.road.z1) / 2);
  sl.userData.noOutline = true;
  sl.renderOrder = 2;
  g.add(sl);

  // centre dashes
  for (let x = -S.half + 1.4; x < S.half - 1; x += 3.2) {
    if (x > S.crosswalk.x0 - 2.2 && x < S.crosswalk.x1 + 1.4) continue;
    const m = ground(1.6, 0.15, yellow, x, RY + 0.006, (S.road.z0 + S.road.z1) / 2);
    m.userData.noOutline = true;
    m.renderOrder = 2;
    g.add(m);
  }

  // edge lines
  const el = ground(S.half * 2 - 1, 0.11, white, 0, RY + 0.006, S.road.z1 - 0.5);
  el.userData.noOutline = true;
  el.renderOrder = 2;
  g.add(el);

  // alley centre dashes + crossing stripes at its mouth
  for (let z = S.alley.z0 + 1.5; z < S.forecourt.z1 - 1.2; z += 2.6) {
    const m = ground(0.13, 1.4, yellow, (S.alley.x0 + S.alley.x1) / 2, RY + 0.006, z);
    m.userData.noOutline = true;
    m.renderOrder = 2;
    g.add(m);
  }
  for (let z = 0.6; z < 4.6; z += 0.92) {
    const m = ground(0.46, 0.46, white, S.alley.x0 + 1.3, RY + 0.008, z);
    m.userData.noOutline = true;
    m.renderOrder = 2;
    g.add(m);
  }

  // parking bay lines
  for (let i = 0; i <= 2; i++) {
    const z = S.parking.z0 + 0.3 + i * 1.85;
    const m = ground(S.parking.x1 - S.parking.x0 - 0.4, 0.1, white, (S.parking.x0 + S.parking.x1) / 2, WY - 0.014, z);
    m.userData.noOutline = true;
    g.add(m);
  }
  for (let i = 0; i < 2; i++) {
    const z = S.parking.z0 + 1.2 + i * 1.85;
    g.add(box(1.3, 0.1, 0.13, M.concreteDark, S.parking.x0 + 0.95, WY + 0.04, z, { rounded: 0.02 }));
  }

  // tactile paving
  const tactile = paint(0xd4c470, 0.45);
  for (let x = -13.6; x < 13; x += 1.1) {
    if (x > S.alley.x0 - 1 && x < S.alley.x1 + 0.2) continue;
    const t = ground(0.8, 0.3, tactile, x, WY + 0.004, S.forecourt.z1 - 0.55);
    t.userData.noOutline = true;
    g.add(t);
  }

  // gutter grates
  for (let gx = -12.6; gx <= 12.6; gx += 5.2) {
    if (gx > 5.4 && gx < 10.8) continue;
    const gr = box(1.3, 0.04, 0.26, M.grate, gx, RY + 0.022, S.road.z0 + 0.17);
    gr.userData.noOutline = true;
    g.add(gr);
  }

  // manholes
  for (const [mx, mz, r] of [
    [2.0, 9.8, 0.55],
    [-8.2, 11.0, 0.48],
    [7.6, 3.4, 0.44],
    [-3.0, 4.6, 0.4],
  ]) {
    const mh = cyl(r, r, 0.032, 20, M.manhole, mx, RY + 0.012, mz);
    mh.userData.noOutline = true;
    g.add(mh);
  }

  // ------------------------------------------------------------ guard rails
  buildGuardRail(g, M, 5.55, 7.0, 3.4);
  buildGuardRail(g, M, -14.4, 7.0, 2.4);

  return g;
}

function buildGuardRail(parent, M, x, z, len) {
  const g = group('guardrail', parent);
  g.position.set(x, SITE.walkY, z);
  for (let i = 0; i <= 3; i++) {
    g.add(cyl(0.042, 0.042, 0.8, 8, M.metal, (i / 3) * len, 0.4, 0));
  }
  g.add(box(len, 0.06, 0.06, M.metal, len / 2, 0.78, 0, { rounded: 0.02 }));
  g.add(box(len, 0.045, 0.045, M.metal, len / 2, 0.46, 0));
  return g;
}

/* ------------------------------------------------------------------ *
 *  Standing water. Additive decals catch bloom so puddles read as
 *  bright mirrors under the shop lights.
 * ------------------------------------------------------------------ */

export function buildPuddles(M) {
  const g = group('puddles');
  const RY = SITE.roadY;

  const puddleMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x93b8ea),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    map: M.T.wetDecal,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  const spots = [
    [3.2, 9.2, 4.2, 2.2],
    [-4.4, 10.4, 5.0, 2.6],
    [-11.4, 9.0, 3.4, 1.9],
    [8.4, 11.4, 3.2, 1.8],
    [0.6, 11.8, 5.4, 2.4],
    [-13.0, 11.6, 2.6, 1.5],
    [7.4, 3.0, 2.0, 3.6],
    [-8.6, 4.2, 2.2, 1.4],
    [12.0, 8.6, 2.4, 1.4],
  ];
  for (const [x, z, w, d] of spots) {
    const p = ground(w, d, puddleMat, x, RY + 0.008, z, { rotZ: (x * 1.7) % 3 });
    p.userData.noOutline = true;
    p.renderOrder = 3;
    g.add(p);
  }

  // gutter water film
  const film = ground(SITE.half * 2 - 2, 0.5, puddleMat, 0, RY + 0.007, SITE.road.z0 + 0.18);
  film.userData.noOutline = true;
  film.renderOrder = 3;
  g.add(film);

  return g;
}


