/* Native preparation screens delegate opponent selection and resolution to the shared rules. */
globalThis.XianmenDuels = (() => {
  'use strict';
  const titles = {
    pact: '三年之约', tour: '天骄论道', meet: '九宗会武', war: '天剑来犯',
    rookie: '新秀挑战', foe: '宿敌上门', duel: '下战帖', final: '主线一战',
  };
  function describe(st, id, args) {
    if (id === 'pact') return { ...L.pactInfo(st), n: st.exName, foe: L.PACT_FOE, scale: L.pactAssist(st) };
    if (id === 'duel' || id === 'foe') return L.duelInfo(st, args);
    if (id === 'tour') {
      const target = L.tourFoe(st);
      return target && { ...target, n: target.rv.n, news: target.rv.aucNote };
    }
    if (id === 'meet' && st.sect) {
      const position = L.sectPos(st);
      const q = position === 1 ? 2 : position - 1;
      const target = L.nineAt(st, q);
      return { n: target.n, Q: L.ninePower(st, q), foe: { kind: 'sect', id: target.id } };
    }
    if (id === 'war' || id === 'final' && L.finalKind(st) === 'war') {
      const info = L.sectWarInfo(st);
      return { ...info, n: info.lead?.n || '天剑宗长老团', scale: L.wardMult(st) };
    }
    if (id === 'final' && L.finalKind(st) === 'heir') return {
      n: L.heirName(st), Q: L.heirPower(st), foe: { kind: 'heir', sect: st.sect.id },
    };
    if (id === 'rookie') {
      const info = L.rookieInfo(st);
      return info && { ...info, n: info.rk.n, quote: L.fill(st, info.rk.line) };
    }
    return null;
  }

  function prep(st, id, args) {
    if (!Object.hasOwn(titles, id)) return null;
    const info = describe(st, id, args);
    const voluntary = id === 'duel' || id === 'final';
    const why = voluntary ? L.apWhy(st, id, args) : id === 'foe' ? info?.why || '' : '';
    let title = titles[id];
    if (id === 'final') title = L.finalKind(st) === 'war' ? '讨回山门' : '圣子之战';
    const button = id === 'duel' ? '下战帖' : id === 'tour' || id === 'meet' ? '登台' : '应战';
    const options = [];
    if (id === 'rookie' && info) {
      options.push({ move: 'teach', label: '指点', text: '以招式点拨新秀，日后有机会收到回礼。' });
      options.push({ move: 'crush', label: '打压', text: '胜则夺得一条法宝词条，败则负伤并落后一名。' });
    } else {
      options.push({ move: 'fight', label: (info ? button : '继续') + (voluntary ? ' ◆' + L.apCost(st, id, args) : ''), why });
    }
    if (voluntary || id === 'foe') options.push({ move: 'cancel', label: id === 'foe' ? '改日再战' : '返回' });
    const stats = [];
    let arts = [];
    if (info?.foe && info.Q > 0) {
      const scale = value => value * (info.scale || 1);
      const chance = () => {
        const updated = describe(st, id, args);
        if (!updated || !(updated.Q > 0)) return null;
        return updated.p ?? L.duelP(st, scale(L.duelPower(st, updated.foe)), updated.Q, updated.foe);
      };
      const p = info.p ?? L.duelP(st, scale(L.duelPower(st, info.foe)), info.Q, info.foe);
      stats.push('战力 ' + L.fmt(info.S ?? scale(L.duelPower(st, info.foe))) + ' 对 ' + L.fmt(info.Q),
        (id === 'tour' ? '预计胜算 ' : '胜算 ') + L.pct(p));
      if (info.q) stats.push('对手第 ' + info.q + ' 名');
      if (info.scale > 1) stats.push('助力 ×' + info.scale.toFixed(2));
      if (info.news) stats.push('对手曾拍得【' + info.news + '】');
      if (info.quote) stats.push('「' + info.quote + '」');
      if (L.artSlotOpen(st, 1)) {
        const current = L.artSlots(st)[1];
        const recommendation = L.duelArtBest(st, info.foe, info.Q, scale)?.id;
        arts = L.artList(st, 1).map(item => {
          const forecast = L.artTry(st, item.id, chance);
          return {
            id: item.id, selected: current === item.id, recommended: item.id === recommendation && item.id !== current,
            label: item.A.n + ' · ' + L.elName(item.A.el) + ' · ' + (forecast === null ? '待匹配' : L.pct(forecast)),
          };
        });
      }
    }
    return { kind: 'duel-prep', fight: id,
      title, opponent: info?.n || '', text: stats.join('\n') || (id === 'tour' ? '登台后将按天骄榜与战力匹配对手。' : ''),
      arts, options };
  }

  function result(st, id, out) {
    if (!out) return null;
    const title = (id === 'final' ? { war: '讨回山门', heir: '圣子之战' }[out.final] : '') || titles[id];
    const lines = [];
    if (out.rounds) {
      for (const [i, round] of out.rounds.entries()) {
        const name = round.rv?.n || round.foe?.n || '对手';
        const rewards = round.stones ? ' · 灵石 +' + L.fmt(round.stones) : '';
        lines.push('第 ' + (i + 1) + ' 场 · ' + name + ' · ' + (round.win ? '胜' : '负') + rewards);
      }
      if (out.hold) lines.push(out.hold.n + '暂未应战 · ' + out.hold.need);
      if (id === 'tour') lines.push('天骄榜第 ' + out.startRank + ' 名 → 第 ' + out.endRank + ' 名');
      else lines.push('宗门第 ' + out.start + ' 名 → 第 ' + out.end + ' 名');
    } else if (out.how === 'teach') lines.push('你指点了' + out.n + '。他抱拳道谢，将来会托人送礼。');
    else if (out.win !== undefined) {
      lines.push([out.n, out.win ? '取胜' : '落败'].filter(Boolean).join(' · '));
      if (out.rank1 && out.rank0 !== out.rank1) lines.push('天骄榜第 ' + out.rank0 + ' 名 → 第 ' + out.rank1 + ' 名');
      if (out.stones) lines.push('灵石 +' + L.fmt(out.stones));
      if (out.contrib) lines.push('宗门贡献 +' + L.fmt(out.contrib));
      if (out.text) lines.push(out.text);
      if (st.p.inj) lines.push(L.injText(st.p.inj));
    }
    return lines.length ? { kind: 'card', title, text: lines.join('\n'), music: 'battle',
      cineRival: id === 'duel' || id === 'foe' ? out.id || '' : '' } : null;
  }

  return { prep, result };
})();
