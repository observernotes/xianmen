/* 废柴仙途 · 数据式分镜（docs/STORY_PLAN.md §8，写法见 src/ui/talk.js 的 CINE_DATA 说明）
 * 这里的分镜并进 talk.js 的 CINE_DATA：同名的盖掉那边的底稿，新名字接在后面（【回忆】里自动多一格）。
 * 一段：{ n 名字, no 序号, bgm, thumb 底图写法, shots: [ 镜头 ] }
 * 镜头：{ bg: 'temple' | 'cg:stab:1' | 'end:shitu' | 'bd:summit', frames: [[ms, bg]], ms, cam: 'push' | 'pull' | 'panR' | 'panL' | 'panUp' | 'panDown' | 'hold',
 *         sub 字幕（≤ 12 字）, cut / cut2: { who, mood, fx, side, col, y, at }, dim, tint: [色, 透明度], flash: [ms], lines 集中线色, linesAt, seal 盖印, sealAt, sfx: [[ms, 名]], shake: [[ms, 持续, 幅度]], if 条件 }
 * A 线：⑪～㉕（主线）；D 线：㉖～㉝（结局）往同一个对象里加。 */
(function (root) {
'use strict';
const X = root.CINE_DATA_X = root.CINE_DATA_X || {};
const VISITOR = 'any:daolv:any|aff:su>=60|aff:ye>=60|aff:chu>=60|aff:ge>=60|aff:bai>=60|aff:mo>=60';   // 飞升前夜有没有人来敲门（与 story_ascend 的判断一致）
Object.assign(X, {
  // ⑭ 夜半黑衣（story_r2 之前）：窗前的剪影 → 伸向戒指的手 → 墨色与金色两条特写带上下对切
  heiyi: { n: '夜半黑衣', no: '⑭', bgm: 'realm', thumb: 'cave', shots: [
    { bg: 'cave', dim: 0.55, cam: 'panR', ms: 3200, sfx: [[200, 'wind'], [1800, 'heart']] },
    { bg: 'cg:ring:0', tint: ['#0a0818', 0.35], cam: 'push', ms: 3000, sub: '“给我。”', sfx: [[300, 'gather'], [1500, 'heart']] },
    { bg: 'cave', dim: 0.65, ms: 3600, flash: [900], cut: { who: 'mo', mood: 'n', fx: 'shade', side: 'r', y: 8 }, cut2: { who: 'elder', mood: 'ang', side: 'l', y: 62, at: 900 }, sub: '“墨家。”', shake: [[900, 300, 3]], sfx: [[900, 'clang']] }] },
  // ⑮ 万剑低眉（story_boss5 之前）
  wanjian: { n: '万剑低眉', no: '⑮', bgm: 'sorrow', thumb: 'ink', shots: [
    { bg: 'ink', cam: 'panR', ms: 4000, sfx: [[200, 'wind']] },
    { bg: 'ink', ms: 3000, lines: '#1b1326', linesAt: 400, flash: [400], shake: [[400, 500, 3]], sfx: [[400, 'clang'], [700, 'clang'], [1000, 'clang'], [1900, 'bell']] },
    { bg: 'ink', dim: 0.35, cam: 'push', ms: 4400, cut: { who: 'elder', mood: 'sad', fx: 'tear', side: 'l' }, sub: '“本座回来晚了。”', sfx: [[2600, 'bell']] }] },
  // ⑯ 半块玉简（story_r4 之前）
  yujian: { n: '半块玉简', no: '⑯', bgm: 'sorrow', thumb: 'cg:jade:0', shots: [
    { bg: 'cg:jade:0', cam: 'push', ms: 4000, sub: '“祖训只有一句。”', sfx: [[300, 'reveal']] },
    { bg: 'cave', dim: 0.6, ms: 4000, cut: { who: 'mo', mood: 'sad', side: 'r' }, sub: '“可曾信过墨离？”', sfx: [[400, 'drum'], [2200, 'heart']] },
    { bg: 'cave', dim: 0.6, ms: 3400, flash: [300], cut: { who: 'elder', mood: 'ang', fx: 'shade', side: 'l', at: 300 }, sub: '“那个逆徒，也配问？”', shake: [[300, 500, 5]], sfx: [[300, 'thunder']] }] },
  // ⑰ 祖师画像（story_r5 之前）
  huaxiang: { n: '祖师画像', no: '⑰', bgm: 'boss', thumb: 'tjgate', shots: [
    { bg: 'gate', cam: 'panUp', ms: 4000, sfx: [[200, 'wardrum'], [1400, 'paper']] },
    { bg: 'gate', dim: 0.6, cam: 'push', ms: 4400, cut: { who: 'tianheng', mood: 'n', fx: 'mono', side: 'r', y: 8 }, cut2: { who: 'elder', mood: 'ang', fx: 'shade', side: 'l', y: 62, at: 1200 }, sub: '“陆、天、衡。”', sfx: [[1200, 'drum'], [1700, 'drum'], [2200, 'drum']] },
    { bg: 'cg:jade:0', tint: ['#0a0818', 0.3], ms: 4000, flash: [300], lines: '#8ff0d0', linesAt: 1400, sub: '“本座的好大徒弟。”', shake: [[300, 500, 5]], sfx: [[300, 'tear'], [1400, 'reveal']] }] },
  // ⑳ 九百级石阶（story_r7 之前）：第二镜换成并肩上阶的两个背影
  shijie: { n: '九百级石阶', no: '⑳', bgm: 'vow', thumb: 'tjgate', shots: [
    { bg: 'tjgate', cam: 'panUp', ms: 5000, sub: '“这阵，是本座教的。”', sfx: [[200, 'wind'], [1200, 'rumble']] },
    { bg: 'cg:two:#55506e', cam: 'push', ms: 3600, sfx: [[300, 'drum'], [1000, 'drum'], [1700, 'drum'], [2400, 'drum']] },
    { bg: 'stele', dim: 0.2, ms: 4000, sub: '“问剑，天剑宗。”', shake: [[600, 400, 3]], sfx: [[600, 'gong']] }] },
  // ㉒ 玄霄重铸（ch_sword_6 之后）
  chongzhu: { n: '玄霄重铸', no: '㉒', bgm: 'vow', thumb: 'cg:sword:1', shots: [
    { bg: 'cg:sword:0', cam: 'panR', ms: 4000, sfx: [[500, 'clang'], [1700, 'clang'], [2900, 'clang']] },
    { bg: 'cg:sword:0', ms: 2800, lines: '#8ff0d0', flash: [300, 1100, 1900], shake: [[300, 300, 4], [1100, 300, 4], [1900, 300, 5]], sfx: [[300, 'hit'], [1100, 'hit'], [1900, 'hit']] },
    { bg: 'cg:sword:1', cam: 'pull', ms: 5000, flash: [200], sub: '“剑里，空着一块。”', sfx: [[300, 'reveal'], [3000, 'bell']] }] },
  // ㉔ 最后的访客（story_ascend 之前）：没有人来的时候，门一直关着
  fangke: { n: '最后的访客', no: '㉔', bgm: 'home', thumb: 'cg:door:0', shots: [
    { bg: 'cg:door:0', cam: 'push', ms: 4000, sfx: [[300, 'wind']] },
    { if: VISITOR, bg: 'cg:door:1', ms: 5000, sub: '“明天，还回来吗？”', sfx: [[400, 'tap'], [900, 'tap'], [1800, 'bell']] },
    { if: '!' + VISITOR, bg: 'cg:door:0', dim: 0.3, ms: 5000, sub: '没有人来。', sfx: [[600, 'wind']] }] },
});
if (typeof module !== 'undefined' && module.exports) module.exports = [];
})(typeof window !== 'undefined' ? window : globalThis);
