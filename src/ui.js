// DOM 介面：狀態面板、抉擇、技能列、小地圖、訊息
import * as F from './formula.js';
import { ELEMS, ELEM_CSS, REALMS, GRADE_CN, SKILLS, PARTS, COUNTERED_BY } from './data.js';

const $ = id => document.getElementById(id);
const ec = (e, txt = e) => `<span style="color:${ELEM_CSS[e]}">${txt}</span>`;
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const bar = (v, max, color, label) =>
  `<div class="bar"><div style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${color}"></div><span>${label} ${Math.ceil(v)}/${Math.ceil(max)}</span></div>`;

export class Hud {
  constructor() {
    $('over').classList.add('hidden');
    $('choice').classList.add('hidden');
    $('shop').classList.add('hidden');
    $('toasts').innerHTML = '';
    $('state').textContent = '';
    $('banner').classList.remove('show');
    this.choiceKey = null;
    this.shopKey = null;
  }

  toast(msg, color = '#ffd98a') {
    const d = document.createElement('div');
    d.className = 'toast';
    d.style.borderLeftColor = color;
    d.innerHTML = msg;
    const box = $('toasts');
    box.prepend(d);
    while (box.children.length > 6) box.lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }

  banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  update(g) {
    const P = g.P;
    $('h-life').textContent = `壽元 ${fmtTime(g.duration - g.t)}`;
    $('h-realm').innerHTML = `${REALMS[P.realm]} ${GRADE_CN[((P.level - 1) % 10) + 1] || '十'}層　Lv${P.level}`;
    $('h-exp').style.width = `${Math.min(1, P.stones / g.expNext()) * 100}%`;
    $('h-exptxt').textContent = `靈石 ${Math.floor(P.stones)} / 升級需 ${g.expNext()}`;
    let can = 0, left = P.stones, lv = P.level;
    while (left >= F.expNext(lv) && can < 20) { left -= F.expNext(lv); lv++; can++; }
    $('h-stones').innerHTML = can ? `<b style="color:#ffd98a">可升 ${can} 級・回篝火</b>` : '回篝火升級';
    $('h-phase').innerHTML = `${g.nightInfo}　妖潮 ${ec(g.phaseElem)} 宜用 ${ec(COUNTERED_BY[g.phaseElem])}`;
    $('h-kills').textContent = `斬妖 ${P.kills}`;
    $('slowfx').classList.toggle('on', P.slowActive);
    $('hud').classList.toggle('choosing', !!g.choice);
    $('hud').classList.toggle('shopping', !!g.curSect);

    let L = '';
    L += bar(P.hp, P.maxHp, '#c0392b', '肉身');
    L += bar(P.shield, P.maxShield, '#3aa7c7', '護體');
    L += bar(P.ss, g.ssMax(), '#8e6cf0', '神識');
    L += `<h4>屬性</h4>`;
    L += `<div class="row"><span>靈根</span><span>${P.lgType}</span></div>`;
    L += `<div class="row"><span>遁速</span><span>${Math.round(P.speed)}</span></div>`;
    L += `<div class="row"><span>神識</span><span>${P.S}</span></div>`;
    L += `<div class="row"><span>拾取 / 選擇時間</span><span>${Math.round(g.pickupR())} / ${g.choiceTime().toFixed(1)}s</span></div>`;
    L += `<h4>五行</h4><div class="row"><span class="el"></span>${ELEMS.map(e => `<span class="el">${ec(e)}</span>`).join('')}</div>`;
    L += `<div class="row"><span class="el small">靈根</span>${ELEMS.map(e => `<span class="el">${P.lg[e].toFixed(2)}</span>`).join('')}</div>`;
    L += `<div class="row"><span class="el small">靈氣</span>${ELEMS.map(e => `<span class="el">+${Math.round(P.lq[e] * 100)}%</span>`).join('')}</div>`;
    L += `<h4>法寶（強化同屬神通）</h4>`;
    const ws = ELEMS.filter(e => P.weapons[e]);
    L += ws.length ? ws.map(e => {
      const b = g.wb(e);
      return `<div>${ec(e, `${GRADE_CN[P.weapons[e]]}品${e}寶`)} <span class="small">數量+${b.n} 穿透+${b.pierce} 範圍+${Math.round((b.area - 1) * 100)}%</span></div>`;
    }).join('') : `<span class="small">無（骨皮牙同階，在篝火合成）</span>`;
    L += `<h4>煉器材料</h4>`;
    const mats = ELEMS.map(e => {
      const parts = PARTS.map(p => P.mats[`${e}-${p}`] ? `${p}${P.mats[`${e}-${p}`]}` : `<span class="small">${p}-</span>`).join(' ');
      return `<div>${ec(e)} ${parts}${P.weapons[e] ? ` <span class="small">寶${P.weapons[e]}</span>` : ''}</div>`;
    }).join('');
    L += mats;
    $('left').innerHTML = L;

    let R = `<h4>神通 (${P.skills.length}/4)</h4>`;
    R += P.skills.map(s => {
      const d = SKILLS[s.id];
      return `<div class="row"><span>${ec(d.elem, d.name)} <span class="small">${GRADE_CN[s.g || 1]}品</span></span><span>Lv${s.lvl}　${g.skillCd(s).toFixed(2)}s</span></div>`;
    }).join('');
    R += `<h4>功法</h4>`;
    R += P.gongfa.slice(-8).map(f => `<div class="row"><span>${ec(f.elem, f.name)}</span><span class="small">${f.stat === 'lq' ? '靈氣' : '靈根'}+${f.stat === 'lq' ? Math.round(f.amt * 100) + '%' : f.amt.toFixed(2)}</span></div>`).join('') || '<span class="small">無</span>';
    const allies = g.pbs.filter(p => p.state === 'ally' || p.state === 'friend');
    R += `<h4>隊友</h4>`;
    R += allies.map(a => `<div class="row"><span>${ec(a.elem, a.name)}</span><span>${Math.ceil(a.hp)}/${Math.ceil(a.maxHp)}</span></div>`).join('') || '<span class="small">無（F 與路人結伴）</span>';
    if (g.nemesis.length) R += `<h4>宿敵</h4>` + g.nemesis.map(n => `<div>${ec(n.elem, n.name)} <span class="small">★${n.power}</span></div>`).join('');
    $('right').innerHTML = R;
    this.drawSkillbar(g);
    this.drawMinimap(g);

    // 互動提示
    const near = g.nearPasserby;
    let pr = '';
    if (g.nearBonfire) {
      pr = `<b style="color:#ff9a3c">篝火</b>　[F] ${g.nearBonfire.lit ? '休息・回復・升級' : '點亮篝火（獲得機緣）'}`;
    } else if (g.nearPoi) {
      pr = `<b style="color:#${g.nearPoi.color.toString(16)}">${g.nearPoi.name}</b>　[F] ${g.nearPoi.kind === 'wash' ? '洗亂靈根' : '重練神通'}`;
    } else if (near) {
      const tag = { fighting: '與妖獸纏鬥中', hostile: '敵意', ally: '隊友', fleeing: '逃跑中', feud: '火拼中', friend: '友軍' }[near.state];
      pr = `${ec(near.elem, near.name)}（${near.elem}・${tag}）`;
      if (near.state === 'fighting') pr += '　[F] 結伴　（用神通打他＝出手）';
      else if (near.state === 'feud') pr += `　[F] 助陣 ${near.battle.names[near.side]}　（打他＝助陣 ${near.battle.names[1 - near.side]}）`;
    }
    $('prompt').innerHTML = pr;

    let st = '';
    if (g.duel) st = `⚔ 異空間單挑 ${g.duel.name}　${Math.ceil(g.duel.boss.hp / g.duel.boss.maxHp * 100)}%　剩 ${Math.ceil(g.duel.t)} 秒`;
    else if (g.outside) st = '⚡ 你在天雷結界外！快回到結界內 ⚡';
    else if (g.trib) st = `⚡ 天劫降臨！撐過 ${g.trib.t.toFixed(1)} 秒 ⚡`;
    $('state').textContent = st;

    this.updateChoice(g);
    this.updateShop(g);
  }

  updateChoice(g) {
    const box = $('choice');
    const c = g.choice;
    if (!c) { box.classList.add('hidden'); this.choiceKey = null; return; }
    box.classList.remove('hidden');
    box.classList.toggle('withshop', !!g.curSect);
    if (this.choiceKey !== c.id) {
      this.choiceKey = c.id;
      box.innerHTML = `<div class="title"><span>${c.title}${!c.event && g.pendingChoices ? `（尚有 ${g.pendingChoices} 次）` : ''}</span><span id="c-t"></span></div>
        <div class="timer"><div id="c-bar"></div></div>
        <div class="opts">${c.opts.map((o, i) => `<div class="opt" data-i="${i}"><div class="n"><span class="k">${i + 1}</span>${g.optLabel(o)}</div><div class="d">${g.optDesc(o)}</div></div>`).join('')}</div>`;
      box.querySelectorAll('.opt').forEach(el => el.onclick = () => g.pickChoice(+el.dataset.i));
    }
    $('c-t').textContent = `${c.t.toFixed(1)}s`;
    $('c-bar').style.width = `${c.t / c.max * 100}%`;
  }

  updateShop(g) {
    const box = $('shop');
    const s = g.curSect;
    if (!s) { box.classList.add('hidden'); this.shopKey = null; return; }
    box.classList.remove('hidden');
    const key = s.id + ':' + s.shopVer + ':' + Math.floor(g.P.stones / 10);
    if (this.shopKey === key) return;
    this.shopKey = key;
    box.innerHTML = `<div class="title"><span>${ec(s.elem, s.name)} 藏經閣</span><span class="small">存續 ${Math.floor(s.age)}s</span></div>
      ${s.shop.map((it, i) => {
        if (!it) return `<div class="shopitem sold"><span>${'ZXC'[i]}　已售出</span></div>`;
        const poor = g.P.stones < it.price;
        return `<div class="shopitem ${poor ? 'poor' : ''}" data-i="${i}"><span><b style="color:#ffd98a">${'ZXC'[i]}</b> ${g.optLabel(it)}<div class="small">${g.optDesc(it)}</div></span><span class="price">${it.price}石</span></div>`;
      }).join('')}
      <div class="small">範圍內自動煉化靈石、自動煉器</div>`;
    box.querySelectorAll('.shopitem[data-i]').forEach(el => el.onclick = () => g.buyShop(+el.dataset.i));
  }

  drawSkillbar(g) {
    const keys = ['左鍵', '右鍵', 'Q', 'E'];
    $('skillbar').innerHTML = keys.map((k, i) => {
      const s = g.P.skills[i];
      if (!s) return `<div class="slot empty"><div class="key">${k}</div><div class="lv">空</div></div>`;
      const d = SKILLS[s.id], cd = g.skillCd(s), frac = Math.max(0, Math.min(1, s.t / cd));
      return `<div class="slot"><div class="key">${k}</div><div class="nm">${ec(d.elem, d.name)}</div><div class="lv">Lv${s.lvl}・${GRADE_CN[s.g || 1]}品・${cd.toFixed(1)}s</div><div class="cd" style="width:${frac * 100}%"></div></div>`;
    }).join('');
  }

  drawMinimap(g) {
    const cv = $('minimap'), c = cv.getContext('2d'), W = cv.width, H = cv.height, S = W / g.world;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#0e1118'; c.fillRect(0, 0, W, H);
    const Z = g.zone;
    if (Z) {
      c.fillStyle = 'rgba(20,6,42,.65)'; c.fillRect(0, 0, W, H);
      c.save(); c.beginPath(); c.arc(Z.cx * S, Z.cy * S, Z.R * S, 0, Math.PI * 2); c.clip(); c.fillStyle = '#121620'; c.fillRect(0, 0, W, H); c.restore();
      c.strokeStyle = '#9a6bff'; c.lineWidth = 1.5; c.beginPath(); c.arc(Z.cx * S, Z.cy * S, Z.R * S, 0, Math.PI * 2); c.stroke();
    }
    for (const cp of g.camps) {
      if (cp.cleared) continue;
      c.fillStyle = ['#a05050', '#c05050', '#e04848', '#ff3030'][cp.tier];
      c.fillRect(cp.x * S - 2, cp.y * S - 2, 4 + cp.tier, 4 + cp.tier);
    }
    for (const b of g.bonfires) { c.fillStyle = b.lit ? '#ffb030' : '#6a5a4a'; c.beginPath(); c.arc(b.x * S, b.y * S, 2.6, 0, Math.PI * 2); c.fill(); }
    for (const o of g.pois) { c.fillStyle = '#' + o.color.toString(16); c.fillRect(o.x * S - 2.5, o.y * S - 2.5, 5, 5); }
    for (const B of g.battles) { c.fillStyle = '#ffd98a'; c.font = '10px sans-serif'; c.fillText('⚔', B.x * S - 4, B.y * S + 4); }
    for (const e of g.enemies) if (e.boss) { c.fillStyle = '#ff2020'; c.beginPath(); c.arc(e.x * S, e.y * S, 4, 0, Math.PI * 2); c.fill(); }
    const P = g.P;
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(P.x * S, P.y * S, 3.2, 0, Math.PI * 2); c.fill();
    const v = g.cameras.main.worldView;
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.strokeRect(v.x * S, v.y * S, v.width * S, v.height * S);
  }

  gameOver(win, g) {
    const P = g.P;
    const box = $('over');
    box.classList.remove('hidden');
    const title = win ? '斬妖皇・飛昇' : g.endReason === 'time' ? '壽元已盡' : '身死道消';
    const sub = win ? `你在第三夜斬殺妖皇，破空飛昇。（用時 ${fmtTime(g.t)}）` : g.endReason === 'time' ? '三夜已過，妖皇未除，你壽終坐化。' : `存活 ${fmtTime(g.t)}`;
    box.innerHTML = `<h1>${title}</h1><div>${sub}</div>
      <div>境界 ${REALMS[P.realm]}・Lv${P.level}　斬妖 ${P.kills}　靈根 ${P.lgType}</div>
      <div class="small">按 Enter 再入輪迴</div>`;
  }
}
