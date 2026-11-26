/* 废柴仙途 · 数据式分镜（docs/STORY_PLAN.md §8，写法见 src/ui/talk.js 的 CINE_DATA 说明）
 * 这里的分镜并进 talk.js 的 CINE_DATA：同名的盖掉那边的底稿，新名字接在后面（【回忆】里自动多一格）。
 * 一段：{ n 名字, no 序号, bgm, thumb 底图写法, shots: [ 镜头 ] }
 * 镜头：{ bg: 'temple' | 'cg:stab:1' | 'end:shitu' | 'bd:summit', frames: [[ms, bg]], ms, cam: 'push' | 'pull' | 'panR' | 'panL' | 'panUp' | 'panDown' | 'hold',
 *         sub 字幕（≤ 12 字）, cut / cut2: { who, mood, fx, side, col, y, at }, dim, tint: [色, 透明度], flash: [ms], lines 集中线色, linesAt, seal 盖印, sealAt, sfx: [[ms, 名]], shake: [[ms, 持续, 幅度]], if 条件 }
 * A 线：⑪～㉕（主线）；D 线：㉖～㉝（结局）往同一个对象里加。 */
(function (root) {
'use strict';
const X = root.CINE_DATA_X = root.CINE_DATA_X || {};
Object.assign(X, {
});
if (typeof module !== 'undefined' && module.exports) module.exports = [];
})(typeof window !== 'undefined' ? window : globalThis);
