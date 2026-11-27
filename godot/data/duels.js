/* Native preparation screens delegate opponent selection and resolution to the shared rules. */
globalThis.XianmenDuels = (() => {
  'use strict';
  const titles = {
    pact: '三年之约', tour: '天骄论道', meet: '九宗会武', war: '天剑来犯',
    rookie: '新秀挑战', foe: '宿敌上门', duel: '下战帖', final: '主线一战',
  };
  function describe(st, id, args) {
    if (id === 'pact') {
      const story = L.pactText(st);
      return { ...L.pactInfo(st), n: story?.who || st.exName, foe: L.PACT_FOE, scale: L.pactAssist(st), story };
    }
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
    let title = info?.story?.title || titles[id];
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
      if (info.story) stats.push(info.story.intro, info.story.quote);
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
    const pact = id === 'pact' ? L.pactText(st) : null;
    const title = pact?.title || (id === 'final' ? { war: '讨回山门', heir: '圣子之战' }[out.final] : '') || titles[id];
    const lines = [];
    if (out.rounds) {
      for (const [i, round] of out.rounds.entries()) {
        const name = round.rv?.n || round.foe?.n || '对手';
        const rewards = round.stones ? ' · 灵石 +' + L.fmt(round.stones) : '';
        lines.push('第 ' + (i + 1) + ' 场 · ' + name + ' · ' + (round.win ? '胜' : '负') + rewards);
        if (round.trio) lines.push(round.trio.map(bout => bout.n + (bout.win ? ' 胜' : ' 负')).join(' · '));
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
      if (pact) lines.push(out.win ? pact.win : pact.lose);
      if (out.text) lines.push(out.text);
      if (st.p.inj) lines.push(L.injText(st.p.inj));
    }
    return lines.length ? { kind: 'card', title, text: lines.join('\n'), music: 'battle',
      cineRival: id === 'duel' || id === 'foe' ? out.id || '' : '' } : null;
  }

  const avatar = (realm, f) => 'me-' + (Math.min(9, realm) * 2 + Number(!!f));
  const rivalActor = { mu: 'mu', zhao: 'zhao', chu: 'tian', xue: 'xue', yun: 'yun' };
  const guest = name => 'guest-' + (Array.from(name).reduce((h, ch) => (Math.imul(h, 31) + ch.codePointAt(0)) >>> 0, 7) % 24);

  function arena(st, id, out, event) {
    if (!out) return null;
    const bouts = [];
    const sectStage = st.sect?.id === 'xuesha' ? 'sect_mo' : 'sect';
    const hero = avatar(st.p.r, st.p.look.f);
    const player = { name: st.p.name, actor: hero, face: hero + '|ang|' };
    function add(round, foe, name, stage, label = '', left = player, short = false) {
      if (typeof round.win !== 'boolean') return;
      const rival = foe?.kind === 'rival' ? foe.id : '';
      const heir = foe?.kind === 'heir' && L.SECT_HEIR[foe.sect];
      const portrait = rivalActor[rival] || heir?.img || foe?.portrait || '';
      const alternate = st.p.look.f && (rival === 'mu' || heir?.nf);
      const actor = portrait ? portrait + (alternate ? '-alt' : '') :
        foe?.kind === 'sect' ? 'nine-' + foe.id : foe?.kind === 'war' ? 'war' : guest(name);
      const element = L.foeEl(foe) || '';
      bouts.push({
        stage, label, win: round.win, short, rival: rival || '',
        chance: Number.isFinite(round.p) ? round.p : 0.5,
        left: { ...left, power: L.fmt(round.S || out.S || L.power(st)),
          el: left === player ? L.atkEl(st, element) || L.art(L.artSlots(st)[0])?.el || '' : '' },
        right: { name, actor, face: portrait ? actor + '|ang|' : '', el: element, power: L.fmt(round.Q || round.P || 0) },
      });
    }
    if (id === 'tour') {
      for (const [i, round] of out.rounds.entries()) {
        add(round, round.rv?.id && { kind: 'rival', id: round.rv.id }, round.rv?.n || '论道对手', 'cloud', '第 ' + (i + 1) + ' 场');
      }
    } else if (id === 'meet') {
      for (const [i, round] of out.rounds.entries()) {
        const foe = { kind: 'sect', id: round.foe.id };
        const stage = foe.id === 'xuesha' ? 'sect_mo' : sectStage;
        const label = '第 ' + (i + 1) + ' 场 · ' + round.foe.n;
        if (!round.trio) add(round, foe, round.foe.champ, stage, label);
        else for (const [j, bout] of round.trio.entries()) {
          const disciple = bout.who === 'disc' && L.discByU(st, bout.u);
          const left = disciple ? { name: bout.n, actor: avatar(L.discRealm(disciple), disciple.f), face: '' } : player;
          add(bout, j === 0 ? foe : { el: L.foeEl(foe) }, j === 0 ? round.foe.champ : round.foe.n + '门下',
            stage, label + ' · 第 ' + (j + 1) + ' 局', left, true);
        }
      }
    } else if (id === 'pact') {
      const pact = L.pactText(st);
      add(out, pact ? { portrait: pact.img, el: L.foeEl(L.PACT_FOE) } : L.PACT_FOE, pact?.who || st.exName, 'town');
    } else if (id === 'war' || out.final === 'war') {
      add(out, { kind: 'war' }, out.lead?.n || '天剑宗长老团', st.sect ? 'sect_mo' : 'wild');
    } else if (out.final === 'heir' || id === 'promote' && out.duel) {
      add(out.duel || out, { kind: 'heir', sect: st.sect.id }, L.heirName(st), sectStage);
    } else if (id === 'duel' || id === 'foe') {
      add(out, out.id && { kind: 'rival', id: out.id }, out.n || '天骄榜对手', 'cloud');
    } else if (id === 'rookie' && out.how !== 'teach') {
      add(out, { el: out.el }, out.n || '新秀', 'cloud');
    } else if (event && out.duel) {
      const { duel } = out;
      const name = duel.n || (duel.foe?.kind === 'rival' ? L.rivalName(st, duel.foe.id) : '对手');
      add(duel, duel.foe, name, st.exp || st.run ? 'wild' : st.sect ? sectStage : 'town');
    }
    return bouts.length ? {
      title: event ? L.fill(st, event.title) : id === 'pact' ? L.pactText(st)?.title || titles.pact :
        id === 'promote' || out.final === 'heir' ? '圣子之争' : out.final === 'war' ? '讨回山门' : titles[id],
      index: 0, bouts,
    } : null;
  }

  return { prep, result, arena };
})();
