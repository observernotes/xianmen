/* 废柴仙途 · 界面片段 panel-exp：历练：地点、确认页、结算卡、首领
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 历练 ----------
function chipFor(p) { return `<span class="chip ${p >= 0.75 ? 'ok' : p >= 0.4 ? 'warn' : 'bad'}">${L.pct(p)}</span>`; }
function showExp() {
  const p = st.p;
  if (st.exp) {
    const e = st.exp, rg = L.REGIONS[e.k];
    sheet({ title: '历练中', body: `<div class="card flat"><div class="main"><div>【${rg.n}】</div><div class="muted">${rg.desc}</div>${bar((e.total - e.left) / e.total, true)}<div class="muted">还需 ${e.left} 周天归来</div></div></div><p class="muted">历练途中修炼减半，归来时结算收获。</p>` });
    return;
  }
  const rows = [];
  for (let k = L.REGIONS.length - 1; k >= 0; k--) {
    const rg = L.REGIONS[k];
    if (!L.unlocked(st, k)) { if (k === p.r + 3) rows.push(`<div class="card flat" style="opacity:.6"><div class="main"><div>${rg.n}</div><div class="muted">踏入${L.REALMS[Math.max(0, k - 2)].n}期后可前往</div></div><div class="right"><span class="chip">未解锁</span></div></div>`); continue; }
    const ch = L.expChance(st, k);
    if (L.bossReady(st, k)) { const B = L.BOSSES[k], bp = L.duelChance(L.power(st), L.bossPower(k)); rows.push(`<div class="card" data-boss="${k}" style="box-shadow:0 0 0 2px var(--seal)">${bossImg(k, 36)}<div class="main"><div class="seal">首领现身：${B.n}</div><div class="muted">“${B.line}” · 战力 ${fmt(L.bossPower(k))}</div><div class="muted">击败可得天材地宝、首领掉落【${B.drop}】与称号「${B.t}」</div></div><div class="right">${chipFor(bp)}</div></div>`); }
    const wins = st.regionWins[k] || 0;
    const prog = st.bosses[k] ? '<span class="chip ok">首领已斩</span>' : `<span class="chip">探索 ${Math.min(3, wins)}/3</span>`;
    rows.push(`<div class="card" data-k="${k}"><div class="main"><div class="line"><span>${rg.n}</span><span class="muted">${rg.mon} 周天</span>${prog}</div>
      <div class="muted">${rg.desc}</div><div class="muted num">推荐战力 ${fmt(L.DREC[k])} · 灵石约 ${fmt(L.DREW[k])}</div></div>
      <div class="right">${chipFor(ch.p)}${ch.ratio < 0.6 ? '<span class="seal">越级</span>' : ''}</div></div>`);
  }
  const s = sheet({ title: '外出历练', sub: `你的战力 ${fmt(L.power(st))} · 越级挑战成功奖励翻倍，失败负伤三周天`, body: rows.join('') });
  s.querySelectorAll('.card[data-k]').forEach(c => c.onclick = () => { SFX.tap(); confirmExp(+c.dataset.k); });
  s.querySelectorAll('.card[data-boss]').forEach(c => c.onclick = () => { SFX.tap(); fightBossUI(+c.dataset.boss); });
}
function fightBossUI(k) {
  const res = L.fightBoss(st, k);
  if (!res) return;
  const B = res.B;
  const it = res.item;
  duel({
    title: '首领 · ' + B.n, intro: `【${L.REGIONS[k].n}】深处，${B.n}挡住了去路。`,
    right: { img: bossImg(k, 66), name: B.n, sub: fmt(res.Q) }, Q: res.Q, S: res.S, win: res.win,
    quote: `${B.n}：“${B.line}”`,
    winText: res.win ? `斩杀${esc(B.n)}！获得称号「${esc(B.t)}」<div class="fxlist"><span>天材地宝 +${res.treasure}</span><span>灵石 +${fmt(res.stones)}</span><span>灵草 +${fmt(res.herbs)}</span><span>${it.equip ? '获得' : '已有更好法宝，换得灵石'}【${esc(it.name)}】</span></div>` : '',
    loseText: '首领太强，重伤而归（负伤 4 周天）。变强之后再来！',
    done: closeModal,
  });
}
function confirmExp(k) {
  const rg = L.REGIONS[k], ch = L.expChance(st, k);
  const yrs = rg.mon * L.REALMS[st.p.r].mpt;
  sheet({
    title: rg.n, center: true,
    body: `<p class="muted">${rg.desc}</p>
      <div class="center"><div class="muted">战力 ${fmt(ch.T)} / 推荐 ${fmt(L.DREC[k])}</div><div class="big ${ch.p >= 0.75 ? 'jadet' : ch.p >= 0.4 ? 'goldt' : 'seal'}" style="font-size:calc(var(--fs)*3)">${L.pct(ch.p)}</div>${ch.ratio < 0.6 ? '<div class="seal">越级挑战！成功则灵石翻倍</div>' : '<div class="muted">成功率</div>'}</div>
      <dl class="grid2"><dt>耗时</dt><dd>${rg.mon} 周天（约 ${yrs < 1 ? Math.round(yrs * 12) + ' 个月' : fmt(yrs) + ' 年'}）</dd><dt>可能收获</dt><dd>灵石、修为、破境丹、法宝、功法，运气好还能收服灵宠${st.sect ? '；并为宗门挣得贡献' : ''}</dd></dl>`,
    foot: [{ t: '返回', alt: true, fn: showExp }, { t: '御剑出发', gold: true, fn: () => { L.startExp(st, k); SFX.coin(); closeModal(); } }],
  });
}
function itemLine(it) {
  if (it.kind === 'pet') {
    const T0 = L.PETS[it.tier];
    return it.equip ? `<div class="quote">${petImg(it.tier, 26)} 收服${T0.n}【${esc(it.name)}】！战力 ×${T0.m}</div>` : `<div class="quote">遇到一只${esc(it.name)}，不如你的灵宠，放它归山，换得灵石 ${fmt(it.value)}</div>`;
  }
  const tierName = it.kind === 'w' ? L.WEAPONS[it.tier].n : L.ARTS[it.tier].n;
  const nm = it.kind === 'w' ? `${tierName}【${esc(it.name)}】` : `${tierName}功法《${esc(it.name)}》`;
  if (!it.equip) return `<div class="quote">得到${nm}，不如身上的，卖得灵石 ${fmt(it.value)}</div>`;
  return `<div class="quote">获得${nm}！${it.kind === 'w' ? `战力 ×${L.WEAPONS[it.tier].m}` : `修炼速度 ×${L.ARTS[it.tier].m}`}</div>`;
}
function deltaHTML(res) {
  const d = [];
  const arrow = (a, b) => (b > a ? '<span class="jadet">▲</span>' : '<span class="seal">▼</span>');
  if (res.pw1 !== undefined && fmt(res.pw1) !== fmt(res.pw0)) d.push(`<dt>战力</dt><dd class="num">${fmt(res.pw0)} → <b>${fmt(res.pw1)}</b> ${arrow(res.pw0, res.pw1)}</dd>`);
  if (res.gain1 !== undefined && dec(res.gain1) !== dec(res.gain0)) d.push(`<dt>修炼/周天</dt><dd class="num">+${dec(res.gain0)} → <b>+${dec(res.gain1)}</b> ${arrow(res.gain0, res.gain1)}</dd>`);
  if (!st.pact && res.pw1 !== undefined) {
    const a = L.pactAssist(st), p0 = L.duelChance(res.pw0 * a, L.PACT_POWER), p1 = L.duelChance(res.pw1 * a, L.PACT_POWER);
    if (L.pct(p0) !== L.pct(p1)) d.push(`<dt>约战胜算</dt><dd class="num">${L.pct(p0)} → <b>${L.pct(p1)}</b> ${arrow(p0, p1)}</dd>`);
  }
  return d.length ? `<dl class="grid2 delta">${d.join('')}</dl>` : '';
}
function showExpResult(res) {
  lastExp = res;
  const rg = L.REGIONS[res.k];
  const lines = [`<div class="center">${myAvImg(52)}</div>`];
  if (res.ok) {
    lines.push(`<div class="center big ${res.leap ? 'seal' : 'goldt'}">${res.leap ? '越级挑战成功！' : '满载而归'}</div>`);
    lines.push(`<dl class="grid2"><dt>灵石</dt><dd class="num">+${fmt(res.stones)}${res.leap ? '（翻倍）' : ''}</dd><dt>修为</dt><dd class="num">+${fmt(res.xp)}</dd>${res.pills ? `<dt>破境丹</dt><dd>+${res.pills}</dd>` : ''}${res.herbs ? `<dt>灵草</dt><dd class="num">+${fmt(res.herbs)}</dd>` : ''}${res.treasure ? `<dt>天材地宝</dt><dd class="seal">+${res.treasure}</dd>` : ''}${res.contrib ? `<dt>宗门贡献</dt><dd class="num">+${fmt(res.contrib)}</dd>` : ''}</dl>`);
    for (const it of res.items) lines.push(itemLine(it));
    if (res.fortune) lines.push(`<div class="quote seal">奇遇！${esc(res.fortune)}</div>`);
    if (res.first) lines.push('<div class="quote">戒中老祖：“第一趟，老夫暗中替你挡了两爪子。以后可得靠你自己了。”</div>');
    lines.push(deltaHTML(res));
    SFX.coin();
  } else {
    lines.push('<div class="center big seal">铩羽而归</div>');
    lines.push(`<p class="center">敌人太强，负伤三周天（修炼减半、战力 ×0.6）。带回灵石 ${fmt(res.stones)}。</p><p class="center muted">提升战力后再来，或选更稳妥的地方。</p>`);
    SFX.fail();
  }
  const again = L.unlocked(st, res.k) && !L.isReady(st);
  sheet({ title: `历练归来 · ${rg.n}`, center: true, body: lines.join(''), foot: [{ t: '回洞府', alt: !!again, gold: !again, fn: closeModal }].concat(again ? [{ t: '再去一次', gold: true, fn: () => { L.startExp(st, res.k); closeModal(); } }] : []) });
}
