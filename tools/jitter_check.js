// 窗口切换抖动检查：node tools/jitter_check.js [--assert] [--dev "Pixel 7"|360|desk|both|all] [--only 名字片段] [--out 目录] [--shots [--shot-ms 0,50,120,250]] [--json 文件] [--html 别的 dist]
// 每个场景：先摆好局面、等动画停，再开始录——PerformanceObserver('layout-shift') 记 CLS（含点按后 500ms 内的，浏览器的 CLS 会把它们去掉，这里不去），
// 同时每个 requestAnimationFrame 记一次关键元素的 getBoundingClientRect（弹窗卷轴、标题、分页条、正文、底部按钮、主画面各块、战斗条、过场）。
// 判定（--assert 时不过就退出码 1）：
//   · CLS（不去点按）< 0.02；老祖引导框跟着目标换位、allow 里声明的“换屏一次到位”（进出战斗、目标卡展开）的位移单独列出，不算进去
//   · “一直在”的元素（开始录时就在屏上的）任何一帧到下一帧的位移 ≤ 4px（上下左右四条边取最大）；新出现的元素有 320ms 入场动画的豁免，之后也要 ≤ 4px
//   · 一直在的弹窗卷轴不能中途消失又出现（闪一下），不能透明度掉到 0.95 以下（重放入场动画）
// 场景见下面 SCEN；--shots 时每个场景在动作后 0 / 50 / 120 / 250 ms 各截一张（<out>/<dev>-<场景>-<n>.png）。
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');
const argv = process.argv.slice(2);
const flag = k => argv.includes(k);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ASSERT = flag('--assert'), SHOTS = flag('--shots');
const DEV = opt('--dev', 'both'), ONLY = opt('--only', ''), OUT = opt('--out', path.join(__dirname, '..', 'shots', 'jitter')), JSONF = opt('--json', '');
const HTML = opt('--html', path.join(__dirname, '..', 'dist', 'index.html'));   // 拿旧版 dist 量“修之前”用
const SHOT_MS = opt('--shot-ms', '0,50,120,250').split(',').map(Number);
const TH = { cls: 0.02, px: 4, grace: 320 };
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });

// ---------- 页内录像机（addInitScript 注入） ----------
function recorder() {
  const KEYS = {
    modal: '#modal:not([hidden])', sheet: '#modal:not([hidden]) > .sheet', title: '#modal:not([hidden]) > .sheet > header h2', tabs: '#modal:not([hidden]) .ktabs:not([hidden])',
    body: '#modal:not([hidden]) > .sheet > .body', foot: '#modal:not([hidden]) > .sheet > .foot',
    top: '#top', time: '#time', scene: '#sceneOuter', cult: '#cult', stats: '#stats', goal: '#goal', tick: '#tick', nav: '#nav', bt: '#bt:not([hidden])', cine: '.cn-wrap',
  };
  let on = false, frames = [], shifts = [], extra = {}, nid = 0, allowSel = '';
  const inAll = (e, sel) => (e.sources || []).length > 0 && e.sources.every(s => { const el = s.node && (s.node.nodeType === 1 ? s.node : s.node.parentElement); return !!(el && el.closest(sel)); });
  const desc = n => !n ? '?' : n.nodeType !== 1 ? (n.parentElement ? desc(n.parentElement) : '#text') : (n.id ? '#' + n.id : n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
  try {
    new PerformanceObserver(l => { if (!on) return; for (const e of l.getEntries()) shifts.push({ v: e.value, t: e.startTime, input: e.hadRecentInput, guide: inAll(e, '#guide'), allowed: !!allowSel && inAll(e, allowSel), src: (e.sources || []).slice(0, 3).map(s => `${desc(s.node)} y${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}→${Math.round(s.currentRect.height)}`) }); }).observe({ type: 'layout-shift', buffered: false });
  } catch (e) { /* 不支持 */ }
  const snap = () => {
    const f = { t: performance.now(), k: {} }, all = Object.assign({}, KEYS, extra);
    for (const k in all) {
      const el = document.querySelector(all[k]); if (!el) continue;
      const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
      if (!el.__jid) el.__jid = ++nid;
      const o = [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10, el.__jid];
      if (k === 'sheet') o.push(+getComputedStyle(el).opacity);
      if (k === 'modal') o.push(['mid', 'unl-m', 'duel-m', 'nav-m'].filter(c => el.classList.contains(c)).join(' '));
      if (k === 'body') o.push(el.scrollTop, el.offsetWidth - el.clientWidth);
      if (k === 'tabs') { const bd = el.closest('.body'); if (bd) o[1] = Math.round((r.top + bd.scrollTop * (parseFloat(document.documentElement.style.zoom) || 1)) * 10) / 10; }   // 电脑上整页有 zoom：scrollTop 是缩放前的   // 分页条在正文里时按“滚动前”的位置比：正文滚动不算跳
      f.k[k] = o;
    }
    f.sb = window.innerWidth - document.documentElement.clientWidth;
    frames.push(f);
  };
  const loop = () => { if (!on) return; snap(); requestAnimationFrame(loop); };
  window.__jit = {
    start(ex, allow) { extra = ex || {}; allowSel = (allow || []).map(k => KEYS[k] || extra[k]).filter(Boolean).join(', '); frames = []; shifts = []; on = true; snap(); requestAnimationFrame(loop); },
    stop() { snap(); on = false; return { frames, shifts }; },
  };
}

// ---------- 分析 ----------
function analyze(rec, allow) {
  allow = allow || [];
  const fr = rec.frames, f0 = fr[0], t0 = f0.t, snaps = {}, out = { snap: [], guideCls: 0, modeCls: 0, cls: 0, clsInput: 0, maxPx: 0, maxAt: '', moves: 0, flash: 0, fade: 0, frames: fr.length, srcs: [], ev: [] };
  // 老祖手把手的金框和说话框跟着目标换位置是有意的（指向下一个要点的东西）：单独记 guideCls，不算进 CLS
  for (const s of rec.shifts) { if (s.guide) { out.guideCls += s.v; continue; } if (s.allowed) { out.modeCls += s.v; continue; } out.cls += s.v; if (s.input) out.clsInput += s.v; if (s.v > 0.001 && out.srcs.length < 4) out.srcs.push(s.src.join(' | ')); }
  const keys = new Set(); fr.forEach(f => Object.keys(f.k).forEach(k => keys.add(k)));
  for (const k of keys) {
    const persist = !!f0.k[k];
    let seen = persist, gone = -1, appear = persist ? -1e9 : null;
    for (let i = 1; i < fr.length; i++) {
      const a = fr[i - 1].k[k], b = fr[i].k[k], t = fr[i].t;
      if (b && !a) { if (seen && gone >= 0 && (k === 'sheet' || k === 'modal') && persist) { out.flash++; out.ev.push(`${k} 消失 ${Math.round(t - gone)}ms 又出现`); } if (appear === null || (!persist && gone >= 0)) appear = t; seen = true; gone = -1; }
      if (a && !b) gone = t;
      // 卷轴换了一张、而且窗口种类变了（底部卷轴 ↔ 居中 ↔ 解锁卡）= 新窗口，给入场动画豁免
      if (a && b && (k === 'modal' || ((k === 'sheet' || k === 'title' || k === 'body' || k === 'foot' || k === 'tabs') && a[4] !== b[4]))) { const ma = fr[i - 1].k.modal, mb = fr[i].k.modal; if (ma && mb && ma[5] !== mb[5]) appear = t; }
      if (a && b) {
        if (t - appear < TH.grace) continue;
        // 正文（.body）只看上沿和左右：底下多了一排按钮、正文变矮不算动
        const d = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[0] + a[2] - b[0] - b[2]), k === 'body' ? 0 : Math.abs(a[1] + a[3] - b[1] - b[3]));
        // allow 里的元素（换屏模式：进出战斗、目标卡展开）可以“一下到位”地挪一次，挪第二次就算抖
        if (allow.includes(k)) { if (d > TH.px) { snaps[k] = (snaps[k] || 0) + 1; if (snaps[k] > 1) { out.moves++; out.maxPx = Math.max(out.maxPx, d); out.maxAt = k; out.ev.push(`${k} @${Math.round(t - t0)}ms 第 ${snaps[k]} 次挪 ${d.toFixed(1)}px`); } else out.snap.push(`${k} ${d.toFixed(0)}px`); } continue; }
        if (d > TH.px) { out.moves++; if (out.ev.length < 8) out.ev.push(`${k} @${Math.round(t - t0)}ms 移 ${d.toFixed(1)}px（x ${a[0]}→${b[0]} y ${a[1]}→${b[1]} w ${a[2]}→${b[2]} h ${a[3]}→${b[3]}${a[4] !== b[4] ? ' 换了元素' : ''}）`); }
        if (d > out.maxPx) { out.maxPx = d; out.maxAt = k; }
      }
      if (k === 'sheet' && b && persist && b[5] < 0.95 && t - appear >= TH.grace) { out.fade++; if (out.fade === 1) out.ev.push(`sheet @${Math.round(t - t0)}ms 透明度 ${b[5].toFixed(2)}（重放入场）`); }
    }
  }
  return out;
}

// ---------- 场景 ----------
(async () => {
  const devs = DEV === 'both' ? ['Pixel 7', '360'] : DEV === 'all' ? ['Pixel 7', '360', 'desk'] : [DEV];   // desk：电脑浏览器（滚动条占位）
  const report = {}, fails = [];
  for (const dev of devs) {
    const tag = dev === '360' ? '360' : dev === 'desk' ? 'desk' : 'p7';
    const b = await chromium.launch();
    const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : dev === 'desk' ? { viewport: { width: 1024, height: 760 }, deviceScaleFactor: 1 } : { ...devices[dev] };
    const ctx = await b.newContext(opts);
    await ctx.addInitScript(recorder);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto('file://' + path.resolve(HTML));
    await page.waitForTimeout(400);
    for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
    await page.click('#goStart'); await page.waitForTimeout(700);
    const ev = (fn, a) => page.evaluate(fn, a);
    const wait = ms => page.waitForTimeout(ms);
    const closeAll = async () => { await ev(() => { for (let i = 0; i < 6; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await wait(450); await ev(() => { for (let i = 0; i < 6; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await wait(100); };
    const rows = report[tag] = [];
    const scen = async (name, prep, act, o) => {
      o = o || {};
      if (ONLY && !name.includes(ONLY)) { if (prep) await prep(); await wait(o.pre || 400); await act(); await wait(o.ms || 700); return; }   // 不录，但照样走一遍（后面的场景接着这个局面）
      if (prep) await prep();
      await wait(o.pre || 400);
      await ev(([ex, al]) => window.__jit.start(ex, al), [o.keys || {}, o.allow || []]);
      await act();
      if (SHOTS) { let tt = 0; for (const [n, ms] of SHOT_MS.map((x, i) => [i + 1, x])) { await wait(ms - tt); tt = ms; await page.screenshot({ path: `${OUT}/${tag}-${name.replace(/[^\w一-鿿→-]+/g, '_')}-${n}.png` }); } }
      await wait(o.ms || 700);
      const r = analyze(await ev(() => window.__jit.stop()), o.allow);
      r.name = name; rows.push(r);
      const ok = r.cls < TH.cls && r.maxPx <= TH.px && !r.flash && !r.fade;
      if (!ok) fails.push(`${tag} ${name}`);
      console.log(`${ok ? '  ok  ' : '  JIT '} ${tag} ${name.padEnd(22)} CLS ${r.cls.toFixed(4)}${r.guideCls > 0.001 ? `（引导框换位 ${r.guideCls.toFixed(3)} 另计）` : ''}${r.modeCls > 0.001 ? `（换屏一次到位 ${r.modeCls.toFixed(3)} 另计）` : ''}  最大位移 ${r.maxPx.toFixed(1)}px${r.maxAt ? '(' + r.maxAt + ')' : ''}  >4px ${r.moves} 帧  闪 ${r.flash}  重放 ${r.fade}  [${r.frames} 帧]${r.snap.length ? '  一次到位：' + r.snap.join(' ') : ''}`);
      if (!ok || process.env.JV) { for (const e of r.ev) console.log('         · ' + e); for (const s of r.srcs) console.log('         ~ ' + s); }
    };
    const click = sel => () => page.click(sel);
    await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));

    // ===== 开局：第一趟（手把手）→ 结算卡（翻牌、对比行）=====
    await scen('开局·历练出发页', null, click('[data-nav="exp"]'));
    await scen('出发页→确认页', null, click('#modal .card[data-k="0"]'));
    const BT_OK = ['scene', 'goal', 'cult', 'stats', 'tick'];   // 进出战斗：修为条、数值格、传讯换成战斗条，场景让高度——一下到位；顶栏、时间条、底栏不动
    await scen('确认页→出发(战斗画面)', null, click('#modal .foot .btn.gold'), { ms: 900, allow: BT_OK });
    await ev(() => window.__xm.setSpeed(0));
    await scen('战斗进行', null, () => wait(1500), { ms: 300, allow: BT_OK });
    await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));
    await scen('战斗结束→结算卡', null, () => ev(() => { const X = window.__xm; if (X.st.exp) { X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); } }), { ms: 1200, allow: BT_OK });
    await scen('结算卡翻牌', null, () => ev(() => { const b = document.querySelector('#modal .lt-flip'); if (b && b.flipAll) b.flipAll(); }), { ms: 1800 });
    await scen('结算卡关闭→下一张', null, () => ev(() => window.__xm.closeModal()), { ms: 900 });
    await closeAll();

    // ===== 中期局面：全开（照 kairo_check 的造法） =====
    await ev(() => {
      const { st, L } = window.__xm;
      L.onbAll(st); st.guide = { step: 99, done: true };
      st.stones = 5e4; st.p.r = 3; st.p.s = 2; st.p.xp = L.pNeed(st.p) * 0.4; st.flags.maxR = 3; st.flags.maxI = 14; st.tick = 120; st.year = 44;
      for (const id of ['x_houtu', 'x_qingmu', 'z_hanyue', 'z_liuyun', 'm_lianxi']) L.giveArt(st, id);
      L.equipArt(st, 'x_houtu'); L.equipArt(st, 'z_hanyue'); L.equipArt(st, 'm_lianxi'); st.arts.swapAt = -99;
      st.home = Object.assign(st.home, { cave: 4, array: 9, field: 8, furnace: 5 });
      st.pact = 1; st.beaten.mu = 1; st.rank = 30; st.stats.exp = 25; st.stats.tour = 3; st.retreat = null; st.exp = null; st.herbs = 120; st.pills = 3;
      L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900;
      st.gear = L.newGear(); st.ore = 900; st.treasure = 2;
      L.gearDrop(st, 'w', 4, { base: 'w4_1' }); L.gearDrop(st, 'r', 3, { base: 'r3_0' }); L.gearDrop(st, 'o', 4, { base: 'o_cul4' });
      L.gearDrop(st, 'w', 5, {}); L.gearDrop(st, 'w', 2, {});
      st.pets = []; st.petOut = -1; st.petPend = []; st.feed = 400;
      L.petGive(st, { sp: 'p_hu2', src: 'shop' }); L.petGive(st, { sp: 'p_he' }); st.pets[0].lv = 4;
      st.storyQ = []; st.achQ = []; st.market.evQ = []; st.visitor = null;
      L.checkQuests(st); st.achQ = []; st.storyQ = [];
      for (const h of window.__xm.hints) st.hintSeen[h.id] = 1;
      window.__xm.closeModal();
    });
    await closeAll();
    await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));

    // ===== 底栏五格互点（开着一个面板时直接点另一格）=====
    await scen('底栏·打开历练', null, click('[data-nav="exp"]'));
    for (const [a, b2] of [['exp', 'home'], ['home', 'gear'], ['gear', 'world'], ['world', 'path'], ['path', 'exp'], ['exp', 'gear'], ['gear', 'home']]) await scen(`底栏 ${a}→${b2}`, null, click(`[data-nav="${b2}"]`));
    await scen('底栏·同格关闭', null, click('[data-nav="home"]'));
    // ===== 分页切换 =====
    const tabs = async (nav, list) => {
      await closeAll(); await page.click(`[data-nav="${nav}"]`); await wait(400);
      let prev = await ev(() => { const o = document.querySelector('#modal [data-kt].on'); return o ? o.dataset.kt : ''; });
      for (const k of list) {
        if (!(await page.$(`#modal [data-kt="${k}"]`))) { console.log(`         （${nav} 没有 ${k} 页）`); continue; }
        await scen(`分页 ${prev}→${k}`, null, click(`#modal [data-kt="${k}"]`)); prev = k;
      }
    };
    await tabs('gear', ['art', 'pets', 'bag', 'gear']);
    await tabs('world', ['sect', 'market', 'bond', 'rank']);
    await tabs('path', ['attr', 'rec', 'set', 'path']);
    await tabs('home', ['field', 'alch', 'zhen', 'home']);
    // ===== 设置页：音量格（原地重画，正文滚着也不跳回顶）、存档页进出 =====
    await closeAll();
    await scen('设置页打开', () => ev(() => window.__xm.showSettings()), () => ev(() => { const b = document.querySelector('#modal .sheet .body'); if (b) b.scrollTop = 30; }));
    for (const [w, n] of [['m', 2], ['s', 4], ['m', 5]]) await scen(`设置·音量 ${w}${n}`, null, () => ev(([w, n]) => { const i = document.querySelector(`#modal .kvol[data-vol="${w}"] i[data-i="${n}"]`); if (i) i.click(); }, [w, n]));
    { const top = await ev(() => { const b = document.querySelector('#modal .sheet .body'); return b ? [b.scrollTop, b.scrollHeight - b.clientHeight] : [0, 0]; }); const ok = top[1] < 1 || top[0] > 0; console.log(`${ok ? '  ok  ' : '  JIT '} ${tag} 调音量后正文滚动位置 ${top[0]}（可滚 ${top[1]}）`); if (!ok) fails.push(`${tag} 调音量后正文跳回顶`); }
    if (await page.$('#btnSaves')) {
      await scen('设置→存档页', null, click('#btnSaves'));
      await scen('存档页→手动格', null, () => ev(() => { const r = document.querySelector('#modal [data-sv="m0"]'); if (r) r.click(); }));
      await scen('手动格→取消回存档页', null, () => ev(() => { const b = [...document.querySelectorAll('#modal .foot .btn')].find(x => /取消|返回/.test(x.textContent)); if (b) b.click(); }));
      await scen('存档页→回设置', null, click('#svBack'));
    } else console.log('         （没有存档页）');
    await closeAll();
    // ===== 弹窗打开 / 关闭（主画面不该动）=====
    await scen('年报打开', null, () => ev(() => window.__xm.showYearReport()));
    await scen('年报关闭', null, () => ev(() => window.__xm.closeModal()), { ms: 900 });
    await closeAll();
    await scen('解锁卡打开', null, () => ev(() => window.__xm.showUnlock('field')));
    await scen('解锁卡【带我去】', null, click('#unlGo'));
    await closeAll();
    await scen('章末卡打开', null, () => ev(() => window.__xm.showChapterCard(0)));
    await scen('章末卡关闭', null, () => ev(() => window.__xm.closeModal()), { ms: 900 });
    await closeAll();
    // 弹窗 A 关闭、队列里的 B 接着开（年报 → 解锁卡）
    await scen('年报关→解锁卡开', () => ev(() => { const X = window.__xm; X.showYearReport(); }), () => ev(() => { const X = window.__xm; X.closeModal(); X.showUnlock('alch'); }), { ms: 900 });
    await closeAll();
    await scen('同帧 A 关→B 开', () => ev(() => { window.__xm.showYearReport(); }), () => ev(() => { const X = window.__xm; X.closeModal(); X.showChapterCard(0); }), { ms: 900 });
    await closeAll();
    // 排队的弹窗：A 点【关闭】，B 在 400ms 后由 processQueue 弹出（A 消失到 B 出现之间是主画面，不算闪）
    await scen('排队 A 关→B 开', () => ev(() => { const X = window.__xm; if (!X.pushPopup) { X.showUnlock('field'); return; } X.pushPopup(() => X.showUnlock('field')); X.pushPopup(() => X.showUnlock('alch')); }), () => page.click('#unlOk'), { ms: 1200 });
    await closeAll();
    // ===== 变强页：动作卡原地重排 =====
    await scen('变强页打开', null, () => ev(() => window.__xm.showGrowth('atk')));
    await scen('变强页页签', null, () => ev(() => { const b = [...document.querySelectorAll('#modal [data-gtab]')].find(x => !x.classList.contains('on')); if (b) b.click(); }));
    await scen('变强页动作卡', () => ev(() => { window.__xm.closeModal(); window.__xm.showGrowth('atk'); window.__xm.__rng0 = window.__xm.L.rng; window.__xm.L.rng = () => 0; }), () => ev(() => { const A = window.__xm.L.advise(window.__xm.st, 'atk'), i = A.acts.findIndex(a => a.instant && !a.gap); const b = document.querySelector(`#modal [data-adv="${i >= 0 ? i : 0}"]`); if (b) b.click(); }), { ms: 900 });
    await ev(() => { window.__xm.L.rng = window.__xm.__rng0; });
    await scen('变强页明细展开', null, () => ev(() => { const d = document.querySelector('#modal details.gw-det summary'); if (d) d.click(); }));
    await closeAll();
    // ===== 目标卡展开 / 收起 =====
    // 目标卡自己变高 / 变矮，场景让出这一截：场景、修为条、数值格、目标卡本身跟着动是应该的；顶栏、时间条、传讯、底栏不许动
    const GOAL_OK = ['goal', 'scene', 'cult', 'stats'];
    await scen('目标卡展开', null, () => ev(() => document.querySelector('#goal .g3').click()), { allow: GOAL_OK });
    await scen('目标卡收起', null, () => ev(() => document.querySelector('#goal .g3').click()), { allow: GOAL_OK });
    await scen('目标卡展开(底栏在屏内)', null, () => ev(() => document.querySelector('#goal .g3').click()), { allow: GOAL_OK, keys: { navBtn: '#nav button:last-child' } });
    { const nb = await ev(() => { const r = document.querySelector('#nav').getBoundingClientRect(); return { b: r.bottom, h: window.innerHeight }; }); const ok = nb.b <= nb.h + 0.5; console.log(`${ok ? '  ok  ' : '  JIT '} ${tag} 目标卡展开后底栏 bottom ${nb.b.toFixed(1)} / 屏高 ${nb.h}`); if (!ok) fails.push(`${tag} 目标卡展开把底栏挤出屏幕`); }
    await ev(() => document.querySelector('#goal .g3').click()); await wait(300);
    // ===== 历练出发页 → 战斗 → 结算 =====
    await scen('出发页', null, click('[data-nav="exp"]'));
    await scen('出发页→确认页(中期)', null, click('#modal .card[data-k="0"]'));
    await ev(() => window.__xm.setSpeed(0));
    await scen('确认页→战斗(中期)', null, click('#modal .foot .btn.gold'), { ms: 2500, allow: BT_OK });
    await scen('战斗进行(中期)', null, () => wait(1500), { ms: 300, allow: BT_OK });
    await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));
    await scen('战斗→结算卡(中期)', null, () => ev(() => { const X = window.__xm; if (X.st.exp) { X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); } }), { ms: 1200, allow: BT_OK });
    await scen('结算卡翻牌(中期)', null, () => ev(() => { const b = document.querySelector('#modal .lt-flip'); if (b && b.flipAll) b.flipAll(); }), { ms: 2200 });
    await closeAll();
    // ===== 过场结束接结果卡（突破）=====
    await scen('突破页', () => ev(() => { const { st, L } = window.__xm; st.p.xp = L.pNeed(st.p) * 2; }), () => ev(() => window.__xm.showBreakthrough()));
    await scen('突破→过场→结果卡', null, () => ev(() => { const b = document.querySelector('#modal .foot .btn.gold'); if (b) b.click(); }), { ms: 2500 });
    await closeAll();

    if (errs.length) { console.log('  页面错误：' + errs.slice(0, 5).join(' | ')); fails.push(`${tag} 页面错误`); }
    await b.close();
  }
  if (JSONF) fs.writeFileSync(JSONF, JSON.stringify(report, null, 1));
  const n = Object.values(report).reduce((s, r) => s + r.length, 0);
  console.log(fails.length ? `\n${fails.length}/${n} 个场景有抖动：\n  ` + fails.join('\n  ') : `\n${n} 个场景全部平稳`);
  if (ASSERT && fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.stack || e.message); process.exit(1); });
