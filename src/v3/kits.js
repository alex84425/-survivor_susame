// v3 職業與妖獸資料。招式的實際行為在 game.js，這裡放數值與說明，方便百科與平衡。

// ---------- 職業（主修五行） ----------
export const CLASSES = {
  金: {
    id: 'jin', name: '追獵者', role: '中近距離・切入切出', hp: 280, speed: 215, img: 'fencer',
    passive: '對被標記或殘血（< 40%）的目標 +25%；閃避後下一次普攻 ×1.5',
    basic: { name: '三段劍擊', desc: '連按左鍵三連斬，第三段向前突進',
      steps: [
        { wind: 0.07, rec: 0.16, range: 82, half: 0.95, dmg: 16, poise: 10, lunge: 40 },
        { wind: 0.07, rec: 0.18, range: 82, half: 0.95, dmg: 17, poise: 12, lunge: 40 },
        { wind: 0.12, rec: 0.34, range: 96, half: 1.05, dmg: 30, poise: 26, lunge: 130, heavy: true },
      ], move: 0.5, window: 0.38 },
    skill: { id: 'feijian', name: '飛劍突刺', cost: 35, cd: 1.2, desc: '向滑鼠方向穿刺衝鋒 260 距離，路徑上的敵人受傷並被標記 6 秒（受傷 +25%）', dmg: 40, poise: 35 },
    ult: { name: '萬劍歸宗', desc: '在滑鼠附近降下 14 道劍雨，每道 34 傷害', dmg: 34 },
  },
  木: {
    id: 'mu', name: '遊俠', role: '遠程拉打・剋快速敵人', hp: 240, speed: 225, img: 'mage',
    passive: '對速度快的敵人 +30%；射擊時移動不減速',
    basic: { name: '追蹤葉刃', desc: '按住左鍵連射會追蹤的葉刃，傷害普通', rate: 0.15, dmg: 8, poise: 3, speed: 640 },
    skill: { id: 'chanteng', name: '纏藤', cost: 30, cd: 3, desc: '射出藤蔓，命中定身 2.5 秒並造成傷害', dmg: 24, poise: 15 },
    ult: { name: '萬木林', desc: '在滑鼠位置展開 230 範圍的林海 7 秒：敵人減速 60%、持續受傷', dmg: 12 },
  },
  水: {
    id: 'shui', name: '御法者', role: '平衡・彈反', hp: 300, speed: 210, img: 'mage',
    passive: '每次命中回復 0.6% 肉身',
    basic: { name: '水鞭', desc: '兩段中距離扇形掃擊',
      steps: [
        { wind: 0.11, rec: 0.24, range: 150, half: 0.55, dmg: 18, poise: 12 },
        { wind: 0.13, rec: 0.36, range: 160, half: 0.65, dmg: 25, poise: 18, heavy: true },
      ], move: 0.6, window: 0.4 },
    skill: { id: 'xuanbing', name: '玄冰架', cost: 20, cd: 0.8, desc: '0.35 秒彈反架勢。期間被攻擊＝彈反成功：無傷、凍住攻擊者並打出破綻、回 30 真元', dmg: 0 },
    ult: { name: '寒潮', desc: '以自身為中心 320 範圍，凍結所有敵人 3.5 秒並造成傷害', dmg: 45 },
  },
  火: {
    id: 'huo', name: '術士', role: '蓄力遠程・玻璃大砲', hp: 220, speed: 205, img: 'mage',
    passive: '火焰命中疊加灼燒（最多 6 層，每層每秒 3 傷害）',
    basic: { name: '蓄力火球', desc: '按住左鍵蓄力（三段），放開發射。蓄力時移動減速', tiers: [
      { t: 0, dmg: 13, poise: 4, R: 0, speed: 680, burn: 1 },
      { t: 0.35, dmg: 36, poise: 18, R: 60, speed: 560, burn: 2 },
      { t: 0.9, dmg: 85, poise: 45, R: 115, speed: 480, burn: 3, heavy: true },
    ], move: 0.45 },
    skill: { id: 'fentian', name: '焚天', cost: 35, cd: 4, desc: '在滑鼠位置降下火海 3 秒，持續傷害並疊灼燒', dmg: 10 },
    ult: { name: '天火流星', desc: '施法 1 秒後，滑鼠位置落下 240 範圍的流星：320 傷害、灼燒 5 層', dmg: 320 },
  },
  土: {
    id: 'tu', name: '體修', role: '近戰重擊・霸體', hp: 420, speed: 190, img: 'mage',
    passive: '出招時霸體（不會被打斷）；肉身最高',
    basic: { name: '開山拳', desc: '慢而重的兩段重拳，後搖長',
      steps: [
        { wind: 0.2, rec: 0.42, range: 74, half: 1.1, dmg: 36, poise: 32, lunge: 30, heavy: true },
        { wind: 0.26, rec: 0.58, range: 84, half: 1.2, dmg: 52, poise: 48, lunge: 50, heavy: true },
      ], move: 0.3, window: 0.45 },
    skill: { id: 'dilie', name: '地裂', cost: 35, cd: 3, desc: '前搖 0.35 秒，以自身為中心 160 範圍震地並擊退', dmg: 58, poise: 60 },
    ult: { name: '金剛不壞', desc: '7 秒內減傷 70%、不會硬直，每秒震地一次', dmg: 36 },
  },
};

// ---------- 妖獸 ----------
// 招式由「步驟」組成；k：arc 扇形、line 直線（dash 會衝過去）、circle 圓圈、ring 擴散衝擊環、proj 投射物、hop 後跳、pool 毒池、summon 召喚
// wind：前搖秒數範圍（隨機，避免背節奏）；band：近 near / 中 mid / 遠 far
export const ENEMIES = {
  wolf: {
    name: '妖狼', img: 'wolf', elem: '金', r: 17, hp: 260, poise: 60, speed: 165, pref: 95, sight: 430, size: 62, fast: true,
    moves: {
      bite2: { band: 'near', w: 3, rec: 0.55, steps: [
        { k: 'arc', range: 72, half: 0.75, wind: [0.42, 0.7], dmg: 16 },
        { k: 'arc', range: 72, half: 0.75, wind: [0.22, 0.38], dmg: 16 }] },
      pounce: { band: 'mid', w: 3, rec: 0.7, steps: [{ k: 'line', len: 270, width: 44, wind: [0.55, 0.85], dmg: 22, dash: true }] },
      howl: { band: 'far', w: 2, rec: 0.9, cd: 4, steps: [{ k: 'proj', n: 3, spread: 0.35, speed: 330, dmg: 14, wind: [0.6, 0.8], tex: 'wave', size: 12 }] },
    },
  },
  bear: {
    name: '妖熊', img: 'bear', elem: '土', r: 26, hp: 720, poise: 150, speed: 105, pref: 90, sight: 400, size: 86,
    moves: {
      swipe3: { band: 'near', w: 3, rec: 0.8, steps: [
        { k: 'arc', range: 92, half: 0.95, wind: [0.55, 0.9], dmg: 24 },
        { k: 'arc', range: 92, half: 0.95, wind: [0.3, 0.6], dmg: 24 },
        { k: 'arc', range: 105, half: 1.2, wind: [0.6, 1.05], dmg: 36 }] },
      charge: { band: 'mid', w: 2, rec: 1.0, steps: [{ k: 'line', len: 340, width: 62, wind: [0.75, 1.0], dmg: 32, dash: true }] },
      rock: { band: 'far', w: 2, rec: 0.9, cd: 3, steps: [{ k: 'circle', at: 'target', R: 75, wind: [0.9, 1.1], dmg: 30, track: 0.5, rock: true }] },
      slam: { band: 'near', w: 1, rec: 1.0, cd: 5, steps: [{ k: 'circle', at: 'self', R: 140, wind: [0.85, 1.1], dmg: 34 }] },
    },
  },
  spider: {
    name: '毒蛛', img: 'spider', elem: '木', r: 18, hp: 290, poise: 70, speed: 120, pref: 290, sight: 460, size: 64, ranged: true,
    moves: {
      hopbite: { band: 'near', w: 3, rec: 0.4, steps: [
        { k: 'arc', range: 70, half: 0.8, wind: [0.35, 0.55], dmg: 16 },
        { k: 'hop', dist: 200, wind: [0.05, 0.1] }] },
      web: { band: 'mid', w: 2, rec: 0.6, cd: 4, steps: [{ k: 'proj', n: 1, spread: 0, speed: 300, dmg: 8, wind: [0.5, 0.7], tex: 'web', size: 12, root: 1.3 }] },
      spit: { band: 'far', w: 3, rec: 0.7, steps: [{ k: 'proj', n: 3, spread: 0.25, speed: 260, dmg: 14, wind: [0.55, 0.85], tex: 'venom', size: 8 }] },
      pool: { band: 'far', w: 1, rec: 0.6, cd: 6, steps: [{ k: 'pool', R: 80, wind: [0.8, 1.0], dmg: 9, life: 4, track: 0.6 }] },
    },
  },
  tiger: {
    name: '妖王・翼虎', img: 'tiger', elem: '火', r: 36, hp: 3400, poise: 320, speed: 175, pref: 110, sight: 520, size: 120, boss: true,
    moves: {
      claws: { band: 'near', w: 3, rec: 0.6, steps: [
        { k: 'arc', range: 120, half: 0.9, wind: [0.45, 0.75], dmg: 30 },
        { k: 'arc', range: 120, half: 0.9, wind: [0.2, 0.45], dmg: 30 },
        { k: 'circle', at: 'self', R: 150, wind: [0.5, 0.8], dmg: 38 }] },
      pounce: { band: 'mid', w: 3, rec: 0.7, steps: [{ k: 'line', len: 380, width: 80, wind: [0.6, 0.9], dmg: 40, dash: true }] },
      roar: { band: 'far', w: 2, rec: 1.0, cd: 5, steps: [{ k: 'ring', R: 520, speed: 420, wind: [0.8, 1.0], dmg: 30 }] },
      flames: { band: 'far', w: 2, rec: 0.8, steps: [{ k: 'proj', n: 7, spread: 0.9, speed: 300, dmg: 20, wind: [0.6, 0.9], tex: 'fire_火', size: 10 }] },
    },
    // 第二階段：出招更快、加入連續飛撲與召喚
    phase2: {
      pounce3: { band: 'mid', w: 4, rec: 0.9, steps: [
        { k: 'line', len: 360, width: 80, wind: [0.5, 0.7], dmg: 40, dash: true },
        { k: 'line', len: 360, width: 80, wind: [0.3, 0.5], dmg: 40, dash: true },
        { k: 'line', len: 420, width: 90, wind: [0.45, 0.8], dmg: 48, dash: true }] },
      summon: { band: 'far', w: 1, rec: 1.0, cd: 12, steps: [{ k: 'summon', type: 'wolf', n: 2, wind: [0.8, 1.0] }] },
    },
  },
  dummy: { name: '木樁', img: null, elem: '土', r: 20, hp: 1e9, poise: 200, speed: 0, pref: 0, sight: 0, size: 50, dummy: true, moves: {} },
};
