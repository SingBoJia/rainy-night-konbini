/* Single source of truth for the diorama's measurements.
 *
 *   +Z is toward the viewer, -Z recedes. The square plinth is 30 × 30.
 *
 *   z:  -15 ─ back block ─ -6.3 ─ store ─ 2.0 ─ forecourt ─ 7.4
 *        ─ road ─ 12.6 ─ far walk ─ 13.6 ─ far block ─ 14.8
 *
 *   x:  -15 ─ left house ─ -11.4 ─ parking ─ -5.5 ─ store ─ 5.5
 *        ─ alley ─ 10.3 ─ right block ─ 14.4
 */

export const SITE = {
  half: 15.6,
  top: 0.35, // asphalt level (plinth top)
  roadY: 0.35,
  walkY: 0.48, // raised sidewalk level

  store: { x0: -5.5, x1: 5.5, z0: -6.0, z1: 2.0, h: 3.4 },

  forecourt: { x0: -11.0, x1: 5.9, z0: 2.0, z1: 7.4 },
  road: { z0: 7.4, z1: 11.4 },
  farWalk: { z0: 11.4, z1: 12.6 },



  alley: { x0: 5.9, x1: 10.3, z0: -14.4, z1: 7.4 },

  rightBlock: { x0: 10.7, x1: 14.6, z0: -6.3, z1: 3.4 },
  backBlock: { x0: -14.0, x1: 5.7, z0: -14.0, z1: -6.3 },
  backBlockE: { x0: 10.7, x1: 14.6, z0: -14.0, z1: -6.3 },
  leftHouse: { x0: -14.0, x1: -11.4, z0: -6.3, z1: 1.4 },
  backYard: { x0: -11.4, x1: -5.7, z0: -6.3, z1: 1.4 },

  parking: { x0: -15.2, x1: -11.0, z0: 2.2, z1: 7.0 },
  crosswalk: { x0: 6.2, x1: 10.0 },
};

/** Footprints that stay dry (no rain, no ripples). */
export const DRY_RECTS = [
  { x0: -5.7, x1: 5.7, z0: -6.3, z1: 2.2 }, // store
  { x0: 10.6, x1: 14.7, z0: -14.1, z1: 3.5 }, // right block
  { x0: -14.1, x1: 5.8, z0: -14.1, z1: -6.2 }, // back block
  { x0: 10.6, x1: 14.7, z0: -14.1, z1: -6.2 }, // back block east
    { x0: -14.1, x1: -11.3, z0: -6.3, z1: 1.5 }, // left house
  { x0: -11.5, x1: -5.6, z0: -6.3, z1: 1.5 }, // back yard
];

export function isDry(x, z) {
  for (let i = 0; i < DRY_RECTS.length; i++) {
    const r = DRY_RECTS[i];
    if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
  }
  return false;
}






