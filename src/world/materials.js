import * as THREE from 'three';
import { toon, glow, additive, glassMat, glassShader, PAL } from '../core/toon.js';
import * as TX from '../core/textures.js';
import { makeWet } from './wet.js';

/* ------------------------------------------------------------------ *
 *  Central material library. Built once, shared by every builder so the
 *  whole diorama keeps a single, coherent cel-shaded look.
 * ------------------------------------------------------------------ */

export function buildMaterials(reflection) {
  const T = {
    asphalt: TX.asphaltTexture(),
    sidewalk: TX.sidewalkTexture(),
    concrete: TX.concreteTexture(),
    brick: TX.brickTexture(),
    tileWall: TX.tileWallTexture(),
    noise: TX.noiseTexture(),
    fascia: TX.storeFasciaTexture(),
    fasciaSide: TX.storeFasciaSideTexture(),
    poleSign: TX.storePoleSignTexture(),
    openSign: TX.openSignTexture(),
    posterBoard: TX.posterBoardTexture(),
    posterInStore: TX.posterInStoreTexture(),
    vendingFront: TX.vendingFrontTexture(),
    vendingSide: TX.vendingSideTexture(),
    productAtlas: TX.productAtlasTexture(),
    magazineAtlas: TX.magazineAtlasTexture(),
    bentoAtlas: TX.bentoAtlasTexture(),
    onigiriAtlas: TX.onigiriAtlasTexture(),
    cooler: TX.drinkCoolerTexture(),
    coffee: TX.coffeeMachineTexture(),
    oden: TX.odenCounterTexture(),
    register: TX.registerTexture(),
    floorGuide: TX.floorGuideTexture(),
    aircon: TX.airconTexture(),
    manhole: TX.manholeTexture(),
    grate: TX.grateTexture(),
    doormat: TX.doormatTexture(),
    wetDecal: TX.wetDecalTexture(),
    priceSticker: TX.priceStickerTexture(),
    alleySign: TX.alleySignTexture(),
    bikeSign: TX.bicycleSignTexture(),
    posterColumn: TX.posterColumnTexture(),
    nameplate: TX.nameplateTexture(),
    konbiniFloor: TX.konbiniFloorTexture(),
    signs: TX.roadSignTextures(),
  };

  T.asphalt.wrapS = T.asphalt.wrapT = THREE.RepeatWrapping;
  T.sidewalk.wrapS = T.sidewalk.wrapT = THREE.RepeatWrapping;
  T.concrete.wrapS = T.concrete.wrapT = THREE.RepeatWrapping;
  T.brick.wrapS = T.brick.wrapT = THREE.RepeatWrapping;
  T.tileWall.wrapS = T.tileWall.wrapT = THREE.RepeatWrapping;
  T.grate.wrapS = THREE.RepeatWrapping;

  const M = {};

  // ---------------------------------------------------------------- ground
  M.asphaltDry = toon({ color: 0x9aa3b8, map: T.asphalt, rimStrength: 0.1 });
  M.sidewalkDry = toon({ color: 0xbfc3d2, map: T.sidewalk, rimStrength: 0.14 });

  M.asphalt = makeWet(
    toon({ color: 0x8f98ad, map: T.asphalt, rimStrength: 0.08 }),
    reflection,
    { noise: T.noise, base: 0.72, puddle: 0.85, tint: 0xd8e4ff, distort: 0.016, scale: 1.0, blur: 0.028, dry: M.asphaltDry },
  );
  M.asphalt.repeat = [1, 1];

  M.sidewalk = makeWet(
    toon({ color: 0xbfc3d2, map: T.sidewalk, rimStrength: 0.14 }),
    reflection,
    { noise: T.noise, base: 0.45, puddle: 0.6, tint: 0xd0dcff, distort: 0.012, scale: 1.6, blur: 0.022, dry: M.sidewalkDry },
  );

  M.curb = toon({ color: 0xc8c9d4, rimStrength: 0.18 });
  M.curbPaint = toon({ color: 0xe8e6dc, rimStrength: 0.18 });
  M.concrete = toon({ color: 0xb9b6c2, map: T.concrete, rimStrength: 0.16 });
  M.concreteDark = toon({ color: 0x8a8794, map: T.concrete, rimStrength: 0.16 });
  M.brick = toon({ color: 0x9a8b8e, map: T.brick, rimStrength: 0.18 });
  M.tileWall = toon({ color: 0xa8acb8, map: T.tileWall, rimStrength: 0.18 });

  // ------------------------------------------------------------ plinth
  M.plinth = toon({ color: 0x3a2c22, rimStrength: 0.22 });
  M.plinthFoot = toon({ color: 0x241a13, rimStrength: 0.1 });
  M.brass = toon({ color: 0xc8a24a, rimStrength: 0.55, rimPower: 2.2 });
  M.nameplate = glow(T.nameplate, 0.62);

  // -------------------------------------------------------------- konbini
  M.kWall = toon({ color: 0xd8d4c8, rimStrength: 0.2 });
  M.kWallShade = toon({ color: 0xf0e4c6, rimStrength: 0.18, emissive: 0x5c4a28 });
  M.roof = toon({ color: 0x6e6e78, rimStrength: 0.2 });
  M.roofTrim = toon({ color: 0x8a8a94, rimStrength: 0.22 });
  M.kGreen = toon({ color: 0x2aa878, rimStrength: 0.22, emissive: 0x0a2a1c });
  M.kBlue = toon({ color: 0x2f6fbf, rimStrength: 0.22 });
  M.kRed = toon({ color: 0xd8443c, rimStrength: 0.22 });
  M.kOrange = toon({ color: 0xe8642c, rimStrength: 0.22 });
  M.kDark = toon({ color: 0x2a2f3a, rimStrength: 0.12 });

  M.frame = toon({ color: 0x8e97a6, rimStrength: 0.3 });
  M.frameDark = toon({ color: 0x4a505c, rimStrength: 0.24 });
  M.metal = toon({ color: 0xa8b0bd, rimStrength: 0.34 });
  M.metalDark = toon({ color: 0x5a6270, rimStrength: 0.28 });
  M.rubber = toon({ color: 0x2b2e36, rimStrength: 0.12 });
  M.plasticWhite = toon({ color: 0xe8e8ea, rimStrength: 0.2 });
  M.plasticBlack = toon({ color: 0x33363f, rimStrength: 0.16 });
  M.wood = toon({ color: 0x8a6647, rimStrength: 0.18 });
  M.woodDark = toon({ color: 0x5c4632, rimStrength: 0.16 });
  M.cardboard = toon({ color: 0xc9a878, rimStrength: 0.14 });

  M.glass = glassShader({ tint: 0x6fa8c8, strength: 0.055, base: 0.0, warmMix: 0.0 });
  M.glassDoor = glassShader({ tint: 0x7cb4d0, strength: 0.05, base: 0.0, warmMix: 0.0 });

  // --------------------------------------------------------------- signage
  M.fascia = glow(T.fascia, 1.15);
  M.fasciaSide = glow(T.fasciaSide, 1.0);
  M.poleSign = glow(T.poleSign, 0.62);
  M.openSign = glow(T.openSign, 1.25);
  M.lightboxWhite = glow(0xfff3d8, 0.7);

  // -------------------------------------------------------------- interior
  M.floorIn = toon({ color: 0xc8c2b2, map: T.konbiniFloor, rimStrength: 0.12, emissive: 0x181208 });
  M.ceilingIn = toon({ color: 0xfaf0d4, rimStrength: 0.1, emissive: 0x7a6438 });
  M.ceilPanel = glow(0xffe6bc, 0.95);
  M.shelfWhite = toon({ color: 0xe8dcbc, rimStrength: 0.16, emissive: 0x554426 });
  M.shelfMetal = toon({ color: 0xd8d4c0, rimStrength: 0.3, emissive: 0x4a3c20 });
  M.shelfBack = toon({ color: 0xe4d8ba, rimStrength: 0.12, emissive: 0x5c4a28 });
  // 4x4 atlas split into per-cell materials so each package shows one design
  const atlas = (src, cols, rows, extra = {}) => {
    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = src.clone();
        t.needsUpdate = true;
        t.repeat.set(1 / cols, 1 / rows);
        t.offset.set(c / cols, 1 - (r + 1) / rows);
        list.push(toon({ color: 0xffffff, map: t, rimStrength: 0.14, ...extra }));
      }
    }
    return list;
  };
  M.product = atlas(T.productAtlas, 4, 4, { emissive: 0x5a4a26 });
  M.magazine = atlas(T.magazineAtlas, 4, 4, { rimStrength: 0.1, emissive: 0x3a3428 });
  M.bento = atlas(T.bentoAtlas, 2, 2, { rimStrength: 0.1, emissive: 0x3a3428 });
  M.onigiri = atlas(T.onigiriAtlas, 2, 2, { rimStrength: 0.1, emissive: 0x3a3428 });
  M.cooler = glow(T.cooler, 0.92);
  M.coolerFrame = toon({ color: 0x3d434e, rimStrength: 0.2 });
  M.coffee = glow(T.coffee, 0.9);
  M.oden = glow(T.oden, 0.85);
  M.register = toon({ color: 0xffffff, map: T.register, rimStrength: 0.1 });
  M.posterIn = glow(T.posterInStore, 0.85);
  M.floorGuide = new THREE.MeshBasicMaterial({
    map: T.floorGuide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    toneMapped: false,
    color: new THREE.Color(0x9ff0c8),
  });
  M.counterTop = toon({ color: 0xf0e4c4, rimStrength: 0.16, emissive: 0x554426 });
  M.counterBase = toon({ color: 0xe4d8b8, rimStrength: 0.14, emissive: 0x554426 });

  // ---------------------------------------------------------------- props
  M.vendingFront = glow(T.vendingFront, 0.78);
  M.vendingSide = toon({ color: 0xdfe6f0, map: T.vendingSide, rimStrength: 0.24 });
  M.vendingBody = toon({ color: 0xd8e0ea, rimStrength: 0.26 });
  M.posterBoard = glow(T.posterBoard, 0.72);
  M.posterColumn = toon({ color: 0xc8ccd6, map: T.posterColumn, rimStrength: 0.18 });
  M.alleySign = glow(T.alleySign, 2.2);
  M.aircon = toon({ color: 0xd8dbe2, map: T.aircon, rimStrength: 0.2 });
  M.manhole = toon({ color: 0xa8adba, map: T.manhole, rimStrength: 0.2 });
  M.grate = toon({ color: 0x8a8f9c, map: T.grate, rimStrength: 0.2 });
  M.doormat = toon({ color: 0xffffff, map: T.doormat, rimStrength: 0.1 });
  M.priceSticker = glow(T.priceSticker, 0.9);
  M.bikeSign = toon({ color: 0xffffff, map: T.bikeSign, rimStrength: 0.2 });
  M.signPed = toon({ color: 0xffffff, map: T.signs.pedestrian, rimStrength: 0.24 });
  M.signSpeed = toon({ color: 0xffffff, map: T.signs.speed, rimStrength: 0.24 });
  M.signStreet = toon({ color: 0xffffff, map: T.signs.street, rimStrength: 0.24 });
  M.signBack = toon({ color: 0xb0b4bf, rimStrength: 0.2 });

  M.umbrella = [0x2f5f9e, 0xd8d2c4, 0xb3456a, 0x3d7a4a].map((c) =>
    toon({ color: c, rimStrength: 0.28, side: THREE.DoubleSide }),
  );
  M.bikeFrame = [0x2f6fbf, 0xd8443c, 0x3fa86b, 0xe8d8c0].map((c) => toon({ color: c, rimStrength: 0.34 }));
  M.bikeTire = toon({ color: 0x22252c, rimStrength: 0.16 });

  // ------------------------------------------------------------ emissions
  M.neonPink = glow(0xff5f9e, 2.4);
  M.neonCyan = glow(0x66e6ff, 2.2);
  M.neonAmber = glow(0xffb35c, 2.4);
  M.lampWarm = glow(0xffe2b0, 3.0);
  M.lampCool = glow(0xcfe8ff, 2.2);
  M.ledGreen = glow(0x7dffc0, 2.0);
  M.ledRed = glow(0xff6a6a, 2.0);
  M.spillWarm = additive(0xffca82, 0.2, T.wetDecal);
  M.spillCool = additive(0x9fd0ff, 0.14, T.wetDecal);

  M.T = T;
  return M;
}

























