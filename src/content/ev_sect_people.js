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
  text: '真传玉牌还没捂热，五堂已堵在门口：丹堂抱药匣，器堂扛铁砧，战堂拔剑，执法堂递门规，外事堂笑得最和气。会武后还能换。',
  choices: [
    { t: '去丹堂',
      ok: { text: '药匣塞进你怀里：“炉火归你看了。”从此成丹率 +8%，任务多半是炼丹。', fx: { duty: 'dan' } } },
    { t: '去器堂',
      ok: { text: '老铁匠把铁砧往你脚边一顿：“砸。”从此强化成功率 +8%，熔炼多出灵矿。', fx: { duty: 'qi' } } },
    { t: '去战堂', dao: 'k',
      ok: { text: '那人收剑入鞘，只说一个字：“走。”从此斩妖历练分数 +5，论道奖励更厚。', fx: { duty: 'zhan' } } },
    { t: '去执法堂', dao: 'w',
      ok: { text: '“惹事的少了，挑事的归你打。”从此坏事上门少一半，打赢同门另得贡献。', fx: { duty: 'fa' } } },
    { t: '去外事堂',
      ok: { text: '“迎来送往，都是学问。”从此坊市便宜一成，拍卖更稳，来访的人也多了。', fx: { duty: 'wai' } } }
  ]
},
{
  id: 'sect_vault_new', where: 'home', visit: true, sect: true, srankMin: 1, cooldown: 48, title: '库房耳语',
  text: '管宝库的哑巴执事蘸着茶水写：下一批，有好东西。写完抹掉，竖起三根手指——三天后换货。',
  choices: [
    { t: '攒着等', dao: 'w',
      ok: { text: '三天后换货，最上头那一格亮得晃眼。哑巴执事冲你挤了挤眼。', fx: { flag: 'vault_tip', xp: 1 } } },
    { t: '现在就换', dao: 'k',
      ok: { text: '落袋为安。哑巴执事摇摇头，塞给你一块糖，像哄不听劝的孩子。', fx: { item: 'need', contrib: -3 } } }
  ]
},
{
  id: 'sect_junior_duel', where: 'home', visit: true, sect: true, srankMin: 1, cooldown: 36, title: '不服来',
  text: '同届弟子在演武场立了块木牌，写着你的名字和三个字：不服来。脚边躺着两个替你出头的师弟。',
  choices: [
    { t: '下场', duel: 0.9, dao: 'k',
      ok: { text: '三招，他的剑插进了自己立的木牌。他瞪着你：“明年再来。”', fx: { contrib: 2, xp: 3 } },
      fail: { text: '你输了半招。第二天木牌立回原处，你的名字底下多了两个字：险胜。', fx: { inj: 1, xp: 3 } } },
    { t: '让他三招', p: 0.55, dao: 'w',
      ok: { text: '你空手让过三招才拔剑，剑尖点在他剑脊上。看台上的长老在册子上记了你一笔。', fx: { favor: { a: 4, c: 4 }, contrib: 1 } },
      fail: { text: '第三招没让过去，你被挑翻。他愣住：“你让我？”拉你起来时，那股不服没了。', fx: { inj: 1, xp: 2 } } },
    { t: '不理他',
      ok: { text: '木牌立了七天，第八天被他自己劈了当柴烧，听说火很旺。', fx: { xp: 2 } } }
  ]
},
{
  id: 'sect_frame', where: 'home', visit: true, sect: true, srankMin: 2, once: true, title: '枕下的书',
  text: '执法堂查房前一刻，你在枕下摸到一本血煞魔宗的《血河炼魂篇》，封皮还潮。门外脚步声已到第三间。',
  choices: [
    { t: '捧书出去', dao: 'w',
      ok: { text: '执事查了半日，查不出你练过一页，记了个“失察”。名声还在。', fx: { contrib: -2, favor: { a: 3 } } } },
    { t: '查是谁塞的', p: 0.5,
      ok: { text: '书页的熏香你认得——同院最爱打听你的师兄。他被罚守了三年山门。', fx: { contrib: 2, xp: 2 } },
      fail: { text: '线索断在一个已下山的杂役身上。执法堂名册上，你多了一个问号。', fx: { contrib: -1, xp: 2 } } },
    { t: '塞回去', dao: 'k',
      ok: { text: '书从窗缝进了隔壁那位师兄的枕下。查房的脚步，在他门口停住了。', fx: { karma: 'frame', contrib: 1 } } }
  ]
},
{
  id: 'sect_lecture', where: 'home', visit: true, sect: true, minR: 4, srankMin: 4, cooldown: 48, title: '轮值讲道',
  text: '轮到你登台讲道。前排三位长老各端着茶，各想听不同的东西——讲了这个，另两位的茶就该凉了。',
  choices: [
    { t: '讲本门大道',
      ok: { text: '你讲到本门立派的第一句话。居中长老端茶的手停了停，另两位低头喝茶。', fx: { favor: { a: 10, b: -3, c: -3 }, contrib: 2, mastery: 5 } } },
    { t: '讲手上功夫',
      ok: { text: '散场后小弟子追问，做了十年还不熟怎么办。你说：“我也是。”', fx: { favor: { a: -3, b: 10, c: -3 }, contrib: 2, herbs: 6 } } },
    { t: '讲世道人心',
      ok: { text: '你讲起山下卖茶的、种田的、求雨的。三个人当场顿悟，其中一个是你自己。', fx: { favor: { a: -3, b: -3, c: 10 }, contrib: 2, xp: 6 } } }
  ]
},
{
  id: 'sect_candidates', where: 'story', trigger: 'disc:candidates', sect: true, title: '拜师的孩子',
  text: '三个孩子跪在你门前：一个壮如牛犊，一跪磕裂了青砖；一个眼珠乱转，已数清你院里几株灵草；一个只盯着你腰间的剑。',
  choices: [
    { t: '收小牛犊',
      ok: { text: '孩子咧嘴又磕了三个头，又裂三块砖。执事默默记下：修缮费。', fx: { disc: { new: 'strong' } } } },
    { t: '收机灵鬼',
      ok: { text: '孩子立刻改口叫师父，又甜又响，顺口报了你院里灵草的数——少报了两株。', fx: { disc: { new: 'clever' } } } },
    { t: '收闷葫芦',
      ok: { text: '孩子第一句话：“师父的剑，能借我摸一下吗？”你解下剑递了过去。', fx: { disc: { new: 'quiet' } } } },
    { t: '都不收', dao: 'w',
      ok: { text: '各塞一把糖领回去。那个安静的，走远了还回头看你的剑。', fx: { xp: 1 } } }
  ]
},
{
  id: 'sect_succession', where: 'story', trigger: 'sect:heir', sect: true, title: '三处灯火',
  text: '圣子之争前夜，三位长老各派人来请：山顶看云的，后山干活的，灯下翻册的。站过去，往后有人替你说话。',
  choices: [
    { t: '去山顶',
      ok: { text: '那位长老只问“想不想要”。你说想，他把自己的玉佩系在了你腰上。', fx: { favor: { a: 30, b: -10, c: -10 } } } },
    { t: '去后山',
      ok: { text: '他挽着袖子头也不抬：“搭把手。”干到月上中天才说：“明天我替你说话。”', fx: { favor: { a: -10, b: 30, c: -10 } } } },
    { t: '去灯下',
      ok: { text: '他在写着你名字那页折了个角：“明日，照这页办。”灯花一爆，像盖了个印。', fx: { favor: { a: -10, b: -10, c: 30 } } } },
    { t: '哪也不去', dao: 'w',
      ok: { text: '你练了一夜剑，天亮时三处的灯都灭了。往后路慢些，但不欠谁。', fx: { flag: 'heir_none', xp: 3 } } }
  ]
},
{
  id: 'sect_lord_vote', where: 'story', trigger: 'sect:lord', sect: true, title: '继任',
  text: '老宗主要闭死关，殿上三只签筒，三位长老各握一支签。他看着你：“若差一支，你肯把镇宗之宝还回来，老夫补上这一票。”',
  choices: [
    { t: '听凭长老', dao: 'w',
      ok: { text: '签落进筒里，轻得像落雪。结果如何，都是你这些年一步步攒下的。', fx: { flag: 'lord_vote' } } },
    { t: '还回镇宗宝', dao: 'r',
      ok: { text: '你把那件宝物捧回宝库，擦了三遍才放下。老宗主笑了：“舍得，才坐得住这把椅子。”', fx: { flag: ['lord_vote', 'lord_gift'], favor: { a: 5, b: 5, c: 5 } } } },
    { t: '不服上台', duel: 1.2, dao: 'k',
      ok: { text: '你当众请战，站出来的三人没一个走完十招。签筒没动，殿里已没人说话。', fx: { flag: ['lord_vote', 'lord_duel'], favor: { a: 5, b: -5, c: -5 } } },
      fail: { text: '第三场被老长老逼平。他收剑：“刚猛有余。”这一票，还是投了你。', fx: { flag: 'lord_vote', inj: 2, favor: { b: 3 } } } }
  ]
},
{
  id: 'sect_traitor', where: 'home', visit: true, sect: true, srankMin: 6, once: true, title: '火漆',
  text: '截下的飞信封着天剑宗火漆，画着护山大阵三处阵眼，笔迹是宗里那位白头长老——当年还替你说过话。他正候在殿外。',
  choices: [
    { t: '当众拆信', dao: 'w',
      ok: { text: '他没辩解，自己摘下长老令。几位长老看你的眼神，敬里带着怕。', fx: { favor: { b: -8, c: 6 }, contrib: 3 } } },
    { t: '约他看云', dao: 'k',
      ok: { text: '回来的只有你一个。宗里只知他云游去了，只有你记得那句“对不住”。', fx: { karma: 'traitor', contrib: 1 } } },
    { t: '将计就计', p: 0.6,
      ok: { text: '你什么也没说，只让人把信里的阵眼换成假的。三个月后天剑宗夜袭，一头撞进了真阵。', fx: { flag: 'war_feint', contrib: 3 } },
      fail: { text: '假信递到第三封，他察觉后连夜叛逃，走前在案上留了一句真话。', fx: { contrib: 1, xp: 3 } } }
  ]
},

/* ============================================================
 * 二、宗门 · 太虚剑宗（6）：凌虚子 剑即一切 / 铁冶真人 器为剑骨 / 柳含烟 规矩大于天
 * ============================================================ */
{
  id: 'jian_lingxu_1', where: 'home', visit: true, sect: true, favorMin: ['lingxu', 20], once: true, title: '输掉的剑',
  text: '凌虚子指着剑阁一处空剑架：“我二十岁在剑冢输掉一把剑，赢我的是一块碑。去拿回来，拿不回来，替我看一眼。”',
  choices: [
    { t: '去剑冢取剑', duel: 1.1, dao: 'w',
      ok: { text: '剑插在碑缝里，满身那年留下的缺口。他接剑时手很稳，眼眶不稳。', fx: { favor: { lingxu: 15 }, xp: 4 } },
      fail: { text: '你只带回一截剑穗。他挂上空架：“我当年连这个都没拿回来。”', fx: { favor: { lingxu: 12 }, inj: 2 } } },
    { t: '拓碑回来', p: 0.6,
      ok: { text: '你拓回碑上那道剑痕，顺手挖了一袋陨铁。他看了半晌：“原来我输在这儿。”', fx: { favor: { lingxu: 5, tieye: 3 }, ore: 8 } },
      fail: { text: '拓纸碎成雪片，只抢回半袋陨铁。他笑了：“它脾气还那么大。”', fx: { favor: { lingxu: 3 }, ore: 4 } } },
    { t: '输了便罢', dao: 'k',
      ok: { text: '凌虚子沉默很久：“你说得对，也不对。”那天剑阁的灯，亮到了天明。', fx: { favor: { lingxu: -5 }, xp: 2 } } }
  ]
},
{
  id: 'jian_lingxu_2', where: 'home', visit: true, sect: true, favorMin: ['lingxu', 60], srankMin: 2, once: true, title: '第九层',
  text: '凌虚子要破格让你进剑阁第九层。柳含烟把门规拍在案上：“第九层的规矩，是掌门的师父定的。”两人同时看向你。',
  choices: [
    { t: '进第九层', p: 0.75, dao: 'k',
      ok: { text: '你踏进第九层，身后门规合上。柳含烟往后见你只点头；凌虚子借了你剑谱。', fx: { favor: { lingxu: 20, liu: -15 }, mastery: 10 } },
      fail: { text: '第八层楼梯已被执法弟子守住。凌虚子拍拍你：“下回。”她的眼神，你记下了。', fx: { favor: { lingxu: 10, liu: -15 } } } },
    { t: '先过考核', p: 0.5, dao: 'w',
      ok: { text: '先过执法堂三道考核再上楼。凌虚子哼了一声，柳含烟没反对——都有台阶下。', fx: { favor: { lingxu: 8, liu: 8 }, mastery: 5 } },
      fail: { text: '两人异口同声：“你是哪边的？”你在殿上站麻了腿，事情不了了之。', fx: { favor: { lingxu: -3, liu: -3 }, xp: 2 } } },
    { t: '弟子不敢议',
      ok: { text: '两位长老同时皱眉，又同时松开——谁也没输。第九层，改日再说。', fx: { xp: 3 } } }
  ]
},
{
  id: 'jian_tieye_1', where: 'home', visit: true, sect: true, favorMin: ['tieye', 20], once: true, title: '一块陨铁',
  text: '铁冶真人光着膀子从烧了七天的炉边出来，满手燎泡：“缺一块天外陨铁，拍卖会上偶尔见。”单子拍在你胸口，“替我弄来。”',
  choices: [
    { t: '去拍卖会买', cost: { stones: 10 }, dao: 'w',
      ok: { text: '你咬牙跟到最后一口。他一句谢没说，砸了一夜，顺手把你的剑淬了一遍。', fx: { favor: { tieye: 15 }, buff: { atk: 1.3, ticks: 8 } } } },
    { t: '拿灵矿熬', cost: { ore: 12 },
      ok: { text: '他骂你外行，熬了三天真熬出来了，余料打了把短刀给你。', fx: { favor: { tieye: 5 }, item: 'w' } } },
    { t: '弟子手头紧',
      ok: { text: '他收回单子：“行。”那天器堂的锤声格外响，像在骂人。', fx: { favor: { tieye: -5 } } } }
  ]
},
{
  id: 'jian_tieye_2', where: 'home', visit: true, sect: true, favorMin: ['tieye', 60], srankMin: 2, once: true, title: '一笔钱',
  text: '宗门今年只批得出一笔大钱。凌虚子要修剑阁，铁冶真人要买矿：“没有矿，剑阁挂的全是烧火棍。”最后一笔，你来落。',
  choices: [
    { t: '买矿', p: 0.75,
      ok: { text: '矿进了器堂，炉火一年没熄。剑阁漏雨的角，凌虚子自己搬梯子补了，没跟你说话。', fx: { favor: { tieye: 20, lingxu: -15 }, ore: 10 } },
      fail: { text: '掌门驳回了。铁冶真人拍拍你：“心意领了。”凌虚子那边，记下了。', fx: { favor: { tieye: 10, lingxu: -15 } } } },
    { t: '一半一半', p: 0.5, dao: 'w',
      ok: { text: '你量过剑阁的缺口，省出三成买矿。两位长老都嫌少，都签了字。', fx: { favor: { tieye: 8, lingxu: 8 } } },
      fail: { text: '剑阁修不好，矿也买不够。两位轮流来找你理论，你听了一下午。', fx: { favor: { tieye: -3, lingxu: -3 }, xp: 2 } } },
    { t: '只管算账',
      ok: { text: '掌门落笔修了剑阁。铁冶真人骂了三天，第四天来借你的剑试新炉。', fx: { xp: 2 } } }
  ]
},
{
  id: 'jian_liu_1', where: 'home', visit: true, sect: true, favorMin: ['liu', 20], once: true, title: '指认',
  text: '演武场上跪着一个外门弟子——入宗第一天，只有他给你留过一碗饭。柳含烟声音平平：“他私带灵谷下山。你在场，指认。”',
  choices: [
    { t: '如实指认', dao: 'w',
      ok: { text: '他被罚挑水三年，路过你时笑了：“那碗饭不亏。”柳长老头一回冲你点了头。', fx: { favor: { liu: 15 }, contrib: 1 } } },
    { t: '是我托他的', p: 0.5, dao: 'r',
      ok: { text: '柳含烟看了你三息：“下不为例。”袖中掉出一张山下人家的地址——她早就知道。', fx: { favor: { liu: 5 }, stones: -3, flag: 'liu_soft' } },
      fail: { text: '“当我是瞎的？”你被罚抄宗规。那晚，你门口多了一碗饭。', fx: { favor: { liu: -5 }, contrib: -1, xp: 2 } } },
    { t: '何必问我', dao: 'k',
      ok: { text: '柳含烟说：“因为我想知道你是什么人。”她在册子上记了一笔，没给你看。', fx: { favor: { liu: -5, lingxu: 5 } } } }
  ]
},
{
  id: 'jian_liu_2', where: 'home', visit: true, sect: true, favorMin: ['liu', 60], srankMin: 2, once: true, title: '私卖',
  text: '柳含烟把一柄刻着器堂暗记的剑掷在案上：“器堂私卖法器。”铁冶真人不躲不辩：“钱全买了矿。宗门不给，我自己挣。”',
  choices: [
    { t: '按门规办', p: 0.75, dao: 'w',
      ok: { text: '器堂封炉三月，铁冶真人罚抄门规，每一页都错同一个字——“矿”。', fx: { favor: { liu: 20, tieye: -15 }, contrib: 2 } },
      fail: { text: '掌门出面保下了器堂。柳含烟收了剑；铁冶真人看你，像看一块废铁。', fx: { favor: { liu: 10, tieye: -15 } } } },
    { t: '账目公开', p: 0.5,
      ok: { text: '照卖，账交执法堂，三成归公。柳含烟点头，铁冶真人骂了句“抠门”，也点了头。', fx: { favor: { liu: 8, tieye: 8 }, stones: 4 } },
      fail: { text: '一个说你开脱，一个说你多事。那柄剑最后挂在你墙上，谁也不肯收回。', fx: { favor: { liu: -3, tieye: -3 }, item: 'w' } } },
    { t: '弟子没看见',
      ok: { text: '柳含烟看了你很久，收起了剑。执法堂册子上，你那页多了一行小字。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 三、宗门 · 丹霞谷（6）：丹云婆婆 丹道济世 / 药尘子 草木有灵 / 赤松客 丹药就是买卖
 * ============================================================ */
{
  id: 'dan_yun_1', where: 'home', visit: true, sect: true, favorMin: ['yun', 20], once: true, title: '试丹',
  text: '丹云婆婆端来一颗青紫说不清的热丹：“新方子，治山下寒疫。老身也没把握，总得有人先吃。”',
  choices: [
    { t: '一口吞了', p: 0.6, dao: 'r',
      ok: { text: '一股暖意从脚底烧上头顶。婆婆写下“可用”，笔尖有点抖：“山下有救了。”', fx: { favor: { yun: 15 }, xp: 6, life: 2 } },
      fail: { text: '你浑身发冷躺了三天。婆婆把方子改了三遍：“第四遍，老身自己吃。”', fx: { favor: { yun: 15 }, toxin: 30, inj: 2 } } },
    { t: '先吃半颗', p: 0.7, dao: 'w',
      ok: { text: '半颗熬汤分作十份，九份见效。婆婆高兴，分了你一捆好灵草。', fx: { favor: { yun: 5 }, herbs: 6 } },
      fail: { text: '半颗不够劲。婆婆叹气：“药不能减，人也不能。”', fx: { favor: { yun: 2 }, xp: 2 } } },
    { t: '晚辈不敢',
      ok: { text: '婆婆自己吞了。第二天照常出诊，一只手始终揣在袖子里。', fx: { favor: { yun: -5 } } } }
  ]
},
{
  id: 'dan_yun_2', where: 'home', visit: true, sect: true, favorMin: ['yun', 60], srankMin: 2, once: true, title: '送与卖',
  text: '山下饥荒，丹云婆婆要把三年存丹全送下山。赤松客堵在丹房门口：“送一回，丹价就塌一回。明年谁还来炼？”',
  choices: [
    { t: '全送下山', p: 0.75, dao: 'r',
      ok: { text: '山下人管婆婆叫活菩萨。赤松客在账本上画了个大叉，往后见你绕着走。', fx: { favor: { yun: 20, chisong: -15 }, contrib: 2 } },
      fail: { text: '车刚出谷门就被截下一半。婆婆红着眼回来，看了你一眼，没说话。', fx: { favor: { yun: 10, chisong: -15 } } } },
    { t: '丹换米', p: 0.5,
      ok: { text: '一枚丹一斗米，米拿去赈灾，丹价没塌。婆婆说是生意，赤松客说是善事。', fx: { favor: { yun: 8, chisong: 8 }, stones: 3 } },
      fail: { text: '倒卖的黄牛先到了。山下人还是没吃上，你自掏腰包补了一车。', fx: { favor: { yun: -3, chisong: -3 }, stones: -6 } } },
    { t: '谷里的事',
      ok: { text: '最后送一半、卖一半，谁也不满意。山下来了封谢信，落款写的是丹霞谷。', fx: { xp: 2 } } }
  ]
},
{
  id: 'dan_yaochen_1', where: 'home', visit: true, sect: true, favorMin: ['yaochen', 20], once: true, title: '药园闹虫',
  text: '药园叶背爬满金甲虫。药尘子蹲在地头：“不能用药，草会苦。听说你养着灵宠？借我十二天，它吃虫，我管饭。”',
  choices: [
    { t: '借它去', p: 0.75, dao: 'r',
      ok: { text: '你的灵宠胖了一圈回来，浑身药香。药尘子说它是这些年最好的帮工。', fx: { favor: { yaochen: 15 }, petHeart: 1 } },
      fail: { text: '它连灵苗也啃了两垄。药尘子心疼得直抽气，还是喂饱了才送回来。', fx: { favor: { yaochen: 10 }, feed: 4 } } },
    { t: '拿兽粮引虫', cost: { feed: 6 },
      ok: { text: '一圈兽粮引出满满三罐金甲虫。晒干是好药引，药尘子分了你一罐。', fx: { favor: { yaochen: 5 }, yin: { wood: 2 } } } },
    { t: '弟子没空',
      ok: { text: '他又低头翻叶子。你走远回头，他还在一片一片地翻。', fx: { favor: { yaochen: -5 } } } }
  ]
},
{
  id: 'dan_yaochen_2', where: 'home', visit: true, sect: true, favorMin: ['yaochen', 60], srankMin: 2, once: true, title: '千年药王',
  text: '千年药王开花了。丹云婆婆要采：“一株能救一城人。”药尘子张臂挡在花前：“它活了一千年，就为了被人吃？”',
  choices: [
    { t: '留着它', p: 0.75,
      ok: { text: '婆婆拂袖而去。第二天一早，你门口多了一捧药王落下的花瓣。', fx: { favor: { yaochen: 20, yun: -15 }, herbs: 5 } },
      fail: { text: '谷主令一下，花还是被采走一朵。药尘子捧着剩下的花苞，一夜没睡。', fx: { favor: { yaochen: 10, yun: -15 } } } },
    { t: '只采三瓣', p: 0.5,
      ok: { text: '药王竟自己抖落三瓣。两位长老对着那三瓣花，都笑了。', fx: { favor: { yaochen: 8, yun: 8 }, yin: { wood: 1 } } },
      fail: { text: '药王合上花，再没开过。两位长老难得意见一致：是你吓着了它。', fx: { favor: { yaochen: -3, yun: -3 }, xp: 3 } } },
    { t: '不懂药',
      ok: { text: '两位长老吵到半夜，花被采走一朵。谁也没赢，谁也没输。', fx: { xp: 2 } } }
  ]
},
{
  id: 'dan_chisong_1', where: 'home', visit: true, sect: true, favorMin: ['chisong', 20], once: true, title: '第三排',
  text: '赤松客摇着扇子凑过来：“明日拍卖有一炉我送拍的丹。你坐第三排，我咳一声，你举一次牌。”扇面写着：童叟无欺。',
  choices: [
    { t: '照他说的举', p: 0.75,
      ok: { text: '价翻了一倍，最后一口你没跟。天剑宗买家咬牙付钱，赤松客扇子摇得飞快。', fx: { favor: { chisong: 15 }, stones: 3 } },
      fail: { text: '邻座认出了你：“丹霞谷的托？”满场哄笑。赤松客倒也没怪你。', fx: { favor: { chisong: 10 }, xp: 1 } } },
    { t: '自己也下场', p: 0.55, dao: 'k',
      ok: { text: '抬着抬着你真拍下了，转手进坊市还赚了。赤松客看你像看同行。', fx: { favor: { chisong: 5 }, stones: 8 } },
      fail: { text: '你一举牌，全场都不跟了。赤松客笑出眼泪，原价收回，还请你喝酒。', fx: { favor: { chisong: 5 }, xp: 2 } } },
    { t: '我不做托', dao: 'w',
      ok: { text: '“也是，你这张脸太正，坐第三排像来抓人的。”他换了人，丹照样卖了高价。', fx: { favor: { chisong: -5 }, xp: 1 } } }
  ]
},
{
  id: 'dan_chisong_2', where: 'home', visit: true, sect: true, favorMin: ['chisong', 60], srankMin: 2, once: true, title: '东坡',
  text: '赤松客摊开图：东坡正对新商道，“盖排铺面，租子够谷里吃十年。”药尘子在坡上按了个泥手印：“那里有三百年的老参。”',
  choices: [
    { t: '盖铺面', p: 0.75, dao: 'k',
      ok: { text: '铺面开张来了半城人。老参移到西头，药尘子守着它坐了一夜，没来剪彩。', fx: { favor: { chisong: 20, yaochen: -15 }, stones: 8 } },
      fail: { text: '婆婆在图上画了个叉。赤松客叹气：“你有眼光，没运气。”药尘子那边，记下了。', fx: { favor: { chisong: 10, yaochen: -15 } } } },
    { t: '挪到坡下', p: 0.5,
      ok: { text: '铺面挪到河滩，老参反倒成了招牌：“三百年老参园旁”。两位都满意。', fx: { favor: { chisong: 8, yaochen: 8 }, stones: 4 } },
      fail: { text: '河滩涨水淹了三间铺面。药尘子说这是河在骂人，你自掏腰包修了堤。', fx: { favor: { chisong: -3, yaochen: -3 }, stones: -5 } } },
    { t: '不懂生意',
      ok: { text: '这事拖了三年，老参又长了三年，赤松客的图纸卷了边。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 四、宗门 · 玄天道宗（6）：玄微子 道法自然 / 守拙道人 厚积薄发 / 清虚真人 顺天应时
 * ============================================================ */
{
  id: 'dao_xuanwei_1', where: 'home', visit: true, sect: true, favorMin: ['xuanwei', 20], once: true, title: '三问',
  text: '玄微子松下煮茶，问你：“山为什么不走？水为什么不停？”你都答了，他都笑。第三句想了很久：“你想做山，还是做水？”',
  choices: [
    { t: '做山', dao: 'w',
      ok: { text: '“山不走，所以不怕。”那盏茶你喝了一个时辰，喝完肩上稳了。', fx: { favor: { xuanwei: 10 }, mastery: 10 } } },
    { t: '做水', dao: 'r',
      ok: { text: '“水往低处走，是为了让高处的东西活。”他把整壶茶都给了你。', fx: { favor: { xuanwei: 10 }, xp: 5, life: 2 } } },
    { t: '做剑', dao: 'k',
      ok: { text: '玄微子大笑，泼茶入溪：“好，山水一起劈开。”递来一枚冷得像霜的松针。', fx: { favor: { xuanwei: 10 }, power: 0.01 } } }
  ]
},
{
  id: 'dao_xuanwei_2', where: 'home', visit: true, sect: true, favorMin: ['xuanwei', 60], srankMin: 2, once: true, title: '出山',
  text: '天剑宗又吞了两个小宗门。清虚真人观星说此时出手是逆天：“等它自己衰。”玄微子摇头：“等它衰了，被吞的人也死完了。”',
  choices: [
    { t: '随掌教出山', p: 0.75, dao: 'r',
      ok: { text: '你们救回两个小宗门的孩子。清虚真人烧了星图，说天机被搅乱了。', fx: { favor: { xuanwei: 20, qingxu: -15 }, xp: 4 } },
      fail: { text: '去晚一步，只救下一个孩子。真人没说“我早说过”，只把星盘转向了墙。', fx: { favor: { xuanwei: 10, qingxu: -15 }, xp: 2 } } },
    { t: '择吉时再去', p: 0.5,
      ok: { text: '三日后天剑宗内讧，你们去得正是时候，一个人也没折。', fx: { favor: { xuanwei: 8, qingxu: 8 }, xp: 4 } },
      fail: { text: '吉时算出来在三年后。掌教独自下了山；真人怪你多事，掌教怪你拖延。', fx: { favor: { xuanwei: -3, qingxu: -3 }, xp: 2 } } },
    { t: '听宗门的',
      ok: { text: '宗门议了九天，第十天天剑宗自己撤了兵。谁也说不清是不是那九天吓的。', fx: { xp: 3 } } }
  ]
},
{
  id: 'dao_shouzhuo_1', where: 'home', visit: true, sect: true, favorMin: ['shouzhuo', 20], once: true, title: '第四十七页',
  text: '守拙道人拿来一本夹着你旧借书签的书：“少了第四十七页。这书三百年只借出去过一次。”他没说是你拿的，也没说不是。',
  choices: [
    { t: '帮他找', p: 0.7, dao: 'w',
      ok: { text: '在丹炉底下找到了——当年被你垫了炉脚。他用米汤粘了一下午。', fx: { favor: { shouzhuo: 15 }, mastery: 6 } },
      fail: { text: '三天后他自己来了：“在我袖子里。”顿了顿，“谢谢你找了三天。”', fx: { favor: { shouzhuo: 12 }, xp: 2 } } },
    { t: '凭记忆默写', p: 0.55,
      ok: { text: '你默了一夜，一字不差。他对了三遍，夹进书里：“比原来的清楚。”', fx: { favor: { shouzhuo: 5 }, mastery: 12 } },
      fail: { text: '后半页是你编的。他在旁边批了四个字：“这样也通。”', fx: { favor: { shouzhuo: 5 }, mastery: 5 } } },
    { t: '记不清了',
      ok: { text: '他“嗯”了一声走了。往后半年，借书签上你的名字后面都多画一个圈。', fx: { favor: { shouzhuo: -5 } } } }
  ]
},
{
  id: 'dao_shouzhuo_2', where: 'home', visit: true, sect: true, favorMin: ['shouzhuo', 60], srankMin: 2, once: true, title: '铁匣',
  text: '铁匣里是三百年收缴的禁术。守拙道人要封死：“学会易，学好难。”玄微子要打开：“凭什么这本不能看？”钥匙在你手里。',
  choices: [
    { t: '浇铁封死', p: 0.75, dao: 'w',
      ok: { text: '守拙道人在匣上贴字条：“等你们配得上。”玄微子许久没再找你下棋。', fx: { favor: { shouzhuo: 20, xuanwei: -15 }, mastery: 6 } },
      fail: { text: '掌教一掌拍开一道缝。缝封上了，掌教的脸色也封上了。', fx: { favor: { shouzhuo: 10, xuanwei: -15 } } } },
    { t: '师徒同看', p: 0.5,
      ok: { text: '长老带弟子同看，看完对答。两人在铁匣前坐了一个月。', fx: { favor: { shouzhuo: 8, xuanwei: 8 }, mastery: 6 } },
      fail: { text: '规矩刚定就有弟子撬锁，书丢了一页。两位长老都没骂你，这更难受。', fx: { favor: { shouzhuo: -3, xuanwei: -3 }, xp: 2 } } },
    { t: '放下钥匙',
      ok: { text: '那只铁匣至今没开，钥匙至今没人收，就在桌上落灰。', fx: { xp: 2 } } }
  ]
},
{
  id: 'dao_qingxu_1', where: 'home', visit: true, sect: true, favorMin: ['qingxu', 20], once: true, title: '命宫有星',
  text: '清虚真人半夜敲门，星盘还在转：“你命宫有星在冲，三月内有一劫。最稳的避法是闭门不出。当然，你也可以不信。”',
  choices: [
    { t: '闭门三月', cost: { stones: 4 }, dao: 'w',
      ok: { text: '出关那天听说，你常走的山道塌了。真人在星盘上轻轻抹去一个点。', fx: { favor: { qingxu: 15 }, xp: 6 } } },
    { t: '往劫里走', p: 0.5, dao: 'k',
      ok: { text: '山崩时你一剑劈开落石，石心滚出一块星铁。真人看了很久：“星也会让路。”', fx: { favor: { qingxu: 5 }, ore: 8 } },
      fail: { text: '你被埋了半个时辰。爬出来时真人坐在石头上，递来一壶水：“劫过了。”', fx: { favor: { qingxu: 5 }, inj: 3 } } },
    { t: '多谢，不必',
      ok: { text: '“不信也好，信了反倒怕。”三月后你摔了一跤磕破膝盖，想起他，笑了。', fx: { favor: { qingxu: -5 }, xp: 2 } } }
  ]
},
{
  id: 'dao_qingxu_2', where: 'home', visit: true, sect: true, favorMin: ['qingxu', 60], srankMin: 2, once: true, title: '说与不说',
  text: '清虚真人算出外门一个扫地的小弟子明年有死劫，要去告诉他。守拙道人拦住：“说了，他这一年就活不成人了。”',
  choices: [
    { t: '告诉他', p: 0.75,
      ok: { text: '他扫帚没停，第二天去学了一门遁法。到了那天，他遁得很快。', fx: { favor: { qingxu: 20, shouzhuo: -15 }, contrib: 1 } },
      fail: { text: '他扫帚掉了，一年没睡过整觉。劫躲过了，守拙道人看你的眼神很淡。', fx: { favor: { qingxu: 10, shouzhuo: -15 } } } },
    { t: '只说别去北山', p: 0.5,
      ok: { text: '他照做了。守拙道人点头，清虚真人也点头。', fx: { favor: { qingxu: 8, shouzhuo: 8 }, xp: 3 } },
      fail: { text: '他以为北山有宝贝，偷偷去了。你把他拎回来，那一劫落在了你身上。', fx: { favor: { qingxu: 3, shouzhuo: 3 }, inj: 3 } } },
    { t: '让他扫地', dao: 'w',
      ok: { text: '那天下了场大雨，他躲进藏经阁避雨，看了一夜书。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 五、宗门 · 血煞魔宗（6）：血河老祖 强者为尊 / 鬼医薛三 毒亦是药 / 幽姬 人心可用
 * ============================================================ */
{
  id: 'mo_xuehe_1', where: 'home', visit: true, sect: true, favorMin: ['xuehe', 20], once: true, title: '血令',
  text: '血河老祖丢来一枚血令：“城南有个卷了丹方的叛徒，提头来见。”令背的画像，是从前总给{ye}留一壶酒的老酒保。',
  choices: [
    { t: '提头来见', duel: 1.0, dao: 'k',
      ok: { text: '老酒保给你倒了最后一壶，血河老祖大笑。那壶酒你没喝，埋在了城南。', fx: { favor: { xuehe: 15 }, karma: 'jiubao' } },
      fail: { text: '你被一只酒坛砸出了门。血河老祖却赏了你：“还知道疼，有救。”', fx: { favor: { xuehe: 12 }, inj: 2 } } },
    { t: '只取回丹方', p: 0.6, dao: 'r',
      ok: { text: '老酒保连夜出城。血河老祖翻着丹方冷笑：“心软的人，丹方倒拿得回来。”', fx: { favor: { xuehe: 5 }, recipe: 'baoqi' } },
      fail: { text: '你被罚泡了三天血池。后来有人托送来一坛酒，没署名。', fx: { inj: 2, xp: 2 } } },
    { t: '这令我不接',
      ok: { text: '血河老祖眯起眼，没再说话。第二天换了人去，回来时袖口带血，看你的眼神很怪。', fx: { favor: { xuehe: -5 } } } }
  ]
},
{
  id: 'mo_xuehe_2', where: 'home', visit: true, sect: true, favorMin: ['xuehe', 60], srankMin: 2, maxR: 7, once: true, title: '分坛',
  text: '宗门要拿下正道一座分坛。血河老祖拍碎沙盘：“杀干净。”幽姬拈起一面小旗：“里面有三个是我的人。”两人都看着你。',
  choices: [
    { t: '打进去', duel: 1.1, dao: 'k',
      ok: { text: '一夜拔旗。幽姬的人死了一个，她把那面小旗收进了袖子。', fx: { favor: { xuehe: 20, youji: -15 }, stones: 5 } },
      fail: { text: '你带伤撤回。老祖骂你没用；幽姬清点名单，在一个名字上停了很久。', fx: { favor: { xuehe: 8, youji: -15 }, inj: 2 } } },
    { t: '里应外合', p: 0.5,
      ok: { text: '里面开门，外面喊杀，半个时辰破坛，谁的人都没折。', fx: { favor: { xuehe: 8, youji: 8 }, stones: 5 } },
      fail: { text: '门开早了一刻。仗打赢了，两边的人却在门口打起来，你拉了一夜架。', fx: { favor: { xuehe: -3, youji: -3 }, inj: 1 } } },
    { t: '怎么打都行',
      ok: { text: '老祖赢了，打得很难看。幽姬战后清点名单，在你名字旁停了一下。', fx: { xp: 3 } } }
  ]
},
{
  id: 'mo_xuesan_1', where: 'home', visit: true, sect: true, favorMin: ['xuesan', 20], once: true, title: '一碗黑汤',
  text: '鬼医薛三的药房没有窗，陶罐里泡着说不清的东西。他递来一碗黑汤，笑得很和气：“新方子。不喝也不怪你——我去找别人。”',
  choices: [
    { t: '喝', p: 0.6, dao: 'k',
      ok: { text: '像吞了一条冰蛇，出一身黑汗，筋骨轻了三分。薛三画了个圈。', fx: { favor: { xuesan: 15 }, yin: { soul: 1 }, xp: 4 } },
      fail: { text: '你吐了三天，吐出的东西把地砖蚀了个坑。薛三很高兴：“有用，有用。”', fx: { favor: { xuesan: 15 }, yin: { soul: 1 }, toxin: 30 } } },
    { t: '鬼医先请', p: 0.6, dao: 'w',
      ok: { text: '薛三愣了愣，大笑着喝了半碗，又给你配了一副解毒的方子：“你这人，能活得久。”', fx: { favor: { xuesan: 5 }, recipe: 'qingdu' } },
      fail: { text: '薛三喝了半碗，把碗推回来：“该你了。”你苦得三天没说话。', fx: { favor: { xuesan: 5 }, yin: { soul: 1 }, toxin: 15 } } },
    { t: '你找别人吧',
      ok: { text: '薛三也不强求，掀帘喊了一声。进来一个面黄肌瘦的外门弟子，冲你笑了笑，接过了碗。', fx: { favor: { xuesan: -5 } } } }
  ]
},
{
  id: 'mo_xuesan_2', where: 'home', visit: true, sect: true, favorMin: ['xuesan', 60], srankMin: 2, maxR: 7, once: true, title: '十二个人',
  text: '血牢关着十二个正道俘虏。薛三要炼药：“活人入药最好。”血河老祖要放：“放回去的人会怕。”俘虏在牢里听着。',
  choices: [
    { t: '交给鬼医', p: 0.75, dao: 'k',
      ok: { text: '十二个人进了药房，出来十二瓶药。你分到的那瓶，搁在了架子最高处。', fx: { favor: { xuesan: 20, xuehe: -15 }, karma: 'qiulao', pills: 1 } },
      fail: { text: '血河老祖抢先开了牢门。薛三看着空牢摇扇子：“欠我一回。”', fx: { favor: { xuesan: 10, xuehe: -15 } } } },
    { t: '喂毒再放', p: 0.5,
      ok: { text: '每人一颗慢毒放回：每月回来领解药，顺带捎消息。两位都说这主意毒——是夸你。', fx: { favor: { xuesan: 8, xuehe: 8 } } },
      fail: { text: '毒下重了，三个没撑到山门。老祖骂你手软，薛三骂你手重。', fx: { favor: { xuesan: -3, xuehe: -3 }, karma: 'qiulao' } } },
    { t: '我不掺和',
      ok: { text: '第二天血牢空了，你没问去了哪儿。夜里你梦见过一次牢门。', fx: { xp: 2 } } }
  ]
},
{
  id: 'mo_youji_1', where: 'home', visit: true, sect: true, favorMin: ['youji', 20], once: true, title: '一句假话',
  text: '幽姬替你斟酒：“丹霞谷有位长老每月初一在山下喝茶。去坐他对面，说血煞魔宗要往西去。”她笑笑，“其实我们往东。”',
  choices: [
    { t: '照她说的去', p: 0.75,
      ok: { text: '长老听完看了你很久，起身结账。三天后，正道人马全去了西边。', fx: { favor: { youji: 15 }, stones: 4 } },
      fail: { text: '长老笑了：“告诉幽姬，换个生面孔。”幽姬也笑，算你一半的功。', fx: { favor: { youji: 10 }, xp: 2 } } },
    { t: '再添句真话', p: 0.5, dao: 'r',
      ok: { text: '你又低声补了句：“东边的村子，早些搬。”长老塞给你一只锦囊。幽姬只笑了笑。', fx: { favor: { youji: 5 }, stones: 8 } },
      fail: { text: '你被当场扣下。幽姬捞了你一夜：“想当好人，先跟我说一声。”', fx: { inj: 1, xp: 2 } } },
    { t: '我不说谎', dao: 'w',
      ok: { text: '幽姬换了人去。那人说的是真话——正道照样去了西边。', fx: { favor: { youji: -5 }, xp: 2 } } }
  ]
},
{
  id: 'mo_youji_2', where: 'home', visit: true, sect: true, favorMin: ['youji', 60], srankMin: 2, once: true, title: '字条',
  text: '圣火下落漏了出去。幽姬把字条拍在薛三药案上：“你的字。”薛三摇扇：“字是我的，话不是我说的。”你最后见过那张字条。',
  choices: [
    { t: '是鬼医', p: 0.75,
      ok: { text: '薛三没辩解，关了药房三个月。那药童后来不见了，你没敢问。', fx: { favor: { youji: 20, xuesan: -15 } } },
      fail: { text: '药童扑通跪下认了。幽姬放过了薛三，薛三却记住了你。', fx: { favor: { youji: 10, xuesan: -15 } } } },
    { t: '泡字条', p: 0.5,
      ok: { text: '墨迹褪了一层，底下是另一个人的笔迹。两人对视一眼，同时冷笑。', fx: { favor: { youji: 8, xuesan: 8 }, xp: 4 } },
      fail: { text: '字条泡烂了，两人都认定你包庇对方。那一个月，你的饭里总有点怪味。', fx: { favor: { youji: -3, xuesan: -3 }, toxin: 10 } } },
    { t: '没看清',
      ok: { text: '幽姬笑了，薛三也笑了，你后背一层汗。这事不了了之，像魔宗大多数事一样。', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 六、宗门 · 徒弟（12）
 * ============================================================ */
{
  id: 'disc_first_day', where: 'story', trigger: 'disciple', sect: true, maxR: 7, speaker: 'elder', title: '第一个问题',
  text: '新徒弟磕完头，憋出第一个问题：“师父，您当年真是被赶出来的吗？”老祖笑得直抖：“本座也想听你怎么答。”',
  choices: [
    { t: '是，要争气', dao: 'w',
      ok: { text: '徒弟用力点头，当晚就在院子里扎了两个时辰的马步，把你养的灵兔吓得不敢出窝。', fx: { flag: 'disc_strict', xp: 2 } } },
    { t: '是，不丢人', dao: 'r',
      ok: { text: '徒弟笑出一口白牙。从那天起什么都敢来问，包括一些你也不懂的。', fx: { flag: 'disc_warm', xp: 2 } } },
    { t: '谁说的？', dao: 'k',
      ok: { text: '徒弟报了七个名字，你一个个记下。老祖叹气：“为师第一课，别带徒弟一起记仇。”', fx: { flag: 'disc_wild', xp: 2 } } }
  ]
},
{
  id: 'disc_trouble', where: 'story', trigger: 'disc:trouble', sect: true, title: '破鼓',
  text: '天没亮，执法堂的登闻鼓响了九下，第十下鼓面破了。徒弟攥着鼓槌一脸无辜：“我想看看长老长什么样。”',
  choices: [
    { t: '是我让敲的', dao: 'r',
      ok: { text: '你替徒弟领了罚。他眼圈红了，往后三个月，鼓槌碰都没碰。', fx: { favor: { a: -3, c: -3 }, disc: { heart: 1 } } } },
    { t: '罚抄门规', dao: 'w',
      ok: { text: '徒弟抄了三百遍门规，抄到第两百遍时忽然安静下来，抄完自己去把鼓面补好了。', fx: { disc: { grow: 0.05 } } } },
    { t: '赔鼓赔罪', cost: { stones: 2 },
      ok: { text: '执事收下新鼓，敲了敲徒弟的脑袋：“下回想见长老，递帖子。”', fx: { disc: { heart: 1, grow: 0.02 } } } }
  ]
},
{
  id: 'disc_question', where: 'story', trigger: 'disc:question', sect: true, maxR: 7, title: '答不上来',
  text: '徒弟问：“灵气生于天地，那天地的灵气又从哪儿来？”你张了张嘴，没说出话。戒指里也安静得出奇。',
  choices: [
    { t: '我也不知道', dao: 'r',
      ok: { text: '“那我们一起想。”你们在院里坐到半夜，谁也没想出来，却都觉得通了一点。', fx: { mastery: 8, disc: { grow: 0.05 } } } },
    { t: '糊弄过去', p: 0.5, dao: 'k',
      ok: { text: '你说：“这得筑基以后才知道。”徒弟信了，从此练功格外卖力——为了早点知道。', fx: { disc: { grow: 0.05 } } },
      fail: { text: '“可师父早就筑基了呀。”你罚他扎马步。他扎着马步，还在想。', fx: { xp: 2 } } },
    { t: '让老祖答',
      ok: { text: '老祖从开天讲到辟地，讲完问：“懂了吗？”徒弟摇头，你也摇头。', fx: { xp: 3, disc: { heart: 1 } } } }
  ]
},
{
  id: 'disc_steal', where: 'story', trigger: 'disc:steal', sect: true, title: '亲炼',
  text: '坊市有人吆喝“{name}亲炼”，价钱是你的两倍。摊主是你徒弟，账本上连哪炉是你哪天炼的都记着。',
  choices: [
    { t: '三七分账',
      ok: { text: '你分回他三成：“往后洞府的买卖归你管。”他当晚就把账本重抄了一遍。', fx: { stones: 6, disc: { job: 0.1 } } } },
    { t: '重罚', dao: 'w',
      ok: { text: '他跪着睡着了，醒来烧了账本，眼神比从前老实。', fx: { disc: { grow: 0.03, heart: -1 } } } },
    { t: '夸他', dao: 'k',
      ok: { text: '“记得比我清楚。”他笑得像偷着了鸡。往后他卖得更贵，你炼得更勤。', fx: { stones: 4, disc: { heart: 1 } } } }
  ]
},
{
  id: 'disc_obsess', where: 'story', trigger: 'disc:obsess', sect: true, title: '走火',
  text: '徒弟进静室三天没出来，门缝里灵气忽冷忽热。你推门一看：他七窍渗血，嘴角却挂着笑，像看见了好东西。',
  choices: [
    { t: '一掌打断', dao: 'w',
      ok: { text: '他喷出一口黑血，哭着说：“差一点就看到了。”你说：“看到了，你就没了。”', fx: { disc: { inj: 4 } } } },
    { t: '替他护法', p: 0.55, dao: 'k',
      ok: { text: '你坐在他身后，把乱窜的灵气一缕缕捋顺。第四天清晨他睁开眼，境界跳了一层。', fx: { disc: { lv: 1 } } },
      fail: { text: '灵气炸开，你们都被掀翻。他伤得很重，醒来第一句：“我看到了。”', fx: { disc: { inj: 12 }, inj: 1 } } }
  ]
},
{
  id: 'disc_pride', where: 'story', trigger: 'disc:pride', sect: true, title: '半息空门',
  text: '演武场上，徒弟当众开口：“师父那一式收剑太慢，左肋有半息空门。”你心里过了一遍——他说得对。',
  choices: [
    { t: '当众认下', dao: 'r',
      ok: { text: '你说：“对。”当场改了那一式。他低下头，耳根有点红。', fx: { mastery: 10, contrib: 1, disc: { heart: 1 } } } },
    { t: '回屋再说', dao: 'w',
      ok: { text: '“下回私下说。”他梗着脖子：“当众说，师父才改得快。”你没反驳。', fx: { disc: { grow: 0.05 } } } },
    { t: '与他过招', duel: 0.8, dao: 'k',
      ok: { text: '他一剑刺来，你侧身让过，剑尖点在他左肋同一处。他深深一揖。', fx: { mastery: 6, disc: { grow: 0.05 } } },
      fail: { text: '他真刺中了。你笑：“好徒弟。”他那夜偷偷给你送了三回药。', fx: { inj: 1, disc: { heart: 1 } } } }
  ]
},
{
  id: 'disc_kind', where: 'story', trigger: 'disc:kind', sect: true, title: '散尽的丹',
  text: '徒弟把月初的丹药全送给了山下病人，自己练功缺丹，憋得脸色发青：“师父，我不饿……我是说，我不缺。”',
  choices: [
    { t: '分徒弟一半', cost: { pills: 1 }, dao: 'r',
      ok: { text: '“你送人，我送你，账就平了。”徒弟这才接过去。', fx: { disc: { heart: 1, grow: 0.03 } } } },
    { t: '教徒弟量力', dao: 'w',
      ok: { text: '“救人得先活着。”下个月，徒弟果然只送了一半。', fx: { disc: { grow: 0.05 } } } },
    { t: '下山义诊', dao: 'r',
      ok: { text: '病人退烧那天{su}也来了，看看你，又看看徒弟：“教得还行。”', fx: { busy: 4, aff: { su: 5 }, disc: { heart: 1 }, xp: 2 } } }
  ]
},
{
  id: 'disc_lazy', where: 'story', trigger: 'disc:lazy', sect: true, title: '没砍的柴',
  text: '徒弟砍柴回来一根柴没有，衣襟一掀：一只耳尖带白月牙的小兔正舔他下巴。“师父，它跟了我一路。”',
  choices: [
    { t: '留下吧',
      ok: { text: '小兔在你院里转了三圈，挑中你的鞋当了窝。徒弟松了口气，第二天一口气砍回六捆柴。', fx: { pet: 'p_tu' } } },
    { t: '送回去', dao: 'w',
      ok: { text: '他一步三回头送回小兔，摸黑砍了三捆柴。第二天门口多了一把带露的灵草。', fx: { disc: { grow: 0.03 }, herbs: 2 } } }
  ]
},
{
  id: 'disc_poach', where: 'story', trigger: 'disc:poach', sect: true, title: '一张礼单',
  text: '万法阁许你徒弟亲传之位、三件法宝、一座洞府。他把礼单原封拿来：“师父，您说呢？”他的手很稳。',
  choices: [
    { t: '留下我教你', dao: 'r',
      ok: { text: '你把压箱底的那门功法抄给了他。他从头看到尾，把礼单撕成两半：“万法阁没有这个。”', fx: { disc: { grow: 0.1, heart: 1 } } } },
    { t: '去吧', dao: 'w',
      ok: { text: '“高处风景好，去看看。”他磕了三个头才走。后来万法阁送来重礼，说是替他还的人情。', fx: { stones: 15, flag: 'disc_favor', disc: { out: true } } } },
    { t: '你自己选', p: 0.6,
      ok: { text: '他拿着礼单在门口站了一夜。天亮时，礼单被叠成一只纸鹤，飞回了万法阁。', fx: { disc: { heart: 1, grow: 0.03 } } },
      fail: { text: '他选了万法阁，临走把院子扫得干干净净。后来每年都回来一次。', fx: { stones: 8, disc: { out: true } } } }
  ]
},
{
  id: 'disc_break', where: 'story', trigger: 'disc:break', sect: true, title: '冲关',
  text: '徒弟要冲关了，蒲团摆正又摆歪，探出头：“师父……您忙吗？”手指在门框上抠出了印子。',
  choices: [
    { t: '我守着你', dao: 'r',
      ok: { text: '你在静室外坐了两个周天。他破关出来，第一眼找的是你，第二眼才去看自己的手。', fx: { busy: 2, disc: { lv: 1, heart: 1 } } } },
    { t: '给他破境丹', cost: { pills: 1 }, dao: 'w',
      ok: { text: '你把丹放进他掌心，拍了拍他的肩。他攥着丹进去，冲关很顺，出来时说那丹是甜的。', fx: { disc: { lv: 1 } } } },
    { t: '自己闯', p: 0.5, dao: 'k',
      ok: { text: '他一个人闯过了那道关，满身是汗，眼神像换了个人。', fx: { disc: { lv: 1, grow: 0.1 } } },
      fail: { text: '他没冲过去，被关口弹了回来，躺了三天。第四天爬起来，又把蒲团摆正了：“再来。”', fx: { disc: { inj: 3, grow: 0.03 } } } }
  ]
},
{
  id: 'disc_avenge', where: 'story', trigger: 'disc:avenge', sect: true, title: '带血的箭',
  text: '一支带血的箭钉在门上，绑着徒弟的发带：“你欠我家的，拿你徒弟还。三日后黑风岭断崖，一个人来。”写的人手在抖。',
  choices: [
    { t: '一个人去', duel: 1.2, dao: 'k',
      ok: { text: '断崖上的人比你想的年轻。你救回徒弟没杀他，他跪在崖边哭，说他爹当年死在你手里。', fx: { unkarma: 'any', disc: { heart: 1 }, xp: 3 } },
      fail: { text: '你后背挨了一箭。徒弟背着你边哭边说：“师父，是我拖累了您。”', fx: { inj: 3, disc: { heart: 1 } } } },
    { t: '带宗门的人', dao: 'w',
      ok: { text: '仇家束手就擒，徒弟毫发无伤。只是私怨动了公器，你在长老面前矮了半截。', fx: { favor: { a: -5, c: -5 }, disc: { heart: 1 } } } },
    { t: '赔礼道歉', cost: { stones: 10 }, dao: 'r',
      ok: { text: '仇家放了人，拿着赔礼走了。没说原谅，也没再回来。', fx: { unkarma: 'any' } } }
  ]
},
{
  id: 'disc_graduate', where: 'story', trigger: 'disc:graduate', sect: true, title: '辞行',
  text: '徒弟结丹第七天来辞行，穿着拜师那天的颜色。磕完头没起来：“师父，徒儿走前，还想讨一样东西。”',
  choices: [
    { t: '赠剑',
      ok: { text: '你把佩了多年的剑解下来给他。他捧着剑走出山门，走到拐角，回身把剑举了举。', fx: { disc: { out: true }, flag: 'grad_sword' } } },
    { t: '赠一句话',
      ok: { text: '“往后别回头看我。”他果然一次没回头。你一直看到看不见。', fx: { disc: { out: true }, flag: 'grad_word' } } },
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
  text: '{su}捎来药单：疫镇的孩子入冬又咳了。“缺灵草、长生藤木引，还有一个肯陪我熬夜的人。”最后一句划掉了，没划干净。',
  choices: [
    { t: '把药送去', cost: { herbs: 6, yin: { wood: 1 } },
      ok: { text: '满满一篓送下山。{su}只回两个字：“够了。”随信一包润肺糖。', fx: { aff: { su: 15 }, life: 2, flag: 'su_q1_done' } } },
    { t: '捎一袋灵石',
      ok: { text: '回信很快：“钱收了，药我自己买。人不来就算了，反正也没指望。”', fx: { stones: -3, aff: { su: 5 }, flag: 'su_q1_done' } } },
    { t: '陪着熬', dao: 'r',
      ok: { text: '你煎药、喂药、背孩子。最后一夜{su}趴在药碾上睡着了，脸上沾着药粉。', fx: { busy: 4, aff: { su: 20 }, life: 3, flag: 'su_q1_done' } } }
  ]
},
{
  id: 'su_q2', where: 'home', visit: true, npc: 'su', speaker: 'su', aff: [80, 100], need: ['su_bond'], minR: 3, once: true, title: '不问来路',
  text: '{su}半夜借你的密室，担架上是个胸口开洞的血煞魔修。“别问。伤在哪，我就治哪。这事传出去，我在丹霞谷就待不下去了。”',
  choices: [
    { t: '搭把手', p: 0.7, dao: 'r',
      ok: { text: '天亮时魔修醒了，留下一枚血玉令：“血煞魔宗，欠你们一条命。”', fx: { aff: { su: 15 }, favor: { a: -3, c: -3 }, flag: ['su_q2_done', 'mo_owe'] } },
      fail: { text: '那人没撑到天亮。{su}坐在密室门口，很久才开口：“谢谢你没问。”', fx: { aff: { su: 15 }, flag: 'su_q2_done' } } },
    { t: '我没看见',
      ok: { text: '你递过钥匙，回屋蒙头就睡。第二天桌上一包药，字条写：“你什么都没看见。”', fx: { aff: { su: 10 }, life: 2, flag: 'su_q2_done' } } },
    { t: '劝{su}别管', dao: 'w',
      ok: { text: '“那是魔修。”{su}沉默很久：“我知道。”还是把人抬去了别处，半月没再来。', fx: { aff: { su: -10 }, flag: 'su_q2_done' } } }
  ]
},
{
  id: 'su_end', where: 'home', visit: true, npc: 'su', speaker: 'su', aff: [90, 100], need: ['su_q2_done'], not: ['daolv_ye'], minR: 5, once: true, weight: 2, title: '济世堂',
  text: '丹云婆婆点了{su}继任济世堂，坐堂谷中，从此不再下山。{su}站在你门口，什么也没说，只把药箱从左手换到了右手。',
  choices: [
    { t: '留下来', p: 0.7,
      ok: { text: '“山下也有病人。”{su}看了你很久，放下药箱：“那你得管饭。”', fx: { aff: { su: 10 }, flag: 'su_stay' } },
      fail: { text: '{su}摇头：“你留得住我，留不住那些病人。”笑着上了车，“可别病着来找我。”', fx: { aff: { su: 5 }, flag: 'su_apart' } } },
    { t: '送你回去', dao: 'r',
      ok: { text: '{su}上车前回头：“下辈子，换你来找我。”你在山门站到天黑。', fx: { aff: { su: 10 }, title: '济世堂旧友', flag: 'su_qianyuan' } } },
    { t: '去丹霞谷要人', duel: 1.2, dao: 'k',
      ok: { text: '你打进济世堂门口：“人我带走，病人我也管。”婆婆看了半天，笑了：“堂，可以搬。”', fx: { aff: { su: 15 }, flag: ['su_stay', 'su_tang'] } },
      fail: { text: '七位执事拦下了你。{su}边骂边哭替你包扎：“谁要你来抢了！”', fx: { inj: 3, aff: { su: 12 }, flag: 'su_stay' } } }
  ]
},
{
  id: 'su_left', where: 'home', visit: true, npc: 'su', speaker: 'su', need: ['daolv_ye', 'su_tea'], once: true, title: '一瓶药',
  text: '{su}没进门，把一只青瓷瓶搁在门槛上：“治内伤的。方子改过了，不苦。”说完转身就走。',
  choices: [
    { t: '收下',
      ok: { text: '{su}下山的步子很稳，一次没回头。那瓶药，你一直没舍得用。', fx: { aff: { su: 5 }, pills: 1, flag: 'su_left_done' } } },
    { t: '想解释', dao: 'w',
      ok: { text: '“不用解释。我是医修，看得出谁过得好。”{su}笑了一下，比从前好看。', fx: { aff: { su: 3 }, xp: 3, flag: 'su_left_done' } } }
  ]
},

/* ---------- {ye} ---------- */
{
  id: 'ye_q1', where: 'home', visit: true, npc: 'ye', speaker: 'ye', aff: [40, 100], need: ['ye_debt'], minR: 2, once: true, title: '不许问',
  text: '{ye}倚着门框抛一颗火红果子：“借两颗赤炎果炼爆气丹。干什么用——不许问。就这一回，你信不信我？”',
  choices: [
    { t: '给，不问', cost: { yin: { fire: 2 } }, p: 0.6, dao: 'r',
      ok: { text: '半月后听说，魔门一座地牢被炸开，跑出三十多个孩子，没人知道是谁干的。', fx: { aff: { ye: 15 }, flag: 'ye_q1_done' } },
      fail: { text: '半月后坊市出了桩血案，死者胸口有爆气丹的焦痕。你没问，{ye}也没说。', fx: { aff: { ye: 15 }, karma: 'ye_pill', flag: 'ye_q1_done' } } },
    { t: '干什么用？', dao: 'w',
      ok: { text: '{ye}的笑淡了：“替我娘报仇。”把果子抛回来，“算了，不借了。”', fx: { aff: { ye: -5 }, flag: ['ye_q1_done', 'ye_truth'] } } },
    { t: '悄悄跟着', duel: 1.1, dao: 'k',
      ok: { text: '你撞上{ye}被围，两人背靠背杀出。{ye}瞪你：“不是说好不问？”“我没问。”', fx: { aff: { ye: 12 }, xp: 4, flag: 'ye_q1_done' } },
      fail: { text: '你跟丢了还被追了三十里。{ye}坐在你屋顶：“跟踪的本事真差。”扔下一瓶伤药。', fx: { inj: 2, aff: { ye: 8 }, flag: 'ye_q1_done' } } }
  ]
},
{
  id: 'ye_q2', where: 'home', visit: true, npc: 'ye', speaker: 'ye', aff: [80, 100], need: ['ye_bond'], minR: 4, once: true, title: '血契',
  text: '{ye}掌心一张血契：圣宗还{ye}自由，只要你手上的戒指。“我没打算拿，”眼睛却盯着戒指，“可我想知道，你肯不肯给。”',
  choices: [
    { t: '做一枚假的', p: 0.55, dao: 'w',
      ok: { text: '假戒骗过了圣宗三天，血契作废。{ye}捏着那张废纸笑了一整夜。', fx: { aff: { ye: 15 }, flag: ['ye_q2_done', 'ye_free'] } },
      fail: { text: '假戒第二天就被识破。你们一起被追了三百里，跑着跑着都笑出了声。', fx: { inj: 2, aff: { ye: 12 }, flag: 'ye_q2_done' } } },
    { t: '伸手让你拿', dao: 'r',
      ok: { text: '{ye}的指尖碰到戒指，停了很久，只替你把它转正：“傻子。”血契进了火盆。', fx: { aff: { ye: 20 }, flag: 'ye_q2_done' } } },
    { t: '一起反出去', duel: 1.2, dao: 'k',
      ok: { text: '“要自由，我陪你去抢。”那一夜，圣宗少了两块门匾，多了两个通缉的名字。', fx: { aff: { ye: 15 }, flag: ['ye_q2_done', 'ye_defect'] } },
      fail: { text: '杀到第三道山门就被逼回。{ye}靠着你喘气：“值了，头一回有人陪我闯。”', fx: { inj: 3, aff: { ye: 15 }, flag: ['ye_q2_done', 'ye_defect'] } } }
  ]
},
{
  id: 'ye_end', where: 'home', visit: true, npc: 'ye', speaker: 'ye', aff: [90, 100], need: ['fire_5'], not: ['daolv_su'], minR: 5, once: true, weight: 2, title: '十年',
  text: '圣火的事了了，{ye}的火毒也去了，连同大半寿元。“还剩十年。够喝三千坛酒，看十回灯会。”掰到最后一根手指，没掰下去。',
  choices: [
    { t: '去东海找药', p: 0.5, dao: 'k',
      ok: { text: '你在龙宫跪了三天，换回续命蛟珠。{ye}骂你傻，骂完把你的手攥得死紧。', fx: { aff: { ye: 15 }, inj: 2, flag: 'ye_life' } },
      fail: { text: '你空手回来。{ye}拎着两坛酒在门口等：“回来就好。还剩九年半。”', fx: { aff: { ye: 10 }, flag: 'ye_ten' } } },
    { t: '陪你看完', dao: 'w',
      ok: { text: '“那就一回一回地看。”{ye}把第一盏灯塞进你手里。往后每年灯会，你们都在。', fx: { aff: { ye: 10 }, title: '十年灯', flag: 'ye_ten' } } },
    { t: '分你一半', dao: 'r',
      ok: { text: '你渡一缕本命精元进{ye}心口。{ye}打着打着哭了：“谁准你替我做主的！”', fx: { life: -10, aff: { ye: 12 }, flag: 'ye_life' } } }
  ]
},
{
  id: 'ye_left', where: 'home', visit: true, npc: 'ye', speaker: 'ye', need: ['daolv_su', 'ye_debt'], once: true, title: '一把刀',
  text: '一推门，满地碎陶——你埋了三年的那坛酒。桌上插着一把刀，缠着{ye}常系的红绳。{ye}已在檐角，背对着你。',
  choices: [
    { t: '收下这把刀',
      ok: { text: '刀脊刻着一行小字：“好好过。”你把刀挂在床头。酒香三天才散。', fx: { item: 'w', itemUp: 1, flag: 'ye_left_done' } } },
    { t: '追出去', dao: 'k',
      ok: { text: '{ye}没回头：“别追了，再追我就舍不得走了。”风一过，人不见了。', fx: { aff: { ye: 5 }, xp: 3, flag: 'ye_left_done' } } }
  ]
},

/* ---------- 楚狂 ---------- */
{
  id: 'chu_q1', where: 'exp', bg: ['swords'], npc: 'chu', speaker: 'chu', aff: [40, 100], need: ['chu_wine'], not: ['chu_q1_done'], title: '借一式',
  text: '剑碑林里，楚狂蹲在断碑前：“碑上一式，我看了三年看不全。陪我借，借完还。”“怎么还？”“练会了，就算还了。”',
  choices: [
    { t: '陪他看碑', p: 0.7,
      ok: { text: '他看左半边，你看右半边。最后一夜对了一剑，碑上的字自己亮了。', fx: { aff: { chu: 15 }, mastery: 15, flag: 'chu_q1_done' } },
      fail: { text: '碑中剑意把你俩掀出剑碑林。楚狂擦擦嘴角：“它不肯借。下回再来。”', fx: { aff: { chu: 12 }, mastery: 5, inj: 1, flag: 'chu_q1_done' } } },
    { t: '教他一式', duel: 1.0, dao: 'r',
      ok: { text: '他看一遍就会了，又看了十遍：“比碑上的好。”', fx: { aff: { chu: 20 }, flag: 'chu_q1_done' } },
      fail: { text: '你才拆到一半，他已用这一式把你挑翻：“好剑。谢了。”', fx: { aff: { chu: 20 }, inj: 1, flag: 'chu_q1_done' } } },
    { t: '下回吧',
      ok: { text: '你走远回头，他还蹲在那儿，像碑前又多了一块碑。', fx: { xp: 1 } } }
  ]
},
{
  id: 'chu_q2', where: 'home', visit: true, npc: 'chu', speaker: 'chu', aff: [80, 100], need: ['chu_bond'], minR: 4, once: true, title: '三天',
  text: '楚狂在论剑台上输给楚天阔，剑脱了手。他回来三天没说话，抱剑坐在你院里，第四天清晨石凳落满了霜。',
  choices: [
    { t: '陪他练剑', duel: 1.0, dao: 'r',
      ok: { text: '他看了你很久，也拔剑。练到第四天傍晚，他忽然说：“那一招，我看清了。”', fx: { busy: 4, aff: { chu: 15 }, mastery: 8, flag: 'chu_q2_done' } },
      fail: { text: '他把三天的憋闷全打在你身上。然后扔了剑坐你旁边：“谢了。”', fx: { busy: 4, inj: 2, aff: { chu: 18 }, flag: 'chu_q2_done' } } },
    { t: '替他讨回', p: 0.7,
      ok: { text: '你在论剑帖上留字：下回替楚狂讨那一招。他骂你多事，转身磨了一夜剑。', fx: { aff: { chu: 10 }, grudge: { chu: 10 }, flag: ['chu_q2_done', 'chu_avenge'] } },
      fail: { text: '天剑宗弟子当面撕了帖子。楚狂三天来头一回笑：“他们怕了。”', fx: { aff: { chu: 10 }, flag: 'chu_q2_done' } } },
    { t: '骂醒他', dao: 'k',
      ok: { text: '“当年拦我路时，你剑可握得紧。”楚狂猛地抬头，冲你吼：“拔剑！”', fx: { aff: { chu: 12 }, xp: 3, flag: 'chu_q2_done' } } }
  ]
},
{
  id: 'chu_end', where: 'home', visit: true, npc: 'chu', speaker: 'chu', aff: [90, 100], need: ['chu_q2_done'], minR: 5, once: true, weight: 2, title: '走一圈',
  text: '楚狂来辞行，背上换了自己铸的剑，丑，但锋利：“碑我不看了，九式也不学了。我悟了自己的一式，拿去天下走一圈。”',
  choices: [
    { t: '送他下山',
      ok: { text: '他塞给你一枚玉简：“我那一式。我忘了就回来问你。”头也不回地走了。', fx: { aff: { chu: 10 }, mastery: 30, title: '剑痴之友', flag: 'chu_gone' } } },
    { t: '最后比一场', duel: 1.1, dao: 'k',
      ok: { text: '你接下了那一式——只是接下。他大笑：“天下还有人能接，就不算白悟！”', fx: { aff: { chu: 15 }, power: 0.03, flag: 'chu_gone' } },
      fail: { text: '你没接住。他把你拉起来：“你是头一个。这一回，我替你记着。”', fx: { aff: { chu: 15 }, mastery: 15, flag: 'chu_gone' } } }
  ]
},

/* ---------- 葛老 ---------- */
{
  id: 'ge_q1', where: 'home', visit: true, npc: 'ge', speaker: 'ge', aff: [40, 100], need: ['ge_wine'], once: true, title: '赎人',
  text: '酒楼伙计递来欠条：赊酒四十七坛，立据人葛某，担保人是你，字迹歪得像蚯蚓。“人押在后厨劈柴，钱到放人。”',
  choices: [
    { t: '掏钱', cost: { stones: 8 },
      ok: { text: '葛老抱着半坛出来：“记账上，等老头子炼出九转金丹，连本带利。”你决定先不指望。', fx: { aff: { ge: 15 }, flag: 'ge_q1_done' } } },
    { t: '炼丹抵债', cost: { herbs: 10 }, p: 0.7, dao: 'w',
      ok: { text: '丹成时满楼酒客都放下了杯，掌柜免了债。葛老酸溜溜：“火候还差点。”', fx: { aff: { ge: 15 }, stones: 4, xp: 3, flag: 'ge_q1_done' } },
      fail: { text: '锅炸了，欠条上多了你的手印。你和葛老劈了一下午柴，他趁机教你看火。', fx: { aff: { ge: 8 }, xp: 4, flag: 'ge_q1_done' } } },
    { t: '不认识', dao: 'k',
      ok: { text: '当晚酒楼的丹炉——他们为什么有丹炉？——炸了，葛老不知去向。', fx: { aff: { ge: -5 }, flag: ['market_up', 'ge_q1_done'] } } }
  ]
},
{
  id: 'ge_q2', where: 'home', visit: true, npc: 'ge', speaker: 'ge', aff: [80, 100], need: ['ge_bond'], minR: 3, once: true, title: '床底下',
  text: '丹霞谷执事抬着八抬大轿来请葛老“叙旧”。你回屋一看，床底伸出一只挂着酒葫芦的脚：“小友，就说老夫死了。”',
  choices: [
    { t: '人不在', dao: 'k',
      ok: { text: '执事瞥了眼地上的酒渍，冷笑走了。葛老爬出来：“够意思，老夫记你一辈子。”', fx: { aff: { ge: 15 }, flag: ['ge_q2_done', 'ge_hid'] } } },
    { t: '劝他回去', dao: 'r',
      ok: { text: '葛老拍拍灰：“看就看，又不是不敢。”上轿前偷灌了半壶酒壮胆。', fx: { aff: { ge: 10 }, xp: 3, flag: ['ge_q2_done', 'ge_went'] } } },
    { t: '请谷主亲来',
      ok: { text: '丹云婆婆真来了，和葛老吵了一夜，吵掉出一页发黄的丹经。', fx: { aff: { ge: 10 }, flag: ['ge_q2_done', 'danjing_2'] } } }
  ]
},
{
  id: 'ge_end', where: 'home', visit: true, npc: 'ge', speaker: 'ge', aff: [90, 100], need: ['ge_q2_done'], minR: 5, once: true, weight: 2, title: '一炉旧丹',
  text: '葛老衣裳穿得整整齐齐：“六十年前，老夫和师弟阿青炼九转金丹，炉炸了，阿青没出来。”他看着你的丹炉，“今天是他的忌日。”',
  choices: [
    { t: '炼完那炉丹', p: 0.5, dao: 'k',
      ok: { text: '报到第七味时他嗓子哑了。丹成时九道丹纹绕炉，葛老捧着丹，像捧着一个人。', fx: { aff: { ge: 15 }, recipe: 'jiuzhuan', flag: 'ge_done' } },
      fail: { text: '炉身裂了道缝，和六十年前同一个位置。葛老按住炉盖：“够了。老夫知道错在哪了。”', fx: { aff: { ge: 10 }, inj: 1, flag: 'ge_done' } } },
    { t: '陪他去上坟', dao: 'r',
      ok: { text: '阿青坟前已摆着一碗酒——丹云来过了。葛老站了很久，把自己的也倒了进去。', fx: { aff: { ge: 10 }, pills: 2, flag: ['ge_done', 'ge_peace'] } } }
  ]
},

/* ---------- 白小九 ---------- */
{
  id: 'bai_q1', where: 'home', visit: true, npc: 'bai', speaker: 'bai', aff: [40, 100], need: ['bai_food'], once: true, title: '妖市的账',
  text: '拄拐的老狸猫带着账房小妖堵门：“白小九在妖市赊了糖葫芦、云锦、一只会唱歌的鸟——鸟还没还。”小九躲在你身后，尾巴在抖。',
  choices: [
    { t: '我替她赔', cost: { stones: 6 },
      ok: { text: '老狸猫数了三遍钱：“鸟呢？”小九从袖子摸出一只鸟，鸟还在唱。', fx: { aff: { bai: 15 }, flag: 'bai_q1_done' } } },
    { t: '请出门去', duel: 0.9, dao: 'k',
      ok: { text: '老狸猫走得飞快。小九扑上来：“恩人好威风！”又小声补一句，“但我确实欠钱……”', fx: { aff: { bai: 10 }, flag: 'bai_q1_done' } },
      fail: { text: '老狸猫一拐杖把你敲进墙里。小九哭着还了鸟，给你揉了一晚上脑袋。', fx: { inj: 2, aff: { bai: 12 }, flag: 'bai_q1_done' } } },
    { t: '让她自己还', dao: 'w',
      ok: { text: '小九打工回来瘦了一圈，怀里揣着一只青羽雀：“工钱！它非要跟我走。”', fx: { aff: { bai: 10 }, pet: 'p_que', flag: 'bai_q1_done' } } }
  ]
},
{
  id: 'bai_q2', where: 'home', visit: true, npc: 'bai', speaker: 'bai', aff: [80, 100], need: ['bai_bond'], sect: true, minR: 3, once: true, title: '尾巴',
  text: '白小九一高兴冒一条尾巴，一紧张冒两条。宗门在传你洞府养妖，执法堂来人“例行巡查”，眼睛直往小九身后瞟。',
  choices: [
    { t: '我的灵宠',
      ok: { text: '执法弟子记下“灵宠一只”。小九三天没理你，第四天伸来尾巴：“灵宠是要梳毛的。”', fx: { aff: { bai: 8 }, flag: 'bai_q2_done' } } },
    { t: '她是家人', dao: 'r',
      ok: { text: '满院都静了，有长老说你糊涂，有长老说你担当。门后，小九的尾巴摇出九条影子。', fx: { aff: { bai: 15 }, favor: { a: 5, c: -8 }, flag: 'bai_q2_done' } } },
    { t: '送她避避', dao: 'w',
      ok: { text: '小九塞给你一颗亮石子：“想我了就看它。”半年后回来，尾巴已收放自如。', fx: { aff: { bai: 10 }, xp: 2, flag: 'bai_q2_done' } } }
  ]
},
{
  id: 'bai_end', where: 'exp', bg: ['forest'], npc: 'bai', speaker: 'bai', aff: [90, 100], need: ['fox_4'], once: true, weight: 2, title: '九尾',
  text: '狐族秘地的青月下，白小九身后亮起八条尾巴，第九条将出未出。成了九尾就得守秘地；不成，从此做人。小九回头看你。',
  choices: [
    { t: '成九尾吧',
      ok: { text: '满山狐火朝她低头。小九哭着笑：“我留一缕血脉化成小狐狸陪你。”', fx: { aff: { bai: 10 }, pet: 'p_hu', flag: ['bai_nine', 'fox_blood'] } } },
    { t: '跟我回家', dao: 'r',
      ok: { text: '小九扑了过来，八条尾巴“噗”地全收回去：“回家吃饭！”', fx: { aff: { bai: 15 }, title: '狐狸的家', flag: 'bai_stay' } } },
    { t: '你自己选', p: 0.5, dao: 'w',
      ok: { text: '“九尾以后还能成，恩人只有一个。”老狐狸叹气，把第九尾的灵光封进珠子给了你。', fx: { aff: { bai: 15 }, treasure: 1, flag: 'bai_stay' } },
      fail: { text: '第九尾亮起，你脚边多了只雪团似的小狐。她喊：“每年月圆，我都去看你！”', fx: { aff: { bai: 10 }, pet: 'p_hu', flag: ['bai_nine', 'fox_blood'] } } }
  ]
},

/* ---------- 墨无痕 ---------- */
{
  id: 'mo_q1', where: 'home', visit: true, npc: 'mo', speaker: 'mo', aff: [40, 100], need: ['mo_save'], minR: 3, maxR: 6, once: true, title: '布防图',
  text: '墨无痕摊开白纸：“天剑宗山门的布防图，我要。三千年前我墨家先祖背着骂名从那山上走下来。总有一天，我要走上去。”',
  choices: [
    { t: '我去拓', p: 0.6, dao: 'k',
      ok: { text: '你扮杂役混进天剑宗量了三天。墨无痕接图只说两个字：“多谢。”很认真。', fx: { busy: 3, aff: { mo: 15 }, flag: ['mo_q1_done', 'tj_map'] } },
      fail: { text: '翻墙时挨了一剑，只拓了一半。墨无痕替你上药：“一半够了。”', fx: { inj: 2, aff: { mo: 12 }, flag: 'mo_q1_done' } } },
    { t: '找赵乾要', need: ['zhao_owes'],
      ok: { text: '赵乾脸色变了几变，掏出一张图：“拿去，我们两清。”墨无痕挑了挑眉。', fx: { aff: { mo: 15 }, grudge: { zhao: -10 }, flag: ['mo_q1_done', 'tj_map'] } } },
    { t: '我不碰', dao: 'w',
      ok: { text: '“也对，不该扯你进来。”他走后，桌上落着一张写满天剑宗地名的纸。', fx: { aff: { mo: -3 }, flag: 'mo_q1_done' } } }
  ]
},
{
  id: 'mo_q2', where: 'home', visit: true, npc: 'mo', speaker: 'mo', aff: [80, 100], need: ['mo_ask'], not: ['st_truth'], minR: 4, maxR: 5, once: true, title: '一句话',
  text: '墨无痕只看着你的戒指：“我不要他认错，只要他亲口说一句——墨离没有弑师。一句就够，我替墨家三十代人听。”',
  choices: [
    { t: '我替他说', p: 0.4, dao: 'r',
      ok: { text: '你学着老祖的口气说了，戒指里没有反对。墨无痕盯了很久：“……他没拦你。”', fx: { aff: { mo: 15 }, flag: 'mo_q2_done' } },
      fail: { text: '戒指烫了起来：“住口！”墨无痕笑得很难听：“你看，他连别人替他说都不肯。”', fx: { aff: { mo: 5 }, flag: 'mo_q2_done' } } },
    { t: '等真相出来', dao: 'w',
      ok: { text: '墨无痕收回玉简：“好。三千年都等了，不差这几年。”', fx: { aff: { mo: 10 }, flag: 'mo_q2_done' } } },
    { t: '问老祖',
      ok: { text: '“本座……不记得了，只记得那一剑。”墨无痕转身走了，到门口背影晃了一下。', fx: { aff: { mo: -5 }, xp: 3, flag: ['mo_q2_done', 'mo_q2_asked'] } } }
  ]
},
{
  id: 'mo_end', where: 'home', visit: true, npc: 'mo', speaker: 'mo', aff: [90, 100], need: ['st_justice', 'mo_bond'], minR: 7, maxR: 7, once: true, weight: 2, title: '往后',
  text: '墨离名字刻进正史的第三天，墨无痕在你门口坐了一下午：“三千年的事做完了。往后……我不知道该干什么。”',
  choices: [
    { t: '留下看门', dao: 'w',
      ok: { text: '他在山门口搭了间小屋。从此摸进洞府的贼，第二天都挂在门口松树上。', fx: { aff: { mo: 10 }, flag: 'mo_guard' } } },
    { t: '陪你去上坟', dao: 'r',
      ok: { text: '墨离的坟三千年没人扫过。你们扫了一整天，墨无痕第一次唤了声“先祖”。', fx: { aff: { mo: 10 }, life: 3, flag: 'mo_grave' } } },
    { t: '做我师弟吧',
      ok: { text: '“玄霄门下，记名弟子墨无痕。”戒指笑骂：“辈分全乱了。”他一揖：“……师兄。”', fx: { aff: { mo: 15 }, title: '玄霄门下', flag: 'mo_brother' } } }
  ]
},

/* ============================================================
 * 八、主线补段（6）
 * ============================================================ */
{
  id: 'story_pact_eve', where: 'story', trigger: 'pact_eve', maxR: 1, speaker: 'elder', title: '约战前夜',
  text: '明天就是三年之约。你擦了三遍剑还是睡不着。老祖难得没骂人：“问你句正经的——明天赢了，往后想干什么？”',
  choices: [
    { t: '让他们抬头', dao: 'k',
      ok: { text: '老祖大笑：“俗！可本座爱听。”那一夜他讲了七种让人闭嘴的剑法。', fx: { xp: 3, flag: 'pact_k' } } },
    { t: '修到天上', dao: 'w',
      ok: { text: '老祖“嗯”了一声：“这才像修士说的话。”他没再开口，你却觉得指间的戒指暖了一下。', fx: { xp: 3, flag: 'pact_w' } } },
    { t: '修破庙的顶', dao: 'r',
      ok: { text: '老祖沉默很久：“……那顶漏雨，是该修了。本座在那儿，等了三千年。”', fx: { xp: 3, flag: 'pact_r' } } }
  ]
},
{
  id: 'story_trib1', where: 'story', trigger: 'trib:1', maxR: 7, speaker: 'elder', title: '渡劫阵图',
  text: '第一道雷劫散了，你焦黑着脸坐在山顶。老祖丢来一卷旧阵图：“下回别光着身子挨劈。本座当年渡劫……算了，没渡完。”',
  choices: [
    { t: '认真记下', dao: 'w',
      ok: { text: '老祖挑了一夜刺，挑到后来竟有几分得意：“这阵，是本座年轻时画的。”', fx: { plan: 'f_dujie', xp: 3 } } },
    { t: '您没渡完？', dao: 'r',
      ok: { text: '“雷落下来时，背后有点凉。”老祖不吭声了。这句话比雷还沉。', fx: { plan: 'f_dujie', flag: 'trib_hint' } } },
    { t: '阵图真丑', dao: 'k',
      ok: { text: '“三千年前它挂在本座山门上，万人来拜！”骂完，又把阵眼讲了三遍。', fx: { plan: 'f_dujie', xp: 2 } } }
  ]
},
{
  id: 'story_demon1', where: 'story', trigger: 'demon:1', title: '心魔·旧账',
  text: '元婴雷劫前，心魔先来。它翻出你欠下的第一笔账，或是被逐出山门那天，一寸不差：“再来一次，还这么选吗？”',
  choices: [
    { t: '还这么选', dao: 'w',
      ok: { text: '幻境碎了。你的道心像被雷劈过的石头，裂了纹，却更硬了。', fx: { flag: 'demon1_firm' } } },
    { t: '换一种选法', dao: 'r',
      ok: { text: '那人愣住，慢慢散去，连同那笔账。雷云更沉了，你心里却轻了。', fx: { flag: 'demon1_waver', unkarma: 'any' } } },
    { t: '一剑斩了它', p: 0.5, dao: 'k',
      ok: { text: '心魔碎成满地镜片，每片里都是你。你踩着镜片走进雷云。', fx: { flag: 'demon1_firm', xp: 4 } },
      fail: { text: '剑斩了个空：“你连自己都砍？”心神一乱，第一道雷劈了个正着。', fx: { flag: 'demon1_waver', inj: 1 } } }
  ]
},
{
  id: 'story_demon2', where: 'story', trigger: 'demon:2', maxR: 7, title: '心魔·岔路',
  text: '化神雷劫前，心魔换成你没选的那个人，站在你没走的路上冲你笑：“那条路，你后悔过吗？”',
  choices: [
    { t: '不后悔', dao: 'w',
      ok: { text: '那张脸笑着点头，像替你高兴，然后散了。你有点想哭，忍住了。', fx: { flag: 'demon2_firm' } } },
    { t: '后悔过', dao: 'r',
      ok: { text: '心魔没想到你会认。它散得很慢，散前说了声：“保重。”', fx: { flag: 'demon2_waver', unkarma: 'any' } } },
    { t: '让开', dao: 'k',
      ok: { text: '心魔真让开了，身后是雷云，雷云后什么也没有。你走了进去。', fx: { flag: 'demon2_firm', xp: 3 } } }
  ]
},
{
  id: 'story_demon3', where: 'story', trigger: 'demon:3', maxR: 7, title: '心魔·同路人',
  text: '合体雷劫前，心魔是陆天衡，慈眉善目：“我也是杂灵根，也被当废柴。剑典不传我，我只好自己拿。你我，本是同一种人。”',
  choices: [
    { t: '我不推人', dao: 'w',
      ok: { text: '“我被人推下过山，没推过别人。”陆天衡的笑僵住，像被雨淋透的画。', fx: { flag: 'demon3_firm' } } },
    { t: '也许一样', dao: 'r',
      ok: { text: '“所以我更不能变成你。”心魔散了，带走你心里一笔旧账。', fx: { flag: 'demon3_waver', unkarma: 'any' } } },
    { t: '拔剑', dao: 'k',
      ok: { text: '他用天剑九式，你用那下半句。心魔从中间裂开，漏出一缕三千年前的雷光。', fx: { flag: 'demon3_firm', mastery: 10 } } }
  ]
},
{
  id: 'story_ascend', where: 'story', trigger: 'ascend', title: '最后的访客',
  text: '飞升前夜，有人轻轻敲门。你不开门也知道是谁。门外的人只问：“明天，还回来吗？”',
  choices: [
    { t: '开门', dao: 'r',
      ok: { text: '两人隔着门槛站着，看天一点点亮。天亮时，你说：“回来。”', fx: { xp: 4, flag: 'ascend_open' } } },
    { t: '隔着门说话', dao: 'w',
      ok: { text: '隔着一道门说了一夜话，说到最后，门外传来一声很轻的笑。', fx: { xp: 4, flag: 'ascend_door' } } },
    { t: '别等我', dao: 'k',
      ok: { text: '脚步声远了，很慢，很稳。你把这一世最后一滴泪留在了人间。', fx: { xp: 4, flag: 'ascend_alone' } } }
  ]
}

];
if (typeof module !== 'undefined' && module.exports) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
