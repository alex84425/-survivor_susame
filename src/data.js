// 遊戲靜態資料：五行、境界、神通、敵人、名稱產生器

export const ELEMS = ['金', '木', '水', '火', '土'];

export const ELEM_CSS = { 金: '#f2d16b', 木: '#5cc96b', 水: '#4aa8ff', 火: '#ff6a3d', 土: '#c08a4a' };
export const ELEM_DARK = { 金: '#4a3f12', 木: '#173d1d', 水: '#0f2c4d', 火: '#4d1a0d', 土: '#3d2a12' };
export const ELEM_HEX = Object.fromEntries(ELEMS.map(e => [e, parseInt(ELEM_CSS[e].slice(1), 16)]));

// 攻擊方 → 被它剋制的屬性
export const OVERCOMES = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
export const COUNTERED_BY = Object.fromEntries(Object.entries(OVERCOMES).map(([a, b]) => [b, a]));

export function elemMult(att, def) {
  if (!att || !def) return 1;
  if (OVERCOMES[att] === def) return 1.6;
  if (OVERCOMES[def] === att) return 0.6;
  return 1;
}

export const REALMS = ['練氣', '築基', '金丹', '元嬰', '化神'];
export const GRADE_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export const PARTS = ['骨', '皮', '牙'];

// kind: single 單體 / aoe 範圍
export const SKILLS = {
  gengjin:  { name: '庚金劍氣', elem: '金', kind: 'single', cd: 0.9, dmg: 13, desc: '快速穿透飛劍' },
  wanjian:  { name: '萬劍歸宗', elem: '金', kind: 'aoe',    cd: 3.6, dmg: 10, desc: '向四周射出劍陣' },
  qingteng: { name: '青藤縛',   elem: '木', kind: 'single', cd: 1.2, dmg: 15, desc: '追蹤藤蔓，命中緩速' },
  wanmu:    { name: '萬木回春', elem: '木', kind: 'aoe',    cd: 0.7, dmg: 5,  desc: '身周持續傷害並回復肉身' },
  xuanbing: { name: '玄冰箭',   elem: '水', kind: 'single', cd: 1.1, dmg: 11, desc: '扇形冰箭，命中緩速' },
  hanchao:  { name: '寒潮',     elem: '水', kind: 'aoe',    cd: 3.2, dmg: 14, desc: '向外擴散的冰環，緩速' },
  huoqiu:   { name: '火球術',   elem: '火', kind: 'single', cd: 1.3, dmg: 18, desc: '命中後爆炸' },
  fentian:  { name: '焚天烈焰', elem: '火', kind: 'aoe',    cd: 3.0, dmg: 7,  desc: '在敵群中降下火海' },
  luoshi:   { name: '落石術',   elem: '土', kind: 'single', cd: 1.6, dmg: 40, desc: '延遲落下的巨石，傷害極高' },
  dilie:    { name: '地裂',     elem: '土', kind: 'aoe',    cd: 2.8, dmg: 16, desc: '身周震波並擊退' },
};
export const SKILL_IDS = Object.keys(SKILLS);
export const MAX_SKILLS = 6;
export const MAX_SKILL_LVL = 8;

// img：assets/img 下的圖片；face：圖片原本朝向（-1 朝左、1 朝右），用來決定是否翻轉
// ranged：遠程（shot 決定彈種）；charger：會衝鋒
const BOSS = { r: 36, hp: 900, speed: 62, dmg: 25, stone: 80, boss: true };
// moves：招牌技（dash 衝刺、blink 瞬移狐火、web 蛛網定身、pool 毒池、throw 投擲、slam 震地、sting 麻痺毒針）
export const ENEMY_TYPES = {
  bat:   { name: '蝠妖',   ch: '蝠', img: 'bat',       r: 12, hp: 13,  speed: 100, dmg: 5,  stone: 1, face: -1, moves: ['dash'], wind: 0.45 },
  imp:   { name: '小鬼',   ch: '鬼', img: 'goblin',    r: 12, hp: 18,  speed: 72,  dmg: 6,  stone: 1, moves: ['throw'] },
  wolf:  { name: '妖狼',   ch: '狼', img: 'wolf',      r: 13, hp: 16,  speed: 125, dmg: 7,  stone: 1, moves: ['dash'], wind: 0.55 },
  fox:   { name: '狐妖',   ch: '狐', img: 'fox',       r: 13, hp: 20,  speed: 112, dmg: 7,  stone: 1, moves: ['blink'] },
  spit:  { name: '毒蛛',   ch: '蛛', img: 'spider',    r: 14, hp: 28,  speed: 58,  dmg: 8,  stone: 2, ranged: true, shot: 'venom', moves: ['web'] },
  snake: { name: '蛇妖',   ch: '蛇', img: 'snake',     r: 14, hp: 30,  speed: 78,  dmg: 8,  stone: 2, ranged: true, shot: 'orb', moves: ['pool'] },
  scorp: { name: '蠍妖',   ch: '蠍', img: 'scorpion',  r: 15, hp: 42,  speed: 55,  dmg: 9,  stone: 2, ranged: true, shot: 'spread', moves: ['sting'] },
  boar:  { name: '豬妖',   ch: '豬', img: 'boar',      r: 17, hp: 60,  speed: 70,  dmg: 11, stone: 3, charger: true, face: -1, moves: ['dash'] },
  croc:  { name: '鱷妖',   ch: '鱷', img: 'crocodile', r: 18, hp: 75,  speed: 58,  dmg: 12, stone: 3, charger: true, moves: ['dash', 'pool'] },
  bear:  { name: '妖熊',   ch: '熊', img: 'bear',      r: 20, hp: 85,  speed: 52,  dmg: 14, stone: 4, charger: true, moves: ['dash', 'slam'] },
  ogre:  { name: '鬼將',   ch: '將', img: 'ogre',      r: 22, hp: 160, speed: 55,  dmg: 16, stone: 6, charger: true, moves: ['slam', 'dash', 'throw'] },
  boss_dragon:  { ...BOSS, name: '蛟龍王', ch: '龍', img: 'dragon', face: 1 },
  boss_tiger:   { ...BOSS, name: '虎王',   ch: '虎', img: 'tiger', face: -1 },
  boss_lion:    { ...BOSS, name: '獅王',   ch: '獅', img: 'lion' },
  boss_trex:    { ...BOSS, name: '暴龍王', ch: '暴', img: 'trex', face: 1 },
  boss_gorilla: { ...BOSS, name: '猿王',   ch: '猿', img: 'gorilla', face: -1 },
  // 百科沙盒用的木樁
  dummy:        { name: '木樁', ch: '樁', r: 18, hp: 1e9, speed: 0, dmg: 0, stone: 0 },
  // 第三夜的最終妖皇
  emperor:      { ...BOSS, name: '妖皇・燭龍', ch: '皇', img: 'dragon', face: 1, r: 50, hp: 10000, dmg: 32, stone: 300, final: true },
};
export const BOSS_TYPES = Object.keys(ENEMY_TYPES).filter(k => ENEMY_TYPES[k].boss && !ENEMY_TYPES[k].final);

// 依遊戲分鐘決定妖獸出現權重
export function spawnTable(gm) {
  const t = [['bat', 4], ['imp', 4], ['wolf', 2]];
  if (gm >= 2) t.push(['fox', 2], ['spit', 1.5], ['snake', 1], ['boar', 1], ['bear', 0.6]);
  if (gm >= 8) t.push(['scorp', 1.2], ['croc', 1]);
  if (gm >= 12) t.push(['ogre', 0.5]);
  return t;
}

// 像素圖（tools/cutout.py 產生）實際的朝向：1 朝右、-1 朝左、0 正面
export const PX_FACE = {
  wolf: 1, fox: -1, bear: 0, boar: 1, spider: 1, snake: 1, bat: 0, goblin: 0, scorpion: 1, crocodile: 1, ogre: 0,
  dragon: 1, tiger: -1, lion: 1, trex: 1, gorilla: 0, mage: 1, fencer: -1,
};

// 需要載入的圖片
export const IMAGES = ['bat', 'goblin', 'wolf', 'fox', 'spider', 'snake', 'scorpion', 'boar', 'crocodile', 'bear', 'ogre',
  'dragon', 'tiger', 'lion', 'trex', 'gorilla', 'mage', 'fencer', 'shrine', 'gem', 'scroll', 'bone', 'pill'];

const pick = a => a[Math.floor(Math.random() * a.length)];

const SURNAMES = ['韓', '厲', '南宮', '慕容', '紫', '王', '李', '張', '陳', '林', '蕭', '葉', '秦', '白', '柳', '雲', '司徒', '上官', '溫', '墨'];
const GIVEN = ['立', '飛雨', '婉', '天明', '青', '無忌', '凌霄', '若水', '長風', '清寒', '玄', '寒', '鶴', '一', '問天', '靈兒', '星河', '景', '塵', '月'];
export const randName = () => pick(SURNAMES) + pick(GIVEN);

const SECT_PRE = ['青雲', '天劍', '玄冰', '烈陽', '厚土', '落雲', '太乙', '紫霄', '萬靈', '碧水', '黃楓', '掩月', '靈獸', '天闕', '星宮', '御靈'];
const SECT_SUF = ['宗', '門', '派', '谷', '閣', '山', '島'];
export const randSectName = () => pick(SECT_PRE) + pick(SECT_SUF);

const GF_PRE = {
  金: ['庚金', '太白', '銳金', '萬劍', '金剛'],
  木: ['長春', '青木', '乙木', '枯榮', '青帝'],
  水: ['玄冰', '癸水', '寒潭', '碧波', '玄武'],
  火: ['烈陽', '丙火', '焚天', '赤炎', '朱雀'],
  土: ['厚土', '戊土', '磐石', '坤元', '玄黃'],
};
const GF_SUF = ['訣', '經', '心法', '功', '真解', '寶典'];
export const randGongfaName = elem => '《' + pick(GF_PRE[elem]) + pick(GF_SUF) + '》';

// 陣營戰：正道 vs 魔道
const EVIL = ['血煞宗', '合歡宗', '鬼靈門', '天魔宗', '陰羅宗', '萬毒門', '屍魂殿'];
export const randEvilSect = () => pick(EVIL);
