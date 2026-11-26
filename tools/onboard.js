// 上手曲线审计（docs/ONBOARDING.md）：一个照着老祖走的新玩家（×1 速，不开加速）从开场玩到 N 分钟，
// 按“真实手表时间”每 2 分钟记一行：主界面上看得见的按钮 / 数值格 / 角标 / 入口数，各面板一打开的分页数、行数、按钮数、字数，
// 这一段弹了几段阻塞讲解 / 气泡 / 横幅 / 弹窗，第一次出现的系统名词；每段讲解、每次解锁截一张图。
// 手表时间按读字算：讲解 4 秒 + 每 12 字 1 秒；弹窗 3 秒 + 每 20 字 1 秒（最多 15 秒）；机器人自己点开面板出发 4 秒；
// 每周天 = 游戏里 ×1 的真实时长（window.__xm.tickMs，旧版没有就是 5 秒）。
// node tools/onboard.js <输出目录> [分钟=90] [--assert]
//   --assert：按 docs/ONBOARDING.md §6 的目标核对（每 10 分钟阻塞讲解数、新概念数、主界面可见元素数），不过就退出码 1
//
// 全程手表机器人（docs/KAIRO_PLAN.md §3.6）：node tools/onboard.js --life [种子数=12] [输出.md] [--assert]
//   不开浏览器：照 tools/sim.js 的 guided 玩完第一世（逻辑与界面同一份 L），按“手表”记时间——
//   每个月 = L.monthSec(st)（×1；打坐 / 历练 / 闭关三态）；每个决定按方案 §3.4 的估算口径记读与点的秒数（见下面 COST）；
//   解锁卡之间的“≥ 6 分钟真实时间”用这块手表判（L.onbHold），和界面一样。输出各章手表分钟、全程分钟，对照 §3.4 的逐章预算（±20%）。
//   --assert：全程 270～360 分钟、第一章 22～28 分钟不过就退出码 1。
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ASSERT = process.argv.includes('--assert');
if (process.argv.includes('--life')) { lifeWatch(); return; }
const { chromium, devices } = require('playwright');
const out = args[0] || 'onboard'; const MIN = +(args[1] || 90);
fs.mkdirSync(out, { recursive: true });
const URL = 'file://' + (process.env.ONB_DIST ? path.resolve(process.env.ONB_DIST, 'index.html') : path.join(__dirname, '..', 'dist', 'index.html'));
// 系统名词：第一次出现在讲解 / 气泡 / 横幅 / 弹窗标题里就记一笔（同义的归到一个概念）
const TERMS = [
  ['历练', /历练/], ['洞府·聚灵阵', /聚灵阵/], ['札记', /札记/], ['坊市', /坊市/], ['行事·采药', /采药/], ['行事·寻宝', /寻宝/], ['深度·腹地', /腹地/],
  ['闭关', /闭关/], ['访客', /访客|门口有人/], ['吐纳', /吐纳|运一个周天/], ['法宝对比·熔炼', /熔炼|换上/], ['灵田', /灵田/], ['丹炉·炼丹', /丹炉|炼丹|培元丹/],
  ['突破', /突破|冲击筑基/], ['锦囊', /锦囊/], ['天骄论道', /论道/], ['天骄榜', /天骄榜/], ['宗门·任务板', /任务板|入宗/], ['宝库', /宝库/], ['职司', /职司/], ['徒弟', /徒弟|收徒/],
  ['九宗会武', /会武/], ['灵宠', /灵宠|灵兽蛋|兽栏/], ['灵宠岗位', /岗位/], ['灵宠进化', /进化/], ['年历·四季', /年历|入春|入夏|入秋|入冬|开春/], ['天下大势', /天下大势|大旱|兽潮|商路断|灵气潮汐/],
  ['行情·出售', /行情|卖东西|全卖/], ['拍卖', /拍卖/], ['轮换货', /轮换货/], ['秘境', /秘境/], ['天劫·护劫', /雷劫|护劫|天劫/], ['丹毒', /丹毒/], ['道心', /道心/], ['因果', /因果/],
  ['功法·心法', /心法|功法/], ['战技·五行', /战技|五行|克木|克金/], ['秘术', /秘术/], ['共鸣', /共鸣/], ['法衣', /法衣/], ['饰品', /饰品/], ['强化·灵矿', /强化|灵矿/],
  ['洞府地块·建筑', /地块|能建了|扩建/], ['阵法', /阵法|渡劫阵|换阵/], ['送礼', /送礼/], ['委托', /委托/], ['同伴', /同伴/], ['道侣', /道侣/], ['首领', /首领/], ['宿敌', /宿敌|克制/],
  ['新秀', /新秀/], ['通缉令', /通缉令|悬赏/], ['图鉴', /图鉴/], ['奇遇链', /奇遇链|残片/], ['连续历练', /连续 ×3|连续×3/], ['器炉·打造', /器炉|打造|器方/], ['药引丹方', /药引/], ['轮回', /轮回|转世/],
];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const ctx360 = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL);
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => window.__xm.setSpeed(3));   // 时间由机器人一格一格推（按 ×1 的真实时长记手表）
  // 横幅、浮字：MutationObserver 记下来（带周天）
  await ev(() => {
    const X = window.__xm; window.__onb = { banners: [], floats: 0 };
    new MutationObserver(() => { const t = document.getElementById('banner').textContent; if (t) window.__onb.banners.push({ tick: X.st.tick, t }); }).observe(document.getElementById('banner'), { childList: true, subtree: true });
    new MutationObserver(ms => { for (const m of ms) window.__onb.floats += m.addedNodes.length; }).observe(document.getElementById('fx'), { childList: true });
  });
  const tickMs = await ev(() => window.__xm.tickMs || 5000);
  let clock = 40;   // 开场四格画 + 起名
  await ev(() => { window.__xm.watch = () => window.__onbClock || 0; });   // 解锁卡之间的“≥ 6 分钟”按这块手表判（clock.js 的 L.onbHold）
  // 在外零打断（KAIRO_PLAN §3.6）：人在外面（历练 / 闭关）时出现的讲解、气泡、横幅、弹窗（途中遭遇除外）都记一笔
  const awayHits = [], actives = [];
  let lastBan = 0;
  const awayCheck = async s => {
    const a = await ev(() => { const X = window.__xm, st = X.st; const m = !document.getElementById('modal').hidden; return { away: !!(st.exp || st.retreat), enc: !!(st.exp && st.exp.encEv), modal: m, choices: m && !!document.querySelector('#modal .choices'), tip: !document.getElementById('tip').hidden, ban: window.__onb.banners.length, gid: X.guideCur && X.guideCur.id, title: (document.querySelector('#modal h2') || {}).textContent || '' }; });
    const newBan = a.ban > lastBan; lastBan = a.ban;
    if (a.away) {
      if (a.tip) awayHits.push({ tick: s.tick, clock, what: '气泡' });
      if (newBan) awayHits.push({ tick: s.tick, clock, what: '横幅' });
      if (a.gid) awayHits.push({ tick: s.tick, clock, what: '讲解 ' + a.gid });
      if (a.modal && !(a.choices && a.enc)) awayHits.push({ tick: s.tick, clock, what: '弹窗 ' + a.title });
    } else if (a.tip || a.gid || (a.modal && a.choices)) actives.push({ tick: s.tick, clock, what: a.tip ? '气泡' : a.gid ? '讲解 ' + a.gid : '事件 ' + a.title });
  };
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const guides = [], bubbles = [], modals = [], unlocks = [], first = {};
  let gn = 0, seenB = new Set(), seenBan = 0;
  const noteTerms = (txt, src) => { for (const [k, re] of TERMS) if (!first[k] && re.test(txt)) first[k] = { clock, src, txt: txt.slice(0, 50) }; };
  const state = () => ev(() => { const X = window.__xm, st = X.st; return { tick: st.tick, g: X.guideCur, gHidden: document.getElementById('guide').hidden, text: document.querySelector('#guide .gtext').textContent, modal: !document.getElementById('modal').hidden, title: (document.querySelector('#modal h2') || {}).textContent || '', mtext: (document.querySelector('#modal .sheet') || {}).innerText || '', mbtn: document.querySelectorAll('#modal button').length, duel: !!X.duelFx, cine: X.cine, paused: !!(X.cineState && X.cineState.paused), blog: X.bubbleLog.map(b => b.key + '|' + b.text.replace(/<[^>]+>/g, '')), onb: st.onb ? Object.keys(st.onb.at || {}) : [] }; });
  const handleGuide = async s => {
    if (s.gHidden || !s.g) return false;
    gn++;
    const name = `g${String(gn).padStart(2, '0')}-${fmtT(clock).replace(':', 'm')}-t${s.tick}-${s.g.id}`;
    await page.waitForTimeout(250);
    if (clock < 60 * 60) await page.screenshot({ path: `${out}/${name}.png` });
    guides.push({ n: gn, tick: s.tick, clock, id: s.g.id, btn: !!s.g.btn, text: s.text });
    noteTerms(s.text, '讲解 ' + s.g.id);
    clock += 4 + s.text.length / 12;
    if (s.g.btn) await ev(() => { const b = document.querySelector('#guide [data-g="ok"]'); if (b) b.click(); });
    else await ev(t => { const el = document.querySelector(t); if (el) el.click(); }, s.g.target);
    await page.waitForTimeout(300);
    return true;
  };
  const handleModal = async s => {
    if (!s.modal) return false;
    modals.push({ tick: s.tick, clock, title: s.title, chars: s.mtext.length, btns: s.mbtn });
    noteTerms(s.title, '弹窗');
    clock += Math.min(15, 3 + s.mtext.length / 20);
    if (s.duel || await ev(() => !!document.querySelector('#modal.duel-m'))) {
      for (let i = 0; i < 20 && await ev(() => !!document.querySelector('#modal.duel-m')); i++) { await page.waitForTimeout(400); await ev(() => { const b = document.querySelector('#modal .foot .btn'); if (b && b.textContent !== '跳过') b.click(); }); }
      clock += 4;
      return true;
    }
    const ch = await page.$('#modal .choices .btn:not([disabled])');
    if (ch) { await ch.click(); await page.waitForTimeout(250); return true; }
    if (s.cine) { const g = await page.$('#modal .foot .btn.gold:not([disabled])'); if (g) await g.click(); else await ev(() => window.__xm.closeModal()); await page.waitForTimeout(300); return true; }
    if (/突破|天劫/.test(s.title)) { await ev(() => { const b = document.querySelector('#modal .foot .btn.gold'); if (b) b.click(); }); for (let i = 0; i < 40 && await ev(() => window.__xm.cine); i++) await page.waitForTimeout(200); clock += 6; return true; }
    const go = await page.$('#modal .foot .btn.gold:not([disabled])');
    if (go && /拜入|登台|为宗门|接受特训|知道了|谢|继续|下一|落幕|回洞府|好|就这样上|新的一年/.test(await go.textContent())) { await go.click(); await page.waitForTimeout(250); return true; }
    await ev(() => window.__xm.closeModal()); await page.waitForTimeout(250);
    return true;
  };
  // 机器人：和 tools/guide30.js 一样照问老祖的第一条做；只用界面上看得见的东西（坊市、灵田、丹炉没出现就不碰）
  const act = async () => {
    const what = await ev(() => {
      const X = window.__xm, { st, L } = X;
      if (!st.guide.done) return '';
      const vis = k => (X.UI && X.UI.isOpen ? X.UI.isOpen(k) : true);
      if (L.isReady(st)) { X.showBreakthrough(); return 'bt'; }
      if (L.tunaReady(st) && vis('tuna')) { L.tuna(st); }
      if (L.busy(st)) return '';
      if (st.p.inj > 0 && L.canHeal(st)) { X.showHome(); const h = document.querySelector('#btnHeal'); if (h) h.click(); X.closeModal(); return 'heal'; }
      if (st.visitor) { X.showVisitor(); return 'visit'; }
      for (const k of ['array', 'field', 'furnace']) { if (!L.homeOpen(st, k) || (k !== 'array' && !vis(k))) continue; const u = L.upInfo(st, k); if (!u.max && !u.lock && u.cost && st.stones >= u.cost * 1.3) { L.upgrade(st, k); return 'up:' + k; } }
      if (L.canRetreat(st) && L.ticksToStage(st, L.si(st.p) + 1) <= 6 && L.retInfo(st).save > 0) { L.startRetreat(st); return 'retreat'; }
      if (st.p.r <= L.MAXR && !L.isFull(st)) { const b = L.expBest(st); if (L.expBlock && L.expBlock(st, b.k)) return ''; const a = st.stats.exp % 3 === 1 && L.apprOpen(st, 2) ? 2 : b.a; X.confirmExp(b.k, b.d, a); return 'exp'; }
      return '';
    });
    if (what === 'exp') { clock += 4; await page.waitForTimeout(350); const s = await state(); if (!(await handleGuide(s))) { await ev(() => { const b = document.querySelector('#modal .foot .btn.gold'); if (b) b.click(); }); } }
    if (what === 'bt') { await page.waitForTimeout(350); const s = await state(); if (!(await handleGuide(s))) await handleModal(await state()); }
    if (what === 'visit' || what === 'heal' || /^up/.test(what) || what === 'retreat') clock += 3;
  };
  // 一个“现在这一刻”的普查：主界面看得见的东西 + 把存档搬进第二个页面挨个打开面板数
  const census = async () => {
    const main = await ev(() => {
      const X = window.__xm, st = X.st, L = X.L;
      const vis = el => !!el && !el.hidden && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
      const q = s => [...document.querySelectorAll(s)].filter(vis).length;
      const nav = q('#nav button');
      const cells = q('#stats button') + q('#top .res');
      const badges = q('#nav .badge');
      const other = q('#top .iconbtn') + q('#btnSpeed') + q('#goal') + q('#worldTag') + q('#guideAv') + q('#toxBox') + q('#sceneTL > span') + q('#cult');
      // 场景里能点的东西：访客“！”、灵田、出战灵宠、建筑（逻辑层算）
      const scene = (st.visitor ? 1 : 0) + (L.plotCount ? L.plotCount(st) : 0) + (L.petOut && L.petOut(st) ? 1 : 0) + Object.keys(st.home || {}).filter(k => !['array', 'cave', 'plots'].includes(k) && typeof st.home[k] === 'number' && st.home[k] > 0).length;
      return { nav, cells, badges, other, scene, total: nav + cells + badges + other + scene, badgeTxt: [...document.querySelectorAll('#nav .badge')].map(x => x.textContent).join(''), json: JSON.stringify(st) };
    });
    // 两种屏：Pixel 7（412×915）与 360×640；每 10 / 30 / 60 分钟把各面板也截一张
    const shotAt = [600, 1800, 3600].includes(nextCensus) ? nextCensus / 60 : 0;
    const panelsOn = async (c2, tag) => {
      const p2 = await c2.newPage();
      p2.on('pageerror', e => errs.push('census: ' + e.message));
      await p2.goto(URL); await p2.waitForTimeout(300);
      const navs = await p2.evaluate(js => {
        const X = window.__xm; X.setSpeed(3);
        if (!X.loadState(JSON.parse(js))) return null;
        document.getElementById('intro').hidden = true;
        const st = X.st; st.guide.done = true; for (const h of X.hints) st.hintSeen[h.id] = 1;
        X.closeModal();
        return [...document.querySelectorAll('#nav button')].filter(b => !b.hidden && b.offsetParent).map(b => b.dataset.nav).filter(k => !(st.exp && k === 'exp'));
      }, main.json);
      const res = {};
      for (const k of navs || []) {
        res[k] = await p2.evaluate(k => {
          const X = window.__xm;
          const OPEN = { exp: () => X.showExp(), home: () => X.showHome(), sect: () => X.showSect(), market: () => X.showMarket(), me: () => X.showMe() };
          try { X.closeModal(); OPEN[k](); } catch (e) { return { err: e.message.slice(0, 60) }; }
          return null;
        }, k);
        await p2.waitForTimeout(450);   // 纸卷上拉的动画走完再量、再截
        res[k] = res[k] || await p2.evaluate(() => {
          const s = document.querySelector('#modal .sheet'); if (!s) return null;
          const vis = el => !!el && !el.hidden && el.offsetParent !== null && !el.closest('details:not([open]) > :not(summary)');
          const all = sel => [...s.querySelectorAll(sel)].filter(vis).length;
          // 手机适配：第一屏最小字号、要滚几屏、主按钮（金色）在不在第一屏
          const vh = window.innerHeight, body = s.querySelector('.body');
          let minFs = 99, cAll = 0, cSmall = 0, cMain = 0, cMainS = 0; for (const el of s.querySelectorAll('*')) { if (!vis(el)) continue; const tx = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(''); if (!tx) continue; const r = el.getBoundingClientRect(); if (r.top > vh) continue; const f = parseFloat(getComputedStyle(el).fontSize); minFs = Math.min(minFs, f); cAll += tx.length; if (f < 14) cSmall += tx.length; if (!el.closest('.muted, small, .chip, .sub, .tabs, details')) { cMain += tx.length; if (f < 14) cMainS += tx.length; } }
          const small = cAll ? Math.round(cSmall / cAll * 100) : 0, mainSmall = cMain ? Math.round(cMainS / cMain * 100) : 0;
          const gold = [...s.querySelectorAll('.btn.gold')].filter(vis)[0];
          const goldVis = !gold || gold.getBoundingClientRect().bottom <= vh;
          return { tabs: all('.tabs button'), rows: all('.card') + all('dt') + all('.ach') + all('.ladder > div') + all('.hplot'), btns: all('button'), chars: s.innerText.length, minFs: Math.round(minFs * 10) / 10, small, mainSmall, scr: body ? Math.round(body.scrollHeight / Math.max(1, body.clientHeight) * 10) / 10 : 1, goldVis };
        });
        if (shotAt) await p2.screenshot({ path: `${out}/p-${shotAt}m-${tag}-${k}.png` });
      }
      await p2.close();
      return res;
    };
    const panels = await panelsOn(ctx, 'p7');
    const panels360 = await panelsOn(ctx360, '360');
    delete main.json;
    return { main, panels, panels360 };
  };
  const rows = [];
  let nextCensus = 120, segStart = { g: 0, gb: 0, b: 0, ban: 0, mod: 0 };
  let lastUnl = [];
  for (let guard = 0; guard < 20000; guard++) {
    await ev(c => { window.__onbClock = c; }, clock);
    let s = await state();
    if (clock > MIN * 60) break;
    for (const k of s.onb) if (!lastUnl.includes(k)) { unlocks.push({ k, tick: s.tick, clock, sys: await ev(k => !!(window.__xm.L.ONB_K[k] || {}).sys, k) }); lastUnl.push(k); if (clock < 60 * 60) await page.screenshot({ path: `${out}/u-${fmtT(clock).replace(':', 'm')}-${k}.png` }); }
    if (clock >= nextCensus && s.gHidden && !s.modal) {
      const c = await census();
      const ban = await ev(() => window.__onb.banners.length);
      rows.push({ clock: nextCensus, tick: s.tick, ...c, guides: guides.length - segStart.g, guidesBlock: guides.filter(x => x.btn).length - segStart.gb, bubbles: bubbles.length - segStart.b, banners: ban - segStart.ban, modals: modals.length - segStart.mod });
      segStart = { g: guides.length, gb: guides.filter(x => x.btn).length, b: bubbles.length, ban, mod: modals.length };
      if (nextCensus <= 60 * 60 && nextCensus % 600 === 0) await page.screenshot({ path: `${out}/main-${nextCensus / 60}m.png` });
      nextCensus += 120;
      continue;
    }
    if (s.cine && !s.paused && !s.modal) { await page.waitForTimeout(200); continue; }
    if (await handleGuide(s)) continue;
    if (await handleModal(s)) continue;
    await act();
    s = await state();
    if (!s.gHidden || s.modal) continue;
    const mSec = await ev(() => window.__xm.tickMs / 1000);   // 这个月按出发那一刻的三态算（打坐 / 历练 / 闭关，L.monthSec）
    await ev(() => { const X = window.__xm; X.L.flow(X.st, 1); X.onTick(); });
    clock += mSec;
    await page.waitForTimeout(150);
    s = await state();
    await awayCheck(s);
    for (const x of s.blog) if (!seenB.has(x)) { seenB.add(x); bubbles.push({ tick: s.tick, clock, text: x }); noteTerms(x, '气泡'); }
    const bans = await ev(n => window.__onb.banners.slice(n), seenBan);
    seenBan += bans.length; for (const x of bans) noteTerms(x.t, '横幅');
  }
  const end = await state();
  // ---------- 汇总 ----------
  const L1 = ['# 上手曲线审计（Pixel 7，×1，照老祖走的机器人）', '', `跑到手表 ${fmtT(clock)}，第 ${end.tick} 周天（×1 每周天 ${tickMs / 1000} 秒）；讲解 ${guides.length} 段（阻塞 ${guides.filter(x => x.btn).length}）、气泡 ${bubbles.length}、弹窗 ${modals.length}、横幅 ${await ev(() => window.__onb.banners.length)}、浮字 ${await ev(() => window.__onb.floats)}`, ''];
  L1.push('## 每 2 分钟', '', '| 手表 | 周天 | 主界面元素（入口/数值格/角标/其他/场景） | 角标 | 历练 | 洞府 | 宗门 | 坊市 | 人物 | 讲解(阻塞) | 气泡 | 横幅 | 弹窗 | 这段第一次出现的名词 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const mob = [];
  const pc = x => (x ? (x.err ? 'err' : `${x.tabs}页 ${x.rows}行 ${x.btns}钮 ${x.chars}字`) : '—');
  let prevC = 0;
  for (const r of rows) {
    const nw = Object.entries(first).filter(([, v]) => v.clock > prevC && v.clock <= r.clock).map(([k]) => k);
    L1.push(`| ${fmtT(r.clock)} | ${r.tick} | ${r.main.total}（${r.main.nav}/${r.main.cells}/${r.main.badges}/${r.main.other}/${r.main.scene}） | ${r.main.badgeTxt || '—'} | ${pc(r.panels.exp)} | ${pc(r.panels.home)} | ${pc(r.panels.sect)} | ${pc(r.panels.market)} | ${pc(r.panels.me)} | ${r.guides}(${r.guidesBlock}) | ${r.bubbles} | ${r.banners} | ${r.modals} | ${nw.join('、') || '—'} |`);
    prevC = r.clock;
    for (const [tag, P] of [['Pixel 7', r.panels], ['360×640', r.panels360]]) for (const k in P || {}) { const x = P[k]; if (x && !x.err) mob.push({ t: r.clock, tag, k, ...x }); }
  }
  // 手机适配：每个面板在两种屏上的最坏情况
  const NAVN = { exp: '历练', home: '洞府', sect: '宗门', market: '坊市', me: '人物' };
  L1.push('', '## 手机适配（各面板全程最坏）', '', '| 屏 | 面板 | 第一屏最小字号 | 第一屏小于 14px 的字占比（最多） | 其中正文（非说明小字）小于 14px | 最多要滚几屏 | 主按钮不在第一屏的次数 | 最多字数 |', '|---|---|---|---|---|---|---|---|');
  for (const tag of ['Pixel 7', '360×640']) for (const k of Object.keys(NAVN)) { const xs = mob.filter(m => m.tag === tag && m.k === k); if (!xs.length) continue; L1.push(`| ${tag} | ${NAVN[k]} | ${Math.min(...xs.map(m => m.minFs))}px | ${Math.max(...xs.map(m => m.small))}% | ${Math.max(...xs.map(m => m.mainSmall))}% | ${Math.max(...xs.map(m => m.scr))} | ${xs.filter(m => !m.goldVis).length}/${xs.length} | ${Math.max(...xs.map(m => m.chars))} |`); }
  // 每 10 分钟：阻塞讲解、新概念、主界面元素最高
  const dec = [];
  for (let m = 0; m < Math.ceil(clock / 600); m++) {
    const a = m * 600, z = a + 600;
    const CONT = ['tribPause', 'tribNow', 'realm2', 'realm3', 'btGo'];
    const gb = guides.filter(x => x.btn && !CONT.includes(x.id) && x.clock >= a && x.clock < z).length, ga = guides.filter(x => x.clock >= a && x.clock < z).length;
    const nc = Object.values(first).filter(v => v.clock >= a && v.clock < z).length;
    const ul = unlocks.filter(u => u.clock >= a && u.clock < z).map(u => u.k);
    const mx = Math.max(0, ...rows.filter(r => r.clock > a && r.clock <= z).map(r => r.main.total));
    const bb = bubbles.filter(x => x.clock >= a && x.clock < z).length;
    dec.push({ m, gb, ga, nc, ul, mx, bb });
  }
  L1.push('', '## 每 10 分钟', '', '| 分钟 | 阻塞讲解 | 全部讲解 | 气泡 | 新名词 | 解锁 | 主界面元素最多 |', '|---|---|---|---|---|---|---|', ...dec.map(d => `| ${d.m * 10}～${d.m * 10 + 10} | ${d.gb} | ${d.ga} | ${d.bb} | ${d.nc} | ${d.ul.map(k => (unlocks.find(u => u.k === k) || {}).sys ? '**' + k + '**' : k).join('、') || '—'} | ${d.mx} |`));
  L1.push('', '## 系统名词第一次出现', '', ...Object.entries(first).sort((a, b) => a[1].clock - b[1].clock).map(([k, v]) => `- ${fmtT(v.clock)} ${k}（${v.src}）：${v.txt.replace(/\n/g, ' ')}`));
  if (unlocks.length) L1.push('', '## 解锁', '', ...unlocks.map(u => `- ${fmtT(u.clock)} 第 ${u.tick} 周天：${u.k}`));
  L1.push('', '## 讲解', '', '| # | 手表 | 周天 | id | 台词 |', '|---|---|---|---|---|', ...guides.map(x => `| ${x.n} | ${fmtT(x.clock)} | ${x.tick} | ${x.id}${x.btn ? '' : '（点高亮）'} | ${x.text.replace(/\|/g, '/').slice(0, 80)} |`));
  L1.push('', '## 弹窗（标题 · 字数 · 按钮）', '', ...modals.filter(x => x.clock < 60 * 60).map(x => `- ${fmtT(x.clock)} 第 ${x.tick} 周天 ${x.title.replace(/\n/g, ' ')} · ${x.chars} 字 · ${x.btns} 钮`));
  // 核对（docs/ONBOARDING.md §6）
  const fails = [];
  if (ASSERT) {
    // docs/ONBOARDING.md §3 的目标：系统（不算开局的历练、不算子项）前 10 分钟 ≤ 3、三年之约前 ≤ 4；之后每 10 分钟系统 ≤ 3、系统 + 子项 ≤ 6；
    // 两个系统之间 ≥ 90 秒；阻塞讲解第一个 10 分钟 ≤ 6、之后每 10 分钟 ≤ 4；主界面元素按段的上限；底栏同时最多 1 个角标
    const T = { first10: 3, prePact: 4, blockFirst: 6, blockPer10: 4, sysPer10: 4, allPer10: 8, mainMax: [18, 24, 28, 30, 32, 34, 34, 34, 34] };
    const sysU = unlocks.filter(u => u.sys && u.k !== 'exp'), FORCED = ['bt', 'trib'];
    const c10 = Object.values(first).filter(v => v.clock < 600).length;
    const sysFirst10 = sysU.filter(u => u.clock < 600).length;
    if (sysFirst10 > T.first10) fails.push(`前 10 分钟解锁 ${sysFirst10} 个系统（目标 ≤ ${T.first10}）`);
    const pactAt = (modals.find(x => /三年之约/.test(x.title)) || {}).clock || 1e9;
    const pre = sysU.filter(u => u.clock < pactAt).length;
    if (pre > T.prePact) fails.push(`三年之约前解锁 ${pre} 个系统（目标 ≤ ${T.prePact}）`);
    for (const d of dec) {
      const lim = d.m === 0 ? T.blockFirst : T.blockPer10;
      if (d.gb > lim) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟阻塞讲解 ${d.gb} 段（目标 ≤ ${lim}）`);
      const ns = sysU.filter(u => !FORCED.includes(u.k) && u.clock >= d.m * 600 && u.clock < d.m * 600 + 600).length;
      if (d.m > 0 && ns > T.sysPer10) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟解锁 ${ns} 个系统（目标 ≤ ${T.sysPer10}）`);
      if (d.m > 0 && d.ul.length > T.allPer10) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟解锁 ${d.ul.length} 个（系统 + 子项，目标 ≤ ${T.allPer10}）`);
      const mm = T.mainMax[Math.min(d.m, T.mainMax.length - 1)]; if (d.mx > mm) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟主界面元素最多 ${d.mx}（目标 ≤ ${mm}）`);
    }
    for (let i = 1; i < sysU.length; i++) if (sysU[i].clock - sysU[i - 1].clock < 75 && !['bt', 'trib', 'sect'].includes(sysU[i].k)) fails.push(`${sysU[i - 1].k} → ${sysU[i].k} 只隔 ${Math.round(sysU[i].clock - sysU[i - 1].clock)} 秒（目标 ≥ 75 秒）`);
    for (const r of rows) if ((r.main.badgeTxt || '').length > 1) fails.push(`${fmtT(r.clock)} 底栏同时 ${r.main.badgeTxt.length} 个角标（目标 ≤ 1）`);
    L1.push('', `前 10 分钟新名词 ${c10}（参考），解锁系统 ${sysFirst10}；三年之约在 ${fmtT(pactAt)}，之前解锁系统 ${pre}`);
    L1.push('', fails.length ? '## 未通过\n\n' + fails.map(f => '- ' + f).join('\n') : '## 节奏核对全部通过');
  }
  // 在外零打断、打坐时一季一次（KAIRO_PLAN §3.6 的两条）
  let win3 = 0; for (const x of actives) win3 = Math.max(win3, new Set(actives.filter(y => y.tick >= x.tick && y.tick < x.tick + 3).map(y => y.tick + '|' + y.what)).size);
  L1.push('', `## 时间流逝（KAIRO_PLAN §3.6）`, '', `在外期间出现的讲解 / 气泡 / 横幅 / 弹窗（途中遭遇除外）：${awayHits.length}${awayHits.length ? '：' + awayHits.slice(0, 12).map(x => `${fmtT(x.clock)} 第 ${x.tick} 月 ${x.what}`).join('；') : ''}`,
    `打坐时任意连续 3 月内的主动打断（讲解、气泡、剧情事件）最多：${win3}（目标 ≤ 1；讲解与气泡的节流归线 2）`);
  if (ASSERT && awayHits.length) fails.push(`在外期间出现了 ${awayHits.length} 次打断（目标 0）`);
  fs.writeFileSync(`${out}/onboard.md`, L1.join('\n'));
  fs.writeFileSync(`${out}/onboard.json`, JSON.stringify({ rows, guides, bubbles, modals, unlocks, first, dec }, null, 1));
  console.log(L1.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
  if (errs.length || fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });


// ---------- 全程手表机器人 ----------
// 秒数口径两套（--cost plan 换成第二套）：
//   read（默认）：和浏览器那一半同一个“按读字算”的口径——弹窗 3 秒 + 每 20 字 1 秒（≤ 15 秒）再加 2～3 秒点按钮；对决演出照 duel-scene.js 的时长（一场约 4 秒）；
//                 事件按它自己的正文与选项字数算；花钱 / 换装 / 交任务：一个月里第一下 6 秒（开面板），之后每下 2 秒，一个月最多 12 秒
//   plan：方案 §3.4 估算口径的原数（一趟历练 30 秒选 + 25 秒结算；年报 25 秒；一届论道 80 秒；一件纸鹤里的事 30 秒），偏保守，只作对照
function costTable() { return {
  read: { intro: 180, depart: 8, result: 10, retreat: 4, retResult: 5, year: 10, tour: 40, duel: 25, rookie: 20, choice: null, visitor: 4, unlock: 8, chapter: 15,
    bt: 16, trib: 30, invite: 12, train: 8, mjEnter: 5, mjDoor: 4, mjChest: 4, act1: 6, actN: 2, actCap: 12 },
  plan: { intro: 180, depart: 30, result: 25, retreat: 8, retResult: 10, year: 25, tour: 80, duel: 80, rookie: 60, choice: 30, visitor: 0, unlock: 15, chapter: 30,
    bt: 25, trib: 60, invite: 30, train: 15, mjEnter: 15, mjDoor: 6, mjChest: 8, act1: 8, actN: 2, actCap: 15 },
}; }
function evCost(ev) { let n = 0; try { n = String(ev.text || '').length + (ev.choices || []).reduce((a, c) => a + String(c.t || '').length, 0); } catch (e) { n = 80; } return Math.min(15, 3 + n / 20) + 3; }
function lifeWatch() {
  const COSTS = costTable();
  // --time=idle:18,trip:10 临时改 L.TIME 试旋钮（不改源码）
  const tArg = process.argv.find(a => a.startsWith('--time='));
  const COST = COSTS[(process.argv.find(a => a.startsWith('--cost=')) || '--cost=read').slice(7)] || COSTS.read;
  // §3.4 的逐章预算（分钟，序 + 九章）
  const BUDGET = [3, 25, 26, 36, 42, 40, 38, 42, 40, 42];
  const S = require('./sim.js'), L = S.L;
  const N = +(args[0]) || 12, outF = args[1] || '';
  if (tArg) for (const kv of tArg.slice(7).split(',')) { const [k, v] = kv.split(':'); if (k.startsWith('mul')) { L.TIME.realmMul = v.split('/').map(Number); } else L.TIME[k] = +v; }
  let cur = null;
  const add = (k, sec) => { if (!cur) return; cur.clock += sec; cur.by[k] = (cur.by[k] || 0) + sec; };
  const act = () => { if (!cur) return; const m = cur.monthAct; if (m.n === 0) add('act', COST.act1); else if (m.sec + COST.actN <= COST.actCap) add('act', COST.actN); m.sec += m.n === 0 ? COST.act1 : COST.actN; m.n++; };
  const wrap = (name, f) => { const f0 = L[name]; if (typeof f0 !== 'function') return; L[name] = function () { const r = f0.apply(this, arguments); try { f.call(this, r, arguments); } catch (e) { /* 统计不影响逻辑 */ } return r; }; };
  // 一个月：按出发那一刻的三态记秒
  { const t0 = L.tick; L.tick = function (st, cont) {
    if (cur && st.p.r <= L.MAXR) { const md = L.clockMode(st); add('m_' + md, L.monthSec(st)); cur.rAt[st.p.r] = cur.rAt[st.p.r] === undefined ? cur.clock : cur.rAt[st.p.r]; cur.months[md] = (cur.months[md] || 0) + 1; cur.monthAct = { n: 0, sec: 0 }; }
    const out = t0.apply(this, arguments);
    if (!cur) return out;
    if (out.exp) { add('result', COST.result); cur.trips++; }
    if (out.retreat) add('result', COST.retResult);
    if (out.year) { add('year', COST.year); cur.years++; }
    if (out.tourney) add('duel', COST.tour);
    if (out.pact || out.meet || out.war) add('duel', COST.duel);
    if (out.rookie) add('duel', COST.rookie);
    if (out.invite) add('choice', COST.invite);
    if (out.visitor) add('choice', COST.visitor);
    if (out.train) add('choice', COST.train);
    for (const w of out.warns || []) cur.warn[w.k] = (cur.warn[w.k] || 0) + 1;
    if (out.prep) cur.prep[out.prep.k] = (cur.prep[out.prep.k] || 0) + 1;
    if (out.exp && out.exp.cut) cur.cut++;
    return out;
  }; }
  wrap('startExp', (ok, a) => { if (ok && !(a[4] && a[4].quiet)) add('depart', COST.depart); });
  wrap('startRetreat', ok => { if (ok) add('depart', COST.retreat); });
  wrap('resolveChoice', (r, a) => add('choice', COST.choice || evCost(a[1] || {})));
  wrap('breakthrough', () => add('bt', COST.bt));
  wrap('tribStart', r => { if (r) add('bt', COST.trib); });
  wrap('mjEnter', ok => { if (ok) add('realm', COST.mjEnter); });
  wrap('mjPick', () => add('realm', COST.mjDoor));
  wrap('mjChest', () => add('realm', COST.mjChest));
  for (const k of ['upgrade', 'build', 'buy', 'gearDecide', 'equipArt', 'craft', 'taskTake', 'taskDeliver', 'promote', 'gearPlus', 'zhenSet', 'sell', 'plant', 'petFeed', 'vaultBuy', 'discTake', 'heal', 'joinSect']) wrap(k, r => { if (r) act(); });
  // 解锁卡（系统）与章末：看卡的秒数；解锁卡之间的真实时间间隔照界面（L.onbHold）用这块手表判
  let lastCard = -1e9;
  L.onbHold = (st, e) => !!cur && !!e && e.sys && cur.clock - lastCard < L.TIME.unlockGapSec;
  L.hook = (type, d) => {
    if (!cur) return;
    if (type === 'unlock') { const e = L.ONB_K[d]; if (e && e.sys && d !== 'exp' && d !== 'bt') { lastCard = cur.clock; add('unlock', COST.unlock); } cur.unl.push({ k: d, sys: !!(e && e.sys), clock: cur.clock, tick: cur.st ? cur.st.tick : 0 }); }
    if (type === 'chapter') { add('chapter', COST.chapter); cur.ch.push({ from: d.from, to: d.to, clock: cur.clock }); }
  };
  // L.newState 包一层：拿到这一局的 st（打印用）
  { const ns0 = L.newState; L.newState = function () { const s = ns0.apply(this, arguments); if (cur) cur.st = s; return s; }; }
  const recs = [];
  for (let seed = 1; seed <= N; seed++) {
    cur = { clock: COST.intro, by: { intro: COST.intro }, months: {}, monthAct: { n: 0, sec: 0 }, trips: 0, years: 0, warn: {}, prep: {}, cut: 0, unl: [], ch: [], st: null, rAt: [] };
    lastCard = -1e9;
    const r = S.run('guided', seed);
    cur.ascend = r.ascend; cur.pact = r.pactWin; cur.ticks = r.endTick;
    recs.push(cur); cur = null;
  }
  // 各章手表分钟：章的边界 = chapter 事件（第 i 章结束时的手表）；最后一章到飞升
  const chMin = x => { const e = [COST.intro]; for (let i = 0; i < 9; i++) { const c = x.ch.find(c => c.from <= i && c.to > i); e.push(c ? c.clock : x.clock); } const d = [COST.intro / 60]; for (let i = 1; i <= 9; i++) d.push((e[i] - e[i - 1]) / 60); return d; };
  const med = a => { const b = a.filter(v => v !== undefined && !Number.isNaN(v)).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
  const q = (a, f) => { const b = a.filter(v => v !== undefined).sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; };
  const tot = recs.map(x => x.clock / 60), chs = recs.map(chMin);
  const fm = m => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  const lines = ['# 全程手表（第一世，guided，×1）', '', `L.TIME = ${JSON.stringify(L.TIME)}；${N} 个种子；秒数口径 ${COST === COSTS.plan ? 'plan（方案原数）' : 'read（按读字算）'}`, '',
    `全程：中位 ${Math.round(med(tot))} 分钟（${fm(med(tot))}；${Math.round(q(tot, 0.1))}～${Math.round(q(tot, 0.9))}），目标 300～360（验收 270～360）；飞升 ${med(recs.map(x => x.ascend))} 月；三年之约胜 ${recs.filter(x => x.pact).length}/${N}`, '',
    '| 章（境界） | 按境界（中位分钟） | 按章（主线做完为界） | 预算 ±20% | 判定（按境界） |', '|---|---|---|---|---|'];
  const NAMES = ['序', '一 废柴', '二 入宗', '三 金丹', '四 元婴', '五 化神', '六 炼虚', '七 合体', '八 大乘', '九 渡劫'];
  const chFails = [];
  // 按境界的手表分钟：进入下一境界时的手表 − 进入这一境界时的手表（§3.4 的预算表是按“章 = 境界”排的；按章算会被主线早做 / 晚做拉偏）
  const rMin = x => { const a = []; for (let r = 0; r < 9; r++) { const t0 = x.rAt[r], t1 = r < 8 ? x.rAt[r + 1] : x.clock; a.push(t0 !== undefined && t1 !== undefined ? (t1 - t0) / 60 : NaN); } return a; };
  const rm = recs.map(rMin);
  for (let i = 0; i < 10; i++) { const mc = med(chs.map(c => c[i])), m = i === 0 ? mc : med(rm.map(a => a[i - 1])), b = BUDGET[i], ok = i === 0 || (m >= b * 0.8 && m <= b * 1.2); if (!ok) chFails.push(i); lines.push(`| ${NAMES[i]} | ${m.toFixed(1)} | ${mc.toFixed(1)} | ${b}（${Math.round(b * 0.8)}～${Math.round(b * 1.2)}） | ${ok ? '达标' : '未达标'} |`); }
  const by = {}; for (const x of recs) for (const k in x.by) by[k] = (by[k] || 0) + x.by[k] / N / 60;
  const mo = {}; for (const x of recs) for (const k in x.months) mo[k] = (mo[k] || 0) + x.months[k] / N;
  lines.push('', '手表都花在哪（每局平均分钟）：' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('，'));
  lines.push('', '月数（每局平均）：' + Object.entries(mo).map(([k, v]) => `${k} ${Math.round(v)}`).join('，') + `；历练 ${med(recs.map(x => x.trips))} 趟，年报 ${med(recs.map(x => x.years))} 张，节点前提前归来 ${med(recs.map(x => x.cut))} 趟`);
  const w = {}; for (const x of recs) for (const k in x.warn) w[k] = (w[k] || 0) + x.warn[k] / N;
  const pr = {}; for (const x of recs) for (const k in x.prep) pr[k] = (pr[k] || 0) + x.prep[k] / N;
  lines.push('', '大节点预告（每局平均次数）：' + Object.entries(w).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('，') + '；备战卡：' + Object.entries(pr).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('，'));
  // 第一世各系统第一次出现的手表时间（§3.4 第二张表）
  const firstAt = {}; for (const x of recs) for (const u of x.unl) (firstAt[u.k] = firstAt[u.k] || []).push(u.clock / 60);
  lines.push('', '各系统解锁的手表时间（中位）：' + (L.ONB || []).filter(e => firstAt[e.k]).map(e => `${e.n} ${fm(med(firstAt[e.k]))}`).join('，'));
  const fails = [];
  const tm = med(tot), c1 = med(chs.map(c => c[1])), r1 = med(rm.map(a => a[0]));
  if (!(tm >= 270 && tm <= 360)) fails.push(`全程 ${Math.round(tm)} 分钟（验收 270～360）`);
  const ch1Note = c1 >= 22 && c1 <= 28 ? '' : `第一章 ${c1.toFixed(1)} 分钟（§3.6 目标 22～28，参考）`;
  lines.push('', (fails.length ? '未通过：' + fails.join('；') : '手表核对通过（全程 270～360 分钟）') + (ch1Note ? '；' + ch1Note : '') + (chFails.length ? `；逐章预算 ${chFails.length} 章超出 ±20%（见上表，参考）` : ''));
  const txt = lines.join('\n');
  console.log(txt);
  if (outF) fs.writeFileSync(outF, txt);
  if (ASSERT && fails.length) process.exitCode = 1;
}
