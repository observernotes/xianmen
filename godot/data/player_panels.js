/* Read models for the mobile player's preparations, inventory and records. */
globalThis.XianmenPlayerPanels = (() => {
  'use strict';
  const fmt = L.fmt;
  const focuses = { goal: '目标', atk: '战力', cul: '修炼', inc: '灵石', bt: '突破' };
  const row = (title, text = '', buttons = []) => ({ title, text, buttons });
  const button = (label, name, args = [], why = '') => ({ label, name, args, why });
  const link = (label, panel) => ({ label, panel });
  const costNames = { stone: '灵石', ore: '灵矿', herb: '灵草', feed: '兽粮', pojing: '破境丹',
    liaoshang: '疗伤丹', baoqi: '爆气丹', ap: '行动点' };

  function bagItems(st) {
    const g = st.gear, mats = st.mats, items = [];
    const add = (group, id, label, have, from, use, action, icon) => {
      if (have > 0) items.push({ group, id, label, have, from, use, action, icon });
    };
    const brew = st.home.furnace ? link('去炼丹', 'alchemy') : null;
    add('常用', 'stones', '灵石', st.stones, '历练、灵田、宗门俸禄、坊市', '洞府建造、坊市采购、法宝强化', link('看坊市', 'market'), 'stone');
    add('常用', 'herbs', '灵草', st.herbs, '采药历练、灵田、灵宠觅食', '炼丹、灵宠进化、出售', brew, 'herb');
    add('常用', 'ore', '灵矿', st.ore, '斩妖、熔炼、坊市和首领', '强化法宝、器炉打造', L.gearOpen(st, 'plus') ? link('去强化', 'equipment') : null, 'ore');
    add('常用', 'treasure', '天材地宝', st.treasure, '首领、禁地、奇遇和翻牌', '洗髓丹、九转金丹、突破', brew, 'treasure');
    add('常用', 'pills', '破境丹', st.pills, '坊市、历练、丹炉', '突破时每枚提高 ' + L.pct(L.BT.pill) + ' 成功率，也可疗伤',
      L.canHeal(st) ? button('服丹疗伤', 'heal') : link('看突破', 'growth:bt'), 'pojing');
    add('常用', 'feed', '兽粮', st.feed, '斩妖、灵宠觅食、放生', '喂养灵宠', L.petCount(st) ? link('去喂养', 'pets') : null, 'feed');
    const pills = Object.values(st.dan?.bag || {}).reduce((total, list) => total + list.length, 0);
    add('常用', 'dan', '丹囊', pills, '炼丹、奇遇', '服用疗伤丹、爆气丹等丹药', link('打开丹囊', 'alchemy'), 'danbag');
    add('常用', 'token', '秘境令', st.mj?.token, '入夏获赠、奇遇', '进入秘境',
      L.mjUnlocked(st) ? button('去秘境', 'navigate', ['realm']) : null, 'token');
    const yinIcons = { fire: 'yin_f', ice: 'yin_i', thunder: 'yin_t', wood: 'yin_w', soul: 'yin_s' };
    for (const [id, icon] of Object.entries(yinIcons)) {
      add('药引', 'yin_' + id, L.YIN_N[id], mats.yin?.[id], '灵田、坊市、灵宠觅食', '炼丹、灵宠进化、器方', brew, icon);
    }
    for (const el of L.CORE_EL) {
      const name = L.ELEM[el];
      add('材料', 'core_' + el, name + '灵核', mats.core?.[el], '精英、归途翻牌',
        L.INFUSE.n + ' 枚可将兵器淬成' + name + '系', L.gearOpen(st, 'infuse') ? link('去淬灵', 'equipment') : null, 'core:' + el);
    }
    add('材料', 'rune', '器纹石', mats.rune, '熔炼带星法宝、首领', '洗练法宝的一条词条',
      L.gearOpen(st, 'reroll') ? link('去洗练', 'equipment') : null, 'rune');
    for (const [id, have] of Object.entries(g.mats || {})) {
      if (L.BOSS_MAT[id]) add('材料', 'mat_' + id, L.BOSS_MAT[id], have, '首领首次击败 ×2，金丹后再战 ×1',
        '打造专属法宝', link('去器炉', 'forge'), 'boss:' + id);
    }
    add('材料', 'plans', '器方', Object.keys(g.plans || {}).length, '首领、拍卖、宗门宝库、奇遇',
      '打造固定词条的法宝', link('去器炉', 'forge'), 'gscroll');
    for (const [id, have] of Object.entries(st.arts.frag || {})) {
      const art = L.art(id);
      if (art && !L.artOwned(st, id)) add('材料', 'frag_' + id, '《' + art.n + '》残篇', have, art.src || '奇遇', '集齐三篇自动合成', null, 'frag');
    }
    for (const item of L.gearHeld(st)) {
      add('材料', 'held_' + item.u, L.gearBase(item.id).n, 1, '首领、器方、奇遇',
        L.GEAR_N[item.slot] + '槽开放时自动装配', null, 'gear');
    }
    return items;
  }

  function bagOpened(st) {
    const items = bagItems(st).filter(item => item.group !== '常用');
    const seen = st.flags.bagSeen;
    st.flags.mobileBagNew = seen ? items.filter(item => item.have > (seen[item.id] || 0)).map(item => item.id) : [];
    st.flags.bagSeen = Object.fromEntries(items.map(item => [item.id, item.have]));
  }

  function bag(st) {
    const rows = [];
    let group;
    for (const item of bagItems(st)) {
      if (item.group !== group) rows.push({ section: true, ...row(group = item.group) });
      const fresh = st.flags.mobileBagNew?.includes(item.id) ? ' · 新入手' : '';
      rows.push({ ...row(item.label + ' ×' + fmt(item.have) + fresh,
        '来源 ' + item.from + '\n用途 ' + item.use, item.action ? [item.action] : []), icon: item.icon });
    }
    return rows.length ? rows : [row('包裹是空的', '历练可获得灵石、法宝和材料。', [button('去历练', 'navigate', ['exp'])])];
  }

  function adviceWhy(st, action) {
    if (action.gap) return '';
    const match = /^do:(sit|retreat|sweep|boss)(?::(\d+)(?::(\d+):(\d+))?)?$/.exec(action.go);
    if (!match) return '';
    const [, id, k, d, a] = match;
    return L.apWhy(st, id, [Number(k), Number(d), Number(a)]);
  }

  function adviceRow(st, action) {
    const details = [action.gain.text, action.gain.sub, action.why].filter(Boolean);
    if (action.gap) details.push('还差 ' + fmt(action.gap.n) + ' ' + action.gap.unit);
    const costs = action.cost.map(cost => {
      const name = costNames[cost.icon] || (cost.icon?.startsWith('core:') ? L.elName(cost.icon.slice(5)) + '灵核' : '');
      return [typeof cost.n === 'number' ? fmt(cost.n) : cost.n, name, cost.have !== undefined ? '（有 ' + fmt(cost.have) + '）' : ''].filter(Boolean).join(' ');
    });
    if (costs.length) details.push('花费 ' + costs.join(' · '));
    const label = action.btn + (action.ap && !action.gap ? ' ◆' + action.ap : '');
    return { ...row(action.n, details.join('\n'), [button(label, 'advice-choose', [action.go], adviceWhy(st, action))]), icon: action.icon };
  }

  function growth(st, focus) {
    const data = L.advise(st, focus), head = data.head;
    const title = [head.big, head.small || head.target].filter(Boolean).join(' ');
    const rows = [{
      ...row(title, [head.t, head.due, head.say ? '老祖说：' + head.say : ''].filter(Boolean).join('\n')),
      meter: { value: Number.isFinite(head.v) ? head.v : 0, max: Number.isFinite(head.max) ? head.max : 1,
        after: head.after || 0, target: head.line || 0 },
    }];
    rows.push(...data.acts.map(action => adviceRow(st, action)));
    if (focus === 'bt' && L.isReady(st)) rows.push(row('已可突破', '', [button('查看突破准备', 'navigate', ['bt'])]));

    const B = L.breakdown(st);
    const multiplier = ([label, value]) => label + ' ×' + Number(value.toFixed(3));
    const showPower = () => ['基础 ' + fmt(B.baseAtk), ...B.atk.map(multiplier), '合计 ' + fmt(B.power)];
    const showGrowth = () => ['基础 ' + fmt(B.baseCul), ...B.cul.map(multiplier), '合计 +' + fmt(B.gain) + ' / 月'];
    const showIncome = () => [...B.inc.map(([label, value]) => label + ' +' + L.fmt1(value)), '合计 +' + fmt(B.income) + ' / 月'];
    const showBreak = () => {
      const pills = Math.min(L.BT.maxPills, st.pills);
      return [...L.btParts(st, pills).map(([label, value]) => label + ' ' + (value < 0 ? '−' : '+') + L.pct(Math.abs(value))),
        L.lifeMonths(st).text];
    };
    const breakdown = { goal: showPower, atk: showPower, cul: showGrowth, inc: showIncome, bt: showBreak }[focus];
    rows.push(row('数值明细', breakdown().join('\n')));
    return rows;
  }

  function prep(st) {
    const event = L.bigInfo(st);
    if (!event) return [row('近期没有比试', '', [link('看历法', 'calendar')])];
    const timing = event.seasons <= 1 ? '本季末' : '还有 ' + event.seasons + ' 季';
    const match = [
      event.foe ? event.foe.n + ' · 战力 ' + fmt(event.foe.pw) : '',
      '你的对决战力 ' + fmt(event.S || L.power(st)),
      event.p !== undefined ? '预计胜算 ' + L.pct(event.p) : '',
      '剩余行动点 ' + L.apLeft(st) + ' / ' + L.AP.per,
    ];
    const pact = event.k === 'pact' ? L.pactText(st) : null;
    if (pact?.intro) match.push(pact.intro);
    if (event.k === 'pact' && L.pactAssist(st) > 1) match.push('老祖借力 ×' + L.pactAssist(st));
    const summary = row((pact?.title || event.n) + ' · ' + timing, match.filter(Boolean).join('\n'));
    if (event.p !== undefined) summary.meter = { value: event.p, max: 1 };
    const actions = L.advise(st, 'goal').acts.filter(action => action.id !== 'idle');
    const rest = [link('看变强建议', 'growth:goal'), link('看历法', 'calendar')];
    if (L.canTrain(st)) rest.unshift(link('老祖特训', 'train'));
    return [summary, ...actions.map(action => adviceRow(st, action)), row('其他准备', '', rest)];
  }

  const tripId = (k, d, a) => ['trip', k, d, a].join(':');
  function tripArgs(panel) {
    const m = /^trip:(\d+):([0-2]):([0-2])$/.exec(panel || '');
    if (!m) return null;
    const args = m.slice(1).map(Number);
    return L.REGIONS[args[0]] ? args : null;
  }

  function trip(st, k, d, a) {
    if (!L.expOpen(st, k, d, a)) return [row('这一格尚未开放', '', [button('返回历练', 'navigate', ['exp:' + k])])];
    const f = L.expForecast(st, k, d, a);
    const args = [k, d, a];
    const validEscort = escortFor(st, k);
    const escort = validEscort >= 0 && st.flags.mobileEscort === k;
    const lines = [
      '战力 ' + fmt(f.T) + ' / 推荐 ' + fmt(f.rec),
      '预计评价 ' + f.text,
      '灵石约 ' + fmt(f.stones) + (escort ? '（归宗门）' : '') + ' · 负伤风险 ' + L.pct(f.risk),
      f.first ? '第一趟只有小怪，保底得到一把剑。' : L.RATINGS.map((rating, i) => rating + ' ' + L.pct(f.dist[i])).join(' · '),
      f.warnFull ? '当前修为已满，超出的修为只能暂存一部分。' : '',
      f.warnInj ? L.injText(st.p.inj) + '，带伤出战会降低战力。' : '',
      f.leap ? '越级挑战，乙等以上额外获得奖励。' : '',
    ];
    const rows = [row(L.REGIONS[k].n + ' · ' + L.DEPTHS[d] + ' · ' + L.APPR[a].n, lines.filter(Boolean).join('\n'))];
    const depths = L.DEPTHS.flatMap((label, index) => index !== d && L.expOpen(st, k, index, a) ? [link(label, tripId(k, index, a))] : []);
    const approaches = L.APPR.flatMap((entry, index) => index !== a && L.expOpen(st, k, d, index) ? [link(entry.n, tripId(k, d, index))] : []);
    if (depths.length) rows.push(row('更换深度', '', depths));
    if (approaches.length) rows.push(row('更换行事', '', approaches));

    const cell = L.cellFoes(k, d);
    const elite = L.expNodes(st, k, d, a, L.expLen(k, st)).some(node => node.t === 'elite');
    const foes = [...new Set(elite ? [...cell.mobs, cell.elite] : cell.mobs)].filter(id => L.FOES[id]).map(id => {
      const foe = L.FOES[id];
      return foe.n + (st.meta.foes?.[id] ? ' · ' + L.elName(foe.el) : '');
    });
    if (foes.length) rows.push(row('沿途可能遇到', foes.join(' / ')));
    const recommendation = L.artRecommend(st, 1);
    if (L.artSlotOpen(st, 1)) {
      const equipped = L.artSlots(st)[1];
      const arts = L.artList(st, 1).filter(item => item.id !== equipped);
      if (arts.length || equipped) rows.push(row('战技', equipped ? '当前《' + L.art(equipped).n + '》' : '尚未装配',
        arts.map(item => button((recommendation?.id === item.id ? '荐 · ' : '') + item.A.n + ' · ' + L.elName(item.A.el), 'equip-art', [item.id]))));
    }
    if (L.unlocked(st, 'comp')) {
      const current = L.comp(st);
      const cands = L.COMP_IDS.filter(id => id !== current && !L.compWhy(st, id));
      const companions = cands.map(id => button('邀请 ' + L.compName(st, id), 'companion', [id]));
      if (current) companions.push(button('不带同伴', 'companion', [null]));
      if (companions.length || L.compList(st).length) rows.push(row('同行', L.compList(st).map(id => L.compName(st, id) + ' · ' + L.COMP[id].n).join('\n'), companions));
    }
    if (validEscort >= 0) rows.push(row('护送同门', '灵石归宗门，贡献 ×3',
      [button(escort ? '取消护送' : '本趟护送', 'trip-escort', [k, !escort])]));
    const depart = button('出发 ◆' + L.apCost(st, 'exp', args), 'trip-go', ['exp', ...args], L.apWhy(st, 'exp', args));
    const alternatives = [];
    if (!L.sweepWhy(st, ...args)) alternatives.push(button('扫荡 ◆' + L.apCost(st, 'sweep', args), 'trip-go', ['sweep', ...args], L.apWhy(st, 'sweep', args)));
    if (f.warnInj && L.canHeal(st)) alternatives.push(button('服丹疗伤', 'heal'));
    alternatives.push(button('掉落与心愿', 'navigate', ['drops:' + k]), button('返回历练地点', 'navigate', ['exp:' + k]));
    rows.push(row('行动', '', [depart, ...alternatives.map(choice => ({ ...choice, primary: false }))]));
    return rows;
  }

  function escortFor(st, k) {
    return st.sect?.tasks?.findIndex(task => task.ty === 'escort' && task.taken && !task.done && task.k === k) ?? -1;
  }

  function attributes(st) {
    const p = st.p, talent = L.TALENTS[p.t]?.n;
    const identity = st.sect ? L.sectOf(st).n + ' · ' + L.srankName(st, st.sect.rank) : '散修';
    return [
      row(p.name + (st.title ? ' · ' + st.title : ''), [identity, talent, '第 ' + (st.rebirth + 1) + ' 世', ...(p.tr || []).map(id => L.TRAITS[id]?.n)].filter(Boolean).join(' · ')),
      row(L.stageName(p), '享年 ' + Math.floor(p.age) + ' 岁 · ' + L.lifeMonths(st).text),
      row('战力 ' + fmt(L.power(st)), '', [link('查看战力', 'growth:atk')]),
      row('修炼 +' + fmt(L.gain(st)) + ' / 月', '', [link('查看修炼', 'growth:cul')]),
      row('灵石 +' + fmt(L.income(st)) + ' / 月', '', [link('查看灵石', 'growth:inc')]),
      row('道基 +' + L.pct(L.daoji(st)), '', [link('看道心与因果', 'dao'), link('打开包裹', 'bag')]),
    ];
  }

  function dao(st) {
    const rows = L.DAO_KEYS.map(id => {
      const n = L.daoN(st, id), level = L.daoLv(st, id), next = L.daoNext(st, id);
      const detail = L.DAO[id].fx.map((line, index) => L.DAO_TH[index] + ' 笔 · ' + line).join('\n');
      return { ...row(L.DAO[id].n + ' · ' + n + ' 笔' + (next ? ' · 距下一级 ' + (next - n) : ' · 已满'), detail),
        meter: { value: n - (L.DAO_TH[level - 1] || 0), max: next ? next - (L.DAO_TH[level - 1] || 0) : 1, after: next ? undefined : 1 } };
    });
    const karma = L.karmaRebirth(st);
    rows.push(row('道基 +' + L.pct(L.daoji(st)), (st.trib.rec || []).map(x => (x.r >= 9 ? '飞升' : L.REALMS[x.r].n) + ' · ' + x.g).join('\n')));
    rows.push(row('因果 · 未了 ' + L.karmaOpen(st).length + ' · 已了结 ' + karma.done,
      [...L.karmaOpen(st), ...L.karmaState(st).list.filter(x => x.done).slice(-3)].map(x =>
        [x.who, x.title, x.n, x.done ? '已了结' : '未了'].filter(Boolean).join(' · ')).join('\n')));
    return rows;
  }

  function achievements(st) {
    const titleAction = id => st.title === id ? [] : [button('佩戴称号', 'choose-title', [id])];
    const rows = [row('已达成 ' + L.ACHS.filter(item => st.ach[item.id]).length + ' / ' + L.ACHS.length)];
    for (const item of L.ACHS) {
      const earned = !!st.ach[item.id];
      rows.push(row(item.n + (earned ? ' · ' + item.t : ' · 未达成'), item.d + (st.title === item.t ? '\n佩戴中' : ''), earned ? titleAction(item.t) : []));
    }
    for (const id of st.titles.filter(id => !L.ACHS.some(item => item.t === id))) {
      rows.push(row(id, st.title === id ? '佩戴中' : '已获得', titleAction(id)));
    }
    return rows;
  }

  function reports(st) {
    const reports = L.yearHist(st).slice(0, 30);
    return reports.length ? reports.map(item => row('第 ' + item.y + ' 年',
      [L.REALMS[Math.min(item.r, 9)].n, '战力 ' + fmt(item.pw), '历练 ' + item.exp + ' 趟', item.rank ? '天骄榜第 ' + item.rank : ''].filter(Boolean).join(' · '))) :
      [row('还没有年报', '过完一年后就能在这里回看。')];
  }

  function path(st) {
    const rows = [];
    for (const chapter of L.pathView(st)) {
      const state = { done: '已完成', now: '进行中', miss: '主线未了', next: '下一章', lock: '尚未解锁' }[chapter.state];
      const title = chapter.chN + ' · ' + chapter.n;
      if (chapter.state === 'now') {
        rows.push(row(title, [state, chapter.goal, '已开 ' + chapter.opened.length + ' 项 · 余 ' + chapter.toOpen + ' 项'].join('\n'),
          [button('看主线行动', 'navigate', ['journey']), link('看变强建议', 'growth:goal')]));
        for (const progress of chapter.prog.filter(item => item.text)) {
          rows.push({ ...row(progress.text), meter: { value: progress.v, max: progress.max || 1 } });
        }
      } else {
        rows.push(row(title, [state, chapter.realm, chapter.state === 'next' ? chapter.blurb : ''].filter(Boolean).join(' · ')));
      }
    }
    return rows;
  }

  function inbox(st) {
    const mail = L.mailbox(st).slice(0, 20);
    const rows = mail.map(item => row(item.t, item.left == null ? '' : '还有 ' + Math.ceil(item.left / 3) + ' 季',
      [button('查看', 'read-mail', [item.id])]));
    if (L.visitorEvent(st) && !mail.some(item => item.k === 'visitor')) {
      rows.unshift(row('门口有人来访', '还有 ' + Math.ceil(st.visitor.left / 3) + ' 季',
        [button('接见', 'navigate', ['visitor'])]));
    }
    return rows.length ? rows : [row('还没有新消息')];
  }

  function train(st) {
    const why = L.apWhy(st, 'train');
    if (!L.canTrain(st)) return [row('老祖特训', why, [link('去备战', 'prep')])];
    const pact = L.pactInfo(st);
    return [row('老祖特训', '约战还有 ' + Math.ceil(pact.left / 3) + ' 季 · 胜算 ' + L.pct(pact.p) + '\n修炼 ×3，无需灵石。',
      [button('接受特训 ◆' + L.AP.train, 'train-now', [], why)])];
  }

  const views = { bag, prep, attributes, dao, achievements, reports, path, inbox, train };
  const unlockGuides = {
    home: ['home', '洞府建筑可提高日常修炼与收入。', 'array'],
    retreat: ['growth:cul', '花 ' + L.AP.retreat + ' 点闭关，当季结算修为。', 'retreat'],
    gearCmp: ['equipment', '对比新法宝，换上更好的，或熔炼成材料。', 'gear'],
    bt: ['growth:bt', '修为圆满后可冲击下一个境界。', 'pojing'],
    tour: ['rankings', '查看名次与对手，年末论道可继续往上打。'],
    market: ['market', '可购买破境丹和其他修炼物资。'],
    sect: ['sect', '完成宗门任务可以积攒贡献。'],
    visitor: ['inbox', '访客到来时会发纸鹤，记得在离开前接见。'],
    field: ['home', '灵田每月收获，可在洞府空地开田。', 'field'],
    furnace: ['home', '建丹炉后可以炼丹，也能提高突破成功率。', 'furnace'],
    arts: ['arts', '心法影响修炼速度，可在功法页换上。', 'gscroll'],
    trib: ['growth:bt', '渡雷劫前可准备丹药和护劫手段。', 'buff'],
    pets: ['pets', '派灵宠出战增加战力，也可喂养培养。', 'egg'],
    plus: ['equipment', '消耗灵矿和灵石强化法宝。', 'ore'],
    cal: ['calendar', '查看四季加成、秘境窗口和近期大事。'],
    zhanji: ['arts', '战技有五行相克，可出发前换装。', 'gear'],
    realm: ['realm', '入夏后可持秘境令入内，逐层探索。', 'token'],
    bond: ['people', '接见、送礼和完成委托可加深羁绊。'],
    plots: ['home', '空地上可建不同用途的建筑。', 'cave'],
    zhen: ['formations', '换阵后下季生效。', 'array'],
    dao: ['dao', '抉择积累道心，因果会在后续奇遇中应验。'],
    disc: ['disciples', '收徒、交办差事、传授功法并安排出师。'],
    codex: ['codex', '收录见过的功法、法宝、人物和结局。'],
  };
  const focusOf = id => typeof id === 'string' && id.startsWith('growth:') ? id.slice(7) : '';
  return {
    has(id) { return Object.hasOwn(views, id) || Object.hasOwn(focuses, focusOf(id)) || !!tripArgs(id); },
    read(st, id) {
      if (Object.hasOwn(views, id)) return views[id](st);
      const args = tripArgs(id);
      return args ? trip(st, ...args) : growth(st, focusOf(id));
    },
    opened(st, id) {
      if (id === 'bag') bagOpened(st);
      if (id === 'prep') L.prepSeen(st);
      if (id === 'growth:goal') L.adviseSeen(st);
      const args = tripArgs(id);
      if (args && L.expOpen(st, ...args)) L.artRecSelect(st, args[0], args[1]);
    },
    unlock(id) { return unlockGuides[id]; },
    escortFor, tripId,
  };
})();
