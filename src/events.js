/* 废柴仙途 · 事件库（数据） */
(function (root) {
'use strict';
const EVENTS = [

/* ============================================================
 * 一、主线剧情（story）
 * 设定：戒中老祖 = 上古玄霄剑仙残魂。大徒弟陆天衡在其渡劫时背后偷袭，
 * 夺《玄霄剑典》上卷，改名《天剑九式》开创天剑宗；二徒弟墨离拼死将师尊
 * 残魂封入戒指，反背三千年“弑师”骂名。墨无痕是墨离后人，奉祖训寻戒。
 * 老祖记忆残缺，只记得墨离持剑刺来（实为刺向他身后的陆天衡）。合体期揭晓。
 * ============================================================ */
{
  id: 'story_r1', where: 'story', trigger: 'realm:1', speaker: 'elder',
  title: '混沌初醒',
  text: '筑基功成，丹田里杂乱的五色灵根竟融成一团混沌。戒指滚烫，老祖沉默半晌，声音头一回发颤：“混沌圣体……三千年了，本座只在一个人身上见过。”你追问是谁，老祖骂道：“问那么多，修炼去！”',
  choices: [
    { t: '追问到底', ok: { text: '老祖装睡，鼾声打得震天响。你却隐约听见一句梦呓：“……天衡，你那一剑，真狠啊。”', fx: { xp: 5, flag: 'st_r1' } } },
    { t: '乖乖修炼', ok: { text: '“这还差不多。”老祖哼了一声，悄悄渡来一缕精纯剑意，助你稳固境界。', fx: { xp: 8, flag: 'st_r1' } } }
  ]
},
{
  id: 'story_sect', where: 'story', trigger: 'sect', maxR: 7, speaker: 'elder',
  title: '入宗第一天',
  text: '你拜入{sect}，领了外门弟子的灰袍。管事师兄斜眼打量：“杂灵根出身？柴房正缺个劈柴的。”四周一阵哄笑。老祖在戒中打了个哈欠：“小家伙，劈给他看。”',
  choices: [
    { t: '一掌劈试剑石', duel: 0.8,
      ok: { text: '试剑石裂成两半，全场死寂。管事师兄的茶杯砸在自己脚面上，硬是没敢喊疼。', fx: { contrib: 3, xp: 4, title: '劈柴宗师' } },
      fail: { text: '试剑石纹丝不动，你的手肿了三圈。哄笑声更大了——这笔账，你记下了。', fx: { inj: 2 } } },
    { t: '真去劈柴', ok: { text: '你劈了一夜柴，每一斧都暗合剑理。清晨，柴堆整齐如剑阵，路过的长老驻足良久。', fx: { xp: 6, contrib: 1 } } }
  ]
},
{
  id: 'story_pet', where: 'story', trigger: 'pet',
  title: '认主',
  text: '灵宠落进你怀里，先冲着你指间的锈戒又嗅又拱，仿佛认得里头的气息，接着转头舔了舔你的手，尾巴摇得飞快。从今往后，洞府里多了一张要吃饭的嘴。',
  choices: [
    { t: '喂它灵草', cost: { herbs: 2 }, ok: { text: '它吃饱了打个嗝，喷出一小团灵火，把你的眉毛燎掉半边。看来战力是不用愁了。', fx: { buff: { atk: 1.3, ticks: 8 } } } },
    { t: '给它起名', ok: { text: '你想了十几个威风名字，它一个不理，唯独听到“饭桶”时耳朵竖了起来。就这么定了。', fx: { xp: 3, title: '饭桶之主' } } }
  ]
},
{
  id: 'story_r2', where: 'story', trigger: 'realm:2', npc: 'mo', speaker: 'mo',
  title: '夜半黑衣',
  text: '金丹初成的当夜，一道黑影无声立在你榻前，指尖已触到戒指。“把它给我，”黑衣人声音冷得像井水，“你不知道里面关着什么。”老祖罕见地没有开骂，只吐出两个字：“墨家。”',
  choices: [
    { t: '拔剑', duel: 1.5,
      ok: { text: '你拼着金丹震荡逼退他半步。黑衣人挑眉：“有点意思。我叫墨无痕，戒指先寄在你这。”', fx: { xp: 6, aff: { mo: 5 }, flag: 'st_mo_seen' } },
      fail: { text: '你被一指点飞，撞塌半面墙。黑衣人却收了手：“太弱。等你配得上它，我再来取。”', fx: { inj: 2, flag: 'st_mo_seen' } } },
    { t: '质问来意', ok: { text: '“问它当年做过什么。”黑衣人看了戒指一眼，转身没入夜色，窗台上留下一枚墨色剑穗。', fx: { aff: { mo: 3 }, xp: 3, flag: 'st_mo_seen' } } }
  ]
},
{
  id: 'story_r3', where: 'story', trigger: 'realm:3', speaker: 'elder',
  title: '残缺的剑诀',
  text: '元婴大成，天剑宗遣赵乾送来“贺礼”，实为示威。赵乾当众演了一式天剑九式，剑气削平半座山头。老祖冷笑：“好一招天河倒悬——可惜只偷了上半句，下半句在本座这里。”',
  choices: [
    { t: '当场补全', p: 0.7,
      ok: { text: '你依老祖所授随手一剑，剑气倒卷天河。赵乾脸色煞白：“你怎会我宗不传之秘！”仓皇而逃。', fx: { xp: 8, power: 0.03, flag: 'st_sword_flaw', title: '偷师的是你', art: 'z_tianjian' } },
      fail: { text: '你这一剑只得七分形似，仍把赵乾惊得连退三步，撂下狠话匆匆下山。', fx: { xp: 5, flag: 'st_sword_flaw', art: 'z_tianjian' } } },
    { t: '含笑收礼', ok: { text: '你一言不发。夜里老祖把下半句拆给你听，越讲越沉默，最后只叹了一声：“教过的，都教过的。”', fx: { cul: 0.03, flag: 'st_sword_flaw', art: 'z_tianjian' } } }
  ]
},
{
  id: 'story_rank12', where: 'story', trigger: 'rank:12',
  title: '榜上有名',
  text: '天骄榜金光一闪，你的名字挤进前十二。当年落霞城看你笑话的人，如今挤破头想讨一杯喜酒。榜首处，云无极的名字微微一亮——那位天下第一天骄，隔着万里看了你一眼。',
  choices: [
    { t: '遥遥举杯', ok: { text: '万里之外传来一声轻笑：“我在榜首等你，别让我等太久。”满城修士哗然。', fx: { xp: 6, title: '榜上钉子户' } } },
    { t: '大摆流水席', cost: { stones: 10 }, ok: { text: '流水席摆了三天。慕容家的贺礼被你原封退回，附言四字：当日之赐。', fx: { xp: 4, buff: { cul: 1.5, ticks: 10 } } } }
  ]
},
{
  id: 'story_boss5', where: 'story', trigger: 'boss:5', maxR: 7, speaker: 'elder',
  title: '万剑低眉',
  text: '剑冢之主倒下，漫山残剑忽然齐齐转向，剑尖朝下，如同行礼——拜的不是你，是你指间那枚锈戒。老祖许久才开口：“都是老伙计了……本座，回来晚了。”',
  choices: [
    { t: '代老祖还礼', ok: { text: '你躬身一拜，万剑齐鸣。一柄断剑自行飞入你手，剑脊铭文被人刻意磨去，只剩半个“霄”字。', fx: { item: 'w', itemUp: 1, flag: 'st_stele' } } },
    { t: '问这是何处', ok: { text: '“本座的旧居。”老祖只答了五个字，再不肯多说。一缕古老剑意却悄然渡入你的经脉。', fx: { power: 0.03, xp: 6, flag: 'st_stele' } } }
  ]
},
{
  id: 'story_r4', where: 'story', trigger: 'realm:4', npc: 'mo', speaker: 'mo',
  title: '半块玉简',
  text: '化神之日，墨无痕不请自来，将半块玉简拍在桌上：“我墨家祖训只有一句——寻回锈戒，问师祖：可曾信过墨离？”戒指骤然冰凉。老祖声音嘶哑：“墨离……那个逆徒，也配问？”',
  choices: [
    { t: '请老祖说完', ok: { text: '老祖只道记忆残缺，唯记得最后一幕：墨离持剑向他刺来。墨无痕攥紧玉简，指节发白，未发一言。', fx: { xp: 6, aff: { mo: 5 }, flag: 'st_half' } } },
    { t: '收下玉简', ok: { text: '你把玉简贴身收好。“另外半块，在天剑宗手里。”墨无痕走到门口顿了顿，“别死在我前头。”', fx: { xp: 4, aff: { mo: 8 }, flag: 'st_half' } } }
  ]
},
{
  id: 'story_r5', where: 'story', trigger: 'realm:5', speaker: 'elder',
  title: '祖师画像',
  text: '炼虚有成，天剑宗圣子楚天阔率众压境，逼你交出“窃取本宗剑诀的邪戒”。他祭出祖师画像镇场，画中人白衣负剑、慈眉善目。老祖一字一顿：“陆、天、衡。本座的好大徒弟。”',
  choices: [
    { t: '一剑斩画', duel: 1.2,
      ok: { text: '画像一分为二，夹层里掉出半块玉简。楚天阔道心剧震，天剑宗众人鸦雀无声。', fx: { xp: 10, flag: 'st_lu', title: '欺师灭画' } },
      fail: { text: '你被画中剑意震退，却也震出了夹层里的半块玉简，一把抄在手中，扬长而去。', fx: { inj: 2, xp: 5, flag: 'st_lu' } } },
    { t: '当众质问', ok: { text: '你只问一句：“天剑九式，为何从无第十式？”天剑宗长老面色大变，草草收兵。夜里，有人把半块玉简放在了你门前。', fx: { xp: 7, flag: 'st_lu' } } }
  ]
},
{
  id: 'story_r6', where: 'story', trigger: 'realm:6', speaker: 'elder',
  title: '玄霄',
  text: '合体之日，两块玉简合二为一，三千年前的一幕重现：陆天衡自背后偷袭渡劫的师尊，墨离那一剑，刺的是师尊身后之人。他拼死将师尊残魂封入戒中，自己背了三千年弑师骂名。',
  choices: [
    { t: '唤声玄霄剑仙', ok: { text: '老祖久久无言，再开口时声音苍老：“本座骂了那孩子三千年……替本座，给墨家后人倒杯酒。”', fx: { xp: 10, talent: 1, aff: { mo: 10 }, flag: 'st_truth', art: 'x_xuanxiao_xin' } } },
    { t: '默默陪着', ok: { text: '你在戒指旁坐了一夜。天亮时老祖哑声道：“玄霄剑典下卷，今日起传你。别学天衡，也别学本座。”', fx: { cul: 0.05, power: 0.05, aff: { mo: 10 }, flag: 'st_truth', art: 'x_xuanxiao_xin' } } }
  ]
},
{
  id: 'story_r7', where: 'story', trigger: 'realm:7', npc: 'mo', speaker: 'elder',
  title: '问剑天剑宗',
  text: '大乘既成，你与墨无痕并肩踏上天剑宗山门。护山大阵三千年不破，老祖只笑了一声：“这阵，是本座教的。”阵开，万剑出鞘，却无一柄肯指向你。祖师碑前，楚天阔横剑而立。',
  choices: [
    { t: '碎碑正名', duel: 1.2,
      ok: { text: '祖师碑碎，碑心藏着的剑典上卷重见天日。墨离之名，自今日起刻入正史。墨无痕背过身去，肩头微颤。', fx: { xp: 12, power: 0.05, aff: { mo: 15 }, flag: 'st_justice', title: '清理门户' } },
      fail: { text: '你与楚天阔两败俱伤，墨无痕替你补上最后一剑。碑碎，真相大白，他扶着你下山：“欠你的。”', fx: { inj: 3, xp: 8, aff: { mo: 15 }, flag: 'st_justice' } } },
    { t: '只讨公道', ok: { text: '你令天剑宗昭告天下、改立墨离牌位，却留了山门。老祖轻声道：“比本座当年有气度。”', fx: { xp: 10, cul: 0.05, aff: { mo: 10 }, flag: 'st_justice', title: '以德服宗' } } }
  ]
},
{
  id: 'story_r8', where: 'story', trigger: 'realm:8', speaker: 'elder',
  title: '最后一课',
  text: '劫云压顶之前，老祖的声音轻得像风：“本座这缕残魂，撑到今日已是赚了。九重雷劫的第一道心劫，为师替你挡。”戒指上的锈迹片片剥落，露出温润如新的玉色。',
  choices: [
    { t: '“师父，别走”', ok: { text: '“头一回叫师父，偏挑这种时候。”老祖笑骂，“破庙那夜捡到你，是本座三千年里最走运的事。去吧，替为师看看天上。”', fx: { xp: 12, buff: { cul: 2, ticks: 12 }, flag: 'st_farewell', title: '玄霄传人', art: 'z_xuanxiao_jian' } } },
    { t: '磕三个头', ok: { text: '你郑重三拜。戒中再无声息，只余一道剑意静静护在你心口，像一只按在肩头的手。', fx: { xp: 8, power: 0.08, flag: 'st_farewell', title: '玄霄传人', art: 'z_xuanxiao_jian' } } }
  ]
},
{
  id: 'story_daolv', where: 'story', trigger: 'daolv',
  title: '结契之礼',
  text: '结契大典那日，三宗来贺，流霞铺了十里。你牵着道侣的手刚拜完天地，门口忽然一静——慕容家的贺礼到了，送礼的管事满头是汗，进也不是，退也不是。',
  choices: [
    { t: '收礼不见人', ok: { text: '礼单照收，人请回。你敬遍全场，从头到尾没往门口看一眼。这才是最响的一巴掌。', fx: { stones: 15, xp: 5 } } },
    { t: '请进来喝一杯', ok: { text: '你大大方方添了副碗筷。来人坐立难安，一杯酒喝得比吞剑还艰难。满堂宾客暗赞你的气度。', fx: { xp: 8, title: '以酒服人' } } }
  ]
},

/* ============================================================
 * 二、NPC 事件链
 * ============================================================ */

/* ---------- {su}：丹霞谷医修 su_met → su_tea → su_crisis → su_bond → 道侣 ---------- */
{
  id: 'su_1', where: 'exp', bg: ['forest', 'hill'], not: ['su_met'], npc: 'su', speaker: 'su',
  title: '采药人',
  text: '林间传来打斗声。一名丹霞谷医修被三头妖狼逼到崖边，药篓护在身后，嘴上还不饶人：“看什么看？要么帮忙，要么让开，别挡我退路！”',
  choices: [
    { t: '出手相助', duel: 0.9,
      ok: { text: '妖狼溃逃。对方一边嫌你出剑太糙，一边把你手上的擦伤包成了粽子：“我叫{su}。诊金免了。”', fx: { aff: { su: 12 }, herbs: 4, flag: 'su_met' } },
      fail: { text: '你挨了一爪才赶走狼群。对方骂骂咧咧替你敷药，手法却轻得出奇：“我叫{su}，欠你一次。”', fx: { inj: 2, aff: { su: 15 }, flag: 'su_met' } } },
    { t: '丢干粮引开', ok: { text: '你把干粮丢进林子，妖狼追着去了。对方愣了愣，噗嗤一笑：“……也行。我叫{su}。”', fx: { aff: { su: 8 }, flag: 'su_met' } } }
  ]
},
{
  id: 'su_2', where: 'home', visit: true, need: ['su_met'], not: ['su_tea'], npc: 'su', speaker: 'su', weight: 2,
  title: '复诊',
  text: '{su}拎着药箱找上门，进屋先皱眉：“丹炉旁边晾袜子，你是想炼脚气丹？”说着已卷起袖子替你把脉，又掏出一碗黑得发亮的汤药：“经脉里有暗伤。喝。”',
  choices: [
    { t: '捏着鼻子喝', ok: { text: '苦得你灵魂出窍，暗伤却一扫而空。碗底还沉着一颗解苦的蜜饯。', fx: { xp: 5, life: 3, aff: { su: 10 }, flag: 'su_tea' } } },
    { t: '趁机倒掉', p: 0.3,
      ok: { text: '你神不知鬼不觉倒进了花盆，花当场开了三朵。{su}看看花，又看看你，冷笑一声。', fx: { herbs: 3, aff: { su: -3 }, flag: 'su_tea' } },
      fail: { text: '被当场抓获。{su}捏着你的下巴灌了两碗：“倒一碗，罚一碗。”药效倒是翻倍了。', fx: { xp: 7, aff: { su: 6 }, flag: 'su_tea' } } }
  ]
},
{
  id: 'su_visit', where: 'home', visit: true, need: ['su_tea'], npc: 'su', speaker: 'su', aff: [15, 100],
  title: '药香',
  text: '{su}又来了，照例先数落你一通：熬夜打坐、乱吃丹药、历练不带伤药。数落完，把一包新配的药搁在桌上，假装只是顺路。',
  choices: [
    { t: '留下吃饭', cost: { stones: 2 }, ok: { text: '你下厨做了一桌菜。{su}评价“勉强能入口”，然后添了三碗饭。', fx: { aff: { su: 8 }, xp: 2 } } },
    { t: '回赠灵草', cost: { herbs: 5 }, ok: { text: '{su}眼睛一亮，嘴上却说“谁稀罕”。转头就炼成了丹，又给你送回一半。', fx: { aff: { su: 6 }, pills: 1 } } },
    { t: '虚心听训', ok: { text: '你老老实实听了半个时辰。{su}说得口干，自己都笑了：“算了，反正有我看着。”', fx: { aff: { su: 4 }, buff: { cul: 1.3, ticks: 6 } } } }
  ]
},
{
  id: 'su_3', where: 'home', visit: true, need: ['su_tea'], not: ['su_crisis'], npc: 'su', speaker: 'su', aff: [30, 100], minR: 2,
  title: '疫镇',
  text: '{su}深夜叩门，衣角沾着泥：山下小镇染了妖疫，丹霞谷嫌无利可图，不肯拨药。“我一个人的丹不够，”对方咬着唇，头一回对你低了头，“……帮我。”',
  choices: [
    { t: '倾囊相助', cost: { pills: 1, herbs: 5 }, ok: { text: '你们守着药炉熬了三天三夜。疫退那日，全镇百姓相送。{su}靠着你的肩睡着了，手里还攥着药勺。', fx: { aff: { su: 20 }, life: 5, flag: 'su_crisis', title: '活菩萨' } } },
    { t: '上山斩疫源', duel: 1.2,
      ok: { text: '你斩了散播妖疫的毒蛟，取胆入药。{su}替你包扎时手一直在抖：“谁让你一个人去的！”', fx: { aff: { su: 18 }, xp: 6, flag: 'su_crisis' } },
      fail: { text: '你带伤拖回半截蛟尾，药是够了。{su}红着眼骂了你一路，夜里却守在榻边没合眼。', fx: { inj: 3, aff: { su: 15 }, flag: 'su_crisis' } } },
    { t: '爱莫能助', ok: { text: '{su}没有怪你，只点点头，转身走进雨里。那个背影，你记了很久。', fx: { aff: { su: -10 } } } }
  ]
},
{
  id: 'su_4', where: 'home', visit: true, need: ['su_crisis'], not: ['su_bond'], npc: 'su', speaker: 'su', aff: [60, 100],
  title: '药囊',
  text: '月色很好。{su}难得没有数落你，递来一只针脚歪歪扭扭的药囊：“安神的。丑是丑了点，敢笑就还我。”顿了顿，又低声道：“我在丹霞谷没有朋友。你算头一个。”',
  choices: [
    { t: '当场系在腰间', ok: { text: '{su}别过脸去，耳尖通红：“谁让你现在就戴了。”药香清苦，你却一夜好眠。', fx: { aff: { su: 12 }, cul: 0.03, flag: 'su_bond' } } },
    { t: '没忍住笑了', ok: { text: '{su}追着你打了半座山，最后两人躺在草坡上笑到岔气。药囊还是塞进了你怀里。', fx: { aff: { su: 8 }, xp: 4, flag: 'su_bond' } } }
  ]
},
{
  id: 'su_5', where: 'home', visit: true, need: ['su_bond'], npc: 'su', speaker: 'su', aff: [90, 100], daolv: false, weight: 3,
  title: '问心',
  text: '丹霞谷长老为{su}定了一门亲事。{su}连夜跑来，站在你洞府门口，眼眶微红，语气还硬撑着：“我就来问一句。你要是说不在乎，我明天就回去。”',
  choices: [
    { t: '“不许回去”', ok: { text: '{su}怔了一瞬，扑进你怀里，闷声道：“早说啊，笨蛋。”次日，你提着聘礼踏平了丹霞谷的门槛。', fx: { daolv: 'su', aff: { su: 10 }, xp: 5 } } },
    { t: '再给我些时间', ok: { text: '{su}把眼泪憋了回去：“行。亲事我自己去推。但你别让我等到头发白。”', fx: { aff: { su: -5 } } } }
  ]
},

/* ---------- {ye}：魔门圣宗 ye_met → ye_debt → ye_crisis → ye_bond → 道侣 ---------- */
{
  id: 'ye_1', where: 'home', visit: true, not: ['ye_met'], minR: 1, npc: 'ye', speaker: 'ye',
  title: '屋顶来客',
  text: '半夜，屋顶瓦片轻响。有人翘着腿坐在你房梁上喝你的酒，见你醒了也不慌：“听说落霞城出了个被退婚的废柴，我特地来瞧瞧。”腰间一枚血玉令牌——魔门圣宗。',
  choices: [
    { t: '再拿一坛酒', ok: { text: '“有趣。”对方眼睛一亮，与你对饮到天明，临走把空坛倒扣在你头上：“记住了，我叫{ye}。”', fx: { aff: { ye: 12 }, xp: 3, flag: 'ye_met' } } },
    { t: '出手擒拿', duel: 1.3,
      ok: { text: '你扣住了对方手腕。{ye}不恼反笑，凑近低语：“抓这么紧，舍不得我走？”一晃神，人已不见。', fx: { aff: { ye: 10 }, xp: 5, flag: 'ye_met' } },
      fail: { text: '你扑了个空，被自己的腰带捆在了房梁上。笑声飘出老远：“我叫{ye}，下回再来看你。”', fx: { aff: { ye: 8 }, flag: 'ye_met', title: '梁上君子' } } }
  ]
},
{
  id: 'ye_2', where: 'exp', need: ['ye_met'], not: ['ye_debt'], npc: 'ye', speaker: 'ye', weight: 2,
  title: '挡箭牌',
  text: '归途撞见一群正道修士围着{ye}喊打喊杀。{ye}瞧见你，眼睛一弯，径直躲到你身后挽住你的胳膊：“我相好来了，你们有话跟这位说。”几十道目光齐刷刷钉在你身上。',
  choices: [
    { t: '硬着头皮认了', duel: 1.1,
      ok: { text: '你一剑逼退众人。{ye}趴在你肩头笑得直抖：“演得不错，下回还找你。”顺手塞来一袋“出场费”。', fx: { stones: 12, aff: { ye: 12 }, flag: 'ye_debt' } },
      fail: { text: '你被追着打了三十里。事后{ye}替你上药，笑得没心没肺，指尖却放得极轻。', fx: { inj: 2, aff: { ye: 15 }, flag: 'ye_debt' } } },
    { t: '“我不认识”', ok: { text: '{ye}“啧”了一声，自己杀出重围，回头冲你比口型：记、仇、了。当晚你的被子里多了三只蛤蟆。', fx: { aff: { ye: -3 }, flag: 'ye_debt' } } }
  ]
},
{
  id: 'ye_visit', where: 'home', visit: true, need: ['ye_debt'], npc: 'ye', speaker: 'ye', aff: [10, 100],
  title: '恶作剧',
  text: '你一推门，一盆水兜头浇下。{ye}坐在窗台上晃着腿，笑得前仰后合：“堂堂天骄，连这都躲不开？”桌上却摆着一桌还冒热气的魔域小吃。',
  choices: [
    { t: '泼回去', ok: { text: '你反手一道水诀。两人从屋里打到院中，湿成两只落汤鸡，笑声惊飞了半山宿鸟。', fx: { aff: { ye: 8 }, xp: 2 } } },
    { t: '坐下就吃', ok: { text: '辣得你七窍生烟。{ye}托着腮看你灌水，慢悠悠道：“忘了说，这是淬体的。”经脉果然通畅不少。', fx: { aff: { ye: 5 }, buff: { cul: 1.3, ticks: 6 } } } },
    { t: '板起脸', ok: { text: '{ye}撇撇嘴：“没劲。”翻窗走了。小吃倒是给你留下了。', fx: { aff: { ye: -2 }, xp: 1 } } }
  ]
},
{
  id: 'ye_3', where: 'home', visit: true, need: ['ye_debt'], not: ['ye_crisis'], npc: 'ye', speaker: 'ye', aff: [30, 100], minR: 2,
  title: '血衣',
  text: '{ye}浑身是血撞进你洞府，倒下前只说了一句：“圣宗内乱……借我躲一夜。”话音未落，山下火把如龙，正道巡查使已在叩门：交出魔门妖人，否则同罪。',
  choices: [
    { t: '开门迎敌', duel: 1.3,
      ok: { text: '你一人一剑守在门前，一夜无人能进半步。天亮，{ye}望着你满身的伤，头一回笑不出来。', fx: { aff: { ye: 20 }, xp: 6, flag: 'ye_crisis', title: '魔门同党' } },
      fail: { text: '你拼到力竭，终于拖到圣宗援手赶来。{ye}醒后盯着你缠满绷带的手看了很久，一言不发。', fx: { inj: 3, aff: { ye: 18 }, flag: 'ye_crisis' } } },
    { t: '藏进密室', p: 0.6,
      ok: { text: '巡查使搜了三遍一无所获。密室里，{ye}攥着你的衣角昏睡，眉头终于松开。', fx: { aff: { ye: 15 }, flag: 'ye_crisis' } },
      fail: { text: '密室被搜出，你花光积蓄才打点过去，连夜把人送走。{ye}留下一句：“这债，我认。”', fx: { stones: -15, aff: { ye: 12 }, flag: 'ye_crisis' } } },
    { t: '让开门', ok: { text: '{ye}被带走时回头看了你一眼，什么也没说。数日后，听闻有人劫了囚车。', fx: { aff: { ye: -20 } } } }
  ]
},
{
  id: 'ye_4', where: 'home', visit: true, need: ['ye_crisis'], not: ['ye_bond'], npc: 'ye', speaker: 'ye', aff: [60, 100],
  title: '灯会',
  text: '{ye}拉着你溜进魔域的万鬼灯会。满街鬼面花灯里，对方忽然安静下来：“我娘是被正道‘替天行道’的。那年我七岁。”又很快笑起来：“骗你的——你信不信？”',
  choices: [
    { t: '“我信”', ok: { text: '{ye}的笑僵了一瞬，低头把一盏灯塞进你手里：“……傻子。拿好，许了愿的。”灯上写着你的名字。', fx: { aff: { ye: 12 }, power: 0.03, flag: 'ye_bond' } } },
    { t: '默默牵住手', ok: { text: '对方挣了一下，没挣开，也就不挣了。你们并肩看完了整场灯会，谁都没再说话。', fx: { aff: { ye: 10 }, xp: 5, flag: 'ye_bond' } } }
  ]
},
{
  id: 'ye_5', where: 'home', visit: true, need: ['ye_bond'], npc: 'ye', speaker: 'ye', aff: [90, 100], daolv: false, weight: 3,
  title: '赌约',
  text: '{ye}平定内乱，执掌圣宗，当夜却独自来找你，把血玉令牌往桌上一丢：“打个赌。你若敢当着天下正道的面说要我，圣宗归你一半，我归你全部。”眼神亮得惊人。',
  choices: [
    { t: '“我赌”', ok: { text: '次日你昭告天下。正道哗然，魔门欢腾。{ye}笑着笑着红了眼：“这回是你自己跳进来的，一辈子别想跑。”', fx: { daolv: 'ye', aff: { ye: 10 }, title: '正邪通吃' } } },
    { t: '容我想想', ok: { text: '{ye}收回令牌，笑意不达眼底：“行，我等。不过我耐心不好，你知道的。”', fx: { aff: { ye: -5 } } } }
  ]
},

/* ---------- 楚狂：剑痴 chu_met → chu_wine → chu_crisis → chu_bond ---------- */
{
  id: 'chu_1', where: 'exp', bg: ['hill', 'forest', 'swords'], not: ['chu_met'], npc: 'chu', speaker: 'chu',
  title: '拦路剑痴',
  text: '山道中央立着个抱剑的青年，衣衫褴褛，眼神却亮得吓人。他盯着你看了三息，只吐出两个字：“拔剑。”那一身剑意，纯粹得不像话。',
  choices: [
    { t: '应战', duel: 1.0,
      ok: { text: '百招之后你险胜半式。他躺在地上大笑，笑完爬起来：“楚狂。下次，我赢。”', fx: { aff: { chu: 12 }, xp: 6, flag: 'chu_met' } },
      fail: { text: '你败了半招。他收剑摇头：“你藏了东西没使出来。练好了，我再来。楚狂。”', fx: { aff: { chu: 10 }, xp: 4, inj: 2, flag: 'chu_met' } } },
    { t: '绕路走', ok: { text: '你绕了三条山道，他跟了三条山道。你无奈报上名号，他点点头：“楚狂。记住了，你欠我一战。”', fx: { aff: { chu: 4 }, flag: 'chu_met' } } }
  ]
},
{
  id: 'chu_2', where: 'home', visit: true, need: ['chu_met'], not: ['chu_wine'], npc: 'chu', speaker: 'chu', weight: 2,
  title: '第七次约战',
  text: '楚狂又来了。这是他第七次站在你洞府门口，还是那两个字：“拔剑。”不同的是，这回他背上多了两坛酒。',
  choices: [
    { t: '打完再喝', duel: 1.05,
      ok: { text: '你又赢半招。他闷头灌了一坛，忽然说：“我没朋友。你算一个。”这是他说过最长的一句话。', fx: { aff: { chu: 15 }, xp: 5, flag: 'chu_wine' } },
      fail: { text: '他赢了，却皱眉：“你昨夜没睡好，不算。”硬是把赢来的酒分了你一半。', fx: { aff: { chu: 12 }, xp: 4, flag: 'chu_wine' } } },
    { t: '先喝再说', ok: { text: '两坛酒下肚，他话依然很少，但剑搁在了一边。月亮出来时，你们已比划着聊了一夜剑理。', fx: { aff: { chu: 10 }, buff: { atk: 1.3, ticks: 8 }, flag: 'chu_wine' } } }
  ]
},
{
  id: 'chu_visit', where: 'home', visit: true, need: ['chu_wine'], npc: 'chu', speaker: 'chu',
  title: '切磋',
  text: '楚狂蹲在你院墙上啃干饼，见你出来，把饼一丢，手按上了剑柄。不用问，又是那两个字。',
  choices: [
    { t: '奉陪', duel: 1.0,
      ok: { text: '你胜。他认真复盘了一个时辰自己输在哪，然后宣布明天再来。', fx: { aff: { chu: 6 }, xp: 4 } },
      fail: { text: '你负。他难得笑了笑，把自己新悟的一式剑招毫无保留地拆给你看。', fx: { aff: { chu: 6 }, xp: 3 } } },
    { t: '请他吃顿好的', cost: { stones: 3 }, ok: { text: '他吃了八碗饭，放下筷子郑重其事：“好吃。比剑好……不，比剑差一点。”', fx: { aff: { chu: 8 } } } }
  ]
},
{
  id: 'chu_3', where: 'exp', need: ['chu_wine'], not: ['chu_crisis'], npc: 'chu', speaker: 'chu', aff: [20, 100], minR: 2, weight: 2,
  title: '围杀',
  text: '山谷里剑气纵横。楚狂浑身浴血，被十余名天剑宗弟子围在中央——只因他当众说了一句“天剑九式是残的”。他看见你，竟皱眉喝道：“走！与你无关！”',
  choices: [
    { t: '并肩而战', duel: 1.3,
      ok: { text: '你们背靠着背杀穿了剑阵。他喘着粗气问：“为什么不走？”你说，欠你的一战还没打完。他大笑。', fx: { aff: { chu: 20 }, xp: 8, flag: 'chu_crisis' } },
      fail: { text: '你们杀出重围时都成了血人。他背着你走了八十里，一路只重复一句：“别睡。”', fx: { aff: { chu: 22 }, inj: 3, flag: 'chu_crisis' } } },
    { t: '引妖兽搅局', p: 0.6,
      ok: { text: '你引来巡山妖兽冲乱剑阵，趁乱把他拖走。他嫌这法子不够痛快，却把后背的伤交给了你。', fx: { aff: { chu: 12 }, flag: 'chu_crisis' } },
      fail: { text: '等你赶回，他已独自杀出，倚着树只剩半口气。他没怪你，只是那一眼让你难受了很久。', fx: { aff: { chu: 4 }, flag: 'chu_crisis' } } }
  ]
},
{
  id: 'chu_4', where: 'story', trigger: 'npc:chu:60', npc: 'chu', speaker: 'chu',
  title: '半截剑穗',
  text: '楚狂解下剑上那条旧得发白的剑穗，一刀两段，一半递给你。“我师父留的。”他说，“他死的时候，我不在。以后你出事，我一定在。”',
  choices: [
    { t: '系在剑上', ok: { text: '你把半截剑穗系上剑柄。他点点头转身就走，走出十步又回头：“明天，拔剑。”嘴角却是翘着的。', fx: { aff: { chu: 10 }, power: 0.03, flag: 'chu_bond', title: '生死之交' } } },
    { t: '回赠一坛酒', ok: { text: '你搬出藏了最久的那坛酒。他一口气喝干，眼眶被呛得发红——大概是呛的。', fx: { aff: { chu: 12 }, xp: 5, flag: 'chu_bond' } } }
  ]
},
{
  id: 'chu_5', where: 'home', visit: true, need: ['chu_bond'], once: true, minR: 4, npc: 'chu', speaker: 'chu', weight: 2,
  title: '一剑之约',
  text: '楚狂要去闭死关：“成了，剑道通神。不成，埋剑冢。”临行前他把毕生剑悟刻成一枚玉简，推到你面前：“我若回不来，替我用出去，让天下人看看。”',
  choices: [
    { t: '陪他论剑七日', ok: { text: '七日论剑，你们都触到了那层窗纸。他入关前回头：“等我出来，天骄榜上见。”你体内剑骨铮鸣。', fx: { trait: 'sword', aff: { chu: 10 }, xp: 8 } } },
    { t: '玉简先替他存', ok: { text: '你收下玉简，没看。“等你自己出来用。”他愣了愣，重重点头。那背影像一柄出鞘的剑。', fx: { aff: { chu: 15 }, power: 0.05 } } }
  ]
},

/* ---------- 葛老：落魄丹师 ge_met → ge_wine → ge_crisis → ge_bond ---------- */
{
  id: 'ge_1', where: 'home', visit: true, not: ['ge_met'], npc: 'ge', speaker: 'ge',
  title: '门口醉汉',
  text: '一个邋遢老头醉倒在你洞府门口，抱着酒葫芦打呼。你正要绕开，他闭着眼嘟囔：“三息前火候过了半分，这炉回春丹，废喽。”屋里的丹炉应声冒出一股黑烟。',
  choices: [
    { t: '请进屋', ok: { text: '老头自称葛老，进门便把你的丹方批得一文不值，随手改了两味药。再开炉，丹香满室。', fx: { aff: { ge: 12 }, pills: 1, flag: 'ge_met' } } },
    { t: '给他披件衣裳', ok: { text: '你没叫醒他。次日人不见了，门槛上摆着一包上好的灵草，压着一行歪字：葛老，赊账。', fx: { aff: { ge: 10 }, herbs: 4, flag: 'ge_met' } } }
  ]
},
{
  id: 'ge_2', where: 'home', visit: true, need: ['ge_met'], not: ['ge_wine'], npc: 'ge', speaker: 'ge', weight: 2,
  title: '赊酒钱',
  text: '葛老愁眉苦脸蹲在你门口：山下酒肆的掌柜扬言再不还钱就打断他的腿。“小友，江湖救急！老夫拿一张压箱底的丹方抵给你，童叟无欺！”那丹方上还沾着酒渍。',
  choices: [
    { t: '替他还账', cost: { stones: 8 }, ok: { text: '丹方竟是失传的古方。葛老拍着你的肩，酒气熏天：“够意思！往后你的丹，老夫包了。”', fx: { aff: { ge: 15 }, pills: 2, flag: 'ge_wine' } } },
    { t: '只请一顿酒', cost: { stones: 2 }, ok: { text: '账没还，酒倒是喝痛快了。葛老喝高了，把炼丹心得倒豆子似的讲了半宿。', fx: { aff: { ge: 8 }, xp: 5, flag: 'ge_wine' } } },
    { t: '劝他戒酒', ok: { text: '“戒酒？不如戒饭！”葛老气呼呼走了，三步后又折回来把丹方拍在你桌上：“看你顺眼，白送。”', fx: { aff: { ge: 3 }, herbs: 3, flag: 'ge_wine' } } }
  ]
},
{
  id: 'ge_visit', where: 'home', visit: true, need: ['ge_wine'], npc: 'ge', speaker: 'ge',
  title: '蹭饭',
  text: '葛老循着饭香摸进你洞府，自带一只空碗：“老夫掐指一算，今日你这儿有口福。”他瞥了眼你晾晒的灵草，直摇头：“暴殄天物，暴殄天物啊。”',
  choices: [
    { t: '请教炼丹', cost: { herbs: 4 }, ok: { text: '他一边扒饭一边指点，嘴碎得像放鞭炮。一炉炼罢，成丹率高得吓人。', fx: { aff: { ge: 6 }, pills: 1 } } },
    { t: '陪他喝两盅', cost: { stones: 2 }, ok: { text: '三杯下肚，他开始吹嘘当年丹霞谷谁都得叫他一声师叔。吹着吹着，就不说话了。', fx: { aff: { ge: 8 }, xp: 2 } } },
    { t: '囊中羞涩', ok: { text: '你摊开空空的两手。葛老哈哈一笑，蹭完饭抹嘴就走：“下回备好灵草，老夫教你两手。”', fx: { aff: { ge: 2 } } } }
  ]
},
{
  id: 'ge_3', where: 'home', visit: true, need: ['ge_wine'], not: ['ge_crisis'], npc: 'ge', speaker: 'ge', aff: [25, 100], minR: 2,
  title: '赌丹',
  text: '丹霞谷执事带人堵在你门口，当众羞辱葛老是“偷丹方的丧家犬”，扬言赌丹：输了，葛老自断双手。葛老攥着酒葫芦，手抖得厉害——他连一炉像样的药材都凑不齐。',
  choices: [
    { t: '药材我出', cost: { herbs: 8 }, ok: { text: '葛老放下酒葫芦的那一刻，像换了个人。九转丹成，霞光千丈。执事面如死灰，灰溜溜下山。', fx: { aff: { ge: 20 }, pills: 2, flag: 'ge_crisis' } } },
    { t: '先把人打出去', duel: 1.2,
      ok: { text: '你把执事一行丢下了山。葛老怔怔看着你，嘴唇哆嗦半天，只骂出一句：“傻不傻，那是丹霞谷！”', fx: { aff: { ge: 15 }, flag: 'ge_crisis', title: '护短' } },
      fail: { text: '你挨了执事一掌，仍挡在门前不退。葛老红着眼冲上来，一把毒丹粉撒得对方抱头鼠窜。', fx: { inj: 2, aff: { ge: 18 }, flag: 'ge_crisis' } } },
    { t: '这是他的私事', ok: { text: '葛老没说什么，独自跟他们走了。几日后他回来，手还在，只是许久没再登你的门。', fx: { aff: { ge: -12 } } } }
  ]
},
{
  id: 'ge_4', where: 'home', visit: true, need: ['ge_crisis'], not: ['ge_bond'], npc: 'ge', speaker: 'ge', aff: [55, 100],
  title: '旧事',
  text: '葛老这回没带酒。他坐在你炉边，盯着火看了很久：“当年偷丹方的是我徒弟。那孩子家里穷……老夫替他认了。他如今是丹霞谷长老，见了我，绕着走。”',
  choices: [
    { t: '陪他守一炉丹', ok: { text: '你们守着炉火到天明。出丹时他笑了：“老夫后半辈子教得最顺手的，偏是个不肯叫师父的。”', fx: { aff: { ge: 12 }, cul: 0.03, flag: 'ge_bond' } } },
    { t: '替他讨公道', ok: { text: '他摆摆手：“讨什么，那孩子的娘活下来了，值。”又瞪你一眼，“不过这话，老夫爱听。”', fx: { aff: { ge: 10 }, xp: 5, flag: 'ge_bond' } } }
  ]
},
{
  id: 'ge_5', where: 'home', visit: true, need: ['ge_bond'], once: true, minR: 3, npc: 'ge', speaker: 'ge', weight: 2,
  title: '衣钵',
  text: '葛老把一只磨得发亮的旧药鼎搬到你屋里，又把酒葫芦挂在鼎耳上：“老夫的本事，带进棺材可惜。你这块料，丹道上比剑道还邪门。学不学？一句话。”',
  choices: [
    { t: '学', ok: { text: '三个月，他把毕生所学倾囊相授，一口酒没沾。出师那天他才开戒，喝得酩酊大醉，笑得像个孩子。', fx: { trait: 'alch', aff: { ge: 10 } } } },
    { t: '只收鼎', ok: { text: '“嘿，懂事，不耽误老夫喝酒！”他留下药鼎，隔三差五来“验收”，每回顺走一坛酒，留下一匣丹。', fx: { pills: 2, herbs: 6, aff: { ge: 8 } } } }
  ]
},

/* ---------- 白小九：灵狐 bai_met → bai_food → bai_crisis → bai_bond ---------- */
{
  id: 'bai_1', where: 'home', visit: true, not: ['bai_met'], npc: 'bai',
  title: '偷草贼',
  text: '灵田里的灵草一夜之间被啃秃了一角。你顺着牙印找过去，草垛里蜷着一只肚皮滚圆的小白狐，嘴边还挂着半片叶子，正打着饱嗝装死。',
  choices: [
    { t: '拎起来讲理', ok: { text: '小狐狸四爪乱蹬，急得口吐人言：“我、我会还的！我叫白小九，说话算话！”然后又打了个嗝。', fx: { aff: { bai: 8 }, xp: 2, flag: 'bai_met' } } },
    { t: '再给一把', cost: { herbs: 2 }, ok: { text: '它警惕地嗅了嗅，埋头吃光，蹭了蹭你的手心。此后每天清晨，门口都多一颗亮晶晶的石子。', fx: { aff: { bai: 15 }, stones: 3, flag: 'bai_met' } } }
  ]
},
{
  id: 'bai_2', where: 'home', visit: true, need: ['bai_met'], not: ['bai_food'], npc: 'bai', speaker: 'bai', weight: 2,
  title: '化形',
  text: '“恩人！我化形啦！”一个顶着狐耳的少女扑进门，转了个圈，尾巴没藏住。白小九得意没过三息，袖子带翻了你的丹炉——轰的一声，洞府多了个天窗。',
  choices: [
    { t: '罚她修屋顶', ok: { text: '她修了三天，屋顶歪得别具一格，一下雨就漏成水帘洞。她自己很满意，还在梁上刻了只狐狸。', fx: { aff: { bai: 8 }, flag: 'bai_food', title: '水帘洞主' } } },
    { t: '算了，先吃饭', ok: { text: '少女眼泪还挂着，听见“吃饭”耳朵立刻竖了起来。那天她吃了你半个月的口粮，发誓报恩一百年。', fx: { aff: { bai: 15 }, stones: -3, flag: 'bai_food' } } }
  ]
},
{
  id: 'bai_visit', where: 'home', visit: true, need: ['bai_food'], npc: 'bai', speaker: 'bai',
  title: '报恩',
  text: '白小九又来报恩了。上回是一条咸鱼，上上回是别人家的门匾。这回她背着手，尾巴摇得像风车：“恩人猜猜，我带了什么！”',
  choices: [
    { t: '猜是吃的', p: 0.5,
      ok: { text: '猜对了！是她从万妖山脉拖回来的一株灵药，自己馋得直咽口水也没舍得啃。', fx: { aff: { bai: 6 }, herbs: 6 } },
      fail: { text: '是一袋灵石——她把山下恶霸的钱庄“借”空了。你带着她连夜去还了一半。', fx: { aff: { bai: 5 }, stones: 6 } } },
    { t: '先摸摸头', ok: { text: '少女眯起眼睛，喉咙里咕噜咕噜，把要给你看的东西忘得一干二净。', fx: { aff: { bai: 8 } } } }
  ]
},
{
  id: 'bai_3', where: 'home', visit: true, need: ['bai_food'], not: ['bai_crisis'], npc: 'bai', aff: [25, 100], minR: 2,
  title: '猎妖令',
  text: '白小九没来蹭饭。你在山下集市找到了她——关在猎妖师的铁笼里，脖子上套着锁妖环，明码标价。她看见你，拼命摇头，用口型说：别管我，他们人多。',
  choices: [
    { t: '砸笼', duel: 1.25,
      ok: { text: '铁笼碎了一地。小九扑上来抱着你哇哇大哭，鼻涕眼泪全蹭在你衣襟上。猎妖师的摊子，你顺手也掀了。', fx: { aff: { bai: 20 }, stones: 8, flag: 'bai_crisis' } },
      fail: { text: '你硬挨三记锁妖钉，把她抢了出来。她一路哭一路给你包扎，绷带缠得像个粽子。', fx: { inj: 3, aff: { bai: 22 }, flag: 'bai_crisis' } } },
    { t: '照价买下', cost: { stones: 20 }, ok: { text: '你一文不少付了钱，解开锁妖环。小九哭着说要还你三千年的债。当夜，猎妖师的摊子“意外”走了水。', fx: { aff: { bai: 18 }, flag: 'bai_crisis' } } },
    { t: '暂且离开', ok: { text: '你转身走了。几日后听说她自己咬开了铁笼，瘸着腿回了山，很久都没再来敲你的门。', fx: { aff: { bai: -15 } } } }
  ]
},
{
  id: 'bai_4', where: 'story', trigger: 'npc:bai:60', npc: 'bai', speaker: 'bai',
  title: '全部家当',
  text: '白小九吭哧吭哧拖来一只大木箱，“哗啦”倒了你一桌：亮石子、鸟羽、半块糖、一枚缺角的古玉。“我攒了一百年的宝贝，全给恩人！”她挺起胸脯，“小九以后是恩人的家人啦。”',
  choices: [
    { t: '只收半块糖', ok: { text: '你把糖掰成两半，一人一半。她含着糖笑出了小虎牙。这一夜，你的洞府头一回像个家。', fx: { aff: { bai: 12 }, life: 3, flag: 'bai_bond' } } },
    { t: '回赠一间小屋', ok: { text: '你给她辟了间向阳的小屋。她抱着被子滚了三圈。那枚古玉竟是上古灵狐遗宝，自行认你为主。', fx: { aff: { bai: 10 }, treasure: 1, flag: 'bai_bond' } } }
  ]
},
{
  id: 'bai_5', where: 'home', visit: true, need: ['bai_bond'], once: true, minR: 4, npc: 'bai', speaker: 'bai', weight: 2,
  title: '青丘来信',
  text: '青丘的使者找上门：白小九是九尾天狐遗脉，须回族地觉醒血脉，一去百年。小九攥着你的袖子，耳朵耷拉着：“恩人说不去，小九就不去。”',
  choices: [
    { t: '让她去', ok: { text: '她哭着走了，一步三回头。三日后一道白光落进你掌心——她把觉醒的第一条尾巴化作福缘，寄了回来。', fx: { trait: 'koi', aff: { bai: 10 } } } },
    { t: '留下她', ok: { text: '小九欢呼着蹦了三尺高。血脉可以慢慢觉醒，饭不能一天不吃。使者摇头离去，留下一瓶青丘灵露。', fx: { aff: { bai: 15 }, pills: 2, xp: 5 } } }
  ]
},

/* ---------- 墨无痕：st_mo_seen → mo_warn → mo_save → mo_ask → (st_truth) mo_bond ---------- */
{
  id: 'mo_1', where: 'home', visit: true, need: ['st_mo_seen'], not: ['mo_warn'], minR: 2, maxR: 7, npc: 'mo', weight: 2,
  title: '墨色剑帖',
  text: '桌上凭空多了一张墨色剑帖，字迹凌厉：“三日后子时，后山。戒指，或者你的一条胳膊。”帖下还压着一坛好酒。老祖冷哼：“墨家人，还是这副又狠又别扭的德行。”',
  choices: [
    { t: '赴约', duel: 1.4,
      ok: { text: '你接下他十招未退。墨无痕收剑：“十招之约，你赢了。”他把酒抛给你，“戒指里那位的话，别全信。”', fx: { aff: { mo: 10 }, xp: 6, flag: 'mo_warn' } },
      fail: { text: '第七招你就躺下了。他没取戒指，也没取胳膊：“酒留给你养伤。下次，撑到十招。”', fx: { inj: 2, aff: { mo: 6 }, flag: 'mo_warn' } } },
    { t: '酒喝了，不去', ok: { text: '你喝光了酒，蒙头大睡。第四天清晨，门上钉着第二张帖：“……无赖。”字迹似乎有点气急败坏。', fx: { aff: { mo: 4 }, flag: 'mo_warn', title: '无赖' } } }
  ]
},
{
  id: 'mo_2', where: 'exp', need: ['mo_warn'], not: ['mo_save'], minR: 3, npc: 'mo', speaker: 'mo', weight: 2,
  title: '黑衣过客',
  text: '归途中，三名蒙面修士突然截杀——冲着戒指来的，剑路竟是天剑宗的底子。你正要拼命，一道墨色剑光掠过，三人齐齐倒地。墨无痕甩去剑上血珠：“你死了，戒指不好找。”',
  choices: [
    { t: '道谢', ok: { text: '“不必。”他顿了顿，“天剑宗比我更想要那枚戒指，他们怕里面的东西开口。”说罢扔来一瓶丹药。', fx: { aff: { mo: 10 }, pills: 1, flag: 'mo_save' } } },
    { t: '问他为何执着', ok: { text: '他沉默很久：“我家三千年的骂名，系在它身上。”黑衣没入林间，你才发现他的左臂也在渗血。', fx: { aff: { mo: 8 }, xp: 4, flag: 'mo_save' } } }
  ]
},
{
  id: 'mo_3', where: 'home', visit: true, need: ['mo_save', 'st_half'], not: ['mo_ask', 'st_truth'], minR: 4, maxR: 5, npc: 'mo', speaker: 'mo', weight: 2,
  title: '问师祖',
  text: '墨无痕立在你院中，对着戒指，把那句祖训问出了口：“可曾信过墨离？”老祖怒极反笑：“他那一剑刺过来的时候，可曾当我是师父？”一人一魂，隔着三千年对峙。',
  choices: [
    { t: '替墨无痕说话', ok: { text: '“若真要弑师，何必留下祖训，让后人世代来问？”你一句话，让戒指沉默了。墨无痕深深看了你一眼。', fx: { aff: { mo: 15 }, xp: 5, flag: 'mo_ask' } } },
    { t: '替老祖说话', ok: { text: '“他是被最信的人从背后捅了一剑。”墨无痕闭了闭眼：“我会找到证据。”转身时，脚步比来时沉。', fx: { aff: { mo: 5 }, xp: 5, flag: 'mo_ask' } } },
    { t: '摆上三只酒杯', ok: { text: '“吵三千年了，差这一会儿？”一人一魂居然真的安静下来，气氛古怪地喝完了一坛。', fx: { aff: { mo: 10 }, flag: 'mo_ask', title: '和事佬' } } }
  ]
},
{
  id: 'mo_4', where: 'home', visit: true, need: ['st_truth'], not: ['mo_bond'], minR: 6, maxR: 7, npc: 'mo', speaker: 'mo', weight: 3,
  title: '三千年',
  text: '真相大白的那夜，墨无痕提着酒坐在你屋顶，头一回摘了面巾。“我爹到死都以为先祖是罪人。我练剑，是为了有朝一日替先祖向师祖谢罪。”他笑了一声，“结果该谢罪的，另有其人。”',
  choices: [
    { t: '陪他喝到天亮', ok: { text: '老祖破天荒开口：“墨家小子，你先祖的剑，是本座教得最好的。”墨无痕举坛的手停在半空，许久，仰头饮尽。', fx: { aff: { mo: 15 }, xp: 6, flag: 'mo_bond' } } },
    { t: '请老祖亲口说', ok: { text: '“是为师错怪了阿离。”戒中传出的声音很轻。墨无痕翻身下檐，朝着戒指，端端正正磕了三个头。', fx: { aff: { mo: 18 }, flag: 'mo_bond' } } }
  ]
},
{
  id: 'mo_5', where: 'home', visit: true, need: ['mo_bond'], once: true, minR: 7, npc: 'mo', speaker: 'mo', weight: 2,
  title: '同门',
  text: '墨无痕递来一柄墨色长剑：“墨离佩剑，名‘不悔’。按辈分，你是师祖的关门弟子，我得叫你一声小师叔祖。”他面无表情，“只叫这一次。”',
  choices: [
    { t: '收下', ok: { text: '“小师叔祖。”他叫得咬牙切齿。你笑着应了。剑入手温润，三千年的剑意认了你这个同门。', fx: { item: 'w', itemUp: 1, aff: { mo: 10 }, title: '小师叔祖' } } },
    { t: '剑归他，换一战', duel: 1.15,
      ok: { text: '你们痛快打了一场，不为戒指，不为恩怨。他躺在地上望天：“原来有同门，是这种感觉。”', fx: { aff: { mo: 15 }, power: 0.05 } },
      fail: { text: '你输了半招。他伸手把你拉起来，嘴角一勾：“师叔祖，承让。”——看来他不止肯叫一次。', fx: { aff: { mo: 12 }, xp: 6 } } }
  ]
},

/* ============================================================
 * 三、洞府随机事件（home）
 * ============================================================ */
{
  id: 'home_challenger', where: 'home', visit: true,
  title: '上门踢馆',
  text: '一名锦衣修士踹开你的院门，下巴抬得比天高：“听说你就是那个被退婚的废物？本公子赏你个机会，跪下磕头，收你当个提鞋的。”身后跟班齐声叫好。',
  choices: [
    { t: '一招解决', duel: 0.8,
      ok: { text: '一招。锦衣公子嵌进了院墙，抠都抠不下来。跟班们抬着整面墙跑了，还赔了你修门钱。', fx: { stones: 8, xp: 3 } },
      fail: { text: '你大意了，对方竟藏着护身法宝。你被震退数步，对方得意洋洋砸了你的门匾才走。', fx: { inj: 2, stones: -4 } } },
    { t: '装作瑟瑟发抖', p: 0.7,
      ok: { text: '对方大笑着凑近羞辱你——储物袋被你顺手摸走。等他发现时，你已挂牌闭关。', fx: { stones: 12, title: '扮猪专业户' } },
      fail: { text: '你抖得太有节奏，对方起了疑心，骂骂咧咧走了。白挨一顿嘲讽。', fx: { xp: 1 } } }
  ]
},
{
  id: 'home_zhao', where: 'home', visit: true, minR: 1, maxR: 4, once: true,
  title: '大师兄驾到',
  text: '赵乾负手立在你门前，还是当年踢你下山时那副嘴脸：“听说你筑基了？杂灵根走了狗屎运罢了。今日教教你，什么叫云泥之别。”他抬起了脚——还是那只脚。',
  choices: [
    { t: '还他一脚', duel: 0.9,
      ok: { text: '你后发先至，一脚把他踹下山道。他滚了三百级石阶，和当年的你一级不差。', fx: { xp: 8, buff: { atk: 1.3, ticks: 8 }, title: '以脚还脚' } },
      fail: { text: '你接了他三招便气血翻涌。他冷笑离去——可那眼神里，头一回有了忌惮。', fx: { inj: 2, xp: 3 } } },
    { t: '关门送客', ok: { text: '你当着他的面关上了门。门外安静三息，传来气急败坏的踹门声。门是老祖加持过的，他脚肿了。', fx: { xp: 4 } } }
  ]
},
{
  id: 'home_ex_letter', where: 'home', visit: true, minR: 2, once: true,
  title: '迟来的信',
  text: '慕容家的信使送来一封信，落款是{ex}。信写得客气又生分：当年退婚“另有苦衷”，听闻你今非昔比，盼能“一叙旧谊”。信纸熏了香，和退婚书是同一种。',
  choices: [
    { t: '原信退回', ok: { text: '你在信封上添了四个字：论剑台见。据说{ex}看完，摔了一整套茶具。', fx: { xp: 5, title: '已读不回' } } },
    { t: '回信索赔', p: 0.5,
      ok: { text: '你列了一张退婚损失清单。慕容家居然真赔了，只求你别在论剑台上下死手。', fx: { stones: 20 } },
      fail: { text: '慕容家回了两个字：做梦。你把这两个字裱起来挂在墙上，日日激励自己。', fx: { buff: { cul: 1.5, ticks: 8 } } } }
  ]
},
{
  id: 'home_elder_roast', where: 'home', visit: true, maxR: 7, speaker: 'elder',
  title: '老祖点评',
  text: '你打坐正到紧要处，老祖幽幽开口：“本座观察你三天了。腰是弯的，气是散的，脑子里想的是晚饭。你这不叫修炼，叫坐着发呆。”',
  choices: [
    { t: '虚心求教', ok: { text: '老祖骂足半个时辰，顺手替你理顺了三处滞涩的经脉。骂是真难听，效果是真好。', fx: { buff: { cul: 1.6, ticks: 8 } } } },
    { t: '顶嘴', p: 0.5,
      ok: { text: '“您老这么厉害，怎么住戒指里？”戒指安静了。片刻后老祖闷声道：“算你狠。”竟多教了你一手。', fx: { xp: 6 } },
      fail: { text: '老祖冷笑一声，往你识海里灌了一整夜的《清心咒》——他亲自唱的，跑调。', fx: { xp: 1, title: '顶嘴天才' } } }
  ]
},
{
  id: 'home_heart_demon', where: 'home', visit: true, minR: 3, once: true,
  title: '心魔',
  text: '深夜入定，眼前忽然回到落霞城——满堂宾客哄笑，退婚书甩在你脸上，赵乾的鞋底越来越近。一个与你一模一样的声音低语：“你骨子里，还是那个废物。”',
  choices: [
    { t: '看完这场羞辱', p: 0.65,
      ok: { text: '你平静地从头看到尾，然后笑了：“是又如何？我就是从那里爬上来的。”幻象寸寸碎裂。', fx: { trait: 'steady', xp: 6 } },
      fail: { text: '你怒而出剑，斩了个空，气血逆冲。心魔暂退，那句低语却在耳边绕了三天。', fx: { inj: 3, xp: 2 } } },
    { t: '服丹镇压', cost: { pills: 1 }, ok: { text: '丹药入腹，幻象如雾散去。稳妥，却也错过了一次淬炼道心的机会。', fx: { xp: 3 } } }
  ]
},
{
  id: 'home_deviation', where: 'home', visit: true, minR: 1,
  title: '岔气',
  text: '行功到第九周天，一股灵力忽然窜错了经脉，在体内横冲直撞。你半边身子发麻，头顶开始冒白烟——再不处理，就真成“走火入魔”的反面教材了。',
  choices: [
    { t: '服丹疏导', cost: { pills: 1 }, ok: { text: '丹药化开，乱窜的灵力被缓缓导回正途，还顺带冲开了一处隐脉。因祸得福。', fx: { xp: 7 } } },
    { t: '咬牙硬压', p: 0.5,
      ok: { text: '你将灵力一寸寸逼回丹田，经脉被硬生生拓宽了一圈。疼是真疼，赚也是真赚。', fx: { xp: 10 } },
      fail: { text: '灵力炸开，你喷出一口血，头发根根竖起，三天没梳下去。', fx: { inj: 3, title: '爆炸头' } } },
    { t: '散去这口气', ok: { text: '你果断散功。半宿白练，好在人没事。稳，也是一种本事。', fx: { xp: 1 } } }
  ]
},
{
  id: 'home_purple_qi', where: 'home', visit: true, minR: 1,
  title: '紫气东来',
  text: '拂晓，东方天际忽现三万里紫气，百年难遇。附近山头的修士全爬上了屋顶抢着吐纳。你隔壁的散修甚至搬出了锅——据说想接一点回去炖汤。',
  choices: [
    { t: '静心吐纳', ok: { text: '你沉心静气，一缕紫气入体，周身毛孔舒张，瓶颈都松动了几分。', fx: { xp: 8 } } },
    { t: '放开了鲸吞', p: 0.45,
      ok: { text: '混沌之体鲸吞紫气，方圆十里为之一空。隔壁散修端着空锅，幽怨地看着你。', fx: { xp: 14, buff: { cul: 1.5, ticks: 6 } } },
      fail: { text: '吸得太猛，你撑得直打嗝，每个嗝都冒紫光，被邻居围观了一上午。', fx: { xp: 4, title: '紫气嗝王' } } }
  ]
},
{
  id: 'home_storyteller', where: 'home', visit: true, minR: 2,
  title: '说书人',
  text: '山下茶馆的说书人把你的事迹编成了话本《废柴逆袭录》，场场爆满。只是话本里的你身高八尺、三头六臂，一顿饭吃一头牛，还和七位道友纠缠不清。',
  choices: [
    { t: '去听一场', cost: { stones: 1 }, ok: { text: '你坐在角落听得津津有味，还跟着喊了几声好。散场时说书人塞来一份分红：“这位客官面善。”', fx: { stones: 10, title: '话本主角' } } },
    { t: '上门纠正', ok: { text: '你亮明身份。说书人大喜过望，当场把你拉上台。那天你被迫签了三百个名，手腕比练剑还酸。', fx: { stones: 6, xp: 2 } } }
  ]
},
{
  id: 'home_merchant', where: 'home', visit: true, maxR: 7,
  title: '祖传秘宝',
  text: '一个游商在你门口摆摊，神神秘秘掀开破布：“道友，上古大能遗宝，祖传的，今日有缘只卖十枚灵石！”那是一只豁了口的破碗，碗底依稀有字。老祖：“……咦？”',
  choices: [
    { t: '买了', cost: { stones: 10 }, p: 0.5,
      ok: { text: '碗底的字是一篇残缺功法。游商悔得直拍大腿，你抱着碗跑得比遁光还快。', fx: { item: 'a' } },
      fail: { text: '碗底的字是“王记面馆”。老祖那声“咦”，原来是在好奇谁家面馆倒闭了。', fx: { title: '大冤种' } } },
    { t: '砍到一枚灵石', cost: { stones: 1 }, p: 0.3,
      ok: { text: '你杀价杀到游商怀疑人生。成交后翻过碗底，竟真有一篇功法。', fx: { item: 'a' } },
      fail: { text: '游商收了定金，卷起摊子就跑：“不识货！”你只能安慰自己，才亏一枚。', fx: { xp: 1 } } },
    { t: '不买', ok: { text: '你摆摆手。游商转头卖给了隔壁散修，隔壁当晚煮了碗面，说味道不错。', fx: { xp: 1 } } }
  ]
},
{
  id: 'home_sect_chore', where: 'home', visit: true, sect: true,
  title: '藏经阁轮值',
  text: '轮到你去藏经阁扫地。看阁的老执事趴在桌上打盹，口水流了一案。最顶层那排落灰的书架后面，似乎有什么东西在微微发光。',
  choices: [
    { t: '老实扫地', ok: { text: '你把九层楼扫得一尘不染。老执事“恰好”醒了，眯眼看你半晌，丢来一枚玉简：“赏你的。”', fx: { contrib: 3, xp: 4 } } },
    { t: '摸上顶层', p: 0.5,
      ok: { text: '发光的是一册无人问津的残卷，你读了三页便有所悟。下楼时，老执事的鼾声似乎停过一拍。', fx: { xp: 10, contrib: 1 } },
      fail: { text: '你刚伸手，后领就被拎了起来。“扫地扫到书架顶上去了？”罚抄门规三百遍，外加罚俸。', fx: { stones: -3, title: '门规背诵机' } } }
  ]
},
{
  id: 'home_sect_junior', where: 'home', visit: true, sect: true, minR: 2,
  title: '求指点',
  text: '一群外门弟子堵在你洞府外，捧着瓜果，眼巴巴求你指点修行。领头的小弟子涨红了脸：“前辈！我也是杂灵根，他们都说我没救了……”',
  choices: [
    { t: '认真教一下午', ok: { text: '你把自己摔过的跟头一个个讲给他们听。讲着讲着，自己也理清了几处关隘。那孩子朝你深深一揖。', fx: { contrib: 3, xp: 5 } } },
    { t: '丢本笔记', ok: { text: '你把修炼笔记丢了出去。三天后，宗门里人手一本手抄版，封皮题着《废柴真解》。', fx: { contrib: 2, stones: 5, title: '废柴祖师' } } }
  ]
},
{
  id: 'home_sect_elders', where: 'home', visit: true, sect: true, minR: 3,
  title: '抢徒大战',
  text: '两位长老在你洞府门口吵了起来，都要收你做亲传。一个拍出灵石，一个亮出法宝，吵到后来开始互揭老底：“你三百岁还尿过丹炉！”“你偷喝过掌门的药酒！”',
  choices: [
    { t: '谁给得多听谁', ok: { text: '你认真比了比礼单。两位长老咬牙加码三轮，最后你两边的礼都收了，师父一个没拜。', fx: { stones: 15, contrib: 2, title: '礼照收' } } },
    { t: '劝架', p: 0.5,
      ok: { text: '你一番话说得两人握手言和，还合力传了你一式合击秘术。', fx: { xp: 8, contrib: 3 } },
      fail: { text: '两人异口同声：“小辈闭嘴！”然后联手把你“切磋”了一顿，说是考校根基。', fx: { inj: 2, xp: 4 } } }
  ]
},
{
  id: 'home_recruit', where: 'home', visit: true, sect: false, minR: 1, maxR: 7,
  title: '三宗抢人',
  text: '太虚剑宗、丹霞谷、玄天道宗的招揽使者同时到了，在你院里大眼瞪小眼。三份礼单越摞越高，三张笑脸越凑越近。老祖幸灾乐祸：“当年踢你下山的时候，可没人排队。”',
  choices: [
    { t: '礼先收下', ok: { text: '你笑眯眯收下见面礼，只说“容我考虑”。三位使者出门时还在互相使绊子。', fx: { stones: 12, pills: 1 } } },
    { t: '考校三位使者', duel: 1.0,
      ok: { text: '你请三位各出一招，逐一接下。三人看你的眼神，从招揽变成了敬畏。', fx: { xp: 8, title: '面试考官' } },
      fail: { text: '你接到第三招时露了破绽。使者们反倒更热情了：“好苗子，就是欠教！”', fx: { xp: 4, herbs: 4 } } }
  ]
},
{
  id: 'home_crane', where: 'home', visit: true,
  title: '落难仙鹤',
  text: '一只翅膀带伤的仙鹤栽进你的院子，压塌了晾衣杆。它脖子上挂着一枚小玉牌，像是哪家大宗门的信使。它盯着你的灵草，又盯着你，眼神很是矜持。',
  choices: [
    { t: '治伤喂草', cost: { herbs: 3 }, ok: { text: '仙鹤养好了伤，临走绕着你飞了三圈，丢下一只锦囊——它主人的谢礼，出手相当阔绰。', fx: { stones: 14, xp: 3 } } },
    { t: '好吃好喝留它', cost: { herbs: 5 }, p: 0.3,
      ok: { text: '半月后仙鹤真不走了。它主人找上门，看了看它圆了一圈的肚子，叹气放手。', fx: { item: 'pet' } },
      fail: { text: '仙鹤吃饱喝足，优雅地啄了你一口，飞走了。你的晾衣杆至今没人赔。', fx: { xp: 2 } } },
    { t: '替它包扎', ok: { text: '你撕了件旧衣替它裹好翅膀。仙鹤歪头看你半晌，叼走一根晾衣杆，飞走了。', fx: { xp: 1 } } }
  ]
},
{
  id: 'home_thunder', where: 'home', visit: true, minR: 2, once: true,
  title: '雷雨夜',
  text: '惊雷滚过山头，一道接一道劈在你洞府外的老松上。老松不倒，反而越劈越亮——树心里竟孕着一截雷击灵木。雷云未散，下一道随时会落。',
  choices: [
    { t: '冒雷取木', p: 0.55,
      ok: { text: '你卡着两道雷的间隙掠出，抱回灵木炼成法宝。最后一道雷擦着后背落下，只烧焦了衣摆。', fx: { item: 'w' } },
      fail: { text: '你和雷同时到了。灵木碎了大半，人也外焦里嫩，躺了三天才咽得下饭。', fx: { inj: 3, herbs: 5 } } },
    { t: '借雷淬体', p: 0.5,
      ok: { text: '你立于雨中引一丝雷息入体，筋骨齐鸣，肉身更上一层楼。', fx: { power: 0.03 } },
      fail: { text: '引得多了点。你头顶冒着青烟，僵着走回屋，一路同手同脚。', fx: { inj: 2, xp: 3 } } },
    { t: '等雨停', ok: { text: '雨停后灵木已被雷火烧去大半，你捡回一小截入药，聊胜于无。', fx: { herbs: 3 } } }
  ]
},
{
  id: 'home_elder_tale', where: 'home', visit: true, need: ['st_r1'], maxR: 5, once: true, speaker: 'elder',
  title: '老祖讲古',
  text: '夜深，老祖忽然来了谈兴：“本座当年收过两个徒弟。大的稳重周全，人人都夸；小的又倔又闷，三棍子打不出一句话。”他停了很久，“……看人这事，本座不如你。”',
  choices: [
    { t: '“后来呢？”', ok: { text: '“后来本座就住进这破戒指了。”语气轻松，你却听出了三千年没散的涩意。他难得没骂你，传了一段口诀。', fx: { xp: 7 } } },
    { t: '“我算第三个？”', ok: { text: '戒指沉默半晌。“你？你是捡的。”顿了顿，又补一句，“……捡得不亏。”', fx: { xp: 3, buff: { cul: 1.5, ticks: 10 } } } }
  ]
},
{
  id: 'home_chu_tiankuo', where: 'home', visit: true, minR: 3, maxR: 6, once: true,
  title: '圣子战帖',
  text: '天剑宗圣子楚天阔的战帖送到了，烫金大字，措辞傲慢：“弃徒侥幸得势，终是沐猴而冠。三日后山门外，本圣子替师门清理门户。”送帖的弟子鼻孔朝天。',
  choices: [
    { t: '应战', duel: 1.25,
      ok: { text: '三日后，你当着半城修士的面一剑挑飞了他的发冠。楚天阔披头散发，是被弟子们架着走的。', fx: { xp: 12, stones: 10, title: '专治不服' } },
      fail: { text: '你惜败一招。楚天阔却没笑出来——他用了压箱底的秘术才赢，袖中的手还在抖。', fx: { inj: 3, xp: 5 } } },
    { t: '朱笔批改退回', ok: { text: '你把战帖里的错字一一圈出，批了个“丙下”，原样退回。据说楚天阔气得闭关三月。', fx: { xp: 5, title: '朱批丙下' } } }
  ]
},
{
  id: 'home_fans', where: 'home', visit: true, minR: 2,
  title: '门庭若市',
  text: '你成名之后，洞府外天天有人排队：求字的、求指点的、求你摸一下头“沾沾气运”的，还有位大娘坚持要把自家七个晚辈的画像全塞给你。',
  choices: [
    { t: '摸头收费', ok: { text: '摸头一次一枚灵石。你日进斗金，手摸到抽筋。', fx: { stones: 12, title: '摸头大师' } } },
    { t: '闭门谢客', ok: { text: '你挂出“闭关勿扰”的牌子。清净是清净了，牌子第二天就被人当纪念品偷走了。', fx: { buff: { cul: 1.4, ticks: 8 } } } }
  ]
},
{
  id: 'home_old_dream', where: 'home', visit: true, maxR: 3, once: true,
  title: '旧梦',
  text: '你梦见了当年的自己：蜷在破庙角落，浑身是伤，攥着一枚生锈的戒指发抖。那个狼狈的自己抬起头，问你：“后来……我们赢了吗？”',
  choices: [
    { t: '“正在赢”', ok: { text: '梦里的自己笑了，笑着笑着就散了。你醒来时枕边微湿，心境却前所未有地通透。', fx: { xp: 8 } } },
    { t: '披上一件外袍', ok: { text: '你什么也没说，只是把外袍披了过去。醒来后道心澄明，戒指贴着指根，微微发暖。', fx: { buff: { cul: 1.6, ticks: 10 } } } }
  ]
},
{
  id: 'home_alchemy', where: 'home', visit: true,
  title: '开炉',
  text: '你手痒想自己炼一炉丹。丹方是照着抄的，火候是凭感觉的，药材是差不多就行的。炉盖开始咔咔跳动，不知是丹要成了，还是炉要炸了。',
  choices: [
    { t: '加火', cost: { herbs: 4 }, p: 0.5,
      ok: { text: '炉盖冲天而起，两颗丹药滴溜溜落进你掌心，品相居然不坏。', fx: { pills: 2 } },
      fail: { text: '轰！你顶着一张黑脸走出浓烟，眉毛没了。邻居以为你渡劫失败，送来了花圈。', fx: { inj: 2, title: '炸炉宗师' } } },
    { t: '稳妥收火', cost: { herbs: 4 }, ok: { text: '成丹一颗，不好不坏。炼丹这事，果然还是稳字当头。', fx: { pills: 1 } } },
    { t: '赶紧熄火', ok: { text: '你一脚踢翻炉子，满地药渣。手艺不到家，还是先攒够灵草再说。', fx: { xp: 1 } } }
  ]
},
{
  id: 'home_xue_invite', where: 'home', visit: true, minR: 4, once: true,
  title: '魔道请柬',
  text: '血无涯的请柬是一只血色纸鹤，落在你掌心便化作一行字：“正道容不下你这样的人，魔道可以。来，你我共分天下。”纸鹤腹中，还藏着一枚气息诱人的血丹。',
  choices: [
    { t: '血丹弹进山沟', ok: { text: '片刻后，沟里一头野猪长出了獠牙和野心，被你顺手除了。请柬原路烧回。', fx: { xp: 6, title: '油盐不进' } } },
    { t: '假意赴宴', p: 0.5,
      ok: { text: '你吃了他的席，摸清了他的底，临走还顺了一件法宝。血无涯事后掀了桌。', fx: { item: 'w', xp: 4 } },
      fail: { text: '酒里有东西。你逼毒逼了三天，好在没留后患。血无涯的笑声，你记下了。', fx: { inj: 3 } } },
    { t: '炼化血丹', p: 0.4,
      ok: { text: '混沌之体百无禁忌，血丹被炼得干干净净。血无涯赔了丹药又折了面子。', fx: { xp: 12 } },
      fail: { text: '血丹里藏着一缕魔念，你耗了不少本源才将它磨灭。', fx: { life: -5, xp: 4 } } }
  ]
},
{
  id: 'home_yun_chess', where: 'home', visit: true, minR: 6, once: true,
  title: '榜首对弈',
  text: '云无极独自登门，白衣不染尘，带了一副棋。“论剑台上人多眼杂，我想先看看你。”这位天下第一天骄落子如飞，“我无敌太久，很寂寞。你别让我失望。”',
  choices: [
    { t: '手谈一局', p: 0.5,
      ok: { text: '你险胜半子。云无极怔了怔，抚掌大笑：“痛快！”起身一礼，留下那副星辰炼成的棋子。', fx: { treasure: 1, xp: 8 } },
      fail: { text: '你输了三子。他却很高兴：“能让我算到第一百手的，你是头一个。”留下一卷暗藏道韵的棋谱。', fx: { xp: 10 } } },
    { t: '掀棋盘动手', duel: 1.3,
      ok: { text: '一招之后，两人各退三步。云无极眼中燃起久违的战意：“论剑台上，我全力以赴。”', fx: { power: 0.05, title: '云端来客' } },
      fail: { text: '你被他一指点退七步。“还差一点，”他认真道，“我等你。”竟无半分轻视。', fx: { xp: 8, inj: 2 } } }
  ]
},
{
  id: 'home_rust', where: 'home', visit: true, maxR: 2, speaker: 'elder',
  title: '擦戒指',
  text: '闲来无事，你拿布蘸了醋，想把戒指上的锈擦掉。老祖勃然大怒：“住手！这是本座的门面！你管这叫锈？这叫岁月的包浆！”',
  choices: [
    { t: '继续擦', p: 0.4,
      ok: { text: '一小块锈迹脱落，底下闪过一线温润玉色，一缕精纯灵气逸出。老祖：“……擦都擦了，吸吧。”', fx: { xp: 9 } },
      fail: { text: '擦了半个时辰，锈迹纹丝不动，戒指反倒一股醋味。老祖三天没理你。', fx: { xp: 1, title: '醋坛子' } } },
    { t: '住手赔罪', ok: { text: '“哼，算你识相。”老祖心情一好，指点了你两句，句句切中要害。', fx: { xp: 5 } } }
  ]
},
{
  id: 'home_murong_gift', where: 'home', visit: true, minR: 3, once: true,
  title: '慕容家的礼',
  text: '慕容家的大管事亲自登门，身后抬着八口箱子，腰弯得极低：“当年之事纯属误会，家主日夜懊悔……”三年前，正是此人把退婚书甩在你脸上，还啐了一口。',
  choices: [
    { t: '让他擦地', ok: { text: '你指了指当年那口唾沫落下的方位。大管事脸色青白交加，终是蹲下身，用袖子擦了三遍。箱子，你一口没留。', fx: { xp: 8, title: '恩怨分明' } } },
    { t: '礼收下，人请回', ok: { text: '八口箱子抬进库房，大管事被请出山门。“礼是利息，”你说，“本金，论剑台上找{ex}收。”', fx: { stones: 25 } } }
  ]
},
{
  id: 'home_empty_ring', where: 'home', visit: true, need: ['st_farewell'], once: true, weight: 3,
  title: '空戒',
  text: '你习惯性地对着戒指说了半天话：今天雷云又厚了一层，隔壁的散修搬走了，晚饭的鱼有点咸。戒指安安静静，再没人骂你废话多。',
  choices: [
    { t: '继续说下去', ok: { text: '你把这一路的事从头讲了一遍。讲到破庙那夜，心口那道剑意轻轻一颤，像是有人“哼”了一声。', fx: { xp: 8, buff: { cul: 1.5, ticks: 10 } } } },
    { t: '擦净戒指', ok: { text: '你把戒指擦得莹润如新，重新戴好。“看好了，师父。”你抬头望向劫云，“我替你上去看看。”', fx: { xp: 5, buff: { atk: 1.5, ticks: 10 } } } }
  ]
},

/* ---- 以下十则原是 logic.js 里硬编码的随机事件（randomEvent），并入事件库，作为访客/洞府见闻 ---- */
{
  id: 're_enl', where: 'home', visit: true, weight: 2.2,
  title: '观云有悟',
  text: '清晨推门，云海翻涌如潮。你站在崖边看了半晌，胸中忽然一片澄明，像是有什么东西松动了。',
  choices: [
    { t: '就地打坐', ok: { text: '观云海翻涌，忽有所悟——顿悟！修为大涨。', fx: { xp: 6 } } }
  ]
},
{
  id: 're_cave', where: 'home', visit: true, weight: 1.8,
  title: '古修洞府',
  text: '后山一场山雨冲垮了半面石壁，露出一道刻满符纹的石门。门缝里透出陈年的灵气。',
  choices: [
    { t: '进去看看', ok: { text: '于后山寻得一处古修洞府，石匣里的灵石码得整整齐齐。', fx: { stones: 8 } } },
    { t: '细细搜刮', p: 0.5, ok: { text: '你连墙角的蒲团都翻了，底下竟压着一只小丹瓶。', fx: { stones: 8, pills: 1 } }, fail: { text: '触动了残阵，被弹出洞外，灰头土脸，只抓到一把灵石。', fx: { stones: 3 } } }
  ]
},
{
  id: 're_rain', where: 'home', visit: true, weight: 1,
  title: '天降灵雨',
  text: '乌云不带半点雷声，雨丝落在身上却温润如玉。方圆十里的草木一夜之间拔高了一截。',
  choices: [
    { t: '雨中吐纳', ok: { text: '天降灵雨，修为精进。', fx: { xp: 3 } } },
    { t: '接雨浇田', ok: { text: '你搬出所有的盆盆罐罐。几日后，田里多出一片嫩芽。', fx: { herbs: 3 } } }
  ]
},
{
  id: 're_pill', where: 'home', visit: true, weight: 0.8,
  title: '游方丹师',
  text: '一位背着药葫芦的游方丹师路过，讨了碗水喝，眯眼把你上下打量一番：“小友根基不俗，就是缺点外力。”',
  choices: [
    { t: '请教丹道', ok: { text: '游方丹师路过洞府，临走时在桌上留下一枚破境丹。', fx: { pills: 1 } } }
  ]
},
{
  id: 're_bandit', where: 'home', visit: true, weight: 1,
  title: '劫修夜闯',
  text: '半夜，洞府外的禁制被人一脚踹开。一个蒙面劫修提刀而入：“识相的，把灵石都交出来！”',
  choices: [
    { t: '一剑斩之', duel: 0.9, ok: { text: '劫修夜闯洞府，被一剑斩退！他丢下的储物袋归了你。', fx: { stones: 5 } }, fail: { text: '劫修夜闯洞府，抢走了你不少灵石……此仇必报！', fx: { stones: -4, inj: 1 } } },
    { t: '破财消灾', ok: { text: '你丢出一袋灵石。劫修掂了掂，冷哼一声，翻墙走了。', fx: { stones: -2 } } }
  ]
},
{
  id: 're_taunt', where: 'home', visit: true, weight: 0.9,
  title: '上门打脸',
  text: '天剑宗弟子路过洞府，隔着篱笆高声道：“哟，这不是当年被逐出师门的废物吗？”',
  choices: [
    { t: '一指点出', ok: { text: '一指点出，那人倒飞三里。他的同伴慌忙赔上一袋灵石，头也不敢回。', fx: { stones: 2 } } },
    { t: '关门修炼', ok: { text: '你懒得理会。门外骂了半个时辰，自觉没趣，走了。你的心境反倒更稳了。', fx: { xp: 2 } } }
  ]
},
{
  id: 're_fairy', where: 'home', visit: true, weight: 0.6,
  title: '仙子落难',
  text: '一位衣袂染血的仙子踉跄撞进你的洞府，身后妖兽的咆哮越来越近。',
  choices: [
    { t: '出手相救', ok: { text: '你救下了被妖兽追杀的仙子。她临走时留下一只储物袋，里面是满满的灵石。', fx: { stones: 10 } } }
  ]
},
{
  id: 're_recruit', where: 'home', visit: true, weight: 0.6, sect: false,
  title: '长老登门',
  text: '某大宗长老亲自登门，开口便要收你为亲传弟子，言语间仿佛这是天大的恩典。',
  choices: [
    { t: '婉言谢绝', ok: { text: '长老也不恼，笑着留下见面礼：“想通了，随时来找老夫。”', fx: { stones: 6 } } }
  ]
},
{
  id: 're_ring', where: 'home', visit: true, weight: 0.3, maxR: 7, speaker: 'elder',
  title: '戒中传功',
  text: '夜深人静，戒指微微发烫……“小子，你的根基够了。坐好，老夫传你一门新功法！”',
  choices: [
    { t: '洗耳恭听', ok: { text: '老祖讲了一夜，你记了一夜。天亮时，一门新的心法已在经脉里运转自如。', fx: { item: 'a', itemUp: 1 } } }
  ]
},
{
  id: 're_beast', where: 'home', visit: true, weight: 0.5,
  title: '门口的小兽',
  text: '一只受伤的小兽倒在洞府门口，气息微弱，却还冲你龇了龇牙。',
  choices: [
    { t: '为它疗伤', ok: { text: '你替它包好伤口，又喂了些灵果。它蹭了蹭你的手，再也不肯走了。', fx: { item: 'pet' } } },
    { t: '放它归山', ok: { text: '你把它抱到林边。它一步三回头，最后叼来一株灵草放在你脚边。', fx: { herbs: 2 } } }
  ]
},

/* ============================================================
 * 四、历练随机事件（exp）
 * ============================================================ */
/* ---------- forest ---------- */
{
  id: 'exp_forest_fruit', where: 'exp', bg: ['forest'],
  title: '守药妖兽',
  text: '崖壁上一株朱果熟得正好，树下盘着一头打盹的铁背熊，鼾声如雷。朱果的香气勾得你丹田发痒，熊的爪子比你的脸还大。',
  choices: [
    { t: '悄悄摘', p: 0.55,
      ok: { text: '你屏息摘下朱果，熊翻了个身，继续打呼。满载而归。', fx: { herbs: 8, xp: 3 } },
      fail: { text: '你踩断一根枯枝。接下来一炷香，你充分领教了熊的短跑实力。', fx: { inj: 2, herbs: 2 } } },
    { t: '正面打服', duel: 1.1,
      ok: { text: '铁背熊被你打服了，委屈巴巴让出朱果，还附赠它私藏的蜂蜜。', fx: { herbs: 8, xp: 6 } },
      fail: { text: '你被一巴掌拍进了树干里。熊嗅了嗅你，嫌弃地走了。', fx: { inj: 3 } } }
  ]
},
{
  id: 'exp_forest_cub', where: 'exp', bg: ['forest'], once: true,
  title: '草窠幼兽',
  text: '草窠里卧着一只奄奄一息的幼兽，身旁的母兽已没了气息，伤口是修士的剑痕。幼兽冲你哈气，奶凶奶凶的，腿却抖个不停。',
  choices: [
    { t: '带回去养', cost: { herbs: 3 }, ok: { text: '你用灵草熬了汤，一口口喂它。它活了下来，从此你走到哪，它跟到哪。', fx: { item: 'pet' } } },
    { t: '追凶', duel: 1.15,
      ok: { text: '你追上那伙偷猎的修士，连本带利讨了回来。回头时，幼兽已叼着你的衣角不放。', fx: { item: 'pet', stones: 8 } },
      fail: { text: '对方人多，你带伤而回。幼兽凑过来舔了舔你的伤口，不再哈气了。', fx: { inj: 2, item: 'pet' } } },
    { t: '留下食物离开', ok: { text: '你放下干粮和伤药走了。走出很远，身后传来一声稚嫩的长嚎，像是道谢。', fx: { xp: 3, life: 2 } } }
  ]
},
/* ---------- hill ---------- */
{
  id: 'exp_hill_toll', where: 'exp', bg: ['hill'],
  title: '此山是我开',
  text: '一伙匪修拦住去路，为首的独眼大汉扛着九环刀：“此山是我开！留下买路财！”他打量你朴素的衣着，又补了一句：“看你穷，打个八折。”',
  choices: [
    { t: '哆嗦着掏钱', cost: { stones: 3 }, p: 0.7,
      ok: { text: '你趁他数钱时摸清了山寨位置。当夜，匪窝的库房被“好心人”搬空了。', fx: { stones: 18, title: '黑吃黑' } },
      fail: { text: '他收了钱嫌少，还要搜身。你只好提前翻脸，打是打赢了，没来得及摸库房。', fx: { xp: 3 } } },
    { t: '反过来劫他', duel: 0.9,
      ok: { text: '一炷香后，独眼大汉哭着交出全部家当，并诚恳请教你收不收小弟。', fx: { stones: 15, xp: 4 } },
      fail: { text: '匪修竟会合击阵法，你吃了暗亏，丢下一袋灵石才脱身。', fx: { inj: 2, stones: -6 } } }
  ]
},
{
  id: 'exp_hill_caravan', where: 'exp', bg: ['hill'],
  title: '被劫的商队',
  text: '山坳里，一支商队被匪修围住。护卫死伤殆尽，一位老掌柜护着小孙女，正把祖传的玉佩往匪首手里塞，求对方放过孩子。',
  choices: [
    { t: '出手', duel: 1.1,
      ok: { text: '匪修作鸟兽散。老掌柜千恩万谢奉上谢礼；小姑娘往你手里塞了一颗捂热的糖。', fx: { stones: 14, xp: 4 } },
      fail: { text: '你带伤护着祖孙二人突围。老掌柜丢了货，却把玉佩硬塞给你——竟是一块上好的灵玉。', fx: { inj: 2, herbs: 6 } } },
    { t: '坐等捡漏', p: 0.6,
      ok: { text: '你等到匪修分赃内讧才出手，货物尽入你手。只是那小姑娘的哭声，在你耳边绕了很久。', fx: { stones: 22 } },
      fail: { text: '匪修撤得干净利落，你什么也没捞着，只在地上捡到一只小小的布老虎。', fx: { xp: 1 } } }
  ]
},
/* ---------- tomb ---------- */
{
  id: 'exp_tomb_coffin', where: 'exp', bg: ['tomb'],
  title: '青铜棺',
  text: '主墓室正中停着一口青铜棺，棺盖上刻着一行字：“开棺者，承吾衣钵，亦承吾因果。”棺缝里渗出丝丝寒气，也透出隐约宝光。',
  choices: [
    { t: '开棺', p: 0.5,
      ok: { text: '棺中无尸，只有一卷功法与一行小字：“骗你的，没有因果，老夫只是怕寂寞。”', fx: { item: 'a', xp: 4 } },
      fail: { text: '棺里弹出一只铜拳，正中你鼻梁。棺底刻着：“骗你的，有机关。”前辈高人，真有雅兴。', fx: { inj: 2, title: '开棺有喜' } } },
    { t: '磕三个头', ok: { text: '你恭敬三拜。蒲团下“咔哒”一声弹出个暗格，里头是几株陪葬的灵药。礼多人不怪。', fx: { herbs: 7 } } }
  ]
},
{
  id: 'exp_tomb_ghost', where: 'exp', bg: ['tomb'], once: true,
  title: '残魂遗愿',
  text: '一缕残魂飘在墓道尽头，是个书生模样的修士，死了八百年还在背一首诗：“你若出去，替我去城南柳树下看看。当年有人说，等我回去。”',
  choices: [
    { t: '答应', ok: { text: '柳树已成合抱古木，树下有座小坟，碑上是同一首诗。你回去转述，残魂含笑而散，留下一点毕生修为所凝的灵光。', fx: { xp: 10, title: '信使' } } },
    { t: '炼化残魂', p: 0.6,
      ok: { text: '你强行炼化了残魂。修为涨了，那首没背完的诗却总在你打坐时冒出来。', fx: { xp: 12 } },
      fail: { text: '残魂自爆，震伤了你的神识。八百年的执念，不是那么好吞的。', fx: { inj: 3 } } }
  ]
},
{
  id: 'exp_tomb_mural', where: 'exp', bg: ['tomb'], maxR: 5, once: true,
  title: '壁画',
  text: '墓室壁画绘着一位白衣剑仙渡劫，身后站着两名弟子，一人持剑向前，一人面目被利器刮去。戒指微微一颤，老祖什么都没说。',
  choices: [
    { t: '拓下壁画', ok: { text: '你将壁画拓印收好。夜里，你发觉戒指对着拓本，亮了整整一宿。', fx: { xp: 6 } } },
    { t: '参悟画中剑意', p: 0.6,
      ok: { text: '画中那一剑的意境落入你眼中，如醍醐灌顶。', fx: { xp: 10, buff: { atk: 1.4, ticks: 8 } } },
      fail: { text: '剑意太高，你只看了一眼便头痛欲裂，隐约听见老祖一声叹息。', fx: { xp: 3 } } }
  ]
},
/* ---------- blood ---------- */
{
  id: 'exp_blood_pool', where: 'exp', bg: ['blood'],
  title: '血池',
  text: '秘境深处有一方翻涌的血池，是魔道先辈炼体之所。池边石碑写着：“入池者九死一生。”下面被人歪歪扭扭补了一行：“骗人的，我泡了，挺舒服。”',
  choices: [
    { t: '下去泡', p: 0.5,
      ok: { text: '确实挺舒服。煞气淬骨，你的肉身强了一截，出池时神清气爽。', fx: { xp: 6, buff: { atk: 1.6, ticks: 10 } } },
      fail: { text: '补字的人大概皮比较厚。你泡了三息就蹿了出来，浑身通红像只熟虾。', fx: { inj: 2, xp: 3 } } },
    { t: '只取一瓶', ok: { text: '你装了一瓶池水带走，稀释之后浇灵田，灵草长得张牙舞爪。', fx: { herbs: 7 } } }
  ]
},
{
  id: 'exp_blood_ambush', where: 'exp', bg: ['blood'], minR: 3,
  title: '血衣截杀',
  text: '血雾中走出七名血衣人，为首者亮出血无涯的令牌：“圣子有令：混沌圣体，活的最好，死的也行。”七人脚下，血色阵纹正在成形。',
  choices: [
    { t: '破阵', duel: 1.25,
      ok: { text: '阵未成，你已杀到阵眼。七人倒了六个，剩下那个被你留着回去报信：让血无涯洗干净脖子。', fx: { xp: 8, stones: 14, title: '反杀' } },
      fail: { text: '血阵成形，你苦战突围，一身是血。好在大半是别人的。', fx: { inj: 3, xp: 4 } } },
    { t: '遁走', p: 0.7,
      ok: { text: '你虚晃一剑，遁光贴着阵纹缝隙钻了出去，顺手还摘走了一面阵旗。', fx: { stones: 8 } },
      fail: { text: '遁到一半被血链缠住脚踝，你丢了一袋灵石当买路钱才挣脱。', fx: { stones: -8 } } }
  ]
},
/* ---------- swords ---------- */
{
  id: 'exp_swords_pull', where: 'exp', bg: ['swords'],
  title: '拔剑',
  text: '一柄古剑斜插在剑丘之巅，周围跪着十几具枯骨——都是拔剑不成、被剑意震毙的前人。古剑轻吟，似在挑衅，又似在等待。',
  choices: [
    { t: '拔', p: 0.45,
      ok: { text: '剑意如潮冲刷识海，你咬牙不退。古剑长鸣一声，自行归入你掌中。', fx: { item: 'w', itemUp: 1 } },
      fail: { text: '你被剑意掀飞三十丈。好消息：没变成枯骨。坏消息：是脸先着的地。', fx: { inj: 3, xp: 3 } } },
    { t: '观剑不拔', ok: { text: '你盘坐剑前观摩三日，不动贪念。剑意有灵，临别赠了你一缕锋芒。', fx: { xp: 8, buff: { atk: 1.3, ticks: 8 } } } }
  ]
},
{
  id: 'exp_swords_zhao', where: 'exp', bg: ['swords'], minR: 2, maxR: 6,
  title: '冤家路窄',
  text: '剑冢深处一口剑泉即将喷涌，天剑宗的人已围了个严实。赵乾一见是你，皮笑肉不笑：“剑泉乃我天剑宗先发现的。弃徒，也配染指？”',
  choices: [
    { t: '打进去', duel: 1.1,
      ok: { text: '你把天剑宗弟子一个个丢出圈外，独占剑泉。赵乾挂在一柄残剑上，骂声渐弱。', fx: { xp: 10, buff: { atk: 1.4, ticks: 8 } } },
      fail: { text: '以一敌众终究吃亏，你带伤退走。赵乾的笑声刺耳，这笔账你也默默记上了。', fx: { inj: 2 } } },
    { t: '暗改泉脉', p: 0.6,
      ok: { text: '你绕到地下改了泉脉。剑泉在你脚边喷涌时，赵乾还在上面对着干泉眼训话。', fx: { xp: 9, title: '截胡' } },
      fail: { text: '改到一半被发觉，你只抢到几口泉水便被撵了出来。', fx: { xp: 3 } } }
  ]
},
/* ---------- abyss ---------- */
{
  id: 'exp_abyss_voice', where: 'exp', bg: ['abyss'],
  title: '渊底低语',
  text: '魔渊深处传来温柔的声音，像极了你最想听见的那个人：“累了吧？下来歇一歇。你想要的，这里都有。”脚下的黑雾，正缓缓凝成台阶。',
  choices: [
    { t: '守心硬抗', p: 0.6,
      ok: { text: '你闭目诵诀，任它百般蛊惑岿然不动。魔音散去，道心如洗。', fx: { xp: 9 } },
      fail: { text: '你恍惚间迈下三级台阶才惊醒，神魂被魔气蚀了一角。', fx: { inj: 2, life: -3 } } },
    { t: '将计就计', duel: 1.2,
      ok: { text: '你顺着台阶走下去，一剑钉穿了装神弄鬼的魇魔。它的巢里堆满了历代受害者的遗物。', fx: { stones: 20, xp: 5 } },
      fail: { text: '魇魔比预想的强，你斩下它一只角便抽身而退。', fx: { inj: 2, herbs: 5 } } },
    { t: '捂耳朵就走', ok: { text: '你头也不回。身后那声音气急败坏：“……你倒是听完啊！”', fx: { xp: 2 } } }
  ]
},
{
  id: 'exp_abyss_flower', where: 'exp', bg: ['abyss'], once: true,
  title: '幽冥花',
  text: '一朵幽冥花开在渊壁上，百年一现。花下却趴着个昏迷的年轻修士，魔气已蚀到心口。花只有一朵：自己炼化可涨修为，喂给对方能救一命。',
  choices: [
    { t: '救人', ok: { text: '那人醒后自称某小宗门少主。数月后，一份厚礼和一面“救命恩人”的锦旗送到了你洞府。', fx: { stones: 16, life: 3, title: '热心道友' } } },
    { t: '自己炼化', ok: { text: '花入腹，修为暴涨。你把那人拖到渊口安全处，留了点伤药——能不能活，看造化了。', fx: { xp: 13 } } }
  ]
},
/* ---------- sea ---------- */
{
  id: 'exp_sea_clam', where: 'exp', bg: ['sea'],
  title: '千年蚌精',
  text: '一只磨盘大的老蚌半开着壳晒月光，壳里一颗明珠有拳头大。它察觉到你，壳“啪”地合上，只留一条缝，缝里传出闷声闷气的话：“不卖！”',
  choices: [
    { t: '给它讲笑话', p: 0.5,
      ok: { text: '三个笑话讲完，老蚌笑得壳都合不拢，明珠骨碌碌滚了出来：“送你了，再来一个。”', fx: { stones: 20, title: '东海笑匠' } },
      fail: { text: '一片寂静。老蚌：“……就这？”它把壳合得更紧了，还吐了你一脸水。', fx: { xp: 1 } } },
    { t: '硬撬', duel: 1.15,
      ok: { text: '你硬生生撬开蚌壳取走明珠。老蚌骂骂咧咧沉入海底，骂的是龙宫方言。', fx: { stones: 22, xp: 3 } },
      fail: { text: '蚌壳夹住了你的剑，连人带剑甩出去三里。', fx: { inj: 2 } } }
  ]
},
{
  id: 'exp_sea_prince', where: 'exp', bg: ['sea'], minR: 4,
  title: '龙宫赌斗',
  text: '龙宫三太子拦住去路，龙角上还挂着海草：“人族？听说你们的天骄很能打。来，赢了本太子，宝库任选一件；输了，留下来给我当三年陪练。”',
  choices: [
    { t: '赌了', duel: 1.2,
      ok: { text: '三太子被你按在珊瑚礁上，龙须都歪了。他愿赌服输，还嚷着要跟你拜把子。', fx: { item: 'w', itemUp: 1, title: '揍龙勇士' } },
      fail: { text: '你输了。好在三太子记性差，陪练到第三天他就忘了赌约，还管了你三天海鲜。', fx: { inj: 2, xp: 6 } } },
    { t: '改比喝酒', cost: { stones: 5 }, p: 0.6,
      ok: { text: '龙族海量，可你是混沌之体。三太子醉倒前，把宝库钥匙塞进了你手里。', fx: { item: 'a' } },
      fail: { text: '你醉了三天，醒来发现自己躺在龙宫宴席的桌子底下，怀里抱着一只龙虾。', fx: { xp: 2, title: '千杯必醉' } } }
  ]
},
{
  id: 'exp_sea_wreck', where: 'exp', bg: ['sea'],
  title: '沉船',
  text: '海沟里卧着一艘上古宝船的残骸，船舱被一只巨大的墨章占着。它八条触手各攥着一件亮晶晶的东西，像个守财奴一样挨个擦拭。',
  choices: [
    { t: '以物易物', cost: { stones: 6 }, ok: { text: '你掏出一把亮闪闪的灵石，它眼睛都直了，痛快地换给你一件它“玩腻了”的古物。', fx: { item: 'w' } } },
    { t: '偷一件', p: 0.5,
      ok: { text: '你趁它擦第七件时摸走了第八件。它数了三遍，陷入了深深的自我怀疑。', fx: { stones: 18 } },
      fail: { text: '你被喷了一身墨，三天没洗掉，走到哪都被当成魔修。', fx: { xp: 1, title: '墨染青衫' } } }
  ]
},
/* ---------- stars ---------- */
{
  id: 'exp_stars_core', where: 'exp', bg: ['stars'],
  title: '坠星',
  text: '一枚拳头大的星核正在缓缓熄灭，周围空间不住扭曲。趁它未冷炼化，可得星辰之力；可那扭曲的空间，随时会把靠近的东西撕成碎片。',
  choices: [
    { t: '冲进去', p: 0.5,
      ok: { text: '你顶着空间乱流抓住星核，星辰之力灌入四肢百骸，痛快淋漓。', fx: { xp: 14 } },
      fail: { text: '乱流把你抛出去八百丈。星核熄了，你只捡回一把星屑。', fx: { inj: 3, herbs: 5 } } },
    { t: '远远吐纳余晖', ok: { text: '你盘坐在安全处吐纳星辉。所得不多，胜在一根头发都没少。', fx: { xp: 6 } } }
  ]
},
{
  id: 'exp_stars_immortal', where: 'exp', bg: ['stars'], minR: 5, once: true,
  title: '仙人遗蜕',
  text: '星墟尽头盘坐着一具仙人遗蜕，万年不朽，掌心托着一滴金色的血。身前刻着一行字：“后来者，吾道已尽。此血赠你，只求将我葬回人间。”',
  choices: [
    { t: '负骨归葬', ok: { text: '你背着遗蜕横渡星墟，葬在一处望得见炊烟的山坡。那滴仙血融入你体内，灵根生出一缕仙韵。', fx: { talent: 1, title: '送仙人回家' } } },
    { t: '取血即走', p: 0.6,
      ok: { text: '你炼化了仙血，修为大进。只是转身时，似乎听见身后一声极轻的叹息。', fx: { xp: 15 } },
      fail: { text: '仙血有灵，不肯认你，在你掌心灼出一道伤痕便散入星海。', fx: { inj: 2, xp: 4 } } }
  ]
},
/* ---------- palace ---------- */
{
  id: 'exp_palace_puppet', where: 'exp', bg: ['palace'],
  title: '守门傀儡',
  text: '仙府大门前立着一尊青铜傀儡，眼中灵火跳动：“答对三问者入。答错者，揍。”它活动了一下磨盘大的拳头，“第一问：吾主当年最爱吃什么？”',
  choices: [
    { t: '瞎蒙', p: 0.4,
      ok: { text: '“……红烧肉？”傀儡灵火大亮：“正确！吾主说过，能答对的皆是同道。”后两问它直接放了水。', fx: { item: 'a', xp: 4 } },
      fail: { text: '你答“仙露”。傀儡叹气：“庸俗。”然后认认真真履行了后半句规则。', fx: { inj: 2 } } },
    { t: '直接拆', duel: 1.2,
      ok: { text: '你把傀儡拆成了零件。它的脑袋滚在地上还在问：“那第二问还答吗？”', fx: { stones: 16, xp: 5 } },
      fail: { text: '青铜拳头名不虚传，你被一拳送出了大门。', fx: { inj: 3 } } }
  ]
},
{
  id: 'exp_palace_vault', where: 'exp', bg: ['palace'],
  title: '只取一物',
  text: '仙府藏珍阁中宝光四射，正中石碑上写着：“只取一物，贪者皆空。”左架功法，右架神兵，琳琅满目，看得人心跳都快了几分。',
  choices: [
    { t: '取功法', ok: { text: '你取下一枚玉简，其余宝光同时熄灭，化作满室尘埃。', fx: { item: 'a' } } },
    { t: '取神兵', ok: { text: '你握住剑柄的瞬间，其余珍宝尽数化灰。它在你手中轻轻一颤，算是打了招呼。', fx: { item: 'w' } } },
    { t: '我全都要', p: 0.25,
      ok: { text: '你同时出手——石碑“咔”地裂了，背面刻着：“这都敢？有胆色，都拿走吧。”', fx: { item: 'w', itemUp: 1, pills: 2, title: '我全都要' } },
      fail: { text: '满室珍宝化为飞灰，石碑背面浮出两个字：“活该。”', fx: { title: '贪者皆空' } } }
  ]
},
{
  id: 'exp_palace_ex', where: 'exp', bg: ['palace'], minR: 3, once: true,
  title: '狭路',
  text: '仙府传承殿前，你与{ex}迎面撞上。多年不见，对方依旧一身华服，看到你时瞳孔微缩，随即冷笑：“传承只有一份。当年你配不上慕容家，如今也配不上它。”',
  choices: [
    { t: '手底下见真章', duel: 1.15,
      ok: { text: '十招，{ex}的剑脱手。你踏入传承殿，没有回头：“当年那句话，原样奉还。”', fx: { xp: 12, item: 'a', title: '当年之赐' } },
      fail: { text: '{ex}靠秘宝险胜半招，却胜得面色铁青——当年的废柴，已逼得慕容家天骄底牌尽出。', fx: { inj: 2, xp: 5 } } },
    { t: '让对方先进', p: 0.6,
      ok: { text: '传承殿考的是心性。{ex}被幻阵弹出来时狼狈不堪，你施施然走了进去。', fx: { xp: 10, item: 'a' } },
      fail: { text: '{ex}抢先一步得了传承，你只捡到些边角。论剑台上，再算总账。', fx: { xp: 4, herbs: 5 } } }
  ]
},
/* ---------- chaos ---------- */
{
  id: 'exp_chaos_tide', where: 'exp', bg: ['chaos'],
  title: '窥道',
  text: '裂隙深处，天地未分时的混沌之气如潮汐涨落。你的混沌圣体与之共鸣，丹田嗡嗡作响——再往前一步，或可窥见大道一角，也可能被同化成一缕混沌。',
  choices: [
    { t: '踏前一步', p: 0.5,
      ok: { text: '你在混沌潮汐中站了三息，看见了“一”如何生出“万”。足够受用很久。', fx: { xp: 15, buff: { cul: 1.5, ticks: 8 } } },
      fail: { text: '你的半条手臂险些化开，急退而出，冷汗湿透后背。', fx: { inj: 3, life: -3 } } },
    { t: '原地参悟', ok: { text: '你守着边界静静吐纳。大道太远，你只取一瓢。', fx: { xp: 7 } } }
  ]
},
{
  id: 'exp_chaos_self', where: 'exp', bg: ['chaos'], once: true,
  title: '另一个你',
  text: '混沌雾气凝成一道人影，眉眼与你一般无二，只是眼神冷漠：“我是没捡到戒指的你。没人护短，没人指路，一个人爬到这里。”那人拔出了剑，“让我看看，你凭什么。”',
  choices: [
    { t: '战', duel: 1.0,
      ok: { text: '你胜了。那人散去前笑了笑：“原来有人陪着，剑是不一样的。”一缕本源归于你身。', fx: { power: 0.05, xp: 8 } },
      fail: { text: '你败了一招。那人收剑：“还不够。别辜负那枚戒指。”身影化雾而散。', fx: { inj: 2, xp: 6 } } },
    { t: '递过去一壶酒', ok: { text: '那人愣住，接过喝了一口，呛得直咳：“一个人的时候，没喝过这个。”雾散，留下一身孤绝的剑意。', fx: { xp: 6, buff: { atk: 1.6, ticks: 12 }, title: '与己同饮' } } }
  ]
},
{
  id: 'exp_chaos_yun', where: 'exp', bg: ['chaos'], minR: 6,
  title: '云端之人',
  text: '裂隙边缘，云无极负手而立，身前一头混沌凶兽正撕开虚空。他头也不回：“来得正好。这头归我，后面还有一头——你若接不住，我分心救你会很麻烦。”',
  choices: [
    { t: '接下', duel: 1.3,
      ok: { text: '两头凶兽几乎同时倒下。云无极回过头，第一次认真看你：“论剑台上，别留手。”', fx: { xp: 12, stones: 15 } },
      fail: { text: '你撑到云无极回援，被他单手拎出战圈。“勇气可嘉。”他说得很真诚，这才更气人。', fx: { inj: 3, xp: 6 } } },
    { t: '只是路过', ok: { text: '“哦。”云无极一剑斩了两头，丢给你一枚兽核，“见者有份。”这人强得毫无道理。', fx: { herbs: 6, xp: 3 } } }
  ]
},
/* ---------- 不限地图 ---------- */
{
  id: 'exp_any_cliff', where: 'exp', maxR: 6,
  title: '按例跳崖',
  text: '你被一群妖兽追到断崖边，崖下云雾翻涌，深不见底。老祖精神一振：“跳！按本座三千年的经验，这种崖底下必有山洞，山洞里必有前辈遗骨，遗骨旁必有秘籍！”',
  choices: [
    { t: '跳', p: 0.5,
      ok: { text: '山洞、遗骨、秘籍，一样不少。老祖得意：“本座说什么来着？”这世道的崖，果然都讲规矩。', fx: { item: 'a', title: '跳崖专业户' } },
      fail: { text: '崖底只有一潭水和一只受惊的青蛙。老祖干咳：“……偶尔，也有例外。”', fx: { inj: 2, xp: 2 } } },
    { t: '回头杀出去', duel: 1.1,
      ok: { text: '你转身杀穿兽群，收了一地妖丹。老祖嘟囔：“没情趣。”', fx: { stones: 12, xp: 5 } },
      fail: { text: '你杀出重围，挂了彩。老祖：“早说了跳。”', fx: { inj: 2, xp: 3 } } }
  ]
},
{
  id: 'exp_any_bully', where: 'exp',
  title: '路见不平',
  text: '路边一名年轻散修被三名锦衣弟子踩在地上，储物袋被翻了个底朝天。领头的笑道：“杂灵根也配用灵石？”这话，你耳熟得很。',
  choices: [
    { t: '管了', duel: 1.0,
      ok: { text: '你把三人挨个踩了一遍，顺序和力道都参照原样。那散修攥着失而复得的储物袋，朝你的背影长揖不起。', fx: { xp: 6, stones: 8, title: '路过的杂灵根' } },
      fail: { text: '对方有长辈所赐的护符，你吃了点亏，好歹护着那散修脱了身。', fx: { inj: 2, xp: 3 } } },
    { t: '报上名号', p: 0.6,
      ok: { text: '你只说了名字。三人脸色刷地白了，丢下储物袋连滚带爬。原来你的名头，已经这么好用。', fx: { xp: 4 } },
      fail: { text: '“谁？没听过。”……看来名气还差点火候。最后还是动了手，赢得不太体面。', fx: { xp: 2 } } }
  ]
},
{
  id: 'exp_any_oriole', where: 'exp', minR: 2,
  title: '黄雀在后',
  text: '你刚收好战利品，身后便响起掌声。五名修士从暗处走出，为首的老者笑呵呵：“小友辛苦。东西放下，老夫保你全须全尾地离开。”',
  choices: [
    { t: '动手', duel: 1.3,
      ok: { text: '老者的笑容消失了，转移到了你脸上。五人的储物袋，如今也成了你的战利品。', fx: { stones: 22, xp: 5 } },
      fail: { text: '你带伤突围，丢了一部分战利品。那张笑呵呵的老脸，你记住了。', fx: { inj: 2, stones: -8 } } },
    { t: '丢个假储物袋', p: 0.6,
      ok: { text: '你抛出一只塞满石头的储物袋，五人哄抢时，你已遁出百里。', fx: { xp: 3, title: '金蝉脱壳' } },
      fail: { text: '老者接住袋子掂了掂：“小友，石头不是这个分量。”你只好破财消灾。', fx: { stones: -12 } } }
  ]
}
,

  // ===== 宗门之争（sect:true） =====
  { id: 'sect_vein_1', where: 'home', visit: true, sect: true, minR: 1, weight: 2, title: '灵脉现世',
    text: '宗门探子回报：百里外的青石岭裂开一道上品灵脉，天剑宗和万法阁的人已经在路上了。掌事长老看向你：“这一脉，{sect}要不要争？”',
    choices: [
      { t: '我去抢', duel: 1.0, ok: { text: '你后发先至，一剑划下界线：“此脉归{sect}，不服的，过来。”两宗弟子面面相觑，悻悻退走。', fx: { vein: 1, contrib: 3, title: '夺脉之人' } }, fail: { text: '对方人多势众，你受了伤，只抢回半截灵石。', fx: { inj: 2, stones: 5 } } },
      { t: '联手万法阁分了', ok: { text: '你们与万法阁平分灵脉，天剑宗空手而归。万法阁的人对你客客气气。', fx: { contrib: 2, stones: 8 } } },
      { t: '不争了', ok: { text: '你继续闭关。长老叹了口气，没说什么。', fx: { xp: 3 } } } ] },
  { id: 'sect_vein_2', where: 'exp', sect: true, minR: 3, weight: 2, once: true, title: '截脉',
    text: '历练途中，你撞见血煞魔宗的人正用血阵抽取一条灵脉，脉中灵气哀鸣。为首的魔修舔了舔嘴唇：“正道的小娃，看什么看？”',
    choices: [
      { t: '破阵夺脉', duel: 1.1, ok: { text: '你一剑斩碎血阵，灵脉重归平静。消息传回宗门，掌门亲自给你记了一功。', fx: { vein: 1, contrib: 4, power: 0.03 } }, fail: { text: '血阵反噬，你吐血倒退。魔修大笑着带走了半条灵脉。', fx: { inj: 3 } } },
      { t: '回宗报信', ok: { text: '宗门长老赶来时魔修已经撤了，但灵脉总算保住一半。', fx: { contrib: 2 } } } ] },
  { id: 'sect_vein_3', where: 'home', visit: true, sect: true, minR: 5, weight: 1, title: '九宗分脉',
    text: '九宗会盟，议定天下灵脉归属。轮到{sect}时，天剑宗长老冷笑：“一个靠弃徒撑门面的宗门，也配分脉？”',
    choices: [
      { t: '当场问剑', duel: 1.2, ok: { text: '你没说话，只拔剑。三招之后，天剑宗长老的剑断了。会盟上鸦雀无声，{sect}多分得两条灵脉。', fx: { vein: 2, contrib: 5, title: '一剑分脉' } }, fail: { text: '你惜败半招。天剑宗长老得意地拂袖，{sect}只分到一条贫脉。', fx: { vein: 1, inj: 2 } } },
      { t: '据理力争', p: 0.6, ok: { text: '你把天剑宗当年偷师的旧账翻出来，满座哗然。{sect}多分得一条灵脉。', fx: { vein: 1, contrib: 3 } }, fail: { text: '众人只当你在攀咬，什么也没分到。', fx: { stones: -5 } } } ] },
  { id: 'sect_poach', where: 'home', visit: true, sect: true, minR: 2, maxR: 7, once: true, title: '挖墙脚',
    text: '万法阁长老深夜来访，推过一只储物袋：“来我万法阁，长老之位虚席以待，这些只是见面礼。”',
    choices: [
      { t: '原物奉还', ok: { text: '“{sect}待我不薄。”你把袋子推了回去。这事不知怎么传回宗门，掌门对你更加器重。', fx: { contrib: 4, title: '忠义之士' } } },
      { t: '收礼不跳槽', p: 0.6, ok: { text: '你笑眯眯收下：“礼我收了，人就算了。”长老气得胡子发抖，却也拿你没办法。', fx: { stones: 15, treasure: 1 } }, fail: { text: '长老翻脸，在会武前四处散播你“贪财”的流言。', fx: { stones: 10, contrib: 1, inj: 1 } } } ] },
  { id: 'sect_spy', where: 'home', visit: true, sect: true, minR: 2, title: '细作',
    text: '你闭关时察觉宗门藏经阁有人翻找你的剑诀笔记——是个面生的外门弟子，袖口露出一角血煞魔宗的纹身。',
    choices: [
      { t: '当场拿下', duel: 0.8, ok: { text: '细作被你一指点倒，搜出一份九宗会武的名单。宗门上下对你刮目相看。', fx: { contrib: 3, xp: 4 } }, fail: { text: '细作捏碎遁符逃了，你的笔记被撕走一页。', fx: { inj: 1 } } },
      { t: '将计就计', p: 0.65, ok: { text: '你故意留下一份假剑诀。后来血煞魔宗有弟子练岔了气，你乐了好几天。', fx: { contrib: 4, title: '老阴阳人' } }, fail: { text: '细作没上当，只是悄悄溜走了。', fx: {} } } ] },
  { id: 'sect_bully', where: 'home', visit: true, sect: true, minR: 1, maxR: 5, title: '护短',
    text: '宗门几个小弟子哭着回山：在坊市被天剑宗弟子当众羞辱，说{sect}“只配给天剑宗提鞋”。',
    choices: [
      { t: '带他们讨说法', duel: 0.9, ok: { text: '你一人站在天剑宗弟子面前：“道歉。”三息之后，对方跪着把话收了回去。小弟子们看你的眼神亮了。', fx: { contrib: 3, title: '护短师兄' } }, fail: { text: '对方来了个硬茬，你挂了彩，但小弟子们记住了你挡在前面的样子。', fx: { contrib: 2, inj: 2 } } },
      { t: '让他们自己变强', ok: { text: '你把小弟子们拎到演武场，亲自操练了三个月。下一次，他们自己把场子找回来了。', fx: { contrib: 2, xp: 3 } } } ] },
  { id: 'sect_marriage', where: 'home', visit: true, sect: true, minR: 3, daolv: false, title: '联姻',
    text: '金刚寺俗家一脉的掌事带着厚礼登门：愿与{sect}联姻，对象正是你。礼单长得拖到了门外。',
    choices: [
      { t: '婉言谢绝', ok: { text: '“修道之人，姻缘随心。”你推了亲事，对方倒也敬你几分，礼留下一半。', fx: { stones: 10 } } },
      { t: '先收礼再说', p: 0.5, ok: { text: '你收下礼单“容后再议”，一拖就是十年，对方也只能干瞪眼。', fx: { stones: 20, pills: 1 } }, fail: { text: '消息走漏，{su}和{ye}同时冷着脸来了一趟洞府。', fx: { stones: 20, aff: { su: -10, ye: -10 } } } } ] },
  { id: 'sect_secret_realm', where: 'exp', sect: true, minR: 2, title: '秘境入口',
    text: '一处上古秘境的入口刚刚现世，五宗弟子挤在门前，谁也不让谁。门只够一宗进。',
    choices: [
      { t: '打出一条路', duel: 1.0, ok: { text: '你连胜三场，各宗弟子自觉让开。秘境里的东西，{sect}先挑。', fx: { item: 'a', itemUp: 1, contrib: 3 } }, fail: { text: '你败给了昆仑仙宫的弟子，只在门外捡到些灵草。', fx: { herbs: 4, inj: 2 } } },
      { t: '提议轮流进', ok: { text: '众人同意轮流入内，你分到一份不多不少的机缘。', fx: { herbs: 6, xp: 4 } } } ] },
  { id: 'sect_merchant_war', where: 'home', visit: true, sect: true, minR: 2, title: '坊市商战',
    text: '万法阁在坊市压价倾销丹药，{sect}的丹铺快开不下去了。管事愁眉苦脸地来找你。',
    choices: [
      { t: '亲自炼丹坐镇', cost: { herbs: 6 }, ok: { text: '你亲手炼的丹药挂上招牌，“某某亲炼”四个字比什么都好使，丹铺门口排起长队。', fx: { stones: 20, contrib: 2 } } },
      { t: '去万法阁谈谈', p: 0.6, ok: { text: '你只在万法阁喝了一盏茶，第二天他们的丹价就恢复了。', fx: { contrib: 3 } }, fail: { text: '对方装傻充愣，你白跑一趟。', fx: { xp: 1 } } } ] },
  { id: 'sect_alliance', where: 'home', visit: true, sect: true, minR: 4, title: '会盟',
    text: '血煞魔宗异动频频，金刚寺发起正道会盟，请{sect}派人主持盟约。宗门推举了你。',
    choices: [
      { t: '登台主盟', p: 0.7, ok: { text: '你立于盟台之上，九宗代表齐齐拱手。{sect}的名望一夜之间又高了一截。', fx: { contrib: 5, title: '正道盟主' } }, fail: { text: '天剑宗当场搅局，会盟不欢而散，但你的名字已经传遍了正道。', fx: { contrib: 2 } } },
      { t: '让给长辈', ok: { text: '你推长老主盟，自己在台下坐镇。散会后长老拍着你的肩膀说了句“好孩子”。', fx: { contrib: 3, xp: 2 } } } ] },
  { id: 'sect_war_xuesha', where: 'home', visit: true, sect: true, minR: 6, once: true, weight: 2, title: '正魔大战',
    text: '血煞魔宗倾巢而出，血云压境三千里。九宗联军阵前，血无涯遥遥指向你：“听说你很能打？来。”',
    choices: [
      { t: '出阵迎战', duel: 1.15, ok: { text: '两军阵前，你一剑劈开血云。血无涯退了三步，魔宗大军随之溃退。此战之后，天下再无人敢小觑{sect}。', fx: { contrib: 5, vein: 1, power: 0.05, title: '破魔之剑' } }, fail: { text: '你与血无涯两败俱伤，联军勉强守住防线。', fx: { inj: 4, contrib: 3 } } },
      { t: '坐镇后方调度', ok: { text: '你调兵遣将，联军稳扎稳打，魔宗无功而返。', fx: { contrib: 4, xp: 4 } } } ] },
  { id: 'sect_tianjian_letter', where: 'home', visit: true, sect: true, minR: 3, maxR: 6, title: '天剑宗战书',
    text: '天剑宗送来一封战书，指名道姓要你在九宗会武上“认清自己的身份”。落款：赵乾。',
    choices: [
      { t: '回信：恭候', ok: { text: '你只回了两个字。听说赵乾看完，把桌子拍碎了。', fx: { buff: { atk: 1.3, ticks: 8 }, title: '恭候' } } },
      { t: '当众把信烧了', ok: { text: '信纸在你指尖化为灰烬，围观的同门一片叫好。', fx: { contrib: 2, buff: { atk: 1.2, ticks: 6 } } } } ] }
];
if (typeof module !== 'undefined' && module.exports) module.exports = EVENTS;
else root.EVENTS = EVENTS;
})(typeof window !== 'undefined' ? window : globalThis);
