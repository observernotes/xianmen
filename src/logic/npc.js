/* 废柴仙途 · 逻辑模块 npc：人物羁绊
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 人物羁绊 ----------
// 名字是数组时：[主角为男时, 主角为女时]
L.NPCS = {
  su: { n: ['苏青瑶', '苏景行'], title: '丹霞谷医修', bonus: '修炼速度 ×1.1', daolv: true },
  ye: { n: ['夜璃', '夜无殇'], title: '魔门圣宗', bonus: '战力 ×1.1，历练灵石 ×1.2', daolv: true },
  chu: { n: '楚狂', title: '剑痴散修', bonus: '战力 ×1.15' },
  ge: { n: '葛老', title: '落魄丹师', bonus: '炼丹成功率 +15%，可炼洗髓丹' },
  bai: { n: '白小九', title: '化形灵狐', bonus: '奇遇概率 ×1.5' },
  mo: { n: '墨无痕', title: '神秘黑衣人', bonus: '寿元 ×1.1' },
};
L.npcName = (st, id) => { const n = L.NPCS[id] ? L.NPCS[id].n : id; return Array.isArray(n) ? n[st.p.look.f ? 1 : 0] : n; };
L.aff = (st, id) => (st.npc && st.npc[id]) ? st.npc[id].aff : 0;
L.met = (st, id) => !!(st.npc && st.npc[id]);
L.friend = (st, id) => L.aff(st, id) >= 60;
L.hearts = (st, id) => Math.floor(L.aff(st, id) / 20);   // 五颗心：每 20 好感一颗，三心知己
L.addAff = function (st, id, d) {
  if (!L.NPCS[id]) return 0;
  st.npc = st.npc || {};
  const o = st.npc[id] || (st.npc[id] = { aff: 0 });
  const before = o.aff;
  if (d > 0) d = Math.max(1, Math.round(d * L.affMult(st)));   // 太上忘情录：好感获取 −30%
  o.aff = clamp(o.aff + d, 0, 100);
  if (before < 60 && o.aff >= 60 && !o.f60) { o.f60 = 1; L.log(st, `与${L.npcName(st, id)}结为知己：${L.NPCS[id].bonus}`, 'gold'); L.fireTrigger(st, 'npc:' + id + ':60'); }
  return o.aff - before;
};
// 知己与道侣的永久加成（TODO 阶段四：五颗心、同伴、委托）
L.addCulMod('friend_su', 80, st => (L.friend(st, 'su') ? ['知己·' + L.npcName(st, 'su'), 1.1, ''] : null));
// 太上无情（功法共鸣 c11）：双修失效
L.addCulMod('daolv', 85, st => (st.daolv && !L.daolvBlocked(st) ? ['道侣双修·' + L.npcName(st, st.daolv), 1.25, ''] : null));
L.addAtkMod('friend_ye', 80, st => (L.friend(st, 'ye') ? ['知己·' + L.npcName(st, 'ye'), 1.1, ''] : null));
L.addAtkMod('friend_chu', 81, st => (L.friend(st, 'chu') ? ['知己·楚狂', 1.15, ''] : null));
});
