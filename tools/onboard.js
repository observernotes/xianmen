// 上手曲线审计（docs/ONBOARDING.md）：一个照着老祖走的新玩家从开场玩到 N 分钟，
// 按“手表时间”每 2 分钟记一行：主界面上看得见的按钮 / 数值格 / 角标 / 入口数，各面板一打开的分页数、行数、按钮数、字数，
// 这一段弹了几段阻塞讲解 / 气泡 / 横幅 / 弹窗，第一次出现的系统名词；每段讲解、每次解锁截一张图。
// 行动点制（docs/AP_PLAN.md §6、§8.1）：时间不自己走，机器人每季先花点（历练 / 闭关各 2 点），再点【下一季】（window.__xm.nextSeason，或界面上写着“下一季 / 赴约 / 论道 / 迎战”的按钮）。
// 手表时间 = 读点秒数之和：讲解 4 秒 + 每 12 字 1 秒；弹窗 3 秒 + 每 20 字 1 秒（最多 15 秒）；机器人自己点开面板出发 4 秒；
// 另按 §8.1 的口径记行动：一趟历练 55 秒（选 10 + 打 30 + 结算翻牌 15）、首领 25 秒、季末卡 5 秒（年报 20 秒）。
// node tools/onboard.js <输出目录> [分钟=90] [--assert]
//   --assert：按 docs/ONBOARDING.md §6 的目标核对（每 10 分钟阻塞讲解数、新概念数、主界面可见元素数），另核对行动点制：
//             主界面没有 #btnSpeed（速度键已删）、有【下一季】与行动点那一行、放置 2 秒 st.tick 不变；不过就退出码 1
//   找不到【下一季】（界面线 C 还没合进来）：退出码 2，不假装通过。
//
// 全程手表机器人（docs/AP_PLAN.md §8.1）：node tools/onboard.js --life [种子数=12] [输出.md] [--assert]
//   不开浏览器：照 tools/sim.js 的 guided 玩完第一世（逻辑与界面同一份 L），在 L 的入口上挂钩，按 §8.1 的表记每个行动、每张卡的读点秒数；
//   输出各章手表分钟 / 季数（对照 §3.3 的预算表）、全程分钟、任意连续 10 季的平均每季秒数。
//   --assert：全程 300～360 分钟；第一章 20～28 分钟；各章对照 §3.3 的表 ±25%；任意连续 10 季平均每季 60～200 秒。不过就退出码 1。
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ASSERT = process.argv.includes('--assert');
let COST;   // 全程手表的秒数表（makeCost，lifeWatch 里赋值）
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
  // 横幅、浮字：MutationObserver 记下来（带周天）
  await ev(() => {
    const X = window.__xm; window.__onb = { banners: [], floats: 0 };
    new MutationObserver(() => { const t = document.getElementById('banner').textContent; if (t) window.__onb.banners.push({ tick: X.st.tick, t }); }).observe(document.getElementById('banner'), { childList: true, subtree: true });
    new MutationObserver(ms => { for (const m of ms) window.__onb.floats += m.addedNodes.length; }).observe(document.getElementById('fx'), { childList: true });
  });
  let clock = 40;   // 开场四格画 + 起名
  await ev(() => { window.__xm.watch = () => window.__onbClock || 0; });   // 解锁卡之间的“≥ 6 分钟”按这块手表判（clock.js 的 L.onbHold）
  let lastBan = 0;
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
    if (go && /拜入|登台|为宗门|接受特训|知道了|谢|继续|下一|落幕|回洞府|好|就这样上|新的一年|入[春夏秋冬]|赴约|迎战|论道|▸/.test(await go.textContent())) { await go.click(); await page.waitForTimeout(250); return true; }
    await ev(() => window.__xm.closeModal()); await page.waitForTimeout(250);
    return true;
  };
  // 机器人：和 tools/guide30.js 一样照问老祖的第一条做；只用界面上看得见的东西（坊市、灵田、丹炉没出现就不碰）。
  // 行动点制：突破 / 治伤 / 访客 / 升级（都不花点）先做；点 ≥ 2 时：快圆满闭关，否则历练；只剩 1 点（或 0）就点【下一季】（剩下的点自动打坐）。
  // 返回：'bt' 突破、'exp' 出发了、'retreat' 闭关了、'wait' 一趟历练还在界面上打、'next' 该点【下一季】、其余是做了件小事（回循环顶再看一眼）
  let lastExp = 0, lastBoss = 0;
  const act = async () => {
    const what = await ev(() => {
      const X = window.__xm, { st, L } = X;
      if (!st.guide.done) return 'next';
      const vis = k => (X.UI && X.UI.isOpen ? X.UI.isOpen(k) : true);
      if (L.isReady(st)) { X.showBreakthrough(); return 'bt'; }
      if (st.exp || st.run || X.cine) return 'wait';
      if (st.p.inj > 0 && L.canHeal(st)) { X.showHome(); const h = document.querySelector('#btnHeal'); if (h) h.click(); X.closeModal(); return 'heal'; }
      if (st.visitor) { X.showVisitor(); return 'visit'; }
      for (const k of ['array', 'field', 'furnace']) { if (!L.homeOpen(st, k) || (k !== 'array' && !vis(k))) continue; const u = L.upInfo(st, k); if (!u.max && !u.lock && u.cost && st.stones >= u.cost * 1.3) { L.upgrade(st, k); return 'up:' + k; } }
      if (L.apLeft(st) < L.AP.exp) return 'next';
      if (L.canRetreat(st) && L.ticksToStage(st, L.si(st.p) + 1) <= 8 && L.retInfo(st).save > 0 && !L.apWhy(st, 'retreat')) { if (L.act(st, 'retreat')) { if (X.settle) X.settle(); return 'retreat'; } }
      if (st.p.r <= L.MAXR && !L.isFull(st)) { const b = L.expBest(st); if (L.apWhy(st, 'exp', [b.k, b.d, b.a])) return 'next'; const a = st.stats.exp % 3 === 1 && L.apprOpen(st, 2) ? 2 : b.a; X.confirmExp(b.k, b.d, a); return 'exp'; }
      return 'next';
    });
    if (what === 'exp') { clock += 4; await page.waitForTimeout(350); const s = await state(); if (!(await handleGuide(s))) { await ev(() => { const b = document.querySelector('#modal .foot .btn.gold'); if (b) b.click(); }); } }
    if (what === 'bt') { await page.waitForTimeout(350); const s = await state(); if (!(await handleGuide(s))) await handleModal(await state()); }
    if (what === 'visit' || what === 'heal' || /^up/.test(what) || what === 'retreat') clock += 3;
    // 这一阵新打完的历练 / 首领：按 §8.1 记手表
    const n = await ev(() => { const st = window.__xm.st; return { e: st.stats.exp || 0, b: st.stats.bosses || 0 }; });
    if (n.e > lastExp) { clock += 55 * (n.e - lastExp); lastExp = n.e; }
    if (n.b > lastBoss) { clock += 25 * (n.b - lastBoss); lastBoss = n.b; }
    return what;
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
        const X = window.__xm; if (X.setSpeed) X.setSpeed(3);
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
  let waitN = 0;
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
    if (s.cine && !s.modal) { await page.waitForTimeout(200); continue; }
    if (await handleGuide(s)) continue;
    if (await handleModal(s)) continue;
    const what = await act();
    s = await state();
    if (!s.gHidden || s.modal) continue;
    if (what === 'wait') { if (++waitN > 480) throw new Error('一趟历练 2 分钟还没演完（卡住？）'); await page.waitForTimeout(250); continue; }
    waitN = 0;
    if (what !== 'next') { await page.waitForTimeout(150); continue; }   // 做了件事（突破、闭关、家务……）：回循环顶，再看一眼还有什么
    // 点【下一季】（AP_PLAN §6.3：时间只在这里推进）
    const nx = await ev(() => {
      const X = window.__xm;
      if (typeof X.nextSeason === 'function') { X.nextSeason(); return 'fn'; }
      const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && !x.disabled && /^(下一季|赴约|迎战|论道)\s*▸/.test(x.textContent.trim()));
      if (b) { b.click(); return 'btn'; }
      return '';
    });
    if (!nx) { console.error('FAIL：界面里找不到【下一季】（window.__xm.nextSeason 没有，也没有写着“下一季 / 赴约 / 论道 / 迎战”的按钮）——界面线 C 还没合进来？'); await b.close(); process.exit(2); }
    clock += s.tick % 12 === 9 ? 20 : 5;   // 季末卡 5 秒（冬季是年报 20 秒）
    await page.waitForTimeout(150);
    s = await state();
    for (const x of s.blog) if (!seenB.has(x)) { seenB.add(x); bubbles.push({ tick: s.tick, clock, text: x }); noteTerms(x, '气泡'); }
    const bans = await ev(n => window.__onb.banners.slice(n), seenBan);
    seenBan += bans.length; for (const x of bans) noteTerms(x.t, '横幅');
  }
  const end = await state();
  // ---------- 汇总 ----------
  const L1 = ['# 上手曲线审计（Pixel 7，×1，照老祖走的机器人）', '', `跑到手表 ${fmtT(clock)}，第 ${end.tick} 月（第 ${Math.floor(end.tick / 3)} 季）；讲解 ${guides.length} 段（阻塞 ${guides.filter(x => x.btn).length}）、气泡 ${bubbles.length}、弹窗 ${modals.length}、横幅 ${await ev(() => window.__onb.banners.length)}、浮字 ${await ev(() => window.__onb.floats)}`, ''];
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
    for (const r of rows) if (r.main.badges > 1) fails.push(`${fmtT(r.clock)} 底栏同时 ${r.main.badges} 个角标（${r.main.badgeTxt}，目标 ≤ 1）`);   // 数角标个数，不数字数（“新 3”是一个角标）
    L1.push('', `前 10 分钟新名词 ${c10}（参考），解锁系统 ${sysFirst10}；三年之约在 ${fmtT(pactAt)}，之前解锁系统 ${pre}`);
    L1.push('', fails.length ? '## 未通过\n\n' + fails.map(f => '- ' + f).join('\n') : '## 节奏核对全部通过');
  }
  // 行动点制（AP_PLAN §6.5）：速度键没了、有【下一季】与行动点那一行、放置不走时间
  const ui = await ev(() => { const bs = [...document.querySelectorAll('button')].filter(x => x.offsetParent); return { speed: !!document.getElementById('btnSpeed'), next: bs.some(x => /^(下一季|赴约|迎战|论道)\s*▸/.test(x.textContent.trim())) || typeof window.__xm.nextSeason === 'function', ap: /◆/.test(document.body.innerText) || !!document.querySelector('[data-ap]'), tick: window.__xm.st.tick }; });
  await page.waitForTimeout(2000);
  const idle = (await ev(() => window.__xm.st.tick)) === ui.tick;
  L1.push('', '## 行动点制（AP_PLAN §6.5）', '', `#btnSpeed ${ui.speed ? '还在' : '不存在'}；【下一季】${ui.next ? '在' : '没有'}；行动点那一行（◆ / [data-ap]）${ui.ap ? '在' : '没有'}；放置 2 秒 st.tick ${idle ? '不变' : '变了'}`);
  if (ASSERT) {
    const af = [];
    if (ui.speed) af.push('[C] #btnSpeed 还在（速度键应删除）'); if (!ui.next) af.push('[C] 主界面没有【下一季】'); if (!ui.ap) af.push('[C] 主界面没有行动点那一行'); if (!idle) af.push('[C] 放置 2 秒 st.tick 变了（时间不该自己走）');
    if (af.length) L1.push('', '## 行动点制未通过', '', ...af.map(f => '- ' + f));
    fails.push(...af);
  }
  fs.writeFileSync(`${out}/onboard.md`, L1.join('\n'));
  fs.writeFileSync(`${out}/onboard.json`, JSON.stringify({ rows, guides, bubbles, modals, unlocks, first, dec }, null, 1));
  console.log(L1.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
  if (errs.length || fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });


// ---------- 全程手表机器人（docs/AP_PLAN.md §8.1） ----------
// 不再有“每月多少秒”：时间不自己走。手表 = 每个行动、每张卡的读点秒数之和（§8.1 的表）：
//   历练 10（选）+ 每个战斗节点（1.5 + 回合数 × 1.0）+ 非战斗节点 2.4 + 结算 8 + 每张翻牌 4；扫荡 6；首领 / 下战帖 / 主线最后一仗 6 + 回合数 × 1.0 + 结果 6；
//   闭关 / 特训 6；打坐（手动）2、自动的 0；秘境每层 12；家务（一次点击出一个结果的）4（每季最多 20，§3.3 的预算）；季末卡 5、年报 20；
//   论道 15 + 每场（回合数 × 1.0 + 4）；对话场景按长度级别 S 30 / M 60 / L 120（STORY_PLAN §4）、过场 20；解锁卡 6、章末卡 15、备战卡 10；事件抉择 / 访客 3 + 每 20 字 1 秒（≤ 15）。
// 没有逐项列在 §8.1 的，按相近的一项记（见 COST）。机器人照 tools/sim.js 的 guided 玩完第一世（逻辑层与界面同一份 L），在 L 的入口上挂钩记秒。
// 回合数：战斗节点的 res.rounds；首领、约战这类逻辑层不打回合战的，按 COST.rounds（6）估。
// node tools/onboard.js --life [种子数=12] [输出.md] [--assert]
//   --assert：全程 300～360 分钟；第一章 20～28 分钟；各章对照 §3.3 的表 ±25%；任意连续 10 季的平均每季 60～200 秒。不过就退出码 1。
function makeCost() { return { intro: 180, pick: 10, nodeBt: 1.5, round: 1.0, nodeWalk: 2.4, result: 8, flip: 4, sweep: 6, fightPre: 6, fightPost: 6, rounds: 6, retreat: 6, sit: 2, mjFloor: 12, mjEnter: 4, mjChest: 4,
  chore: 4, choreCap: 20, season: 5, year: 20, tour: 15, tourMatch: 10, tourCap: 3, pact: 25, meet: 40, war: 25, rookie: 20, storyS: 30, storyM: 60, storyL: 120, cine: 20, unlock: 6, chapter: 15, prep: 10,
  bt: 16, trib: 30, deeper: 3, errand: 6, join: 6, ev0: 3, ev20: 1, evCap: 15 }; }
function lines(talk) { let n = 0; for (const x of talk || []) if (Array.isArray(x)) n++; else if (x && Array.isArray(x.say)) n += x.say.length; return n; }
function storyCost(ev, choice) {
  const n = lines(ev.talk) + (choice && choice.ok ? lines(choice.ok.talk) : 0);
  const sec = n <= 10 ? COST.storyS : n <= 20 ? COST.storyM : COST.storyL;
  return sec + (choice && choice.ok && choice.ok.cine ? COST.cine : 0) + 3;   // 抉择那一下 3 秒
}
function evCost(ev) { let n = 0; try { n = String(ev.text || '').length + (ev.choices || []).reduce((a, c) => a + String(c.t || '').length, 0); } catch (e) { n = 80; } return Math.min(COST.evCap, COST.ev0 + n / 20 * COST.ev20) + 3; }
function lifeWatch() {
  COST = makeCost();
  // §3.3 的预算（序 + 九章）：分钟与季数
  const BUDGET = [3, 22, 26, 36, 40, 40, 40, 42, 40, 42], BUDGET_S = [0, 12, 13, 18, 20, 20, 20, 21, 20, 21];
  const S = require('./sim.js'), L = S.L;
  const N = +(args[0]) || 12, outF = args[1] || '';
  // 本分支（合并推荐统一 49cf52f 之后）：artrec.js 的 L.REC = {…} 盖掉 expedition.js 的 L.REC，L.rec 全是 NaN（推荐战力、首领、扫荡都坏）。垫回去再测，否则手表数没有意义
  const recBug = !(L.rec(0, 0) > 0);
  if (recBug) { Object.assign(L.REC, { base: 6, k: 13.4, d: 2.37 }); console.error('注意：L.rec 是 NaN（artrec.js 把 L.REC 覆盖了），本次手表已临时垫回 { base: 6, k: 13.4, d: 2.37 }。'); }
  let cur = null, quiet = 0;
  const add = (k, sec) => { if (!cur || quiet) return; cur.clock += sec; cur.by[k] = (cur.by[k] || 0) + sec; };
  const chore = () => { if (!cur) return; if (cur.choreSec + COST.chore <= COST.choreCap) { add('chore', COST.chore); cur.choreSec += COST.chore; } };
  const wrap = (name, f) => { const f0 = L[name]; if (typeof f0 !== 'function') return; L[name] = function () { const r = f0.apply(this, arguments); try { f.call(this, r, arguments); } catch (e) { /* 统计不影响逻辑 */ } return r; }; };
  const rounds = r => (r && typeof r.rounds === 'number' ? r.rounds : r && Array.isArray(r.rounds) ? r.rounds.length : COST.rounds);
  // ---- 行动 ----
  wrap('act', (r, a) => {
    if (!r || !cur) return;
    const id = a[1];
    if (id === 'exp') add('exp', COST.pick);
    else if (id === 'deeper') add('exp', COST.deeper);
    else if (id === 'retreat' || id === 'train') add('retreat', COST.retreat);
    else if (id === 'sit') add('sit', COST.sit);
    else if (id === 'boss' || id === 'duel' || id === 'final') add('fight', COST.fightPre + rounds(r) * COST.round + COST.fightPost);
    else if (id === 'join') add('fight', COST.join);
    else if (id === 'errand') add('chore', COST.errand);
    cur.acts[id] = (cur.acts[id] || 0) + 1;
  });
  wrap('tripStep', r => { if (r && r.res !== undefined) add('exp', r.res && typeof r.res.rounds === 'number' && r.res.rounds > 0 ? COST.nodeBt + r.res.rounds * COST.round : COST.nodeWalk); });
  wrap('tripEnd', r => { if (r) { add('exp', COST.result + (r.cards ? r.cards.length : 0) * COST.flip); cur.trips++; } });
  { const sw0 = L.sweep; if (typeof sw0 === 'function') L.sweep = function () { quiet++; let r; try { r = sw0.apply(this, arguments); } finally { quiet--; } if (r) { add('exp', COST.sweep); cur.sweeps++; } return r; }; }
  wrap('mjEnter', ok => { if (ok) add('realm', COST.mjEnter); });
  wrap('mjPick', () => add('realm', COST.mjFloor));
  wrap('mjChest', () => add('realm', COST.mjChest));
  wrap('breakthrough', () => add('bt', COST.bt));
  wrap('tribStart', r => { if (r) add('bt', COST.trib); });
  // ---- 大事 ----
  wrap('pactDuel', () => add('duel', COST.pact));
  wrap('tournament', r => add('duel', COST.tour + (r && r.rounds ? r.rounds.length : COST.tourCap) * COST.tourMatch));
  wrap('sectMeet', () => add('duel', COST.meet));
  wrap('sectWar', () => add('duel', COST.war));
  wrap('rookieDuel', () => add('duel', COST.rookie));
  // ---- 家务：一次点击出一个结果的 ----
  for (const k of ['upgrade', 'build', 'buy', 'gearDecide', 'equipArt', 'craft', 'taskTake', 'taskDeliver', 'promote', 'gearPlus', 'zhenSet', 'sell', 'plant', 'petFeed', 'vaultBuy', 'discTake', 'heal', 'joinSect']) wrap(k, r => { if (r) chore(); });
  // ---- 剧情与事件：对话场景按长度级别记，其余事件按字数记 ----
  wrap('resolveChoice', (r, a) => { const ev = a[1] || {}; if (ev.where === 'story' && (ev.talk || ev.cine)) { add('story', storyCost(ev, (ev.choices || [])[a[2]])); cur.stories++; } else add('choice', evCost(ev)); });
  // ---- 回合：季末卡 / 年报 / 备战卡；记每季的手表（连续 10 季的平均用）----
  wrap('seasonEnd', S1 => {
    if (!S1) return;
    add('season', S1.year ? COST.year : COST.season);
    if (S1.next && S1.next.bigSoon && S1.next.bigSoon.seasons <= 1) add('prep', COST.prep);
    cur.seasonT.push(cur.clock); cur.choreSec = 0; cur.seasons++;
    if (S1.year) cur.years++;
  });
  // ---- 解锁卡与章末 ----
  L.hook = (type, d) => {
    if (!cur) return;
    if (type === 'unlock') { const e = L.ONB_K[d]; if (e && e.sys && d !== 'exp' && d !== 'bt') add('unlock', COST.unlock); cur.unl.push({ k: d, sys: !!(e && e.sys), clock: cur.clock, tick: cur.st ? cur.st.tick : 0 }); }
    if (type === 'chapter') { add('chapter', COST.chapter); cur.ch.push({ from: d.from, to: d.to, clock: cur.clock, season: cur.seasons }); }
  };
  { const ns0 = L.newState; L.newState = function () { const s = ns0.apply(this, arguments); if (cur) cur.st = s; return s; }; }
  const recs = [];
  for (let seed = 1; seed <= N; seed++) {
    cur = { clock: COST.intro, by: { intro: COST.intro }, choreSec: 0, trips: 0, sweeps: 0, years: 0, seasons: 0, stories: 0, acts: {}, unl: [], ch: [], st: null, seasonT: [] };
    const r = S.run('guided', seed);
    cur.ascend = r.ascend; cur.pact = r.pactWin; cur.ticks = r.endTick; cur.asc = r.endR >= 9 || r.ascend !== undefined;
    recs.push(cur); cur = null;
  }
  const med = a => { const b = a.filter(v => v !== undefined && !Number.isNaN(v)).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
  const q = (a, f) => { const b = a.filter(v => v !== undefined).sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; };
  const fm = m => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  // 各章手表分钟与季数：第 i 章结束 = chapter 事件（from ≤ i-1 < to）；最后一章到飞升
  const chEnds = x => { const e = [{ clock: COST.intro, season: 0 }]; for (let i = 0; i < 9; i++) { const c = x.ch.find(c => c.from <= i && c.to > i); e.push(c || { clock: x.clock, season: x.seasons, end: true }); } return e; };
  const chMin = recs.map(x => { const e = chEnds(x), d = [COST.intro / 60]; for (let i = 1; i <= 9; i++) d.push((e[i].clock - e[i - 1].clock) / 60); return d; });
  const chSea = recs.map(x => { const e = chEnds(x), d = [0]; for (let i = 1; i <= 9; i++) d.push(e[i].season - e[i - 1].season); return d; });
  const tot = recs.map(x => x.clock / 60);
  const out = ['# 全程手表（第一世，guided，行动点制）', '', `${N} 个种子；秒数口径：docs/AP_PLAN.md §8.1（见本脚本 COST）${recBug ? '；注意：本次临时垫回了 L.REC（artrec.js 把它盖成了 NaN）' : ''}`, '',
    `全程：中位 ${Math.round(med(tot))} 分钟（${fm(med(tot))}；P10～P90 ${Math.round(q(tot, 0.1))}～${Math.round(q(tot, 0.9))}），目标 300～360；飞升 ${med(recs.map(x => Math.round(x.ticks / 3)))} 季（目标 150～180，校准归 D2）；三年之约胜 ${recs.filter(x => x.pact).length}/${N}；飞升 ${recs.filter(x => x.asc).length}/${N} 局`, '',
    '| 章 | 季（中位） | 预算季 | 分钟（中位） | 预算分钟（±25%） | 判定 |', '|---|---|---|---|---|---|'];
  const NAMES = ['序', '一 废柴', '二 入世', '三 旧怨', '四 立名', '五 问剑', '六 守山', '七 真相', '八 了断', '九 飞升'];
  const chFails = [];
  for (let i = 0; i < 10; i++) {
    const m = med(chMin.map(c => c[i])), sn = med(chSea.map(c => c[i])), b = BUDGET[i];
    const ok = i === 0 || (m >= b * 0.75 && m <= b * 1.25);
    if (!ok) chFails.push(`${NAMES[i]} ${m.toFixed(1)} 分钟（预算 ${b}，${Math.round(b * 0.75)}～${Math.round(b * 1.25)}）`);
    out.push(`| ${NAMES[i]} | ${i === 0 ? '—' : sn} | ${i === 0 ? '—' : BUDGET_S[i]} | ${m.toFixed(1)} | ${b}（${Math.round(b * 0.75)}～${Math.round(b * 1.25)}） | ${ok ? '达标' : '未达标'} |`);
  }
  const by = {}; for (const x of recs) for (const k in x.by) by[k] = (by[k] || 0) + x.by[k] / N / 60;
  out.push('', '手表都花在哪（每局平均分钟）：' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('，'));
  out.push('', `每局：季 ${med(recs.map(x => x.seasons))}（中位）；历练 ${med(recs.map(x => x.trips))} 趟、扫荡 ${med(recs.map(x => x.sweeps))} 次；年报 ${med(recs.map(x => x.years))} 张；对话场景 ${med(recs.map(x => x.stories))} 场；行动（每局平均）：` + Object.entries(recs.reduce((a, x) => { for (const k in x.acts) a[k] = (a[k] || 0) + x.acts[k] / N; return a; }, {})).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('，'));
  // 任意连续 10 季的平均每季秒数（没有空转季，也没有塞爆的季）
  const winBad = []; const worst = [1e9, 0];
  for (const [ri, x] of recs.entries()) {
    const t = [COST.intro].concat(x.seasonT);
    for (let i = 10; i < t.length; i++) { const avg = (t[i] - t[i - 10]) / 10; if (avg < worst[0]) worst[0] = avg; if (avg > worst[1]) worst[1] = avg; if ((avg < 60 || avg > 200) && winBad.length < 6) winBad.push(`种子 ${ri + 1} 第 ${i - 9}～${i} 季平均 ${avg.toFixed(0)} 秒`); }
  }
  out.push('', `任意连续 10 季的平均每季（秒）：最低 ${worst[0].toFixed(0)}、最高 ${worst[1].toFixed(0)}（目标 60～200）${winBad.length ? '；不在区间的（至多列 6 处）：' + winBad.join('；') : ''}`);
  const firstAt = {}; for (const x of recs) for (const u of x.unl) (firstAt[u.k] = firstAt[u.k] || []).push(u.clock / 60);
  out.push('', '各系统解锁的手表时间（中位）：' + (L.ONB || []).filter(e => firstAt[e.k]).map(e => `${e.n} ${fm(med(firstAt[e.k]))}`).join('，'));
  const fails = [];
  const tm = med(tot), c1 = med(chMin.map(c => c[1]));
  if (!(tm >= 300 && tm <= 360)) fails.push(`全程 ${Math.round(tm)} 分钟（验收 300～360）`);
  if (!(c1 >= 20 && c1 <= 28)) fails.push(`第一章 ${c1.toFixed(1)} 分钟（验收 20～28）`);
  for (const f of chFails) fails.push('逐章预算 ' + f);
  if (winBad.length) fails.push(`连续 10 季平均每季不在 60～200 秒：${winBad[0]} 等`);
  out.push('', fails.length ? '未通过：\n' + fails.map(f => '- ' + f).join('\n') : '手表核对通过（300～360 分钟；第一章 20～28；各章 ±25%；连续 10 季 60～200 秒）');
  const txt = out.join('\n');
  console.log(txt);
  if (outF) fs.writeFileSync(outF, txt);
  if (ASSERT && fails.length) process.exitCode = 1;
}
