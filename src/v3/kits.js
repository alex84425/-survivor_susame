// v3 職業與妖獸資料。招式的實際行為在 game.js，這裡放數值與說明，方便百科與平衡。

// ---------- 職業（主修五行） ----------
export const CLASSES = {
  金: {
    id: 'jin', name: '追獵者', role: '中近距離・切入切出', hp: 280, speed: 215, img: 'fencer',
    passive: '對被標記或殘血（< 40%）的目標 +25%；閃避後下一次普攻 ×1.5',
    basic: { name: '三段劍擊', desc: '連按左鍵三連斬，第三段突進並放出劍氣；按住蓄力放開＝穿刺重擊',
      steps: [
        { wind: 0.07, rec: 0.15, range: 125, half: 1.15, dmg: 22, poise: 12, lunge: 40 },
        { wind: 0.07, rec: 0.17, range: 125, half: 1.15, dmg: 24, poise: 14, lunge: 40 },
        { wind: 0.12, rec: 0.32, range: 150, half: 1.2, dmg: 46, poise: 30, lunge: 110, heavy: true, wave: { dmg: 26, range: 180 } },
      ], move: 0.5, window: 0.38, mpHit: 2,
      charged: { kind: 'thrust', len: 220, width: 70, dmg: 70, poise: 50 } },
    skill: { id: 'feijian', name: '飛劍突刺', cost: 35, cd: 1.2, desc: '向滑鼠方向穿刺衝鋒 260 距離，路徑上的敵人受傷並被標記 6 秒（受傷 +25%）', dmg: 40, poise: 35 },
    ult: { name: '萬劍歸宗', desc: '在滑鼠附近降下 14 道劍雨，每道 34 傷害', dmg: 34 },
  },
  木: {
    id: 'mu', name: '遊俠', role: '遠程拉打・剋快速敵人', hp: 240, speed: 225, img: 'mage',
    passive: '對速度快的敵人 +30%；射擊時移動不減速',
    basic: { name: '追蹤葉刃', desc: '按住左鍵連射會追蹤的葉刃，傷害普通', rate: 0.15, dmg: 8, poise: 3, speed: 640, homing: 3.5, life: 0.9 },
    skill: { id: 'chanteng', name: '纏藤', cost: 30, cd: 3, desc: '射出藤蔓，命中定身 2.5 秒並造成傷害', dmg: 24, poise: 15 },
    ult: { name: '萬木林', desc: '在滑鼠位置展開 230 範圍的林海 7 秒：敵人減速 60%、持續受傷', dmg: 12 },
  },
  水: {
    id: 'shui', name: '御法者', role: '平衡・彈反', hp: 300, speed: 210, img: 'mage',
    passive: '每次命中回復 0.6% 肉身',
    basic: { name: '水鞭', desc: '兩段中距離扇形掃擊；按住蓄力放開＝水龍捲，把周圍敵人拉近',
      steps: [
        { wind: 0.11, rec: 0.22, range: 170, half: 0.6, dmg: 22, poise: 13 },
        { wind: 0.13, rec: 0.32, range: 180, half: 0.7, dmg: 30, poise: 20, heavy: true },
      ], move: 0.6, window: 0.4,
      charged: { kind: 'vortex', R: 200, dmg: 55, poise: 40 } },
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
    passive: '出招時霸體且減傷 30%，命中回 2% 肉身；肉身最高',
    basic: { name: '開山拳', desc: '慢而重的兩段重拳，出招霸體；按住蓄力放開＝震地重擊',
      steps: [
        { wind: 0.2, rec: 0.32, range: 120, half: 1.35, dmg: 62, poise: 48, lunge: 40, heavy: true },
        { wind: 0.24, rec: 0.45, range: 140, half: 1.4, dmg: 95, poise: 72, lunge: 60, heavy: true },
      ], move: 0.45, window: 0.45, shieldHit: 0.02,
      charged: { kind: 'quake', R: 180, dmg: 120, poise: 90 } },
    skill: { id: 'dilie', name: '地裂', cost: 35, cd: 3, desc: '前搖 0.35 秒，以自身為中心 160 範圍震地並擊退', dmg: 58, poise: 60 },
    ult: { name: '金剛不壞', desc: '7 秒內減傷 70%、不會硬直，每秒震地一次', dmg: 36 },
  },
};

// ---------- 妖獸 ----------
// 招式由「步驟」組成；k：arc 扇形、line 直線（dash 會衝過去）、circle 圓圈、ring 擴散衝擊環、proj 投射物、hop 後跳、pool 毒池、summon 召喚
// wind：前搖秒數範圍（隨機，避免背節奏）；band：近 near / 中 mid / 遠 far
export const ENEMIES = {
  wolf: {
    name: '妖狼', img: 'wolf', elem: '金', r: 17, exp: 18, hp: 260, poise: 60, speed: 165, pref: 72, sight: 430, size: 62, fast: true,
    moves: {
      bite2: { band: 'near', w: 3, rec: 0.85, steps: [
        { k: 'arc', range: 72, half: 0.75, wind: [0.42, 0.7], dmg: 16 },
        { k: 'arc', range: 72, half: 0.75, wind: [0.22, 0.38], dmg: 16 }] },
      pounce: { band: 'mid', w: 3, rec: 1.05, steps: [{ k: 'line', len: 270, width: 44, wind: [0.55, 0.85], dmg: 22, dash: true }] },
      howl: { band: 'far', w: 2, rec: 0.9, cd: 4, steps: [{ k: 'proj', n: 3, spread: 0.35, speed: 330, dmg: 14, wind: [0.6, 0.8], tex: 'wave', size: 12 }] },
    },
  },
  bear: {
    name: '妖熊', img: 'bear', elem: '土', r: 26, exp: 45, hp: 720, poise: 150, speed: 105, pref: 82, sight: 400, size: 86,
    moves: {
      swipe3: { band: 'near', w: 3, rec: 1.2, steps: [
        { k: 'arc', range: 92, half: 0.95, wind: [0.55, 0.9], dmg: 24 },
        { k: 'arc', range: 92, half: 0.95, wind: [0.3, 0.6], dmg: 24 },
        { k: 'arc', range: 105, half: 1.2, wind: [0.6, 1.05], dmg: 36 }] },
      charge: { band: 'mid', w: 2, rec: 1.5, steps: [{ k: 'line', len: 340, width: 62, wind: [0.75, 1.0], dmg: 32, dash: true }] },
      rock: { band: 'far', w: 2, rec: 0.9, cd: 3, steps: [{ k: 'circle', at: 'target', R: 75, wind: [0.9, 1.1], dmg: 30, track: 0.5, rock: true }] },
      slam: { band: 'near', w: 1, rec: 1.5, cd: 5, steps: [{ k: 'circle', at: 'self', R: 140, wind: [0.85, 1.1], dmg: 34 }] },
    },
  },
  spider: {
    name: '毒蛛', img: 'spider', elem: '木', r: 18, exp: 25, hp: 290, poise: 70, speed: 120, pref: 290, sight: 460, size: 64, ranged: true,
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
    name: '夜王・翼虎', img: 'tiger', elem: '火', r: 36, exp: 500, hp: 3400, poise: 320, speed: 175, pref: 95, sight: 520, size: 120, boss: true,
    moves: {
      claws: { band: 'near', w: 3, rec: 0.9, steps: [
        { k: 'arc', range: 120, half: 0.9, wind: [0.45, 0.75], dmg: 30 },
        { k: 'arc', range: 120, half: 0.9, wind: [0.2, 0.45], dmg: 30 },
        { k: 'circle', at: 'self', R: 150, wind: [0.5, 0.8], dmg: 38 }] },
      pounce: { band: 'mid', w: 3, rec: 1.05, steps: [{ k: 'line', len: 380, width: 80, wind: [0.6, 0.9], dmg: 40, dash: true }] },
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
  boar: {
    name: '豬妖', img: 'boar', elem: '土', r: 22, hp: 480, poise: 110, speed: 120, pref: 80, sight: 400, size: 76, exp: 30,
    moves: {
      gore: { band: 'near', w: 3, rec: 0.9, steps: [{ k: 'arc', range: 85, half: 0.8, wind: [0.5, 0.8], dmg: 24 }] },
      rush: { band: 'mid', w: 3, rec: 1.2, steps: [{ k: 'line', len: 420, width: 56, wind: [0.7, 1.0], dmg: 30, dash: true }] },
      stomp: { band: 'far', w: 1, rec: 1.0, cd: 4, steps: [{ k: 'line', len: 420, width: 56, wind: [0.9, 1.1], dmg: 30, dash: true }] },
    },
  },
  snake: {
    name: '火蛇', img: 'snake', elem: '火', r: 18, hp: 300, poise: 70, speed: 115, pref: 260, sight: 450, size: 66, ranged: true, exp: 25,
    moves: {
      lash: { band: 'near', w: 3, rec: 0.7, steps: [{ k: 'arc', range: 80, half: 1.0, wind: [0.4, 0.6], dmg: 18 }, { k: 'hop', dist: 180, wind: [0.05, 0.1] }] },
      spit: { band: 'mid', w: 3, rec: 0.7, steps: [{ k: 'proj', n: 1, spread: 0, speed: 340, dmg: 20, wind: [0.45, 0.7], tex: 'fire_火', size: 10 }, { k: 'proj', n: 1, spread: 0, speed: 340, dmg: 20, wind: [0.25, 0.4], tex: 'fire_火', size: 10 }] },
      firepool: { band: 'far', w: 2, rec: 0.8, cd: 5, steps: [{ k: 'pool', R: 90, wind: [0.8, 1.0], dmg: 10, life: 4, track: 0.6 }] },
    },
  },
  ogre: {
    name: '鬼將', img: 'ogre', elem: '金', r: 30, hp: 1500, poise: 260, speed: 95, pref: 95, sight: 460, size: 104, exp: 120, elite: true,
    moves: {
      club3: { band: 'near', w: 3, rec: 1.1, steps: [
        { k: 'arc', range: 120, half: 1.1, wind: [0.6, 0.95], dmg: 34 },
        { k: 'arc', range: 120, half: 1.1, wind: [0.45, 0.8], dmg: 34 },
        { k: 'circle', at: 'self', R: 170, wind: [0.75, 1.1], dmg: 46 }] },
      leap: { band: 'mid', w: 2, rec: 1.2, steps: [{ k: 'circle', at: 'target', R: 120, wind: [0.9, 1.1], dmg: 44, track: 0.7 }] },
      throwc: { band: 'far', w: 2, rec: 1.0, cd: 4, steps: [{ k: 'circle', at: 'target', R: 80, wind: [0.9, 1.1], dmg: 32, track: 0.5, rock: true }] },
    },
  },
  // 第二夜的夜王
  dragon: {
    name: '夜王・蛟龍', img: 'dragon', elem: '水', r: 40, hp: 5200, poise: 380, speed: 165, pref: 120, sight: 600, size: 130, boss: true, exp: 600,
    moves: {
      bite: { band: 'near', w: 3, rec: 0.8, steps: [
        { k: 'arc', range: 130, half: 0.8, wind: [0.5, 0.8], dmg: 38 },
        { k: 'circle', at: 'self', R: 170, wind: [0.5, 0.8], dmg: 40 }] },
      surge: { band: 'mid', w: 3, rec: 0.9, steps: [{ k: 'line', len: 460, width: 90, wind: [0.6, 0.9], dmg: 44, dash: true }] },
      storm: { band: 'far', w: 2, rec: 1.0, cd: 4, steps: [
        { k: 'circle', at: 'target', R: 90, wind: [0.7, 0.9], dmg: 34, track: 0.8 },
        { k: 'circle', at: 'target', R: 90, wind: [0.4, 0.6], dmg: 34, track: 0.8 },
        { k: 'circle', at: 'target', R: 90, wind: [0.4, 0.6], dmg: 34, track: 0.8 }] },
      tide: { band: 'far', w: 2, rec: 1.0, cd: 6, steps: [{ k: 'ring', R: 600, speed: 380, wind: [0.8, 1.0], dmg: 32 }] },
    },
    phase2: {
      surge3: { band: 'mid', w: 4, rec: 1.0, steps: [
        { k: 'line', len: 420, width: 90, wind: [0.5, 0.7], dmg: 44, dash: true },
        { k: 'line', len: 420, width: 90, wind: [0.3, 0.5], dmg: 44, dash: true },
        { k: 'ring', R: 520, speed: 420, wind: [0.4, 0.6], dmg: 30 }] },
      summon: { band: 'far', w: 1, rec: 1.0, cd: 14, steps: [{ k: 'summon', type: 'snake', n: 2, wind: [0.8, 1.0] }] },
    },
  },
  // 最終王
  emperor: {
    name: '妖皇・暴龍', img: 'trex', elem: '土', r: 52, hp: 9000, poise: 520, speed: 150, pref: 130, sight: 900, size: 170, boss: true, final: true, exp: 0,
    moves: {
      maul: { band: 'near', w: 3, rec: 0.8, steps: [
        { k: 'arc', range: 160, half: 1.0, wind: [0.5, 0.8], dmg: 46 },
        { k: 'arc', range: 160, half: 1.0, wind: [0.3, 0.55], dmg: 46 },
        { k: 'circle', at: 'self', R: 220, wind: [0.6, 0.9], dmg: 56 }] },
      charge: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'line', len: 520, width: 110, wind: [0.6, 0.9], dmg: 54, dash: true }] },
      quake: { band: 'far', w: 2, rec: 1.0, cd: 5, steps: [{ k: 'ring', R: 700, speed: 400, wind: [0.8, 1.0], dmg: 36 }, { k: 'ring', R: 700, speed: 400, wind: [0.35, 0.5], dmg: 36 }] },
      meteors: { band: 'far', w: 2, rec: 1.0, cd: 4, steps: [
        { k: 'circle', at: 'target', R: 110, wind: [0.7, 0.9], dmg: 40, track: 0.8, rock: true },
        { k: 'circle', at: 'target', R: 110, wind: [0.35, 0.5], dmg: 40, track: 0.8, rock: true },
        { k: 'circle', at: 'target', R: 110, wind: [0.35, 0.5], dmg: 40, track: 0.8, rock: true }] },
    },
    phase2: {
      charge3: { band: 'mid', w: 4, rec: 1.1, steps: [
        { k: 'line', len: 520, width: 110, wind: [0.5, 0.7], dmg: 54, dash: true },
        { k: 'line', len: 520, width: 110, wind: [0.3, 0.5], dmg: 54, dash: true },
        { k: 'circle', at: 'self', R: 240, wind: [0.5, 0.8], dmg: 60 }] },
      summon: { band: 'far', w: 1, rec: 1.0, cd: 15, steps: [{ k: 'summon', type: 'ogre', n: 1, wind: [0.9, 1.1] }] },
    },
  },
  // ---------- 新妖獸（2026-10-19，AI 美術） ----------
  bat: {
    name: '蝠妖', elem: '木', r: 16, exp: 20, hp: 220, poise: 50, speed: 190, pref: 110, sight: 460, size: 66, fast: true,
    moves: {
      dive: { band: 'near', w: 3, rec: 0.7, steps: [{ k: 'line', len: 200, width: 40, wind: [0.4, 0.6], dmg: 14, dash: true }] },
      swoop: { band: 'mid', w: 3, rec: 0.8, steps: [{ k: 'line', len: 300, width: 44, wind: [0.5, 0.75], dmg: 16, dash: true }, { k: 'hop', dist: 160, wind: [0.05, 0.1] }] },
      screech: { band: 'far', w: 2, rec: 0.8, cd: 4, steps: [{ k: 'proj', n: 5, spread: 0.6, speed: 300, dmg: 10, wind: [0.5, 0.7], tex: 'wave', size: 10 }] },
    },
  },
  crane: {
    name: '鶴妖', elem: '金', r: 20, exp: 32, hp: 360, poise: 80, speed: 150, pref: 120, sight: 480, size: 82,
    moves: {
      peck: { band: 'near', w: 3, rec: 0.8, steps: [{ k: 'line', len: 140, width: 30, wind: [0.35, 0.55], dmg: 20 }, { k: 'line', len: 140, width: 30, wind: [0.2, 0.35], dmg: 20 }] },
      lunge: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'line', len: 320, width: 40, wind: [0.5, 0.8], dmg: 24, dash: true }] },
      feathers: { band: 'far', w: 2, rec: 0.8, steps: [{ k: 'proj', n: 5, spread: 0.45, speed: 380, dmg: 14, wind: [0.55, 0.8], tex: 'sw_金', size: 9 }] },
    },
  },
  golem: {
    name: '石傀儡', elem: '土', r: 30, exp: 110, hp: 1400, poise: 300, speed: 80, pref: 95, sight: 400, size: 104, elite: true,
    moves: {
      smash: { band: 'near', w: 3, rec: 1.3, steps: [{ k: 'arc', range: 120, half: 1.1, wind: [0.7, 1.0], dmg: 38 }, { k: 'circle', at: 'self', R: 160, wind: [0.6, 0.9], dmg: 44 }] },
      boulder: { band: 'far', w: 2, rec: 1.1, cd: 4, steps: [{ k: 'circle', at: 'target', R: 90, wind: [0.9, 1.1], dmg: 36, track: 0.5, rock: true }] },
      quake: { band: 'mid', w: 2, rec: 1.2, cd: 5, steps: [{ k: 'ring', R: 380, speed: 360, wind: [0.8, 1.0], dmg: 28 }] },
    },
  },
  jiangshi: {
    name: '殭屍', elem: '水', r: 18, exp: 30, hp: 420, poise: 120, speed: 110, pref: 80, sight: 420, size: 72,
    moves: {
      claw: { band: 'near', w: 3, rec: 0.9, steps: [{ k: 'arc', range: 85, half: 0.8, wind: [0.45, 0.7], dmg: 22 }, { k: 'arc', range: 85, half: 0.8, wind: [0.25, 0.4], dmg: 22 }] },
      hop: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'circle', at: 'target', R: 80, wind: [0.6, 0.85], dmg: 24, track: 0.7 }] },
      breath: { band: 'far', w: 1, rec: 0.8, cd: 6, steps: [{ k: 'pool', R: 90, wind: [0.8, 1.0], dmg: 9, life: 4, track: 0.6 }] },
    },
  },
  python: {
    name: '吞雲蟒', elem: '木', r: 24, exp: 40, hp: 620, poise: 130, speed: 120, pref: 100, sight: 440, size: 92,
    moves: {
      bite: { band: 'near', w: 3, rec: 0.9, steps: [{ k: 'arc', range: 110, half: 0.6, wind: [0.45, 0.7], dmg: 26 }] },
      sweep: { band: 'near', w: 2, rec: 1.1, cd: 4, steps: [{ k: 'circle', at: 'self', R: 150, wind: [0.7, 0.95], dmg: 30 }] },
      strike: { band: 'mid', w: 3, rec: 1.1, steps: [{ k: 'line', len: 360, width: 54, wind: [0.6, 0.9], dmg: 30, dash: true }] },
      fog: { band: 'far', w: 1, rec: 0.8, cd: 6, steps: [{ k: 'pool', R: 110, wind: [0.8, 1.0], dmg: 8, life: 4, track: 0.6 }] },
    },
  },
  scorpion: {
    name: '蠍妖', elem: '火', r: 22, exp: 34, hp: 480, poise: 120, speed: 120, pref: 90, sight: 430, size: 80,
    moves: {
      pincer: { band: 'near', w: 3, rec: 0.9, steps: [{ k: 'arc', range: 95, half: 0.9, wind: [0.4, 0.65], dmg: 20 }, { k: 'arc', range: 95, half: 0.9, wind: [0.25, 0.4], dmg: 20 }] },
      sting: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'line', len: 220, width: 34, wind: [0.6, 0.85], dmg: 30 }] },
      venom: { band: 'far', w: 2, rec: 0.8, steps: [{ k: 'proj', n: 3, spread: 0.3, speed: 300, dmg: 14, wind: [0.55, 0.8], tex: 'venom', size: 9 }] },
    },
  },
  tianmo: {
    name: '天魔', elem: '火', r: 26, exp: 130, hp: 1300, poise: 240, speed: 150, pref: 110, sight: 500, size: 96, elite: true,
    moves: {
      blades: { band: 'near', w: 3, rec: 0.9, steps: [
        { k: 'arc', range: 120, half: 1.0, wind: [0.45, 0.7], dmg: 30 }, { k: 'arc', range: 120, half: 1.0, wind: [0.25, 0.4], dmg: 30 }, { k: 'circle', at: 'self', R: 150, wind: [0.5, 0.75], dmg: 36 }] },
      blink: { band: 'mid', w: 3, rec: 0.9, steps: [{ k: 'line', len: 380, width: 60, wind: [0.5, 0.75], dmg: 34, dash: true }] },
      hellfire: { band: 'far', w: 2, rec: 1.0, steps: [{ k: 'proj', n: 7, spread: 0.8, speed: 320, dmg: 18, wind: [0.6, 0.85], tex: 'fire_火', size: 10 }] },
    },
  },
  toad: {
    name: '蟾蜍王', elem: '水', r: 26, exp: 45, hp: 760, poise: 160, speed: 95, pref: 110, sight: 420, size: 92,
    moves: {
      tongue: { band: 'mid', w: 3, rec: 0.9, steps: [{ k: 'line', len: 300, width: 30, wind: [0.5, 0.75], dmg: 22 }] },
      belly: { band: 'near', w: 3, rec: 1.1, steps: [{ k: 'circle', at: 'self', R: 130, wind: [0.6, 0.9], dmg: 28 }] },
      leap: { band: 'far', w: 2, rec: 1.2, steps: [{ k: 'circle', at: 'target', R: 110, wind: [0.9, 1.1], dmg: 34, track: 0.6 }, { k: 'pool', R: 100, wind: [0.1, 0.2], dmg: 8, life: 3, track: 0 }] },
    },
  },
  wisp: {
    name: '鬼火', elem: '火', r: 16, exp: 22, hp: 200, poise: 40, speed: 130, pref: 280, sight: 460, size: 64, ranged: true,
    moves: {
      burst: { band: 'near', w: 3, rec: 0.6, steps: [{ k: 'circle', at: 'self', R: 100, wind: [0.5, 0.75], dmg: 18 }, { k: 'hop', dist: 220, wind: [0.05, 0.1] }] },
      orbs: { band: 'mid', w: 3, rec: 0.7, steps: [{ k: 'proj', n: 3, spread: 0.4, speed: 280, dmg: 14, wind: [0.5, 0.75], tex: 'fire_火', size: 9 }] },
      rain: { band: 'far', w: 2, rec: 0.8, cd: 4, steps: [{ k: 'circle', at: 'target', R: 70, wind: [0.7, 0.9], dmg: 18, track: 0.8 }, { k: 'circle', at: 'target', R: 70, wind: [0.35, 0.5], dmg: 18, track: 0.8 }] },
    },
  },
  // ---------- 新夜王（每夜從夜王池隨機一隻） ----------
  ninetail: {
    name: '夜王・九尾天狐', elem: '火', r: 36, exp: 500, hp: 3400, poise: 320, speed: 185, pref: 120, sight: 520, size: 130, boss: true,
    moves: {
      tails: { band: 'near', w: 3, rec: 0.9, steps: [{ k: 'arc', range: 130, half: 1.2, wind: [0.45, 0.7], dmg: 30 }, { k: 'circle', at: 'self', R: 170, wind: [0.5, 0.8], dmg: 36 }] },
      dash: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'line', len: 400, width: 80, wind: [0.6, 0.85], dmg: 38, dash: true }] },
      foxfire: { band: 'far', w: 3, rec: 0.9, steps: [{ k: 'proj', n: 9, spread: 1.1, speed: 300, dmg: 18, wind: [0.6, 0.85], tex: 'fire_火', size: 10 }] },
    },
    phase2: {
      foxfire2: { band: 'far', w: 3, rec: 0.8, steps: [{ k: 'proj', n: 9, spread: 1.1, speed: 320, dmg: 18, wind: [0.5, 0.7], tex: 'fire_火', size: 10 }, { k: 'proj', n: 9, spread: 1.1, speed: 320, dmg: 18, wind: [0.3, 0.45], tex: 'fire_火', size: 10 }] },
      summon: { band: 'far', w: 1, rec: 1.0, cd: 12, steps: [{ k: 'summon', type: 'wisp', n: 3, wind: [0.8, 1.0] }] },
    },
  },
  thunderbird: {
    name: '夜王・雷鵬', elem: '木', r: 38, exp: 500, hp: 3400, poise: 320, speed: 175, pref: 130, sight: 540, size: 130, boss: true,
    moves: {
      talon: { band: 'near', w: 3, rec: 0.9, steps: [{ k: 'arc', range: 130, half: 0.9, wind: [0.45, 0.7], dmg: 32 }, { k: 'arc', range: 130, half: 0.9, wind: [0.25, 0.4], dmg: 32 }] },
      dive: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'line', len: 420, width: 80, wind: [0.6, 0.9], dmg: 40, dash: true }] },
      storm: { band: 'far', w: 2, rec: 1.0, cd: 4, steps: [
        { k: 'circle', at: 'target', R: 85, wind: [0.6, 0.8], dmg: 30, track: 0.8 }, { k: 'circle', at: 'target', R: 85, wind: [0.35, 0.5], dmg: 30, track: 0.8 },
        { k: 'circle', at: 'target', R: 85, wind: [0.35, 0.5], dmg: 30, track: 0.8 }] },
    },
    phase2: {
      gale: { band: 'far', w: 2, rec: 1.0, cd: 5, steps: [{ k: 'ring', R: 560, speed: 440, wind: [0.7, 0.9], dmg: 30 }] },
      summon: { band: 'far', w: 1, rec: 1.0, cd: 12, steps: [{ k: 'summon', type: 'bat', n: 3, wind: [0.8, 1.0] }] },
    },
  },
  corpseking: {
    name: '夜王・屍王', elem: '金', r: 38, exp: 500, hp: 3600, poise: 340, speed: 140, pref: 110, sight: 520, size: 130, boss: true,
    moves: {
      scepter: { band: 'near', w: 3, rec: 1.0, steps: [{ k: 'arc', range: 140, half: 1.0, wind: [0.5, 0.8], dmg: 34 }, { k: 'circle', at: 'self', R: 170, wind: [0.5, 0.8], dmg: 38 }] },
      grasp: { band: 'mid', w: 3, rec: 1.0, steps: [{ k: 'pool', R: 120, wind: [0.7, 0.9], dmg: 10, life: 4, track: 0.7 }] },
      bones: { band: 'far', w: 2, rec: 0.9, steps: [{ k: 'proj', n: 7, spread: 0.9, speed: 300, dmg: 18, wind: [0.6, 0.85], tex: 'sw_金', size: 10 }] },
    },
    phase2: {
      summon: { band: 'far', w: 2, rec: 1.0, cd: 10, steps: [{ k: 'summon', type: 'jiangshi', n: 3, wind: [0.8, 1.0] }] },
      deathring: { band: 'mid', w: 2, rec: 1.0, cd: 5, steps: [{ k: 'ring', R: 520, speed: 380, wind: [0.7, 0.9], dmg: 32 }] },
    },
  },
  blooddemon: {
    name: '夜王・血魔', elem: '火', r: 36, exp: 600, hp: 5200, poise: 380, speed: 160, pref: 120, sight: 600, size: 130, boss: true,
    moves: {
      tendrils: { band: 'near', w: 3, rec: 0.8, steps: [{ k: 'circle', at: 'self', R: 160, wind: [0.5, 0.75], dmg: 40 }, { k: 'arc', range: 160, half: 1.2, wind: [0.3, 0.5], dmg: 38 }] },
      surge: { band: 'mid', w: 3, rec: 0.9, steps: [{ k: 'line', len: 460, width: 90, wind: [0.6, 0.9], dmg: 44, dash: true }] },
      bloodrain: { band: 'far', w: 2, rec: 1.0, cd: 4, steps: [
        { k: 'pool', R: 100, wind: [0.6, 0.8], dmg: 12, life: 4, track: 0.8 }, { k: 'circle', at: 'target', R: 90, wind: [0.5, 0.7], dmg: 36, track: 0.8 }] },
    },
    phase2: {
      surge3: { band: 'mid', w: 4, rec: 1.0, steps: [
        { k: 'line', len: 420, width: 90, wind: [0.5, 0.7], dmg: 44, dash: true }, { k: 'line', len: 420, width: 90, wind: [0.3, 0.5], dmg: 44, dash: true },
        { k: 'ring', R: 520, speed: 420, wind: [0.4, 0.6], dmg: 30 }] },
    },
  },
  turtle: {
    name: '夜王・玄武', elem: '水', r: 44, exp: 600, hp: 6200, poise: 460, speed: 110, pref: 130, sight: 600, size: 140, boss: true,
    moves: {
      stomp: { band: 'near', w: 3, rec: 1.0, steps: [{ k: 'circle', at: 'self', R: 190, wind: [0.6, 0.9], dmg: 44 }] },
      serpent: { band: 'mid', w: 3, rec: 0.9, steps: [{ k: 'line', len: 380, width: 60, wind: [0.5, 0.8], dmg: 40 }, { k: 'arc', range: 160, half: 1.0, wind: [0.3, 0.5], dmg: 36 }] },
      tide: { band: 'far', w: 2, rec: 1.0, cd: 5, steps: [{ k: 'ring', R: 620, speed: 360, wind: [0.8, 1.0], dmg: 34 }] },
      boulders: { band: 'far', w: 2, rec: 1.0, cd: 4, steps: [
        { k: 'circle', at: 'target', R: 100, wind: [0.7, 0.9], dmg: 38, track: 0.8, rock: true }, { k: 'circle', at: 'target', R: 100, wind: [0.4, 0.6], dmg: 38, track: 0.8, rock: true }] },
    },
    phase2: {
      summon: { band: 'far', w: 1, rec: 1.0, cd: 14, steps: [{ k: 'summon', type: 'toad', n: 2, wind: [0.8, 1.0] }] },
    },
  },
  dummy: { name: '木樁', img: null, elem: '土', r: 20, hp: 1e9, poise: 200, speed: 0, pref: 0, sight: 0, size: 50, dummy: true, moves: {} },
};

// 夜王池：第一夜、第二夜各隨機一隻
export const NIGHT_KINGS = [['tiger', 'ninetail', 'thunderbird', 'corpseking'], ['dragon', 'blooddemon', 'turtle']];

// ---------- 心法（祝福）：篝火首次點亮、擊敗夜王時三選一 ----------
// 相生心法：同時擁有兩個相生屬性的心法時才會出現
export const BOONS = {
  jin_edge:    { elem: '金', name: '鋒銳', desc: '普攻傷害 +20%' },
  jin_hunt:    { elem: '金', name: '追魂', desc: '對被標記或殘血的敵人再 +20%' },
  jin_heart:   { elem: '金', name: '劍心', desc: '完美閃避後，接下來 3 次普攻都暴擊' },
  mu_spring:   { elem: '木', name: '回春', desc: '3 秒沒受傷時，每秒回復 1.5% 肉身' },
  mu_bind:     { elem: '木', name: '藤縛', desc: '命中有 12% 機率定身敵人 1 秒' },
  mu_wind:     { elem: '木', name: '疾風', desc: '遁速 +12%，閃避體力消耗 -30%' },
  shui_frost:  { elem: '水', name: '寒冰', desc: '命中使敵人減速 30%（1.5 秒）' },
  shui_tide:   { elem: '水', name: '潮汐', desc: '真元上限 +40，戰技冷卻 -25%' },
  shui_mirror: { elem: '水', name: '鏡水', desc: '完美閃避或彈反時回復 8% 肉身' },
  huo_karma:   { elem: '火', name: '業火', desc: '所有命中附加 1 層灼燒' },
  huo_burst:   { elem: '火', name: '爆炎', desc: '擊殺時爆炸，周圍 100 範圍造成 40 傷害' },
  huo_heart:   { elem: '火', name: '灼心', desc: '對灼燒中的敵人傷害 +25%' },
  tu_rock:     { elem: '土', name: '磐石', desc: '肉身上限 +25%' },
  tu_thick:    { elem: '土', name: '厚土', desc: '受到傷害 -15%' },
  tu_quake:    { elem: '土', name: '震岳', desc: '重擊命中時震地：周圍 90 範圍 25 傷害' },
  // 相生
  duo_frostblade: { duo: ['金', '水'], name: '霜刃（金生水）', desc: '暴擊會凍住敵人 1 秒' },
  duo_rainwood:   { duo: ['水', '木'], name: '雨林（水生木）', desc: '每次閃避回復 3% 肉身' },
  duo_wildfire:   { duo: ['木', '火'], name: '燎原（木生火）', desc: '灼燒中的敵人死亡時，灼燒傳染給周圍 160 範圍的敵人' },
  duo_lava:       { duo: ['火', '土'], name: '熔岩（火生土）', desc: '重擊在地上留下 2 秒熔岩（持續傷害、灼燒）' },
  duo_vajra:      { duo: ['土', '金'], name: '金剛劍（土生金）', desc: '處決後 6 秒內傷害 +40%' },
};

// 升級成長（在篝火用靈石升級）
export const LEVEL = {
  cost: lv => Math.round(60 + 45 * (lv - 1) + 6 * (lv - 1) ** 2),
  hp: 0.04,   // 每級肉身 +4%（土屬性另加）
  dmg: 0.03,  // 每級傷害 +3%（屬性補正另加）
  max: 20,
};
