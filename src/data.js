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

export const ENEMY_TYPES = {
  imp:  { name: '小妖', ch: '妖', r: 12, hp: 18,  speed: 72,  dmg: 6,  stone: 1 },
  wolf: { name: '妖狼', ch: '狼', r: 13, hp: 14,  speed: 125, dmg: 7,  stone: 1 },
  spit: { name: '毒蛛', ch: '蛛', r: 14, hp: 28,  speed: 58,  dmg: 8,  stone: 2, ranged: true },
  bear: { name: '妖熊', ch: '熊', r: 20, hp: 85,  speed: 52,  dmg: 14, stone: 4 },
  boss: { name: '妖王', ch: '王', r: 36, hp: 900, speed: 62,  dmg: 25, stone: 80, boss: true },
};

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
