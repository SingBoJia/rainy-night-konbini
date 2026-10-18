import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = process.env.SHOT_URL || 'http://127.0.0.1:5178/';
const OUT = 'shots';
fs.mkdirSync(OUT, { recursive: true });

const views = JSON.parse(fs.readFileSync(process.env.VIEWS || 'tools/views.json', 'utf8'));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--window-size=1600,900',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => {
  const t = m.text();
  if (t.includes('Material:') || t.includes('[vite]')) return;
  logs.push(`[${m.type()}] ${t}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, Number(process.env.WAIT || 11000)));

const diag = await page.evaluate(() => {
  const d = window.__diorama;
  const bad = [];
  d.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    if (!g) return;
    const pos = g.attributes.position;
    if (!pos) return;
    const a = pos.array;
    for (let i = 0; i < a.length; i++) {
      if (!Number.isFinite(a[i])) {
        bad.push({ name: o.name || o.type, parent: o.parent?.name, count: a.length });
        break;
      }
    }
  });
  return { bad: bad.slice(0, 20), total: bad.length };
});
console.log('NaN meshes:', JSON.stringify(diag, null, 2));

for (const v of views) {
  await page.evaluate((cfg) => {
    const d = window.__diorama;
    if (cfg.cam) d.camera.position.set(...cfg.cam);
    if (cfg.target) d.controls.target.set(...cfg.target);
    if (cfg.fov) {
      d.camera.fov = cfg.fov;
      d.camera.updateProjectionMatrix();
    }
    d.controls.update();
  }, v);
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: `${OUT}/${v.name}.png` });
  console.log('shot', v.name);
}

console.log('--- console ---');
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
