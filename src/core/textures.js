import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  Procedural texture atelier — every image in the model is painted on
 *  a 2D canvas at boot, so the project stays a single self-contained
 *  folder with zero binary assets.
 * ------------------------------------------------------------------ */

export const FONT_JP =
  '"Yu Gothic UI", "Yu Gothic", "Hiragino Kaku Gothic ProN", "Meiryo", "MS PGothic", "Noto Sans JP", sans-serif';
export const FONT_EN = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
export const FONT_MONO = '"Consolas", "Courier New", monospace';

let maxAniso = 8;
export function setMaxAnisotropy(v) {
  maxAniso = v;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  return { c, ctx };
}

export function tex(canvas, opts = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = opts.wrapS ?? THREE.ClampToEdgeWrapping;
  t.wrapT = opts.wrapT ?? THREE.ClampToEdgeWrapping;
  t.anisotropy = opts.aniso ?? maxAniso;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const cache = new Map();
export function memo(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

/* ---------------------------------- noise --------------------------------- */

function hash2(x, y) {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function smoothNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/** Grayscale fbm noise, linear color space, used by water / rain shaders. */
export const noiseTexture = () =>
  memo('noise', () => {
    const { c, ctx } = makeCanvas(256, 256);
    const img = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        let v = 0;
        let amp = 0.5;
        let f = 0.03;
        for (let o = 0; o < 5; o++) {
          v += smoothNoise(x * f, y * f) * amp;
          amp *= 0.5;
          f *= 2.07;
        }
        const g = Math.max(0, Math.min(255, v * 255));
        const i = (y * 256 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return tex(c, { linear: true, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

/* -------------------------------- surfaces -------------------------------- */

export const asphaltTexture = () =>
  memo('asphalt', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#31374a';
    ctx.fillRect(0, 0, S, S);
    // grain
    for (let i = 0; i < 26000; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const g = 40 + Math.random() * 60;
      ctx.fillStyle = `rgba(${g},${g + 6},${g + 18},${0.12 + Math.random() * 0.25})`;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    // patches
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 20 + Math.random() * 70;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(20,24,34,${0.18 + Math.random() * 0.2})`);
      grad.addColorStop(1, 'rgba(20,24,34,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // tar seams
    ctx.strokeStyle = 'rgba(15,18,26,0.55)';
    for (let i = 0; i < 5; i++) {
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      let x = Math.random() * S;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < S) {
        y += 24;
        x += (Math.random() - 0.5) * 22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

export const sidewalkTexture = () =>
  memo('sidewalk', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#7c7f92';
    ctx.fillRect(0, 0, S, S);
    const n = 4;
    const cell = S / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 0.9 + Math.random() * 0.16;
        ctx.fillStyle = `rgb(${Math.round(124 * v)},${Math.round(127 * v)},${Math.round(146 * v)})`;
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
        // speckles
        for (let i = 0; i < 90; i++) {
          const g = 100 + Math.random() * 70;
          ctx.fillStyle = `rgba(${g},${g},${g + 10},0.25)`;
          ctx.fillRect(x * cell + Math.random() * cell, y * cell + Math.random() * cell, 1.5, 1.5);
        }
      }
    }
    ctx.strokeStyle = 'rgba(60,64,80,0.75)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(S, i * cell);
      ctx.stroke();
    }
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

export const concreteTexture = () =>
  memo('concrete', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#9b99a8';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) {
      const g = 120 + Math.random() * 70;
      ctx.fillStyle = `rgba(${g},${g},${g + 8},0.2)`;
      ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(70,70,84,${0.06 + Math.random() * 0.1})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * S, 0);
      ctx.lineTo(Math.random() * S, S);
      ctx.stroke();
    }
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

export const brickTexture = () =>
  memo('brick', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#3c3438';
    ctx.fillRect(0, 0, S, S);
    const bw = 64;
    const bh = 26;
    for (let row = 0; row < S / bh + 1; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < S / bw + 1; col++) {
        const v = 0.85 + Math.random() * 0.3;
        ctx.fillStyle = `rgb(${Math.round(96 * v)},${Math.round(72 * v)},${Math.round(70 * v)})`;
        ctx.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

export const tileWallTexture = () =>
  memo('tilewall', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#5d6270';
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const v = 0.9 + Math.random() * 0.15;
        ctx.fillStyle = `rgb(${Math.round(112 * v)},${Math.round(116 * v)},${Math.round(128 * v)})`;
        ctx.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
      }
    }
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

/* -------------------------------- signage -------------------------------- */

export const storeFasciaTexture = () =>
  memo('fascia', () => {
    const W = 2048;
    const H = 176;
    const { c, ctx } = makeCanvas(W, H);
    // deep brand-green light box so white lettering reads at any exposure
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1f9c6c');
    bg.addColorStop(0.52, '#178a5e');
    bg.addColorStop(1, '#126b49');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // white top/bottom rules
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(0, 0, W, 10);
    ctx.fillRect(0, H - 10, W, 10);
    ctx.fillStyle = '#e8642c';
    ctx.fillRect(0, 12, W, 5);
    ctx.fillRect(0, H - 17, W, 5);

    // logo star
    ctx.save();
    ctx.translate(112, H / 2);
    ctx.fillStyle = '#ffd9a0';
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(50, -54);
      ctx.lineTo(56, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 108px ${FONT_JP}`;
    ctx.fillText('ほしぞら', 200, H / 2 + 2);
    ctx.fillStyle = '#ffe9c4';
    ctx.font = `900 78px ${FONT_EN}`;
    ctx.fillText('MART', 630, H / 2 + 2);

    // 24H badge
    ctx.fillStyle = '#1f5fa8';
    ctx.beginPath();
    ctx.roundRect(892, 30, 186, 116, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 78px ${FONT_EN}`;
    ctx.fillText('24H', 922, H / 2 + 4);

    // service icons
    const icons = ['ATM', 'コピー', '宅配', 'Wi-Fi', 'トイレ'];
    ctx.font = `800 34px ${FONT_JP}`;
    icons.forEach((t, i) => {
      const x = 1130 + i * 132;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 12, 56, 116, 66);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(t, x, H / 2 + 2);
    });

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `600 24px ${FONT_JP}`;
    ctx.fillText('コンビニエンスストア   OPEN 24 HOURS', 1130, 148);
    return tex(c);
  });

export const storeFasciaSideTexture = () =>
  memo('fasciaSide', () => {
    const W = 1024;
    const H = 256;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#f8f6ee';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1f9c6c';
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = '#1f5fa8';
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = '#1f9c6c';
    ctx.font = `900 120px ${FONT_JP}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('ほしぞらマート', 60, H / 2 - 6);
    ctx.fillStyle = '#e8642c';
    ctx.font = `900 64px ${FONT_EN}`;
    ctx.fillText('STAR MART', 690, H / 2 + 70);
    return tex(c);
  });

export const storePoleSignTexture = () =>
  memo('polesign', () => {
    const W = 512;
    const H = 1024;
    const { c, ctx } = makeCanvas(W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1f9c6c');
    bg.addColorStop(1, '#12704c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillStyle = '#e8642c';
    ctx.fillRect(0, 18, W, 8);
    ctx.fillRect(0, H - 26, W, 8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 190px ${FONT_JP}`;
    const chars = ['ほ', 'し', 'ぞ', 'ら'];
    chars.forEach((ch, i) => ctx.fillText(ch, W / 2, 190 + i * 195));
    ctx.fillStyle = '#1f5fa8';
    ctx.beginPath();
    ctx.roundRect(70, 880, 372, 96, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 62px ${FONT_EN}`;
    ctx.fillText('24H', W / 2, 932);
    return tex(c);
  });

export const openSignTexture = () =>
  memo('opensign', () => {
    const W = 512;
    const H = 512;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#11131a';
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 300);
    g.addColorStop(0, '#2a1c12');
    g.addColorStop(1, '#0a0b10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ffd9a0';
    ctx.lineWidth = 10;
    ctx.strokeRect(22, 22, W - 44, H - 44);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffb35c';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ffe3b8';
    ctx.font = `900 190px ${FONT_EN}`;
    ctx.fillText('OPEN', W / 2, H / 2 - 40);
    ctx.font = `800 78px ${FONT_JP}`;
    ctx.fillText('営業中', W / 2, H / 2 + 130);
    ctx.shadowBlur = 0;
    return tex(c);
  });

export const posterBoardTexture = () =>
  memo('posterboard', () => {
    const W = 1024;
    const H = 640;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#3b3f4c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#565b69';
    ctx.fillRect(14, 14, W - 28, H - 28);
    const posters = [
      { x: 34, y: 30, w: 250, h: 330, bg: '#f4e2c4', title: '夏祭り', sub: '8.12 SAT', accent: '#d94f45' },
      { x: 306, y: 30, w: 230, h: 300, bg: '#cfe6f5', title: '求人募集', sub: '深夜スタッフ', accent: '#1f5fa8' },
      { x: 558, y: 40, w: 200, h: 260, bg: '#f6d9e3', title: 'ねこ', sub: '里親募集', accent: '#b3456a' },
      { x: 780, y: 30, w: 210, h: 330, bg: '#e9efd8', title: '花火', sub: '大会', accent: '#3d7a4a' },
      { x: 40, y: 386, w: 300, h: 216, bg: '#fbf3dc', title: '防災訓練', sub: '9.1 10:00', accent: '#c07a24' },
      { x: 368, y: 350, w: 220, h: 252, bg: '#dfe6f2', title: 'バス', sub: '時刻表', accent: '#37507a' },
      { x: 610, y: 330, w: 380, h: 272, bg: '#f0e7f7', title: '商店街', sub: '秋の市', accent: '#6a4a8a' },
    ];
    for (const p of posters) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(6, 6, p.w, p.h);
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, p.w, p.h);
      // fake illustration block
      ctx.fillStyle = p.accent;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(12, 12, p.w - 24, p.h * 0.44);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(p.w * 0.72, p.h * 0.26, p.w * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
      ctx.fillStyle = '#23262f';
      ctx.font = `900 ${Math.round(p.w * 0.14)}px ${FONT_JP}`;
      ctx.textBaseline = 'top';
      ctx.fillText(p.title, 16, p.h * 0.5);
      ctx.fillStyle = p.accent;
      ctx.font = `700 ${Math.round(p.w * 0.085)}px ${FONT_JP}`;
      ctx.fillText(p.sub, 16, p.h * 0.68);
      ctx.fillStyle = 'rgba(40,44,54,0.55)';
      ctx.font = `600 ${Math.round(p.w * 0.05)}px ${FONT_JP}`;
      ctx.fillText('商店街振興組合', 16, p.h - 40);
      // pin
      ctx.fillStyle = '#e8e8ec';
      ctx.beginPath();
      ctx.arc(p.w / 2, 8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return tex(c);
  });

/* -------------------------------- vending -------------------------------- */

export const vendingFrontTexture = () =>
  memo('vending', () => {
    const W = 512;
    const H = 1024;
    const { c, ctx } = makeCanvas(W, H);
    // body
    ctx.fillStyle = '#dfe7ef';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2b4f8a';
    ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 52px ${FONT_JP}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('つめた〜い', W / 2, 50);
    ctx.fillStyle = '#e0433a';
    ctx.fillRect(0, 96, W, 14);

    // glass window with rows of cans
    const wx = 24;
    const wy = 126;
    const ww = W - 48;
    const wh = 560;
    const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    grad.addColorStop(0, '#e9f4ff');
    grad.addColorStop(1, '#c9dcef');
    ctx.fillStyle = grad;
    ctx.fillRect(wx, wy, ww, wh);

    const cols = 4;
    const rows = 4;
    const cw = ww / cols;
    const ch = wh / rows;
    const canColors = [
      '#e04b3c', '#2f6fbf', '#3fa86b', '#e8a33a', '#8a5bb8', '#d8d2c4',
      '#2aa5b8', '#c9436b', '#5b6c8a', '#e6d64a', '#b04a2f', '#4a8fd4',
      '#e07a3c', '#7bb04a', '#a8443f', '#cfd6e2',
    ];
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = wx + col * cw + 10;
        const y = wy + r * ch + 12;
        const w = cw - 20;
        const h = ch - 30;
        // can body
        ctx.fillStyle = canColors[k % canColors.length];
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        // label band
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, y + h * 0.36, w, h * 0.16);
        ctx.fillStyle = 'rgba(30,34,44,0.75)';
        ctx.font = `700 ${Math.round(w * 0.2)}px ${FONT_JP}`;
        ctx.fillText(['お茶', 'コーラ', '水', 'コーヒー', 'ジュース', 'ソーダ'][k % 6], x + w / 2, y + h * 0.44);
        // price tag
        ctx.fillStyle = '#fdfdfd';
        ctx.fillRect(x, y + h + 2, w, 20);
        ctx.fillStyle = '#d0352c';
        ctx.font = `800 15px ${FONT_EN}`;
        ctx.fillText(['120', '150', '100', '130', '140', '160'][k % 6], x + w / 2, y + h + 12);
        k++;
      }
    }
    // glass reflection
    const rg = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
    rg.addColorStop(0, 'rgba(255,255,255,0.42)');
    rg.addColorStop(0.35, 'rgba(255,255,255,0.05)');
    rg.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    rg.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = rg;
    ctx.fillRect(wx, wy, ww, wh);

    // lower panel
    ctx.fillStyle = '#c6d0dc';
    ctx.fillRect(0, 700, W, H - 700);
    // coin / bill area
    ctx.fillStyle = '#2b3140';
    ctx.fillRect(W - 150, 726, 120, 180);
    ctx.fillStyle = '#7de0b0';
    ctx.fillRect(W - 136, 742, 92, 44);
    ctx.fillStyle = '#10131a';
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText('00', W - 90, 765);
    ctx.fillStyle = '#4a5160';
    ctx.fillRect(W - 136, 802, 92, 10);
    ctx.fillRect(W - 136, 828, 92, 10);
    // pickup slot
    ctx.fillStyle = '#1b1f27';
    ctx.beginPath();
    ctx.roundRect(40, 760, W - 230, 130, 10);
    ctx.fill();
    ctx.fillStyle = '#39404d';
    ctx.fillRect(56, 776, W - 262, 98);
    // brand strip
    ctx.fillStyle = '#2b4f8a';
    ctx.fillRect(0, 930, W, 94);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 44px ${FONT_JP}`;
    ctx.fillText('DRINK', W / 2, 978);
    return tex(c);
  });

export const vendingSideTexture = () =>
  memo('vendingside', () => {
    const W = 256;
    const H = 1024;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#cfd8e3';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2b4f8a';
    ctx.fillRect(0, 0, W, 96);
    ctx.fillRect(0, 930, W, 94);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, 140 + i * 120, W, 6);
    ctx.fillStyle = '#7d8796';
    ctx.font = `700 26px ${FONT_EN}`;
    ctx.textAlign = 'center';
    ctx.fillText('COLD', W / 2, 70);
    return tex(c);
  });

/* ------------------------------ product atlas ----------------------------- */

const PRODUCT_SETS = [
  { bg: '#f4f1e6', band: '#d8443c', label: 'おにぎり' },
  { bg: '#fdf6e0', band: '#e8a33a', label: 'パン' },
  { bg: '#e7f2e0', band: '#3fa86b', label: 'サラダ' },
  { bg: '#f2e6f5', band: '#8a5bb8', label: 'スイーツ' },
  { bg: '#e0ecf7', band: '#2f6fbf', label: '飲料' },
  { bg: '#f7e6e0', band: '#c9533c', label: '弁当' },
  { bg: '#f0f0f0', band: '#5b6c8a', label: '菓子' },
  { bg: '#e8f7f7', band: '#2aa5b8', label: '麺類' },
];

/** 4x4 atlas of fake konbini products (shelf goods). */
export const productAtlasTexture = () =>
  memo('productAtlas', () => {
    const S = 1024;
    const { c, ctx } = makeCanvas(S, S);
    const cell = S / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const set = PRODUCT_SETS[(x + y * 3) % PRODUCT_SETS.length];
        const px = x * cell;
        const py = y * cell;
        ctx.fillStyle = set.bg;
        ctx.fillRect(px, py, cell, cell);
        ctx.fillStyle = set.band;
        ctx.fillRect(px, py + cell * 0.58, cell, cell * 0.28);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(px + 14, py + 16, cell - 28, cell * 0.16);
        ctx.fillStyle = set.band;
        ctx.font = `900 ${Math.round(cell * 0.15)}px ${FONT_JP}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(set.label, px + cell / 2, py + cell * 0.72);
        // little graphic
        ctx.beginPath();
        ctx.arc(px + cell / 2, py + cell * 0.36, cell * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = set.band;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(30,32,40,0.16)';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
      }
    }
    return tex(c);
  });

export const magazineAtlasTexture = () =>
  memo('magazineAtlas', () => {
    const S = 1024;
    const { c, ctx } = makeCanvas(S, S);
    const cell = S / 4;
    const colors = ['#e25b6a', '#3d7fbf', '#e8b23a', '#5aa86b', '#9a5ab8', '#d97b3a', '#2aa5b8', '#c9436b'];
    const titles = ['週刊 街', 'アニメ', 'ゲーム', '料理', '旅行', 'ファッション', '科学', '漫画'];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = x * cell;
        const py = y * cell;
        const k = x + y * 4;
        ctx.fillStyle = '#f7f7f2';
        ctx.fillRect(px, py, cell, cell);
        ctx.fillStyle = colors[k % colors.length];
        ctx.fillRect(px + 8, py + 8, cell - 16, cell * 0.52);
        ctx.beginPath();
        ctx.arc(px + cell * 0.5, py + cell * 0.32, cell * 0.17, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.fill();
        ctx.fillStyle = '#22252e';
        ctx.font = `900 ${Math.round(cell * 0.13)}px ${FONT_JP}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(titles[k % titles.length], px + cell / 2, py + cell * 0.7);
        ctx.fillStyle = colors[(k + 3) % colors.length];
        ctx.font = `700 ${Math.round(cell * 0.075)}px ${FONT_EN}`;
        ctx.fillText('WEEKLY', px + cell / 2, py + cell * 0.84);
        ctx.strokeStyle = 'rgba(20,22,28,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
      }
    }
    return tex(c);
  });

export const bentoAtlasTexture = () =>
  memo('bentoAtlas', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S, S);
    const cell = S / 2;
    const sets = [
      { box: '#2c2f38', rice: '#f7f3e6', main: '#c96a3a', sub: '#4f8a4a' },
      { box: '#3a2c2c', rice: '#f7f3e6', main: '#b84a3a', sub: '#d8b23a' },
      { box: '#2c3340', rice: '#f2ecd9', main: '#d89a4a', sub: '#7aa84a' },
      { box: '#33303a', rice: '#f7f3e6', main: '#8a5a3a', sub: '#e0c25a' },
    ];
    for (let i = 0; i < 4; i++) {
      const px = (i % 2) * cell;
      const py = Math.floor(i / 2) * cell;
      const s = sets[i];
      ctx.fillStyle = '#f6f4ee';
      ctx.fillRect(px, py, cell, cell);
      ctx.fillStyle = s.box;
      ctx.beginPath();
      ctx.roundRect(px + 16, py + 16, cell - 32, cell - 32, 14);
      ctx.fill();
      // rice half
      ctx.fillStyle = s.rice;
      ctx.beginPath();
      ctx.roundRect(px + 30, py + 30, (cell - 60) * 0.52, cell - 60, 8);
      ctx.fill();
      // main dish
      ctx.fillStyle = s.main;
      ctx.beginPath();
      ctx.arc(px + cell * 0.7, py + cell * 0.44, cell * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = s.sub;
      ctx.beginPath();
      ctx.arc(px + cell * 0.72, py + cell * 0.72, cell * 0.1, 0, Math.PI * 2);
      ctx.fill();
      // label
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(px + 26, py + cell - 54, cell * 0.5, 26);
      ctx.fillStyle = '#333';
      ctx.font = `800 16px ${FONT_JP}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(['唐揚げ弁当', '焼鮭弁当', 'のり弁', 'カレー'][i], px + 26 + cell * 0.25, py + cell - 41);
    }
    return tex(c);
  });

export const onigiriAtlasTexture = () =>
  memo('onigiriAtlas', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S, S);
    const cell = S / 2;
    const fills = ['#2f4a3a', '#c9533c', '#d8a83a', '#8a5bb8'];
    for (let i = 0; i < 4; i++) {
      const px = (i % 2) * cell;
      const py = Math.floor(i / 2) * cell;
      ctx.fillStyle = '#f7f5ee';
      ctx.fillRect(px, py, cell, cell);
      // rice triangle
      ctx.fillStyle = '#fbf8ee';
      ctx.beginPath();
      ctx.moveTo(px + cell / 2, py + cell * 0.22);
      ctx.lineTo(px + cell * 0.82, py + cell * 0.8);
      ctx.lineTo(px + cell * 0.18, py + cell * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#dcd6c4';
      ctx.lineWidth = 3;
      ctx.stroke();
      // nori
      ctx.fillStyle = '#22362b';
      ctx.fillRect(px + cell * 0.38, py + cell * 0.58, cell * 0.24, cell * 0.28);
      // filling dot
      ctx.fillStyle = fills[i];
      ctx.beginPath();
      ctx.arc(px + cell * 0.5, py + cell * 0.46, cell * 0.06, 0, Math.PI * 2);
      ctx.fill();
      // wrap band
      ctx.fillStyle = ['#d8443c', '#2f6fbf', '#e8a33a', '#8a5bb8'][i];
      ctx.fillRect(px, py + cell * 0.86, cell, cell * 0.14);
    }
    return tex(c);
  });

export const drinkCoolerTexture = () =>
  memo('cooler', () => {
    const W = 1024;
    const H = 512;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, W, H);
    // bright backlit interior
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eaf6ff');
    g.addColorStop(1, '#bcd9f2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const rows = 4;
    const cols = 10;
    const cw = W / cols;
    const ch = H / rows;
    const cols2 = ['#e04b3c', '#2f6fbf', '#3fa86b', '#e8a33a', '#8a5bb8', '#d8d2c4', '#2aa5b8', '#c9436b'];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cw + 5;
        const y = r * ch + 10;
        const w = cw - 10;
        const h = ch - 34;
        ctx.fillStyle = cols2[(r * 3 + col) % cols2.length];
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x, y + h * 0.34, w, h * 0.2);
        ctx.fillStyle = '#333';
        ctx.font = `700 13px ${FONT_JP}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(['茶', '水', '炭', '珈', '果', '乳'][(r + col) % 6], x + w / 2, y + h * 0.45);
        ctx.fillStyle = '#fdfdfd';
        ctx.fillRect(x, y + h + 2, w, 18);
        ctx.fillStyle = '#d0352c';
        ctx.font = `800 12px ${FONT_EN}`;
        ctx.fillText(['120', '150', '100', '130', '140', '110'][(r + col) % 6], x + w / 2, y + h + 11);
      }
      // shelf rail
      ctx.fillStyle = '#9fb6cc';
      ctx.fillRect(0, r * ch + ch - 18, W, 6);
    }
    // glass sheen
    const sg = ctx.createLinearGradient(0, 0, W, H);
    sg.addColorStop(0, 'rgba(255,255,255,0.22)');
    sg.addColorStop(0.45, 'rgba(255,255,255,0.02)');
    sg.addColorStop(1, 'rgba(255,255,255,0.16)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    return tex(c);
  });

export const coffeeMachineTexture = () =>
  memo('coffee', () => {
    const W = 256;
    const H = 512;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#26292f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3a3e47';
    ctx.fillRect(14, 14, W - 28, H - 28);
    // screen
    ctx.fillStyle = '#0c1a14';
    ctx.fillRect(30, 40, W - 60, 110);
    ctx.fillStyle = '#6ef0b0';
    ctx.font = `700 30px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('HOT', W / 2, 88);
    ctx.fillText('COFFEE', W / 2, 124);
    // buttons
    const labels = ['S', 'M', 'L'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ['#e8a33a', '#d8443c', '#2f6fbf'][i];
      ctx.beginPath();
      ctx.arc(50 + i * 78, 190, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `800 24px ${FONT_EN}`;
      ctx.fillText(labels[i], 50 + i * 78, 198);
    }
    // cup well
    ctx.fillStyle = '#15171c';
    ctx.fillRect(44, 250, W - 88, 150);
    ctx.fillStyle = '#cfd6e2';
    ctx.fillRect(96, 300, 64, 70);
    // drip tray
    ctx.fillStyle = '#4a4f5a';
    ctx.fillRect(30, 420, W - 60, 40);
    return tex(c);
  });

export const odenCounterTexture = () =>
  memo('oden', () => {
    const W = 512;
    const H = 256;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#3b2a1e';
    ctx.fillRect(0, 0, W, H);
    // broth
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d8a34a');
    g.addColorStop(1, '#a8702a');
    ctx.fillStyle = g;
    ctx.fillRect(10, 10, W - 20, H - 20);
    const items = [
      { x: 70, y: 80, r: 34, c: '#e8d8b0', n: '大根' },
      { x: 180, y: 70, r: 28, c: '#c9a05a', n: '玉子' },
      { x: 270, y: 90, r: 30, c: '#8a6a44', n: 'こんにゃく' },
      { x: 370, y: 78, r: 26, c: '#d8b87a', n: 'ちくわ' },
      { x: 120, y: 175, r: 30, c: '#b8b0a0', n: 'はんぺん' },
      { x: 240, y: 180, r: 32, c: '#c9b07a', n: 'がんも' },
      { x: 360, y: 178, r: 26, c: '#9a7a4a', n: 'つみれ' },
      { x: 450, y: 150, r: 22, c: '#e0c890', n: '餅' },
    ];
    for (const it of items) {
      ctx.fillStyle = 'rgba(80,50,20,0.35)';
      ctx.beginPath();
      ctx.arc(it.x + 3, it.y + 4, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = it.c;
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(it.x - it.r * 0.3, it.y - it.r * 0.3, it.r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    // steam-ish highlights
    ctx.strokeStyle = 'rgba(255,240,210,0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(30 + i * 60, 20);
      ctx.bezierCurveTo(50 + i * 60, 80, 10 + i * 60, 150, 30 + i * 60, 230);
      ctx.stroke();
    }
    return tex(c);
  });

export const registerTexture = () =>
  memo('register', () => {
    const W = 256;
    const H = 256;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#2b2e36';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0d1a1e';
    ctx.fillRect(20, 30, 150, 110);
    ctx.fillStyle = '#7de0d0';
    ctx.font = `700 22px ${FONT_MONO}`;
    ctx.fillText('¥ 1,280', 32, 78);
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.fillText('ITEM  03', 32, 110);
    // keys
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = '#4a4f5a';
        ctx.fillRect(24 + x * 34, 158 + y * 24, 28, 18);
      }
    }
    return tex(c);
  });

export const posterInStoreTexture = () =>
  memo('instorePoster', () => {
    const W = 512;
    const H = 768;
    const { c, ctx } = makeCanvas(W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffd98a');
    g.addColorStop(1, '#ff9a4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(W / 2, 240, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(W / 2, 240, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 84px ${FONT_JP}`;
    ctx.fillText('新発売', W / 2, 430);
    ctx.fillStyle = '#2c2418';
    ctx.font = `900 64px ${FONT_JP}`;
    ctx.fillText('とろとろ', W / 2, 520);
    ctx.fillText('カレーパン', W / 2, 592);
    ctx.fillStyle = '#8a4a1a';
    ctx.font = `700 42px ${FONT_JP}`;
    ctx.fillText('¥158', W / 2, 690);
    return tex(c);
  });

export const priceStickerTexture = () =>
  memo('priceSticker', () => {
    const W = 256;
    const H = 128;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e0433a';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = '#23262f';
    ctx.font = `900 56px ${FONT_EN}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¥128', W / 2, 70);
    return tex(c);
  });

export const floorGuideTexture = () =>
  memo('floorGuide', () => {
    const W = 256;
    const H = 512;
    const { c, ctx } = makeCanvas(W, H);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#3fae7a';
    ctx.fillStyle = '#3fae7a';
    ctx.lineWidth = 16;
    // arrow
    ctx.beginPath();
    ctx.moveTo(W / 2, 60);
    ctx.lineTo(W / 2, 260);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2 - 70, 230);
    ctx.lineTo(W / 2, 320);
    ctx.lineTo(W / 2 + 70, 230);
    ctx.closePath();
    ctx.fill();
    ctx.font = `900 54px ${FONT_JP}`;
    ctx.textAlign = 'center';
    ctx.fillText('レジ', W / 2, 420);
    return tex(c);
  });

export const airconTexture = () =>
  memo('aircon', () => {
    const W = 256;
    const H = 128;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#d8dbe2';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#b8bcc6';
    ctx.fillRect(8, 8, W - 16, 26);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = 'rgba(90,96,110,0.55)';
      ctx.fillRect(14 + i * 9, 44, 5, 70);
    }
    ctx.fillStyle = '#2f6fbf';
    ctx.fillRect(0, 0, 64, 12);
    return tex(c);
  });

export const roadSignTextures = () =>
  memo('roadsigns', () => {
    // pedestrian crossing sign
    const A = makeCanvas(256, 256);
    A.ctx.fillStyle = '#1d4f9a';
    A.ctx.beginPath();
    A.ctx.moveTo(128, 10);
    A.ctx.lineTo(246, 222);
    A.ctx.lineTo(10, 222);
    A.ctx.closePath();
    A.ctx.fill();
    A.ctx.strokeStyle = '#ffffff';
    A.ctx.lineWidth = 12;
    A.ctx.stroke();
    A.ctx.fillStyle = '#ffffff';
    // walking figure
    A.ctx.beginPath();
    A.ctx.arc(128, 100, 16, 0, Math.PI * 2);
    A.ctx.fill();
    A.ctx.lineWidth = 14;
    A.ctx.strokeStyle = '#ffffff';
    A.ctx.beginPath();
    A.ctx.moveTo(128, 120);
    A.ctx.lineTo(126, 160);
    A.ctx.moveTo(126, 160);
    A.ctx.lineTo(108, 200);
    A.ctx.moveTo(126, 160);
    A.ctx.lineTo(146, 198);
    A.ctx.moveTo(128, 128);
    A.ctx.lineTo(104, 148);
    A.ctx.moveTo(128, 128);
    A.ctx.lineTo(152, 146);
    A.ctx.stroke();

    // one-way / speed sign
    const B = makeCanvas(256, 256);
    B.ctx.fillStyle = '#ffffff';
    B.ctx.beginPath();
    B.ctx.arc(128, 128, 118, 0, Math.PI * 2);
    B.ctx.fill();
    B.ctx.strokeStyle = '#d0352c';
    B.ctx.lineWidth = 22;
    B.ctx.beginPath();
    B.ctx.arc(128, 128, 106, 0, Math.PI * 2);
    B.ctx.stroke();
    B.ctx.fillStyle = '#1d2330';
    B.ctx.font = `900 120px ${FONT_EN}`;
    B.ctx.textAlign = 'center';
    B.ctx.textBaseline = 'middle';
    B.ctx.fillText('30', 128, 136);

    // street name plate
    const C = makeCanvas(512, 128);
    C.ctx.fillStyle = '#1d4f9a';
    C.ctx.fillRect(0, 0, 512, 128);
    C.ctx.strokeStyle = '#ffffff';
    C.ctx.lineWidth = 6;
    C.ctx.strokeRect(8, 8, 496, 112);
    C.ctx.fillStyle = '#ffffff';
    C.ctx.font = `900 64px ${FONT_JP}`;
    C.ctx.textAlign = 'center';
    C.ctx.textBaseline = 'middle';
    C.ctx.fillText('星ノ宮 一丁目', 256, 70);

    return { pedestrian: tex(A.c), speed: tex(B.c), street: tex(C.c) };
  });

export const alleySignTexture = () =>
  memo('alleysign', () => {
    const W = 512;
    const H = 256;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#151a24';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ff7a9c';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = '#ff9ab5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 120px ${FONT_JP}`;
    ctx.fillText('ゆきち', W / 2, H / 2 - 20);
    ctx.font = `700 46px ${FONT_JP}`;
    ctx.fillStyle = '#ffe6ee';
    ctx.fillText('スナック', W / 2, H / 2 + 78);
    return tex(c);
  });

export const bicycleSignTexture = () =>
  memo('bikesign', () => {
    const W = 256;
    const H = 256;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#1d4f9a';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(82, 160, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(178, 160, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(82, 160);
    ctx.lineTo(120, 108);
    ctx.lineTo(160, 108);
    ctx.lineTo(178, 160);
    ctx.moveTo(120, 108);
    ctx.lineTo(112, 160);
    ctx.lineTo(178, 160);
    ctx.stroke();
    return tex(c);
  });

export const posterColumnTexture = () =>
  memo('postercolumn', () => {
    const W = 512;
    const H = 512;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#8a8d99';
    ctx.fillRect(0, 0, W, H);
    const items = [
      { x: 20, y: 20, w: 220, h: 300, bg: '#f2e6c8', t: '花火大会', a: '#d8443c' },
      { x: 260, y: 40, w: 200, h: 240, bg: '#d8e8f4', t: '秋祭り', a: '#2f6fbf' },
      { x: 60, y: 340, w: 200, h: 150, bg: '#f4d8e4', t: 'ライブ', a: '#b3456a' },
      { x: 290, y: 310, w: 190, h: 180, bg: '#e4f0d8', t: '募集', a: '#3d7a4a' },
    ];
    for (const it of items) {
      ctx.fillStyle = it.bg;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.fillStyle = it.a;
      ctx.fillRect(it.x + 10, it.y + 10, it.w - 20, it.h * 0.42);
      ctx.fillStyle = '#2a2d36';
      ctx.font = `900 ${Math.round(it.w * 0.13)}px ${FONT_JP}`;
      ctx.textAlign = 'center';
      ctx.fillText(it.t, it.x + it.w / 2, it.y + it.h * 0.72);
    }
    return tex(c);
  });

/* ------------------------------- misc decals ------------------------------ */

export const manholeTexture = () =>
  memo('manhole', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a616e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#4d5462';
    ctx.lineWidth = 3;
    for (let r = 24; r < S / 2 - 16; r += 16) {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let a = 0; a < 12; a++) {
      ctx.save();
      ctx.translate(S / 2, S / 2);
      ctx.rotate((a / 12) * Math.PI * 2);
      ctx.fillStyle = '#4d5462';
      ctx.fillRect(-3, 20, 6, S / 2 - 40);
      ctx.restore();
    }
    return tex(c);
  });

export const grateTexture = () =>
  memo('grate', () => {
    const W = 256;
    const H = 64;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4a5060';
    for (let i = 0; i < 16; i++) ctx.fillRect(i * 16 + 2, 4, 9, H - 8);
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });

export const doormatTexture = () =>
  memo('doormat', () => {
    const W = 512;
    const H = 256;
    const { c, ctx } = makeCanvas(W, H);
    ctx.fillStyle = '#3a4450';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    ctx.strokeStyle = 'rgba(230,235,240,0.5)';
    ctx.lineWidth = 5;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = 'rgba(240,245,250,0.75)';
    ctx.font = `900 74px ${FONT_JP}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('いらっしゃいませ', W / 2, H / 2);
    return tex(c);
  });

export const nameplateTexture = () =>
  memo('nameplate', () => {
    const W = 1024;
    const H = 148;
    const { c, ctx } = makeCanvas(W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a2118');
    g.addColorStop(0.5, '#3a2e20');
    g.addColorStop(1, '#221a12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#c8a24a';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d8b45e';
    ctx.font = `700 46px ${FONT_JP}`;
    ctx.fillText('雨夜のコンビニ  —  RAINY NIGHT KONBINI  —  1 : 100', W / 2, H / 2 - 4);
    ctx.fillStyle = '#8a7448';
    ctx.font = `600 22px ${FONT_EN}`;
    ctx.fillText('DIORAMA COLLECTION  ·  NO. 07  ·  HANDMADE', W / 2, H / 2 + 44);
    return tex(c);
  });

export const wetDecalTexture = () =>
  memo('wetdecal', () => {
    const S = 256;
    const { c, ctx } = makeCanvas(S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return tex(c);
  });



/** Konbini floor: 300mm light tiles with visible grout + subtle scuffs. */
export const konbiniFloorTexture = () =>
  memo('konbiniFloor', () => {
    const S = 512;
    const { c, ctx } = makeCanvas(S, S);
    ctx.fillStyle = '#8e8a80';
    ctx.fillRect(0, 0, S, S);
    const n = 4;
    const cell = S / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 0.94 + Math.random() * 0.1;
        ctx.fillStyle = `rgb(${Math.round(206 * v)},${Math.round(200 * v)},${Math.round(186 * v)})`;
        ctx.fillRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
        // faint marble speckle
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = `rgba(150,146,136,${Math.random() * 0.12})`;
          ctx.fillRect(x * cell + Math.random() * cell, y * cell + Math.random() * cell, 2, 2);
        }
      }
    }
    return tex(c, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  });
