import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Planar reflection for the rain-soaked street.
 *  One low-res mirrored render feeds every "wet" material in the scene
 *  through a shared uniform block, so puddles, asphalt and sidewalks all
 *  agree with each other.
 * ------------------------------------------------------------------ */

const REFLECT_VS = /* glsl */ `
  varying vec3 vWetWorld;
  #include <common>
`;

export class PlanarReflection {
  constructor(renderer, scene, camera, opts = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.planeY = opts.planeY ?? 0.0;
    this.hide = opts.hide ?? [];
    this.wetMeshes = [];
    this.enabled = true;
    this.frame = 0;
    this.every = opts.every ?? 2;

    this.rt = new THREE.WebGLRenderTarget(opts.width ?? 640, opts.height ?? 384, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      generateMipmaps: false,
    });
    this.rt.texture.name = 'WetReflection';

    this.virtualCamera = new THREE.PerspectiveCamera();
    this.textureMatrix = new THREE.Matrix4();
    this._normal = new THREE.Vector3(0, 1, 0);
    this._reflectorPos = new THREE.Vector3(0, this.planeY, 0);
    this._view = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this._camWorld = new THREE.Vector3();
    this._rot = new THREE.Matrix4();

    this._clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.planeY - 0.002);
    this.uniforms = {
      tWetReflect: { value: this.rt.texture },
      uWetMatrix: { value: this.textureMatrix },
    };
  }

  /** Collect meshes using wet materials so the pass can swap them out. */
  collect(root) {
    this.wetMeshes.length = 0;
    root.traverse((o) => {
      if (o.isMesh && o.material && o.material.userData && o.material.userData.wet) this.wetMeshes.push(o);
    });
    return this.wetMeshes.length;
  }

  setSize(w, h) {
    const s = 0.5;
    this.rt.setSize(Math.max(256, Math.floor(w * s)), Math.max(160, Math.floor(h * s)));
  }

  update() {
    if (!this.enabled) return;
    this.frame++;
    if (this.every > 1 && this.frame % this.every !== 0) return;

    const camera = this.camera;
    const vc = this.virtualCamera;

    // mirrored eye + target across the horizontal plane
    camera.getWorldPosition(this._camWorld);
    this._view.copy(this._camWorld);
    this._view.y = 2 * this.planeY - this._view.y;

    this._target.set(0, 0, -1).applyQuaternion(camera.quaternion).add(this._camWorld);
    this._target.y = 2 * this.planeY - this._target.y;

    vc.position.copy(this._view);
    vc.up.set(0, -1, 0);
    vc.lookAt(this._target);
    vc.near = camera.near;
    vc.far = camera.far;
    vc.fov = camera.fov;
    vc.aspect = camera.aspect;
    vc.updateProjectionMatrix();
    vc.updateMatrixWorld();

    this.textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0,
    );
    this.textureMatrix.multiply(vc.projectionMatrix);
    this.textureMatrix.multiply(vc.matrixWorldInverse);

    const renderer = this.renderer;
    const prevTarget = renderer.getRenderTarget();
    const prevXr = renderer.xr.enabled;
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    const prevAlpha = renderer.getClearAlpha();
    const prevColor = renderer.getClearColor(new THREE.Color());

    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;

    // keep only geometry above the mirror plane, otherwise the road
    // itself occludes the mirrored view
    this._clip.set(new THREE.Vector3(0, 1, 0), -this.planeY - 0.002);
    renderer.clippingPlanes = [this._clip];

    const hidden = [];
    for (const o of this.hide) {
      if (o && o.visible) {
        hidden.push(o);
        o.visible = false;
      }
    }

    // Swap wet materials for dry twins: sampling the reflection texture
    // while rendering into it is a framebuffer feedback loop.
    const swapped = [];
    for (const o of this.wetMeshes) {
      const dry = o.material && o.material.userData && o.material.userData.dryMaterial;
      if (dry && dry !== o.material) {
        swapped.push([o, o.material]);
        o.material = dry;
      }
    }

    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x05070d, 1);
    renderer.clear();
    renderer.render(this.scene, vc);

    for (let i = 0; i < swapped.length; i++) swapped[i][0].material = swapped[i][1];
    for (const o of hidden) o.visible = true;
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    renderer.xr.enabled = prevXr;
    renderer.clippingPlanes = [];
    renderer.shadowMap.autoUpdate = prevShadowAuto;
  }
}

/**
 * Inject wet-reflection sampling into an existing MeshToonMaterial.
 * @param {THREE.Material} material
 * @param {PlanarReflection} reflection
 * @param {object} o
 */
export function makeWet(material, reflection, o = {}) {
  const uniforms = {
    tWetNoise: { value: o.noise },
    uWetTime: { value: 0 },
    uWetTint: { value: new THREE.Color(o.tint ?? 0xbcd2ff) },
    uWetBase: { value: o.base ?? 0.32 },
    uWetPuddle: { value: o.puddle ?? 0.6 },
    uWetBlur: { value: o.blur ?? 0.018 },
    uWetDistort: { value: o.distort ?? 0.014 },
    uWetScale: { value: o.scale ?? 1.0 },
  };
  material.userData.wet = uniforms;
  material.userData.wetReflection = reflection;
  material.userData.dryMaterial = o.dry ?? material;

  const prevCompile = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey;

  material.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) prevCompile.call(material, shader, renderer);

    shader.uniforms.tWetReflect = reflection.uniforms.tWetReflect;
    shader.uniforms.uWetMatrix = reflection.uniforms.uWetMatrix;
    shader.uniforms.tWetNoise = uniforms.tWetNoise;
    shader.uniforms.uWetTime = uniforms.uWetTime;
    shader.uniforms.uWetTint = uniforms.uWetTint;
    shader.uniforms.uWetBase = uniforms.uWetBase;
    shader.uniforms.uWetPuddle = uniforms.uWetPuddle;
    shader.uniforms.uWetBlur = uniforms.uWetBlur;
    shader.uniforms.uWetDistort = uniforms.uWetDistort;
    shader.uniforms.uWetScale = uniforms.uWetScale;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWetWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vWetWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D tWetReflect;
         uniform sampler2D tWetNoise;
         uniform mat4 uWetMatrix;
         uniform float uWetTime;
         uniform vec3 uWetTint;
         uniform float uWetBase;
         uniform float uWetPuddle;
         uniform float uWetBlur;
         uniform float uWetDistort;
         uniform float uWetScale;
         varying vec3 vWetWorld;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `
        {
          vec2 wuv = vWetWorld.xz * uWetScale;
          float n1 = texture2D( tWetNoise, wuv * 0.05 + vec2( 0.0, uWetTime * 0.004 ) ).r;
          float n2 = texture2D( tWetNoise, wuv * 0.21 + vec2( uWetTime * 0.008, 0.0 ) ).r;
          float n3 = texture2D( tWetNoise, wuv * 0.62 ).r;
          float pool = smoothstep( 0.36, 0.78, n1 * 0.62 + n2 * 0.3 + n3 * 0.08 );
          float wet = mix( uWetBase, 1.0, pool * uWetPuddle + ( 1.0 - uWetPuddle ) * 0.0 );

          vec4 pr = uWetMatrix * vec4( vWetWorld, 1.0 );
          vec2 ruv = pr.xy / max( pr.w, 0.0001 );

          vec2 rip = vec2(
            texture2D( tWetNoise, wuv * 1.1 + vec2( uWetTime * 0.11, 0.0 ) ).r,
            texture2D( tWetNoise, wuv * 1.1 + vec2( 0.0, uWetTime * 0.11 ) ).r
          ) - 0.5;
          ruv += rip * uWetDistort * wet;

          vec3 refl = vec3( 0.0 );
          float wsum = 0.0;
          for ( int i = 0; i < 4; i++ ) {
            float f = float( i );
            float w = 1.0 - f * 0.2;
            refl += texture2D( tWetReflect, ruv + vec2( 0.0, f * uWetBlur * wet ) ).rgb * w;
            wsum += w;
          }
          refl /= wsum;

          vec3 V = normalize( cameraPosition - vWetWorld );
          float fres = pow( 1.0 - clamp( V.y, 0.0, 1.0 ), 2.4 );
          float strength = wet * mix( 0.42, 1.05, fres );

          outgoingLight *= 1.0 - 0.34 * wet;
          outgoingLight += refl * strength * uWetTint;
          outgoingLight += refl * 0.10 * wet * uWetTint;
        }
        #include <opaque_fragment>`,
      );
  };

  material.customProgramCacheKey = () => `${prevKey ? prevKey() : 'toon'}|wet-v2`;
  material.needsUpdate = true;
  return material;
}


