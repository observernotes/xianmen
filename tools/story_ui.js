// 剧情界面（docs/STORY_PLAN.md §6、§8；src/ui/talk.js）测试与截图：node tools/story_ui.js [输出目录=docs/story_mock] ["Pixel 7"|360]
// 断言：对话场景——播的时候停表；点一下出完 / 下一句；【跳过】跳到选项、选项跳不过去；有条件的选项灰着并写明缺什么；版式（按钮 ≥ 44px、没有横向溢出、台词不超过两行）；
//       选完落到结算卡，标志位置上；数据式分镜 ⑪～㉝ 每段都能画出每个镜头；飞升 → 结局卡（八个结局各出一张）。
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
  await ev(() => { const X = window.__xm; X.st.guide.done = true; X.st.guide.step = 999; X.closeModal(); X.setSpeed(1); window.__xm_talk.fast = false; });
  const on = () => ev(() => window.__xm_talk.on);
  const shot = n => page.screenshot({ path: `${out}/${tag}_${n}.png` });
  const layout = () => ev(() => {
    const r = document.querySelector('.tk-wrap'); if (!r) return null; const vw = window.innerWidth;
    const sk = r.querySelector('.tk-skip').getBoundingClientRect(), tx = r.querySelector('.tk-text'), cv = r.querySelector('.tk-cv').getBoundingClientRect();
    const over = [...r.querySelectorAll('*')].filter(x => !x.hidden && !x.closest('[hidden]')).some(x => { const q = x.getBoundingClientRect(); return q.width && (q.right > vw + 1 || q.left < -1); });
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
  check(a0 === a1, '对话在播的时候停表');
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
  await page.waitForTimeout(600); await page.click('.tk-pick[data-c="2"]'); await page.waitForTimeout(200);
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
  await walk(); await page.waitForTimeout(200); await shot('talk_5_key');
  l = await layout(); check(l && l.picks.length === 3 && l.picks.every(p => p.h >= 44) && !l.over && l.bottom < l.vh, `抉择一：三个选项，每个 ≥ 44px（${l && l.picks.map(p => Math.round(p.h)).join('/')}）`);
  await page.waitForTimeout(600); await page.click('.tk-pick[data-c="1"]'); await page.waitForTimeout(150); await walk(); await page.waitForTimeout(400);
  check(await ev(() => !!window.__xm.st.eflags.mu_spare), '抉择一 → mu_spare');
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(400);
  await ev(() => { const s = window.__xm.st; s.eflags.st_truth = 1; s.eflags.beat_xue = 1; s.storyQ.length = 0; window.__xm_talk.play('s7_war'); });
  await page.waitForTimeout(300); await walk(); await page.waitForTimeout(200); await shot('talk_6_gate');
  l = await layout(); check(l && l.picks.length === 3 && l.picks[2].dis && /没有人肯听你说话/.test(l.picks[2].t), `抉择六：止战灰着，写明缺什么（${l && l.picks[2] && l.picks[2].t.slice(-14)}）`);
  await ev(() => window.__xm_talk.close()); await page.waitForTimeout(200);

  // ---------- 每场对话走一遍：台词不超过两行、没有溢出 ----------
  const ids = await ev(() => window.__xm.L.events().filter(e => e.talk).map(e => e.id));
  for (const id of ids) {
    await ev(id => { const s = window.__xm.st; s.storyQ.length = 0; window.__xm_talk.play(id); }, id);
    await page.waitForTimeout(150);
    const w = await walk(); await page.waitForTimeout(80); const p = await layout();
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
      return { id: X.L.endingOf(s).id, title: (document.querySelector('#modal .big') || {}).textContent, epi: document.querySelectorAll('#modal .quote').length };
    }, [fl, x]);
    await page.waitForTimeout(250);
    check(got.id === id && !!got.title, `结局 ${id}：${got.title}（后日谈 ${got.epi - 1} 张）`);
    if (['wentian', 'gufeng', 'hermit'].includes(id)) await shot('end_' + id);
  }
  check(!errs.length, '没有脚本报错' + (errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails.length ? `\n失败 ${fails.length} 条` : '\n剧情界面检查通过');
  process.exit(fails.length ? 1 : 0);
})();
