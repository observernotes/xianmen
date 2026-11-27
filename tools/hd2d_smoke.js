// HD-2D 冒烟测试：node tools/hd2d_smoke.js
// 自动化下默认不开高清（见 src/fx/hd2d.js 的 defaultQ），这里用 ?hd=2 显式打开，把接管 / 分层 / 换档 / 各场景都走一遍：
//   接管后界面看到的画布仍是 200×H；呈现画布在、有画面；洞府 → 历练战斗 → 对决 → 秘境 → 对话都不报错；
//   运行时换档 2 → 0 → 1 → 3 → 2，0 档时画布还原成 200 宽（3 档封顶 800 宽）；九宫格是 SVG；版面不横向溢出；
//   同一帧合成几遍画面不变；掉帧自适应（隔帧 → 3 档降内部分辨率 → 退效果）不改写设置项。
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
    else check(s.on && s.realW === 400 && s.shown && s.colors > 20 && (q === 3 ? s.pw === 800 : s.pw === 400), `${q} 档：呈现画布 ${s.pw} 宽，${s.colors} 色`);
  }
  // ---------- 焦段清晰度：默认档（1.5）下，主角 / 石台 / 洞府门脸这一带不许比原画面（0 档）糊 ----------
  // 量法：两边都取成 400 宽，在“门脸（下半，不带进身后的远山）+ 石台”两块矩形里算亮度的拉普拉斯方差（步长 2 个高清像素 = 1 个逻辑像素）；1.5 档 ÷ 0 档 ≥ 0.8。
  // 白天 / 黄昏 / 夜里各量一次，1.5 档量三次取最清楚的一次（浮尘、光柱在动，飘过去的那几帧不算）。虚化近景伸进来、辉光罩成雾、夜色压成一片黑都会掉到 0.8 以下
  const lapVar = q => ev(q2 => new Promise(res => {
    const H = window.HD2D, cv = document.getElementById('scene'); H.setQuality(q2);
    setTimeout(() => {
      const src = H.on ? document.getElementById('sceneHD') : cv, w = 400, h = cv.height * 2, OY = cv.height - 160, t = document.createElement('canvas'); t.width = w; t.height = h;
      const g = t.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data, L = (x, y) => { const i = (y * w + x) * 4; return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; };
      let n = 0, s1 = 0, s2 = 0;
      for (const [X0, Y0, X1, Y1] of [[80, 88, 120, 104], [46, 104, 154, 146]]) for (let y = (Y0 + OY) * 2; y < (Y1 + OY) * 2; y++) for (let x = X0 * 2; x < X1 * 2; x++) { const lp = 4 * L(x, y) - L(x - 2, y) - L(x + 2, y) - L(x, y - 2) - L(x, y + 2); n++; s1 += lp; s2 += lp * lp; }
      res(s2 / n - (s1 / n) ** 2);
    }, 450);
  }), q);
  const soft = [];
  for (const [ph, nm] of [[0.45, '白天'], [0.69, '黄昏'], [0.95, '夜里']]) {
    await ev(p => { window.HD2D.debugPhase = p; }, ph); await page.waitForTimeout(200);
    const ref = await lapVar(0), v = []; for (let i = 0; i < 3; i++) v.push(await lapVar(1.5)); v.sort((a, b) => a - b);
    soft.push(`${nm} ${(v[2] / ref).toFixed(2)}`); if (v[2] / ref < 0.8) fails.push(`焦段清晰度 ${nm} ${(v[2] / ref).toFixed(2)} < 0.8`);
  }
  check(!fails.some(f => f.startsWith('焦段清晰度')), `1.5 档洞府焦段（主角 / 石台 / 门脸）的清晰度不低于原画面的八成：${soft.join('，')}`);
  await ev(() => { window.HD2D.setQuality(2); }); await page.waitForTimeout(300);
  // ---------- 硬边检查：合成出来的画面里不许有“原画面没有的长直线亮度断层”（图层被矩形裁掉、缓冲没铺满之类） ----------
  // 每个画面先取 0 档（原画面）的直线边缘当参照，再取各档合成结果；多出来的长直边（横 ≥ 44、竖 ≥ 36 个逻辑像素）算失败
  const grab = (q, map) => ev(([q2, map2]) => new Promise(res => {
    const H = window.HD2D, X = window.__xm, cv = document.getElementById('scene');
    H.setQuality(q2);
    const read = () => {
      const src = H.on ? document.getElementById('sceneHD') : cv, w = 200, h = cv.height, t = document.createElement('canvas'); t.width = w; t.height = h;
      const g = t.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
      const out = [], TH = q2 === 0 ? 3 : 7, MH = q2 === 0 ? 5 : 20, MV = q2 === 0 ? 5 : 18;   // 参照用更低的阈值：原画面里本来就有、只是被调色加深了的边不算
      for (let y = 1; y < h - 1; y++) { let run = 0, sg = 0; for (let x = 0; x <= w; x++) { const dv = x < w ? L[(y + 1) * w + x] - L[y * w + x] : 0, s2 = Math.abs(dv) > TH ? Math.sign(dv) : 0; if (s2 && s2 === sg) run++; else { if (run >= MH) out.push(['h', y, x - run, x, sg]); run = s2 ? 1 : 0; sg = s2; } } }
      for (let x = 1; x < w - 1; x++) { let run = 0, sg = 0; for (let y = 0; y <= h; y++) { const dv = y < h ? L[y * w + x + 1] - L[y * w + x] : 0, s2 = Math.abs(dv) > TH ? Math.sign(dv) : 0; if (s2 && s2 === sg) run++; else { if (run >= MV) out.push(['v', x, y - run, y, sg]); run = s2 ? 1 : 0; sg = s2; } } }
      if (q2 === 0) {   // 参照再加一遍“横向抹平 5 像素”之后的横边：原画里被棋盘抖动打成碎点的长边（石台上沿、地平线），高清下抖动被磨顺会连成一条，本来就有的不算多出来的
        const L0 = L.slice(); for (let y = 0; y < h; y++) for (let x = 2; x < w - 2; x++) L[y * w + x] = (L0[y * w + x - 2] + L0[y * w + x - 1] + L0[y * w + x] + L0[y * w + x + 1] + L0[y * w + x + 2]) / 5;
        for (let y = 1; y < h - 1; y++) { let run = 0, sg = 0; for (let x = 0; x <= w; x++) { const dv = x < w ? L[(y + 1) * w + x] - L[y * w + x] : 0, s2 = Math.abs(dv) > 6 ? Math.sign(dv) : 0; if (s2 && s2 === sg) run++; else { if (run >= 12) out.push(['h', y, x - run, x, sg]); run = s2 ? 1 : 0; sg = s2; } } }
      }
      // 地面层自己的天际线（上面透明、下面有画）压在虚化的远景上，是分层该有的边，不是裁切边：记下来，后面不算
      const GL = H.on && H._layer && H._layer('ground');
      if (GL && GL.used) { const t2 = document.createElement('canvas'); t2.width = w; t2.height = h; const g3 = t2.getContext('2d'); g3.drawImage(GL.c, 0, 0, w, h); const al = g3.getImageData(0, 0, w, h).data, A = (x, y) => (y < 0 || y >= h ? 0 : al[(y * w + x) * 4 + 3]);
        for (const e of out) if (e[0] === 'h') { let c = 0; for (let x = e[2]; x < e[3]; x++) { let top = false; for (let k = -3; k <= 3 && !top; k++) if (A(x, e[1] + k) < 90 && A(x, e[1] + k + 2) > 160) top = true; if (top) c++; } if (c >= (e[3] - e[2]) * 0.6) e[5] = 'sil'; } }
      res(out);
    };
    if (map2) { const c = cv.getContext('2d'); X.ART.setCtx(c, 200); const OY = cv.height - 160; c.setTransform(1, 0, 0, 1, 0, OY); if (map2[0] === 'adv') X.ART.drawAdventure(map2[1], 5000, OY, 30); else X.ART.drawDuelStage(map2[1], 5000, OY); if (H.on) H.present(5000); read(); }
    else setTimeout(read, 450);
  }), [q, map]);
  // 一条边算“原画面里就有”：它的跨度有六成以上被参照里相邻 ±3 行（列）的短边盖住（原画的边常被抖动打成碎段）
  // 细线（光柱、雨丝：几像素内紧跟着一条反号的边）不是裁切边，不算；只看够长的（横 ≥ 44、竖 ≥ 36）
  const thin = (e, cur) => cur.some(o => o[0] === e[0] && o[4] === -e[4] && Math.abs(o[1] - e[1]) <= 5 && Math.min(o[3], e[3]) - Math.max(o[2], e[2]) >= (e[3] - e[2]) * 0.5);
  const extra = (ref, cur) => cur.filter(e => e[5] !== 'sil' && e[3] - e[2] >= (e[0] === 'h' ? 44 : 36) && !thin(e, cur)).filter(e => { const n = e[3] - e[2], cov = new Uint8Array(n); for (const r of ref) if (r[0] === e[0] && Math.abs(r[1] - e[1]) <= 3) for (let k = Math.max(r[2], e[2]); k < Math.min(r[3], e[3]); k++) cov[k - e[2]] = 1; let c = 0; for (let k = 0; k < n; k++) c += cov[k]; return c < n * 0.6; });
  const TIERS = [1, 1.5, 2, 3], bad = [];
  await ev(() => { window.__xm.setSpeed(window.__xm.pauseIdx === undefined ? 3 : window.__xm.pauseIdx); });
  for (const ph of [0.45, 0.69, 0.95]) {
    await ev(p => { window.HD2D.debugPhase = p; }, ph); const ref = await grab(0, null);
    for (const q of TIERS) { const ex = extra(ref, await grab(q, null)); if (ex.length) bad.push(`洞府 相位 ${ph} ${q} 档：${ex.slice(0, 3).map(e => e.join(',')).join(' / ')}`); }
  }
  await ev(() => { window.HD2D.selfLoop = false; });   // 下面直接调美术函数画地图，不让界面那一帧（洞府）盖回来
  for (const m of ['forest', 'hill', 'tomb', 'blood', 'swords', 'abyss', 'sea', 'stars', 'palace', 'chaos'].map(k => ['adv', k]).concat(['town', 'cloud', 'sect', 'wild', 'sect_mo', 'r_jin', 'r_mu', 'r_huo', 'r_shui'].map(k => ['duel', k]))) {
    const ref = await grab(0, m);
    for (const q of TIERS) { const fy = 128 + (await ev(() => document.getElementById('scene').height)) - 160, ex = extra(ref, await grab(q, m)).filter(e => !(e[0] === 'h' && Math.abs(e[1] - fy) <= 2));   /* 脚线上那条横边是清晰的地面压在虚化的中景上，景深本来就该有 */ if (ex.length) bad.push(`${m.join(':')} ${q} 档：${ex.slice(0, 3).map(e => e.join(',')).join(' / ')}`); }
  }
  await ev(() => { window.HD2D.selfLoop = true; window.HD2D.setQuality(2); });
  for (const b2 of bad) console.log('         · ' + b2);
  check(!bad.length, `各档各场景没有多出来的长直硬边（洞府三个时刻 + 10 张地图 + 9 个舞台 × 4 档；多出 ${bad.length} 处）`);
  // ---------- 同一帧场景合成好几遍（隔帧 / 弹窗压着时会这样）：画面不变——轮廓光加进人物层、落影画进地面层，都只做一次 ----------
  for (const q of [2, 3]) {
    const same = await ev(q2 => {
      const H = window.HD2D, X = window.__xm, cv = document.getElementById('scene'), c = cv.getContext('2d'); H.setQuality(q2); H.selfLoop = false;
      const OY = cv.height - 160, out = [];
      for (const m of [['adv', 'forest'], ['duel', 'cloud']]) {
        X.ART.setCtx(c, 200); c.setTransform(1, 0, 0, 1, 0, OY); if (m[0] === 'adv') X.ART.drawAdventure(m[1], 5000, OY, 30); else X.ART.drawDuelStage(m[1], 5000, OY);
        const p = document.getElementById('sceneHD'), snap = () => { const t = document.createElement('canvas'); t.width = p.width; t.height = p.height; const g = t.getContext('2d'); g.drawImage(p, 0, 0); return g.getImageData(0, 0, t.width, t.height).data; };
        H.present(5000); const a = snap(); H.present(5000); H.present(5000); const b = snap();
        let diff = 0; for (let i = 0; i < a.length; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]));
        out.push(m[1] + ' ' + diff);
      }
      H.selfLoop = true; H.setQuality(2);
      return out;
    }, q);
    check(same.every(s => +s.split(' ')[1] <= 2), `${q} 档同一帧合成三遍画面不变（${same.join('，')}）`);
  }
  // ---------- 掉帧自适应：手动选的档是上限——先隔帧，3 档再降内部分辨率，再往下退效果；设置项（localStorage.xm_hd、HD2D.q）不被改写；重新选档全部还回去 ----------
  const dg = await ev(() => {
    const H = window.HD2D, pw = () => document.getElementById('sceneHD').width; H.setQuality(3);
    const steps = []; for (let i = 0; i < 4; i++) { const w = H.degrade(); steps.push(w + ':' + pw() + ':' + H.level()); }
    const kept = localStorage.getItem('xm_hd'), q = H.q, deg = H.degraded();
    H.setQuality(3); const back = [H.half, H.cut, H.degraded(), pw()];
    H.setQuality(2); H.auto = true; const a1 = H.degrade(), a2 = H.degrade(), aq = H.q, akept = localStorage.getItem('xm_hd');
    H.setQuality(2);
    return { steps, kept, q, deg, back, a1, a2, aq, akept };
  });
  check(dg.steps.join(' ') === 'half:800:3 res:400:3 cut:400:2 cut:400:1.5' && dg.kept === '3' && dg.q === 3 && dg.deg, `手动 3 档掉帧：${dg.steps.join(' → ')}；设置仍是 ${dg.kept}（HD2D.q=${dg.q}）`);
  check(!dg.back[0] && !dg.back[1] && !dg.back[2] && dg.back[3] === 800, '重新选档后隔帧 / 降分辨率 / 退效果都还回去');
  check(dg.a1 === 'half' && dg.a2 === 'q' && dg.aq === 1 && dg.akept === '2', `“自动”档掉帧：先隔帧再降档（${dg.a1} → ${dg.a2}，现在 ${dg.aq} 档），不写存储`);
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
