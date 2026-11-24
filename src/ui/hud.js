/* 废柴仙途 · 界面片段 hud：逻辑事件与主界面 HUD
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 逻辑事件 ----------
let feedDirty = true;
function onHook(type, data) {
  if (!st) return;
  if (type === 'log') feedDirty = true;
  else if (type === 'stageUp') { if (!st.exp) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 6, L.STAGES[st.p.s] + '↑', '#8ff5d0'); SFX.up(); }
  else if (type === 'ready') {
    const nxt = st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n;
    L.log(st, `修为圆满，可冲击${nxt}！`, 'gold');
  } else if (type === 'goal') { SFX.goal(); floatText(100, 60, data.rw ? `目标达成 灵石+${fmt(data.rw)}` : '目标达成', '#ffe39a'); }
  else if (type === 'promote') { L.log(st, `宗门贡献已足，可晋升${L.srankName(st, data)}！`, 'gold'); tip('promote', '宗门贡献够了，去【宗门】晋升身份吧！身份越高，俸禄越多，宝库能换的东西越好。'); }
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
  if (p.r >= 9) $('#xpTxt').textContent = '已证大道';
  else if (ready) $('#xpTxt').textContent = `修为圆满 · 点此冲击${p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n}`;
  else if (st.exp) $('#xpTxt').textContent = `历练中 · ${L.REGIONS[st.exp.k].n}`;
  else $('#xpTxt').textContent = `修为 ${fmt(p.xp)} / ${fmt(need)}`;
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
  $$('#nav button').forEach(b => b.classList.toggle('locked', !!navLock(b.dataset.nav)));
  $('#xpFill').style.width = (p.r >= 9 ? 100 : Math.min(100, p.xp / need * 100)).toFixed(1) + '%';
  $('#cult').classList.toggle('ready', ready);
  $('#cult').classList.toggle('away', !!st.exp);
  const g = L.GOALS[st.goal];
  $('#goalTxt').textContent = g ? L.goalText(st, g) : '大道已成';
  $('#goalRw').textContent = g && g.rw ? '灵石+' + fmt(g.rw) : '';
  setBadge('exp', !st.exp && !ready && p.r < 9 ? '闲' : '');
  const gd = st.guide && st.guide.done;
  const rec = !gd || ready || p.r >= 9 ? '' : !st.exp ? 'exp' : st.stones >= L.hCost('array', st.home.array) ? 'home' : '';
  $$('#nav button').forEach(b => b.classList.toggle('hint', b.dataset.nav === rec));
  setBadge('home', L.HOME.some(b => st.home[b.k] < b.max && st.stones >= L.hCost(b.k, st.home[b.k])) ? '↑' : '');
  setBadge('sect', L.canPromote(st) ? '升' : '');
  setBadge('market', L.desperate(st) && (st.lifePills[p.r] || 0) < 3 ? '!' : '');
  if (feedDirty) renderFeed();
}
// 渐进解锁：一开始只给历练、洞府、人物，免得一上来不知道点哪
function navLock(nav) {
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
