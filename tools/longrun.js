// 长局测试：机器人按界面流程玩到飞升，检查全程无报错
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(150); }
  await page.click('#goStart');
  await page.waitForTimeout(300);
  const result = await page.evaluate(async (maxYears) => {
    const X = window.__xm; const L = X.L;
    X.setSpeed(3); // 暂停自动流逝，由脚本推进
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const modal = () => !document.getElementById('modal').hidden;
    let popups = 0, uiBt = 0, cineSeen = 0;
    async function drain() {
      for (let guard = 0; guard < 400; guard++) {
        if (X.cine) { cineSeen++; await sleep(150); continue; }
        if (!modal()) { await sleep(150); if (!modal() && !X.cine) return; continue; }
        const btns = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')];
        // 收徒候选：先选第一个
        const cand = document.querySelector('#modal .cand:not(.hide)');
        if (cand && !document.querySelector('#modal .cand.sel')) { cand.click(); await sleep(30); continue; }
        if (!btns.length) { await sleep(120); continue; }
        const b = btns[btns.length - 1];
        popups++;
        b.click();
        await sleep(40);
      }
    }
    while (X.st.year <= maxYears && !X.st.ascended) {
      const st = X.st;
      // 突破：前 6 次走界面动画，之后直接结算
      for (const d of [...st.ds]) if (L.isReady(d)) {
        if (uiBt < 6) { uiBt++; X.showBreakthrough(d); await sleep(50); document.querySelector('#modal .foot .btn.gold').click(); await sleep(100); await drain(); }
        else { L.breakthrough(st, d, st.pills > 0); }
      }
      if (st.ascended) break;
      for (let loop = 0; loop < 20; loop++) {
        const opts = ['array', 'mine', 'library', 'alchemy'].map(k => [k, L.bCost(k, st.b[k])]);
        if (st.ds.length >= L.cap(st) && st.b.gate < 9) opts.push(['gate', L.bCost('gate', st.b.gate) * 0.7]);
        opts.sort((a, b) => a[1] - b[1]);
        if (!L.upgrade(st, opts[0][0])) break;
      }
      if (st.ds.length < L.cap(st) && st.stones >= L.recruitCost(st) * 1.2) {
        const c = L.recruit(st); const best = c.sort((a, b) => b.t - a.t)[0]; best.slot = X.freeSlot(); L.accept(st, best);
      }
      const team = L.autoTeam(st);
      if (team.length && !st.exps.length) {
        let k = 0; for (let j = L.DUNGEONS.length - 1; j >= 0; j--) if (L.unlocked(st, j) && L.expChance(st, j, team).p >= 0.74) { k = j; break; }
        L.startExp(st, k, team);
      }
      L.flow(st, 1);
      X.onMonth();
      await drain();
    }
    await drain();
    const st = X.st;
    return { year: st.year, asc: st.ascended, rank: st.rank, best: st.bestRank, ds: st.ds.length, popups, cineSeen, goal: st.goal, log0: st.log.slice(0, 3).map(l => l.text) };
  }, 60);
  console.log(JSON.stringify(result, null, 1));
  await page.screenshot({ path: process.argv[2] || '/tmp/longrun.png' });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
