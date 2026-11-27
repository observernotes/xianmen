/* Equipment and management screens shared by the native panel renderer. */
globalThis.XianmenPanels = (() => {
  'use strict';
  const fmt = L.fmt;
  const button = (label, name, args = [], why = '') => ({ label, name, args, why });
  const row = (title, text = '', buttons = []) => ({ title, text, buttons });

  function equipment(st) {
    const rows = L.GEAR_SLOTS.map(slot => {
      const item = st.gear[slot], info = item && L.gearPlusInfo(st, slot);
      if (!item) return row(L.GEAR_N[slot], L.gearOpenWhy(st, slot) || '空');
      const buttons = info && !info.max
        ? [button('强化', 'gear-plus', [slot], info.why)]
        : [];
      const cost = buttons.length
        ? '强化消耗 ' + fmt(info.cost.stones) + ' 灵石 · ' + fmt(info.cost.ore) + ' 灵矿 · ' + L.pct(info.rate)
        : '';
      return row(L.GEAR_N[slot] + ' · ' + L.gearName(item), cost, buttons);
    });
    for (const item of st.gear.pend) {
      if (item.hold) { rows.push(row(L.gearName(item), L.gearOpenWhy(st, item.slot))); continue; }
      const delta = L.gearDelta(st, item);
      rows.push(row('新到 · ' + L.gearName(item), '战力 ' + fmt(delta.a.p) + ' → ' + fmt(delta.b.p), [
        button('换上', 'gear-decision', [item.u, 'equip']),
        button('熔炼', 'gear-decision', [item.u, 'smelt']),
      ]));
    }
    return rows;
  }

  function arts(st) {
    return ['心法', '战技', '秘术'].flatMap((slot, index) => {
      if (!L.artSlotOpen(st, index)) return [row(slot, L.artSlotWhy(index))];
      const rows = L.artList(st, index);
      if (!rows.length) return [row(slot, '尚未习得')];
      return rows.map(art => row(
        slot + ' · ' + art.A.n + (art.cur ? ' · 已装配' : ''),
        L.artTierName(art.A.t) + ' · ' + L.artDesc(st, art.id) + (art.why ? '\n荐：' + art.why : ''),
        art.cur ? [] : [button('装配', 'equip-art', [art.id])],
      ));
    });
  }

  function market(st) {
    const products = L.shelf(st).map(item => row(item.n, [
      item.d, item.lock || (item.left > 0 ? fmt(item.price) + ' 灵石' : '售罄'),
    ].filter(Boolean).join('\n'), item.k && !item.lock ? [button('购买', 'market-buy', [item.i], L.shelfWhy(st, item))] : []));
    if (L.sellOpen(st)) {
      for (const key of L.SELL_KEYS) {
        const stock = L.sellHave(st, key);
        products.push(row('出售 · ' + L.SELL[key].n, '持有 ' + fmt(stock) + ' · 单价约 ' + fmt(L.sellPrice(st, key)), [
          button('卖一半', 'market-sell', [key, 0.5], stock ? '' : '没有存货'),
          button('全部卖出', 'market-sell', [key, 1], stock ? '' : '没有存货'),
        ]));
      }
    }
    return products;
  }

  function sect(st) {
    if (!st.sect) {
      if (!st.pact) return [row('散修', '三年之约后可以拜山门。')];
      return L.SECTS.filter(school => L.sectJoinable(st, school.id)).map(school => {
        const args = { id: school.id };
        return row(school.n, school.d || '', [button('拜山门 ◆1', 'sect-join', [school.id], L.apWhy(st, 'join', args))]);
      });
    }
    const promotion = L.promoteNeeds(st);
    const next = L.SRANKS[st.sect.rank + 1];
    const rows = [row(
      L.sectOf(st).n + ' · ' + L.srankName(st, st.sect.rank),
      '累计贡献 ' + fmt(st.sect.total) + ' · 可用 ' + fmt(st.sect.pts),
    )];
    if (next) rows.push(row(
      '晋升 · ' + L.srankName(st, st.sect.rank + 1),
      promotion.map(requirement => (requirement.ok ? '✓ ' : '· ') + requirement.t).join('\n'),
      [button('晋升', 'sect-promote', [], L.apWhy(st, 'promote'))],
    ));
    for (const [index, task] of st.sect.tasks.entries()) {
      const buttons = [];
      if (!task.taken && !task.done) {
        if (['teach', 'lecture'].includes(task.ty)) buttons.push(button('办差 ◆1', 'sect-errand', [index], L.apWhy(st, 'errand', { task: index })));
        else buttons.push(button('接取', 'task-take', [index]));
      }
      if (L.taskCanDeliver(st, task)) buttons.push(button('上交', 'task-deliver', [index]));
      rows.push(row(L.taskText(st, task), task.done ? '已完成' : L.taskReward(st, task), buttons));
    }
    return rows;
  }

  const views = { equipment, arts, market, sect };
  const mutations = {
    'gear-plus': (st, slot) => L.gearPlus(st, slot),
    'gear-decision': (st, uid, decision) => L.gearDecide(st, uid, decision),
    'equip-art': (st, id) => L.equipArt(st, id),
    'market-buy': (st, index) => L.shelfBuy(st, index),
    'market-sell': (st, key, fraction) => L.sell(st, key, fraction),
    'sect-join': (st, id) => L.act(st, 'join', { id }),
    'sect-promote': st => L.act(st, 'promote'),
    'sect-errand': (st, index) => L.act(st, 'errand', { task: index }),
    'task-take': (st, index) => L.taskTake(st, index),
    'task-deliver': (st, index) => L.taskDeliver(st, index),
  };
  return {
    read(st, name) {
      if (!Object.hasOwn(views, name)) throw new Error('找不到这个面板');
      return views[name](st);
    },
    perform(st, panel, name, args) {
      if (!Object.hasOwn(mutations, name)) throw new Error('找不到这项操作');
      const signature = JSON.stringify(args);
      const enabled = this.read(st, panel).some(entry => entry.buttons.some(item => item.name === name && !item.why && JSON.stringify(item.args) === signature));
      if (!enabled || !mutations[name](st, ...args)) throw new Error('此刻无法完成这项操作');
    },
  };
})();
