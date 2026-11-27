/* Native client boundary. The simulation and authored events use the same modules as the HTML release. */
(() => {
  'use strict';
  let state = null;
  let encounter = null;
  let note = null;
  let panel = null;
  let battle = null;
  let battleInputs = [];
  let battleLog = '';

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
      if (!L.choiceShown(state, choice)) return [];
      return [{ index, label: fill(choice.t), available: L.costOk(state, choice.cost) }];
    }),
  });

  function blockView(block) {
    const data = block.data || {};
    if (block.kind === 'story' && data.choices) return choiceView(data);
    if (block.kind === 'season' || block.kind === 'year') {
      const report = L.seasonReport(state, data);
      return { kind: 'card', title: report.title, text: report.lines.join('\n'), button: report.btn };
    }
    if (block.kind === 'result') {
      const name = { exp: '历练归来', sweep: '扫荡归来', retreat: '闭关出关', sit: '打坐', boss: '首领战', duel: '天骄对决', deeper: '趁势深入' };
      const lines = [];
      if (data.rating !== undefined) lines.push('评价：' + L.RATINGS[data.rating]);
      if (data.win !== undefined) lines.push(data.win ? '取胜' : '落败');
      if (data.stones) lines.push('灵石 +' + fmt(data.stones));
      if (data.xp || data.got) lines.push('修为 +' + fmt(data.xp || data.got));
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
    if (encounter) {
      const ev = L.eventById(encounter);
      if (ev) return choiceView(ev);
      encounter = null;
    }
    if (battle) {
      return {
        kind: 'battle', title: '历练交手', round: battle.round + 1,
        hp: Math.max(0, Math.ceil(battle.hp)), maxHp: Math.round(battle.max), rage: Math.floor(battle.rage),
        foes: battle.foes.filter(foe => foe.hp > 0).map(foe => ({
          name: foe.n, hp: Math.ceil(foe.hp), maxHp: Math.round(foe.max), shield: foe.sh, charge: !!foe.charge,
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
      if (!block) return null;
      if (block.kind !== 'act') return blockView(block);
      L.blockDone(state, block);
    }
    throw new Error('结算链没有结束');
  }

  function view() {
    if (!state) return { started: false };
    const notice = nextView();
    const goal = L.goalNow(state);
    return {
      started: true, name: state.p.name, date: L.dateText(state), realm: L.stageName(state.p),
      stones: fmt(state.stones), power: fmt(L.power(state)), xp: fmt(state.p.xp), xpNeed: fmt(L.pNeed(state.p)),
      ap: L.apLeft(state), apTotal: L.AP.per, canBreak: L.isReady(state),
      goal: goal.t, progress: goal.bar.text, advice: goal.next?.t || '',
      maps: notice ? [] : L.REGIONS.flatMap((map, k) => L.regionOpen(state, k) ? [{ k, name: map.n, cells: expeditionCells(k) }] : []),
      canRetreat: L.retOpen(state),
      array: arrayView(),
      mainActions: L.mainActs(state).filter(action => action.do && action.do.id !== 'exp').map(action => ({
        label: action.t, why: action.why || '', available: action.ok, ap: action.ap || 0,
        id: action.do.id, args: action.do.args,
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
    panel = null;
    battle = native && Array.isArray(parsed.battle) ? L.expBattle(state) : null;
    battleInputs = battle ? parsed.battle : [];
    battleLog = '';
    if (battle) for (const input of battleInputs) playRound(input);
    L.chainOpen(state, 'load');
    if (native) {
      for (const block of parsed.pending || []) L.blockPush(state, block);
      Object.assign(L.chainOpenNow(state), parsed.chain || {});
    }
  }

  function resolve(index) {
    const event = encounter && L.eventById(encounter);
    const block = !event && L.nextBlock(state);
    const ev = event || (block?.kind === 'story' && block.data);
    if (!ev) throw new Error('没有待选的奇遇');
    const choice = ev.choices[index];
    if (!choice || !L.choiceShown(state, choice) || !L.costOk(state, choice.cost)) throw new Error('目前无法选择这个选项');
    if (block) L.blockDone(state, block);
    const result = L.resolveChoice(state, ev, index);
    if (!result) throw new Error('奇遇未能结算');
    if (event) encounter = null;
    const response = choice[result.ok ? 'ok' : 'fail'] || choice.ok;
    note = {
      kind: 'card', key: ev.id + ':result', scene: ev.scene || '',
      title: fill(ev.title), text: fill(result.text), dialogue: dialogue(response?.talk, ev.id),
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
    battle = null;
    battleInputs = [];
    battleLog = '';
    finishTripStep(result);
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
      battleInputs = [];
      battleLog = '';
      return;
    }
    if (op === 'load') return load(message.save);
    if (op === 'import') return load(L.unpackSave(String(message.code || '')) || message.code);
    if (op === 'view') return;
    if (!state) throw new Error('请先踏入仙途');
    if (op === 'export') return L.packSave(JSON.stringify(state));

    if (op === 'pick') return resolve(message.index);
    if (op === 'combat') return combat(message.move);
    if (op === 'advance') {
      if (note) { note = null; return; }
      if (encounter) throw new Error('请先选择奇遇');
      if (battle) throw new Error('请先完成当前战斗');
      if (state.exp) {
        battle = L.expBattle(state);
        if (!battle) finishTripStep(null);
        return;
      }
      const block = L.nextBlock(state);
      if (!block) return;
      if (block.kind === 'story' && block.data?.choices) throw new Error('请先选择剧情');
      const result = block.kind === 'big' ? L.blockRun(state, block) : null;
      L.blockDone(state, block);
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
      if (!L.act(state, message.action, message.args)) throw new Error(L.actLastWhy || '此刻无法行动');
      return;
    }
    if (op === 'upgrade-array') {
      if (!L.upgrade(state, 'array')) throw new Error('聚灵阵暂时无法升级');
      return;
    }
    if (op === 'break') {
      if (!L.isReady(state)) throw new Error('修为尚未圆满');
      const result = L.breakthrough(state, Math.min(state.pills, L.BT.maxPills));
      note = { kind: 'card', title: '突破', text: result?.ok ? L.stageName(state.p) : '这次未能突破' };
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
