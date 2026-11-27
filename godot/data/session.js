/* Native client boundary. The simulation and authored events use the same modules as the HTML release. */
(() => {
  'use strict';
  let state = null;
  let encounter = null;
  let openEvent = null;
  let preparedDuel = null;
  let arena = null;
  let note = null;
  let panel = null;
  let battle = null;
  let boss = null;
  let battleInputs = [];
  let battleLog = '';
  let battleEffects = [];
  let breakthrough = null;
  let rebirth = null;
  let returnToGate = false;

  const fmt = L.fmt;
  const fill = value => L.fill(state, value);
  const speakers = { elder: '老祖', tian: '楚天阔', tianheng: '陆天衡', jian: '凌虚子', dan: '丹云婆婆', dao: '玄微子', teaman: '卖茶翁', xuehe: '血河老祖' };

  const heroArt = () => Math.min(9, state.p.r) * 2 + Number(!!state.p.look.f);
  const battleOptionsOpen = () => !!state.pact || state.rebirth > 0;
  const autoUltimate = () => battleOptionsOpen() && !!state.flags.autoUlt;
  const firstTripPanel = 'trip:0:0:0';

  function syncGuide() {
    const saved = state.guide;
    if (saved?.done || state.rebirth > 0 || state.tick > 0) {
      if (!saved?.done) state.guide = { step: 4, done: true };
      return;
    }
    const travelling = state.exp || state.stats.exp > 0;
    const step = travelling ? 3 : panel === firstTripPanel ? 2 :
      Number.isInteger(saved?.step) && saved.step >= 0 && saved.step <= 2 ? saved.step : 0;
    if (saved?.step !== step || saved.done !== false) state.guide = { step, done: false };
  }

  function guideView() {
    if (state.guide.done) {
      return !state.hintSeen?.ready && L.isReady(state)
        ? { target: 'breakthrough', text: '修为圆满，点【突破】。' } : null;
    }
    const { step } = state.guide;
    if (step === 0) return { step, target: 'trip', text: '光坐着赢不了，点【历练】。' };
    if (step === 1) return { step, target: 'region', text: '点【' + L.REGIONS[0].n + '】。' };
    if (step === 2) return panel === firstTripPanel ?
      { step, target: 'depart', text: '点【出发】，当场打完。' } :
      { step, target: 'prepare', text: '选外围斩妖，打开出发准备。' };
    return { step, target: 'season', text: L.apLeft(state) > 0
      ? '剩 ' + L.apLeft(state) + ' 点自动打坐，点下一季。' : '行动点用完了，点下一季。' };
  }

  function tripProgress() {
    const trip = state.exp;
    if (!trip) return null;
    const loot = L.expPreview(state);
    return {
      done: trip.nodes ? trip.ni : trip.total - trip.left, total: trip.total,
      nodes: (trip.nodes || []).map(node => ({ label: L.NODE_N[node.t] || '', elite: ['elite', 'boss'].includes(node.t) })),
      text: ['灵石 +' + fmt(loot.stones), '灵草 +' + fmt(loot.herbs), loot.ore ? '灵矿 +' + fmt(loot.ore) : '', loot.finds ? '宝物 ' + loot.finds + ' 件' : ''].filter(Boolean).join(' · '),
    };
  }

  function battlePacing() {
    if (battle.done) return { delay: boss ? 1050 : 650 };
    const canUlt = battle.rage >= 100;
    const seen = state.flags.btSeen || {};
    const charging = battle.foes.some(foe => foe.hp > 0 && foe.charge);
    if (canUlt && !autoUltimate()) {
      if (!seen.rage) return { delay: -1, hint: '怒气满了，可以释放绝招。' };
      if (charging) return { delay: battleOptionsOpen() ? 2500 : -1, hint: '敌人在蓄力，绝招可以打断重击。' };
    }
    if (battle.round === 0 && !seen.shield && battle.foes.some(foe => foe.sh > 0)) {
      return { delay: 2600, hint: '用五行克制的招式可以削掉护罩。' };
    }
    if (battle.round === 0) {
      return { delay: !boss && L.tripSeq(state) === 1 && state.exp.ni === 0 ? 900 : 500 };
    }
    if (charging && !seen.charge) return { delay: 2600, hint: '敌人正在蓄力。' };
    return { delay: 1000 };
  }

  function face(who, mood = 'n', fx = []) {
    if (who === 'me') who = 'me-' + heroArt();
    if (['mu', 'su', 'ye'].includes(who) && state.p.look.f) who += '-alt';
    if (who === 'elder' && state.eflags.st_farewell && !fx.includes('fade')) fx.push('fade');
    return [who, mood, fx.join(' ')].join('|');
  }

  function dialogue(script, event, scene, music) {
    const lines = [];
    const stage = { scene, music, left: '', right: '' };
    flatten(script);
    return lines;

    function flatten(instructions, echo = '') {
      for (const instruction of instructions || []) {
        if (Array.isArray(instruction)) {
          const [speaker, expression, alias] = instruction[0].split(':');
          const [mood, ...fx] = (expression || 'n').split('+');
          const name = speaker === '?' ? expression : alias || (speaker === 'me' ? state.p.name :
            speaker === 'mu' ? state.exName : speakers[speaker] || (L.NPCS[speaker] ? L.npcName(state, speaker)
              : L.RIVAL_INFO[speaker] ? L.rivalName(state, speaker) : speaker === 'nar' ? '' : speaker));
          if (speaker === 'me') stage.left = face(speaker, mood, fx);
          else if (speaker !== 'nar') {
            stage.left ||= face('me');
            stage.right = speaker === '?' ? '' : face(speaker, mood, fx);
          }
          if (Object.hasOwn(instruction[2] || {}, 'bgm')) stage.music = instruction[2].bgm || '';
          lines.push({ ...stage, speaker: name || '', side: speaker === 'me' ? 'left' : speaker === 'nar' ? '' : 'right',
            text: fill(instruction[1]).replace(/[*|]/g, ''), echo });
          echo = '';
        } else if (instruction.slot && L.storyCond(state, instruction.if)) {
          const cast = L.storySlot(state, event, instruction.slot, instruction.max);
          if (cast.length) for (const member of cast) flatten(member.say, member.echo || echo);
          else flatten(instruction.say, instruction.echo || echo);
        } else if (instruction.say && L.storyCond(state, instruction.if)) {
          flatten(instruction.say, instruction.echo || echo);
        } else if (instruction.pick) {
          const branch = instruction.pick.find(option => L.storyCond(state, option.if));
          if (branch) flatten(branch.say, branch.echo || echo);
        } else if ('black' in instruction) {
          lines.push({ ...stage, speaker: '', text: fill(instruction.black), black: true });
        } else if (instruction.cg) {
          stage.scene = 'cg:' + instruction.cg + ':' + (instruction.f || 0);
        } else if (instruction.scene) {
          stage.scene = instruction.scene;
        } else if ('bgm' in instruction) {
          stage.music = instruction.bgm || '';
        }
      }
    }
  }

  const choiceView = ev => ({
    kind: 'choice',
    key: ev.id,
    title: fill(ev.title),
    text: fill(ev.text || ev.gist),
    scene: ev.scene || '',
    music: ev.bgm || '',
    cine: ev.cine || '',
    dialogue: dialogue(ev.talk, ev.id, ev.scene || 'cave', ev.bgm || 'home'),
    options: ev.choices.flatMap((choice, index) => {
      const gate = L.choiceGate(state, choice);
      const shown = L.choiceShown(state, choice);
      if (!shown && gate.ok) return [];
      const text = [gate.ok ? choice.hint : gate.why, choice.cost && L.costText(state, choice.cost)].filter(Boolean).join(' · ');
      return [{ index, label: fill(choice.t), available: shown && L.costOk(state, choice.cost), text }];
    }),
  });

  function breakthroughView() {
    const active = state.trib?.cur && L.tribView(state);
    const trib = L.tribNeeded(state);
    const sure = active ? active.sure : state.flags.sureBt || (!trib && L.btGuard(state));
    const selection = breakthrough || { pills: 0, aids: {} };
    const aids = trib ? (active ? active.canAdd : ['fa', 'pet', 'daolv', 'zhen']) : [];
    const pillMax = sure ? 0 : active ? active.pillMax : L.btPills(state, true);
    const rate = active ? active.p : trib ? L.tribRate(state, selection) : L.btRate(state, selection.pills);
    return {
      kind: 'breakthrough', title: active ? '天劫暂歇' : state.p.r === L.MAXR ? '飞升天劫' : '境界突破',
      text: active ? '第 ' + active.pauseAfter + ' / ' + active.N + ' 道雷已落。\n' + active.hint.text
        : '冲击' + (state.p.r === L.MAXR ? '飞升' : L.REALMS[state.p.r + 1].n) + ' · 成功率 ' + L.pct(rate),
      shield: active ? active.shield * 100 : null, active: !!active, trib,
      pills: Math.min(selection.pills, pillMax), pillMax,
      aids: sure ? [] : aids.map(key => {
        const info = L.aidInfo(state, key);
        return { key, text: info.n + ' +' + L.pct(info.v), why: info.ok ? '' : info.why, cost: info.cost, selected: !!selection.aids[key] };
      }),
    };
  }

  function finishBreakthrough(result) {
    if (!result) throw new Error('此刻无法突破');
    breakthrough = null;
    const lines = [result.ok ? L.stageName(state.p) : '这次未能突破'];
    if (result.tb?.grade) lines.push('渡劫评价 · ' + result.tb.grade);
    if (result.dan) lines.push(result.dan);
    if (result.daoji?.add) lines.push('道基 +' + L.pct(result.daoji.add));
    lines.push(...(result.tb?.costs || []));
    note = { kind: 'card', title: result.ok ? '突破成功' : '突破失败', text: lines.join('\n') };
    if (result.ok && result.to <= L.MAXR) {
      if (result.to === 2 && result.tb) XianmenCinematics.queue(state, 'leijie');
      else XianmenCinematics.queue(state, 'pojing', { r: result.to });
    }
    L.chainOpen(state, 'act');
  }

  const lifeEnded = () => state.p.r <= L.MAXR && (
    L.lifeLeft(state) <= 0 || L.trialOn(state, 'limit') && state.tick >= L.TRIAL_LIMIT
  );

  function ascensionGate() {
    if (state.p.r <= L.MAXR) return null;
    if (returnToGate && state.eflags.asc_stay) return L.eventById('s9_gate_again');
    if (!state.evDone.s9_gate && !L.STORY_ASC.some(flag => state.eflags[flag])) return L.eventById('s9_gate');
    return null;
  }

  function endingView() {
    if (lifeEnded()) return {
      kind: 'life', title: '坐化', text: state.p.name + '止步' + L.stageName(state.p) +
        '，享年 ' + Math.floor(state.p.age) + ' 岁。\n' + L.restLine(state), mode: 'rest', scene: 'end:rest',
    };
    const ending = L.endingOf(state);
    return {
      kind: 'life', title: ending.n, text: [].concat(ending.paras || ending.text || [], L.epilogue(state).map(card => card.who + ' · ' + card.text)).join('\n\n'),
      mode: 'ascend', scene: 'end:' + ending.pic, music: ending.bg === 'hermit' ? 'home' : 'ascend',
    };
  }

  function recordLife() {
    const summary = L.lifeSummary(state);
    const index = state.flags.lifeIdx;
    if (Number.isInteger(index) && state.lives[index]) state.lives[index] = summary;
    else state.flags.lifeIdx = state.lives.push(summary) - 1;
  }

  function rebirthView() {
    if (!rebirth) rebirth = {
      cards: L.rebirthCards(state, L.rebirthCardN(state)),
      origin: L.originOpen(state, state.origin) ? state.origin : 'qitu',
      trials: (state.trials || []).slice(), card: 0,
    };
    const candidates = L.legacyCands(state);
    const legacy = state.meta.legacy || {};
    const gearMatch = item => legacy.gear?.slot === item.slot && legacy.gear?.aff === item.aff;
    return {
      kind: 'rebirth', title: '轮回殿',
      text: '本世道果 +' + fmt(state.settle.total) + ' · 余额 ' + fmt(L.daoguo(state)),
      cards: rebirth.cards.map((card, index) => ({
        label: L.TALENTS[card.t].n + ' · ' + L.TRAITS[card.tr[0]].n, index, selected: rebirth.card === index,
      })),
      origins: L.ORIGIN_IDS.filter(id => L.originOpen(state, id)).map(id => ({ id, label: L.ORIGINS[id].n, selected: rebirth.origin === id })),
      trials: L.TRIALS.map(trial => ({ id: trial.id, label: trial.n, text: trial.d, selected: rebirth.trials.includes(trial.id) })),
      hall: L.HALL.map(item => ({
        id: item.id, label: item.n, text: item.d, why: L.hallWhy(state, item.id), cost: fmt(L.hallCost(state, item.id)),
      })),
      legacy: [
        ...candidates.arts.map(item => ({ move: 'legacy-art', id: item.id, label: '功法 · ' + item.n, selected: !!legacy.arts?.includes(item.id) })),
        ...candidates.gear.map((item, index) => ({ move: 'legacy-gear', id: index, label: '器灵 · ' + item.n + ' · ' + item.an, selected: gearMatch(item) })),
        ...candidates.pets.map(item => ({ move: 'legacy-pet', id: item.sp, label: '血脉 · ' + item.n, selected: legacy.pet === item.sp })),
      ],
    };
  }

  function lootCardView(block, card, index) {
    if (!block.revealed?.includes(index)) return { index, revealed: false, shiny: card.stars > 0 };
    const { item, kind, tier, el } = card;
    const display = { index, revealed: true, tier: tier || 1, stars: card.stars || 0,
      name: card.name + (card.n > 1 ? ' ×' + card.n : ''), wish: !!card.wish };
    if (kind === 'gear' && item?.gear) {
      const gear = item.gear;
      const base = L.gearBase(gear.id);
      display.icon = base?.boss !== undefined ? 'boss:' + base.boss :
        gear.slot + ':' + tier + (gear.slot === 'o' ? ':' + base?.kind : '');
      display.detail = [el ? L.elName(el) : '', ...(gear.aff || []).map(id => L.AFFIX[id]?.n),
        L.GOLD_AFFIX[gear.gold]?.n].filter(Boolean).join(' · ');
      const pending = L.gearPend(state, item.u);
      const equipped = state.gear[gear.slot]?.u === item.u;
      const decision = block.lootDecisions?.[index];
      if (decision) display.status = decision;
      else if (equipped) display.status = '已装备';
      else if (item.smelt !== undefined) display.status = '已熔炼 · 灵矿 +' + fmt(item.smelt);
      else if (item.hold) display.status = '已收下，栏位解锁后自动装备';
      else if (pending) {
        const delta = L.gearDelta(state, pending);
        display.compare = {
          better: delta.better, smelt: fmt(delta.smelt),
          text: '战力 ' + fmt(delta.a.p) + ' → ' + fmt(delta.b.p) +
            (delta.inh[1] ? ' · 装备后强化 +' + delta.inh[1] : ''),
          replacement: delta.smeltCur ? '换上后旧装熔成灵矿 +' + fmt(delta.smeltCur) : '',
        };
      }
    } else if (kind === 'art' || kind === 'frag') {
      display.icon = 'a:' + tier;
      if (item) display.status = item.frag && !item.fragDone ? '残篇 ' + item.frag + ' / 3' :
        item.dup ? '已学会 · 熟练 +' + item.mastery : item.equip ? '已装配' : '已收入功法';
    } else if (kind === 'plan') {
      display.icon = 'gscroll';
      display.status = item?.text;
    } else {
      const icons = { ore: 'ore', herb: 'herb', pill: 'pojing', treasure: 'treasure', rune: 'rune', mat: 'treasure' };
      display.icon = kind === 'core' ? 'core:' + el : icons[kind] || 'stone';
    }
    return display;
  }

  function decideLoot(block, index, move) {
    const card = Number.isInteger(index) && block.data.cards?.[index];
    if (!card || card.kind !== 'gear' || !block.revealed?.includes(index) || block.lootDecisions?.[index] ||
        !['equip', 'keep', 'smelt'].includes(move)) throw new Error('这张牌无法进行该操作');
    if (!L.gearPend(state, card.item?.u)) throw new Error('这件法宝已处理');
    let status = '已收进法宝页的「新到」';
    if (move !== 'keep') {
      const result = L.gearDecide(state, card.item.u, move);
      if (!result) throw new Error('这件法宝已处理');
      const stars = move === 'equip' ? result.prev?.star : result.x.star;
      status = move === 'equip' ? '已换上' + (result.prev ? ' · 旧装熔炼 +' + fmt(result.smelt) + ' 灵矿' : '') :
        '已熔炼 · 灵矿 +' + fmt(result.smelt);
      if (stars) status += ' · 器纹石 +' + stars;
    }
    (block.lootDecisions ||= {})[index] = status;
    return { lootDecision: move };
  }

  function blockView(block) {
    const data = block.data || {};
    if (block.kind === 'story' && data.choices) return choiceView(data);
    if (block.kind === 'season' || block.kind === 'year') {
      const report = L.seasonReport(state, data);
      if (block.kind === 'year' && L.yearDue(state)) {
        const year = L.yearReport(state);
        const lines = [
          '境界 ' + year.realm.join(' → '),
          '战力 ' + year.pw.map(fmt).join(' → '),
          '灵石收入 ' + fmt(year.earn) + ' · 花费 ' + fmt(year.spend),
          '历练 ' + year.exp + ' 趟' + (year.bestT ? ' · 最好 ' + year.bestT : ''),
          ...(year.rank ? ['天骄榜 ' + year.rank.join(' → ')] : []),
          year.say,
        ];
        return { kind: 'card', title: '第 ' + year.y + ' 年 · 年报', text: lines.join('\n'), button: report.btn };
      }
      return { kind: 'card', title: report.title, text: report.lines.join('\n'), button: report.btn };
    }
    if (block.kind === 'result') {
      const name = { exp: '历练归来', sweep: '扫荡归来', retreat: '闭关出关', train: '老祖特训', sit: '打坐', boss: '首领战', duel: '天骄对决', final: '主线一战', deeper: '趁势深入' };
      if (block.id === 'duel' || block.id === 'final') {
        const result = XianmenDuels.result(state, block.id, data);
        if (result) return result;
      }
      const lines = [];
      if (data.rating !== undefined) lines.push('评价：' + L.RATINGS[data.rating]);
      if (data.bt?.nf) {
        const b = data.bt;
        lines.push('取胜 ' + b.won + ' / ' + b.nf + ' 场 · 气血 ' + L.pct(b.hp || 0) + (b.brk ? ' · 破招 ' + b.brk + ' 次' : ''));
      }
      if (data.win !== undefined) lines.push(data.win ? '取胜' : '落败');
      const rewards = [
        ['灵石', data.stones], ['修为', data.xp || data.got], ['灵草', data.herbs],
        ['灵矿', data.ore], ['破境丹', data.pills], ['天材地宝', data.treasure],
        ['宗门贡献', data.contrib], ['返还行动点', data.refund],
      ];
      lines.push(...rewards.filter(([, value]) => value > 0).map(([label, value]) => label + ' +' + fmt(value)));
      if (data.inj) lines.push(L.injText(data.inj));
      lines.push(...(data.unlock || []));
      if (data.note) lines.push(data.note);
      const expedition = ['exp', 'sweep', 'deeper'].includes(block.id);
      if (expedition && Number.isFinite(data.pw0)) {
        const goal = L.goalNow(state);
        const due = L.timeBar(state).big;
        lines.push('战力 ' + fmt(data.pw0) + ' → ' + fmt(L.power(state)), '离目标 · ' + goal.bar.text);
        if (due) lines.push(due.n + (due.seasons <= 1 ? ' · 本季末' : ' · 还有 ' + due.seasons + ' 季'));
      }
      const cards = (data.cards || []).map((card, index) => lootCardView(block, card, index));
      if (data.trip?.deeper === 'lose' && data.deeperLost?.length) {
        lines.push('深入失利 · 遗失 ' + data.deeperLost.join('、'));
      }
      const deeper = deeperWhy(block);
      return { kind: 'card', title: name[block.id] || '行动结算', text: lines.join('\n'), cards,
        button: expedition ? '回洞府' : undefined,
        wishAgain: expedition && cards.some(card => card.wish),
        deeper: deeper === null ? null : { why: deeper, ap: L.AP.deeper } };
    }
    if (block.kind === 'big') {
      const prep = XianmenDuels.prep(state, block.id, block.id === 'foe' ? { id: block.data?.data } : undefined);
      if (prep) return prep;
      const title = { pact: '三年之约', tour: '天骄论道', meet: '九宗会武', war: '天剑来犯', rookie: '新秀挑战', death: '寿元已尽' };
      return { kind: 'card', title: title[block.id] || '仙途大事', button: '继续 ▸' };
    }
    if (block.kind === 'chapter') return {
      kind: 'card', key: block.id, title: data.chN + ' · ' + data.n + ' · 完',
      scene: 'chapter', music: 'epic',
      button: data.next ? '开始' + data.next.chN + ' ▸' : '继续 ▸',
      text: [
        '历时 ' + Math.ceil(data.months / 3) + ' 季 · 历练 ' + data.exp + ' 趟',
        '战力 ' + fmt(data.pw0) + ' → ' + fmt(data.pw1),
        data.bestT ? '最佳历练评价 · ' + data.bestT : '',
        data.next ? data.next.chN + ' · ' + data.next.n + '\n' + data.next.goal : '',
        data.next?.toOpen ? '本章将开放 ' + data.next.toOpen + ' 项功能' : '',
        data.next?.rw ? '主线奖励 · ' + data.next.rw : '',
      ].filter(Boolean).join('\n'),
    };
    if (block.kind === 'unlock') {
      const guide = XianmenPlayerPanels.unlock(block.id);
      return { kind: 'card', title: '解锁 · ' + (L.ONB_K[block.id]?.n || '新功能'),
        text: [guide?.[1], L.ONB_K[block.id]?.goal].filter(Boolean).join('\n'),
        unlockLink: !!guide, icon: guide?.[2], button: '知道了' };
    }
    return { kind: 'card', title: '仙途' };
  }

  function deeperWhy(block) {
    if (block.kind !== 'result' || block.id !== 'exp' || block.data.first ||
        block.data.cards?.deeper || !L.deeperOk(state, L.tripOf(block.data))) return null;
    return L.apWhy(state, 'deeper', { res: block.data });
  }

  function nextView() {
    if (note) return note;
    if (state.settle) return rebirthView();
    if (preparedDuel) return XianmenDuels.prep(state, preparedDuel.id, preparedDuel.args);
    if (state.trib?.cur || breakthrough) {
      const pre = breakthrough?.pre && L.eventById(breakthrough.pre);
      return pre ? choiceView(pre) : breakthroughView();
    }
    if (encounter) {
      const ev = L.eventById(encounter);
      if (ev) return choiceView(ev);
      encounter = null;
    }
    if (state.run) return realmView();
    if (battle) {
      const region = boss ? boss.k : state.exp.k;
      return {
        kind: 'battle', title: boss ? L.BOSSES[boss.k].n : '历练交手', round: Math.max(1, battle.round + Number(!battle.done)),
        region, location: L.REGIONS[region].n + (boss ? '' : ' · ' + L.DEPTHS[state.exp.d]), hero: heroArt(),
        boss: !!boss, done: !!battle.done, effects: battleEffects, trip: tripProgress(),
        outcome: battle.done ? battle.win ? '取胜' : battle.fled ? '撤退' : '落败' : '',
        hp: Math.max(0, Math.ceil(battle.hp)), maxHp: Math.ceil(battle.max), rage: Math.floor(battle.rage),
        foeCount: battle.foes.length,
        foes: battle.foes.flatMap((foe, index) => foe.hp > 0 || battleEffects.some(effect => effect.target === index || effect.source === index) ? [{
          id: foe.id, index, element: foe.el, name: foe.n, hp: Math.max(0, Math.ceil(foe.hp)),
          maxHp: Math.ceil(foe.max), shield: foe.sh, shieldMax: foe.shMax, aura: !!foe.aura, elite: foe.kind !== 'mob', charge: !!foe.charge,
        }] : []),
        ultimate: battle.me.ult.n, ultElement: battle.me.ult.el, canUlt: battle.rage >= 100, pills: battle.pillUsed ? 0 : battle.pills,
        skills: battle.me.skills.map(skill => ({
          id: skill.id, kind: skill.kind, element: skill.el || '', name: skill.n, plus: !!skill.plus,
          cooldown: Math.max(0, battle.cds[skill.id] || 0),
        })),
        settingsOpen: battleOptionsOpen(), autoUlt: autoUltimate(), ...battlePacing(),
        text: battleLog || battle.momText,
      };
    }
    if (state.exp) {
      const trip = state.exp;
      const node = trip.nodes?.[trip.ni];
      const delay = !node ? 0 : L.nodeIsFight(node) || node.t === 'home' ? 1500 : 2400;
      return { kind: 'travel', title: L.REGIONS[trip.k].n, region: trip.k, location: L.REGIONS[trip.k].n + ' · ' + L.DEPTHS[trip.d], hero: heroArt(),
        delay, settingsOpen: battleOptionsOpen(), trip: tripProgress(), button: '继续历练 ▸' };
    }
    if (state.gear.rf) {
      const { old, neu, pity } = state.gear.rf;
      return { kind: 'reforge', title: '洗练结果', old: L.gearAffText(old), replacement: L.gearAffText(neu), pity };
    }
    if (openEvent) {
      const ev = currentLocalEvent();
      if (ev) return {
        ...choiceView(ev), dismiss: openEvent === 'market' ? '略过此事' : '稍后再见',
        gifts: openEvent === 'visitor' && L.PPL.includes(ev.npc) && !L.pgiftWhy(state, ev.npc),
      };
      openEvent = null;
    }
    for (let i = 0; i < 12; i++) {
      const block = L.nextBlock(state);
      if (!block) break;
      if (block.kind === 'big' && block.id === 'death' && lifeEnded()) return endingView();
      if (block.kind === 'story' && !block.data) { L.blockDone(state, block); continue; }
      if (block.kind !== 'act') return blockView(block);
      const result = L.blockRun(state, block);
      if (result) arena = XianmenDuels.arena(state, block.id, result);
      L.blockDone(state, block);
    }
    if (lifeEnded()) return endingView();
    const gate = ascensionGate();
    if (gate) return choiceView(gate);
    if (state.p.r > L.MAXR && !state.flags.endRead) return endingView();
    return null;
  }

  const currentLocalEvent = () => openEvent === 'visitor' ? L.visitorEvent(state)
    : openEvent === 'market' ? L.marketEvent(state)
      : typeof openEvent === 'string' && openEvent.startsWith('mail:') ? L.eventById(openEvent.slice(5)) : null;

  function realmView() {
    const run = state.run;
    const event = L.mjEventNow(state);
    if (event) return choiceView(event);
    const theme = L.mjTheme(run.theme);
    const options = [];
    const add = (label, move, index, why = '') => options.push({ label, move, index, why });
    if (run.phase === 'door') {
      const recommended = L.mjDoorRec(state);
      run.doors.forEach((door, index) => {
        const kind = L.mjDoorShown(door);
        const name = kind === 'unk' ? '未知之门' : L.MJ_ROOM[kind].n;
        const hp = L.mjDoorEst(state, door).hp;
        const hint = L.mjFight(kind) ? (hp ? String(hp) : '无伤') : kind === 'spring' ? '+' + hp : '';
        options.push({ label: name, move: 'door', index, why: '', art: kind, hint,
          recommended: index === recommended && run.doors.length > 1, danger: -hp >= run.hp });
      });
      if (L.mjCanLeave(state)) add('带着 ' + L.mjLootN(state) + ' 件收获离开', 'leave', -1);
    } else if (run.phase === 'shop') {
      run.shop.forEach((item, index) => {
        options.push({ label: item.n + ' · ' + fmt(item.price) + ' 灵石', move: 'shop', index,
          why: L.mjShopWhy(state, index), detail: item.d });
      });
      add('继续前行', 'shop', -1);
    } else if (run.phase === 'chest') {
      run.chest.forEach((item, index) => add(item.n, 'chest', index));
    }
    return {
      kind: 'realm', title: run.xf ? '仙府' : theme.n + '秘境',
      text: '第 ' + run.floor + ' / ' + run.floors + ' 层 · 收获 ' + L.mjLootN(state) + ' 项',
      theme: theme.art, phase: run.phase, hero: heroArt(),
      stones: run.phase === 'shop' ? fmt(L.mjPending(state).stones) : '',
      hp: run.hp, maxHp: run.max, options,
    };
  }

  function realmSummary(sum) {
    const theme = L.mjTheme(sum.theme);
    const title = (sum.xf ? '仙府' : theme.n + '秘境') + ' · ' +
      { clear: '通关', leave: '安然归来', wipe: '重伤出局' }[sum.how];
    const lines = [
      '已通过 ' + sum.deep + ' / ' + sum.floors + ' 层',
      sum.how === 'wipe' ? '气血耗尽，收获损失六成。' : '',
      sum.inj ? L.injText(sum.inj) : '',
      sum.first ? '首通称号「' + sum.first + '」' : '',
      ...(sum.got?.texts || []), ...(sum.chest?.texts || []),
    ].filter(Boolean);
    return { title, lines };
  }

  function realmEntries() {
    const entries = [];
    if (L.mjUnlocked(state)) entries.push({
      label: L.mjThemeNow(state).n + '秘境', xf: false, ap: L.mjAp(state),
      why: L.apWhy(state, 'realm', { xf: false }),
    });
    if (L.mjXianfu(state)) entries.push({
      label: '仙府', xf: true, ap: L.mjAp(state), why: L.apWhy(state, 'realm', { xf: true }),
    });
    return entries;
  }

  function view(notice) {
    if (!state) return { started: false, introClip: XianmenCinematics.intro() };
    const goal = L.goalNow(state);
    const ap = L.apLeft(state);
    const sweep = notice ? null : L.sweepBest(state);
    const timeline = L.timeBar(state);
    return {
      started: true, name: state.p.name, date: L.dateText(state), realm: L.stageName(state.p),
      stones: fmt(state.stones), power: fmt(L.power(state)), xp: fmt(state.p.xp), xpNeed: fmt(L.pNeed(state.p)),
      ap, apTotal: L.AP.per, canBreak: L.isReady(state),
      idleApXp: !notice && ap > 0 && state.p.r <= L.MAXR ? fmt(L.sitGain(state, ap)) : '',
      canRebirth: state.p.r >= 2, canReturnToGate: !!(state.p.r > L.MAXR && state.eflags.asc_stay),
      ascended: state.p.r > L.MAXR,
      visitor: !notice && L.visitorEvent(state) ? { title: fill(L.visitorEvent(state).title), leave: L.seasonsText(state.visitor.left) } : null,
      goal: goal.t, progress: goal.bar.text, advice: goal.next?.t || '',
      adviceAp: goal.next?.ap || 0, upcoming: !notice ? timeline.big : null,
      homeHud: !notice ? homeHud(goal, timeline) : null,
      mail: !notice ? L.mailCount(state) : 0,
      maps: notice ? [] : L.REGIONS.flatMap((map, k) => L.regionOpen(state, k) ? [{
        k, name: map.n, cells: expeditionCells(k),
        boss: L.bossReady(state, k) ? { name: L.BOSSES[k].n, why: L.apWhy(state, 'boss', { k }) } : null,
        drops: L.DEPTHS.flatMap((title, d) => L.APPR.some((_, a) => L.expOpen(state, k, d, a)) ? [{
          d, title, items: L.dropTable(state, k, d).map(item => ({
            index: item.i, title: item.n, text: item.d + ' · ' + item.who, pinned: item.wish,
          })),
        }] : []),
      }] : []),
      wishOpen: !notice && L.wishOpen(state),
      sweep: sweep ? {
        title: L.REGIONS[sweep.k].n + ' · ' + L.DEPTHS[sweep.d],
        stones: fmt(sweep.f.stones), args: [sweep.k, sweep.d, sweep.a],
        ap: L.apCost(state, 'sweep', [sweep.k, sweep.d, sweep.a]),
        why: L.apWhy(state, 'sweep', [sweep.k, sweep.d, sweep.a]),
      } : null,
      wish: !notice && L.wishInfo(state) ? L.wishInfo(state) : null,
      guide: guideView(),
      canRetreat: L.retOpen(state),
      array: arrayView(),
      realms: notice ? [] : realmEntries(),
      mainActions: notice ? [] : L.mainActs(state).map(action => ({
        label: action.t, why: action.why || '', available: action.ok && !!action.do, ap: action.ap || 0,
        id: action.do?.id, args: action.do?.args, chance: action.p,
        tripPanel: action.do?.id === 'exp' ? expeditionPanel(action.do.args) : '',
      })),
      panel: panel && !notice ? { id: panel, entries: XianmenPanels.read(state, panel) } : null,
      cinema: earlyCinema(notice),
      cinemaAfter: arena ? null : XianmenCinematics.later(state, notice),
      arena,
      notice,
    };
  }

  function homeHud(goal, timeline) {
    const p = state.p, life = L.lifeMonths(state);
    const needed = L.pNeed(p), ready = L.isReady(state);
    const remaining = p.r <= L.MAXR && !ready ? L.ticksToStage(state, p.r * 4 + 4) : 0;
    const world = L.world(state);
    const buildings = L.homePlots(state).slice(1).filter(id => id && id !== 'field');
    if (buildings.includes('furnace')) {
      buildings.splice(buildings.indexOf('furnace'), 1);
      buildings.unshift('furnace');
    }
    const artSlots = [2, 3, 4, 5, 6, 7, ...(state.home.field ? [] : [1])];
    return {
      season: L.season(state), hero: heroArt(), caveLevel: state.home.cave, arrayLevel: state.home.array,
      injured: p.inj > 0, elderPortrait: face('elder'),
      blocks: buildings.map((id, i) => ({ id, slot: artSlots[i] })),
      crops: state.home.field ? L.plots(state).map(plot => plot.c) : [],
      xpProgress: p.r > L.MAXR ? 1 : p.xp / Math.max(1, needed),
      cultivationHint: ready ? '可以突破了 ▸' : remaining > 0 && Number.isFinite(remaining) ?
        '圆满约 ' + Math.ceil(remaining / 3) + ' 季' : '',
      goalProgress: goal.bar.v / (goal.bar.max || 1), chapter: goal.ch + 1, chapterName: goal.chN,
      pills: L.onbShown(state, 'market') || state.pills > 0 ? state.pills : null,
      life: Number.isFinite(life.m) && life.m < 120 ? '寿元 ' + Math.max(1, Math.floor(life.m / 12)) + ' 年' : life.text,
      lifeLow: life.red, gain: fmt(L.gain(state)), income: fmt(L.income(state)),
      world: world ? L.WORLD[world.id]?.n || '' : '',
      log: state.log[0]?.text || '',
      timeText: timeline.label, timeSlots: timeline.cells.map(cell => cell.s), timeIndex: timeline.cur,
      homeLocked: !L.onbShown(state, 'home'),
      gearLocked: !state.gear.w && !state.gear.pend.length && !L.onbShown(state, 'gearCmp') &&
        !L.onbShown(state, 'arts') && state.stats.exp < 1,
      worldLocked: !state.pact && !['tour', 'market', 'sect', 'bond'].some(id => L.onbShown(state, id)),
      marketFirst: !state.pact && L.onbShown(state, 'market'),
    };
  }

  function earlyCinema(notice) {
    return arena ? XianmenCinematics.rivalIntro(state, arena.bouts[arena.index].rival) :
      XianmenCinematics.earlier(state, notice);
  }

  function expeditionCells(k) {
    const result = [];
    for (let d = 0; d < L.DEPTHS.length; d++) {
      for (let a = 0; a < L.APPR.length; a++) {
        if (!L.expOpen(state, k, d, a)) continue;
        const forecast = L.expForecast(state, k, d, a);
        result.push({
          d, a, label: L.DEPTHS[d] + ' · ' + L.APPR[a].n,
          estimate: forecast.text, stones: fmt(forecast.stones), risk: L.pct(forecast.risk),
          available: !L.apWhy(state, 'exp', [k, d, a]), sweep: !L.apWhy(state, 'sweep', [k, d, a]),
        });
      }
    }
    return result;
  }

  function arrayView() {
    if (!L.homeOpen(state, 'array')) return null;
    const info = L.upInfo(state, 'array');
    return { level: info.lv, cost: fmt(info.cost), available: !info.max && state.stones >= info.cost, max: info.max };
  }

  function snapshot(notice) {
    if (!state) return null;
    const pending = (state._apBlk || []).filter(block => ['result', 'season', 'year'].includes(block.kind));
    const checkpoint = note?.title === '突破成功' ? '突破' :
      pending[0]?.kind === 'year' ? '年报' : pending[0]?.id === 'exp' ? '历练归来' :
      notice?.scene === 'chapter' ? '章末' : '';
    return {
      native: 1, state, note,
      pending,
      chain: { ...L.chainOpenNow(state) },
      battle: battle ? battleInputs : null,
      openEvent,
      preparedDuel,
      arena,
      panel,
      boss,
      breakthrough,
      rebirth,
      returnToGate,
      summary: L.slotHead(state, checkpoint),
    };
  }

  function load(raw) {
    let parsed;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (_) { throw new Error('读不出这份存档'); }
    const native = parsed?.native === 1;
    const candidate = L.migrate(native ? parsed.state : parsed);
    if (!candidate || !Number.isInteger(candidate.p.r) || candidate.p.r < 0 || candidate.p.r > L.MAXR + 1 ||
        !Number.isInteger(candidate.p.s) || !L.STAGES[candidate.p.s]) throw new Error('读不出这份存档');
    state = candidate;
    encounter = state.exp?.encEv && !state.exp.encDone ? state.exp.encEv : null;
    note = native ? parsed.note || null : null;
    breakthrough = native ? parsed.breakthrough || null : null;
    rebirth = native ? parsed.rebirth || null : null;
    returnToGate = native && !!parsed.returnToGate;
    openEvent = native ? parsed.openEvent || null : null;
    preparedDuel = native && ['duel', 'final'].includes(parsed.preparedDuel?.id) ? parsed.preparedDuel : null;
    const savedArena = native && parsed.arena;
    arena = savedArena && Array.isArray(savedArena.bouts) && Number.isInteger(savedArena.index) && savedArena.index >= 0 &&
      savedArena.index < savedArena.bouts.length && savedArena.bouts.every(bout =>
        typeof bout?.win === 'boolean' && typeof bout.left?.actor === 'string' && typeof bout.right?.actor === 'string')
      ? savedArena : null;
    panel = native && XianmenPanels.has(parsed.panel) ? parsed.panel : null;
    syncGuide();
    boss = native && parsed.boss && !L.apWhy(state, 'boss', { k: parsed.boss.k }) ? parsed.boss : null;
    if (native && Array.isArray(parsed.battle)) {
      battle = boss ? L.bossBattle(state, boss.k, { seed: boss.seed }) : L.expBattle(state);
    } else battle = null;
    battleInputs = battle ? parsed.battle : [];
    battleLog = '';
    battleEffects = [];
    if (battle) for (const input of battleInputs) playRound(input);
    if (native && parsed.chain) {
      for (const block of parsed.pending || []) L.blockPush(state, block);
      Object.assign(L.chainOpenNow(state), parsed.chain);
    } else L.chainOpen(state, 'load');
  }

  function resolve(index) {
    if (note) throw new Error('请先完成当前结算');
    const realmEvent = L.mjEventNow(state);
    const localEvent = currentLocalEvent();
    const event = realmEvent || (encounter && L.eventById(encounter)) || localEvent;
    const pre = breakthrough?.pre && L.eventById(breakthrough.pre);
    const gate = ascensionGate();
    const block = !event && !pre && L.nextBlock(state);
    const ev = event || pre || (block?.kind === 'story' && block.data) || (!block && gate);
    if (!ev) throw new Error('没有待选的奇遇');
    const choice = ev.choices[index];
    if (!choice || !L.choiceShown(state, choice) || !L.costOk(state, choice.cost)) throw new Error('目前无法选择这个选项');
    if (block) L.blockDone(state, block);
    const result = L.resolveChoice(state, ev, index);
    if (!result) throw new Error('奇遇未能结算');
    if (pre) {
      delete breakthrough.pre;
      L.tribStart(state, breakthrough);
      breakthrough = null;
    }
    if (ev.id === 's9_gate' || ev.id === 's9_gate_again') {
      returnToGate = false;
      if (ev.id === 's9_gate' && !block) L.storyState(state).beat.c9_climax = state.tick;
      L.checkQuests(state);
      if (ev.id === 's9_gate' || !state.eflags.asc_stay) state.flags.endRead = 0;
    }
    const realmResult = realmEvent ? L.mjAfterEvent(state) : null;
    const realmLines = realmResult?.wipe ? realmSummary(realmResult.wipe).lines :
      (realmResult?.loot || []).map(item => item.t);
    if (event) encounter = null;
    if (localEvent && openEvent !== 'market') openEvent = null;
    const response = choice[result.ok ? 'ok' : 'fail'] || choice.ok;
    note = {
      kind: 'card', key: ev.id + ':result', scene: ev.scene || '',
      music: ev.bgm || '',
      cineAfter: response?.cine?.replace('{daolv}', state.daolv || 'su') || '',
      title: fill(ev.title), text: [fill(result.text), ...result.fx, ...realmLines].filter(Boolean).join('\n'),
      dialogue: dialogue(response?.talk, ev.id, ev.scene || 'cave', ev.bgm || 'home'),
    };
    arena = XianmenDuels.arena(state, 'event', result, ev);
  }

  function playRound(input) {
    const events = L.battleStep(battle, input);
    const attack = events.find(event => event.t === 'ult') || events.find(event => event.t === 'skill') || events.find(event => event.t === 'hit');
    const wound = events.find(event => event.t === 'heavy') || events.find(event => event.t === 'fhit');
    const visible = new Set(['hit', 'skill', 'ult', 'fhit', 'heavy', 'break', 'brk', 'ke', 'beike', 'chain', 'charge', 'dot', 'pill', 'heal', 'dead']);
    battleEffects = Array.from(new Set([attack, wound, ...events])).filter(event => event && visible.has(event.t)).map(event => {
      const fromFoe = event.t === 'heavy' || event.t === 'fhit';
      const actor = Number.isInteger(event.who) ? event.who : -1;
      return {
        kind: event.t, target: fromFoe ? -1 : (event.tgt ?? (event.t === 'hit' ? attack?.tgt ?? 0 : actor)),
        source: fromFoe ? actor : -1,
        amount: event.dmg > 0 ? fmt(event.dmg) : '', el: event.el || '',
        fx: event.fx || '', name: event.n || '', skill: event.id || '', critical: !!event.crit,
      };
    });
    battleLog = events.flatMap(event => {
      if (['hit', 'skill', 'ult', 'heavy'].includes(event.t)) return [(event.n || '重击') + ' ' + fmt(event.dmg || 0)];
      if (event.t === 'break' || event.t === 'brk') return [event.t === 'brk' ? '破招' : '护罩碎裂'];
      if (event.t === 'shield') return ['削罩 ' + event.cut + ' 格'];
      if (event.t === 'ke') return ['五行克制'];
      if (event.t === 'beike') return ['五行被克'];
      if (event.t === 'chain') return ['相生连携'];
      if (event.t === 'pill') return ['服下疗伤丹'];
      if (event.t === 'timeout') return ['久战不下，撤退'];
      if (event.t === 'summon' || event.t === 'charge') return [event.n];
      return [];
    }).join(' · ');
  }

  function finishTripStep(result) {
    const step = L.tripStep(state, result);
    if (step.enc) encounter = step.enc.id;
    if (step.done) {
      const settled = L.tripEnd(state);
      if (settled?.cards?.deeperLost?.length) settled.deeperLost = settled.cards.deeperLost;
    }
  }

  function combat(move) {
    if (!battle) throw new Error('目前没有战斗');
    if (battle.done) throw new Error('请先结算战斗');
    if (!['tick', 'next', 'ult', 'pill', 'flee', 'smart'].includes(move)) throw new Error('未知战斗操作');
    if (move === 'tick' && battlePacing().delay < 0) throw new Error('等待战斗指令');
    if (move === 'ult' && battle.rage < 100) throw new Error('怒气未满');
    if (move === 'pill' && (battle.pillUsed || battle.pills <= 0)) throw new Error('本场无法再服丹');
    if (move === 'smart') {
      L.battleAuto(battle, 'smart');
      if (battle.done) finishCombat();
    } else {
      const seen = state.flags.btSeen ||= {};
      if (battle.rage >= 100 && !autoUltimate()) seen.rage = 1;
      if (battle.foes.some(foe => foe.hp > 0 && foe.charge)) seen.charge = 1;
      if (battle.foes.some(foe => foe.hp > 0 && foe.sh > 0)) seen.shield = 1;
      if (move === 'ult') XianmenCinematics.queue(state, 'ult');
      const input = { ult: move === 'ult' || ((move === 'tick' || move === 'pill') && autoUltimate() && L.btWantUlt(battle, 'auto')),
        pill: move === 'pill', flee: move === 'flee' };
      playRound(input);
      battleInputs.push(input);
    }
  }

  function finishCombat() {
    const result = L.battleResult(battle);
    const target = boss;
    if (target) {
      const first = !state.bosses[target.k];
      if (!L.act(state, 'boss', { k: target.k, res: result })) throw new Error(L.actLastWhy || '首领战未能结算');
      if (first && state.bosses[target.k]) XianmenCinematics.queue(state, 'boss', { k: target.k });
    }
    battle = null;
    boss = null;
    battleInputs = [];
    battleLog = '';
    battleEffects = [];
    if (!target) finishTripStep(result);
  }

  function changeBreakthrough(message) {
    if (nextView()?.kind !== 'breakthrough') throw new Error('目前没有待处理的突破');
    const form = breakthroughView();
    if (!breakthrough) breakthrough = { pills: 0, aids: {} };
    if (message.move === 'pill') {
      breakthrough.pills = Math.max(0, Math.min(form.pillMax, breakthrough.pills + Math.sign(message.step || 0)));
    } else if (message.move === 'aid') {
      if (!form.aids.some(aid => aid.key === message.key && !aid.why)) throw new Error('这项护劫手段不可用');
      breakthrough.aids[message.key] = !breakthrough.aids[message.key];
    } else if (message.move === 'cancel' && !form.active) {
      breakthrough = null;
    } else if (message.move === 'confirm') {
      if (form.active) finishBreakthrough(L.tribFinish(state, { ...breakthrough.aids, pills: breakthrough.pills }));
      else if (form.trib) {
        const pre = L.tribPre(state);
        if (pre) breakthrough.pre = pre.id;
        else if (L.tribStart(state, breakthrough)) breakthrough = null;
      } else finishBreakthrough(L.breakthrough(state, breakthrough.pills));
    } else throw new Error('未知突破操作');
  }

  function changeLife(message) {
    const visible = nextView();
    if (message.move === 'return' && visible?.kind === 'life' && visible.mode === 'ascend') {
      state.flags.endRead = 1;
      recordLife();
    } else if (message.move === 'gate' && !visible && state.p.r > L.MAXR && state.eflags.asc_stay) {
      delete state.evDone.s9_gate_again;
      returnToGate = true;
    } else if (message.move === 'settle' && (visible?.kind === 'life' || !visible && state.p.r >= 2)) {
      L.settle(state, visible?.mode || (state.p.r > L.MAXR ? 'ascend' : 'bingjie'));
      recordLife();
    } else if (visible?.kind === 'rebirth') {
      if (message.move === 'card' && rebirth.cards[message.index]) rebirth.card = message.index;
      else if (message.move === 'origin' && L.ORIGIN_IDS.includes(message.id) && L.originOpen(state, message.id)) rebirth.origin = message.id;
      else if (message.move === 'hall' && L.HALL_NODE[message.id] && L.hallBuy(state, message.id)) return;
      else if (message.move === 'trial' && L.TRIALS.some(trial => trial.id === message.id)) {
        if (rebirth.trials.includes(message.id)) rebirth.trials = rebirth.trials.filter(id => id !== message.id);
        else rebirth.trials.push(message.id);
      } else if (visible.legacy.some(item => item.move === message.move && item.id === message.id)) {
        const picks = { ...(state.meta.legacy || {}) };
        const candidates = L.legacyCands(state);
        if (message.move === 'legacy-art') {
          const arts = picks.arts || [];
          picks.arts = arts.includes(message.id) ? arts.filter(id => id !== message.id) : [...arts, message.id].slice(-candidates.artN);
        } else if (message.move === 'legacy-gear') {
          const { slot, aff } = candidates.gear[message.id];
          picks.gear = picks.gear?.slot === slot && picks.gear?.aff === aff ? null : { slot, aff };
        } else picks.pet = picks.pet === message.id ? null : message.id;
        L.legacySet(state, picks);
      } else if (message.move === 'begin') {
        const prev = state;
        state = L.rebirthState(prev, { ...rebirth.cards[rebirth.card], origin: rebirth.origin, trials: rebirth.trials });
        state.guide = { step: 99, done: true };
        note = { kind: 'card', title: '第 ' + (state.rebirth + 1) + ' 世', text: [...L.originOf(state).open, L.rebirthLine(state, state.meta.prev)].join('\n\n') };
        rebirth = null;
        panel = null;
        L.chainOpen(state, 'act');
      } else throw new Error('这项轮回选择不可用');
    } else throw new Error('此刻无法进行这一操作');
  }

  function dispatch(message) {
    const { op } = message;
    if (op === 'new' || op === 'title') {
      state = null;
      if (op === 'new') {
        const name = Array.from(String(message.name || '').trim()).slice(0, 6).join('') || '无名';
        state = L.newState({ name });
        if (message.introSeen) XianmenCinematics.mark(state, XianmenCinematics.intro());
        state.guide = { step: 0, done: false };
        state.story.beat.c1_open = 0;
        L.fireTrigger(state, 'sb:c1_open');
        L.chainOpen(state, 'act');
      }
      note = null;
      encounter = null;
      openEvent = null;
      preparedDuel = null;
      arena = null;
      panel = null;
      battle = null;
      boss = null;
      battleInputs = [];
      battleLog = '';
      battleEffects = [];
      breakthrough = null;
      rebirth = null;
      returnToGate = false;
      return;
    }
    if (op === 'load') return load(message.save);
    if (op === 'import') return load(L.unpackSave(String(message.code || '')) || message.code);
    if (op === 'view') return;
    if (!state) throw new Error('请先踏入仙途');
    if (op === 'cinema-done') {
      const notice = nextView();
      const clip = earlyCinema(notice) || (!arena && XianmenCinematics.later(state, notice));
      if (!clip || clip.token !== message.token) throw new Error('当前没有这段过场');
      XianmenCinematics.mark(state, clip);
      return;
    }
    if (op === 'export') return L.packSave(JSON.stringify(state));
    if (op === 'duel-next') {
      if (!arena || arena.index !== message.index || earlyCinema(null)) throw new Error('当前没有可继续的比试演出');
      if (++arena.index >= arena.bouts.length) arena = null;
      return;
    }
    if (op === 'duel-action') {
      const prep = nextView();
      if (prep?.kind !== 'duel-prep') throw new Error('目前没有待准备的比试');
      if (message.move === 'equip') {
        if (!prep.arts.some(art => art.id === message.art) || !L.equipArt(state, message.art)) throw new Error('无法换上这门战技');
        return;
      }
      const option = prep.options.find(item => item.move === message.move);
      if (!option || option.why) throw new Error(option?.why || '此刻无法选择');
      if (preparedDuel) {
        const { id, args } = preparedDuel;
        if (message.move !== 'cancel') {
          const result = L.act(state, id, args);
          if (!result) throw new Error(L.actLastWhy || '此刻无法交手');
          arena = XianmenDuels.arena(state, id, result);
        }
        preparedDuel = null;
      } else finishBig(L.nextBlock(state), message.move);
      return;
    }

    if (op === 'pick') return resolve(message.index);
    if (op === 'reforge-keep') {
      if (nextView()?.kind !== 'reforge' || !L.gearReforgeKeep(state, message.replace === true)) throw new Error('没有待确认的洗练');
      return;
    }
    if (op === 'result') {
      if (note || preparedDuel || arena || state.exp || state.run || battle || breakthrough || state.trib?.cur ||
          state.gear.rf || XianmenCinematics.earlier(state, null)) throw new Error('没有可操作的结算');
      const block = L.nextBlock(state);
      if (block?.kind !== 'result') throw new Error('没有可操作的结算');
      if (message.move === 'deeper') {
        if (deeperWhy(block) !== '' || !L.act(state, 'deeper', { res: block.data })) throw new Error('此刻无法深入');
        L.blockDone(state, block);
        return;
      }
      const cards = block.data.cards || [];
      if (message.move === 'gear') return decideLoot(block, message.index, message.decision);
      if (message.move === 'wish-again' && ['exp', 'sweep', 'deeper'].includes(block.id) &&
          cards.some((card, index) => card.wish && block.revealed?.includes(index))) {
        L.blockDone(state, block);
        return navigate('drops:' + block.data.k);
      }
      const indices = message.move === 'all' ? cards.map((_, i) => i) :
        message.move === 'reveal' && Number.isInteger(message.index) && cards[message.index] ? [message.index] : null;
      if (!indices) throw new Error('没有这张翻牌');
      const flipped = indices.filter(index => !block.revealed?.includes(index));
      block.revealed = [...new Set([...(block.revealed || []), ...flipped])];
      return { lootFlips: flipped };
    }
    if (op === 'visitor-gifts') {
      const visitor = L.pgiftVisitor(state);
      if (note || openEvent !== 'visitor' || !L.PPL.includes(visitor) || L.pgiftWhy(state, visitor)) throw new Error('当前无法向访客送礼');
      openEvent = null;
      panel = 'people';
      return;
    }
    if (op === 'dismiss-event') {
      if (note || !currentLocalEvent()) throw new Error('没有待处理的奇遇');
      if (openEvent === 'market') L.marketEventDone(state, currentLocalEvent().id);
      else openEvent = null;
      return;
    }
    if (op === 'combat') return combat(message.move);
    if (op === 'battle-auto-ult') {
      if (!battleOptionsOpen() || !battle || battle.done) throw new Error('此刻无法更改自动绝招');
      state.flags.autoUlt = !state.flags.autoUlt;
      return;
    }
    if (op === 'breakthrough') return changeBreakthrough(message);
    if (op === 'life') return changeLife(message);
    if (op === 'realm-action') {
      if (!state.run || note) throw new Error('目前无法行动');
      const available = realmView().options?.some(option => option.move === message.move && option.index === message.index && !option.why);
      if (!available) throw new Error('这项选择不可用');
      const actions = { door: L.mjPick, shop: L.mjShop, leave: L.mjLeave, chest: L.mjChest };
      const result = actions[message.move](state, message.index);
      if (!result) throw new Error('未能结算秘境');
      const summary = result.wipe || (result.how ? result : null);
      if (summary) {
        const { title, lines } = realmSummary(summary);
        note = { kind: 'card', title, music: 'realm', text: lines.join('\n') };
      } else if (result.dmg || result.heal || result.trap || result.loot?.length || result.texts?.length) {
        note = { kind: 'card', title: '秘境所得', music: 'realm', text: [
          result.trap ? '宝箱触发了陷阱。' : '',
          result.dmg ? '气血 −' + fmt(result.dmg) : '',
          result.heal ? '气血 +' + fmt(result.heal) : '',
          ...(result.texts || []), ...(result.loot || []).map(item => item.t).filter(Boolean),
        ].filter(Boolean).join('\n') };
      }
      if (message.move === 'door') return { realmFx: { index: message.index, art: result.trap ? 'trap' : result.t,
        hp: result.hp1 ?? state.run?.hp ?? 0, wipe: !!result.wipe } };
      return;
    }
    if (op === 'advance') {
      arena = null;
      if (note) { note = null; return; }
      if (preparedDuel) throw new Error('请先确认比试或返回');
      if (encounter || currentLocalEvent()) throw new Error('请先选择奇遇');
      if (battle?.done) return finishCombat();
      if (battle) throw new Error('请先完成当前战斗');
      if (state.run || state.trib?.cur || breakthrough || state.settle || state.gear.rf) throw new Error('请先完成当前选择');
      if (state.exp) {
        battle = L.expBattle(state);
        if (!battle) finishTripStep(null);
        return;
      }
      const block = L.nextBlock(state);
      if (!block) return;
      if (block.kind === 'story' && block.data?.choices) throw new Error('请先选择剧情');
      if (block.kind === 'big' && block.id === 'death' && lifeEnded()) throw new Error('请先结算这一世');
      if (block.kind === 'big') return finishBig(block);
      L.blockDone(state, block);
      if (block.kind === 'year') L.yearClose(state);
      return;
    }
    if (op === 'unlock-go') {
      if (!nextView()?.unlockLink) throw new Error('当前没有解锁指引');
      const block = L.nextBlock(state);
      const guide = block?.kind === 'unlock' && XianmenPlayerPanels.unlock(block.id);
      if (!guide) throw new Error('当前没有解锁指引');
      L.blockDone(state, block);
      return navigate(guide[0]);
    }
    if (nextView()) throw new Error('请先完成当前结算');
    if (op === 'open-expedition') return navigate('exp');
    if (op === 'guide-nav') {
      if (state.guide.done || state.guide.step >= 3 || ![null, -1, 0].includes(message.region)) {
        throw new Error('当前没有这一步历练引导');
      }
      if (message.region === 0) return openPanel(firstTripPanel);
      if (message.region === -1) return navigate('exp');
      state.guide.step = 0;
      panel = null;
      return { navigation: 'cave' };
    }
    if (op === 'duel-prepare') {
      if (!['duel', 'final'].includes(message.action)) throw new Error('没有这场比试');
      preparedDuel = { id: message.action, args: L.duelArgs(message.args) };
      return;
    }
    if (op === 'wish') {
      if (!L.wishOpen(state)) throw new Error('历练四趟后可许愿');
      if (message.clear) L.setWish(state, null);
      else if (!L.regionOpen(state, message.k) || !L.APPR.some((_, a) => L.expOpen(state, message.k, message.d, a)) ||
        !L.setWish(state, message.k, message.d, message.index)) throw new Error('无法设下这份心愿');
      return;
    }
    if (op === 'visitor') {
      if (!L.visitorEvent(state)) throw new Error('眼下没有访客');
      openEvent = 'visitor';
      return;
    }
    if (op === 'panel') {
      return openPanel(message.panel);
    }
    if (op === 'goal-next') return followGoal();
    if (op === 'panel-action') {
      if (!panel) throw new Error('没有打开的面板');
      const result = XianmenPanels.perform(state, panel, message.action, message.args);
      if (result.mail) return readMail(result.mail);
      if (result.destination) return navigate(result.destination);
      if (result.advice) return useAdvice(result.advice);
      if (result.trip) return startPreparedTrip(result.trip);
      if (message.action === 'alchemy-craft' || message.action === 'alchemy-trial') {
        note = {
          kind: 'card', title: result.ok ? '炼丹成功' : '炼丹失败',
          text: result.ok ? [L.QUAL[result.q].n + result.n, result.fx].filter(Boolean).join(' · ') : '炸炉了，药材化为飞灰。',
        };
      } else if (message.action === 'alchemy-take') {
        note = { kind: 'card', title: '服用' + result.n, text: result.fx };
      } else if (message.action === 'auction-bid') {
        note = { kind: 'card', title: result.win ? '拍得' + result.n : '竞价失利', text: result.win
          ? ['花费 ' + fmt(result.price) + ' 灵石', result.planText, result.it?.name].filter(Boolean).join('\n')
          : (result.comp ? result.comp.n : '其他修士') + '拍走了' + result.n + '。这次出价未扣灵石。' };
        if (L.marketEvent(state)) openEvent = 'market';
      } else if (message.action === 'person-gift') {
        note = { kind: 'card', title: '送礼 · ' + L.npcName(state, result.id),
          text: [result.line, '好感 ' + result.a0 + ' → ' + result.a1].join('\n') };
      } else if (message.action === 'person-quest') {
        note = { kind: 'card', title: '委托完成', text: [result.line, ...result.texts].join('\n') };
      } else if (message.action === 'vault-buy') {
        note = { kind: 'card', title: '换得' + result.n, text: result.planText || result.it?.name || '' };
      } else if (message.action === 'gear-plus') {
        note = { kind: 'card', title: result.ok ? '强化成功' : '强化失败', text: result.ok
          ? '强化 +' + result.from + ' → +' + result.to : '消耗了这次的材料，下次强化成功率提高。' };
      } else if (message.action === 'disciple-graduate' && result.grad) {
        note = { kind: 'card', title: result.grad.x.n + '出师', text: '宗门贡献 +' + fmt(result.grad.contrib) };
      }
      return;
    }
    if (op === 'season') {
      const season = L.seasonEnd(state);
      if (!season) throw new Error('此刻无法过季');
      deliverSeasonMail(season);
      return;
    }
    if (op === 'act') {
      if (message.action === 'boss') {
        const k = L.actArg(message.args, 0, 'k');
        const why = L.apWhy(state, 'boss', { k });
        if (why) throw new Error(why);
        boss = { k, seed: 1 + Math.floor(L.rng() * 1e9) };
        battle = L.bossBattle(state, k, { seed: boss.seed });
        const seen = state.meta.foes || (state.meta.foes = {});
        for (const foe of battle.foes) seen[foe.id] = 1;
        return;
      }
      const result = L.act(state, message.action, message.args);
      if (!result) throw new Error(L.actLastWhy || '此刻无法行动');
      arena = XianmenDuels.arena(state, message.action, result);
      return;
    }
    if (op === 'upgrade-array') {
      if (!L.upgrade(state, 'array')) throw new Error('聚灵阵暂时无法升级');
      return;
    }
    if (op === 'break') {
      if (!L.isReady(state)) throw new Error('修为尚未圆满');
      (state.hintSeen ||= {}).ready = 1;
      breakthrough = { pills: 0, aids: {} };
      return;
    }
    throw new Error('未知操作');
  }

  function openPanel(id) {
    if (id && !XianmenPanels.has(id)) throw new Error('找不到这个面板');
    if (id && !id.startsWith('trip:') && !state.guide.done && state.guide.step < 3) {
      state.guide.step = 0;
    }
    if (id && panel !== id) XianmenPlayerPanels.opened(state, id);
    panel = id || null;
    if (['auction', 'market'].includes(panel) && L.marketEvent(state)) openEvent = 'market';
  }

  function navigate(go) {
    const trip = /^exp:(\d+):(\d+):(\d+)$/.exec(go);
    if (trip && L.expOpen(state, ...trip.slice(1).map(Number))) {
      return openPanel(XianmenPlayerPanels.tripId(...trip.slice(1)));
    }
    const map = /^(exp|drops):(\d+)/.exec(go);
    if (go === 'exp' || go === 'realm' || map) {
      panel = null;
      if (!state.guide.done && state.guide.step < 3 && go !== 'realm') {
        state.guide.step = map ? 2 : 1;
      }
      return { navigation: map?.[1] === 'drops' ? 'drops' : 'maps', region: map ? Number(map[2]) : -1 };
    }
    if (go === 'bt' || go === 'cult' || go === 'trib') {
      return L.isReady(state) ? dispatch({ op: 'break' }) : openPanel('growth:cul');
    }
    if (go === 'journey') { panel = null; return { navigation: 'journey' }; }
    if (go === 'visitor') return dispatch({ op: 'visitor' });
    const targets = {
      gear: 'equipment', field: 'fields', furnace: state.home.furnace ? 'alchemy' : 'home',
      zhen: L.zhenOpen(state) ? 'formations' : 'home', big: 'prep', cal: 'calendar',
      rivals: 'rankings', world: 'rankings', mainfoe: 'rankings', sectid: 'sect',
      record: 'journal', attr: 'attributes', me: 'attributes', disc: 'disciples',
    };
    const target = targets[go] || go;
    return openPanel(XianmenPanels.has(target) ? target : 'growth:goal');
  }

  function useAdvice(go) {
    if (!go.startsWith('do:')) return navigate(go);
    const command = go.slice(3);
    const [id, ...args] = command.split(':');
    if (id === 'exp' || id === 'wish') return navigate('exp:' + args.join(':'));
    if (['boss', 'sweep', 'sit', 'retreat'].includes(id)) {
      dispatch({ op: 'act', action: id, args: args.map(Number) });
      panel = null;
      return { navigation: 'cave' };
    }
    const result = L.adviseDo(state, command);
    if (!result.done) throw new Error(result.why);
    L.checkQuests(state);
    if (!result.ok) note = { kind: 'card', title: '尝试未成', text: result.why };
  }

  function followGoal() {
    const next = L.goalNow(state).next;
    if (!next) return;
    const action = next.do;
    if (!action) return next.act ? useAdvice(next.act.go) : navigate(next.go);
    if (['duel', 'final'].includes(action.id)) return dispatch({ op: 'duel-prepare', action: action.id, args: action.args });
    if (action.id === 'exp') {
      const trip = expeditionPanel(action.args);
      return trip ? openPanel(trip) : navigate('exp');
    }
    if (action.id === 'realm') return navigate('realm');
    return dispatch({ op: 'act', action: action.id, args: action.args });
  }

  function expeditionPanel(args) {
    const k = L.actArg(args, 0, 'k'), d = L.actArg(args, 1, 'd') || 0, a = L.actArg(args, 2, 'a') || 0;
    return k !== undefined && L.expOpen(state, k, d, a) ? XianmenPlayerPanels.tripId(k, d, a) : '';
  }

  function startPreparedTrip(trip) {
    const args = trip.args.slice();
    const k = args[0];
    if (trip.id === 'exp' && state.flags.mobileEscort === k) {
      const escort = XianmenPlayerPanels.escortFor(state, k);
      if (escort >= 0) args.push({ escort });
    }
    dispatch({ op: 'act', action: trip.id, args });
    delete state.flags.mobileEscort;
    panel = null;
    return { navigation: 'cave' };
  }

  function deliverSeasonMail(season) {
    const out = season.out;
    const send = (k, t, extra) => L.mailPush(state, { k, t, ...extra });
    if (season.visitor && state.visitor) {
      send('visitor', '有人来访', { left: state.visitor.left, data: { id: state.visitor.id } });
    }
    if (out.world && L.WORLD[out.world]) {
      const world = L.WORLD[out.world];
      send('world', '天下大势 · ' + world.n, { left: world.len });
    }
    if (out.auction) send('auction', '拍卖会开槌', { left: L.AUCTION.len });
    if (out.rookieNew) send('rookie', '新秀出世 · ' + out.rookieNew.n);
    if (out.train) send('say', '老祖要给你特训', { left: 9, go: 'train' });
  }

  function readMail(item) {
    if (item.k === 'event' && L.eventById(item.data?.id)) {
      openEvent = 'mail:' + item.data.id;
      return;
    }
    const go = item.go || { visitor: 'visitor', auction: 'auction', world: 'calendar', season: 'calendar', rookie: 'rankings' }[item.k];
    if (go) return navigate(go);
  }

  function finishBig(block, move) {
    let result;
    if (block.id === 'rookie' && move === 'crush') {
      result = L.rookieDuel(state);
      block.ran = true;
    } else if (block.id === 'foe' && move === 'fight') {
      result = L.challengeRival(state, block.data.data);
      if (!result) throw new Error('此刻无法应战');
      block.ran = true;
    } else result = L.blockRun(state, block);
    L.blockDone(state, block);
    if (block.id === 'pact' && result && !L.pactText(state)) XianmenCinematics.queue(state, 'pact1', { win: result.win });
    note = XianmenDuels.result(state, block.id, result);
    arena = XianmenDuels.arena(state, block.id, result);
  }

  globalThis.xianmenRequest = request => {
    let previous;
    try {
      const message = JSON.parse(request);
      if (message.op === 'help') {
        return JSON.stringify({ ok: true, opening: XianmenHelp.opening(), sections: XianmenHelp.sections(state) });
      }
      if (message.op === 'load' || message.op === 'import') {
        previous = { state, encounter, openEvent, preparedDuel, arena, note, panel, battle, boss, battleInputs, battleLog, battleEffects, breakthrough, rebirth, returnToGate };
      }
      const oldSect = state?.sect?.id;
      const warWon = state?.flags.warWon;
      const result = dispatch(message);
      if (state) syncGuide();
      const notice = state ? nextView() : null;
      if (state && !['new', 'load', 'import'].includes(message.op)) {
        if (state.sect && state.sect.id !== oldSect) XianmenCinematics.queue(state, 'rzong', { id: state.sect.id });
        if (!warWon && state.flags.warWon) XianmenCinematics.queue(state, 'shoushan');
      }
      return JSON.stringify({ ok: true, result, view: view(notice), save: snapshot(notice) });
    } catch (error) {
      if (previous) ({ state, encounter, openEvent, preparedDuel, arena, note, panel, battle, boss, battleInputs, battleLog, battleEffects, breakthrough, rebirth, returnToGate } = previous);
      return JSON.stringify({ ok: false, error: previous ? '读不出这份存档' : error.message });
    }
  };
})();
