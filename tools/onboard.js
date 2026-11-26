// 上手曲线审计（docs/ONBOARDING.md）：一个照着老祖走的新玩家（×1 速，不开加速）从开场玩到 N 分钟，
// 按“真实手表时间”每 2 分钟记一行：主界面上看得见的按钮 / 数值格 / 角标 / 入口数，各面板一打开的分页数、行数、按钮数、字数，
// 这一段弹了几段阻塞讲解 / 气泡 / 横幅 / 弹窗，第一次出现的系统名词；每段讲解、每次解锁截一张图。
// 手表时间按读字算：讲解 4 秒 + 每 12 字 1 秒；弹窗 3 秒 + 每 20 字 1 秒（最多 15 秒）；机器人自己点开面板出发 4 秒；
// 每周天 = 游戏里 ×1 的真实时长（window.__xm.tickMs，旧版没有就是 5 秒）。
// node tools/onboard.js <输出目录> [分钟=90] [--assert]
//   --assert：按 docs/ONBOARDING.md §6 的目标核对（每 10 分钟阻塞讲解数、新概念数、主界面可见元素数），不过就退出码 1
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ASSERT = process.argv.includes('--assert');
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
    if (go && /拜入|登台|为宗门|接受特训|知道了|谢|继续|下一|落幕|回洞府|好/.test(await go.textContent())) { await go.click(); await page.waitForTimeout(250); return true; }
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
      if (st.p.r <= L.MAXR && !L.isFull(st)) { const b = L.expBest(st); const a = st.stats.exp % 3 === 1 && L.apprOpen(st, 2) ? 2 : b.a; X.confirmExp(b.k, b.d, a); return 'exp'; }
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
    let s = await state();
    if (clock > MIN * 60) break;
    for (const k of s.onb) if (!lastUnl.includes(k)) { unlocks.push({ k, tick: s.tick, clock }); lastUnl.push(k); if (clock < 60 * 60) await page.screenshot({ path: `${out}/u-${fmtT(clock).replace(':', 'm')}-${k}.png` }); }
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
    await ev(() => { const X = window.__xm; X.L.flow(X.st, 1); X.onTick(); });
    clock += tickMs / 1000;
    await page.waitForTimeout(150);
    s = await state();
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
    const gb = guides.filter(x => x.btn && x.clock >= a && x.clock < z).length, ga = guides.filter(x => x.clock >= a && x.clock < z).length;
    const nc = Object.values(first).filter(v => v.clock >= a && v.clock < z).length;
    const ul = unlocks.filter(u => u.clock >= a && u.clock < z).map(u => u.k);
    const mx = Math.max(0, ...rows.filter(r => r.clock > a && r.clock <= z).map(r => r.main.total));
    const bb = bubbles.filter(x => x.clock >= a && x.clock < z).length;
    dec.push({ m, gb, ga, nc, ul, mx, bb });
  }
  L1.push('', '## 每 10 分钟', '', '| 分钟 | 阻塞讲解 | 全部讲解 | 气泡 | 新名词 | 解锁 | 主界面元素最多 |', '|---|---|---|---|---|---|---|', ...dec.map(d => `| ${d.m * 10}～${d.m * 10 + 10} | ${d.gb} | ${d.ga} | ${d.bb} | ${d.nc} | ${d.ul.join('、') || '—'} | ${d.mx} |`));
  L1.push('', '## 系统名词第一次出现', '', ...Object.entries(first).sort((a, b) => a[1].clock - b[1].clock).map(([k, v]) => `- ${fmtT(v.clock)} ${k}（${v.src}）：${v.txt.replace(/\n/g, ' ')}`));
  if (unlocks.length) L1.push('', '## 解锁', '', ...unlocks.map(u => `- ${fmtT(u.clock)} 第 ${u.tick} 周天：${u.k}`));
  L1.push('', '## 讲解', '', '| # | 手表 | 周天 | id | 台词 |', '|---|---|---|---|---|', ...guides.map(x => `| ${x.n} | ${fmtT(x.clock)} | ${x.tick} | ${x.id}${x.btn ? '' : '（点高亮）'} | ${x.text.replace(/\|/g, '/').slice(0, 80)} |`));
  L1.push('', '## 弹窗（标题 · 字数 · 按钮）', '', ...modals.filter(x => x.clock < 60 * 60).map(x => `- ${fmtT(x.clock)} 第 ${x.tick} 周天 ${x.title.replace(/\n/g, ' ')} · ${x.chars} 字 · ${x.btns} 钮`));
  // 核对（docs/ONBOARDING.md §6）
  const fails = [];
  if (ASSERT) {
    const T = { first10: 3, prePact: 6, blockPer10: 4, mainMax: [16, 20, 24, 26, 28, 30, 32, 34, 36] };
    const c10 = Object.values(first).filter(v => v.clock < 600).length;
    const sysFirst10 = unlocks.filter(u => u.clock < 600).length;
    if (sysFirst10 > T.first10) fails.push(`前 10 分钟解锁 ${sysFirst10} 个系统（目标 ≤ ${T.first10}）`);
    const pactAt = (modals.find(x => /三年之约/.test(x.title)) || {}).clock || 1e9;
    const pre = unlocks.filter(u => u.clock < pactAt).length;
    if (pre > T.prePact) fails.push(`三年之约前解锁 ${pre} 个系统（目标 ≤ ${T.prePact}）`);
    for (const d of dec) { if (d.m > 0 && d.gb > T.blockPer10) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟阻塞讲解 ${d.gb} 段（目标 ≤ ${T.blockPer10}）`); if (d.ul.length > 2) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟解锁 ${d.ul.length} 个（目标 ≤ 2）`); const mm = T.mainMax[Math.min(d.m, T.mainMax.length - 1)]; if (d.mx > mm) fails.push(`第 ${d.m * 10}～${d.m * 10 + 10} 分钟主界面元素最多 ${d.mx}（目标 ≤ ${mm}）`); }
    for (let i = 1; i < unlocks.length; i++) if (unlocks[i].clock - unlocks[i - 1].clock < 90) fails.push(`${unlocks[i - 1].k} → ${unlocks[i].k} 只隔 ${Math.round(unlocks[i].clock - unlocks[i - 1].clock)} 秒（目标 ≥ 90 秒）`);
    for (const r of rows) if ((r.main.badgeTxt || '').length > 1) fails.push(`${fmtT(r.clock)} 底栏同时 ${r.main.badgeTxt.length} 个角标（目标 ≤ 1）`);
    L1.push('', `前 10 分钟新名词 ${c10}（参考），解锁 ${sysFirst10}；三年之约在 ${fmtT(pactAt)}，之前解锁 ${pre}`);
    L1.push('', fails.length ? '## 未通过\n\n' + fails.map(f => '- ' + f).join('\n') : '## 节奏核对全部通过');
  }
  fs.writeFileSync(`${out}/onboard.md`, L1.join('\n'));
  fs.writeFileSync(`${out}/onboard.json`, JSON.stringify({ rows, guides, bubbles, modals, unlocks, first, dec }, null, 1));
  console.log(L1.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
  if (errs.length || fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });
