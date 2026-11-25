/* 废柴仙途 · 界面片段 hud：逻辑事件与主界面 HUD
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 逻辑事件 ----------
let feedDirty = true;
function onHook(type, data) {
  if (!st) return;
  if (type === 'log') feedDirty = true;
  else if (type === 'stageUp') {
    const pw1 = L.power(st); lastUp = { pw0: pw1 / Math.pow(L.P.pwStage, data.ups), pw1 };
    if (!st.exp) { floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 6, L.stageName(st.p) + '↑', '#8ff5d0'); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h + 6, `战力 ${fmt(lastUp.pw0)} → ${fmt(pw1)}`, '#ff9a8a', false, true); }
    SFX.up();
  }
  else if (type === 'ready') {
    const nxt = st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n;
    L.log(st, `修为圆满，可冲击${nxt}！`, 'gold');
  } else if (type === 'quest') { SFX.goal(); const chn = '第' + '一二三四五六七八九'[data.ch] + '章 · 完'; floatText(100, 52, data.main ? chn : '札记 ✓ ' + data.t, '#ffe39a'); if (data.rw) floatText(100, 64, data.rw, '#ffe39a', false, true); if (data.main) { banner(chn, data.t); chapterTip(data.ch); } }
  else if (type === 'task') { floatText(100, 64, '宗门任务完成', '#8ff5d0'); }
  // 功法（arts.js）：有名共鸣第一次凑齐 → 横幅；第一次通用共鸣 → 老祖气泡；熟练升级、融会
  else if (type === 'combo') { const c = L.combo(data.id); banner('共鸣 · ' + c.n, c.d); SFX.reveal(5); }
  else if (type === 'comboGen') tip('gen', `${data.same >= 3 ? '三' : '两'}门功法同属${data.el ? L.elName(data.el) : ''}，起了共鸣：修炼、战力各 +${Math.round((data.same >= 3 ? L.GEN.three : L.GEN.two) * 100)}%。`);
  else if (type === 'mastery') { if (!st.exp) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 18, `《${L.art(data.id).n}》${L.MAST.n[data.lv]}`, '#ffe39a', false, true); }
  else if (type === 'rong') { const A = L.art(data.id), R0 = L.RONG[A.k]; banner('融会贯通', `《${A.n}》圆满：${R0[0] ? '修炼 +' + (R0[0] * 100).toFixed(R0[0] < 0.01 ? 2 : 1) + '%' : ''}${R0[0] && R0[1] ? ' ' : ''}${R0[1] ? '战力 +' + (R0[1] * 100).toFixed(R0[1] < 0.01 ? 2 : 1) + '%' : ''}`); SFX.goal(); }
  else if (type === 'plan') { const P = L.PLAN[data]; if (P) banner('器方 · ' + P.n, `${L.GEAR_N[P.slot]} · ${P.aff.map(a => L.AFFIX[a].n).join('、')}`); }
  // 道心升级、因果（dao.js）：老祖气泡（panel-trib.js）
  else if (type === 'dao' || type === 'karma' || type === 'unkarma') daoHook(type, data);
  else if (type === 'promote') { L.log(st, `宗门贡献已足，可晋升${L.srankName(st, data)}！`, 'gold'); tip('promote', `宗门贡献够了，去【宗门】晋升${L.srankName(st, data)}：俸禄 ×${L.SRANKS[data].pay}（现在 ×${L.SRANKS[data - 1].pay}），宝库能换的东西更好。`); }
}

// ---------- HUD ----------
let hudTimer = 0, achBusy = false;
function updateHUD() {
  if (!st) return;
  const p = st.p;
  $('#pName').textContent = (st.title ? '「' + st.title + '」' : '') + p.name + (st.sect ? ' · ' + L.srankName(st, st.sect.rank) : '');
  L.checkAchs(st);
  if (st.achQ.length && !achBusy) { const a = st.achQ.shift(); achBusy = true; banner('成就 · ' + a.n, '称号「' + a.t + '」'); SFX.goal(); setTimeout(() => { achBusy = false; }, 2600); }
  $('#date').textContent = `第${Math.floor(st.year) + 1}年`;
  $('#vStone').textContent = fmt(st.stones);
  $('#vPill').textContent = st.pills;
  $('#vLife').textContent = p.r >= 9 ? '不朽' : `${Math.floor(p.age)}/${fmt(L.lifespan(st))}`;
  $('#lifeBox').classList.toggle('low', p.r <= L.MAXR && L.desperate(st));
  $('#vRank').textContent = '第' + (rankShown || st.rank);
  $('#btnSpeed').textContent = SPEEDS[speedIdx] ? '×' + SPEEDS[speedIdx] : '暂停';
  $('#btnSpeed').classList.toggle('on', SPEEDS[speedIdx] === 0);
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
  else if (st.retreat) $('#xpTxt').textContent = `${st.retreat.kind === 'train' ? '特训' : st.retreat.kind === 'teach' ? '指点师弟' : '闭关'}中 ×${st.retreat.m.toFixed(2)} · 剩${st.retreat.left}周天 · ${fmt(p.xp)}/${fmt(need)}`;
  else $('#xpTxt').textContent = `修为 ${fmt(p.xp)} / ${fmt(need)}${tagTxt}`;
  $('#sCul').textContent = '+' + fmt(L.gain(st));
  $('#sAtk').textContent = fmt(L.power(st));
  $('#sInc').textContent = '+' + fmt(L.income(st));
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
  $$('#nav button').forEach(b => b.classList.toggle('locked', !!navLock(b.dataset.nav)));
  $('#xpFill').style.width = (p.r >= 9 ? 100 : Math.min(100, p.xp / need * 100)).toFixed(1) + '%';
  $('#cult').classList.toggle('ready', ready);
  $('#cult').classList.toggle('away', !!st.exp);
  // 札记：当前章第一条没做完的（DESIGN §4.6，数据在 L.CHAPTERS）
  const qv = L.questView(st), q = qv.first;
  $('#goalTxt').textContent = q ? (q.main ? '【主线】' : '') + L.questText(st, q) : '大道已成';
  $('#goalRw').textContent = q ? L.rewardText(st, q.rw) : '';
  const busy = L.busy(st);
  setBadge('exp', !busy && !ready && p.r < 9 ? '闲' : '');
  const gd = st.guide && st.guide.done;
  const canUp = L.HOME.some(b => L.homeOpen(st, b.k) && st.home[b.k] < b.max && st.stones >= L.hCost(b.k, st.home[b.k]));
  const rec = !gd || ready || p.r >= 9 || busy ? '' : p.inj > 0 && L.canHeal(st) ? 'home' : L.HOME.some(b => L.homeOpen(st, b.k) && st.home[b.k] < b.max && st.stones >= L.hCost(b.k, st.home[b.k]) * 3) ? 'home' : 'exp';
  $$('#nav button').forEach(b => b.classList.toggle('hint', b.dataset.nav === rec));
  setBadge('home', p.inj > 0 && L.canHeal(st) ? '伤' : gd && !busy && (L.petGlowAny(st) || (st.petPend || []).length) ? '宠' : canUp ? '↑' : '');
  setBadge('sect', L.canPromote(st) ? '升' : st.sect && st.sect.tasks && st.sect.tasks.some(t => L.taskCanDeliver(st, t)) ? '交' : '');
  setBadge('market', L.auctionOpen(st) && L.auctionBidsLeft(st) > 0 && st.auction.items.some(it => !it.res) ? '拍' : L.marketEvent(st) && !navLock('market') ? '！' : L.desperate(st) && (st.lifePills[Math.min(p.r, 8)] || 0) < 3 ? '!' : '');
  setBadge('me', artRec() ? '功' : st.gear && (st.gear.pend.some(y => !y.hold) || (gd && !busy && L.gearPlusHint(st, 0.8))) ? '器' : '');
  updateHaul();
  syncRealmUI();   // 秘境的门卡层（panel-realm.js）
  if (feedDirty) renderFeed();
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
  const e = st.exp, pv = L.expPreview(st, Math.min(1, (e.total - e.left + monthAcc / TICK_MS) / e.total));
  const txt = `本趟 · 灵石 +${fmt(pv.stones)} · 灵草 +${fmt(pv.herbs)} · 宝物 ${pv.finds ? pv.finds + '?' : '—'}${pv.xp > 0 ? ' · 感悟 +' + fmt(pv.xp) : ''}`;
  if (el.textContent !== txt) el.textContent = txt;
  el.hidden = false;
}
