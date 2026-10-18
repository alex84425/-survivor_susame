// 修仙 v3：黑帝斯 × 黑夜君臨。第一階段＝單挑手感測試場
import { sfx, initAudio, toggleMute, toggleBgm, setIntensity } from '../sfx.js';
import { ELEMS, ELEM_CSS, ELEM_HEX, elemMult, PX_FACE } from '../data.js';
import { CLASSES, ENEMIES } from './kits.js';
import { preloadImages, makeTextures, unitTex } from './gfx.js';

const W = 4000;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angDiff = (a, b) => Math.abs(Phaser.Math.Angle.Wrap(a - b));
const $ = id => document.getElementById(id);

class Arena extends Phaser.Scene {
  constructor() { super('arena'); }
  init(data) { this.clsKey = (data && data.cls) || window.__cls || '金'; }
  preload() { preloadImages(this); }

  create() {
    makeTextures(this);
    for (const e of ELEMS) unitTex(this, `pl_${e}`, CLASSES[e].img, 58, ELEM_CSS[e], '修');
    for (const [k, T] of Object.entries(ENEMIES)) if (T.img) unitTex(this, `en_${k}`, T.img, T.size, ELEM_CSS[T.elem], T.name[0]);

    this.cameras.main.setBounds(0, 0, W, W);
    this.add.tileSprite(0, 0, W, W, 'bg3').setOrigin(0).setDepth(-10);
    for (let i = 0; i < 260; i++) this.add.circle(rand(0, W), rand(0, W), rand(6, 22), 0x232a36, rand(0.4, 0.8)).setDepth(-9);
    this.tele = this.add.graphics().setDepth(1);
    this.fx = this.add.graphics().setDepth(6);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,Q,E,R,F,ENTER,M,B');
    this.input.keyboard.on('keydown', initAudio);
    this.input.on('pointerdown', initAudio);
    this.input.mouse.disableContextMenu();

    this.t = 0; this.over = false; this.hitstop = 0; this.slowmo = 0; this.hudT = 0;
    this.enemies = []; this.pp = []; this.ep = []; this.areas = []; this.parts = []; this.dps = [];
    this.prevL = false; this.prevR = false;
    this.texts = [];
    for (let i = 0; i < 30; i++) this.texts.push(this.add.text(0, 0, '', { fontFamily: 'Microsoft JhengHei', fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 }).setDepth(9).setOrigin(0.5).setVisible(false));
    this.textIdx = 0;

    this.initPlayer();
    this.cameras.main.startFollow(this.P.sprite, true, 0.12, 0.12);
    this.bonfire = { x: 2000, y: 2000 };
    this.add.image(2000, 2000, 'bonfire3').setDepth(1);
    this.spawnAll();
    hud.start(this);
    hud.toast(`主修：${this.P.elem}・${this.P.cls.name}。左鍵普攻、右鍵戰技、Q 大招、空白閃避、R 丹藥、F 處決或篝火`);
    hud.toast('測試場：北方狼群、東方妖熊、南方毒蛛巢、西方妖王・翼虎；篝火 F 可回滿並重置妖獸', '#999');
  }

  // ---------- 玩家 ----------
  initPlayer() {
    const C = CLASSES[this.clsKey];
    this.P = {
      elem: this.clsKey, cls: C, x: 2000, y: 2120, r: 14,
      hp: C.hp, maxHp: C.hp, st: 100, maxSt: 100, stDelay: 0, mp: 60, maxMp: 100, ult: 0,
      flask: 3, flaskMax: 3, speed: C.speed,
      dodgeCd: 0, dashT: 0, dvx: 0, dvy: 0, inv: 0, dodgeAt: -9, stunT: 0, rootT: 0,
      act: null, comboIdx: 0, comboT: 0, critNext: false, skillCd: 0, fireCd: 0, charge: -1, parry: 0, armorT: 0, pulseT: 0,
    };
    this.P.sprite = this.add.image(this.P.x, this.P.y, `pl_${this.clsKey}`).setDepth(4);
  }

  spawnAll() {
    for (const e of this.enemies) e.sprite.destroy();
    this.enemies = [];
    const camp = (list, cx, cy) => { const c = { members: [] }; list.forEach((k, i) => c.members.push(this.spawn(k, cx + Math.cos(i * 2.1) * 70, cy + Math.sin(i * 2.1) * 70, c))); };
    this.spawn('dummy', 2230, 2160); this.spawn('dummy', 2300, 2060);
    camp(['wolf', 'wolf', 'wolf'], 2000, 1250);
    camp(['bear', 'wolf'], 2800, 2000);
    camp(['spider', 'spider', 'bear'], 2000, 2800);
    camp(['tiger'], 1050, 2000);
  }

  spawn(type, x, y, camp) {
    const T = ENEMIES[type];
    const e = {
      type, T, x, y, r: T.r, hp: T.hp, maxHp: T.hp, poise: T.poise, maxPoise: T.poise, elem: T.elem,
      home: { x, y }, camp, aggro: false, atk: null, cds: {}, thinkT: rand(0.3, 1), orbit: Math.random() < 0.5 ? 1 : -1,
      stagT: 0, freezeT: 0, rootT: 0, markT: 0, burn: 0, burnT: 0, burnTick: 0, slowT: 0, slowF: 1, kx: 0, ky: 0, flash: 0, windMul: 1, phase2: false,
      sprite: this.add.image(x, y, T.img ? `en_${type}` : 'dummy3').setDepth(T.boss ? 3 : 2),
    };
    this.enemies.push(e);
    return e;
  }

  // ---------- 主迴圈 ----------
  update(_, deltaMs) {
    const raw = Math.min(deltaMs / 1000, 0.05);
    if (this.over) return;
    this.updateTexts(raw);
    if (this.hitstop > 0) { this.hitstop -= raw; this.draw(); return; }
    if (this.slowmo > 0) this.slowmo -= raw;
    const ets = this.slowmo > 0 ? 0.25 : 1;
    const dt = raw, edt = raw * ets;
    this.t += dt;
    this.updatePlayer(dt);
    this.updateEnemies(edt);
    this.updatePProj(dt);
    this.updateEProj(edt);
    this.updateAreas(dt, edt);
    this.updateParts(dt);
    this.draw();
    setIntensity(this.enemies.some(e => e.T.boss && e.aggro && e.hp > 0) ? 1 : 0);
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 1 / 15; hud.update(this); }
  }

  updatePlayer(dt) {
    const P = this.P, k = this.keys, JD = Phaser.Input.Keyboard.JustDown, ptr = this.input.activePointer, C = P.cls;
    ptr.updateWorldPoint(this.cameras.main);
    this.aim = Math.atan2(ptr.worldY - P.y, ptr.worldX - P.x);
    const ad = Math.min(560, Math.hypot(ptr.worldX - P.x, ptr.worldY - P.y));
    this.aimPt = { x: P.x + Math.cos(this.aim) * ad, y: P.y + Math.sin(this.aim) * ad };
    const L = ptr.leftButtonDown(), R = ptr.rightButtonDown();
    const Lp = L && !this.prevL, Lr = !L && this.prevL, Rp = R && !this.prevR;
    this.prevL = L; this.prevR = R;

    // 計時
    P.dodgeCd -= dt; P.inv -= dt; P.stunT -= dt; P.rootT -= dt; P.skillCd -= dt; P.fireCd -= dt; P.parry -= dt; P.comboT -= dt;
    P.stDelay -= dt;
    if (P.stDelay <= 0) P.st = Math.min(P.maxSt, P.st + 45 * dt);
    if (P.comboT <= 0 && !P.act) P.comboIdx = 0;
    if (P.armorT > 0) {
      P.armorT -= dt; P.pulseT -= dt;
      if (P.pulseT <= 0) { P.pulseT = 1; this.hitCircle(P.x, P.y, 170, C.ult.dmg, { poise: 25, kb: 260 }); this.ringFx(P.x, P.y, 170, ELEM_HEX['土']); sfx.slam(); }
    }
    if (JD(k.M)) hud.toast(toggleMute() ? '已靜音' : '已開啟聲音', '#999');
    if (JD(k.B)) hud.toast(toggleBgm() ? '背景音樂：開' : '背景音樂：關', '#999');

    // 閃避
    let mx = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown);
    let my = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown);
    if (JD(k.SPACE) && P.dodgeCd <= 0 && P.st >= 22 && P.stunT <= 0 && P.dashT <= 0) {
      const a = mx || my ? Math.atan2(my, mx) : this.aim;
      P.dvx = Math.cos(a) * 1250; P.dvy = Math.sin(a) * 1250;
      P.dashT = 0.16; P.inv = 0.26; P.dodgeAt = this.t; P.dodgeCd = 0.32;
      P.st -= 22; P.stDelay = 0.6;
      P.act = null; P.charge = -1;
      if (P.elem === '金') P.critNext = true;
      sfx.dash();
    }

    // 移動
    if (P.dashT > 0) {
      P.dashT -= dt;
      P.x += P.dvx * dt; P.y += P.dvy * dt;
      this.part(P.x, P.y, 0, 0, ELEM_HEX[P.elem], 10, 0.2);
    } else if (P.stunT <= 0 && P.rootT <= 0 && (mx || my)) {
      let mul = P.act ? P.act.move : 1;
      if (P.charge >= 0) mul = Math.min(mul, C.basic.move);
      const l = Math.hypot(mx, my);
      P.x += mx / l * P.speed * mul * dt; P.y += my / l * P.speed * mul * dt;
    }
    P.x = clamp(P.x, 20, W - 20); P.y = clamp(P.y, 20, W - 20);
    P.sprite.setPosition(P.x, P.y).setFlipX(Math.cos(this.aim) * (PX_FACE[C.img] || 1) < 0);
    P.sprite.setAlpha(P.inv > 0 ? 0.55 : 1);

    // 動作
    if (P.act) {
      const a = P.act;
      a.t += dt;
      if (!a.fired && a.t >= a.wind) { a.fired = true; a.fire(); }
      if (a.lungeT > 0) { a.lungeT -= dt; P.x += Math.cos(a.ang) * a.lungeV * dt; P.y += Math.sin(a.ang) * a.lungeV * dt; }
      if (a.t >= a.wind + a.rec) { P.act = null; if (a.combo) P.comboT = C.basic.window; }
    }
    const free = !P.act && P.stunT <= 0 && P.dashT <= 0;

    // 普攻
    if (P.elem === '木') {
      if (L && P.fireCd <= 0 && P.stunT <= 0 && P.dashT <= 0 && !P.act) { P.fireCd = C.basic.rate; this.basicWood(); }
    } else if (P.elem === '火') {
      if (L && free && P.charge < 0) P.charge = 0;
      if (P.charge >= 0) {
        P.charge += dt;
        if (Lr || P.stunT > 0) { if (P.stunT <= 0) this.basicFire(P.charge); P.charge = -1; }
      }
    } else if (L && free) this.basicCombo();

    // 戰技
    if (Rp && P.skillCd <= 0 && P.stunT <= 0 && P.dashT <= 0 && (!P.act || P.elem === '水')) {
      if (P.mp < C.skill.cost) hud.toast('真元不足', '#3aa7c7');
      else { P.mp -= C.skill.cost; P.skillCd = C.skill.cd; P.charge = -1; this.castSkill(); }
    }
    if (JD(k.E)) hud.toast('E 格戰技要在地圖上撿到（第三階段）', '#999');
    // 大招
    if (JD(k.Q)) {
      if (P.ult < 100) hud.toast(`大招氣 ${Math.floor(P.ult)}%`, '#ffd98a');
      else if (P.stunT <= 0 && P.dashT <= 0) { P.ult = 0; P.act = null; P.charge = -1; this.castUlt(); }
    }
    // 丹藥
    if (JD(k.R)) {
      if (P.flask <= 0) hud.toast('丹藥用完了，回篝火補充', '#e05555');
      else if (free) {
        P.flask--;
        this.startAct({ wind: 0.45, rec: 0.15, move: 0.3, fire: () => { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.4); this.burst(P.x, P.y, 0x7fffa0, 16, 120, 3, 0.5); sfx.item(); } });
      }
    }
    // F：處決 > 篝火
    this.execTarget = this.enemies.find(e => e.stagT > 0 && !e.T.dummy && d2(e.x, e.y, P.x, P.y) < (e.r + 70) ** 2) || null;
    this.nearFire = d2(P.x, P.y, this.bonfire.x, this.bonfire.y) < 90 * 90;
    if (JD(k.F)) {
      if (this.execTarget && P.stunT <= 0) this.execute(this.execTarget);
      else if (this.nearFire) this.rest();
    }
  }

  startAct(o) { this.P.act = { t: 0, fired: false, move: 0.5, ang: this.aim, ...o }; }

  // ---------- 普攻 ----------
  basicCombo() {
    const P = this.P, C = P.cls, steps = C.basic.steps;
    const i = P.comboT > 0 ? P.comboIdx : 0;
    const s = steps[i];
    P.comboIdx = (i + 1) % steps.length;
    const ang = this.assist(this.aim, s.range + 60);
    this.startAct({
      wind: s.wind, rec: s.rec, move: C.basic.move, combo: true, ang, armor: P.elem === '土',
      fire: () => {
        if (s.lunge) { P.act.lungeT = 0.08; P.act.lungeV = s.lunge / 0.08; }
        this.slashFx(P.x, P.y, ang, s.range, s.half, ELEM_HEX[P.elem], s.heavy);
        const n = this.hitArc(P.x, P.y, ang, s.range, s.half, s.dmg, { poise: s.poise, basic: true, heavy: s.heavy, kb: s.heavy ? 220 : 90 });
        sfx.shoot(P.elem);
        if (n && s.heavy) this.hitstop = 0.05;
      },
    });
  }

  basicWood() {
    const P = this.P, C = P.cls.basic;
    this.shootP({ x: P.x, y: P.y, ang: this.aim + rand(-0.04, 0.04), speed: C.speed, dmg: C.dmg, poise: C.poise, life: 1.1, r: 8, tex: 'leaf_木', homing: 5.5, basic: true, trail: 0x5cc96b });
    sfx.shoot('木');
  }

  basicFire(charge) {
    const P = this.P, tiers = P.cls.basic.tiers;
    let T = tiers[0];
    for (const t of tiers) if (charge >= t.t) T = t;
    const ang = this.assist(this.aim, 600);
    this.startAct({ wind: 0.04, rec: T.heavy ? 0.3 : 0.12, move: 0.6, fire: () => {
      this.shootP({ x: P.x, y: P.y, ang, speed: T.speed, dmg: T.dmg, poise: T.poise, life: 1.3, r: 9 + (T.R ? 4 : 0), tex: 'fire_火', explode: T.R, burn: T.burn, basic: true, heavy: T.heavy, trail: 0xff8a2a, scale: T.heavy ? 1.8 : T.R ? 1.3 : 1 });
      sfx.shoot('火');
    } });
  }

  // 輕微自動瞄準：滑鼠方向附近有敵人就轉向他
  assist(ang, range) {
    const P = this.P;
    let best = null, bd = 0.35;
    for (const e of this.enemies) {
      if (e.hp <= 0 || d2(e.x, e.y, P.x, P.y) > range * range) continue;
      const df = angDiff(Math.atan2(e.y - P.y, e.x - P.x), ang);
      if (df < bd) { bd = df; best = e; }
    }
    return best ? Math.atan2(best.y - P.y, best.x - P.x) : ang;
  }

  // ---------- 戰技 ----------
  castSkill() {
    const P = this.P, C = P.cls, S = C.skill;
    switch (P.elem) {
      case '金': {
        const ang = this.aim, hit = new Set();
        this.startAct({ wind: 0.06, rec: 0.22, move: 0, ang, fire: () => {
          P.dashT = 0.17; P.dvx = Math.cos(ang) * 1530; P.dvy = Math.sin(ang) * 1530; P.inv = 0.22;
          P.act.sweep = hit;
        } });
        // 衝刺路徑上的命中在 update 中檢查
        this.dashHit = { hit, until: this.t + 0.32, dmg: S.dmg, poise: S.poise };
        sfx.dash();
        break;
      }
      case '木':
        this.shootP({ x: P.x, y: P.y, ang: this.assist(this.aim, 600), speed: 520, dmg: S.dmg, poise: S.poise, life: 1.3, r: 10, tex: 'leaf_木', root: 2.5, scale: 1.6, trail: 0x2a8a3a });
        sfx.shoot('木');
        break;
      case '水':
        P.act = null; P.parry = 0.35;
        this.startAct({ wind: 0.35, rec: 0.2, move: 0.2, fire: () => {} });
        break;
      case '火': {
        const pt = { ...this.aimPt };
        this.areas.push({ own: 'p', kind: 'zone', x: pt.x, y: pt.y, R: 110, life: 3, max: 3, tick: 0.4, tickT: 0, dmg: S.dmg, poise: 4, burn: 1, color: ELEM_HEX['火'] });
        sfx.shoot('火');
        break;
      }
      case '土':
        this.startAct({ wind: 0.35, rec: 0.55, move: 0.1, armor: true, fire: () => {
          this.hitCircle(P.x, P.y, 160, S.dmg, { poise: S.poise, kb: 380, heavy: true });
          this.ringFx(P.x, P.y, 160, ELEM_HEX['土']);
          this.cameras.main.shake(160, 0.006);
          sfx.slam(); this.hitstop = 0.06;
        } });
        break;
    }
  }

  castUlt() {
    const P = this.P, C = P.cls, U = C.ult;
    hud.banner(U.name);
    switch (P.elem) {
      case '金': {
        const pt = { ...this.aimPt };
        for (let i = 0; i < 14; i++) {
          const a = rand(0, Math.PI * 2), r = rand(0, 130);
          this.areas.push({ own: 'p', kind: 'drop', x: pt.x + Math.cos(a) * r, y: pt.y + Math.sin(a) * r, R: 42, delay: 0.25 + i * 0.06, max: 0.25 + i * 0.06, dmg: U.dmg, poise: 12, color: ELEM_HEX['金'], sword: true });
        }
        break;
      }
      case '木': {
        const pt = { ...this.aimPt };
        this.areas.push({ own: 'p', kind: 'zone', x: pt.x, y: pt.y, R: 230, life: 7, max: 7, tick: 0.5, tickT: 0, dmg: U.dmg, poise: 3, slow: 0.4, color: ELEM_HEX['木'] });
        break;
      }
      case '水':
        for (const e of this.enemies) if (e.hp > 0 && d2(e.x, e.y, P.x, P.y) < 320 * 320) { this.hurtE(e, U.dmg, { poise: 0 }); e.freezeT = 3.5; e.atk = null; }
        this.ringFx(P.x, P.y, 320, ELEM_HEX['水']);
        sfx.slow();
        break;
      case '火': {
        const pt = { ...this.aimPt };
        this.areas.push({ own: 'p', kind: 'drop', x: pt.x, y: pt.y, R: 240, delay: 1.0, max: 1.0, dmg: U.dmg, poise: 120, burn: 5, color: ELEM_HEX['火'], meteor: true });
        this.startAct({ wind: 1.0, rec: 0.25, move: 0, fire: () => {} });
        break;
      }
      case '土':
        P.armorT = 7; P.pulseT = 0;
        break;
    }
    sfx.roar();
  }

  // ---------- 命中判定 ----------
  hitArc(x, y, ang, range, half, dmg, o) {
    let n = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dd = Math.sqrt(d2(e.x, e.y, x, y));
      if (dd > range + e.r) continue;
      if (dd > e.r && angDiff(Math.atan2(e.y - y, e.x - x), ang) > half) continue;
      this.hurtE(e, dmg, { ...o, kx: x, ky: y }); n++;
    }
    return n;
  }

  hitCircle(x, y, R, dmg, o) {
    let n = 0;
    for (const e of this.enemies) if (e.hp > 0 && d2(e.x, e.y, x, y) < (R + e.r) ** 2) { this.hurtE(e, dmg, { ...o, kx: x, ky: y }); n++; }
    return n;
  }

  hurtE(e, base, o = {}) {
    const P = this.P;
    if (e.hp <= 0) return;
    let m = elemMult(P.elem, e.elem), crit = false;
    if (P.elem === '金' && (e.markT > 0 || e.hp < e.maxHp * 0.4)) m *= 1.25;
    if (P.elem === '木' && e.T.fast) m *= 1.3;
    if (e.stagT > 0) m *= 1.3;
    if (o.basic && P.critNext) { m *= 1.5; crit = true; P.critNext = false; }
    const dmg = base * m * rand(0.95, 1.05);
    e.hp -= dmg;
    if (e.T.dummy) { this.dps.push([this.t, dmg]); e.hp = e.maxHp; }
    e.flash = 0.07; e.sprite.setTintFill(0xffffff);
    this.burst(e.x, e.y, ELEM_HEX[P.elem], 3, 150, 2.5, 0.25);
    sfx.hit();
    if (!e.aggro) this.alert(e);
    if (o.poise && e.stagT <= 0) {
      e.poise -= o.poise * (o.exec ? 0 : 1);
      if (e.poise <= 0) this.stagger(e);
    }
    if (o.burn) { e.burn = Math.min(6, e.burn + o.burn); e.burnT = 4; }
    if (o.root) e.rootT = o.root;
    if (o.mark) e.markT = o.mark;
    if (o.slow) { e.slowT = 0.3; e.slowF = o.slow; }
    if (o.kb && !e.T.boss && !e.T.dummy && e.stagT <= 0) {
      const a = Math.atan2(e.y - o.ky, e.x - o.kx);
      e.kx += Math.cos(a) * o.kb; e.ky += Math.sin(a) * o.kb;
    }
    if (o.basic) {
      P.mp = Math.min(P.maxMp, P.mp + 4);
      if (P.elem === '水') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.006);
    }
    P.ult = Math.min(100, P.ult + dmg * 0.07);
    if (crit || o.heavy || o.exec) this.popText(e.x, e.y - e.r - 10, `${Math.round(dmg)}${crit ? '!' : ''}`, crit ? '#ffd24a' : '#ffffff', crit || o.exec ? 22 : 16);
    if (e.hp <= 0) this.kill(e);
  }

  stagger(e) {
    e.stagT = e.T.boss ? 3.2 : 2.6;
    e.poise = e.maxPoise;
    e.atk = null;
    this.popText(e.x, e.y - e.r - 26, '破綻', '#ffb030', 22);
    sfx.warn();
  }

  execute(e) {
    const P = this.P;
    const dmg = e.T.boss ? e.maxHp * 0.12 : Math.max(e.maxHp * 0.45, 160);
    P.x = e.x - Math.cos(this.aim) * (e.r + 24); P.y = e.y - Math.sin(this.aim) * (e.r + 24);
    P.inv = 0.5;
    e.stagT = 0;
    this.hurtE(e, dmg, { exec: true, heavy: true });
    this.burst(e.x, e.y, 0xffd24a, 30, 300, 4, 0.6);
    this.popText(e.x, e.y - e.r - 34, '處決', '#ff5050', 28);
    this.hitstop = 0.18;
    this.cameras.main.shake(220, 0.01);
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.05);
    P.ult = Math.min(100, P.ult + 15);
    sfx.slam();
  }

  alert(e) {
    if (e.T.dummy) return;
    e.aggro = true;
    if (e.camp) for (const o of e.camp.members) if (o.hp > 0) o.aggro = true;
    if (e.T.boss && !e.announced) { e.announced = true; hud.banner(e.T.name); sfx.roar(); }
  }

  kill(e) {
    e.hp = 0;
    e.sprite.destroy();
    this.burst(e.x, e.y, ELEM_HEX[e.elem], e.T.boss ? 60 : 16, e.T.boss ? 340 : 200, 3.5, 0.7);
    sfx.kill();
    if (e.T.boss) { hud.banner('妖王伏誅'); sfx.bossDie(); }
  }

  // 玩家被打：回傳是否真的受傷
  hitPlayer(dmg, src) {
    const P = this.P;
    if (P.inv > 0) {
      if (this.t - P.dodgeAt < 0.2 && this.slowmo <= 0) this.perfectDodge();
      return false;
    }
    if (P.parry > 0) {
      P.parry = 0; P.inv = 0.4; P.act = null;
      P.mp = Math.min(P.maxMp, P.mp + 30);
      if (src && src.hp > 0) { this.stagger(src); src.freezeT = 1.5; }
      this.popText(P.x, P.y - 40, '彈反', '#7fd0ff', 24);
      this.ringFx(P.x, P.y, 60, ELEM_HEX['水']);
      this.hitstop = 0.12;
      sfx.craft();
      return false;
    }
    const dr = P.armorT > 0 ? 0.3 : 1;
    P.hp -= dmg * dr;
    this.cameras.main.shake(120, 0.005);
    sfx.hurt();
    const armored = P.armorT > 0 || (P.act && P.act.armor);
    if (!armored) {
      P.stunT = 0.28; P.act = null; P.charge = -1;
      if (src) { const a = Math.atan2(P.y - src.y, P.x - src.x); P.x += Math.cos(a) * 30; P.y += Math.sin(a) * 30; }
    }
    if (P.hp <= 0) { P.hp = 0; this.gameOver(); }
    return true;
  }

  perfectDodge() {
    const P = this.P;
    this.slowmo = 1.1;
    P.critNext = true;
    P.mp = Math.min(P.maxMp, P.mp + 10);
    this.popText(P.x, P.y - 44, '神識・完美閃避', '#c0a0ff', 20);
    sfx.slow();
  }

  rest() {
    const P = this.P;
    P.hp = P.maxHp; P.flask = P.flaskMax; P.mp = P.maxMp; P.st = P.maxSt;
    this.spawnAll();
    this.burst(this.bonfire.x, this.bonfire.y, 0xff9a3c, 30, 200, 3, 0.7);
    hud.toast('在篝火旁休息：肉身、丹藥、真元回滿，妖獸重新出現', '#ff9a3c');
  }

  // ---------- 妖獸 AI ----------
  updateEnemies(dt) {
    const P = this.P;
    // 同時最多 3 隻進攻（妖王另計），最多 2 隻同時出招
    const aggro = this.enemies.filter(e => e.hp > 0 && e.aggro && !e.T.boss).sort((a, b) => d2(a.x, a.y, P.x, P.y) - d2(b.x, b.y, P.x, P.y));
    const engaged = new Set(aggro.slice(0, 3));
    let attacking = this.enemies.filter(e => e.hp > 0 && e.atk && !e.T.boss).length;
    if (this.dashHit && this.t < this.dashHit.until) {
      for (const e of this.enemies) if (e.hp > 0 && !this.dashHit.hit.has(e) && d2(e.x, e.y, P.x, P.y) < (e.r + 30) ** 2) {
        this.dashHit.hit.add(e);
        this.hurtE(e, this.dashHit.dmg, { poise: this.dashHit.poise, mark: 6, heavy: true });
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.flash > 0 && (e.flash -= dt) <= 0) e.sprite.clearTint();
      e.markT -= dt; e.rootT -= dt; e.slowT -= dt;
      if (e.slowT <= 0) e.slowF = 1;
      for (const k in e.cds) e.cds[k] -= dt;
      if (e.burn > 0) {
        e.burnT -= dt; e.burnTick -= dt;
        if (e.burnTick <= 0) { e.burnTick = 0.5; e.hp -= e.burn * 1.5; this.part(e.x + rand(-8, 8), e.y - 10, 0, -40, 0xff6a3d, 3, 0.4); if (e.hp <= 0) { this.kill(e); continue; } }
        if (e.burnT <= 0) e.burn = 0;
      }
      if (e.T.dummy) { e.sprite.setPosition(e.x, e.y); continue; }
      // 第二階段
      if (e.T.phase2 && !e.phase2 && e.hp < e.maxHp * 0.5) {
        e.phase2 = true; e.windMul = 0.8; e.speedMul = 1.15;
        hud.banner(`${e.T.name}・狂怒`); sfx.roar(); this.cameras.main.shake(400, 0.01);
      }
      e.kx *= 0.86; e.ky *= 0.86;
      if (e.stagT > 0 || e.freezeT > 0) {
        e.stagT -= dt; e.freezeT -= dt;
        e.x += e.kx * dt; e.y += e.ky * dt;
        e.sprite.setPosition(e.x + (e.stagT > 0 ? Math.sin(this.t * 40) * 2 : 0), e.y);
        e.sprite.setTint(e.freezeT > 0 ? 0x88ccff : 0xffcc66);
        continue;
      } else if (e.flash <= 0) e.sprite.clearTint();

      const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (!e.aggro && d < e.T.sight) this.alert(e);
      let vx = 0, vy = 0;
      const sp = e.T.speed * (e.speedMul || 1) * e.slowF * (e.rootT > 0 ? 0 : 1);
      if (e.atk) {
        this.updateAtk(e, dt);
      } else if (!e.aggro) {
        e.wanderT = (e.wanderT || 0) - dt;
        if (e.wanderT <= 0) { e.wanderT = rand(2, 4); e.wx = e.home.x + rand(-80, 80); e.wy = e.home.y + rand(-80, 80); }
        const wx = e.wx - e.x, wy = e.wy - e.y, wl = Math.hypot(wx, wy);
        if (wl > 10) { vx = wx / wl * sp * 0.3; vy = wy / wl * sp * 0.3; }
      } else {
        const isEng = e.T.boss || engaged.has(e);
        const want = isEng ? e.T.pref : 300;
        if (d > want + 30) { vx = dx / d * sp; vy = dy / d * sp; }
        else if (d < want - 40) { vx = -dx / d * sp * 0.7; vy = -dy / d * sp * 0.7; }
        else { vx = -dy / d * sp * 0.45 * e.orbit; vy = dx / d * sp * 0.45 * e.orbit; }
        e.thinkT -= dt;
        if (isEng && e.thinkT <= 0 && (e.T.boss || attacking < 2)) {
          e.thinkT = rand(0.25, 0.6) * (e.windMul || 1);
          const band = d < e.T.pref + 70 ? 'near' : d < 380 ? 'mid' : 'far';
          const pool = Object.entries({ ...e.T.moves, ...(e.phase2 ? e.T.phase2 : {}) }).filter(([id, m]) => m.band === band && !(e.cds[id] > 0));
          if (pool.length && (band !== 'far' || d < 650)) {
            let r = Math.random() * pool.reduce((a, [, m]) => a + m.w, 0), choice = pool[0];
            for (const p of pool) { r -= p[1].w; if (r <= 0) { choice = p; break; } }
            this.startAtk(e, choice[0], choice[1]);
            if (!e.T.boss) attacking++;
          }
        }
      }
      // 離巢太遠就回去
      if (e.aggro && !e.T.boss && d2(e.x, e.y, e.home.x, e.home.y) > 1400 * 1400 && d > 900) { e.aggro = false; e.atk = null; e.hp = e.maxHp; }
      e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt;
      // 分離
      for (const o of this.enemies) {
        if (o === e || o.hp <= 0) continue;
        const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r, dd = ox * ox + oy * oy;
        if (dd < rr * rr && dd > 0.01) { const l = Math.sqrt(dd), push = (rr - l) * 0.5; e.x += ox / l * push; e.y += oy / l * push; }
      }
      e.x = clamp(e.x, 20, W - 20); e.y = clamp(e.y, 20, W - 20);
      e.sprite.setPosition(e.x, e.y);
      const face = Math.abs(vx) > 5 ? vx : dx, fc = PX_FACE[e.T.img] || 0;
      if (fc) e.sprite.setFlipX(face * fc < 0);
    }
    if (this.enemies.some(e => e.hp <= 0)) this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  startAtk(e, id, m) {
    if (m.cd) e.cds[id] = m.cd;
    e.atk = { id, m, i: 0, phase: 'wind', t: 0, wind: this.windOf(e, m.steps[0]), ang: Math.atan2(this.P.y - e.y, this.P.x - e.x), tx: this.P.x, ty: this.P.y };
  }

  windOf(e, st) { return rand(st.wind[0], st.wind[1]) * (e.windMul || 1); }

  updateAtk(e, dt) {
    const P = this.P, a = e.atk, st = a.m.steps[a.i];
    a.t += dt;
    if (a.phase === 'wind') {
      const track = st.track || 0.6;
      if (a.t < a.wind * track) { a.ang = Math.atan2(P.y - e.y, P.x - e.x); a.tx = P.x; a.ty = P.y; }
      if (a.t >= a.wind) this.resolveStep(e, st);
    } else if (a.phase === 'dash') {
      const v = st.len / 0.18;
      e.x += Math.cos(a.ang) * v * dt; e.y += Math.sin(a.ang) * v * dt;
      if (!a.hitP && d2(e.x, e.y, P.x, P.y) < (e.r + P.r + st.width * 0.3) ** 2) { a.hitP = true; this.hitPlayer(st.dmg, e); }
      this.part(e.x, e.y, 0, 0, ELEM_HEX[e.elem], e.r * 0.5, 0.25);
      if (a.t >= 0.18) this.nextStep(e);
    } else if (a.phase === 'hop') {
      e.x += Math.cos(a.ang + Math.PI) * st.dist / 0.2 * dt; e.y += Math.sin(a.ang + Math.PI) * st.dist / 0.2 * dt;
      if (a.t >= 0.2) this.nextStep(e);
    } else if (a.phase === 'rec') {
      if (a.t >= a.m.rec) e.atk = null;
    }
  }

  resolveStep(e, st) {
    const P = this.P, a = e.atk;
    a.t = 0;
    switch (st.k) {
      case 'arc': {
        const dd = Math.sqrt(d2(P.x, P.y, e.x, e.y));
        if (dd < st.range + P.r && angDiff(Math.atan2(P.y - e.y, P.x - e.x), a.ang) < st.half) this.hitPlayer(st.dmg, e);
        this.slashFx(e.x, e.y, a.ang, st.range, st.half, 0xff4040, false);
        break;
      }
      case 'line':
        if (st.dash) { a.phase = 'dash'; a.hitP = false; sfx.dash(); return; }
        break;
      case 'circle': {
        const cx = st.at === 'self' ? e.x : a.tx, cy = st.at === 'self' ? e.y : a.ty;
        if (d2(P.x, P.y, cx, cy) < (st.R + P.r) ** 2) this.hitPlayer(st.dmg, e);
        this.ringFx(cx, cy, st.R, 0xff4040);
        if (st.rock) this.burst(cx, cy, 0x8a6136, 14, 240, 3, 0.5);
        sfx.slam();
        break;
      }
      case 'ring':
        this.areas.push({ own: 'e', kind: 'ring', x: e.x, y: e.y, r: e.r, R: st.R, speed: st.speed, dmg: st.dmg, src: e, hit: false });
        sfx.roar();
        break;
      case 'proj':
        for (let i = 0; i < st.n; i++) {
          const ang = a.ang + (st.n > 1 ? (i / (st.n - 1) - 0.5) * st.spread * 2 : 0);
          this.shootE({ x: e.x, y: e.y, ang, speed: st.speed, dmg: st.dmg, r: st.size, tex: st.tex, root: st.root, src: e });
        }
        sfx.barrage();
        break;
      case 'hop':
        a.phase = 'hop'; return;
      case 'pool':
        this.areas.push({ own: 'e', kind: 'pool', x: a.tx, y: a.ty, R: st.R, life: st.life, tick: 0.5, tickT: 0, dmg: st.dmg, src: e });
        break;
      case 'summon':
        for (let i = 0; i < st.n; i++) { const w = this.spawn(st.type, e.x + rand(-80, 80), e.y + rand(-80, 80)); w.aggro = true; }
        sfx.roar();
        break;
    }
    this.nextStep(e);
  }

  nextStep(e) {
    const a = e.atk;
    a.i++; a.t = 0;
    if (a.i >= a.m.steps.length) { a.phase = 'rec'; return; }
    a.phase = 'wind'; a.wind = this.windOf(e, a.m.steps[a.i]);
  }

  // ---------- 投射物與區域 ----------
  shootP(o) {
    const p = { pierce: 0, r: 7, hit: new Set(), ...o, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed };
    p.sprite = this.add.image(o.x, o.y, o.tex).setDepth(5).setRotation(o.ang).setScale(o.scale || 1);
    this.pp.push(p);
  }

  shootE(o) {
    const p = { ...o, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, life: 3 };
    p.sprite = this.add.image(o.x, o.y, o.tex).setDepth(5).setRotation(o.ang).setScale(o.r / 7);
    this.ep.push(p);
  }

  updatePProj(dt) {
    for (const p of this.pp) {
      p.life -= dt;
      if (p.homing) {
        let tg = null, bd = 300 * 300;
        for (const e of this.enemies) { if (e.hp <= 0 || p.hit.has(e)) continue; const dd = d2(e.x, e.y, p.x, p.y); if (dd < bd) { bd = dd; tg = e; } }
        if (tg) {
          const cur = Math.atan2(p.vy, p.vx), want = Math.atan2(tg.y - p.y, tg.x - p.x);
          const na = cur + clamp(Phaser.Math.Angle.Wrap(want - cur), -p.homing * dt, p.homing * dt);
          p.vx = Math.cos(na) * p.speed; p.vy = Math.sin(na) * p.speed; p.sprite.setRotation(na);
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);
      if (p.trail && Math.random() < 0.6) this.part(p.x, p.y, rand(-15, 15), rand(-15, 15), p.trail, p.r * 0.5, 0.2);
      for (const e of this.enemies) {
        if (e.hp <= 0 || p.hit.has(e) || d2(e.x, e.y, p.x, p.y) > (e.r + p.r) ** 2) continue;
        p.hit.add(e);
        if (p.explode) {
          this.hitCircle(p.x, p.y, p.explode, p.dmg, { poise: p.poise, burn: p.burn, basic: p.basic, heavy: p.heavy, kb: 160 });
          this.ringFx(p.x, p.y, p.explode, ELEM_HEX['火']);
          if (p.heavy) { this.hitstop = 0.06; this.cameras.main.shake(140, 0.006); }
          sfx.slam();
        } else this.hurtE(e, p.dmg, { poise: p.poise, burn: p.burn, root: p.root, basic: p.basic, heavy: p.heavy, kx: p.x - p.vx, ky: p.y - p.vy, kb: 60 });
        if (--p.pierce < 0) { p.life = 0; break; }
      }
      if (p.life <= 0) p.sprite.destroy();
    }
    this.pp = this.pp.filter(p => p.life > 0);
  }

  updateEProj(dt) {
    const P = this.P;
    for (const p of this.ep) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);
      if (d2(p.x, p.y, P.x, P.y) < (p.r + P.r) ** 2) {
        if (this.hitPlayer(p.dmg, null) && p.root) { P.rootT = p.root; hud.toast('被蛛網纏住了！', '#f0f0f0'); }
        if (P.inv <= 0 || P.parry > 0) p.life = 0;
      }
      if (p.life <= 0) p.sprite.destroy();
    }
    this.ep = this.ep.filter(p => p.life > 0);
  }

  updateAreas(dt, edt) {
    const P = this.P;
    for (const a of this.areas) {
      const t = a.own === 'e' ? edt : dt;
      switch (a.kind) {
        case 'zone':
          a.life -= t; a.tickT -= t;
          if (a.tickT <= 0) {
            a.tickT = a.tick;
            this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: a.poise, burn: a.burn, slow: a.slow });
          }
          if (a.slow) for (const e of this.enemies) if (d2(e.x, e.y, a.x, a.y) < a.R * a.R) { e.slowT = 0.3; e.slowF = a.slow; }
          if (Math.random() < 0.5) { const an = rand(0, Math.PI * 2), rr = rand(0, a.R); this.part(a.x + Math.cos(an) * rr, a.y + Math.sin(an) * rr, 0, rand(-60, -20), a.color, rand(2, 4), 0.6); }
          if (a.life <= 0) a.dead = true;
          break;
        case 'drop':
          a.delay -= t;
          if (a.delay <= 0) {
            this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: a.poise, burn: a.burn, heavy: a.meteor, kb: a.meteor ? 300 : 60 });
            this.ringFx(a.x, a.y, a.R, a.color);
            this.burst(a.x, a.y, a.color, a.meteor ? 50 : 8, a.meteor ? 380 : 140, 3.5, 0.5);
            if (a.meteor) { this.hitstop = 0.1; this.cameras.main.shake(400, 0.016); sfx.slam(); } else sfx.hit();
            a.dead = true;
          }
          break;
        case 'ring':
          a.r += a.speed * t;
          if (!a.hit && Math.abs(Math.sqrt(d2(P.x, P.y, a.x, a.y)) - a.r) < 22) { a.hit = true; this.hitPlayer(a.dmg, a.src); }
          if (a.r >= a.R) a.dead = true;
          break;
        case 'pool':
          a.life -= t; a.tickT -= t;
          if (a.tickT <= 0) { a.tickT = a.tick; if (d2(P.x, P.y, a.x, a.y) < (a.R + P.r) ** 2) this.hitPlayer(a.dmg, null); }
          if (Math.random() < 0.3) this.part(a.x + rand(-a.R, a.R) * 0.7, a.y + rand(-a.R, a.R) * 0.7, 0, rand(-40, -15), 0x8be02c, 3, 0.6);
          if (a.life <= 0) a.dead = true;
          break;
        case 'fx':
          a.life -= dt;
          if (a.life <= 0) a.dead = true;
          break;
      }
    }
    this.areas = this.areas.filter(a => !a.dead);
  }

  // ---------- 繪製 ----------
  draw() {
    const g = this.tele, f = this.fx, P = this.P;
    g.clear(); f.clear();
    // 篝火範圍
    g.fillStyle(0xff9a3c, 0.08).fillCircle(this.bonfire.x, this.bonfire.y, 90);
    // 妖獸預警
    for (const e of this.enemies) {
      const a = e.atk;
      if (!a || a.phase !== 'wind') continue;
      const st = a.m.steps[a.i], k = clamp(a.t / a.wind, 0, 1), col = 0xff3030;
      switch (st.k) {
        case 'arc':
          g.fillStyle(col, 0.12 + 0.3 * k).slice(e.x, e.y, st.range, a.ang - st.half, a.ang + st.half).fillPath();
          g.lineStyle(2, col, 0.8).slice(e.x, e.y, st.range, a.ang - st.half, a.ang + st.half).strokePath();
          g.fillStyle(col, 0.35).slice(e.x, e.y, st.range * k, a.ang - st.half, a.ang + st.half).fillPath();
          break;
        case 'line': {
          const ex = e.x + Math.cos(a.ang) * st.len, ey = e.y + Math.sin(a.ang) * st.len;
          g.lineStyle(st.width, col, 0.12 + 0.25 * k).lineBetween(e.x, e.y, ex, ey);
          g.lineStyle(2, col, 0.7).strokeCircle(ex, ey, st.width / 2);
          break;
        }
        case 'circle': {
          const cx = st.at === 'self' ? e.x : a.tx, cy = st.at === 'self' ? e.y : a.ty;
          g.lineStyle(2, col, 0.85).strokeCircle(cx, cy, st.R);
          g.fillStyle(col, 0.1 + 0.3 * k).fillCircle(cx, cy, st.R * k);
          break;
        }
        case 'pool':
          g.lineStyle(2, 0x8be02c, 0.9).strokeCircle(a.tx, a.ty, st.R).fillStyle(0x8be02c, 0.25 * k).fillCircle(a.tx, a.ty, st.R * k);
          break;
        case 'proj':
          for (let i = 0; i < st.n; i++) {
            const ang = a.ang + (st.n > 1 ? (i / (st.n - 1) - 0.5) * st.spread * 2 : 0);
            g.lineStyle(2, col, 0.25 + 0.4 * k).lineBetween(e.x, e.y, e.x + Math.cos(ang) * 260, e.y + Math.sin(ang) * 260);
          }
          break;
        case 'ring':
          g.lineStyle(3, col, 0.3 + 0.5 * k).strokeCircle(e.x, e.y, e.r + 30 * k);
          break;
        case 'summon':
          g.lineStyle(3, 0xff3030, 0.6).strokeCircle(e.x, e.y, e.r + 40 * k);
          break;
      }
    }
    for (const a of this.areas) {
      switch (a.kind) {
        case 'zone': g.fillStyle(a.color, 0.16 * Math.min(1, a.life)).fillCircle(a.x, a.y, a.R); g.lineStyle(1, a.color, 0.5).strokeCircle(a.x, a.y, a.R); break;
        case 'drop':
          f.lineStyle(2, a.color, 0.9).strokeCircle(a.x, a.y, a.R);
          f.fillStyle(a.color, 0.3 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R);
          if (a.sword) f.lineStyle(3, 0xffffff, 0.9).lineBetween(a.x, a.y - 30 - a.delay * 300, a.x, a.y - a.delay * 300);
          break;
        case 'ring': f.lineStyle(6, 0xff6060, 0.8).strokeCircle(a.x, a.y, a.r); break;
        case 'pool': g.fillStyle(0x6ac020, 0.28 * Math.min(1, a.life)).fillCircle(a.x, a.y, a.R); break;
        case 'fx':
          if (a.arc) f.fillStyle(a.color, 0.55 * a.life / a.max).slice(a.x, a.y, a.R, a.ang - a.half, a.ang + a.half).fillPath();
          else f.lineStyle(4, a.color, 0.8 * a.life / a.max).strokeCircle(a.x, a.y, a.R * (1.1 - 0.1 * a.life / a.max));
          break;
      }
    }
    // 妖獸狀態
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.T.dummy) continue;
      if (e.aggro && !e.T.boss) {
        const w = e.r * 2.2;
        f.fillStyle(0x000000, 0.6).fillRect(e.x - w / 2, e.y - e.r - 14, w, 4);
        f.fillStyle(0xe05555, 1).fillRect(e.x - w / 2, e.y - e.r - 14, w * e.hp / e.maxHp, 4);
        f.fillStyle(0xffb030, 0.9).fillRect(e.x - w / 2, e.y - e.r - 9, w * e.poise / e.maxPoise, 2);
      }
      if (e.markT > 0) f.fillStyle(0xf2d16b, 1).fillTriangle(e.x, e.y - e.r - 30, e.x - 6, e.y - e.r - 40, e.x + 6, e.y - e.r - 40);
      if (e.stagT > 0) f.lineStyle(3, 0xffb030, 0.5 + 0.4 * Math.sin(this.t * 14)).strokeCircle(e.x, e.y, e.r + 10);
      if (e.rootT > 0) f.lineStyle(2, 0x5cc96b, 0.8).strokeCircle(e.x, e.y, e.r + 4);
    }
    if (this.execTarget) f.lineStyle(3, 0xff5050, 0.9).strokeCircle(this.execTarget.x, this.execTarget.y, this.execTarget.r + 16);
    // 玩家狀態
    if (P.parry > 0) f.lineStyle(3, 0x7fd0ff, 0.9).strokeCircle(P.x, P.y, 26);
    if (P.armorT > 0) f.lineStyle(4, 0xc08a4a, 0.5 + 0.3 * Math.sin(this.t * 10)).strokeCircle(P.x, P.y, 30);
    if (P.charge >= 0) {
      const tiers = P.cls.basic.tiers, lvl = tiers.filter(t => P.charge >= t.t).length;
      f.fillStyle(0xff8a2a, 0.8).fillCircle(P.x + Math.cos(this.aim) * 24, P.y + Math.sin(this.aim) * 24, 4 + lvl * 4);
      f.lineStyle(2, 0xffd24a, 0.8).strokeCircle(P.x, P.y, 20 + lvl * 6);
    }
    if (P.critNext) f.fillStyle(0xffd24a, 0.9).fillCircle(P.x, P.y - 30, 4);
    // 瞄準
    f.lineStyle(1, 0xffd98a, 0.22).lineBetween(P.x, P.y, this.aimPt.x, this.aimPt.y);
    f.lineStyle(2, 0xffd98a, 0.7).strokeCircle(this.aimPt.x, this.aimPt.y, 7);
    for (const p of this.parts) f.fillStyle(p.color, p.life / p.max).fillCircle(p.x, p.y, p.size * (0.4 + 0.6 * p.life / p.max));
    f.lineStyle(4, 0x6b2020, 0.8).strokeRect(0, 0, W, W);
  }

  slashFx(x, y, ang, R, half, color) { this.areas.push({ kind: 'fx', arc: true, x, y, R, ang, half, color, life: 0.12, max: 0.12 }); }
  ringFx(x, y, R, color) { this.areas.push({ kind: 'fx', x, y, R, color, life: 0.3, max: 0.3 }); }

  part(x, y, vx, vy, color, size, life) {
    if (this.parts.length > 500) return;
    this.parts.push({ x, y, vx, vy, color, size, life, max: life });
  }
  burst(x, y, color, n, speed, size, life) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(0.3, 1) * speed; this.part(x, y, Math.cos(a) * v, Math.sin(a) * v, color, size, life * rand(0.6, 1)); }
  }
  updateParts(dt) {
    const drag = Math.pow(0.05, dt);
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= drag; p.vy *= drag; }
    this.parts = this.parts.filter(p => p.life > 0);
  }

  popText(x, y, s, color, size) {
    const t = this.texts[this.textIdx];
    this.textIdx = (this.textIdx + 1) % this.texts.length;
    t.setText(s).setPosition(x, y).setColor(color).setFontSize(size).setVisible(true).setAlpha(1);
    t.life = 0.9;
  }
  updateTexts(dt) {
    for (const t of this.texts) {
      if (!t.visible) continue;
      t.life -= dt; t.y -= 30 * dt; t.setAlpha(Math.max(0, t.life / 0.9));
      if (t.life <= 0) t.setVisible(false);
    }
  }

  dpsNow() {
    const from = this.t - 5;
    this.dps = this.dps.filter(x => x[0] >= from);
    return this.dps.reduce((a, x) => a + x[1], 0) / 5;
  }

  gameOver() {
    this.over = true;
    sfx.lose();
    hud.over();
  }
}

// ---------- 介面（DOM） ----------
const hud = {
  start(s) {
    $('v3hud').classList.remove('hidden');
    $('over').classList.add('hidden');
    $('toasts').innerHTML = '';
    const C = s.P.cls;
    $('slots').innerHTML = [
      ['左鍵', C.basic.name, ''],
      ['右鍵', C.skill.name, `${C.skill.cost} 真元`],
      ['E', '（空）', '地圖上撿'],
      ['Q', C.ult.name, '大招'],
      ['R', '丹藥', ''],
    ].map(([k, n, c], i) => `<div class="slot" id="slot${i}"><div class="key">${k}</div><div class="nm">${n}</div><div class="lv">${c}</div><div class="cd"></div></div>`).join('');
    $('who').innerHTML = `<b style="color:${ELEM_CSS[s.P.elem]}">${s.P.elem}・${C.name}</b><span class="small">${C.passive}</span>`;
  },
  update(s) {
    const P = s.P;
    $('hpb').style.width = `${P.hp / P.maxHp * 100}%`; $('hpt').textContent = `肉身 ${Math.ceil(P.hp)} / ${P.maxHp}`;
    $('stb').style.width = `${P.st / P.maxSt * 100}%`;
    $('mpb').style.width = `${P.mp / P.maxMp * 100}%`; $('mpt').textContent = `真元 ${Math.floor(P.mp)}`;
    const cd = [0, Math.max(0, P.skillCd / P.cls.skill.cd), 1, 1 - P.ult / 100, P.flask ? 0 : 1];
    cd.forEach((v, i) => { const el = document.querySelector(`#slot${i} .cd`); if (el) el.style.width = `${v * 100}%`; });
    const u = document.querySelector('#slot3 .lv'); if (u) u.textContent = P.ult >= 100 ? '可施放！' : `${Math.floor(P.ult)}%`;
    const f = document.querySelector('#slot4 .lv'); if (f) f.textContent = `剩 ${P.flask} 瓶`;
    $('slowfx').classList.toggle('on', s.slowmo > 0);
    // 妖王血條
    const boss = s.enemies.find(e => e.T.boss && e.aggro && e.hp > 0);
    $('bossbar').classList.toggle('hidden', !boss);
    if (boss) {
      $('bossname').textContent = boss.T.name + (boss.phase2 ? '・狂怒' : '');
      $('bosshp').style.width = `${boss.hp / boss.maxHp * 100}%`;
      $('bosspoise').style.width = `${boss.poise / boss.maxPoise * 100}%`;
    }
    let pr = '';
    if (s.execTarget) pr = '<b style="color:#ff5050">[F] 處決</b>';
    else if (s.nearFire) pr = '<b style="color:#ff9a3c">[F] 篝火休息</b>（回滿、補丹藥、重置妖獸）';
    else { const dm = s.enemies.find(e => e.T.dummy && d2(e.x, e.y, P.x, P.y) < 400 * 400); if (dm) pr = `木樁 DPS <b style="color:#ffd98a">${Math.round(s.dpsNow())}</b>`; }
    $('prompt').innerHTML = pr;
  },
  toast(msg, color = '#ffd98a') {
    const d = document.createElement('div');
    d.className = 'toast'; d.style.borderLeftColor = color; d.innerHTML = msg;
    const box = $('toasts'); box.prepend(d);
    while (box.children.length > 5) box.lastChild.remove();
    setTimeout(() => d.remove(), 7000);
  },
  banner(text) { const b = $('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); },
  over() {
    const o = $('over'); o.classList.remove('hidden');
    o.innerHTML = '<h1>身死道消</h1><div>按 Enter 或點這裡重新選擇主修</div>';
    o.onclick = showSelect;
  },
};

// ---------- 職業選擇 ----------
let game = null;
function showSelect() {
  $('over').classList.add('hidden');
  $('v3hud').classList.add('hidden');
  const box = $('select');
  box.classList.remove('hidden');
  box.innerHTML = `<h1>選擇主修</h1><div class="cards">${ELEMS.map((e, i) => {
    const C = CLASSES[e];
    return `<div class="card" data-e="${e}" style="border-color:${ELEM_CSS[e]}">
      <div class="k">${i + 1}</div><h2 style="color:${ELEM_CSS[e]}">${e}・${C.name}</h2><div class="role">${C.role}</div>
      <p><b>普攻</b> ${C.basic.name}：${C.basic.desc}</p><p><b>戰技</b> ${C.skill.name}：${C.skill.desc}</p>
      <p><b>大招</b> ${C.ult.name}：${C.ult.desc}</p><p><b>被動</b> ${C.passive}</p><p class="small">肉身 ${C.hp}・遁速 ${C.speed}</p></div>`;
  }).join('')}</div><div class="small">WASD 移動・滑鼠瞄準・左鍵普攻・右鍵戰技・Q 大招・空白閃避（敵人出手瞬間閃＝完美閃避）・R 丹藥・F 處決/篝火</div>`;
  box.querySelectorAll('.card').forEach(el => el.onclick = () => start(el.dataset.e));
}

function start(e) {
  $('select').classList.add('hidden');
  window.__cls = e;
  if (!game) {
    game = window.game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game', backgroundColor: '#0b0d12',
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      scene: [Arena],
    });
  } else game.scene.getScene('arena').scene.restart({ cls: e });
}

window.addEventListener('keydown', ev => {
  if (!$('select').classList.contains('hidden')) {
    const i = +ev.key - 1;
    if (i >= 0 && i < 5) start(ELEMS[i]);
  } else if (ev.key === 'Enter' && !$('over').classList.contains('hidden')) showSelect();
});

showSelect();
