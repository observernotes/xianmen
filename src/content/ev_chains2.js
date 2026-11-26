/* 废柴仙途 · 事件库扩展：奇遇链补段与出身（SYSTEMS §15 / §16，CONTENT §11、§12）
 * 引擎约定（chains.js / samsara.js）：
 *   chain / step          与 ev_world_chains.js 同一套：完成第 n 步自动置「链短名_n」；同一步的几个版本只会出一个（做过的那一步不再出）。
 *   origin: id | [id]     这一世的出身（qitu 弃徒 / dantong 丹童 / moyi 魔门遗孤 / shoumu 守墓人之后 / sanxiu 散修丹师 / yushou 御兽遗脉）
 *   sectId: [宗门 id]      拜的是这几个宗门之一（jian / dan / dao / xuesha）
 *   {ex}                  非弃徒出身时是约战的对手（丹红袖 / 厉枭 / 雷豹 / 钱通 / 驭天风）
 * 每个事件至少一个不花钱、不掷骰的选项。
 */
(function (root) {
'use strict';
const LIST = [

/* ---------- 魔门遗孤：《魔门圣火》的起点（不必等夜璃三心） ---------- */
{
  id: 'ch_fire_1m', where: 'home', visit: true, chain: 'ch_fire', step: 1, origin: 'moyi', npc: 'ye', speaker: 'ye', once: true, weight: 3, title: '井边的红衣',
  text: '{ye}一身红衣坐在你井沿上，黑红纹路一跳一跳往耳根爬：“枯井里那个小孩，长这么大了。倒杯水——圣火总要咬人。”',
  choices: [
    { t: '输灵力压住', p: 0.6, dao: 'r',
      ok: { text: '你硬把那股火逼退三寸。{ye}靠着井沿喘气：“当年把你塞进井里，就是怕你沾上它。”', fx: { aff: { ye: 8 } } },
      fail: { text: '火毒窜上你半条胳膊。{ye}一把甩开你：“傻子，跟小时候一样傻。”眼眶却红了。', fx: { inj: 2, aff: { ye: 10 } } } },
    { t: '倒杯井水', dao: 'w',
      ok: { text: '{ye}捧着井水喝了，盯着井口看了很久：“这口井，我救过一个人。”', fx: { aff: { ye: 5 }, xp: 1 } } },
    { t: '为何救我',
      ok: { text: '{ye}晃着腿想了想：“那天井边就你一个会哭的。圣火的事，改天再说。”', fx: { aff: { ye: 3 }, xp: 2 } } }
  ]
},

/* ---------- 魔门遗孤入正宗：洗心 ---------- */
{
  id: 'origin_moyi_wash', where: 'story', trigger: 'sect', origin: 'moyi', maxR: 7, sectId: ['jian', 'dan', 'dao'], speaker: 'elder', title: '洗心',
  text: '入宗第三日，长老领你到洗心池边，你腕上的魔门血纹在水下一明一暗。“正宗不问出身，只问你肯不肯洗。”',
  choices: [
    { t: '当众自陈', dao: 'w',
      ok: { text: '你把旧坛、枯井、红衣全说了。长老在名册上添了一行：“往后你是本宗弟子。”', fx: { unkarma: 'any', contrib: 1 } } },
    { t: '跳进池里', p: 0.5, dao: 'r',
      ok: { text: '池水冰得刺骨，血纹一寸寸褪成淡粉色。你爬上来时，长老亲手递来一件干净的道袍。', fx: { cul: 0.01, flag: 'moyi_washed' } },
      fail: { text: '血纹在水里烧起来，红了半池。长老面不改色把你捞上来：“洗不掉也无妨。”', fx: { inj: 1, xp: 3 } } },
    { t: '这是我的根', dao: 'k',
      ok: { text: '你转身就走。长老在背后说：“有骨气的魔头，本宗也收过。”外门榜上照样有你。', fx: { xp: 3, flag: 'moyi_unwashed' } } }
  ]
},

/* ---------- 《墨家遗书》终点：合体那夜，老祖多想起一段 ---------- */
{
  id: 'story_r6_mo', where: 'story', trigger: 'realm:6', need: ['mo_memory', 'st_truth'], speaker: 'elder', title: '错字之后',
  text: '老祖又念起墨离那封没写完的信，在写错的字上停住：“这字是本座教的，他从小写错。”沉默很久，他想起了一件旧事。',
  choices: [
    { t: '想起什么了', dao: 'w',
      ok: { text: '“最后那一剑，他刺偏了半寸——故意留了本座一缕残魂。”戒指第一次凉得像一滴泪。', fx: { xp: 8, aff: { mo: 8 }, flag: 'mo_truth_full' } } },
    { t: '替他写完信', dao: 'r',
      ok: { text: '你补上半句：“弟子不孝，来世再拜。”天亮时，信上的错字被人改对了。', fx: { cul: 0.02, aff: { mo: 10 }, flag: 'mo_truth_full' } } },
    { t: '把信收起来',
      ok: { text: '你把信压在剑匣底下：“有些话，不急着想起来。”老祖哼了一声，没反驳。', fx: { xp: 5 } } }
  ]
},

/* ---------- 非弃徒出身：约战前夜（与 story_pact_eve 同夜，按出身换一段） ---------- */
{
  id: 'origin_pact_eve', where: 'story', trigger: 'pact_eve', origin: ['dantong', 'moyi', 'shoumu', 'sanxiu', 'yushou'], maxR: 1, title: '约前一夜',
  text: '明天就是和{ex}的约了。你把行装摆了一桌，又一样样收回去。老祖难得正经：“这一世换了活法，可人还是那个人——你。”',
  choices: [
    { t: '全都带上', dao: 'w',
      ok: { text: '丹、符、干粮，还有那枚锈戒指。老祖笑你像搬家。', fx: { xp: 2, pills: 1 } } },
    { t: '找{ex}喝酒', p: 0.5, dao: 'r',
      ok: { text: '{ex}愣了半天，还是让你进了门。两人喝了半坛，谁也没提明天。', fx: { xp: 3 } },
      fail: { text: '{ex}隔着门说：“明天见。”你在门口坐着，把酒喝完了。', fx: { xp: 2 } } },
    { t: '早点睡', dao: 'k',
      ok: { text: '你睡得比哪天都香。老祖骂了句“没心没肺”，替你守了一夜。', fx: { xp: 3 } } }
  ]
},

/* ---------- 御兽遗脉：月牙兔的梦（《狐族秘地》的引子，第 1 步开局已完成） ---------- */
{
  id: 'origin_yushou_dream', where: 'home', visit: true, origin: 'yushou', once: true, weight: 3, title: '兔子做梦',
  text: '月牙兔蹲在门槛上，冲着北边的山一个劲竖耳朵。夜里它钻进你袖子，梦里“叽”了三声——像在喊谁的名字。',
  choices: [
    { t: '往北走走', dao: 'w',
      ok: { text: '雪地上一串小狐爪印，到老槐下就断了。树洞里塞着一撮白毛，暖的。', fx: { xp: 3, feed: 4 } } },
    { t: '揉揉它的耳朵', dao: 'r',
      ok: { text: '兔子在你手心睡熟了。你把那撮不知哪蹭来的白毛收了起来。', fx: { petHeart: 1 } } },
    { t: '不管它',
      ok: { text: '第二天兔子把一撮白毛叼到你枕边，像在怪你。', fx: { xp: 1 } } }
  ]
},

/* ---------- 散修丹师：钱通的伙计（约战之前） ---------- */
{
  id: 'origin_sanxiu_rent', where: 'home', visit: true, origin: 'sanxiu', maxR: 0, once: true, weight: 3, title: '收租',
  text: '钱通的伙计又来收租，算盘噼啪响：“铺面钱，上月的利，再加看你不顺眼的钱。”隔壁卖茶的老头低头擦碗。',
  choices: [
    { t: '照付', cost: { stones: 2 }, dao: 'w',
      ok: { text: '伙计掂着钱袋走了。茶老头这才抬头：“破财消灾，也是个法子。”', fx: { xp: 2 } } },
    { t: '把他请出去', duel: 0.6, dao: 'k',
      ok: { text: '伙计连人带算盘滚出长街。第二天，有三家掌柜来你铺里买药。', fx: { stones: 3, xp: 2 } },
      fail: { text: '伙计身后又冒出两人，钱袋被搜走一半。“三年，”你说，“三年后算总账。”', fx: { stones: -2, inj: 1 } } },
    { t: '约战那天算',
      ok: { text: '伙计大笑：“行，连本带利！”你把账单钉在墙上，每天看一眼。', fx: { buff: { cul: 1.2, ticks: 6 } } } }
  ]
},

/* ---------- 丹童：葛老的炉灰（《丹经七页》第 1 步开局已完成，这是开局后第一次来） ---------- */
{
  id: 'origin_dantong_ash', where: 'home', visit: true, origin: 'dantong', npc: 'ge', speaker: 'ge', once: true, weight: 3, title: '炉灰里的字',
  text: '葛老用炉灰写了个“火”字：“你烧的火，老头子都看在眼里。”他把“七之三”那页丹经拍在灰上，“剩下六页，替我找。”',
  choices: [
    { t: '找到您教我', dao: 'r',
      ok: { text: '葛老哼道：“想得美。”转身却把宝贝酒葫芦留在了你炉边。', fx: { aff: { ge: 6 } } } },
    { t: '先学看火', dao: 'w',
      ok: { text: '一夜看火：青是急，白是稳，红是要炸。天亮你炼出一炉好丹。', fx: { herbs: 3, xp: 2 } } },
    { t: '您怎不找', dao: 'k',
      ok: { text: '“老了，跑不动。”走了几步又回头，“也是怕。怕最后一页写的是她的名字。”', fx: { aff: { ge: 3 }, xp: 2 } } }
  ]
},

/* ---------- 守墓人之后：剑冢的门（筑基后上古剑冢对你开放） ---------- */
{
  id: 'origin_shoumu_gate', where: 'home', visit: true, origin: 'shoumu', minR: 1, maxR: 7, once: true, weight: 3, title: '守墓人的钥匙',
  text: '筑基那夜，祖坟边的无字碑裂开，缝里卡着一把铜绿钥匙——是坟后剑冢的门。老祖沉默良久：“那扇门，本座也从里面敲过。”',
  choices: [
    { t: '收下钥匙', dao: 'w',
      ok: { text: '钥匙一入手，北边的山里传来一声极轻的剑鸣。上古剑冢的禁制，对你松开了一道缝。', fx: { xp: 4 } } },
    { t: '对着碑磕三个头', dao: 'r',
      ok: { text: '你磕完头，碑缝里又滚出半块剑穗，穗子上的结和你父亲打的一模一样。', fx: { xp: 3, mastery: 5 } } },
    { t: '您在里面？', dao: 'k',
      ok: { text: '“三千年前的事了。”老祖只催你，“走吧，里面的老伙计等急了。”', fx: { xp: 4 } } }
  ]
}

];
if (typeof module !== 'undefined' && module.exports) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
