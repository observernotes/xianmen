// HD-2D 样张与前后对比：node tools/hd2d_shots.js [输出目录=docs/hd2d_mock] [only=home,battle,talk,panel,...] [hd=3]
// 每个画面出两张：*_before.png（?hd=0，原来的画面）、*_after.png（?hd=3），再拼一张 *_cmp.png（左旧右新）。设备 Pixel 7 竖屏。
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const out = args.find(a => !/^\w+=/.test(a)) || path.join(__dirname, '..', 'docs', 'hd2d_mock');
const only = (args.find(a => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
const HDQ = (args.find(a => a.startsWith('hd=')) || 'hd=3').slice(3);
const want = k => !only.length || only.includes(k);
fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
// 中期局面（同 tools/shot.js）
function midGame() {
  const { st, L } = window.__xm;
  window.__xm.setSpeed(3);
  L.onbAll(st);
  st.stones = 5e4; st.p.r = 3; st.p.s = 3; st.p.xp = L.pNeed(st.p) * 0.62; st.p.t = 4; st.flags.awoke = 2;
  for (const id of ['x_houtu', 'x_qingmu', 'x_changchun', 'z_hanyue', 'z_huichun', 'z_liuyun', 'm_lianxi', 'm_yufeng']) L.giveArt(st, id);
  L.equipArt(st, 'x_houtu'); L.equipArt(st, 'z_hanyue'); L.equipArt(st, 'm_lianxi'); st.arts.swapAt = -99;
  st.home = Object.assign(st.home || {}, { cave: 4, array: 9, field: 8, furnace: 5 }); st.p.age = 60; st.year = 44; st.tick = 120; st.flags.maxR = 3; st.flags.maxI = 15;
  for (let k = 0; k <= 4; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = k < 4 || d < 1 ? 3 : 0;
  for (let k = 0; k <= 3; k++) st.bosses[k] = 1;
  st.pact = 1; st.beaten.mu = 1; st.rank = 30; st.stats.exp = 25; st.retreat = null; st.exp = null; st.herbs = 400; st.pills = 3;
  L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900;
  st.storyQ = []; st.guide = { step: 99, done: true };
  for (const k in window.__xm.hints || {}) st.hintSeen[k] = 1;
  st.market.evQ = [];
  st.gear = L.newGear(); st.ore = 900;
  L.gearDrop(st, 'w', 4, { base: 'w4_1' }); st.gear.w.plus = 3; L.gearDrop(st, 'r', 3, { base: 'r3_0' }); L.gearDrop(st, 'o', 4, { base: 'o_cul4' });
  st.pets = []; st.petOut = -1; st.petPend = []; st.feed = 400;
  L.petGive(st, { sp: 'p_hu2', src: 'shop' }); L.petGive(st, { sp: 'p_he' }); st.pets[0].lv = 5; L.petSetJob(st, 1, 'array');
  L.checkQuests(st); st.achQ = []; st.storyQ = [];
}
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(hd) {
    const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.goto(url + '?hd=' + hd);
    await page.waitForTimeout(500);
    for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(120); }
    await page.click('#goStart'); await page.waitForTimeout(1500);
    await page.evaluate(midGame);
    const close = async () => { for (let i = 0; i < 3; i++) { await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(350); } };
    await close(); await page.waitForTimeout(600); await close();
    return { page, close };
  }
  const hideTip = page => page.evaluate(() => { for (const q of ['#tip', '#guide']) { const e = document.querySelector(q); if (e) e.hidden = true; } });
  const phase = (page, p) => page.evaluate(v => { window.HD2D.debugPhase = v; }, p);
  const SHOTS = {
    home: async (page) => { await phase(page, 0.69); await page.waitForTimeout(1500); await hideTip(page); },
    home_day: async (page) => { await phase(page, 0.45); await page.waitForTimeout(1500); await hideTip(page); },
    home_night: async (page) => { await phase(page, 0.95); await page.waitForTimeout(1500); await hideTip(page); },
    battle: async (page) => {
      await page.evaluate(() => { const { st, L } = window.__xm; st.exp = null; st.p.inj = 0; window.__xm.setSpeed(0); L.startExp(st, 1, 0, 0); });
      for (let i = 0; i < 30 && !(await page.evaluate(() => { const { st } = window.__xm; return !!(st.exp && document.querySelector('#bt:not([hidden]) .bt-big')); })); i++) await page.waitForTimeout(200);
      await page.waitForTimeout(2600); await hideTip(page);
    },
    battle_forest: async (page) => {
      await page.evaluate(() => { const { st, L } = window.__xm; st.exp = null; st.p.inj = 0; window.__xm.setSpeed(0); L.startExp(st, 0, 0, 0); });
      await page.waitForTimeout(4200); await hideTip(page);
    },
    talk: async (page) => {
      await page.evaluate(() => { const s = window.__xm.st; s.storyQ.length = 0; window.__xm_talk.fast = false; window.__xm_cine.fast = true; window.__xm.setSpeed(1); window.__xm_talk.play('s1_night'); });
      await page.waitForTimeout(1800); await page.evaluate(() => window.__xm_talk.tap()); await page.waitForTimeout(1600);
    },
    panel: async (page, close) => { await close(); await page.evaluate(() => document.querySelector('[data-nav="gear"]').click()); await page.waitForTimeout(900); },
    panel_exp: async (page, close) => { await close(); await page.evaluate(() => document.querySelector('[data-nav="exp"]').click()); await page.waitForTimeout(900); },
  };
  const names = Object.keys(SHOTS).filter(want);
  for (const hd of [0, HDQ]) {
    for (const n of names) {
      const { page, close } = await open(hd);
      try { await SHOTS[n](page, close); await page.screenshot({ path: `${out}/${n}_${hd ? 'after' : 'before'}.png` }); } catch (e) { errors.push(n + ': ' + e.message); }
      await page.context().close();
    }
  }
  // 拼对比图
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  for (const n of names) {
    if (!fs.existsSync(`${out}/${n}_before.png`) || !fs.existsSync(`${out}/${n}_after.png`)) continue;
    const a = fs.readFileSync(`${out}/${n}_before.png`).toString('base64'), b = fs.readFileSync(`${out}/${n}_after.png`).toString('base64');
    await page.setContent(`<body style="margin:0;background:#07050c;display:flex;gap:12px;padding:12px;width:max-content;font:20px sans-serif;color:#cfc8e8"><div><div style="padding:0 0 8px">现状</div><img src="data:image/png;base64,${a}" style="width:540px;display:block"></div><div><div style="padding:0 0 8px;color:#ffd76a">HD-2D</div><img src="data:image/png;base64,${b}" style="width:540px;display:block"></div></body>`);
    await page.waitForTimeout(200);
    await (await page.$('body')).screenshot({ path: `${out}/${n}_cmp.png` });
  }
  await browser.close();
  if (errors.length) { console.log('errors:\n' + [...new Set(errors)].join('\n')); process.exitCode = 1; } else console.log('ok', names.join(' '));
})();
