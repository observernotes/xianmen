// 长局测试：机器人通过界面流程玩完一世（到飞升或坐化），检查全程无报错；掉落的法宝对比卡像玩家一样点（更强换上、否则熔炼、偶尔锁定），每 12 周天去法宝页点【强化】；
// 坊市像玩家一样逛（每 6 周天）：先处理弹出的坊市事件，破境丹多了点【卖一半】，货架上打折的破境丹、轮换的法衣 / 残篇 / 器方买得起就点，拍卖会对想要的拍品点【加价】（宿敌在场点【豪掷】）；
// 大势起了点右上角小牌看年历，筑基后每 24 周天点一次“大事”牌；秘境开着、手里有令时偶尔（头两回，之后每 4 年一回）从历练页进去，
// 门照老祖的“荐”点，最好的门也会出事 / 气血见底就点【带着 N 件离开】，奇遇随手选，行商不买，秘藏点“荐”的那项
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
    let popups = 0, uiBt = 0, uiExp = 0, trips = 0, artEq = 0, artPage = 0, gEq = 0, gSmelt = 0, gLock = 0, gPlus = 0, mSell = 0, mBuy = 0, mBid = 0, mEv = 0, calOpen = 0;
    const title = () => { const h = document.querySelector('#modal:not([hidden]) h2'); return h ? h.textContent : ''; };
    // 坊市：先过坊市事件（打开坊市时弹），再卖、买、出价——都点界面上的按钮
    async function marketRound() {
      if (X.st.p.r >= 9) return;
      X.showMarket(); await sleep(40);
      for (let g = 0; g < 6 && title() && title() !== '坊市'; g++) {
        const ch = [...document.querySelectorAll('#modal .choices .btn:not([disabled])')];
        if (ch.length) { ch[Math.floor(Math.random() * ch.length)].click(); mEv++; seen['坊市事件'] = 1; await sleep(60); continue; }
        if (X.cine) { await sleep(150); continue; }
        if (document.querySelector('#modal [data-gcmp]')) { await drainCards(); continue; }
        const f = document.querySelector('#modal .foot .btn:not([disabled])'); if (f) { f.click(); await sleep(1300); } else break;
      }
      if (title() !== '坊市') { await drain(); X.showMarket(); await sleep(40); if (title() !== '坊市') { await drain(); return; } }
      const st = X.st;
      // 卖：破境丹 6 枚以上、行情不差就卖一半；灵草远多于炼丹所需、行情 ≥ ×1.15 卖一半；筑基后没卖过东西的，挑行情最好的那样试着卖一半
      const sellClick = async sel => { const b = document.querySelector(`#modal [data-sell="${sel}"]:not([disabled])`); if (b) { b.click(); mSell++; seen['行情卖出'] = 1; await sleep(40); } };
      if (L.sellOpen(st)) {
        if (st.pills >= 9 || (st.pills >= 6 && L.sellMult(st, 'pill') >= 1)) await sellClick('pill:0.5');
        if (st.herbs > 3 * L.herbCost(st, L.RECIPES[0]) && L.sellMult(st, 'herb') >= 1.15) await sellClick('herb:0.5');
        if (!mSell) { const k = L.SELL_KEYS.filter(x => L.sellHave(st, x) > 0).sort((a, b) => L.sellMult(st, b) - L.sellMult(st, a))[0]; if (k && k !== 'ore') await sellClick(k + ':0.5'); }
      }
      for (const row of L.shelf(st)) {
        if (row.fixed || L.shelfWhy(st, row)) continue;
        if (!((row.k === 'pill' && st.pills < 3) || ((row.k === 'robe' || row.k === 'frag' || row.k === 'plan') && st.stones > row.price * 2) || (row.k === 'ore' && st.stones > row.price * 6))) continue;
        const b = document.querySelector(`#modal [data-buy="${row.i}"]:not([disabled])`); if (!b) continue;
        b.click(); mBuy++; seen['货架轮换货'] = 1; await sleep(600);
        break;
      }
      if (title() !== '坊市') { await drain(); X.showMarket(); await sleep(40); if (title() !== '坊市') { await drain(); return; } }
      if (L.auctionOpen(st)) for (let i = 0; i < 3 && L.auctionBidsLeft(st) > 0; i++) {
        const it = st.auction.items[i]; if (it.res) continue;
        if (!(['g', 'a', 'frag', 'xisui', 'plan'].includes(it.k) || (it.k === 'treasure' && st.treasure < 3))) continue;
        // 宿敌在场想豪掷、否则加价；钱不够就退一档（跟一口）
        const b = [it.comp && it.comp.kind !== 'npc' ? 2 : 1, 1, 0].map(t => document.querySelector(`#modal [data-bid="${i}:${t}"]:not([disabled])`)).find(Boolean);
        if (!b) continue;
        b.click(); mBid++; seen['拍卖竞价'] = 1; await sleep(600);
        if (title() !== '坊市') { await drain(); X.showMarket(); await sleep(40); if (title() !== '坊市') break; }
      }
      if (title()) X.closeModal(); await sleep(450); await drain();
    }
    // 法宝页：兵器、法衣、饰品下的【强化】能点就点（每格最多 6 下，像个肯花灵矿的玩家）
    async function gearRound() {
      X.showMe('gear'); await sleep(40);
      for (const s of ['w', 'r', 'o']) for (let i = 0; i < 6; i++) {
        const b = document.querySelector(`#modal [data-plus="${s}"]:not([disabled])`); if (!b) break;
        b.click(); gPlus++; await sleep(30);
      }
      await drainCards();
      X.closeModal(); await sleep(450);
    }
    // 对比卡：更强就【换上】，否则【熔炼】；偶尔【锁定当前】
    async function drainCards() {
      for (let g = 0; g < 8; g++) {
        const c = document.querySelector('#modal [data-gcmp]'); if (!c) return;
        const u = c.dataset.gcmp;
        if (c.dataset.better === '1') { c.querySelector('[data-geq]').click(); gEq++; }
        else if (Math.random() < 0.15 && c.querySelector('[data-glk]')) { c.querySelector('[data-glk]').click(); gLock++; }
        else { c.querySelector('[data-gsm]').click(); gSmelt++; }
        seen['对比卡'] = 1; await sleep(30);
        if (document.querySelector(`#modal [data-gcmp="${u}"]`)) return;
      }
    }
    // 每隔一阵打开【人物】→ 功法，三个槽各点一下，有“荐”就点它（两下换上；凑出共鸣时点掉揭晓卡）
    async function artRound() {
      X.showMe('art'); await sleep(40);
      for (const i of [0, 1, 2]) {
        const slot = document.querySelector(`#modal [data-slot="${i}"]`); if (!slot) break;
        slot.click(); await sleep(30);
        const rec = [...document.querySelectorAll('#modal .arow')].find(r => r.querySelector('.chip.ok') && r.querySelector('.chip.ok').textContent === '荐');
        if (rec) { rec.click(); artPage++; await sleep(40); if (document.querySelector('#modal h2') && document.querySelector('#modal h2').textContent === '共鸣揭晓') { seen['共鸣揭晓'] = 1; document.querySelector('#modal .foot .btn').click(); await sleep(40); } }
      }
      X.closeModal(); await sleep(450);
    }
    const seen = {};
    let mjRuns = 0, mjClears = 0, mjDoors = 0;
    async function realmRound(xf) {
      X.showExp(); await sleep(40);
      const card = document.querySelector(`#modal [data-mj="${xf ? 1 : 0}"]`);
      if (!card) { X.closeModal(); await sleep(450); return; }
      card.click(); await sleep(60);
      const go = document.querySelector('#modal .foot .btn.gold:not([disabled])');
      if (!go) { X.closeModal(); await sleep(450); return; }
      go.click(); await sleep(400);
      if (!X.st.run) return;
      mjRuns++; seen['秘境'] = 1;
      for (let g = 0; g < 120 && X.st.run; g++) {
        if (modal()) {
          const ch = document.querySelector('#modal [data-chest] .chip.ok'); if (ch) { ch.click(); mjClears++; await sleep(700); continue; }
          const chs = [...document.querySelectorAll('#modal .choices .btn:not([disabled])')];
          if (chs.length) { chs[Math.floor(Math.random() * chs.length)].click(); seen['秘境奇遇'] = 1; await sleep(1400); continue; }
          const f = document.querySelector('#modal .foot .btn:not([disabled])'); if (f) { f.click(); await sleep(500); continue; }
          await sleep(200); continue;
        }
        if (window.__xm_realm.mjFx || X.st.run.phase !== 'door') { await sleep(250); continue; }
        if (L.mjShouldLeave(X.st)) { const b = document.querySelector('#realmLeave'); if (b) { b.click(); await sleep(500); break; } }
        const d = document.querySelector(`#realmDoors [data-door="${Math.max(0, L.mjDoorRec(X.st))}"]`);
        if (d) { d.click(); mjDoors++; } await sleep(1100);
      }
      await drain();
    }
    async function drain() {
      for (let guard = 0; guard < 600; guard++) {
        if (X.cine) { await sleep(120); continue; }
        if (!modal()) { await sleep(450); if (!modal() && !X.cine) return; continue; }
        const title = document.querySelector('#modal h2'); if (title) seen[title.textContent.replace(/\d+/g, 'N')] = 1;
        const cand = document.querySelector('#modal .cand:not(.hide):not(.sel)');
        if (cand && !document.querySelector('#modal .cand.sel')) { cand.click(); await sleep(40); continue; }
        const chs = [...document.querySelectorAll('#modal .choices .btn:not([disabled])')];
        if (chs.length) { popups++; chs[Math.floor(Math.random() * chs.length)].click(); await sleep(60); continue; }
        // 掉落卡、结算卡上的【换上】照点（像个肯动手的玩家）；法宝对比卡按“更强就换”点
        const eq = document.querySelector('#modal [data-eqart]');
        if (eq) { eq.click(); artEq++; await sleep(40); continue; }
        if (document.querySelector('#modal [data-gcmp]')) { await drainCards(); continue; }
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
      if ((n % 6 === 2 || (n % 3 === 0 && L.auctionOpen(st) && L.auctionBidsLeft(st) > 0)) && !X.cine && st.stats.exp >= 1) await marketRound();
      // 大势起了：点右上角的小牌看年历；筑基后每 24 周天点一次“大事”牌
      const tag = document.querySelector('#worldTag:not([hidden])');
      if (tag && tag.offsetParent && st.cal && st.cal.w && st.cal.w.at === st.tick && !X.cine && !modal()) { tag.click(); calOpen++; seen['年历'] = 1; await sleep(60); X.closeModal(); await sleep(450); await drain(); }
      else if (n % 24 === 13 && L.calOpen(st) && !X.cine && !modal()) { document.querySelector('#stats [data-s="big"]').click(); calOpen++; await sleep(60); if (title() === '年历') { seen['年历'] = 1; X.closeModal(); await sleep(450); } await drain(); }
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
      if (n % 24 === 5 && !X.cine) await artRound();
      if (n % 12 === 9 && !X.cine && L.gearOpen(st, 'plus')) await gearRound();
      if (st.p.inj > 0 && L.canHeal(st)) L.heal(st);
      if (!L.busy(st) && !L.isReady(st) && !L.isFull(st) && st.p.inj <= 0 && !X.cine && !modal()) {
        if (L.mjCan(st, true)) await realmRound(true);
        else if (L.mjCan(st) && (mjRuns < 2 || Math.floor(st.tick / 12) % 4 === 0)) await realmRound(false);
      }
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
    return { npc: JSON.stringify(st.npc), daolv: st.daolv, ach: Object.keys(st.ach).length, events: st.stats.events, bosses: st.stats.bosses, tick: st.tick, realm: L.stageName(st.p), ascended: st.p.r >= 9, age: Math.floor(st.p.age), rank: st.rank, sect: st.sect ? L.srankName(st, st.sect.rank) : '-', beaten: Object.keys(st.beaten), quests: Object.keys(st.quest.done).length + ' 条（当前第 ' + (qv.r + 1) + ' 章）', trips: st.stats.exp, gear: L.GEAR_SLOTS.map(s => st.gear[s] ? L.gearBase(st.gear[s].id).n + '+' + st.gear[s].plus : '-').join(' / ') + `；对比卡换上 ${gEq} / 熔炼 ${gSmelt} / 锁定 ${gLock}，强化点了 ${gPlus} 下，灵矿 ${st.ore}`, arts: Object.keys(st.arts.own).length + ' 门，换上 ' + artEq + ' 次（卡）/ ' + artPage + ' 次（功法页），共鸣 ' + Object.keys(st.meta.combo).length,
      realm: `进 ${mjRuns} 次、通关 ${mjClears} 次、点门 ${mjDoors} 下、最深 ${st.stats.mjDeep || 0} 层、秘境令 ${L.mjTokens(st)}`,
      market: `卖出 ${mSell} 次（共 ${st.stats.sold || 0} 灵石）/ 买轮换货 ${mBuy} 件 / 出价 ${mBid} 次、拿下 ${st.stats.auction || 0} 件、被人拍走 ${st.stats.aucLost || 0} 件 / 坊市事件 ${mEv} 件 / 年历打开 ${calOpen} 次、大势 ${Object.values(st.cal.n || {}).reduce((a, b) => a + b, 0)} 件`, retreats: st.stats.retreat, btFails: st.stats.btFails, popups, titles: Object.keys(seen) };
  });
  console.log(JSON.stringify(result, null, 1));
  await page.screenshot({ path: process.argv[2] || '/tmp/longrun.png' });
  if (!result.ascended) errors.push('这一世没有飞升（' + result.realm + '）');
  for (const k of ['行情卖出', '拍卖竞价', '年历', '秘境']) if (!result.titles.includes(k)) errors.push('机器人没用上' + k);
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e); process.exit(1); });
