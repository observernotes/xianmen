/* 废柴仙途 · 界面片段 panel-sect：宗门四个分页（身份含职司与人脉、任务板、宝库轮换；门下见 panel-disc.js）、九宗、会武（宗主后三人战）、晋升、三宗争徒（血煞魔宗）、来犯
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 宗门：四个分页（身份 / 任务板 / 宝库 / 门下） ----------
let sectTab = 'id';
// 长老、圣子的立绘（ART.portrait）、宗门徽记
function ptImg(id, w, mood, alt) { const c = ART.portrait && ART.portrait(id, mood || 'n', alt); if (!c) return ''; return `<img class="px" src="${urlOf(c, ['pt', id, mood || 'n', alt ? 1 : 0].join('|'))}" style="width:${w}px;height:${w}px;flex:none" alt="">`; }
function emblemImg(id, k) { const c = ART.emblem && ART.emblem(id); if (!c) return ''; const z = pxs(16, k || 1.5); return `<img class="px" src="${urlOf(c, 'emb|' + id)}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">`; }
function sectTabs(tab) {
  const dot = k => ((k === 'disc' && st.disc && st.disc.cand && L.discOpen(st) && !L.discFull(st)) || (k === 'task' && (st.sect.tasks || []).some(t => L.taskCanDeliver(st, t))) ? ' <b class="seal">！</b>' : '');
  return '<div class="tabs">' + [['id', '身份'], ['task', '任务板'], ['vault', '宝库'], ['disc', '门下']].filter(([k]) => k === tab || (k === 'vault' ? UI.isOpen('vault') : k === 'disc' ? UI.isOpen('disc') : true)).map(([k, n]) => `<button data-stab="${k}" class="${k === tab ? 'on' : ''}">${n}${dot(k)}</button>`).join('') + '</div>';
}
function showSect(tab) {
  const p = st.p;
  if (!st.sect) {
    sheet({ title: shellTitle('world'), body: meTabs('sect') + `${emptyNoteHTML('vault', p.r >= 1 ? `散修一个。约 <b>${Math.max(0, (st.flags.inviteAt || 0) - st.tick)}</b> 月后宗门再来招揽。` : '散修一个。筑基后三大宗门会来招揽。')}
      <div class="quote">戒中老祖：“急什么。等你筑基，那些宗门自会八抬大轿来请你。”</div>` });
    return;
  }
  tab = tab || sectTab; sectTab = tab;
  const sc = L.sectOf(st);
  const body = tab === 'task' ? sectTaskHTML() : tab === 'vault' ? sectVaultHTML() : tab === 'disc' ? discTabHTML() : sectIdHTML();
  const s = sheet({ title: shellTitle('world'), sub: `${emblemImg(st.sect.id, 1)} ${sc.n} · ${L.srankName(st, st.sect.rank)}`, body: meTabs('sect') + sectTabs(tab) + body });
  s.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => { SFX.tap(); showSect(b.dataset.stab); });
  if (tab === 'id') bindSectId(s); else if (tab === 'task') bindSectTask(s); else if (tab === 'vault') bindSectVault(s); else bindDiscTab(s);
}
// ---------- 身份：身份阶梯、晋升条件（含三位长老的支持）、职司、人脉、九宗 ----------
const ACT_N = { leap: '越级', craft: '炼丹', retreat: '闭关' };
function elderCard(x) {
  const v = L.favor(st, x.id), g = L.giftInfo(st, x.id), f80 = st.sect.f80 && st.sect.f80[x.id];
  const tasks = [...new Set(x.tasks.map(k => (k.startsWith('act:') ? ACT_N[k.slice(4)] : L.TASK_N[k])))].join('、');
  const mark = '<i class="fmark" style="left:40%"></i><i class="fmark promo" style="left:50%"></i><i class="fmark" style="left:80%"></i>';
  const ok = v >= L.FAV.promo, canGift = g && !g.why;
  const body = `<div class="fbar">${bar(v / 100, ok)}${mark}</div>
    <div class="pn-line"><span class="chip">${esc(x.ph)}</span> 管：${esc(tasks)}</div>
    <div class="pn-line ${v >= L.FAV.small ? 'jadet' : 'muted'}">${v >= L.FAV.small ? '✓' : '·'} ≥40：${esc(L.elderFavDesc(st, x, 40))}</div>
    <div class="pn-line ${f80 ? 'jadet' : 'muted'}">${f80 ? '✓' : '·'} ≥80：${esc(L.elderFavDesc(st, x, 80))}</div>
    ${g ? `<div class="pn-line">送礼 · ${esc(g.text)}：${g.why ? `<span class="seal">${esc(g.why)}</span>` : `支持 +${g.gain}${g.rival ? `，${esc(g.rival.n)} −${L.FAV.rival}` : ''}`}</div>` : ''}`;
  return pnFold('el-' + x.id, { cls: 'elder', attrs: ` data-elder="${x.id}"`, ic: ptImg(x.img, pxs(48, 1), v >= L.FAV.big ? 'joy' : v < 20 ? 'ang' : 'n'),
    nm: `${esc(x.n)} <span class="muted">${esc(x.t)}</span>`, badge: ok ? '<span class="chip ok">够</span>' : '',
    k: `<span class="${ok ? '' : 'muted'}">支持 ${v}/${L.FAV.promo}</span>`,
    right: `<button class="btn sm alt" data-gift="${x.id}" ${canGift ? '' : 'disabled'}>送礼${canGift ? `<small>+${g.gain}</small>` : ''}</button>`, body });
}
function sectIdHTML() {
  const sc = L.sectOf(st), sr = st.sect.rank, nx = L.SRANKS[sr + 1];
  let promo;
  if (nx) {
    const needs = L.promoteNeeds(st), can = L.canPromote(st), left = needs.filter(x => !x.ok).length;
    const duelLine = nx.duel ? (() => { const foe = { kind: 'heir', sect: st.sect.id }; return `<div class="pn-line seal">当众击败原${L.srankName(st, sr + 1)}${esc(L.heirName(st))}：胜算 ${L.pct(L.duelP(st, L.duelPower(st, foe), L.heirPower(), foe))}</div>`; })() : '';
    promo = `<div class="pn-hero" id="promoCard"><div class="row"><div class="grow"><div>晋升 <b>${L.srankName(st, sr + 1)}</b></div><div class="pn-k">俸禄 ×${L.SRANKS[sr].pay} → <b class="pn-up">×${nx.pay}</b></div></div>
      <button class="btn ${can ? 'gold' : 'alt'} eq" id="btnPromo" ${can ? '' : 'disabled'} style="flex:none;min-width:88px">晋升${can ? '' : `<small>差 ${left || 1} 条</small>`}</button></div>
      ${needs.map(x => `<div class="pn-line ${x.ok ? 'jadet' : 'muted'}">${x.ok ? '✓' : '·'} ${esc(x.t)}</div>${!x.ok && x.v !== undefined ? bar(Math.min(1, x.v), false) : ''}${x.elders ? `<div class="felders">${L.eldersOf(st).map(e => { const v = L.favor(st, e.id); return `<span class="fel ${v >= L.FAV.promo ? 'ok' : ''}">${ptImg(e.img, pxs(24, 1))}<span>${esc(e.n)}<br><b class="num">${v}</b>/${L.FAV.promo}</span></span>`; }).join('')}</div>` : ''}`).join('')}${duelLine}</div>`;
  } else promo = '<div class="quote">你已是一宗之主，号令一方。</div>';
  const dk = L.duty(st), D = dk && L.DUTIES[dk], dwhy = L.dutyWhy(st);
  const duty = L.dutyOpen(st) ? pnFold('duty', { attrs: ' id="dutyCard"', ic: icon16(D ? D.icon : 'post_zhan', 2), nm: `职司 · ${D ? D.n : '未领'}`,
    k: D ? esc(D.d.split('，')[0]) : '<span class="muted">五堂任选其一</span>',
    right: `<button class="btn sm ${!dwhy && !D ? 'gold' : 'alt'} eq" id="btnDuty" ${dwhy ? 'disabled' : ''}>${D ? '换职司' : '选职司'}</button>`,
    body: D ? `<div class="pn-line">${esc(D.d)}</div>${dwhy ? `<div class="pn-line muted">${esc(dwhy)}</div>` : ''}` : '' }) : '';   // 没开的不提（docs/ONBOARDING.md）
  const kw = st.sect.id === 'xuesha' ? L.karmaTradeWhy(st) : '';
  const moTrade = st.sect.id === 'xuesha' ? pnFold('karma', { ic: icon16('karma', 2), nm: '以因果换贡献', k: `一条换 ${fmt(L.karmaTradeVal(st))}`,
    right: `<button class="btn sm alt eq" id="btnKarma" ${kw ? 'disabled' : ''}>交一条</button>`, body: `<div class="pn-line">手里的因果交给血河老祖，这笔账也就了了。未了 ${L.karmaOpen(st).length} 条</div>` }) : '';
  // 宗主建设（DESIGN §3.9）：护山大阵、藏经阁、灵脉，灵石的后期去处；图标 ART.sectBuildIcon(k) 即 ART.icon('sb_' + k)
  const B0 = st.sect.build || {};
  const builds = sr >= 6 ? pnHead('宗主建设', `灵石 ${fmt(st.stones)}`) + '<div class="pn-list">' + L.BUILDS.map(b => { const lv = B0[b.k] || 0, c = L.buildCost(lv), ok = lv < 5 && st.stones >= c; return pnFold('bd-' + b.k, { ic: icon16(ART.icon('sb_' + b.k) ? 'sb_' + b.k : 'cave', 2), nm: b.n, badge: `<span class="chip">${lv}/5</span>`, right: `<button class="btn sm alt eq" data-build="${b.k}" ${ok ? '' : 'disabled'}>${lv >= 5 ? '已满' : fmt(c)}${lv >= 5 ? '' : '<small>灵石</small>'}</button>`, body: `<div class="pn-line">${esc(b.d)}</div>` }); }).join('') + '</div>' : '';
  return `<div class="pn-stats"><div><small>身份</small><b>${L.srankName(st, sr)}</b></div><div><small>俸禄/月</small><b class="num">${fmt(L.pay(st))}</b></div><div><small>可用贡献</small><b class="num">${fmt(st.sect.pts)}</b></div></div>
    ${promo}${duty}${moTrade}${builds}
    ${UI.isOpen('vault') ? pnHead('人脉', `圣子、宗主要两位 ≥${L.FAV.promo}`, 'renmai') + `<div class="pn-list">${L.eldersOf(st).map(elderCard).join('')}</div>` : ''}
    <details class="more"><summary>宗门加成 · 九宗排名</summary><div class="muted">宗门加成：${esc(sc.perk)}<br>身份阶梯：${L.SRANKS.map((r0, i) => (i === sr ? '【' + L.srankName(st, i) + '】' : L.srankName(st, i))).join(' → ')}<br>俸禄：每月 ${fmt(L.pay(st))} 灵石${sc.pill ? `，手里破境丹不足 ${L.DAN_PILL_CAP} 枚时每 6 月附一枚` : ''}；累计贡献 ${fmt(st.sect.total)}</div>${nineHTML()}
    <div class="muted">历练（按评价）、宗门任务、天骄论道和九宗会武获胜都能挣贡献。${UI.isOpen('vault') ? `长老的支持来自他管的任务（每件 +${L.FAV.task}）、奇遇里的抉择、送礼（每位每届一次）；三位长老理念相冲，讨好一位常要得罪另一位。` : ''}${st.flags.warWon ? '你曾一人一剑击退天剑宗，威震四方。' : ''}</div></details>`;
}
function bindSectId(s) {
  const pb = s.querySelector('#btnPromo'); if (pb) pb.onclick = () => { SFX.tap(); doPromote(); };
  const db = s.querySelector('#btnDuty'); if (db) db.onclick = () => { SFX.tap(); showDutyPick(); };
  const kb = s.querySelector('#btnKarma'); if (kb) kb.onclick = () => { const r = L.karmaTrade(st); if (!r) return; SFX.coin(); floatText(100, 80, `贡献 +${fmt(r.v)}`, '#ffe39a'); showSect('id'); };
  s.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => { const r = L.giftElder(st, b.dataset.gift); if (!r) return; SFX.coin(); floatText(100, 80, `支持 +${r.d}`, '#8ff5d0'); showSect('id'); });
  s.querySelectorAll('[data-build]').forEach(b => b.onclick = () => { if (!L.sectBuild(st, b.dataset.build)) return; SFX.coin(); showSect('id'); });
}
// 职司：五选一（每届会武后可改）
function showDutyPick() {
  const cur = L.duty(st);
  const rows = Object.keys(L.DUTIES).map(k => { const D = L.DUTIES[k]; return `<button class="pjob duty ${k === cur ? 'cur' : ''}" data-duty="${k}" ${k === cur ? 'disabled' : ''}>${icon16(D.icon, 2)}<span class="grow"><b>${D.n}${k === cur ? '（现在）' : ''}</b><span class="muted">${esc(D.d)}</span></span><span class="pn-chkbox${k === cur ? ' on' : ''}" aria-hidden="true"></span></button>`; }).join('');
  const s = sheet({ title: '领职司', body: `<p class="muted">真传弟子在五堂领一份差事，每届九宗会武之后可以改。</p><div class="pjobs" id="dutyList">${rows}</div>`, foot: [{ t: '回宗门', alt: true, fn: () => showSect('id') }] });
  s.querySelectorAll('[data-duty]').forEach(b => b.onclick = () => { const k = b.dataset.duty; if (!L.setDuty(st, k)) return; SFX.win(); banner('职司 · ' + L.DUTIES[k].n, L.DUTIES[k].d); showSect('id'); });
}
// ---------- 任务板 ----------
function sectTaskHTML() {
  const T = st.sect.tasks || [];
  const busyT = t => (t.ty === 'teach' || t.ty === 'lecture') && L.busy(st);
  // 本屏唯一的金色：能交的先交，其次第一件能接的
  let gi = T.findIndex(t => !t.done && t.taken && L.taskCanDeliver(st, t));
  if (gi < 0) gi = T.findIndex(t => !t.done && !t.taken && !busyT(t));
  const tasks = T.map((t, i) => {
    const can = L.taskCanDeliver(st, t), el = L.elder(L.taskElder(st, t)), g = i === gi ? 'gold' : 'alt';
    const btn = t.done ? '<span class="chip ok">已完成</span>' : !t.taken ? `<button class="btn sm ${g} eq" data-tk="${i}" ${busyT(t) ? 'disabled' : ''}>接取</button>` : can ? `<button class="btn sm ${g} eq" data-td="${i}">交付</button>` : `<span class="chip">进行中${t.need > 1 ? ` ${t.prog}/${t.need}` : ''}</span>`;
    return pnFold('tk-' + i, { cls: t.done ? 'pn-off' : '', ic: el ? ptImg(el.img, pxs(32, 1)) : icon16(ART.icon('task') ? 'task' : 'flag', 2), nm: esc(L.taskText(st, t)), k: `<span class="goldt">${esc(L.taskReward(st, t))}</span>`, right: btn,
      body: el ? `<div class="pn-line">${esc(el.n)}管的事：做完支持 +${L.FAV.task}${t.fav ? `（已 +${t.fav.d}）` : ''}</div>` : '' });
  }).join('');
  return pnHead('任务板', `${L.nextTour(st)} 月后刷新`) + (tasks ? `<div class="pn-list">${tasks}</div>` : emptyNoteHTML('scroll', '这一届的任务都做完了，论道后刷新。'));
}
function bindSectTask(s) {
  s.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { if (L.taskTake(st, +b.dataset.tk)) { SFX.tap(); if (st.retreat && (st.retreat.kind === 'teach' || st.retreat.kind === 'busy')) closeModal(); else showSect('task'); } });
  s.querySelectorAll('[data-td]').forEach(b => b.onclick = () => { if (L.taskDeliver(st, +b.dataset.td)) { SFX.coin(); showSect('task'); } });
}
// ---------- 宝库：6 格轮换，贡献兑换 ----------
function vaultImg(c) {
  const s = c.s;
  if (s.k === 'art') return artImg(s.id, 2);
  if (s.k === 'gear') { if (s.base) return gearImg({ id: s.base, slot: s.slot, t: s.tier }, 2); const c = ART.item(s.slot, s.tier, s.slot === 'o' ? 0 : undefined), z = pxs(16, 2); return `<img class="px" src="${urlOf(c, 'gear|' + s.slot + s.tier)}" style="width:${z}px;height:${z}px;flex:none" alt="">`; }
  if (s.k === 'plan') { if (L.PLAN[s.id]) return scrollImg(); const g = ART.sigil && ART.sigil(s.id); return g ? `<img class="px" src="${urlOf(g, 'sig|' + s.id)}" style="width:${pxs(16, 2)}px;height:${pxs(16, 2)}px;flex:none" alt="">` : scrollImg(); }
  return icon16({ pill: 'pojing', ore: 'ore', herb: 'herb', treasure: 'treasure', feed: 'feed' }[s.k] || 'treasure', 2);
}
function sectVaultHTML() {
  const VC = L.vaultCells(st), vaultEmpty = !VC.length || VC.every(c => c.left <= 0 || ['已习得', '已有'].includes(c.why));   // 空状态：没货，或者这一批能换的都换完了 / 都有了
  const cells = VC.map(c => {
    const lock = !!c.why && (/可换$/.test(c.why) || /槽/.test(c.why)), owned = ['已换完', '已习得', '已有'].includes(c.why), short = /^还差/.test(c.why || '');
    const main = c.A ? esc(artMain(c.A.id)) : esc(c.d);
    const btn = `<button class="btn sm alt eq" data-vr="${c.i}" ${c.ok ? '' : 'disabled'}>${owned ? c.why : c.cost > 0 ? fmt(c.cost) : '免费'}${owned ? '' : `<small>${short ? esc(c.why.replace(/^还差\s*/, '差 ')) : c.cost > 0 ? '贡献' : ''}</small>`}</button>`;
    return pnFold('vr-' + c.i, { cls: 'vcell' + (lock || owned ? ' pn-off' : ''), ic: vaultImg(c), nm: esc(c.n), badge: c.A ? tierTag(c.A.t) : '',
      k: lock ? `<span class="seal">${esc(c.why)}</span>` : main, right: btn,
      body: `${c.A ? `<div class="pn-line">${elChip(c.A.el)} ${main}${c.A.k !== 'm' ? ' · ' + esc(L.artDesc(st, c.A.id)) : ''}</div>` : `<div class="pn-line">${esc(c.d)}</div>`}${c.s.lim > 1 ? `<div class="pn-line muted">这一批还剩 ${c.left} 件</div>` : ''}` });
  }).join('');
  return `${pnHead(`宝库 · ${L.VAULT_ROT.n} 格`, `贡献 ${fmt(st.sect.pts)} · ${L.vaultRestockIn(st)} 月换货`)}
    ${st.sect.freePick > 0 ? `<div class="quote">札记赏你任选一件：功法、法宝不收贡献（还有 ${st.sect.freePick} 次）</div>` : ''}${vaultEmpty ? emptyNoteHTML('vault', cells ? `这一批能换的都换完了，${L.vaultRestockIn(st)} 月后换货。` : `宝库还空着，${L.vaultRestockIn(st)} 月后上货。`) : ''}<div id="vaultRot" class="pn-list">${cells}</div>
    <details class="more"><summary>宝库怎么换货</summary><div class="muted">每届论道换一批：本宗秘传功法、宝库法宝（够格时是镇宗之宝）、本宗阵图与器方按身份开放，贡献是唯一的货币。</div></details>`;
}
function bindSectVault(s) {
  s.querySelectorAll('[data-vr]').forEach(b => b.onclick = () => {
    const r = L.vaultRotBuy(st, +b.dataset.vr); if (!r) return; SFX.coin();
    if (r.it) revealItem(r.it, () => showSect('vault'));
    else { floatText(100, 80, r.ore ? `灵矿 +${fmt(r.ore)}` : r.planText ? r.planText.slice(0, 12) : r.n, '#ffe39a'); showSect('vault'); }
  });
}
function nineHTML() {
  const pos = L.sectPos(st);
  const next = L.nextMeet(st);
  const rows = st.sect.order.map((id, i) => {
    const N = L.NINE.find(x => x.id === id), me = id === st.sect.id;
    return `<div class="${me ? 'me' : ''}"><b>第${i + 1}</b><span>${N.n}${me ? '（本宗）' : ` · ${N.champ}`}</span><span class="num">${me ? fmt(L.power(st)) : fmt(L.ninePower(st, i + 1))}</span></div>`;
  }).join('');
  return `<div class="muted">天下九宗（九宗会武每 24 月一届，你代表本宗出战）</div>
    <dl class="grid2"><dt>宗门排名</dt><dd>天下第 ${pos} 宗 · 最高第 ${st.sect.best}（俸禄 ×${(1 + 0.08 * (9 - pos)).toFixed(2)}）</dd><dt>灵脉</dt><dd>${st.sect.veins || 0} 条（俸禄 +${(st.sect.veins || 0) * 25}%）</dd><dt>下届会武</dt><dd>${next} 月后</dd></dl>
    <div class="ladder">${rows}</div>`;
}
const NINE_LOOK = { kunlun: 'yun', tianjian: 'chu', xuesha: 'xue' };
function runSectMeet() {
  const res = L.sectMeet(st);
  if (!res) return;
  const sc = L.sectOf(st);
  let step = -1;
  const next = () => {
    step++;
    if (step === 0) {
      SFX.gong();
      sheet({ title: `第${res.n}届 九宗会武`, center: true, noClose: true,
        body: `<p class="center">天下九宗齐聚问剑台，以武论高下，排定宗门座次！</p><div class="center">${myAvImg(52)}${res.trio ? res.team.map(u => { const x = L.discByU(st, u); return x ? discImg(x, 52) : ''; }).join('') : ''}</div><p class="center">你代表 <b>${sc.n}</b> 出战${res.trio ? `，带着徒弟${res.team.map(u => { const x = L.discByU(st, u); return x ? esc(x.n) : ''; }).join('、')}（三人战，三局两胜）` : ''} · 当前天下第 ${res.start} 宗</p>`,
        foot: [{ t: '为宗门而战！', gold: true, fn: next }] });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const look = NINE_LOOK[rd.foe.id];
    const tj = rd.foe.id === 'tianjian';
    // 宗主之后：三人战（你 + 两名徒弟，三局两胜）
    const trio = rd.trio ? `<div class="trio">${rd.trio.map(t => `<span class="${t.win ? 'jadet' : 'seal'}">${t.who === 'me' ? '你' : esc(t.n)} ${t.win ? '胜' : '败'}<small class="muted">（${L.pct(t.p)}）</small></span>`).join('')}</div><div class="center">三局${rd.wins}胜</div>` : '';
    duel({
      title: `会武 · 对阵${rd.foe.n}${rd.trio ? '（三人战）' : ''}`,
      right: { img: rivalAvImg(look ? { n: rd.foe.champ, id: look } : { n: rd.foe.champ }, 66), name: rd.foe.champ, sub: `${rd.foe.n} · 天下第${rd.q}宗 · ${fmt(rd.Q)}` }, Q: rd.Q, S: rd.S || res.S, p: rd.p, win: rd.win,
      stage: 'sect', foe: ftChamp(rd.foe), trio: rd.trio,
      quote: `${rd.foe.champ}：“${rd.foe.line}”`,
      winText: `${trio}${rd.xx ? '<div class="jadet">玄霄嗡鸣，老祖出手：这一场重来了一次</div>' : ''}${rd.defend ? '卫冕天下第一宗' : `${esc(sc.n)}升至天下第 ${rd.q} 宗`} · 贡献 +${fmt(rd.contrib || 0)} · 灵石 +${fmt(rd.stones || 0)}${tj && st.flags.beatTianjian === 1 ? '<div class="quote">天剑宗众长老面如土色——当年被一脚踢下山的弃徒，如今代表' + esc(sc.n) + '把天剑宗踩在了脚下！</div>' : ''}`,
      loseText: `${trio}对方底蕴深厚，下届会武再来！`,
      btn: res.rounds[step] ? '下一场' : '会武落幕',
      done: next,
    });
  };
  const summary = () => {
    const up = res.start - res.end;
    if (res.end === 1 && res.start > 1) banner('天下第一宗', sc.n);
    else if (up > 0) banner(`宗门 ↑${up}`, `天下第 ${res.end} 宗`);
    sheet({ title: '会武落幕', center: true,
      body: `<div class="center big ${up > 0 ? 'goldt' : ''}">天下第 ${res.end} 宗</div><p class="center">${up > 0 ? `${esc(sc.n)}从第 ${res.start} 升至第 ${res.end}！` : res.end === 1 ? `${esc(sc.n)}稳坐天下第一宗！` : '座次未变，下届再战。'}</p>${res.end === 1 && res.start > 1 ? `<div class="quote">九宗俯首。从今日起，${esc(sc.n)}便是天下第一宗！</div>` : ''}<p class="center muted">宗门排名越高，俸禄越多。</p>`,
      foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
  };
  next();
}
function doPromote() {
  const sc = L.sectOf(st);
  const before = st.sect.rank;
  const res = L.promote(st);
  if (!res) return;
  const title = L.srankName(st, before + 1);
  const celebrate = () => {
    banner('晋升' + title, sc.n);
    SFX.win();
    sheet({ title: '晋升', center: true, body: `<div class="center">${myAvImg(66)}</div><div class="center big goldt">${title}</div>
      <p class="center">${sc.n}钟声九响，全宗弟子齐聚广场。从今日起，你便是${sc.n}${title}！</p><p class="center muted">俸禄提升至每月 ${fmt(L.pay(st))} 灵石，宗门宝库开放更高品阶。</p>`,
      foot: [{ t: '谢宗门栽培', gold: true, fn: closeModal }] });
  };
  if (res.duel) {
    const H = L.SECT_HEIR[st.sect.id] || {}, heir = { n: `原${title}·${L.heirName(st)}` };
    const himg = H.img && ART.hasPortrait && ART.hasPortrait(H.img) ? ptImg(H.img, 66, 'ang', st.p.look.f && !!H.nf).replace('<img ', '<img id="vsR" ') : rivalAvImg(heir, 66);
    duel({
      title: `${title}之争`, intro: `你要晋升${title}的消息传出，原${title}当众拦下：“想坐我的位置？先过我这一关！”`,
      right: { img: himg, name: heir.n, sub: fmt(res.duel.Q) }, Q: res.duel.Q, S: res.duel.S, p: res.duel.p, win: res.duel.win,
      stage: 'sect', foe: withEl((H.img && ftPeople(H.img, st.p.look.f && !!H.nf)) || ftGen(heir.n), L.HEIR_EL && L.HEIR_EL[st.sect.id]), face: true,
      quote: `${heir.n}：“一个半路入门的散修，也配当${title}？”`,
      winText: `${esc(heir.n)}面如死灰，长剑落地。全场鸦雀无声，随后掌声雷动！`, loseText: '你惜败一招。来日修为更进一步，再来挑战！',
      done: () => { if (res.ok) celebrate(); else closeModal(); },
    });
  } else celebrate();
}
function showInvite() {
  if (st.sect) return;
  let sel = 0;
  const SC = L.sectsFor(st);
  const s = sheet({
    title: SC.length > 3 ? '四宗争徒' : '三宗争徒', center: true, noClose: true,
    body: `<p>筑基消息传出，天下震动！${SC.length > 3 ? '三大正宗的长老同时登门，血煞魔宗也递来一封血帖' : '三大宗门的长老同时登门'}，争相招揽：</p>
      <div class="cands${SC.length > 3 ? ' four' : ''}">${SC.map((sc, i) => `<div class="cand ${i === sel ? 'sel' : ''}" data-i="${i}" style="padding:10px 6px"><div class="beam" style="background:${sc.color}"></div><div class="nm" style="color:${sc.color}">${sc.n}</div><div class="tr">${sc.fit}</div><div class="tr">${sc.perk}</div></div>`).join('')}</div>
      <div id="inv" class="center"></div>
      <div class="quote">戒中老祖：“${(st.origin || 'qitu') === 'qitu' ? '当年天剑宗把你踢下山' : '当年人家当你是个' + esc(L.originWord(st, 'lowly'))}，如今人家抢着要你。痛快不痛快？”</div>`,
    foot: [{ t: '再想想', alt: true, fn: () => { L.log(st, `婉拒了三大宗门的招揽，${12} 月后他们还会再来`); closeModal(); } }, { t: '拜入', gold: true, fn: () => { const sc = SC[sel]; if (!L.joinSect(st, sc.id)) return; SFX.win(); closeModal(); banner('拜入' + sc.n, `外门弟子 · 俸禄每月 ${fmt(L.pay(st))}`); } }],
  });
  const ok = s.querySelector('[data-fi="1"]');
  const show = () => {
    const sc = SC[sel];
    s.querySelectorAll('.cand').forEach(x => x.classList.toggle('sel', +x.dataset.i === sel));
    s.querySelector('#inv').innerHTML = `<b>${sc.n}</b>：${sc.d}。${sc.perk}`;
    ok.textContent = '拜入' + sc.n;
  };
  s.querySelectorAll('.cand').forEach(c => c.onclick = () => { sel = +c.dataset.i; SFX.tap(); show(); });
  show();
}
function runWar() {
  const res = L.sectWar(st);
  const sc = L.sectOf(st);
  duel({
    title: '天剑宗来犯', intro: sc ? `天剑宗长老率众杀上${sc.n}山门，扬言要讨回当年那个${L.originWord ? L.originWord(st, 'lowly') : '弃徒'}！` : '天剑宗长老率众杀到你的洞府门前：散修也敢翻天剑宗的旧账？',
    right: { img: rivalAvImg({ n: '天剑宗长老团', id: 'zhao' }, 66), name: '天剑宗长老团', sub: fmt(res.Q) }, Q: res.Q, S: res.S, p: res.p, win: res.win,
    stage: !sc ? 'wild' : HAS_MO ? 'sect_mo' : 'sect', foe: ftGen('天剑宗长老', { f: 0, robe: ['#5a6a8a', '#8aa0c8', '#dfe7ef'], trim: '#f4c542', extra: 2, el: L.foeEl ? L.foeEl({ kind: 'war', id: 'tianjian' }) : '' }),   // 魔宗演武场、天剑宗金系剑气（duel-scene.js）
    quote: '天剑宗长老：“交出那个弃徒，饶你们满门不死！”',
    winText: `你一人一剑立于山门之前，剑光过处，天剑宗众人倒飞而出！<br>宗门贡献 +${fmt(res.contrib || 0)}，灵石 +${fmt(res.stones || 0)}`,
    loseText: '宗门众长老联手苦战，方才逼退来敌。天剑宗扬言还会再来……',
    done: closeModal,
  });
}
