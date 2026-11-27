/* Offline asset conversion. The installed game loads textures through Godot. */
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const combatOnly = process.argv.includes('--combat');
  const homeOnly = process.argv.includes('--home');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?hd=0');
    const images = await page.evaluate(({ combat, home }) => {
      const { L, ART } = window.__xm;
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 172;
      const context = canvas.getContext('2d');
      ART.setCtx(context, 200);
      const state = L.newState({ name: '无名' });
      const results = {};
      const png = image => image.toDataURL('image/png').split(',')[1];
      if (combat) {
        const make = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
        const backgrounds = make(200, 144 * L.REGIONS.length);
        const bg = backgrounds.getContext('2d');
        canvas.height = 160;
        for (let k = 0; k < L.REGIONS.length; k++) {
          context.clearRect(0, 0, 200, 160);
          ART.drawAdventure(L.REGIONS[k].bg, 1000, 0, 0);
          bg.drawImage(canvas, 0, 0, 200, 144, 0, k * 144, 200, 144);
        }
        const palette = {};
        for (let k = 0; k < L.REGIONS.length; k++) {
          const region = L.REGIONS[k];
          for (let depth = 0; depth < 3; depth++) {
            const cell = L.cellFoes(k, depth);
            for (const id of [...cell.mobs, cell.elite]) palette[id] ||= region;
          }
          palette[L.bossFoeId(k)] = region;
        }
        const foes = Object.keys(L.FOES).sort();
        const frame = make(96, 48);
        const fx = frame.getContext('2d');
        const columns = 8;
        const actors = make(columns * frame.width, Math.ceil((foes.length * 2 + 10 * 2 * 3) / columns) * frame.height);
        const actor = actors.getContext('2d');
        const index = { foes: {}, heroes: [] };
        let cellIndex = 0;
        function addFrame(render) {
          fx.clearRect(0, 0, frame.width, frame.height);
          ART.setCtx(fx, frame.width);
          render();
          actor.drawImage(frame, cellIndex % columns * frame.width, Math.floor(cellIndex / columns) * frame.height);
          return cellIndex++;
        }
        for (const id of foes) {
          const f = L.FOES[id], region = palette[id] || L.REGIONS[0];
          const colors = f.tint ? [f.tint, region.fc[1]] : region.fc;
          const art = f.art || 'man';
          index.foes[id] = [0, 1].map(i => addFrame(() => {
            if (art === 'orb') ART.drawOrb(38, 25, i * 450, colors, false);
            else if (art === 'snake') ART.drawSnake(20, 39, i * 450, colors, false);
            else if (art === 'wolf') fx.drawImage(ART.wolf(colors), 34, 30 - i);
            else if (art.startsWith('mob:')) fx.drawImage(ART.mob(art.slice(4), i), 48 - ART.dims.mob.ax, 46 - ART.dims.mob.ay);
            else if (art.startsWith('boss:')) {
              const k = Number(art.slice(5)), dims = ART.bossFighterDims(k);
              fx.drawImage(ART.bossFighter(k, 'idle' + i, true), 48 - (dims.w - 1 - dims.ax), 46 - dims.ay);
            } else fx.drawImage(ART.foeMan(colors, region.bg), 36, 9 - i);
          }));
        }
        for (let realm = 0; realm <= 9; realm++) for (let female = 0; female < 2; female++) {
          const look = { ...state.p.look, f: female };
          index.heroes.push(['idle0', 'idle1', 'strike'].map(pose => addFrame(() => {
            fx.drawImage(ART.fighter({ look, realm }, pose), 48 - ART.dims.fighter.ax, 46 - ART.dims.fighter.ay);
          })));
        }
        return {
          images: { 'combat-landscapes': png(backgrounds), 'combat-actors': png(actors) },
          map: index,
        };
      }
      for (let season = 0; season < 4; season++) {
        state.year = (season + 0.5) / 4;
        // The web renderer rebuilds one cached layer per frame after a season changes.
        for (let frame = 0; frame < 6; frame++) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          ART.drawHome(state, 1200, 0, [], { phase: 0.45 });
        }
        const player = ART.sit(state.p.look, 0);
        context.drawImage(player, Math.floor(100 - player.width / 2), 136 - player.height);
        results['home-' + season] = canvas.toDataURL('image/png').split(',')[1];
      }
      if (home) return { images: results };
      results.chapter = ART.backdrop('chapter').toDataURL('image/png').split(',')[1];
      for (const scene of ART.storyBgKinds) {
        results['story-' + scene] = ART.storyBg(scene).toDataURL('image/png').split(',')[1];
      }
      return { images: results };
    }, { combat: combatOnly, home: homeOnly });
    for (const [name, png] of Object.entries(images.images)) {
      fs.writeFileSync(path.join(__dirname, '../godot/art', name + '.png'), Buffer.from(png, 'base64'));
    }
    if (images.map) fs.writeFileSync(path.join(__dirname, '../godot/art/combat-index.json'), JSON.stringify(images.map) + '\n');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
