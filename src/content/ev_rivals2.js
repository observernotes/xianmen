/* 废柴仙途 · 事件库扩展：宿敌恩怨（SYSTEMS §13）——恩怨 ≥ 60 的伏击、≤ −40 的化敌为友，结了仇的新秀
 * CONTENT §14.2 的 23 个在 ev_realm_rivals.js；这里补的是恩怨值本身要用、计划表里没有的：
 *   rv_ambush_mu / zhao / chu / xue / yun：恩怨 ≥ 60，历练途中伏击（对决带 foe：五行克制、他的法宝都算；赢了恩怨再 +10，示好 −30）
 *   rv_ambush_rk：池子里结了仇（恩怨 ≥ 60）的新秀，{rk} 是他的名字，fx.grudge.rk 作用于他
 *   zhao_4 / tiankuo_5 / mu_5 / xue_4 / yun_4：恩怨 ≤ −40 的来访（赵乾报信的先声、楚天阔同行、慕容和解之后、血无涯的人情、云无极的一子）
 * 引擎写法见 src/logic/rivals2.js 文件头：elig.grudge、elig.rkGrudge、choice.foe、fx.grudge（含 rk）、占位符 {rk}。 */
(function (root) {
'use strict';
const LIST = [

/* ---------- 恩怨 ≥ 60：伏击 ---------- */
{
  id: 'rv_ambush_mu', where: 'exp', grudge: ['mu', 60, 100], minR: 1, weight: 3, cooldown: 36, title: '剑阵',
  text: '灌木里同时亮起剑光，慕容家护院结阵围住了你。{ex}在坡上没有拔剑：“三年前的账，今天一并算清。”',
  choices: [
    { t: '破阵', duel: 1.0, foe: 'mu', dao: 'k',
      ok: { text: '你一剑刺穿阵眼，剑阵散了一地。{ex}在坡上站了很久，转身走了。', fx: { stones: 4, xp: 3, grudge: { mu: 10 } } },
      fail: { text: '你硬撞出一条血路，背上挨了三剑，听见坡上有人轻轻吸了口气。', fx: { inj: 2, grudge: { mu: -10 } } } },
    { t: '朝坡上喊话', dao: 'r',
      ok: { text: '“当年的事，我不怪你。”剑阵停了。{ex}的身影晃了一下，挥手撤人。', fx: { grudge: { mu: -30 } } } },
    { t: '借雾突围', dao: 'w',
      ok: { text: '你借山势滑进雾里。护院追了半里就停了，储物袋却被划开了口子。', fx: { stones: -2 } } }
  ]
},
{
  id: 'rv_ambush_zhao', where: 'exp', grudge: ['zhao', 60, 100], minR: 2, weight: 3, cooldown: 36, title: '缚灵网',
  text: '一张天剑宗缚灵网兜头罩下。赵乾带着四个师弟从树后转出：“你踩着我上榜，踩得挺舒服吧？今天全吐出来。”',
  choices: [
    { t: '挑断网绳', duel: 1.1, foe: 'zhao', dao: 'k',
      ok: { text: '你挑断网绳，反手把赵乾连人带剑钉在树上。师弟们扶着他溜了。', fx: { stones: 5, xp: 3, grudge: { zhao: 10 } } },
      fail: { text: '网上有禁符，你挣开时已被踹进泥里。赵乾吐了口唾沫，走了。', fx: { inj: 2, grudge: { zhao: -10 } } } },
    { t: '丢他灵石', cost: { stones: 4 }, dao: 'w',
      ok: { text: '赵乾掂了掂钱袋，骂骂咧咧收了网：“算你识相。”', fx: { grudge: { zhao: -15 } } } },
    { t: '师兄，何必', dao: 'r',
      ok: { text: '你只叫了声师兄。他的剑顿在半空，憋出一句“谁是你师兄”，带人走了。', fx: { grudge: { zhao: -30 } } } }
  ]
},
{
  id: 'rv_ambush_chu', where: 'exp', grudge: ['chu', 60, 100], minR: 3, weight: 3, cooldown: 36, title: '再问一剑',
  text: '一道剑气把山道劈成两半。楚天阔立在对岸，满身是灰：“论道台那一场，我想了三个月。今日没有看客，再来。”',
  choices: [
    { t: '拔剑', duel: 1.1, foe: 'chu', dao: 'k',
      ok: { text: '三十招，你压住他的剑脊。他盯着剑尖：“还是差一线。”走得很快。', fx: { xp: 5, grudge: { chu: 10 } } },
      fail: { text: '他没白想，一剑挑飞你的发冠：“扯平了。”语气竟有几分快意。', fx: { inj: 1, grudge: { chu: -20 } } } },
    { t: '请他论剑', dao: 'r',
      ok: { text: '你们隔着剑痕从剑招讲到剑心，直到天黑。他起身：“下回见面，我请酒。”', fx: { xp: 2, grudge: { chu: -30 } } } },
    { t: '我认输', dao: 'w',
      ok: { text: '他皱眉：“你这是瞧不起我。”还是让开了路。', fx: { grudge: { chu: 10 } } } }
  ]
},
{
  id: 'rv_ambush_xue', where: 'exp', grudge: ['xue', 60, 100], minR: 3, weight: 3, cooldown: 36, title: '人偶',
  text: '林中鸟雀齐飞。血无涯坐在枯树上晃腿，脚下吊着三具长着你脸的傀儡：“就差一个真的。你说，挂哪个位置好看？”',
  choices: [
    { t: '斩了傀儡', duel: 1.2, foe: 'xue', dao: 'k',
      ok: { text: '三剑断绳，第四剑直指树上。血无涯捂臂大笑：“好！就要这个劲！”人已不见。', fx: { stones: 6, xp: 4, grudge: { xue: 10 } } },
      fail: { text: '第三具傀儡咬在你肩上。血无涯在树上鼓掌：“下回做得更像点。”', fx: { inj: 3, grudge: { xue: -5 } } } },
    { t: '扔他壶酒', dao: 'r',
      ok: { text: '他接住喝完，把空囊扔回来：“没意思。你走吧。”', fx: { grudge: { xue: -30 } } } },
    { t: '掉头就走', dao: 'w',
      ok: { text: '傀儡关节咔咔作响，跟了你三里地。回头时，树上已经没人了。', fx: { xp: 1 } } }
  ]
},
{
  id: 'rv_ambush_yun', where: 'exp', grudge: ['yun', 60, 100], minR: 4, weight: 3, cooldown: 36, title: '拦路棋局',
  text: '路中央摆着半局棋，四周一圈不化的雪。云无极闭眼坐着：“你最近赢得太多，榜都乱了。下完这盘，今年别再往上走了。”',
  choices: [
    { t: '落子', duel: 1.2, foe: 'yun', dao: 'k',
      ok: { text: '你一子落下，雪化了。他睁眼：“这一手我没算到。”棋盘碎成满地星光。', fx: { xp: 6, grudge: { yun: 10 } } },
      fail: { text: '中盘你就看不清了。他替你摆上最后一子：“你输在急。”回神时已在路边坐了三天。', fx: { inj: 2, grudge: { yun: -10 } } } },
    { t: '棋外有人', dao: 'r',
      ok: { text: '“棋盘之外，还有人在看。”云无极睁眼看了你一会儿：“……也是。”雪停了。', fx: { grudge: { yun: -30 } } } },
    { t: '绕过去', dao: 'w',
      ok: { text: '身后一声很轻的落子，像有人替你下了一手。那年冬天，你的剑意格外安静。', fx: { xp: 2 } } }
  ]
},
{
  id: 'rv_ambush_rk', where: 'exp', rkGrudge: 60, minR: 4, weight: 3, cooldown: 36, title: '战书',
  text: '一支响箭钉在你脚边，绑着战书。{rk}带着同门走出林子：“那天你当着天下人打压我。今天，我要讨回来。”',
  choices: [
    { t: '再打一次', duel: 1.0, dao: 'k',
      ok: { text: '这一回他输得更干脆，被同门扶走时还在喊：“我还会再来！”你忽然有点佩服他这股劲。', fx: { stones: 5, xp: 3, grudge: { rk: 10 } } },
      fail: { text: '他这些日子确实下了苦功，你一时轻敌，被他一剑划破了袖子。他收剑：“这下两清。”', fx: { inj: 1, grudge: { rk: -30 } } } },
    { t: '把话说开', dao: 'r',
      ok: { text: '你说那天下手重了。{rk}脸涨得通红，别扭地抱拳：“那我下回再来请教。”', fx: { grudge: { rk: -40 } } } },
    { t: '不理他', dao: 'w',
      ok: { text: '你看都没看那封战书，径直走了。{rk}在后面骂了一路，声音越来越远。', fx: { xp: 1 } } }
  ]
},

/* ---------- 恩怨 ≤ −40：化敌为友 ---------- */
{
  // 恩怨降到 −40 时引擎已置 zhao_owes（天剑宗来犯前 6 周天他会报信：zhao_3）；这一封是先声
  id: 'zhao_4', where: 'home', visit: true, grudge: ['zhao', -100, -40], minR: 2, once: true, title: '蜡丸',
  text: '天剑宗外门弟子塞来一只蜡丸就跑：“赵师兄让带的。”字条歪歪扭扭：“天剑宗迟早动你的宗门。日子我替你盯着。”',
  choices: [
    { t: '回他一句', dao: 'r',
      ok: { text: '你回了“多谢”。第二天又来一只蜡丸，只有一个字：“滚。”你笑了。', fx: { grudge: { zhao: -10 }, flag: 'zhao_owes' } } },
    { t: '烧了字条', dao: 'w',
      ok: { text: '天剑宗的事不宜沾得太深。可那几个歪字，你记住了。', fx: { xp: 2 } } }
  ]
},
{
  // 楚天阔同行（tiankuo_ally）：斩妖分数 +6（rivals2.js 的 L.rivalAllyOn；同伴系统上线后改由它接管）
  id: 'tiankuo_5', where: 'home', visit: true, grudge: ['chu', -100, -40], minR: 3, need: ['beat_chu'], not: ['tiankuo_ally'], once: true, title: '同行',
  text: '楚天阔满身葬剑渊的土站在门外：“查得越多，越不知该信谁。你出门，我跟着——你的剑我看得懂。”',
  choices: [
    { t: '一起走', dao: 'r',
      ok: { text: '他话少，出剑快，替你挡下好几回暗处的东西。从此你身边多了一道白影。', fx: { grudge: { chu: -10 }, flag: 'tiankuo_ally' } } },
    { t: '各走各路', dao: 'w',
      ok: { text: '楚天阔点头走了。十几步后，他背对你挥了挥手。', fx: { xp: 2 } } }
  ]
},
{
  id: 'mu_5', where: 'home', visit: true, grudge: ['mu', -100, -40], minR: 2, need: ['beat_mu'], once: true, title: '桂花糕',
  text: '{ex}独自提着一篮落霞城桂花糕，说是路过。一盏茶里谁也没提从前，临走才开口：“天骄榜上，你别输给别人。”',
  choices: [
    { t: '送到山门', dao: 'r',
      ok: { text: '{ex}回头看了洞府一眼，像要记住它。篮底压着一枚绣工很笨的护身符。', fx: { xp: 2, grudge: { mu: -10 }, flag: 'mu_friend' } } },
    { t: '你也是', dao: 'w',
      ok: { text: '{ex}笑了一下，是三年来你头一回见的那种笑，然后头也不回地下山。', fx: { xp: 2 } } }
  ]
},
{
  id: 'xue_4', where: 'home', visit: true, grudge: ['xue', -100, -40], minR: 3, once: true, title: '血书',
  text: '血无涯半夜翻墙，扔下一卷血书：“魔门有人要拿你炼丹，名字都在这儿。别谢我，我只是不想你死在别人手里。”',
  choices: [
    { t: '收下', dao: 'w',
      ok: { text: '名单上的人后来一个个出现，每一回你都早有准备。', fx: { xp: 3, flag: 'xue_list' } } },
    { t: '请他喝茶', dao: 'r',
      ok: { text: '他喝一口就皱眉：“正道的茶，淡得没味。”一壶却全喝光了。', fx: { grudge: { xue: -10 }, xp: 2 } } }
  ]
},
{
  id: 'yun_4', where: 'home', visit: true, grudge: ['yun', -100, -40], minR: 4, once: true, title: '一子',
  text: '白鹤衔来一枚黑子，云无极的声音很远：“上回那盘没下完。这一子，替我落在你觉得该落的地方。”',
  choices: [
    { t: '落在天元', dao: 'k',
      ok: { text: '很久后鹤衔回一枚白子和两个字：“好棋。”从此你打坐时，心里多了一盘棋。', fx: { xp: 5 } } },
    { t: '还给他', dao: 'w',
      ok: { text: '鹤歪头飞走了。远处有人笑了一声，窗台上的雪很久没化。', fx: { xp: 3, grudge: { yun: -10 } } } }
  ]
},
];
if (typeof module === 'object' && module.exports) module.exports = LIST;
else if (root) { root.EVENTS = root.EVENTS || []; root.EVENTS.push(...LIST); }
})(typeof window !== 'undefined' ? window : null);
