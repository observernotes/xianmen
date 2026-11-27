/* 废柴仙途 · 界面片段 panel-pets：兽栏（【洞府】→ 兽栏）：灵宠卡片横排，点卡 → 出战 / 派岗（五个岗位图标）/ 喂食（长按连喂）；
 * 卡片发光时点【进化】弹二选一的进化卡（ART.drawEvo）；名册满时的放生 / 替换卡；洞府场景里的灵宠（出战的在主角身边，干活的在各自岗位上）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。数值全部取自 src/logic/pets.js，每个按钮都写着“前 → 后”。 */
let petSel = 0, petMsg = '', petHold = null;
const PET_EL_CLS = { mu: 'el-mu', shui: 'el-shui', jin: 'el-jin', huo: 'el-huo', tu: 'el-tu' };
function petElChip(el) { return `<span class="el ${PET_EL_CLS[el] || 'el-none'}">${L.PET_EL_N[el || '']}</span>`; }
function petCardImg(sp, form, aw, k, sil) {
  const c = ART.petCard(sp, form || 0, aw), s = pxs(36, k || 2);
  return `<img class="px${sil ? ' psil' : ''}" src="${urlOf(c, ['pc', sp, form || 0, aw ? 1 : 0].join('|'))}" style="width:${s}px;height:${s}px;flex:none" alt="">`;
}
// 兽栏格子：品阶底框 ART.qualityCell(品阶, 36) 上叠灵宠像（和 ART.petCard 同位置 (2, 4)）；没有底框时退回 petCard
function petQCardImg(p, k) {
  if (!ART.qualityCell) return petCardImg(p.sp, p.form, p.aw, k);
  const t = L.petTier(p), key = ['pqc', p.sp, p.form || 0, p.aw ? 1 : 0, t].join('|'), s = pxs(36, k || 2);
  let u = avCache.get(key);
  if (!u) { const c = document.createElement('canvas'); c.width = c.height = 36; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(ART.qualityCell(t, 36), 0, 0); x.drawImage(ART.petSprite(p.sp, p.form || 0, 0, p.aw), 2, 4); u = urlOf(c, key); }
  return `<img class="px" src="${u}" style="width:${s}px;height:${s}px;flex:none" alt="">`;
}
function petSprImg(p, k) {
  const c = ART.petSprite(p.sp, p.form || 0, 0, p.aw), z = pxs(1, k || 3);
  return `<img class="px" src="${urlOf(c, ['ps', p.sp, p.form || 0, p.aw ? 1 : 0].join('|'))}" style="width:${32 * z}px;height:${28 * z}px;flex:none" alt="">`;
}
const hearts = p => '<span class="phearts">' + '♥'.repeat(p.heart) + '<i>' + '♥'.repeat(5 - p.heart) + '</i></span>';
const petRole = (i, p) => (L.petResting(st, p) ? `休养 ${seasons(p.rest - st.tick)} 季` : i === st.petOut ? '出战' : p.job ? L.PET_JOB[p.job].n : '闲着');   // 挡过天劫的休养中（无效果）
const petRoleIcon = (i, p) => icon16(i === st.petOut ? 'job_out' : p.job ? L.PET_JOB[p.job].icon : 'feed', 1);
const petTierTag = t => `<span class="tag" style="background:${['#9aa0a6', '#e6e1d3', '#62d26f', '#4aa8ff', '#c27dff', '#ffcf3f', '#ff7a7a'][Math.min(6, t)]}">${t} 阶</span>`;
// 一件事做之前 / 之后的数（不改存档）
function petDelta(mut, fn) { const a = fn(); const b = L.petTry(st, mut, fn); return [a, b]; }
function arrowNum(a, b, f) { f = f || fmt; return f(a) === f(b) ? f(a) : `${f(a)} → <b>${f(b)}</b>`; }
// 某岗位干起来值多少（派岗卡与提示共用）
function jobEffect(i, k) {
  const mut = () => (k === 'out' ? L.petSetOut(st, i) : L.petSetJob(st, i, k));
  if (k === 'out') { const [a, b] = petDelta(mut, () => L.power(st)); return `战力 ${arrowNum(a, b)}`; }
  if (k === 'array') { const [a, b] = petDelta(mut, () => L.gain(st)); return `修炼 +${arrowNum(a, b, dec)}/月`; }
  if (k === 'field') { const [a, b] = petDelta(mut, () => L.income(st)); return `灵石 +${arrowNum(a, b, dec)}/月，作物产量 +${L.pct(L.petTry(st, mut, () => L.petJobVal(st, 'field')))}`; }
  if (k === 'furnace') { const [a, b] = petDelta(mut, () => L.alchRate(st)); return `成丹率 ${arrowNum(a, b, L.pct)}`; }
  if (k === 'forage') { const v = L.petTry(st, mut, () => L.petJobVal(st, 'forage')); return `兽粮 +${dec(v)}/月，偶尔叼回灵矿药引`; }
  if (k === 'patrol') { const v = L.petTry(st, mut, () => L.petJobVal(st, 'patrol')); return `坏访客、盗贼 −${L.pct(v)}`; }
  return '';
}
// 名册满时新来的一只：第一屏 它是谁 + 出战倍率 + 【放生】（金）；替换哪一只是一排纸按钮；天赋收进详情
function petPendHTML() {
  return (st.petPend || []).map((p, j) => {
    const m = L.petAtkOf(st, p), left = 12 - (st.tick - (p.pendAt || 0));
    const rep = st.pets.map((x, i) => `<button class="btn sm alt" data-ppend="${j}:${i}">${esc(L.petName(x))}<small>Lv${x.lv} ×${mult2(L.petAtkOf(st, x))}</small></button>`).join('');
    return `<div class="pend pn-pend"><div class="row">${petCardImg(p.sp, 0, 0, 1.5)}<div class="grow"><div class="line"><b>${esc(L.petName(p))}</b>${petTierTag(L.petTier(p))}${petElChip(L.PET_SP[p.sp].el)}</div>
      <div class="pn-key">出战 <b>×${mult2(m)}</b></div><div class="muted">名册满了（${st.pets.length}/${L.petCap(st)}）${left > 0 ? ` · ${seasons(left)} 季后自己走` : ''}</div></div></div>
      <div class="gbtns"><button class="btn sm gold" data-ppend="${j}:-1">放生<small>兽粮 +${L.petReleaseFeed(p)}</small></button></div>
      <div class="muted">或者换掉一只：</div><div class="gbtns pn-rep">${rep}</div>
      <details class="more pn-more"><summary>它的天赋</summary><div class="jadet">${esc(L.petTalText(p))}</div><div class="muted">${L.PET_TY[L.PET_SP[p.sp].ty]}型 · ${L.PET_EL_N[L.PET_SP[p.sp].el]}</div></details></div>`;
  }).join('');
}
function petLine(it) {
  if (it.pend) return petPendHTML();
  const p = L.petByU(st, it.u);
  const role = it.out ? `出战 ×${mult2(p ? L.petAtkOf(st, p) : 1)}` : it.job ? L.PET_JOB[it.job].n : '进了兽栏';
  return `<div class="quote row">${petCardImg(it.sp, 0, 0, 1)}<span class="grow">收服【${esc(it.name)}】 <span class="chip ok">${role}</span><br><span class="muted">${it.tier} 阶 · ${L.PET_TY[L.PET_SP[it.sp].ty]} · ${L.PET_EL_N[it.el]}</span></span></div>`;
}
function bindPetButtons(m) {
  m.querySelectorAll('[data-ppend]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const [j, i] = b.dataset.ppend.split(':').map(Number);
    const r = L.petPendDecide(st, j, i >= 0 ? i : undefined);
    if (!r) return;
    SFX.coin();
    petMsg = r.p ? `【${esc(L.petName(r.p))}】替下了【${esc(L.petName(r.replaced))}】，放生得兽粮 +${r.feed}` : `放【${esc(L.petName(r.released))}】归山：兽粮 +${r.feed}`;
    showPets(r.p ? r.p.u : undefined);
  });
}

// ---------- 兽栏 ----------
// 卡片：图 + 名字 + “Lv · 心” + 一个角标（可进化 / 出战 / 岗位 / 闲着）；选中那只：现在给什么（大字）、经验条、
// 三个按钮【出战】【派岗】【喂食】只有一个是金的（能进化时金色给【进化】），天赋、好感、规则收进详情
function showPets(u, still) {
  if (u !== undefined) { const i = L.petIdx(st, u); if (i >= 0) petSel = i; }
  if (petSel >= st.pets.length) petSel = Math.max(0, st.pets.length - 1);
  const cap = L.petCap(st);
  const cards = st.pets.map((p, i) => {
    const glow = L.petGlow(st, p), rest = L.petResting(st, p);
    const badge = glow ? '<span class="chip warn">可进化</span>' : rest ? '<span class="chip bad">休养</span>' : i === st.petOut ? `<span class="chip ok prole">${petRoleIcon(i, p)}出战</span>` : p.job ? `<span class="chip prole">${petRoleIcon(i, p)}${L.PET_JOB[p.job].n}</span>` : '<span class="chip bad">闲着</span>';
    return `<button class="pcard pn-pcard${i === petSel ? ' sel' : ''}${glow ? ' glow' : ''}" data-pi="${i}">${petQCardImg(p, 1.5)}<span class="nm">${esc(L.petName(p))}</span><span class="num">Lv${p.lv} <span class="phearts">♥${p.heart}</span></span>${badge}</button>`;
  }).join('') + Array.from({ length: Math.max(0, cap - st.pets.length) }, () => '<div class="pcard empty pn-pcard"><span class="aempty">空</span></div>').join('');
  let det = '';
  const p = st.pets[petSel];
  if (p) {
    const i = petSel, S = L.PET_SP[p.sp], out = i === st.petOut, need = L.petNeed(p), maxLv = L.petMaxLv(p), glow = L.petGlow(st, p);
    const why = L.petFeedWhy(st, i), n = why ? 0 : L.petPortion(st, p);
    // 喂一口能升级：写升级后的倍率（出战的写战力）
    let feedUp = '', feedNote = '';
    if (!why) {
      const up = p.xp + n * L.petFeedEff(st) >= need;
      if (up) {
        const up1 = () => { const q = st.pets[i]; q.lv++; q.xp = 0; };   // 只改等级，不走 L.petAddXp（那会触发进化事件、写日志）
        const [m0, m1] = petDelta(up1, () => L.petAtkOf(st, st.pets[i]));
        const [w0, w1] = out ? petDelta(up1, () => L.power(st)) : [0, 0];
        feedUp = `<div class="jadet pn-key">喂这一口升 Lv${p.lv + 1}：${out ? `战力 ${arrowNum(w0, w1)}` : `倍率 ×${mult2(m0)} → <b>×${mult2(m1)}</b>`} ▲</div>`;
        if (!out && p.job) feedNote = `${L.PET_JOB[p.job].n}效果 +${Math.round(L.PET_N.jobStep * 100)}%`;
      } else feedNote = `再喂约 ${fmt(Math.ceil((need - p.xp) / L.petFeedEff(st)))} 兽粮升一级`;
    }
    const lvLine = p.lv >= L.PET_N.lvMax ? `<div class="goldt">满 10 级${p.aw ? ' · 已觉醒' : '：能觉醒'}</div>` : maxLv === p.lv ? `<div class="goldt">Lv${p.lv}：先进化才能再升</div>${bar(1, true)}` : `<div class="muted num">Lv${p.lv} → ${p.lv + 1} · 经验 ${fmt(p.xp)}/${fmt(need)}</div>${bar(p.xp / need)}`;
    const evoGold = glow || L.petCanAwake(p);
    const outBtn = out ? `<button class="btn sm alt" disabled>出战中</button>` : `<button class="btn sm alt" id="petOut">${icon16('job_out', 1)} 出战<small>${petOutGain(i)}</small></button>`;
    const jobBtn = L.petJobsOpen(st) ? `<button class="btn sm alt" id="petJob">${icon16(p.job ? L.PET_JOB[p.job].icon : 'job_forage', 1)} 派岗<small>${p.job ? L.PET_JOB[p.job].n : '没派'}</small></button>` : '';
    const feedBtn = `<button class="btn sm ${why || evoGold || (st.petPend || []).length ? 'alt' : 'gold'} pfeed" id="petFeed" ${why ? 'disabled' : ''}>${icon16('feed', 1)} 喂食<small>${why ? esc(why) : '兽粮 ' + n}</small></button>`;
    const evo = L.petCanEvo(p) ? `<button class="btn ${glow ? 'gold pglowb' : 'alt'}" id="petEvo">进化<small>${glow ? ' · 条件齐了' : ' · 看条件'}</small></button>`
      : L.petCanAwake(p) ? '<button class="btn gold pglowb" id="petAwake">觉醒</button>' : '';
    const role = L.petResting(st, p) ? `<span class="seal">挡过天劫，休养 ${seasons(p.rest - st.tick)} 季</span>` : out ? `出战：战力 <b>×${mult2(L.petAtkOf(st, p))}</b>` : p.job ? `${L.PET_JOB[p.job].n}：<b>${esc(L.PET_JOB[p.job].d(L.petJobVal(st, p.job) || L.petJobV(p, p.job)))}</b>` : '<span class="seal">闲着：久了会掉好感</span>';
    const tal = L.PET_TAL[L.petTalId(p)];
    det = `<div class="pdet pn-pdet"><div class="row">${petSprImg(p, 2)}<div class="grow"><div class="line"><b>${esc(L.petName(p))}</b>${petTierTag(L.petTier(p))}${petElChip(S.el)}${p.aw ? '<span class="chip warn">觉醒</span>' : ''}</div>
      <div class="pn-key">${role}</div></div></div>
      ${lvLine}${feedUp}${petMsg ? `<div class="quote">${petMsg}</div>` : ''}
      <div class="gbtns pbtns">${outBtn}${jobBtn}${feedBtn}</div>${evo}
      <details class="more pn-more"><summary>天赋 · 好感 · 喂养</summary>
        <div><span class="chip">${L.PET_TY[S.ty]}型</span> <span class="jadet">天赋：${esc(L.petTalText(p))}${tal.job ? `（${L.PET_JOB[tal.job].n}时生效）` : '（出战时生效）'}</span></div>
        <div class="muted">好感 ${hearts(p)} ${p.heart}/5：每心效果 +2%${p.heart >= 5 ? '；五心能挡天劫（+10%，挡完休养 4 季）、不会出走' : '；闲着 8 季会掉一心'}</div>
        ${feedNote ? `<div class="muted">${feedNote}</div>` : ''}
        <div class="muted">点【喂食】喂一口，按住连喂。每级要兽粮 6 × 1.5^级 × 阶，每级让倍率的超出部分 +5%、岗位效果 +4%；5 级二选一进化（品阶 +1），10 级觉醒。出战每趟历练另得一级的一成经验（+${fmt(L.PET_N.tripXp * need)}），斩妖带回兽粮。</div>
      </details></div>`;
  } else det = emptyNoteHTML('pet', '还没有灵宠：坊市的灵兽蛋、采药时偶遇都能得到。');
  const body = `<div class="gres pn-res">${icon16('feed', 1)} 兽粮 <b class="num">${fmt(st.feed || 0)}</b> · 名册 ${st.pets.length}/${cap}</div>
    ${petPendHTML()}<div class="pcards pn-pcards" style="grid-template-columns:repeat(${Math.max(2, cap)},minmax(0,1fr))">${cards}</div>${det}`;
  const s = sheet({ title: shellTitle('gear'), still, body: meTabs('pets') + body });
  petMsg = '';
  s.querySelectorAll('[data-pi]').forEach(b => b.onclick = () => { SFX.tap(); petSel = +b.dataset.pi; showPets(undefined, true); });
  const ob = s.querySelector('#petOut'); if (ob) ob.onclick = () => { const pw0 = L.power(st); if (L.petSetOut(st, petSel)) { SFX.coin(); petMsg = `【${esc(L.petName(st.pets[petSel]))}】出战：战力 ${fmt(pw0)} → <b>${fmt(L.power(st))}</b>`; showPets(undefined, true); } };
  const jb = s.querySelector('#petJob'); if (jb) jb.onclick = () => { SFX.tap(); showPetJobs(petSel); };
  const fb = s.querySelector('#petFeed'); if (fb) bindFeedButton(fb, petSel);
  const eb = s.querySelector('#petEvo'); if (eb) eb.onclick = () => { SFX.tap(); showPetEvo(petSel); };
  const ab = s.querySelector('#petAwake'); if (ab) ab.onclick = () => { SFX.tap(); showPetEvo(petSel); };
}
// 【出战】按钮下的小字：换它出战，战力差多少
function petOutGain(i) { const [a, b] = petDelta(() => L.petSetOut(st, i), () => L.power(st)); const v = b - a; return fmt(a) === fmt(b) ? '战力不变' : `战力 ${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`; }
function doFeed(i) {
  const r = L.petFeed(st, i);
  if (!r) return null;
  if (r.ups) { SFX.reveal(3); petMsg = `<span class="jadet">升到 Lv${r.lv1}</span>：出战倍率 ×${mult2(r.m0)} → <b>×${mult2(r.m1)}</b>${fmt(r.pw0) !== fmt(r.pw1) ? `，战力 ${fmt(r.pw0)} → <b>${fmt(r.pw1)}</b>` : ''}${L.petCanEvo(st.pets[i]) ? '——<b class="goldt">能进化了！</b>' : ''}`; }
  else { SFX.tap(); petMsg = `喂了兽粮 ${r.n}`; }
  return r;
}
// 点一下喂一口；按住 0.45 秒后每 0.2 秒连喂，升级或喂不进去就停
function bindFeedButton(b, i) {
  b.onclick = e => { e.preventDefault(); if (petHold && petHold.fired) { petHold = null; return; } petHold = null; if (doFeed(i)) showPets(undefined, true); };
  b.onpointerdown = () => {
    stopPetHold();
    petHold = { fired: false, t: setTimeout(function rep() {
      if (!petHold) return;
      petHold.fired = true;
      if (L.petFeedWhy(st, i)) { stopPetHold(true); return; }
      const r = doFeed(i);
      showPets(undefined, true);
      if (petHold && r && !r.ups) petHold.t = setTimeout(rep, 200); else stopPetHold(true);
    }, 450) };
  };
}
function stopPetHold(keep) { if (petHold && petHold.t) clearTimeout(petHold.t); if (petHold) petHold.t = 0; if (!keep && petHold && !petHold.fired) petHold = null; }
document.addEventListener('pointerup', () => stopPetHold(true));
document.addEventListener('pointercancel', () => stopPetHold(true));

// ---------- 派岗：五个岗位图标（+ 出战），每个写着干了能涨多少；第一项是老祖推荐的 ----------
function showPetJobs(i) {
  const p = st.pets[i]; if (!p) return showPets();
  const rec = L.petBestJob(st, p, true);
  const row = (k, J) => {
    const why = k === 'out' ? '' : L.petJobWhy(st, i, k), cur = k === 'out' ? i === st.petOut : p.job === k;
    const holder = k === 'out' ? L.petOut(st) : L.petJobHolder(st, k), other = holder && holder !== p ? holder : null;
    const match = k !== 'out' && L.petJobMatch(p, k);
    const swap = other ? `<span class="muted fxs">换下【${esc(L.petName(other))}】</span>` : '';
    return `<button class="pjob${cur ? ' cur' : ''}" data-job="${k}" ${why || cur ? 'disabled' : ''}>${icon16(k === 'out' ? 'job_out' : J.icon, 2)}<span class="grow"><span class="line"><b>${k === 'out' ? '出战' : J.n}</b>${k === rec ? '<span class="chip ok">荐</span>' : ''}${match ? '<span class="chip ok">对口 ×1.5</span>' : ''}${cur ? '<span class="chip warn">当前</span>' : ''}</span>
      <span class="fxs">${why ? `<span class="seal">${esc(why)}</span>` : cur ? (k === 'out' ? `战力倍率 ×${mult2(L.petAtkOf(st, p))}` : esc(J.d(L.petJobVal(st, k)))) : jobEffect(i, k)}</span>${swap}</span><span class="pn-chkbox${cur ? ' on' : ''}" aria-hidden="true"></span></button>`;
  };
  const order = L.PET_JOBS.slice().sort((a, b) => (b.k === rec) - (a.k === rec));
  const body = `<div class="row">${petCardImg(p.sp, p.form, p.aw, 1.5)}<div class="grow"><b>${esc(L.petName(p))}</b> <span class="muted">Lv${p.lv} · ${L.PET_TY[L.PET_SP[p.sp].ty]}型</span></div></div>
    <div class="pjobs">${row('out', null)}${order.map(J => row(J.k, J)).join('')}</div>
    ${p.job ? '<button class="btn alt" id="petIdle">收回来<small> · 闲着会掉好感</small></button>' : ''}
    <details class="more"><summary>岗位规则</summary><div class="muted">每级岗位效果 +4%、每心 +2%。类型对口 ×1.5：护阵（护）、觅食·守田（寻）、看炉（灵）、巡山（战）。一个岗位只站一只。</div></details>`;
  const s = sheet({ title: '派岗 · ' + esc(L.petName(p)), body, foot: [{ t: '回兽栏', alt: true, fn: () => showPets() }] });
  s.querySelectorAll('[data-job]').forEach(b => b.onclick = () => {
    const k = b.dataset.job, txt = jobEffect(i, k);
    const ok = k === 'out' ? L.petSetOut(st, i) : L.petSetJob(st, i, k);
    if (!ok) return;
    SFX.coin(); petMsg = `【${esc(L.petName(p))}】${k === 'out' ? '出战' : '去' + L.PET_JOB[k].n}：${txt}`;
    showPets(p.u);
  });
  const ib = s.querySelector('#petIdle'); if (ib) ib.onclick = () => { L.petSetJob(st, i, ''); SFX.tap(); showPets(p.u); };
}
// ---------- 进化（5 级二选一）与觉醒（10 级）：卡片上方一块小画布放 ART.drawEvo ----------
let evoAnim = null;
function evoCanvas(p, k) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 44; c.className = 'px pevo';
  const z = pxs(1, 2); c.style.width = 64 * z + 'px'; c.style.height = 44 * z + 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const t0 = performance.now();
  const step = now => {
    if (!c.isConnected) return;
    const t = now - t0;
    g.clearRect(0, 0, 64, 44);
    ART.setCtx(g, 64);
    try {
      const kk = k ? Math.min(1, t / 1100) : undefined;
      if (!k || kk < 0.55) g.drawImage(ART.petSprite(p.sp, k ? k.from : p.form, (t / 500 | 0) % 2, k ? k.aw0 : p.aw), 16, 40 - 26);
      else g.drawImage(ART.petSprite(p.sp, k.to, (t / 500 | 0) % 2, k.aw1), 16, 40 - 26);
      ART.drawEvo(32, 40, t, kk);
    } finally { ART.setCtx(ctx, W); }
    if (k && t > 1100) { if (k.done) { const f = k.done; k.done = null; f(); } return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return c;
}
// 进化二选一：每支一张卡（图 / 名字 / 进化后的倍率 ▲ / 条件 / 天赋）；两支都能选时，倍率高的那支按钮是金的
function showPetEvo(i) {
  const p = st.pets[i]; if (!p) return showPets();
  if (L.petCanAwake(p)) return showPetAwake(i);
  const S = L.PET_SP[p.sp], pw = L.power(st), out = i === st.petOut;
  const info = [1, 2].map(b => {
    const needs = L.petBranchNeeds(st, p, b), ok = needs.every(x => x.ok);
    const [m0, m1] = petDelta(() => { st.pets[i].form = b; }, () => L.petAtkOf(st, st.pets[i]));
    return { b, needs, ok, m0, m1 };
  });
  const goldB = (info.filter(x => x.ok).sort((x, y) => y.m1 - x.m1)[0] || {}).b;
  const br = ({ b, needs, ok, m0, m1 }) => {
    const B = S[b === 1 ? 'a' : 'b'], known = L.petEvoKnown(st, p.sp, b);
    const [w0, w1] = out ? petDelta(() => { st.pets[i].form = b; }, () => L.power(st)) : [pw, pw];
    const show = known || ok;
    const tal = L.PET_TAL[B.tal];
    return `<div class="pbr${ok ? ' ok' : ''}">${known ? petCardImg(p.sp, b, 0, 2) : `<span class="psilbox">${petSprImg({ sp: p.sp, form: b }, 2).replace('class="px"', 'class="px psil"')}</span>`}<div class="nm">${known ? esc(L.petFormName(p.sp, b)) : '？？？'}</div>
      <div class="jadet pn-key">${out && fmt(w0) !== fmt(w1) ? `战力 → <b>${fmt(w1)}</b>` : `×${mult2(m0)} → <b>×${mult2(m1)}</b>`} ▲</div>
      <div class="fxs">${needs.map(x => `<span class="${x.ok ? 'jadet' : 'seal'}">${x.ok ? '✓' : '✗'} ${show ? esc(x.t) : '？'}${x.need !== undefined && show ? ` ${fmt(x.have)}/${fmt(x.need)}` : ''}</span>`).join('<br>')}</div>
      <div class="fxs muted">${known ? '天赋：' + esc(tal.d(tal.k === 'mul' ? 1 + (tal.v - 1) * (1 + 0.02 * p.heart) : tal.v * (1 + 0.02 * p.heart))) : '线索：' + esc(B.hint)}</div>
      <button class="btn sm ${b === goldB ? 'gold' : 'alt'}" data-evo="${b}" ${ok ? '' : 'disabled'}>${ok ? '选它' : '未满足'}</button></div>`;
  };
  const body = `<div class="center" id="evoBox"></div><p class="center">选一支进化：品阶 ${L.petTier(p)} → <b>${L.petTier(p) + 1}</b></p>
    <div class="pbrs">${info.map(br).join('')}</div><div class="muted center">“？”是没试过的分支，试出来记进图鉴</div>`;
  const s = sheet({ title: '进化 · ' + esc(L.petName(p)), body, foot: [{ t: '再等等', alt: true, fn: () => showPets(p.u) }] });
  s.querySelector('#evoBox').appendChild(evoCanvas(p));
  s.querySelectorAll('[data-evo]').forEach(b => b.onclick = () => {
    const r = L.petEvolve(st, i, +b.dataset.evo);
    if (!r) return;
    SFX.reveal(5); flash(0.5);
    const box = s.querySelector('#evoBox'); box.innerHTML = '';
    s.querySelectorAll('[data-evo]').forEach(x => { x.disabled = true; });
    box.appendChild(evoCanvas(p, { from: 0, to: r.b, aw0: 0, aw1: p.aw, done: () => evoResult(r) }));
  });
}
function evoResult(r) {
  const p = r.p;
  banner(r.aw ? '觉醒' : '进化', r.aw ? L.petName(p) : `${r.from} → ${r.to}`);
  const body = `<div class="center">${petCardImg(p.sp, p.form, p.aw, 3)}</div><div class="center big goldt">${esc(L.petName(p))}</div>${r.fresh ? '<p class="center jadet">新发现：记进图鉴</p>' : ''}
    <dl class="grid2 delta"><dt>品阶</dt><dd>${r.t0} → <b>${r.t1}</b></dd><dt>出战倍率</dt><dd>×${mult2(r.m0)} → <b>×${mult2(r.m1)}</b></dd>${fmt(r.pw0) !== fmt(r.pw1) ? `<dt>战力</dt><dd class="num">${fmt(r.pw0)} → <b>${fmt(r.pw1)}</b></dd>` : ''}<dt>天赋</dt><dd class="jadet">${r.tal0 ? esc(r.tal0) + ' → ' : ''}${esc(r.tal)}</dd></dl>`;
  sheet({ title: r.aw ? '觉醒' : '进化', center: true, body, foot: [{ t: '回兽栏', gold: true, fn: () => showPets(p.u) }] });
}
function showPetAwake(i) {
  const p = st.pets[i];
  const [m0, m1] = petDelta(() => { st.pets[i].aw = 1; }, () => L.petAtkOf(st, st.pets[i]));
  const [t0, t1] = petDelta(() => { st.pets[i].aw = 1; }, () => L.petTalText(st.pets[i]));
  const body = `<div class="center" id="evoBox"></div><p class="center">满 10 级：天赋升级、品阶 +1</p>
    <dl class="grid2 delta"><dt>品阶</dt><dd>${L.petTier(p)} → <b>${Math.min(6, L.petTier(p) + 1)}</b></dd><dt>出战倍率</dt><dd>×${mult2(m0)} → <b>×${mult2(m1)}</b></dd><dt>天赋</dt><dd class="jadet">${esc(t0)} → <b>${esc(t1)}</b></dd></dl>`;
  const s = sheet({ title: '觉醒 · ' + esc(L.petName(p)), body, foot: [{ t: '再等等', alt: true, fn: () => showPets(p.u) }, { t: '觉醒', gold: true, fn: () => {
    const r = L.petAwake(st, i); if (!r) return;
    SFX.reveal(6); flash(0.6);
    const box = document.querySelector('#modal #evoBox'); if (!box) return evoResult(r);
    box.innerHTML = ''; document.querySelectorAll('#modal .foot .btn').forEach(x => { x.disabled = true; });
    box.appendChild(evoCanvas(p, { from: p.form, to: p.form, aw0: 0, aw1: 1, done: () => evoResult(r) }));
  } }] });
  s.querySelector('#evoBox').appendChild(evoCanvas(p));
}

// ---------- 洞府场景里的灵宠：出战的坐在主角右手边，干活的在各自岗位上（ART.petSprite，面朝左，脚底 y = 26） ----------
const PET_POST = { array: { x: 54, y: 150 }, field: { x: 12, y: 104 }, furnace: { x: 142, y: 150 }, forage: { x: 172, y: 156 }, patrol: { x: 70, y: 158 } };
const petScenePos = [];
function petPosOf(i, p) {
  if (i === st.petOut) return { x: HOMEPOS.x + D().sit.w / 2 - 2, y: HOMEPOS.y + 1, flip: false };
  const P = PET_POST[p.job]; if (!P) return { x: 120 + i * 14, y: 158, flip: false };
  if (p.job === 'patrol') { const ph = (T / 9000) % 2, k = ph < 1 ? ph : 2 - ph; return { x: Math.round(48 + k * 80), y: P.y, flip: ph < 1 }; }
  if (p.job === 'forage') { const ph = (T / 7000) % 3; if (ph > 2.2) return null; return { x: Math.round(P.x - Math.min(1, ph) * 8), y: P.y, flip: false }; }
  return { x: P.x, y: P.y, flip: false };
}
function drawPets() {
  petScenePos.length = 0;
  if (!st.pets || !st.pets.length) return;
  st.pets.forEach((p, i) => {
    const pos = petPosOf(i, p); if (!pos) return;
    const frame = (T / 700 + i) % 2 < 1 ? 0 : 1, spr = ART.petSprite(p.sp, p.form || 0, frame, p.aw);
    const hop = i === st.petOut && Math.abs(Math.sin(T / 700)) > 0.95 ? -1 : 0, x = Math.round(pos.x), y = Math.round(pos.y - 26 + hop);
    if (pos.flip) { ctx.save(); ctx.translate(x + 32, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); } else ctx.drawImage(spr, x, y);
    if (L.petGlow(st, p)) ART.drawEvo(x + 16, pos.y, T);
    petScenePos.push({ u: p.u, x, y, w: 32, h: 28 });
  });
}
// 点场景里的灵宠：打开兽栏并选中它
function petSceneHit(x, y) {
  for (const q of petScenePos) if (x >= q.x + 4 && x <= q.x + q.w - 4 && y >= q.y + 6 && y <= q.y + q.h) { SFX.tap(); showPets(q.u); return true; }
  return false;
}
