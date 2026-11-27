/* 废柴仙途 · 界面片段 onboard：上手曲线的界面一侧（逻辑在 src/logic/onboard.js 的解锁表）+ 开罗式引导换轨（docs/KAIRO_PLAN.md §5）
 * · UI.isOpen(key)：系统开没开（读逻辑层的解锁表）。顶层五格永远在（没开的灰着，goalcard.js），格子里面的分页、按钮仍然是开了才出现。
 * · 阻塞对话只剩 §5.1 的 11 种：这里把各片段登记的讲解（HINTS，原来 55 段）全部关掉，只留“可以突破了”的金框；头三步手把手在 guide.js。
 * · 新系统解锁 → 解锁卡（§5.3，04_unlock.png）：放射光 + 大图标 + “解锁了！” + 名字 + 一句给你什么（带一个数）+ 入口路径 +【知道了】【带我去 ▸】；
 *   由结算链（settle.js）在一条链的末尾出，不挡剧情；子项不出卡：入口挂“新” + 一行传讯。
 * · 掌握：一行传讯“✓ 学会了：灵田”，目标卡回到本章目标。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide-ask 之后：各片段的讲解都登记完了）。 */
const UI = {
  isOpen: k => !st || !L.onbShown || L.onbShown(st, k),
  navOpen: nav => navState(nav).open,
  // 线 1 的 clock.js 调这几个（docs/KAIRO_PLAN.md 末尾“接口”）
  say: (t, cls) => sayLine(t, cls),
  showYear: () => showYearReport(),
  go: (k, hl) => goTo(k, hl),
  showInbox: () => showInbox(),
  flashGoal: () => { const g = $('#goal'), t = $('#time'); for (const el of [g, t]) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } },
  nudge: nav => { const b = document.querySelector(`#nav [data-nav="${nav}"]`); if (b) { b.classList.add('gonow'); setTimeout(() => b.classList.remove('gonow'), 6000); } },
};
// ---------- 阻塞讲解只留清单里的：头三步（guide.js 的 GUIDE）+ 第一次“可以突破了”的金框 ----------
const KEEP_HINTS = new Set(['ready']);
for (const h of HINTS) {
  if (KEEP_HINTS.has(h.id)) continue;
  const w = h.when;
  h.when = () => L.ONB_ON === false && w();   // 关掉上手曲线（L.ONB_ON = false，sim 的 noonb 对照）时照旧
}
// ---------- 子项（已经会的系统里多了一样）：不出卡，入口挂“新”，传讯一句（≤ 20 字） ----------
const SUB_SAY = {
  herb: () => '历练多了【采药】：灵草 ×3',
  treasure: () => '历练多了【寻宝】：法宝掉率 ×2',
  sell: () => `坊市能卖了：灵草 ×${mult2(L.sellMult(st, 'herb'))}`,
  shelf: () => `坊市有轮换货：${seasons(L.restockIn(st))} 季一换`,
  auction: () => `拍卖会：每 ${seasons(L.AUCTION.every)} 季一场`,
  robe: () => '装备多了一格【法衣】',
  orn: () => '装备多了一格【饰品】',
  mishu: () => '功法多了一槽【秘术】',
  petJobs: () => '灵宠能派岗了：对口 ×1.5',
  chainExp: () => '历练能连去三趟了',
  vault: () => `宗门宝库开了：贡献 ${fmt((st.sect && st.sect.contrib) || (st.sect && st.sect.pts) || 0)}`,
  duty: () => '宗门能领职司了',
  comp: () => '出门能带同伴了',
  forge: () => '器炉能打造法宝了',
  crops: () => '灵田能改种了',
  yin: () => '炼丹房多了药引丹方',
  world: () => '天下大势：看右上角的牌子',
  tour: () => `天骄榜：你现在第 ${st.rank}`,
};
// ---------- 解锁卡文案（§5.3：名字 + 给你什么（一个数，≤ 14 字）+ 入口路径） ----------
const pctS = v => L.pct(v);
const UNLOCK_CARD = {
  home: { n: '洞府 · 聚灵阵', ic: 'array', one: () => { const u = L.upInfo(st, 'array'); return `修炼 +${L.fmt1(u.d0)} → <b>+${L.fmt1(u.d1)}</b> / ${MO()}`; }, way: '洞府 ▸ 聚灵阵 ▸ 升级', go: 'home', hl: '#modal button[data-k="array"]' },
  retreat: { n: '闭关', ic: 'retreat', one: () => { const r = L.retInfo(st); return `◆${L.AP.retreat} 修炼 <b>×${r.m.toFixed(1)}</b>，当场出关`; }, way: '洞府 ▸ 闭关', go: 'home', hl: '#btnRet' },
  gearCmp: { n: '装备栏', ic: 'gear', one: () => `新法宝 <b>▲</b> 就换上`, way: '底栏 ▸ 装备 ▸ 法宝', go: 'gear' },
  tour: { n: '天骄榜', ic: 'rank', one: () => `你现在第 <b>${st.rank}</b>`, way: '江湖 ▸ 天骄榜', go: 'rivals' },
  market: { n: '坊市', ic: 'gavel', one: () => `破境丹 <b>${fmt(L.price(st, 'pill'))}</b> 灵石`, way: '江湖 ▸ 坊市', go: 'market' },
  sect: { n: '宗门', ic: 'contrib', one: () => { const t = ((st.sect && st.sect.tasks) || []).find(x => x.rw > 0); return t ? `一件任务 <b>${fmt(t.rw)}</b> 贡献` : '交任务得贡献'; }, way: '江湖 ▸ 宗门 ▸ 任务', go: 'sect' },
  visitor: { n: '访客 · 纸鹤', ic: 'mail', one: () => `来访的人等你 <b>6</b> ${MO()}`, way: '顶栏 ▸ 纸鹤', go: 'inbox' },
  field: { n: '灵田', ic: 'field', one: () => { const u = L.upInfo(st, 'field'); return `每${MO()}自己长灵石 <b>+${L.fmt1(u.d1)}</b>`; }, way: () => `洞府 ▸ 空地 ▸ 开田（灵石 ${fmt(L.upInfo(st, 'field').cost)}）`, go: 'home' },
  furnace: { n: '丹炉 · 炼丹', ic: 'furnace', one: () => `突破 <b>+${pctS(L.BT.furnace)}</b>，能炼丹`, way: () => `洞府 ▸ 丹炉（灵石 ${fmt(L.hCost('furnace', 0))}）`, go: 'home' },
  arts: { n: '功法 · 心法', ic: 'gscroll', one: () => `修炼 <b>×${(L.artXMult ? L.artXMult(st) : 1).toFixed(2)}</b>`, way: '装备 ▸ 功法', go: 'arts' },
  trib: { n: '天劫 · 护劫', ic: 'buff', one: () => `护劫全用上 <b>${pctS(L.tribRate(st, { pills: Math.min(L.BT.maxPills, st.pills), aids: 'all' }))}</b>`, way: '修为条 ▸ 突破', go: 'bt' },
  pets: { n: '灵宠', ic: 'egg', one: () => `出战战力 <b>×${L.PETS ? L.PETS[1].m : 1.1}</b> 起`, way: '装备 ▸ 灵宠', go: 'pets' },
  plus: { n: '强化 · 灵矿', ic: 'ore', one: () => { const i = st.gear.w ? L.gearPlusInfo(st, 'w') : null; return i && !i.max ? `战力 ${fmt(i.a.p)} → <b>${fmt(i.b.p)}</b>` : '兵器强化加战力'; }, way: '装备 ▸ 法宝 ▸ 强化', go: 'gear' },
  cal: { n: '四季 · 年历', ic: 'time', one: () => `论道还有 <b>${seasons(L.nextTour(st))}</b> 季`, way: '时间条 ▸ 年历', go: 'cal' },
  zhanji: { n: '战技 · 五行', ic: 'atk', one: () => `箭头指向谁就<b>克</b>谁：克制 ×1.3，还能破罩`, way: '装备 ▸ 功法 ▸ 战技', go: 'arts' },
  realm: { n: '秘境', ic: 'wonder', one: () => '入夏开门，一层一宝', way: '历练 ▸ 秘境', go: 'realm' },
  bond: { n: '羁绊 · 送礼', ic: 'heart', one: () => '好感 <b>60</b> 成知己', way: '江湖 ▸ 人物', go: 'people' },
  plots: { n: '洞府地块', ic: 'cave', one: () => `空地 <b>${L.homePlotFree ? L.homePlotFree(st) : 1}</b> 块可建`, way: '洞府 ▸ 空地', go: 'home' },
  zhen: { n: '阵法', ic: 'array', one: () => `换阵 <b>${seasons(L.ZV ? L.ZV.switch : 3)}</b> 季生效`, way: '洞府 ▸ 聚灵阵 ▸ 换阵', go: 'zhen' },
  dao: { n: '道心 · 因果', ic: 'dao_w', one: () => '抉择定道心，道基加成', way: '仙途 ▸ 属性 ▸ 道心', go: 'attr' },
  disc: { n: '徒弟', ic: 'post_wai', one: () => '收徒跑差事、出师', way: '江湖 ▸ 宗门 ▸ 门下', go: 'sect' },
  codex: { n: '图鉴', ic: 'codex', one: () => `已记 <b>${L.codexCells ? L.codexCells(st) : 0}</b> 格`, way: '仙途 ▸ 记录 ▸ 图鉴', go: 'record' },
};
const unlockQ = [];
let unlockLastAt = 0;
// 开局就开着的不出卡。“开局”原来看月份；时间不再自己走以后，第一趟历练当季就回来，所以看有没有做过第一件事
const begun = () => !!st && (st.tick > 0 || (st.stats.exp || 0) > 0);
function onbHook(type, k) {
  if (!st) return;
  const e = L.ONB_K[k]; if (!e) return;
  if (type === 'unlock') {
    if (st.rebirth) return;   // 转世“快开”：入口上挂“新”就够（§8 P2 的合并卡以后再做）
    // 线 B 的结算链（L.blockRun）自己给 'unlock' 块，这里就不排了
    if (e.sys && UNLOCK_CARD[k] && begun()) { if (!L.blockRun && !unlockQ.includes(k)) unlockQ.push(k); }
    else if (SUB_SAY[k]) { try { const t = SUB_SAY[k](); if (t) say(cut(t, 20)); } catch (er) { /* 数字算不出来就不说 */ } }
  } else if (type === 'master' && e.goal && e.sys && begun() && st.onb && st.onb.at[k] !== st.tick) {
    say(`✓ 学会了：${e.n.split('·')[0]}`);
  }
}
// 解锁卡由结算链出（settle.js 的 chainPump：一条链的末尾，AP_PLAN §4.2 第 6 级 / §4.6），不挡剧情、不看真实时间；节流只剩逻辑层按季的那两条
function onbPump() { /* 结算链接管 */ }
let burstTimer = 0;
function showUnlock(k) {
  const C = UNLOCK_CARD[k], e = L.ONB_K[k]; if (!C || !e) return;
  let one = '', way = '';
  try { one = C.one(); } catch (er) { one = ''; }
  try { way = typeof C.way === 'function' ? C.way() : C.way; } catch (er) { way = ''; }
  const bz = pxFit(48, 144), iz = pxFit(16, 72);
  const s = sheet({ title: '解锁了', unl: true, noClose: true, center: true,
    body: `<div class="unl"><div class="ic"><img class="px" id="unlBurst" src="${urlOf(ART.burst(0), 'burst|0')}" style="width:${bz}px;height:${bz}px" alt="">${artIcon(C.ic, iz) || sysIcon(k, iz)}</div>
      <div class="big">解锁了！</div><div class="nm">${esc(C.n || e.n)}</div><div class="one">${one}</div><div class="way">${esc(way)}</div>
      <div class="kfoot"><button class="btn alt" id="unlOk">知道了</button><button class="btn gold" id="unlGo">带我去 ▸</button></div></div>` });
  SFX.unlock();
  let f = 0; clearInterval(burstTimer);
  burstTimer = setInterval(() => { const im = document.getElementById('unlBurst'); if (!im) { clearInterval(burstTimer); return; } f = 1 - f; im.src = urlOf(ART.burst(f), 'burst|' + f); }, 250);
  s.querySelector('#unlOk').onclick = () => { SFX.tap(); closeModal(); };
  s.querySelector('#unlGo').onclick = () => { SFX.tap(); closeModal(); goTo(C.go, C.hl); };
}
// 底栏角标（旧接口，问老祖等处还在用）：按先后挑第一个
function pickBadge(cands) { const c = cands.find(x => x && x.t && navState(x.nav).open); return c || null; }
