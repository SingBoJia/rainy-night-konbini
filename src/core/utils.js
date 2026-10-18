import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ------------------------------------------------------------------ *
 *  Tiny geometry / scene helpers shared by every world builder.
 * ------------------------------------------------------------------ */

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function group(name = 'group', parent = null) {
  const g = new THREE.Group();
  g.name = name;
  if (parent) parent.add(g);
  return g;
}

const _geoCache = new Map();
export function cachedGeo(key, factory) {
  let g = _geoCache.get(key);
  if (!g) {
    g = factory();
    _geoCache.set(key, g);
  }
  return g;
}

/** Axis aligned box mesh. */
export function box(w, h, d, mat, x = 0, y = 0, z = 0, opts = {}) {
  const r = opts.rounded ? Math.min(opts.rounded, Math.min(w, h, d) * 0.49) : 0;
  const geo = opts.rounded
    ? cachedGeo(`rb${w}_${h}_${d}_${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r))
    : cachedGeo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  if (opts.noOutline) m.userData.noOutline = true;
  if (opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  if (opts.name) m.name = opts.name;
  return m;
}

/** Box defined by min/max corners — handy for architecture. */
export function boxSpan(x0, x1, y0, y1, z0, z1, mat, opts = {}) {
  return box(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opts);
}

export function plane(w, h, mat, x = 0, y = 0, z = 0, rot = [0, 0, 0], opts = {}) {
  const m = new THREE.Mesh(cachedGeo(`p${w}_${h}`, () => new THREE.PlaneGeometry(w, h)), mat);
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.receiveShadow = opts.receive !== false;
  m.castShadow = !!opts.cast;
  if (opts.noOutline) m.userData.noOutline = true;
  return m;
}

/** Horizontal plane facing up (ground decals, puddles, mats). */
export function ground(w, d, mat, x = 0, y = 0.001, z = 0, opts = {}) {
  return plane(w, d, mat, x, y, z, [-Math.PI / 2, 0, opts.rotZ || 0], opts);
}

export function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0, opts = {}) {
  const geo = cachedGeo(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  if (opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  if (opts.noOutline) m.userData.noOutline = true;
  return m;
}

export function sphere(r, mat, x = 0, y = 0, z = 0, opts = {}) {
  const geo = cachedGeo(`s${r}_${opts.seg || 12}`, () => new THREE.SphereGeometry(r, opts.seg || 12, opts.seg2 || 8));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = false;
  if (opts.scale) m.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
  if (opts.noOutline) m.userData.noOutline = true;
  return m;
}

export function torus(r, tube, mat, x, y, z, rot, opts = {}) {
  const geo = new THREE.TorusGeometry(r, tube, 8, opts.seg || 16);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = false;
  return m;
}

export function addAll(parent, ...items) {
  for (const it of items.flat(6)) if (it) parent.add(it);
  return parent;
}

export const rnd = (() => {
  let s = 20261017;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
})();

export const rr = (a, b) => a + rnd() * (b - a);
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

