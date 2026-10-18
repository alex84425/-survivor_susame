// 新版百科：資料直接讀 kits.js，數值永遠跟遊戲一致
import { ELEMS, ELEM_CSS, elemMult } from '../data.js';
import { CLASSES, ENEMIES, BOONS, LEVEL } from './kits.js';

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
$('cls').innerHTML = `<h2>五個主修職業</h2><p class="muted">開局選擇。普攻與大招固定，右鍵是本命戰技（同屬性 +25%），E 格戰技從寶箱取得。</p>
<div class="cards">${ELEMS.map(e => {
  const C = CLASSES[e];
  return `<div class="card" style="border-top-color:${ELEM_CSS[e]}">
    <img src="assets/img/px_${C.img}.png" alt="">
    <h3>${ec(e, `${e}・${C.name}`)}</h3><div class="small" style="color:var(--gold)">${C.role}</div>
    <p class="small">肉身 ${C.hp}・遁速 ${C.speed}</p>
    <p><b>被動</b>：${C.passive}</p>
    <p><b>普攻・${C.basic.name}</b>：${C.basic.desc}</p>${basicTable(C.basic)}${chargedTxt(C.basic.charged)}
    <p><b>戰技・${C.skill.name}</b>（${C.skill.cost} 真元，冷卻 ${C.skill.cd} 秒）：${C.skill.desc}</p>
    <p><b>大招・${C.ult.name}</b>：${C.ult.desc}</p></div>`;
}).join('')}</div>
<h2>共通操作</h2>
<table>
<tr><td>空白</td><td>閃避：短暫無敵。敵人判定前 0.2 秒內閃開＝<b>完美閃避</b>：時間變慢 1 秒、下一擊暴擊（×1.5）、回 10 真元</td></tr>
<tr><td>F</td><td>敵人<b>破綻</b>（韌性打空、黃圈閃爍）時靠近處決；也用來點篝火、開寶箱</td></tr>
<tr><td>R</td><td>丹藥：回 40% 肉身，3 瓶，篝火補滿</td></tr>
<tr><td>Q</td><td>大招：打出傷害累積大招氣，滿 100% 可放</td></tr>
</table>`;

// ---------- 戰技 ----------
$('skill').innerHTML = `<h2>戰技（神通）</h2><p class="muted">每個職業的右鍵戰技，也可以從寶箱拿來放在 E 格（其他屬性）。E 格重複拿到同一招會強化：每級傷害 +25%。本命（右鍵）戰技傷害 +25%。</p>
<div class="wrap"><table><tr><th>屬性</th><th>戰技</th><th class="num">真元</th><th class="num">冷卻</th><th class="num">傷害</th><th>效果</th></tr>
${ELEMS.map(e => { const S = CLASSES[e].skill; return `<tr><td>${ec(e)}</td><td>${ec(e, S.name)}</td><td class="num">${S.cost}</td><td class="num">${S.cd}s</td><td class="num">${S.dmg || '—'}</td><td>${S.desc}</td></tr>`; }).join('')}
</table></div>
<p class="small muted">實測 DPS：開局篝火旁有兩支木樁，靠近會顯示即時 DPS。</p>`;

// ---------- 心法 ----------
const singles = Object.entries(BOONS).filter(([, b]) => !b.duo);
const duos = Object.entries(BOONS).filter(([, b]) => b.duo);
$('boon').innerHTML = `<h2>心法（祝福）</h2><p class="muted">第一次點亮篝火、擊敗夜王時，五行祖師會給三選一。遊戲不會暫停，可以按 1／2／3 或點選。</p>
<div class="wrap"><table><tr><th>屬性</th><th>心法</th><th>效果</th></tr>
${singles.map(([, b]) => `<tr><td>${ec(b.elem)}</td><td>${ec(b.elem, b.name)}</td><td>${b.desc}</td></tr>`).join('')}</table></div>
<h2>相生心法（融合）</h2><p class="muted">同時擁有兩個「相生」屬性的心法時，之後的三選一有機會出現相生心法（金生水、水生木、木生火、火生土、土生金）。</p>
<div class="wrap"><table><tr><th>需要</th><th>相生心法</th><th>效果</th></tr>
${duos.map(([, b]) => `<tr><td>${ec(b.duo[0])} 心法 ＋ ${ec(b.duo[1])} 心法</td><td><b>${b.name}</b></td><td>${b.desc}</td></tr>`).join('')}</table></div>`;

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
  <img src="assets/img/px_${T.img}.png" alt="">
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
<tr><td>0～5 分</td><td>第一夜白天：探索、點亮篝火拿心法、清妖巢開寶箱</td></tr>
<tr><td>5～8.3 分</td><td>天雷結界收縮（結界外每 0.5 秒扣 4% 肉身）</td></tr>
<tr><td>8.5 分</td><td>夜王・翼虎在結界中現身</td></tr>
<tr><td>9～18 分</td><td>第二夜：結界在別處重新展開，流程相同，夜王・蛟龍</td></tr>
<tr><td>18 分</td><td>決戰：結界縮到最小，妖皇・暴龍降臨；斬殺即勝利</td></tr>
</table>

<h2>傷害</h2>
<span class="formula">傷害 = 招式傷害 × 五行相剋 × 等級加成 × 心法加成 × (破綻中 ×1.3) × (暴擊 ×1.5)
本命戰技 ×1.25；E 格戰技每強化一級 +25%</span>
<h3>五行相剋</h3>
<table><tr><th>攻擊＼受擊</th>${ELEMS.map(e => `<th>${ec(e)}</th>`).join('')}</tr>
${ELEMS.map(a => `<tr><td>${ec(a)}</td>${ELEMS.map(d => { const m = elemMult(a, d); return `<td class="num" style="color:${m > 1 ? '#7ed67e' : m < 1 ? '#e07070' : 'inherit'}">×${m}</td>`; }).join('')}</tr>`).join('')}</table>
<p class="small muted">玩家的攻擊屬性＝主修屬性。</p>

<h2>升級（在篝火用靈石）</h2>
<span class="formula">每升一級：肉身上限 +${LEVEL.hp * 100}%、全傷害 +${LEVEL.dmg * 100}%，最高 ${LEVEL.max} 級</span>
<div class="wrap"><table><tr><th>等級</th>${[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 19].map(l => `<th class="num">${l}→${l + 1}</th>`).join('')}</tr>
<tr><td>所需靈石</td>${[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 19].map(l => `<td class="num">${LEVEL.cost(l)}</td>`).join('')}</tr></table></div>
<p class="small muted">靈石：擊殺時直接獲得（不用撿），妖巢等級越高越多；寶箱也可以選靈石。</p>

<h2>韌性與處決</h2>
<span class="formula">每次命中扣韌性；韌性歸零 → 破綻 2.6 秒（妖王 3.2 秒），受傷 ×1.3
處決傷害：一般妖獸 max(45% 肉身, 160)，夜王 12% 肉身；處決回 5% 肉身、15% 大招氣</span>`;
