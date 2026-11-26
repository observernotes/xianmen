/* 废柴仙途 · 界面片段 onboard：上手曲线（docs/ONBOARDING.md）——界面上每样东西开没开都问 UI.isOpen(key)（读逻辑层 src/logic/onboard.js 的解锁表）
 * 没开的系统界面上直接不出现：底栏入口、分页、按钮、HUD 格、角标、场景物件、问老祖的建议、札记、讲解与气泡都不出现（不是灰着锁着摆在那）。
 * 这里还管：解锁那一刻的仪式（底栏入口亮出来、横幅、子项的老祖气泡）、掌握时的飘字、底栏只留一个角标、浮字同时最多一条。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide-ask 之后：这里给已经登记好的讲解加“开了才讲”的条件）。 */
const UI = {
  isOpen: k => !st || !L.onbShown || L.onbShown(st, k),
  // 底栏五个入口：人物页等有东西看了（天骄榜、功法、法宝对比卡、羁绊任一样）才出现
  navOpen: nav => (nav === 'me' ? ['tour', 'arts', 'gearCmp', 'bond'].some(k => UI.isOpen(k)) : UI.isOpen(nav)),
};
// 讲解 id → 系统键：系统没开，这段讲解不讲（逻辑层的开放判定已经包过一层，这里兜底那些只看界面状态的）
const HINT_KEY = {
  field: 'field', retreat: 'retreat', retBtn: 'retreat', visitor: 'visitor', tuna: 'tuna', market: 'market', furnace: 'furnace', alch: 'furnace', sect: 'sect', tourSoon: 'tour', me: 'tour',
  art1: 'arts', art2: 'arts', zhanji: 'zhanji', ke: 'zhanji', mishu: 'mishu', gearCmp: 'gearCmp', gearPlus: 'plus', gearRobe: 'robe', gearOrn: 'orn', gearForge: 'forge',
  cal: 'cal', world1: 'world', shelf: 'shelf', sell: 'sell', auction: 'auction', realmOpen: 'realm', realm1: 'realm', realm2: 'realm', realm3: 'realm',
  pet1: 'pets', petEvo: 'pets', pet2: 'petJobs', crops: 'crops', herb: 'crops', rice: 'crops', yinGrid: 'yin', toxin: 'furnace', plots: 'plots', zhen: 'zhen', f_dujie: 'zhen', f_danhuo: 'zhen', f_juling: 'zhen',
  dao1: 'dao', karma1: 'dao', codex1: 'codex', duty1: 'duty', renmai1: 'vault', disc1: 'disc', ppGift: 'bond', ppQuest: 'bond', ppComp: 'comp', ppDaolv: 'bond', ppSx: 'bond',
  rvKezhi: 'zhanji', rvGrudge: 'tour', rvRookie: 'tour', meetSoon: 'sect', boss: 'exp',
};
for (const h of HINTS) { const k = HINT_KEY[h.id]; if (!k) continue; const w = h.when; h.when = () => UI.isOpen(k) && w(); }
// 一次只教一件事：这几段原来是“好”一下就过的讲解，改成“一段话 + 高亮一个动作”——点了那个入口就算听完（不暂停）
const PANEL_IS = { home: () => modalTitle() === '洞府', me: () => modalTitle() === '人物', sect: () => modalOpen() && !!document.querySelector('#modal [data-stab]') };
for (const [id, pn] of [['field', 'home'], ['retreat', 'home'], ['sect', 'sect'], ['furnace', 'home'], ['alch', 'home'], ['art1', 'me'], ['zhanji', 'me'], ['gearPlus', 'me'], ['pet1', 'home'], ['crops', 'home'], ['yinGrid', 'home'], ['plots', 'home']]) {
  const h = HINTS.find(x => x.id === id); if (!h || !h.btn) continue;
  delete h.btn; h.until = PANEL_IS[pn];
}
// 子项解锁（不是新系统，是已经会的系统里多了一样）：只冒一条老祖气泡，带数字，不暂停
const SUB_SAY = {
  herb: () => '',   // 采药、寻宝各有原来的气泡（guide-ask.js 的 u02 / u02b），不重复
  treasure: () => '',
  sell: () => `坊市多了【行情】：灵草现在 ×${mult2(L.sellMult(st, 'herb'))}，你的 ${fmt(L.sellHave(st, 'herb'))} 株能换 ${fmt(L.sellValue(st, 'herb', L.sellHave(st, 'herb')))} 灵石。×1.2 以上再卖最划算。`,
  shelf: () => `坊市下面多了几格【轮换货】：每届论道换一次，${L.restockIn(st)} 个周天后换货。`,
  auction: () => `坊市每 ${L.AUCTION.every} 周天一场【拍卖会】，开 ${L.AUCTION.len} 个周天。下一场 ${L.nextAuction(st)} 个周天后。`,
  robe: () => '法宝多了一格【法衣】：历练分数 +1.5×阶，三阶起负伤少 1 周天。落日古墓掉法衣多一倍。',
  orn: () => `法宝多了一格【饰品】：修炼 +${Math.round(L.ACC_KIND.cul.v * 100)}%×阶 等四种。东海龙宫掉饰品多一倍。`,
  mishu: () => `功法多了一槽【秘术】：不加倍率，只给特效。三门同属共鸣修炼、战力各 +${Math.round(L.GEN.three * 100)}%。`,
  petJobs: () => `兽栏多了【岗位】：不出战的灵宠派去护阵、觅食、守田、看炉、巡山，类型对口 ×1.5。`,
  chainExp: () => '',   // guide-ask.js 的 u14 说过了
  vault: () => `宗门多了【宝库】：六格，每届论道换货，用贡献换。你现在有 ${fmt((st.sect && st.sect.contrib) || 0)} 贡献。`,
  duty: () => '你是真传了，宗门多了【职司】：五堂选一个，各给一样常驻加成。',
  comp: () => '有人愿意跟你出门了：出发页多了【同伴】一行，一趟带一位。',
  forge: () => `器炉能【打造】了：器方 ${Object.keys(st.gear.plans || {}).length} 张，用首领材料和灵矿打固定词条的法宝。【洞府】→ 器炉。`,
  world: () => '',   // 大势起了时有专门的讲解（world1）
  crops: () => '', tuna: () => '', yin: () => '',
};
// 解锁：底栏入口亮出来（hud.js 按 UI.navOpen 显示，第一次出现时播锁碎的动画），系统给一条横幅，子项给一条气泡
let onbBanner = null;
function onbHook(type, k) {
  if (!st || st.rebirth) return;
  const e = L.ONB_K[k]; if (!e) return;
  if (type === 'unlock') {
    if (e.sys && k !== 'exp' && k !== 'bt' && k !== 'tour') onbBanner = { t: '新 · ' + e.n, sub: e.goal ? '小目标：' + e.goal : '' };
    else if (!e.sys && SUB_SAY[k]) { try { const t = SUB_SAY[k](); if (t) tip('onb_' + k, t); } catch (er) { /* 数字算不出来就不说 */ } }
  } else if (type === 'master' && e.goal && e.sys && st.tick > 0 && st.onb && st.onb.at[k] !== st.tick) {
    floatText(100, 58, `掌握 ✓ ${e.n}`, '#8ff5d0');
  }
}
// 横幅等讲解、弹窗都空下来再放（不和老祖抢话）
function onbPump() {
  if (!onbBanner || !$('#guide').hidden || modalOpen() || cine || duelFx) return;
  banner(onbBanner.t, onbBanner.sub, '#8ff5d0'); SFX.reveal(3); onbBanner = null;
}
// 底栏角标只给“现在该点的”一个：按先后挑第一个
function pickBadge(cands) { const c = cands.find(x => x && x.t && UI.navOpen(x.nav)); return c || null; }
// 这几段原来是阻塞讲解（在弹窗里、或是新手头一章的固定讲解，调度不会把它们转成气泡）：改成到点冒一条气泡，不暂停
for (const id of ['depth', 'tuna']) {
  const h = HINTS.find(x => x.id === id); if (!h) continue;
  const w = h.when;
  h.when = () => { if (!st || st.hintSeen[id] || !w()) return false; st.hintSeen[id] = 1; try { tip('h_' + id, typeof h.text === 'function' ? h.text() : h.text, { html: true }); } catch (e) { /* 算不出数就不说 */ } return false; };
}
// ---------- 文案 v2（docs/ONBOARDING.md §6）：老祖一段话最多两句，每句一个高亮数字，第二句说“现在点哪里” ----------
// 原来的台词留着做兜底：新台词算不出来（缺数据）时退回原来那句
const reText = (list, id, fn) => { const h = list.find(x => x.id === id); if (!h) return; const old = h.text; h.text = () => { try { return fn(); } catch (e) { return typeof old === 'function' ? old() : old; } }; };
const Bn = v => `<b>${v}</b>`;
reText(GUIDE, 'welcome', () => `小子，别东张西望，老夫就住在你这枚锈戒里。睡了 ${Bn('三千年')}，今天醒了。`);
reText(GUIDE, 'stakes', () => { const pi = PI(); return `三年之约还剩 ${Bn(pi.left)} 个周天，${esc(st.exName)}要当众羞辱你。${exTa()}战力 ${fmt(pi.Q)}，你 ${fmt(pi.base)}，胜算才 ${Bn(L.pct(pi.p))}。`; });
reText(GUIDE, 'expNav', () => `光打坐来不及，出去打妖兽、捡法宝。点【历练】，一趟 ${Bn(L.expLen(0))} 个周天。`);
reText(GUIDE, 'expPick', () => `就这儿：推荐战力 ${Bn(fmt(L.rec(0, 0)))}，你 ${fmt(L.power(st))}。点【${R0()}】。`);
reText(GUIDE, 'expGo', () => `预计评价 ${Bn(L.expForecast(st, 0, 0, 0).text)}，${L.expLen(0)} 个周天回来。点【出发】。`);
reText(GUIDE, 'homeNav', () => { const e = lastExp; return `${e ? `战力 ${fmt(e.pw0)} → ${Bn(fmt(e.pw1))}，捡的法宝已经戴上了。` : ''}灵石有 ${Bn(fmt(st.stones))}，点【洞府】花掉。`; });
reText(GUIDE, 'homeArray', () => { const u = L.upInfo(st, 'array'); return `升【聚灵阵】：修炼 +${dec(u.d0)} → ${Bn('+' + dec(u.d1))}/周天。点它，${fmt(u.cost)} 灵石。`; });
reText(GUIDE, 'quests', () => { const q = L.questView(st).first; return `不知道干嘛，就看这张札记。${q ? `眼下这条赏 ${Bn(esc(L.rewardText(st, q.rw)))}。` : '做完都有赏。'}`; });
reText(HINTS, 'retreat', () => { const ri = L.retInfo(st); return `${lastUp ? `升了一层，战力 ${Bn(fmt(lastUp.pw1))}。` : `想更快就闭关，修炼 ${Bn('×' + ri.m.toFixed(1))}。`}点【洞府】→【闭关】${ri.free ? '，头一回免费' : `，${fmt(ri.cost)} 灵石`}。`; });
reText(HINTS, 'retBtn', () => `点【闭关】：${Bn(L.retInfo(st).len)} 个周天修炼翻倍，期间不能出门。`);
reText(HINTS, 'pactSoon', () => { const pi = PI(), t = pactTips()[0]; return `三年之约还剩 ${Bn(pi.left)} 个周天，胜算 ${L.pct(pi.p)}。${t ? `${esc(t.t)} → ${Bn(t.extra || L.pct(t.p))}，点这一格看锦囊。` : '稳了。'}`; });
reText(HINTS, 'ready', () => `修为圆满了！点金色的修为条冲${nextName()}，成功率 ${Bn(L.pct(btShownRate()))}。`);
reText(HINTS, 'btGo', () => `成了战力约 ${Bn('×' + btPowerMult().toFixed(1))}。点【${L.tribNeeded(st) ? '引动天劫' : '开始突破'}】。`);
reText(HINTS, 'afterPact', () => (st.pact > 0 ? `痛快，满城都知道你不是废物了！往后每 ${Bn(L.TOUR_EVERY)} 个周天一届天骄论道，这一格就是它的倒计时。` : `输了不丢人。第 1 届论道还剩 ${Bn(muNext().n)} 个周天，再找${exTa()}算账。`));
reText(HINTS, 'tourSoon', () => { const q = st.rank - 1, rv = L.rivalAt(st, q), Q = L.rivalPower(st, q), S = L.duelPower(st, { kind: 'rival', q, id: rv && rv.id }); return `${Bn(L.nextTour(st))} 个周天后第 1 届论道。头一个是${esc(rv ? rv.n : '')}，你的胜算 ${Bn(L.pct(L.duelChance(S, Q)))}。`; });
reText(HINTS, 'sect', () => { const t = (st.sect.tasks || []).find(x => x.rw > 0); return `入宗了，宗门里有任务板。${t ? `交一件给 ${Bn(fmt(t.rw))} 贡献，` : ''}点【宗门】。`; });
reText(HINTS, 'visitor', () => `门口有人，点画面里的【！】。${Bn(st.visitor.left)} 个周天内理他就行。`);
reText(HINTS, 'field', () => { const u = L.upInfo(st, 'field'); return `开一块【灵田】，每周天自己长 ${Bn(L.fmt1(u.d1))} 灵石。点【洞府】，${u.payback} 个周天回本。`; });
reText(HINTS, 'market', () => `【坊市】开了：破境丹 ${Bn(fmt(L.price(st, 'pill')))} 灵石一枚，突破 +${L.pct(L.BT.pill)}。`);
reText(HINTS, 'furnace', () => `【丹炉】能建了，${Bn(fmt(L.hCost('furnace', 0)))} 灵石：炼丹、加突破都靠它。`);
reText(HINTS, 'alch', () => `丹炉有了，灵草 ${fmt(st.herbs)} 株够炼。点【洞府】→ 炼丹房，培元丹立得 ${Bn(4)} 周天修为。`);
reText(HINTS, 'heal', () => `负伤了，还要 ${Bn(st.p.inj)} 个周天。点【洞府】服一枚丹，立刻就好。`);
reText(HINTS, 'cal', () => `天时看得见了：点这一格是年历。下一届论道 ${Bn(L.nextTour(st))} 个周天后。`);
reText(HINTS, 'world1', () => { const w = L.world(st); return `右上角这块牌子是天下大势：${L.WORLD[w.id].n}，还剩 ${Bn(w.until - st.tick)} 个周天。点它看管什么。`; });
reText(HINTS, 'trib', () => { const max = Math.min(L.BT.maxPills, st.pills); return `从金丹起要渡雷劫，基础只有 ${Bn(L.pct(L.REALMS[Math.min(st.p.r, 8)].rate))}。下面的护劫手段全用上，能到 ${Bn(L.pct(L.tribRate(st, { pills: max, aids: 'all' })))}。`; });
reText(HINTS, 'art1', () => { const c = artWithout(0, () => L.gain(st)); return `这是心法，管修炼：每周天 +${dec(c.off)} → ${Bn('+' + dec(c.on))}。点【人物】→ 功法 看它。`; });
reText(HINTS, 'zhanji', () => { const id = L.artSlots(st)[1]; if (!id) return `战技槽开了：战技管战力，还定你的五行。寻宝、历练掉一门就能装，战力 ${Bn('×' + L.ZHAN_M[0])} 起。`; const c = artWithout(1, () => L.power(st)); return `战技槽开了：战力 ${fmt(c.off)} → ${Bn(fmt(c.on))}。它还定你的五行，克得住的地方分数 ${Bn('+' + L.EL_EXP)}。`; });
reText(HINTS, 'gearPlus', () => { const info = L.gearPlusInfo(st, 'w'); return `能强化了：战力 ${fmt(info.a.p)} → ${Bn(fmt(info.b.p))}。点【人物】→ 法宝 →【强化】。`; });
reText(HINTS, 'toxin', () => `这个小葫芦是丹毒，现在 ${Bn(Math.round(st.toxin))}/${L.TOX.max}。过 ${Bn(L.TOX.half)} 药力减半，每周天自己退。`);
reText(HINTS, 'crops', () => `灵田能改种了：灵草每 3 周天收 ${Bn(dec(L.cropHarvest(st, 'herb')))} 株。点画面左下的田。`);
reText(HINTS, 'pet1', () => { const p = L.petOut(st); return `这小东西认你做主了，战力 ${Bn('×' + mult2(L.petAtkOf(st, p)))}。点【洞府】→ 兽栏喂它。`; });
reText(HINTS, 'tuna', () => `气满了：点画面里的你自己，立得 ${Bn(dec(L.gainCalm(st)))} 修为。`);
reText(HINTS, 'depth', () => `【腹地】开了：推荐战力 ${Bn(fmt(L.rec(0, 1)))}，灵石 ×${L.REW.d}。`);
reText(HINTS, 'me', () => `你现在天骄榜第 ${Bn(st.rank)}。【人物】→ 天骄榜 能看宿敌。`);
reText(HINTS, 'gearCmp', () => { const el = document.querySelector('#modal [data-gcmp]'); el.scrollIntoView({ block: 'nearest' }); const x = L.gearPend(st, +el.dataset.gcmp), D = L.gearDelta(st, x); const gain = fmt(D.a.p) !== fmt(D.b.p) ? `战力 ${fmt(D.a.p)} → ${Bn(fmt(D.b.p))}` : `历练分数 ${sgn(D.a.s)} → ${Bn(sgn(D.b.s))}`; return `新法宝换上：${gain}。不要就【熔炼】，得灵矿 ${Bn(D.smelt)}。`; });
// 子项的阻塞讲解改由上面那条气泡带过（一次只教一件事，子项不停下来讲）：法衣、饰品、秘术、灵宠岗位
for (const id of ['gearRobe', 'gearOrn', 'mishu', 'pet2']) { const h = HINTS.find(x => x.id === id); if (h) h.when = () => false; }
