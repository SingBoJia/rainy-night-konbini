import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Cel-shading core: a hand-tuned 5-band gradient ramp shared by every
 *  MeshToonMaterial, plus a rim-light injection that gives the classic
 *  anime "highlight edge" without any extra render pass.
 * ------------------------------------------------------------------ */

const BANDS = [0.0, 0.26, 0.48, 0.7, 0.87, 1.0];
const BAND_VALUES = [0.3, 0.5, 0.69, 0.85, 1.0];
const RAMP_STEPS = 64;

function buildGradientMap() {
  const data = new Uint8Array(RAMP_STEPS * 4);
  for (let i = 0; i < RAMP_STEPS; i++) {
    const t = i / (RAMP_STEPS - 1);
    let v = BAND_VALUES[BAND_VALUES.length - 1];
    for (let b = 0; b < BAND_VALUES.length; b++) {
      if (t < BANDS[b + 1]) {
        v = BAND_VALUES[b];
        break;
      }
    }
    const c = Math.round(Math.min(1, v) * 255);
    data[i * 4 + 0] = c;
    data[i * 4 + 1] = c;
    data[i * 4 + 2] = c;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, RAMP_STEPS, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export const GRADIENT_MAP = buildGradientMap();

/** Deep, slightly blue night palette shared across the model. */
export const PAL = {
  asphalt: 0x2b3140,
  asphaltWet: 0x232838,
  sidewalk: 0x6f7183,
  sidewalkWet: 0x585b6e,
  curb: 0x8b8d9c,
  concrete: 0x9a97a4,
  concreteDark: 0x6e6b78,
  white: 0xf2efe6,
  konbiniWhite: 0xf7f4ec,
  konbiniGreen: 0x1f9c6c,
  konbiniBlue: 0x1f5fa8,
  konbiniRed: 0xd8443c,
  metal: 0x9aa3b0,
  metalDark: 0x5c6472,
  darkMetal: 0x3a3f4b,
  glass: 0x9fd8e8,
  wood: 0x6b4f3a,
  woodLight: 0xa8825c,
  brick: 0x7a5a54,
  neonPink: 0xff5f9e,
  neonCyan: 0x66e6ff,
  neonAmber: 0xffb35c,
  interiorWarm: 0xfff0cf,
};

const rimKey = 'toon-rim-v3';

/**
 * Cel material.
 * @param {object} p
 */
export function toon(p = {}) {
  const mat = new THREE.MeshToonMaterial({
    color: p.color ?? 0xffffff,
    map: p.map ?? null,
    gradientMap: GRADIENT_MAP,
    emissive: p.emissive ?? 0x000000,
    emissiveMap: p.emissiveMap ?? null,
    emissiveIntensity: p.emissiveIntensity ?? 1,
    transparent: p.transparent ?? false,
    opacity: p.opacity ?? 1,
    side: p.side ?? THREE.FrontSide,
    
    depthWrite: p.depthWrite ?? true,
    alphaTest: p.alphaTest ?? 0,
    fog: p.fog !== false,
  });

  if (p.rim !== false) {
    const rimColor = new THREE.Color(p.rim ?? 0x8fb6ff);
    const rimStrength = p.rimStrength ?? 0.28;
    const rimPower = p.rimPower ?? 3.4;
    mat.userData.rim = { color: rimColor, strength: rimStrength, power: rimPower };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimColor };
      shader.uniforms.uRimStrength = { value: rimStrength };
      shader.uniforms.uRimPower = { value: rimPower };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uRimColor;
           uniform float uRimStrength;
           uniform float uRimPower;`,
        )
        .replace(
          'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
          `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
           float ndv = clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 );
           float rim = pow( 1.0 - ndv, uRimPower );
           outgoingLight += uRimColor * rim * uRimStrength;`,
        );
    };
    mat.customProgramCacheKey = () => rimKey;
  } else {
    mat.customProgramCacheKey = () => 'toon-plain-v3';
  }
  if (p.envMapIntensity !== undefined) mat.envMapIntensity = p.envMapIntensity;
  return mat;
}

/** Flat unlit material for signage / lightboxes; >1 intensity pushes bloom. */
export function glow(mapOrColor, intensity = 1, opts = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: mapOrColor && mapOrColor.isTexture ? mapOrColor : null,
    color: mapOrColor && mapOrColor.isTexture ? new THREE.Color(1, 1, 1).multiplyScalar(intensity) : new THREE.Color(mapOrColor ?? 0xffffff).multiplyScalar(intensity),
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
    blending: opts.blending ?? THREE.NormalBlending,
    fog: opts.fog !== false,
    alphaTest: opts.alphaTest ?? 0,
    toneMapped: false,
  });
  return mat;
}

/** Additive halo material (light spills, wet glints). */
export function additive(color, opacity = 1, map = null) {
  return new THREE.MeshBasicMaterial({
    map,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

export function glassMat(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xcfe9f2,
    roughness: opts.roughness ?? 0.08,
    metalness: 0,
    transmission: opts.transmission ?? 0,
    transparent: true,
    opacity: opts.opacity ?? 0.18,
    ior: 1.45,
    reflectivity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
    envMapIntensity: 0.6,
  });
}


/**
 * Anime shop glass: fresnel-only sheen plus faint condensation streaks.
 * No specular highlights, so the interior stays readable from any angle.
 */
export function glassShader(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: new THREE.Color(opts.tint ?? 0xa8d8ea) },
      uStrength: { value: opts.strength ?? 0.4 },
      uBase: { value: opts.base ?? 0.045 },
      uWarm: { value: new THREE.Color(opts.warm ?? 0xffd9a0) },
      uWarmMix: { value: opts.warmMix ?? 0.3 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4( position, 1.0 );
        vN = normalize( mat3( modelMatrix ) * normal );
        vV = normalize( cameraPosition - wp.xyz );
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      uniform vec3 uWarm;
      uniform float uWarmMix;
      uniform float uStrength;
      uniform float uBase;
      varying vec3 vN;
      varying vec3 vV;
      varying vec2 vUv;
      void main() {
        float fres = pow( 1.0 - clamp( dot( normalize( vN ), normalize( vV ) ), 0.0, 1.0 ), 3.0 );
        float s = sin( vUv.x * 62.0 ) * 0.5 + 0.5;
        float s2 = sin( vUv.x * 23.0 + 1.7 ) * 0.5 + 0.5;
        float streak = smoothstep( 0.74, 1.0, s * 0.6 + s2 * 0.4 ) * smoothstep( 0.0, 0.45, vUv.y );
        float warm = smoothstep( 0.0, 0.55, vUv.y ) * uWarmMix;
        vec3 col = mix( uTint, uWarm, warm );
        float a = uBase + fres * uStrength + streak * 0.06;
        gl_FragColor = vec4( col, a );
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}


