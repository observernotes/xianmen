(function (root) {
'use strict';
const LIST = [

/* ============================================================
 * 废柴仙途 · 事件库扩展：宗门（CONTENT §14.3，45）、人物委托与终章（§14.4，26）
 *
 * 引擎约定（本文件用到、需要 L.applyFx / L.eligible 支持的写法）
 * 一、CONTENT 顶部已定义的新键：ore feed yin token art gear pet mastery grudge favor karma
 *     unkarma plan recipe hp petForm petHeart item:'need'；choice.dao；favorMin / srankMin / cooldown。
 *     favor 的 a / b / c = 本宗第 1 / 2 / 3 位长老；具体长老 id 只出现在该宗专属事件里：
 *       jian：lingxu 凌虚子 / tieye 铁冶真人 / liu 柳含烟
 *       dan ：yun 丹云婆婆 / yaochen 药尘子 / chisong 赤松客
 *       dao ：xuanwei 玄微子 / shouzhuo 守拙道人 / qingxu 清虚真人
 *       mo  ：xuehe 血河老祖 / xuesan 鬼医薛三 / youji 幽姬
 *     favorMin: [长老id, n] 同时隐含“身在该宗”。srankMin 用 L.SRANKS 下标（1 内门 … 4 长老 … 6 宗主）。
 * 二、本文件额外用到的（CONTENT 未列）：
 *   fx.toxin: n     丹毒 +n（与 ev_realm_rivals.js 同义）
 *   fx.busy: n      你被占住 n 周天（同“指点师弟”：不修炼、不能出门）
 *   fx.duty: id     设定宗门职司：dan 丹堂 / qi 器堂 / zhan 战堂 / fa 执法堂 / wai 外事堂（SYSTEMS §11）
 *   fx.disc: {...}  作用于触发本事件的那名徒弟（仿 petForm/petHeart）：
 *                   new: 'strong'|'clever'|'quiet' 收一名新徒弟（灵根 1～5 随机；性情在该类里随机：
 *                        strong→莽/勤勉，clever→聪慧/滑/贪玩，quiet→痴/孤傲/仁厚）
 *                   grow: 0.05 成长永久 +5%；lv: 1 立升一小层；heart: ±1 师徒情分；
 *                   inj: n 休养 n 周天；job: 0.1 差事收益永久 +10%；out: true 出师离开名册
 *   unkarma: 'any'  了结一条因果（引擎挑最早的一条；心魔劫里即本题那一条）
 *   petHeart 用在非灵宠触发的事件里时，作用于出战灵宠。
 *   choice.need     该选项需要的 flag（与 ev_realm_rivals.js 同义；条件不满足时不显示）
 *   choices 上限：sect_duty_pick 5 个（五堂）、sect_candidates / sect_succession 4 个，其余 ≤ 3。
 * 三、新 story trigger
 *   srank:2 晋升真传；sect:heir 圣子之争前；sect:lord 宗主之争；
 *   disciple 收徒当天（CONTENT 样稿）；disc:candidates 每 24 周天、真传起、名册有空位；
 *   disc:<时机> 徒弟事件，由徒弟系统按性情触发（trouble 莽/贪玩、question 聪慧、steal 滑、obsess 痴、
 *     pride 孤傲、kind 仁厚、lazy 贪玩、poach 小层≥8、break 冲关、avenge 有因果未了、graduate 可出师）。
 *     徒弟类 story 事件每名徒弟各走一遍（引擎触发时不看 evDone）。
 *   pact_eve 三年之约前一周天；trib:1 第一次雷劫渡过后；demon:1/2/3 元婴/化神/合体雷劫前的心魔劫；
 *   ascend 飞升前夜（立绘由引擎按 CONTENT §13 挑那位访客，正文不点名）。
 * 四、flag 约定
 *   daolv_su / daolv_ye：结为道侣时由引擎置上（su_left / ye_left / su_end / ye_end 用）。
 *   fire_5 / fox_4 / danjing_2：奇遇链第 n 步完成（CONTENT “链短名_步”）；zhao_owes 见 ev_realm_rivals.js。
 *   一次性钩子（引擎读到后执行并清掉）：vault_tip 下一届宝库最上一格高一阶；heir_none 圣子之争贡献门槛 +20%；
 *     lord_vote 按人脉结算宗主之争；lord_gift 交还一件宝库法宝、补一票；war_feint 下次天剑宗战事视战力 ×1.3；
 *     demonN_firm / demonN_waver 本次天劫承劫 +5% / −5%；chu_avenge 论道遇楚天阔战力 ×1.1 一次。
 *   常驻：mo_guard 巡山岗位永久；mo_brother / su_stay / bai_stay 同伴永久；grad_* / su_qianyuan / ye_ten /
 *     ascend_* / pact_k|w|r 供结局与下一世文案读取。
 * ============================================================ */

/* ============================================================
 * 一、宗门 · 通用（9）
 * ============================================================ */
{
  id: 'sect_duty_pick', where: 'story', trigger: 'srank:2', sect: true, title: '五堂抢人',
  text: '真传玉牌还没捂热，五堂的人已堵在门口：丹堂抱着药匣，器堂扛着铁砧，战堂一言不发地拔剑，执法堂递来一本门规，外事堂笑得最和气。都说：“来我们这儿。”会武之后还能再换。',
  choices: [
    { t: '去丹堂',
      ok: { text: '药匣塞进你怀里：“炉火归你看了。”从此成丹率 +8%，丹药卖价 +20%，任务多半是炼丹。', fx: { duty: 'dan' } } },
    { t: '去器堂',
      ok: { text: '老铁匠把铁砧往你脚边一顿，震得地都颤：“砸。”从此强化成功率 +8%，熔炼所得灵矿 +30%。', fx: { duty: 'qi' } } },
    { t: '去战堂', dao: 'k',
      ok: { text: '那人收剑入鞘，只说了一个字：“走。”从此斩妖分数 +5，论道所得奖励 +30%。', fx: { duty: 'zhan' } } },
    { t: '去执法堂', dao: 'w',
      ok: { text: '你接过门规。那人点头：“往后惹事的少了，挑事的归你打。”坏事上门少些，打赢挑战的同门另得贡献。', fx: { duty: 'fa' } } },
    { t: '去外事堂',
      ok: { text: '外事堂的人笑得更和气了：“迎来送往，都是学问。”坊市便宜一成，拍卖拿下把握 +10%，来访的人也多了。', fx: { duty: 'wai' } } }
  ]
},
{
  id: 'sect_vault_new', where: 'home', visit: true, sect: true, srankMin: 1, cooldown: 48, title: '库房耳语',
  text: '管宝库的哑巴执事把你拦在廊下，蘸着茶水在石桌上写：下一批，有好东西。写完飞快抹掉，竖起三根手指——三天后换货。你兜里的贡献，刚够换架上现有的那一件。',
  choices: [
    { t: '攒着等', dao: 'w',
      ok: { text: '你忍住了。三天后换货，最上头那一格亮得晃眼，标价恰好是你攒下的数。哑巴执事冲你挤了挤眼。', fx: { flag: 'vault_tip', xp: 1 } } },
    { t: '现在就换', dao: 'k',
      ok: { text: '落袋为安。你换走了架上那件，哑巴执事摇摇头，往你手里塞了块糖，像在哄一个不听劝的孩子。', fx: { item: 'need', contrib: -3 } } }
  ]
},
{
  id: 'sect_junior_duel', where: 'home', visit: true, sect: true, srankMin: 1, cooldown: 36, title: '不服来',
  text: '同届入门的一个弟子在演武场立了块木牌，上书你的名字，后头跟三个字：不服来。他脚边已躺着两个替你出头的师弟。围观的人比去年宗门大比还多，都在等你。',
  choices: [
    { t: '下场', duel: 0.9, dao: 'k',
      ok: { text: '三招，他的剑插进了自己立的木牌。他瞪着你：“明年再来。”围观的人散得比来时还快。', fx: { contrib: 2, xp: 3 } },
      fail: { text: '你输了半招。他扛着木牌走了，第二天木牌又立回原处，你的名字底下多了两个字：险胜。', fx: { inj: 1, xp: 3 } } },
    { t: '让他三招', p: 0.55, dao: 'w',
      ok: { text: '你空手让过三招才拔剑，剑尖点在他剑脊上。看台上的长老放下茶碗，在册子上记了你一笔。', fx: { favor: { a: 4, c: 4 }, contrib: 1 } },
      fail: { text: '第三招没让过去，你被一剑挑翻。他愣在原地：“你让我？”拉你起来时，眼里那股不服没了。', fx: { inj: 1, xp: 2 } } },
    { t: '不理他',
      ok: { text: '你绕过演武场去了丹房。木牌立了七天，第八天被他自己劈了当柴烧，听说火很旺。', fx: { xp: 2 } } }
  ]
},
{
  id: 'sect_frame', where: 'home', visit: true, sect: true, srankMin: 2, once: true, title: '枕下的书',
  text: '执法堂查房前一刻，你在枕下摸到一本不属于你的书：血煞魔宗的《血河炼魂篇》，封皮还带着潮气。门外的脚步声已到了第三间。有人想让你今天说不清楚。',
  choices: [
    { t: '捧书出去', dao: 'w',
      ok: { text: '你捧着书迎出门。执事查了半日，查不出你练过一页，记了个“失察”。贡献扣了，名声还在。', fx: { contrib: -2, favor: { a: 3 } } } },
    { t: '查是谁塞的', p: 0.5,
      ok: { text: '书页里有股熏香，你认得——同院那位最爱打听你的师兄。证据呈上去，他被罚守了三年山门。', fx: { contrib: 2, xp: 2 } },
      fail: { text: '线索断在一个已下山的杂役身上。书成了悬案，你在执法堂的名册上，多了一个问号。', fx: { contrib: -1, xp: 2 } } },
    { t: '塞回去', dao: 'k',
      ok: { text: '你从窗缝把书塞进了隔壁那位最爱打听你的师兄枕下。查房的脚步声，在他门口停住了。', fx: { karma: 'frame', contrib: 1 } } }
  ]
},
{
  id: 'sect_lecture', where: 'home', visit: true, sect: true, minR: 4, srankMin: 4, cooldown: 48, title: '轮值讲道',
  text: '轮到你登台讲道。台下黑压压坐满了弟子，前排三把交椅上，三位长老各自端着茶。你知道他们各想听什么，也知道讲了这个，另外两位的茶就该凉了。',
  choices: [
    { t: '讲本门大道',
      ok: { text: '你从入门那天讲起，讲到本门立派时写下的第一句话。掌门端茶的手停了停，另两位低头喝茶。', fx: { favor: { a: 10, b: -3, c: -3 }, contrib: 2, mastery: 5 } } },
    { t: '讲手上功夫',
      ok: { text: '你讲了一个时辰怎么把一件事做熟。散场后有个小弟子追出来问，做了十年还不熟怎么办。你说：“我也是。”', fx: { favor: { a: -3, b: 10, c: -3 }, contrib: 2, herbs: 6 } } },
    { t: '讲世道人心',
      ok: { text: '你讲到一半忘了词，索性讲起山下的人：卖茶的、种田的、求雨的。有三个人当场顿悟，其中一个是你自己。', fx: { favor: { a: -3, b: -3, c: 10 }, contrib: 2, xp: 6 } } }
  ]
},
{
  id: 'sect_candidates', where: 'story', trigger: 'disc:candidates', sect: true, title: '拜师的孩子',
  text: '执事领来三个孩子，按规矩跪在你门前：一个壮得像牛犊，一跪就磕裂了青砖；一个眼珠滴溜溜转，已数清你院里有几株灵草；还有一个不哭不闹，只盯着你腰间的剑。',
  choices: [
    { t: '收小牛犊',
      ok: { text: '你点了那个壮的。孩子咧嘴一笑，又磕了三个头，又裂了三块砖。执事在旁默默记下：修缮费。', fx: { disc: { new: 'strong' } } } },
    { t: '收机灵鬼',
      ok: { text: '你点了那个机灵的。孩子立刻改口叫师父，又甜又响，顺口把你院里的灵草报了个数——少报了两株。', fx: { disc: { new: 'clever' } } } },
    { t: '收闷葫芦',
      ok: { text: '你点了那个安静的。孩子走到跟前，第一句话是：“师父的剑，能借我摸一下吗？”你解下剑递了过去。', fx: { disc: { new: 'quiet' } } } },
    { t: '都不收', dao: 'w',
      ok: { text: '你让执事把三个孩子领回去，各塞一把糖。走出很远，那个安静的还回头看了一眼你的剑。', fx: { xp: 1 } } }
  ]
},
{
  id: 'sect_succession', where: 'story', trigger: 'sect:heir', sect: true, title: '三处灯火',
  text: '圣子之争前夜，三位长老各派人来请：一位在山顶看云，一位在后山干活，一位在灯下翻册子。条件都摆在明处——站过来，往后有人替你说话。你只能去一处，或者哪儿也不去。',
  choices: [
    { t: '去山顶',
      ok: { text: '山顶风大。掌门只问了一句“想不想要”，你说想。他解下自己的玉佩，系在了你腰上。', fx: { favor: { a: 30, b: -10, c: -10 } } } },
    { t: '去后山',
      ok: { text: '那位长老挽着袖子干活，头也不抬：“搭把手。”你们一直干到月上中天，他才开口：“明天我替你说话。”', fx: { favor: { a: -10, b: 30, c: -10 } } } },
    { t: '去灯下',
      ok: { text: '那位长老翻到写着你名字的一页，在页角折了一道：“明日，照这页办。”灯花爆了一声，像盖了个印。', fx: { favor: { a: -10, b: -10, c: 30 } } } },
    { t: '哪也不去', dao: 'w',
      ok: { text: '你在自己院里练了一夜剑。天亮时三处的灯都灭了。往后的路走得慢些，但不欠谁。', fx: { flag: 'heir_none', xp: 3 } } }
  ]
},
{
  id: 'sect_lord_vote', where: 'story', trigger: 'sect:lord', sect: true, title: '继任',
  text: '老宗主要闭死关了。议事殿里摆着三只签筒，三位长老各握一支签，谁也没先放。老宗主看着你：“若差一支，宝库里那件镇宗之宝，你肯还回来，老夫替你补上这一票。”',
  choices: [
    { t: '听凭长老', dao: 'w',
      ok: { text: '你在殿外站了一炷香。签落进筒里的声音很轻，像落雪。结果如何，都是你这些年一步步攒下的。', fx: { flag: 'lord_vote' } } },
    { t: '还回镇宗宝', dao: 'r',
      ok: { text: '你把那件宝物捧回宝库，擦了三遍才放下。老宗主笑了：“舍得，才坐得住这把椅子。”', fx: { flag: ['lord_vote', 'lord_gift'], favor: { a: 5, b: 5, c: 5 } } } },
    { t: '“不服的上台”', duel: 1.2, dao: 'k',
      ok: { text: '你当众请战。站出来的三个人，没一个走完十招。签筒还没动，殿里已经没人说话了。', fx: { flag: ['lord_vote', 'lord_duel'], favor: { a: 5, b: -5, c: -5 } } },
      fail: { text: '你连胜两场，第三场被一位老长老逼平。他收剑只说：“刚猛有余。”这一票，他还是投了你。', fx: { flag: 'lord_vote', inj: 2, favor: { b: 3 } } } }
  ]
},
{
  id: 'sect_traitor', where: 'home', visit: true, sect: true, srankMin: 6, once: true, title: '火漆',
  text: '执法弟子呈上一叠截下的飞信，火漆是天剑宗的，笔迹你认得——宗里一位白了头的长老，当年还替你说过话。信里画着护山大阵的三处阵眼。此刻他就在殿外候着，等你议事。',
  choices: [
    { t: '当众拆信', dao: 'w',
      ok: { text: '你在议事殿当众拆信。他没辩解，自己摘下了长老令。满殿肃然，几位长老看你的眼神变了，敬里带着怕。', fx: { favor: { b: -8, c: 6 }, contrib: 3 } } },
    { t: '约他看云', dao: 'k',
      ok: { text: '你约他去后山看云，回来的只有你一个。宗里只知道他云游去了，只有你记得他最后那句“对不住”。', fx: { karma: 'traitor', contrib: 1 } } },
    { t: '将计就计', p: 0.6,
      ok: { text: '你什么也没说，只让人把信里的阵眼换成假的。三个月后天剑宗夜袭，一头撞进了真阵。', fx: { flag: 'war_feint', contrib: 3 } },
      fail: { text: '假信递到第三封，他察觉了，连夜叛逃。阵眼只得重布，好在他走前在案上留了一句真话。', fx: { contrib: 1, xp: 3 } } }
  ]
},

/* ============================================================
 * 二、宗门 · 太虚剑宗（6）：凌虚子 剑即一切 / 铁冶真人 器为剑骨 / 柳含烟 规矩大于天
 * ============================================================ */
{
  id: 'jian_lingxu_1', where: 'home', visit: true, sect: true, favorMin: ['lingxu', 20], once: true, title: '输掉的剑',
  text: '凌虚子领你进剑阁，指着墙上一处空剑架：“我二十岁那年，在剑冢输掉一把剑。赢我的不是人，是一块碑。”他没说那剑叫什么，“去拿回来。拿不回来，替我看一眼也行。”',
  choices: [
    { t: '去剑冢取剑', duel: 1.1, dao: 'w',
      ok: { text: '剑插在碑缝里，满身是那年留下的缺口。你拔出它，碑上簌簌落灰。他接剑时手很稳，眼眶不稳。', fx: { favor: { lingxu: 15 }, xp: 4 } },
      fail: { text: '碑中剑意把你推出三丈，你只带回一截剑穗。他把剑穗挂上空架：“我当年连这个都没拿回来。”', fx: { favor: { lingxu: 12 }, inj: 2 } } },
    { t: '拓碑回来', p: 0.6,
      ok: { text: '你没拔剑，把碑上那道剑痕拓了回来，顺手挖了一袋陨铁。他盯着拓本看了半晌：“原来我输在这儿。”', fx: { favor: { lingxu: 5, tieye: 3 }, ore: 8 } },
      fail: { text: '拓到一半，碑中剑意惊醒，拓纸碎成雪片，你只抢回半袋陨铁。他听完笑了：“它脾气还那么大。”', fx: { favor: { lingxu: 3 }, ore: 4 } } },
    { t: '输了就留着', dao: 'k',
      ok: { text: '凌虚子沉默很久：“你说得对，也不对。”他挥手让你走。那天剑阁的灯，亮到了天明。', fx: { favor: { lingxu: -5 }, xp: 2 } } }
  ]
},
{
  id: 'jian_lingxu_2', where: 'home', visit: true, sect: true, favorMin: ['lingxu', 60], srankMin: 2, once: true, title: '第九层',
  text: '凌虚子要破格让你进剑阁第九层——那是长老才进得去的地方。柳含烟当着全殿的面把门规拍在案上：“第九层的规矩，是掌门的师父定的。”两人同时看向你。',
  choices: [
    { t: '我进第九层', p: 0.75, dao: 'k',
      ok: { text: '你踏进第九层时，身后传来门规合上的声音。往后柳含烟见你只点头；凌虚子把自己的剑谱借给了你。', fx: { favor: { lingxu: 20, liu: -15 }, mastery: 10 } },
      fail: { text: '你刚走到第八层，柳含烟已调来执法弟子守住楼梯。凌虚子拍拍你的肩：“下回。”她的眼神，你记下了。', fx: { favor: { lingxu: 10, liu: -15 } } } },
    { t: '先过考核', p: 0.5, dao: 'w',
      ok: { text: '你提议先过执法堂三道考核，再上第九层。凌虚子哼了一声，柳含烟没反对——都有了台阶下。', fx: { favor: { lingxu: 8, liu: 8 }, mastery: 5 } },
      fail: { text: '两人异口同声：“你是哪边的？”这事不了了之，你在殿上站了一个时辰，腿都站麻了。', fx: { favor: { lingxu: -3, liu: -3 }, xp: 2 } } },
    { t: '弟子不敢议',
      ok: { text: '你说弟子不敢议。两位长老同时皱眉，又同时松开——谁也没输。第九层的门，改日再说。', fx: { xp: 3 } } }
  ]
},
{
  id: 'jian_tieye_1', where: 'home', visit: true, sect: true, favorMin: ['tieye', 20], once: true, title: '一块陨铁',
  text: '器堂的炉子烧了七天七夜。铁冶真人光着膀子出来，手上燎泡一个叠一个：“缺一块陨铁，天外星墟才有，拍卖会上偶尔见。”他把一张歪歪扭扭的单子拍在你胸口，“替我弄来。”',
  choices: [
    { t: '去拍卖会买', cost: { stones: 10 }, dao: 'w',
      ok: { text: '你在拍卖会上咬牙跟到最后一口。他一句谢没说，抡锤砸了一整夜，天亮时顺手把你的剑淬了一遍。', fx: { favor: { tieye: 15 }, buff: { atk: 1.3, ticks: 8 } } } },
    { t: '拿灵矿熬', cost: { ore: 12 },
      ok: { text: '你拉来一车灵矿：“陨铁没有，熬一块行不行？”他骂你外行，熬了三天真熬出来了，余料打了把短刀给你。', fx: { favor: { tieye: 5 }, item: 'w' } } },
    { t: '弟子手头紧',
      ok: { text: '他看了你一眼，把单子收回去：“行。”那天器堂的锤声格外响，一下一下，像在骂人。', fx: { favor: { tieye: -5 } } } }
  ]
},
{
  id: 'jian_tieye_2', where: 'home', visit: true, sect: true, favorMin: ['tieye', 60], srankMin: 2, once: true, title: '一笔钱',
  text: '宗门今年只批得出一笔大钱。凌虚子要修剑阁：“剑修没有剑阁，像人没了脊梁。”铁冶真人要买矿：“没有矿，剑阁里挂的全是烧火棍。”账房把算盘推到你面前：最后一笔，你来落。',
  choices: [
    { t: '买矿', p: 0.75,
      ok: { text: '矿进了器堂，炉火一年没熄。剑阁漏雨的那个角，是凌虚子自己搬梯子补的，补完没跟你说一句话。', fx: { favor: { tieye: 20, lingxu: -15 }, ore: 10 } },
      fail: { text: '你落了笔，掌门却驳了回来。矿没买成，铁冶真人拍拍你的肩：“心意领了。”凌虚子那边，记下了。', fx: { favor: { tieye: 10, lingxu: -15 } } } },
    { t: '一半一半', p: 0.5, dao: 'w',
      ok: { text: '你把剑阁的缺口一一量过，竟省出三成，余下的买矿。两位长老各拿着半本账，都嫌少，都签了字。', fx: { favor: { tieye: 8, lingxu: 8 } } },
      fail: { text: '一半修不好剑阁，一半也买不够矿。两位轮流来找你理论，你在中间听了整整一个下午。', fx: { favor: { tieye: -3, lingxu: -3 }, xp: 2 } } },
    { t: '我只管算账',
      ok: { text: '你把算盘推了回去。最后掌门落笔修了剑阁。铁冶真人骂了三天，第四天来借你的剑去试新炉。', fx: { xp: 2 } } }
  ]
},
{
  id: 'jian_liu_1', where: 'home', visit: true, sect: true, favorMin: ['liu', 20], once: true, title: '指认',
  text: '执法堂的柳长老把你叫到演武场。场中跪着一个外门弟子——你认得，入宗第一天只有他给你留过一碗饭。柳含烟的声音没有起伏：“他私带灵谷下山。你当日在场，指认。”',
  choices: [
    { t: '如实指认', dao: 'w',
      ok: { text: '你说了实话。他被罚去后山挑水三年，路过你时笑了笑：“那碗饭不亏。”柳长老点了点头，这是你头一回见她点头。', fx: { favor: { liu: 15 }, contrib: 1 } } },
    { t: '“是我托他带的”', p: 0.5, dao: 'r',
      ok: { text: '柳含烟看了你三息：“下不为例。”她转身时袖中掉出一张条子：山下那户人家的地址。原来她早就知道。', fx: { favor: { liu: 5 }, stones: -3, flag: 'liu_soft' } },
      fail: { text: '“当我是瞎的？”你被罚抄宗规三百遍。他也没能免罚，但那天晚上，你门口多了一碗饭。', fx: { favor: { liu: -5 }, contrib: -1, xp: 2 } } },
    { t: '“何必问我”', dao: 'k',
      ok: { text: '演武场静得能听见剑穗晃。柳含烟说：“因为我想知道你是什么人。”她在册子上记了一笔，没给你看。', fx: { favor: { liu: -5, lingxu: 5 } } } }
  ]
},
{
  id: 'jian_liu_2', where: 'home', visit: true, sect: true, favorMin: ['liu', 60], srankMin: 2, once: true, title: '私卖',
  text: '柳含烟把一柄刻着器堂暗记的剑掷在案上——黑市里查到的。“器堂私卖法器，一年三百件。”铁冶真人不躲不辩：“卖的钱全买了矿。宗门不给，我自己挣。”两人都在等你开口。',
  choices: [
    { t: '按门规办', p: 0.75, dao: 'w',
      ok: { text: '器堂封炉三月，铁冶真人被罚抄门规。他抄得很认真，每一页都错同一个字——“矿”。', fx: { favor: { liu: 20, tieye: -15 }, contrib: 2 } },
      fail: { text: '你说按门规办，掌门却出面保下了器堂。柳含烟一言不发收了剑；铁冶真人看你，像看一块废铁。', fx: { favor: { liu: 10, tieye: -15 } } } },
    { t: '账目公开', p: 0.5,
      ok: { text: '你提议器堂照卖，账交执法堂过目，三成归公。柳含烟想了想点头，铁冶真人骂了句“抠门”，也点了头。', fx: { favor: { liu: 8, tieye: 8 }, stones: 4 } },
      fail: { text: '柳含烟说你替人开脱，铁冶真人说你多管闲事。那柄剑最后挂在了你墙上，谁也不肯收回去。', fx: { favor: { liu: -3, tieye: -3 }, item: 'w' } } },
    { t: '弟子没看见',
      ok: { text: '“弟子什么也没看见。”柳含烟看了你很久，收起了剑。执法堂的册子上，你那一页多了一行小字。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 三、宗门 · 丹霞谷（6）：丹云婆婆 丹道济世 / 药尘子 草木有灵 / 赤松客 丹药就是买卖
 * ============================================================ */
{
  id: 'dan_yun_1', where: 'home', visit: true, sect: true, favorMin: ['yun', 20], once: true, title: '试丹',
  text: '丹云婆婆端出一只白瓷碗，碗里一颗丹还冒着热气，颜色说不清是青是紫：“新方子，治山下的寒疫。老身也没把握，总得有人先吃。”她看着你，不像在求人，像在等人。',
  choices: [
    { t: '一口吞了', p: 0.6, dao: 'r',
      ok: { text: '丹入腹，一股暖意从脚底烧上头顶。婆婆在册子上写下“可用”二字，笔尖有点抖：“山下有救了。”', fx: { favor: { yun: 15 }, xp: 6, life: 2 } },
      fail: { text: '你浑身发冷，躺了三天，嘴唇紫得像那颗丹。婆婆守了三天，把方子改了三遍：“第四遍，老身自己吃。”', fx: { favor: { yun: 15 }, toxin: 30, inj: 2 } } },
    { t: '先吃半颗', p: 0.7, dao: 'w',
      ok: { text: '你只吞了半颗，另半颗熬汤分作十份，三天后九份见效。婆婆高兴，把药园这季的好灵草分了你一捆。', fx: { favor: { yun: 5 }, herbs: 6 } },
      fail: { text: '半颗不够劲，病人吃了也不见好。婆婆没怪你，只叹了口气：“药不能减，人也不能。”', fx: { favor: { yun: 2 }, xp: 2 } } },
    { t: '晚辈不敢',
      ok: { text: '婆婆没说什么，把碗端回去，自己吞了。第二天她照常出诊，只是一只手始终揣在袖子里。', fx: { favor: { yun: -5 } } } }
  ]
},
{
  id: 'dan_yun_2', where: 'home', visit: true, sect: true, favorMin: ['yun', 60], srankMin: 2, once: true, title: '送与卖',
  text: '山下闹了饥荒，丹云婆婆要开仓，把丹房三年的存货全送下山。赤松客堵在丹房门口，算盘打得噼啪响：“送一回，坊市的价就塌一回。价塌了，明年谁还来炼？”',
  choices: [
    { t: '全送下山', p: 0.75, dao: 'r',
      ok: { text: '丹药一车车送下山，山下人管婆婆叫活菩萨。赤松客在账本上画了个大大的叉，往后见你都绕着走。', fx: { favor: { yun: 20, chisong: -15 }, contrib: 2 } },
      fail: { text: '车刚出谷门，就被赤松客截下一半。送下去的不够分，婆婆红着眼回来，看了你一眼，没说话。', fx: { favor: { yun: 10, chisong: -15 } } } },
    { t: '一枚丹一斗米', p: 0.5,
      ok: { text: '你定了价：一枚丹，一斗米。米拿去赈灾，丹价也没塌。婆婆说这是生意，赤松客说这是善事，都没说错。', fx: { favor: { yun: 8, chisong: 8 }, stones: 3 } },
      fail: { text: '价刚定下，倒卖的黄牛先到了。婆婆怪你，赤松客笑你，山下的人还是没吃上，你自掏腰包补了一车。', fx: { favor: { yun: -3, chisong: -3 }, stones: -6 } } },
    { t: '谷里的事',
      ok: { text: '你退了出来。最后丹房送一半、卖一半，两位长老谁也不满意。山下来了封谢信，落款写的是丹霞谷。', fx: { xp: 2 } } }
  ]
},
{
  id: 'dan_yaochen_1', where: 'home', visit: true, sect: true, favorMin: ['yaochen', 20], once: true, title: '药园闹虫',
  text: '药尘子蹲在药园地头，一片一片翻叶子，叶背爬满米粒大的金甲虫。“不能用药，用了草就苦了。”他抬头看你，“听说你养着灵宠？借我十二天，它吃虫，我管饭。”',
  choices: [
    { t: '借它去', p: 0.75, dao: 'r',
      ok: { text: '你的灵宠在药园吃了十二天虫，回来胖了一圈，浑身药香。药尘子说，它是这些年最好的帮工。', fx: { favor: { yaochen: 15 }, petHeart: 1 } },
      fail: { text: '它吃虫吃到一半，连灵苗也啃了两垄。药尘子心疼得直抽气，还是把它喂饱了才送回来。', fx: { favor: { yaochen: 10 }, feed: 4 } } },
    { t: '拿兽粮引虫', cost: { feed: 6 },
      ok: { text: '你在田埂上撒了一圈兽粮，金甲虫全爬了出来，捉了满满三罐。药尘子说晒干是好药引，分了你一罐。', fx: { favor: { yaochen: 5 }, yin: { wood: 2 } } } },
    { t: '弟子没空',
      ok: { text: '药尘子“哦”了一声，又低头翻叶子。你走出很远回头，他还蹲在那儿，一片一片地翻。', fx: { favor: { yaochen: -5 } } } }
  ]
},
{
  id: 'dan_yaochen_2', where: 'home', visit: true, sect: true, favorMin: ['yaochen', 60], srankMin: 2, once: true, title: '千年药王',
  text: '药园最深处那株千年药王开花了。丹云婆婆要采：“一株药王，能救一城人。”药尘子张开双臂挡在花前，胡子气得直抖：“它活了一千年，就为了被人吃？”',
  choices: [
    { t: '留着它', p: 0.75,
      ok: { text: '你站到药尘子身边，婆婆拂袖而去。那夜药王开得特别大，第二天一早，你门口多了一捧它落下的花瓣。', fx: { favor: { yaochen: 20, yun: -15 }, herbs: 5 } },
      fail: { text: '你站到药尘子身边，可谷主令一下，花还是被采走一朵。药尘子把剩下的花苞捧在手心，一夜没睡。', fx: { favor: { yaochen: 10, yun: -15 } } } },
    { t: '只采三瓣', p: 0.5,
      ok: { text: '你提议只采三瓣，根留着。药王竟自己抖落了三瓣。两位长老对着那三瓣花，谁也没先开口，都笑了。', fx: { favor: { yaochen: 8, yun: 8 }, yin: { wood: 1 } } },
      fail: { text: '你一伸手，药王把花合上了，再没开过。两位长老都说是你吓着了它——这是他们多年来头一回意见一致。', fx: { favor: { yaochen: -3, yun: -3 }, xp: 3 } } },
    { t: '弟子不懂药',
      ok: { text: '你说你不懂。两位长老吵到半夜，药王还在，花被婆婆采走一朵。谁也没赢，谁也没输。', fx: { xp: 2 } } }
  ]
},
{
  id: 'dan_chisong_1', where: 'home', visit: true, sect: true, favorMin: ['chisong', 20], once: true, title: '第三排',
  text: '赤松客摇着扇子凑过来：“明日拍卖会上有一炉丹，是我送拍的。你坐第三排，我咳一声，你举一次牌。”他压低声音，“放心，真拍下来算我的。”扇面上写着：童叟无欺。',
  choices: [
    { t: '照他说的举', p: 0.75,
      ok: { text: '你举了三次牌，价翻了一倍。最后一口你没跟，买家是天剑宗的人，咬着牙付了钱。赤松客的扇子摇得飞快。', fx: { favor: { chisong: 15 }, stones: 3 } },
      fail: { text: '第二次举牌时，邻座认出了你：“丹霞谷的托？”满场哄笑。那炉丹没卖上价，赤松客倒也没怪你。', fx: { favor: { chisong: 10 }, xp: 1 } } },
    { t: '自己也下场', p: 0.55, dao: 'k',
      ok: { text: '抬着抬着，你真拍下来了——用自己的钱。转手卖进坊市，多赚两成。赤松客看你的眼神，像看同行。', fx: { favor: { chisong: 5 }, stones: 8 } },
      fail: { text: '你一举牌，全场都不跟了。丹砸在你手里，赤松客笑出了眼泪，按原价收了回去，还请你喝了顿酒。', fx: { favor: { chisong: 5 }, xp: 2 } } },
    { t: '我不做托', dao: 'w',
      ok: { text: '赤松客也不恼：“也是，你这张脸太正，坐第三排像是来抓人的。”他换了个人，那炉丹照样卖了高价。', fx: { favor: { chisong: -5 }, xp: 1 } } }
  ]
},
{
  id: 'dan_chisong_2', where: 'home', visit: true, sect: true, favorMin: ['chisong', 60], srankMin: 2, once: true, title: '东坡',
  text: '赤松客摊开一张图：药园东坡，正对新修的商道。“盖一排铺面，一年的租子够谷里吃十年。”药尘子在图上那片坡按了个泥手印：“那里有三百年的老参。”',
  choices: [
    { t: '盖铺面', p: 0.75, dao: 'k',
      ok: { text: '铺面开张那天，坊市来了半城人。老参被移到药园西头，药尘子守着它坐了一夜，没来剪彩。', fx: { favor: { chisong: 20, yaochen: -15 }, stones: 8 } },
      fail: { text: '你点了头，婆婆却在图上画了个叉。铺面没盖成，赤松客叹气：“你有眼光，没运气。”药尘子那边，记下了。', fx: { favor: { chisong: 10, yaochen: -15 } } } },
    { t: '挪到坡下', p: 0.5,
      ok: { text: '你把铺面挪到坡下河滩，坡上老参一棵没动，反倒成了招牌：“三百年老参园旁”。两位长老都满意。', fx: { favor: { chisong: 8, yaochen: 8 }, stones: 4 } },
      fail: { text: '河滩一涨水，铺面淹了三间。赤松客算你一笔账，药尘子说这是河在骂人，你自己掏钱修了堤。', fx: { favor: { chisong: -3, yaochen: -3 }, stones: -5 } } },
    { t: '弟子不懂生意',
      ok: { text: '你推说不懂。这事拖了三年，坡上的老参又长了三年，赤松客的图纸卷了边，还压在他案头。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 四、宗门 · 玄天道宗（6）：玄微子 道法自然 / 守拙道人 厚积薄发 / 清虚真人 顺天应时
 * ============================================================ */
{
  id: 'dao_xuanwei_1', where: 'home', visit: true, sect: true, favorMin: ['xuanwei', 20], once: true, title: '三问',
  text: '玄微子在松下煮茶，问了你三句话。头一句：“山为什么不走？”第二句：“水为什么不停？”你都答了，他都笑。第三句他想了很久才问：“你修道，想做山，还是做水？”',
  choices: [
    { t: '“做山”', dao: 'w',
      ok: { text: '他点点头，把茶推给你：“山不走，所以不怕。”那盏茶你喝了一个时辰，喝完觉得肩上稳了。', fx: { favor: { xuanwei: 10 }, mastery: 10 } } },
    { t: '“做水”', dao: 'r',
      ok: { text: '他看了你很久：“水往低处走，是为了让高处的东西活。”他把整壶茶都给了你，茶是温的。', fx: { favor: { xuanwei: 10 }, xp: 5, life: 2 } } },
    { t: '“做剑”', dao: 'k',
      ok: { text: '玄微子大笑，把一杯茶泼进溪里：“好，山水一起劈开。”他递给你一枚松针，针尖冷得像霜。', fx: { favor: { xuanwei: 10 }, power: 0.01 } } }
  ]
},
{
  id: 'dao_xuanwei_2', where: 'home', visit: true, sect: true, favorMin: ['xuanwei', 60], srankMin: 2, once: true, title: '出山',
  text: '天剑宗又吞了两个小宗门。清虚真人观了三夜星，说它气数正盛，此时出手是逆天：“等它自己衰。”玄微子摇头：“等它衰了，被吞的人也死完了。见不平而拔剑，也是自然。”',
  choices: [
    { t: '随掌教出山', p: 0.75, dao: 'r',
      ok: { text: '你随玄微子下山，救回两个小宗门的孩子。清虚真人把那夜的星图烧了，说天机被你们搅乱了。', fx: { favor: { xuanwei: 20, qingxu: -15 }, xp: 4 } },
      fail: { text: '你们去晚了一步，只救下一个孩子。清虚真人没说“我早说过”，只是把星盘转向了墙。', fx: { favor: { xuanwei: 10, qingxu: -15 }, xp: 2 } } },
    { t: '择吉时再去', p: 0.5,
      ok: { text: '你请清虚真人择一个吉时，请掌教届时出山。三日后天剑宗内讧，你们去得正是时候，一个人也没折。', fx: { favor: { xuanwei: 8, qingxu: 8 }, xp: 4 } },
      fail: { text: '吉时算出来是三年后。掌教等不了，独自下了山；真人怪你多事，掌教怪你拖延。', fx: { favor: { xuanwei: -3, qingxu: -3 }, xp: 2 } } },
    { t: '弟子听宗门的',
      ok: { text: '你说听宗门定夺。宗门议了九天，第十天天剑宗自己撤了兵。谁也说不清，是不是那九天吓的。', fx: { xp: 3 } } }
  ]
},
{
  id: 'dao_shouzhuo_1', where: 'home', visit: true, sect: true, favorMin: ['shouzhuo', 20], once: true, title: '第四十七页',
  text: '守拙道人拿着一本旧书来找你，书脊里还夹着你当年的借书签。“少了第四十七页。”他说得很慢，“这本书三百年只借出去过一次。”他没说是你拿的，也没说不是。',
  choices: [
    { t: '帮他找', p: 0.7, dao: 'w',
      ok: { text: '你翻遍洞府，最后在丹炉底下找到了它——当年被你拿去垫了炉脚。守拙道人用米汤把它粘回去，粘了一下午。', fx: { favor: { shouzhuo: 15 }, mastery: 6 } },
      fail: { text: '你翻遍洞府也没找到。三天后他自己来了：“在我袖子里。”顿了顿，“谢谢你找了三天。”', fx: { favor: { shouzhuo: 12 }, xp: 2 } } },
    { t: '凭记忆默写', p: 0.55,
      ok: { text: '你闭眼默了一夜，第四十七页一字不差。他对了三遍，把你写的那页夹了进去：“比原来的清楚。”', fx: { favor: { shouzhuo: 5 }, mastery: 12 } },
      fail: { text: '默到一半你卡住了，后半页是编的。守拙道人看完，在你编的那段旁边批了四个字：“这样也通。”', fx: { favor: { shouzhuo: 5 }, mastery: 5 } } },
    { t: '弟子记不清了',
      ok: { text: '他“嗯”了一声，抱着书回去了。往后半年，藏经阁的借书签上，你的名字后面都多画了一个圈。', fx: { favor: { shouzhuo: -5 } } } }
  ]
},
{
  id: 'dao_shouzhuo_2', where: 'home', visit: true, sect: true, favorMin: ['shouzhuo', 60], srankMin: 2, once: true, title: '铁匣',
  text: '藏经阁最底层有一只铁匣，装着本门三百年来收缴的禁术。守拙道人要封死它：“学会容易，学好难。”玄微子要打开：“天下的道都摆着，凭什么这一本不能看？”钥匙在你手里。',
  choices: [
    { t: '浇铁封死', p: 0.75, dao: 'w',
      ok: { text: '你亲手浇了铁水。守拙道人在匣上贴了张字条：“等你们配得上。”玄微子没说话，只是许久没再找你下棋。', fx: { favor: { shouzhuo: 20, xuanwei: -15 }, mastery: 6 } },
      fail: { text: '铁水刚浇下去，掌教一掌把匣子拍开一道缝。缝封上了，掌教的脸色也封上了。守拙道人叹了口气。', fx: { favor: { shouzhuo: 10, xuanwei: -15 } } } },
    { t: '师徒同看', p: 0.5,
      ok: { text: '你定了规矩：长老带弟子同看，看完对答。守拙道人去记，玄微子去讲，两人在铁匣前坐了一个月。', fx: { favor: { shouzhuo: 8, xuanwei: 8 }, mastery: 6 } },
      fail: { text: '规矩刚定，就有弟子半夜撬了锁。人没事，书丢了一页。两位长老都看着你，都没骂你，这更难受。', fx: { favor: { shouzhuo: -3, xuanwei: -3 }, xp: 2 } } },
    { t: '把钥匙放下',
      ok: { text: '你把钥匙搁在两人中间的桌上，退了出去。那只铁匣至今没开，钥匙也至今没人收，就在桌上落灰。', fx: { xp: 2 } } }
  ]
},
{
  id: 'dao_qingxu_1', where: 'home', visit: true, sect: true, favorMin: ['qingxu', 20], once: true, title: '命宫有星',
  text: '清虚真人半夜敲开你的门，手里星盘还在转：“你命宫里有颗星在冲，三个月内有一劫。避法我备了三个，最稳的是闭门不出。”他顿了顿，“当然，你也可以不信。”',
  choices: [
    { t: '闭门三月', cost: { stones: 4 }, dao: 'w',
      ok: { text: '你闭关三月，一步没出门。出关那天听说，你常走的那条山道塌了。清虚真人在星盘上，轻轻抹去了一个点。', fx: { favor: { qingxu: 15 }, xp: 6 } } },
    { t: '往劫里走', p: 0.5, dao: 'k',
      ok: { text: '你偏走那条山道。山崩时一剑劈开落石，石心里滚出一块星铁。真人看了很久：“星也会让路。”', fx: { favor: { qingxu: 5 }, ore: 8 } },
      fail: { text: '山崩了，你被埋了半个时辰。爬出来时真人正坐在石头上等你，递来一壶水：“劫过了。”', fx: { favor: { qingxu: 5 }, inj: 3 } } },
    { t: '“多谢，不必”',
      ok: { text: '真人收起星盘：“不信也好，信了反倒怕。”三个月后你在山道上摔了一跤，磕破膝盖，想起他，笑了。', fx: { favor: { qingxu: -5 }, xp: 2 } } }
  ]
},
{
  id: 'dao_qingxu_2', where: 'home', visit: true, sect: true, favorMin: ['qingxu', 60], srankMin: 2, once: true, title: '说与不说',
  text: '清虚真人算出外门一个小弟子明年有死劫，要去告诉他。守拙道人拦住：“说了，他这一年就活不成人了。”清虚真人说：“不说，他连一年都活不成。”那孩子正在院里扫地。',
  choices: [
    { t: '告诉他', p: 0.75,
      ok: { text: '那孩子听完，扫帚没停。第二天他去求了三位长老，学会一门遁法。到了那天，他遁得很快。', fx: { favor: { qingxu: 20, shouzhuo: -15 }, contrib: 1 } },
      fail: { text: '那孩子听完，扫帚掉了。这一年他再没睡过整觉，劫倒是躲过了。守拙道人看你的眼神，很淡。', fx: { favor: { qingxu: 10, shouzhuo: -15 } } } },
    { t: '只说别去北山', p: 0.5,
      ok: { text: '你只告诉他：“明年这时候，别去北山。”没说为什么。他照做了。守拙道人点头，清虚真人也点头。', fx: { favor: { qingxu: 8, shouzhuo: 8 }, xp: 3 } },
      fail: { text: '你说得太含糊，他以为北山有宝贝，偷偷去了。你追过去把他拎了回来，那一劫落在了你身上。', fx: { favor: { qingxu: 3, shouzhuo: 3 }, inj: 3 } } },
    { t: '让他扫完地', dao: 'w',
      ok: { text: '你没掺和。那孩子扫完了地，又扫了一年。到了那天下了场大雨，他躲进藏经阁避雨，看了一夜书。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 五、宗门 · 血煞魔宗（6）：血河老祖 强者为尊 / 鬼医薛三 毒亦是药 / 幽姬 人心可用
 * ============================================================ */
{
  id: 'mo_xuehe_1', where: 'home', visit: true, sect: true, favorMin: ['xuehe', 20], once: true, title: '血令',
  text: '血河老祖把一枚血令丢到你脚边：“城南有个叛徒，三年前卷了宗里的丹方跑了。提头来见。”你捡起血令，背面画着人像——是从前总给{ye}留一壶酒的老酒保。',
  choices: [
    { t: '提头来见', duel: 1.0, dao: 'k',
      ok: { text: '老酒保没跑，给你倒了最后一壶。你回宗复命，血河老祖大笑。那壶酒你没喝，埋在了城南。', fx: { favor: { xuehe: 15 }, karma: 'jiubao' } },
      fail: { text: '老酒保年轻时也是一把好手，你被一只酒坛砸出了门。回宗领罚，血河老祖却赏了你：“还知道疼，有救。”', fx: { favor: { xuehe: 12 }, inj: 2 } } },
    { t: '只取回丹方', p: 0.6, dao: 'r',
      ok: { text: '你只要回丹方，让老酒保连夜出城。血河老祖翻着丹方冷笑：“心软的人，丹方倒拿得回来。”', fx: { favor: { xuehe: 5 }, recipe: 'baoqi' } },
      fail: { text: '人放走了，丹方却不在身上。你被罚在血池里泡了三天。后来有人托送来一坛酒，没署名。', fx: { inj: 2, xp: 2 } } },
    { t: '这令我不接',
      ok: { text: '血河老祖眯起眼，没再说话。第二天换了人去，回来时袖口带血，看你的眼神很怪。', fx: { favor: { xuehe: -5 } } } }
  ]
},
{
  id: 'mo_xuehe_2', where: 'home', visit: true, sect: true, favorMin: ['xuehe', 60], srankMin: 2, once: true, title: '分坛',
  text: '宗门要拿下正道的一座分坛。血河老祖一掌拍碎了沙盘：“打进去，杀干净。”幽姬拈起沙盘上一面小旗：“里面有三个人是我的。打进去，我的人也死了。”两人都看着你。',
  choices: [
    { t: '打进去', duel: 1.1, dao: 'k',
      ok: { text: '你领头冲进分坛，一夜就拔了旗。幽姬的人死了一个，她没说什么，只把那面小旗收进了袖子。', fx: { favor: { xuehe: 20, youji: -15 }, stones: 5 } },
      fail: { text: '分坛比沙盘上硬得多，你带伤撤回。血河老祖骂你没用；幽姬清点名单时，在一个名字上停了很久。', fx: { favor: { xuehe: 8, youji: -15 }, inj: 2 } } },
    { t: '里应外合', p: 0.5,
      ok: { text: '幽姬的人在里面开门，老祖的人在外面喊杀。分坛半个时辰就破了，谁的人都没折。', fx: { favor: { xuehe: 8, youji: 8 }, stones: 5 } },
      fail: { text: '暗号传错，门开早了一刻。仗打赢了，两边的人却在门口打了起来，你在中间拉了一夜架。', fx: { favor: { xuehe: -3, youji: -3 }, inj: 1 } } },
    { t: '怎么打都行',
      ok: { text: '你说怎么打都行，你去就是。最后老祖赢了，打得很难看。幽姬战后清点名单，在你名字旁停了一下。', fx: { xp: 3 } } }
  ]
},
{
  id: 'mo_xuesan_1', where: 'home', visit: true, sect: true, favorMin: ['xuesan', 20], once: true, title: '一碗黑汤',
  text: '鬼医薛三的药房没有窗，一排陶罐里泡着说不清是什么的东西。他递来一碗黑汤，笑得很和气：“新方子。喝了，我给你一味魂引。不喝，我也不怪你——我去找别人。”',
  choices: [
    { t: '喝', p: 0.6, dao: 'k',
      ok: { text: '汤滑进喉咙，像吞了一条冰蛇。半个时辰后你出了一身黑汗，筋骨轻了三分。薛三在本子上画了个圈。', fx: { favor: { xuesan: 15 }, yin: { soul: 1 }, xp: 4 } },
      fail: { text: '你吐了三天，吐出来的东西把地砖蚀了个坑。薛三蹲在坑边看了半天，很高兴：“有用，有用。”', fx: { favor: { xuesan: 15 }, yin: { soul: 1 }, toxin: 30 } } },
    { t: '“鬼医先请”', p: 0.6, dao: 'w',
      ok: { text: '薛三愣了愣，大笑着喝了半碗，又给你配了一副解毒的方子：“你这人，能活得久。”', fx: { favor: { xuesan: 5 }, recipe: 'qingdu' } },
      fail: { text: '薛三笑眯眯喝了半碗，把碗推回来：“该你了。”你只好喝了剩下的半碗，苦得三天没说话。', fx: { favor: { xuesan: 5 }, yin: { soul: 1 }, toxin: 15 } } },
    { t: '你找别人吧',
      ok: { text: '薛三也不强求，掀帘喊了一声。进来一个面黄肌瘦的外门弟子，冲你笑了笑，接过了碗。', fx: { favor: { xuesan: -5 } } } }
  ]
},
{
  id: 'mo_xuesan_2', where: 'home', visit: true, sect: true, favorMin: ['xuesan', 60], srankMin: 2, once: true, title: '十二个人',
  text: '血牢里关着十二个正道俘虏。薛三要拿去炼药：“活人入药，药效最好。”血河老祖要放回去：“放回去的人比死人有用——他们会怕。”两人在牢门口吵，俘虏在里面听。',
  choices: [
    { t: '交给鬼医', p: 0.75, dao: 'k',
      ok: { text: '十二个人进了药房，出来十二瓶药。薛三分了你一瓶。你没喝也没扔，搁在了架子最高处。', fx: { favor: { xuesan: 20, xuehe: -15 }, karma: 'qiulao', pills: 1 } },
      fail: { text: '你点了头，血河老祖却抢先开了牢门。十二个人跑了，薛三看着空牢，慢慢摇着扇子：“欠我一回。”', fx: { favor: { xuesan: 10, xuehe: -15 } } } },
    { t: '喂毒再放', p: 0.5,
      ok: { text: '你让薛三给每人喂一颗慢毒再放回去：每月回来领解药，顺带捎消息。两位都说这主意毒——是夸你。', fx: { favor: { xuesan: 8, xuehe: 8 } } },
      fail: { text: '毒下重了，三个人没撑到正道山门。老祖骂你手软，薛三骂你手重，你一夜没睡着。', fx: { favor: { xuesan: -3, xuehe: -3 }, karma: 'qiulao' } } },
    { t: '我不掺和',
      ok: { text: '你转身走了。第二天血牢空了，没人告诉你他们去了哪儿，你也没问。夜里你梦见过一次牢门。', fx: { xp: 2 } } }
  ]
},
{
  id: 'mo_youji_1', where: 'home', visit: true, sect: true, favorMin: ['youji', 20], once: true, title: '一句假话',
  text: '幽姬替你斟了一杯酒，酒面映着她半张脸：“丹霞谷有位长老，每月初一在山下茶馆喝茶。你去坐他对面，说一句话——血煞魔宗要往西边去。”她笑了笑，“其实我们往东。”',
  choices: [
    { t: '照她说的去', p: 0.75,
      ok: { text: '茶馆里那位长老听完，放下茶碗，看了你很久，起身结账。三天后，正道的人马全去了西边。', fx: { favor: { youji: 15 }, stones: 4 } },
      fail: { text: '长老听完笑了：“回去告诉幽姬，换个生面孔。”正道没动。幽姬听完也笑，算你一半的功。', fx: { favor: { youji: 10 }, xp: 2 } } },
    { t: '再添句真话', p: 0.5, dao: 'r',
      ok: { text: '你说完假话，又低声补一句：“东边的村子，早些搬。”长老一愣，塞给你一只锦囊。幽姬知道了，只笑了笑。', fx: { favor: { youji: 5 }, stones: 8 } },
      fail: { text: '长老听出话里有话，当场把你扣下。幽姬花了一夜才把你捞出来：“想当好人，先跟我说一声。”', fx: { inj: 1, xp: 2 } } },
    { t: '我不说谎', dao: 'w',
      ok: { text: '幽姬把酒喝了：“那就说真话。”她换了个人去。后来你才知道，那人说的是真话——正道照样去了西边。', fx: { favor: { youji: -5 }, xp: 2 } } }
  ]
},
{
  id: 'mo_youji_2', where: 'home', visit: true, sect: true, favorMin: ['youji', 60], srankMin: 2, once: true, title: '字条',
  text: '圣火的下落漏了出去，正道三宗已在路上。幽姬把一张字条拍在薛三的药案上：“你的字。”薛三慢慢摇着扇子：“字是我的，话不是我说的。”你是最后一个见过那张字条的人。',
  choices: [
    { t: '“是鬼医”', p: 0.75,
      ok: { text: '你说看见薛三的药童送过信。薛三没辩解，关了药房三个月。那药童后来不见了，你没敢问去了哪儿。', fx: { favor: { youji: 20, xuesan: -15 } } },
      fail: { text: '你刚开口，药童就扑通跪下，认了是自己偷的字条。幽姬放过了薛三，薛三却记住了你。', fx: { favor: { youji: 10, xuesan: -15 } } } },
    { t: '泡字条', p: 0.5,
      ok: { text: '你把字条泡进薛三的药汤，墨迹褪了一层，底下是另一个人的笔迹。两人对视一眼，同时冷笑。', fx: { favor: { youji: 8, xuesan: 8 }, xp: 4 } },
      fail: { text: '字条泡烂了，什么也没查出。两人都认定你在包庇对方，那一个月，你的饭里总有点怪味。', fx: { favor: { youji: -3, xuesan: -3 }, toxin: 10 } } },
    { t: '没看清',
      ok: { text: '你说没看清。幽姬笑了，薛三也笑了，你后背出了一层汗。这事最后不了了之，像魔宗大多数事一样。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 六、宗门 · 徒弟（12）
 * ============================================================ */
{
  id: 'disc_first_day', where: 'story', trigger: 'disciple', sect: true, maxR: 7, speaker: 'elder', title: '第一个问题',
  text: '新收的徒弟磕完三个头，仰起脸，憋了半天问出第一个问题：“师父，您当年……真的是被赶出来的吗？”老祖在戒指里笑得直抖：“问得好，本座也想听你怎么答。”',
  choices: [
    { t: '“是。你要争气”', dao: 'w',
      ok: { text: '徒弟用力点头，当晚就在院子里扎了两个时辰的马步，把你养的灵兔吓得不敢出窝。', fx: { flag: 'disc_strict', xp: 2 } } },
    { t: '“是。不怕丢人”', dao: 'r',
      ok: { text: '徒弟愣了一下，笑出一口白牙。从那天起，他有什么不懂的都敢来问，包括一些你也不懂的。', fx: { flag: 'disc_warm', xp: 2 } } },
    { t: '“谁说的？名字”', dao: 'k',
      ok: { text: '徒弟报了七个名字。你一个一个记下。老祖叹气：“为师之道第一课，别带着徒弟一起记仇。”', fx: { flag: 'disc_wild', xp: 2 } } }
  ]
},
{
  id: 'disc_trouble', where: 'story', trigger: 'disc:trouble', sect: true, title: '破鼓',
  text: '天还没亮，执法堂的登闻鼓响了九下，第十下鼓面破了。徒弟攥着鼓槌站在堂前，一脸无辜：“他们说鼓一响，长老就出来。我想看看长老长什么样。”',
  choices: [
    { t: '“是我让敲的”', dao: 'r',
      ok: { text: '你把徒弟拉到身后，自己领了罚。徒弟看你挨训，眼圈红了，往后三个月，鼓槌碰都没再碰。', fx: { favor: { a: -3, c: -3 }, disc: { heart: 1 } } } },
    { t: '罚抄门规', dao: 'w',
      ok: { text: '徒弟抄了三百遍门规，抄到第两百遍时忽然安静下来，抄完自己去把鼓面补好了。', fx: { disc: { grow: 0.05 } } } },
    { t: '赔鼓赔罪', cost: { stones: 2 },
      ok: { text: '你领着徒弟去赔了一面新鼓。执事板着脸收下，临走敲了敲徒弟的脑袋：“下回想见长老，递帖子。”', fx: { disc: { heart: 1, grow: 0.02 } } } }
  ]
},
{
  id: 'disc_question', where: 'story', trigger: 'disc:question', sect: true, maxR: 7, title: '答不上来',
  text: '徒弟捧着书来问：“书上说灵气生于天地，那天地的灵气又是从哪儿来的？”你张了张嘴，没说出话。徒弟眼巴巴地等着，戒指里也安静得出奇。',
  choices: [
    { t: '“我也不知道”', dao: 'r',
      ok: { text: '“那我们一起想。”你们在院里坐到半夜，谁也没想出来，却都觉得通了一点。', fx: { mastery: 8, disc: { grow: 0.05 } } } },
    { t: '糊弄过去', p: 0.5, dao: 'k',
      ok: { text: '你说：“这得筑基以后才知道。”徒弟信了，从此练功格外卖力——为了早点知道。', fx: { disc: { grow: 0.05 } } },
      fail: { text: '徒弟眨眨眼：“可师父早就筑基了呀。”你咳了一声，罚他去扎马步。他扎着马步，还在想。', fx: { xp: 2 } } },
    { t: '让老祖答',
      ok: { text: '老祖清了清嗓子，从开天讲到辟地，讲了一个时辰。讲完问：“懂了吗？”徒弟摇头，你也摇头。', fx: { xp: 3, disc: { heart: 1 } } } }
  ]
},
{
  id: 'disc_steal', where: 'story', trigger: 'disc:steal', sect: true, title: '亲炼',
  text: '坊市里有人吆喝“{name}亲炼”的丹药，价钱是你自己卖的两倍。你循声找过去，摊主正是你的徒弟，账本记得一清二楚，连哪炉是你哪天炼的都写上了。',
  choices: [
    { t: '三七分账',
      ok: { text: '你把钱收了，分回他三成：“往后洞府的买卖，归你管。”徒弟眼睛一亮，当晚就把账本重抄了一遍。', fx: { stones: 6, disc: { job: 0.1 } } } },
    { t: '重罚', dao: 'w',
      ok: { text: '你罚他跪了一夜，钱全退给买主。他跪着跪着睡着了，第二天醒来把账本烧了，眼神比从前老实。', fx: { disc: { grow: 0.03, heart: -1 } } } },
    { t: '夸他', dao: 'k',
      ok: { text: '你翻了翻账本：“记得比我清楚。”徒弟愣住，随即笑得像偷着了鸡。往后他卖得更贵，你炼得更勤。', fx: { stones: 4, disc: { heart: 1 } } } }
  ]
},
{
  id: 'disc_obsess', where: 'story', trigger: 'disc:obsess', sect: true, title: '走火',
  text: '徒弟进静室三天没出来。门缝里的灵气一阵冷一阵热，偶尔传出一声闷哼。你推开一条缝：他盘坐着，七窍渗血，嘴角却挂着笑，像看见了什么好东西。',
  choices: [
    { t: '一掌打断', dao: 'w',
      ok: { text: '你一掌拍在他后心。他喷出一口黑血，醒来就哭：“师父，我差一点就看到了。”你说：“看到了，你就没了。”', fx: { disc: { inj: 4 } } } },
    { t: '替他护法', p: 0.55, dao: 'k',
      ok: { text: '你坐在他身后，把乱窜的灵气一缕缕捋顺。第四天清晨他睁开眼，境界跳了一层。', fx: { disc: { lv: 1 } } },
      fail: { text: '灵气炸开，你们俩都被掀翻在地。他伤得很重，要躺十二个周天；醒来第一句是：“我看到了。”', fx: { disc: { inj: 12 }, inj: 1 } } }
  ]
},
{
  id: 'disc_pride', where: 'story', trigger: 'disc:pride', sect: true, title: '半息空门',
  text: '演武场上，徒弟当着一众同门开口：“师父那一式收剑太慢，左肋有半息空门。”满场寂静。你在心里过了一遍——他说得对。三年了，没人看出来过。',
  choices: [
    { t: '当众认下', dao: 'r',
      ok: { text: '你说：“对。”当场改了那一式。同门看你的眼神变了，看他的也变了。他低下头，耳根有点红。', fx: { mastery: 10, contrib: 1, disc: { heart: 1 } } } },
    { t: '回屋再说', dao: 'w',
      ok: { text: '回到洞府，你关上门：“下回私下说。”他梗着脖子：“当众说，师父才改得快。”你想了想，没反驳。', fx: { disc: { grow: 0.05 } } } },
    { t: '与他过招', duel: 0.8, dao: 'k',
      ok: { text: '你故意卖出那半息空门。他一剑刺来，你侧身让过，剑尖点在他左肋同一处。他怔了很久，深深一揖。', fx: { mastery: 6, disc: { grow: 0.05 } } },
      fail: { text: '他真刺中了。你捂着左肋笑：“好徒弟。”他吓得扔了剑，那天夜里偷偷给你送了三回药。', fx: { inj: 1, disc: { heart: 1 } } } }
  ]
},
{
  id: 'disc_kind', where: 'story', trigger: 'disc:kind', sect: true, title: '散尽的丹',
  text: '月初宗门发的丹药，徒弟一颗没留，全送给了山下害病的村民。如今自己练功缺丹，憋得脸色发青，还嘴硬：“师父，我不饿……我是说，我不缺。”',
  choices: [
    { t: '分徒弟一半', cost: { pills: 1 }, dao: 'r',
      ok: { text: '你把自己的丹分了一半过去。徒弟不肯要，你说：“你送人，我送你，账就平了。”这才接了过去。', fx: { disc: { heart: 1, grow: 0.03 } } } },
    { t: '教徒弟量力', dao: 'w',
      ok: { text: '你说：“救人得先活着。下回留一半。”徒弟想了很久，点头。下个月，果然只送了一半。', fx: { disc: { grow: 0.05 } } } },
    { t: '一起下山义诊', dao: 'r',
      ok: { text: '你带着徒弟在山下守了四个周天。病人退烧那天{su}也来了，看看你，又看看徒弟：“教得还行。”', fx: { busy: 4, aff: { su: 5 }, disc: { heart: 1 }, xp: 2 } } }
  ]
},
{
  id: 'disc_lazy', where: 'story', trigger: 'disc:lazy', sect: true, title: '没砍的柴',
  text: '徒弟的差事是去后山砍三捆柴。傍晚回来，一根柴没有，怀里却鼓鼓囊囊。衣襟一掀：一只耳尖带白月牙的小兔正舔他的下巴。“师父，它跟了我一路，甩不掉。”',
  choices: [
    { t: '留下吧',
      ok: { text: '小兔在你院里转了三圈，挑中你的鞋当了窝。徒弟松了口气，第二天一口气砍回六捆柴。', fx: { pet: 'p_tu' } } },
    { t: '送回去补差', dao: 'w',
      ok: { text: '徒弟抱着小兔一步三回头地送回后山，又摸黑砍了三捆柴。第二天一早，门口多了一把带露水的灵草。', fx: { disc: { grow: 0.03 }, herbs: 2 } } }
  ]
},
{
  id: 'disc_poach', where: 'story', trigger: 'disc:poach', sect: true, title: '一张礼单',
  text: '万法阁的人找上了你的徒弟：亲传之位、三件法宝、一座洞府。徒弟没应也没拒，把礼单原封不动拿来给你看：“师父，您说呢？”礼单很长，他的手很稳。',
  choices: [
    { t: '留下，我教你', dao: 'r',
      ok: { text: '你把压箱底的那门功法抄给了他。他从头看到尾，把礼单撕成两半：“万法阁没有这个。”', fx: { disc: { grow: 0.1, heart: 1 } } } },
    { t: '去吧', dao: 'w',
      ok: { text: '你替他把礼单叠好：“高处风景好，去看看。”他磕了三个头才走。后来万法阁送来重礼，说是替他还的人情。', fx: { stones: 15, flag: 'disc_favor', disc: { out: true } } } },
    { t: '你自己选', p: 0.6,
      ok: { text: '他拿着礼单在门口站了一夜。天亮时，礼单被叠成一只纸鹤，飞回了万法阁。', fx: { disc: { heart: 1, grow: 0.03 } } },
      fail: { text: '他选了万法阁，临走把你院子扫得干干净净：“师父，我会回来看您。”后来他真回来过，每年一次。', fx: { stones: 8, disc: { out: true } } } }
  ]
},
{
  id: 'disc_break', where: 'story', trigger: 'disc:break', sect: true, title: '冲关',
  text: '徒弟要冲关了。静室扫了三遍，蒲团摆正了又摆歪，最后探出头来：“师父……您忙吗？”话说得很随意，手指却在门框上抠出了印子。',
  choices: [
    { t: '我守着你', dao: 'r',
      ok: { text: '你在静室外坐了两个周天。他破关出来，第一眼找的是你，第二眼才去看自己的手。', fx: { busy: 2, disc: { lv: 1, heart: 1 } } } },
    { t: '给他破境丹', cost: { pills: 1 }, dao: 'w',
      ok: { text: '你把丹放进他掌心，拍了拍他的肩。他攥着丹进去，冲关很顺，出来时说那丹是甜的。', fx: { disc: { lv: 1 } } } },
    { t: '自己闯', p: 0.5, dao: 'k',
      ok: { text: '你说：“自己来。”他咬着牙进去，一个人闯过了那道关。出来时满身是汗，眼神像换了个人。', fx: { disc: { lv: 1, grow: 0.1 } } },
      fail: { text: '他没冲过去，被关口弹了回来，躺了三天。第四天爬起来，又把蒲团摆正了：“再来。”', fx: { disc: { inj: 3, grow: 0.03 } } } }
  ]
},
{
  id: 'disc_avenge', where: 'story', trigger: 'disc:avenge', sect: true, title: '带血的箭',
  text: '一支带血的箭钉在你门上，箭杆上绑着徒弟的发带。字条写着：“你欠我家的，拿你徒弟还。三日后，黑风岭断崖，一个人来。”字迹歪斜，写的人手在抖。',
  choices: [
    { t: '一个人去', duel: 1.2, dao: 'k',
      ok: { text: '断崖上只有一个人，比你想的年轻。你救回徒弟，没杀他。他跪在崖边哭，说他爹当年死在你手里。', fx: { unkarma: 'any', disc: { heart: 1 }, xp: 3 } },
      fail: { text: '你抢下徒弟杀下崖，后背挨了一箭。徒弟一路背着你，边哭边说：“师父，是我拖累了您。”', fx: { inj: 3, disc: { heart: 1 } } } },
    { t: '带宗门的人', dao: 'w',
      ok: { text: '执法弟子围住断崖，仇家束手就擒，徒弟毫发无伤。只是在长老们面前，你矮了半截——私怨动了公器。', fx: { favor: { a: -5, c: -5 }, disc: { heart: 1 } } } },
    { t: '给他想要的', cost: { stones: 10 }, dao: 'r',
      ok: { text: '你带去了当年那件事的赔礼，和一句对不住。仇家放了人，拿着东西走了，没说原谅，也没再回来。', fx: { unkarma: 'any' } } }
  ]
},
{
  id: 'disc_graduate', where: 'story', trigger: 'disc:graduate', sect: true, title: '辞行',
  text: '徒弟结成金丹的第七天，来向你辞行。新换的衣裳，还是当年拜师那天的颜色。他磕完头没起来：“师父，徒儿走之前，还想跟您讨一样东西。”',
  choices: [
    { t: '赠剑',
      ok: { text: '你把佩了多年的剑解下来给他。他捧着剑走出山门，走到拐角，回身把剑举了举。', fx: { disc: { out: true }, flag: 'grad_sword' } } },
    { t: '赠一句话',
      ok: { text: '你想了很久，只说：“往后别回头看我。”他走出山门，果然一次也没回头。你一直看到看不见。', fx: { disc: { out: true }, flag: 'grad_word' } } },
    { t: '吃顿饭再走', dao: 'r',
      ok: { text: '你下厨做了一桌菜，都是他小时候爱吃的。他吃得很慢，吃完把碗洗了摆好，才走。', fx: { disc: { out: true }, flag: 'grad_meal' } } }
  ]
},

/* ============================================================
 * 七、人物委托与终章（20）
 * 委托：_q1 二心（好感 ≥40）、_q2 四心（≥80）；_end 五心（≥90，与 su_5 / ye_5 道侣门槛一致）。
 * ============================================================ */

/* ---------- {su} ---------- */
{
  id: 'su_q1', where: 'home', visit: true, npc: 'su', speaker: 'su', aff: [40, 100], need: ['su_crisis'], minR: 2, once: true, title: '病根',
  text: '{su}托人捎来一张药单，字写得又急又密：去年疫镇那场病落了根，一入冬孩子们又咳了。“缺三味：灵草、长生藤的木引，还有一个肯陪我熬夜的人。”最后一句划掉了，没划干净。',
  choices: [
    { t: '把药送去', cost: { herbs: 6, yin: { wood: 1 } },
      ok: { text: '你把灵草和木引装了满满一篓送下山。{su}清点完只回了两个字：“够了。”随信捎来一包润肺糖。', fx: { aff: { su: 15 }, life: 2, flag: 'su_q1_done' } } },
    { t: '捎一袋灵石',
      ok: { text: '你托人捎去一袋灵石。回信很快：“钱收了，药我自己买。人不来就算了，反正也没指望。”', fx: { stones: -3, aff: { su: 5 }, flag: 'su_q1_done' } } },
    { t: '陪着熬', dao: 'r',
      ok: { text: '你在药棚里守了四个周天，煎药、喂药、背孩子。最后一夜{su}趴在药碾子上睡着了，脸上还沾着药粉。', fx: { busy: 4, aff: { su: 20 }, life: 3, flag: 'su_q1_done' } } }
  ]
},
{
  id: 'su_q2', where: 'home', visit: true, npc: 'su', speaker: 'su', aff: [80, 100], need: ['su_bond'], minR: 3, once: true, title: '不问来路',
  text: '{su}半夜来借你的密室，身后跟着一副担架，担架上的人穿血煞魔宗的衣裳，胸口一个窟窿。“别问。伤在哪儿，我就治哪儿。”{su}抬眼看你，“这事传出去，我在丹霞谷就待不下去了。”',
  choices: [
    { t: '搭把手', p: 0.7, dao: 'r',
      ok: { text: '你们治了一夜。天亮时那魔修醒了，盯着你们看了很久，留下一枚血玉令：“血煞魔宗，欠你们一条命。”', fx: { aff: { su: 15 }, favor: { a: -3, c: -3 }, flag: ['su_q2_done', 'mo_owe'] } },
      fail: { text: '你们治了一夜，那人还是没撑到天亮。{su}坐在密室门口，很久才开口：“谢谢你没问。”', fx: { aff: { su: 15 }, flag: 'su_q2_done' } } },
    { t: '我什么都没看见',
      ok: { text: '你把密室钥匙递过去，回屋蒙头就睡。第二天桌上多了一包药，压着一张字条：“你什么都没看见。”', fx: { aff: { su: 10 }, life: 2, flag: 'su_q2_done' } } },
    { t: '劝{su}别管', dao: 'w',
      ok: { text: '“那是魔修。”你说。{su}沉默很久：“我知道。”还是把人抬走了，去了别处，之后半个月没再来。', fx: { aff: { su: -10 }, flag: 'su_q2_done' } } }
  ]
},
{
  id: 'su_end', where: 'home', visit: true, npc: 'su', speaker: 'su', aff: [90, 100], need: ['su_q2_done'], not: ['daolv_ye'], minR: 5, once: true, weight: 2, title: '济世堂',
  text: '丹霞谷的车驾停在山门外。丹云婆婆闭关前点了{su}继任济世堂：坐堂谷中，救天下人，从此不再下山。{su}站在你门口，什么也没说，只把药箱从左手换到了右手。',
  choices: [
    { t: '“留下来”', p: 0.7,
      ok: { text: '你说：“山下也有病人。”{su}看了你很久，把药箱放下：“那你得管饭。”车驾空着回了丹霞谷。', fx: { aff: { su: 10 }, flag: 'su_stay' } },
      fail: { text: '{su}摇了摇头：“你留得住我，留不住那些病人。”笑着上了车，“往后各行其道，可别病着来找我。”', fx: { aff: { su: 5 }, flag: 'su_apart' } } },
    { t: '送你回去', dao: 'r',
      ok: { text: '你把药箱背到车驾前。{su}上车前回头：“下辈子，换你来找我。”车帘落下，你在山门站到天黑。', fx: { aff: { su: 10 }, title: '济世堂旧友', flag: 'su_qianyuan' } } },
    { t: '去丹霞谷要人', duel: 1.2, dao: 'k',
      ok: { text: '你一路打进丹霞谷，在济世堂门口立定：“人我带走，病人我也管。”婆婆看了半天，笑了：“堂，可以搬。”', fx: { aff: { su: 15 }, flag: ['su_stay', 'su_tang'] } },
      fail: { text: '你在谷门外被七位执事拦下。{su}跳下车替你包扎，边骂边哭：“谁要你来抢了！”到底没走成。', fx: { inj: 3, aff: { su: 12 }, flag: 'su_stay' } } }
  ]
},
{
  id: 'su_left', where: 'home', visit: true, npc: 'su', speaker: 'su', need: ['daolv_ye', 'su_tea'], once: true, title: '一瓶药',
  text: '{su}来了，没进门，把一只青瓷瓶搁在门槛上：“治内伤的。听说你们那边打打杀杀，用得上。”顿了顿又补一句，“方子我改过了，不苦。”说完转身就走。',
  choices: [
    { t: '收下',
      ok: { text: '你收下药瓶，道了声谢。{su}点点头，下山的步子很稳，一次也没回头。那瓶药你一直没舍得用。', fx: { aff: { su: 5 }, pills: 1, flag: 'su_left_done' } } },
    { t: '想解释', dao: 'w',
      ok: { text: '“我……”你刚开口，{su}就摆手：“不用。我是医修，看得出谁过得好。”说完笑了一下，比从前好看。', fx: { aff: { su: 3 }, xp: 3, flag: 'su_left_done' } } }
  ]
},

/* ---------- {ye} ---------- */
{
  id: 'ye_q1', where: 'home', visit: true, npc: 'ye', speaker: 'ye', aff: [40, 100], need: ['ye_debt'], minR: 2, once: true, title: '不许问',
  text: '{ye}倚在门框上抛着一颗火红的果子：“借两颗赤炎果，炼爆气丹。干什么用——不许问。”歪头一笑，眼里却没什么笑意，“就这一回，你信不信我？”',
  choices: [
    { t: '给，不问', cost: { yin: { fire: 2 } }, p: 0.6, dao: 'r',
      ok: { text: '{ye}接过果子走了。半月后你听说，魔门有座地牢被人炸开，跑出来三十多个孩子，没人知道是谁干的。', fx: { aff: { ye: 15 }, flag: 'ye_q1_done' } },
      fail: { text: '{ye}接过果子走了。半月后坊市出了桩血案，死者胸口有爆气丹灼出的焦痕。你没问，{ye}也没说。', fx: { aff: { ye: 15 }, karma: 'ye_pill', flag: 'ye_q1_done' } } },
    { t: '“干什么用？”', dao: 'w',
      ok: { text: '{ye}的笑淡了：“替我娘报仇。”把果子抛回你怀里，“算了，不借了。”人走了，话却留了下来。', fx: { aff: { ye: -5 }, flag: ['ye_q1_done', 'ye_truth'] } } },
    { t: '悄悄跟着', duel: 1.1, dao: 'k',
      ok: { text: '你一路跟到魔门地牢，正撞上{ye}被围。两人背靠背杀出来，{ye}喘着气瞪你：“不是说好不问？”“我没问。”', fx: { aff: { ye: 12 }, xp: 4, flag: 'ye_q1_done' } },
      fail: { text: '你跟丢了，还被巡夜的魔修追了三十里。回来时{ye}坐在你屋顶上：“跟踪的本事真差。”扔下一瓶伤药。', fx: { inj: 2, aff: { ye: 8 }, flag: 'ye_q1_done' } } }
  ]
},
{
  id: 'ye_q2', where: 'home', visit: true, npc: 'ye', speaker: 'ye', aff: [80, 100], need: ['ye_bond'], minR: 4, once: true, title: '血契',
  text: '{ye}摊开手，掌心一张血契：圣宗答应还{ye}自由，只要一样东西——你手上的戒指。“我没打算拿。”{ye}笑着说，眼睛却盯着那枚戒指，“可我想知道，你肯不肯给。”',
  choices: [
    { t: '做一枚假的', p: 0.55, dao: 'w',
      ok: { text: '你连夜炼出一枚一模一样的假戒。圣宗的人验了三天没验出来，血契作废。{ye}捏着那张废纸笑了一整夜。', fx: { aff: { ye: 15 }, flag: ['ye_q2_done', 'ye_free'] } },
      fail: { text: '假戒第二天就被识破。圣宗追上门来，你们一起被追了三百里，跑着跑着，都笑出了声。', fx: { inj: 2, aff: { ye: 12 }, flag: 'ye_q2_done' } } },
    { t: '伸手：你拿', dao: 'r',
      ok: { text: '{ye}的指尖碰到戒指，停了很久，最后只是替你把戒指转正：“傻子。”血契被扔进了火盆。', fx: { aff: { ye: 20 }, flag: 'ye_q2_done' } } },
    { t: '一起反出去', duel: 1.2, dao: 'k',
      ok: { text: '你撕了血契：“要自由，我陪你去抢。”那一夜，圣宗山门少了两块门匾，多了两个通缉的名字。', fx: { aff: { ye: 15 }, flag: ['ye_q2_done', 'ye_defect'] } },
      fail: { text: '你们杀到第三道山门就被逼了回来，浑身是伤。{ye}靠着你喘气：“值了，头一回有人陪我闯。”', fx: { inj: 3, aff: { ye: 15 }, flag: ['ye_q2_done', 'ye_defect'] } } }
  ]
},
{
  id: 'ye_end', where: 'home', visit: true, npc: 'ye', speaker: 'ye', aff: [90, 100], need: ['fire_5'], not: ['daolv_su'], minR: 5, once: true, weight: 2, title: '十年',
  text: '圣火熄了，{ye}的火毒跟着去了大半——连同大半寿元。“还剩十年。”{ye}说得轻描淡写，掰着手指算：“够喝三千坛酒，够看十回灯会。”掰到最后一根，没掰下去。',
  choices: [
    { t: '去东海找药', p: 0.5, dao: 'k',
      ok: { text: '你在龙宫宝库前跪了三天，换回一枚续命的蛟珠。{ye}含着珠子骂你傻，骂完把你的手攥得死紧。', fx: { aff: { ye: 15 }, inj: 2, flag: 'ye_life' } },
      fail: { text: '东海没有，星墟也没有。你空手回来，{ye}在门口等你，拎着两坛酒：“回来就好。还剩九年半。”', fx: { aff: { ye: 10 }, flag: 'ye_ten' } } },
    { t: '陪你看完', dao: 'w',
      ok: { text: '你说：“那就一回一回地看。”{ye}笑了，把第一盏灯塞进你手里。往后每年灯会，你们都在。', fx: { aff: { ye: 10 }, title: '十年灯', flag: 'ye_ten' } } },
    { t: '分你一半', dao: 'r',
      ok: { text: '你逼出一缕本命精元，渡进{ye}心口。{ye}气得打你，打着打着哭了：“谁准你替我做主的！”', fx: { life: -10, aff: { ye: 12 }, flag: 'ye_life' } } }
  ]
},
{
  id: 'ye_left', where: 'home', visit: true, npc: 'ye', speaker: 'ye', need: ['daolv_su', 'ye_debt'], once: true, title: '一把刀',
  text: '你推开门，一地碎陶片，酒香冲鼻——你埋了三年的那坛酒。桌上插着一把刀，刀柄缠着{ye}常系的红绳。屋顶瓦片一响，人已经在檐角了，背对着你。',
  choices: [
    { t: '收下这把刀',
      ok: { text: '你拔出刀，刀脊上刻着一行小字：“好好过。”你把刀挂在床头。那坛酒的香，三天才散。', fx: { item: 'w', itemUp: 1, flag: 'ye_left_done' } } },
    { t: '追出去', dao: 'k',
      ok: { text: '你追到山脚。{ye}停下，没回头：“别追了，再追我就舍不得走了。”风一过，人就不见了，只飘回一句笑骂。', fx: { aff: { ye: 5 }, xp: 3, flag: 'ye_left_done' } } }
  ]
},

/* ---------- 楚狂 ---------- */
{
  id: 'chu_q1', where: 'exp', bg: ['swords'], npc: 'chu', speaker: 'chu', aff: [40, 100], need: ['chu_wine'], not: ['chu_q1_done'], title: '借一式',
  text: '剑碑林里，楚狂蹲在一块断碑前，剑横在膝上：“这碑上刻着一式，我看了三年，看不全。”他抬眼，“你来得正好。陪我借，借完还。”“怎么还？”“练会了，就算还了。”',
  choices: [
    { t: '陪他看碑', p: 0.7,
      ok: { text: '你们在碑前坐了四个周天，他看左半边，你看右半边。最后一夜对了一剑，碑上的字自己亮了。', fx: { aff: { chu: 15 }, mastery: 15, flag: 'chu_q1_done' } },
      fail: { text: '碑中剑意惊醒，把你们俩一起掀出了剑碑林。楚狂爬起来擦擦嘴角：“它不肯借。下回再来。”', fx: { aff: { chu: 12 }, mastery: 5, inj: 1, flag: 'chu_q1_done' } } },
    { t: '我教你一式', duel: 1.0, dao: 'r',
      ok: { text: '你把自己最得意的那一式拆给他看。他看一遍就会了，又看了十遍，才说：“比碑上的好。”', fx: { aff: { chu: 20 }, flag: 'chu_q1_done' } },
      fail: { text: '你才拆到一半，他已经用这一式把你挑翻在地。他把你拉起来，认真道：“好剑。谢了。”', fx: { aff: { chu: 20 }, inj: 1, flag: 'chu_q1_done' } } },
    { t: '下回吧',
      ok: { text: '楚狂点点头，又转回去看碑。你走出很远回头，他还蹲在那儿，像碑前又多了一块碑。', fx: { xp: 1 } } }
  ]
},
{
  id: 'chu_q2', where: 'home', visit: true, npc: 'chu', speaker: 'chu', aff: [80, 100], need: ['chu_bond'], minR: 4, once: true, title: '三天',
  text: '楚狂输给了楚天阔——论剑台上一招，剑脱了手，当着半个天下。他回来三天没说话，抱着剑坐在你院里的石凳上，饭送过去就吃，话递过去不接。第四天清晨，石凳上落满了霜。',
  choices: [
    { t: '拔剑陪他练', duel: 1.0, dao: 'r',
      ok: { text: '你什么也没说，拔剑。他看了你很久，也拔剑。你们练了四个周天，第四天傍晚他忽然说：“那一招，我看清了。”', fx: { busy: 4, aff: { chu: 15 }, mastery: 8, flag: 'chu_q2_done' } },
      fail: { text: '他把三天的憋闷全打在你身上，你被打得爬不起来。他扔了剑，坐在你旁边，终于开口：“谢了。”', fx: { busy: 4, inj: 2, aff: { chu: 18 }, flag: 'chu_q2_done' } } },
    { t: '骂醒他', p: 0.6, dao: 'k',
      ok: { text: '“剑脱手就不是剑修了？当年拦我路时，你剑可握得紧。”楚狂猛地抬头，头一回冲你吼：“拔剑！”', fx: { aff: { chu: 12 }, xp: 3, flag: 'chu_q2_done' } },
      fail: { text: '他听完起身就走，三天后回来，脸上多了道疤：“去剑冢跟碑打了一架。”你没再说什么。', fx: { aff: { chu: 8 }, flag: 'chu_q2_done' } } },
    { t: '这一剑我讨',
      ok: { text: '你在论剑帖上给楚天阔留了一行字：下回论道，替楚狂讨那一招。楚狂看见了，骂你多事，转身磨了一夜剑。', fx: { aff: { chu: 10 }, grudge: { chu: 10 }, flag: ['chu_q2_done', 'chu_avenge'] } } }
  ]
},
{
  id: 'chu_end', where: 'home', visit: true, npc: 'chu', speaker: 'chu', aff: [90, 100], need: ['chu_q2_done'], minR: 5, once: true, weight: 2, title: '走一圈',
  text: '楚狂来辞行。背上的剑换了，是他自己铸的，丑，但锋利。“剑冢的碑我不看了，天剑九式我也不学了。我悟出了自己的一式，想拿去天下走一圈，看有没有人打得败它。”',
  choices: [
    { t: '送他下山',
      ok: { text: '你送到山脚。他把一枚玉简塞给你：“我那一式。替我记着，我忘了就回来问你。”头也不回地走了。', fx: { aff: { chu: 10 }, mastery: 30, title: '剑痴之友', flag: 'chu_gone' } } },
    { t: '最后比一场', duel: 1.1, dao: 'k',
      ok: { text: '你接下了那一式——只是接下。他大笑：“好！天下还有人能接，我就不算白悟。”笑声一直滚到山下。', fx: { aff: { chu: 15 }, power: 0.03, flag: 'chu_gone' } },
      fail: { text: '那一式你没接住。他收剑，伸手把你拉起来：“你是头一个。往后我替你记着，输给我的这一回。”', fx: { aff: { chu: 15 }, mastery: 15, flag: 'chu_gone' } } }
  ]
},

/* ---------- 葛老 ---------- */
{
  id: 'ge_q1', where: 'home', visit: true, npc: 'ge', speaker: 'ge', aff: [40, 100], need: ['ge_wine'], once: true, title: '赎人',
  text: '坊市酒楼的伙计找上门，递来一张按了手印的欠条：赊酒四十七坛，立据人葛某，担保人——你的名字，字迹歪得像蚯蚓。“人押在我们后厨劈柴呢，掌柜的说，钱到放人。”',
  choices: [
    { t: '掏钱', cost: { stones: 8 },
      ok: { text: '葛老被放出来时还抱着半坛：“记账上，等老头子炼出九转金丹，连本带利。”你决定先不指望。', fx: { aff: { ge: 15 }, flag: 'ge_q1_done' } } },
    { t: '替他炼丹抵债', cost: { herbs: 10 }, p: 0.7, dao: 'w',
      ok: { text: '你借酒楼后厨的锅开炉，丹成时满楼酒客都放下了杯。掌柜当场免了债，葛老在旁酸溜溜：“火候还差点。”', fx: { aff: { ge: 15 }, stones: 4, xp: 3, flag: 'ge_q1_done' } },
      fail: { text: '锅炸了。现在欠条上是两个人的手印。你和葛老并排劈了一下午柴，他趁机教了你怎么看火。', fx: { aff: { ge: 8 }, xp: 4, flag: 'ge_q1_done' } } },
    { t: '“不认识”', dao: 'k',
      ok: { text: '当晚坊市传来一声闷响。听说酒楼的丹炉——他们为什么有丹炉？——炸了，葛老不知去向，坊市涨了三成。', fx: { aff: { ge: -5 }, flag: ['market_up', 'ge_q1_done'] } } }
  ]
},
{
  id: 'ge_q2', where: 'home', visit: true, npc: 'ge', speaker: 'ge', aff: [80, 100], need: ['ge_bond'], minR: 3, once: true, title: '床底下',
  text: '丹霞谷的执事抬着八抬大轿停在你门口，说谷主请葛老回谷“叙旧”。你回屋一看，床底下伸出一只脚，脚上还挂着酒葫芦。床底传来气声：“小友，就说老夫死了。”',
  choices: [
    { t: '“人不在”', dao: 'k',
      ok: { text: '你堵在门口说人不在。执事瞥了眼你脚边的酒渍，冷笑着走了。葛老从床底爬出来：“够意思，老夫记你一辈子。”', fx: { aff: { ge: 15 }, flag: ['ge_q2_done', 'ge_hid'] } } },
    { t: '劝他回去看看', dao: 'r',
      ok: { text: '你蹲在床边劝了半个时辰。葛老终于爬出来，拍拍灰：“看就看，又不是不敢。”上轿前偷灌了半壶酒壮胆。', fx: { aff: { ge: 10 }, xp: 3, flag: ['ge_q2_done', 'ge_went'] } } },
    { t: '请谷主亲来',
      ok: { text: '你传话：要人，请谷主自己来。三天后丹云婆婆真来了，和葛老隔着一张桌子吵了一夜，吵掉出一页发黄的丹经。', fx: { aff: { ge: 10 }, flag: ['ge_q2_done', 'danjing_2'] } } }
  ]
},
{
  id: 'ge_end', where: 'home', visit: true, npc: 'ge', speaker: 'ge', aff: [90, 100], need: ['ge_q2_done'], minR: 5, once: true, weight: 2, title: '一炉旧丹',
  text: '葛老这回没喝酒，衣裳穿得整整齐齐：“六十年前，老夫和师弟阿青炼九转金丹，炉炸了，阿青没出来。丹云恨了老夫六十年，恨得对。”他看着你的丹炉，“今天是阿青的忌日。”',
  choices: [
    { t: '把那炉丹炼完', p: 0.5, dao: 'k',
      ok: { text: '你开炉，他报方子，报到第七味时嗓子哑了。丹成那刻，九道丹纹绕炉三匝。葛老捧着丹，像捧着一个人。', fx: { aff: { ge: 15 }, recipe: 'jiuzhuan', flag: 'ge_done' } },
      fail: { text: '第七味下去，炉身裂了一道缝——和六十年前同一个位置。葛老一把按住炉盖：“够了。老夫知道错在哪了。”', fx: { aff: { ge: 10 }, inj: 1, flag: 'ge_done' } } },
    { t: '陪他去上坟', dao: 'r',
      ok: { text: '阿青的坟在丹霞谷后山，坟前已摆着一碗酒——丹云来过了。葛老对着那碗酒站了很久，把自己的也倒了进去。', fx: { aff: { ge: 10 }, pills: 2, flag: ['ge_done', 'ge_peace'] } } }
  ]
},

/* ---------- 白小九 ---------- */
{
  id: 'bai_q1', where: 'home', visit: true, npc: 'bai', speaker: 'bai', aff: [40, 100], need: ['bai_food'], once: true, title: '妖市的账',
  text: '一只三尺高的老狸猫拄着拐杖堵在你门口，身后跟两个账房小妖：“白小九在妖市赊了十二串糖葫芦、三匹云锦、一只会唱歌的鸟——鸟还没还。”小九躲在你身后，尾巴在抖。',
  choices: [
    { t: '我替她赔', cost: { stones: 6 },
      ok: { text: '你掏了钱。老狸猫数了三遍，临走瞪了小九一眼：“鸟呢？”小九从袖子里摸出一只鸟，鸟还在唱。', fx: { aff: { bai: 15 }, flag: 'bai_q1_done' } } },
    { t: '请他们出去', duel: 0.9, dao: 'k',
      ok: { text: '你把账房小妖扔下了山，老狸猫拄着拐走得飞快。小九扑上来：“恩人好威风！”又小声补一句，“但我确实欠钱……”', fx: { aff: { bai: 10 }, flag: 'bai_q1_done' } },
      fail: { text: '老狸猫一拐杖把你敲进了墙里。小九哭着把鸟还了回去，又给你揉了一晚上脑袋。', fx: { inj: 2, aff: { bai: 12 }, flag: 'bai_q1_done' } } },
    { t: '让她自己还', dao: 'w',
      ok: { text: '小九跟老狸猫去妖市打了十二周天的工，回来瘦了一圈，怀里揣着一只青羽雀：“工钱！它非要跟我走。”', fx: { aff: { bai: 10 }, pet: 'p_que', flag: 'bai_q1_done' } } }
  ]
},
{
  id: 'bai_q2', where: 'home', visit: true, npc: 'bai', speaker: 'bai', aff: [80, 100], need: ['bai_bond'], sect: true, minR: 3, once: true, title: '尾巴',
  text: '白小九的尾巴越来越难藏，一高兴冒出一条，一紧张冒出两条。宗门里已有人在传，说你洞府里养着妖。今天执法堂来人“例行巡查”，眼睛却一直往小九身后瞟。',
  choices: [
    { t: '“我养的灵宠”',
      ok: { text: '执法弟子记下“灵宠一只”走了。小九三天没理你，第四天把尾巴伸到你面前：“灵宠是要梳毛的。”', fx: { aff: { bai: 8 }, flag: 'bai_q2_done' } } },
    { t: '“她是我家人”', dao: 'r',
      ok: { text: '你当着执法弟子说完这句，满院都静了。有长老说你糊涂，有长老说你担当。门后，小九的尾巴摇出了九条影子。', fx: { aff: { bai: 15 }, favor: { a: 5, c: -8 }, flag: 'bai_q2_done' } } },
    { t: '送她回山避避', dao: 'w',
      ok: { text: '你送小九回了万妖山。临别她塞给你一颗亮石子：“恩人想我了就看它。”半年后回来，尾巴已收放自如。', fx: { aff: { bai: 10 }, xp: 2, flag: 'bai_q2_done' } } }
  ]
},
{
  id: 'bai_end', where: 'exp', bg: ['forest'], npc: 'bai', speaker: 'bai', aff: [90, 100], need: ['fox_4'], once: true, weight: 2, title: '九尾',
  text: '狐族秘地的月亮是青色的。祭坛上，白小九身后已亮起八条尾巴，第九条将出未出。老狐狸说：成了九尾，就得留下守秘地；不成，从此做人。小九回过头，看着你。',
  choices: [
    { t: '成九尾吧',
      ok: { text: '第九条尾巴亮起时，满山狐火都朝她低了头。小九哭着笑：“我把一缕血脉给了你的狐狸，就当是我陪着你。”', fx: { aff: { bai: 10 }, pet: 'p_hu', flag: ['bai_nine', 'fox_blood'] } } },
    { t: '跟我回家', dao: 'r',
      ok: { text: '你伸出手。小九看看第九条尾巴，又看看你的手，扑了过来，八条尾巴“噗”地全收了回去：“回家吃饭！”', fx: { aff: { bai: 15 }, title: '狐狸的家', flag: 'bai_stay' } } },
    { t: '你自己选', p: 0.5, dao: 'w',
      ok: { text: '小九想了很久，走下祭坛：“九尾以后还能成，恩人只有一个。”老狐狸叹着气，把第九尾的灵光封进珠子给了你。', fx: { aff: { bai: 15 }, treasure: 1, flag: 'bai_stay' } },
      fail: { text: '小九咬着嘴唇转回祭坛。第九条尾巴亮起的那一刻，她冲你喊：“每年月圆，我都去你屋顶上坐着！”', fx: { aff: { bai: 10 }, pet: 'p_hu', flag: ['bai_nine', 'fox_blood'] } } }
  ]
},

/* ---------- 墨无痕 ---------- */
{
  id: 'mo_q1', where: 'home', visit: true, npc: 'mo', speaker: 'mo', aff: [40, 100], need: ['mo_save'], minR: 3, maxR: 6, once: true, title: '布防图',
  text: '墨无痕在你桌上摊开一张白纸：“天剑宗山门的布防图，我要。”你问做什么，他沉默了一会儿：“三千年前，我墨家先祖背着骂名从那座山上走下来。总有一天，我要走上去。”',
  choices: [
    { t: '我去拓', p: 0.6, dao: 'k',
      ok: { text: '你扮作送菜的杂役混进天剑宗，在山门墙下量了三天。图交给墨无痕时，他只说了两个字：“多谢。”说得很认真。', fx: { busy: 3, aff: { mo: 15 }, flag: ['mo_q1_done', 'tj_map'] } },
      fail: { text: '第三天你被认了出来，翻墙时挨了一剑，图只拓了一半。墨无痕替你上药：“一半够了，另一半我自己看。”', fx: { inj: 2, aff: { mo: 12 }, flag: 'mo_q1_done' } } },
    { t: '找赵乾要', need: ['zhao_owes'],
      ok: { text: '赵乾见了你，脸色变了几变，最后从怀里掏出一张图：“拿去，我们两清。”墨无痕看着图上赵乾的手印，挑了挑眉。', fx: { aff: { mo: 15 }, grudge: { zhao: -10 }, flag: ['mo_q1_done', 'tj_map'] } } },
    { t: '这事我不碰', dao: 'w',
      ok: { text: '墨无痕把白纸折好收起：“也对，不该把你扯进来。”他走后你才发现，桌上落着一张纸，背面写满天剑宗的地名。', fx: { aff: { mo: -3 }, flag: 'mo_q1_done' } } }
  ]
},
{
  id: 'mo_q2', where: 'home', visit: true, npc: 'mo', speaker: 'mo', aff: [80, 100], need: ['mo_ask'], not: ['st_truth'], minR: 4, maxR: 5, once: true, title: '一句话',
  text: '墨无痕站在你院里，不看你，只看你手上的戒指：“我不要他认错，只要他亲口说一句——墨离没有弑师。”他攥着那半块玉简，“一句就够。我替墨家三十代人听。”',
  choices: [
    { t: '我替他说', p: 0.4, dao: 'r',
      ok: { text: '你学着老祖的口气说了那句话。戒指里没有声音，也没有反对。墨无痕盯着戒指看了很久：“……他没拦你。”', fx: { aff: { mo: 15 }, flag: 'mo_q2_done' } },
      fail: { text: '你刚开口，戒指就烫了起来：“住口！”墨无痕笑了一声，很难听：“你看，他连别人替他说都不肯。”', fx: { aff: { mo: 5 }, flag: 'mo_q2_done' } } },
    { t: '等真相出来', dao: 'w',
      ok: { text: '“等真相出来，让他自己说。”墨无痕看了你很久，把玉简收回怀里：“好。三千年都等了，不差这几年。”', fx: { aff: { mo: 10 }, flag: 'mo_q2_done' } } },
    { t: '问老祖',
      ok: { text: '老祖沉默很久：“本座……不记得了。只记得那一剑。”墨无痕点点头，转身走了。走到门口，背影晃了一下。', fx: { aff: { mo: -5 }, xp: 3, flag: ['mo_q2_done', 'mo_q2_asked'] } } }
  ]
},
{
  id: 'mo_end', where: 'home', visit: true, npc: 'mo', speaker: 'mo', aff: [90, 100], need: ['st_justice', 'mo_bond'], minR: 7, maxR: 7, once: true, weight: 2, title: '往后',
  text: '墨离的名字刻进正史的第三天，墨无痕来了，没带剑，也没带酒，在你门口坐了一下午，最后说：“三千年的事，做完了。”他看着自己的手，“往后……我不知道该干什么。”',
  choices: [
    { t: '留下来看门', dao: 'w',
      ok: { text: '墨无痕在山门口搭了间小屋。从此再没有贼摸进过你的洞府——摸进来的，第二天都挂在门口的松树上。', fx: { aff: { mo: 10 }, flag: 'mo_guard' } } },
    { t: '陪你去上坟', dao: 'r',
      ok: { text: '墨离的坟在一座无名山上，三千年没人扫过。你们扫了一整天，墨无痕在碑前跪下，第一次唤了声“先祖”。', fx: { aff: { mo: 10 }, life: 3, flag: 'mo_grave' } } },
    { t: '做我师弟吧',
      ok: { text: '“玄霄门下，记名弟子墨无痕。”话音刚落，戒指里传来一声笑骂：“辈分全乱了。”墨无痕愣了半天，一揖：“……师兄。”', fx: { aff: { mo: 15 }, title: '玄霄门下', flag: 'mo_brother' } } }
  ]
},

/* ============================================================
 * 八、主线补段（6）
 * ============================================================ */
{
  id: 'story_pact_eve', where: 'story', trigger: 'pact_eve', maxR: 1, speaker: 'elder', title: '约战前夜',
  text: '明天就是三年之约。你擦了三遍剑，还是睡不着。戒指忽然开口，难得没骂人：“小子，问你句正经的——明天要是赢了，往后想干什么？”窗外的月亮很圆，像破庙那夜。',
  choices: [
    { t: '让他们都抬头看我', dao: 'k',
      ok: { text: '老祖哈哈大笑：“俗！可本座爱听。”那一夜他讲了七种让人闭嘴的剑法，一直讲到天亮。', fx: { xp: 3, flag: 'pact_k' } } },
    { t: '接着修，修到天上', dao: 'w',
      ok: { text: '老祖“嗯”了一声：“这才像修士说的话。”他没再开口，你却觉得指间的戒指暖了一下。', fx: { xp: 3, flag: 'pact_w' } } },
    { t: '回去修破庙的顶', dao: 'r',
      ok: { text: '老祖沉默了很久：“……那顶漏雨，是该修了。”声音有点哑，“本座在那儿，等了三千年。”', fx: { xp: 3, flag: 'pact_r' } } }
  ]
},
{
  id: 'story_trib1', where: 'story', trigger: 'trib:1', maxR: 7, speaker: 'elder', title: '渡劫阵图',
  text: '第一道雷劫散了，你焦黑着脸坐在山顶，头发根根竖着。老祖难得没笑你，丢过来一卷旧阵图：“下回别光着身子挨劈。本座当年渡劫……”他顿了顿，“算了，没渡完，不提。”',
  choices: [
    { t: '认真记下', dao: 'w',
      ok: { text: '你把阵图一笔一笔描进识海。老祖在旁挑刺挑了一夜，挑到后来竟有几分得意：“这阵，是本座年轻时画的。”', fx: { plan: 'f_dujie', xp: 3 } } },
    { t: '“您没渡完？”', dao: 'r',
      ok: { text: '“雷落下来的时候，背后有点凉。”老祖说完就不吭声了。你攥着阵图，觉得这句话比雷还沉。', fx: { plan: 'f_dujie', flag: 'trib_hint' } } },
    { t: '“这阵图真丑”', dao: 'k',
      ok: { text: '“丑？三千年前它挂在本座山门上，万人来拜！”老祖骂了半宿，骂完又把阵眼给你讲了三遍。', fx: { plan: 'f_dujie', xp: 2 } } }
  ]
},
{
  id: 'story_demon1', where: 'story', trigger: 'demon:1', title: '心魔·旧账',
  text: '元婴雷劫之前，先来的是心魔。它翻出你这一世欠下的第一笔账；账若是空的，就翻回被逐出山门那天。幻境一寸不差，同样的风，同样的人。它问：“再来一次，还这么选吗？”',
  choices: [
    { t: '还这么选', dao: 'w',
      ok: { text: '你说：“还这么选。”幻境碎了。雷云底下，你的道心像一块被雷劈过的石头，裂了纹，却更硬了。', fx: { flag: 'demon1_firm' } } },
    { t: '换一种选法', dao: 'r',
      ok: { text: '你说：“换一种。”幻境里那个人愣住了，慢慢散去——连同那笔账。雷云更沉了，你心里却轻了。', fx: { flag: 'demon1_waver', unkarma: 'any' } } },
    { t: '一剑斩了它', p: 0.5, dao: 'k',
      ok: { text: '你没答话，一剑斩下。心魔碎成满地镜片，每一片里都是你。你踩着镜片，走进了雷云。', fx: { flag: 'demon1_firm', xp: 4 } },
      fail: { text: '剑斩了个空，心魔在你耳边笑：“你连自己都砍？”你心神一乱，第一道雷就劈了个正着。', fx: { flag: 'demon1_waver', inj: 1 } } }
  ]
},
{
  id: 'story_demon2', where: 'story', trigger: 'demon:2', maxR: 7, title: '心魔·岔路',
  text: '化神雷劫前，心魔换了张脸——是你没有选的那个人，站在你没走的那条路上，冲你笑。若你谁也没辜负，它便学戒指里那个声音骂你废柴。它问：“那条路，你后悔过吗？”',
  choices: [
    { t: '不后悔', dao: 'w',
      ok: { text: '你说不后悔。那张脸笑着点头，像是替你高兴，然后散了。你忽然有点想哭，忍住了。', fx: { flag: 'demon2_firm' } } },
    { t: '后悔过', dao: 'r',
      ok: { text: '你说后悔过。心魔愣住了，它没想到你会认。它散得很慢，散之前，那张脸对你说了声：“保重。”', fx: { flag: 'demon2_waver', unkarma: 'any' } } },
    { t: '“让开”', dao: 'k',
      ok: { text: '你说：“让开。”心魔真的让开了。它身后是雷云，雷云后面什么也没有。你走进去，没有回头。', fx: { flag: 'demon2_firm', xp: 3 } } }
  ]
},
{
  id: 'story_demon3', where: 'story', trigger: 'demon:3', maxR: 7, title: '心魔·同路人',
  text: '合体雷劫前，心魔是陆天衡。白衣负剑，慈眉善目：“我也是杂灵根，也被人当废柴。师父要把剑典传给别人，我只好自己去拿。”他朝你伸出手，“你我，本是同一种人。”',
  choices: [
    { t: '“我不推人”', dao: 'w',
      ok: { text: '“我被人推下过山，没推过别人。”你说。陆天衡的笑僵在脸上，像一幅画被雨淋透了。', fx: { flag: 'demon3_firm' } } },
    { t: '“也许一样”', dao: 'r',
      ok: { text: '你说也许一样。他一愣，你接着说：“所以我更不能变成你。”心魔散了，带走了你心里一笔旧账。', fx: { flag: 'demon3_waver', unkarma: 'any' } } },
    { t: '拔剑', dao: 'k',
      ok: { text: '你拔剑。他也拔剑，用的是天剑九式；你用的，是那下半句。心魔从中间裂开，漏出一缕三千年前的雷光。', fx: { flag: 'demon3_firm', mastery: 10 } } }
  ]
},
{
  id: 'story_ascend', where: 'story', trigger: 'ascend', title: '最后的访客',
  text: '飞升前夜，有人敲门，敲得很轻。你没开门就知道是谁——这一世走到这里，会在这时候来的，只有那一个人。门外的人没进来，只隔着门问：“明天，还回来吗？”',
  choices: [
    { t: '开门', dao: 'r',
      ok: { text: '你开了门。两个人隔着门槛站着，谁也没说话，就这么看着天一点点亮。天亮时，你说：“回来。”', fx: { xp: 4, flag: 'ascend_open' } } },
    { t: '隔着门说话', dao: 'w',
      ok: { text: '你背靠门坐下，门外的人也坐下了。隔着一道门说了一夜的话，说到最后，门外传来一声很轻的笑。', fx: { xp: 4, flag: 'ascend_door' } } },
    { t: '“别等我”', dao: 'k',
      ok: { text: '门外安静了很久。然后脚步声远了，很慢，很稳。你在门后站到天亮，把这一世最后一滴泪留在了人间。', fx: { xp: 4, flag: 'ascend_alone' } } }
  ]
}

];
if (typeof module !== 'undefined' && module.exports) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
