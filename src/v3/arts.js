// 五行屬性、神通（裝備）、功法（詞條）、強化。招式行為在 skills.js，效果掛鉤在 game.js。

// ---------- 五行屬性＝能力值 ----------
export const ATTR = {
  土: { stat: '力量', side: '肉身 +2%、韌性削減 +1%' },
  金: { stat: '敏捷', side: '出招速度 +0.6%、閃避體力 -0.5' },
  水: { stat: '智力', side: '真元上限 +3、神通冷卻 -0.5%' },
  火: { stat: '信仰', side: '大招氣累積 +2%、灼燒傷害 +2%' },
  木: { stat: '感應', side: '異常累積（定身、中毒、流血）+2%、掉寶 +1%' },
};
export const GRADE = { S: 1.0, A: 0.8, B: 0.6, C: 0.4, D: 0.25, E: 0.1 };
export const ATTR_BASE = 8;        // 副作用從 8 點以上起算
export const SOFT_CAP = 30;        // 30 點以後補正收益減半
// 開局：主修 16、主修所生的屬性 12、其餘 8
export const GENERATES = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
export function startAttr(main) {
  const a = { 金: 8, 木: 8, 水: 8, 火: 8, 土: 8 };
  a[main] = 16; a[GENERATES[main]] = 12;
  return a;
}
const eff = v => v <= SOFT_CAP ? v : SOFT_CAP + (v - SOFT_CAP) / 2;
// 神通傷害補正：1 + Σ 補正係數 × 點數 × 3%
export function scaleMul(sc, attr) {
  let m = 1;
  for (const [e, g] of Object.entries(sc)) m += GRADE[g] * eff(attr[e]) * 0.03;
  return m;
}

// ---------- 神通 ----------
// kind：招式類型（skills.js 依 id 實作）；chain：三段連招每段的數值；charge：蓄力招式（速蓄有效）
// sc：補正；req：需求；cost／cd：真元與冷卻；innate：天生功法 [名稱, 品]
export const SKILLS = {
  // 金
  feijian:  { elem: '金', name: '飛劍突刺', q: '凡', type: '位移', sc: { 金: 'A', 土: 'E' }, req: { 金: 10 }, cost: 35, cd: 1.2, dmg: 40, poise: 35, innate: ['追獵', 1], desc: '向前穿刺衝鋒 260，路徑上的敵人受傷並被標記 6 秒' },
  jianqi:   { elem: '金', name: '劍氣縱橫', q: '凡', type: '遠程', sc: { 金: 'A', 水: 'D' }, req: { 金: 12 }, cost: 25, cd: 2, dmg: 22, poise: 10, innate: ['燃元', 1], desc: '扇形放出三道貫穿劍氣，射程 360' },
  zhantie:  { elem: '金', name: '斬鐵式', q: '凡', type: '近戰・蓄力', sc: { 金: 'S', 土: 'D' }, req: { 金: 14 }, cost: 30, cd: 4, dmg: 90, poise: 70, charge: 0.5, innate: ['速蓄', 2], desc: '居合：蓄 0.5 秒後大範圍一閃，對破綻中的敵人 ×1.5' },
  jinzhong: { elem: '金', name: '金鐘罩', q: '凡', type: '防禦', sc: { 金: 'B', 土: 'C' }, req: { 金: 12, 土: 10 }, cost: 30, cd: 8, dmg: 0, innate: ['鐵壁', 1], desc: '1.5 秒內擋下所有正面攻擊，並把傷害的 50% 反彈' },
  zhuxian:  { elem: '金', name: '誅仙劍陣', q: '天', type: '範圍', sc: { 金: 'S' }, req: { 金: 22 }, cost: 60, cd: 20, dmg: 30, poise: 10, innate: ['連擊', 2], desc: '在滑鼠處布下劍陣 4 秒，陣中飛劍自動追擊敵人（12 劍）' },
  liuyun:   { elem: '金', name: '流雲劍式', q: '凡', type: '近戰・連段', sc: { 金: 'A', 木: 'D' }, req: { 金: 10 }, cost: 30, cd: 3, innate: ['終結技', 1], desc: '三段劍招：橫斬、迴旋斬、上挑並放出劍氣',
    chain: [{ name: '橫斬', k: 'arc', range: 140, half: 1.15, dmg: 22, poise: 14, lunge: 60 }, { name: '迴旋斬', k: 'circle', R: 135, dmg: 26, poise: 16 }, { name: '上挑・劍氣', k: 'arc', range: 155, half: 0.9, dmg: 48, poise: 34, lunge: 70, wave: 300 }] },
  tianjian: { elem: '金', name: '天劍連殺', q: '天', type: '近戰・連段', sc: { 金: 'S' }, req: { 金: 22 }, cost: 50, cd: 15, innate: ['心流', 2], desc: '三段瞬移斬：每段瞬移到不同敵人身後，終結技十字劍光',
    chain: [{ name: '瞬移斬', k: 'blink', range: 150, half: 1.3, dmg: 40, poise: 25 }, { name: '瞬移斬', k: 'blink', range: 150, half: 1.3, dmg: 45, poise: 25 }, { name: '十字劍光', k: 'cross', R: 230, dmg: 140, poise: 80 }] },
  // 木
  chanteng: { elem: '木', name: '纏藤', q: '凡', type: '控制', sc: { 木: 'A' }, req: { 木: 10 }, cost: 30, cd: 3, dmg: 24, poise: 15, innate: ['定身', 1], desc: '射出藤蔓，命中定身 2.5 秒' },
  duji:     { elem: '木', name: '毒蒺藜', q: '凡', type: '範圍', sc: { 木: 'A', 火: 'D' }, req: { 木: 12 }, cost: 25, cd: 3, dmg: 4, poise: 2, innate: ['中毒', 2], desc: '撒下一片毒刺地 5 秒，踩到的敵人累積中毒' },
  tengbian: { elem: '木', name: '青藤鞭', q: '凡', type: '近中・拉近', sc: { 木: 'B', 金: 'C' }, req: { 木: 10, 金: 10 }, cost: 20, cd: 2.5, dmg: 35, poise: 25, innate: ['破勢', 1], desc: '中距離鞭擊 260，把命中的敵人拉到身前' },
  huichun:  { elem: '木', name: '回春術', q: '凡', type: '治療', sc: { 木: 'B', 水: 'C' }, req: { 木: 14 }, cost: 40, cd: 12, dmg: 0, innate: ['回氣', 1], desc: '6 秒內共回復 30% 肉身' },
  wanmu:    { elem: '木', name: '青帝萬木', q: '天', type: '範圍・召喚', sc: { 木: 'S' }, req: { 木: 22 }, cost: 60, cd: 20, dmg: 8, poise: 4, innate: ['流血', 2], desc: '召出 3 株樹人，各自鞭打附近敵人 8 秒' },
  sanjiao:  { elem: '木', name: '青藤三絞', q: '凡', type: '近戰・連段', sc: { 木: 'B', 金: 'C' }, req: { 木: 10, 金: 10 }, cost: 25, cd: 3.5, innate: ['中毒', 1], desc: '三段鞭招：掃鞭、回抽拉近、纏身摔地',
    chain: [{ name: '掃鞭', k: 'arc', range: 210, half: 0.55, dmg: 18, poise: 10 }, { name: '回抽', k: 'arc', range: 230, half: 0.4, dmg: 20, poise: 12, pull: true }, { name: '纏身摔地', k: 'circle', R: 120, dmg: 40, poise: 40, root: 1 }] },
  // 水
  xuanbing: { elem: '水', name: '玄冰架', q: '凡', type: '彈反', sc: { 水: 'A' }, req: { 水: 10 }, cost: 20, cd: 0.8, dmg: 0, innate: ['鏡水', 1], desc: '0.35 秒彈反架勢，成功凍住攻擊者並打出破綻、回 30 真元' },
  bingzhui: { elem: '水', name: '冰錐術', q: '凡', type: '遠程', sc: { 水: 'A' }, req: { 水: 10 }, cost: 12, cd: 0.6, dmg: 18, poise: 8, innate: ['寒冰', 1], desc: '射出冰錐，命中減速' },
  longjuan: { elem: '水', name: '水龍捲', q: '凡', type: '範圍・拉近', sc: { 水: 'A', 木: 'D' }, req: { 水: 14 }, cost: 35, cd: 5, dmg: 9, poise: 6, innate: ['破甲', 1], desc: '在滑鼠處捲起水龍捲 3 秒，持續把敵人吸向中心' },
  jinghua:  { elem: '水', name: '鏡花水月', q: '凡', type: '位移・誘敵', sc: { 水: 'B', 金: 'C' }, req: { 水: 12 }, cost: 30, cd: 10, dmg: 0, innate: ['鏡水', 2], desc: '原地留下水分身吸引妖獸 4 秒，自己瞬移 200' },
  hanyu:    { elem: '水', name: '玄冥寒獄', q: '天', type: '範圍・控制', sc: { 水: 'S' }, req: { 水: 22 }, cost: 70, cd: 25, dmg: 60, poise: 60, innate: ['相剋', 2], desc: '以自身為中心冰封 360 範圍，敵人凍結 4 秒' },
  jingtao:  { elem: '水', name: '驚濤掌', q: '凡', type: '近戰・連段', sc: { 水: 'A', 土: 'D' }, req: { 水: 10 }, cost: 25, cd: 3, innate: ['餘韻', 1], desc: '三段掌法：推掌、水刃迴旋、浪湧把敵人推開',
    chain: [{ name: '推掌', k: 'arc', range: 125, half: 0.8, dmg: 20, poise: 14, lunge: 70 }, { name: '水刃迴旋', k: 'circle', R: 145, dmg: 22, poise: 14 }, { name: '浪湧', k: 'arc', range: 210, half: 1.0, dmg: 45, poise: 36, kb: 420, slow: 0.5 }] },
  // 火
  fentian:  { elem: '火', name: '焚天', q: '凡', type: '範圍', sc: { 火: 'A' }, req: { 火: 10 }, cost: 35, cd: 4, dmg: 10, poise: 4, innate: ['灼燒', 1], desc: '在滑鼠處降下火海 3 秒，疊加灼燒' },
  huoqiu:   { elem: '火', name: '火球術', q: '凡', type: '遠程', sc: { 火: 'A', 木: 'D' }, req: { 火: 10 }, cost: 20, cd: 1.5, dmg: 45, poise: 25, innate: ['業火爆', 1], desc: '發射火球，命中爆炸 80 範圍' },
  huti:     { elem: '火', name: '烈焰護體', q: '凡', type: '增益', sc: { 火: 'B', 土: 'C' }, req: { 火: 14 }, cost: 40, cd: 15, dmg: 6, poise: 2, innate: ['灼燒', 2], desc: '8 秒內周身燃火，靠近的敵人持續灼燒，普攻附加灼燒' },
  yanbao:   { elem: '火', name: '炎爆衝', q: '凡', type: '位移', sc: { 火: 'A', 金: 'D' }, req: { 火: 12 }, cost: 25, cd: 3, dmg: 30, poise: 20, innate: ['急攻', 1], desc: '向前衝刺 220，留下 2 秒火痕' },
  zhuque:   { elem: '火', name: '朱雀焚天', q: '天', type: '範圍', sc: { 火: 'S' }, req: { 火: 22 }, cost: 70, cd: 25, dmg: 110, poise: 50, innate: ['背水一戰', 2], desc: '朱雀從天俯衝三次，每次落點爆炸 140 範圍' },
  yanlong:  { elem: '火', name: '炎龍三擊', q: '凡', type: '近戰・連段', sc: { 火: 'A', 金: 'D' }, req: { 火: 12 }, cost: 30, cd: 3.5, innate: ['灼燒', 1], desc: '三段火拳：直拳、迴旋踢、升龍爆炎',
    chain: [{ name: '直拳', k: 'arc', range: 115, half: 0.8, dmg: 24, poise: 14, lunge: 70, burn: 1 }, { name: '迴旋踢', k: 'circle', R: 125, dmg: 24, poise: 16, fire: true }, { name: '升龍爆炎', k: 'circle', R: 110, dmg: 60, poise: 40, burn: 2, pillar: true }] },
  // 土
  dilie:    { elem: '土', name: '地裂', q: '凡', type: '範圍', sc: { 土: 'A' }, req: { 土: 10 }, cost: 35, cd: 3, dmg: 58, poise: 60, innate: ['破甲', 1], desc: '前搖 0.35 秒，以自身為中心 160 範圍震地並擊退' },
  luoshi:   { elem: '土', name: '落石術', q: '凡', type: '遠程', sc: { 土: 'A', 火: 'D' }, req: { 土: 10 }, cost: 25, cd: 2, dmg: 70, poise: 60, innate: ['破甲', 1], desc: '在滑鼠處砸下巨石，0.5 秒後落地' },
  yanjia:   { elem: '土', name: '岩甲', q: '凡', type: '防禦', sc: { 土: 'A', 金: 'D' }, req: { 土: 12 }, cost: 35, cd: 12, dmg: 0, innate: ['金身不壞', 2], desc: '獲得 25% 肉身的護盾（10 秒），護盾在時霸體' },
  bengshan: { elem: '土', name: '崩山拳', q: '凡', type: '近戰・蓄力', sc: { 土: 'S' }, req: { 土: 14 }, cost: 30, cd: 4, dmg: 120, poise: 120, charge: 0.6, innate: ['震岳', 1], desc: '蓄力重拳，韌性削減極高' },
  sheji:    { elem: '土', name: '山河社稷印', q: '天', type: '範圍', sc: { 土: 'S' }, req: { 土: 22 }, cost: 70, cd: 25, dmg: 260, poise: 0, innate: ['破綻追擊', 2], desc: '巨大方印從天砸下 260 範圍，命中必定破綻' },
  handi:    { elem: '土', name: '撼地三式', q: '凡', type: '近戰・連段', sc: { 土: 'A' }, req: { 土: 12 }, cost: 35, cd: 4, innate: ['破甲', 1], desc: '三段重招：踏地、肩撞、雙拳砸地',
    chain: [{ name: '踏地', k: 'circle', R: 115, dmg: 40, poise: 34 }, { name: '肩撞', k: 'rush', len: 170, dmg: 45, poise: 40 }, { name: '雙拳砸地', k: 'circle', R: 185, dmg: 95, poise: 70, kb: 420, quake: true }] },
};
// 各主修開局的右鍵神通
export const START_SKILL = { 金: 'feijian', 木: 'chanteng', 水: 'xuanbing', 火: 'fentian', 土: 'dilie' };
export const isChain = id => !!SKILLS[id].chain;

// ---------- 功法（詞條） ----------
// slot：'神通'＝銘刻在神通上只影響那門神通；'經脈'＝角色身上 3 格。v：一～三品數值；v2：第二個數值
// need：只能銘刻在哪種神通（chain 連段／charge 蓄力）
const p = x => `${Math.round(x * 100)}%`;
export const GONGFA = {
  // 連段
  終結技: { cat: '連段', slot: '神通', need: 'chain', v: [0.2, 0.35, 0.5], v2: [0.2, 0.3, 0.4], d: (v, w) => `連段第三段傷害 +${p(v)}、削韌 +${p(w)}` },
  餘韻: { cat: '連段', slot: '神通', need: 'chain', v: [3, 5, 7], d: v => `連段每段命中回 ${v} 真元` },
  流轉: { cat: '連段', slot: '神通', need: 'chain', v: [1, 1.5, 2], d: v => `終結技命中後，另一格神通冷卻 -${v} 秒` },
  心流: { cat: '連段', slot: '經脈', v: [0.1, 0.15, 0.2], v2: [0.3, 0.4, 0.5], d: (v, w) => `連擊數到 15 進入心流 6 秒：出招速度 +${p(v)}、神通真元 -${p(w)}；被打中結束` },
  均衡: { cat: '連段', slot: '經脈', v: [0.06, 0.09, 0.12], v2: [1, 1.5, 2], d: (v, w) => `近戰與神通攻擊 +${p(v)}，每秒回 ${w} 真元` },
  連擊: { cat: '連段', slot: '經脈', v: [0.02, 0.03, 0.04], d: v => `連擊數每 5 下攻擊 +${p(v)}（最多 10 層），連擊歸零就失效` },
  // 屬性增傷
  庚金訣: { cat: '屬性增傷', slot: '經脈', elem: '金', v: [0.06, 0.09, 0.12], d: v => `金屬性傷害 +${p(v)}` },
  長春訣: { cat: '屬性增傷', slot: '經脈', elem: '木', v: [0.06, 0.09, 0.12], d: v => `木屬性傷害 +${p(v)}` },
  癸水訣: { cat: '屬性增傷', slot: '經脈', elem: '水', v: [0.06, 0.09, 0.12], d: v => `水屬性傷害 +${p(v)}` },
  丙火訣: { cat: '屬性增傷', slot: '經脈', elem: '火', v: [0.06, 0.09, 0.12], d: v => `火屬性傷害 +${p(v)}` },
  戊土訣: { cat: '屬性增傷', slot: '經脈', elem: '土', v: [0.06, 0.09, 0.12], d: v => `土屬性傷害 +${p(v)}` },
  相剋: { cat: '屬性增傷', slot: '經脈', v: [1.75, 1.85, 2.0], v2: [0.7, 0.75, 0.8], d: (v, w) => `剋制倍率 1.6 → ${v}，被剋 0.6 → ${w}` },
  // 條件增幅
  背水一戰: { cat: '條件增幅', slot: '經脈', v: [0.15, 0.22, 0.3], d: v => `肉身低於 30% 時攻擊 +${p(v)}` },
  怒氣: { cat: '條件增幅', slot: '經脈', v: [0.1, 0.15, 0.2], d: v => `受傷後 5 秒內攻擊 +${p(v)}` },
  圓滿: { cat: '條件增幅', slot: '經脈', v: [0.08, 0.12, 0.16], d: v => `肉身全滿時攻擊 +${p(v)}` },
  破綻追擊: { cat: '條件增幅', slot: '神通', v: [0.15, 0.25, 0.35], d: v => `對破綻中的敵人 +${p(v)}` },
  追獵: { cat: '條件增幅', slot: '神通', v: [0.15, 0.22, 0.3], d: v => `對殘血（< 40%）或被標記的敵人 +${p(v)}` },
  // 複合
  燃元: { cat: '複合', slot: '神通', v: [0.15, 0.2, 0.25], d: v => `傷害 +${p(v)}；真元消耗 +30%` },
  急攻: { cat: '複合', slot: '神通', v: [0.2, 0.25, 0.3], d: v => `冷卻 -${p(v)}；傷害 -10%` },
  速蓄: { cat: '複合', slot: '神通', need: 'charge', v: [0.2, 0.3, 0.4], d: v => `蓄力時間 -${p(v)}，蓄力中受傷 -${p(v)}` },
  捨身: { cat: '複合', slot: '經脈', v: [0.12, 0.16, 0.2], d: v => `攻擊 +${p(v)}；受到傷害 +10%` },
  破釜: { cat: '複合', slot: '經脈', v: [0.1, 0.14, 0.18], d: v => `攻擊 +${p(v)}；丹藥 -1 瓶` },
  狂刃: { cat: '複合', slot: '經脈', v: [0.15, 0.2, 0.25], d: v => `普攻傷害 +${p(v)}；閃避體力 +25%` },
  // 減傷
  鐵壁: { cat: '減傷', slot: '經脈', v: [0.1, 0.14, 0.18], d: v => `受傷 -${p(v)}；遁速 -8%` },
  金身不壞: { cat: '減傷', slot: '經脈', v: [0.15, 0.22, 0.3], d: v => `肉身低於 30% 時受傷 -${p(v)}` },
  無垢: { cat: '減傷', slot: '經脈', v: [0.2, 0.3, 0.4], d: v => `肉身全滿時受傷 -${p(v)}` },
  痛定: { cat: '減傷', slot: '經脈', v: [0.15, 0.22, 0.3], d: v => `受傷後 3 秒內再受傷 -${p(v)}` },
  閃避餘勁: { cat: '減傷', slot: '經脈', v: [0.15, 0.22, 0.3], d: v => `閃避後 1.5 秒內受傷 -${p(v)}` },
  以攻為守: { cat: '減傷', slot: '經脈', v: [0.1, 0.15, 0.2], d: v => `出招中（普攻、神通、蓄力）受傷 -${p(v)}；閃避無敵 -0.03 秒` },
  服丹護體: { cat: '減傷', slot: '經脈', v: [0.3, 0.45, 0.6], d: v => `喝丹藥時與之後 3 秒受傷 -${p(v)}` },
  以寡敵眾: { cat: '減傷', slot: '經脈', v: [0.1, 0.15, 0.2], d: v => `附近有 3 隻以上敵人時受傷 -${p(v)}` },
  不屈: { cat: '減傷', slot: '經脈', v: [0.2, 0.3, 0.4], d: v => `單次超過 15% 肉身的重擊，該擊 -${p(v)}` },
  斬妖: { cat: '減傷', slot: '經脈', v: [0.08, 0.12, 0.16], d: v => `受到夜王與妖皇的傷害 -${p(v)}` },
  百毒不侵: { cat: '減傷', slot: '經脈', v: [0.3, 0.45, 0.6], d: v => `毒池、毒液、火焰投射物的傷害 -${p(v)}` },
  // 觸發
  鏡水: { cat: '觸發', slot: '經脈', v: [0.05, 0.08, 0.12], d: v => `完美閃避或彈反時回 ${p(v)} 肉身` },
  劍心: { cat: '觸發', slot: '神通', v: [0, 0.2, 0.4], d: v => `完美閃避後此神通冷卻重置${v ? `，下一次 +${p(v)}` : ''}` },
  處決者: { cat: '觸發', slot: '經脈', v: [0.2, 0.35, 0.5], v2: [0.1, 0.15, 0.2], d: (v, w) => `處決傷害 +${p(v)}，處決後 5 秒攻擊 +${p(w)}` },
  破勢: { cat: '觸發', slot: '神通', v: [15, 25, 35], d: v => `打出破綻時回 ${v} 真元` },
  震岳: { cat: '觸發', slot: '神通', v: [25, 35, 50], d: v => `重擊或蓄力命中時震地 90 範圍，${v} 傷害` },
  業火爆: { cat: '觸發', slot: '神通', v: [40, 60, 90], d: v => `擊殺時爆炸 100 範圍，${v} 傷害` },
  天命: { cat: '觸發', slot: '經脈', v: [0.1, 0.15, 0.2], d: v => `放大招時攻擊 +${p(v)}，大招期間每次命中再 +1%（最多 +10%），結束後保留 8 秒` },
  // 異常
  灼燒: { cat: '異常', slot: '神通', v: [1, 2, 3], d: v => `命中附加 ${v} 層灼燒` },
  中毒: { cat: '異常', slot: '神通', v: [20, 30, 40], d: v => `中毒累積 +${v}（滿 100：每秒 2% 肉身，8 秒）` },
  流血: { cat: '異常', slot: '神通', v: [20, 30, 40], d: v => `流血累積 +${v}（滿 100：爆發 12% 肉身）` },
  寒冰: { cat: '異常', slot: '神通', v: [0.2, 0.3, 0.4], d: v => `命中減速 ${p(v)}（1.5 秒）` },
  定身: { cat: '異常', slot: '神通', v: [0.06, 0.1, 0.15], d: v => `命中 ${p(v)} 機率定身 1 秒` },
  乘勢: { cat: '異常', slot: '經脈', v: [0.1, 0.15, 0.2], d: v => `對異常中（灼燒、中毒、減速、定身、凍結）的敵人 +${p(v)}` },
  // 防禦資源
  破甲: { cat: '防禦資源', slot: '神通', v: [0.15, 0.25, 0.35], d: v => `韌性削減 +${p(v)}` },
  身法: { cat: '防禦資源', slot: '經脈', v: [0.04, 0.07, 0.1], d: v => `閃避無敵時間 +${v} 秒` },
  心眼: { cat: '防禦資源', slot: '經脈', v: [0.05, 0.08, 0.12], d: v => `完美閃避判定 +${v} 秒` },
  回氣: { cat: '防禦資源', slot: '經脈', v: [1, 2, 3], d: v => `普攻命中多回 ${v} 真元` },
  丹師: { cat: '防禦資源', slot: '經脈', v: [0.1, 0, 0.15], d: (v, w, t) => ['丹藥回復 +10%', '丹藥 +1 瓶', '丹藥 +1 瓶、回復 +15%'][t] },
  嗜殺: { cat: '防禦資源', slot: '經脈', v: [0.02, 0.03, 0.04], d: v => `擊殺回 ${p(v)} 肉身` },
};
export const TIER_CN = ['一品', '二品', '三品'];
export function gfDesc(id, tier) {
  const G = GONGFA[id];
  return G.d(G.v[tier], G.v2 ? G.v2[tier] : 0, tier);
}

// ---------- 強化 ----------
export const MATS = { 下品靈晶: '#b9d6c0', 中品靈晶: '#8fd0ff', 上品靈晶: '#d0a0ff', 天外隕晶: '#ffb060' };
// 從 +n 升到 +n+1 需要什麼
export function forgeCost(q, plus) {
  if (q === '天') return plus >= 3 ? null : { mat: '天外隕晶', n: plus === 2 ? 2 : 1, runes: plus === 2 ? 800 : 400 };
  if (plus >= 5) return null;
  if (plus < 2) return { mat: '下品靈晶', n: 2, runes: 60 };
  if (plus < 4) return { mat: '中品靈晶', n: 2, runes: 150 };
  return { mat: '上品靈晶', n: 1, runes: 300 };
}
export const forgeMul = (q, plus) => 1 + plus * (q === '天' ? 0.18 : 0.1);
// 天生功法的品：凡品 +3 升一品；天品 +3 升到三品
export function innateTier(S, plus) {
  const t = S.innate[1] - 1;
  if (S.q === '天') return plus >= 3 ? 2 : t;
  return plus >= 3 ? Math.min(2, t + 1) : t;
}
export const inscribeSlots = (q, plus) => (q === '凡' && plus >= 5) || (q === '天' && plus >= 3) ? 2 : 1;
