/* 废柴仙途 · 界面片段 events：奇遇事件
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 奇遇事件（选项） ----------
function speakerImg(ev, w, mood) {
  const hx = typeof sectSpeakerImg === 'function' ? sectSpeakerImg(ev, w, mood) : '';   // 长老、徒弟的事件立绘（panel-disc.js）
  if (hx) return hx;
  const spk = ev.speaker || ev.npc;
  if (spk === 'elder') return elderImg(w, mood);
  if (spk && L.NPCS[spk]) return npcAvImg(spk, w, mood);
  return myAvImg(w, undefined, '', mood);
}
// back：结果页【继续】之后回到哪（坊市事件回坊市）；省略就关掉弹窗
function showChoice(ev, back) {
  if (!ev || !st) return;
  const done = back || closeModal;
  const spk = ev.speaker || ev.npc;
  const who = spk && L.NPCS[spk] ? `<div class="seal">${esc(L.npcName(st, spk))} <span class="muted">${L.NPCS[spk].title}${L.met(st, spk) ? ' · 好感 ' + L.aff(st, spk) : ''}</span></div>` : spk === 'elder' ? '<div class="seal">戒中老祖</div>' : (typeof sectSpeakerWho === 'function' ? sectSpeakerWho(ev) : '');
  const luck = L.choiceLuck(st);
  // 选项上的 need / not / srankMin 不满足时不显示（L.choiceShown）；按钮的 data-c 仍是原序号
  let first = true;
  const btns = ev.choices.map((c, i) => {
    if (!L.choiceShown(st, c)) return '';
    const can = L.costOk(st, c.cost);
    const bits = [];
    if (c.cost) bits.push(L.costText(st, c.cost));
    // choice.foe：对手是宿敌或新秀（五行克制、他的法宝都算，rivals2.js 的 L.choiceFoe）
    if (c.duel) { const cf = L.choiceFoe ? L.choiceFoe(st, ev, c) : null; const foe = cf ? cf.foe : { kind: 'event', id: ev.id }; bits.push('胜算 ' + L.pct(L.duelP(st, L.duelPower(st, foe), cf ? cf.Q : L.power(st) * c.duel, foe))); }
    else if (c.p !== undefined) bits.push('把握 ' + L.pct(Math.min(0.95, c.p + luck)));
    const gold = first; first = false;
    return `<button class="btn ${gold ? 'gold' : 'alt'}" data-c="${i}" ${can ? '' : 'disabled'}><span>${esc(L.fill(st, c.t))}</span><small>${esc(bits.join(' · '))}</small></button>`;
  }).join('') + (ev.choices.some(c => L.choiceShown(st, c) && L.costOk(st, c.cost)) ? '' : '<button class="btn alt" data-leave="1"><span>作罢</span><small>眼下拿不出这些，只好作罢</small></button>');
  const s = sheet({
    title: (ev.where === 'story' ? '<span class="story-tag">主线</span>' : '') + esc(L.fill(st, ev.title)), center: true, noClose: true,
    body: `<div class="speaker">${speakerImg(ev, 56)}<div class="grow">${who}<p style="margin:4px 0 0">${esc(L.fill(st, ev.text))}</p></div></div><div class="choices">${btns}</div>`,
  });
  SFX.reveal(ev.where === 'story' ? 4 : 2);
  const lv = s.querySelector('[data-leave]'); if (lv) lv.onclick = () => { SFX.tap(); done(); };
  s.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => {
    SFX.tap();
    const res = L.resolveChoice(st, ev, +b.dataset.c);
    if (!res) return;
    // 得到的功法、法宝单列一行（功法更强时带【换上】；法宝走对比卡）
    const items = res.fx.items || (res.fx.item ? [res.fx.item] : []);
    const arts = items.filter(it => it && it.kind === 'a'), gears = items.filter(it => it && it.gear);
    const plain = res.fx.filter(f => !(res.fx.artTexts || []).includes(f) && !(res.fx.gearTexts || []).includes(f));
    const chips = (plain.length ? `<div class="fxlist">${plain.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : '') + arts.map(artLine).join('') + gears.map(gearLine).join('') + items.filter(it => it && it.kind === 'pet' && it.pend).map(petLine).join('');
    if (res.fx.talent) { flash(0.6); SFX.reveal(6); }
    if (res.duel) {
      const fi = duelFoeImg(res.duel, 66);   // 宿敌 / 新秀用半身像（panel-rivals.js）
      duel({ title: L.fill(st, ev.title), right: { img: fi ? fi.img : rivalAvImg({ n: ev.id }, 66), name: fi ? fi.name : '对手', sub: fmt(res.duel.Q) }, Q: res.duel.Q, S: res.duel.S, p: res.duel.p, win: res.duel.win,
        winText: esc(res.text) + chips, loseText: esc(res.text) + chips, done });
      return;
    }
    if (res.hasRisk) { if (res.ok) SFX.win(); else SFX.fail(); } else SFX.coin();
    sheet({ title: esc(L.fill(st, ev.title)), center: true, noClose: true,
      body: `<div class="speaker">${speakerImg(ev, 48, res.hasRisk ? (res.ok ? 'joy' : 'sad') : 'n')}<p class="grow" style="margin:0">${esc(res.text)}</p></div>${chips}`,
      foot: [{ t: '继续', gold: true, fn: done }] });
  });
}

// ---------- 随机事件 ----------
function showEvent(ev) {
  const title = ev.kind === 'ring' ? '奇遇 · 戒中老祖' : ev.kind === 'beast' ? '灵兽认主' : '奇遇';
  const img = ev.kind === 'ring' ? elderImg(52, 'joy') : ev.item && ev.item.kind === 'pet' ? petImg(ev.item, 52) : myAvImg(52, undefined, '', 'joy');
  sheet({ title, center: true, body: `<div class="row">${img}<p class="grow">${esc(ev.text)}</p></div>`, foot: [{ t: '妙啊', gold: true, fn: closeModal }] });
  SFX.reveal(5);
}
