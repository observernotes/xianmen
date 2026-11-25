/* 废柴仙途 · 核心逻辑入口（浏览器与 node 共用）
 *
 * 逻辑按系统拆在 src/logic/ 下，一个文件一个系统，全部挂在同一个对象 L 上。每个模块的写法：
 *
 *   (function (install) { …一行固定样板… })(function (L) {
 *   'use strict';
 *   const { R, ri, pick, wpick, clamp, emit } = L.U;   // core 提供的工具
 *   …本模块的数据与函数，公开的挂到 L 上（L.xxx = …）…
 *   });
 *
 * 那行样板让同一个文件在两种环境都能直接用：node 里 require 得到 install 函数，由本入口按 MODULES 顺序调用；
 * 浏览器里文件一执行就装到全局 window.L 上。
 *
 * 规则：
 *  - 模块之间只通过 L 互相调用（调用时才去查 L.xxx），所以加载顺序只影响“加载时就执行”的语句，
 *    比如 L.addCulMod / L.addAtkMod 登记倍率（决定数值拆解面板里各项的先后）。
 *  - 模块私有的东西用 const / function，不挂 L；别的模块要用的才挂 L。
 *  - 新系统（功法、法宝、灵宠…）新建一个模块，在 MODULES 里排到它依赖的模块后面，
 *    用 L.addCulMod / L.addAtkMod（见 stats.js）把自己的倍率接进修炼与战力，不要去改 L.gain / L.power。
 *
 * 加载顺序（也是 tools/build.py 内联进 dist 的顺序，build.py 直接读下面这个数组）：
 *   core 工具·参数·境界表·公式·新档 → stats 倍率汇总 → items 阶表与发放 → arts 五行与功法 → gear 法宝三槽·强化·词条·打造 → home 洞府 → npc 羁绊
 *   → rivals 天骄榜·对决·约战·论道 → sect 宗门·任务板 → expedition 历练·首领 → cultivation 吐纳·突破·闭关·疗伤
 *   → calendar 四季·固定历·天下大势 → market 坊市货架·行情·拍卖竞价 → realm 秘境 → alchemy 炼丹 → events-engine 奇遇·访客 → quests 札记 → meta 成就·转世 → save 迁移 → tick 推进
 *
 * 用法：node 里 const L = require('./src/logic.js')；浏览器里 <script src="src/logic.js"> 会按顺序载入各模块
 * （tools/preview.html 这样用）；dist 由 tools/build.py 把模块按顺序内联，不经过本文件。
 */
(function () {
'use strict';
const MODULES = ['core', 'stats', 'items', 'arts', 'gear', 'home', 'npc', 'rivals', 'sect', 'expedition', 'cultivation', 'calendar', 'market', 'realm', 'alchemy', 'events-engine', 'quests', 'meta', 'save', 'tick'];
if (typeof module === 'object' && module.exports) {
  const L = {};
  for (const m of MODULES) require('./logic/' + m + '.js')(L);
  module.exports = L;
} else if (typeof document !== 'undefined' && document.currentScript) {
  const base = document.currentScript.src.replace(/[^/]*$/, '') + 'logic/';
  for (const m of MODULES) document.write('<script src="' + base + m + '.js"><\/script>');
}
})();
