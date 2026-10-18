// 所有數值公式集中在這裡，遊戲（main.js）與百科（wiki）共用，調整一處兩邊同步。
// gm：遊戲分鐘（0～30，短局會等比壓縮）；g：品階 1～9；L：神通等級 1～8；realm：境界 0～4

export const DMG_BASE = 1.6; // 升級不給神通，所以神通基礎傷害整體放大

// 神通單發傷害
export function skillDmg(base, L, g, lq, realm) {
  return DMG_BASE * base * (1 + 0.3 * (L - 1)) * (1 + 0.12 * (g - 1)) * (1 + lq) * (1 + realm * 0.3);
}

// 神通冷卻（秒）：靈根越高越快
export function skillCd(cd, L, lg) {
  return cd * (1 - 0.05 * (L - 1)) / Math.max(0.3, lg);
}

// 法寶：強化同屬性神通
export function weapon(g) {
  return { n: Math.floor(g / 3), pierce: Math.floor(g / 2), area: 1 + g * 0.06 };
}

// 各神通的「形狀」：數量、穿透、範圍半徑。W 為 weapon() 的結果
export function shape(id, L, W = weapon(0)) {
  switch (id) {
    case 'gengjin': return { n: 1 + Math.floor(L / 3) + W.n, pierce: 2 + Math.floor(L / 2) + W.pierce };
    case 'wanjian': return { n: 8 + L * 2 + W.n * 3, pierce: 3 + W.pierce, life: 0.9 * W.area };
    case 'qingteng': return { n: 1 + Math.floor(L / 4) + W.n, pierce: 1 + Math.floor(L / 3) + W.pierce };
    case 'wanmu': return { n: 1, R: (85 + L * 10) * W.area };
    case 'xuanbing': return { n: 2 + Math.floor(L / 3) + W.n, pierce: 1 + W.pierce };
    case 'hanchao': return { n: 1, R: (190 + L * 22) * W.area };
    case 'huoqiu': return { n: 1 + Math.floor(L / 4) + W.n, pierce: W.pierce, R: (48 + L * 6) * W.area };
    case 'fentian': return { n: 1 + Math.floor(L / 3) + W.n, R: (55 + L * 6) * W.area, ticks: 7 };
    case 'luoshi': return { n: 1 + Math.floor(L / 4) + W.n, R: (45 + L * 4) * W.area };
    case 'dilie': return { n: 1, R: (110 + L * 12) * W.area };
  }
  return { n: 1 };
}

// 功法（宗門、劫殺）與升級的數值
export const gongfaAmt = (stat, g) => (stat === 'lq' ? 0.08 + 0.03 * g : 0.06 + 0.02 * g);
export const levelAmt = (kind, realm) => (kind === 'lg' ? 0.07 + 0.01 * realm : 0.1 + 0.02 * realm);

// 修為曲線
export const expNext = l => Math.floor(8 + l * 6 + l * l * 0.5);

// 妖獸血量 / 傷害
export const enemyHp = (base, gm) => base * (1.4 + gm * 0.04) * (1 + gm * 0.25 + gm * gm * 0.02);
export const bossHp = (base, gm) => base * (1 + gm * 0.3 + gm * gm * 0.025);
export const enemyDmg = (base, gm) => base * (1 + gm * 0.08);

// 靈石價格
export const craftCost = (g, gm) => Math.round(40 * g * (1 + gm * 0.1));
export const reforgePrice = (g, gm) => Math.round(40 * g * (1 + gm * 0.15));
export const shopPrice = (kind, g, gm) => Math.round((kind === 'gf' ? 25 * g : 50 + 25 * g) * (1 + gm * 0.2));
// 宗門商品品階：主角境界為底，宗門每存活 45 秒 +1（最多 +3）
export const shopGrade = (playerGrade, age) => Math.max(1, Math.min(9, playerGrade + Math.min(3, Math.floor(age / 45))));
