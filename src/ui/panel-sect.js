/* 废柴仙途 · 界面片段 panel-sect：宗门：身份、九宗、会武、晋升、三宗争徒、来犯
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 宗门 ----------
function showSect() {
  const p = st.p;
  if (!st.sect) {
    sheet({ title: '宗门', body: `<p>你如今是一介散修。当年被天剑宗逐出山门，天下宗门都瞧不上一个杂灵根。</p>
      <div class="quote">戒中老祖：“急什么。等你筑基，那些宗门自会八抬大轿来请你。”</div>
      <p class="muted">${p.r >= 1 ? `下一次宗门招揽：约 ${Math.max(0, (st.flags.inviteAt || 0) - st.tick)} 周天后` : '突破至筑基期后，三大宗门会前来招揽。'}</p>` });
    return;
  }
  const sc = L.sectOf(st), sr = st.sect.rank, nx = L.SRANKS[sr + 1];
  let promo;
  if (nx) {
    const okR = p.r >= nx.r, okC = st.sect.total >= nx.c;
    promo = `<div class="card flat"><div class="main"><div>晋升 ${L.srankName(st, sr + 1)}</div>
      <div class="${okR ? 'jadet' : 'muted'}">${okR ? '✓' : '·'} 境界达到${L.REALMS[nx.r].n}期</div>
      <div class="${okC ? 'jadet' : 'muted'}">${okC ? '✓' : '·'} 累计贡献 ${fmt(st.sect.total)} / ${fmt(nx.c)}</div>${bar(st.sect.total / nx.c, okC)}
      ${nx.duel ? `<div class="seal">需当众击败原${L.srankName(st, sr + 1)}</div>` : ''}</div>
      <div class="right"><button class="btn sm ${L.canPromote(st) ? 'gold' : 'alt'}" id="btnPromo" ${L.canPromote(st) ? '' : 'disabled'}>晋升</button></div></div>`;
  } else promo = '<div class="quote">你已是一宗之主，号令一方。</div>';
  const vault = L.VAULT.map(v => {
    const c = L.vaultCost(st, v.k), tier = L.vaultTier(st, v.k);
    const desc = v.k === 'vart' ? `${L.ARTS[tier].n}功法 · 修炼×${L.ARTS[tier].m}` : v.k === 'vwep' ? `${L.WEAPONS[tier].n} · 战力×${L.WEAPONS[tier].m}` : v.d;
    const owned = (v.k === 'vart' && p.a >= tier) || (v.k === 'vwep' && p.w >= tier);
    const dis = owned || st.sect.pts < c;
    return `<div class="card flat"><div class="main"><div>${v.n}</div><div class="muted">${desc}${owned ? '（已有更好的）' : ''}</div></div><div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-v="${v.k}" ${dis ? 'disabled' : ''}>贡献 ${fmt(c)}</button></div></div>`;
  }).join('');
  const ranks = L.SRANKS.map((r0, i) => `<span class="chip ${i === sr ? 'ok' : ''}" style="${i > sr ? 'opacity:.5' : ''}">${L.srankName(st, i)}</span>`).join(' ');
  const s = sheet({
    title: sc.n, sub: `${sc.d} · 宗门加成：${sc.perk}`,
    body: `<div style="display:flex;flex-wrap:wrap;gap:4px">${ranks}</div>
      <dl class="grid2"><dt>身份</dt><dd>${L.srankName(st, sr)}</dd><dt>俸禄</dt><dd class="num">每周天 ${fmt(L.pay(st))} 灵石${sc.pill ? '，每 6 周天一枚破境丹' : ''}</dd><dt>可用贡献</dt><dd class="num">${fmt(st.sect.pts)}</dd></dl>
      ${promo}<div class="sep"></div>${nineHTML()}<div class="sep"></div><div class="muted">宗门宝库（用贡献兑换）</div>${vault}
      <div class="muted">历练成功、天骄论道获胜都能为宗门挣得贡献。${st.flags.warWon ? '你曾一人一剑击退天剑宗，威震四方。' : ''}</div>`,
  });
  const pb = s.querySelector('#btnPromo');
  if (pb) pb.onclick = () => { SFX.tap(); doPromote(); };
  s.querySelectorAll('button[data-v]').forEach(btn => btn.onclick = () => { const r = L.vaultBuy(st, btn.dataset.v); if (!r) return; SFX.coin(); if (r.it) revealItem(r.it, showSect); else { floatText(100, 80, '破境丹 +2', '#ffe39a'); showSect(); } });
}
function nineHTML() {
  const pos = L.sectPos(st);
  const next = 24 - ((st.tick - 6) % 24 + 24) % 24 || 24;
  const rows = st.sect.order.map((id, i) => {
    const N = L.NINE.find(x => x.id === id), me = id === st.sect.id;
    return `<div class="${me ? 'me' : ''}"><b>第${i + 1}</b><span>${N.n}${me ? '（本宗）' : ` · ${N.champ}`}</span><span class="num">${me ? fmt(L.power(st)) : fmt(L.ninePower(st, i + 1))}</span></div>`;
  }).join('');
  return `<div class="muted">天下九宗（九宗会武每 24 周天一届，你代表本宗出战）</div>
    <dl class="grid2"><dt>宗门排名</dt><dd>天下第 ${pos} 宗 · 最高第 ${st.sect.best}</dd><dt>灵脉</dt><dd>${st.sect.veins || 0} 条（俸禄 +${(st.sect.veins || 0) * 25}%）</dd><dt>下届会武</dt><dd>约 ${next} 周天后</dd></dl>
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
        body: `<p class="center">天下九宗齐聚问剑台，以武论高下，排定宗门座次！</p><div class="center">${myAvImg(52)}</div><p class="center">你代表 <b>${sc.n}</b> 出战 · 当前天下第 ${res.start} 宗</p>`,
        foot: [{ t: '为宗门而战！', gold: true, fn: next }] });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const look = NINE_LOOK[rd.foe.id];
    const tj = rd.foe.id === 'tianjian';
    duel({
      title: `会武 · 对阵${rd.foe.n}`,
      right: { img: rivalAvImg(look ? { n: rd.foe.champ, id: look } : { n: rd.foe.champ }, 66), name: rd.foe.champ, sub: `${rd.foe.n} · 天下第${rd.q}宗 · ${fmt(rd.Q)}` }, Q: rd.Q, S: res.S, win: rd.win,
      quote: `${rd.foe.champ}：“${rd.foe.line}”`,
      winText: `${rd.defend ? '卫冕天下第一宗' : `${esc(sc.n)}升至天下第 ${rd.q} 宗`} · 贡献 +${fmt(rd.contrib || 0)} · 灵石 +${fmt(rd.stones || 0)}${tj && st.flags.beatTianjian === 1 ? '<div class="quote">天剑宗众长老面如土色——当年被一脚踢下山的弃徒，如今代表' + esc(sc.n) + '把天剑宗踩在了脚下！</div>' : ''}`,
      loseText: '对方底蕴深厚，下届会武再来！',
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
      <p class="center">${sc.n}钟声九响，全宗弟子齐聚广场。从今日起，你便是${sc.n}${title}！</p><p class="center muted">俸禄提升至每周天 ${fmt(L.pay(st))} 灵石，宗门宝库开放更高品阶。</p>`,
      foot: [{ t: '谢宗门栽培', gold: true, fn: closeModal }] });
  };
  if (res.duel) {
    const heir = { n: st.p.look.f ? '原圣女·苏清寒' : '原圣子·萧凌风' };
    duel({
      title: `${title}之争`, intro: `你要晋升${title}的消息传出，原${title}当众拦下：“想坐我的位置？先过我这一关！”`,
      right: { img: rivalAvImg(heir, 66), name: heir.n, sub: fmt(res.duel.Q) }, Q: res.duel.Q, win: res.duel.win,
      quote: `${heir.n}：“一个半路入门的散修，也配当${title}？”`,
      winText: `${esc(heir.n)}面如死灰，长剑落地。全场鸦雀无声，随后掌声雷动！`, loseText: '你惜败一招。来日修为更进一步，再来挑战！',
      done: () => { if (res.ok) celebrate(); else closeModal(); },
    });
  } else celebrate();
}
function showInvite() {
  const s = sheet({
    title: '三宗争徒', center: true, noClose: true,
    body: `<p>筑基消息传出，天下震动！三大宗门的长老同时登门，争相招揽：</p>
      <div class="cands">${L.SECTS.map((sc, i) => `<div class="cand" data-i="${i}" style="padding:10px 6px"><div class="beam" style="background:${sc.color}"></div><div class="nm" style="color:${sc.color}">${sc.n}</div><div class="tr">${sc.perk}</div></div>`).join('')}</div>
      <div id="inv" class="muted center">点选一个宗门</div>
      <div class="quote">戒中老祖：“当年天剑宗把你踢下山，如今人家抢着要你。痛快不痛快？”</div>`,
    foot: [{ t: '暂不入宗', alt: true, fn: () => { L.log(st, '婉拒了三大宗门的招揽，继续做逍遥散修'); closeModal(); } }, { t: '拜入此宗', gold: true, disabled: true, fn: () => {} }],
  });
  const ok = s.querySelector('[data-fi="1"]');
  s.querySelectorAll('.cand').forEach(c => c.onclick = () => {
    const sc = L.SECTS[+c.dataset.i]; SFX.tap();
    s.querySelectorAll('.cand').forEach(x => x.classList.toggle('sel', x === c));
    s.querySelector('#inv').textContent = `${sc.n}：${sc.d}。加成：${sc.perk}`;
    ok.disabled = false;
    ok.onclick = () => { SFX.win(); L.joinSect(st, sc.id); closeModal(); banner('拜入' + sc.n, '外门弟子'); };
  });
}
function runWar() {
  const res = L.sectWar(st);
  const sc = L.sectOf(st);
  duel({
    title: '天剑宗来犯', intro: `天剑宗长老率众杀上${sc.n}山门，扬言要讨回当年那个弃徒！`,
    right: { img: rivalAvImg({ n: '天剑宗长老团', id: 'zhao' }, 66), name: '天剑宗长老团', sub: fmt(res.Q) }, Q: res.Q, win: res.win,
    quote: '天剑宗长老：“交出那个弃徒，饶你们满门不死！”',
    winText: `你一人一剑立于山门之前，剑光过处，天剑宗众人倒飞而出！<br>宗门贡献 +${fmt(res.contrib || 0)}，灵石 +${fmt(res.stones || 0)}`,
    loseText: '宗门众长老联手苦战，方才逼退来敌。天剑宗扬言还会再来……',
    done: closeModal,
  });
}
