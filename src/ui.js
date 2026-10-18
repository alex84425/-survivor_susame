// DOM 介面：狀態面板、升級選擇、宗門商店、訊息
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
    $('h-exp').style.width = `${P.exp / g.expNext() * 100}%`;
    $('h-exptxt').textContent = `修為 ${Math.floor(P.exp)} / ${g.expNext()}`;
    $('h-stones').textContent = `靈石 ${Math.floor(P.stones)}` + (g.craftReserve ? `（預留煉器 ${g.craftReserve}）` : '');
    $('h-phase').innerHTML = `妖潮 ${ec(g.phaseElem)}　宜用 ${ec(COUNTERED_BY[g.phaseElem])}`;
    $('h-kills').textContent = `斬妖 ${P.kills}`;
    $('slowfx').classList.toggle('on', P.slowActive);
    $('hud').classList.toggle('choosing', !!g.choice);
    $('hud').classList.toggle('shopping', !!g.curSect);

    const w = P.weapon;
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
    L += `<h4>法寶</h4>`;
    L += w ? `${ec(w.elem, `${GRADE_CN[w.grade]}品${w.elem}屬飛劍`)}<div class="small">傷害 +${w.grade * 6}%（同屬再 +${w.grade * 6}%）掉寶 +${w.grade * 4}%</div>` : `<span class="small">無（在宗門以骨皮牙同階合成）</span>`;
    L += `<h4>煉器材料</h4>`;
    const mats = ELEMS.map(e => {
      const parts = PARTS.map(p => P.mats[`${e}-${p}`] ? `${p}${P.mats[`${e}-${p}`]}` : `<span class="small">${p}-</span>`).join(' ');
      return `<div>${ec(e)} ${parts}${P.weapons[e] ? ` <span class="small">寶${P.weapons[e]}</span>` : ''}</div>`;
    }).join('');
    L += mats;
    $('left').innerHTML = L;

    let R = `<h4>神通 (${P.skills.length}/6)</h4>`;
    R += P.skills.map(s => {
      const d = SKILLS[s.id];
      return `<div class="row"><span>${ec(d.elem, d.name)}</span><span>Lv${s.lvl}　${g.skillCd(s).toFixed(2)}s</span></div>`;
    }).join('');
    R += `<h4>功法</h4>`;
    R += P.gongfa.slice(-8).map(f => `<div class="row"><span>${ec(f.elem, f.name)}</span><span class="small">${f.stat === 'lq' ? '靈氣' : '靈根'}+${f.stat === 'lq' ? Math.round(f.amt * 100) + '%' : f.amt.toFixed(2)}</span></div>`).join('') || '<span class="small">無</span>';
    const allies = g.pbs.filter(p => p.state === 'ally');
    R += `<h4>隊友</h4>`;
    R += allies.map(a => `<div class="row"><span>${ec(a.elem, a.name)}</span><span>${Math.ceil(a.hp)}/${Math.ceil(a.maxHp)}</span></div>`).join('') || '<span class="small">無（E 與路人結伴）</span>';
    if (g.nemesis.length) R += `<h4>宿敵</h4>` + g.nemesis.map(n => `<div>${ec(n.elem, n.name)} <span class="small">★${n.power}</span></div>`).join('');
    $('right').innerHTML = R;

    // 互動提示
    const near = g.nearPasserby;
    let pr = '';
    if (near) {
      const tag = { fighting: '與妖獸纏鬥中', hostile: '敵意', ally: '隊友', fleeing: '逃跑中' }[near.state];
      pr = `${ec(near.elem, near.name)}（${near.elem}・${tag}）`;
      if (near.state === 'fighting') pr += '　[E] 結伴　[F] 攻擊';
      else if (near.state === 'ally') pr += '　[F] 背叛攻擊';
    }
    $('prompt').innerHTML = pr;

    let st = '';
    if (g.duel) st = `⚔ 異空間單挑 ${g.duel.name}　${Math.ceil(g.duel.boss.hp / g.duel.boss.maxHp * 100)}%　剩 ${Math.ceil(g.duel.t)} 秒`;
    else if (g.trib) st = `⚡ 天劫降臨！撐過 ${g.trib.t.toFixed(1)} 秒 ⚡`;
    else if (P.meditating) st = P.stones > 0 ? '打坐煉化靈石中…' : '打坐中（沒有靈石）';
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
      box.innerHTML = `<div class="title"><span>突破小境界・擇一機緣${g.pendingChoices ? `（尚有 ${g.pendingChoices} 次）` : ''}</span><span id="c-t"></span></div>
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

  gameOver(win, g) {
    const P = g.P;
    const box = $('over');
    box.classList.remove('hidden');
    const title = win ? (P.realm >= 4 ? '飛昇成仙' : '壽元已盡') : '身死道消';
    const sub = win ? (P.realm >= 4 ? '你在妖獸大戰中修至化神，破空飛昇。' : `你撐過了大戰，但只修至${REALMS[P.realm]}，壽終坐化。`) : `存活 ${fmtTime(g.t)}`;
    box.innerHTML = `<h1>${title}</h1><div>${sub}</div>
      <div>境界 ${REALMS[P.realm]}・Lv${P.level}　斬妖 ${P.kills}　靈根 ${P.lgType}</div>
      <div class="small">按 Enter 再入輪迴</div>`;
  }
}
