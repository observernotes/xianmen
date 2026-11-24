/* 废柴仙途 · 界面片段 events：奇遇事件
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 奇遇事件（选项） ----------
function speakerImg(ev, w) {
  const spk = ev.speaker || ev.npc;
  if (spk === 'elder') return `<img class="px" src="${ELDER}" style="width:${w}px;height:${w}px" alt="">`;
  if (spk && L.NPCS[spk]) return npcAvImg(spk, w);
  return myAvImg(w);
}
function showChoice(ev) {
  if (!ev || !st) return;
  const spk = ev.speaker || ev.npc;
  const who = spk && L.NPCS[spk] ? `<div class="seal">${esc(L.npcName(st, spk))} <span class="muted">${L.NPCS[spk].title}${L.met(st, spk) ? ' · 好感 ' + L.aff(st, spk) : ''}</span></div>` : spk === 'elder' ? '<div class="seal">戒中老祖</div>' : '';
  const luck = L.choiceLuck(st);
  // 选项上的 need / not / srankMin 不满足时不显示（L.choiceShown）；按钮的 data-c 仍是原序号
  let first = true;
  const btns = ev.choices.map((c, i) => {
    if (!L.choiceShown(st, c)) return '';
    const can = L.costOk(st, c.cost);
    const bits = [];
    if (c.cost) bits.push(L.costText(st, c.cost));
    if (c.duel) { const foe = { kind: 'event', id: ev.id }; bits.push('胜算 ' + L.pct(L.duelP(st, L.duelPower(st, foe), L.power(st) * c.duel, foe))); }
    else if (c.p !== undefined) bits.push('把握 ' + L.pct(Math.min(0.95, c.p + luck)));
    const gold = first; first = false;
    return `<button class="btn ${gold ? 'gold' : 'alt'}" data-c="${i}" ${can ? '' : 'disabled'}><span>${esc(L.fill(st, c.t))}</span><small>${esc(bits.join(' · '))}</small></button>`;
  }).join('') + (ev.choices.some(c => L.choiceShown(st, c) && L.costOk(st, c.cost)) ? '' : '<button class="btn alt" data-leave="1"><span>作罢</span><small>眼下拿不出这些，只好作罢</small></button>');
  const s = sheet({
    title: (ev.where === 'story' ? '<span class="story-tag">主线</span>' : '') + esc(L.fill(st, ev.title)), center: true, noClose: true,
    body: `<div class="speaker">${speakerImg(ev, 56)}<div class="grow">${who}<p style="margin:4px 0 0">${esc(L.fill(st, ev.text))}</p></div></div><div class="choices">${btns}</div>`,
  });
  SFX.reveal(ev.where === 'story' ? 4 : 2);
  const lv = s.querySelector('[data-leave]'); if (lv) lv.onclick = () => { SFX.tap(); closeModal(); };
  s.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => {
    SFX.tap();
    const res = L.resolveChoice(st, ev, +b.dataset.c);
    if (!res) return;
    // 得到的功法单列一行（图标、五行、给什么；更强时带【换上】）
    const arts = (res.fx.items || (res.fx.item ? [res.fx.item] : [])).filter(it => it && it.kind === 'a');
    const plain = res.fx.filter(f => !(res.fx.artTexts || []).includes(f));
    const chips = (plain.length ? `<div class="fxlist">${plain.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : '') + arts.map(artLine).join('');
    if (res.fx.talent) { flash(0.6); SFX.reveal(6); }
    if (res.duel) {
      duel({ title: L.fill(st, ev.title), right: { img: rivalAvImg({ n: ev.id }, 66), name: '对手', sub: fmt(res.duel.Q) }, Q: res.duel.Q, S: res.duel.S, p: res.duel.p, win: res.duel.win,
        winText: esc(res.text) + chips, loseText: esc(res.text) + chips, done: closeModal });
      return;
    }
    if (res.hasRisk) { if (res.ok) SFX.win(); else SFX.fail(); } else SFX.coin();
    sheet({ title: esc(L.fill(st, ev.title)), center: true, noClose: true,
      body: `<div class="speaker">${speakerImg(ev, 44)}<p class="grow" style="margin:0">${esc(res.text)}</p></div>${chips}`,
      foot: [{ t: '继续', gold: true, fn: closeModal }] });
  });
}

// ---------- 随机事件 ----------
function showEvent(ev) {
  const title = ev.kind === 'ring' ? '奇遇 · 戒中老祖' : ev.kind === 'beast' ? '灵兽认主' : '奇遇';
  const img = ev.kind === 'ring' ? `<img class="px" src="${ELDER}" style="width:52px;height:52px" alt="">` : ev.item && ev.item.kind === 'pet' ? petImg(ev.item.tier, 52) : myAvImg(52);
  sheet({ title, center: true, body: `<div class="row">${img}<p class="grow">${esc(ev.text)}</p></div>`, foot: [{ t: '妙啊', gold: true, fn: closeModal }] });
  SFX.reveal(5);
}
