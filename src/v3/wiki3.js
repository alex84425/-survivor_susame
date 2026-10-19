// 新版百科：資料直接讀 kits.js，數值永遠跟遊戲一致
import { ELEMS, ELEM_CSS, elemMult } from '../data.js';
import { CLASSES, ENEMIES, LEVEL } from './kits.js';
import { ATTR, ATTR_BASE, SOFT_CAP, GRADE, SKILLS, START_SKILL, GONGFA, gfDesc, forgeCost } from './arts.js';

const $ = id => document.getElementById(id);
const ec = (e, t = e) => `<span style="color:${ELEM_CSS[e]}">${t}</span>`;
const r1 = x => Math.round(x * 10) / 10;

$('tabs').onclick = ev => {
  const t = ev.target.dataset.t;
  if (!t) return;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  document.querySelectorAll('main section').forEach(s => s.classList.toggle('on', s.id === t));
};

// ---------- 職業 ----------
const basicTable = B => {
  if (B.steps) return `<table><tr><th>段</th><th class="num">傷害</th><th class="num">韌性削減</th><th class="num">距離</th><th class="num">前搖</th><th class="num">後搖</th></tr>${B.steps.map((s, i) =>
    `<tr><td>${i + 1}${s.heavy ? '（重擊）' : ''}</td><td class="num">${s.dmg}</td><td class="num">${s.poise}</td><td class="num">${s.range}</td><td class="num">${s.wind}s</td><td class="num">${s.rec}s</td></tr>`).join('')}</table>`;
  if (B.tiers) return `<table><tr><th>蓄力</th><th class="num">傷害</th><th class="num">爆炸範圍</th><th class="num">灼燒</th></tr>${B.tiers.map((t, i) =>
    `<tr><td>${['輕點', '蓄力 0.35 秒', '蓄滿 0.9 秒'][i]}</td><td class="num">${t.dmg}</td><td class="num">${t.R || '—'}</td><td class="num">${t.burn}</td></tr>`).join('')}</table>`;
  return `<p class="small muted">每 ${B.rate} 秒一發，傷害 ${B.dmg}，追蹤轉向 ${B.homing}，飛行約 ${B.life} 秒</p>`;
};
const chargedTxt = K => !K ? '' : `<p><b>蓄力重擊</b>（按住左鍵 0.35 秒放開）：${{ thrust: `向前穿刺 ${K.len}`, quake: `震地 ${K.R} 範圍`, vortex: `水龍捲 ${K.R} 範圍並把敵人拉近` }[K.kind]}，傷害 ${K.dmg}、韌性 ${K.poise}</p>`;
$('cls').innerHTML = `<h2>五個主修職業</h2><p class="muted">開局選擇。普攻與大招固定（依主修屬性補正），右鍵帶一門開局神通，其他神通從寶箱和夜王取得。</p>
<div class="cards">${ELEMS.map(e => {
  const C = CLASSES[e];
  return `<div class="card" style="border-top-color:${ELEM_CSS[e]}">
    <img src="assets/ai/char/${C.id}_m.webp" alt="">
    <h3>${ec(e, `${e}・${C.name}`)}</h3><div class="small" style="color:var(--gold)">${C.role}</div>
    <p class="small">肉身 ${C.hp}・遁速 ${C.speed}</p>
    <p><b>被動</b>：${C.passive}</p>
    <p><b>普攻・${C.basic.name}</b>：${C.basic.desc}</p>${basicTable(C.basic)}${chargedTxt(C.basic.charged)}
    <p><b>開局神通・${SKILLS[START_SKILL[e]].name}</b>：${SKILLS[START_SKILL[e]].desc}</p>
    <p><b>大招・${C.ult.name}</b>：${C.ult.desc}</p></div>`;
}).join('')}</div>
<h2>共通操作</h2>
<table>
<tr><td>空白</td><td>閃避：短暫無敵。敵人判定前 0.2 秒內閃開＝<b>完美閃避</b>：時間變慢 1 秒、下一擊暴擊（×1.5）、回 10 真元</td></tr>
<tr><td>F</td><td>敵人<b>破綻</b>（韌性打空、黃圈閃爍）時靠近處決；也用來點篝火、開寶箱</td></tr>
<tr><td>R</td><td>丹藥：回 40% 肉身，3 瓶，篝火補滿</td></tr>
<tr><td>Q</td><td>大招：打出傷害累積大招氣，滿 100% 可放</td></tr>
</table>`;

// ---------- 屬性 ----------
$('attr').innerHTML = `<h2>五行屬性</h2><p class="muted">升級時在篝火把 1 點加到五行之一，像魂系的力量、智力、信仰。屬性決定神通的傷害補正，也各有副作用（從 ${ATTR_BASE} 點以上起算）。</p>
<table><tr><th>五行</th><th>對應</th><th>每點副作用</th></tr>
${ELEMS.map(e => `<tr><td>${ec(e)}</td><td>${ATTR[e].stat}</td><td>${ATTR[e].side}</td></tr>`).join('')}</table>
<h3>補正等級</h3>
<span class="formula">神通傷害 = 基礎傷害 × (1 + Σ 補正係數 × 屬性點數 × 3%) × 強化 × 等級
屬性 ${SOFT_CAP} 點以後收益減半；需求不足時傷害 ×0.6</span>
<table><tr><th>等級</th>${Object.keys(GRADE).map(g => `<th class="num">${g}</th>`).join('')}</tr><tr><td>係數</td>${Object.values(GRADE).map(k => `<td class="num">${k}</td>`).join('')}</tr>
<tr><td>20 點時</td>${Object.values(GRADE).map(k => `<td class="num">+${Math.round(k * 60)}%</td>`).join('')}</tr></table>
<p class="small muted">開局：主修 16、主修所生的屬性 12、其餘 8（例：金修＝金 16、水 12）。普攻與大招依主修屬性補正。</p>`;

// ---------- 神通 ----------
const scTxt = S => Object.entries(S.sc).map(([e, g]) => ec(e, `${e}${g}`)).join(' ');
const chainTxt = S => S.chain ? `<div class="small">${S.chain.map((c, i) => `${i + 1}. ${c.name} ${c.dmg}`).join('　')}</div>` : '';
$('skill').innerHTML = `<h2>神通（${Object.keys(SKILLS).length} 門）</h2><p class="muted">神通像裝備：裝在右鍵和 E，背包可以帶更多、在篝火換。每門天生帶一個功法，另有銘刻槽。寶箱、夜王會掉。</p>
<div class="wrap"><table><tr><th>五行</th><th>神通</th><th>品</th><th>類型</th><th>補正</th><th>需求</th><th class="num">真元</th><th class="num">冷卻</th><th>天生功法</th><th>效果</th></tr>
${Object.values(SKILLS).map(S => `<tr><td>${ec(S.elem)}</td><td>${ec(S.elem, `<b>${S.name}</b>`)}</td><td>${S.q}</td><td>${S.type}</td><td>${scTxt(S)}</td><td>${Object.entries(S.req).map(([e, n]) => `${e}${n}`).join(' ')}</td><td class="num">${S.cost}</td><td class="num">${S.cd}s</td><td>${S.innate[0]}・${['一', '二', '三'][S.innate[1] - 1]}品</td><td>${S.desc}${S.dmg ? `（${S.dmg}）` : ''}${chainTxt(S)}</td></tr>`).join('')}
</table></div>
<h2>近戰連段</h2>
<table>
<tr><td>接段</td><td>前一段出手後 0.15～0.6 秒內再按同一鍵接下一段；第三段是終結技</td></tr>
<tr><td>真元</td><td>第一段扣全額，第二、三段各扣一半；整套打完或中斷才進冷卻</td></tr>
<tr><td>取消</td><td>閃避可以取消任何一段，但連段中斷</td></tr>
<tr><td>連擊數</td><td>所有命中 +1，2 秒沒命中或被打中歸零；10／20／30 連擊時大招氣累積 ×1.2／×1.4／×1.6</td></tr>
</table>
<h2>強化</h2>
<table><tr><th>強化</th><th>材料</th><th>效果</th></tr>
${[0, 1, 2, 3, 4].map(p => { const c = forgeCost('凡', p); return `<tr><td>凡品 +${p}→+${p + 1}</td><td>${c.mat}×${c.n}、靈石 ${c.runes}</td><td>傷害 +10%${p === 2 ? '；天生功法升一品' : ''}${p === 4 ? '；開第二個銘刻槽' : ''}</td></tr>`; }).join('')}
${[0, 1, 2].map(p => { const c = forgeCost('天', p); return `<tr><td>天品 +${p}→+${p + 1}</td><td>${c.mat}×${c.n}、靈石 ${c.runes}</td><td>傷害 +18%${p === 2 ? '；天生功法三品、開第二個銘刻槽' : ''}</td></tr>`; }).join('')}
</table>
<p class="small muted">材料：下品靈晶（等級 0～1 寶箱、妖獸 8%）、中品靈晶（等級 2 以上、精英必掉）、上品靈晶（等級 3 寶箱、夜王）、天外隕晶（夜王、等級 3 寶箱 30%）。</p>`;

// ---------- 功法 ----------
const cats = [...new Set(Object.values(GONGFA).map(G => G.cat))];
$('boon').innerHTML = `<h2>功法（${Object.keys(GONGFA).length} 條）</h2><p class="muted">參考黑夜君臨的遺物：有單純加成、附帶代價的複合詞條，和受傷、殘血才生效的條件詞條。「神通」類銘刻在神通上，只影響那門神通（拆下降一品）；「經脈」類裝在角色身上 3 格，全身生效。同名不疊加。減傷全部相乘，總減傷最多 60%。</p>
${cats.map(c => `<h3>${c}</h3><div class="wrap"><table><tr><th>功法</th><th>放在</th><th>一品</th><th>二品</th><th>三品</th></tr>
${Object.entries(GONGFA).filter(([, G]) => G.cat === c).map(([id]) => `<tr><td><b>${id}</b></td><td>${GONGFA[id].slot}</td>${[0, 1, 2].map(t => `<td>${gfDesc(id, t)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}`;

// ---------- 妖獸 ----------
const K = { arc: '扇形爪擊', line: '直線', circle: '圓形落點', ring: '擴散衝擊環', proj: '投射物', hop: '後跳', pool: '毒池', summon: '召喚' };
const BAND = { near: '近', mid: '中', far: '遠' };
const moveTxt = (id, m) => `<div class="move"><span class="band">${BAND[m.band]}</span>${m.steps.map(s => {
  let t = K[s.k];
  if (s.k === 'line' && s.dash) t = '衝刺';
  if (s.k === 'proj') t = `${s.n} 發${s.root ? '定身' : ''}投射物`;
  return `${t}${s.dmg ? ` ${s.dmg}` : ''}`;
}).join(' → ')}<span class="small muted">　前搖 ${m.steps[0].wind.join('～')} 秒・收招 ${m.rec} 秒${m.cd ? `・冷卻 ${m.cd} 秒` : ''}</span></div>`;
const enemyCard = ([k, T]) => `<div class="card" style="border-top-color:${ELEM_CSS[T.elem]}">
  <img src="assets/ai/mon/${k}_cool.webp" onerror="this.onerror=null;this.src='assets/img/px_${T.img}.png'" alt="">
  <h3>${ec(T.elem, T.name)}</h3>
  <div class="small muted">肉身 ${T.hp}・韌性 ${T.poise}・速度 ${T.speed}${T.exp ? `・靈石 ${T.exp}` : ''}${T.fast ? '・快速' : ''}${T.ranged ? '・遠程' : ''}</div>
  ${Object.entries(T.moves).map(([id, m]) => moveTxt(id, m)).join('')}
  ${T.phase2 ? `<div class="small" style="color:#ff9090;margin-top:6px">半血狂怒：出招加快 20%，新增</div>${Object.entries(T.phase2).map(([id, m]) => moveTxt(id, m)).join('')}` : ''}
</div>`;
const list = Object.entries(ENEMIES).filter(([k]) => k !== 'dummy');
$('enemy').innerHTML = `<h2>妖獸</h2><p class="muted">每種妖獸有近、中、遠三組招式，依距離切換，出手時間隨機。所有招式都有紅色預警（毒池是紫色）。出招後的收招空檔會亮黃圈＝可以打的窗口。妖巢等級 0～3：肉身每級 +50%、傷害每級 +25%、韌性每級 +30%。</p>
<h3>一般妖獸</h3><div class="cards">${list.filter(([, T]) => !T.boss).map(enemyCard).join('')}</div>
<h3>夜王與妖皇</h3><div class="cards">${list.filter(([, T]) => T.boss).map(enemyCard).join('')}</div>`;

// ---------- 規則與公式 ----------
$('rule').innerHTML = `<h2>一局的流程</h2>
<table>
<tr><th>時間</th><th>事件</th></tr>
<tr><td>0～5 分</td><td>第一夜白天：探索、點亮篝火拿功法、清妖巢開寶箱（神通、功法、強化材料）</td></tr>
<tr><td>5～8.3 分</td><td>天雷結界收縮（結界外每 0.5 秒扣 4% 肉身）</td></tr>
<tr><td>8.5 分</td><td>夜王・翼虎在結界中現身</td></tr>
<tr><td>9～18 分</td><td>第二夜：結界在別處重新展開，流程相同，夜王・蛟龍</td></tr>
<tr><td>18 分</td><td>決戰：結界縮到最小，妖皇・暴龍降臨；斬殺即勝利</td></tr>
</table>

<h2>傷害</h2>
<span class="formula">傷害 = 招式傷害 × 五行相剋 × 屬性補正 × 強化 × 等級 × (1 + 功法攻擊加成) × (破綻中 ×1.3) × (暴擊 ×1.5)</span>
<h3>五行相剋</h3>
<table><tr><th>攻擊＼受擊</th>${ELEMS.map(e => `<th>${ec(e)}</th>`).join('')}</tr>
${ELEMS.map(a => `<tr><td>${ec(a)}</td>${ELEMS.map(d => { const m = elemMult(a, d); return `<td class="num" style="color:${m > 1 ? '#7ed67e' : m < 1 ? '#e07070' : 'inherit'}">×${m}</td>`; }).join('')}</tr>`).join('')}</table>
<p class="small muted">普攻、大招＝主修屬性；神通＝神通自己的屬性。功法「相剋」可以提高剋制倍率。</p>

<h2>升級（在篝火用靈石）</h2>
<span class="formula">每升一級：肉身上限 +${Math.round(LEVEL.hp * 100)}%、全傷害 +${Math.round(LEVEL.dmg * 100)}%、屬性 +1（自選），最高 ${LEVEL.max} 級</span>
<div class="wrap"><table><tr><th>等級</th>${[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 19].map(l => `<th class="num">${l}→${l + 1}</th>`).join('')}</tr>
<tr><td>所需靈石</td>${[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 19].map(l => `<td class="num">${LEVEL.cost(l)}</td>`).join('')}</tr></table></div>
<p class="small muted">靈石：擊殺時直接獲得（不用撿），妖巢等級越高越多；寶箱也可以選靈石。</p>

<h2>韌性與處決</h2>
<span class="formula">每次命中扣韌性；韌性歸零 → 破綻 2.6 秒（妖王 3.2 秒），受傷 ×1.3
處決傷害：一般妖獸 max(45% 肉身, 160)，夜王 12% 肉身；處決回 5% 肉身、15% 大招氣</span>`;
