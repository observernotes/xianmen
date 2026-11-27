/* Native client boundary. The simulation and authored events use the same modules as the HTML release. */
(() => {
  'use strict';
  let state = null;
  let encounter = null;
  let note = null;
  let panel = null;
  let battle = null;
  let boss = null;
  let battleInputs = [];
  let battleLog = '';
  let breakthrough = null;
  let rebirth = null;
  let returnToGate = false;

  const fmt = L.fmt;
  const fill = value => L.fill(state, value);
  const speakers = { elder: '老祖', tian: '楚天阔', tianheng: '陆天衡', jian: '凌虚子', dan: '丹云婆婆', dao: '玄微子', teaman: '卖茶翁', xuehe: '血河老祖' };

  function dialogue(script, event, lines = []) {
    for (const instruction of script || []) {
      if (Array.isArray(instruction)) {
        const [speaker, custom] = instruction[0].split(':');
        const name = speaker === '?' ? custom : speaker === 'me' ? state.p.name
          : speakers[speaker] || (L.NPCS[speaker] ? L.npcName(state, speaker)
            : L.RIVAL_INFO[speaker] ? L.rivalName(state, speaker) : '');
        lines.push({ speaker: name || '', text: fill(instruction[1]).replace(/[*|]/g, '') });
      } else if (instruction.slot && L.storyCond(state, instruction.if)) {
        const cast = L.storySlot(state, event, instruction.slot, instruction.max);
        if (cast.length) for (const member of cast) dialogue(member.say, event, lines);
        else dialogue(instruction.say, event, lines);
      } else if (instruction.say && L.storyCond(state, instruction.if)) {
        dialogue(instruction.say, event, lines);
      } else if (instruction.pick) {
        const branch = instruction.pick.find(option => L.storyCond(state, option.if));
        if (branch) dialogue(branch.say, event, lines);
      } else if ('black' in instruction) {
        lines.push({ speaker: '', text: fill(instruction.black) });
      }
    }
    return lines;
  }

  const choiceView = ev => ({
    kind: 'choice',
    key: ev.id,
    title: fill(ev.title),
    text: fill(ev.text || ev.gist),
    scene: ev.scene || '',
    dialogue: dialogue(ev.talk, ev.id),
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
        '，享年 ' + Math.floor(state.p.age) + ' 岁。\n' + L.restLine(state), mode: 'rest',
    };
    const ending = L.endingOf(state);
    return {
      kind: 'life', title: ending.n, text: [].concat(ending.paras || ending.text || [], L.epilogue(state).map(card => card.who + ' · ' + card.text)).join('\n\n'),
      mode: 'ascend',
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
      const name = { exp: '历练归来', sweep: '扫荡归来', retreat: '闭关出关', sit: '打坐', boss: '首领战', duel: '天骄对决', deeper: '趁势深入' };
      const lines = [];
      if (data.rating !== undefined) lines.push('评价：' + L.RATINGS[data.rating]);
      if (data.win !== undefined) lines.push(data.win ? '取胜' : '落败');
      const rewards = [
        ['灵石', data.stones], ['修为', data.xp || data.got], ['灵草', data.herbs],
        ['灵矿', data.ore], ['破境丹', data.pills], ['天材地宝', data.treasure],
        ['宗门贡献', data.contrib], ['返还行动点', data.refund],
      ];
      lines.push(...rewards.filter(([, value]) => value > 0).map(([label, value]) => label + ' +' + fmt(value)));
      if (data.inj) lines.push(L.injText(data.inj));
      lines.push(...(data.unlock || []));
      if (data.cards?.length) lines.push('翻牌所得 · ' + data.cards.map(card => card.name + (card.n > 1 ? ' ×' + card.n : '')).join('、'));
      return { kind: 'card', title: name[block.id] || '行动结算', text: lines.join('\n') };
    }
    if (block.kind === 'big') {
      const title = { pact: '三年之约', tour: '天骄论道', meet: '九宗会武', war: '天剑来犯', rookie: '新秀挑战', death: '寿元已尽' };
      return { kind: 'card', title: title[block.id] || '仙途大事', button: '继续 ▸' };
    }
    if (block.kind === 'chapter') return { kind: 'card', title: '本章了结' };
    if (block.kind === 'unlock') return { kind: 'card', title: L.ONB_K[block.id]?.n || '新功能已开' };
    return { kind: 'card', title: '仙途' };
  }

  function nextView() {
    if (note) return note;
    if (state.settle) return rebirthView();
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
      return {
        kind: 'battle', title: boss ? L.BOSSES[boss.k].n : '历练交手', round: battle.round + 1,
        hp: Math.max(0, Math.ceil(battle.hp)), maxHp: Math.ceil(battle.max), rage: Math.floor(battle.rage),
        foes: battle.foes.filter(foe => foe.hp > 0).map(foe => ({
          name: foe.n, hp: Math.ceil(foe.hp), maxHp: Math.ceil(foe.max), shield: foe.sh, charge: !!foe.charge,
        })),
        ultimate: battle.me.ult.n, canUlt: battle.rage >= 100, pills: battle.pillUsed ? 0 : battle.pills,
        text: battleLog || battle.momText,
      };
    }
    if (state.exp) {
      const trip = state.exp;
      return { kind: 'travel', title: L.REGIONS[trip.k].n, text: '已走过 ' + (trip.ni || 0) + ' / ' + trip.total + ' 处', button: '继续历练 ▸' };
    }
    // Deferred mainline fights have no prepare panel of their own.
    for (let i = 0; i < 12; i++) {
      const block = L.nextBlock(state);
      if (!block) break;
      if (block.kind === 'big' && block.id === 'death' && lifeEnded()) return endingView();
      if (block.kind === 'story' && !block.data) { L.blockDone(state, block); continue; }
      if (block.kind !== 'act') return blockView(block);
      L.blockDone(state, block);
    }
    if (lifeEnded()) return endingView();
    const gate = ascensionGate();
    if (gate) return choiceView(gate);
    if (state.p.r > L.MAXR && !state.flags.endRead) return endingView();
    return null;
  }

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
        add(name + (index === recommended ? ' · 荐' : ''), 'door', index);
      });
      if (L.mjCanLeave(state)) add('带着收获离开', 'leave', -1);
    } else if (run.phase === 'shop') {
      run.shop.forEach((item, index) => add(item.n + ' · ' + fmt(item.price) + ' 灵石', 'shop', index, L.mjShopWhy(state, index)));
      add('继续前行', 'shop', -1);
    } else if (run.phase === 'chest') {
      run.chest.forEach((item, index) => add(item.n, 'chest', index));
    }
    return {
      kind: 'realm', title: run.xf ? '仙府' : theme.n + '秘境',
      text: '第 ' + run.floor + ' / ' + run.floors + ' 层 · 收获 ' + L.mjLootN(state) + ' 项',
      hp: run.hp, maxHp: run.max, options,
    };
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

  function view() {
    if (!state) return { started: false };
    const notice = nextView();
    const goal = L.goalNow(state);
    return {
      started: true, name: state.p.name, date: L.dateText(state), realm: L.stageName(state.p),
      stones: fmt(state.stones), power: fmt(L.power(state)), xp: fmt(state.p.xp), xpNeed: fmt(L.pNeed(state.p)),
      ap: L.apLeft(state), apTotal: L.AP.per, canBreak: L.isReady(state),
      canRebirth: state.p.r >= 2, canReturnToGate: !!(state.p.r > L.MAXR && state.eflags.asc_stay),
      ascended: state.p.r > L.MAXR,
      goal: goal.t, progress: goal.bar.text, advice: goal.next?.t || '',
      maps: notice ? [] : L.REGIONS.flatMap((map, k) => L.regionOpen(state, k) ? [{
        k, name: map.n, cells: expeditionCells(k),
        boss: L.bossReady(state, k) ? { name: L.BOSSES[k].n, why: L.apWhy(state, 'boss', { k }) } : null,
      }] : []),
      canRetreat: L.retOpen(state),
      array: arrayView(),
      realms: notice ? [] : realmEntries(),
      mainActions: notice ? [] : L.mainActs(state).map(action => ({
        label: action.t, why: action.why || '', available: action.ok && !!action.do, ap: action.ap || 0,
        id: action.do?.id, args: action.do?.args, chance: action.p,
      })),
      panel: panel && !notice ? { id: panel, entries: XianmenPanels.read(state, panel) } : null,
      notice,
    };
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

  function snapshot() {
    if (!state) return null;
    return {
      native: 1, state, note,
      pending: (state._apBlk || []).filter(block => ['result', 'season', 'year'].includes(block.kind)),
      chain: { ...L.chainOpenNow(state) },
      battle: battle ? battleInputs : null,
      boss,
      breakthrough,
      rebirth,
      returnToGate,
    };
  }

  function load(raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const native = parsed?.native === 1;
    const candidate = L.migrate(native ? parsed.state : parsed);
    if (!candidate) throw new Error('读不出这份存档');
    state = candidate;
    state.guide = { step: 99, done: true };
    encounter = state.exp?.encEv && !state.exp.encDone ? state.exp.encEv : null;
    note = native ? parsed.note || null : null;
    breakthrough = native ? parsed.breakthrough || null : null;
    rebirth = native ? parsed.rebirth || null : null;
    returnToGate = native && !!parsed.returnToGate;
    panel = null;
    boss = native && parsed.boss && !L.apWhy(state, 'boss', { k: parsed.boss.k }) ? parsed.boss : null;
    if (native && Array.isArray(parsed.battle)) {
      battle = boss ? L.bossBattle(state, boss.k, { seed: boss.seed }) : L.expBattle(state);
    } else battle = null;
    battleInputs = battle ? parsed.battle : [];
    battleLog = '';
    if (battle) for (const input of battleInputs) playRound(input);
    if (native && parsed.chain) {
      for (const block of parsed.pending || []) L.blockPush(state, block);
      Object.assign(L.chainOpenNow(state), parsed.chain);
    } else L.chainOpen(state, 'load');
  }

  function resolve(index) {
    if (note) throw new Error('请先完成当前结算');
    const realmEvent = L.mjEventNow(state);
    const event = realmEvent || (encounter && L.eventById(encounter));
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
      L.checkQuests(state);
      if (ev.id === 's9_gate' || !state.eflags.asc_stay) state.flags.endRead = 0;
    }
    const realmResult = realmEvent ? L.mjAfterEvent(state) : null;
    if (event) encounter = null;
    const response = choice[result.ok ? 'ok' : 'fail'] || choice.ok;
    note = {
      kind: 'card', key: ev.id + ':result', scene: ev.scene || '',
      title: fill(ev.title), text: [fill(result.text), realmResult?.wipe ? '气血耗尽，退出秘境。' : ''].filter(Boolean).join('\n'),
      dialogue: dialogue(response?.talk, ev.id),
    };
  }

  function playRound(input) {
    const events = L.battleStep(battle, input);
    battleLog = events.flatMap(event => {
      if (event.t === 'hit') return [(event.n || '命中') + ' ' + fmt(event.dmg || 0)];
      if (event.t === 'break' || event.t === 'summon') return [event.n];
      return [];
    }).join(' · ');
  }

  function finishTripStep(result) {
    const step = L.tripStep(state, result);
    if (step.enc) encounter = step.enc.id;
    if (step.done) L.tripEnd(state);
  }

  function combat(move) {
    if (!battle) throw new Error('目前没有战斗');
    if (move === 'smart') {
      L.battleAuto(battle, 'smart');
    } else {
      const input = { ult: move === 'ult', pill: move === 'pill', flee: move === 'flee' };
      playRound(input);
      battleInputs.push(input);
    }
    if (!battle.done) return;
    const result = L.battleResult(battle);
    const target = boss;
    battle = null;
    boss = null;
    battleInputs = [];
    battleLog = '';
    if (!target) finishTripStep(result);
    else if (!L.act(state, 'boss', { k: target.k, res: result })) throw new Error(L.actLastWhy || '首领战未能结算');
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
    if (op === 'new') {
      state = L.newState({ name: String(message.name || '无名').trim().slice(0, 6) || '无名' });
      state.guide = { step: 99, done: true };
      state.story.beat.c1_open = 0;
      L.fireTrigger(state, 'sb:c1_open');
      L.chainOpen(state, 'act');
      note = null;
      encounter = null;
      panel = null;
      battle = null;
      boss = null;
      battleInputs = [];
      battleLog = '';
      breakthrough = null;
      rebirth = null;
      returnToGate = false;
      return;
    }
    if (op === 'load') return load(message.save);
    if (op === 'import') return load(L.unpackSave(String(message.code || '')) || message.code);
    if (op === 'view') return;
    if (!state) throw new Error('请先踏入仙途');
    if (op === 'export') return L.packSave(JSON.stringify(state));

    if (op === 'pick') return resolve(message.index);
    if (op === 'combat') return combat(message.move);
    if (op === 'breakthrough') return changeBreakthrough(message);
    if (op === 'life') return changeLife(message);
    if (op === 'realm-action') {
      if (!state.run || note) throw new Error('目前无法行动');
      const available = realmView().options?.some(option => option.move === message.move && option.index === message.index && !option.why);
      if (!available) throw new Error('这项选择不可用');
      const actions = { door: L.mjPick, shop: L.mjShop, leave: L.mjLeave, chest: L.mjChest };
      const result = actions[message.move](state, message.index);
      if (!result) throw new Error('未能结算秘境');
      if (!state.run || result.dmg || result.heal || result.loot?.length || result.texts?.length) {
        note = { kind: 'card', title: state.run ? '秘境所得' : '秘境归来', text: [
          result.dmg ? '气血 −' + fmt(result.dmg) : '',
          result.heal ? '气血 +' + fmt(result.heal) : '',
          ...(result.texts || []), ...(result.loot || []).map(item => item.t).filter(Boolean),
          ...(result.chest?.texts || []),
        ].filter(Boolean).join('\n') };
      }
      return;
    }
    if (op === 'advance') {
      if (note) { note = null; return; }
      if (encounter) throw new Error('请先选择奇遇');
      if (battle) throw new Error('请先完成当前战斗');
      if (state.run || state.trib?.cur || breakthrough || state.settle) throw new Error('请先完成当前选择');
      if (state.exp) {
        battle = L.expBattle(state);
        if (!battle) finishTripStep(null);
        return;
      }
      const block = L.nextBlock(state);
      if (!block) return;
      if (block.kind === 'story' && block.data?.choices) throw new Error('请先选择剧情');
      if (block.kind === 'big' && block.id === 'death' && lifeEnded()) throw new Error('请先结算这一世');
      const result = block.kind === 'big' ? L.blockRun(state, block) : null;
      L.blockDone(state, block);
      if (block.kind === 'year') L.yearClose(state);
      if (result && result.win !== undefined) note = { kind: 'card', title: blockView(block).title, text: result.win ? '取胜' : '落败' };
      return;
    }
    if (nextView()) throw new Error('请先完成当前结算');
    if (op === 'panel') {
      if (message.panel) XianmenPanels.read(state, message.panel);
      panel = message.panel || null;
      return;
    }
    if (op === 'panel-action') {
      if (!panel) throw new Error('没有打开的面板');
      XianmenPanels.perform(state, panel, message.action, message.args);
      return;
    }
    if (op === 'season') {
      if (!L.seasonEnd(state)) throw new Error('此刻无法过季');
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
      if (!L.act(state, message.action, message.args)) throw new Error(L.actLastWhy || '此刻无法行动');
      return;
    }
    if (op === 'upgrade-array') {
      if (!L.upgrade(state, 'array')) throw new Error('聚灵阵暂时无法升级');
      return;
    }
    if (op === 'break') {
      if (!L.isReady(state)) throw new Error('修为尚未圆满');
      breakthrough = { pills: 0, aids: {} };
      return;
    }
    throw new Error('未知操作');
  }

  globalThis.xianmenRequest = request => {
    try {
      const message = JSON.parse(request);
      const result = dispatch(message);
      return JSON.stringify({ ok: true, result, view: view(), save: snapshot() });
    } catch (error) {
      return JSON.stringify({ ok: false, error: error.message });
    }
  };
})();
