/* 废柴仙途 · 界面片段 panel-me：人物
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 人物 ----------
function ladderHTML() {
  const rows = [];
  const add = q => { const rv = L.rivalAt(st, q); rows.push(`<div class="${q === st.rank ? 'me' : ''}"><b>第${q}</b><span>${esc(rv ? rv.n : st.p.name)}${rv && rv.id ? ' <span class="seal">宿敌</span>' : ''}</span><span class="num">${fmt(q === st.rank ? L.power(st) : L.rivalPower(st, q))}</span></div>`); };
  const qs = new Set([1, 2, 3]);
  for (let q = st.rank - 2; q <= st.rank + 2; q++) if (q >= 1 && q <= 100) qs.add(q);
  let prev = 0;
  for (const q of [...qs].sort((a, b) => a - b)) { if (q - prev > 1) rows.push('<div class="muted"><b>…</b></div>'); add(q); prev = q; }
  return `<div class="ladder">${rows.join('')}</div>`;
}
function showMe(tab) {
  tab = tab || 'attr';
  const p = st.p;
  const tabs = [['attr', '属性'], ['bond', '羁绊'], ['ach', '成就'], ['rank', '天骄榜']].map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('');
  let body = '';
  if (tab === 'attr') {
    const trs = p.tr.map(k => `${L.TRAITS[k].n}<span class="muted">（${L.TRAITS[k].d}）</span>`).join('<br>') || '无';
    const buffs = (st.buffs || []).map(b => b.cul ? `修炼×${b.cul}（${b.left}周天）` : `战力×${b.atk}（${b.left}周天）`).join('、');
    body = `<div class="row">${myAvImg(78)}
      <div class="grow"><div class="big">${esc(p.name)}</div>${st.title ? `<div class="seal">「${esc(st.title)}」</div>` : ''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${talentTag(p.t)}${st.sect ? `<span class="chip">${L.sectOf(st).n}·${L.srankName(st, st.sect.rank)}</span>` : '<span class="chip">散修</span>'}${st.daolv ? `<span class="chip ok">道侣 ${esc(L.npcName(st, st.daolv))}</span>` : ''}</div>
      <div style="margin-top:4px">${L.stageName(p)}${st.rebirth ? ` · 第 ${st.rebirth + 1} 世` : ''}</div></div></div>
    <button class="btn gold" id="btnGrow" style="width:100%">查看每项数值怎么来、怎么提升 ▸</button>
    <dl class="grid2">
      <dt>修为</dt><dd class="num">${fmt(p.xp)} / ${fmt(L.pNeed(p))}</dd>
      <dt>修炼速度</dt><dd class="num">+${fmt(L.gain(st))} / 周天</dd>
      <dt>战力</dt><dd class="num">${fmt(L.power(st))}</dd>
      <dt>寿元</dt><dd class="num ${L.desperate(st) ? 'seal' : ''}">${Math.floor(p.age)} / ${p.r >= 9 ? '∞' : fmt(L.lifespan(st))} 岁</dd>
      <dt>天赋</dt><dd>${trs}</dd>
      <dt>法宝</dt><dd>${p.w ? `${esc(p.wn)}<span class="muted">（${L.WEAPONS[p.w].n} 战力×${L.WEAPONS[p.w].m}）</span>` : '<span class="muted">赤手空拳</span>'}</dd>
      <dt>功法</dt><dd>${p.a ? `《${esc(p.an)}》<span class="muted">（${L.ARTS[p.a].n} 修炼×${L.ARTS[p.a].m}）</span>` : '<span class="muted">基础吐纳</span>'}</dd>
      <dt>灵宠</dt><dd>${p.pet ? `${petImg(p.pet.tier, 26)} ${esc(p.pet.name)}<span class="muted">（${L.PETS[p.pet.tier].n} 战力×${L.PETS[p.pet.tier].m}）</span>` : '<span class="muted">尚无</span>'}</dd>
      <dt>库存</dt><dd>灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure} · 破境丹 ${st.pills}</dd>
      ${buffs ? `<dt>增益</dt><dd class="jadet">${buffs}</dd>` : ''}
      ${st.bonus.cul || st.bonus.atk ? `<dt>机缘加成</dt><dd>修炼 +${Math.round(st.bonus.cul * 100)}% · 战力 +${Math.round(st.bonus.atk * 100)}%</dd>` : ''}
    </dl>
    ${st.lives.length ? `<div class="sep"></div><div class="muted">前世</div>${st.lives.map((l, i) => `<div>第 ${i + 1} 世 · ${esc(l.name)} · ${l.ascended ? '白日飞升' : L.REALMS[Math.min(l.r, 8)].n + '期坐化'} · ${l.age} 岁</div>`).join('')}` : ''}
    <div class="sep"></div><dl class="grid2"><dt>存档</dt><dd>本机自动保存 · 云存档：${esc(cloudStatus)}</dd></dl>
    <div class="row"><button class="btn sm alt" id="btnReset">重新开始</button></div>
    <div class="muted">字体：Fusion Pixel（TakWolf，SIL OFL 1.1）</div>`;
  } else if (tab === 'bond') {
    body = Object.keys(L.NPCS).map(id => {
      const N = L.NPCS[id];
      if (!L.met(st, id)) return `<div class="card flat" style="opacity:.55"><div class="av" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--muted)">？</div><div class="main"><div>？？？</div><div class="muted">${N.title} · 尚未相识</div></div></div>`;
      const a = L.aff(st, id);
      const tag = st.daolv === id ? '<span class="chip ok">道侣</span>' : a >= 60 ? '<span class="chip ok">知己</span>' : a >= 30 ? '<span class="chip">熟识</span>' : '<span class="chip">初识</span>';
      return `<div class="card flat">${npcAvImg(id, 44)}<div class="main"><div class="line"><span>${esc(L.npcName(st, id))}</span>${tag}</div><div class="muted">${N.title}</div>${bar(a / 100, a >= 60)}<div class="${a >= 60 ? 'jadet' : 'muted'}">知己加成：${N.bonus}${N.daolv ? ' · 可结为道侣（双修 修炼×1.25）' : ''}</div></div><div class="right num">${a}</div></div>`;
    }).join('') + '<div class="muted">好感来自奇遇中的选择。好感 60 结为知己获得永久加成；医修与魔门圣女二人中可择一结为道侣。</div>';
  } else if (tab === 'ach') {
    const got = L.ACHS.filter(a => st.ach[a.id]).length;
    body = `<div class="muted">已达成 ${got} / ${L.ACHS.length} · 点已获得的称号可佩戴</div>` + L.ACHS.map(a => `<div class="ach ${st.ach[a.id] ? '' : 'off'}" data-title="${st.ach[a.id] ? esc(a.t) : ''}"><b>${a.n}<br><span class="muted">${a.d}</span></b><span class="${st.title === a.t ? 'chip ok' : 'chip'}">「${a.t}」</span></div>`).join('')
      + (st.titles.filter(t => !L.ACHS.some(a => a.t === t)).length ? `<div class="sep"></div><div class="muted">其他称号</div>` + st.titles.filter(t => !L.ACHS.some(a => a.t === t)).map(t => `<div class="ach" data-title="${esc(t)}"><b>${esc(t)}</b><span class="${st.title === t ? 'chip ok' : 'chip'}">${st.title === t ? '佩戴中' : '佩戴'}</span></div>`).join('') : '');
  } else {
    const rivals = L.RIVALS.map(rv => { const name = rv.id === 'mu' ? st.exName : rv.name; return `<div class="row"><span class="grow">${esc(name)} <span class="muted">${rv.title}</span></span>${st.beaten[rv.id] ? '<span class="chip ok">已击败</span>' : `<span class="chip">第${L.rivalRank(st, rv.id) || '?'}名</span>`}</div>`; }).join('');
    const bosses = L.BOSSES.map((B, k) => `<span class="chip ${st.bosses[k] ? 'ok' : ''}" style="${st.bosses[k] ? '' : 'opacity:.5'}">${B.n}</span>`).join(' ');
    body = `<div class="muted">宿敌</div>${rivals}<div class="sep"></div><div class="muted">天骄榜（每 12 周天举行一届论道）</div>${ladderHTML()}<div class="sep"></div><div class="muted">地图首领</div><div style="display:flex;flex-wrap:wrap;gap:4px">${bosses}</div>`;
  }
  const s = sheet({ title: '人物', body: `<div class="tabs">${tabs}</div>` + body });
  s.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { SFX.tap(); showMe(b.dataset.t); });
  s.querySelectorAll('.ach[data-title]').forEach(el => { if (el.dataset.title) el.onclick = () => { st.title = el.dataset.title; SFX.tap(); showMe('ach'); }; });
  const gb = s.querySelector('#btnGrow'); if (gb) gb.onclick = () => { SFX.tap(); showGrowth('all'); };
  const rb = s.querySelector('#btnReset');
  if (rb) rb.onclick = () => sheet({
    title: '重新开始', center: true, body: '<p>放弃当前进度，从头开始？这会清除本机与云端存档。</p>',
    foot: [{ t: '取消', alt: true, fn: () => showMe() }, { t: '确定重来', fn: () => { closeModal(); resetGame(); } }],
  });
}
function resetGame() {
  st = null; clearLocal();
  if (cloud.ref) cloud.ref.delete().catch(() => {});
  queue.length = 0; parts.length = 0; cine = null; adv = null;
  showIntro();
}
