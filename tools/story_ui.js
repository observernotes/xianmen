// 剧情界面（docs/STORY_PLAN.md §6、§8；src/ui/talk.js）测试与截图：node tools/story_ui.js [输出目录=docs/story_mock] ["Pixel 7"|360]
// 断言：对话场景——播的时候【下一季】不可点（时间不再自己走，docs/AP_PLAN.md §8.4）；打赢赵乾的结果卡关掉后 500ms 内出的是 s3_zhao_fall（零延迟）；点一下出完 / 下一句；【跳过】跳到选项、选项跳不过去；有条件的选项灰着并写明缺什么；版式（按钮 ≥ 44px、没有横向溢出、台词不超过两行）；
//       选完落到结算卡，标志位置上；数据式分镜 ⑪～㉝ 每段都能画出每个镜头；飞升 → 结局卡（八个结局各出一张，正文 120～200 字）。
//       D 线：后日谈逐张翻、结算页、再登天门、图鉴结局页、回忆分组、转世开场（前缘、问过天）。
// 默认（playwright）对话与过场是“快放”的：本脚本把 window.__xm_talk.fast / __xm_cine.fast 设为 false 才看得到画面。
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'docs', 'story_mock');
const dev = process.argv[3] || 'Pixel 7';
require('fs').mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const b = await chromium.launch();
  const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
  const tag = dev === '360' ? '360' : 'p7';
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a);
  for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  await ev(() => { const X = window.__xm; X.st.guide.done = true; X.st.guide.step = 999; X.closeModal(); window.__xm_talk.fast = false; });
  const on = () => ev(() => window.__xm_talk.on);
  const shot = n => page.screenshot({ path: `${out}/${tag}_${n}.png` });
  const layout = () => ev(() => {
    const r = document.querySelector('.tk-wrap'); if (!r) return null; const vw = window.innerWidth;
    const sk = r.querySelector('.tk-skip').getBoundingClientRect(), tx = r.querySelector('.tk-text'), cv = r.querySelector('.tk-cv').getBoundingClientRect();
    const over = [...r.querySelectorAll('*')].filter(x => !x.hidden && !x.closest('[hidden]') && !x.closest('.tk-stage') && x.tagName !== 'EM')   /* 舞台震屏、半身像滑入、重音字落下的那一下不算溢出（.tk-wrap 裁掉了） */
     .some(x => { const q = x.getBoundingClientRect(); return q.width && (q.right > vw + 1 || q.left < -1); });
    const picks = [...r.querySelectorAll('.tk-picks:not([hidden]) .tk-pick')].map(x => ({ h: x.getBoundingClientRect().height, dis: x.disabled, t: x.textContent }));
    return { skH: sk.height, skW: sk.width, lines: Math.round(tx.getBoundingClientRect().height / parseFloat(getComputedStyle(tx).lineHeight)), over, cvW: cv.width, picks, bottom: r.querySelector('.tk-box').getBoundingClientRect().bottom, vh: window.innerHeight };
  });
  // 把一场戏从头点到选项（或点完）：记下最多几行、有没有溢出
  const walk = async () => { let mx = 0, over = false, n = 0; for (; n < 80; n++) { const o = await on(); if (!o || o.picking) break; await ev(() => { window.__xm_talk.tap(); }); const l = await layout(); if (l && !l.picks.length) { mx = Math.max(mx, l.lines); over = over || l.over; } await ev(() => { window.__xm_talk.tap(); }); await page.waitForTimeout(20); } return { mx, over, n }; };

  // ---------- 破庙第一夜：停表、点一下、跳过 ----------
  const xp = () => ev(() => window.__xm.st.p.xp + window.__xm.st.tick * 1e6);
  await ev(() => { const s = window.__xm.st; s.storyQ.length = 0; window.__xm_cine.fast = true; window.__xm_talk.play('s1_night'); });
  await page.waitForTimeout(700);
  let o = await on(); check(o && o.id === 's1_night', `对话场景播起来了（${o && o.id}）`);
  const a0 = await xp(); await page.waitForTimeout(900); const a1 = await xp();
  const nb = await ev(() => ({ dis: document.getElementById('btnNext').disabled, busy: window.__xm.busyUI, t0: window.__xm.st.tick }));
  await ev(() => window.__xm.nextSeason(true));
  check(a0 === a1 && nb.dis && nb.busy && (await ev(() => window.__xm.st.tick)) === nb.t0, '对话在播的时候【下一季】不可点、时间不动');
  await shot('talk_1_line');
  let l = await layout();
  check(l && l.skH >= 44 && l.skW >= 44 && !l.over && l.lines <= 2 && l.bottom < l.vh - 20, `版式：跳过 ${l && Math.round(l.skW)}×${l && Math.round(l.skH)}、台词 ${l && l.lines} 行、画面 ${l && Math.round(l.cvW)}px、没有溢出`);
  const i0 = o.i; await page.click('.tk-wrap', { position: { x: 60, y: 300 } }); await page.waitForTimeout(80); await page.click('.tk-wrap', { position: { x: 60, y: 300 } }); await page.waitForTimeout(120);
  o = await on(); check(o && o.i > i0, `点一下出完、再点下一句（第 ${i0} → ${o && o.i} 行）`);
  await page.click('.tk-skip'); await page.waitForTimeout(200);
  o = await on(); check(o && o.picking, '【跳过】跳到选项');
  await shot('talk_2_pick');
  await page.click('.tk-skip'); await page.waitForTimeout(150);
  o = await on(); check(o && o.picking, '选项跳不过去');
  await page.waitForTimeout(700); await page.click('.tk-pick[data-c="2"]'); await page.waitForTimeout(300);
  await walk(); await page.waitForTimeout(400);
  check(!(await on()) && (await ev(() => !!window.__xm.st.eflags.oath_r && !document.querySelector('#modal').hidden)), '选完：结果里的台词播完，落到结算卡，oath_r 置上');
  await shot('talk_3_result');
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(500);

  // ---------- 关键抉择、回响、有条件的选项 ----------
  await ev(() => { const s = window.__xm.st; s.pact = 1; s.eflags.beat_mu = 1; s.eflags.mu_letter = 1; s.storyQ.length = 0; window.__xm_talk.play('s1_pact_after'); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { const t = await ev(() => !document.querySelector('.tk-echo').hidden); if (t) break; await ev(() => { window.__xm_talk.tap(); window.__xm_talk.tap(); }); await page.waitForTimeout(60); }
  check(await ev(() => !document.querySelector('.tk-echo').hidden), '回响小标亮了（拆过那封信）');
  await page.waitForTimeout(500); await shot('talk_4_echo');
  await walk(); await page.waitForTimeout(1500); await shot('talk_5_key');
  l = await layout(); check(l && l.picks.length === 3 && l.picks.every(p => p.h >= 44) && !l.over && l.bottom < l.vh, `抉择一：三个选项，每个 ≥ 44px（${l && l.picks.map(p => Math.round(p.h)).join('/')}）`);
  await page.waitForTimeout(600); await page.click('.tk-pick[data-c="1"]'); await page.waitForTimeout(1500); await walk(); await page.waitForTimeout(400);
  check(await ev(() => !!window.__xm.st.eflags.mu_spare), '抉择一 → mu_spare');
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(400);
  await ev(() => { const s = window.__xm.st; s.eflags.st_truth = 1; s.eflags.beat_xue = 1; s.storyQ.length = 0; window.__xm_talk.play('s7_war'); });
  await page.waitForTimeout(300); await walk(); await page.waitForTimeout(1500); await shot('talk_6_gate');
  l = await layout(); check(l && l.picks.length === 3 && l.picks[2].dis && /没有人肯听你说话/.test(l.picks[2].t), `抉择六：止战灰着，写明缺什么（${l && l.picks[2] && l.picks[2].t.slice(-14)}）`);
  await ev(() => window.__xm_talk.close()); await page.waitForTimeout(200);

  // ---------- 演出：重音字、推近、黑屏字幕、抉择前的静默、选后的回响 ----------
  {
    const until = async (re, max) => { for (let i = 0; i < (max || 60); i++) { const o = await on(); if (!o || o.picking) return false; const t = await ev(() => { const r = document.querySelector('.tk-wrap'); const b = r.querySelector('.tk-black'); return (b.hidden ? r.querySelector('.tk-text').textContent : '【黑】' + b.textContent); }); if (re.test(t)) return true; await ev(() => { window.__xm_talk.tap(); }); await page.waitForTimeout(30); } return false; };   // 一次只点一下：先出完这句、看一眼，再点才是下一句
    const stage = () => ev(() => window.__xm_talk.stage);
    await ev(() => { const s = window.__xm.st; s.storyQ.length = 0; s.npc.mo = s.npc.mo || { aff: 30 }; window.__xm_talk.play('story_r6'); }); await page.waitForTimeout(200);
    let ok = await until(/擦着他的肩/); await page.waitForTimeout(900);
    let sg = await stage();
    check(ok && sg && sg.zoom > 1.2 && /^cg:stab:1/.test(sg.bg) && (await ev(() => !!document.querySelector('.tk-text em'))), `真相那一镜：换到“那一剑”第二帧、镜头推近 ×${sg && sg.zoom}、重音字`);
    await shot('show_1_reveal');
    ok = await until(/天衡/); await page.waitForTimeout(700); await shot('show_2_name');
    check(ok && (await ev(() => document.querySelector('.tk-pt.r.on') && !document.querySelector('.tk-pt.r').hidden)), '“天衡。”：说话的人亮着');
    await walk(); await page.waitForTimeout(300);
    sg = await stage(); check(sg && sg.dimT >= 0.4 && (await ev(() => document.querySelector('.tk-picks').hidden)), '关键抉择之前：舞台暗下来、先静一拍（选项还没出）');
    await page.waitForTimeout(1300); await shot('show_3_keypick');
    check(await ev(() => !document.querySelector('.tk-picks').hidden && document.querySelector('.tk-wrap').classList.contains('keypick')), '静默之后选项浮上来');
    await page.waitForTimeout(500); await page.click('.tk-pick[data-c="2"]'); await page.waitForTimeout(1250);
    check(await ev(() => { const b = document.querySelector('.tk-black'); return !b.hidden && /师父，都过去了/.test(b.textContent); }), '选后的回响：闪白，黑屏上落下你选的那句话');
    await shot('show_4_echo_black');
    await page.waitForTimeout(900); ok = await until(/偏挑这种时候/); await page.waitForTimeout(600); await shot('show_5_tear');
    check(ok, '接着是人物的反应（老祖落泪）');
    await ev(() => window.__xm_talk.close()); await page.waitForTimeout(100);
    await ev(() => { const s = window.__xm.st; s.storyQ.length = 0; s.eflags.st_justice = 1; window.__xm_talk.play('tianheng_2'); }); await page.waitForTimeout(200);
    ok = await until(/【黑】戒指很久没有动静/); await page.waitForTimeout(900); await shot('show_6_black');
    check(ok, '了断：黑屏字幕“戒指很久没有动静。”');
    await ev(() => window.__xm_talk.close()); await page.waitForTimeout(100);
    await ev(() => { const s = window.__xm.st; s.storyQ.length = 0; window.__xm_talk.play('s7_war'); }); await page.waitForTimeout(200);
    ok = await until(/白衣，负剑/); await page.waitForTimeout(900); sg = await stage(); await shot('show_7_zoom');
    check(ok && sg.zoom > 1.5, `阵前：镜头推到盟主旗下（×${sg && sg.zoom}）`);
    await ev(() => { window.__xm_talk.close(); delete window.__xm.st.eflags.st_justice; delete window.__xm.st.eflags.vow_letgo; delete window.__xm.st.eflags.st_truth; window.__xm.st.eflags.st_truth = 1; window.__xm.st.evDone = Object.assign(window.__xm.st.evDone, {}); delete window.__xm.st.evDone.story_r6; }); await page.waitForTimeout(100);
  }

  // ---------- 每场对话走一遍：台词不超过两行、没有溢出 ----------
  const ids = await ev(() => window.__xm.L.events().filter(e => e.talk).map(e => e.id));
  for (const id of ids) {
    await ev(id => { const s = window.__xm.st; s.storyQ.length = 0; window.__xm_talk.play(id); }, id);
    await page.waitForTimeout(150);
    const w = await walk(); await page.waitForTimeout(1350); const p = await layout();
    check(w.mx <= 2 && !w.over && p && !p.over && p.bottom < p.vh, `${id}：${w.n} 句，最多 ${w.mx} 行，选项 ${p ? p.picks.length : 0} 个，没有溢出`);
    if (id === 'story_r6' || id === 'tianheng_2' || id === 's9_gate' || id === 's2_invite') await shot('talk_' + id);
    await ev(() => window.__xm_talk.close()); await page.waitForTimeout(60);
  }

  // ---------- 数据式分镜：每段每个镜头画一帧 ----------
  await ev(() => { window.__xm_cine.fast = false; });
  const cids = await ev(() => Object.keys(window.__xm_talk.DATA));
  let bad = 0;
  for (const id of cids) {
    await ev(id => { window.__xm.st.daolv = id === 'end_daolv_ye' ? 'ye' : 'su'; window.__xm.st.eflags.vow_letgo = 1; window.__xm_cine.play(id, {}, { recall: true, force: true }); }, id);
    await page.waitForTimeout(80);
    const c = await ev(() => window.__xm_cine.on); if (!c) { check(false, `${id}：没播起来`); bad++; continue; }
    for (let i = 0; i < c.n; i++) {
      await ev(([i]) => window.__xm_cine.seek(i, 2500), [i]); await page.waitForTimeout(70);
      if (!(await ev(() => window.__xm_cine.on))) { check(false, `${id}：第 ${i + 1} 镜画不出来`); bad++; break; }
      const sub = await ev(() => { const s = document.querySelector('.cn-sub'); return s ? s.scrollWidth <= window.innerWidth : true; });
      if (!sub) { check(false, `${id}：第 ${i + 1} 镜字幕太长`); bad++; }
      if (i === c.n - 1 && /^(najian|end_|zhen_stop|liaoduan_spared|zuihou_kept|ring)/.test(id)) await page.screenshot({ path: `${out}/${tag}_cine_${id}.png` });
    }
    await ev(() => { const s = document.querySelector('.cn-skip'); if (s) s.click(); }); await page.waitForTimeout(60);
  }
  check(!bad, `数据式分镜 ${cids.length} 段，每个镜头都画得出来、字幕一行`);
  await ev(() => { window.__xm.st.daolv = null; delete window.__xm.st.eflags.vow_letgo; window.__xm_cine.fast = true; });

  // ---------- 结局：八个结局各出一张卡 ----------
  const ENDS = [['ascend', { asc_go: 1 }], ['hermit', { asc_stay: 1 }], ['wentian', { asc_break: 1 }], ['shitu', { asc_go: 1, elder_kept: 1 }], ['gufeng', { asc_go: 1, mu_shame: 1, vow_blood: 1, tianheng_dead: 1 }], ['daolv', { asc_go: 1 }, { daolv: 'ye' }], ['mozun', { asc_go: 1, war_mo: 1 }, { origin: 'moyi', bestRank: 1 }], ['summit', { asc_go: 1, war_stop: 1 }, { lord: 1 }]];
  for (const [id, fl, x] of ENDS) {
    const got = await ev(([fl, x]) => {
      const X = window.__xm, s = X.st; X.closeModal();
      for (const f of ['asc_go', 'asc_stay', 'asc_break', 'elder_kept', 'mu_shame', 'mu_spare', 'vow_blood', 'tianheng_dead', 'war_mo', 'war_stop']) delete s.eflags[f];
      Object.assign(s.eflags, fl); if (!fl.mu_shame) s.eflags.mu_spare = 1; s.p.r = 9; s.daolv = (x && x.daolv) || null; s.origin = (x && x.origin) || 'qitu'; s.bestRank = (x && x.bestRank) || 5; s.flags.endCine = 0;
      s.sect = x && x.lord ? { id: 'jian', rank: 6, best: 1, total: 0, pts: 0, joined: 0, veins: 0, order: X.L.NINE.map(q => q.id), meets: 0, tasks: [], build: { ward: 0, lib: 0, vein: 0 } } : null;
      window.__xm_talk.ascend();
      const E = X.L.endingOf(s); return { id: E.id, title: (document.querySelector('#modal .big') || {}).textContent, epi: X.L.epilogue(s).length, paras: document.querySelectorAll('#modal .end-text p').length, len: E.paras.join('').length };
    }, [fl, x]);
    await page.waitForTimeout(250);
    check(got.id === id && !!got.title && got.paras >= 5 && got.len >= 120 && got.len <= 200, `结局 ${id}：${got.title}（正文 ${got.paras} 段 ${got.len} 字，后日谈 ${got.epi} 张）`);
    if (['wentian', 'gufeng', 'hermit'].includes(id)) await shot('end_' + id);
  }
  // ---------- D 线：结局卡三页、再登天门、图鉴结局页、回忆分组、转世开场 ----------
  {
    // 后日谈一张一张翻：翻完按钮变成“这一世”，再点到结算页（有去留两个按钮）
    await ev(() => { const X = window.__xm, s = X.st; X.closeModal(); for (const f of ['asc_go', 'asc_stay', 'asc_break', 'war_mo']) delete s.eflags[f]; Object.assign(s.eflags, { asc_break: 1, war_stop: 1, st_truth: 1, st_farewell: 1, tianheng_exposed: 1, zhao_owes: 1 }); s.sect = null; s.origin = 'qitu'; s.flags.endCine = s.rebirth + 1; window.__xm_talk.ascend(); });
    await page.waitForTimeout(200); await shot('end_page1');
    const n = await ev(() => window.__xm.L.epilogue(window.__xm.st).length);
    await page.click('#modal [data-fi="0"]'); await page.waitForTimeout(150);
    for (let i = 1; i < n; i++) { await page.click('#epiList'); await page.waitForTimeout(40); }
    const ep = await ev(() => ({ cards: document.querySelectorAll('#modal .epi-card').length, pts: document.querySelectorAll('#modal .epi-card img').length, btn: document.querySelector('#modal [data-fi="1"]').textContent, over: [...document.querySelectorAll('#modal *')].some(x => { const q = x.getBoundingClientRect(); return q.width && (q.right > window.innerWidth + 1 || q.left < -1); }) }));
    check(n >= 4 && ep.cards === n && ep.pts === n && /这一世/.test(ep.btn) && !ep.over, `后日谈：${ep.cards} / ${n} 张逐张翻出，每张有头像或图标，翻完按钮是“${ep.btn.trim()}”`);
    await shot('end_page2');
    await page.click('#modal [data-fi="1"]'); await page.waitForTimeout(150);
    const sm = await ev(() => ({ foot: [...document.querySelectorAll('#modal [data-fi]')].map(b => b.textContent.trim()).join('|'), cnt: (document.querySelector('#modal .end-count') || {}).textContent || '' }));
    check(/再入轮回/.test(sm.foot) && /见过的结局/.test(sm.cnt), `结算页：${sm.foot}；${sm.cnt.trim()}`);
    // 守人间 → 【再登天门】→ 踏进去：不再算留在人间，结局换成别的
    const g = await ev(() => { const X = window.__xm, s = X.st, L = X.L; X.closeModal(); delete s.eflags.asc_break; s.eflags.asc_stay = 1; const a = L.endingOf(s).id; X.showRecord(); const has = !!document.querySelector('#btnGate'); X.closeModal();
      const ev = L.eventById('s9_gate_again'); L.resolveChoice(s, ev, 2); const again = !!s.eflags.asc_stay && !s.evDone.s9_gate_again; L.resolveChoice(s, ev, 0);
      return { a, has, again, stay: !!s.eflags.asc_stay, b: L.endingOf(s).id, n: ev.choices.filter(c => c.key).length }; });
    check(g.a === 'hermit' && g.has && g.again && !g.stay && g.b !== 'hermit' && g.n === 2, `再登天门：留在人间时记录页有按钮；“再等等”可以再来；踏进去后结局 ${g.a} → ${g.b}`);
    // 结算进跨世记录；图鉴结局页
    const cx = await ev(() => { const X = window.__xm, s = X.st, L = X.L; s.eflags.su_qianyuan = 1; s.settle = null; L.settle(s, 'ascend'); const m = s.meta; window.__xm_samsara.showCodex('ending');
      return { rec: Object.keys(m.endings).join(), fate: Object.keys(m.fate).join(), prev: m.prev.end, tiles: document.querySelectorAll('#modal .endg-t').length, on: document.querySelectorAll('#modal .endg-t.on').length, all: L.ENDINGS.length, small: [...document.querySelectorAll('#modal .endg-t *')].filter(x => x.childNodes.length && [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(x).fontSize) < 13.9).length }; });
    check(cx.tiles === cx.all && cx.on >= 1 && !cx.small && cx.fate === 'su' && !!cx.prev, `图鉴结局页 ${cx.on} / ${cx.tiles} 格点亮；跨世记录 endings=${cx.rec} fate=${cx.fate} prev=${cx.prev}`);
    await shot('codex_endings');
    await page.click('#modal .endg-t.on'); await page.waitForTimeout(150);
    check(await ev(() => document.querySelectorAll('#modal .end-text p').length >= 4), '图鉴里点开结局：有正文');
    // 回忆分组
    await ev(() => { window.__xm.closeModal(); window.__xm_cine.recall(); }); await page.waitForTimeout(200);
    const rc0 = await ev(() => ({ grp: document.querySelectorAll('#modal [data-cng]').length, n: document.querySelectorAll('#modal [data-cn]').length }));
    await page.click('#modal [data-cng="end"]'); await page.waitForTimeout(200);
    const rc1 = await ev(() => ({ n: document.querySelectorAll('#modal .cn-seg').length, vers: document.querySelectorAll('#modal .cn-ver').length, minH: Math.min(...[...document.querySelectorAll('#modal [data-cn], #modal [data-cng]')].map(x => x.getBoundingClientRect().height)), over: [...document.querySelectorAll('#modal *')].some(x => { const q = x.getBoundingClientRect(); return q.width && (q.right > window.innerWidth + 1 || q.left < -1); }) }));
    check(rc0.grp === 6 && rc0.n === 11 && rc1.n === 8 && rc1.vers === 2 && rc1.minH >= 44 && !rc1.over, `回忆按段归组：${rc0.grp} 组，修行 ${rc0.n} 格，结局 ${rc1.n} 段（道侣两版并一格），最矮 ${Math.round(rc1.minH)}px`);
    await shot('recall_groups');
    // 转世：前缘一心、问过天、开场卡上老祖的那一句
    const rb = await ev(() => { const X = window.__xm, L = X.L, s = X.st; X.closeModal(); s.meta.sky = 1; const ns = L.rebirthState(s, { t: 2, tr: ['stout'] }); X.loadState(ns); window.__xm_samsara.showOpening();
      return { aff: (ns.npc.su || {}).aff || 0, sky: L.skyBorn(ns), m: ns.meta.sky, mult: L.daoFruit(ns).mults.some(x => /问过天/.test(x.n)), line: (document.querySelector('#modal .reb-line') || {}).textContent || '', fate: document.querySelectorAll('#modal .reb-fate').length }; });
    check(rb.aff >= 20 && rb.sky && rb.m === 2 && rb.mult && rb.line.length > 10 && rb.fate === 2, `转世开场：苏 ${rb.aff} 好感（前缘），问过天道果 ×1.10，老祖：“${rb.line.slice(0, 16)}…”`);
    await shot('rebirth_open');
    await ev(() => window.__xm.closeModal());
  }
  // ---------- 零延迟（AP_PLAN §4.3 / §8.4）：【下战书 · 赵乾】打赢，结果卡关掉后 500ms 内出现的是 s3_zhao_fall ----------
  {
    const fx = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'story_fixtures', 'syn_ch3_nosect_beatzhao.json'), 'utf8'));
    await ev(s => { const X = window.__xm; X.closeModal(); window.__xm_talk.close && window.__xm_talk.close(); window.__xm_cine.fast = true;
      s = s.st || s;
      // 读进来之前把赵乾改回“没打过”：第三章的高潮、收尾和章末都还没出（其余照存档）
      delete s.beaten.zhao; if (s.eflags) delete s.eflags.beat_zhao; s.storyQ = []; if (s.path) s.path.hold = [];
      for (const id of ['s3_zhao_fall', 's3_end', 's3_zhao_eve']) if (s.evDone) delete s.evDone[id];
      if (s.story && s.story.beat) for (const k of Object.keys(s.story.beat)) if (/^c3_(pre|climax|end)$|^c[4-9]_/.test(k)) delete s.story.beat[k];
      if (s.flags && s.flags.chEnd) for (const k of Object.keys(s.flags.chEnd)) if (+k >= 2) delete s.flags.chEnd[k];
      s.ap = { left: 3, stride: 0, debt: 0, seq: 0, pend: [], log: {}, migrated: 1 }; s.flags.apHint = 1; s.evDone.s1_night = 1;
      X.loadState(s); }, fx);
    // 读档的那条链先出完（压着的戏、迁移提示）
    await ev(() => { window.__xm_talk.fast = true; });
    for (let i = 0; i < 30; i++) { const busy = await ev(() => window.__xm.busyUI || !!window.__xm_talk.on); if (!busy) break; await ev(() => { if (window.__xm_talk.on) { window.__xm_talk.close(); return; } const b = [...document.querySelectorAll('#modal .choices .btn:not([disabled]), #modal .foot .btn:not([disabled])')]; if (b.length) b[b.length - 1].click(); else window.__xm.closeModal(); }); await page.waitForTimeout(450); }
    const pre = await ev(() => { const { st, L } = window.__xm, I = L.challengeInfo(st, 'zhao'); return { ch: L.chapterNow(st), why: I && I.why, ap: st.ap.left, q: st.storyQ.slice() }; });
    // 造出来的局面：第三章开章那场（story_r2）按“早就播过了”算，队列清空——赢下来之后链里只该有这一仗引出的戏
    await ev(() => { const s = window.__xm.st; s.evDone.story_r2 = 1; s.storyQ.length = 0; });
    await ev(() => { window.__xm_talk.fast = false; const L = window.__xm.L; window.__dw0 = L.duelWin; L.duelWin = () => true; window.__xm.doAct('duel', { id: 'zhao' }); L.duelWin = window.__dw0; });
    await page.waitForTimeout(600);
    // 【下战书】→ 这一章的 pre（一赔九，没播过才播）→ 对决 → 结果卡（AP_PLAN §4.3）：先把 pre 点完，再跳过对决
    const pre2 = [];
    for (let i = 0; i < 80; i++) {
      const w = await ev(() => ({ tk: window.__xm_talk.on ? window.__xm_talk.on.id : '', pk: !!(window.__xm_talk.on && window.__xm_talk.on.picking), d: !!window.__xm.duelFx, ended: !!(window.__xm.duelFx && window.__xm.duelFx.ended), m: (document.querySelector('#modal:not([hidden]) h2') || {}).textContent || '' }));
      if (w.tk) { if (!pre2.includes(w.tk)) pre2.push(w.tk); await ev(() => { const p = document.querySelector('.tk-pick:not([disabled])'); if (p) p.click(); else window.__xm_talk.tap(); }); await page.waitForTimeout(60); continue; }
      if (w.d && !w.ended) { await ev(() => window.__xm.duelSkip()); await page.waitForTimeout(300); continue; }
      if (/下战书/.test(w.m)) break;
      if (w.m) { await ev(() => { const c = document.querySelector('#modal .choices .btn:not([disabled])'); if (c) { c.click(); return; } const f = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')]; if (f.length) f[f.length - 1].click(); }); await page.waitForTimeout(300); continue; }
      await page.waitForTimeout(150);
    }
    check(pre2.includes('s3_zhao_eve'), `【下战书 · 赵乾】先放这一章的 pre（${pre2.join(' → ') || '没放'}），再打`);
    await page.waitForTimeout(300);
    const card = await ev(() => (document.querySelector('#modal:not([hidden]) h2') || {}).textContent || '');
    await page.click('#modal .foot .btn'); const t0 = Date.now();
    let got = null; for (let i = 0; i < 25 && !got; i++) { await page.waitForTimeout(20); got = await ev(() => (window.__xm_talk.on ? window.__xm_talk.on.id : '') || ((document.querySelector('#modal:not([hidden]) h2') || {}).textContent || '')); }
    const dt = Date.now() - t0;
    check(pre.ch === 2 && !pre.why && got === 's3_zhao_fall' && dt <= 500, `打赢赵乾（第 ${pre.ch + 1} 章，结果卡“${card}”）关掉后 ${dt}ms 出的是 ${got || '（什么都没有）'}`);
    await shot('chain_zhao_fall');
    await ev(() => { window.__xm_talk.close && window.__xm_talk.close(); window.__xm.closeModal(); });
  }
  check(!errs.length, '没有脚本报错' + (errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails.length ? `\n失败 ${fails.length} 条` : '\n剧情界面检查通过');
  process.exit(fails.length ? 1 : 0);
})();
