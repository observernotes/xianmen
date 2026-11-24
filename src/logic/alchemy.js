/* 废柴仙途 · 逻辑模块 alchemy：炼丹
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 炼丹 ----------
L.RECIPES = [
  // 培元丹、聚灵丹的灵草价由 tools/sim.js 校准（原 10 / 16：勤快玩家炼气期四分之一的修为来自培元丹，筑基期聚灵丹几乎常驻）
  // TODO SYSTEMS §5：丹毒上线后由丹毒限制连续服丹，届时可以把这两个价格调回去
  { k: 'peiyuan', n: '培元丹', d: '服下立得 4 周天修为', herbs: 24, lv: 1 },
  { k: 'pojing', n: '破境丹', d: '突破时每枚成功率 +15%，也可疗伤', herbs: 8, lv: 1 },
  { k: 'juling', n: '聚灵丹', d: '接下来 6 周天修炼速度 ×1.5', herbs: 40, lv: 3 },
  { k: 'yanshou', n: '延寿丹', d: '寿元 +8%（与坊市共用每境界三枚上限）', herbs: 12, lv: 5 },
  { k: 'xisui', n: '洗髓丹', d: '灵根提升一档，可以比剧情觉醒提前一档（需葛老为知己或丹炉 8 级）', herbs: 30, treasure: 1, lv: 8 },
  { k: 'jiuzhuan', n: '九转金丹', d: '下一次大境界突破必定成功', herbs: 40, treasure: 2, lv: 12 },
];
L.QUAL = [{ n: '下品', m: 0.7 }, { n: '中品', m: 1 }, { n: '上品', m: 1.3 }, { n: '极品', m: 1.8 }];
L.herbCost = (st, rc) => Math.ceil(rc.herbs * L.herbScale(st));
L.alchRate = st => clamp(0.6 + 0.03 * st.home.furnace + (L.friend(st, 'ge') ? 0.15 : 0) + (L.has(st, 'alch') ? 0.15 : 0) + (st.sect && st.sect.id === 'dan' ? 0.15 : 0), 0.1, 0.97);
L.pillPower = st => (st.sect && st.sect.id === 'dan' ? 1.3 : 1);   // 丹霞谷：丹药效果 ×1.3
L.canCraft = function (st, k) {
  const rc = L.RECIPES.find(x => x.k === k);
  if (!rc || st.home.furnace < 1) return '需要先建丹炉';
  if (k === 'xisui') { if (!(L.friend(st, 'ge') || st.home.furnace >= 8)) return '需葛老为知己或丹炉 8 级'; }
  else if (st.home.furnace < rc.lv) return `丹炉 ${rc.lv} 级解锁`;
  if (k === 'xisui' && st.p.t >= 6) return '灵根已至巅峰';
  if (k === 'xisui' && st.p.t >= L.talentCap(st)) return '灵根已到此境界的极限，突破后再炼';
  if (k === 'yanshou' && (st.lifePills[st.p.r] || 0) >= 3) return '本境界延寿丹已服满';
  if (k === 'jiuzhuan' && st.flags.sureBt) return '已有一枚九转金丹';
  if (st.herbs < L.herbCost(st, rc)) return '灵草不足';
  if ((rc.treasure || 0) > st.treasure) return '天材地宝不足';
  return '';
};
L.craft = function (st, k) {
  if (L.canCraft(st, k)) return null;
  const rc = L.RECIPES.find(x => x.k === k), p = st.p;
  st.herbs -= L.herbCost(st, rc);
  st.treasure -= rc.treasure || 0;
  st.stats.crafts++;
  if (st.sect) L.taskHit(st, 'act', t => t.sub === 'craft');
  const res = { k, n: rc.n };
  if (R() >= L.alchRate(st)) { res.ok = false; L.log(st, `炼制${rc.n}时炸炉了……灵草化为飞灰`, 'red'); return res; }
  res.ok = true;
  const pPerfect = 0.05 + st.home.furnace * 0.006 + (L.friend(st, 'ge') ? 0.05 : 0) + (L.has(st, 'alch') ? 0.05 : 0);
  const x = R();
  const q = x < pPerfect ? 3 : x < pPerfect + 0.25 ? 2 : x < pPerfect + 0.75 ? 1 : 0;
  res.q = q; const m = L.QUAL[q].m * L.pillPower(st);
  if (q >= 2) st.stats.goodPill = (st.stats.goodPill || 0) + 1;
  if (q === 3) st.stats.perfect++;
  if (k === 'peiyuan') { const g = L.gainCalm(st) * 4 * m; L.addXp(st, g); res.fx = '修为 +' + L.fmt(g); }
  else if (k === 'pojing') { const n = q === 3 ? 2 : 1; st.pills += n; res.fx = '破境丹 +' + n; }
  else if (k === 'juling') { const t = Math.round(6 * m); const c = q === 3 ? 2 : 1.5; st.buffs.push({ cul: c, left: t }); res.fx = `修炼速度 ×${c}（${t} 周天）`; }
  else if (k === 'yanshou') { st.lifePills[p.r] = (st.lifePills[p.r] || 0) + 1; const v = Math.round(L.REALMS[p.r].life * 0.08 * m); st.lifeBonus += v; res.fx = `寿元 +${L.fmt(v)} 年`; }
  else if (k === 'xisui') { const from = p.t; p.t = Math.min(6, p.t + 1); res.fx = `灵根 ${L.talentInfo(st, from).n} → ${L.talentInfo(st, p.t).n}`; res.talent = true; if (q === 3) { st.bonus.cul += 0.03; res.fx += '，极品药力再增修炼 3%'; } }
  else if (k === 'jiuzhuan') { st.flags.sureBt = 1; st.stats.jiuzhuan = (st.stats.jiuzhuan || 0) + 1; res.fx = '下一次突破必定成功'; }
  L.log(st, `丹成！${L.QUAL[q].n}${rc.n}：${res.fx}`, q === 3 ? 'gold' : 'jade');
  L.checkQuests(st);
  return res;
};
});
