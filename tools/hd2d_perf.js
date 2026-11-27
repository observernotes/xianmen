// HD-2D 帧耗时：node tools/hd2d_perf.js [cfg=flag,mid] [tiers=0,1,1.5,2,3] [secs=3] [json=输出.json] [scenes=home,battle] [page=dist/index.html]
// 各画质档（?hd=0～3）在洞府夜景 / 历练战斗两个画面里量帧间隔（中位数 / 95 分位），再开打点量一遍合成各阶段的耗时分解与每帧的全屏绘制次数。
// 配置（cfg=，逗号隔开）：
//   flag  旗舰机：视口 412×915，deviceScaleFactor 3.5 和 2.75 各一遍，CPU 不节流（1×）与 2× 节流
//   mid   中端机：412×915，dsf 2.75，CPU 4× 节流（标准档的目标 ≤ 40 ms）
//   p7    旧口径：Pixel 7（dpr 2.625）CPU 4×，和 docs/ART_HD2D.md 早先的表对得上
// 注意：无头 Chromium 的 Canvas 2D 是软件光栅（没有 GPU），这里的数字比真机悲观，主要看各档的相对开销、像素量的影响和把住下限。
// 打点（HD2D.probe）：合成的每一段之后回读 1 个像素，逼浏览器把这一段真正画完，量到的是“JS + 光栅”的耗时；回读本身也有开销，所以分解和帧间隔分两遍量。
// “全屏次数”：往呈现画布上画的、盖住半屏以上的 drawImage / fillRect 每帧几次；“覆盖”：每帧画到呈现画布上的总面积 ÷ 一屏。
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2), arg = (k, d) => { const a = args.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const CFG = arg('cfg', 'flag,mid').split(','), TIERS = arg('tiers', '0,1,1.5,2,3').split(',').map(Number), SECS = parseFloat(arg('secs', '3')), JSON_OUT = arg('json', ''), SCENES = arg('scenes', 'home,battle').split(',');
const url = 'file://' + path.resolve(arg('page', path.join(__dirname, '..', 'dist', 'index.html')));   // page=别的构建（比如优化前的一份拷贝）
// 每个页面 = 一种设备像素比 × 一档；同一页面里依次换 CPU 节流倍数
const RUNS = [];
if (CFG.includes('flag')) { RUNS.push({ name: '旗舰 dsf3.5', vp: { width: 412, height: 915 }, dsf: 3.5, rates: [1, 2] }); RUNS.push({ name: '旗舰 dsf2.75', vp: { width: 412, height: 915 }, dsf: 2.75, rates: [1, 2].concat(CFG.includes('mid') ? [4] : []) }); }
else if (CFG.includes('mid')) RUNS.push({ name: '中端 dsf2.75', vp: { width: 412, height: 915 }, dsf: 2.75, rates: [4] });
if (CFG.includes('p7')) RUNS.push({ name: 'Pixel 7', p7: true, rates: [4] });
(async () => {
  const browser = await chromium.launch();
  const out = [];
  for (const R of RUNS) for (const hd of TIERS) {
    const opt = R.p7 ? { ...devices['Pixel 7'] } : { ...devices['Pixel 7'], viewport: R.vp, screen: R.vp, deviceScaleFactor: R.dsf };
    const ctx = await browser.newContext(opt), page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url + '?hd=' + hd); await page.waitForTimeout(400);
    for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
    await page.click('#goStart'); await page.waitForTimeout(1200);
    await page.evaluate(() => { const X = window.__xm, st = X.st, L = X.L; L.onbAll(st); st.guide = { step: 99, done: true }; st.storyQ = []; st.p.r = 3; st.home = Object.assign(st.home || {}, { cave: 4, array: 9 }); X.setSpeed(0); if (window.HD2D) { window.HD2D.debugPhase = 0.95; window.HD2D.auto = false; window.HD2D.adapt = false; } });
    for (let i = 0; i < 3; i++) { await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(300); }
    await page.addStyleTag({ content: '#tip,#guide{display:none!important}' });
    const cdp = await ctx.newCDPSession(page);
    const measure = secs => page.evaluate(secs2 => new Promise(res => {
      const ts = []; let t0 = performance.now(), last = t0;
      const f = now => { ts.push(now - last); last = now; if (now - t0 < secs2 * 1000) requestAnimationFrame(f); else { ts.shift(); ts.sort((a, b) => a - b); const H = window.HD2D; res({ n: ts.length, med: ts[ts.length >> 1], p95: ts[Math.floor(ts.length * 0.95)], avg: ts.reduce((a, b) => a + b, 0) / ts.length, ms: H ? H.stats.ms : 0, q: H ? H.q : 0, half: H ? !!H.half : false, kind: H ? H.F.kind + ':' + H.F.key : '', size: (() => { const c = document.getElementById('sceneHD'); return c && c.style.display !== 'none' && H.on ? c.width + '×' + c.height : '原画布 200 宽'; })() }); } };
      requestAnimationFrame(f);
    }), secs);
    // 打点：阶段分解 + 往呈现画布上的全屏绘制次数
    const probe = secs => page.evaluate(secs2 => new Promise(res => {
      const H = window.HD2D, pc = document.getElementById('sceneHD');
      if (!H || !H.on || !pc) { res(null); return; }
      const g = pc.getContext('2d'), od = g.drawImage, of = g.fillRect; let big = 0, cov = 0;
      const area = (w, h) => { const m = g.getTransform(), a = Math.abs(w * m.a * h * m.d) / (pc.width * pc.height); cov += Math.min(a, 1.2); if (a >= 0.5) big++; };
      g.drawImage = function (img) { const n = arguments.length; if (n === 3) area(img.width, img.height); else if (n === 5) area(arguments[3], arguments[4]); else area(arguments[7], arguments[8]); return od.apply(this, arguments); };
      g.fillRect = function (x, y, w, h) { area(w, h); return of.apply(this, arguments); };
      H.probe = {};
      setTimeout(() => { const P = H.probe; H.probe = null; delete g.drawImage; delete g.fillRect; const n = P.n || 1, t = {}; for (const k in P.t || {}) t[k] = +(P.t[k] / n).toFixed(2); res({ frames: P.n || 0, big: +(big / n).toFixed(1), cov: +(cov / n).toFixed(1), t }); }, secs2 * 1000);
    }), secs);
    const row = { cfg: R.name, dsf: R.p7 ? 2.625 : R.dsf, hd, res: {} };
    const fight = () => page.evaluate(() => { const { st, L } = window.__xm; if (!document.getElementById('modal').hidden) window.__xm.closeModal(); if (st.exp && (!window.HD2D || !window.HD2D.on || window.HD2D.F.kind === 'adv')) return false; st.exp = null; st.p.inj = 0; L.startExp(st, 0, 0, 0); return true; });
    const scene = async (nm) => {
      for (const rate of R.rates) {
        if (nm === 'battle' && await fight()) await page.waitForTimeout(1500);   // 上一段量完历练已经走完了：重开一趟
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        await page.waitForTimeout(600);
        const m = await measure(SECS), p = await probe(Math.min(1.5, SECS));
        row.res[nm + '@' + rate] = Object.assign(m, { probe: p });
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    };
    if (SCENES.includes('home')) await scene('home');
    if (SCENES.includes('battle')) {
      await page.evaluate(() => { window.__xm.st.exp = null; });
      await scene('battle');
    }
    row.errs = errs; out.push(row);
    const f = v => (v === undefined ? '—' : v.toFixed(1)).padStart(6);
    for (const k in row.res) { const r = row.res[k], p = r.probe; console.log(`${R.name.padEnd(12)} ${String(hd).padEnd(3)} ${k.padEnd(10)} ${r.size.padEnd(12)} 均值 ${f(r.avg)} 中位 ${f(r.med)} p95 ${f(r.p95)} 合成JS ${f(r.ms)} ${r.kind}${r.half ? ' 隔帧' : ''}${p ? ` | 全屏 ${p.big} 覆盖 ${p.cov} | ` + Object.entries(p.t).map(([a, b]) => a + ' ' + b).join(' ') : ''}${errs.length ? '  错误：' + errs[0] : ''}`); }
    await ctx.close();
  }
  await browser.close();
  // 汇总表
  const f = v => (v === undefined ? '—' : v.toFixed(1));
  for (const R of RUNS) for (const rate of R.rates) {
    console.log(`\n${R.name}，CPU ${rate}×（帧间隔 均值 / 中位 / p95，ms；全屏次数 = 洞府夜景每帧盖半屏以上的绘制）`);
    console.log('档   合成画布      | 洞府夜景              | 战斗                  | 全屏 覆盖 | 合成分解（洞府，ms/帧）');
    for (const r of out.filter(x => x.cfg === R.name)) {
      const h = r.res['home@' + rate], b = r.res['battle@' + rate], p = h && h.probe;
      console.log(`${String(r.hd).padEnd(4)} ${(h || b).size.padEnd(13)} | ${h ? [h.avg, h.med, h.p95].map(v => f(v).padStart(5)).join(' / ') : '         —         '} | ${b ? [b.avg, b.med, b.p95].map(v => f(v).padStart(5)).join(' / ') : '         —         '} | ${p ? String(p.big).padStart(4) + ' ' + String(p.cov).padStart(4) : '   —     —'} | ${p ? Object.entries(p.t).filter(e => e[1] >= 0.3).map(([a, b2]) => a + ' ' + b2).join(' · ') : ''}`);
    }
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
  if (out.some(r => r.errs.length)) process.exitCode = 1;
})();
