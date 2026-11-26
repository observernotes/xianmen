/* 废柴仙途 · 界面片段 panel-path：【仙途】→ 路径（docs/KAIRO_PLAN.md §2.2-3，示意图 02_menu_path.png）、章末结算（§2.3）、年报（§6.2，06_year_report.png）、纸鹤列表、【江湖】外壳
 * 数据读线 1 的 L.pathView / L.chapterSummary / L.yearReport / L.yearClose / L.yearHist / L.mailbox（goalcard.js 里有兜底）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// 系统 → 小图标（路径页“已开”一排、年报“新开”一行、解锁卡）
const SYS_IC = { exp: 'slay', home: 'array', retreat: 'retreat', bt: 'up', gearCmp: 'gear', market: 'gavel', sect: 'contrib', visitor: 'buddy', tour: 'rank', field: 'field', furnace: 'furnace', arts: 'gscroll', trib: 'buff',
  pets: 'egg', plus: 'ore', cal: 'time', zhanji: 'atk', realm: 'wonder', bond: 'heart', plots: 'cave', zhen: 'array', dao: 'dao_w', disc: 'post_wai', codex: 'codex', herb: 'gather', treasure: 'seek', tuna: 'cult', sell: 'sell', shelf: 'gavel',
  crops: 'c_rice', robe: 'gear', world: 'w_taiping', yin: 'yin_f', vault: 'contrib', mishu: 'gscroll', auction: 'paddle', petJobs: 'job_array', chainExp: 'slay', duty: 'post_dan', comp: 'buddy', orn: 'gear', forge: 'b_forge' };
const sysIcon = (k, want) => artIcon(SYS_IC[k] || 'unk', want || 16) || artIcon('unk', want || 16);
function showRivals() { showWorld('rank'); }   // clock.js 的纸鹤“新秀”一条点【看】
function showWorld(tab) {
  navOpenPanel('world');
  const k = tab || ['rank', 'sect', 'market', 'bond'].find(x => meTabOpen(x)) || 'rank';
  openTab(k === 'people' ? 'bond' : k);
}
function showPath(tab) {
  navOpenPanel('path');
  if (tab && tab !== 'path') { openTab(tab); return; }
  const pv = L.pathView(st), g = L.goalNow(st), bn = L.bigNext(st);
  const node = (s, z) => { const c = ART.pathNode && ART.pathNode(s); if (!c) return ''; const w = pxFit(12, z * 12); return `<img class="px" src="${urlOf(c, 'pn|' + s)}" style="width:${w}px;height:${w}px" alt="">`; };
  const rows = [`<div class="kpn done">${node('done', 2)}<div class="tt nm">序 · 退婚</div></div>`];
  let lockRun = [];
  const flushLock = () => {
    if (!lockRun.length) return;
    if (lockRun.length >= 3) rows.push(`<div class="kpn">${node('lock', 2)}<div class="tt nm">${chName(lockRun[0].i)}～${CH_NUM[lockRun[lockRun.length - 1].i]}章</div></div>`);
    else for (const c of lockRun) rows.push(`<div class="kpn">${node('lock', 2)}<div class="tt nm">${chName(c.i)} ${esc(c.realm)}</div></div>`);
    lockRun = [];
  };
  for (const c of pv) {
    if (c.state === 'lock') { lockRun.push(c); continue; }
    flushLock();
    if (c.state === 'done' || c.state === 'miss') rows.push(`<div class="kpn done">${node('done', 2)}<div class="tt"><span class="nm">${chName(c.i)} ${esc(c.n)}</span>${c.state === 'miss' ? ' <small>主线未了</small>' : ''}</div></div>`);
    else if (c.state === 'now') {
      const prog = (c.prog && c.prog.length ? c.prog : [{ v: g.bar.v, max: 1, text: g.bar.text }]).slice(0, 2);
      const pbar = (v, t) => `<div class="krow" style="min-height:20px"><div class="kpbar"><i style="width:${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}%"></i></div><span class="s">${esc(t)}</span></div>`;
      const xp = st.p.r <= L.MAXR ? Math.min(1, st.p.xp / L.pNeed(st.p)) : 1;
      const ic = c.opened.slice(0, 7).map(k => `<span>${sysIcon(k, 16)}</span>`).join('') + Array.from({ length: Math.min(4, c.toOpen) }, () => '<span class="q">?</span>').join('');
      rows.push(`<div class="kpn cur">${node('now', 3)}<div class="tt"><span class="h nm">${chName(c.i)} ${esc(c.n)}</span> <small>${esc(c.realm)} · 你在这里</small>
        <div class="krow">${artIcon('goal', 16)}<span class="v">${esc(c.goal || g.t)}</span>${bn && bn.left <= 36 ? `<span class="s" style="color:#c8323c">还有 ${seasons(bn.left)} 季</span>` : ''}</div>
        ${prog.map(x => pbar(x.v / (x.max || 1), x.text ? cut(x.text.replace(/ → 目标.*$/, ''), 10) : '')).join('')}${pbar(xp, L.stageName(st.p))}
        <div class="ksys">${ic}<small>已开 ${c.opened.length} · 还有 ${c.toOpen}</small></div></div></div>`);
    } else rows.push(`<div class="kpn">${node('next', 2)}<div class="tt"><span class="nm">${chName(c.i)} ${esc(c.n)}</span> <small>${esc(c.realm)} · ${esc(c.blurb || c.goal)}</small>${c.toOpen ? `<div class="ksys">${Array.from({ length: Math.min(7, c.toOpen) }, () => '<span class="q">?</span>').join('')}</div>` : ''}</div></div>`);
  }
  flushLock();
  rows.push(`<div class="kpn">${node('lock', 2)}<div class="tt nm">轮回</div></div>`);
  sheet({ title: shellTitle('path'), body: meTabs('path') + `<div class="kpath">${rows.join('')}</div>` });
}

// ---------- 章末结算（§2.3，阻塞清单 #7）：上半本章总结，下半下一章目标 + 会开几样（“?”格）+ 奖励；一个按钮 ----------
function showChapterCard(ch) {
  st.flags.chEnd = st.flags.chEnd || {};
  if (st.flags.chEnd[ch]) return;
  st.flags.chEnd[ch] = 1;
  saveLocal('章末');   // 关键节点存一份（自动档轮换，saves.js）
  const S = L.chapterSummary(st, ch), N = S.next;
  const Sp = ART.stamp ? ART.stamp('完') : null;
  sheet({ title: `${chName(ch)} ${esc(S.n)} · 完`, center: true, noClose: true,
    body: `<div class="kcard">${Sp ? `<img class="px" src="${urlOf(Sp, 'stamp|完')}" style="width:${pxFit(24, 48)}px;height:${pxFit(24, 48)}px" alt="">` : ''}<div class="grow">
        <div class="krow"><span class="k">用了</span><span class="v">${seasons(S.months)} 季</span></div>
        <div class="krow"><span class="k">战力</span><span class="v">${fmt(S.pw0)} → <span class="big">${fmt(S.pw1)}</span></span></div>
        <div class="krow"><span class="k">历练</span><span class="v">${S.exp} 趟${S.best >= 0 ? ` · 最好 ${L.RATINGS[Math.min(4, S.best)]}` : ''}</span></div></div></div>
      ${N ? `<div class="ksec"><span style="font-size:18px;color:var(--paper-ink)">${chName(N.i)} ${esc(N.n)}</span></div>
        <div class="krow">${artIcon('goal', 16)}<span class="v">${esc(N.goal)}</span></div>
        ${N.toOpen ? `<div class="krow"><span class="k">会开 ${N.toOpen} 样</span><div class="ksys" style="margin:0">${Array.from({ length: Math.min(7, N.toOpen) }, () => '<span class="q">?</span>').join('')}</div></div>` : ''}
        ${N.rw ? `<div class="krow"><span class="k">奖励</span><span class="v goldt">${esc(N.rw)}</span></div>` : ''}` : '<p class="center">大道已近，再无下一章。</p>'}`,
    foot: [{ t: N ? `开始${chName(N.i)} ▸` : '好', gold: true, fn: closeModal }] });
  SFX.chapter();
}

// ---------- 年报（§6.2，阻塞清单 #8）：每 12 月的月初一张；在外则归来结算之后 ----------
// 排队：线 1 的 clock.js 每月判 L.yearDue，在打坐态、结算之后 pushPopup(UI.showYear)
function yearClose() { L.yearClose(st); }
function showYearReport() {
  if (!st) return;
  saveLocal('年报');   // 关键节点存一份
  const R = L.yearReport(st), nx = R.next || {}, big = nx.big;
  const up = (a, b, f) => `${f(a)} → <span class="big">${f(b)}</span>${b > a ? ` <span class="kup" style="font-size:14px">▲${f(b - a)}</span>` : ''}`;
  const opened = (R.opened || []).filter(k => L.ONB_K[k] && L.ONB_K[k].sys).slice(0, 4);
  const nch = nx.ch && typeof nx.ch === 'object' ? nx.ch : null, chL = nch ? nch.chN : chName(typeof nx.ch === 'number' ? nx.ch : L.chapterNow(st)), bar = nx.bar || (nch && nch.bar) || L.goalNow(st).bar;
  sheet({ title: `${artIcon('report', 24)} 第 ${R.y} 年 · 年报`, center: true, noClose: true,
    body: `<div class="krow"><span class="k">境界</span><span class="v">${esc(R.realm[0])} → <span class="kup">${esc(R.realm[1])}</span></span></div>
      <div class="krow"><span class="k">战力</span><span class="v">${up(R.pw[0], R.pw[1], fmt)}</span></div>
      <div class="krow"><span class="k">修炼/${MO()}</span><span class="v">+${L.fmt1(R.gain[0])} → <span class="kup">+${L.fmt1(R.gain[1])}</span></span></div>
      <div class="krow"><span class="k">灵石</span><span class="v">赚 ${fmt(R.earn || 0)} · 花 ${fmt(R.spend || 0)}</span></div>
      <div class="krow"><span class="k">历练</span><span class="v">${R.exp} 趟${R.best >= 0 && R.exp ? ` · 最好 ${L.RATINGS[Math.min(4, R.best)]}` : ''}</span></div>
      ${R.rank ? `<div class="krow"><span class="k">天骄榜</span><span class="v">${R.rank[0]} → <span class="kup">${R.rank[1]}</span></span></div>` : ''}
      ${opened.length ? `<div class="krow"><span class="k">新开</span><span class="v">${opened.map(k => `${sysIcon(k, 16)} ${esc(L.ONB_K[k].n.split('·')[0])}`).join('　')}</span></div>` : ''}
      <div class="ksec"><span>明年 · ${chL}</span></div>
      <div class="krow"><div class="kpbar"><i style="width:${(Math.max(0, Math.min(1, bar.v / (bar.max || 1))) * 100).toFixed(1)}%"></i></div><span class="s">${esc(cut(bar.text, 16))}</span></div>
      ${big ? `<div class="krow"><span class="k">${esc(big.n)}</span><span class="v seal">还有 ${seasons(big.left)} 季</span></div>` : ''}
      ${R.say ? `<div class="ksay">${elderImg(24)}<span>老祖：“${esc(cut(R.say, 20))}”</span></div>` : ''}`,
    foot: [{ t: '新的一年 ▸', gold: true, fn: () => { yearClose(); closeModal(); } }] });
  SFX.year();
}
// 【仙途】→ 记录 → 年报：历年的数字
function showYearHist() {
  const h = L.yearHist ? L.yearHist(st) : (st.flags.yearHist || []);
  const rows = h.slice(0, 30).map(x => `<div class="krow"><span class="k">第 ${x.y} 年</span><span class="v">${L.REALMS[Math.min(x.r, 9)].n} · 战力 ${fmt(x.pw)}</span><span class="s">${x.exp} 趟${x.rank ? ' · 第 ' + x.rank : ''}</span></div>`).join('');
  sheet({ title: shellTitle('path'), body: meTabs('rec') + `<div class="ksec"><span>历年年报</span></div>` + (rows || emptyNoteHTML('scroll', '还没过完一年。')), foot: [{ t: '回记录', alt: true, fn: () => showRecord() }] });
}

// ---------- 纸鹤（§3.3-1 / §5.2-3）：消息匣列表 + 传讯历史 + 老祖说过的话；点【看】才见人（数据与投递归线 1 的 time.js / clock.js） ----------
const MAIL_IC = { visitor: 'buddy', season: 'time', world: 'w_taiping', auction: 'paddle', rookie: 'rank', unlock: 'unlock', master: 'ok', rival: 'grudge', say: 'quest', misc: 'mail' };
function showInbox() {
  const list = L.mailbox(st).slice(0, 20);
  const rows = list.map((x, i) => `<div class="kmail">${artIcon(x.ic || MAIL_IC[x.k] || 'mail', 24)}<span class="grow klog">${esc(cut(x.t, 14))}</span>${x.left !== null && x.left !== undefined ? `<span class="s">${seasons(x.left)} 季</span>` : ''}<button class="btn sm ${i ? 'alt' : 'gold'}" data-mail="${i}">看</button></div>`).join('');
  const visit = st.visitor && !list.some(x => x.k === 'visitor') ? `<div class="kmail">${artIcon('buddy', 24)}<span class="grow">门口有人来访</span><span class="s">${seasons(st.visitor.left)} 季</span><button class="btn sm gold" id="kVisit">看</button></div>` : '';
  const said = sayLog.slice(0, 4).map(x => `<div class="krow klog" style="font-size:14px"><span class="k" style="width:64px">${esc(x.m)}</span><span class="v">${esc(x.text)}</span></div>`).join('');
  const elder = bubbleLog.slice(0, 4).map(b => `<div class="ksay klog">${elderImg(24)}<span>${b.text}</span></div>`).join('');
  const s = sheet({ title: `${artIcon('mail', 24)} 纸鹤`, body: (visit + rows || emptyNoteHTML('scroll', '没有新消息。')) + (said ? `<div class="ksec"><span>传讯</span></div>${said}` : '') + (elder ? `<div class="ksec"><span>老祖说过</span></div>${elder}` : '') });
  bubbleUnread = false;
  s.querySelectorAll('[data-mail]').forEach(b => b.onclick = () => {
    SFX.tap(); const x = list[+b.dataset.mail]; if (!x) return;
    if (typeof openMail === 'function') { closeModal(); openMail(x); return; }
    if (L.mailTake) L.mailTake(st, x.id); else if (st.inbox) st.inbox.splice(st.inbox.indexOf(x), 1);
    closeModal();
    if (x.k === 'visitor' && st.visitor) showVisitor(); else if (x.go) goTo(x.go);
  });
  const kv = s.querySelector('#kVisit'); if (kv) kv.onclick = () => { SFX.tap(); closeModal(); showVisitor(); };
}
