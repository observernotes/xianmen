// 长局测试：机器人通过界面流程玩完一世（到飞升或坐化），检查全程无报错
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 400, height: 820 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(120); }
  await page.click('#goStart');
  await page.waitForTimeout(300);
  const result = await page.evaluate(async () => {
    const X = window.__xm, L = X.L;
    X.setSpeed(3);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const modal = () => !document.getElementById('modal').hidden;
    let popups = 0, uiBt = 0;
    const seen = {};
    async function drain() {
      for (let guard = 0; guard < 600; guard++) {
        if (X.cine) { await sleep(120); continue; }
        if (!modal()) { await sleep(130); if (!modal() && !X.cine) return; continue; }
        const title = document.querySelector('#modal h2'); if (title) seen[title.textContent.replace(/\d+/g, 'N')] = 1;
        const cand = document.querySelector('#modal .cand:not(.hide):not(.sel)');
        if (cand && !document.querySelector('#modal .cand.sel')) { cand.click(); await sleep(40); continue; }
        const btns = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')];
        if (!btns.length) { await sleep(120); continue; }
        popups++;
        btns[btns.length - 1].click();
        await sleep(50);
      }
    }
    for (let n = 0; n < 700; n++) {
      const st = X.st;
      if (!st || st.p.r >= 9) break;
      if (L.isReady(st)) {
        if (uiBt < 5) { uiBt++; X.showBreakthrough(); await sleep(40); document.querySelector('#modal .foot .btn.gold').click(); await drain(); }
        else L.breakthrough(st, st.pills > 0);
        if (st.p.r >= 9) { await drain(); break; }
      }
      for (let loop = 0; loop < 20; loop++) {
        const opts = L.HOME.map(b => [b.k, L.hCost(b.k, st.home[b.k])]).filter(o => st.home[o[0]] < L.HOME.find(b => b.k === o[0]).max).sort((a, b) => a[1] - b[1]);
        if (!opts.length || !L.upgrade(st, opts[0][0])) break;
      }
      if (st.pills < 2 && st.stones > L.price(st, 'pill') * 4) L.buy(st, 'pill');
      if (st.stones > L.price(st, 'box') * 5) L.buy(st, 'box');
      if ((!st.p.pet || st.p.pet.tier < 1 + st.p.r * 0.6) && st.stones > L.price(st, 'egg') * 4) L.buy(st, 'egg');
      if (st.sect && L.canPromote(st)) { X.doPromote(); await drain(); }
      if (!st.exp && !L.isReady(st)) { let k = 0; for (let j = L.REGIONS.length - 1; j >= 0; j--) if (L.unlocked(st, j) && L.expChance(st, j).p >= 0.74) { k = j; break; } L.startExp(st, k); }
      L.flow(st, 1);
      X.onTick();
      await drain();
    }
    await drain();
    const st = X.st;
    return { tick: st.tick, realm: L.stageName(st.p), age: Math.floor(st.p.age), rank: st.rank, sect: st.sect ? L.srankName(st, st.sect.rank) : '-', beaten: Object.keys(st.beaten), goal: st.goal + '/' + L.GOALS.length, popups, titles: Object.keys(seen) };
  });
  console.log(JSON.stringify(result, null, 1));
  await page.screenshot({ path: process.argv[2] || '/tmp/longrun.png' });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
