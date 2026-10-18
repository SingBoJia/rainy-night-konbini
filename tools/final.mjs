import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'shell', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
await page.goto('http://127.0.0.1:5178/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 9000));
const shots = [
  { n: 'hero', cam: [15.2, 9.2, 19.4], tgt: [0, 1.9, -1.6], fov: 32 },
  { n: 'front', cam: [4.2, 3.0, 8.4], tgt: [0.4, 1.9, 1.2], fov: 42 },
  { n: 'left', cam: [-11.0, 7.5, 13.5], tgt: [-2.0, 2.0, 1.0], fov: 38 },
  { n: 'alley', cam: [12.4, 4.6, 6.4], tgt: [6.0, 1.9, 0.6], fov: 40 },
  { n: 'inside', cam: [1.6, 2.1, 4.6], tgt: [-0.6, 1.7, -4.2], fov: 58 },
  { n: 'top', cam: [0.5, 26.0, 12.0], tgt: [0, 1.2, 0], fov: 30 },
];
for (const s of shots) {
  await page.evaluate((s) => {
    const d = window.__diorama;
    d.camera.position.set(...s.cam);
    d.controls.target.set(...s.tgt);
    d.camera.fov = s.fov; d.camera.updateProjectionMatrix();
    d.controls.update();
  }, s);
  await new Promise(r => setTimeout(r, 2600));
  await page.screenshot({ path: `shots/final_${s.n}.png` });
  console.log('shot', s.n);
}
console.log('errors:', errs.length ? errs.slice(0,5).join(' | ') : 'none');
await browser.close();
