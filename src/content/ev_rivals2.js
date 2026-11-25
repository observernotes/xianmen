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
  text: '山道两侧的灌木里同时亮起剑光，十几名慕容家的护院把你围在中间。{ex}站在坡上，没有拔剑，只冷冷地看着：“三年前的账，今天一并算清。”剑阵已经合拢。',
  choices: [
    { t: '破阵', duel: 1.0, foe: 'mu', dao: 'k',
      ok: { text: '你挑准阵眼一剑刺穿，剑阵像断了线的珠子散了一地。{ex}在坡上站了很久，转身走了，没再回头。', fx: { stones: 4, xp: 3, grudge: { mu: 10 } } },
      fail: { text: '剑阵比你想的密。你硬撞出一条血路，背上挨了三剑，听见坡上有人轻轻吸了口气。', fx: { inj: 2, grudge: { mu: -10 } } } },
    { t: '朝坡上喊话', dao: 'r',
      ok: { text: '你收剑朝坡上喊：“当年的事，我不怪你。”剑阵停了。{ex}的身影在坡上晃了一下，挥手撤了人。', fx: { grudge: { mu: -30 } } } },
    { t: '借雾突围', dao: 'w',
      ok: { text: '你不恋战，借着山势往下一滑，钻进了雾里。护院追了半里地就不追了，你的储物袋却被划开了口子。', fx: { stones: -2 } } }
  ]
},
{
  id: 'rv_ambush_zhao', where: 'exp', grudge: ['zhao', 60, 100], minR: 2, weight: 3, cooldown: 36, title: '缚灵网',
  text: '半道上一张天剑宗的缚灵网兜头罩下。赵乾从树后转出来，身后跟着四个师弟，剑都出了鞘：“你踩着我上榜，踩得挺舒服吧？今天让你把吃下去的都吐出来。”',
  choices: [
    { t: '挑断网绳', duel: 1.1, foe: 'zhao', dao: 'k',
      ok: { text: '你一剑挑断网绳，反手把赵乾连人带剑钉在树上。四个师弟面面相觑，扶着他溜了。', fx: { stones: 5, xp: 3, grudge: { zhao: 10 } } },
      fail: { text: '网上画着天剑宗的禁符，你挣了半天才挣开，人已经被踹进了泥里。赵乾吐了口唾沫，走了。', fx: { inj: 2, grudge: { zhao: -10 } } } },
    { t: '丢他一袋灵石', cost: { stones: 4 }, dao: 'w',
      ok: { text: '你把一袋灵石扔到他脚边。赵乾愣了愣，捡起来掂了掂，骂骂咧咧地收了网：“算你识相。”', fx: { grudge: { zhao: -15 } } } },
    { t: '“师兄，何必呢”', dao: 'r',
      ok: { text: '你没还手，只叫了他一声师兄。赵乾的剑顿在半空，憋了半天憋出一句“谁是你师兄”，带人走了。', fx: { grudge: { zhao: -30 } } } }
  ]
},
{
  id: 'rv_ambush_chu', where: 'exp', grudge: ['chu', 60, 100], minR: 3, weight: 3, cooldown: 36, title: '再问一剑',
  text: '一道剑气横在路中，把山道劈成两半。楚天阔立在对岸，白衣上落满了灰，像是等了很久：“论道台上那一场，我回去想了三个月。今日没有看客，再来。”',
  choices: [
    { t: '拔剑', duel: 1.1, foe: 'chu', dao: 'k',
      ok: { text: '三十招，你一剑压住了他的剑脊。楚天阔盯着剑尖看了很久，收剑：“还是差一线。”他走得很快。', fx: { xp: 5, grudge: { chu: 10 } } },
      fail: { text: '他这三个月没白想，一剑挑飞了你的发冠。楚天阔收剑：“扯平了。”语气里竟有几分快意。', fx: { inj: 1, grudge: { chu: -20 } } } },
    { t: '请他论剑', dao: 'r',
      ok: { text: '你们隔着那道剑痕坐下来，从剑招讲到剑心，一直讲到天黑。楚天阔起身时说：“下回见面，我请酒。”', fx: { xp: 2, grudge: { chu: -30 } } } },
    { t: '“我认输”', dao: 'w',
      ok: { text: '你把剑插回鞘里。楚天阔皱眉看了你半天：“你这是瞧不起我。”可他还是让开了路，剑气也散了。', fx: { grudge: { chu: 10 } } } }
  ]
},
{
  id: 'rv_ambush_xue', where: 'exp', grudge: ['xue', 60, 100], minR: 3, weight: 3, cooldown: 36, title: '人偶',
  text: '林子里的鸟忽然全飞了。血无涯坐在一棵枯树上晃着腿，脚下吊着三具傀儡，傀儡的脸都是你的模样：“我做了好几个，就差一个真的。你说，挂哪个位置好看？”',
  choices: [
    { t: '斩了傀儡', duel: 1.2, foe: 'xue', dao: 'k',
      ok: { text: '你一剑斩断三根吊绳，第四剑直指树上。血无涯翻身落地，捂着手臂大笑：“好！就要这个劲！”人已经不见了。', fx: { stones: 6, xp: 4, grudge: { xue: 10 } } },
      fail: { text: '傀儡忽然睁眼扑了上来，你斩了两具，第三具咬在你肩上。血无涯在树上鼓掌：“下回做得更像点。”', fx: { inj: 3, grudge: { xue: -5 } } } },
    { t: '扔他一壶酒', dao: 'r',
      ok: { text: '你在树下坐了，把酒囊扔上去。血无涯接住，愣了一下，喝完把空囊扔回来：“没意思。你走吧。”', fx: { grudge: { xue: -30 } } } },
    { t: '掉头就走', dao: 'w',
      ok: { text: '你转身就走，背后傀儡的关节咔咔作响，一路跟了你三里地才停。回头时，树上已经没人了。', fx: { xp: 1 } } }
  ]
},
{
  id: 'rv_ambush_yun', where: 'exp', grudge: ['yun', 60, 100], minR: 4, weight: 3, cooldown: 36, title: '拦路棋局',
  text: '路中央摆着一张棋盘，黑白子已经落了大半。云无极闭着眼坐在一侧：“你最近赢得太多，天骄榜都乱了。下完这盘，你今年就别再往上走了。”棋盘四周落着一圈不化的雪。',
  choices: [
    { t: '落子', duel: 1.2, foe: 'yun', dao: 'k',
      ok: { text: '你一子落下，雪化了。云无极睁开眼看了棋盘一会儿：“这一手我没算到。”他起身拂袖，棋盘碎成满地星光。', fx: { xp: 6, grudge: { yun: 10 } } },
      fail: { text: '你下到中盘就看不清了。云无极替你把最后一子摆上：“你输在急。”回过神来，你已在路边坐了三天。', fx: { inj: 2, grudge: { yun: -10 } } } },
    { t: '“棋盘外还有人”', dao: 'r',
      ok: { text: '你说：“棋盘之外，还有人在看。”云无极沉默良久，竟真的睁开了眼，看了你一会儿：“……也是。”雪停了。', fx: { grudge: { yun: -30 } } } },
    { t: '绕过去', dao: 'w',
      ok: { text: '你绕开棋盘走了过去。身后传来一声很轻的落子声，像是有人替你下了一手。那年冬天，你的剑意格外安静。', fx: { xp: 2 } } }
  ]
},
{
  id: 'rv_ambush_rk', where: 'exp', rkGrudge: 60, minR: 4, weight: 3, cooldown: 36, title: '战书',
  text: '一支响箭钉在你脚边的树上，箭尾绑着一封战书。{rk}从林子里走出来，身边多了几个同门：“那天你当着天下人打压我，这口气我咽不下。今天，我要把它讨回来。”',
  choices: [
    { t: '再打一次', duel: 1.0, dao: 'k',
      ok: { text: '这一回他输得更干脆，被同门扶走时还在喊：“我还会再来！”你忽然有点佩服他这股劲。', fx: { stones: 5, xp: 3, grudge: { rk: 10 } } },
      fail: { text: '他这些日子确实下了苦功，你一时轻敌，被他一剑划破了袖子。他收剑：“这下两清。”', fx: { inj: 1, grudge: { rk: -30 } } } },
    { t: '把那天说开', dao: 'r',
      ok: { text: '你说那天下手重了，是你不对。{rk}愣了半天，脸涨得通红，最后别扭地抱了抱拳：“那我下回再来请教。”', fx: { grudge: { rk: -40 } } } },
    { t: '不理他', dao: 'w',
      ok: { text: '你看都没看那封战书，径直走了。{rk}在后面骂了一路，声音越来越远。', fx: { xp: 1 } } }
  ]
},

/* ---------- 恩怨 ≤ −40：化敌为友 ---------- */
{
  // 恩怨降到 −40 时引擎已置 zhao_owes（天剑宗来犯前 6 周天他会报信：zhao_3）；这一封是先声
  id: 'zhao_4', where: 'home', visit: true, grudge: ['zhao', -100, -40], minR: 2, once: true, title: '蜡丸',
  text: '一个天剑宗的外门弟子摸到你洞府门口，塞给你一只蜡丸就跑：“赵师兄让我带的。”蜡丸里一张字条，字歪歪扭扭：“天剑宗迟早要动你的宗门。日子我替你盯着。”',
  choices: [
    { t: '回他一句', dao: 'r',
      ok: { text: '你在字条背面写了“多谢”两个字，让那弟子带回去。第二天又来了一只蜡丸，里面只有一个字：“滚。”你笑了。', fx: { grudge: { zhao: -10 }, flag: 'zhao_owes' } } },
    { t: '烧了字条', dao: 'w',
      ok: { text: '你把字条凑到灯上烧了。天剑宗的事，还是不要沾得太深。可那几个歪字，你记住了。', fx: { xp: 2 } } }
  ]
},
{
  // 楚天阔同行（tiankuo_ally）：斩妖分数 +6（rivals2.js 的 L.rivalAllyOn；同伴系统上线后改由它接管）
  id: 'tiankuo_5', where: 'home', visit: true, grudge: ['chu', -100, -40], minR: 3, need: ['beat_chu'], not: ['tiankuo_ally'], once: true, title: '同行',
  text: '楚天阔背着剑站在你洞府外，衣上还沾着葬剑渊的土：“我查到的东西越多，越不知道该信谁。”他顿了顿，“你要出门，我跟着。你的剑我看得懂，别人的我看不懂了。”',
  choices: [
    { t: '一起走', dao: 'r',
      ok: { text: '你们并肩下山。他话很少，出剑却快，替你挡下了好几回暗处的东西。从此你斩妖时，身边多了一道白影。', fx: { grudge: { chu: -10 }, flag: 'tiankuo_ally' } } },
    { t: '各走各路', dao: 'w',
      ok: { text: '你说这事得他自己想明白。楚天阔点点头，转身走了。走出十几步，他背对着你挥了挥手。', fx: { xp: 2 } } }
  ]
},
{
  id: 'mu_5', where: 'home', visit: true, grudge: ['mu', -100, -40], minR: 2, need: ['beat_mu'], once: true, title: '桂花糕',
  text: '{ex}来时没带随从，提着一篮落霞城的桂花糕，说是路过。坐了一盏茶的工夫，谁也没提从前的事。临走前{ex}忽然开口：“天骄榜上，你别输给别人。”',
  choices: [
    { t: '送到山门', dao: 'r',
      ok: { text: '你送到山门口，{ex}回头看了一眼洞府，像是要把它记住。篮子底下压着一枚护身符，绣工很笨。', fx: { xp: 2, grudge: { mu: -10 }, flag: 'mu_friend' } } },
    { t: '“你也是”', dao: 'w',
      ok: { text: '你说：“你也是。”{ex}笑了一下，是三年来你头一回看见的那种笑，然后头也不回地下山了。', fx: { xp: 2 } } }
  ]
},
{
  id: 'xue_4', where: 'home', visit: true, grudge: ['xue', -100, -40], minR: 3, once: true, title: '血书',
  text: '血无涯大半夜翻墙进来，往你桌上扔了一卷血书：“魔门里有人要拿你炼丹，名字都在这儿。”他打了个哈欠，“别谢我，我只是不想你死在别人手里。”',
  choices: [
    { t: '收下', dao: 'w',
      ok: { text: '你收下血书。上面的名字你一个都不认得，后来却一个一个出现在你面前，每一回你都早有准备。', fx: { xp: 3, flag: 'xue_list' } } },
    { t: '请他喝茶', dao: 'r',
      ok: { text: '你泡了壶茶。他喝了一口就皱眉：“正道的茶，淡得没味。”嘴上嫌弃，一壶却全喝光了。', fx: { grudge: { xue: -10 }, xp: 2 } } }
  ]
},
{
  id: 'yun_4', where: 'home', visit: true, grudge: ['yun', -100, -40], minR: 4, once: true, title: '一子',
  text: '一只白鹤落在你窗台上，嘴里衔着一枚黑子。云无极的声音从很远的地方传来：“上回那盘没下完。这一子，替我落在你觉得该落的地方。”',
  choices: [
    { t: '落在天元', dao: 'k',
      ok: { text: '你把黑子落在天元。很久之后鹤又来了，衔着一枚白子和两个字：“好棋。”从此你打坐时，心里像多了一盘棋。', fx: { xp: 5 } } },
    { t: '还给他', dao: 'w',
      ok: { text: '你把黑子放回鹤嘴里。鹤歪头看你，飞走了。远处有人笑了一声，雪落在窗台上，很久都没化。', fx: { xp: 3, grudge: { yun: -10 } } } }
  ]
},
];
if (typeof module === 'object' && module.exports) module.exports = LIST;
else if (root) { root.EVENTS = root.EVENTS || []; root.EVENTS.push(...LIST); }
})(typeof window !== 'undefined' ? window : null);
