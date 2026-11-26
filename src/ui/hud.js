/* 废柴仙途 · 界面片段 hud：逻辑事件与主界面 HUD
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 逻辑事件 ----------
let feedDirty = true;
function onHook(type, data) {
  if (!st) return;
  if (type === 'log') feedDirty = true;
  else if (type === 'stageUp') {
    const pw1 = L.power(st); lastUp = { pw0: pw1 / Math.pow(L.P.pwStage, data.ups), pw1 };
    if (!st.exp) { floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 6, L.stageName(st.p) + '↑', '#8ff5d0'); ringBurst(HOMEPOS.x, HOMEPOS.y, '#8ff5d0'); }
    banner(L.stageName(st.p), `战力 ${fmt(lastUp.pw0)} → ${fmt(pw1)}`, '#8ff5d0');
    SFX.up();
  }
  else if (type === 'ready') {
    const nxt = st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n;
    L.log(st, `修为圆满，可冲击${nxt}！`, 'gold');
  } else if (type === 'quest') { SFX.goal(); const chn = '第' + '一二三四五六七八九'[data.ch] + '章 · 完'; floatText(100, 52, data.main ? chn : '札记 ✓ ' + data.t, '#ffe39a'); if (data.rw) floatText(100, 70, data.rw, '#ffe39a', false, true); if (data.main) { banner(chn, data.t); stampFx("完", 100, 70); chapterDone(data.ch); } }   // 主线完成：章末结算卡（guide-ask.js，老祖的章末评语也在卡上）
  else if (type === 'task') { floatText(100, 64, '宗门任务完成', '#8ff5d0'); }
  // 功法（arts.js）：有名共鸣第一次凑齐 → 横幅；第一次通用共鸣 → 老祖气泡；熟练升级、融会
  else if (type === 'combo') { const c = L.combo(data.id); banner('共鸣 · ' + c.n, c.d); SFX.reveal(5); }
  else if (type === 'comboGen') tip('gen', `${data.same >= 3 ? '三' : '两'}门功法同属${data.el ? L.elName(data.el) : ''}，起了共鸣：修炼、战力各 +${Math.round((data.same >= 3 ? L.GEN.three : L.GEN.two) * 100)}%。`);
  else if (type === 'mastery') { if (!st.exp) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 18, `《${L.art(data.id).n}》${L.MAST.n[data.lv]}`, '#ffe39a', false, true); }
  else if (type === 'rong') { const A = L.art(data.id), R0 = L.RONG[A.k]; banner('融会贯通', `《${A.n}》圆满：${R0[0] ? '修炼 +' + (R0[0] * 100).toFixed(R0[0] < 0.01 ? 2 : 1) + '%' : ''}${R0[0] && R0[1] ? ' ' : ''}${R0[1] ? '战力 +' + (R0[1] * 100).toFixed(R0[1] < 0.01 ? 2 : 1) + '%' : ''}`); SFX.goal(); }
  else if (type === 'recipe') { const rc = L.RECIPE[data]; if (rc && $('#modal').hidden) banner('丹方 · ' + rc.n, rc.yin ? L.yinText(L.recipeYin(rc)) : ''); }
  else if (type === 'plan') { const P = L.PLAN[data]; if (P) banner('器方 · ' + P.n, `${L.GEAR_N[P.slot]} · ${P.aff.map(a => L.AFFIX[a].n).join('、')}`); }
  // 道心升级、因果（dao.js）：老祖气泡（panel-trib.js）
  else if (type === 'dao' || type === 'karma' || type === 'unkarma') daoHook(type, data);
  else if (type === 'people') peopleHook(data);
  else if (type === 'unlock' || type === 'master') onbHook(type, data);   // 上手曲线：解锁横幅、子项气泡、掌握飘字（onboard.js）   // 委托、双修（panel-people.js）
  else if (type === 'promote') { L.log(st, `宗门贡献已足，可晋升${L.srankName(st, data)}！`, 'gold'); tip('promote', `宗门贡献够了，去【宗门】晋升${L.srankName(st, data)}：俸禄 ×${L.SRANKS[data].pay}（现在 ×${L.SRANKS[data - 1].pay}），宝库能换的东西更好。`); }
}

// ---------- HUD ----------
let hudTimer = 0, achBusy = false, dateKey = '';
// HUD 数值变化：300ms 滚动，增加闪绿、减少闪红（DESIGN §5.1）
function rollNum(sel, v, f) {
  const el = $(sel); if (!el) return;
  f = f || fmt;
  if (el._v === undefined || !isFinite(el._v) || cine) { el._v = v; el.textContent = f(v); return; }
  if (el._to === v) return;
  const from = el._shown !== undefined ? el._shown : el._v, t0 = performance.now();
  el._to = v; el._v = v;
  if (Math.abs(v - from) < 1e-9) { el.textContent = f(v); return; }
  el.classList.remove('nup', 'ndn'); void el.offsetWidth; el.classList.add(v > from ? 'nup' : 'ndn');
  const step = now => {
    if (el._to !== v) return;
    const k = Math.min(1, (now - t0) / 300), x = from + (v - from) * k;
    el._shown = x; el.textContent = f(k >= 1 ? v : (Math.abs(v) >= 100 ? Math.round(x) : x));
    if (k < 1) requestAnimationFrame(step); else el._shown = undefined;
  };
  requestAnimationFrame(step);
}
function updateHUD() {
  if (!st) return;
  const p = st.p;
  $('#pName').textContent = (st.title ? '「' + st.title + '」' : '') + p.name + (st.sect ? ' · ' + L.srankName(st, st.sect.rank) : '');
  L.checkAchs(st);
  if (L.onbStep) L.onbStep(st);   // 已经发生了的（入宗、拿到灵宠、修为圆满……）立刻开，不等下个周天
  if (st.achQ.length && !achBusy) { const a = st.achQ.shift(); achBusy = true; banner('成就 · ' + a.n, '称号「' + a.t + '」'); SFX.goal(); setTimeout(() => { achBusy = false; }, 2600); }
  const sz = season();
  const dk = Math.floor(st.year) + '|' + sz;
  if (dateKey !== dk) {
    dateKey = dk;
    $('#date').textContent = `第${Math.floor(st.year) + 1}年 · ${'春夏秋冬'[sz]}`;
    if (ART.season) { const ic = $('#seasonIc'), c = ART.season(sz), s2 = pxFit(16, 16); ic.src = urlOf(c, 'season|' + sz); ic.style.width = ic.style.height = s2 + 'px'; }
    if (ART.seasonColor) $('#sceneTL').style.boxShadow = `0 0 0 2px var(--ink), inset 0 -2px 0 0 ${ART.seasonColor(sz)}`;
  }
  rollNum('#vStone', st.stones);
  rollNum('#vPill', st.pills, v => String(Math.round(v)));
  const inc = L.income(st);
  $('#vInc').textContent = inc > 0 ? '+' + fmt(inc) : '';
  $('#vLife').textContent = p.r >= 9 ? '不朽' : `${Math.floor(p.age)}/${fmt(L.lifespan(st))}`;
  $('#lifeFill').style.width = (p.r >= 9 ? 0 : Math.min(100, p.age / Math.max(1, L.lifespan(st)) * 100)).toFixed(1) + '%';
  $('#lifeBox').classList.toggle('low', p.r <= L.MAXR && L.desperate(st));
  $('#vRank').textContent = '榜第' + (rankShown || st.rank);
  setSpeedIcon();
  const ready = L.isReady(st);
  $('#realm').textContent = L.stageName(p);
  const need = L.pNeed(p);
  const tags = [];
  if (p.inj > 0) tags.push(`负伤${p.inj}`);
  if ((st.buffs || []).some(b => b.cul)) tags.push('丹');
  if (L.artSwapLeft(st) > 0) tags.push('转修');
  const tagTxt = tags.length ? ' · ' + tags.join(' ') : '';
  if (p.r >= 9) $('#xpTxt').textContent = '已证大道';
  else if (ready) $('#xpTxt').textContent = `修为圆满 · 点此冲击${p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n}`;
  else if (L.isFull(st) && st.exp) $('#xpTxt').textContent = '修为已满 · 回洞府后突破';
  else if (st.run) $('#xpTxt').textContent = `${mjName(st.run)} · 第 ${st.run.floor}/${st.run.floors} 层 · 时间暂停`;
  else if (st.exp) $('#xpTxt').textContent = `历练中 · ${L.REGIONS[st.exp.k].n} · 剩${st.exp.left}周天${tagTxt}`;
  else if (st.retreat) $('#xpTxt').textContent = `${st.retreat.kind === 'train' ? '特训' : L.retName(st.retreat)}中 ×${st.retreat.m.toFixed(2)} · 剩${st.retreat.left}周天 · ${fmt(p.xp)}/${fmt(need)}`;
  else $('#xpTxt').textContent = `修为 ${fmt(p.xp)} / ${fmt(need)}${tagTxt}`;
  rollNum('#sCul', L.gain(st), v => '+' + fmt(v));
  rollNum('#sAtk', L.power(st));
  rollNum('#sInc', inc, v => '+' + fmt(v));
  const nb = L.nextBig(st), bb = $('#sBig');
  if (nb.k === 'pact') {
    $('#sBigK').textContent = `约战${nb.left}周天`;
    bb.textContent = '胜算 ' + L.pct(nb.info.p);
    bb.className = nb.info.p < 0.45 ? 'lo' : nb.info.p < 0.8 ? 'md' : 'hi';
  } else {
    $('#sBigK').textContent = nb.n;
    bb.textContent = nb.left + '周天后';
    bb.className = 'md';
  }
  $('#sBigBtn').classList.toggle('soon', nb.left <= 2);
  updateWorldTag();
  updateToxin();   // 丹毒葫芦（panel-alchemy.js）
  // 底栏：没开的入口直接不出现（docs/ONBOARDING.md）；第一次出现时播锁碎 + 扫光
  $$('#nav button').forEach(b => {
    const open = UI.navOpen(b.dataset.nav), was = !b.hidden && !b.classList.contains('locked'), lk = open && !!navLock(b.dataset.nav);
    if (b.hidden === open) b.hidden = !open;
    b.classList.toggle('locked', lk);
    if (!was && open && !lk && st.tick > 0 && b._seen) { b.classList.remove('unlock'); void b.offsetWidth; b.classList.add('unlock'); lockBreakFx(b); SFX.reveal(3); setTimeout(() => b.classList.remove('unlock'), 1200); }
    b._seen = true;
  });
  // HUD：没用到的数值格不出现
  const showCell = (sel, on) => { const el = $(sel); if (el && el.hidden === on) el.hidden = !on; };
  showCell('#stats button[data-s="cul"]', UI.isOpen('home'));
  showCell('#stats button[data-s="inc"]', UI.isOpen('home'));
  showCell('#top .rpill', UI.isOpen('market') || st.pills > 0);
  showCell('#lifeBox', L.mr(st) >= 1 || L.desperate(st) || !!st.rebirth);
  showCell('#date', UI.isOpen('cal')); showCell('#seasonIc', UI.isOpen('cal'));
  showCell('#vRank', UI.isOpen('tour'));
  showCell('#sceneTL', UI.isOpen('cal') || UI.isOpen('tour'));
  $('#xpFill').style.width = (p.r >= 9 ? 100 : Math.min(100, p.xp / need * 100)).toFixed(1) + '%';
  $('#cult').classList.toggle('ready', ready);
  $('#cult').classList.toggle('away', !!st.exp);
  // 札记：当前章第一条没做完的（DESIGN §4.6，数据在 L.CHAPTERS）
  const qv = L.questView(st), q = qv.first;
  // 刚开的系统有一个小目标（掌握信号的白话），排在札记最前面，做到了才换回平常的任务（docs/ONBOARDING.md §2）
  const og = L.onbGoal && L.onbGoal(st);
  // 【新】小目标前面挂 ART.newBadge（“【新】”留作读屏文字，textContent 不变）；内容没变就不重写
  const gt = og ? '【新】' + og.goal : q ? (q.main ? '【主线】' : '') + L.questText(st, q) : '大道已成', ge = $('#goalTxt');
  if (ge._t !== gt) { ge._t = gt; const nb = og ? newBadgeHTML(12) : ''; if (nb) ge.innerHTML = nb + '<span class="vh">【新】</span>' + esc(og.goal); else ge.textContent = gt; }
  $('#goalRw').textContent = og ? og.n : q ? L.rewardText(st, q.rw) : '';
  const busy = L.busy(st);
  const gd = st.guide && st.guide.done;
  const canUp = L.HOME.some(b => L.homeOpen(st, b.k) && st.home[b.k] < b.max && st.stones >= L.hCost(b.k, st.home[b.k]));
  // 底栏角标只给“现在该点的”一个（docs/ONBOARDING.md §4）：按急缓排，取第一个；发光提示也只跟着它
  const bd = !gd ? null : pickBadge([
    p.inj > 0 && L.canHeal(st) && { nav: 'home', t: '伤' },
    L.canPromote(st) && { nav: 'sect', t: '升' },
    st.sect && st.sect.tasks && st.sect.tasks.some(t => L.taskCanDeliver(st, t)) && { nav: 'sect', t: '交' },
    L.desperate(st) && (st.lifePills[Math.min(p.r, 8)] || 0) < 3 && UI.isOpen('market') && { nav: 'market', t: '!' },
    st.gear && st.gear.pend.some(y => !y.hold) && { nav: 'me', t: '器' },
    !busy && UI.isOpen('pets') && (L.petGlowAny(st) || (st.petPend || []).length) && { nav: 'home', t: '宠' },
    UI.isOpen('arts') && artRec() && { nav: 'me', t: '功' },
    st.sect && st.disc && st.disc.cand && L.discOpen(st) && !L.discFull(st) && { nav: 'sect', t: '徒' },   // 徒：有拜师的孩子等着（disciples.js）
    L.auctionOpen(st) && L.auctionBidsLeft(st) > 0 && st.auction.items.some(it => !it.res) && { nav: 'market', t: '拍' },
    L.marketEvent(st) && UI.isOpen('market') && !navLock('market') && { nav: 'market', t: '！' },
    { nav: 'me', t: peopleBadge() },   // 委：有委托能交、侣：能双修（panel-people.js）
    !busy && UI.isOpen('plus') && L.gearPlusHint(st, 0.8) && { nav: 'me', t: '器' },
    !busy && canUp && { nav: 'home', t: '↑' },
    !busy && !ready && p.r < 9 && { nav: 'exp', t: '闲' },
  ]);
  for (const n of ['exp', 'home', 'sect', 'market', 'me']) setBadge(n, bd && bd.nav === n ? bd.t : '');
  const rec = !gd || ready || p.r >= 9 || busy ? '' : bd ? bd.nav : '';
  $$('#nav button').forEach(b => b.classList.toggle('hint', b.dataset.nav === rec));
  onbPump();
  updateHaul();
  syncRealmUI();   // 秘境的门卡层（panel-realm.js）
  if (feedDirty) renderFeed();
}
// 场景右上的速度档：ART.icon('spd1' | 'spd2' | 'spd4')，暂停时 'pause'（金框）；档位变了才换图。没有新美术时退回文字
let speedKey = '';
function setSpeedIcon() {
  const b = $('#btnSpeed'), sp = SPEEDS[speedIdx], key = String(sp);
  if (speedKey === key && b.firstChild) return;
  speedKey = key;
  const txt = sp ? '×' + sp : '暂停', ic = artIcon(sp ? 'spd' + sp : 'pause', 20);
  if (ic) b.innerHTML = ic; else b.textContent = txt;
  b.setAttribute('aria-label', '游戏速度：' + txt);
  b.title = txt;
  b.classList.toggle('on', sp === 0);
}
// 底栏解锁：锁按 ART.lockBreak 0 → 1 → 2 → 3 碎掉（每帧 80 毫秒），扫光（CSS .unlock::before）推迟到第 2 帧起
function lockBreakFx(btn) {
  if (!ART.lockBreak) return;
  const n = ART.lockBreakFrames || 4, im = document.createElement('img');
  im.className = 'px lkbrk'; im.alt = ''; im.src = urlOf(ART.lockBreak(0), 'lkb|0');
  btn.appendChild(im);
  let f = 0;
  const step = () => { f++; if (f >= n) { im.remove(); return; } im.src = urlOf(ART.lockBreak(f), 'lkb|' + f); setTimeout(step, 80); };
  setTimeout(step, 80);
}
// 渐进解锁：一开始只给历练、洞府、人物，免得一上来不知道点哪
function navLock(nav) {
  if (st && st.run && nav !== 'me') return '人还在秘境里。先点门走下去，或者带着收获离开。';
  if (!st || st.rebirth) return '';
  if (nav === 'market' && st.stats.exp < 1) return '坊市要等你先出去历练一趟、见过世面再说。先点【历练】。';
  if (nav === 'sect' && !st.sect && st.p.r < 1) return '宗门只收筑基修士。修为圆满后突破到筑基，三大宗门会上门抢人。';
  return '';
}
function setBadge(nav, text) {
  const btn = document.querySelector(`[data-nav="${nav}"]`);
  let b = btn.querySelector('.badge');
  if (!text) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; btn.appendChild(b); }
  if (b.textContent !== text) b.textContent = text;
}
function renderFeed() {
  if (!st || cine) return;
  feedDirty = false;
  $('#feed').innerHTML = st.log.slice(0, 8).map(l => `<div class="${esc(l.cls)}"><span>${esc(l.t)}</span>${esc(l.text)}</div>`).join('');
}

// 历练途中场景顶部的“本趟收获”条（DESIGN §5.3 途中 HUD）：按出发时预掷的结果逐周天累加
function updateHaul() {
  const el = $('#haul');
  if (!el) return;
  if (!st.exp || cine) { if (!el.hidden) el.hidden = true; return; }
  const e = st.exp, pv = L.expPreview(st, Math.min(1, (e.total - e.left + monthAcc / tickMs()) / e.total));
  const txt = `本趟 · 灵石 +${fmt(pv.stones)} · 灵草 +${fmt(pv.herbs)} · 宝物 ${pv.finds ? pv.finds + '?' : '—'}${pv.xp > 0 ? ' · 感悟 +' + fmt(pv.xp) : ''}`;
  if (el.textContent !== txt) el.textContent = txt;
  el.hidden = false;
}
