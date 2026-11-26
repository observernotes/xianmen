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
// 三个外壳面板（§4.1）的分页条：【装备】法宝 · 功法 · 灵宠 · 包裹；【江湖】天骄榜 · 宗门 · 坊市 · 人物；【仙途】路径 · 属性 · 记录 · 设置
// 没开的分页不画；开的那一刻分页上挂“新”（ART.newBadge，点过即消）。各原页面调 meTabs(自己的键) 就得到所属外壳的分页条（sheet() 统一绑定 [data-kt]）
const SHELL_TABS = {
  gear: [['gear', '法宝'], ['art', '功法', 'arts'], ['pets', '灵宠', 'pets'], ['bag', '包裹']],
  world: [['rank', '天骄榜', 'tour'], ['sect', '宗门', 'sect'], ['market', '坊市', 'market'], ['bond', '人物', 'bond']],
  path: [['path', '路径'], ['attr', '属性'], ['rec', '记录'], ['set', '设置']],
  home: [['home', '建筑'], ['field', '灵田'], ['alch', '炼丹'], ['zhen', '阵法']],
};
const TAB_SHELL = { home: 'home', field: 'home', alch: 'home', zhen: 'home', gear: 'gear', art: 'gear', pets: 'gear', bag: 'gear', rank: 'world', sect: 'world', market: 'world', bond: 'world', path: 'path', attr: 'path', dao: 'path', rec: 'path', ach: 'path', codex: 'path', set: 'path' };
const TAB_ON = { dao: 'attr', ach: 'rec', codex: 'rec' };
const meTabOpen = k => { const sh = TAB_SHELL[k], row = sh && SHELL_TABS[sh].find(x => x[0] === k); if (k === 'pets') return UI.isOpen('pets') || L.petCount(st) > 0; if (k === 'bag') return true; if (k === 'field') return L.plotCount(st) > 0; if (k === 'alch') return st.home.furnace > 0; if (k === 'zhen') return !!L.zhenOpen(st); if (k === 'bond') return UI.isOpen('bond') || Object.keys(st.npc || {}).some(id => L.NPCS && L.NPCS[id]); return !row || !row[2] || UI.isOpen(row[2]); };
function meTabs(tab) {
  const sh = TAB_SHELL[tab] || 'path', on = TAB_ON[tab] || tab;
  if (!st.flags.tabSeen) { st.flags.tabSeen = {}; for (const sh in SHELL_TABS) for (const [k] of SHELL_TABS[sh]) if (meTabOpen(k)) st.flags.tabSeen[k] = 1; }   // 第一次：开着的都算看过
  const seen = st.flags.tabSeen;
  const list = SHELL_TABS[sh].filter(([k]) => k === on || meTabOpen(k));
  if (meTabOpen(on)) seen[on] = 1;
  if (list.length < 2) return `<div class="ktabs" data-kshell="${sh}" hidden></div>`;
  return `<div class="ktabs" data-kshell="${sh}">` + list.map(([k, n]) => `<button data-kt="${k}" class="${k === on ? 'on' : ''}">${n}${!seen[k] && k !== on && SHELL_TABS[sh][0][0] !== k && st.tick > 0 ? newBadgeHTML(12) : ''}</button>`).join('') + '</div>';
}
function openTab(k) {
  ({ gear: () => showGear(), art: () => showArts(), pets: () => showPets(), bag: () => showBag(), rank: () => showMe('rank'), sect: () => showSect(), market: () => showMarket(), bond: () => showMe('bond'),
    home: () => showHome(), field: () => showField(), alch: () => showAlchemy(), zhen: () => showZhen(), path: () => showPath(), attr: () => showMe('attr'), rec: () => showRecord(), set: () => showSettings() }[k] || (() => showPath()))();
}
function bindMeTabs(s) { /* 分页条由 sheet() 统一绑定（modal.js 的 [data-kt]） */ void s; }
// 【仙途】属性 / 【江湖】人物、天骄榜 / 【仙途】记录 → 成就（原【人物】拆开，§4.1）
function showMe(tab) {
  tab = tab || 'attr';
  if (tab === 'art') { showArts(); return; }
  if (tab === 'gear') { showGear(); return; }
  if (tab === 'dao') { showDao(); return; }   // 道心与因果（panel-trib.js）
  if (tab === 'codex') { showCodex(); return; }   // 图鉴（panel-codex.js）
  if (tab === 'path') { showPath(); return; }
  if (tab === 'rec') { showRecord(); return; }
  if (tab === 'set') { showSettings(); return; }
  const p = st.p, sh = TAB_SHELL[tab] || 'path';
  if (!navCur) navCur = sh;
  let body = '';
  if (tab === 'attr') {
    // 一屏：头像 + 名字 + 天赋 / 身份；四个数（点一行进数值拆解）；天赋两条；道心一行
    const lm = L.lifeMonths(st);
    const row = (k, v, f) => `<button class="kslot" data-grow="${f}" style="width:100%;font:inherit;text-align:left;cursor:pointer"><div class="mid"><small style="margin:0">${k}</small><div class="nm" style="font-size:19px">${v}</div></div><span class="kb alt">拆解</span></button>`;
    body = `<div class="kcard">${myAvImg(52)}<div class="grow"><div style="font-size:18px">${esc(p.name)}${st.title ? ` <span class="seal">「${esc(st.title)}」</span>` : ''}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">${talentTag(p.t)}<span class="chip">${st.sect ? `${L.sectOf(st).n}·${L.srankName(st, st.sect.rank)}` : '散修'}</span>${st.rebirth ? `<span class="chip">第 ${st.rebirth + 1} 世</span>` : ''}</div></div></div>
      ${row('战力', `<span style="color:var(--seal)">${fmt(L.power(st))}</span>`, 'atk')}${row('修炼 / ' + MO(), `<span class="kup">+${fmt(L.gain(st))}</span>`, 'cul')}${row('灵石 / ' + MO(), `+${fmt(L.income(st))}`, 'inc')}
      <div class="krow"><span class="k">寿元</span><span class="v ${lm.red ? 'seal' : ''}">${lm.text}</span><span class="s">${L.stageName(p)}</span></div>
      <div class="krow"><span class="k">天赋</span><span class="v">${p.tr.map(k => L.TRAITS[k].n).join(' · ') || '无'}</span></div>
      ${UI.isOpen('dao') ? `<div class="ksec"><span>道心 狂 ${L.daoN(st, 'k')} · 稳 ${L.daoN(st, 'w')} · 仁 ${L.daoN(st, 'r')}</span><button id="btnDao">道心 ▸</button></div>` : ''}`;
  } else if (tab === 'bond' && typeof bondTabHTML === 'function') {
    body = bondTabHTML();   // 人物卡：喜好、委托、同伴、道侣（panel-people.js）
  } else if (tab === 'bond') {
    body = Object.keys(L.NPCS).map(id => {
      const N = L.NPCS[id];
      if (!L.met(st, id)) return `<div class="card flat" style="opacity:.55"><div class="av" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--muted)">${unkPtHTML(44)}</div><div class="main"><div>？？？</div><div class="muted">${N.title} · 尚未相识</div></div></div>`;
      const a = L.aff(st, id);
      const tag = st.daolv === id ? '<span class="chip ok">道侣</span>' : a >= 60 ? '<span class="chip ok">知己</span>' : a >= 30 ? '<span class="chip">熟识</span>' : '<span class="chip">初识</span>';
      return `<div class="card flat">${npcAvImg(id, 44)}<div class="main"><div class="line"><span>${esc(L.npcName(st, id))}</span>${tag}</div><div class="muted">${N.title}</div>${bar(a / 100, a >= 60)}</div><div class="right num">${a}</div></div>`;
    }).join('');
  } else if (tab === 'ach') {
    const got = L.ACHS.filter(a => st.ach[a.id]).length;
    body = `<div class="ksec"><span>成就 ${got} / ${L.ACHS.length} · 点称号佩戴</span><button id="kBackRec">回记录 ▸</button></div>` + L.ACHS.map(a => `<div class="ach ${st.ach[a.id] ? '' : 'off'}" data-title="${st.ach[a.id] ? esc(a.t) : ''}"><b>${a.n}<br><span class="muted">${a.d}</span></b><span class="${st.title === a.t ? 'chip ok' : 'chip'}">「${a.t}」</span></div>`).join('')
      + (st.titles.filter(t => !L.ACHS.some(a => a.t === t)).length ? `<div class="sep"></div><div class="muted">其他称号</div>` + st.titles.filter(t => !L.ACHS.some(a => a.t === t)).map(t => `<div class="ach" data-title="${esc(t)}"><b>${esc(t)}</b><span class="${st.title === t ? 'chip ok' : 'chip'}">${st.title === t ? '佩戴中' : '佩戴'}</span></div>`).join('') : '');
  } else {
    // 天骄榜（江湖第一页）：榜单 + 宿敌一览（panel-rivals.js）；地图首领
    const rivals = rivalListHTML();
    const bosses = L.BOSSES.map((B, k) => `<span class="chip ${st.bosses[k] ? 'ok' : ''}" style="${st.bosses[k] ? '' : 'opacity:.5'}">${B.n}</span>`).join(' ');
    const anyBoss = L.BOSSES.some((B, k) => st.bosses[k] || L.bossReady(st, k));
    body = `<div class="ksec"><span>天骄榜 · 你第 ${st.rank}</span><span>论道还有 ${L.nextTour(st)} ${MO()}</span></div>${ladderHTML()}${rivals}${anyBoss ? `<div class="ksec"><span>地图首领</span></div><div style="display:flex;flex-wrap:wrap;gap:4px">${bosses}</div>` : ''}`;
  }
  const s = sheet({ title: shellTitle(sh), body: meTabs(tab) + body });
  if (tab === 'bond' && typeof bindBondTab === 'function') bindBondTab(s);
  if (tab === 'rank') bindRivalList(s);
  s.querySelectorAll('[data-grow]').forEach(b => b.onclick = () => { SFX.tap(); showGrowth(b.dataset.grow); });
  const db = s.querySelector('#btnDao'); if (db) db.onclick = () => { SFX.tap(); showDao(); };
  const kb = s.querySelector('#kBackRec'); if (kb) kb.onclick = () => { SFX.tap(); showRecord(); };
  s.querySelectorAll('.ach[data-title]').forEach(el => { if (el.dataset.title) el.onclick = () => { st.title = el.dataset.title; SFX.tap(); showMe('ach'); }; });
}
// 【仙途】→ 记录：成就、图鉴、年历、年报存档、前世、轮回殿（只放入口和数字）
function showRecord() {
  if (!navCur) navCur = 'path';
  const got = L.ACHS.filter(a => st.ach[a.id]).length;
  const hist = L.yearHist ? L.yearHist(st) : (st.flags.yearHist || []);
  const ent = (ic, nm, v, id, on) => (on === false ? '' : `<div class="kslot"><div class="cell">${artIcon(ic, 32)}</div><div class="mid"><div class="nm">${nm}</div><small>${v}</small></div><button class="kb alt" id="${id}">看</button></div>`);
  const best = st.flags.kbest || {};
  const body = meTabs('rec')
    + ent('report', '年报', `${hist.length} 年`, 'kRep', hist.length > 0)
    + ent('rank', '成就', `${got} / ${L.ACHS.length}`, 'kAch')
    + ent('codex', '图鉴', UI.isOpen('codex') ? `${L.codexCells ? L.codexCells(st) : 0} 格` : '', 'kCodex', UI.isOpen('codex'))
    + ent('time', '年历', UI.isOpen('cal') ? `论道还有 ${L.nextTour(st)} ${MO()}` : '', 'kCal', UI.isOpen('cal'))
    + `<div class="ksec"><span>最高纪录</span></div><div class="krow"><span class="k">最高战力</span><span class="v">${fmt(Math.max(best.pw || 0, L.power(st)))}</span></div><div class="krow"><span class="k">最好名次</span><span class="v">${st.bestRank && st.bestRank < 100 ? '第 ' + st.bestRank : '—'}</span></div>`
    + (st.lives.length ? `<div class="ksec"><span>前世 ${st.lives.length}</span></div>${st.lives.slice(-3).map((l, i) => `<div class="krow"><span class="k">第 ${st.lives.length - Math.min(3, st.lives.length) + i + 1} 世</span><span class="v">${esc(l.name)} · ${l.ascended ? '飞升' : L.REALMS[Math.min(l.r, 8)].n + '坐化'}</span></div>`).join('')}` : '')
    + lifeRebirthHTML();
  const s = sheet({ title: shellTitle('path'), body });
  const on = (id, f) => { const b = s.querySelector('#' + id); if (b) b.onclick = () => { SFX.tap(); f(); }; };
  on('kAch', () => showMe('ach')); on('kCodex', () => showCodex()); on('kCal', () => showCalendar()); on('kRep', () => showYearHist());
  bindLifeRebirth(s);
}
// 【仙途】→ 设置：声音、速度说明、玩法指南、存档、重新开始
function showSettings() {
  if (!navCur) navCur = 'path';
  const body = meTabs('set')
    + `<div class="kslot"><div class="cell" id="btnSound" style="cursor:pointer"></div><div class="mid"><div class="nm">声音</div><small>${['音乐与音效', '仅音效', '静音'][soundMode]}</small></div><button class="kb alt" id="kSnd">切换</button></div>
    <div class="kslot"><div class="cell">${artIcon('quest', 32)}</div><div class="mid"><div class="nm">玩法指南</div><small>各系统一句话</small></div><button class="kb alt" id="btnHelp">看</button></div>
    <div class="kslot"><div class="cell">${artIcon('ok', 32)}</div><div class="mid"><div class="nm">存档</div><small>本机自动 · 云：${esc(cloudStatus)}</small></div></div>
    <div class="kslot"><div class="cell">${artIcon('bad', 32)}</div><div class="mid"><div class="nm">重新开始</div><small>清除存档</small></div><button class="kb alt" id="btnReset">重来</button></div>
    <div class="ksec"><span>字体：Fusion Pixel（SIL OFL 1.1）</span></div>`;
  const s = sheet({ title: shellTitle('path'), body });
  setSoundIcon();
  const snd = () => { soundMode = (soundMode + 1) % 3; ac(); SFX.tap(); setSoundIcon(); savePref(); showSettings(); };
  s.querySelector('#kSnd').onclick = snd; s.querySelector('#btnSound').onclick = snd;
  s.querySelector('#btnHelp').onclick = () => { SFX.tap(); showHelp(); };
  s.querySelector('#btnReset').onclick = () => sheet({
    title: '重新开始', center: true, body: '<p>放弃当前进度，从头开始？这会清除本机与云端存档。</p>',
    foot: [{ t: '取消', alt: true, fn: () => showSettings() }, { t: '确定重来', fn: () => { closeModal(); resetGame(); } }],
  });
}
function resetGame() {
  st = null; clearLocal();
  if (cloud.ref) cloud.ref.delete().catch(() => {});
  queue.length = 0; parts.length = 0; cine = null; adv = null;
  showIntro();
}
