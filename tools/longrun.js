// 长局测试：机器人通过界面流程玩完一世（到飞升或坐化），检查全程无报错
// node tools/longrun.js [截图.png]   慢：一世约 800～900 周天，跑几分钟
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
    X.setSpeed(3);   // 暂停：时间由下面的循环推进
    X.st.guide = { step: 99, done: true };
    setInterval(() => { const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); }, 200); // 老祖的提示一律点“好”
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const modal = () => !document.getElementById('modal').hidden;
    let popups = 0, uiBt = 0, uiExp = 0, trips = 0;
    const seen = {};
    async function drain() {
      for (let guard = 0; guard < 600; guard++) {
        if (X.cine) { await sleep(120); continue; }
        if (!modal()) { await sleep(450); if (!modal() && !X.cine) return; continue; }
        const title = document.querySelector('#modal h2'); if (title) seen[title.textContent.replace(/\d+/g, 'N')] = 1;
        const cand = document.querySelector('#modal .cand:not(.hide):not(.sel)');
        if (cand && !document.querySelector('#modal .cand.sel')) { cand.click(); await sleep(40); continue; }
        const chs = [...document.querySelectorAll('#modal .choices .btn:not([disabled])')];
        if (chs.length) { popups++; chs[Math.floor(Math.random() * chs.length)].click(); await sleep(60); continue; }
        const btns = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')];
        if (!btns.length) { await sleep(120); continue; }
        popups++;
        // 结算卡上不点“再探一次”，回洞府自己安排
        const back = btns.find(b => b.textContent === '回洞府');
        (back || btns[btns.length - 1]).click();
        await sleep(50);
      }
    }
    const W = { array: 1, field: 1.25, furnace: 1.8, cave: 2.4 };
    for (let n = 0; n < 1600; n++) {
      const st = X.st;
      if (!st || st.p.r >= 9) break;
      if (L.isReady(st)) {
        if (st.p.inj > 0) L.heal(st);
        while (st.pills < 3 && st.stones > L.price(st, 'pill') * 2 && !L.btGuard(st)) L.buy(st, 'pill');
        if (uiBt < 6) { uiBt++; X.showBreakthrough(); await sleep(40); document.querySelector('#modal .foot .btn.gold').click(); await drain(); }
        else L.breakthrough(st, Math.min(3, st.pills));
        if (st.p.r >= 9) { await drain(); break; }
      }
      for (let loop = 0; loop < 20; loop++) {
        const opts = L.HOME.filter(b => L.homeOpen(st, b.k) && st.home[b.k] < b.max).map(b => [b.k, L.hCost(b.k, st.home[b.k])]).sort((a, b) => a[1] * W[a[0]] - b[1] * W[b[0]]);
        if (!opts.length || !L.upgrade(st, opts[0][0])) break;
      }
      if (st.pills < 2 && st.stones > L.price(st, 'pill') * 4) L.buy(st, 'pill');
      if (st.stats.exp >= 1 && st.stones > L.price(st, 'box') * 3) L.buy(st, 'box');
      if (L.marketOpen(st, 'egg') && (!st.p.pet || st.p.pet.tier < 1 + st.p.r * 0.6) && st.stones > L.price(st, 'egg') * 3) L.buy(st, 'egg');
      if (L.lifeLow(st) && L.marketOpen(st, 'life') && st.stones > L.price(st, 'life')) L.buy(st, 'life');
      if (L.auctionOpen(st)) st.auction.items.forEach((it, i) => { if (!it.sold && st.stones > it.price * 1.5) L.auctionBuy(st, i); });
      if (st.sect) {
        if (L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 6) { X.doPromote(); await drain(); }
        st.sect.tasks.forEach((t, i) => { if (!t.taken && t.ty !== 'teach' && t.ty !== 'escort') L.taskTake(st, i); if (L.taskCanDeliver(st, t) && st.pills >= 2) L.taskDeliver(st, i); });
        for (const k of ['vart', 'vwep']) if (st.sect.pts >= L.vaultCost(st, k)) L.vaultBuy(st, k);
        if (st.sect.rank >= 6) for (const b of L.BUILDS) if (st.stones > L.buildCost(st.sect.build[b.k]) * 1.2) L.sectBuild(st, b.k);
      }
      if (st.home.furnace) { for (const k of ['xisui', 'jiuzhuan', 'juling', 'pojing', 'peiyuan']) if (!L.canCraft(st, k) && (k !== 'jiuzhuan' || st.p.r >= 5) && (k !== 'juling' || !st.buffs.some(b => b.cul)) && (k !== 'pojing' || st.pills < 2)) { L.craft(st, k); break; } }
      if (!L.busy(st)) for (let k = 0; k < L.REGIONS.length; k++) if (L.bossReady(st, k) && L.duelChance(L.power(st), L.bossPower(k)) > 0.7) { X.fightBossUI(k); await drain(); }
      if (st.visitor && !st.retreat && Math.random() < 0.5) { X.showVisitor(); await drain(); }
      if (L.tunaReady(st)) L.tuna(st);
      if (st.p.inj > 0 && L.canHeal(st)) L.heal(st);
      if (!L.busy(st) && !L.isReady(st) && !L.isFull(st) && st.p.inj <= 0) {
        if (trips >= 2 && L.canRetreat(st)) { trips = 0; L.startRetreat(st); }
        else {
          const a = L.apprOpen(st, 2) && st.stats.exp % 3 === 1 ? 2 : L.apprOpen(st, 1) && st.stats.exp % 4 === 3 ? 1 : 0;
          const c = L.expBest(st, a);
          // 前几趟走界面：历练面板 → 确认页 → 出发
          if (uiExp < 4) { uiExp++; X.showExp(); await sleep(40); X.confirmExp(c.k, c.d, c.a); await sleep(40); document.querySelector('#modal .foot .btn.gold').click(); await sleep(450); }
          else L.startExp(st, c.k, c.d, c.a, L.chainOpen(st) && n % 5 === 0 ? { chain: 3 } : undefined);
          if (st.exp) trips++;
        }
      }
      L.flow(st, 1);
      X.onTick();
      await drain();
    }
    await drain();
    const st = X.st;
    const qv = L.questView(st);
    return { npc: JSON.stringify(st.npc), daolv: st.daolv, ach: Object.keys(st.ach).length, events: st.stats.events, bosses: st.stats.bosses, tick: st.tick, realm: L.stageName(st.p), ascended: st.p.r >= 9, age: Math.floor(st.p.age), rank: st.rank, sect: st.sect ? L.srankName(st, st.sect.rank) : '-', beaten: Object.keys(st.beaten), quests: Object.keys(st.quest.done).length + ' 条（当前第 ' + (qv.r + 1) + ' 章）', trips: st.stats.exp, retreats: st.stats.retreat, btFails: st.stats.btFails, popups, titles: Object.keys(seen) };
  });
  console.log(JSON.stringify(result, null, 1));
  await page.screenshot({ path: process.argv[2] || '/tmp/longrun.png' });
  if (!result.ascended) errors.push('这一世没有飞升（' + result.realm + '）');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e); process.exit(1); });
