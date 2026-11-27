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

  function home(st) {
    const rows = [row('洞府地块', '空闲 ' + L.homePlotFree(st) + ' / ' + L.homePlotMax(st))];
    for (const building of L.HOME) {
      const { k, n, d } = building;
      const info = L.upInfo(st, k);
      const buttons = [];
      if (!info.max) {
        const why = info.lock || (st.stones < info.cost ? '还差 ' + fmt(info.cost - st.stones) + ' 灵石' : '');
        const action = k === 'cave' ? '扩建' : info.built ? '升级' : '建造';
        buttons.push(button(action + ' · ' + fmt(info.cost) + ' 灵石', 'home-upgrade', [k], why));
      }
      if (!L.demolishWhy(st, k)) buttons.push({
        ...button('拆除 · 返还 ' + fmt(L.homeRefund(st, k)) + ' 灵石', 'home-demolish', [k]),
        confirm: '拆除' + n + '？这块地可以用来建造其他设施。',
      });
      rows.push(row(n + (info.lv ? ' Lv' + info.lv : ''), [d(info.lv), info.note].filter(Boolean).join('\n'), buttons));
    }
    return rows;
  }

  function formations(st) {
    if (!L.zhenOpen(st)) return [row('阵法', '筑基后期开放阵法。')];
    const slots = L.zhenSlots(st);
    const rows = L.zhenState(st).slice(0, slots).map((slot, index) => row(
      index === 0 ? '主阵位' : '第二阵位',
      (L.zhenName(slot.id) || '空') + (slot.nx ? ' → ' + L.zhenName(slot.nx) + '（' + L.seasonsText(slot.at - st.tick) + '后生效）' : ''),
      index > 0 && (slot.id || slot.nx) ? [button('撤下', 'formation-set', [index, ''])] : [],
    ));
    for (const formation of L.ZHEN) {
      const options = Array.from({ length: slots }, (_, index) => button(
        index === 0 ? '布于主阵位' : '布于第二阵位', 'formation-set', [index, formation.id], L.zhenSetWhy(st, index, formation.id),
      ));
      rows.push(row(L.zhenName(formation.id), L.zhenEffect(st, formation.id, 1), options));
    }
    return rows;
  }

  function fields(st) {
    if (!L.plotCount(st)) return [row('灵田', '先在洞府开垦灵田。')];
    return L.plots(st).map((plot, index) => row(
      '第 ' + (index + 1) + ' 块 · ' + L.CROP[plot.c].n,
      '成熟后自动收获 · 预计 ' + L.seasonsText(L.plotLeft(plot)),
      L.CROPS.filter(crop => L.cropsOpen(st) && crop.id !== plot.c && L.cropOpen(st, crop.id)).map(crop =>
        button('改种' + crop.n, 'field-plant', [index, crop.id], L.plantWhy(st, index, crop.id))),
    ));
  }

  function alchemy(st) {
    const rows = [row('药材', '灵草 ' + fmt(st.herbs) + ' · 天材地宝 ' + fmt(st.treasure) + ' · 丹毒 ' + fmt(st.toxin || 0))];
    for (const recipe of L.recipeList(st)) {
      const { k, n } = recipe;
      const cost = L.cellCost(st, recipe);
      const auto = L.autoOn(st, k);
      const stock = recipe.bag ? L.bagN(st, k) : 0;
      const text = ['灵草 ×' + fmt(cost.herbs), cost.treasure ? '天材地宝 ×' + fmt(cost.treasure) : '', L.yinText(cost.yin), stock ? '丹囊 ' + stock + ' 枚' : ''].filter(Boolean).join(' · ');
      const buttons = [button('炼制', 'alchemy-craft', [k], L.canCraft(st, k))];
      if (st.home.furnace > 0) buttons.push(button(auto ? '停止续炼' : '自动续炼', 'alchemy-auto', [k, !auto],
        !auto && L.danOf(st).auto.length >= L.AUTO.max ? '已续炼 ' + L.AUTO.max + ' 种' : ''));
      if (recipe.bag && stock > 0) buttons.push(button('服用', 'alchemy-take', [k], L.takeWhy(st, k)));
      rows.push(row(n, text, buttons));
    }
    if (L.yinOpen(st) && st.home.furnace > 0) for (const [first, second, id] of L.YIN_GRID) {
      const recipe = L.RECIPE[id];
      if (recipe.secret || L.recipeKnown(st, id)) continue;
      const cost = L.cellCost(st, recipe);
      rows.push(row('试炼 · ' + L.yinText(cost.yin), '灵草 ×' + fmt(cost.herbs), [
        button('试炼', 'alchemy-trial', [first, second], L.trialWhy(st, first, second)),
      ]));
    }
    return rows;
  }

  function pets(st) {
    const rows = [row('灵宠名册', L.petCount(st) + ' / ' + L.petCap(st) + ' · 兽粮 ' + fmt(st.feed || 0))];
    (st.pets || []).forEach((pet, index) => {
      const out = st.petOut === index;
      const role = out ? '出战' : L.PET_JOB[pet.job]?.n || '休息';
      const status = L.petResting(st, pet) ? ' · 护劫后休养' : '';
      const options = [button('喂养', 'pet-feed', [index], L.petFeedWhy(st, index))];
      if (!out) options.push(button('设为出战', 'pet-out', [index]));
      if (L.petJobsOpen(st)) for (const job of L.PET_JOBS) {
        if (job.k !== pet.job) options.push(button(job.n, 'pet-job', [index, job.k], L.petJobWhy(st, index, job.k)));
      }
      if (pet.job) options.push(button('休息', 'pet-job', [index, '']));
      if (L.petCanEvo(pet)) for (const branch of [1, 2]) {
        options.push(button('进化为' + L.petFormName(pet.sp, branch), 'pet-evolve', [index, branch], L.petEvolveWhy(st, index, branch)));
      }
      if (L.petCanAwake(pet)) options.push(button('觉醒', 'pet-awake', [index]));
      options.push({ ...button('放生', 'pet-release', [index]), confirm: '放生' + L.petName(pet) + '？' });
      rows.push(row(L.petName(pet) + ' Lv' + pet.lv, role + status + ' · ' + pet.heart + ' 心\n' + L.petTalText(pet), options));
    });
    (st.petPend || []).forEach((pet, index) => {
      const options = st.pets.map((old, i) => ({
        ...button('替换' + L.petName(old), 'pet-pending', [index, i]),
        confirm: '收下' + L.petName(pet) + '并放生' + L.petName(old) + '？',
      }));
      options.push({ ...button('放生', 'pet-pending', [index, -1]), confirm: '放生' + L.petName(pet) + '？' });
      rows.push(row('新到 · ' + L.petName(pet), '名册已满，可以替换已有灵宠。', options));
    });
    return rows;
  }

  const views = { equipment, arts, market, sect, home, formations, fields, alchemy, pets };
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
    'home-upgrade': (st, k) => L.upgrade(st, k),
    'home-demolish': (st, k) => L.demolish(st, k),
    'formation-set': (st, slot, id) => L.zhenSet(st, slot, id),
    'field-plant': (st, i, id) => L.plant(st, i, id),
    'alchemy-craft': (st, k) => L.craft(st, k),
    'alchemy-auto': (st, k, on) => L.setAuto(st, k, on),
    'alchemy-trial': (st, a, b) => L.trial(st, a, b),
    'alchemy-take': (st, k) => L.takePill(st, k),
    'pet-feed': (st, i) => L.petFeed(st, i),
    'pet-out': (st, i) => L.petSetOut(st, i),
    'pet-job': (st, i, k) => L.petSetJob(st, i, k),
    'pet-evolve': (st, i, b) => L.petEvolve(st, i, b),
    'pet-awake': (st, i) => L.petAwake(st, i),
    'pet-release': (st, i) => L.petRelease(st, i),
    'pet-pending': (st, j, i) => L.petPendDecide(st, j, i),
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
      const result = enabled && mutations[name](st, ...args);
      if (!result) throw new Error('此刻无法完成这项操作');
      return result;
    },
  };
})();
