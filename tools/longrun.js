// 长局测试：机器人通过界面流程玩完一世（到飞升或坐化），检查全程无报错；掉落的法宝对比卡像玩家一样点（更强换上、否则熔炼、偶尔锁定），每 12 周天去法宝页点【强化】；
// 坊市像玩家一样逛（每 6 周天）：先处理弹出的坊市事件，破境丹多了点【卖一半】，货架上打折的破境丹、轮换的法衣 / 残篇 / 器方买得起就点，拍卖会对想要的拍品点【加价】（宿敌在场点【豪掷】）；
// 大势起了点右上角小牌看年历，筑基后每 24 周天点一次“大事”牌；有灵宠后每 12 周天进兽栏：出战最强的、空着的派岗、喂兽粮、发光的点进化、名册满时放生或替换；
// 天劫：准备页把能用的护劫手段全点上，心魔劫随手选，雷劫中途那一停把能补的手段补上（临阵吞丹点到封顶）再点【继续渡劫】
// 灵田与炼丹房：每 12 周天点开一块田、一半时候改种推荐的作物；药引格里有能试的格子就【试炼】一格
// 洞府地块与阵法：每 12 周天进【洞府】，有空地就点空地 → 点“荐”的那一样建；要渡劫了点聚灵阵 →【换阵】→ 布渡劫阵，渡完换回聚灵阵
// 宿敌与新秀：论道前的对决准备页、新秀挑战里有【换上】（换成克他的战技）就先点，再点【登台】/【打压】
// 秘境开着、手里有令时偶尔（头两回，之后每 4 年一回）从历练页进去，
// 门照老祖的“荐”点，最好的门也会出事 / 气血见底就点【带着 N 件离开】，奇遇随手选，行商不买，秘藏点“荐”的那项
// 入宗后每 24 周天进【宗门】：门下收徒、派差事、能出师就出师、偶尔传授；身份页能领职司就领、给长老【送礼】；宝库六格里的功法法宝买得起就换
// 图鉴：每 40 周天打开一次逐类点一遍；飞升后从人物页点完整条轮回流程（结算 → 传承 → 轮回殿 → 出身 → 命格 → 试炼 → 投胎），再玩 30 周天第二世
// node tools/longrun.js [截图.png]   慢：一世约 800～900 周天，跑几分钟
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 400, height: 820 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (m.text().startsWith('LR ')) console.log(m.text()); });   // 进度：每 25 个周天一行（周天、境界、已用秒数）
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(120); }
  await page.click('#goStart');
  await page.waitForTimeout(300);
  const T0 = Date.now();
  const prog = setInterval(async () => { try { console.log('progress', Math.round((Date.now() - T0) / 1000) + 's', JSON.stringify(await page.evaluate(() => window.__lr || null))); } catch (e) { /* 页面忙时跳过 */ } }, 120000);
  const result = await page.evaluate(async () => {
    const X = window.__xm, L = X.L;
    X.setSpeed(3);   // 暂停：时间由下面的循环推进
    X.st.guide = { step: 99, done: true };
    setInterval(() => { const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); }, 200); // 老祖的提示一律点“好”
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const modal = () => !document.getElementById('modal').hidden;
    let duelSkips = 0, zSwap = 0, petAct = 0, petFeed = 0, popups = 0, uiBt = 0, uiExp = 0, trips = 0, artEq = 0, artPage = 0, gEq = 0, gSmelt = 0, gLock = 0, gPlus = 0, mSell = 0, mBuy = 0, mBid = 0, mEv = 0, calOpen = 0;
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
    // 雷劫中途那一停：能补的全补上，再继续
    let tribPause = 0;
    async function pauseCard() {
      tribPause++; seen['临阵一停'] = 1;
      for (const b of [...document.querySelectorAll('#modal [data-ex]:not([disabled])')]) if (!b.closest('.aid').classList.contains('on')) { b.click(); await sleep(40); }
      for (let i = 0; i < 2; i++) { const b = document.querySelector('#modal [data-exp="1"]:not([disabled])'); if (b) { b.click(); await sleep(40); } }
      const go = document.querySelector('#modal .foot .btn.gold'); if (go) go.click();
      await sleep(80);
    }
    // 兽栏：名册满时点【放生】或替换最弱的；出战那只不是最强的就点它【出战】；闲着的点【派岗】→ 推荐的岗；喂兽粮（长按一样，这里点几下）；发光的点【进化】选能选的那支
    async function petRound() {
      const st = X.st;
      X.showPets(); await sleep(40);
      const pend = document.querySelector('#modal [data-ppend]');
      if (pend) { const bs = [...document.querySelectorAll('#modal [data-ppend]')]; bs[Math.random() < 0.5 ? 0 : bs.length - 1].click(); petAct++; seen['灵宠放生替换'] = 1; await sleep(40); }
      for (let i = 0; i < st.pets.length; i++) {
        const c = document.querySelector(`#modal .pcard[data-pi="${i}"]`); if (!c) break;
        c.click(); await sleep(30);
        if (i === L.petBest(st) && i !== st.petOut) { const b = document.querySelector('#modal #petOut'); if (b) { b.click(); petAct++; await sleep(30); } }
        else if (i !== st.petOut && !st.pets[i].job && document.querySelector('#modal #petJob:not([disabled])')) {
          document.querySelector('#modal #petJob').click(); await sleep(40);
          const j = [...document.querySelectorAll('#modal .pjob:not([disabled])')].find(x => x.querySelector('.chip.ok') && x.querySelector('.chip.ok').textContent === '荐') || document.querySelector('#modal .pjob:not([disabled])');
          if (j) { j.click(); petAct++; seen['灵宠派岗'] = 1; await sleep(40); } else { X.showPets(); await sleep(40); }
        }
        const pc = document.querySelector(`#modal .pcard[data-pi="${i}"]`); if (pc) { pc.click(); await sleep(30); }
        for (let k = 0; k < 8; k++) { const f = document.querySelector('#modal #petFeed:not([disabled])'); if (!f) break; f.click(); petFeed++; seen['灵宠喂食'] = 1; await sleep(25); }
        const ev = document.querySelector('#modal #petEvo.gold, #modal #petAwake');
        if (ev) {
          ev.click(); await sleep(60);
          const b = [...document.querySelectorAll('#modal [data-evo]:not([disabled])')][0] || (document.querySelector('#modal h2').textContent.startsWith('觉醒') ? document.querySelector('#modal .foot .btn.gold') : null);
          if (b) { b.click(); petAct++; seen['灵宠进化'] = 1; await sleep(1500); }
          X.showPets(); await sleep(40);
        }
      }
      X.closeModal(); await sleep(450); await drain();
    }
    // 宗门（SYSTEMS §11）：门下收徒（候选点第一个）、给徒弟派差事（没到顶闭门苦修、到顶当值）、能出师就点【出师】、偶尔点【传授】；
    //   身份页给能送的长老【送礼】；宝库六格里买得起的功法、法宝点一下（走揭晓卡 / 对比卡）；能领职司就领
    let sectAct = 0, discTaken = 0, gifts = 0, vaultN = 0;
    async function sectRound() {
      const st = X.st;
      X.showSect('disc'); await sleep(40);
      const tk = document.querySelector('#modal [data-dtake]');
      if (tk) { tk.click(); discTaken++; seen['收徒'] = 1; await sleep(450); await drain(); X.showSect('disc'); await sleep(40); }
      for (let i = 0; i < (st.disc ? st.disc.list.length : 0); i++) {
        const c = document.querySelector(`#modal .dcard[data-di="${i}"]`); if (!c) break;
        c.click(); await sleep(30);
        const x = st.disc.list[i], want = x.di < L.discMax(st) - 0.3 ? 'cult' : 'duty';
        const j = document.querySelector(`#modal [data-dj="${want}"]:not([disabled])`); if (j) { j.click(); sectAct++; seen['徒弟差事'] = 1; await sleep(30); }
        const g = document.querySelector('#modal #discGrad:not([disabled])');
        if (g && (st.sect.rank < 4 || st.disc.list.length >= 3)) { g.click(); sectAct++; seen['出师'] = 1; await sleep(60); await drain(); X.showSect('disc'); await sleep(40); continue; }
        const te = document.querySelector('#modal #discTeach:not([disabled])');
        if (te && !L.busy(st) && Math.random() < 0.3) { te.click(); await sleep(40); const d = document.querySelector('#modal [data-dt]'); if (d) { d.click(); sectAct++; seen['传授'] = 1; await sleep(450); await drain(); } break; }
      }
      if (!modal()) { X.showSect('id'); await sleep(40); } else { X.showSect('id'); await sleep(40); }
      const dk = document.querySelector('#modal #btnDuty:not([disabled])');
      if (dk && !L.duty(st)) { dk.click(); await sleep(40); const d = document.querySelector('#modal [data-duty]:not([disabled])'); if (d) { d.click(); sectAct++; seen['职司'] = 1; await sleep(60); } X.showSect('id'); await sleep(40); }
      for (const b of [...document.querySelectorAll('#modal [data-gift]:not([disabled])')].slice(0, 2)) { b.click(); gifts++; seen['宗门送礼'] = 1; await sleep(40); }
      X.showSect('vault'); await sleep(40);
      for (let k = 0; k < 2; k++) {
        const b = [...document.querySelectorAll('#modal [data-vr]:not([disabled])')].find(x => /《|法宝|兵器|法衣|饰品/.test(x.closest('.card').textContent));
        if (!b) break;
        b.click(); vaultN++; seen['宗门宝库'] = 1; await sleep(120); await drain();
        if (!modal()) break;
        X.showSect('vault'); await sleep(40);
      }
      if (modal()) X.closeModal(); await sleep(450); await drain();
    }
    // 灵田与炼丹房：每 12 周天点开一块田、一半时候改种列表第一项（老祖推荐的）；药引格里有能试的格子就【试炼】一格
    async function fieldAlchRound() {
      const st = X.st;
      if (L.cropsOpen(st)) {
        X.showField(Math.floor(Math.random() * L.plotCount(st))); await sleep(40);
        const b = document.querySelector('#modal [data-crop]:not([disabled])');
        if (b && Math.random() < 0.5) { b.click(); seen['灵田改种'] = 1; await sleep(40); }
        X.closeModal(); await sleep(450);
      }
      if (st.home.furnace && L.yinOpen(st)) {
        X.showAlchemy(); await sleep(40);
        const g = document.querySelector('#modal [data-tab="grid"]'); if (g) { g.click(); await sleep(40); }
        const c = document.querySelector('#modal .yc.can');
        if (c) { c.click(); await sleep(40); const t = document.querySelector('#modal #btnTrial:not([disabled])'); if (t) { t.click(); seen['丹方试炼'] = 1; await sleep(1400); } }
        X.closeModal(); await sleep(450);
      }
      await drain();
    }
    // 洞府地块与阵法（SYSTEMS §6.1 / §6.3）：空地点开，建列表第一项（老祖推荐的）；阵法页按“荐”布阵（要渡劫了荐渡劫阵，平时荐聚灵）
    async function homeRound() {
      const st = X.st;
      X.showHome(); await sleep(40);
      const t = document.querySelector('#modal .hplot.can');
      if (t) { t.click(); await sleep(40); const b = document.querySelector('#modal [data-build]:not([disabled])'); if (b) { b.click(); seen['洞府建造'] = 1; builds++; await sleep(40); } }
      if (L.zhenOpen(st)) {
        X.showZhen(); await sleep(40);
        const rec = document.querySelector('#modal .crow .chip.warn');
        const row = rec && rec.closest('.crow'), b = row && row.querySelector('[data-zs="0"]:not([disabled])');
        if (b && b.textContent !== '不换了') { b.click(); seen['换阵'] = 1; zhenSets++; await sleep(40); }
      }
      if (modal()) X.closeModal(); await sleep(450); await drain();
    }
    // 图鉴（SYSTEMS §15）：每隔一阵打开【人物】→ 图鉴，逐类点一遍，奇遇链页看进度
    let cxOpen = 0;
    async function codexRound() {
      X.showMe('codex'); await sleep(40);
      for (const b of [...document.querySelectorAll('#modal [data-cx]')]) { if (!document.querySelector('#modal [data-cx]')) break; const again = document.querySelector(`#modal [data-cx="${b.dataset.cx}"]`); if (again) { again.click(); await sleep(15); } }
      if (title() === '人物' || document.querySelector('#cxGrid')) { cxOpen++; seen['图鉴'] = 1; }
      X.closeModal(); await sleep(450); await drain();
    }
    async function drain() {
      for (let guard = 0; guard < 600; guard++) {
        if (guard % 100 === 99) console.log(`LR drain guard=${guard} modal=${modal()} title=${(document.querySelector('#modal h2') || {}).textContent} cine=${!!X.cine} duel=${!!X.duelFx}`);
        if (document.querySelector('#tribPause')) { await pauseCard(); continue; }
        if (X.cine) { await sleep(120); continue; }
        if (X.duelFx && !X.duelFx.ended) { X.duelSkip(); duelSkips++; await sleep(40); continue; }   // 场景内对决：机器人一律直接跳过（跳过后收尾 0.26 秒）
        if (!modal()) { await sleep(450); if (!modal() && !X.cine) return; continue; }
        const title = document.querySelector('#modal h2'); if (title) seen[title.textContent.replace(/\d+/g, 'N')] = 1;
        const cand = document.querySelector('#modal .cand:not(.hide):not(.sel)');
        if (cand && !document.querySelector('#modal .cand.sel')) { cand.click(); await sleep(40); continue; }
        const chs = [...document.querySelectorAll('#modal .choices .btn:not([disabled])')];
        if (chs.length) { popups++; chs[Math.floor(Math.random() * chs.length)].click(); await sleep(60); continue; }
        // 掉落卡、结算卡上的【换上】照点（像个肯动手的玩家）；法宝对比卡按“更强就换”点
        // 论道前的对决准备 / 新秀挑战：有【换上】（换成克他的战技：胜算 p → p'）就先点
        const zs = document.querySelector('#modal [data-zswap]');
        if (zs) { zs.click(); zSwap++; await sleep(40); continue; }
        const eq = document.querySelector('#modal [data-eqart]');
        if (eq) { eq.click(); artEq++; await sleep(40); continue; }
        if (document.querySelector('#modal [data-gcmp]')) { await drainCards(); continue; }
        const btns = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')];
        if (!btns.length) { if (document.querySelector('#modal .close')) { X.closeModal(); await sleep(450); } else await sleep(120); continue; }   // 没有底部按钮的面板（洞府、历练页）：点右上角关掉，别干等
        popups++;
        // 结算卡上不点“再探一次”，回洞府自己安排
        const back = btns.find(b => b.textContent === '回洞府');
        (back || btns[btns.length - 1]).click();
        await sleep(50);
      }
    }
    const W = { array: 1, field: 1.25, furnace: 1.8, cave: 2.4, room: 2.2, vault: 2.4, library: 2.6, forge: 2.6, pen: 3, spring: 3.2, pavilion: 4, portal: 4 };
    let builds = 0, zhenSets = 0;
    const T0 = Date.now();
    for (let n = 0; n < 1600; n++) {
      window.__lr = { n, tick: X.st.tick, r: X.st.p.r, modal: modal() ? title() : '', cine: !!X.cine };
      const st = X.st;
      if (n % 25 === 0) console.log(`LR n=${n} tick=${st && st.tick} r=${st && st.p.r} ${Math.round((Date.now() - T0) / 1000)}s duelSkips=${duelSkips} popups=${popups}`);
      if (!st || st.p.r >= 9) break;
      if (L.isReady(st)) {
        if (st.p.inj > 0) L.heal(st);
        while (st.pills < 3 && st.stones > L.price(st, 'pill') * 2 && !L.btGuard(st)) L.buy(st, 'pill');
        while (L.tribNeeded(st) && st.pills < 5 && st.stones > L.price(st, 'pill') * 2) L.buy(st, 'pill');
        if (uiBt < 6) {
          uiBt++; X.showBreakthrough(); await sleep(40);
          for (const b of [...document.querySelectorAll('#modal [data-aid]:not([disabled])')]) if (!b.closest('.aid').classList.contains('on')) { b.click(); await sleep(40); }
          document.querySelector('#modal .foot .btn.gold').click(); await drain();
        } else {
          const pre = L.tribPre(st);
          if (pre) { X.showTribStory(pre, () => X.closeModal()); await sleep(40); await drain(); }
          L.breakthrough(st, Math.min(3, st.pills), { aids: 'all', extra: 'all' });
        }
        if (st.p.r >= 9) { await drain(); break; }
      }
      for (let loop = 0; loop < 20; loop++) {
        const opts = L.HOME.filter(b => L.homeOpen(st, b.k) && st.home[b.k] < b.max && W[b.k] && !(b.nu && !st.home[b.k])).map(b => [b.k, L.hCost(b.k, st.home[b.k])]).sort((a, b) => a[1] * W[a[0]] - b[1] * W[b[0]]);
        if (!opts.length || !L.upgrade(st, opts[0][0])) break;
      }
      if (st.pills < 2 && st.stones > L.price(st, 'pill') * 4) L.buy(st, 'pill');
      if (st.stats.exp >= 1 && st.stones > L.price(st, 'box') * 3) L.buy(st, 'box');
      if (L.marketOpen(st, 'egg') && L.petCount(st) < L.petCap(st) && st.stones > L.price(st, 'egg') * 3) { const r = L.buy(st, 'egg'); if (r && r.it) { X.revealItem(r.it); await drain(); } }
      if (L.petCount(st) && L.marketOpen(st, 'feed') && st.stones > L.price(st, 'feed') * 6) L.buy(st, 'feed');
      if (L.lifeLow(st) && L.marketOpen(st, 'life') && st.stones > L.price(st, 'life')) L.buy(st, 'life');
      if ((n % 6 === 2 || (n % 3 === 0 && L.auctionOpen(st) && L.auctionBidsLeft(st) > 0)) && !X.cine && st.stats.exp >= 1) await marketRound();
      if (n % 12 === 7 && !X.cine && !modal()) await fieldAlchRound();
      // 洞府：每 12 周天一轮；快圆满要渡劫时每周天看一眼阵法（布渡劫阵），刚突破完换回聚灵
      const zSoon = L.zhenOpen(st) && L.zhenOwned(st, 'f_dujie') && L.tribNeeded(st) && st.p.s === 3 && !L.zhenWhere(st, 'f_dujie') && (L.isFull(st) || L.ticksToNext(st) <= 5);
      const zBack = L.zhenOpen(st) && L.zhenState(st)[0].id === 'f_dujie' && !L.zhenState(st)[0].nx && st.p.s < 3;
      if ((n % 12 === 5 || zSoon || zBack) && L.home2On() && !X.cine && !modal()) await homeRound();
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
      if (n % 40 === 11 && !X.cine && !modal()) await codexRound();
      if (n % 12 === 9 && !X.cine && L.gearOpen(st, 'plus')) await gearRound();
      if (n % 12 === 3 && !X.cine && (L.petCount(st) || st.petPend.length)) await petRound();
      if (n % 24 === 17 && !X.cine && st.sect && !modal()) await sectRound();
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
    const res = { home: L.homePlots(st).filter(Boolean).map(k => L.HOME_B[k].n + st.home[k]).join(' ') + `；建造 ${builds} 次、换阵 ${zhenSets} 次、阵图 ${L.zhenOwnList(st).length} 张`, npc: JSON.stringify(st.npc), daolv: st.daolv, ach: Object.keys(st.ach).length, events: st.stats.events, bosses: st.stats.bosses, tick: st.tick, realm: L.stageName(st.p), ascended: st.p.r >= 9, age: Math.floor(st.p.age), rank: st.rank, sect: st.sect ? L.srankName(st, st.sect.rank) : '-', beaten: Object.keys(st.beaten), quests: Object.keys(st.quest.done).length + ' 条（当前第 ' + (qv.r + 1) + ' 章）', trips: st.stats.exp, gear: L.GEAR_SLOTS.map(s => st.gear[s] ? L.gearBase(st.gear[s].id).n + '+' + st.gear[s].plus : '-').join(' / ') + `；对比卡换上 ${gEq} / 熔炼 ${gSmelt} / 锁定 ${gLock}，强化点了 ${gPlus} 下，灵矿 ${st.ore}`, arts: Object.keys(st.arts.own).length + ' 门，换上 ' + artEq + ' 次（卡）/ ' + artPage + ' 次（功法页），共鸣 ' + Object.keys(st.meta.combo).length,
      market: `卖出 ${mSell} 次（共 ${st.stats.sold || 0} 灵石）/ 买轮换货 ${mBuy} 件 / 出价 ${mBid} 次、拿下 ${st.stats.auction || 0} 件、被人拍走 ${st.stats.aucLost || 0} 件 / 坊市事件 ${mEv} 件 / 年历打开 ${calOpen} 次、大势 ${Object.values(st.cal.n || {}).reduce((a, b) => a + b, 0)} 件`,
      duelSkips,
      pets: `名册 ${st.pets.map(p => L.petName(p) + ' Lv' + p.lv + (p.aw ? '觉醒' : '') + (p.job ? '·' + L.PET_JOB[p.job].n : '')).join('、')} / 出战 ${L.petOut(st) ? L.petName(L.petOut(st)) : '-'} / 点兽栏 ${petAct} 次、喂 ${petFeed} 口、进化 ${st.stats.petEvo || 0} 次、觉醒 ${st.stats.petAwake || 0} 次`, retreats: st.stats.retreat, btFails: st.stats.btFails, popups, titles: Object.keys(seen),
      mijing: `进 ${mjRuns} 次、通关 ${mjClears} 次、点门 ${mjDoors} 下、最深 ${st.stats.mjDeep || 0} 层、秘境令 ${L.mjTokens(st)}`,
      zongmen: st.sect ? `${L.srankName(st, st.sect.rank)} · 职司 ${L.duty(st) ? L.DUTIES[L.duty(st)].n : '-'} · 长老 ${L.eldersOf(st).map(e => e.n + ' ' + L.favor(st, e.id)).join('、')} · 送礼 ${gifts} 次 · 宝库换 ${vaultN} 件 · 收徒 ${discTaken}（门下 ${st.disc ? st.disc.list.length : 0}、出师 ${st.stats.discGrad || 0}、传授 ${st.stats.discTeach || 0}）· 三人会武 ${st.stats.trioWins || 0}/${st.stats.trioRounds || 0} · 点宗门 ${sectAct} 下` : '-',
      rivals: `论道前换战技 ${zSwap} 次 / 新秀 ${(st.rv2 && st.rv2.rkN) || 0} 位（打压 ${(st.rv2 && st.rv2.crush) || 0}、指点 ${(st.rv2 && st.rv2.teach) || 0}、输 ${(st.rv2 && st.rv2.lost) || 0}）/ 恩怨 ${JSON.stringify(st.grudge || {})} / 伏击 ${(st.rv2 && st.rv2.ambush) || 0}`,
      dan: `灵田 ${L.plots(st).map(x => L.CROP[x.c].n).join('、')} / 丹方 ${L.recipeCount(st)}/${L.YIN_GRID.length} / 炼丹 ${st.stats.crafts} 炉 / 丹毒 ${Math.round(st.toxin || 0)}` };
    // 轮回流程（SYSTEMS §16）：飞升后从【人物】点【再入轮回】→ 结算 → 传承 → 轮回殿（买得起的点亮）→ 出身（点亮了的随机选一个）→ 命格 → 天道试炼（随机选一两条）→ 投胎 → 出身开场；再玩 30 周天第二世
    res.life2 = 'not-tried';
    if (st.p.r >= 9) {
      const dg = L.daoFruit(st).total;
      X.showMe('attr'); await sleep(60);
      const rb = document.querySelector('#btnReborn');
      if (!rb) res.life2 = '人物页没有再入轮回按钮';
      else {
        rb.click(); await sleep(300); seen['人物页再入轮回'] = 1;
        let hallDone = 0;
        for (let g = 0; g < 40 && X.st.rebirth === 0; g++) {
          const t = title();
          if (/选择天赋/.test(t)) {
            for (let k = 0; k < 20 && !document.querySelector('#modal .cand:not(.hide)'); k++) await sleep(250);
            const c = document.querySelector('#modal .cand:not(.hide)'); if (c) c.click(); await sleep(60);
            const f = document.querySelector('#modal .foot .btn.gold:not([disabled])'); if (f) f.click(); await sleep(200); continue;
          }
          if (t === '轮回殿' && !hallDone) {
            hallDone = 1;
            for (const h of L.HALL) { const b = document.querySelector(`#modal [data-h="${h.id}"]`); if (!b) continue; b.click(); await sleep(30); const buy = document.querySelector('#hallBuy:not([disabled])'); if (buy) { buy.click(); seen['轮回殿点亮'] = 1; await sleep(40); } }
          }
          if (t === '传承') for (const sel of ['[data-la]', '[data-lg]', '[data-lp]']) { const b = document.querySelector('#modal ' + sel); if (b) { b.click(); await sleep(40); } }
          if (t === '出身') { const os = [...document.querySelectorAll('#modal [data-o]:not([disabled])')]; if (os.length) { os[Math.floor(Math.random() * os.length)].click(); await sleep(60); } }
          if (t === '天道试炼') { const rs = [...document.querySelectorAll('#modal [data-tr]')]; for (const r of rs.filter(() => Math.random() < 0.25)) { r.click(); await sleep(40); } }
          if (t) seen[t] = 1;
          const f = document.querySelector('#modal .foot .btn.gold:not([disabled])') || document.querySelector('#modal .foot .btn:not([disabled])');
          if (f) f.click(); await sleep(300);
        }
        const s2 = X.st;
        if (s2.rebirth !== 1) res.life2 = '没有转世成功（' + title() + '）';
        else {
          await drain();
          for (let w = 0; w < 30; w++) { L.flow(s2, 1); X.onTick(); await drain(); }
          res.life2 = `第 2 世：出身 ${s2.origin}、试炼 ${s2.trials.join('/') || '无'}、周天 ${s2.tick}、境界 ${s2.p.r}、图鉴 ${L.codexCells(s2)} 格、道果 ${s2.meta.daoguo}（上一世 +${dg}）`;
          res.life2ok = s2.tick >= 25 && L.codexCells(s2) > 0;
        }
      }
    }
    res.codexOpen = cxOpen;
    return res;
  });
  clearInterval(prog);
  console.log(JSON.stringify(result, null, 1));
  await page.screenshot({ path: process.argv[2] || '/tmp/longrun.png' });
  if (!result.ascended) errors.push('这一世没有飞升（' + result.realm + '）');
  if (!result.life2ok) errors.push('轮回流程：' + result.life2);
  if (!result.codexOpen) errors.push('机器人没有打开过图鉴');
  // 灵宠派岗不强求：新灵宠进名册时已自动派到推荐的空岗，机器人只在有闲着的时才点派岗（派岗卡由 shot.js 测）
  for (const k of ['行情卖出', '拍卖竞价', '年历', '灵宠喂食', '灵宠进化', '秘境', '收徒', '宗门送礼', '宗门宝库']) if (!result.titles.includes(k)) errors.push('机器人没用上' + k);
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e); process.exit(1); });
