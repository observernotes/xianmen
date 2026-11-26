// 在 2.4.0-beta1 的逻辑上生成几份“3.0 迁移要接住”的旧档（在 3.0 合进来之前跑；之后别再跑，逻辑已经变了）
//   node tools/story_fixtures/gen_v240.js
// v240_pactwon_storypending_t40：三年之约赢了，戏一场都没播（剧情队列被解锁卡 / 节流压着——用户在 2.4.0-beta1 上“第三年打完、第五年才出戏”的那种档）
// v240_away_t*：人在外历练、月份不在季界上；v240_retreat_t*：闭关中
// syn_ch3_nosect_beatzhao：手工拼的（用户描述的另一个旧档：打赢了赵乾、没入宗、停在第三章）——拿 v232_ch2_refuse_t300 把第二章主线标成已完成
const fs = require('fs'), path = require('path');
const { run, L } = require(path.join(__dirname, '..', 'sim.js'));
const out = n => path.join(__dirname, n + '.json');
const save = (n, st) => { const s = JSON.parse(JSON.stringify(st)); for (const k of Object.keys(s)) if (k[0] === '_') delete s[k]; fs.writeFileSync(out(n), JSON.stringify(s)); console.log(n, 't', s.tick, 'r', s.p.r, 'ch', L.chapterNow(s) + 1, 'sect', s.sect ? s.sect.id : '-', 'pact', s.pact, 'exp', !!s.exp, 'ret', !!s.retreat, 'storyQ', s.storyQ.length, 'beats', JSON.stringify(s.story && s.story.beat)); };
{ // 戏压着不播：剧情事件一律不结算（留在节拍“已放”、场景“未结算”的状态）
  const rc0 = L.resolveChoice; let block = true;
  L.resolveChoice = function (st, ev) { if (block && ev && ev.where === 'story') return null; return rc0.apply(this, arguments); };
  let snap = null; const tk0 = L.tick; L.tick = function (st) { const o = tk0.apply(this, arguments); if (st.tick === 40 && !snap) snap = JSON.parse(JSON.stringify(st)); return o; };
  run('guided', 5, false, { keep: true, maxT: 41 });
  L.tick = tk0; L.resolveChoice = rc0; block = false;
  if (snap && snap.pact === 1) save('v240_pactwon_storypending_t40', snap); else console.log('约战没赢，换个种子');
}
{ let a = null, b = null; const tk0 = L.tick; L.tick = function (st) { const o = tk0.apply(this, arguments); if (!a && st.exp && st.tick > 60 && st.tick % 3 === 2) a = JSON.parse(JSON.stringify(st)); if (!b && st.retreat && st.tick > 60 && st.tick % 3 === 1) b = JSON.parse(JSON.stringify(st)); return o; };
  run('guided', 6, false, { keep: true, maxT: 200 }); L.tick = tk0;
  if (a) save('v240_away_t' + a.tick, a); if (b) save('v240_retreat_t' + b.tick, b); }
{ const s = JSON.parse(fs.readFileSync(out('v232_ch2_refuse_t300'), 'utf8')); s.quest.done.c1_m = 1; if (s.path) s.path.ch = 2; fs.writeFileSync(out('syn_ch3_nosect_beatzhao'), JSON.stringify(s)); console.log('syn_ch3_nosect_beatzhao', 't', s.tick, 'beaten.zhao', s.beaten.zhao, 'sect', s.sect); }
