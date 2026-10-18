// 百科：神通 / 功法 / 合成與公式 / 妖獸 / 數值平衡
import { ELEMS, ELEM_CSS, elemMult, REALMS, GRADE_CN, SKILLS, SKILL_IDS, ENEMY_TYPES, MAX_SKILL_LVL } from './data.js';
import * as F from './formula.js';

const $ = id => document.getElementById(id);
const ec = (e, t = e) => `<span style="color:${ELEM_CSS[e]}">${t}</span>`;
const f0 = x => Math.round(x).toLocaleString();
const f1 = x => (Math.round(x * 10) / 10).toLocaleString();
const f2 = x => x.toFixed(2);

// ---------- 分頁 ----------
$('tabs').onclick = e => {
  const t = e.target.dataset.t;
  if (!t) return;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  document.querySelectorAll('main section').forEach(s => s.classList.toggle('on', s.id === t));
  if (t === 'balance') drawBalance();
};

// 單體目標每次施放能吃到的次數（估算用）
function singleHits(id, sh) {
  switch (id) {
    case 'wanjian': case 'wanmu': case 'hanchao': case 'dilie': return 1;
    case 'xuanbing': return Math.ceil(sh.n / 2);
    case 'fentian': return sh.n * sh.ticks;
    default: return sh.n;
  }
}

// ================= 神通 =================
const S = { id: 'gengjin', L: 1, g: 1, w: 0, lg: 1, lq: 0, realm: 0 };

function slider(key, label, min, max, step, fmt = v => v) {
  return `<div class="ctl"><span>${label}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${S[key]}"><output>${fmt(S[key])}</output></div>`;
}

function renderSkillList() {
  $('slist').innerHTML = ELEMS.map(e => SKILL_IDS.filter(id => SKILLS[id].elem === e).map(id =>
    `<button data-id="${id}" class="${id === S.id ? 'on' : ''}">${ec(e, SKILLS[id].name)}<span class="k">${SKILLS[id].kind === 'single' ? '單體' : '範圍'}</span></button>`).join('')).join('');
}
$('slist').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  S.id = b.dataset.id;
  renderSkillList(); renderSkill(); applySandbox();
};

function renderSkill() {
  const d = SKILLS[S.id], W = F.weapon(S.w), sh = F.shape(S.id, S.L, W);
  const dmg = F.skillDmg(d.dmg, S.L, S.g, S.lq, S.realm), cd = F.skillCd(d.cd, S.L, S.lg);
  const hits = singleHits(S.id, sh);
  $('scard').innerHTML = `
    <h2 style="margin-top:0">${ec(d.elem, d.name)} <span class="small muted">${d.elem}・${d.kind === 'single' ? '單體' : '範圍'}</span></h2>
    <p class="muted">${d.desc}。基礎傷害 ${d.dmg}、基礎冷卻 ${d.cd}s。</p>
    ${slider('L', '等級', 1, MAX_SKILL_LVL, 1, v => 'Lv' + v)}
    ${slider('g', '品階', 1, 9, 1, v => GRADE_CN[v] + '品')}
    ${slider('w', '同屬法寶', 0, 9, 1, v => (v ? GRADE_CN[v] + '品' : '無'))}
    ${slider('lg', '靈根', 0.6, 2.5, 0.05, f2)}
    ${slider('lq', '靈氣', 0, 2, 0.05, v => '+' + Math.round(v * 100) + '%')}
    <div class="ctl"><span>境界</span><select data-k="realm">${REALMS.map((r, i) => `<option value="${i}" ${i === S.realm ? 'selected' : ''}>${r}（+${i * 30}%）</option>`).join('')}</select><span></span></div>
    <div class="stats">
      <span>單發傷害</span><b>${f1(dmg)}</b>
      <span>冷卻</span><b>${f2(cd)} 秒</b>
      <span>數量</span><b>${sh.n}${S.id === 'fentian' ? ` 片火海 × ${sh.ticks} 跳` : ''}</b>
      ${sh.pierce !== undefined ? `<span>穿透</span><b>${sh.pierce}</b>` : ''}
      ${sh.R ? `<span>範圍半徑</span><b>${f0(sh.R)}</b>` : ''}
      <span>單體理論 DPS</span><b>${f0(dmg * hits / cd)}</b>
    </div>
    <p class="small muted">法寶 ${S.w ? GRADE_CN[S.w] + '品' : '無'}：數量 +${W.n}、穿透 +${W.pierce}、範圍 +${Math.round((W.area - 1) * 100)}%</p>`;
  $('scard').querySelectorAll('input,select').forEach(el => el.oninput = () => {
    S[el.dataset.k] = +el.value;
    renderSkill(); applySandbox();
  });
  renderGradeTable();
}

function renderGradeTable() {
  const d = SKILLS[S.id];
  let h = '<table><tr><th>品階</th>' + [1, 2, 3, 4, 5, 6, 7, 8].map(l => `<th>Lv${l}</th>`).join('') + '</tr>';
  for (let g = 1; g <= 9; g++) {
    h += `<tr><td>${GRADE_CN[g]}品</td>` + [1, 2, 3, 4, 5, 6, 7, 8].map(l => {
      const v = F.skillDmg(d.dmg, l, g, S.lq, S.realm);
      const on = l === S.L && g === S.g;
      return `<td style="${on ? 'color:var(--gold);font-weight:bold' : ''}">${f1(v)}</td>`;
    }).join('') + '</tr>';
  }
  $('gtable').innerHTML = h + '</table>';
}

// ---------- 打木樁預覽（嵌入真正的遊戲沙盒） ----------
$('delem').innerHTML = ELEMS.map(e => `<option>${e}</option>`).join('');
const sbx = () => $('sbx').contentWindow && $('sbx').contentWindow.sandbox;
function applySandbox() {
  const box = sbx();
  const de = $('delem').value, m = elemMult(SKILLS[S.id].elem, de);
  $('dnote').textContent = m > 1 ? `${SKILLS[S.id].elem}剋${de}：傷害 ×1.6` : m < 1 ? `${de}剋${SKILLS[S.id].elem}：傷害 ×0.6` : '無相剋';
  if (!box) return;
  const e = SKILLS[S.id].elem;
  box.setLoadout({ skills: [{ id: S.id, lvl: S.L, g: S.g }], lg: { [e]: S.lg }, lq: { [e]: S.lq }, weapons: S.w ? { [e]: S.w } : {}, realm: S.realm });
  const n = +$('dcount').value;
  box.setDummies({ count: n, elem: de, spread: n > 1 ? 90 : 0 });
}
$('dcount').onchange = applySandbox;
$('delem').onchange = applySandbox;
window.addEventListener('message', e => { if (e.data === 'sandbox-ready') applySandbox(); });
setInterval(() => { const box = sbx(); if (box) $('dps').textContent = f0(box.dps(5)); }, 500);

renderSkillList(); renderSkill();

// ================= 功法 =================
$('gongfa').innerHTML = `
  <h2>功法</h2>
  <p>功法是被動加成，效果是某一屬性的<b>靈氣</b>（該屬性神通的傷害）或<b>靈根</b>（該屬性神通的攻擊頻率）。
  只能從<b>宗門藏經閣</b>購買或<b>劫殺</b>敵對修士取得。名稱隨機，例如 ${ELEMS.map(e => ec(e, ['《庚金訣》', '《長春經》', '《玄冰心法》', '《烈陽功》', '《厚土真解》'][ELEMS.indexOf(e)])).join('、')}。</p>
  <div class="wrap"><table>
    <tr><th>品階</th>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<th>${GRADE_CN[g]}品</th>`).join('')}</tr>
    <tr><td>靈氣功法（傷害）</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>+${Math.round(F.gongfaAmt('lq', g) * 100)}%</td>`).join('')}</tr>
    <tr><td>靈根功法（攻速）</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>+${f2(F.gongfaAmt('lg', g))}</td>`).join('')}</tr>
    <tr><td>宗門售價（第 0 分）</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>${F.shopPrice('gf', g, 0)}</td>`).join('')}</tr>
    <tr><td>宗門售價（第 20 分）</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>${F.shopPrice('gf', g, 20)}</td>`).join('')}</tr>
  </table></div>
  <h3>升級三選一的數值（依境界）</h3>
  <div class="wrap"><table>
    <tr><th>境界</th>${REALMS.map(r => `<th>${r}</th>`).join('')}</tr>
    <tr><td>某屬靈根</td>${REALMS.map((_, i) => `<td>+${f2(F.levelAmt('lg', i))}</td>`).join('')}</tr>
    <tr><td>某屬靈氣</td>${REALMS.map((_, i) => `<td>+${Math.round(F.levelAmt('lq', i) * 100)}%</td>`).join('')}</tr>
  </table></div>
  <p class="muted small">升級另有：肉身 +25、護體 +15、遁速 +7%、神識 +1。</p>
  <h3>商品品階怎麼決定</h3>
  <p>宗門商品品階 = 主角品階（境界 × 2 + 1，小境界過半再 +1）＋ 宗門每存活 45 秒 +1（最多 +3），上限九品。守住宗門越久，買到的越好。</p>`;

// ================= 合成與公式 =================
const gm3 = [0, 10, 20];
$('formula').innerHTML = `
  <h2>傷害與冷卻</h2>
  <code class="formula">單發傷害 = 基礎傷害 × ${F.DMG_BASE} × (1 + 0.3 × (等級 − 1)) × (1 + 0.12 × (品階 − 1)) × (1 + 靈氣) × (1 + 0.3 × 境界) × 五行相剋
冷卻（秒）= 基礎冷卻 × (1 − 0.05 × (等級 − 1)) ÷ 靈根</code>

  <h2>五行相剋</h2>
  <p>攻擊方剋受擊方 ×1.6，被剋 ×0.6，其餘 ×1。金剋木、木剋土、土剋水、水剋火、火剋金。</p>
  <table><tr><th>攻擊 ＼ 受擊</th>${ELEMS.map(e => `<th>${ec(e)}</th>`).join('')}</tr>
    ${ELEMS.map(a => `<tr><td>${ec(a)}</td>${ELEMS.map(d => { const m = elemMult(a, d); return `<td style="color:${m > 1 ? '#7ed67e' : m < 1 ? '#e07070' : 'inherit'}">×${m}</td>`; }).join('')}</tr>`).join('')}
  </table>

  <h2>煉器（法寶合成）</h2>
  <code class="formula">妖骨 + 妖皮 + 妖牙（同屬性、同品階）＋ 靈石 → 該屬性法寶（同品階）
地點：任一宗門範圍內自動合成；每屬性只保留品階最高的一件</code>
  <ul>
    <li>材料每屬性每部位只保留最高品，較低的自動賣掉（品階 × 5 靈石）。</li>
    <li>已有 N 品某屬法寶時，≤ N 品的該屬材料一律自動賣掉。</li>
    <li>法寶強化<b>同屬性</b>的所有神通。</li>
  </ul>
  <div class="wrap"><table>
    <tr><th>法寶品階</th>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<th>${GRADE_CN[g]}品</th>`).join('')}</tr>
    <tr><td>投射物數量</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>+${F.weapon(g).n}</td>`).join('')}</tr>
    <tr><td>穿透</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>+${F.weapon(g).pierce}</td>`).join('')}</tr>
    <tr><td>範圍</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>+${Math.round((F.weapon(g).area - 1) * 100)}%</td>`).join('')}</tr>
    ${gm3.map(m => `<tr><td>煉器費用（第 ${m} 分）</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>${F.craftCost(g, m)}</td>`).join('')}</tr>`).join('')}
  </table></div>
  <p class="muted small">材料品階約 = 1 + ⌊遊戲分鐘 ÷ 3.5⌋（30% 機率再 +1，妖王 +1）。</p>

  <h2>煉神爐（重練神通）</h2>
  <code class="formula">神通 A（某屬性、單體/範圍）＋ 靈石 → 同類型、不同屬性的神通 B
保留等級；品階 +2（上限九品）</code>
  <p>對照表（同類型互換）：</p>
  <table><tr><th>類型</th>${ELEMS.map(e => `<th>${ec(e)}</th>`).join('')}</tr>
    <tr><td>單體</td>${ELEMS.map(e => `<td>${ec(e, SKILLS[SKILL_IDS.find(i => SKILLS[i].elem === e && SKILLS[i].kind === 'single')].name)}</td>`).join('')}</tr>
    <tr><td>範圍</td>${ELEMS.map(e => `<td>${ec(e, SKILLS[SKILL_IDS.find(i => SKILLS[i].elem === e && SKILLS[i].kind === 'aoe')].name)}</td>`).join('')}</tr>
  </table>
  <div class="wrap"><table><tr><th>重練後品階</th>${[3, 4, 5, 6, 7, 8, 9].map(g => `<th>${GRADE_CN[g]}品</th>`).join('')}</tr>
    ${gm3.map(m => `<tr><td>費用（第 ${m} 分）</td>${[3, 4, 5, 6, 7, 8, 9].map(g => `<td>${F.reforgePrice(g, m)}</td>`).join('')}</tr>`).join('')}
  </table></div>

  <h2>洗靈池（洗亂靈根）</h2>
  <code class="formula">目前五個靈根數值重新洗牌分配到各屬性，再隨機一屬 +0.10
提供兩種結果 + 「不洗」，12 秒內決定，逾時視為不洗</code>
  <p class="muted">初始靈根差距刻意縮小（0.8～1.5），洗靈根不會讓人一下子廢掉，而是讓你換主修屬性。</p>

  <h2>宗門神通售價</h2>
  <div class="wrap"><table><tr><th>品階</th>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<th>${GRADE_CN[g]}品</th>`).join('')}</tr>
    ${gm3.map(m => `<tr><td>第 ${m} 分</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(g => `<td>${F.shopPrice('skill', g, m)}</td>`).join('')}</tr>`).join('')}
  </table></div>
  <p class="muted small">已學會的神通再買一次 = 升 1 級，品階取較高者。最多同時 6 門神通。</p>

  <h2>修為與境界</h2>
  <code class="formula">升到下一級所需修為 = 8 + 等級 × 6 + 等級² × 0.5
每 10 級渡天劫突破：肉身、護體 ×1.3；所有神通傷害 +30%（累加）</code>
  <div class="wrap"><table><tr><th>等級</th>${[1, 5, 10, 15, 20, 25, 30, 35, 40].map(l => `<th>${l}</th>`).join('')}</tr>
    <tr><td>升級所需</td>${[1, 5, 10, 15, 20, 25, 30, 35, 40].map(l => `<td>${F.expNext(l)}</td>`).join('')}</tr>
    <tr><td>境界</td>${[1, 5, 10, 15, 20, 25, 30, 35, 40].map(l => `<td>${REALMS[Math.min(4, Math.floor(l / 10))]}</td>`).join('')}</tr>
  </table></div>`;

// ================= 妖獸 =================
const MOVE_CN = { dash: '衝刺', throw: '投擲', blink: '瞬移狐火', web: '蛛網定身', pool: '毒池', slam: '震地', sting: '麻痺毒針' };
const SHOT_CN = { venom: '毒液', orb: '妖彈', spread: '三連毒液' };
const beastCard = (k, T) => {
  const hp = m => (T.boss ? F.bossHp(T.hp, m) : F.enemyHp(T.hp, m));
  const moves = T.boss ? (T.final ? ['衝鋒', '彈幕', '召喚', '震地', '毒池', '蛛網'] : ['衝鋒', '三波彈幕', '召喚', '震地紅圈', '半血狂暴']) : (T.moves || []).map(m => MOVE_CN[m]);
  if (T.ranged) moves.unshift('遠程' + SHOT_CN[T.shot]);
  return `<div class="beast">
    <img src="assets/img/px_${T.img}.png" onerror="this.src='assets/img/${T.img}.png'" alt="${T.name}">
    <h3>${T.name}</h3>
    <div class="small muted">速度 ${T.speed}・碰撞 ${T.dmg}・靈石 ${T.stone * 3}</div>
    ${moves.map(m => `<span class="tag">${m}</span>`).join('')}
    <table><tr><th>分鐘</th><th>0</th><th>10</th><th>20</th><th>30</th></tr>
      <tr><td>血量</td>${[0, 10, 20, 30].map(m => `<td>${f0(hp(m))}</td>`).join('')}</tr>
      <tr><td>碰撞傷害</td>${[0, 10, 20, 30].map(m => `<td>${f0(F.enemyDmg(T.dmg, m))}</td>`).join('')}</tr>
    </table></div>`;
};
const normal = Object.entries(ENEMY_TYPES).filter(([k, T]) => !T.boss && k !== 'dummy');
const bosses = Object.entries(ENEMY_TYPES).filter(([, T]) => T.boss);
$('beasts').innerHTML = `
  <h2>妖獸</h2><p class="muted">出手前都有預警：紅色長條是衝刺路線，紅圈是落點，綠圈是毒池。遠程妖獸同時數量有上限。</p>
  <div class="beasts">${normal.map(([k, T]) => beastCard(k, T)).join('')}</div>
  <h2>妖王</h2><p class="muted">每夜 4.5 分鐘遊蕩妖王（可能拖入異空間）、8.5 分鐘夜之妖王；第三夜 7 分鐘妖皇降臨。妖王血量不吃平方成長以外的倍率。</p>
  <div class="beasts">${bosses.map(([k, T]) => beastCard(k, T)).join('')}</div>`;

// ================= 數值平衡 =================
const B = { skills: [{ id: 'gengjin', L: 3, g: 3 }, { id: 'huoqiu', L: 3, g: 3 }, { id: 'luoshi', L: 3, g: 3 }], lg: 1.2, lq: 0.4, w: 3, auto: 1 };

function buildDps(gm) {
  // 境界：auto 時依時間推估（約每 6 分鐘一個境界）
  const realm = B.auto ? Math.min(4, Math.floor(gm / 6)) : B.realm || 0;
  return B.skills.reduce((sum, s) => {
    const d = SKILLS[s.id], sh = F.shape(s.id, s.L, F.weapon(B.w));
    return sum + F.skillDmg(d.dmg, s.L, s.g, B.lq, realm) * singleHits(s.id, sh) / F.skillCd(d.cd, s.L, B.lg);
  }, 0);
}

const SERIES = [
  { name: '小鬼', color: 'var(--s1)', hp: m => F.enemyHp(ENEMY_TYPES.imp.hp, m) },
  { name: '妖熊', color: 'var(--s2)', hp: m => F.enemyHp(ENEMY_TYPES.bear.hp, m) },
  { name: '妖王', color: 'var(--s3)', hp: m => F.bossHp(900, m) },
];

function drawBalance() {
  const el = $('balance');
  const mins = Array.from({ length: 31 }, (_, i) => i);
  const data = SERIES.map(s => mins.map(m => s.hp(m) / buildDps(m)));
  const W = 760, H = 300, L = 48, R = 16, T = 16, Bm = 30;
  const ymax = Math.max(...data.flat().filter(v => v < 1e6)) * 1.1;
  const X = m => L + m / 30 * (W - L - R), Y = v => T + (1 - Math.min(v, ymax) / ymax) * (H - T - Bm);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(k => ymax * k);
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="擊殺秒數隨時間變化">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2c2a22" stroke-width="1"/><text x="${L - 6}" y="${Y(v) + 4}" fill="#9c968a" font-size="11" text-anchor="end">${f1(v)}</text>`).join('')}
    ${[0, 5, 10, 15, 20, 25, 30].map(m => `<text x="${X(m)}" y="${H - 10}" fill="#9c968a" font-size="11" text-anchor="middle">${m}分</text>`).join('')}
    ${[10, 20].map(m => `<line x1="${X(m)}" x2="${X(m)}" y1="${T}" y2="${H - Bm}" stroke="#4a3f70" stroke-dasharray="4 4"/>`).join('')}
    ${data.map((d, i) => `<path d="${d.map((v, m) => `${m ? 'L' : 'M'}${X(m)},${Y(v)}`).join('')}" fill="none" stroke="${SERIES[i].color}" stroke-width="2" stroke-linejoin="round"/>`).join('')}
    <line id="cross" x1="0" x2="0" y1="${T}" y2="${H - Bm}" stroke="#9c968a" stroke-width="1" visibility="hidden"/>
    <rect id="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - Bm}" fill="transparent"/>
  </svg>`;
  const opts = SKILL_IDS.map(id => `<option value="${id}">${SKILLS[id].name}</option>`).join('');
  el.innerHTML = `
    <h2>數值平衡：這套配置打一隻要幾秒？</h2>
    <p class="muted">用下面的配置估算對<b>單一目標</b>的理論 DPS（不含相剋、假設全命中），算出各時間點擊殺所需秒數。虛線是夜晚交界。境界依時間自動推估（每 6 分鐘一個境界）。</p>
    <div class="card">
      <div class="build" id="bskills">${B.skills.map((s, i) => `<div class="row">
        <select data-i="${i}" data-f="id">${opts.replace(`value="${s.id}"`, `value="${s.id}" selected`)}</select>
        Lv <input type="number" min="1" max="8" value="${s.L}" data-i="${i}" data-f="L" style="width:46px">
        品 <input type="number" min="1" max="9" value="${s.g}" data-i="${i}" data-f="g" style="width:46px">
        <button data-del="${i}">✕</button></div>`).join('')}</div>
      <div class="row">
        <button id="badd">＋ 神通</button>
        <label>靈根 <input type="number" step="0.05" value="${B.lg}" id="blg" style="width:60px"></label>
        <label>靈氣 <input type="number" step="0.05" value="${B.lq}" id="blq" style="width:60px"></label>
        <label>法寶品階 <input type="number" min="0" max="9" value="${B.w}" id="bw" style="width:46px"></label>
      </div>
    </div>
    <div class="legend">${SERIES.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>
    <div class="chart">${svg}<div class="tip" id="tip"></div></div>
    <h3>表格</h3>
    <div class="wrap"><table><tr><th>分鐘</th>${[0, 5, 10, 15, 20, 25, 30].map(m => `<th>${m}</th>`).join('')}</tr>
      <tr><td>配置單體 DPS</td>${[0, 5, 10, 15, 20, 25, 30].map(m => `<td>${f0(buildDps(m))}</td>`).join('')}</tr>
      ${SERIES.map((s, i) => `<tr><td>${s.name}血量</td>${[0, 5, 10, 15, 20, 25, 30].map(m => `<td>${f0(s.hp(m))}</td>`).join('')}</tr><tr><td>${s.name}擊殺秒數</td>${[0, 5, 10, 15, 20, 25, 30].map(m => `<td>${f1(data[i][m])}</td>`).join('')}</tr>`).join('')}
      <tr><td>妖皇血量（27 分）</td><td colspan="7">${f0(F.bossHp(ENEMY_TYPES.emperor.hp, 27))}，此配置約 ${f0(F.bossHp(ENEMY_TYPES.emperor.hp, 27) / buildDps(27))} 秒</td></tr>
    </table></div>
    <p class="muted small">參考：自動模擬（tools/sim.js）中，第三夜機器人約有 6 門神通、平均 Lv3、四到七品。</p>`;
  // 互動
  el.querySelectorAll('#bskills select, #bskills input').forEach(inp => inp.onchange = () => {
    const s = B.skills[+inp.dataset.i];
    s[inp.dataset.f] = inp.dataset.f === 'id' ? inp.value : +inp.value;
    drawBalance();
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { B.skills.splice(+b.dataset.del, 1); drawBalance(); });
  $('badd').onclick = () => { if (B.skills.length < 6) B.skills.push({ id: 'hanchao', L: 1, g: 1 }); drawBalance(); };
  $('blg').onchange = e => { B.lg = +e.target.value; drawBalance(); };
  $('blq').onchange = e => { B.lq = +e.target.value; drawBalance(); };
  $('bw').onchange = e => { B.w = +e.target.value; drawBalance(); };
  const hit = el.querySelector('#hit'), cross = el.querySelector('#cross'), tip = $('tip'), svgEl = el.querySelector('svg');
  hit.onmousemove = ev => {
    const pt = svgEl.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svgEl.getScreenCTM().inverse());
    const m = Math.max(0, Math.min(30, Math.round((p.x - L) / (W - L - R) * 30)));
    cross.setAttribute('x1', X(m)); cross.setAttribute('x2', X(m)); cross.setAttribute('visibility', 'visible');
    tip.style.display = 'block';
    const box = el.querySelector('.chart').getBoundingClientRect();
    tip.style.left = (ev.clientX - box.left + 14) + 'px'; tip.style.top = (ev.clientY - box.top - 10) + 'px';
    tip.innerHTML = `<b>第 ${m} 分</b>（DPS ${f0(buildDps(m))}）<br>` + SERIES.map((s, i) => `<i style="display:inline-block;width:10px;height:3px;background:${s.color};margin-right:6px;vertical-align:middle"></i>${s.name} ${f1(data[i][m])} 秒`).join('<br>');
  };
  hit.onmouseleave = () => { cross.setAttribute('visibility', 'hidden'); tip.style.display = 'none'; };
}
