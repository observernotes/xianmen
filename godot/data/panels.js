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
      const details = [
        L.gearMainText(st, item),
        ...(item.aff || []).map(L.gearAffText),
        L.GOLD_AFFIX[item.gold]?.n,
        ...(item.edge || []).map(id => '开锋 · ' + L.EDGE[id].n),
        cost,
      ].filter(Boolean);
      if (info && L.gearOpen(st, 'reroll')) item.aff.forEach((id, index) => buttons.push(button(
        '洗练 · ' + L.AFFIX[id].n, 'gear-reforge', [slot, index], L.gearReforgeWhy(st, slot, index),
      )));
      if (info && L.gearEdgeDue(item)) for (const id of L.gearEdgeOpts(item)) {
        const edge = L.EDGE[id];
        buttons.push({ ...button('开锋 · ' + edge.n + ' · ' + edge.d, 'gear-edge', [slot, id]),
          confirm: '将这次开锋定为「' + edge.n + '」？' });
      }
      if (slot === 'w' && L.gearOpen(st, 'infuse')) {
        const resources = L.gearInfuseCost(item);
        details.push('淬灵 · 同系灵核 ' + resources.core + ' 枚 · 灵矿 ' + resources.ore);
        for (const [id, name] of Object.entries(L.ELEM)) {
          if (id === L.gearEl(item)) continue;
          buttons.push(button('淬成' + name + '系', 'gear-infuse', [item.u, id], L.gearInfuseWhy(st, item.u, id)));
        }
      }
      return row(L.GEAR_N[slot] + ' · ' + L.gearName(item) + L.gearStars(item), details.join('\n'), buttons);
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

  function forge(st) {
    const rows = [row('器炉 Lv' + L.forgeLv(st), L.gearOpen(st, 'forge') ? '打造的法宝随后可在法宝页装备。' : L.gearOpenWhy(st, 'forge'))];
    for (const plan of Object.values(L.PLAN)) {
      if (!L.planOwned(st, plan.id)) continue;
      const needs = L.planNeeds(st, plan.id).map(item => (item.ok ? '✓ ' : '') + item.t + ' · 持有 ' + fmt(item.have));
      rows.push(row(plan.n, [...plan.aff.map(L.gearAffText), ...needs].join('\n'), [
        button('打造', 'gear-forge', [plan.id], L.canForge(st, plan.id)),
      ]));
    }
    if (rows.length === 1) rows.push(row('器方', '历练、首领战或宗门宝库可获得器方。'));
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

  function auction(st) {
    if (!L.auctionOpen(st)) {
      return [row('拍卖会', L.unlocked(st, 'auction') && (st.rebirth || L.mr(st) >= 2)
        ? '下一场拍卖会 · ' + L.seasonsText(L.nextAuction(st)) + '后'
        : '金丹期解锁拍卖会。')];
    }
    const sale = st.auction;
    return [
      row('本场拍卖', '剩余出价 ' + L.auctionBidsLeft(st) + ' 次 · ' + L.seasonsText(sale.until - st.tick) + '后散场\n拍下才扣灵石。'),
      ...sale.items.map((lot, index) => {
        const status = lot.res === 'won' ? '已拍下 · 花费 ' + fmt(lot.paid) + ' 灵石'
          : lot.res === 'comp' ? '由' + lot.comp?.n + '拍走' : lot.res ? '由其他修士拍走' : '';
        const options = lot.res ? [] : L.AUCTION.tiers.map((tier, level) => {
          const bid = L.bidInfo(st, index, level);
          return button(tier.n + ' · ' + fmt(bid.price) + ' 灵石 · ' + L.pct(bid.p), 'auction-bid', [index, level], bid.why);
        });
        return row(lot.n, status || (lot.comp ? '竞拍者 · ' + lot.comp.n : '无人竞拍'), options);
      }),
    ];
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

  function sectVault(st) {
    if (!st.sect) return [row('宗门宝库', '入宗后可以用贡献兑换。')];
    if (!L.unlocked(st, 'vault')) return [row('宗门宝库', '晋升内门或完成宗门任务后开放。')];
    const lots = L.vaultCells(st);
    return [
      row('可用贡献 ' + fmt(st.sect.pts), '轮换 · ' + L.seasonsText(L.vaultRestockIn(st)) + '后'),
      ...lots.map(item => row(item.n, item.d, [
        button('兑换 · ' + fmt(item.cost) + ' 贡献', 'vault-buy', [item.i], item.why),
      ])),
    ];
  }

  function sectElders(st) {
    if (!st.sect) return [row('宗门长老', '入宗后可以拜会长老。')];
    if (!L.unlocked(st, 'vault')) return [row('宗门长老', '晋升内门或完成宗门任务后开放。')];
    const rows = L.eldersOf(st).map(elder => {
      const gift = L.giftInfo(st, elder.id);
      const support = L.favor(st, elder.id) || 0;
      return row(elder.n, '支持 ' + support + ' / 100\n40 支持 · ' + L.elderFavDesc(st, elder, 40) +
        '\n80 支持 · ' + L.elderFavDesc(st, elder, 80), [
        button('送礼 · ' + gift.text, 'elder-gift', [elder.id], gift.why),
      ]);
    });
    const active = L.duty(st);
    rows.push(row('职司', active ? '现任 · ' + L.DUTIES[active].n : L.dutyOpen(st) ? '尚未领职' : L.dutyWhy(st)));
    if (L.dutyOpen(st)) for (const [id, duty] of Object.entries(L.DUTIES)) {
      rows.push(row(duty.n, duty.d, [button('领职', 'set-duty', [id], active === id ? '已任此职' : L.dutyWhy(st))]));
    }
    if (st.sect.id === 'xuesha') rows.push(row('因果换贡献', '一条因果可换 ' + fmt(L.karmaTradeVal(st)) + ' 贡献。', [
      button('兑换', 'karma-trade', [], L.karmaTradeWhy(st)),
    ]));
    return rows;
  }

  function people(st) {
    const selected = L.comp(st);
    const companionWhy = id => selected === id ? '' : !L.unlocked(st, 'comp') ? '同伴功能尚未开放' : L.compWhy(st, id);
    const known = L.PPL.filter(id => L.met(st, id) || st.daolv === id);
    const rows = [row('同行', selected ? L.compName(st, selected) : '暂无同伴')];
    if (st.eflags.tiankuo_ally) rows.push(row(L.compName(st, 'tian'), L.COMP.tian.d, [
      button(selected === 'tian' ? '解除同行' : '邀请同行', 'companion', [selected === 'tian' ? null : 'tian'], companionWhy('tian')),
    ]));
    if (!known.length) rows.push(row('羁绊', '历练或接见洞府访客时可以结识人物。'));
    for (const id of known) {
      const npc = L.NPCS[id];
      const status = [npc.title, '好感 ' + L.aff(st, id), L.HEART_N[L.hearts(st, id)]];
      const options = [];
      if (st.daolv === id) {
        status.push('道侣');
        options.push(button('双修 ◆' + L.AP.retreat, 'dual-practice', [], L.apWhy(st, 'retreat', { sx: true })));
      } else {
        options.push(button(selected === id ? '解除同行' : '邀请同行', 'companion', [selected === id ? null : id], companionWhy(id)));
      }
      rows.push(row(L.npcName(st, id), status.join(' · ') + '\n' + L.friendText(st, id) + '\n同行 · ' + L.COMP[id].d, options));
      if (L.pgiftVisitor(st) === id) {
        const why = L.pgiftWhy(st, id);
        const gifts = why ? [] : L.pgiftOpts(st, id).map(gift => button(
          gift.text + (gift.mark === 'like' ? ' · 喜欢' : gift.mark === 'hate' ? ' · 讨厌' : ''),
          'person-gift', [id, gift.key],
        ));
        rows.push(row('向' + L.npcName(st, id) + '送礼', why || (gifts.length ? '' : '身边没有可送的礼物。'), gifts));
      }
      for (const sequence of [1, 2]) {
        const quest = L.pqDef(id, sequence);
        const progress = L.pqProg(st, id, sequence);
        const deliver = progress.s === 'on' && quest.ty === 'give'
          ? [button('交付', 'person-quest', [id, sequence], L.pqGiveWhy(st, id, sequence))] : [];
        rows.push(row('委托 · ' + L.fill(st, quest.t),
          [progress.s === 'on' ? L.pqDesc(st, id, sequence) : '', progress.t].filter(Boolean).join('\n'), deliver));
      }
    }
    return rows;
  }

  function disciples(st) {
    if (!L.discOpen(st)) return [row('门下', '成为真传弟子后可以收徒。')];
    const pupils = L.discList(st);
    const rows = [row('门下 ' + pupils.length + ' / ' + L.discCap(st), '本世已出师 ' + L.discGraduated(st) + ' 人')];
    const candidates = L.discState(st).cand || [];
    if (!L.discFull(st) && candidates.length) {
      candidates.forEach((candidate, index) => rows.push(row(candidate.n,
        L.DISC_T[candidate.t].n + ' · ' + L.TEMPERS[candidate.tp].n, [button('收徒', 'disciple-take', [index])])));
      rows.push(row('候选', '', [button('谢绝本批候选', 'disciple-pass')]));
    }
    for (const pupil of pupils) {
      const status = [L.discStage(pupil), '战力 ' + fmt(L.discPow(st, pupil)), '情分 ' + pupil.heart, L.TEMPERS[pupil.tp].n];
      if (pupil.job) status.push(L.DISC_JOB[pupil.job].n);
      if (pupil.rest > st.tick) status.push('正在休养');
      const jobs = Object.entries(L.DISC_JOB).flatMap(([id, job]) => id === pupil.job ? []
        : [button(job.n, 'disciple-job', [pupil.u, id])]);
      if (pupil.job) jobs.push(button('停止差事', 'disciple-job', [pupil.u, '']));
      rows.push(row(pupil.n, status.join(' · '), jobs));
      const arts = L.discTeachList(st, pupil);
      rows.push(row('传授 · ' + pupil.n, arts.length ? '' : L.discTeachWhy(st, pupil), arts.map(id => button(
        '传授《' + L.art(id).n + '》 ◆' + L.AP.errand, 'disciple-teach', [pupil.u, id],
        L.apWhy(st, 'errand', { u: pupil.u, art: id }) || L.discTeachWhy(st, pupil, id),
      ))));
      if (L.discCanGrad(pupil)) rows.push(row('出师 · ' + pupil.n, '宗门贡献 +' + fmt(L.discGradContrib(st, pupil)),
        [button('安排出师', 'disciple-graduate', [pupil.u])]));
    }
    return rows;
  }

  function calendar(st) {
    const current = L.SEASONS[L.season(st)];
    const rows = [row(L.dateText(st), L.calOpen(st) ? current.d : '筑基并了结三年之约后，开放四季加成与天下大势。')];
    for (const event of L.bigList(st)) {
      const when = event.seasons <= 1 ? '本季末' : event.seasons + ' 季后';
      rows.push(row(event.n, [when, event.foe?.n, event.p === undefined ? '' : '胜算 ' + L.pct(event.p)].filter(Boolean).join(' · ')));
    }
    if (L.calOpen(st)) {
      const world = L.world(st);
      if (world) rows.push(row(L.WORLD[world.id].n, L.worldDesc(st, world) + '\n还剩 ' + Math.ceil(L.worldLeft(st) / 3) + ' 季'));
      const window = L.realmWindow(st);
      rows.push(row('秘境窗口', !window.open ? '距开放 ' + Math.ceil(window.in / 3) + ' 季' : '开放 · 还剩 ' + Math.ceil(window.left / 3) + ' 季'));
      for (const season of L.SEASONS) if (season !== current) rows.push(row(season.n, season.d));
    }
    return rows;
  }

  function rankings(st) {
    const rows = [row('天骄榜第 ' + st.rank + ' 名', '本世最高第 ' + st.bestRank + ' 名')];
    const targets = L.challengeTargets(st);
    for (const info of targets.filter(info => info.rankDuel)) rows.push(row(info.n, '第 ' + info.q + ' 名 · 胜算 ' + L.pct(info.p), [
      { label: '准备下战帖', duel: { q: info.q }, why: L.apWhy(st, 'duel', { q: info.q }) },
    ]));
    for (const rival of L.RIVALS) {
      const id = rival.id;
      const info = L.challengeInfo(st, id);
      const dossier = L.RIVAL_INFO[id];
      const known = L.rivalKnow(st, id);
      const lines = [rival.sect, '恩怨 ' + L.grudge(st, id), st.beaten[id] ? '已击败' : '第 ' + info.q + ' 名'];
      lines.push('五行 ' + (known.el ? L.elName(L.RIVAL_EL[id]) : '未知'));
      lines.push('战技 ' + (known.art ? L.art(dossier.art).n : '未知'));
      lines.push('法宝 ' + (known.gear ? dossier.gear.n : '未知'));
      const options = info.main && !st.beaten[id] ? [
        { label: '准备下战帖', duel: { id }, why: L.apWhy(st, 'duel', { id }) },
      ] : [];
      rows.push(row(info.n, lines.join(' · '), options));
    }
    const rookie = L.rookieInfo(st);
    if (rookie) rows.push(row('新秀 · ' + rookie.rk.n,
      ['第 ' + rookie.q + ' 名 · 战力 ' + fmt(rookie.Q), '「' + L.fill(st, rookie.rk.line) + '」'].join('\n')));
    for (let start = 1; start <= 100; start += 10) {
      const entries = Array.from({ length: 10 }, (_, i) => {
        const q = start + i;
        return q + ' · ' + (q === st.rank ? st.p.name : L.rivalAt(st, q)?.n || '—');
      });
      rows.push(row('第 ' + start + '–' + (start + 9) + ' 名', entries.join('\n')));
    }
    return rows;
  }

  function journal(st) {
    const rows = [row('本世',
      [L.stageName(st.p), '享年 ' + fmt(st.p.age) + ' 岁', '寿元剩余 ' + fmt(Math.max(0, L.lifeLeft(st))) + ' 年',
        '最高天骄榜第 ' + st.bestRank, '道基 +' + L.pct(L.daoji(st))].join(' · '))];
    const karma = L.karmaOpen(st);
    if (karma.length) rows.push(row('未了因果', karma.map(entry => [entry.who, entry.title || entry.n].filter(Boolean).join(' · ')).join('\n')));
    for (const entry of st.log) rows.push(row(entry.t, entry.text));
    return rows;
  }

  function codex(st) {
    if (!L.unlocked(st, 'codex')) return [row('图鉴', '金丹期解锁图鉴。')];
    return [
      row('图鉴完成度 ' + L.pct(L.codexPct(st)), '记录 ' + L.codexCells(st) + ' / ' + L.codexTotal(st) + ' 项'),
      ...L.codexList(st).filter(entry => entry.avail).map(entry => row(entry.n,
        entry.d + '\n已记 ' + entry.got + ' / ' + entry.total, [{ label: '查看', panel: 'codex:' + entry.id }])),
    ];
  }

  function codexDetail(st, id) {
    if (!L.unlocked(st, 'codex')) return codex(st);
    const definition = L.CODEX_CAT[id];
    const data = L.codexCat(st, id);
    if (!data.avail) return codex(st);
    return [
      row(data.n, data.d + '\n已记 ' + data.got + ' / ' + data.total),
      ...definition.cells(st).map(group => {
        const known = group.list.filter(cell => cell.on).map(cell => cell.n);
        return row(group.g || data.n, (known.join('、') || '尚未记录') +
          (known.length < group.list.length ? '\n待发现 ' + (group.list.length - known.length) + ' 项' : ''));
      }),
    ];
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

  const views = { equipment, forge, arts, market, auction, sect, sectVault, sectElders, disciples, people,
    home, formations, fields, alchemy, pets, calendar, journal, rankings, codex };
  const codexId = name => typeof name === 'string' && name.startsWith('codex:') ? name.slice(6) : '';
  const has = name => Object.hasOwn(views, name) || Object.hasOwn(L.CODEX_CAT, codexId(name));
  const mutations = {
    'gear-plus': (st, slot) => L.gearPlus(st, slot),
    'gear-decision': (st, uid, decision) => L.gearDecide(st, uid, decision),
    'gear-reforge': (st, slot, i) => L.gearReforge(st, slot, i),
    'gear-edge': (st, slot, id) => L.gearEdge(st, slot, id),
    'gear-infuse': (st, uid, id) => L.gearInfuse(st, uid, id),
    'gear-forge': (st, id) => L.forge(st, id),
    'equip-art': (st, id) => L.equipArt(st, id),
    'market-buy': (st, index) => L.shelfBuy(st, index),
    'market-sell': (st, key, fraction) => L.sell(st, key, fraction),
    'auction-bid': (st, i, tier) => L.auctionBid(st, i, tier),
    'vault-buy': (st, i) => L.vaultRotBuy(st, i),
    'elder-gift': (st, id) => L.giftElder(st, id),
    'set-duty': (st, id) => L.setDuty(st, id),
    'karma-trade': st => L.karmaTrade(st),
    'companion': (st, id) => L.setComp(st, id),
    'dual-practice': st => L.act(st, 'retreat', { sx: true }),
    'person-gift': (st, id, key) => L.pgiftGive(st, id, key),
    'person-quest': (st, id, i) => L.pqGive(st, id, i),
    'disciple-take': (st, i) => L.discTake(st, i),
    'disciple-pass': st => L.discPass(st),
    'disciple-job': (st, uid, id) => L.discSetJob(st, uid, id),
    'disciple-teach': (st, uid, id) => L.act(st, 'errand', { u: uid, art: id }),
    'disciple-graduate': (st, uid) => L.discAskGrad(st, uid, true),
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
    has,
    read(st, name) {
      if (!has(name)) throw new Error('找不到这个面板');
      return Object.hasOwn(views, name) ? views[name](st) : codexDetail(st, codexId(name));
    },
    perform(st, panel, name, args) {
      if (!Object.hasOwn(mutations, name)) throw new Error('找不到这项操作');
      const signature = JSON.stringify(args);
      const selected = this.read(st, panel).flatMap(entry => entry.buttons)
        .find(item => item.name === name && JSON.stringify(item.args) === signature);
      if (!selected || selected.why) throw new Error(selected?.why || '此刻无法完成这项操作');
      const result = mutations[name](st, ...args);
      if (!result) throw new Error('此刻无法完成这项操作');
      return result;
    },
  };
})();
