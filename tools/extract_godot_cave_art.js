// Export the original HD-2D scenery and independent cave sprites for Godot.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function run() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const root = path.join(__dirname, '..');
    await page.goto(pathToFileURL(path.join(root, 'dist', 'index.html')).href + '?hd=3');
    const art = await page.evaluate(() => {
      const { ART, L } = window.__xm;
      const hd = window.HD2D;
      const display = document.querySelector('#scene');
      const context = display.getContext('2d');
      const encode = canvas => canvas.toDataURL('image/png').split(',')[1];
      const state = L.newState();
      const result = {};
      const levels = [0, 2, 4, 7, 10];
      const height = 224;
      const sky = height - 160;
      if (!hd.on) throw new Error('The original HD-2D renderer is required for the cave export.');
      for (let season = 0; season < 4; season++) {
        state.year = (season + 0.5) / 4;
        for (let tier = 0; tier < levels.length; tier++) {
          state.home.cave = levels[tier];
          display.height = height;
          ART.setCtx(context, 200);
          context.setTransform(1, 0, 0, 1, 0, sky);
          for (let frame = 0; frame < 7; frame++) {
            const mood = ART.drawHome(state, 1200, sky, [], { phase: 0.49 });
            ART.nightOverlay(mood.sky, sky, height, mood.lights);
            hd.present(performance.now() + frame * 100);
          }
          result['cave-scene-' + season + '-' + tier] = encode(document.querySelector('#sceneHD'));
        }
      }

      const make = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const heroCell = 80;
      const actors = make(heroCell * 5, heroCell * 4);
      const actorContext = actors.getContext('2d');
      for (let hero = 0; hero < 20; hero++) {
        const sprite = ART.sit({ ...state.p.look, f: hero % 2 }, hero >> 1);
        const high = hd.up(sprite) || sprite;
        const w = sprite.width * 2;
        const h = sprite.height * 2;
        const x = (hero % 5) * heroCell + (heroCell - w) / 2;
        const y = Math.floor(hero / 5) * heroCell + heroCell - h;
        actorContext.imageSmoothingEnabled = false;
        actorContext.drawImage(high, x, y, w, h);
      }
      result['cave-actors'] = encode(actors);

      const buildings = L.BLD_KEYS.filter(id => !['array', 'field'].includes(id));
      const crops = L.CROPS.map(crop => crop.id);
      const props = make(48 * Math.max(buildings.length, crops.length), 48 * 2);
      const propContext = props.getContext('2d');
      ART.setCtx(propContext, props.width);
      propContext.imageSmoothingEnabled = false;
      buildings.forEach((id, i) => {
        const sprite = ART.buildingSprite(id, 0);
        if (sprite) propContext.drawImage(sprite, i * 48 + 11, 18);
      });
      crops.forEach((id, i) => ART.drawPlot(i * 48 + 16, 74, id, 2, 1200));
      result['cave-props'] = encode(props);
      const skin = make(140, 44);
      const skinContext = skin.getContext('2d');
      for (const [i, id] of ['stone', 'pojing', 'life', 'mail'].entries()) {
        const icon = ART.icon(id);
        skinContext.drawImage(icon, i * 24 + Math.floor((24 - icon.width) / 2), Math.floor((24 - icon.height) / 2));
      }
      ART.frameKinds().forEach((id, i) => skinContext.drawImage(ART.frame(id).canvas, i * 20, 24));
      result['cave-interface'] = encode(skin);
      hd.skin(true);
      const paper = document.body.style.getPropertyValue('--hd-paper');
      result['cave-paper'] = paper.slice(paper.indexOf(',') + 1, -1);
      return { result, buildings, crops };
    });
    const output = path.join(root, 'godot', 'art');
    for (const [name, png] of Object.entries(art.result)) {
      fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(png, 'base64'));
    }
    fs.writeFileSync(path.join(output, 'cave-props.json'), JSON.stringify({
      buildings: art.buildings, crops: art.crops,
    }) + '\n');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
