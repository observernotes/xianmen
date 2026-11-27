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
  const itemsOnly = process.argv.includes('--items');
  const duelOnly = process.argv.includes('--duel');
  const lootOnly = process.argv.includes('--loot');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(__dirname, '../dist/index.html')).href + '?hd=0');
    const images = await page.evaluate(({ combat, home, realm, story, items, duel, loot }) => {
      const { L, ART } = window.__xm;
      const make = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 172;
      const context = canvas.getContext('2d');
      ART.setCtx(context, 200);
      const state = L.newState({ name: '无名' });
      const results = {};
      const png = image => image.toDataURL('image/png').split(',')[1];
      if (loot) {
        const icons = new Map([
          ['star', ART.star(true)],
          ...['ore', 'herb', 'pojing', 'treasure', 'rune', 'gscroll', 'stone'].map(id => [id, ART.icon(id)]),
          ...L.CORE_EL.map(el => ['core:' + el, ART.core(el)]),
          ...L.BOSSES.map((_, k) => ['boss:' + k, ART.item('boss', k)]),
        ]);
        for (let tier = 1; tier <= 7; tier++) {
          for (const slot of ['w', 'r', 'a']) icons.set(slot + ':' + tier, ART.item(slot, tier));
        }
        for (const item of L.gearBases().filter(item => item.slot === 'o')) {
          icons.set('o:' + item.t + ':' + item.kind, ART.item('o', item.t, item.kind));
        }
        const columns = 14;
        const sheet = make(26 * 9, 34 + 16 * Math.ceil(icons.size / columns));
        const drawing = sheet.getContext('2d');
        drawing.imageSmoothingEnabled = false;
        for (let frame = 0; frame < 2; frame++) drawing.drawImage(ART.lootCard('back', 0, frame), frame * 26, 0, 26, 34);
        for (let tier = 1; tier <= 7; tier++) drawing.drawImage(ART.lootCard('front', tier), (tier + 1) * 26, 0, 26, 34);
        const lootMap = {};
        for (const [id, icon] of icons) {
          if (!icon) throw new Error('Missing loot icon: ' + id);
          const i = Object.keys(lootMap).length;
          const x = i % columns * 16, y = 34 + Math.floor(i / columns) * 16;
          drawing.drawImage(icon, x, y, id === 'star' ? 7 : 16, id === 'star' ? 7 : 16);
          lootMap[id] = [x, y];
        }
        return { images: { 'loot-art': png(sheet) }, lootMap };
      }
      if (items) {
        const ids = [
          'stone', 'herb', 'ore', 'treasure', 'pojing', 'feed', 'danbag', 'token', 'yin_f', 'yin_i', 'yin_t', 'yin_w', 'yin_s',
          'rune', 'gscroll', 'frag', 'gear', 'hurt', 'adv_swap', 'f_plus', 'cult', 'retreat', 'slay', 'seek', 'egg', 'baoqi',
          'array', 'cave', 'field', 'furnace', 'up', 'buff', 'sight', 'unlock', 'wish', 'zhen', 'home',
          ...L.CORE_EL.map(el => 'core:' + el), ...L.BOSSES.map((_, k) => 'boss:' + k),
        ];
        const sheet = make(24 * 8, 24 * Math.ceil(ids.length / 8));
        const drawing = sheet.getContext('2d');
        drawing.imageSmoothingEnabled = false;
        const itemMap = {};
        ids.forEach((id, index) => {
          const [kind, key] = id.split(':');
          const icon = kind === 'core' ? ART.core(key) : kind === 'boss' ? ART.bossMat(Number(key)) : ART.icon(id);
          if (!icon) return;
          const x = (index % 8) * 24, y = Math.floor(index / 8) * 24;
          const scale = Math.min(1, 24 / icon.width, 24 / icon.height);
          const w = Math.floor(icon.width * scale), h = Math.floor(icon.height * scale);
          drawing.drawImage(icon, x + ((24 - w) >> 1), y + ((24 - h) >> 1), w, h);
          itemMap[id] = [x, y];
        });
        return { images: { 'item-icons': png(sheet) }, itemMap };
      }
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
      if (duel) {
        const stages = ['town', 'cloud', 'sect', 'sect_mo', 'wild'];
        const backgrounds = make(200 * stages.length, 144);
        const bg = backgrounds.getContext('2d');
        stages.forEach((id, i) => {
          context.clearRect(0, 0, 200, 172);
          ART.drawDuelStage(id, 1000, 0);
          bg.drawImage(canvas, 0, 0, 200, 144, i * 200, 0, 200, 144);
        });
        const rivals = ['mu', 'zhao', 'tian', 'xue', 'yun', 'xiao', 'hongxiu', 'zhibai', 'lixiao',
          ...Object.values(L.ORIGINS).flatMap(origin => origin.pact ? [origin.pact.img] : [])];
        const champions = Object.keys(L.NINE_EL).map(id => [id, ART.nineChamp(id)]);
        const fighters = [
          ...Array.from({ length: 20 }, (_, hero) => ['me-' + hero, { look: { ...state.p.look, f: hero % 2 }, realm: hero >> 1 }]),
          ...[...new Set(rivals)].map(id => [id, id]),
          ...['mu', 'xiao'].map(id => [id + '-alt', id, true]),
          ...champions.map(([id, who]) => ['nine-' + id, who]),
          ['war', { hair: '#e9e8f2', skin: '#e8b68a', f: 0, robe: ['#5a6a8a', '#8aa0c8', '#dfe7ef'], trim: '#f4c542' }],
        ];
        const robes = [['#3a5a3a', '#5a8a4a', '#8ab86a'], ['#5a3a6a', '#8a5aa0', '#b88ad0'], ['#6a4a2a', '#9a7040', '#c8a060'],
          ['#2a4a6a', '#4a7aa0', '#7aa8d0'], ['#6a2a2a', '#9a4040', '#c87070'], ['#3a3a4a', '#5a5a70', '#8a8aa0']];
        for (let i = 0; i < 24; i++) fighters.push(['guest-' + i, {
          hair: ['#1d1a24', '#3a2a22', '#4a3328', '#2a2230'][i % 4], skin: i % 3 ? '#f2c9a0' : '#e8b68a',
          f: (i >> 2) % 2, robe: robes[i % 6], trim: '#f3ecdc',
        }]);
        const columns = 16, frameSize = 48, frames = ART.fighterFrames;
        const actors = make(columns * frameSize, Math.ceil(fighters.length * frames.length / columns) * frameSize);
        const drawing = actors.getContext('2d');
        const index = { stages, fighters: {} };
        const dims = ART.dims.fighter;
        fighters.forEach(([id, actor, alt], i) => {
          if (!actor) throw new Error('Missing duel fighter: ' + id);
          index.fighters[id] = i * frames.length;
          frames.forEach((pose, j) => {
            const frame = index.fighters[id] + j;
            drawing.drawImage(ART.fighter(actor, pose, false, alt), frame % columns * frameSize + 24 - dims.ax,
              Math.floor(frame / columns) * frameSize + 46 - dims.ay);
          });
        });
        return { images: { 'duel-stages': png(backgrounds), 'duel-actors': png(actors) }, duelMap: index };
      }
      if (combat) {
        const height = 224;
        const backgrounds = make(200, height * L.REGIONS.length);
        const bg = backgrounds.getContext('2d');
        canvas.height = height;
        for (let k = 0; k < L.REGIONS.length; k++) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, 200, height);
          context.setTransform(1, 0, 0, 1, 0, height - 160);
          ART.drawAdventure(L.REGIONS[k].bg, 1000, height - 160, 0);
          bg.drawImage(canvas, 0, k * height);
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
        const index = { foes: {}, heroes: [], effects: {} };
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
        const elements = ['', ...L.ELEM_KEYS];
        const frames = (count, draw) => Array.from({ length: count }, (_, i) => draw(i));
        const clips = [['ult', frames(ART.ultFrames, ART.ultFx)]];
        for (const name of ART.skillFxNames) {
          for (const el of name === 'brk' ? [''] : elements) {
            clips.push(['effect:' + name + ':' + el, frames(ART.skillFxFrames, frame => ART.skillFx(name, frame, el))]);
          }
        }
        for (const el of L.ELEM_KEYS) {
          clips.push(['aura:' + el, frames(2, frame => ART.eliteAura(el, frame))]);
          clips.push(['badge:' + el, [ART.elemBadge(el)]]);
        }
        clips.push(['shield', [ART.shieldPip(false), ART.shieldPip(true)]]);
        for (const [kind, art] of [['z', 'zhan'], ['w', 'qi'], ['mi', 'mi'], ['ult', 'ult']]) {
          for (const el of elements) clips.push(['skill:' + kind + ':' + el, [ART.skillIcon(el, art)]]);
        }
        const width = 768;
        let x = 0, y = 0, rowHeight = 0;
        for (const [key, images] of clips) {
          const { width: w, height: h } = images[0];
          if (x + w * images.length > width) { y += rowHeight; x = 0; rowHeight = 0; }
          index.effects[key] = [x, y, w, h, images.length];
          x += w * images.length;
          rowHeight = Math.max(h, rowHeight);
        }
        const effects = make(width, y + rowHeight);
        const paint = effects.getContext('2d');
        for (const [key, images] of clips) {
          const [x, y, w] = index.effects[key];
          images.forEach((image, frame) => paint.drawImage(image, x + frame * w, y));
        }
        return {
          images: { 'combat-landscapes': png(backgrounds), 'combat-actors': png(actors), 'combat-effects': png(effects) },
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
    }, { combat: combatOnly, home: homeOnly, realm: realmOnly, story: storyOnly, items: itemsOnly, duel: duelOnly, loot: lootOnly });
    for (const [name, png] of Object.entries(images.images)) {
      fs.writeFileSync(path.join(__dirname, '../godot/art', name + '.png'), Buffer.from(png, 'base64'));
    }
    if (images.map) fs.writeFileSync(path.join(__dirname, '../godot/art/combat-index.json'), JSON.stringify(images.map) + '\n');
    if (images.portraitMap) fs.writeFileSync(path.join(__dirname, '../godot/art/story-cast-index.json'), JSON.stringify(images.portraitMap) + '\n');
    if (images.itemMap) fs.writeFileSync(path.join(__dirname, '../godot/art/item-icons.json'), JSON.stringify(images.itemMap) + '\n');
    if (images.duelMap) fs.writeFileSync(path.join(__dirname, '../godot/art/duel-index.json'), JSON.stringify(images.duelMap) + '\n');
    if (images.lootMap) fs.writeFileSync(path.join(__dirname, '../godot/art/loot-index.json'), JSON.stringify(images.lootMap) + '\n');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
