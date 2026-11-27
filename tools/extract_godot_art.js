/* Offline asset conversion. The installed game loads textures through Godot. */
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?hd=0');
    const images = await page.evaluate(() => {
      const { L, ART } = window.__xm;
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 172;
      const context = canvas.getContext('2d');
      ART.setCtx(context, 200);
      const state = L.newState({ name: '无名' });
      const results = {};
      for (let season = 0; season < 4; season++) {
        state.year = (season + 0.5) / 4;
        context.clearRect(0, 0, canvas.width, canvas.height);
        ART.drawHome(state, 1200, 0, [], { phase: 0.45 });
        const player = ART.sit(state.p.look, 0);
        context.drawImage(player, Math.floor(100 - player.width / 2), 136 - player.height);
        results['home-' + season] = canvas.toDataURL('image/png').split(',')[1];
      }
      results.chapter = ART.backdrop('chapter').toDataURL('image/png').split(',')[1];
      for (const scene of ART.storyBgKinds) {
        results['story-' + scene] = ART.storyBg(scene).toDataURL('image/png').split(',')[1];
      }
      return results;
    });
    for (const [name, png] of Object.entries(images)) {
      fs.writeFileSync(path.join(__dirname, '../godot/art', name + '.png'), Buffer.from(png, 'base64'));
    }
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
