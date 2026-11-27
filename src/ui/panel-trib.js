/* 废柴仙途 · 界面片段 panel-trib：天劫准备页（护劫手段）、心魔劫与飞升前夜、雷劫中途那一停、渡劫评价；人物页的道心与因果；老祖的讲解与气泡
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide 之后：这里往 HINTS 里加讲解）。
 * 成功率、提示、护体曲线一律取自 trib.js（L.tribRate / L.tribView / L.tribPeek / L.tribFinish），道心与因果取自 dao.js，面板上的数就是结算用的数。
 * 过场动画在 cine.js 的 startTribCine / drawTribCine。 */
// 本片段的样式（并行开发期间放在这里，免得和别的系统同时改 template.html；合并后可以挪进模板）
(function () {
  const css = `
.aids { display: flex; flex-direction: column; gap: 6px; }
.aid { display: flex; align-items: center; gap: 8px; padding: 4px 6px; background: #f7eed6; box-shadow: 0 0 0 2px #b9a77c; min-height: 44px; }
.aid.on { background: #fff6dc; box-shadow: 0 0 0 2px var(--gold), 0 0 0 4px var(--ink); }
.aid.off { opacity: .62; }
.aid .an { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.aid .av { color: var(--seal); white-space: nowrap; }
.aid .ad { color: var(--paper-mute); overflow-wrap: anywhere; }
.aid .btn { flex: none; min-width: 60px; min-height: 44px; padding: 4px 8px; }
.aid .stp { display: flex; align-items: center; gap: 6px; flex: none; }
.aid .stp .btn { min-width: 44px; }
.aid .stp b { font-weight: normal; min-width: 1.2em; text-align: center; font-size: calc(var(--fs) * 1.4); }
.trhead { display: flex; align-items: center; justify-content: space-between; gap: 6px; color: var(--paper-mute); }
.shieldimg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
.tribhint { margin: 0; text-align: center; }
.tribhint b { color: var(--seal); font-weight: normal; font-size: calc(var(--fs) * 1.3); }
.demonbd { display: block; width: 100%; height: auto; max-height: 30vh; object-fit: cover; }
.dq { display: flex; gap: 6px; align-items: flex-start; background: #2a1830; color: #f3dce6; padding: 6px 8px; box-shadow: inset 3px 0 0 #c8323c; }
.dq img { flex: none; }
.tgrade { display: flex; align-items: center; justify-content: center; gap: 10px; }
.tgrade img { width: 72px; height: 72px; flex: none; }
.daorow { display: flex; gap: 8px; align-items: flex-start; background: #f7eed6; padding: 6px; box-shadow: 0 0 0 2px #b9a77c; }
.daorow > img { flex: none; }
.daorow .main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.daorow .line { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.daorow .dfx { display: flex; flex-direction: column; gap: 1px; color: var(--paper-mute); }
.daorow .dfx .on { color: var(--paper-ink); }
.daorow .dfx .on::before { content: '◆ '; color: var(--seal); }
.daorow .dfx span:not(.on)::before { content: '◇ '; }
.grecs { display: flex; flex-wrap: wrap; gap: 6px; }
.grec { display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 40px; }
.krow { display: flex; gap: 6px; align-items: flex-start; padding: 4px 6px; background: #f7eed6; box-shadow: 0 0 0 2px #b9a77c; }
.krow.done { opacity: .55; }
.krow .main { flex: 1; min-width: 0; }
.sheet:has(#tribAids) .foot .btn, .sheet:has(#tribPause) .foot .btn, .sheet:has(#tribStoryRes) .foot .btn, .sheet:has(#tribAids) .stepper .btn.sm, #tribStory + .choices .btn { min-height: 44px; }
`;
  const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el);
})();

// ---------- 小部件 ----------
function stampURL(g) { const c = ART.stamp(g); return c ? urlOf(c, 'stamp|' + g) : ''; }
// 护体条（ART.drawShieldBar 画到离屏画布，按整数倍放大）
function shieldBarImg(frac, mark, k) {
  const c = document.createElement('canvas'); c.width = 104; c.height = 12;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  ART.setCtx(g, 104); ART.drawShieldBar(2, 3, 100, frac, mark === undefined || mark === null ? {} : { mark }); ART.setCtx(ctx, W);
  const z = pxs(1, k || 3);
  return `<img class="px shieldimg" src="${c.toDataURL()}" style="width:${104 * z}px;height:${12 * z}px" alt="">`;
}
function aidIcon(k) {
  if (k === 'fa' && st.gear && st.gear.w) { const c = ART.item('w', st.gear.w.t); return `<img class="px" src="${urlOf(c, 'gw|' + st.gear.w.t)}" style="width:${pxs(16, 2)}px;height:${pxs(16, 2)}px;flex:none" alt="">`; }
  if (k === 'zhen' && ART.sigil) { const c = ART.sigil('f_dujie'); if (c) return `<img class="px" src="${urlOf(c, 'sig|f_dujie')}" style="width:${pxs(16, 2)}px;height:${pxs(16, 2)}px;flex:none" alt="">`; }
  if (k === 'daolv' && st.daolv) return npcAvImg(st.daolv, 32);
  return iconHTML(k === 'pet' ? 'pet' : k === 'pill' ? 'pill' : 'disc', 32);
}
// 一行护劫手段：on 是否勾上；btn 的 data 名（准备页 data-aid，停顿卡 data-ex）
function aidRow(k, on, data) {
  const A = L.aidInfo(st, k), pct = '+' + L.pct(A.v);
  const desc = A.ok ? A.cost : A.why;
  return `<div class="aid ${on ? 'on' : ''} ${A.ok ? '' : 'off'}" data-aidrow="${k}">${aidIcon(k)}<div class="an"><div>${A.n} <span class="av">${pct}</span></div><div class="ad">${esc(desc)}</div></div>`
    + (data ? `<button class="btn sm alt pn-chk${on ? ' on' : ''}" data-${data}="${k}" aria-pressed="${on ? 'true' : 'false'}" ${A.ok ? '' : 'disabled'}><span class="vh">${on ? '☑' : '☐'}</span>${on ? '已用' : '用上'}</button>` : '') + '</div>';
}

// ---------- 准备页（金丹起）----------
let tribSel = null;   // 准备页勾上的护劫手段（null：按默认——只在失败时才有代价的祭法宝、道侣、渡劫阵默认勾上；灵宠要休养，自己选）
function tribDefault() { const o = {}; for (const k of ['fa', 'daolv', 'zhen']) if (L.aidInfo(st, k).ok) o[k] = 1; return o; }
function tribAidsSel() { const d = tribSel || tribDefault(), o = {}; for (const k in d) if (d[k] && L.aidInfo(st, k).ok) o[k] = 1; return o; }
function tribOpts() { const max = Math.min(L.BT.maxPills, st.pills); if (btPills === null || btPills > max) btPills = btDefault(); return { pills: btPills, aids: tribAidsSel() }; }
// 修为条、老祖“ready”气泡里写的成功率：照准备页默认的选法
function btShownRate() { return L.tribNeeded(st) ? L.tribRate(st, tribOpts()) : L.btRate(st, btDefault()); }
function showTribPrep(still) {
  const p = st.p;
  const o = tribOpts(), n = o.pills, max = Math.min(L.BT.maxPills, st.pills), sure = !!st.flags.sureBt;
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n, N = L.tribStrikes(st);
  const rate = L.tribRate(st, o), all = L.tribRate(st, { pills: max, aids: 'all' });
  const parts = L.tribParts(st, o).map(([k, v]) => `<span>${esc(k)} ${k === '基础' ? L.pct(v) : (v >= 0 ? '+' : '−') + L.pct(Math.abs(v))}</span>`).join('');
  const pre = L.tribPre(st);
  const preNote = pre ? (/^demon/.test(pre.trigger) ? '<div class="seal">雷劫之前，先过心魔劫</div>' : `<div class="seal">飞升前夜，${esc(L.ascendVisitor(st).n)}来敲门</div>`) : '';
  const fail = L.has(st, 'steady') ? `失败：道心坚定，修为只退到 95%，不负伤；下次成功率 +${L.pct(L.BT.fail)}。` : `失败不会身死：修为退到 70%，负伤到下季末，下次成功率 +${L.pct(L.BT.fail)}。`;
  // 用得上的护劫手段摆出来，用不上的（缺灵宠、没道侣……）收进折叠
  const aidK = ['fa', 'pet', 'daolv', 'zhen', 'pill'], aidOk = aidK.filter(k => L.aidInfo(st, k).ok), aidNo = aidK.filter(k => !L.aidInfo(st, k).ok);
  const aidH = k => aidRow(k, !!o.aids[k], sure || k === 'pill' ? '' : 'aid');
  const aids = aidOk.map(aidH).join('') + (aidNo.length ? `<details class="more" data-pn="trib-no"${pnOpenKeys.has('trib-no') ? ' open' : ''}><summary>用不上的 · ${aidNo.length} 样</summary>${aidNo.map(aidH).join('')}</details>` : '');
  // 第一屏：冲击什么 + 成功率（大字）+ 成了之后的变化；成功率拆解、失败后果、评档规则收进“详情”；护劫手段一行一样
  const body = `<div class="row">${myAvImg(48)}<div class="grow">
      <div class="big seal">冲击${nxt}</div>
      <div class="muted">${L.stageName(p)} · 雷劫 ${N} 道${L.daoji(st) ? ` · 道基 +${Math.round(L.daoji(st) * 100)}%` : ''}</div>${preNote}</div>
      <div class="center" style="flex:none"><div class="muted">成功率</div><div class="big ${rate >= 0.7 ? 'jadet' : rate >= 0.4 ? 'goldt' : 'seal'}" id="btRate" style="font-size:calc(var(--fs)*3);line-height:1">${L.pct(rate)}</div></div></div>
    ${p.r < L.MAXR ? `<div class="pn-k center">成了：战力 <b class="pn-up">×${btPowerMult().toFixed(1)}</b> · 寿元 → ${fmt(nextLife())}</div>` : ''}
    ${sure ? '<div class="jadet center">九转金丹：必定成功（不耗丹、不用手段）</div>' : ''}
    <div class="stepper" id="btStep"><span class="grow">破境丹 <span class="muted">+${L.pct(L.BT.pill)}/枚 · 剩 ${st.pills}</span></span>
      <button class="btn sm alt" data-st="-1" ${n <= 0 || sure ? 'disabled' : ''}>−</button><b class="num">${n}</b><button class="btn sm alt" data-st="1" ${n >= max || sure ? 'disabled' : ''}>+</button></div>
    ${pnHead('护劫手段', `全用上 ${L.pct(all)}`)}
    <div class="aids" id="tribAids">${aids}</div>
    <details class="more"><summary>成功率怎么来 · 失败会怎样</summary>${sure ? '' : `<div class="fxlist">${parts}</div>`}
    <div class="muted">每样护劫手段每次渡劫用一次；破境丹最多 ${L.BT.maxPills} 枚。雷劫落到倒数第二道之前会停一下：护体还剩多少、照这样能不能过，那时还能补上没用的手段。成功按余量评 完美 / 上 / 中 / 下，永久道基 +3% / +2% / +1% / +0%。</div>
    <div class="muted">${sure ? '' : fail}</div></details>`;
  const s = sheet({ title: p.r >= L.MAXR ? '飞升天劫' : '境界突破', still, body, foot: [{ t: '再等等', alt: true, fn: closeModal }, { t: '引动天劫', gold: true, fn: go }] });
  s.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { SFX.tap(); btPills = Math.max(0, Math.min(max, n + +b.dataset.st)); showTribPrep(true); });
  s.querySelectorAll('[data-aid]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.aid; tribSel = Object.assign({}, tribAidsSel()); if (tribSel[k]) delete tribSel[k]; else tribSel[k] = 1; showTribPrep(true); });
  function go() {
    const ev = L.tribPre(st);
    if (ev) { showTribStory(ev, tribGo); return; }
    tribGo();
  }
}
// 开渡：按准备页的选法预掷，接着放过场
function tribGo() {
  const o = tribOpts();
  const v = L.tribStart(st, o);
  btPills = null; tribSel = null;
  closeModal();
  if (v) startTribCine(v);
}

// ---------- 心魔劫 / 飞升前夜（雷劫之前那一问）----------
function showTribStory(ev, done) {
  const demon = /^demon:/.test(ev.trigger || ''), n = demon ? +ev.trigger.split(':')[1] : 0;
  const q = demon ? L.demonQuestion(st, n) : null, vis = demon ? null : L.ascendVisitor(st);
  const visImg = w => (vis.id === 'elder' ? `<img class="px" src="${ELDER}" style="width:${w}px;height:${w}px" alt="">` : npcAvImg(vis.id, w));
  const head = demon ? `<img class="px demonbd" src="${urlOf(ART.backdrop('demon'), 'bd|demon')}" alt="">` : `<div class="speaker">${visImg(56)}<div class="grow"><div class="seal">${esc(vis.n)}</div><p style="margin:4px 0 0">${esc(L.fill(st, ev.text))}</p></div></div>`;
  const luck = L.choiceLuck(st);
  let first = true;
  const btns = ev.choices.map((c, i) => {
    if (!L.choiceShown(st, c)) return '';
    const bits = [];
    if (c.cost) bits.push(L.costText(st, c.cost));
    if (c.p !== undefined) bits.push('把握 ' + L.pct(Math.min(0.95, c.p + luck)));
    const fx = (c.ok && c.ok.fx) || {}, fl = [].concat(fx.flag || []).join();
    if (demon) bits.push(/_firm/.test(fl) ? `这一劫 +${L.pct(L.TRIB.demon)}` : /_waver|_shaken/.test(fl) ? `−${L.pct(L.TRIB.demon)}，了结一笔因果` : '');
    const gold = first; first = false;
    return `<button class="btn ${gold ? 'gold' : 'alt'}" data-c="${i}" ${L.costOk(st, c.cost) ? '' : 'disabled'}><span>${esc(L.fill(st, c.t))}</span><small>${esc(bits.filter(Boolean).join(' · '))}</small></button>`;
  }).join('');
  const s = sheet({
    title: '<span class="story-tag">主线</span>' + esc(L.fill(st, ev.title)), center: true, noClose: true,
    body: `<div id="tribStory">${head}${q ? `<div class="dq">${icon16('karma', 1.5)}<span>心魔翻出：${esc(q.text)}</span></div><p style="margin:0">${esc(L.fill(st, ev.text))}</p><div class="muted">与当初一致：这一劫成功率 +${L.pct(L.TRIB.demon)}；动摇：−${L.pct(L.TRIB.demon)}，但了结一笔因果。</div>` : ''}</div><div class="choices">${btns}</div>`,
  });
  SFX.reveal(demon ? 5 : 4);
  s.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => {
    SFX.tap();
    const res = L.resolveChoice(st, ev, +b.dataset.c);
    if (!res) return;
    if (res.hasRisk) { if (res.ok) SFX.win(); else SFX.fail(); } else SFX.coin();
    const chips = res.fx.length ? `<div class="fxlist">${res.fx.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : '';
    const rate = L.tribRate(st, tribOpts());
    sheet({ title: esc(L.fill(st, ev.title)), center: true, noClose: true,
      body: `<div id="tribStoryRes">${demon ? `<img class="px demonbd" src="${urlOf(ART.backdrop('demon'), 'bd|demon')}" alt="">` : `<div class="speaker">${visImg(44)}<div class="grow"></div></div>`}</div><p style="margin:0">${esc(res.text)}</p>${chips}<div class="center muted">雷劫成功率 <b class="num">${L.pct(rate)}</b></div>`,
      foot: [{ t: '迎雷劫', gold: true, fn: done }] });
  });
}

// ---------- 雷劫中途那一停 ----------
let tribEx = null;   // 停顿时补上的：{ fa, pet, daolv, pills }
function showTribPause() {
  const c = cine; if (!c || !c.trib) return;
  const v = c.v;
  tribEx = tribEx || { pills: 0 };
  const p0 = v.p, p1 = L.tribPeek(st, tribEx), h = v.hint;
  const rows = v.canAdd.map(k => aidRow(k, !!tribEx[k], 'ex')).join('')
    + (v.pillMax > 0 ? `<div class="aid ${tribEx.pills ? 'on' : ''}" data-aidrow="pill">${aidIcon('pill')}<div class="an"><div>临阵吞丹 <span class="av">+${L.pct(L.TRIB.pill)}/枚</span></div><div class="ad">${esc(L.aidInfo(st, 'pill').cost)}</div></div>
        <div class="stp"><button class="btn sm alt" data-exp="-1" ${tribEx.pills <= 0 ? 'disabled' : ''}>−</button><b class="num">${tribEx.pills}</b><button class="btn sm alt" data-exp="1" ${tribEx.pills >= v.pillMax ? 'disabled' : ''}>+</button></div></div>` : '');
  const acc = h.acc >= 1 ? '稳·道心三级：老祖这一眼十成准' : `老祖这一眼八成准（稳·道心三级十成准）`;
  const body = `<div id="tribPause">
    <div class="center">${shieldBarImg(v.shield, h.mark, 3)}</div>
    <p class="tribhint">第 ${v.pauseAfter} / ${v.N} 道落过，护体还剩 <b>${L.pct(v.shield)}</b>。<br>照这样下去——<b id="tribHint">${h.text}</b></p>
    <div class="center muted">${acc}；红线是他估的落点。</div>
    <div class="center">成功率 <b class="num" id="tpRate">${L.pct(p0)}${p1 > p0 + 1e-9 ? ' → ' + L.pct(p1) : ''}</b></div>
    ${rows ? `<div class="trhead"><span>还能补上的手段</span></div><div class="aids" id="tribAdd">${rows}</div>` : '<div class="center muted" id="tribAdd">没有能补的手段了，只能硬扛。</div>'}</div>`;
  const s = sheet({ title: '临阵一停', center: true, noClose: true, still: true, body, foot: [{ t: '继续渡劫', gold: true, fn: () => { const ex = tribEx; closeModal(); tribResume(ex); } }] });
  s.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.ex; tribEx[k] = tribEx[k] ? 0 : 1; showTribPause(); });
  s.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => { SFX.tap(); tribEx.pills = Math.max(0, Math.min(v.pillMax, tribEx.pills + +b.dataset.exp)); showTribPause(); });
}
// 停顿结束：按补完的手段看结果（L.tribPreview，不改存档），曲线换成补完之后的，接着落最后两道；
// 最后一道落下才调 L.tribFinish 真正结算（u 早就掷好，结果一样）——免得修为条、成就横幅在雷还没劈完时就把结果说出去
function tribResume(ex) {
  const c = cine; if (!c || !c.trib || !c.paused) return;
  const pv = L.tribPreview(st, ex || {});
  tribEx = null;
  if (!pv) { cine = null; return; }
  const before = c.shield;
  c.ex = ex || {}; c.out = pv; c.curve = pv.curve1;
  c.shield = c.curve[c.v.pauseAfter];
  if (c.shield > before + 0.005) { c.lag = before; floatText(HOMEPOS.x, HOMEPOS.y - 46, `护体回升 ${L.pct(before)} → ${L.pct(c.shield)}`, '#ffe39a'); SFX.gather(); }
  c.paused = false; c.next = c.t + 500;
}

// ---------- 结果卡里天劫的几行（panel-bt.js 的 afterBreakthrough 调）----------
function tribResultHTML(res) {
  const tb = res.tb; if (!tb) return '';
  const lines = [];
  if (res.ok && tb.grade) {
    const dj = res.daoji || { add: 0, total: L.daoji(st) };
    lines.push(`<div class="tgrade" id="tribGrade"><img class="px" src="${stampURL(tb.grade)}" alt="${tb.grade}"><div>渡劫评价「<b class="seal">${tb.grade}</b>」<br><span class="muted">余量 +${tb.margin.toFixed(2)}</span><br>道基 +${Math.round(dj.add * 100)}%<span class="muted">（累计 +${Math.round(dj.total * 100)}% / ${Math.round(L.TRIB.cap * 100)}%）</span></div></div>`);
    if (res.dan) lines.push(`<div class="center goldt">结成【${esc(res.dan)}】</div>`);
  } else if (!res.ok) {
    lines.push(`<div class="center muted">余量 ${tb.margin.toFixed(2)}：护体在最后一道雷下碎了。</div>`);
    if (tb.costs.length) lines.push(`<div class="fxlist">${tb.costs.map(x => `<span>${esc(x)}</span>`).join('')}</div>`);
  }
  const used = Object.keys(tb.aids).map(k => L.AID_N[k]).concat(tb.extraPills ? [`临阵吞丹 ×${tb.extraPills}`] : []);
  lines.push(`<div class="center muted">成功率 ${L.pct(tb.p0)}${tb.p1 > tb.p0 + 1e-9 ? ' → ' + L.pct(tb.p1) : ''}${used.length ? ' · ' + esc(used.join('、')) : ' · 没用护劫手段'}；那一停老祖说“${tb.hint.text}”${tb.hint.right ? '' : '——看走了眼'}</div>`);
  return lines.join('');
}

// ---------- 人物页 · 道心与因果 ----------
function showDao() {
  const rows = L.DAO_KEYS.map(k => {
    const n = L.daoN(st, k), lv = L.daoLv(st, k), nx = L.daoNext(st, k), D0 = L.DAO[k];
    const prev = lv ? L.DAO_TH[lv - 1] : 0, frac = nx ? (n - prev) / (nx - prev) : 1;
    return `<div class="daorow" data-dao="${k}">${icon16('dao_' + k, 2)}<div class="main"><div class="line"><b>${D0.n}</b><span class="chip ${lv ? 'ok' : ''}">${lv ? '一二三'[lv - 1] + '级' : '未入门'}</span><span class="num">${n} 笔${nx ? ` · 再 ${nx - n} 笔到${'一二三'[lv]}级` : ' · 已满'}</span></div>${bar(frac, lv >= 3)}
      <div class="dfx">${D0.fx.map((f, i) => `<span class="${i < lv ? 'on' : ''}">${L.DAO_TH[i]} 笔：${esc(f)}</span>`).join('')}</div></div></div>`;
  }).join('');
  const top = L.daoTop(st), T0 = st.trib || {}, dj = L.daoji(st);
  const recs = (T0.rec || []).map(x => `<span class="grec"><img class="px" src="${stampURL(x.g)}" style="width:${pxs(24, 1)}px;height:${pxs(24, 1)}px" alt="${x.g}"><span class="muted">${x.r >= 9 ? '飞升' : L.REALMS[x.r].n}</span></span>`).join('');
  const open = L.karmaOpen(st), done = L.karmaState(st).list.filter(x => x.done);
  const krow = (x, d) => `<div class="krow ${d ? 'done' : ''}" data-karma="${esc(x.id)}">${icon16('karma', 1.5)}<div class="main"><div><b>${esc(x.who)}</b> <span class="muted">${esc(x.title || '')}</span></div><div class="muted">${esc(x.n)}${d ? ' · 已了结' : ` · 第 ${seasons(x.tick)} 季结下`}</div></div></div>`;
  const kr = L.karmaRebirth(st);
  const body = meTabs('dao') + `
    <div class="muted">奇遇里的选择记在道心上：狂 / 稳 / 仁各到 ${L.DAO_TH.join(' / ')} 笔得一级。${top ? `眼下你最像个<b class="seal">${L.DAO[top].n}</b>者。` : '眼下还看不出你是个什么样的人。'}</div>
    <div id="daoBox" style="display:flex;flex-direction:column;gap:6px">${rows}</div>
    <div class="sep"></div>
    <div class="trhead"><span>道基 <b class="seal">+${Math.round(dj * 100)}%</b> <span class="muted">修炼与战力（上限 ${Math.round(L.TRIB.cap * 100)}%）</span></span>${T0.dan ? `<span class="goldt">${esc(T0.dan)}</span>` : ''}</div>
    ${recs ? `<div class="grecs" id="tribRecs">${recs}</div>` : '<div class="muted">金丹起每渡一次雷劫按余量评级：完美 +3%、上 +2%、中 +1%、下 +0%。</div>'}
    <div class="sep"></div>
    <div class="trhead"><span>因果 <span class="muted">未了 ${open.length} · 已了结 ${kr.done}</span></span></div>
    <div id="karmaBox" style="display:flex;flex-direction:column;gap:6px">${open.map(x => krow(x, false)).join('') + done.slice(-3).map(x => krow(x, true)).join('') || '<div class="muted">没欠过谁。杀、夺、负人的选项会记一笔，日后仇家上门、心魔劫翻旧账。</div>'}</div>
    <div class="muted">因果会回来：仇家上门、途中伏击、心魔劫的题目；能在那时或心魔劫里了结。轮回时每条未了的因果 −${Math.round(L.KARMA_REB * 100)}% 道果${kr.title ? `（狂者另得称号「${kr.title}」）` : ''}。</div>`;
  const s = sheet({ title: shellTitle('path'), body });
  bindMeTabs(s);
}

// ---------- 老祖：道心升级、第一笔因果的气泡；章末评语 ----------
function daoHook(type, data) {
  if (type === 'dao') {
    const D0 = L.DAO[data.k], nx = L.DAO_TH[data.lv];
    const num = { k: [`越级奖励 ×${(2 * L.DAO_V.leap).toFixed(1)}（原来 ×2）`, `对决胜算再低也有 ${L.pct(L.DAO_V.lo)}（原来 3%）`, '丁等不直接负伤，“以伤换命”再战一次'],
      w: [`突破成功率 +${L.pct(L.DAO_V.bt)}`, `闭关花费 −${L.pct(1 - L.DAO_V.ret)}（现在 ${fmt(L.retCost(st))} 灵石）`, '天劫那一停，本座的提示十成准'],
      r: [`来访的人好感多 +${L.DAO_V.aff}`, `徒弟成长 +${L.pct(L.DAO_V.disc - 1)}`, `人物五心只要好感 ${L.DAO_V.heart5}`] }[data.k][data.lv - 1];
    // 开罗式重整后阻塞讲解 dao1 已关：每次升级（含头一回）都走气泡
    tip(`dao_${data.k}${data.lv}`, `道心·${D0.n}到了${'一二三'[data.lv - 1]}级（${data.n} 笔）：${num}。${nx ? `再 ${nx - data.n} 笔到下一级。` : '三级已满。'}【人物】→ 道心。`);
    banner('道心 · ' + D0.n, `${'一二三'[data.lv - 1]}级：${D0.fx[data.lv - 1]}`); SFX.reveal(4);
  } else if (type === 'karma') {
    if (!st.exp) floatText(HOMEPOS.x, HOMEPOS.y - 40, '因果 +1', '#ff9a8a');
    // 阻塞讲解 karma1 已关：每笔（含头一笔）一个气泡
    tip('karma_' + L.karmaState(st).list.length, `又记下一笔因果：${data.who}（${data.n}）。眼下没了的 ${L.karmaOpen(st).length} 条。`);
  } else if (type === 'unkarma') {
    if (!st.exp) floatText(HOMEPOS.x, HOMEPOS.y - 40, '了结一笔因果', '#8ff5d0');
  }
}
function chapterTip(ch) { if (st.guide && st.guide.done) tip('chend_' + ch, L.daoChapter(st, ch)); }

// ---------- 老祖的讲解（阻塞，时间暂停）：头一回金丹雷劫前讲护劫手段与那一停；第一次停下来时讲怎么补 ----------
const tribHints = [
  // 排在 'trib'（护劫手段）之后、'btGo'（点它）之前
  { id: 'tribPause', urgent: true, intro: true, when: () => /境界突破|飞升天劫/.test(modalTitle()) && st.p.r >= 1 && !!st.hintSeen.trib && !!document.querySelector('#tribAids'), target: '#modal .foot .btn.gold', btn: '知道了', text: () => {
      return `雷劫落到倒数第二道之前会<b>停一下</b>：本座看一眼护体，说能不能过（<b>${L.pct(L.tribHintAcc(st))}</b> 准）。那时还能补上没用的手段，临阵吞丹每枚 <b>+${L.pct(L.TRIB.pill)}</b>（丹毒 +${L.TRIB.toxin}）。`;
    } },
];
const tribNowHint = { id: 'tribNow', urgent: true, intro: true, when: () => modalTitle() === '临阵一停' && !!document.querySelector('#tribAdd') && !!cine && !!cine.trib, target: '#tribAdd', btn: '好', text: () => {
    const v = cine.v, ex = { fa: 1, pet: 1, daolv: 1, pills: v.pillMax }, p1 = L.tribPeek(st, ex), can = v.canAdd.length || v.pillMax;
    return `这就是那一停：护体还剩 <b>${L.pct(v.shield)}</b>，本座看<b>${v.hint.text}</b>。${p1 > v.p + 1e-9 ? `下面能补的全补上，成功率 <b>${L.pct(v.p)} → ${L.pct(p1)}</b>。` : can ? `成功率已经 <b>${L.pct(v.p)}</b>，再补也是白补。` : '能补的都用过了，硬扛吧。'}`;
  } };
// 道心、因果各一次阻塞讲解（SYSTEMS §17），之后的升级与新账走气泡（daoHook）
const daoCalm = () => st.guide && st.guide.done && !modalOpen() && !L.busy(st);
const daoHints = [
  { id: 'dao1', intro: true, when: () => daoCalm() && L.DAO_KEYS.some(k => L.daoLv(st, k) >= 1), target: '[data-nav="me"]', btn: '好', text: () => {
      const k = L.DAO_KEYS.find(x => L.daoLv(st, x) >= 1), d = st.dao;
      return `你做的选择本座都记着：狂 <b>${d.k}</b>、稳 <b>${d.w}</b>、仁 <b>${d.r}</b> 笔。${L.DAO[k].n}到 <b>${L.DAO_TH[0]}</b> 笔得了一级：${esc(L.DAO[k].fx[0])}。各到 ${L.DAO_TH.join(' / ')} 笔一级，【人物】→ 道心能看。`;
    } },
  { id: 'karma1', intro: true, when: () => daoCalm() && L.karmaOpen(st).length > 0, target: '[data-nav="me"]', btn: '知道了', text: () => {
      const k = L.karmaOpen(st)[0];
      return `你欠下了一笔<b>因果</b>：${esc(k.who)}。账会回来——过些日子仇家上门、心魔劫翻旧账；轮回时每条没了的 <b>−${Math.round(L.KARMA_REB * 100)}%</b> 道果。【人物】→ 道心里记着。`;
    } },
];
HINTS.splice(Math.max(0, HINTS.findIndex(h => h.id === 'btGo')), 0, ...tribHints);
HINTS.push(tribNowHint, ...daoHints);
