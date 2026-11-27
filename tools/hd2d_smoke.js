// HD-2D 冒烟测试：node tools/hd2d_smoke.js
// 自动化下默认不开高清（见 src/fx/hd2d.js 的 defaultQ），这里用 ?hd=2 显式打开，把接管 / 分层 / 换档 / 各场景都走一遍：
//   接管后界面看到的画布仍是 200×H；呈现画布在、有画面；洞府 → 历练战斗 → 对决 → 秘境 → 对话都不报错；
//   运行时换档 2 → 0 → 1 → 3 → 2，0 档时画布还原成 200 宽；九宫格是 SVG；版面不横向溢出。
const { chromium, devices } = require('playwright');
const path = require('path');
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?hd=2'); await page.waitForTimeout(400);
  for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(1500);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const X = window.__xm, st = X.st, L = X.L; L.onbAll(st); st.guide = { step: 99, done: true }; st.storyQ = []; st.p.r = 3; X.setSpeed(0); });
  const close = async () => { for (let i = 0; i < 4; i++) { await ev(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(250); } };
  await close();
  const info = () => ev(() => {
    const c = document.getElementById('scene'), p = document.getElementById('sceneHD'), H = window.HD2D;
    let lit = 0; if (p && p.width > 8) { const g = document.createElement('canvas'); g.width = 40; g.height = 40; const x = g.getContext('2d'); x.drawImage(p, 0, 0, 40, 40); const d = x.getImageData(0, 0, 40, 40).data; const set = new Set(); for (let i = 0; i < d.length; i += 16) set.add((d[i] >> 3) + '|' + (d[i + 1] >> 3) + '|' + (d[i + 2] >> 3)); lit = set.size; }
    return { on: H.on, q: H.q, logicH: c.height, realW: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width').get.call(c), pw: p ? p.width : 0, shown: !!p && p.style.display !== 'none', colors: lit, kind: H.F.kind + ':' + H.F.key, age: H.F.age, over: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  await page.waitForTimeout(800);
  let s = await info();
  check(s.on && s.q === 2, `接管：on=${s.on} q=${s.q}`);
  check(s.logicH >= 160 && s.logicH <= 250 && s.realW === 400, `界面看到的高 ${s.logicH}（逻辑值），后备宽 ${s.realW}`);
  check(s.shown && s.pw === 400 && s.colors > 20, `呈现画布 ${s.pw} 宽，有画面（${s.colors} 种颜色）`);
  check(s.kind === 'home:home' && s.age <= 4, `洞府在分层画（${s.kind}）`);
  check(!s.over, '不横向溢出');
  check(await ev(() => /^data:image\/svg/.test(window.__xm.ART.frame('hud').url) && document.body.classList.contains('hd2d')), '九宫格是 SVG，皮肤已挂');
  for (const ph of [0.3, 0.5, 0.72, 0.95]) { await ev(p => { window.HD2D.debugPhase = p; }, ph); await page.waitForTimeout(350); }
  check(!errs.length, '昼夜各相位无报错');
  await ev(() => { const { st, L } = window.__xm; st.exp = null; st.p.inj = 0; L.startExp(st, 0, 0, 0); }); await page.waitForTimeout(2200);
  s = await info(); check(s.kind === 'adv:forest' && s.colors > 20, `历练战斗（${s.kind}，${s.colors} 色）`);
  for (const k of ['forest', 'tomb', 'blood', 'swords', 'abyss', 'sea', 'stars', 'palace', 'chaos']) { await ev(k2 => { const X = window.__xm, c = document.getElementById('scene').getContext('2d'); X.ART.setCtx(c, 200); X.ART.drawAdventure(k2, performance.now(), 0, 30); window.HD2D.present(performance.now()); }, k); }
  check(!errs.length, '十张历练地图都能分层合成');
  for (const k of ['town', 'cloud', 'sect', 'wild', 'sect_mo', 'r_jin', 'r_mu', 'r_huo', 'r_shui']) { await ev(k2 => { const X = window.__xm; X.ART.drawDuelStage(k2, performance.now(), 0); window.HD2D.present(performance.now()); }, k); }
  check(!errs.length, '九个对决舞台 / 秘境都能合成');
  await ev(() => { const { st } = window.__xm; st.exp = null; }); await page.waitForTimeout(600); await close();
  for (const q of [0, 1, 3, 2]) {
    await ev(q2 => window.HD2D.setQuality(q2), q); await page.waitForTimeout(700); s = await info();
    if (q === 0) check(!s.on && s.realW === 200 && !s.shown, `0 档：还原成原画布（宽 ${s.realW}）`);
    else check(s.on && s.realW === 400 && s.shown && s.colors > 20 && (q === 3 ? s.pw > 800 : s.pw === 400), `${q} 档：呈现画布 ${s.pw} 宽，${s.colors} 色`);
  }
  await ev(() => { window.__xm_talk.fast = false; window.__xm_cine.fast = true; window.__xm.setSpeed(1); window.__xm_talk.play('s1_night'); }); await page.waitForTimeout(1500);
  check(await ev(() => !!document.querySelector('.tk-stage .hd-fx') && document.querySelector('.tk-stage .hd-fx').width > 8), '对话舞台挂上了气氛层');
  for (let i = 0; i < 10; i++) { await ev(() => { window.__xm_talk.tap(); window.__xm_talk.tap(); }); await page.waitForTimeout(300); if (await ev(() => !!document.querySelector('.tk-pt.on:not([hidden])'))) break; }
  await page.waitForTimeout(600);
  const pt = await ev(() => { const c = document.querySelector('.tk-pt.on:not([hidden])'); return c ? { w: c.width, cssW: parseFloat(c.style.width) } : null; });
  check(!pt || pt.w >= 96, `立绘画布升了 2 倍（${pt ? pt.w + ' 像素宽，显示 ' + pt.cssW.toFixed(0) + 'px' : '这一场没有立绘'}）`);
  await ev(() => window.__xm_talk.close()); await page.waitForTimeout(500);
  check(await ev(() => !document.querySelector('.hd-fx')), '对话收场后气氛层撤掉');
  check(!errs.length, '无报错' + (errs.length ? '：' + errs[0] : ''));
  await browser.close();
  console.log(fails.length ? `\n${fails.length} 项没过` : '\n全部通过');
  process.exit(fails.length ? 1 : 0);
})();
