// 修仙倖存者 — 主場景
import {
  ELEMS, ELEM_CSS, ELEM_DARK, ELEM_HEX, OVERCOMES, elemMult, REALMS, GRADE_CN, PARTS,
  SKILLS, SKILL_IDS, MAX_SKILLS, MAX_SKILL_LVL, ENEMY_TYPES, randName, randSectName, randGongfaName,
} from './data.js';
import { Hud } from './ui.js';

const WORLD = 4000;
const CELL = 80;
const SECT_R = 140;
const MAX_ENEMIES = 380;
const params = new URLSearchParams(location.search);
const DURATION = (parseFloat(params.get('min')) || 30) * 60;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- 貼圖 ----------
function glyph(scene, key, ch, size, fill, stroke, font, textColor = '#fff') {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, size, size);
  const c = t.getContext();
  c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  c.fillStyle = fill; c.fill(); c.lineWidth = 2; c.strokeStyle = stroke; c.stroke();
  if (ch) {
    c.fillStyle = textColor;
    c.font = `bold ${font}px "Microsoft JhengHei","PingFang TC",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, size / 2, size / 2 + 1);
  }
  t.refresh();
}

function blob(scene, key, w, h, color, glow = true) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  const c = t.getContext();
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, glow ? 'rgba(0,0,0,0)' : color);
  c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
  t.refresh();
}

function makeTextures(scene) {
  if (!scene.textures.exists('bgtile')) {
    const t = scene.textures.createCanvas('bgtile', 128, 128);
    const c = t.getContext();
    c.fillStyle = '#12151c'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#1a1e28'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 128, 128);
    c.fillStyle = '#1d2230';
    for (let i = 0; i < 6; i++) c.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    t.refresh();
  }
  glyph(scene, 'player', '修', 34, '#f4ecd8', '#ffd98a', 20, '#1b1b22');
  for (const e of ELEMS) {
    for (const [type, T] of Object.entries(ENEMY_TYPES)) {
      const size = T.r * 2 + 4;
      glyph(scene, `e_${type}_${e}`, T.ch, size, ELEM_DARK[e], ELEM_CSS[e], Math.round(T.r * 1.15), ELEM_CSS[e]);
    }
    blob(scene, `p_${e}`, 16, 16, ELEM_CSS[e]);
    blob(scene, `sw_${e}`, 26, 8, ELEM_CSS[e]);
    blob(scene, `fp_${e}`, 14, 14, ELEM_CSS[e]);
    glyph(scene, `pb_${e}`, '人', 30, '#e8e4d8', ELEM_CSS[e], 17, ELEM_DARK[e]);
    glyph(scene, `sect_${e}`, '宗', 60, ELEM_DARK[e], ELEM_CSS[e], 32, ELEM_CSS[e]);
    glyph(scene, `dan_${e}`, '丹', 18, '#5a1020', ELEM_CSS[e], 11, ELEM_CSS[e]);
    glyph(scene, `mat_${e}`, '材', 18, '#222', ELEM_CSS[e], 11, ELEM_CSS[e]);
  }
  blob(scene, 'foe', 14, 14, '#c040ff');
  if (!scene.textures.exists('stone')) {
    const t = scene.textures.createCanvas('stone', 10, 12);
    const c = t.getContext();
    c.fillStyle = '#7fffe0'; c.beginPath(); c.moveTo(5, 0); c.lineTo(10, 6); c.lineTo(5, 12); c.lineTo(0, 6); c.closePath(); c.fill();
    t.refresh();
  }
  glyph(scene, 'scroll', '卷', 22, '#5a4a1a', '#ffd98a', 13, '#ffd98a');
}

// ---------- 場景 ----------
class Main extends Phaser.Scene {
  constructor() { super('main'); }

  create() {
    makeTextures(this);
    this.duration = DURATION;
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);
    this.add.tileSprite(0, 0, WORLD, WORLD, 'bgtile').setOrigin(0).setDepth(-10);
    this.under = this.add.graphics().setDepth(-5);
    this.fx = this.add.graphics().setDepth(6);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,R,E,F,ONE,TWO,THREE,Z,X,C,ENTER');
    this.hud = new Hud();

    this.t = 0; this.gm = 0;
    this.enemies = []; this.projs = []; this.areas = []; this.drops = [];
    this.sects = []; this.pbs = []; this.nemesis = [];
    this.grid = new Map();
    this.spawnAcc = 0; this.bossCount = 0;
    this.sectT = 3; this.pbT = 12; this.hudT = 0; this.sectTick = 0;
    this.choice = null; this.pendingChoices = 0; this.choiceId = 0;
    this.trib = null; this.over = false; this.idSeq = 1; this.craftReserve = 0;
    this.phaseOrder = shuffle([...ELEMS]); this.phaseIdx = -1;

    this.dmgTexts = [];
    for (let i = 0; i < 40; i++) {
      this.dmgTexts.push(this.add.text(0, 0, '', { fontFamily: 'Microsoft JhengHei', fontSize: '13px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(8).setVisible(false).setOrigin(0.5));
    }
    this.dmgIdx = 0;

    this.initPlayer();
    this.cameras.main.startFollow(this.P.sprite, true, 0.15, 0.15);
    for (let i = 0; i < 2; i++) this.spawnSect(350, 700);
    this.updatePhase();
    this.hud.toast(`你是${this.P.lgType}修士，入世斬妖。活過 ${Math.round(DURATION / 60)} 分鐘壽元！`);
  }

  // ---------- 玩家 ----------
  initPlayer() {
    const lg = Object.fromEntries(ELEMS.map(e => [e, 0.3]));
    const sh = shuffle([...ELEMS]);
    const r = Math.random();
    let type;
    if (r < 0.15) { type = '天靈根'; lg[sh[0]] = 2.0; }
    else if (r < 0.45) { type = '雙靈根'; lg[sh[0]] = 1.4; lg[sh[1]] = 1.4; }
    else if (r < 0.8) { type = '三靈根'; sh.slice(0, 3).forEach(e => lg[e] = 1.0); }
    else { type = '雜靈根'; ELEMS.forEach(e => lg[e] = 0.6); }
    const P = this.P = {
      x: WORLD / 2, y: WORLD / 2, r: 14, elem: null,
      hp: 100, maxHp: 100, shield: 30, maxShield: 30, shieldDelay: 0,
      speed: 170, S: randi(2, 4), ss: 0, lg, lq: Object.fromEntries(ELEMS.map(e => [e, 0])), lgType: type,
      level: 1, exp: 0, stones: 0, realm: 0, kills: 0,
      skills: [], gongfa: [], weapons: {}, weapon: null, mats: {},
      meditating: false, slowActive: false, hurtT: 0,
    };
    P.ss = this.ssMax();
    P.sprite = this.add.image(P.x, P.y, 'player').setDepth(4);
    // 基礎隨機神通 + 功法（主屬性）
    const main = sh[0];
    const sk = pick(SKILL_IDS.filter(id => SKILLS[id].elem === main));
    P.skills.push({ id: sk, lvl: 1, t: 0 });
    this.applyOpt({ kind: 'gf', elem: main, stat: 'lq', grade: 1, name: randGongfaName(main) }, true);
  }

  ssMax() { return 40 + this.P.S * 12; }
  pickupR() { return 50 + this.P.S * 8; }
  choiceTime() { return 4 + this.P.S * 0.6; }
  dropRate() { return this.P.weapon ? this.P.weapon.grade * 0.04 : 0; }
  expNext() { const l = this.P.level; return Math.floor(8 + l * 6 + l * l * 0.5); }
  weaponMult(elem) {
    const w = this.P.weapon;
    if (!w) return 1;
    return 1 + w.grade * 0.06 + (w.elem === elem ? w.grade * 0.06 : 0);
  }
  skillCd(s) {
    const d = SKILLS[s.id];
    return d.cd * (1 - 0.05 * (s.lvl - 1)) / Math.max(0.3, this.P.lg[d.elem]);
  }
  skillDmg(s) {
    const d = SKILLS[s.id];
    return d.dmg * (1 + 0.3 * (s.lvl - 1)) * (1 + this.P.lq[d.elem]) * this.weaponMult(d.elem) * (1 + this.P.realm * 0.3);
  }
  // 神識時緩：依境界差決定敵方時間倍率
  realmSlow(realm) { return clamp(0.5 - 0.15 * (this.P.realm - realm), 0.03, 0.85); }
  curGrade() { const P = this.P; return clamp(1 + P.realm * 2 + ((P.level - 1) % 10 >= 5 ? 1 : 0), 1, 9); }

  // ---------- 主迴圈 ----------
  update(_, deltaMs) {
    if (this.over) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this.scene.restart();
      return;
    }
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.t += dt;
    if (this.t >= DURATION) return this.endGame(true);
    this.gm = this.t / DURATION * 30;

    this.updatePhase();
    this.updateInput(dt);
    this.spawnEnemies(dt);
    this.buildGrid();
    this.updateEnemies(dt);
    this.updateSkills(dt);
    this.updateProjectiles(dt);
    this.updateAreas(dt);
    this.updatePasserby(dt);
    this.updateSects(dt);
    this.updateDrops(dt);
    this.updatePlayer(dt);
    this.updateChoice(dt);
    this.draw();
    this.updateDmgTexts(dt);
    if (this.over) return;

    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.1; this.hud.update(this); }
  }

  updatePhase() {
    const idx = Math.floor(this.gm / 3);
    if (idx !== this.phaseIdx) {
      this.phaseIdx = idx;
      this.phaseElem = this.phaseOrder[idx % 5];
      if (idx > 0) this.hud.toast(`妖潮轉為 <b style="color:${ELEM_CSS[this.phaseElem]}">${this.phaseElem}屬</b>！`, ELEM_CSS[this.phaseElem]);
    }
  }

  updateInput(dt) {
    const k = this.keys, P = this.P, JD = Phaser.Input.Keyboard.JustDown;
    P.meditating = k.SPACE.isDown;
    let mx = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown);
    let my = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown);
    if (mx || my) {
      const l = Math.hypot(mx, my);
      const sp = P.meditating ? 0 : P.speed;
      P.x = clamp(P.x + mx / l * sp * dt, 15, WORLD - 15);
      P.y = clamp(P.y + my / l * sp * dt, 15, WORLD - 15);
    }
    P.sprite.setPosition(P.x, P.y);

    // 神識
    P.slowActive = k.Q.isDown && P.ss > 1;
    if (P.slowActive) P.ss -= 12 * dt;
    else P.ss = Math.min(this.ssMax(), P.ss + (2 + P.S * 0.3) * dt);
    if (JD(k.R)) {
      if (P.ss >= 15) {
        P.ss -= 15;
        const R = 350 + P.S * 40;
        let n = 0;
        for (const d of this.drops) if (d2(d.x, d.y, P.x, P.y) < R * R) { d.mag = true; n++; }
        this.areas.push({ kind: 'flash', x: P.x, y: P.y, R, life: 0.35, max: 0.35, color: 0x8e6cf0 });
        this.hud.toast(`神識掃過，收取 ${n} 件寶物`, '#8e6cf0');
      } else this.hud.toast('神識不足', '#8e6cf0');
    }

    // 升級選擇 / 宗門購買
    if (this.choice) {
      if (JD(k.ONE)) this.pickChoice(0);
      else if (JD(k.TWO)) this.pickChoice(1);
      else if (JD(k.THREE)) this.pickChoice(2);
    }
    if (this.curSect) {
      if (JD(k.Z)) this.buyShop(0);
      else if (JD(k.X)) this.buyShop(1);
      else if (JD(k.C)) this.buyShop(2);
    }

    // 路人互動
    let near = null, nd = 110 * 110;
    for (const p of this.pbs) {
      const dd = d2(p.x, p.y, P.x, P.y);
      if (dd < nd) { nd = dd; near = p; }
    }
    this.nearPasserby = near;
    if (near) {
      if (JD(k.E) && near.state === 'fighting') {
        near.state = 'ally';
        this.hud.toast(`<b style="color:${ELEM_CSS[near.elem]}">${near.name}</b> 與你結伴同行`, ELEM_CSS[near.elem]);
      } else if (JD(k.F) && (near.state === 'fighting' || near.state === 'ally')) {
        this.makeHostile(near);
        this.hud.toast(`你向 <b style="color:${ELEM_CSS[near.elem]}">${near.name}</b> 出手！`, '#e05555');
      }
    }
  }

  // ---------- 敵人 ----------
  spawnEnemies(dt) {
    this.spawnAcc += dt * (1.2 + this.gm * 0.55);
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      if (this.enemies.length < MAX_ENEMIES) this.spawnEnemy();
    }
    const bi = Math.floor(this.gm / 5);
    if (bi > this.bossCount) {
      this.bossCount = bi;
      this.spawnEnemy('boss');
      this.hud.toast(`<b style="color:#e05555">妖王</b>現世！`, '#e05555');
    }
  }

  spawnEnemy(type) {
    const gm = this.gm, P = this.P;
    if (!type) {
      const r = Math.random();
      type = gm < 2 ? (r < 0.85 ? 'imp' : 'wolf') : r < 0.5 ? 'imp' : r < 0.72 ? 'wolf' : r < 0.88 ? 'spit' : 'bear';
    }
    const T = ENEMY_TYPES[type];
    const elem = type === 'boss' || Math.random() < 0.6 ? this.phaseElem : pick(ELEMS);
    const a = rand(0, Math.PI * 2), R = rand(650, 820);
    const x = clamp(P.x + Math.cos(a) * R, 20, WORLD - 20), y = clamp(P.y + Math.sin(a) * R, 20, WORLD - 20);
    const hp = T.hp * (1 + gm * 0.25 + gm * gm * 0.02);
    this.enemies.push({
      type, elem, x, y, r: T.r, hp, maxHp: hp, boss: !!T.boss,
      speed: T.speed * rand(0.9, 1.1) * (1 + gm * 0.01), dmg: T.dmg * (1 + gm * 0.08),
      realm: Math.min(4, Math.floor(gm / 6)) + (T.boss ? 1 : 0),
      touchCd: 0, slowT: 0, slowF: 1, kx: 0, ky: 0, flash: 0, target: null, retarget: rand(0, 0.5), shootT: rand(1, 3),
      sprite: this.add.image(x, y, `e_${type}_${elem}`).setDepth(T.boss ? 3 : 2),
    });
  }

  buildGrid() {
    const g = this.grid;
    g.clear();
    for (const e of this.enemies) {
      const k = ((e.x / CELL) | 0) * 1000 + ((e.y / CELL) | 0);
      let a = g.get(k);
      if (!a) { a = []; g.set(k, a); }
      a.push(e);
    }
  }

  query(x, y, r) {
    const out = [];
    const x0 = Math.max(0, ((x - r - 40) / CELL) | 0), x1 = ((x + r + 40) / CELL) | 0;
    const y0 = Math.max(0, ((y - r - 40) / CELL) | 0), y1 = ((y + r + 40) / CELL) | 0;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.grid.get(cx * 1000 + cy);
      if (!a) continue;
      for (const e of a) {
        if (e.hp <= 0) continue;
        const rr = r + e.r;
        if (d2(e.x, e.y, x, y) <= rr * rr) out.push(e);
      }
    }
    return out;
  }

  // 玩家可攻擊的目標：妖獸 + 敵對路人
  hostilePbs() { return this.pbs.filter(p => p.state === 'hostile' || p.state === 'fleeing'); }

  nearestTarget(x, y, range) {
    let best = null, bd = range * range;
    for (const e of this.query(x, y, range)) {
      const dd = d2(e.x, e.y, x, y);
      if (dd < bd) { bd = dd; best = e; }
    }
    for (const p of this.hostilePbs()) {
      const dd = d2(p.x, p.y, x, y);
      if (dd < bd) { bd = dd; best = p; }
    }
    return best;
  }

  pickEnemyTarget(e) {
    const P = this.P;
    let best = P, bd = d2(e.x, e.y, P.x, P.y);
    for (const s of this.sects) {
      const dd = d2(e.x, e.y, s.x, s.y);
      if (dd < 320 * 320 && dd < bd) { bd = dd; best = s; }
    }
    for (const p of this.pbs) {
      if (p.state !== 'fighting' && p.state !== 'ally') continue;
      const dd = d2(e.x, e.y, p.x, p.y);
      if (dd < 360 * 360 && dd < bd) { bd = dd; best = p; }
    }
    return best;
  }

  updateEnemies(dt) {
    const P = this.P;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      let ts = P.slowActive ? this.realmSlow(e.realm) : 1;
      if (e.slowT > 0) { e.slowT -= dt; ts *= e.slowF; }
      e.retarget -= dt;
      if (e.retarget <= 0 || !e.target || e.target.hp <= 0 || e.target.dead || e.target.escaped) { e.retarget = 0.5; e.target = this.pickEnemyTarget(e); }
      const tg = e.target;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
      let mv = e.speed * ts * dt;
      if (ENEMY_TYPES[e.type].ranged) {
        if (d < 220) mv = -mv; else if (d < 290) mv = 0;
        e.shootT -= dt * ts;
        if (e.shootT <= 0 && d < 420 && tg === P) {
          e.shootT = 3;
          this.shoot({ team: 'foe', x: e.x, y: e.y, ang: Math.atan2(dy, dx), speed: 230, dmg: e.dmg, elem: e.elem, life: 3, r: 6, tex: 'foe', realm: e.realm });
        }
      }
      e.x += dx / d * mv + e.kx * dt;
      e.y += dy / d * mv + e.ky * dt;
      e.kx *= 0.88; e.ky *= 0.88;
      // 分離
      const cell = this.grid.get(((e.x / CELL) | 0) * 1000 + ((e.y / CELL) | 0));
      if (cell) {
        let n = 0;
        for (const o of cell) {
          if (o === e || o.hp <= 0) continue;
          if (++n > 8) break;
          const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r;
          const dd = ox * ox + oy * oy;
          if (dd < rr * rr && dd > 0.01) {
            const l = Math.sqrt(dd), push = (rr - l) * 0.5;
            e.x += ox / l * push; e.y += oy / l * push;
          }
        }
      }
      e.x = clamp(e.x, 10, WORLD - 10); e.y = clamp(e.y, 10, WORLD - 10);
      // 接觸傷害
      e.touchCd -= dt * ts;
      const rr = e.r + tg.r;
      if (d2(e.x, e.y, tg.x, tg.y) < rr * rr && e.touchCd <= 0) {
        e.touchCd = 0.7;
        this.hitTarget(tg, e.dmg, e.elem);
      }
      e.sprite.setPosition(e.x, e.y);
      if (e.flash > 0) { e.flash -= dt; if (e.flash <= 0) e.sprite.clearTint(); }
    }
    if (this.enemies.some(e => e.hp <= 0)) this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  hitTarget(tg, dmg, elem) {
    if (tg === this.P) return this.damagePlayer(dmg);
    tg.hp -= dmg * elemMult(elem, tg.elem);
  }

  damagePlayer(dmg) {
    const P = this.P;
    if (this.over) return;
    P.shieldDelay = 3;
    P.hurtT = 0.12;
    if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; }
    P.hp -= dmg;
    if (P.hp <= 0) { P.hp = 0; this.endGame(false); }
  }

  // 對妖獸或敵對路人造成傷害
  hurt(e, base, elem, opt = {}) {
    if (e.hp <= 0) return;
    const m = elemMult(elem, e.elem);
    const dmg = base * m * rand(0.9, 1.1);
    e.hp -= dmg;
    if (e.sprite && !e.isPb) { e.flash = 0.06; e.sprite.setTintFill(0xffffff); }
    this.dmgText(e.x, e.y - e.r, dmg, m);
    if (opt.slow) { e.slowT = opt.slow; e.slowF = opt.slowF || 0.5; }
    if (opt.kb && !e.boss && !e.isPb) {
      const a = Math.atan2(e.y - opt.ky, e.x - opt.kx);
      e.kx += Math.cos(a) * opt.kb; e.ky += Math.sin(a) * opt.kb;
    }
    if (e.isPb) { if (e.state !== 'fleeing') this.makeHostile(e); return; }
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const T = ENEMY_TYPES[e.type], P = this.P;
    e.sprite.destroy();
    P.kills++;
    this.spawnDrop('stone', e.x, e.y, { value: T.stone * (1 + this.gm * 0.12) });
    const dr = 1 + this.dropRate();
    if (e.boss || Math.random() < 0.015 * dr) this.spawnDrop('dan', e.x, e.y, { elem: e.elem });
    if (e.boss || Math.random() < 0.03 * dr) {
      const grade = clamp(1 + Math.floor(this.gm / 3.5) + (Math.random() < 0.3 ? 1 : 0) + (e.boss ? 1 : 0), 1, 9);
      const n = e.boss ? 3 : 1;
      for (let i = 0; i < n; i++) this.spawnDrop('mat', e.x, e.y, { elem: e.elem, part: e.boss ? PARTS[i] : pick(PARTS), grade });
    }
    if (e.boss) {
      for (let i = 0; i < 12; i++) this.spawnDrop('stone', e.x, e.y, { value: T.stone * (1 + this.gm * 0.12) / 12 });
      this.hud.toast('妖王伏誅！掉落一套煉器材料', '#e05555');
    }
  }

  // ---------- 神通 ----------
  updateSkills(dt) {
    const P = this.P;
    for (const s of P.skills) {
      s.t -= dt;
      if (P.meditating || s.t > 0) continue;
      s.t = this.castSkill(s) ? this.skillCd(s) : 0.2;
    }
  }

  castSkill(s) {
    const P = this.P, d = SKILLS[s.id], elem = d.elem, dmg = this.skillDmg(s), L = s.lvl;
    const tg = this.nearestTarget(P.x, P.y, 520);
    const aim = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : 0;
    switch (s.id) {
      case 'gengjin': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 3);
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + (i - (n - 1) / 2) * 0.12, speed: 620, dmg, elem, pierce: 2 + Math.floor(L / 2), life: 1.1, r: 7, tex: `sw_${elem}` });
        return true;
      }
      case 'wanjian': {
        const n = 8 + L * 2;
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: i / n * Math.PI * 2, speed: 430, dmg, elem, pierce: 3, life: 0.9, r: 7, tex: `sw_${elem}` });
        return true;
      }
      case 'qingteng': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 4);
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + rand(-0.5, 0.5), speed: 340, dmg, elem, pierce: 1 + Math.floor(L / 3), life: 2.2, r: 8, homing: true, slow: 1.5, slowF: 0.45 });
        return true;
      }
      case 'wanmu': {
        const R = 85 + L * 10;
        let hit = 0;
        this.areaHit(P.x, P.y, R, e => { this.hurt(e, dmg, elem); hit++; });
        if (hit) P.hp = Math.min(P.maxHp, P.hp + 0.6 + L * 0.25);
        return true;
      }
      case 'xuanbing': {
        if (!tg) return false;
        const n = 2 + Math.floor(L / 3);
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + (i - (n - 1) / 2) * 0.18, speed: 480, dmg, elem, pierce: 1, life: 1.1, r: 7, slow: 1.5, slowF: 0.5 });
        return true;
      }
      case 'hanchao':
        this.areas.push({ kind: 'ring', x: P.x, y: P.y, r: 10, maxR: 190 + L * 22, spd: 380, dmg, elem, hit: new Set(), slow: 2, color: ELEM_HEX[elem] });
        return true;
      case 'huoqiu': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 4);
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + i * 0.25, speed: 420, dmg, elem, pierce: 0, life: 1.4, r: 9, explode: 48 + L * 6 });
        return true;
      }
      case 'fentian': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 3);
        const cands = this.query(P.x, P.y, 420);
        for (let i = 0; i < n; i++) {
          const c = cands.length ? pick(cands) : tg;
          this.areas.push({ kind: 'zone', x: c.x, y: c.y, R: 55 + L * 6, life: 3, max: 3, tickT: 0, dmg, elem, color: ELEM_HEX[elem] });
        }
        return true;
      }
      case 'luoshi': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 4);
        let cands = this.query(P.x, P.y, 450).sort((a, b) => b.hp - a.hp);
        for (let i = 0; i < n; i++) {
          const c = cands[i] || tg;
          this.areas.push({ kind: 'drop', x: c.x, y: c.y, R: 45 + L * 4, delay: 0.55, max: 0.55, dmg, elem, color: ELEM_HEX[elem] });
        }
        return true;
      }
      case 'dilie': {
        const R = 110 + L * 12;
        this.areaHit(P.x, P.y, R, e => this.hurt(e, dmg, elem, { kb: 420, kx: P.x, ky: P.y }));
        this.areas.push({ kind: 'flash', x: P.x, y: P.y, R, life: 0.3, max: 0.3, color: ELEM_HEX[elem] });
        return true;
      }
    }
    return false;
  }

  areaHit(x, y, R, fn) {
    for (const e of this.query(x, y, R)) fn(e);
    for (const p of this.hostilePbs()) if (d2(p.x, p.y, x, y) < (R + p.r) ** 2) fn(p);
  }

  shoot(o) {
    const p = { pierce: 0, r: 6, ...o, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, hit: new Set(), dead: false };
    p.sprite = this.add.image(o.x, o.y, o.tex || `p_${o.elem}`).setDepth(3).setRotation(o.ang);
    this.projs.push(p);
  }

  updateProjectiles(dt) {
    const P = this.P;
    const hpbs = this.hostilePbs();
    for (const p of this.projs) {
      let ts = 1;
      if (p.team === 'foe' && P.slowActive) ts = this.realmSlow(p.realm || 0);
      p.life -= dt * ts;
      if (p.homing) {
        const tg = this.nearestTarget(p.x, p.y, 300);
        if (tg) {
          const want = Math.atan2(tg.y - p.y, tg.x - p.x), cur = Math.atan2(p.vy, p.vx);
          let diff = Phaser.Math.Angle.Wrap(want - cur);
          const na = cur + clamp(diff, -6 * dt, 6 * dt);
          p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed;
          p.sprite.setRotation(na);
        }
      }
      p.x += p.vx * dt * ts; p.y += p.vy * dt * ts;
      p.sprite.setPosition(p.x, p.y);
      if (p.team === 'foe') {
        if (d2(p.x, p.y, P.x, P.y) < (P.r + p.r) ** 2) { this.damagePlayer(p.dmg); p.dead = true; }
      } else {
        const targets = this.query(p.x, p.y, p.r);
        if (p.team === 'player') for (const h of hpbs) if (d2(h.x, h.y, p.x, p.y) < (h.r + p.r) ** 2) targets.push(h);
        for (const e of targets) {
          if (p.hit.has(e) || e.hp <= 0) continue;
          p.hit.add(e);
          if (p.explode) {
            this.areaHit(p.x, p.y, p.explode, t => this.hurt(t, p.dmg, p.elem));
            this.areas.push({ kind: 'flash', x: p.x, y: p.y, R: p.explode, life: 0.25, max: 0.25, color: ELEM_HEX[p.elem] });
            p.dead = true; break;
          }
          this.hurt(e, p.dmg, p.elem, { slow: p.slow, slowF: p.slowF });
          if (--p.pierce < 0) { p.dead = true; break; }
        }
      }
      if (p.life <= 0 || p.x < 0 || p.y < 0 || p.x > WORLD || p.y > WORLD) p.dead = true;
      if (p.dead) p.sprite.destroy();
    }
    this.projs = this.projs.filter(p => !p.dead);
  }

  updateAreas(dt) {
    const P = this.P;
    for (const a of this.areas) {
      switch (a.kind) {
        case 'ring':
          a.r += a.spd * dt;
          for (const e of this.query(a.x, a.y, a.r)) if (!a.hit.has(e)) { a.hit.add(e); this.hurt(e, a.dmg, a.elem, { slow: a.slow }); }
          for (const p of this.hostilePbs()) if (!a.hit.has(p) && d2(p.x, p.y, a.x, a.y) < a.r * a.r) { a.hit.add(p); this.hurt(p, a.dmg, a.elem); }
          if (a.r >= a.maxR) a.dead = true;
          break;
        case 'drop':
          a.delay -= dt;
          if (a.delay <= 0) {
            this.areaHit(a.x, a.y, a.R, e => this.hurt(e, a.dmg, a.elem));
            this.areas.push({ kind: 'flash', x: a.x, y: a.y, R: a.R, life: 0.25, max: 0.25, color: a.color });
            a.dead = true;
          }
          break;
        case 'zone':
          a.life -= dt; a.tickT -= dt;
          if (a.tickT <= 0) { a.tickT = 0.4; this.areaHit(a.x, a.y, a.R, e => this.hurt(e, a.dmg, a.elem)); }
          if (a.life <= 0) a.dead = true;
          break;
        case 'lightning':
          a.delay -= dt;
          if (a.delay <= 0) {
            if (d2(a.x, a.y, P.x, P.y) < (a.R + P.r) ** 2) this.damagePlayer(a.dmg);
            this.areaHit(a.x, a.y, a.R, e => this.hurt(e, a.dmg * 3, null));
            this.areas.push({ kind: 'flash', x: a.x, y: a.y, R: a.R, life: 0.3, max: 0.3, color: 0xbfd8ff });
            a.dead = true;
          }
          break;
        case 'flash':
          a.life -= dt;
          if (a.life <= 0) a.dead = true;
          break;
      }
    }
    this.areas = this.areas.filter(a => !a.dead);
  }

  // ---------- 路人 ----------
  spawnPasserby() {
    if (this.pbs.length >= 5) return;
    const P = this.P, gm = this.gm;
    const nem = this.nemesis.length && Math.random() < 0.4 ? this.nemesis.shift() : null;
    const name = nem ? nem.name : randName();
    const elem = nem ? nem.elem : pick(ELEMS);
    const power = nem ? nem.power : 0;
    const a = rand(0, Math.PI * 2), R = rand(450, 650);
    const x = clamp(P.x + Math.cos(a) * R, 40, WORLD - 40), y = clamp(P.y + Math.sin(a) * R, 40, WORLD - 40);
    const hp = 90 * (1 + gm * 0.3) * (1 + 0.6 * power);
    const pb = {
      isPb: true, id: this.idSeq++, name, elem, power, x, y, r: 13, hp, maxHp: hp,
      dmg: 9 * (1 + gm * 0.15) * (1 + 0.4 * power), speed: 150 * (1 + 0.1 * power),
      state: nem || Math.random() < 0.3 ? 'hostile' : 'fighting',
      atkT: 1, dodgeCd: 0, dashT: 0, dvx: 0, dvy: 0, wx: x, wy: y, wanderT: 0, dumbT: 0,
      realm: Math.min(4, Math.floor(gm / 6)),
      sprite: this.add.image(x, y, `pb_${elem}`).setDepth(3),
      label: this.add.text(x, y - 24, name + (power ? ' ' + '★'.repeat(power) : ''), { fontFamily: 'Microsoft JhengHei', fontSize: '12px', color: ELEM_CSS[elem], stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(7),
    };
    this.pbs.push(pb);
    const c = ELEM_CSS[elem];
    if (nem) this.hud.toast(`宿敵 <b style="color:${c}">${name}</b> 捲土重來！（★${power}）`, '#e05555');
    else if (pb.state === 'hostile') this.hud.toast(`<b style="color:${c}">${name}</b>（${elem}）盯上了你的靈石！`, '#e05555');
    else this.hud.toast(`路人修士 <b style="color:${c}">${name}</b>（${elem}）正與妖獸纏鬥`, c);
  }

  makeHostile(pb) {
    if (pb.state === 'hostile' || pb.state === 'fleeing') return;
    pb.state = 'hostile';
  }

  updatePasserby(dt) {
    const P = this.P;
    this.pbT -= dt;
    if (this.pbT <= 0) { this.pbT = 18; if (Math.random() < 0.5) this.spawnPasserby(); }

    for (const pb of this.pbs) {
      pb.atkT -= dt; pb.dodgeCd -= dt;
      let mx = 0, my = 0, sp = pb.speed;
      if (pb.dashT > 0) {
        pb.dashT -= dt;
        pb.x += pb.dvx * dt; pb.y += pb.dvy * dt;
      } else if (pb.state === 'fighting' || pb.state === 'ally') {
        const tg = this.nearestEnemyOnly(pb.x, pb.y, 380);
        if (pb.state === 'ally') {
          // 比較笨：偶爾會衝進妖群
          pb.dumbT -= dt;
          if (pb.dumbT <= 0) pb.dumbT = rand(3, 7);
          const charging = pb.dumbT < 1.5 && tg;
          const dP = Math.sqrt(d2(pb.x, pb.y, P.x, P.y));
          if (charging) { mx = tg.x - pb.x; my = tg.y - pb.y; }
          else if (dP > 160) { mx = P.x - pb.x; my = P.y - pb.y; }
        } else {
          pb.wanderT -= dt;
          if (pb.wanderT <= 0) { pb.wanderT = rand(1, 3); pb.wx = pb.x + rand(-120, 120); pb.wy = pb.y + rand(-120, 120); }
          mx = pb.wx - pb.x; my = pb.wy - pb.y; sp *= 0.5;
        }
        if (tg && pb.atkT <= 0) {
          pb.atkT = 0.8;
          this.shoot({ team: 'ally', x: pb.x, y: pb.y, ang: Math.atan2(tg.y - pb.y, tg.x - pb.x), speed: 420, dmg: pb.dmg, elem: pb.elem, life: 1.2, r: 7, pierce: 0, tex: `fp_${pb.elem}` });
        }
      } else if (pb.state === 'hostile') {
        const dx = P.x - pb.x, dy = P.y - pb.y, d = Math.hypot(dx, dy) || 1;
        if (d > 260) { mx = dx; my = dy; } else if (d < 180) { mx = -dx; my = -dy; }
        else { mx = -dy; my = dx; sp *= 0.6; }
        let ts = P.slowActive ? this.realmSlow(pb.realm) : 1;
        sp *= ts;
        if (pb.atkT <= 0 && d < 450) {
          pb.atkT = 1.1 / Math.max(ts, 0.2);
          this.shoot({ team: 'foe', x: pb.x, y: pb.y, ang: Math.atan2(dy, dx), speed: 300, dmg: pb.dmg, elem: pb.elem, life: 2, r: 6, tex: `fp_${pb.elem}`, realm: pb.realm });
        }
        // 躲招
        if (pb.dodgeCd <= 0) {
          for (const p of this.projs) {
            if (p.team !== 'player') continue;
            const rx = pb.x - p.x, ry = pb.y - p.y;
            if (rx * rx + ry * ry > 100 * 100) continue;
            if (rx * p.vx + ry * p.vy <= 0) continue;
            pb.dodgeCd = 1.0;
            if (Math.random() < 0.6) {
              const l = Math.hypot(p.vx, p.vy) || 1, side = Math.random() < 0.5 ? 1 : -1;
              pb.dvx = -p.vy / l * 480 * side; pb.dvy = p.vx / l * 480 * side; pb.dashT = 0.2;
            }
            break;
          }
        }
        if (pb.hp < pb.maxHp * 0.3) {
          pb.state = 'fleeing';
          this.hud.toast(`<b style="color:${ELEM_CSS[pb.elem]}">${pb.name}</b> 負傷而逃！`, ELEM_CSS[pb.elem]);
        }
      } else if (pb.state === 'fleeing') {
        const opts = [[pb.x, 0], [WORLD - pb.x, 1], [pb.y, 2], [WORLD - pb.y, 3]].sort((a, b) => a[0] - b[0]);
        const dir = opts[0][1];
        mx = dir === 0 ? -1 : dir === 1 ? 1 : 0; my = dir === 2 ? -1 : dir === 3 ? 1 : 0;
        sp *= 1.4;
        if (pb.x < 12 || pb.y < 12 || pb.x > WORLD - 12 || pb.y > WORLD - 12) {
          pb.escaped = true;
          this.nemesis.push({ name: pb.name, elem: pb.elem, power: pb.power + 1 });
          if (this.nemesis.length > 6) this.nemesis.shift();
          this.hud.toast(`<b style="color:${ELEM_CSS[pb.elem]}">${pb.name}</b> 逃出戰場…日後必捲土重來`, '#e05555');
        }
      }
      if (mx || my) {
        const l = Math.hypot(mx, my);
        pb.x += mx / l * sp * dt; pb.y += my / l * sp * dt;
      }
      pb.x = clamp(pb.x, 5, WORLD - 5); pb.y = clamp(pb.y, 5, WORLD - 5);
      pb.sprite.setPosition(pb.x, pb.y);
      pb.label.setPosition(pb.x, pb.y - 24);
      pb.sprite.setAlpha(pb.state === 'fleeing' ? 0.6 : 1);

      if (pb.hp <= 0 && !pb.escaped) {
        pb.dead = true;
        if (pb.state === 'hostile' || pb.state === 'fleeing') {
          this.spawnDrop('scroll', pb.x, pb.y, { item: this.pbLoot(pb) });
          this.hud.toast(`你斬殺了 <b style="color:${ELEM_CSS[pb.elem]}">${pb.name}</b>，其儲物袋掉落傳承`, '#ffd98a');
        } else {
          this.hud.toast(`<b style="color:${ELEM_CSS[pb.elem]}">${pb.name}</b> 被妖獸殺死了`, '#888');
        }
      }
      if (pb.dead || pb.escaped) { pb.sprite.destroy(); pb.label.destroy(); }
    }
    this.pbs = this.pbs.filter(p => !p.dead && !p.escaped);
  }

  nearestEnemyOnly(x, y, range) {
    let best = null, bd = range * range;
    for (const e of this.query(x, y, range)) {
      const dd = d2(e.x, e.y, x, y);
      if (dd < bd) { bd = dd; best = e; }
    }
    return best;
  }

  pbLoot(pb) {
    const grade = clamp(this.curGrade() + pb.power, 1, 9);
    const sk = SKILL_IDS.filter(id => SKILLS[id].elem === pb.elem);
    if (Math.random() < 0.45) {
      const id = pick(sk);
      const owned = this.P.skills.find(s => s.id === id);
      if (owned || this.P.skills.length < MAX_SKILLS) return { kind: owned ? 'up' : 'new', id, n: grade >= 6 ? 2 : 1 };
    }
    return { kind: 'gf', elem: pb.elem, stat: Math.random() < 0.5 ? 'lq' : 'lg', grade, name: randGongfaName(pb.elem) };
  }

  // ---------- 宗門 ----------
  spawnSect(minR = 450, maxR = 1300) {
    const P = this.P;
    let x, y, ok = false;
    for (let i = 0; i < 20 && !ok; i++) {
      const a = rand(0, Math.PI * 2), R = rand(minR, maxR);
      x = clamp(P.x + Math.cos(a) * R, 150, WORLD - 150); y = clamp(P.y + Math.sin(a) * R, 150, WORLD - 150);
      ok = this.sects.every(s => d2(s.x, s.y, x, y) > 400 * 400);
    }
    const elem = pick(ELEMS);
    const hp = 500 * (1 + this.gm * 0.4);
    const s = {
      id: this.idSeq++, name: randSectName(), elem, x, y, r: 30, hp, maxHp: hp, age: 0, atkT: 1,
      dmg: 10 * (1 + this.gm * 0.25), shop: [], shopVer: 0, shopT: 0,
      sprite: this.add.image(x, y, `sect_${elem}`).setDepth(1),
    };
    s.label = this.add.text(x, y - 46, s.name, { fontFamily: 'Microsoft JhengHei', fontSize: '14px', color: ELEM_CSS[elem], stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(7);
    this.refreshShop(s);
    this.sects.push(s);
    this.hud.toast(`<b style="color:${ELEM_CSS[elem]}">${s.name}</b>（${elem}）開山立派`, ELEM_CSS[elem]);
  }

  refreshShop(s) {
    const P = this.P;
    const grade = clamp(this.curGrade() + Math.min(3, Math.floor(s.age / 45)), 1, 9);
    const items = [];
    for (const id of SKILL_IDS.filter(i => SKILLS[i].elem === s.elem)) {
      const owned = P.skills.find(k => k.id === id);
      if (owned && owned.lvl >= MAX_SKILL_LVL) continue;
      if (!owned && P.skills.length >= MAX_SKILLS) continue;
      items.push({ kind: owned ? 'up' : 'new', id, n: grade >= 6 ? 2 : 1 });
    }
    shuffle(items);
    const out = items.slice(0, 1);
    while (out.length < 3) out.push({ kind: 'gf', elem: s.elem, stat: Math.random() < 0.5 ? 'lq' : 'lg', grade, name: randGongfaName(s.elem) });
    const price = it => Math.round((it.kind === 'gf' ? 25 * it.grade : 60 + 20 * grade) * (1 + this.gm * 0.2));
    s.shop = shuffle(out).map(it => ({ ...it, price: price(it) }));
    s.shopVer++;
    s.shopT = 40;
  }

  buyShop(i) {
    const s = this.curSect, P = this.P;
    if (!s) return;
    const it = s.shop[i];
    if (!it) return;
    if (P.stones < it.price) { this.hud.toast('靈石不足', '#e05555'); return; }
    if (it.kind === 'new' && P.skills.length >= MAX_SKILLS) { this.hud.toast('神通已滿', '#e05555'); return; }
    P.stones -= it.price;
    this.applyOpt(it);
    s.shop[i] = null;
    s.shopVer++;
  }

  updateSects(dt) {
    const P = this.P;
    this.sectT -= dt;
    if (this.sectT <= 0) { this.sectT = rand(18, 30); if (this.sects.length < 5) this.spawnSect(); }
    this.curSect = null;
    for (const s of this.sects) {
      s.age += dt; s.atkT -= dt; s.shopT -= dt;
      if (s.shopT <= 0) this.refreshShop(s);
      if (s.atkT <= 0) {
        const tg = this.nearestEnemyOnly(s.x, s.y, 300);
        if (tg) {
          s.atkT = 0.9;
          this.shoot({ team: 'ally', x: s.x, y: s.y, ang: Math.atan2(tg.y - s.y, tg.x - s.x), speed: 450, dmg: s.dmg, elem: s.elem, life: 1, r: 8, pierce: 1, tex: `fp_${s.elem}` });
        }
      }
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.005 * dt);
      if (s.hp <= 0) {
        s.dead = true;
        s.sprite.destroy(); s.label.destroy();
        this.hud.toast(`<b style="color:${ELEM_CSS[s.elem]}">${s.name}</b> 被妖獸攻破！`, '#e05555');
        continue;
      }
      if (d2(s.x, s.y, P.x, P.y) < SECT_R * SECT_R) this.curSect = s;
    }
    this.sects = this.sects.filter(s => !s.dead);
    if (this.curSect) {
      this.sectTick -= dt;
      if (this.sectTick <= 0) { this.sectTick = 0.5; this.tryCraft(); }
    }
  }

  // ---------- 煉器 ----------
  gainMat(m) {
    const P = this.P, key = `${m.elem}-${m.part}`;
    const sell = g => { P.stones += 5 * g; };
    if ((P.weapons[m.elem] || 0) >= m.grade) { sell(m.grade); return; }
    const cur = P.mats[key];
    if (cur && cur >= m.grade) { sell(m.grade); return; }
    if (cur) sell(cur);
    P.mats[key] = m.grade;
    this.hud.toast(`獲得 <b style="color:${ELEM_CSS[m.elem]}">${GRADE_CN[m.grade]}品${m.elem}屬妖${m.part}</b>`, ELEM_CSS[m.elem]);
  }

  craftable(e) {
    const gs = PARTS.map(p => this.P.mats[`${e}-${p}`]);
    if (!gs[0] || gs[0] !== gs[1] || gs[1] !== gs[2]) return 0;
    return gs[0];
  }

  craftCost(g) { return Math.round(40 * g * (1 + this.gm * 0.1)); }

  pendingCraftCost() {
    let min = 0;
    for (const e of ELEMS) {
      const g = this.craftable(e);
      if (g) { const c = this.craftCost(g); if (!min || c < min) min = c; }
    }
    return min;
  }

  tryCraft() {
    const P = this.P;
    for (const e of ELEMS) {
      const g = this.craftable(e);
      if (!g) continue;
      const cost = this.craftCost(g);
      if (P.stones < cost) continue;
      P.stones -= cost;
      PARTS.forEach(p => delete P.mats[`${e}-${p}`]);
      P.weapons[e] = g;
      // 低於法寶品階的同屬材料自動賣掉
      for (const p of PARTS) {
        const k = `${e}-${p}`;
        if (P.mats[k] && P.mats[k] <= g) { P.stones += 5 * P.mats[k]; delete P.mats[k]; }
      }
      let best = null;
      for (const [el, gr] of Object.entries(P.weapons)) if (!best || gr > best.grade) best = { elem: el, grade: gr };
      P.weapon = best;
      this.hud.toast(`煉成 <b style="color:${ELEM_CSS[e]}">${GRADE_CN[g]}品${e}屬法寶</b>（耗 ${cost} 靈石）`, ELEM_CSS[e]);
    }
  }

  // ---------- 掉落 ----------
  spawnDrop(kind, x, y, extra) {
    if (kind === 'stone' && this.drops.length > 450) {
      const s = this.drops.find(d => d.kind === 'stone');
      if (s) { s.value += extra.value; return; }
    }
    const tex = kind === 'stone' ? 'stone' : kind === 'scroll' ? 'scroll' : `${kind}_${extra.elem}`;
    const d = { kind, x: x + rand(-10, 10), y: y + rand(-10, 10), mag: false, ...extra };
    d.sprite = this.add.image(d.x, d.y, tex).setDepth(1);
    this.drops.push(d);
  }

  updateDrops(dt) {
    const P = this.P, pr = this.pickupR();
    for (const d of this.drops) {
      const dd = d2(d.x, d.y, P.x, P.y);
      if (!d.mag && dd < pr * pr) d.mag = true;
      if (d.mag) {
        const l = Math.sqrt(dd) || 1, sp = 520 * dt;
        d.x += (P.x - d.x) / l * sp; d.y += (P.y - d.y) / l * sp;
        d.sprite.setPosition(d.x, d.y);
        if (l < P.r + 8) { this.collect(d); d.dead = true; d.sprite.destroy(); }
      }
    }
    this.drops = this.drops.filter(d => !d.dead);
  }

  collect(d) {
    const P = this.P;
    switch (d.kind) {
      case 'stone': P.stones += d.value; break;
      case 'dan': {
        const amt = 0.08 * (P.lgType === '雜靈根' ? 2 : 1);
        P.lg[d.elem] += amt;
        this.hud.toast(`煉化<b style="color:${ELEM_CSS[d.elem]}">${d.elem}屬妖丹</b>，${d.elem}靈根 +${amt.toFixed(2)}`, ELEM_CSS[d.elem]);
        break;
      }
      case 'mat': this.gainMat(d); break;
      case 'scroll': this.applyOpt(d.item); break;
    }
  }

  // ---------- 修為 / 境界 / 天劫 ----------
  updatePlayer(dt) {
    const P = this.P;
    P.shieldDelay -= dt;
    if (P.shieldDelay <= 0) P.shield = Math.min(P.maxShield, P.shield + P.maxShield * 0.2 * dt);
    P.hurtT -= dt;
    if (P.hurtT > 0) P.sprite.setTint(0xff6060); else P.sprite.clearTint();

    let rate = 0;
    if (P.meditating) rate += 25 + P.level * 5;
    if (this.curSect) rate += 15 + P.level * 3;
    // 宗門自動煉化時，若有可合成的骨皮牙則預留煉器靈石；主動打坐不預留
    this.craftReserve = this.pendingCraftCost();
    const usable = P.stones - (P.meditating ? 0 : this.craftReserve);
    if (rate && usable > 0) {
      const amt = Math.min(usable, rate * dt);
      P.stones -= amt; P.exp += amt;
    }
    while (P.exp >= this.expNext()) {
      P.exp -= this.expNext();
      P.level++;
      this.pendingChoices++;
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.1);
    }
    // 大境界突破 → 天劫
    if (!this.trib && P.realm < 4 && P.level >= (P.realm + 1) * 10) {
      this.trib = { t: 9, strikeT: 0.5 };
      this.hud.toast(`⚡ 欲突破${REALMS[P.realm + 1]}，天劫降臨！`, '#bfd8ff');
    }
    if (this.trib) {
      const tr = this.trib;
      tr.t -= dt; tr.strikeT -= dt;
      if (tr.strikeT <= 0) {
        tr.strikeT = 0.55;
        this.areas.push({ kind: 'lightning', x: P.x + rand(-70, 70), y: P.y + rand(-70, 70), R: 55, delay: 1.0, max: 1.0, dmg: P.maxHp * 0.16 });
      }
      if (tr.t <= 0) {
        this.trib = null;
        P.realm++;
        P.maxHp = Math.round(P.maxHp * 1.3); P.hp = P.maxHp;
        P.maxShield = Math.round(P.maxShield * 1.3); P.shield = P.maxShield;
        this.hud.toast(`渡劫成功！晉入 <b>${REALMS[P.realm]}</b> 期`, '#ffd98a');
      }
    }
  }

  // ---------- 升級選擇（不暫停） ----------
  updateChoice(dt) {
    if (!this.choice && this.pendingChoices > 0) {
      this.pendingChoices--;
      const max = this.choiceTime();
      this.choice = { id: ++this.choiceId, opts: this.genOptions(), t: max, max };
    }
    if (this.choice) {
      this.choice.t -= dt;
      if (this.choice.t <= 0) {
        const i = randi(0, this.choice.opts.length - 1);
        this.hud.toast(`猶豫太久，機緣隨機落在：${this.optLabel(this.choice.opts[i])}`, '#999');
        this.pickChoice(i);
      }
    }
  }

  pickChoice(i) {
    const c = this.choice;
    if (!c || !c.opts[i]) return;
    this.choice = null;
    this.applyOpt(c.opts[i]);
  }

  genOptions() {
    const P = this.P, pool = [];
    const owned = new Set(P.skills.map(s => s.id));
    const g = this.curGrade();
    for (const s of P.skills) if (s.lvl < MAX_SKILL_LVL) pool.push({ kind: 'up', id: s.id, n: 1, w: 3 });
    if (P.skills.length < MAX_SKILLS) for (const id of SKILL_IDS) if (!owned.has(id)) pool.push({ kind: 'new', id, w: P.lg[SKILLS[id].elem] > 0.5 ? 1.6 : 0.5 });
    for (const e of ELEMS) pool.push({ kind: 'gf', elem: e, stat: Math.random() < 0.5 ? 'lq' : 'lg', grade: g, name: randGongfaName(e), w: 0.5 });
    pool.push({ kind: 'attr', a: 'hp', w: 0.8 }, { kind: 'attr', a: 'shield', w: 0.8 }, { kind: 'attr', a: 'speed', w: 0.7 }, { kind: 'attr', a: 'S', w: 0.7 });
    const out = [];
    while (out.length < 3 && pool.length) {
      const tot = pool.reduce((a, o) => a + o.w, 0);
      let r = Math.random() * tot, idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  gfAmt(o) { return o.stat === 'lq' ? 0.08 + 0.03 * o.grade : 0.06 + 0.02 * o.grade; }

  optLabel(o) {
    const c = e => ELEM_CSS[e];
    switch (o.kind) {
      case 'new': return `<span style="color:${c(SKILLS[o.id].elem)}">${SKILLS[o.id].name}</span>【新神通】`;
      case 'up': {
        const s = this.P.skills.find(k => k.id === o.id);
        return `<span style="color:${c(SKILLS[o.id].elem)}">${SKILLS[o.id].name}</span> Lv${s ? s.lvl : 0}→${Math.min(MAX_SKILL_LVL, (s ? s.lvl : 0) + (o.n || 1))}`;
      }
      case 'gf': return `<span style="color:${c(o.elem)}">${o.name}</span> ${GRADE_CN[o.grade]}品`;
      case 'attr': return { hp: '淬體・肉身', shield: '凝元・護體真元', speed: '御風・遁速', S: '養神・神識' }[o.a];
    }
  }

  optDesc(o) {
    switch (o.kind) {
      case 'new': { const d = SKILLS[o.id]; return `${d.elem}・${d.kind === 'single' ? '單體' : '範圍'}：${d.desc}`; }
      case 'up': return `傷害 +30%、冷卻 -5%${(o.n || 1) > 1 ? `（升 ${o.n} 級）` : ''}`;
      case 'gf': return o.stat === 'lq' ? `${o.elem}靈氣 +${Math.round(this.gfAmt(o) * 100)}%（傷害）` : `${o.elem}靈根 +${this.gfAmt(o).toFixed(2)}（攻速）`;
      case 'attr': return { hp: '肉身上限 +25', shield: '護體上限 +15', speed: '遁速 +7%', S: '神識 +1（時緩、選擇時間、拾取）' }[o.a];
    }
  }

  applyOpt(o, silent = false) {
    const P = this.P;
    switch (o.kind) {
      case 'new':
        if (P.skills.find(s => s.id === o.id)) return this.applyOpt({ ...o, kind: 'up', n: 1 });
        if (P.skills.length >= MAX_SKILLS) return;
        P.skills.push({ id: o.id, lvl: 1, t: 0 });
        break;
      case 'up': {
        const s = P.skills.find(k => k.id === o.id);
        if (s) s.lvl = Math.min(MAX_SKILL_LVL, s.lvl + (o.n || 1));
        else if (P.skills.length < MAX_SKILLS) P.skills.push({ id: o.id, lvl: 1, t: 0 });
        break;
      }
      case 'gf': {
        const amt = this.gfAmt(o);
        if (o.stat === 'lq') P.lq[o.elem] += amt; else P.lg[o.elem] += amt;
        P.gongfa.push({ name: o.name, elem: o.elem, stat: o.stat, amt, grade: o.grade });
        break;
      }
      case 'attr':
        if (o.a === 'hp') { P.maxHp += 25; P.hp += 25; }
        if (o.a === 'shield') { P.maxShield += 15; P.shield += 15; }
        if (o.a === 'speed') P.speed *= 1.07;
        if (o.a === 'S') P.S += 1;
        break;
    }
    if (!silent) this.hud.toast(`習得：${this.optLabel(o)}`);
  }

  // ---------- 繪製 ----------
  draw() {
    const P = this.P, u = this.under, f = this.fx;
    u.clear(); f.clear();
    // 宗門範圍
    for (const s of this.sects) {
      u.fillStyle(ELEM_HEX[s.elem], 0.07).fillCircle(s.x, s.y, SECT_R);
      u.lineStyle(1, ELEM_HEX[s.elem], 0.4).strokeCircle(s.x, s.y, SECT_R);
      this.hpBar(f, s.x, s.y + 38, 60, s.hp / s.maxHp, ELEM_HEX[s.elem]);
    }
    // 拾取範圍
    u.lineStyle(1, 0x7fffe0, 0.12).strokeCircle(P.x, P.y, this.pickupR());
    // 萬木回春光環
    const wm = P.skills.find(s => s.id === 'wanmu');
    if (wm && !P.meditating) u.fillStyle(ELEM_HEX['木'], 0.08).fillCircle(P.x, P.y, 85 + wm.lvl * 10);
    if (P.meditating) u.fillStyle(0x7fffe0, 0.12).fillCircle(P.x, P.y, 30);
    for (const a of this.areas) {
      switch (a.kind) {
        case 'zone': u.fillStyle(a.color, 0.22 * Math.min(1, a.life)).fillCircle(a.x, a.y, a.R); break;
        case 'ring': f.lineStyle(4, a.color, 0.7).strokeCircle(a.x, a.y, a.r); break;
        case 'drop': f.lineStyle(2, a.color, 0.8).strokeCircle(a.x, a.y, a.R).fillStyle(a.color, 0.25 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R); break;
        case 'lightning': f.lineStyle(2, 0xbfd8ff, 0.9).strokeCircle(a.x, a.y, a.R).fillStyle(0xbfd8ff, 0.35 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R); break;
        case 'flash': f.fillStyle(a.color, 0.35 * a.life / a.max).fillCircle(a.x, a.y, a.R); break;
      }
    }
    // 護盾
    if (P.shield > 0) f.lineStyle(2, 0x3aa7c7, 0.25 + 0.5 * P.shield / P.maxShield).strokeCircle(P.x, P.y, 20);
    // 路人血條
    for (const pb of this.pbs) {
      const col = pb.state === 'ally' ? 0x5cc96b : pb.state === 'fighting' ? 0xcccccc : 0xe05555;
      this.hpBar(f, pb.x, pb.y + 20, 34, pb.hp / pb.maxHp, col);
    }
    for (const e of this.enemies) if (e.boss || e.type === 'bear') this.hpBar(f, e.x, e.y + e.r + 5, e.r * 2, e.hp / e.maxHp, 0xe05555);
    // 邊界
    f.lineStyle(4, 0x6b2020, 0.8).strokeRect(0, 0, WORLD, WORLD);
  }

  hpBar(g, x, y, w, frac, color) {
    g.fillStyle(0x000000, 0.6).fillRect(x - w / 2, y, w, 4);
    g.fillStyle(color, 1).fillRect(x - w / 2, y, w * clamp(frac, 0, 1), 4);
  }

  dmgText(x, y, dmg, m) {
    const t = this.dmgTexts[this.dmgIdx];
    this.dmgIdx = (this.dmgIdx + 1) % this.dmgTexts.length;
    t.setText(Math.round(dmg)).setPosition(x + rand(-6, 6), y).setVisible(true).setAlpha(1)
      .setColor(m > 1 ? '#ffd24a' : m < 1 ? '#8a8a8a' : '#ffffff').setFontSize(m > 1 ? 15 : 12);
    t.life = 0.6;
  }

  updateDmgTexts(dt) {
    for (const t of this.dmgTexts) {
      if (!t.visible) continue;
      t.life -= dt; t.y -= 30 * dt; t.setAlpha(Math.max(0, t.life / 0.6));
      if (t.life <= 0) t.setVisible(false);
    }
  }

  endGame(win) {
    if (this.over) return;
    this.over = true;
    this.hud.update(this);
    this.hud.gameOver(win, this);
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0d12',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [Main],
});
