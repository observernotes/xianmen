/* 废柴仙途 · 界面片段 panel-me：人物
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 人物 ----------
function ladderHTML() {
  const rows = [];
  const add = q => { const rv = L.rivalAt(st, q); rows.push(`<div class="${q === st.rank ? 'me' : ''}"><b>第${q}</b><span>${esc(rv ? rv.n : st.p.name)}${rv && rv.id ? ' <span class="seal">宿敌</span>' : ''}${rv && rv.rk ? ' <span class="goldt">新秀</span>' : ''}</span><span class="num">${fmt(q === st.rank ? L.power(st) : L.rivalPower(st, q))}</span></div>`); };
  const qs = new Set([1, 2, 3]);
  const rq = L.rookie && L.rookie(st) ? L.rookieRank(st) : 0; if (rq) qs.add(rq);   // 正在追你的新秀也列出来
  for (let q = st.rank - 2; q <= st.rank + 2; q++) if (q >= 1 && q <= 100) qs.add(q);
  let prev = 0;
  for (const q of [...qs].sort((a, b) => a - b)) { if (q - prev > 1) rows.push('<div class="muted"><b>…</b></div>'); add(q); prev = q; }
  return `<div class="ladder">${rows.join('')}</div>`;
}
// 人物页的分页条（功法页在 panel-arts.js、法宝页在 panel-gear.js，共用这一条）
// 没开的分页直接不出现（docs/ONBOARDING.md）：属性一直有；功法、法宝、道心、羁绊、图鉴、天骄榜各等自己的系统开了；成就等拿到第一个
const ME_TAB_KEY = { art: 'arts', gear: 'gearCmp', dao: 'dao', bond: 'bond', codex: 'codex', rank: 'tour' };
const meTabOpen = k => (k === 'ach' ? L.ONB_ON === false || !!st.rebirth || Object.keys(st.ach || {}).length > 0 : !ME_TAB_KEY[k] || UI.isOpen(ME_TAB_KEY[k]));
function meTabs(tab) { const list = [['attr', '属性'], ['art', '功法'], ['gear', '法宝'], ['dao', '道心'], ['bond', '羁绊'], ['ach', '成就'], ['codex', '图鉴'], ['rank', '天骄榜']].filter(([k]) => k === tab || meTabOpen(k)); return list.length < 2 ? '' : '<div class="tabs">' + list.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('') + '</div>'; }
function bindMeTabs(s) { s.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { SFX.tap(); showMe(b.dataset.t); }); }
function showMe(tab) {
  tab = tab || 'attr';
  if (tab === 'art') { showArts(); return; }
  if (tab === 'gear') { showGear(); return; }
  if (tab === 'dao') { showDao(); return; }   // 道心与因果（panel-trib.js）
  if (tab === 'codex') { showCodex(); return; }   // 图鉴（panel-codex.js）
  const p = st.p;
  let body = '';
  if (tab === 'attr') {
    const trs = p.tr.map(k => `${L.TRAITS[k].n}<span class="muted">（${L.TRAITS[k].d}）</span>`).join('<br>') || '无';
    const buffs = (st.buffs || []).map(b => b.cul ? `修炼×${b.cul}（${b.left}周天）` : `战力×${b.atk}（${b.left}周天）`).join('、');
    body = `<div class="row">${myAvImg(78)}
      <div class="grow"><div class="big">${esc(p.name)}</div>${st.title ? `<div class="seal">「${esc(st.title)}」</div>` : ''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${talentTag(p.t)}${st.sect ? `<span class="chip">${L.sectOf(st).n}·${L.srankName(st, st.sect.rank)}</span>` : '<span class="chip">散修</span>'}${st.daolv ? `<span class="chip ok">道侣 ${esc(L.npcName(st, st.daolv))}</span>` : ''}</div>
      <div style="margin-top:4px">${L.stageName(p)}${st.rebirth ? ` · 第 ${st.rebirth + 1} 世` : ''}</div></div></div>
    <dl class="grid2">
      <dt>修炼速度</dt><dd class="num">+${fmt(L.gain(st))} / 周天</dd>
      <dt>战力</dt><dd class="num">${fmt(L.power(st))}</dd>
      <dt>寿元</dt><dd class="num ${L.desperate(st) ? 'seal' : ''}">${Math.floor(p.age)} / ${p.r >= 9 ? '∞' : fmt(L.lifespan(st))} 岁</dd>
    </dl>
    <button class="btn gold" id="btnGrow" style="width:100%">每项数值怎么来、怎么提升 ▸</button>
    <details class="more"><summary>详情：天赋、法宝功法、库存</summary><dl class="grid2">
      <dt>修为</dt><dd class="num">${fmt(p.xp)} / ${fmt(L.pNeed(p))}</dd>
      <dt>天赋</dt><dd>${trs}</dd>
      ${UI.isOpen('gearCmp') ? `<dt>法宝</dt><dd>${L.GEAR_SLOTS.filter(s => L.gearOpen(st, s)).map(s => { const x = st.gear[s]; return x ? `${L.GEAR_N[s]}【${esc(L.gearBase(x.id).n)}】${x.plus ? '+' + x.plus : ''}<span class="muted">（${esc(L.gearMainText(st, x).split(' · ')[0])}）</span>` : `<span class="muted">${L.GEAR_N[s]}：空</span>`; }).join('<br>')} <button class="btn sm alt eq" id="btnGear">法宝 ▸</button></dd>` : ''}
      ${UI.isOpen('arts') ? `<dt>功法</dt><dd>${L.artSlots(st).map((id, i) => (id ? `${L.ART_CAT[L.ART_SLOTS[i]]}《${esc(L.art(id).n)}》` : '')).filter(Boolean).join('<br>') || '<span class="muted">基础吐纳</span>'} <button class="btn sm alt eq" id="btnArts">功法 ▸</button></dd>` : ''}
      ${UI.isOpen('dao') ? `<dt>道心</dt><dd>狂 ${L.daoN(st, 'k')} · 稳 ${L.daoN(st, 'w')} · 仁 ${L.daoN(st, 'r')} · 道基 +${Math.round(L.daoji(st) * 100)}%${L.karmaOpen(st).length ? ` · <span class="seal">因果 ${L.karmaOpen(st).length}</span>` : ''} <button class="btn sm alt eq" id="btnDao">道心 ▸</button></dd>` : ''}
      ${UI.isOpen('pets') ? `<dt>灵宠</dt><dd>${L.petOut(st) ? `${petImg(L.petOut(st), 26)} ${esc(L.petName(L.petOut(st)))} Lv${L.petOut(st).lv}<span class="muted">（出战 ×${L.petAtkOf(st, L.petOut(st)).toFixed(2)}）</span>` : `<span class="muted">${L.petCount(st) ? '没有出战的' : '尚无'}</span>`}${L.petCount(st) ? ` <span class="muted">名册 ${L.petCount(st)}/${L.petCap(st)} · 兽粮 ${fmt(st.feed || 0)}</span> <button class="btn sm alt eq" id="btnPetsMe">兽栏 ▸</button>` : ''}</dd>` : ''}
      <dt>库存</dt><dd>${[st.herbs || UI.isOpen('herb') ? '灵草 ' + fmt(st.herbs) : '', UI.isOpen('plus') || st.ore ? '灵矿 ' + fmt(st.ore || 0) : '', st.treasure ? '天材地宝 ' + st.treasure : '', '破境丹 ' + st.pills].filter(Boolean).join(' · ')}</dd>
      ${buffs ? `<dt>增益</dt><dd class="jadet">${buffs}</dd>` : ''}
      ${st.bonus.cul || st.bonus.atk ? `<dt>机缘加成</dt><dd>修炼 +${Math.round(st.bonus.cul * 100)}% · 战力 +${Math.round(st.bonus.atk * 100)}%</dd>` : ''}
    </dl></details>
    ${st.lives.length ? `<div class="sep"></div><div class="muted">前世</div>${st.lives.map((l, i) => `<div>第 ${i + 1} 世 · ${esc(l.name)}${l.origin && l.origin !== 'qitu' ? '（' + esc(L.ORIGINS[l.origin].n) + '）' : ''} · ${l.ascended ? '白日飞升' : L.REALMS[Math.min(l.r, 8)].n + '期坐化'} · ${l.age} 岁${l.dg ? ` · 道果 ${fmt(l.dg)}` : ''}</div>`).join('')}` : ''}
    ${lifeRebirthHTML()}
    <details class="more"><summary>存档与设置</summary><dl class="grid2"><dt>存档</dt><dd>本机自动保存 · 云存档：${esc(cloudStatus)}</dd></dl>
    <div class="row"><button class="btn sm alt" id="btnReset">重新开始</button></div>
    <div class="muted">字体：Fusion Pixel（TakWolf，SIL OFL 1.1）</div></details>`;
  } else if (tab === 'bond' && typeof bondTabHTML === 'function') {
    body = bondTabHTML();   // 人物卡：喜好、委托、同伴、道侣（panel-people.js）
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
    // 宿敌一览与新秀（panel-rivals.js）：点一行看宿敌卡（属性、看家战技、法宝、恩怨条，未知的写“？”）
    const rivals = rivalListHTML();
    const bosses = L.BOSSES.map((B, k) => `<span class="chip ${st.bosses[k] ? 'ok' : ''}" style="${st.bosses[k] ? '' : 'opacity:.5'}">${B.n}</span>`).join(' ');
    const anyBoss = L.BOSSES.some((B, k) => st.bosses[k] || L.bossReady(st, k));
    body = `<div class="muted">天骄榜（每 12 周天举行一届论道）</div>${ladderHTML()}<div class="sep"></div>${rivals}${anyBoss ? `<div class="sep"></div><div class="muted">地图首领</div><div style="display:flex;flex-wrap:wrap;gap:4px">${bosses}</div>` : ''}`;
  }
  const s = sheet({ title: '人物', body: meTabs(tab) + body });
  bindMeTabs(s);
  if (tab === 'bond' && typeof bindBondTab === 'function') bindBondTab(s);
  if (tab === 'rank') bindRivalList(s);
  const ab = s.querySelector('#btnArts'); if (ab) ab.onclick = () => { SFX.tap(); showArts(0); };
  const pm = s.querySelector('#btnPetsMe'); if (pm) pm.onclick = () => { SFX.tap(); showPets(); };
  const gb0 = s.querySelector('#btnGear'); if (gb0) gb0.onclick = () => { SFX.tap(); showGear('w'); };
  const db = s.querySelector('#btnDao'); if (db) db.onclick = () => { SFX.tap(); showDao(); };
  s.querySelectorAll('.ach[data-title]').forEach(el => { if (el.dataset.title) el.onclick = () => { st.title = el.dataset.title; SFX.tap(); showMe('ach'); }; });
  const gb = s.querySelector('#btnGrow'); if (gb) gb.onclick = () => { SFX.tap(); showGrowth('all'); };
  bindLifeRebirth(s);   // 再入轮回 / 兵解（life.js）
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
