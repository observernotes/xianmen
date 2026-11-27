/* The native client schedules rendered storyboards and keeps the original cross-life viewing flags. */
globalThis.XianmenCinematics = (() => {
  'use strict';
  const catalog = globalThis.XianmenCinematicCatalog;
  const visit = 'any:daolv:any|aff:su>=60|aff:ye>=60|aff:chu>=60|aff:ge>=60|aff:bai>=60|aff:mo>=60';
  const rivals = ['zhao', 'chu', 'xue'];

  function describe(st, id, options = {}, perLife = false) {
    let key = id, asset = id;
    if (id === 'pact0' || id === 'pact1' || id === 'pact') {
      const arrival = id === 'pact0' || options.part === 0;
      key = arrival ? 'pact0' : 'pact1';
      id = 'pact';
      asset = 'pact-' + (arrival ? 'arrival' : options.win === false ? 'loss' : 'win');
    } else if (id === 'boss' || id === 'rival') {
      const variant = id === 'boss' ? options.k ?? 0 : options.id;
      asset += '-' + variant;
      key += ':' + variant;
    } else if (id === 'pojing') {
      const realm = Math.max(1, Math.min(8, options.r || 1));
      asset += '-' + realm;
      if (realm > 1) key += ':' + realm;
    } else if (['rzong', 'shoushan', 'end_summit'].includes(id)) {
      asset += '-' + (options.id || st.sect?.id || 'jian');
    } else if (id === 'liaoduan_spared' && st.eflags.vow_letgo) {
      asset += '-letgo';
    } else if (id === 'fangke' && L.storyCond(st, visit)) {
      asset += '-visitor';
    } else if (id === 'end_wentian') {
      const { yun_codex: yun, elder_kept: elder } = st.eflags;
      asset += yun && elder ? '-both' : yun ? '-yun' : elder ? '-elder' : '';
    } else if (id === 'end_dixian') {
      const who = st.daolv || (st.eflags.elder_kept ? 'elder' : '');
      if (who) asset += '-' + who;
    } else if (id === 'end_mozun' && st.daolv === 'ye') {
      asset += '-ye';
    }
    const clip = catalog[asset];
    return clip ? { id, key, asset, perLife, token: (perLife ? 'life:' + st.rebirth + ':' : '') + asset,
      title: clip.title, seconds: clip.seconds, subtitles: clip.subtitles, cues: clip.cues, music: clip.music } : null;
  }

  function seen(st, clip) {
    if (!clip) return true;
    if (clip.perLife) return !!st.flags.mobileEndCine?.[clip.id];
    return !!st.meta.cine?.[clip.key];
  }

  function queue(st, id, options = {}) {
    const clip = describe(st, id, options);
    if (seen(st, clip)) return;
    const pending = Array.isArray(st.cnQ) ? st.cnQ : (st.cnQ = []);
    if (!pending.some(item => item?.key === clip.key)) pending.push({ id, o: options, key: clip.key });
  }

  function pending(st) {
    if (!Array.isArray(st.cnQ)) return null;
    while (st.cnQ.length) {
      const item = st.cnQ[0];
      const clip = item && describe(st, item.id, item.o || {});
      if (!seen(st, clip)) return clip;
      st.cnQ.shift();
    }
    return null;
  }

  function earlier(st, notice) {
    const queued = pending(st);
    if (queued) return queued;
    let clip;
    if (notice?.cine) {
      clip = describe(st, notice.cine);
    } else if (rivals.includes(notice?.cineRival)) {
      clip = describe(st, 'rival', { id: notice.cineRival });
    } else if (notice?.kind === 'life') {
      const ending = notice.mode === 'rest' ? null : L.endingOf(st);
      const primary = describe(st, ending?.cine || 'lunhui', {}, !!ending);
      if (!seen(st, primary)) return primary;
      if (ending?.tags.includes('止戈')) clip = describe(st, 'end_zhige', {}, true);
    } else if (notice?.kind === 'duel-prep') {
      if (notice.fight === 'pact' && !st.pact && !L.pactText(st)) clip = describe(st, 'pact0');
    }
    return seen(st, clip) ? null : clip;
  }

  function later(st, notice) {
    if (!notice?.cineAfter) return null;
    const clip = describe(st, notice.cineAfter);
    return seen(st, clip) ? null : clip;
  }

  function mark(st, clip) {
    const watched = st.meta.cine || (st.meta.cine = {});
    watched[clip.id] = 1;
    watched[clip.key] = 1;
    if (clip.asset === 'pact-loss') watched.pactLose = 1;
    else if (clip.asset === 'pact-win') delete watched.pactLose;
    if (clip.perLife) {
      (st.flags.mobileEndCine ||= {})[clip.id] = 1;
      watched.feisheng = 1;
    }
    (st.meta.mobileCine ||= {})[clip.asset] = 1;
    pending(st);
  }

  function intro() {
    const clip = catalog.tuihun;
    return clip ? { ...clip, asset: 'tuihun', key: 'tuihun', token: 'intro:tuihun' } : null;
  }

  function memories(st) {
    const groups = Object.create(null);
    for (const [asset, clip] of Object.entries(catalog)) (groups[clip.id] ||= []).push(asset);
    const rows = [];
    for (const [id, assets] of Object.entries(groups)) {
      const record = st.meta.cine || {};
      const played = assets.filter(asset => st.meta.mobileCine?.[asset]);
      if (!played.length && record[id]) {
        const matches = assets.filter(asset => record[asset.replace(/^(boss|rival|pojing)-/, '$1:')]);
        if (matches.length) played.push(...matches);
        else if (id === 'pact') {
          if (record.pact0) played.push('pact-arrival');
          if (record.pact1 || !record.pact0) played.push(record.pactLose ? 'pact-loss' : 'pact-win');
        } else {
          const clip = describe(st, id);
          played.push(clip?.asset || assets[0]);
        }
      }
      if (!played.length) continue;
      rows.push({ title: catalog[assets[0]].title, text: '',
        buttons: played.map(asset => {
          const label = asset === 'pact-arrival' ? '赴约' : asset === 'pact-win' ? '胜局' : asset === 'pact-loss' ? '败局' :
            id === 'boss' ? L.BOSSES[Number(asset.slice(5))]?.n : id === 'rival' ? L.rivalName(st, asset.slice(6)) :
            id === 'pojing' ? L.REALMS[Number(asset.slice(7))]?.n : '';
          return { label: '重看' + (label ? ' · ' + label : ''), cine: { ...catalog[asset], asset } };
        }),
      });
    }
    rows.unshift({ title: '已解锁 ' + rows.length + ' / ' + Object.keys(groups).length + ' 段', text: '', buttons: [] });
    return rows;
  }

  return { describe, queue, earlier, later, mark, intro, memories };
})();
