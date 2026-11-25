/* 废柴仙途 · 逻辑模块 meta：成就称号与转世
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 成就与称号 ----------
L.grantTitle = function (st, t) { if (!st.titles.includes(t)) st.titles.push(t); st.title = t; };
L.ACHS = [
  { id: 'r1', n: '筑基', d: '突破至筑基期', c: st => L.mr(st) >= 1, t: '筑基修士' },
  { id: 'r2', n: '结丹', d: '结成金丹', c: st => L.mr(st) >= 2, t: '金丹真人' },
  { id: 'r3', n: '元婴', d: '修成元婴', c: st => L.mr(st) >= 3, t: '元婴老祖' },
  { id: 'r4', n: '化神', d: '踏入化神', c: st => L.mr(st) >= 4, t: '化神尊者' },
  { id: 'r6', n: '合体', d: '踏入合体', c: st => L.mr(st) >= 6, t: '合体大能' },
  { id: 'r7', n: '大乘', d: '踏入大乘', c: st => L.mr(st) >= 7, t: '大乘真君' },
  { id: 'r8', n: '渡劫', d: '踏入渡劫', c: st => L.mr(st) >= 8, t: '渡劫天尊' },
  { id: 'r9', n: '飞升', d: '白日飞升', c: st => st.p.r >= 9, t: '真仙' },
  { id: 'pact', n: '莫欺少年穷', d: '赢下三年之约', c: st => !!st.beaten.mu, t: '莫欺少年穷' },
  { id: 'awake', n: '混沌现世', d: '灵根觉醒', c: st => (st.flags.awoke || 0) >= 1, t: '混沌灵根' },
  { id: 'awake4', n: '圣体大成', d: '混沌圣体大成', c: st => (st.flags.awoke || 0) >= 4, t: '混沌圣体' },
  { id: 'sect', n: '名门弟子', d: '拜入宗门', c: st => !!st.sect, t: '名门弟子' },
  { id: 'heir', n: '一代天骄', d: '成为宗门圣子或圣女', c: st => st.sect && st.sect.rank >= 3, t: '宗门圣子' },
  { id: 'lord', n: '一宗之主', d: '成为宗主', c: st => st.sect && st.sect.rank >= 6, t: '一宗之主' },
  { id: 'top10', n: '天骄', d: '天骄榜进入前 10', c: st => st.bestRank <= 10, t: '绝代天骄' },
  { id: 'top1', n: '天下第一', d: '登顶天骄榜', c: st => st.bestRank <= 1, t: '天下第一' },
  { id: 'zhao', n: '师兄也不过如此', d: '击败赵乾', c: st => !!st.beaten.zhao, t: '弃徒归来' },
  { id: 'chu', n: '剑压圣子', d: '击败楚天阔', c: st => !!st.beaten.chu, t: '剑压圣子' },
  { id: 'xue', n: '斩魔', d: '击败血无涯', c: st => !!st.beaten.xue, t: '斩魔圣手' },
  { id: 'war', n: '一人守山门', d: '击退天剑宗来犯', c: st => !!st.flags.warWon, t: '一剑守山' },
  { id: 'sect3', n: '名门大派', d: '带领宗门进入宗门榜前三', c: st => st.sect && st.sect.best <= 3, t: '宗门砥柱' },
  { id: 'sect1', n: '天下第一宗', d: '带领宗门登顶宗门榜', c: st => st.sect && st.sect.best <= 1, t: '天下第一宗' },
  { id: 'tianjian', n: '弃徒压宗', d: '九宗会武中击败天剑宗', c: st => !!st.flags.beatTianjian, t: '弃徒压宗' },
  { id: 'veins', n: '灵脉之主', d: '为宗门夺得 3 条灵脉', c: st => st.sect && (st.sect.veins || 0) >= 3, t: '灵脉之主' },
  { id: 'exp10', n: '行走江湖', d: '历练 10 次', c: st => st.stats.exp >= 10, t: '江湖客' },
  { id: 'exp50', n: '踏遍山河', d: '历练 50 次', c: st => st.stats.exp >= 50, t: '踏遍山河' },
  { id: 'leap', n: '越级而战', d: '越级历练评价乙以上', c: st => st.stats.leapWins >= 1, t: '越级而战' },
  { id: 'tian', n: '天字评价', d: '历练拿到“天”等评价', c: st => (st.stats.tians || 0) >= 1, t: '天选之人' },
  { id: 'pet', n: '灵宠主人', d: '收服一只灵宠', c: st => !!st.p.pet, t: '灵宠之主' },
  { id: 'dragon', n: '御龙者', d: '拥有太古真灵', c: st => st.p.pet && st.p.pet.tier >= 6, t: '御龙者' },
  { id: 'craft', n: '丹道入门', d: '第一次炼丹', c: st => st.stats.crafts >= 1, t: '丹道学徒' },
  { id: 'perfect', n: '丹纹九现', d: '炼出极品丹', c: st => st.stats.perfect >= 1, t: '丹道宗师' },
  { id: 'boss3', n: '猎首者', d: '击败 3 个地图首领', c: st => st.stats.bosses >= 3, t: '猎首者' },
  { id: 'bossAll', n: '万界无敌', d: '击败全部 11 个地图首领', c: st => st.stats.bosses >= 11, t: '万界无敌' },
  { id: 'daolv', n: '神仙眷侣', d: '结为道侣', c: st => !!st.daolv, t: '神仙眷侣' },
  { id: 'friends', n: '知己满天下', d: '与 3 位 NPC 结为知己', c: st => Object.keys(L.NPCS).filter(id => L.friend(st, id)).length >= 3, t: '知己满天下' },
  { id: 'chaos', n: '手握至宝', d: '得到混沌至宝', c: st => L.gearTier(st, 'w') >= 7, t: '至宝之主' },
  { id: 'plus9', n: '神兵出世', d: '一件法宝强化到 +9', c: st => L.GEAR_SLOTS.some(s => st.gear[s] && st.gear[s].plus >= 9), t: '百炼成神' },
  { id: 'forge', n: '开炉铸器', d: '用器方打造一件法宝', c: st => (st.stats.forged || 0) >= 1, t: '铸器师' },
  { id: 'fails', n: '屡败屡战', d: '突破失败 5 次', c: st => st.stats.btFails >= 5, t: '屡败屡战' },
  { id: 'desp', n: '绝境逢生', d: '寿元将尽时突破成功', c: st => st.stats.despWin >= 1, t: '绝境逢生' },
  { id: 'rebirth', n: '轮回者', d: '转世重修', c: st => st.rebirth >= 1, t: '轮回者' },
  { id: 'events', n: '机缘深厚', d: '经历 40 次奇遇', c: st => st.stats.events >= 40, t: '机缘深厚' },
];
L.checkAchs = function (st) {
  for (const a of L.ACHS) if (!st.ach[a.id] && a.c(st)) {
    st.ach[a.id] = 1;
    L.grantTitle(st, a.t);
    const rw = Math.floor(Math.max(L.income(st), 20) * 5);
    st.stones += rw;
    st.achQ.push({ n: a.n, t: a.t, rw });
    L.log(st, `【成就】${a.n}：获得称号「${a.t}」，灵石 +${L.fmt(rw)}`, 'gold');
  }
};

// ---------- 转世 ----------
L.rebirthCards = function (st, n) {
  const k = (st ? st.rebirth : 0) + 1;
  const q = 0.25 + 0.15 * k;
  const base = [10, 30, 30, 18, 8, 3, 0.8];
  const keys = Object.keys(L.TRAITS).filter(x => x !== 'hero');
  const out = [];
  for (let i = 0; i < (n || 3); i++) {
    const t = wpick(base.map((v, j) => [j, v * Math.pow(1 + q, j)]));
    out.push({ t, tr: [pick(keys)] });
  }
  return out;
};
L.lifeSummary = function (st) {
  return { name: st.p.name, r: st.p.r, s: st.p.s, age: Math.floor(st.p.age), rank: st.bestRank, ascended: st.p.r >= 9, ticks: st.tick };
};
});
