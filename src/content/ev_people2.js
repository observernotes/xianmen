(function (root) {
'use strict';
const LIST = [

/* ============================================================
 * 废柴仙途 · 事件库扩展：人物加深（SYSTEMS §12，CONTENT §10、§14.4；逻辑在 src/logic/people.js）
 *
 * §14.4 的 20 个人物委托与终章事件已在 ev_sect_people.js；这里补本刀的系统要用的 16 个：
 *   一、串门（6）：人物来访的家常戏，给【送礼】一个上门的由头（门口那位是他时，事件弹窗里有【送礼】）。
 *       heart: 1 = 至少一心；need 是各自“成了常客”的那个 flag；冷却 12 周天。
 *   二、同行（6）：同伴位上的人（或道侣）跟你出门时的途中遭遇，elig.comp = 这趟同行的是他。
 *   三、双修（2）：第一次双修，触发键 shuangxiu:su / shuangxiu:ye。
 *   四、没走的那条路（2）：苏、夜互斥，没选的那位在 su_left / ye_left 之后多年的余音。
 * 本文件的 id 都以 pp_ 开头：sim 的 nopeople2 关掉本刀时它们不出（people.js 包了 L.eligible）。
 * ============================================================ */

/* ============================================================
 * 一、串门（6）
 * ============================================================ */
{
  id: 'pp_su_drop', where: 'home', visit: true, npc: 'su', speaker: 'su', need: ['su_tea'], heart: 1, cooldown: 12, title: '顺路',
  text: '{su}背着药篓从山下回来，说是顺路，篓里却装着给你的一包新茶。一坐下就开始挑毛病：阵眼歪了、丹炉没擦、窗台上又晒着袜子。',
  choices: [
    { t: '泡上那包新茶',
      ok: { text: '茶很苦，回甘很长。{su}捧着杯子不说话，难得地安静了一会儿。', fx: { aff: { su: 3 }, xp: 1 } } },
    { t: '让{su}把把脉',
      ok: { text: '{su}按着你的脉皱眉：“又逞强了。”扎了三针，经脉里那点暗伤松快了不少。', fx: { aff: { su: 2 }, life: 1 } } },
    { t: '听完数落', dao: 'w',
      ok: { text: '你老老实实听完。{su}说累了，自己先笑了：“算了，下回再来骂你。”', fx: { aff: { su: 2 } } } }
  ]
},
{
  id: 'pp_ye_drop', where: 'home', visit: true, npc: 'ye', speaker: 'ye', need: ['ye_debt'], heart: 1, cooldown: 12, title: '不请自来',
  text: '房梁上又多了个人。{ye}翘着腿啃你挂在檐下的果子，见你抬头，晃了晃手里的酒坛：“魔域的新酿，赏你一口。”',
  choices: [
    { t: '对饮两杯',
      ok: { text: '{ye}的酒量比你好得多。你趴下之前，听见{ye}低声说了句什么，醒来就忘了。', fx: { aff: { ye: 3 }, xp: 1 } } },
    { t: '过两招', duel: 0.9, dao: 'k',
      ok: { text: '你们从屋顶打到院里，{ye}输了半招，拍着你的肩笑：“长进了。”', fx: { aff: { ye: 3 }, mastery: 3 } },
      fail: { text: '三招就被{ye}按在瓦上：“再练十年。”酒坛顺手塞进了你怀里。', fx: { aff: { ye: 2 } } } },
    { t: '赶人下来',
      ok: { text: '{ye}“啧”了一声，翻身落地，顺走了你檐下最后一个果子。', fx: { aff: { ye: 1 } } } }
  ]
},
{
  id: 'pp_chu_drop', where: 'home', visit: true, npc: 'chu', speaker: 'chu', need: ['chu_wine'], heart: 1, cooldown: 12, title: '磨剑',
  text: '楚狂蹲在你院子里磨剑，磨了一下午，一句话没说。天黑时他把剑往膝上一横：“你看看这一刃，比上回利了没有。”',
  choices: [
    { t: '认真看',
      ok: { text: '你看了半晌，指出刃口偏了半分。楚狂愣了愣，又埋头磨到半夜。', fx: { aff: { chu: 3 }, mastery: 2 } } },
    { t: '拔剑试试', p: 0.6, dao: 'k',
      ok: { text: '两剑相交，火星溅了你一脸。楚狂大笑：“利了！”', fx: { aff: { chu: 3 }, xp: 1 } },
      fail: { text: '你的剑崩了个小口。楚狂过意不去，蹲在檐下替你磨了一夜。', fx: { aff: { chu: 2 } } } },
    { t: '给他留碗饭', dao: 'r',
      ok: { text: '你把饭放在他手边就去打坐了。第二天碗空了，碗底压着一块磨剑石。', fx: { aff: { chu: 2 }, ore: 1 } } }
  ]
},
{
  id: 'pp_ge_drop', where: 'home', visit: true, npc: 'ge', speaker: 'ge', need: ['ge_wine'], heart: 1, cooldown: 12, title: '蹭酒',
  text: '葛老拎着空葫芦晃进门，鼻子比狗还灵，径直摸到你藏酒的地方：“小友，老头子路过，口渴。”话没说完，塞子已经拔了。',
  choices: [
    { t: '陪他喝',
      ok: { text: '三杯下肚，葛老开始讲他年轻时炸过的十八个丹炉，讲到第七个就睡着了。', fx: { aff: { ge: 3 }, xp: 1 } } },
    { t: '请他看看丹炉',
      ok: { text: '葛老敲了敲炉壁，眯眼听了半天：“炉子是好炉子，人不行。”顺手教了你一手看火。', fx: { aff: { ge: 2 }, herbs: 2 } } },
    { t: '把酒藏好', dao: 'w',
      ok: { text: '葛老在屋里转了三圈没找着，骂骂咧咧地走了：“抠门！下回还来。”', fx: { aff: { ge: 1 } } } }
  ]
},
{
  id: 'pp_bai_drop', where: 'home', visit: true, npc: 'bai', speaker: 'bai', need: ['bai_food'], heart: 1, cooldown: 12, title: '蹭饭',
  text: '白小九从窗户钻进来，熟门熟路地掀开锅盖：“恩人！今天吃什么？”尾巴在身后扫来扫去，把桌上的东西扫了一地。',
  choices: [
    { t: '给她做顿饭', cost: { stones: 1 },
      ok: { text: '小九吃了三碗，摸着肚子躺在灶边睡着了，梦里还在吧唧嘴。', fx: { aff: { bai: 4 }, xp: 1 } } },
    { t: '带她去后山', dao: 'r',
      ok: { text: '你们在后山追了一下午兔子，一只没抓着。回来时她头上顶着一圈野花。', fx: { aff: { bai: 3 }, herbs: 2 } } },
    { t: '收拾一地狼藉',
      ok: { text: '你蹲着捡东西，小九蹲在旁边帮倒忙，捡一样掉两样，笑得直打滚。', fx: { aff: { bai: 2 } } } }
  ]
},
{
  id: 'pp_mo_drop', where: 'home', visit: true, npc: 'mo', speaker: 'mo', need: ['mo_save'], heart: 1, cooldown: 12, title: '檐下',
  text: '夜里落雨，你才发现檐下站着一个人。墨无痕一身黑衣湿透了，像是站了很久：“路过。雨停就走。”他没看你，看的是你手上的戒指。',
  choices: [
    { t: '请他进屋', dao: 'r',
      ok: { text: '他坐在门边，一碗热茶捧到凉也没喝。雨停时他起身：“多谢。”声音比来时软了些。', fx: { aff: { mo: 3 } } } },
    { t: '递一把伞',
      ok: { text: '他接过伞，没撑，夹在臂下走进雨里。第二天伞挂回了门上，伞骨多了一道墨痕。', fx: { aff: { mo: 2 }, xp: 1 } } },
    { t: '问他看什么',
      ok: { text: '“看他。”墨无痕说完就不再开口。雨停了，人也不见了，石阶上留着一圈水痕。', fx: { aff: { mo: 2 } } } }
  ]
},

/* ============================================================
 * 二、同行（6）：同伴位上的人（或道侣）跟着出门
 * ============================================================ */
{
  id: 'pp_su_trip', where: 'exp', npc: 'su', speaker: 'su', comp: 'su', weight: 2, cooldown: 30, title: '采药路上',
  text: '{su}跟着你出门，一路走一路弯腰，药篓很快就满了。走到半山，{su}忽然拽住你：“别动。”你脚边的草丛里，盘着一条碧绿的小蛇。',
  choices: [
    { t: '交给{su}', dao: 'w',
      ok: { text: '{su}两根手指捏住蛇头，取了毒囊，把蛇放了：“好东西，能入药。”你后背出了一层汗。', fx: { aff: { su: 2 }, herbs: 3 } } },
    { t: '一剑斩了', p: 0.7, dao: 'k',
      ok: { text: '蛇断成两截。{su}叹了口气，蹲下把蛇胆取了：“下回先问我。”', fx: { aff: { su: 1 }, herbs: 2, xp: 1 } },
      fail: { text: '剑慢了半分，蛇在你手背上留了两个牙印。{su}一边骂一边替你吸毒，嘴唇都麻了。', fx: { aff: { su: 3 }, inj: 1 } } }
  ]
},
{
  id: 'pp_ye_trip', where: 'exp', npc: 'ye', speaker: 'ye', comp: 'ye', weight: 2, cooldown: 30, title: '截道',
  text: '归途上一伙蒙面人拦路，领头的冲{ye}抱拳：“宗主请您回去。”{ye}看都没看那伙人，挽住你的胳膊：“没空。我有人陪。”',
  choices: [
    { t: '一起打出去', duel: 1.0, dao: 'k',
      ok: { text: '{ye}在你身后笑着出刀，十几个人倒了一地，甩掉刀上的血：“痛快。”', fx: { aff: { ye: 3 }, stones: 3 } },
      fail: { text: '人太多，你们边打边退了二十里。{ye}喘着气靠在你肩上：“下回带够人。”', fx: { aff: { ye: 3 }, inj: 1 } } },
    { t: '劝{ye}回去', dao: 'w',
      ok: { text: '{ye}松开手，盯着你看了很久：“行，你说的。”走了三步又回头，“三天就回来。”', fx: { aff: { ye: -2 }, xp: 1 } } },
    { t: '绕路走',
      ok: { text: '你拉着{ye}钻进了林子。{ye}一路都在笑，说你逃跑的样子像只兔子。', fx: { aff: { ye: 2 } } } }
  ]
},
{
  id: 'pp_chu_trip', where: 'exp', npc: 'chu', speaker: 'chu', comp: 'chu', weight: 2, cooldown: 30, title: '劈开的石头',
  text: '楚狂跟着你出门，却总落在后面。你回头找他，他站在一块被剑劈开的巨石前，顺着裂缝一寸寸地摸：“这一剑从上往下劈。劈的人，在哭。”',
  choices: [
    { t: '陪他看', dao: 'r',
      ok: { text: '你们在石前站到天黑。楚狂忽然拔剑，照着裂缝的走势劈下——石上多了一道一模一样的痕。', fx: { aff: { chu: 2 }, mastery: 6 } } },
    { t: '催他上路',
      ok: { text: '楚狂“嗯”了一声跟上来，一路都在比划。走到半路，他忽然说：“我懂了。”没说懂了什么。', fx: { aff: { chu: 1 }, xp: 2 } } }
  ]
},
{
  id: 'pp_ge_trip', where: 'exp', npc: 'ge', speaker: 'ge', comp: 'ge', weight: 2, cooldown: 30, title: '七叶',
  text: '葛老跟着你采药，嘴没闲着：这株年份不够，那株采早了——他忽然不说话了，蹲下去用指甲刨开土：“七叶。小友，今天出门烧了高香。”',
  choices: [
    { t: '让他挖', dao: 'w',
      ok: { text: '葛老挖了半个时辰，根须一根没断。他捧着那株草看了又看，分了你一半。', fx: { aff: { ge: 2 }, herbs: 4 } } },
    { t: '请他教你认',
      ok: { text: '葛老难得认真，一株一株教你认，教到天黑，你脑子里多了二十几种草。', fx: { aff: { ge: 2 }, xp: 2 } } }
  ]
},
{
  id: 'pp_bai_trip', where: 'exp', npc: 'bai', speaker: 'bai', comp: 'bai', weight: 2, cooldown: 30, title: '夹子',
  text: '白小九跟着你出门，一路蹦蹦跳跳。走到林子深处，她忽然停下，耳朵竖得笔直：“有人在哭。”循声找去，是一只被夹子夹住腿的小狐狸。',
  choices: [
    { t: '把它救下来', dao: 'r',
      ok: { text: '你掰开夹子，小九给它包了腿。小狐狸一瘸一拐地跑了，跑出很远又回头看了一眼。', fx: { aff: { bai: 3 }, xp: 1 } } },
    { t: '找下夹子的人', p: 0.6,
      ok: { text: '你在山下找到那个猎户，赔了他几块灵石，他发誓再不上那片林子。小九眼睛亮晶晶的。', fx: { aff: { bai: 4 }, stones: -1 } },
      fail: { text: '猎户早跑了，只留下一地夹子。你们拆了一下午，小九拆得最起劲。', fx: { aff: { bai: 2 } } } }
  ]
},
{
  id: 'pp_mo_trip', where: 'exp', npc: 'mo', speaker: 'mo', comp: 'mo', weight: 2, cooldown: 30, title: '残碑',
  text: '途经一座荒废的山门，墨无痕停下，拂去残碑上的苔：碑上一个“墨”字，被人用剑划了七道。“三千年了，”他说，“还没人替它擦一擦。”',
  choices: [
    { t: '一起擦干净', dao: 'r',
      ok: { text: '你们擦了一个时辰，剑痕还在，“墨”字却亮了。墨无痕在碑前站了很久，没有回头。', fx: { aff: { mo: 3 }, xp: 1 } } },
    { t: '在外面等他',
      ok: { text: '你在山门外等了半炷香。墨无痕出来时，面巾湿了一角。他说：“走吧。”', fx: { aff: { mo: 2 } } } }
  ]
},

/* ============================================================
 * 三、双修（2）：第一次双修
 * ============================================================ */
{
  id: 'pp_sx_su', where: 'story', trigger: 'shuangxiu:su', npc: 'su', speaker: 'su', title: '同修',
  text: '头一回双修，{su}比你还紧张，盘腿坐下又站起来，把药炉挪了三回：“我只是……没跟人一起修过。”终于坐定，手搭上你的脉门，掌心是凉的。',
  choices: [
    { t: '“我也没有”', dao: 'r',
      ok: { text: '{su}噗嗤一声笑了，掌心慢慢暖起来。那一夜的灵气，像一锅熬得正好的药。', fx: { aff: { su: 3 }, xp: 2 } } },
    { t: '握住那只手',
      ok: { text: '{su}的手抖了一下，没有抽回去。“专心。”{su}说，耳根红透了。', fx: { aff: { su: 4 } } } }
  ]
},
{
  id: 'pp_sx_ye', where: 'story', trigger: 'shuangxiu:ye', npc: 'ye', speaker: 'ye', title: '火候',
  text: '头一回双修，{ye}倒是大方，往你对面一坐：“我练的是魔功，你受不受得住，我可不管。”话是这么说，渡过来的灵气却收着劲，烫而不灼。',
  choices: [
    { t: '“再多些无妨”', dao: 'k',
      ok: { text: '{ye}挑眉，真的多渡了三分。你咬牙撑完，{ye}看你的眼神变了：“行啊你。”', fx: { aff: { ye: 3 }, xp: 2 } } },
    { t: '“你收着劲呢”', dao: 'r',
      ok: { text: '{ye}愣住了，半天才哼了一声：“自作多情。”渡过来的灵气却更柔了。', fx: { aff: { ye: 4 } } } }
  ]
},

/* ============================================================
 * 四、没走的那条路（2）：su_left / ye_left 之后
 * ============================================================ */
{
  id: 'pp_su_left2', where: 'home', visit: true, npc: 'su', speaker: 'su', need: ['daolv_ye', 'su_left_done'], minR: 5, once: true, title: '药箱',
  text: '山门外有人留下一只药箱，伤药码得整整齐齐，每一瓶都写着用法。字是{su}的，比从前稳了很多。箱底压着字条：“济世堂开了分号。不必来看。”',
  choices: [
    { t: '回一封信', dao: 'w',
      ok: { text: '你写了很久，最后只写了一句“谢谢”。信寄出去没有回音，药箱却每年都来。', fx: { aff: { su: 3 }, pills: 1 } } },
    { t: '去分号看一眼', p: 0.5, dao: 'r',
      ok: { text: '你远远看见{su}在堂前坐诊，队排到了街口。{su}抬头看见你，点点头，又低头写方子。', fx: { aff: { su: 5 }, life: 2 } },
      fail: { text: '你到时分号已经打烊。门口灯笼还亮着，上面写着“济世”。你站了一会儿，走了。', fx: { xp: 2 } } }
  ]
},
{
  id: 'pp_ye_left2', where: 'home', visit: true, npc: 'ye', speaker: 'ye', need: ['daolv_su', 'ye_left_done'], minR: 5, once: true, title: '红绳',
  text: '魔域传来消息：{ye}执掌了圣宗，头一道令是不许门人再碰正道的孩子。送信的魔修放下一坛酒就走，坛口缠着一根红绳，和那把刀上的一样。',
  choices: [
    { t: '把酒埋回去', dao: 'w',
      ok: { text: '你把酒坛埋在三年前那棵树下。也许哪天，有人会回来挖。', fx: { aff: { ye: 3 }, xp: 2 } } },
    { t: '喝了它', dao: 'k',
      ok: { text: '酒很烈，烈得你眼眶发热。坛底刻着一行小字：“别喝太快。”', fx: { aff: { ye: 2 }, buff: { atk: 1.2, ticks: 6 } } } }
  ]
}

];
if (typeof module !== 'undefined' && module.exports) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
