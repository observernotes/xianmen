/* Export the original five navigation icons and nine-slice frames for Godot. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const webBuild = path.join(__dirname, '../dist/index.html');
    await page.goto(pathToFileURL(webBuild).href + '?hd=0');
    await page.waitForFunction(() => !!window.__xm?.ART);
    const png = await page.evaluate(() => {
      const { ART } = window.__xm;
      const icons = ['exp', 'home', 'nav_gear', 'nav_world', 'nav_path'];
      const cell = 24;
      const sheet = Object.assign(document.createElement('canvas'), { width: icons.length * cell, height: 68 });
      const ctx = sheet.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      for (const [index, name] of icons.entries()) {
        const icon = ART.icon(name);
        if (!icon) throw new Error('Original navigation icon missing: ' + name);
        const x = index * cell + Math.floor((cell - icon.width) / 2);
        const y = Math.floor((cell - icon.height) / 2);
        ctx.drawImage(icon, x, y);
        ctx.filter = 'grayscale(1)';
        ctx.globalAlpha = 0.34;
        ctx.drawImage(icon, x, y + cell);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      for (const [index, name] of ['hud', 'btnGold'].entries()) {
        const frame = ART.frame(name);
        if (!frame || frame.size !== 20 || frame.slice !== 6) throw new Error('Unexpected navigation frame: ' + name);
        ctx.drawImage(frame.canvas, index * 20, cell * 2);
      }
      return sheet.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(__dirname, '../godot/art/cave-nav-icons.png'), Buffer.from(png, 'base64'));
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
