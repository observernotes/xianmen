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
 *   → rivals 天骄榜·对决·约战·论道 → sect 宗门·任务板 → expedition 历练·首领 → loot 刷宝：归途翻牌·掉落表·心愿·保底 → cultivation 吐纳·突破·闭关·疗伤
 *   → calendar 四季·固定历·天下大势 → market 坊市货架·行情·拍卖竞价 → realm 秘境 → alchemy 炼丹·药引丹方·丹毒 → events-engine 奇遇·访客 → pets 灵宠名册·岗位·进化 → crops 灵田作物·药引 → quests 札记 → meta 成就·转世
 *   → trib 天劫·护劫手段·道基·心魔劫 → dao 道心·因果（包了几个前面模块的函数，所以排在它们后面）
 *   → sect2 宗门加深：任务板四类、宝库轮换、职司、人脉、血煞魔宗 → disciples 徒弟·差事·传授·出师·三人会武
 *   → rivals2 宿敌与新秀：恩怨、伏击 / 抬价 / 带头、化敌为友、宿敌的奇遇、新秀（包了 newState / fill / resolveChoice / sectWar）
 *   → formation 阵法（聚灵阵上布阵、换阵 3 周天生效）→ buildings 洞府建筑接进各系统·阵图来源·洞府事件·迁移（home.js 管地块与建造）
 *   → people 人物加深：喜好送礼、委托、同伴、道侣双修（包了历练、炼丹、首领、秘境的几个函数，所以排在它们后面）→ save 迁移 → tick 推进
 *   → chains 奇遇链进度 → codex 图鉴 → samsara 轮回·道果·轮回殿·出身·天道试炼·传承（这三个包了 L.tick、L.newState、L.eligible 等，所以排在 tick 后面）
 *
 * 用法：node 里 const L = require('./src/logic.js')；浏览器里 <script src="src/logic.js"> 会按顺序载入各模块
 * （tools/preview.html 这样用）；dist 由 tools/build.py 把模块按顺序内联，不经过本文件。
 */
(function () {
'use strict';
const MODULES = ['core', 'stats', 'items', 'arts', 'gear', 'home', 'npc', 'rivals', 'sect', 'expedition', 'loot', 'cultivation', 'calendar', 'market', 'realm', 'alchemy', 'events-engine', 'pets', 'crops', 'quests', 'meta', 'trib', 'dao', 'sect2', 'disciples', 'rivals2', 'formation', 'buildings', 'people', 'save', 'tick', 'chains', 'codex', 'samsara', 'onboard', 'path', 'time', 'report'];
if (typeof module === 'object' && module.exports) {
  const L = {};
  for (const m of MODULES) require('./logic/' + m + '.js')(L);
  module.exports = L;
} else if (typeof document !== 'undefined' && document.currentScript) {
  const base = document.currentScript.src.replace(/[^/]*$/, '') + 'logic/';
  for (const m of MODULES) document.write('<script src="' + base + m + '.js"><\/script>');
}
})();
