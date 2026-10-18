import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/* ------------------------------------------------------------------ *
 *  Anime render pipeline
 *  scene ──► [depth/normal] ─┐
 *        └─► render ──► bloom ──► ink outline ──► grade ──► screen
 * ------------------------------------------------------------------ */

const DEPTH_NORMAL_VS = /* glsl */ `
  #include <common>
  varying vec3 vNormalV;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    vNormalV = normalize( normalMatrix * normal );
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const DEPTH_NORMAL_FS = /* glsl */ `
  uniform float uFar;
  varying vec3 vNormalV;
  varying float vDepth;
  void main() {
    gl_FragColor = vec4( normalize( vNormalV ) * 0.5 + 0.5, clamp( vDepth / uFar, 0.0, 1.0 ) );
  }
`;

const OUTLINE_FS = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tNormalDepth;
  uniform vec2 uTexel;
  uniform float uThickness;
  uniform vec3 uLineColor;
  uniform float uStrength;
  uniform float uFar;
  varying vec2 vUv;

  vec4 sampleND( vec2 uv ) { return texture2D( tNormalDepth, uv ); }

  void main() {
    vec4 base = texture2D( tDiffuse, vUv );
    vec4 c = sampleND( vUv );

    if ( c.a >= 0.9999 ) { gl_FragColor = base; return; }

    vec2 t = uTexel * uThickness;
    vec3 n0 = c.rgb;
    float d0 = c.a;

    float depthEdge = 0.0;
    float normEdge = 0.0;

    vec2 offs[8];
    offs[0] = vec2( 1.0, 0.0 );  offs[1] = vec2( -1.0, 0.0 );
    offs[2] = vec2( 0.0, 1.0 );  offs[3] = vec2( 0.0, -1.0 );
    offs[4] = vec2( 0.7, 0.7 );  offs[5] = vec2( -0.7, 0.7 );
    offs[6] = vec2( 0.7, -0.7 ); offs[7] = vec2( -0.7, -0.7 );

    float thr = 0.004 + d0 * 0.035;
    for ( int i = 0; i < 8; i++ ) {
      vec4 s = sampleND( vUv + offs[i] * t );
      depthEdge = max( depthEdge, smoothstep( thr, thr * 3.2, abs( s.a - d0 ) ) );
      float nd = 1.0 - dot( normalize( s.rgb * 2.0 - 1.0 ), normalize( n0 * 2.0 - 1.0 ) );
      normEdge = max( normEdge, smoothstep( 0.32, 0.85, nd ) );
    }

    float edge = clamp( max( depthEdge, normEdge * 0.9 ), 0.0, 1.0 );
    // slightly wider, softer second tap keeps lines readable at a distance
    vec4 c2 = sampleND( vUv + vec2( t.x * 2.0, 0.0 ) );
    vec4 c3 = sampleND( vUv - vec2( t.x * 2.0, 0.0 ) );
    float thr2 = 0.004 + d0 * 0.035;
    edge = max( edge, smoothstep( thr2, thr2 * 3.2, max( abs( c2.a - d0 ), abs( c3.a - d0 ) ) ) * 0.75 );

    vec3 col = mix( base.rgb, uLineColor, edge * uStrength );
    gl_FragColor = vec4( col, base.a );
  }
`;

export class InkOutlinePass extends Pass {
  constructor(scene, camera, opts = {}) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.thickness = opts.thickness ?? 1.15;
    this.strength = opts.strength ?? 0.8;
    this.lineColor = new THREE.Color(opts.color ?? 0x1b1524);
    this.far = opts.far ?? 90;

    this.rt = new THREE.WebGLRenderTarget(2, 2, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      generateMipmaps: false,
    });
    this.rt.texture.name = 'InkOutline.depthNormal';

    this.ndMaterial = new THREE.ShaderMaterial({
      uniforms: { uFar: { value: this.far } },
      vertexShader: DEPTH_NORMAL_VS,
      fragmentShader: DEPTH_NORMAL_FS,
      side: THREE.FrontSide,
    });

    this.quad = new FullScreenQuad(
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          tNormalDepth: { value: this.rt.texture },
          uTexel: { value: new THREE.Vector2(1 / 2, 1 / 2) },
          uThickness: { value: this.thickness },
          uLineColor: { value: this.lineColor },
          uStrength: { value: this.strength },
          uFar: { value: this.far },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
        `,
        fragmentShader: OUTLINE_FS,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    this.quad.material.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  render(renderer, writeBuffer, readBuffer) {
    const scene = this.scene;
    const cam = this.camera;
    const oldOverride = scene.overrideMaterial;
    const oldBackground = scene.background;
    const oldMask = cam.layers.mask;

    scene.overrideMaterial = this.ndMaterial;
    scene.background = null;
    cam.layers.set(0);
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, cam);

    scene.overrideMaterial = oldOverride;
    scene.background = oldBackground;
    cam.layers.mask = oldMask;

    const u = this.quad.material.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() {
    this.rt.dispose();
    this.quad.dispose();
    this.ndMaterial.dispose();
  }
}

const GRADE_FS = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uExposure;
  uniform float uVignette;
  uniform float uGrain;
  uniform float uSaturation;
  uniform vec3 uShadowTint;
  uniform vec3 uHighTint;
  uniform float uAberration;
  varying vec2 vUv;

  // Narkowicz ACES approximation
  vec3 aces( vec3 x ) {
    const float a = 2.51; const float b = 0.03; const float c = 2.43; const float d = 0.59; const float e = 0.14;
    return clamp( ( x * ( a * x + b ) ) / ( x * ( c * x + d ) + e ), 0.0, 1.0 );
  }

  vec3 linearToSRGB( vec3 c ) {
    return mix( pow( c, vec3( 1.0 / 2.4 ) ) * 1.055 - 0.055, c * 12.92, step( c, vec3( 0.0031308 ) ) );
  }

  float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }

  void main() {
    vec2 uv = vUv;
    vec2 centered = uv - 0.5;

    // subtle lens aberration toward the frame edge
    float r2 = dot( centered, centered );
    vec2 ab = centered * r2 * uAberration;
    vec3 col;
    col.r = texture2D( tDiffuse, uv + ab ).r;
    col.g = texture2D( tDiffuse, uv ).g;
    col.b = texture2D( tDiffuse, uv - ab ).b;

    col *= uExposure;
    col = aces( col );

    // split-tone grade: cool shadows, warm highlights
    float luma = dot( col, vec3( 0.299, 0.587, 0.114 ) );
    vec3 graded = col;
    graded = mix( graded, graded * uShadowTint, ( 1.0 - smoothstep( 0.0, 0.55, luma ) ) );
    graded = mix( graded, graded * uHighTint, smoothstep( 0.45, 1.0, luma ) );
    graded = mix( vec3( luma ), graded, uSaturation );

    // vignette
    float vig = smoothstep( 0.92, 0.28, length( centered * vec2( 1.05, 1.15 ) ) );
    graded *= mix( 1.0, vig, uVignette );

    // film grain
    float g = hash( uv * uResolution + fract( uTime ) * 91.7 ) - 0.5;
    graded += g * uGrain;

    gl_FragColor = vec4( linearToSRGB( max( graded, 0.0 ) ), 1.0 );
  }
`;

export function createPipeline(renderer, scene, camera, opts = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();

  const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  rt.texture.name = 'SceneRT';

  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    opts.bloomStrength ?? 0.55,
    opts.bloomRadius ?? 0.72,
    opts.bloomThreshold ?? 0.78,
  );
  composer.addPass(bloom);

  const outline = new InkOutlinePass(scene, camera, {
    thickness: opts.outlineThickness ?? 1.6,
    strength: opts.outlineStrength ?? 1.0,
    color: opts.outlineColor ?? 0x1a1424,
    far: opts.far ?? 90,
  });
  composer.addPass(outline);

  const grade = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(size.x, size.y) },
        uTime: { value: 0 },
        uExposure: { value: opts.exposure ?? 1.05 },
        uVignette: { value: opts.vignette ?? 0.62 },
        uGrain: { value: opts.grain ?? 0.026 },
        uSaturation: { value: opts.saturation ?? 1.1 },
        uShadowTint: { value: new THREE.Color(opts.shadowTint ?? 0x8fa8d8) },
        uHighTint: { value: new THREE.Color(opts.highTint ?? 0xffe0bc) },
        uAberration: { value: opts.aberration ?? 0.0016 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
      `,
      fragmentShader: GRADE_FS,
      depthTest: false,
      depthWrite: false,
    }),
  );
  composer.addPass(grade);

  return {
    composer,
    bloom,
    outline,
    grade,
    setSize(w, h) {
      composer.setSize(w, h);
      bloom.setSize(w, h);
      outline.setSize(w * pr, h * pr);
      grade.material.uniforms.uResolution.value.set(w, h);
    },
    render(time) {
      grade.material.uniforms.uTime.value = time;
      composer.render();
    },
  };
}

