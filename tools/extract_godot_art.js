/* Offline asset conversion. The installed game loads textures through Godot. */
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

async function run() {
  const combatOnly = process.argv.includes('--combat');
  const homeOnly = process.argv.includes('--home');
  const realmOnly = process.argv.includes('--realm');
  const storyOnly = process.argv.includes('--story');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?hd=0');
    const images = await page.evaluate(({ combat, home, realm, story }) => {
      const { L, ART } = window.__xm;
      const make = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 172;
      const context = canvas.getContext('2d');
      ART.setCtx(context, 200);
      const state = L.newState({ name: '无名' });
      const results = {};
      const png = image => image.toDataURL('image/png').split(',')[1];
      if (story) {
        for (let index = 0; index < 3; index++) results['intro-' + index] = png(ART.introPanel(index, state.p.look));
        for (const id of ART.storyCgIds) {
          const frames = Array.from({ length: ART.storyCgFrames[id] }, (_, i) => i);
          if (id === 'two') frames.push('#7fd8b0', '#a81e3a', '#55506e');
          for (const frame of frames) results['cg-' + id + '-' + String(frame).replace('#', '')] = png(ART.storyCg(id, frame));
        }
        for (const id of [...ART.endingPicIds, 'ascend', 'rest', 'summit']) results['end-' + id] = png(ART.endingPic(id));
        const expressions = new Map();
        const key = (who, mood, fx) => [who, mood, fx].join('|');
        function add(who, mood, fx = '') { expressions.set(key(who, mood, fx), { who, mood, fx }); }
        function collect(value) {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value) && typeof value[0] === 'string' && typeof value[1] === 'string') {
            const [who, expression = 'n'] = value[0].split(':');
            if (who !== '?' && who !== 'nar' && (who === 'me' || ART.hasPortrait(who) || ART.hasTachie(who))) {
              const [mood = 'n', ...effects] = expression.split('+');
              add(who, mood, effects.join(' '));
            }
          }
          for (const child of Object.values(value)) collect(child);
        }
        for (const event of L.events()) collect(event);
        if (L.STORY_SLOTS) collect(L.STORY_SLOTS);
        for (const who of new Set(['me', ...ART.tachieIds(), ...ART.portraitIds()])) {
          for (const mood of ART.tachieMoods) add(who, mood);
        }
        for (const { who, mood, fx } of [...expressions.values()]) {
          if (who === 'elder' && !fx.includes('fade')) add(who, mood, (fx + ' fade').trim());
        }
        const portraits = [];
        for (const { who, mood, fx } of expressions.values()) {
          if (who === 'me') {
            for (let hero = 0; hero < 20; hero++) {
              const look = { ...state.p.look, f: hero % 2 };
              portraits.push([key('me-' + hero, mood, fx), ART.tachieMe(look, hero >> 1, mood, fx)]);
            }
            continue;
          }
          const face = (alt) => {
            const smallFx = mood === 'cold' ? (fx + ' shade').trim() : fx;
            return ART.tachie(who, mood, fx, alt) || ART.portraitX(who, mood === 'cold' ? 'n' : mood, smallFx, alt);
          };
          const normal = face(false);
          if (normal) portraits.push([key(who, mood, fx), normal]);
          if (['mu', 'su', 'ye'].includes(who)) {
            const other = face(true);
            if (other && other !== normal) portraits.push([key(who + '-alt', mood, fx), other]);
          }
        }
        const map = {};
        const columns = 12, rows = 12, capacity = columns * rows;
        for (let first = 0; first < portraits.length; first += capacity) {
          const chunk = portraits.slice(first, first + capacity);
          const atlas = make(columns * 96, Math.ceil(chunk.length / columns) * 128);
          const context = atlas.getContext('2d');
          const sheet = first / capacity;
          chunk.forEach(([id, portrait], index) => {
            const x = index % columns * 96, y = Math.floor(index / columns) * 128;
            context.drawImage(portrait, x, y);
            map[id] = [sheet, x, y, portrait.width, portrait.height];
          });
          results['story-cast-' + sheet] = png(atlas);
        }
        return { images: results, portraitMap: map };
      }
      if (realm) {
        const stages = make(200 * 12, 160 * ART.realmThemes.length);
        const stage = stages.getContext('2d');
        const frame = make(200, 160), fx = frame.getContext('2d');
        ART.setCtx(fx, frame.width);
        ART.realmThemes.forEach((theme, y) => {
          for (let x = 0; x < 12; x++) {
            fx.clearRect(0, 0, frame.width, frame.height);
            ART.drawRealm(theme, x * 140, 0);
            stage.drawImage(frame, x * 200, y * 160);
          }
        });
        const doors = make(32 * ART.doorTypes.length, 40);
        const door = doors.getContext('2d');
        ART.doorTypes.forEach((type, x) => door.drawImage(ART.door(type), x * 32, 0));
        const kinds = [...ART.doorTypes, 'trap'];
        const effects = make(64 * 8, 56 * kinds.length);
        const effect = effects.getContext('2d');
        ART.setCtx(effect, effects.width);
        kinds.forEach((type, y) => {
          for (let x = 0; x < 8; x++) {
            effect.save();
            effect.beginPath();
            effect.rect(x * 64, y * 56, 64, 56);
            effect.clip();
            ART.drawRoomFx(type, x * 64 + 32, y * 56 + 36, (x + 0.5) / 8);
            effect.restore();
          }
        });
        return { images: { 'realm-stages': png(stages), 'realm-doors': png(doors), 'realm-effects': png(effects) } };
      }
      if (combat) {
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
    }, { combat: combatOnly, home: homeOnly, realm: realmOnly, story: storyOnly });
    for (const [name, png] of Object.entries(images.images)) {
      fs.writeFileSync(path.join(__dirname, '../godot/art', name + '.png'), Buffer.from(png, 'base64'));
    }
    if (images.map) fs.writeFileSync(path.join(__dirname, '../godot/art/combat-index.json'), JSON.stringify(images.map) + '\n');
    if (images.portraitMap) fs.writeFileSync(path.join(__dirname, '../godot/art/story-cast-index.json'), JSON.stringify(images.portraitMap) + '\n');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
