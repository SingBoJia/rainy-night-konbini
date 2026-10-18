import * as THREE from 'three';
import { SITE, isDry } from './layout.js';

/* ------------------------------------------------------------------ *
 *  GPU-driven weather. Each effect is a single draw call: a quad batch
 *  whose vertices carry their own random seeds and are animated in the
 *  vertex shader, so the CPU only uploads a time uniform.
 * ------------------------------------------------------------------ */

const QUAD_POS = [
  [-0.5, 0],
  [0.5, 0],
  [0.5, 1],
  [-0.5, 1],
];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

function quadBatchGeometry(count, seeds) {
  const pos = new Float32Array(count * 4 * 3);
  const off = new Float32Array(count * 4 * 3);
  const rnd = new Float32Array(count * 4 * 4);
  const idx = new Uint32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const s = seeds[i];
    for (let v = 0; v < 4; v++) {
      const k = i * 4 + v;
      pos[k * 3 + 0] = QUAD_POS[v][0];
      pos[k * 3 + 1] = QUAD_POS[v][1];
      pos[k * 3 + 2] = 0;
      off[k * 3 + 0] = s.x;
      off[k * 3 + 1] = s.y;
      off[k * 3 + 2] = s.z;
      rnd[k * 4 + 0] = s.a;
      rnd[k * 4 + 1] = s.b;
      rnd[k * 4 + 2] = s.c;
      rnd[k * 4 + 3] = s.d;
    }
    const o = i * 6;
    idx[o + 0] = i * 4 + 0;
    idx[o + 1] = i * 4 + 1;
    idx[o + 2] = i * 4 + 2;
    idx[o + 3] = i * 4 + 0;
    idx[o + 4] = i * 4 + 2;
    idx[o + 5] = i * 4 + 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOffset', new THREE.BufferAttribute(off, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 8, 0), 60);
  return g;
}

function scatter(count, opts) {
  const seeds = [];
  const half = SITE.half - 0.5;
  let guard = 0;
  while (seeds.length < count && guard < count * 14) {
    guard++;
    const x = (Math.random() * 2 - 1) * half;
    const z = (Math.random() * 2 - 1) * half;
    if (isDry(x, z)) continue;
    seeds.push({ x, y: 0, z, a: Math.random(), b: Math.random(), c: Math.random(), d: Math.random() });
  }
  return seeds;
}

/* ---------------------------------- rain --------------------------------- */

export function createRain() {
  const seeds = scatter(2800);
  const geo = quadBatchGeometry(seeds.length, seeds);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: 13.0 },
      uBot: { value: 0.0 },
      uWindX: { value: 1.2 },
      uWindZ: { value: 0.55 },
      uWidth: { value: 0.011 },
      uLen: { value: 0.3 },
      uColor: { value: new THREE.Color(0xc4dcff) },
      uOpacity: { value: 0.17 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute vec4 aRand;
      uniform float uTime;
      uniform float uTop;
      uniform float uBot;
      uniform float uWindX;
      uniform float uWindZ;
      uniform float uWidth;
      uniform float uLen;
      varying float vAlpha;
      varying float vY;
      void main() {
        float t = fract( aRand.x + uTime * ( 0.16 + aRand.y * 0.12 ) );
        vec3 p = aOffset;
        p.y = mix( uTop, uBot, t );
        p.x += uWindX * ( 1.0 - t );
        p.z += uWindZ * ( 1.0 - t );

        vec4 mv = viewMatrix * vec4( p, 1.0 );
        float len = uLen * ( 0.7 + aRand.z * 0.9 );
        mv.x += position.x * uWidth * ( 0.8 + aRand.z * 0.7 ) + position.y * len * 0.18;
        mv.y += position.y * len;

        gl_Position = projectionMatrix * mv;
        vY = position.y;

        float fadeIn = smoothstep( 0.0, 0.08, t );
        float fadeOut = 1.0 - smoothstep( 0.82, 1.0, t );
        float nearFade = smoothstep( 2.0, 6.0, -mv.z );
        vAlpha = fadeIn * fadeOut * nearFade * ( 0.3 + 0.7 * aRand.w );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vY;
      void main() {
        float a = vAlpha * uOpacity * ( 0.35 + 0.65 * vY );
        if ( a < 0.004 ) discard;
        gl_FragColor = vec4( uColor, a );
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 30;
  mesh.layers.set(1);
  mesh.name = 'rain';
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

/* -------------------------------- canopy drips ---------------------------- */

export function createDrips() {
  const seeds = [];
  const canopyZ = SITE.store.z1 + 1.5;
  for (let i = 0; i < 150; i++) {
    seeds.push({
      x: -5.7 + Math.random() * 11.4,
      y: 0,
      z: canopyZ - Math.random() * 0.1,
      a: Math.random(),
      b: Math.random(),
      c: Math.random(),
      d: Math.random(),
    });
  }
  // gutter drips along the canopy posts
  for (let i = 0; i < 60; i++) {
    seeds.push({
      x: -14 + Math.random() * 26,
      y: 0,
      z: SITE.road.z0 + 0.1 + Math.random() * 0.2,
      a: Math.random(),
      b: Math.random(),
      c: Math.random(),
      d: Math.random(),
    });
  }

  const geo = quadBatchGeometry(seeds.length, seeds);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: 2.78 },
      uBot: { value: 0.5 },
      uWidth: { value: 0.016 },
      uLen: { value: 0.14 },
      uColor: { value: new THREE.Color(0xdcecff) },
      uOpacity: { value: 0.6 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute vec4 aRand;
      uniform float uTime;
      uniform float uTop;
      uniform float uBot;
      uniform float uWidth;
      uniform float uLen;
      varying float vAlpha;
      varying float vY;
      void main() {
        float cycle = fract( aRand.x + uTime * ( 0.14 + aRand.y * 0.16 ) );
        float fall = smoothstep( 0.0, 0.5, cycle );
        vec3 p = aOffset;
        p.y = mix( uTop, uBot, fall );
        p.x += sin( cycle * 6.28 + aRand.w * 6.28 ) * 0.01;

        vec4 mv = viewMatrix * vec4( p, 1.0 );
        mv.x += position.x * uWidth;
        mv.y += position.y * uLen * ( 0.6 + fall * 2.0 );

        gl_Position = projectionMatrix * mv;
        vY = position.y;

        float visible = step( 0.03, cycle ) * ( 1.0 - smoothstep( 0.5, 0.56, cycle ) );
        vAlpha = visible * ( 0.45 + 0.55 * aRand.z );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      varying float vY;
      void main() {
        float a = vAlpha * uOpacity * ( 0.25 + 0.75 * vY );
        if ( a < 0.004 ) discard;
        gl_FragColor = vec4( uColor, a );
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 31;
  mesh.layers.set(1);
  mesh.name = 'drips';
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

/* ------------------------------ puddle ripples ---------------------------- */

export function createRipples() {
  const seeds = scatter(520);

  const pos = new Float32Array(seeds.length * 4 * 3);
  const off = new Float32Array(seeds.length * 4 * 3);
  const rnd = new Float32Array(seeds.length * 4 * 4);
  const idx = new Uint32Array(seeds.length * 6);
  const CORNERS = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    for (let v = 0; v < 4; v++) {
      const k = i * 4 + v;
      pos[k * 3 + 0] = CORNERS[v][0];
      pos[k * 3 + 1] = CORNERS[v][1];
      pos[k * 3 + 2] = 0;
      off[k * 3 + 0] = s.x;
      off[k * 3 + 1] = 0;
      off[k * 3 + 2] = s.z;
      rnd[k * 4 + 0] = s.a;
      rnd[k * 4 + 1] = s.b;
      rnd[k * 4 + 2] = s.c;
      rnd[k * 4 + 3] = s.d;
    }
    const o = i * 6;
    idx[o] = i * 4;
    idx[o + 1] = i * 4 + 1;
    idx[o + 2] = i * 4 + 2;
    idx[o + 3] = i * 4;
    idx[o + 4] = i * 4 + 2;
    idx[o + 5] = i * 4 + 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aOffset', new THREE.BufferAttribute(off, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0), 30);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 0.42 },
      uColor: { value: new THREE.Color(0xa8c8ff) },
      uOpacity: { value: 0.17 },
      uY: { value: SITE.roadY + 0.02 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute vec4 aRand;
      uniform float uTime;
      uniform float uSize;
      uniform float uY;
      varying vec2 vUv;
      varying float vT;
      void main() {
        float t = fract( aRand.y + uTime * ( 0.34 + aRand.x * 0.42 ) );
        float s = uSize * ( 0.3 + aRand.z * 0.9 ) * ( 0.2 + t * 1.1 );
        vec4 world = modelMatrix * vec4( aOffset, 1.0 );
        world.y = uY;
        world.x += position.x * s;
        world.z += position.y * s;
        gl_Position = projectionMatrix * viewMatrix * world;
        vUv = position.xy;
        vT = t;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vT;
      void main() {
        float d = length( vUv );
        float ring = smoothstep( 0.6, 0.85, d ) * ( 1.0 - smoothstep( 0.88, 1.0, d ) );
        float core = ( 1.0 - smoothstep( 0.0, 0.28, d ) ) * 0.3;
        float a = ( ring + core ) * pow( 1.0 - vT, 1.6 ) * uOpacity;
        if ( a < 0.004 ) discard;
        gl_FragColor = vec4( uColor, a );
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 18;
  mesh.layers.set(1);
  mesh.name = 'ripples';
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

/* --------------------------- rain running down glass ---------------------- */

export function createGlassRain(width, height, x, y, z, rotY = 0) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.17 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      float hash( vec2 p ) {
        p = fract( p * vec2( 123.34, 456.21 ) );
        p += dot( p, p + 45.32 );
        return fract( p.x * p.y );
      }

      void main() {
        vec2 uv = vUv;
        float acc = 0.0;
        float trail = 0.0;

        for ( int i = 0; i < 3; i++ ) {
          float fi = float( i );
          vec2 sc = vec2( 9.0 + fi * 9.0, 4.6 + fi * 4.6 );
          vec2 g = uv * sc;
          g.y += uTime * ( 0.05 + fi * 0.045 );
          vec2 id = floor( g );
          vec2 f = fract( g );
          float h = hash( id + fi * 31.0 );
          float on = step( 0.58, h );
          vec2 c = vec2( 0.5 + ( h - 0.5 ) * 0.35, 0.45 );
          vec2 d = ( f - c ) * vec2( 1.0, 0.55 );
          float r = 0.075 + 0.055 * hash( id + 7.0 );
          float dr = smoothstep( r, r * 0.3, length( d ) ) * on;
          acc = max( acc, dr * ( 0.55 + fi * 0.22 ) );

          float streak = smoothstep( 0.14, 0.0, abs( f.x - c.x ) ) * smoothstep( 0.0, 0.85, f.y ) * step( 0.72, h );
          trail = max( trail, streak * 0.18 );
        }

        float sheen = smoothstep( 0.5, 1.0, uv.y ) * 0.04;
        float a = ( acc * 0.22 + trail * 0.8 + sheen ) * uOpacity;
        vec3 col = mix( vec3( 0.62, 0.78, 0.95 ), vec3( 1.0 ), acc * 0.6 );
        if ( a < 0.004 ) discard;
        gl_FragColor = vec4( col, a );
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.layers.set(1);
  mesh.renderOrder = 32;
  mesh.userData.noOutline = true;
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

/* ------------------------------ sign flicker ------------------------------ */

export function createFlicker(entries) {
  const items = entries.map((e) => ({
    mat: e.mat,
    base: new THREE.Color(e.base ?? 0xffffff),
    seed: Math.random() * 100,
    buzz: e.buzz ?? 0.5,
    slow: e.slow ?? 0.03,
  }));

  return {
    update(t) {
      for (const e of items) {
        const breathe = 1.0 - e.slow * (0.5 + 0.5 * Math.sin(t * 1.4 + e.seed));
        const n = Math.sin(t * 21.0 + e.seed * 9.0) * Math.sin(t * 7.3 + e.seed * 2.7);
        const dropout = Math.sin(t * 0.53 + e.seed) > 0.985;
        let f = breathe;
        if (dropout) f *= 1.0 - Math.abs(n) * 0.7 * e.buzz;
        e.mat.color.copy(e.base).multiplyScalar(Math.max(0.4, Math.min(1.05, f)));
      }
    },
  };
}

/* -------------------------- soft volumetric sprites ----------------------- */

export function createGlowSprite(color, size, opacity, map) {
  const mat = new THREE.SpriteMaterial({
    map,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.layers.set(1);
  return s;
}






