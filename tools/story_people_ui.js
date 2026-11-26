// 人物戏（ev_story_people.js / ev_story_rivals.js）与“九百级石阶”空位的界面走查：node tools/story_people_ui.js [输出目录] ["Pixel 7"|360] [只跑的场景 id 前缀]
// 每场戏按它读的每个标志位各播一遍（外加一遍什么都没有的），每个选项各选一次：
//   断言：播得起来、台词不超过两行、没有横向溢出、选完落到结算卡、没有脚本报错。
//   截图：每场的“最重的一句”（第一处静音之后的那句）一张，放在输出目录的 people/ 下。
const { chromium, devices } = require('playwright');
const path = require('path');
const out = path.join(process.argv[2] || path.join(__dirname, '..', 'docs', 'story_mock'), 'people');
const dev = process.argv[3] || 'Pixel 7', only = process.argv[4] || '';
require('fs').mkdirSync(out, { recursive: true });
require(path.join(__dirname, '..', 'src', 'logic.js'));
const EVS = [].concat(...['ev_story_people', 'ev_story_rivals'].map(f => require(path.join(__dirname, '..', 'src', 'content', f + '.js')))).filter(e => e.talk && e.id.startsWith(only));
const fails = [];
const check = (ok, what) => { if (!ok) { console.log('  FAIL ' + what); fails.push(what); } };
// 这场戏读了哪些条件（pick / if 里的）
function condsOf(ev) {
  const set = new Set();
  const walk = list => { for (const it of list || []) { if (!it || Array.isArray(it)) continue; if (it.say) { [].concat(it.if || []).forEach(c => set.add(c)); walk(it.say); } if (it.pick) for (const o of it.pick) { [].concat(o.if || []).forEach(c => set.add(c)); walk(o.say); } } };
  walk(ev.talk); for (const c of ev.choices) for (const b of ['ok', 'fail']) if (c[b]) walk(c[b].talk);
  return [...set].filter(c => c[0] !== '!');
}
(async () => {
  const b = await chromium.launch();
  const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a);
  for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  await ev(() => { const X = window.__xm; X.st.guide.done = true; X.st.guide.step = 999; X.closeModal(); X.setSpeed(0); window.__xm_talk.fast = false; window.__xm_cine.fast = true; window.__base = JSON.stringify(X.st.eflags); });
  const on = () => ev(() => window.__xm_talk.on);
  const layout = () => ev(() => {
    const r = document.querySelector('.tk-wrap'); if (!r) return null; const vw = window.innerWidth, tx = r.querySelector('.tk-text');
    const over = [...r.querySelectorAll('*')].filter(x => !x.hidden && !x.closest('[hidden]') && !x.closest('.tk-stage') && x.tagName !== 'EM').some(x => { const q = x.getBoundingClientRect(); return q.width && (q.right > vw + 1 || q.left < -1); });
    return { lines: Math.round(tx.getBoundingClientRect().height / parseFloat(getComputedStyle(tx).lineHeight)), over, text: tx.textContent, picks: r.querySelectorAll('.tk-picks:not([hidden]) .tk-pick').length };
  });
  // 开一场：按条件摆好局面（标志位、路线、好感）
  const setup = (id, cond) => ev(([id, cond]) => {
    const X = window.__xm, s = X.st, L = X.L;
    X.closeModal(); if (window.__xm_talk.on) window.__xm_talk.close();
    s.eflags = JSON.parse(window.__base); s.storyQ.length = 0; s.sect = null; s.daolv = null; s.origin = 'qitu';
    for (const n of ['su', 'ye', 'chu', 'ge', 'bai', 'mo']) s.npc[n] = s.npc[n] || { aff: 70 };
    if (cond === 'path:mo') { try { L.joinSect(s, 'xuesha'); } catch (e) { /* 入不了就算了 */ } if (!s.sect) s.sect = { id: 'xuesha', rank: 1, pts: 0, total: 0 }; }
    else if (cond && !/[:>]/.test(cond)) s.eflags[cond] = 1;
    return window.__xm_talk.play(id);
  }, [id, cond]);
  // 把一场戏点到选项（或点完）；heavy：第一处静音之后的那句停下来截一张
  const walk = async (id, tag, shoot) => {
    let mx = 0, over = false, bad = '', n = 0, shot = !shoot;
    for (; n < 90; n++) {
      const o = await on(); if (!o || o.picking) break;
      await ev(() => { window.__xm_talk.tap(); });
      const l = await layout();
      if (l && !l.picks) { if (l.lines > mx) { mx = l.lines; if (l.lines > 2) bad = l.text; } over = over || l.over; }
      if (!shot && l && shoot(l.text)) { await page.waitForTimeout(450); await page.screenshot({ path: `${out}/${tag}.png` }); shot = true; }
      await ev(() => { window.__xm_talk.tap(); }); await page.waitForTimeout(25);
    }
    check(mx <= 2, `${tag} 台词 ${mx} 行：${bad.slice(0, 24)}`); check(!over, `${tag} 横向溢出`);
    return n;
  };
  const heavyOf = e => { // 第一处 { bgm: '' } 之后的第一句台词（按字面找，够用来截图）
    let after = false, hit = null;
    const w = list => { for (const it of list || []) { if (hit) return; if (Array.isArray(it)) { if (after) { hit = it[1].replace(/[*|]/g, '').slice(0, 6); return; } } else if (it.say) w(it.say); else if (it.pick) { for (const o of it.pick) { w(o.say); if (hit) return; } } else if (it.bgm === '') after = true; } };
    w(e.talk); return hit;
  };
  let plays = 0;
  for (const e of EVS) {
    const conds = [null].concat(condsOf(e));
    for (const [ci, c] of conds.entries()) for (let k = 0; k < e.choices.length; k++) {
      if (ci > 0 && k > 0 && !JSON.stringify(e.choices[k]).includes(c)) continue;   // 这个选项的结果不读这个条件：不重播
      const tag = `${e.id}${c ? '_' + c.replace(/\W/g, '') : ''}`;
      const ok = await setup(e.id, c); await page.waitForTimeout(350);
      const o = await on(); check(ok && o && o.id === e.id, `${tag} 没播起来`); if (!o) continue;
      plays++;
      const key = heavyOf(e);
      await walk(e.id, tag, k === 0 ? (t => !!key && t.replace(/\s/g, '').includes(key)) : null);
      let l = await layout(); check(l && l.picks === e.choices.length, `${tag} 选项数 ${l && l.picks}/${e.choices.length}`);
      await page.waitForTimeout(650); await page.click(`.tk-pick[data-c="${k}"]`).catch(() => {}); await page.waitForTimeout(250);
      await walk(e.id, tag + '_c' + k, null); await page.waitForTimeout(300);
      check(!(await on()), `${tag} 选完没有收场`);
      await ev(() => window.__xm.closeModal()); await page.waitForTimeout(80);
    }
    console.log(`  ok   ${e.id}（${conds.length} 种局面）`);
  }
  // 九百级石阶的空位：借一场临时的戏把十段都播一遍
  if (!only) {
    const n = await ev(() => { return ((window.STORY_SLOTS || {}).s8_steps || []).filter(x => x.who !== 'ye').length; });
    check(n >= 10, `STORY_SLOTS.s8_steps 有 ${n} 段`);
    for (let i = 0; i < n; i++) {
      await ev(i => { const X = window.__xm, x = window.STORY_SLOTS.s8_steps.filter(x => x.who !== 'ye')[i]; X.closeModal(); X.st.origin = 'qitu';
        X.showChoice({ id: '_slot_test', where: 'story', title: '九百级石阶', scene: 'tjgate', bgm: 'vow', gist: '测试', text: '测试', talk: [{ if: null, echo: x.echo, say: x.say }], choices: [{ t: '继续', ok: { text: '……', fx: {} } }] }); }, i);
      await page.waitForTimeout(350);
      if (i === 0 || i === 2 || i === 6) { await ev(() => { window.__xm_talk.tap(); }); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/s8_steps_${i}.png` }); }
      await walk('s8', 's8_steps#' + i, null);
      await ev(() => { window.__xm_talk.close(); window.__xm.closeModal(); }); await page.waitForTimeout(80);
    }
    console.log(`  ok   s8_steps 空位 ${n} 段`);
  }
  check(!errs.length, '脚本报错：' + errs.slice(0, 3).join(' | '));
  console.log(`\n人物戏界面走查：${EVS.length} 场，播了 ${plays} 遍，${fails.length ? '失败 ' + fails.length : '全部通过'}`);
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
