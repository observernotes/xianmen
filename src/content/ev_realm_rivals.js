/* 废柴仙途 · 事件库扩展：秘境（CONTENT §14.1）、宿敌与新秀（§14.2）、坊市与拍卖（§14.7） */
(function (root) {
'use strict';
const LIST = [

/* ============================================================
 * 引擎约定（本文件用到、需要 L.applyFx / L.eligible 支持的写法）
 *
 * 一、CONTENT 顶部已定义的新键：ore feed yin token art gear pet mastery grudge favor
 *     karma unkarma plan recipe hp（仅秘境内）；choice.dao；事件 grudge / where:'realm' /
 *     theme / world / rankMax / srankMin。item:'need' 同 CONTENT。
 * 二、本文件额外用到的（CONTENT 未列）：
 *   fx.toxin: n        丹毒 +n（0～100 的绝对点数，SYSTEMS §5）
 *   fx.plus: n         当前兵器强化 +n（不掷成功率）
 *   fx.affix: -1       当前兵器随机去掉一条词条
 *   fx.unflag          logic 里已支持（applyFx），只是旧校验表没列
 *   item: 'o' / 'r'    饰品 / 法衣（SYSTEMS §3 的 st.gear 槽名）
 *   recipe: 'need'     揭晓一格未知丹方（仿 item:'need'）
 *   unkarma: 'any'     了结一条因果（引擎挑最早的一条）
 *   choice 上可带 need / not / srankMin：条件不满足时该选项不显示（与事件级同义）。
 *     每个事件都保证：任何条件组合下至少有一个不花钱的选项可见。
 *   where: 'market'    坊市 / 拍卖界面里触发，trigger 写时机：
 *     market:restock（换货后掷）、market:buy（买轮换货时掷）、
 *     auction:open（开拍时）、auction:rival（有宿敌在场时）、auction:sell（有闲置好货时）
 *   choice.foe: 宿敌id | 'rookie'  对决的对手是这位宿敌 / 正在追你的新秀（五行克制、他的法宝都算，rivals2.js 的 L.choiceFoe）
 *   fx.rookie: 'win' | 'lose' | 'teach'  新秀这一场的结局：打压赢 / 输、指点（rivals2.js 的 L.rookieResolve）
 *   story 新 trigger：beat:yun（首次击败云无极）、war_eve:tianjian（天剑宗来犯前 6 周天）、
 *     rookie:appear / rookie:near / rookie:beaten / rookie:trouble（新秀：出现、追到前 5、
 *     被你击败、被你指点后 24 周天）。new_* 带 once:false：每位新秀各走一遍。
 *   theme：jianqi 剑气 / baicao 百草 / ronghuo 熔火 / youquan 幽泉；不写 = 任意主题。
 * 三、flag 约定
 *   beat_mu / beat_zhao / beat_chu / beat_xue / beat_yun：首次击败该宿敌时由引擎置上。
 *   tianjian_4 / tianjian_6：ch_tianjian 链第 4 / 6 步完成（CONTENT 的“链短名_步”）。
 *   run_*：只在本局秘境有效，出秘境清掉——
 *     run_reveal 下一层全部门显形；run_elite 下一个房间强制为精英；run_reroll 本层重抽门；
 *     run_trap_up 本局后续陷阱 +10%；run_herb_gift 之后每层 +1 灵草、守关后木引 ×2；
 *     run_maxhp_down 本局气血上限 −20；run_proxy 下一个战斗房不掉气血；
 *     run_safe 下一个房间不掉气血；run_skip 直达终层前一层；run_melt 熔掉本局一件收获。
 *   一次性钩子（引擎读到后执行并清掉）：mkt_discount 下一届货架九折；mkt_cut30 本次购买七折；
 *     mkt_extra_slot 下一届货架多一格；auc_consign 下一场拍卖代卖一件闲置品；
 *     mu_overpaid 慕容这场拍到的东西不生效；raid_intel 下次天剑宗战事视战力 ×1.3；
 *     raid_delay 天剑宗来犯推迟 24 周天；rookie_seen / yun_elem 显示其五行；
 *     rookie_disciple 把这位新秀收进徒弟名册（灵根 4 档）。
 * ============================================================ */

/* ============================================================
 * 一、秘境“奇”房间（where: 'realm'，16）
 * ============================================================ */
{
  id: 'realm_altar', where: 'realm', maxR: 7, title: '未熄的祭坛',
  text: '石室正中一座祭坛，香还没烧完。坛上端端正正摆着一柄剑、一只酒葫芦、一双洗得发白的布鞋——有人不久前才来祭过谁。剑是好剑。',
  choices: [
    { t: '取剑', p: 0.6, dao: 'k',
      ok: { text: '你拿起剑，香灰无风自落。走出三步，身后传来一声极轻的叹息，没有追来。', fx: { item: 'w', itemUp: 1, karma: 'altar' } },
      fail: { text: '指尖刚碰到剑柄，葫芦里泼出一道酒线，在你胸口烫出个“贼”字。三天才消。', fx: { hp: -25 } } },
    { t: '续一炷香', dao: 'r',
      ok: { text: '你把快烧尽的香换成新的。布鞋旁的石缝里滚出一粒丹药，像是有人说了声谢。', fx: { hp: 10, pills: 1 } } },
    { t: '绕过去', dao: 'w',
      ok: { text: '别人的伤心事，不看为好。你目不斜视地走过去，老祖难得夸你一句：“还算懂规矩。”', fx: { xp: 2 } } }
  ]
},
{
  // 原计划第三项“用天眼通直接看穿”：选项上没有“需某功法”的条件键，改成人人可试的“细看凿痕”；
  // 引擎可让装备天眼通（m_tianyan）者此项必成。
  id: 'realm_twin_doors', where: 'realm', title: '生死门',
  text: '两扇石门，左“生”右“死”。细看两个字都被凿下来对调过，石粉还是新的。换字的人，是想害人，还是想救人？',
  choices: [
    { t: '信门上的字', p: 0.5, dao: 'r',
      ok: { text: '“生”门后一汪泉水泛着微光。换字的人大概是好心，也可能只是手滑。', fx: { hp: 30 } },
      fail: { text: '门后蹲着一具披甲傀儡，膝上横着磨亮的刀。它等的就是信字的人。', fx: { flag: 'run_elite' } } },
    { t: '反着走', p: 0.5, dao: 'k',
      ok: { text: '你偏推“死”门，泉声叮咚。换字的人想害人，可惜你多想了一步。', fx: { hp: 30 } },
      fail: { text: '门后刀光一闪——那两个字，他换了两回。', fx: { flag: 'run_elite' } } },
    { t: '细看凿痕', p: 0.7, dao: 'w',
      ok: { text: '凿痕一深一浅，浅的是后补的。你认出原样，推门便是泉眼。', fx: { hp: 30, ore: 1 } },
      fail: { text: '你看得太久，两扇门竟合拢换了位。随手挑一扇，挨了一记冷箭。', fx: { hp: -10 } } }
  ]
},
{
  // “锻魂阵图碎片”：没有碎片键，胜则直接给阵图；已有则由引擎折成灵矿。
  id: 'realm_sword_wall', where: 'realm', theme: 'jianqi', title: '剑痕壁',
  text: '一整面石壁全是剑痕，深的没指，浅的一线。看久了，剑痕竟一道接一道出起招来——是一个人练了一辈子的剑。',
  choices: [
    { t: '面壁参悟', dao: 'w',
      ok: { text: '壁上剑意顺着目光割进来，生疼，也割开了你剑路里一处死结。', fx: { mastery: 15, hp: -10 } } },
    { t: '以剑对剑', duel: 1.0, dao: 'k',
      ok: { text: '最深那道剑痕被你斩落，后头露出一方刻着“锻魂”的阵盘，还是温的。', fx: { plan: 'f_duanhun' } },
      fail: { text: '剑意齐醒，把你推回门口。胸前多了九道白印，一道一式。', fx: { hp: -25, mastery: 5 } } }
  ]
},
{
  // “救他出去”会置 sword_slave_saved：计划写了“后续 home 事件来报恩”，但那个事件不在任何一组里，留给后补。
  id: 'realm_sword_slave', where: 'realm', theme: 'jianqi', once: true, title: '剑奴',
  text: '剑气笼中跪着一个须发结毡的人，身旁插剑，剑光百年未暗。“道友，给个痛快。剑气不散，我连死都死不成。”',
  choices: [
    { t: '成全他', dao: 'r',
      ok: { text: '他闭上眼，嘴角松开了。笼子散尽，那柄剑也碎成几块，还是好铁。', fx: { ore: 4 } } },
    { t: '带他出去', dao: 'r',
      ok: { text: '你一寸寸劈开笼子。他出门没回头：“这条命，记你账上。”', fx: { hp: -20, flag: 'sword_slave_saved' } } },
    { t: '夺剑', dao: 'k',
      ok: { text: '你越过剑气把剑拔了出来。他没拦，只看着你笑，一直笑到你走出这一层。', fx: { item: 'w', hp: -10, karma: 'sword_slave' } } }
  ]
},
{
  // 把握随已有金系功法数上升：引擎在 p 上加（例如每门 +0.08）。
  id: 'realm_broken_sword', where: 'realm', theme: 'jianqi', once: true, title: '断剑择主',
  text: '石台上插着半尺断剑，刃口还亮，台座刻着：“以血饲我，我择其主。”台下十几滴干血，旁边都有被弹开的划痕。',
  choices: [
    { t: '滴血认主', p: 0.5, dao: 'k',
      ok: { text: '断剑嗡地一震，化作寒光没入你的兵器，刃口多了一线霜色。', fx: { plus: 1 } },
      fail: { text: '血被弹了回来，台上又多一道划痕。像被谁仔细看过，又摇了头。', fx: { hp: -15, mastery: 5 } } },
    { t: '拱手作罢', dao: 'w',
      ok: { text: '走出三步，身后断剑轻轻一鸣，像是认了你这份礼数。', fx: { xp: 2 } } }
  ]
},
{
  // “与它论药”原需已知丹方 ≥ 6：选项上没有这种条件键，改为把握判定（失败另有一段戏）。
  id: 'realm_herb_king', where: 'realm', theme: 'baicao', title: '装死的药王',
  text: '石缝里歪着一株人形老参，须子摊了一地，一动不动。你一靠近，须子悄悄缩了半寸——成了精的药王，正在装死。',
  choices: [
    { t: '连根挖走', dao: 'k',
      ok: { text: '它到最后都没睁眼，断须渗出碧汁。身后草丛窸窣，有什么记住了你。', fx: { yin: { wood: 3 }, flag: 'run_trap_up' } } },
    { t: '浇一捧泉水', dao: 'r',
      ok: { text: '它没睁眼，叶子却抖了抖。此后每过一层，你脚边都多一株灵草。', fx: { herbs: 1, flag: 'run_herb_gift' } } },
    { t: '与它论药', p: 0.5, dao: 'w',
      ok: { text: '你报了三味药性，它憋不住坐起来骂你配伍狗屁不通，骂完顺嘴说出一张新方子。', fx: { recipe: 'need' } },
      fail: { text: '你说错一味药。它“噗”地笑出声，又直挺挺倒了回去。', fx: { herbs: 2 } } }
  ]
},
{
  id: 'realm_bees', where: 'realm', theme: 'baicao', title: '噬灵蜂巢',
  text: '枯树上挂着口钟大的蜂巢，蜜滴到地上就冒出嫩芽。进出的蜂子有指甲盖大，专叮修士灵脉。',
  choices: [
    { t: '伸手硬掏', dao: 'k',
      ok: { text: '你掏出半扇蜂脾就跑，灵脉被叮得发麻，怀里的蜜沉甸甸的。', fx: { hp: -15, feed: 10 } } },
    { t: '熏烟取蜜', cost: { herbs: 5 },
      ok: { text: '浓烟熏得蜂群醉醺醺打转。你从容割下半扇蜂脾，还替它们扶正了巢口。', fx: { feed: 10 } } },
    { t: '绕开它', dao: 'w',
      ok: { text: '一只蜂落在你肩头嗅了嗅，嫌弃地飞走了。你的灵脉大概不好吃。', fx: { xp: 1 } } }
  ]
},
{
  // 计划写“可能是丹红袖”，这里定为她；favor.yun 是丹霞谷谷主丹云婆婆，不在丹霞谷时引擎忽略。
  id: 'realm_garden_thief', where: 'realm', theme: 'baicao', once: true, title: '撞见同行',
  text: '药圃深处，红衣女修蹲着挖一株七叶灵芝，药锄一横：“丹霞谷，丹红袖。这株是我先看见的。”',
  choices: [
    { t: '提议平分', dao: 'w',
      ok: { text: '她把灵芝掰开，大半递给你：“你比我穷。”走两步又扔回一包药种。', fx: { herbs: 4, yin: { wood: 1 } } } },
    { t: '抢', duel: 1.0, dao: 'k',
      ok: { text: '你连药篓一起拎走。她没追：“我记住你了。”丹霞谷账本上多了你一笔。', fx: { herbs: 8, yin: { wood: 2 }, favor: { yun: -8 } } },
      fail: { text: '她的药锄比剑快，一下敲在你腕上。她捡完自己的，把你的也捡走了。', fx: { hp: -15, favor: { yun: -3 } } } },
    { t: '让给她', dao: 'r',
      ok: { text: '她愣了愣，往你手心放了一粒丹：“丹霞谷不欠人情。”', fx: { pills: 1, favor: { yun: 5 }, flag: 'hongxiu_owes' } } }
  ]
},
{
  id: 'realm_lava_bridge', where: 'realm', theme: 'ronghuo', title: '半截桥',
  text: '熔岩河上半截石桥，断口离对岸还有两丈，岩浆每隔几息就涌起一次。对岸的门开着，透出光来。',
  choices: [
    { t: '冲过去', p: 0.6, dao: 'k',
      ok: { text: '你踩着岩浆回落那一息跃过，顺手薅下一颗烤熟的赤炎果。鞋底焦了。', fx: { yin: { fire: 1 } } },
      fail: { text: '你跳早了半息。滚上对岸时衣摆着火，半边身子全是燎泡。', fx: { hp: -30 } } },
    { t: '冰引铺路', cost: { yin: { ice: 1 } }, dao: 'w',
      ok: { text: '寒霜莲铺出一条白霜小路，凝住的岩浆里还冻着两颗赤炎果。', fx: { yin: { fire: 2 } } } },
    { t: '回头',
      ok: { text: '你掉头回到岔口。这一层，换个走法。', fx: { flag: 'run_reroll' } } }
  ]
},
{
  id: 'realm_fire_spirit', where: 'realm', theme: 'ronghuo', title: '跟脚的火灵',
  text: '一团巴掌大的火苗从岩缝钻出，绕你脚踝转了三圈，又蹭你的手——烫，却不疼。火心两点亮光眼巴巴望着你。',
  choices: [
    { t: '揣进怀里', dao: 'r',
      ok: { text: '它缩成一枚温热的蛋，浮出几道虎纹。只是一路吸你热气，手脚一直凉。', fx: { pet: 'p_hu2', flag: 'run_maxhp_down' } } },
    { t: '喂它火引', cost: { yin: { fire: 1 } },
      ok: { text: '它吞下赤炎果涨成斗大一团，蹿到前头开路。下一间房，你连剑都没拔。', fx: { flag: 'run_proxy' } } },
    { t: '放回岩缝', dao: 'w',
      ok: { text: '它在缝口亮了很久。你走远了回头，还能看见那一点红。', fx: { xp: 1 } } }
  ]
},
{
  // “耗本局灵石 30%”：没有本局灵石的键，按 6 周天收入计。
  id: 'realm_forge', where: 'realm', theme: 'ronghuo', title: '上古器炉',
  text: '大殿正中蹲着一座烧了几千年的器炉，炉口挂着半截剑胚。炉壁刻着规矩：“添一份，还一份。”',
  choices: [
    { t: '借炉锻剑', cost: { stones: 6 },
      ok: { text: '兵器抽出火时刃口泛着新光，炉子满意地打了个嗝。', fx: { plus: 1 } } },
    { t: '熔一件宝',
      ok: { text: '火舌卷了两下，吐出几块冒红光的灵矿，一只手抓不完。', fx: { ore: 3, flag: 'run_melt' } } },
    { t: '烤烤手', dao: 'w',
      ok: { text: '炉火暖得出奇，像有人往你经脉里塞了个手炉。', fx: { hp: 10 } } }
  ]
},
{
  // 计划是“心性判定：稳 ≥ 5”。数据里写成把握，引擎按道心改：稳 ≥ 5 时必成，否则 p 降到 0.2。
  id: 'realm_drowned', where: 'realm', theme: 'youquan', title: '水中人',
  text: '幽泉静如镜，镜里的你却没跟着动，慢慢冲你招手，说的是你最近一次骗自己的那句话。',
  choices: [
    { t: '伸出手', p: 0.5,
      ok: { text: '你握住那只手。它只把那句话又说一遍，你点了点头，它便散了，满掌清明。', fx: { mastery: 20 } },
      fail: { text: '手一碰水就被攥住，拖了三尺才挣脱。它还在笑，用的是你的脸。', fx: { hp: -20 } } },
    { t: '砸碎水面', dao: 'k',
      ok: { text: '泉面碎成千百片，每片里都有一个你在骂人。浮冰冷得能入药。', fx: { yin: { ice: 1 }, hp: -5 } } },
    { t: '闭眼走过', dao: 'w',
      ok: { text: '你闭眼数着步子走过。身后水声停了一停，又若无其事地响起。', fx: { xp: 1 } } }
  ]
},
{
  // “随机一门未装备功法熟练 −10”：mastery 键作用于当前心法，这里按当前心法写；“本局灵石 50%”按 8 周天收入计。
  id: 'realm_ferryman', where: 'realm', theme: 'youquan', title: '摆渡人',
  text: '黑水上泊着一条小船，斗笠老人拿竹篙点你额头：“过河要船钱。一段记忆就行，灵石也收，贵些。”',
  choices: [
    { t: '给他一段',
      ok: { text: '他抽走一缕白烟收进葫芦。船行如飞，靠岸时你想不起心法里的某一段了。', fx: { mastery: -10, flag: 'run_skip' } } },
    { t: '付灵石', cost: { stones: 8 }, dao: 'w',
      ok: { text: '他嫌少，还是开了船，一路哼着听不懂的调子：“快到了。”', fx: { flag: 'run_skip' } } },
    { t: '自己游过去', dao: 'k',
      ok: { text: '黑水冷如刀，水下有手擦过脚踝。上岸处离码头很远，手里却攥着一缕幽魂。', fx: { hp: -20, yin: { soul: 1 } } } }
  ]
},
{
  id: 'realm_ghost_market', where: 'realm', theme: 'youquan', title: '阴市',
  text: '雾里亮起白灯笼，一条长街凭空冒出，摊主都没有脚，只收丹药。纸扎伙计作揖：“没带丹？替小店吃口丹毒也成，倒贴。”',
  choices: [
    { t: '拿丹换魂引', cost: { pills: 1 },
      ok: { text: '摊主闻了又闻，从柜底抠出两朵半透明的养魂花，捏着像捏一口凉气。', fx: { yin: { soul: 2 } } } },
    { t: '替他吃丹毒', dao: 'k',
      ok: { text: '一碗黑汤灌下，丹田像沉了块铁。伙计奉上一只刻着“谢”字的玉坠。', fx: { toxin: 30, item: 'o' } } },
    { t: '逛逛就走', dao: 'w',
      ok: { text: '每个摊主都冲你笑。走出雾时，袖里多了一盏纸灯笼，不知谁塞的。', fx: { xp: 1 } } }
  ]
},
{
  // 计划是“恩怨 ≥ 20 的任一宿敌”。文本需要点名，定为赵乾（筑基～元婴正是他在秘境里出没的时候）。
  id: 'realm_rival', where: 'realm', grudge: ['zhao', 20, 100], title: '同困',
  text: '转过石柱，你和赵乾撞个对脸。他靠墙用天剑宗袍角缠着腿伤，先笑了：“看什么？你也没好到哪去。”',
  choices: [
    { t: '先联手', dao: 'r',
      ok: { text: '你们背靠背杀穿这一层。分开时他别着脸：“下一间我探过，干净。”是真的。', fx: { grudge: { zhao: -20 }, flag: 'run_safe' } } },
    { t: '趁他病', duel: 0.7, foe: 'zhao', dao: 'k',
      ok: { text: '他剑还没举就被挑飞，储物袋归了你——他这一路拼命攒的。', fx: { stones: 6, ore: 2, item: 'w', grudge: { zhao: 30 } } },
      fail: { text: '伤了的赵乾也还是赵乾，一脚踹你出三丈：“废物就是废物。”', fx: { hp: -25, grudge: { zhao: 15 } } } },
    { t: '各走各的', dao: 'w',
      ok: { text: '你从他面前走过。身后撕袍角的声音停了一下，又接着响起来。', fx: { xp: 1 } } }
  ]
},
{
  id: 'realm_elder_mark', where: 'realm', minR: 2, maxR: 7, once: true, speaker: 'elder', title: '到此一游',
  text: '石壁上歪歪扭扭刻着“玄霄到此一游”，旁边画着剑和酒葫芦。戒指一烫，老祖干咳：“……年少轻狂。”',
  choices: [
    { t: '请老祖解释',
      ok: { text: '“那年喝多了，跟人打赌闯到底。这破地方本座熟——下一层的门，听好了。”', fx: { flag: 'run_reveal', xp: 1 } } },
    { t: '也刻一行', dao: 'k',
      ok: { text: '你刻下“{name}到此二游”，字大一号。老祖：“目无尊长！”又小声：“刻得不错。”', fx: { title: '到此二游' } } },
    { t: '替他擦掉', dao: 'r',
      ok: { text: '老祖急了：“别！”半晌又道，“……留着吧。那时候身边还跟着两个徒弟。”', fx: { xp: 2 } } }
  ]
},

/* ============================================================
 * 二、宿敌与新秀（23）
 * {ex} 随主角性别是慕容雪或慕容轩，凡涉及{ex}的文本不用“他/她”。
 * ============================================================ */

/* ---------- 慕容（mu）：mu_1 → 和解线 mu_2 / mu_3，寻仇线 mu_4 ---------- */
{
  // 计划“约战胜后 12～36 周天”：用 beat_mu + 筑基～金丹近似这个窗口。
  id: 'mu_1', origin: 'qitu', where: 'home', visit: true, need: ['beat_mu'], minR: 1, maxR: 2, once: true, title: '封口钱',
  text: '慕容家账房捧来锦盒：“家主说往事不必再提。这点心意，换您往后不提‘退婚’二字。”盒缝里漏出灵石的光。',
  choices: [
    { t: '收下锦盒', dao: 'w',
      ok: { text: '你点了点头。从此你不提，慕容家也不提，只是再见{ex}，对方先移开了眼。', fx: { stones: 10, grudge: { mu: -10 } } } },
    { t: '原样退回', dao: 'k',
      ok: { text: '你往盒里添了一枚灵石退回，附言：“赏你。”账房的脸从门口白到山下。', fx: { grudge: { mu: 20 } } } },
    { t: '问{ex}本人', dao: 'r',
      ok: { text: '账房支吾半天：“{ex}不知此事。”你听明白了——这是背着{ex}送的。', fx: { flag: 'mu_asked' } } }
  ]
},
{
  // 样稿；把“她 / 粉衣”改成不分性别的写法（{ex}可能是慕容轩）。
  id: 'mu_2', origin: 'qitu', where: 'exp', bg: ['hill', 'tomb'], minR: 2, once: true, need: ['mu_asked'], title: '狭路',
  text: '乱石后，{ex}一身华服染了半边血，三只尸傀正围上来。对方看见是你，立刻别过脸，握剑的手在抖。',
  choices: [
    { t: '出手', duel: 0.9, dao: 'r',
      ok: { text: '三剑，三只尸傀。{ex}红了眼眶：“……你本可以看我笑话的。”', fx: { xp: 5, grudge: { mu: -30 }, flag: 'mu_saved' } },
      fail: { text: '你替{ex}挡下一爪，两人狼狈逃出。临别，对方塞给你一瓶伤药。', fx: { inj: 2, grudge: { mu: -30 }, flag: 'mu_saved' } } },
    { t: '丢丹就走', cost: { pills: 1 }, dao: 'w',
      ok: { text: '走出很远，身后传来尸傀倒地的闷响，和一声压得很低的“多谢”。', fx: { grudge: { mu: -15 } } } },
    { t: '抱着手看', dao: 'k',
      ok: { text: '{ex}自己杀了出来，停步：“看够了？”你说：“三年前你也是这么看我的。”', fx: { xp: 3, grudge: { mu: 10 } } } }
  ]
},
{
  // “质问慕容家（后续 mu_4）”：mu_4 的条件是恩怨 ≥ 60，数据里写不出“或”。这里置 mu_press，
  // 建议引擎让 mu_4 在 mu_press 时也可触发（客卿的文本两条线都说得通）。
  id: 'mu_3', origin: 'qitu', where: 'home', visit: true, grudge: ['mu', -100, -40], minR: 3, once: true, title: '婚书',
  text: '{ex}独自来，把褪色的婚书放在你桌上：“退婚，是家里拿我换了天剑宗的庇护。我没拦，这是我欠你的。”',
  choices: [
    { t: '收进抽屉', dao: 'w',
      ok: { text: '你没烧也没还，收进了抽屉。{ex}看了那抽屉很久：“那我……以后还能来坐坐吗？”', fx: { grudge: { mu: -10 }, flag: 'mu_friend' } } },
    { t: '烧了它', dao: 'r',
      ok: { text: '红封烧得很快。{ex}解下一枚玉佩放在灰旁：“两清。这不是赔礼，是我自己的。”', fx: { item: 'o', grudge: { mu: -20 }, flag: 'mu_clear' } } },
    { t: '去问慕容家', dao: 'k',
      ok: { text: '你把婚书拍在慕容家主面前：“拿人换庇护，这账怎么算？”{ex}在门外全听见了。', fx: { grudge: { mu: -10 }, flag: 'mu_press' } } }
  ]
},
{
  // “归零”写不成赋值，按 −70 近似。请宗门出面需真传（srankMin 2），不满足时只见另外两项。
  id: 'mu_4', origin: 'qitu', where: 'home', visit: true, grudge: ['mu', 60, 100], minR: 3, once: true, title: '客卿',
  text: '慕容家的客卿立在你门口，腰挂七枚剑穗，一枚一场胜仗：“慕容家的脸面被你踩了三年。今日，讨个说法。”',
  choices: [
    { t: '出门应战', duel: 1.2, dao: 'k',
      ok: { text: '七枚剑穗落了一地，客卿深深一揖。慕容家的赔礼单末尾，是{ex}亲笔的“到此为止”。', fx: { grudge: { mu: -70 }, stones: 10, xp: 4 } },
      fail: { text: '你被一剑挑翻在门槛上。客卿走后你才发觉，那一剑收了三分力。', fx: { inj: 3, grudge: { mu: 10 } } } },
    { t: '写信给{ex}', dao: 'r',
      ok: { text: '信只有一行：“你家里请人来打我，你知道吗？”客卿看完变了脸，连夜走了。', fx: { grudge: { mu: -15 }, flag: 'mu_asked' } } },
    { t: '请宗门出面', srankMin: 2, dao: 'w',
      ok: { text: '执事只说一句：“这是我宗真传。”客卿拱手走了。这份人情，不好还。', fx: { favor: { a: -5 }, grudge: { mu: -20 } } } }
  ]
},

/* ---------- 赵乾（zhao）：欺压 → 被超过 → 顶罪 → 报信或带路 ---------- */
{
  id: 'zhao_1', where: 'home', visit: true, minR: 2, maxR: 3, not: ['beat_zhao'], once: true, title: '让摊',
  text: '你刚支好卖丹的摊子，赵乾一脚踩上摊布：“这块地天剑宗包了。识相的，挪到茅房边上去。”',
  choices: [
    { t: '挪摊', dao: 'w',
      ok: { text: '茅房边生意居然更好——排队的人闲着也是闲着。赵乾不知该骂谁。', fx: { stones: 4 } } },
    { t: '掀他下去', duel: 1.1, foe: 'zhao',
      ok: { text: '他连人带四个师弟滚进隔壁药汤锅，满市喝彩，你的丹当天卖空。', fx: { stones: 8, xp: 3, grudge: { zhao: 20 } } },
      fail: { text: '他金气一震把你拍翻，捡起一颗丹嚼了吐掉：“难吃。”', fx: { inj: 2, stones: -3 } } },
    { t: '喊他师门', p: 0.6, dao: 'k',
      ok: { text: '“天剑宗大师兄亲自抢摊位，贵宗缺钱缺到这份上了？”满市哄笑，赵乾拂袖就走。', fx: { stones: 3, grudge: { zhao: 20 } } },
      fail: { text: '师弟们齐声起哄盖过你的声音。赵乾踢翻摊子：“嘴还是这么碎。”', fx: { stones: -3, grudge: { zhao: 10 } } } }
  ]
},
{
  id: 'zhao_2', where: 'exp', bg: ['swords'], minR: 2, need: ['beat_zhao'], once: true, title: '顶罪',
  text: '葬剑渊底，赵乾缩在两柄断剑间，衣上天剑宗云纹撕掉了一半：“宗里丢了东西，说是我拿的……我没有。”',
  choices: [
    { t: '放他走', dao: 'r',
      ok: { text: '你丢给他干粮伤药，指了条小路。他憋出一句：“……我欠你的，我会还。”', fx: { grudge: { zhao: -30 }, flag: 'zhao_owes' } } },
    { t: '押回天剑宗', dao: 'k',
      ok: { text: '执法堂点给你一袋灵石，看都没看他。他被拖走时的眼神，冷得像冰。', fx: { stones: 20, grudge: { zhao: 40 }, karma: 'zhao_bounty', flag: 'zhao_guide' } } },
    { t: '逼问内情',
      ok: { text: '丢的是禁层一卷旧档，记着三千年前一桩事。说到这儿他闭了嘴，当夜自己爬出了渊。', fx: { grudge: { zhao: 10 }, flag: ['clue_tianjian', 'zhao_guide'] } } }
  ]
},
{
  id: 'zhao_3', where: 'story', trigger: 'war_eve:tianjian', need: ['zhao_owes'], title: '无名信',
  text: '门缝塞进一封沾泥的无名信：天剑宗来犯的日子、领兵的人、阵眼该补在哪。字像左手写的，最后一笔却是赵乾惯用的那一钩。',
  choices: [
    { t: '照信布防', dao: 'r',
      ok: { text: '天剑宗果然从信上的山口来，一头撞进你的剑阵。', fx: { flag: 'raid_intel', xp: 2 } } },
    { t: '烧了它', dao: 'w',
      ok: { text: '谨慎些没错——只是灰落下时，你想起他攥着药瓶的那只手。', fx: { xp: 2 } } }
  ]
},

/* ---------- 楚天阔（chu）：傲 → 疑 → 查旧案 → 叛出 / 殉道 ---------- */
{
  // 样稿；补 visit、maxR（文中有老祖）、rankMax 30、未击败楚天阔。
  id: 'tiankuo_1', where: 'home', visit: true, minR: 3, maxR: 7, rankMax: 30, not: ['beat_chu'], once: true, title: '问剑',
  text: '天剑宗圣子楚天阔独自立在门外松下，已站了一个时辰：“我不是来打架的。出一剑，让我看看。”',
  choices: [
    { t: '出剑',
      ok: { text: '他瞳孔一缩：“这收势……是我宗的，又不是。谁教你的？”走时背影第一次不那么直。', fx: { mastery: 10, flag: 'tiankuo_doubt', grudge: { chu: -10 } } } },
    { t: '论道台上看', dao: 'k',
      ok: { text: '他竟笑了：“好，我等你。”老祖哼道：“这小子，倒比他师祖像个剑修。”', fx: { xp: 4, grudge: { chu: 10 } } } },
    { t: '请他喝茶', dao: 'w',
      ok: { text: '他问了七个关于剑的问题，临走只说：“你的剑里有愧。不是你的愧。”', fx: { mastery: 6, flag: 'tiankuo_doubt' } } }
  ]
},
{
  // “帮他拓碑（链 +1）”置 tk_rubbing：可由 ch_tianjian 当作第 2 步“被凿过的剑碑”已完成。
  id: 'tiankuo_2', where: 'exp', bg: ['swords'], minR: 3, maxR: 7, need: ['beat_chu'], once: true, title: '凿碑',
  text: '葬剑渊雾里，楚天阔跪在剑碑前抠着凿痕，边角残着半个“霄”字：“我宗的祖师碑，为什么要凿？”',
  choices: [
    { t: '帮他拓碑', dao: 'w',
      ok: { text: '你们拓了一夜，凿痕下浮出残字。楚天阔一个个认，认到“徒”字时，手停住了。', fx: { grudge: { chu: -10 }, flag: 'tk_rubbing' } } },
    { t: '说出老祖的事', p: 0.5, dao: 'r',
      ok: { text: '他听完把额头抵在碑上，很久才说：“……我自己去查。”', fx: { grudge: { chu: -30 }, flag: 'tk_told' } },
      fail: { text: '“荒谬！”他拔剑就刺，剑招全乱。十几招后，他红着眼走进雾里。', fx: { inj: 2, grudge: { chu: 10 } } } }
  ]
},
{
  // 引擎：tiankuo_ally 时楚天阔可作为第七位同伴；tiankuo_sect 时会武名单里多一个友宗“问剑山”。
  id: 'tiankuo_3', where: 'home', visit: true, minR: 4, maxR: 7, need: ['tianjian_4'], once: true, title: '逐出门墙',
  text: '楚天阔一身泥来到你门口，圣子玉牌只剩一截断绳：“师父说我查得太深。天剑宗，已经没有楚天阔了。”',
  choices: [
    { t: '给他指条路', dao: 'w',
      ok: { text: '东边有座清净空山。半年后，那里挂起一块新匾，叫“问剑山”。', fx: { grudge: { chu: -20 }, flag: 'tiankuo_sect' } } },
    { t: '留下他', dao: 'r',
      ok: { text: '他擦了一夜剑，天亮时说：“往后你去哪，我的剑跟着。”戒指暖了一下。', fx: { grudge: { chu: -30 }, flag: 'tiankuo_ally' } } },
    { t: '劝他认错', dao: 'k',
      ok: { text: '他转身就走，走得比来时还直。风里一句：“我以为你不一样。”', fx: { grudge: { chu: 20 } } } }
  ]
},
{
  // 站哪边由前面的选择定：三项互斥，任何时候只显示一项，就是你能说的那一句话。
  id: 'tiankuo_4', where: 'story', trigger: 'realm:7', need: ['st_justice'], title: '拔剑',
  text: '祖师碑碎石未落，陆天衡白衣负剑走出殿后。楚天阔挡在中间，剑尖在抖——他已经选好了。你只来得及说一句。',
  choices: [
    { t: '这一剑你来', need: ['tiankuo_ally'], dao: 'r',
      ok: { text: '他转身剑指陆天衡，稳如钉地：“师父，徒儿想问您一剑。”陆天衡第一次没笑。', fx: { grudge: { chu: -10 }, flag: 'tk_side_you' } } },
    { t: '替天下看着', need: ['tiankuo_sect'], dao: 'w',
      ok: { text: '他收剑入鞘：“我不帮你，也不帮他。今日之事，问剑山替天下人看着。”', fx: { flag: 'tk_witness' } } },
    { t: '你的剑是真的', not: ['tiankuo_ally', 'tiankuo_sect'], dao: 'r',
      ok: { text: '他剑尖仍指着你：“师恩是真的，就够了。”可出剑时，偏了三寸。', fx: { grudge: { chu: 10 }, flag: 'tk_side_lu' } } }
  ]
},

/* ---------- 血无涯（xue）：猎物 → 对手 → 正魔大战主将 ---------- */
{
  id: 'xue_1', where: 'home', visit: true, sect: true, minR: 3, maxR: 7, once: true, title: '一份贺礼',
  text: '血色纸鹤驮来一只木匣，里面是那位让你劈柴的管事师兄的人头，眼睛还睁着。匣盖写着：“替你出口气，不谢。血无涯。”',
  choices: [
    { t: '原匣退回', dao: 'w',
      ok: { text: '你在匣盖添了一行：“我的气，我自己出。”纸鹤飞回去，翅膀扇得有点不情愿。', fx: { grudge: { xue: 10 } } } },
    { t: '收下匣子', dao: 'k',
      ok: { text: '当夜又来一只纸鹤，只驮一句话：“我就知道，你跟他们不一样。”', fx: { flag: 'xue_gift', karma: 'xue_head' } } },
    { t: '好生安葬', dao: 'r',
      ok: { text: '你在后山给他立了块碑，只刻名字。知道这事的人，看你的眼神变了些。', fx: { favor: { a: 3, b: 3, c: 3 }, grudge: { xue: 5 } } } }
  ]
},
{
  // “拿一件法宝词条换，重铸掉一条”用 fx.affix: -1。
  id: 'xue_2', where: 'exp', bg: ['blood', 'abyss'], minR: 4, once: true, title: '血池垂钓',
  text: '血池边，血无涯坐在小马扎上垂钓，线头拴着个泡得半死的正道弟子：“钓了三天。换你一样东西，就放生。”',
  choices: [
    { t: '下池救人', duel: 1.3, foe: 'xue', dao: 'r',
      ok: { text: '你斩断钓线把人捞出来。血无涯没拦，啧了一声：“正道就是麻烦。”', fx: { xp: 6, grudge: { xue: 20 } } },
      fail: { text: '他一竿把你抽回岸上，又把人扔给你：“这么想要，送你。”你俩都欠了他一回。', fx: { inj: 3, grudge: { xue: 5 } } } },
    { t: '拿剑纹换', dao: 'w',
      ok: { text: '他两指在你剑身一抹，抹走一道纹路，像揩掉一层灰。然后收竿放人。', fx: { affix: -1 } } },
    { t: '转身走开', dao: 'k',
      ok: { text: '身后一声水响，然后安静了。血无涯笑：“我就说，咱们是一路人。”', fx: { grudge: { xue: -10 }, karma: 'xue_bait' } } }
  ]
},
{
  id: 'xue_3', where: 'home', visit: true, minR: 4, need: ['beat_xue'], once: true, title: '池底之火',
  text: '血无涯输了，却提着一坛血酒来找你，放下一枚骨哨：“你赢了我，就该看看我们在怕什么。血池底下有一团火。去不去？”',
  choices: [
    { t: '不去', dao: 'w',
      ok: { text: '他也不恼，一个人喝光了酒：“哪天想知道了，吹它。”骨哨留在了桌上。', fx: { xp: 2 } } },
    { t: '跟他去', dao: 'k',
      ok: { text: '池底烧着一团青白的火——不是魔火，是丹火。血无涯说：“偷来的。”', fx: { toxin: 20, xp: 4, flag: 'clue_fire' } } }
  ]
},

/* ---------- 云无极（yun）：旁观 → 对弈 → 榜首一战 → 天外有天 ---------- */
{
  // 把握随“稳”道心上升：引擎在 p 上加（例如每级 +0.1）。
  id: 'yun_1', where: 'exp', bg: ['stars'], minR: 4, once: true, title: '盲棋',
  text: '碎星殿里，云无极闭眼坐在棋盘边，每落一子，殿外就暗一颗星。对面蒲团空着：“缺个对手。坐。”',
  choices: [
    { t: '坐下对弈', p: 0.5, dao: 'w',
      ok: { text: '第九十七手，星全暗了。他睁眼笑：“我算漏的那一颗在周天之外。你替我记着。”', fx: { xp: 6, flag: 'clue_xingdou' } },
      fail: { text: '你输了半子。他把碎星塞给你：“输棋的人，眼里的星比赢棋的多。”是陨铁。', fx: { ore: 2, xp: 2 } } },
    { t: '掀了棋盘', dao: 'k',
      ok: { text: '他终于睁眼，眼底一片深水：“原来你是这种人。”你看清了他的剑意——水。', fx: { grudge: { yun: 10 }, flag: 'yun_elem' } } }
  ]
},
{
  // 三个回答各置一个 flag，供论道时云无极的台词取用。
  id: 'yun_2', where: 'home', visit: true, rankMax: 4, once: true, title: '早了三年',
  text: '白鹤衔来玉简，是云无极的一句话，像隔着很远的雪：“你来得比我算的早了三年。”鹤歪着头等你回话。',
  choices: [
    { t: '不回', dao: 'w',
      ok: { text: '鹤空着嘴飞走了。论道台上他会知道你的意思——或者以为他知道。', fx: { flag: 'yun_line_s' } } },
    { t: '是你算慢了', dao: 'k',
      ok: { text: '三天后鹤又来，只带回两个字：“很好。”字迹比上回用力。', fx: { grudge: { yun: 10 }, flag: 'yun_line_k' } } },
    { t: '我差点没来', dao: 'r',
      ok: { text: '你说了实话。鹤飞走时，那片雪落在你手背上，很久没化。', fx: { grudge: { yun: -10 }, flag: 'yun_line_r' } } }
  ]
},
{
  // 两项都解锁天道试炼说明（trial_hint）；“问”另得一条图鉴条目（yun_codex）。
  id: 'yun_3', where: 'story', trigger: 'beat:yun', title: '天外有天',
  text: '论剑台上风停了。云无极捡起断剑，抬头看天：“我以为打败我的人会让我高兴。可上面，还有人在看我们。”',
  choices: [
    { t: '上面是谁',
      ok: { text: '“只知道它们出题，从不改卷。”他递来半截剑，“上去以后，替我看看题目。”', fx: { xp: 5, flag: ['trial_hint', 'yun_codex'] } } },
    { t: '陪他看天', dao: 'w',
      ok: { text: '你陪他看云。他忽然笑了：“你倒比我会过日子。”留下一卷写满规矩的手札。', fx: { xp: 3, flag: 'trial_hint' } } }
  ]
},

/* ---------- 陆天衡（终局反派） ---------- */
{
  id: 'tianheng_1', where: 'story', trigger: 'realm:6', need: ['st_truth'], title: '隔空传音',
  text: '有人隔空传音，温和得像个长辈：“我是陆天衡。宗主之位换那枚戒指，如何？何必替一个死人拼命。”戒指冷得像冰。',
  choices: [
    { t: '骂回去', dao: 'k',
      ok: { text: '你把三千年的账一笔笔骂了回去。那头只回两个字：“可惜。”老祖低声道：“骂得好。”', fx: { xp: 5 } } },
    { t: '假意答应', p: 0.5, dao: 'w',
      ok: { text: '“容我想想。”他信了，或者装作信了。天剑宗集结的人马，又散回了山门。', fx: { flag: 'raid_delay' } },
      fail: { text: '“你撒谎的样子，和我那位师父一模一样。”传音断了，天剑宗彻夜灯火通明。', fx: { xp: 2 } } },
    { t: '为什么？', dao: 'r',
      ok: { text: '他停了很久：“因为他站得太高，从没回头看过我。”戒指里，老祖一夜没说话。', fx: { xp: 4, flag: 'tianheng_why' } } }
  ]
},
{
  // 计划列了四种结局，所以是四项；“公之于众”只在旧案链走完（tianjian_6）时出现，平时只见三项。
  id: 'tianheng_2', where: 'story', chain: 'ch_sword', step: 5, trigger: 'realm:7', need: ['st_justice'], speaker: 'elder', title: '了断',
  text: '陆天衡跪在{stele}，剑断冠散，竟有几分像{cradle}里的你：“师父还在戒指里吧？替我问一句，他后悔收我吗？”老祖没有出声。',
  choices: [
    { t: '一剑了断', dao: 'k',
      ok: { text: '他没躲。血还没干，戒指里一声很轻的：“……也好。”', fx: { xp: 10, karma: 'tianheng', flag: 'tianheng_dead' } } },
    { t: '废他修为',
      ok: { text: '三千年修为像漏底的水缸淌走。他竟松了口气：“原来做凡人这么累。”', fx: { xp: 8, flag: 'tianheng_crippled' } } },
    { t: '公之于众', need: ['tianjian_6'], dao: 'w',
      ok: { text: '楚天阔在会武台上念完旧档，满场无声。陆天衡自己摘下宗主印，放在墨离牌位前。', fx: { xp: 10, title: '昭告天下', flag: 'tianheng_exposed' } } },
    { t: '放他走', dao: 'r',
      ok: { text: '他踉跄下山，没有回头。戒指里一片沉默，老祖终究什么也没说。', fx: { xp: 6, flag: 'tianheng_spared' } } }
  ]
},

/* ---------- 新秀（rookie，自动生成，文本里称“那少年”；不提老祖，因为化神到渡劫都会出现） ---------- */
{
  id: 'new_1', where: 'story', trigger: 'rookie:appear', once: false, title: '后起之秀',
  text: '天骄榜末尾冒出一个新名字，还有句狂话传遍坊市：“三年之内，我踩着{name}上去。”说话的少年才十六岁。',
  choices: [
    { t: '记下名字', dao: 'w',
      ok: { text: '你把名字写在墙上，想起当年{cradle}墙上，你也这么写过一个名字。', fx: { xp: 1 } } },
    { t: '去看他一眼',
      ok: { text: '那少年拳风里一股不服输的狠劲，你认得——那是你自己。', fx: { flag: 'rookie_seen' } } }
  ]
},
{
  id: 'new_2', where: 'story', trigger: 'rookie:near', once: false, title: '登门约战',
  text: '那个少年真的追进了榜前五，剑横身前站在你门口，衣角磨破了：“{name}，我来了。三年，我只用了一半。”',
  choices: [
    { t: '应战', duel: 1.0, foe: 'rookie', dao: 'k',
      ok: { text: '你赢得并不轻松。他喘了很久，抹把脸：“下回。”你忽然很想请他喝碗茶。', fx: { xp: 6, rookie: 'win' } },
      fail: { text: '你输了半招，他愣了半天才抱拳。榜上，他排到了你前面。', fx: { inj: 2, xp: 2, rookie: 'lose' } } },
    { t: '指点三招', dao: 'r',
      ok: { text: '你折根树枝，三招都点在他最得意处。他站了很久，深深一揖：“受教。”', fx: { xp: 3, flag: 'rookie_taught', rookie: 'teach' } } },
    { t: '闭门不见', dao: 'w',
      ok: { text: '他在门外骂了三天，很有文采，被说书人记成了一本。', fx: { title: '缩头真人' } } }
  ]
},
{
  // 收徒要有徒弟名册（真传起，srankMin 2）；名册满时引擎应拒收并改走“赠他一门功法”。
  id: 'new_3', where: 'story', trigger: 'rookie:beaten', once: false, title: '跪门',
  text: '被你打下榜的少年在门外跪了一夜，剑柄朝着你的门。天亮你开门，他磕头：“输给你，我服。求您收下我。”',
  choices: [
    { t: '赠他一门功法', dao: 'w',
      ok: { text: '你把一门自己练熟的功法抄进玉简，没有落款。他捧着玉简走了，走得很快，像怕你反悔。', fx: { xp: 2, flag: 'rookie_gift' } } },
    { t: '收下他', srankMin: 2, dao: 'r',
      ok: { text: '你先让他去劈柴，他每一斧都像在出剑。根骨不错，性子还得磨。', fx: { flag: 'rookie_disciple' } } },
    { t: '赶他走', dao: 'k',
      ok: { text: '“跪着的人，学不会站着出剑。”门外静了会儿，剑入鞘，脚步走远。', fx: { xp: 1 } } }
  ]
},
{
  // 计划第三项“亲自去收拾”是一趟 4 周天的特殊历练；这里就地写成一场对决（不另开历练），如要做成历练再改。
  id: 'new_4', where: 'story', trigger: 'rookie:trouble', need: ['rookie_taught'], once: false, title: '冒名',
  text: '你指点过的那个少年砸了{town}一家赌坊，报的是你的名号：“我师父是{name}！”赌坊打手已到山下。',
  choices: [
    { t: '认下这笔账', cost: { stones: 8 }, dao: 'r',
      ok: { text: '你赔了桌椅，顺手收走假骰子。街角那少年看你的眼神，从心虚变成了别的什么。', fx: { flag: 'rookie_loyal', unflag: 'rookie_taught' } } },
    { t: '不认', dao: 'w',
      ok: { text: '“{name}没收过徒弟。”那少年被扣了三天，出来后再没提过你。', fx: { flag: 'rookie_spurned', unflag: 'rookie_taught' } } },
    { t: '亲自去一趟', duel: 1.1, dao: 'k',
      ok: { text: '赌坊东家是个金丹散修。三招后，他把账本和少年一起交了出来。', fx: { stones: 10, xp: 4, flag: 'rookie_loyal', unflag: 'rookie_taught' } },
      fail: { text: '你和少年背靠背打出赌坊，都挂了彩。回山一路他没敢吭声。', fx: { inj: 2, flag: 'rookie_loyal', unflag: 'rookie_taught' } } }
  ]
},

/* ============================================================
 * 三、坊市与拍卖（where: 'market'，6）
 * ============================================================ */
{
  id: 'mkt_fake', where: 'market', trigger: 'market:restock', title: '标错的价',
  text: '货架底层压着一面铸云雷纹的铜镜，标价比旁边的粗铜镜还低得多。老板在柜台后打盹，口水流到了账本上。',
  choices: [
    { t: '悄悄买下', cost: { stones: 2 }, p: 0.5, dao: 'k',
      ok: { text: '走出三条街你才敢细看：纹里嵌着一道符，一照，经脉淤滞清清楚楚。', fx: { item: 'o' } },
      fail: { text: '回家一照，镜里的你歪着嘴，纹路一擦就掉。老板没标错，是你看错了。', fx: { xp: 1, title: '捡漏未遂' } } },
    { t: '叫醒老板', dao: 'r',
      ok: { text: '老板惊出一身冷汗，硬塞给你一块木牌：“道友厚道！下回来，打折。”', fx: { flag: 'mkt_discount' } } }
  ]
},
{
  id: 'mkt_haggle', where: 'market', trigger: 'market:buy', title: '老板心情好',
  text: '坊市胖老板哼着小曲，三脚金蟾的脑袋都被摸亮了——他家昨夜添了个大胖小子。你手里这件货，他还没报价。',
  choices: [
    { t: '趁机砍价', p: 0.6, dao: 'k',
      ok: { text: '先道喜，再夸孩子，最后叹手头紧。老板一拍大腿：“图个吉利！”', fx: { flag: 'mkt_cut30' } },
      fail: { text: '你砍得太狠，小曲停了：“喜事归喜事，买卖归买卖。”', fx: { xp: 1 } } },
    { t: '原价成交', dao: 'r',
      ok: { text: '老板乐得合不拢嘴，记下你的名字：“下回进货，给你留一格。”', fx: { flag: 'mkt_extra_slot' } } }
  ]
},
{
  // 计划是“宿敌在场”，定为{ex}：慕容家拿婚事换来的家底，正好砸在拍卖场上。
  id: 'auc_rival', origin: 'qitu', where: 'market', trigger: 'auction:rival', grudge: ['mu', 20, 100], title: '隔空比价',
  text: '三楼雅座里，{ex}隔着满堂朝你比了个价。慕容家的家底，看来都押在今天了。台上那件，恰好是你想要的。',
  choices: [
    { t: '替{ex}抬价', p: 0.6, dao: 'k',
      ok: { text: '你跟一口，{ex}咬牙再加；第七口你忽然收手。木槌落下，慕容家账房白了脸。', fx: { grudge: { mu: 10 }, flag: 'mu_overpaid' } },
      fail: { text: '第六口时{ex}先收手，冲你笑了笑。东西归你，价钱翻了几番。', fx: { stones: -12, item: 'need' } } },
    { t: '低头喝茶', dao: 'w',
      ok: { text: '{ex}拍下东西，下楼经过你时顿了一顿，什么也没说。', fx: { xp: 1 } } }
  ]
},
{
  // “老祖也拿不准，给概率”：老祖在结果里报出四六开，并教你认封泥；要赌就选“举牌”。
  id: 'auc_mystery', where: 'market', trigger: 'auction:open', minR: 2, maxR: 7, title: '无名之物',
  text: '压轴前插进一只缠满黑布的木匣，封泥上的印谁也不认得，起拍低得像清库房。满堂没人举牌，你的戒指却轻轻动了一下。',
  choices: [
    { t: '举牌', cost: { stones: 3 }, p: 0.5, dao: 'k',
      ok: { text: '黑布一层层拆开，匣里躺着的东西，正好是你眼下最缺的那件。拍卖师在台上直拍大腿。', fx: { item: 'need', itemUp: 1 } },
      fail: { text: '匣里是一叠三千年前的欠条。老祖咳了一声：“……不是本座。”', fx: { xp: 2, title: '欠条收藏家' } } },
    { t: '请老祖掌眼', dao: 'w',
      ok: { text: '老祖：“四成是宝，六成是坑。”匣子被别人拍走，打开是一叠欠条。', fx: { mastery: 3 } } }
  ]
},
{
  id: 'auc_sell', where: 'market', trigger: 'auction:sell', title: '送拍',
  text: '拍卖行掌柜转着铁胆上门，眼睛直往你闲置的家伙上瞟：“交给小号送拍，下一场给您排压轴。”',
  choices: [
    { t: '交给他', dao: 'w',
      ok: { text: '他用红绸包了三层，付了定金，收条上的估价比你想的多一个零。', fx: { stones: 2, flag: 'auc_consign' } } },
    { t: '再雇个托', p: 0.5, dao: 'k',
      ok: { text: '托在场里举了三回牌，真买家咬牙拍下。掌柜看你的眼神多了几分佩服。', fx: { stones: 8, flag: 'auc_consign' } },
      fail: { text: '托太卖力，最后一口把你的东西拍了回来。佣金照付，掌柜笑得直咳。', fx: { stones: -4, title: '自拍自买' } } },
    { t: '不卖',
      ok: { text: '掌柜也不纠缠，留下一张帖子：下回有好东西，记得找他。', fx: { xp: 1 } } }
  ]
},
{
  // 计划是“魔劫期间或魔宗”，数据里写不出“或”，这里只挂魔劫；魔宗弟子的入口请引擎另开（或复制一份带 sect 条件的）。
  // “卖因果”在身上没有因果时应隐藏（没有对应条件键，引擎判断）。
  id: 'mkt_black', where: 'market', trigger: 'market:restock', world: 'w_mojie', title: '后巷绿灯',
  text: '魔劫一起，坊市后巷亮起一盏绿灯笼。摊上三样：一炉血红禁丹，一杆“收因果”的秤，一块巡察司令牌——谁想举报，自取。',
  choices: [
    { t: '买一炉禁丹', cost: { stones: 6 }, dao: 'k',
      ok: { text: '禁丹像吞了一团火，灵力翻滚得吓人。丹毒也翻上来，沉在丹田底下。', fx: { buff: { cul: 2, ticks: 8 }, toxin: 40 } } },
    { t: '上秤卖因果',
      ok: { text: '摊主只让你说一件亏心事。秤杆翘起，心口压了很久的那块东西，轻了。', fx: { unkarma: 'any', stones: 15 } } },
    { t: '拿令牌举报', dao: 'w',
      ok: { text: '第二天巡察司抄巷，绿灯笼已挂到别处，留下字条：“下回见。”', fx: { stones: 4 } } }
  ]
}

];
if (typeof module !== 'undefined' && module.exports) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
