/* 废柴仙途 · 事件库扩展：因果寻仇（SYSTEMS §14“因果会回来”）
 * 引擎约定（dao.js）：
 *   karma: n        事件级资格：有一条 n 周天前结下、还没了的因果（最早那条就是这件事说的那笔账）
 *   {kwho} {kwhat}  那笔账的当事人 / 你当时做了什么
 *   unkarma: 'any'  了结最早的一条（就是这件事说的那笔）
 *   daoMin: { k|w|r: n }  事件级或选项级：该道心至少 n 笔（选项不满足时不显示）
 */
(function (root) {
'use strict';
const LIST = [
{
  id: 'karma_door', where: 'home', visit: true, karma: 24, cooldown: 48, weight: 2, title: '旧账上门',
  text: '门外站着一个风尘仆仆的人，不进门，也不拔剑：“{kwhat}——那天的事，你还记得{kwho}吗？我来，只要你一句话。”',
  choices: [
    { t: '认下，赔礼', cost: { stones: 3 }, dao: 'w',
      ok: { text: '你把灵石和一句“对不住”一起放在他面前。他沉默很久，收下了，走的时候脚步轻了些。', fx: { unkarma: 'any' } } },
    { t: '“要打便打”', duel: 1.0, dao: 'k',
      ok: { text: '他倒下前笑了一声：“账还在，总有人来收。”你擦干剑，心里并没有轻一点。', fx: { xp: 3, stones: 1 } },
      fail: { text: '他的刀比你想的快。他没要你的命，只留下一句：“这是利息。”', fx: { inj: 3 } } },
    { t: '“滚”', daoMin: { k: 12 },
      ok: { text: '你只说了一个字。他盯着你看了很久，转身走了——有的仇，连报都不敢报。', fx: { xp: 2 } } },
    { t: '闭门不见',
      ok: { text: '门外的人站到天黑才走。第二天，门板上多了一道很深的指痕。', fx: {} } }
  ]
},
{
  id: 'karma_ambush', where: 'exp', minR: 1, karma: 24, cooldown: 48, weight: 2, title: '冤家路窄',
  text: '林子里飞出一枚透骨钉，钉在你脚前三寸。树上的人哑着嗓子：“为了{kwho}，我等了你很久。”',
  choices: [
    { t: '拔剑', duel: 1.2, dao: 'k',
      ok: { text: '你一剑挑落他的钉囊。他滚下树跑了——账没清，人先没了影。', fx: { stones: 2, xp: 2 } },
      fail: { text: '透骨钉打进了你的肩头。他没追，只在林子深处喊：“下回取你的命。”', fx: { inj: 3 } } },
    { t: '说清当年', p: 0.6, dao: 'r',
      ok: { text: '你讲完那天的事，树上安静很久，一声叹息。人走了，钉子也收走了。', fx: { unkarma: 'any' } },
      fail: { text: '他不听，第二枚钉子擦着你的耳朵过去。你只好退走，这一趟白跑了半程。', fx: { inj: 1 } } },
    { t: '收剑，任他发落', daoMin: { r: 12 }, dao: 'r',
      ok: { text: '你收剑站着。透骨钉悬在你眉心前一寸，停了很久，掉在了地上。', fx: { unkarma: 'any', xp: 2 } } },
    { t: '绕路走', dao: 'w',
      ok: { text: '你绕了三十里山路，顺手采了几株草。那枚透骨钉一直钉在原地，像是在说：它还会等。', fx: { herbs: 1 } } }
  ]
},
{
  id: 'karma_kin', where: 'home', visit: true, minR: 2, karma: 48, cooldown: 60, title: '苦主之后',
  text: '一个半大孩子跪在洞府门口，额头磕出了血：“我是{kwho}家的人。我不要你的命——我要学本事，学会了再来找你。”',
  choices: [
    { t: '收下他，教他', cost: { stones: 2 }, dao: 'r',
      ok: { text: '你教了他三个月。临走那天他磕了个头：“那笔账，我替我家记下了，也替我家勾了。”', fx: { unkarma: 'any', xp: 2 } } },
    { t: '给些灵石打发', cost: { stones: 1 }, dao: 'w',
      ok: { text: '孩子没接灵石，看了你一眼就走了。那一眼，你记了很久。', fx: { xp: 1 } } },
    { t: '让他走', dao: 'k',
      ok: { text: '他走了，一步一回头。你知道，十年后会有一个人提着剑回来。', fx: {} } }
  ]
},
{
  id: 'karma_bounty', where: 'exp', minR: 2, karma: 36, cooldown: 60, title: '悬赏令',
  text: '驿站墙上贴着一张悬赏令，画的是你，画得还挺像。落款是{kwho}的亲故：“{kwhat}，此仇不共戴天。”',
  choices: [
    { t: '撕了它', dao: 'k',
      ok: { text: '你当众撕了悬赏令。围观的人散得很快，只有一个人没走，远远记下了你的模样。', fx: { xp: 1 } } },
    { t: '找发令人赔礼', cost: { stones: 4 }, dao: 'r',
      ok: { text: '你把赔礼放在发令人门口。悬赏令第二天就撕了，原处换上了一张寻狗启事。', fx: { unkarma: 'any' } } },
    { t: '揭下来收好', dao: 'w',
      ok: { text: '你把悬赏令折好收进袖里。每回打坐，都觉得它在袖子里微微发烫。', fx: { xp: 2 } } }
  ]
},
{
  id: 'karma_visit', where: 'home', visit: true, karma: 12, daoMin: { r: 5 }, cooldown: 60, title: '漏雨的屋',
  text: '过路的老妇说起：{kwho}自那件事之后，日子一直不好过，住在城外那间漏雨的屋里。“你要是有心，就去看一眼吧。”',
  choices: [
    { t: '带上灵石去看', cost: { stones: 2 }, dao: 'r',
      ok: { text: '你替那间屋补了顶，留下灵石，没提那件事。走的时候，屋里传来一声“慢走”。', fx: { unkarma: 'any' } } },
    { t: '“不必了”',
      ok: { text: '老妇点点头，没再说什么，背着柴走远了。', fx: {} } }
  ]
}
];
if (typeof module !== 'undefined' && module.exports) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
