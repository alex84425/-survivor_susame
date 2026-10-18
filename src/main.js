// 修仙倖存者 — 主場景
import {
  ELEMS, ELEM_CSS, ELEM_DARK, ELEM_HEX, OVERCOMES, elemMult, REALMS, GRADE_CN, PARTS,
  SKILLS, SKILL_IDS, MAX_SKILLS, MAX_SKILL_LVL, ENEMY_TYPES, BOSS_TYPES, spawnTable, IMAGES, PX_FACE, randName, randSectName, randGongfaName, randEvilSect,
} from './data.js';
import { Hud } from './ui.js';
import { sfx, initAudio, toggleMute, toggleBgm, setIntensity } from './sfx.js';

const WORLD = 4000;
const CELL = 80;
const SECT_R = 140;
const MAX_ENEMIES = 120;
const params = new URLSearchParams(location.search);
const DURATION = (parseFloat(params.get('min')) || 30) * 60;

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- 貼圖 ----------
function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext(), w, h);
  t.refresh();
}

function glyph(scene, key, ch, size, fill, stroke, font, textColor = '#fff') {
  canvasTex(scene, key, size, size, c => {
    c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill(); c.lineWidth = 2; c.strokeStyle = stroke; c.stroke();
    if (ch) {
      c.fillStyle = textColor;
      c.font = `bold ${font}px "Microsoft JhengHei","PingFang TC",sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(ch, size / 2, size / 2 + 1);
    }
  });
}

// 圓框 + 圖片；圖片沒載到時退回文字
function portrait(scene, key, img, size, fill, stroke, ch, ring = 2) {
  if (scene.textures.exists('img_px_' + img) && fill) return pixelSprite(scene, key, img, size, stroke);
  if (!scene.textures.exists('img_' + img)) return glyph(scene, key, ch, size, fill, stroke, Math.round(size * 0.55), stroke);
  canvasTex(scene, key, size, size, c => {
    if (fill) {
      c.beginPath(); c.arc(size / 2, size / 2, size / 2 - ring, 0, Math.PI * 2);
      c.fillStyle = fill; c.fill();
      c.lineWidth = ring; c.strokeStyle = stroke; c.stroke();
    }
    const src = scene.textures.get('img_' + img).getSourceImage();
    c.imageSmoothingEnabled = !img.startsWith('px_');
    const pad = fill ? size * 0.12 : 0;
    c.drawImage(src, pad, pad, size - pad * 2, size - pad * 2);
  });
}

// 像素圖：不放圓框，腳下畫屬性色光圈，圖片放大填滿
function pixelSprite(scene, key, img, size, color) {
  const S = Math.round(size * 1.3);
  canvasTex(scene, key, S, S, c => {
    c.save();
    c.globalAlpha = 0.35; c.fillStyle = color;
    c.beginPath(); c.ellipse(S / 2, S * 0.88, S * 0.36, S * 0.09, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.9; c.lineWidth = 2; c.strokeStyle = color; c.stroke();
    c.restore();
    c.imageSmoothingEnabled = false;
    c.drawImage(scene.textures.get('img_px_' + img).getSourceImage(), 0, 0, S, S * 0.93);
  });
}

function blob(scene, key, w, h, color, glow = true) {
  canvasTex(scene, key, w, h, c => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, glow ? 'rgba(0,0,0,0)' : color);
    c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
  });
}

// 各種投射物（皆以朝右為正方向繪製）
function makeProjectiles(scene, e) {
  const col = ELEM_CSS[e];
  // 飛劍
  canvasTex(scene, `sw_${e}`, 36, 10, (c, w, h) => {
    c.shadowColor = col; c.shadowBlur = 4;
    const g = c.createLinearGradient(10, 0, w, 0); g.addColorStop(0, col); g.addColorStop(1, '#ffffff');
    c.fillStyle = g; c.beginPath(); c.moveTo(w - 1, h / 2); c.lineTo(11, 2); c.lineTo(11, h - 2); c.closePath(); c.fill();
    c.fillStyle = col; c.fillRect(8, 0, 3, h); c.fillRect(1, h / 2 - 1.5, 7, 3);
  });
  // 藤葉
  canvasTex(scene, `leaf_${e}`, 22, 12, (c, w, h) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, h / 2);
    c.quadraticCurveTo(w / 2, -3, w, h / 2); c.quadraticCurveTo(w / 2, h + 3, 0, h / 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, h / 2); c.lineTo(w - 3, h / 2); c.stroke();
  });
  // 冰稜
  canvasTex(scene, `ice_${e}`, 26, 10, (c, w, h) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(w, h / 2); c.lineTo(8, 0); c.lineTo(0, h / 2); c.lineTo(8, h); c.closePath(); c.fill();
    c.fillStyle = '#e8f6ff'; c.beginPath(); c.moveTo(w - 3, h / 2); c.lineTo(9, 3); c.lineTo(4, h / 2); c.lineTo(9, h - 3); c.closePath(); c.fill();
  });
  // 火球（亮核心 + 外焰）
  canvasTex(scene, `fire_${e}`, 22, 22, (c, w, h) => {
    const g = c.createRadialGradient(w / 2 + 3, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(0.3, '#ffd24a'); g.addColorStop(0.65, col); g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
  });
  // 符籙（路人、宗門用）
  canvasTex(scene, `fu_${e}`, 18, 10, (c, w, h) => {
    c.shadowColor = col; c.shadowBlur = 3;
    c.fillStyle = '#f3d77a'; c.fillRect(1, 1, w - 2, h - 2);
    c.strokeStyle = col; c.lineWidth = 1.5; c.strokeRect(1, 1, w - 2, h - 2);
    c.strokeStyle = '#c0202a'; c.lineWidth = 1.2; c.beginPath();
    c.moveTo(4, h / 2); c.lineTo(7, 3); c.lineTo(10, h - 3); c.lineTo(13, 3); c.lineTo(15, h / 2); c.stroke();
  });
  // 妖王彈幕（暗核亮邊）
  canvasTex(scene, `bb_${e}`, 18, 18, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#1a0010'); g.addColorStop(0.55, '#3a0a20'); g.addColorStop(0.75, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
  });
  blob(scene, `p_${e}`, 16, 16, col);
}

function makeTextures(scene) {
  canvasTex(scene, 'bgtile', 128, 128, c => {
    c.fillStyle = '#12151c'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#1a1e28'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 128, 128);
    c.fillStyle = '#1d2230';
    for (let i = 0; i < 6; i++) c.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  });
  portrait(scene, 'player', 'mage', 44, 'rgba(40,34,20,.85)', '#ffd98a', '修', 3);
  for (const e of ELEMS) {
    for (const [type, T] of Object.entries(ENEMY_TYPES)) {
      const size = Math.round(T.r * 2.5 + 6);
      portrait(scene, `e_${type}_${e}`, T.img, size, ELEM_DARK[e] + 'cc', ELEM_CSS[e], T.ch, T.boss ? 3.5 : 2);
    }
    makeProjectiles(scene, e);
    portrait(scene, `pb_${e}`, 'fencer', 36, '#e8e4d8cc', ELEM_CSS[e], '人', 2.5);
    portrait(scene, `sect_${e}`, 'shrine', 76, ELEM_DARK[e] + 'dd', ELEM_CSS[e], '宗', 3);
    portrait(scene, `dan_${e}`, 'pill', 22, '#00000088', ELEM_CSS[e], '丹');
    portrait(scene, `mat_${e}`, 'bone', 22, '#00000088', ELEM_CSS[e], '材');
  }
  // 毒液
  canvasTex(scene, 'venom', 16, 16, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#eaffb0'); g.addColorStop(0.4, '#8be02c'); g.addColorStop(0.8, '#7a2cc0'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
  });
  blob(scene, 'foe', 14, 14, '#c040ff');
  glyph(scene, 'poi_wash', '洗', 46, '#0d3b3b', '#7fffe0', 26, '#7fffe0');
  glyph(scene, 'poi_forge', '煉', 46, '#3b200d', '#ffb060', 26, '#ffb060');
  // 蛛網
  canvasTex(scene, 'web', 18, 18, (c, w, h) => {
    c.strokeStyle = '#f0f0f0'; c.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 8, h / 2 + Math.sin(a) * 8); c.lineTo(w / 2 - Math.cos(a) * 8, h / 2 - Math.sin(a) * 8); c.stroke(); }
    c.beginPath(); c.arc(w / 2, h / 2, 4, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(w / 2, h / 2, 7, 0, Math.PI * 2); c.stroke();
  });
  portrait(scene, 'stone', 'gem', 14, null, null, '石');
  portrait(scene, 'scroll', 'scroll', 26, null, null, '卷');
  // 落石
  canvasTex(scene, 'rock', 40, 36, (c, w, h) => {
    c.fillStyle = '#8a6136'; c.strokeStyle = '#3d2a12'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(6, 10); c.lineTo(18, 2); c.lineTo(32, 6); c.lineTo(38, 20); c.lineTo(28, 34); c.lineTo(10, 32); c.lineTo(2, 20); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#b08350'; c.beginPath(); c.moveTo(10, 11); c.lineTo(18, 6); c.lineTo(26, 9); c.lineTo(18, 15); c.closePath(); c.fill();
  });
}

// ---------- 場景 ----------
class Main extends Phaser.Scene {
  constructor() { super('main'); }

  preload() {
    for (const k of IMAGES) if (!this.textures.exists('img_' + k)) this.load.image('img_' + k, `assets/img/${k}.png`);
    // 像素圖清單（tools/cutout.py 產生），有的話優先使用
    this.load.json('pxlist', 'assets/img/px.json');
    this.load.on('filecomplete-json-pxlist', (_k, _t, list) => {
      for (const k of list || []) if (!this.textures.exists('img_px_' + k)) this.load.image('img_px_' + k, `assets/img/px_${k}.png`);
    });
  }

  create() {
    makeTextures(this);
    this.duration = DURATION;
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);
    this.bg = this.add.tileSprite(0, 0, WORLD, WORLD, 'bgtile').setOrigin(0).setDepth(-10);
    this.under = this.add.graphics().setDepth(-5);
    this.fx = this.add.graphics().setDepth(6);
    this.ind = this.add.graphics().setScrollFactor(0).setDepth(20);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,Q,R,E,F,ONE,TWO,THREE,Z,X,C,ENTER,M,B');
    // 瀏覽器規定要有使用者操作後才能播放聲音
    this.input.keyboard.on('keydown', initAudio);
    this.input.on('pointerdown', initAudio);
    this.hud = new Hud();

    this.t = 0; this.gm = 0;
    this.enemies = []; this.projs = []; this.areas = []; this.drops = [];
    this.sects = []; this.pbs = []; this.nemesis = []; this.pois = []; this.battles = [];
    this.grid = new Map();
    this.spawnAcc = 0; this.bossCount = 0;
    this.sectT = 3; this.pbT = 12; this.poiT = 25; this.battleT = 40; this.hudT = 0; this.sectTick = 0;
    this.choice = null; this.pendingChoices = 0; this.choiceId = 0;
    this.duel = null; this.duelPending = null;
    this.zone = null; this.night = -1; this.zoneTick = 0; this.nightInfo = '';
    this.trib = null; this.over = false; this.idSeq = 1; this.craftReserve = 0;
    this.phaseOrder = shuffle([...ELEMS]); this.phaseIdx = -1;

    this.parts = [];
    this.dmgTexts = [];
    for (let i = 0; i < 40; i++) {
      this.dmgTexts.push(this.add.text(0, 0, '', { fontFamily: 'Microsoft JhengHei', fontSize: '13px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(8).setVisible(false).setOrigin(0.5));
    }
    this.dmgIdx = 0;

    this.initPlayer();
    this.cameras.main.startFollow(this.P.sprite, true, 0.15, 0.15);
    this.spawnSect(300, 500);
    this.updatePhase();
    this.hud.toast(`你是${this.P.lgType}修士。三夜之內湊齊神通，斬殺第三夜的妖皇才能飛昇！`);
  }

  // ---------- 玩家 ----------
  initPlayer() {
    // 靈根差距刻意縮小（0.8～1.5），避免開局就決定只能用哪一系
    const lg = Object.fromEntries(ELEMS.map(e => [e, 0.8]));
    const sh = shuffle([...ELEMS]);
    const r = Math.random();
    let type;
    if (r < 0.15) { type = '天靈根'; lg[sh[0]] = 1.5; }
    else if (r < 0.45) { type = '雙靈根'; lg[sh[0]] = 1.25; lg[sh[1]] = 1.25; }
    else if (r < 0.8) { type = '三靈根'; sh.slice(0, 3).forEach(e => lg[e] = 1.1); }
    else { type = '雜靈根'; ELEMS.forEach(e => lg[e] = 1.0); }
    const P = this.P = {
      x: WORLD / 2, y: WORLD / 2, r: 14, elem: null,
      hp: 100, maxHp: 100, shield: 30, maxShield: 30, shieldDelay: 0,
      speed: 170, S: randi(2, 4), ss: 0, lg, lq: Object.fromEntries(ELEMS.map(e => [e, 0])), lgType: type,
      level: 1, exp: 0, stones: 0, realm: 0, kills: 0,
      skills: [], gongfa: [], weapons: {}, mats: {}, slowT: 0, slowF: 1,
      meditating: false, slowActive: false, hurtT: 0,
    };
    P.ss = this.ssMax();
    P.sprite = this.add.image(P.x, P.y, 'player').setDepth(4);
    // 基礎隨機神通 + 功法（主屬性）
    const main = sh[0];
    const sk = pick(SKILL_IDS.filter(id => SKILLS[id].elem === main));
    P.skills.push({ id: sk, lvl: 1, g: 1, t: 0 });
    this.applyOpt({ kind: 'gf', elem: main, stat: 'lq', grade: 1, name: randGongfaName(main) }, true);
  }

  ssMax() { return 40 + this.P.S * 12; }
  pickupR() { return 50 + this.P.S * 8; }
  choiceTime() { return 4 + this.P.S * 0.6; }
  expNext() { const l = this.P.level; return Math.floor(8 + l * 6 + l * l * 0.5); }
  // 法寶：強化同屬性神通（投射物數量、穿透、範圍）
  wb(elem) {
    const g = this.P.weapons[elem] || 0;
    return { n: Math.floor(g / 3), pierce: Math.floor(g / 2), area: 1 + g * 0.06 };
  }
  skillCd(s) {
    const d = SKILLS[s.id];
    return d.cd * (1 - 0.05 * (s.lvl - 1)) / Math.max(0.3, this.P.lg[d.elem]);
  }
  skillDmg(s) {
    const d = SKILLS[s.id];
    // 升級不再給神通，所以基礎傷害 ×1.6 補回來
    return 1.6 * d.dmg * (1 + 0.3 * (s.lvl - 1)) * (1 + 0.12 * ((s.g || 1) - 1)) * (1 + this.P.lq[d.elem]) * (1 + this.P.realm * 0.3);
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
    if (this.t >= DURATION) return this.endGame(false, 'time');
    this.gm = this.t / DURATION * 30;

    this.updatePhase();
    this.updateNight(dt);
    setIntensity(this.duel ? 2 : this.trib || this.enemies.some(e => e.boss) ? 1 : 0);
    if (this.duel) { this.duel.t -= dt; if (this.duel.t <= 0) this.endDuel(false); }
    if (this.duelPending && (this.duelPending.t -= dt) <= 0) {
      const b = this.duelPending.boss;
      this.duelPending = null;
      if (b.hp > 0 && !this.duel) this.startDuel(b);
    }
    this.updateInput(dt);
    this.spawnEnemies(dt);
    this.buildGrid();
    this.updateEnemies(dt);
    this.updateSkills(dt);
    this.updateProjectiles(dt);
    this.updateAreas(dt);
    this.updatePasserby(dt);
    this.updateBattles(dt);
    this.updatePois(dt);
    this.updateSects(dt);
    this.updateDrops(dt);
    this.updatePlayer(dt);
    this.updateChoice(dt);
    this.draw();
    this.updateParts(dt);
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
      if (mx) P.sprite.setFlipX(mx < 0);
      const l = Math.hypot(mx, my);
      const sp = P.meditating ? 0 : P.speed * (P.slowT > 0 ? P.slowF : 1);
      P.x = clamp(P.x + mx / l * sp * dt, 15, WORLD - 15);
      P.y = clamp(P.y + my / l * sp * dt, 15, WORLD - 15);
    }
    if (this.duel) this.clampToArena(P, P.r);
    P.sprite.setPosition(P.x, P.y);

    // 神識
    const wasSlow = P.slowActive;
    P.slowActive = k.Q.isDown && P.ss > 1;
    if (P.slowActive && !wasSlow) sfx.slow();
    if (JD(k.M)) this.hud.toast(toggleMute() ? '已靜音' : '已開啟聲音', '#999');
    if (JD(k.B)) this.hud.toast(toggleBgm() ? '背景音樂：開' : '背景音樂：關', '#999');
    if (P.slowActive) P.ss -= 12 * dt;
    else P.ss = Math.min(this.ssMax(), P.ss + (2 + P.S * 0.3) * dt);
    if (JD(k.R)) {
      if (P.ss >= 15) {
        P.ss -= 15;
        const R = 350 + P.S * 40;
        let n = 0;
        for (const d of this.drops) if (d2(d.x, d.y, P.x, P.y) < R * R) { d.mag = true; n++; }
        this.areas.push({ kind: 'flash', x: P.x, y: P.y, R, life: 0.35, max: 0.35, color: 0x8e6cf0 });
        sfx.sweep();
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

    // 機緣據點（洗靈池 / 煉神爐）優先於路人
    const ePress = JD(k.E);
    let poi = null;
    for (const o of this.pois) if (d2(o.x, o.y, P.x, P.y) < 75 * 75) poi = o;
    this.nearPoi = poi;
    if (poi && ePress) { this.usePoi(poi); return; }

    // 路人互動
    let near = null, nd = 110 * 110;
    for (const p of this.pbs) {
      const dd = d2(p.x, p.y, P.x, P.y);
      if (dd < nd) { nd = dd; near = p; }
    }
    this.nearPasserby = near;
    if (near) {
      if (ePress && near.state === 'feud') this.takeSide(near.battle, near.side, near);
      else if (JD(k.F) && near.state === 'feud') this.takeSide(near.battle, 1 - near.side, near);
      else if (ePress && near.state === 'fighting') {
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
    if (this.duel) return;
    this.spawnAcc += dt * (0.5 + this.gm * 0.12);
    const cap = Math.min(MAX_ENEMIES, 45 + this.gm * 2.2);
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      if (this.enemies.length < cap) this.spawnEnemy();
    }
  }

  // 生成妖王：roam 為夜半遊蕩（可能拖入異空間），否則在結界中央現身
  spawnBoss(type, roam) {
    const P = this.P, Z = this.zone;
    let at;
    if (!roam && Z) {
      const a = Math.atan2(P.y - Z.cy, P.x - Z.cx) + Math.PI, R = Math.min(Z.R * 0.5, 380);
      at = { x: clamp(P.x + Math.cos(a) * R, 60, WORLD - 60), y: clamp(P.y + Math.sin(a) * R, 60, WORLD - 60), elem: this.phaseElem };
    }
    const boss = this.spawnEnemy(type, at);
    const name = ENEMY_TYPES[type].name;
    this.hud.toast(`妖王 <b style="color:#e05555">${name}</b> 現世！`, '#e05555');
    this.hud.banner(boss.final ? `${name} 降臨` : `妖王「${name}」現世`);
    this.cameras.main.shake(boss.final ? 900 : 500, boss.final ? 0.012 : 0.008);
    sfx.roar();
    // 夜半遊蕩的妖王一半機率把玩家拖入異空間（網址加 ?duel=1 必定觸發）
    if (roam && (params.get('duel') === '1' || Math.random() < 0.5)) this.duelPending = { boss, t: 1.5 };
    return boss;
  }

  // ---------- 三夜與天雷結界 ----------
  // 每夜 10 分鐘（遊戲分鐘）：0～4 自由探索，4～8.5 結界收縮，4.5 遊蕩妖王，8.5 夜之妖王；第三夜 7 分鐘妖皇降臨
  updateNight(dt) {
    const P = this.P;
    const night = Math.min(2, Math.floor(this.gm / 10)), tn = this.gm - night * 10;
    if (night !== this.night) {
      this.night = night;
      const a = rand(0, Math.PI * 2), r = rand(200, 600);
      const cx = clamp(P.x + Math.cos(a) * r, 900, WORLD - 900), cy = clamp(P.y + Math.sin(a) * r, 900, WORLD - 900);
      this.zone = { cx, cy, R: 1800, R0: 1800, Rmin: 420 };
      this.nightFlags = {};
      this.hud.banner(`第${['一', '二', '三'][night]}夜`);
      if (night > 0) this.hud.toast('天雷結界重新展開，新的一夜開始了', '#b090ff');
    }
    const Z = this.zone, F = this.nightFlags;
    Z.R = Z.R0 + (Z.Rmin - Z.R0) * clamp((tn - 4) / 4.5, 0, 1);
    if (tn >= 4 && !F.shrink) { F.shrink = true; this.hud.toast('⚡ 天雷結界開始收縮！留在結界內', '#b090ff'); }
    // 結界外持續受雷擊
    this.outside = !this.duel && d2(P.x, P.y, Z.cx, Z.cy) > Z.R * Z.R;
    if (this.outside && (this.zoneTick -= dt) <= 0) {
      this.zoneTick = 0.5;
      this.damagePlayer(P.maxHp * 0.04);
      this.addPart(P.x, P.y - 10, 0, -30, 0xbfd8ff, 4, 0.3);
    }
    if (tn >= 4.5 && !F.roam) { F.roam = true; this.spawnBoss(pick(BOSS_TYPES), true); }
    if (night < 2 && tn >= 8.5 && !F.nightBoss) { F.nightBoss = true; this.spawnBoss(pick(BOSS_TYPES), false); }
    if (night === 2 && tn >= 7 && !F.final) { F.final = true; this.spawnBoss('emperor', false); }
    const sec = g => Math.max(0, Math.ceil(g * DURATION / 30));
    const fmt = x => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
    const tag = `第${['一', '二', '三'][night]}夜`;
    if (night === 2 && F.final) this.nightInfo = `${tag}・斬殺妖皇！`;
    else if (tn < 4) this.nightInfo = `${tag}・結界 ${fmt(sec(4 - tn))} 後收縮`;
    else if (night < 2 && tn < 8.5) this.nightInfo = `${tag}・夜王 ${fmt(sec(8.5 - tn))} 後現身`;
    else if (night === 2) this.nightInfo = `${tag}・妖皇 ${fmt(sec(7 - tn))} 後降臨`;
    else this.nightInfo = `${tag}・夜之妖王`;
  }

  spawnEnemy(type, at) {
    const gm = this.gm, P = this.P;
    if (!type) {
      const tab = spawnTable(gm);
      let r = Math.random() * tab.reduce((a, t) => a + t[1], 0);
      type = tab[tab.length - 1][0];
      for (const [k, w] of tab) { r -= w; if (r <= 0) { type = k; break; } }
      // 遠程妖獸會躲在後面越積越多，限制同時數量
      if (ENEMY_TYPES[type].ranged && this.enemies.filter(e => ENEMY_TYPES[e.type].ranged).length >= 5 + gm * 0.4) type = pick(['imp', 'wolf', 'bat']);
    }
    const T = ENEMY_TYPES[type];
    const elem = at ? at.elem : T.boss || Math.random() < 0.6 ? this.phaseElem : pick(ELEMS);
    const a = rand(0, Math.PI * 2), R = rand(650, 820);
    const x = clamp(at ? at.x : P.x + Math.cos(a) * R, 20, WORLD - 20), y = clamp(at ? at.y : P.y + Math.sin(a) * R, 20, WORLD - 20);
    // 妖獸少而精：一般妖獸血量 ×1.4（開局）～×2.6（第三夜）；妖王不吃平方成長，避免後期打不動
    const hp = T.boss ? T.hp * (1 + gm * 0.3 + gm * gm * 0.025) : T.hp * (1.4 + gm * 0.04) * (1 + gm * 0.25 + gm * gm * 0.02);
    const e = {
      type, elem, x, y, r: T.r, hp, maxHp: hp, boss: !!T.boss, final: !!T.final, charger: !!T.charger, moves: T.moves || null, wind: T.wind || 0.7, face: this.textures.exists('img_px_' + T.img) ? PX_FACE[T.img] || 0 : T.face || 0,
      speed: T.speed * rand(0.9, 1.1) * (1 + gm * 0.01), dmg: T.dmg * (1 + gm * 0.08),
      realm: Math.min(4, Math.floor(gm / 6)) + (T.boss ? 1 : 0),
      touchCd: 0, slowT: 0, slowF: 1, kx: 0, ky: 0, flash: 0, target: null, retarget: rand(0, 0.5), shootT: rand(1, 3),
      sprite: this.add.image(x, y, `e_${type}_${elem}`).setDepth(T.boss ? 3 : 2),
      duelMinion: !!this.duel,
    };
    this.enemies.push(e);
    return e;
  }

  // ---------- 異空間單挑 ----------
  frozen(e) { return this.duel && e !== this.duel.boss && !e.duelMinion; }

  clampToArena(o, r) {
    const D = this.duel, dx = o.x - D.cx, dy = o.y - D.cy, l = Math.hypot(dx, dy), max = D.R - r;
    if (l > max) { o.x = D.cx + dx / l * max; o.y = D.cy + dy / l * max; }
  }

  startDuel(boss) {
    const P = this.P;
    this.duel = { boss, cx: P.x, cy: P.y, R: 380, t: 75, name: ENEMY_TYPES[boss.type].name };
    const a = rand(0, Math.PI * 2);
    boss.x = P.x + Math.cos(a) * 260; boss.y = P.y + Math.sin(a) * 260;
    boss.target = P; boss.act = null; boss.skillT = 1.5;
    for (const e of this.enemies) if (e !== boss) e.sprite.setVisible(false);
    for (const pb of this.pbs) { pb.sprite.setVisible(false); pb.label.setVisible(false); }
    for (const s of this.sects) { s.sprite.setVisible(false); s.label.setVisible(false); }
    for (const d of this.drops) { d.hidden = true; d.sprite.setVisible(false); }
    for (const p of this.projs) if (p.team === 'foe') { p.dead = true; p.sprite.destroy(); }
    this.projs = this.projs.filter(p => !p.dead);
    this.bg.setTint(0x6a3a90);
    this.cameras.main.flash(500, 140, 60, 220);
    this.hud.banner(`${this.duel.name} 將你拖入異空間！`);
    this.hud.toast('⚔ 異空間單挑：75 秒內斬殺妖王可得重寶，否則空間崩塌', '#b060ff');
    sfx.roar();
  }

  endDuel(win) {
    const D = this.duel;
    if (!D) return;
    this.duel = null;
    for (const e of this.enemies) if (e.hp > 0) e.sprite.setVisible(true);
    for (const pb of this.pbs) { pb.sprite.setVisible(true); pb.label.setVisible(true); }
    for (const s of this.sects) { s.sprite.setVisible(true); s.label.setVisible(true); }
    for (const d of this.drops) if (d.hidden) { d.hidden = false; d.sprite.setVisible(true); }
    for (const e of this.enemies) e.duelMinion = false;
    this.bg.clearTint();
    this.cameras.main.flash(400, 255, 255, 255);
    if (win) {
      const b = D.boss, g = clamp(this.curGrade() + 2, 1, 9);
      for (const part of PARTS) this.spawnDrop('mat', b.x, b.y, { elem: b.elem, part, grade: g });
      this.spawnDrop('scroll', b.x, b.y, { item: this.pbLoot({ elem: b.elem, power: 2 }) });
      for (let i = 0; i < 2; i++) this.spawnDrop('dan', b.x, b.y, { elem: b.elem });
      this.hud.banner('斬殺妖王・破開異空間');
      this.hud.toast(`單挑勝利！獲得${GRADE_CN[g]}品材料一套、傳承卷軸、妖丹`, '#ffd98a');
    } else {
      this.hud.banner('異空間崩塌');
      this.hud.toast(`${D.name} 隨你一同回到戰場…`, '#e05555');
    }
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
        if (e.hp <= 0 || this.frozen(e)) continue;
        const rr = r + e.r;
        if (d2(e.x, e.y, x, y) <= rr * rr) out.push(e);
      }
    }
    return out;
  }

  // 玩家可攻擊的目標：妖獸 + 敵對路人
  hostilePbs() { return this.duel ? [] : this.pbs.filter(p => p.state === 'hostile' || p.state === 'fleeing'); }

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
      if (p.state !== 'fighting' && p.state !== 'ally' && p.state !== 'feud' && p.state !== 'friend') continue;
      const dd = d2(e.x, e.y, p.x, p.y);
      if (dd < 360 * 360 && dd < bd) { bd = dd; best = p; }
    }
    return best;
  }

  updateEnemies(dt) {
    const P = this.P;
    for (const e of this.enemies) {
      if (e.hp <= 0 || this.frozen(e)) continue;
      let ts = P.slowActive ? this.realmSlow(e.realm) : 1;
      if (e.slowT > 0) { e.slowT -= dt; ts *= e.slowF; }
      e.retarget -= dt;
      if (e.retarget <= 0 || !e.target || e.target.hp <= 0 || e.target.dead || e.target.escaped) { e.retarget = 0.5; e.target = this.pickEnemyTarget(e); }
      const tg = e.target;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
      let mv = e.speed * ts * dt, mx = dx / d, my = dy / d, dashing = false;
      if (e.boss || e.moves) {
        const o = this.updateSpecial(e, dt * ts, tg, d);
        if (o) { mv = o.mv; mx = o.mx; my = o.my; dashing = !!o.dash; }
      }
      if (ENEMY_TYPES[e.type].ranged) {
        if (d < 220) mv = -mv; else if (d < 290) mv = 0;
        e.shootT -= dt * ts;
        if (e.shootT <= 0 && d < 420 && tg === P) {
          e.shootT = rand(3.5, 4.5);
          const ang = Math.atan2(dy, dx), shot = ENEMY_TYPES[e.type].shot;
          if (shot === 'spread') for (const o of [-0.25, 0, 0.25]) this.shoot({ team: 'foe', x: e.x, y: e.y, ang: ang + o, speed: 210, dmg: e.dmg * 0.45, elem: e.elem, life: 3, r: 6, tex: 'venom', realm: e.realm, spin: 8 });
          else if (shot === 'orb') this.shoot({ team: 'foe', x: e.x, y: e.y, ang, speed: 320, dmg: e.dmg * 0.6, elem: e.elem, life: 2.5, r: 6, tex: `bb_${e.elem}`, realm: e.realm, trail: ELEM_HEX[e.elem] });
          else this.shoot({ team: 'foe', x: e.x, y: e.y, ang, speed: 230, dmg: e.dmg * 0.6, elem: e.elem, life: 3, r: 6, tex: 'venom', realm: e.realm, trail: 0x8be02c });
        }
      }
      e.x += mx * mv + e.kx * dt;
      e.y += my * mv + e.ky * dt;
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
      if (this.duel) this.clampToArena(e, e.r);
      // 接觸傷害
      e.touchCd -= dt * ts;
      const rr = e.r + tg.r;
      if (d2(e.x, e.y, tg.x, tg.y) < rr * rr && e.touchCd <= 0) {
        e.touchCd = 0.9;
        this.hitTarget(tg, e.dmg * (dashing ? 1.6 : 1), e.elem);
      }
      e.sprite.setPosition(e.x, e.y);
      if (e.face && Math.abs(mx) > 0.2 && mv > 0) e.sprite.setFlipX(mx * e.face < 0);
      if (e.flash > 0) { e.flash -= dt; if (e.flash <= 0) e.sprite.clearTint(); }
    }
    if (this.enemies.some(e => e.hp <= 0)) this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  // 妖王 / 妖熊的特殊技能。回傳 null 表示照常移動，否則覆蓋移動向量
  updateSpecial(e, sdt, tg, d) {
    const P = this.P;
    if (!e.act) {
      if (e.skillT === undefined) e.skillT = e.boss ? 2 : rand(2, 5);
      e.skillT -= sdt;
      if (e.skillT > 0) return null;
      if (e.boss) {
        const rage = e.hp < e.maxHp * 0.5;
        e.skillT = rand(2.2, 3.5) * (rage ? 0.6 : 1);
        this.startAct(e, pick(e.final ? ['charge', 'barrage', 'summon', 'slam', 'pool', 'web'] : ['charge', 'charge', 'barrage', 'summon', 'slam']));
        if (rage && !e.raged) { e.raged = true; this.hud.toast('妖王狂暴了！', '#e05555'); sfx.roar(); }
      } else {
        e.skillT = rand(4, 7);
        if (tg !== P || d > 420) return null;
        this.startAct(e, pick(e.moves));
      }
    }
    const a = e.act;
    if (!a) return null;
    a.t -= sdt;
    const still = { mv: 0, mx: 0, my: 0 };
    switch (a.kind) {
      case 'charge':
        if (a.phase === 'wind') {
          if (a.t > 0.25) a.ang = Math.atan2(P.y - e.y, P.x - e.x);
          if (a.t <= 0) { a.phase = 'dash'; a.t = e.boss ? 0.7 : 0.45; sfx.dash(); }
          return still;
        }
        if (a.t <= 0) { e.act = null; return null; }
        return { mv: (e.boss ? 760 : 540) * sdt, mx: Math.cos(a.ang), my: Math.sin(a.ang), dash: true };
      case 'barrage':
        a.next -= sdt;
        if (a.next <= 0) {
          a.next = 0.35; a.waves--;
          const n = 16 + Math.floor(this.gm / 3);
          for (let i = 0; i < n; i++) {
            this.shoot({ team: 'foe', x: e.x, y: e.y, ang: (i + a.waves * 0.5) / n * Math.PI * 2, speed: 210, dmg: e.dmg * 0.5, elem: e.elem, life: 4, r: 7, tex: `bb_${e.elem}`, realm: e.realm });
          }
          sfx.barrage();
        }
        if (a.waves <= 0) e.act = null;
        return still;
      case 'summon':
        if (a.t <= 0) {
          for (let i = 0; i < 6; i++) {
            const ang = i / 6 * Math.PI * 2;
            this.spawnEnemy(pick(['imp', 'wolf', 'bat']), { x: e.x + Math.cos(ang) * 60, y: e.y + Math.sin(ang) * 60, elem: e.elem });
          }
          e.act = null;
        }
        return still;
      case 'slam':
      case 'cast':
        if (a.t <= 0) e.act = null;
        return still;
      case 'blink':
        if (a.t <= 0) {
          const ang = rand(0, Math.PI * 2);
          this.burst(e.x, e.y, ELEM_HEX[e.elem], 10, 120, 3, 0.4);
          e.x = P.x + Math.cos(ang) * 140; e.y = P.y + Math.sin(ang) * 140;
          this.burst(e.x, e.y, ELEM_HEX[e.elem], 10, 120, 3, 0.4);
          const aim = Math.atan2(P.y - e.y, P.x - e.x);
          for (const o of [-0.3, 0, 0.3]) this.shoot({ team: 'foe', x: e.x, y: e.y, ang: aim + o, speed: 240, dmg: e.dmg * 0.7, elem: e.elem, life: 2.5, r: 7, tex: `fire_${e.elem}`, realm: e.realm, trail: ELEM_HEX[e.elem] });
          e.act = null;
        }
        return still;
    }
    return null;
  }

  startAct(e, kind) {
    const P = this.P;
    switch (kind) {
      case 'charge':
      case 'dash':
        e.act = { kind: 'charge', phase: 'wind', t: e.boss ? 0.9 : e.wind, ang: Math.atan2(P.y - e.y, P.x - e.x) };
        sfx.warn();
        break;
      case 'blink':
        e.act = { kind, t: 0.55 };
        break;
      case 'web': {
        // 蛛網：命中會定身
        e.act = { kind: 'cast', t: 0.4 };
        this.shoot({ team: 'foe', x: e.x, y: e.y, ang: Math.atan2(P.y - e.y, P.x - e.x), speed: 280, dmg: e.dmg * 0.3, elem: e.elem, life: 2.5, r: 9, tex: 'web', realm: e.realm, spin: 4, root: true });
        break;
      }
      case 'sting': {
        // 麻痺毒針：命中會減速
        e.act = { kind: 'cast', t: 0.3 };
        const aim = Math.atan2(P.y - e.y, P.x - e.x);
        for (const o of [-0.2, 0, 0.2]) this.shoot({ team: 'foe', x: e.x, y: e.y, ang: aim + o, speed: 300, dmg: e.dmg * 0.5, elem: e.elem, life: 2, r: 6, tex: 'venom', realm: e.realm, numb: true, trail: 0xc040ff });
        break;
      }
      case 'pool':
        // 毒池：預警後在玩家腳下留下持續傷害區
        e.act = { kind: 'cast', t: 0.5 };
        this.areas.push({ kind: 'foezone', x: P.x, y: P.y, R: e.boss ? 120 : 75, delay: 0.9, max: 0.9, life: e.boss ? 6 : 4, tickT: 0, dmg: e.dmg * 0.25 });
        sfx.warn();
        break;
      case 'throw':
        // 投擲：預警圈落在玩家位置
        e.act = { kind: 'cast', t: 0.35 };
        this.areas.push({ kind: 'foeslam', x: P.x + rand(-20, 20), y: P.y + rand(-20, 20), R: 50, delay: 0.85, max: 0.85, dmg: e.dmg });
        break;
      case 'barrage':
        e.act = { kind, t: 2, next: 0.3, waves: 3 };
        break;
      case 'summon':
        e.act = { kind, t: 0.8 };
        sfx.roar();
        break;
      case 'slam': {
        if (!e.boss) {
          // 一般妖獸：以自己為中心的震地
          e.act = { kind, t: 0.85 };
          this.areas.push({ kind: 'foeslam', x: e.x, y: e.y, R: e.r * 5.5, delay: 0.8, max: 0.8, dmg: e.dmg * 1.3 });
          sfx.warn();
          break;
        }
        e.act = { kind, t: 0.6 };
        const pts = [[0, 0], ...Array.from({ length: 4 }, () => [rand(-130, 130), rand(-130, 130)])];
        for (const [ox, oy] of pts) this.areas.push({ kind: 'foeslam', x: P.x + ox, y: P.y + oy, R: 75, delay: 1.1, max: 1.1, dmg: e.dmg * 1.2 });
        sfx.warn();
        break;
      }
    }
  }

  applyFoeEffect(p) {
    const P = this.P;
    if (p.root) { if (P.slowT <= 0) this.hud.toast('被蛛網纏住了！', '#f0f0f0'); P.slowT = 1.3; P.slowF = 0.15; }
    else if (p.numb) { P.slowT = 1.5; P.slowF = Math.min(P.slowF, 0.55); }
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
    sfx.hurt();
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
    sfx.hit();
    this.burst(e.x, e.y, elem ? ELEM_HEX[elem] : 0xffffff, 2, 140, 2, 0.25);
    if (opt.slow) { e.slowT = opt.slow; e.slowF = opt.slowF || 0.5; }
    if (opt.kb && !e.boss && !e.isPb) {
      const a = Math.atan2(e.y - opt.ky, e.x - opt.kx);
      e.kx += Math.cos(a) * opt.kb; e.ky += Math.sin(a) * opt.kb;
    }
    if (e.isPb) { if (opt.byPlayer && e.state !== 'fleeing') this.makeHostile(e); return; }
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const T = ENEMY_TYPES[e.type], P = this.P;
    e.sprite.destroy();
    P.kills++;
    sfx.kill();
    this.burst(e.x, e.y, ELEM_HEX[e.elem], e.boss ? 50 : 7, e.boss ? 320 : 170, e.boss ? 4 : 2.5, e.boss ? 0.9 : 0.4);
    this.spawnDrop('stone', e.x, e.y, { value: T.stone * 3 * (1 + this.gm * 0.12) });
    const dr = 1;
    if (e.boss || Math.random() < 0.015 * dr) this.spawnDrop('dan', e.x, e.y, { elem: e.elem });
    if (e.boss || Math.random() < 0.03 * dr) {
      const grade = clamp(1 + Math.floor(this.gm / 3.5) + (Math.random() < 0.3 ? 1 : 0) + (e.boss ? 1 : 0), 1, 9);
      const n = e.boss ? 3 : 1;
      for (let i = 0; i < n; i++) this.spawnDrop('mat', e.x, e.y, { elem: e.elem, part: e.boss ? PARTS[i] : pick(PARTS), grade });
    }
    if (e.boss) {
      for (let i = 0; i < 12; i++) this.spawnDrop('stone', e.x, e.y, { value: T.stone * (1 + this.gm * 0.12) / 12 });
      this.hud.toast('妖王伏誅！掉落一套煉器材料', '#e05555');
      if (this.duel && this.duel.boss === e) this.endDuel(true);
      if (e.final) this.time.delayedCall(1200, () => this.endGame(true));
      sfx.bossDie();
    }
  }

  // ---------- 神通 ----------
  updateSkills(dt) {
    const P = this.P;
    for (const s of P.skills) {
      s.t -= dt;
      if (P.meditating || s.t > 0) continue;
      const ok = this.castSkill(s);
      s.t = ok ? this.skillCd(s) : 0.2;
      if (ok && s.id !== 'wanmu') sfx.shoot(SKILLS[s.id].elem);
    }
  }

  castSkill(s) {
    const P = this.P, d = SKILLS[s.id], elem = d.elem, dmg = this.skillDmg(s), L = s.lvl, W = this.wb(elem);
    const tg = this.nearestTarget(P.x, P.y, 520);
    const aim = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : 0;
    switch (s.id) {
      case 'gengjin': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 3) + W.n;
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + (i - (n - 1) / 2) * 0.12, speed: 620, dmg, elem, pierce: 2 + Math.floor(L / 2) + W.pierce, life: 1.1, r: 7, tex: `sw_${elem}`, trail: ELEM_HEX[elem] });
        return true;
      }
      case 'wanjian': {
        const n = 8 + L * 2 + W.n * 3;
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: i / n * Math.PI * 2, speed: 430, dmg, elem, pierce: 3 + W.pierce, life: 0.9 * W.area, r: 7, tex: `sw_${elem}` });
        return true;
      }
      case 'qingteng': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 4) + W.n;
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + rand(-0.5, 0.5), speed: 340, dmg, elem, pierce: 1 + Math.floor(L / 3) + W.pierce, life: 2.2, r: 8, homing: true, slow: 1.5, slowF: 0.45, tex: `leaf_${elem}`, trail: 0x5cc96b });
        return true;
      }
      case 'wanmu': {
        const R = (85 + L * 10) * W.area;
        let hit = 0;
        this.areaHit(P.x, P.y, R, e => { this.hurt(e, dmg, elem); hit++; });
        if (hit) P.hp = Math.min(P.maxHp, P.hp + 0.6 + L * 0.25);
        return true;
      }
      case 'xuanbing': {
        if (!tg) return false;
        const n = 2 + Math.floor(L / 3) + W.n;
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + (i - (n - 1) / 2) * 0.18, speed: 480, dmg, elem, pierce: 1 + W.pierce, life: 1.1, r: 7, slow: 1.5, slowF: 0.5, tex: `ice_${elem}`, trail: 0xbfe8ff });
        return true;
      }
      case 'hanchao':
        this.areas.push({ kind: 'ring', x: P.x, y: P.y, r: 10, maxR: (190 + L * 22) * W.area, spd: 380, dmg, elem, hit: new Set(), slow: 2, color: ELEM_HEX[elem] });
        return true;
      case 'huoqiu': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 4) + W.n;
        for (let i = 0; i < n; i++) this.shoot({ team: 'player', x: P.x, y: P.y, ang: aim + i * 0.25, speed: 420, dmg, elem, pierce: W.pierce, life: 1.4, r: 9, explode: (48 + L * 6) * W.area, tex: `fire_${elem}`, trail: 0xff8a2a, spin: 10 });
        return true;
      }
      case 'fentian': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 3) + W.n;
        const cands = this.query(P.x, P.y, 420);
        for (let i = 0; i < n; i++) {
          const c = cands.length ? pick(cands) : tg;
          this.areas.push({ kind: 'zone', x: c.x, y: c.y, R: (55 + L * 6) * W.area, life: 3, max: 3, tickT: 0, dmg, elem, color: ELEM_HEX[elem] });
        }
        return true;
      }
      case 'luoshi': {
        if (!tg) return false;
        const n = 1 + Math.floor(L / 4) + W.n;
        let cands = this.query(P.x, P.y, 450).sort((a, b) => b.hp - a.hp);
        for (let i = 0; i < n; i++) {
          const c = cands[i] || tg;
          const R = (45 + L * 4) * W.area;
          const rock = this.add.image(c.x, c.y - 240, 'rock').setDepth(5).setScale(R / 40);
          this.areas.push({ kind: 'drop', x: c.x, y: c.y, R, delay: 0.55, max: 0.55, dmg, elem, color: ELEM_HEX[elem], rock });
        }
        return true;
      }
      case 'dilie': {
        const R = (110 + L * 12) * W.area;
        this.areaHit(P.x, P.y, R, e => this.hurt(e, dmg, elem, { kb: 420, kx: P.x, ky: P.y }));
        for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2; this.addPart(P.x + Math.cos(ang) * 20, P.y + Math.sin(ang) * 20, Math.cos(ang) * R * 2.2, Math.sin(ang) * R * 2.2, pick([0x8a6136, 0xc08a4a, 0x5a3d1e]), 3.5, 0.45); }
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
      if (p.spin) p.sprite.rotation += p.spin * dt * ts;
      if (p.trail) {
        p.trT = (p.trT || 0) - dt;
        if (p.trT <= 0) { p.trT = 0.02; this.addPart(p.x, p.y, rand(-15, 15), rand(-15, 15), p.trail, p.r * 0.55, 0.22); }
      }
      if (p.team === 'foe') {
        if (d2(p.x, p.y, P.x, P.y) < (P.r + p.r) ** 2) { this.damagePlayer(p.dmg); this.applyFoeEffect(p); p.dead = true; }
        else for (const h of this.pbs) {
          if ((h.state === 'friend' || h.state === 'ally') && d2(h.x, h.y, p.x, p.y) < (h.r + p.r) ** 2) { h.hp -= p.dmg; p.dead = true; break; }
        }
      } else {
        const targets = this.query(p.x, p.y, p.r);
        if (p.team === 'player' || p.team === 'ally') for (const h of hpbs) if (d2(h.x, h.y, p.x, p.y) < (h.r + p.r) ** 2) targets.push(h);
        if (p.team === 'fac') for (const h of this.pbs) if (h.battle === p.fac && h.side !== p.side && d2(h.x, h.y, p.x, p.y) < (h.r + p.r) ** 2) targets.push(h);
        for (const e of targets) {
          if (p.hit.has(e) || e.hp <= 0) continue;
          p.hit.add(e);
          if (p.explode) {
            this.areaHit(p.x, p.y, p.explode, t => this.hurt(t, p.dmg, p.elem));
            this.areas.push({ kind: 'flash', x: p.x, y: p.y, R: p.explode, life: 0.25, max: 0.25, color: ELEM_HEX[p.elem] });
            if (--p.pierce < 0) { p.dead = true; break; }
            continue;
          }
          this.hurt(e, p.dmg, p.elem, { slow: p.slow, slowF: p.slowF, byPlayer: p.team === 'player' });
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
          for (let i = 0; i < 4; i++) { const ang = rand(0, Math.PI * 2); this.addPart(a.x + Math.cos(ang) * a.r, a.y + Math.sin(ang) * a.r, 0, 0, pick([0xbfe8ff, 0xffffff, a.color]), 2.5, 0.35); }
          for (const e of this.query(a.x, a.y, a.r)) if (!a.hit.has(e)) { a.hit.add(e); this.hurt(e, a.dmg, a.elem, { slow: a.slow }); }
          for (const p of this.hostilePbs()) if (!a.hit.has(p) && d2(p.x, p.y, a.x, a.y) < a.r * a.r) { a.hit.add(p); this.hurt(p, a.dmg, a.elem); }
          if (a.r >= a.maxR) a.dead = true;
          break;
        case 'drop':
          a.delay -= dt;
          if (a.rock) a.rock.setPosition(a.x, a.y - 240 * Math.max(0, a.delay / a.max)).setRotation(a.delay * 6);
          if (a.delay <= 0) {
            if (a.rock) { a.rock.destroy(); this.burst(a.x, a.y, 0x8a6136, 14, 260, 3, 0.5); sfx.slam(); }
            this.areaHit(a.x, a.y, a.R, e => this.hurt(e, a.dmg, a.elem));
            this.areas.push({ kind: 'flash', x: a.x, y: a.y, R: a.R, life: 0.25, max: 0.25, color: a.color });
            a.dead = true;
          }
          break;
        case 'zone':
          a.life -= dt; a.tickT -= dt;
          if (a.tickT <= 0) { a.tickT = 0.4; this.areaHit(a.x, a.y, a.R, e => this.hurt(e, a.dmg, a.elem)); }
          if (Math.random() < 0.6) { const ang = rand(0, Math.PI * 2), rr = rand(0, a.R); this.addPart(a.x + Math.cos(ang) * rr, a.y + Math.sin(ang) * rr, rand(-10, 10), rand(-90, -40), pick([0xff6a3d, 0xffd24a, 0xff3a1a]), rand(2, 4), 0.6); }
          if (a.life <= 0) a.dead = true;
          break;
        case 'lightning':
          a.delay -= dt;
          if (a.delay <= 0) {
            if (d2(a.x, a.y, P.x, P.y) < (a.R + P.r) ** 2) this.damagePlayer(a.dmg);
            this.areaHit(a.x, a.y, a.R, e => this.hurt(e, a.dmg * 3, null));
            this.areas.push({ kind: 'flash', x: a.x, y: a.y, R: a.R, life: 0.3, max: 0.3, color: 0xbfd8ff });
            sfx.thunder();
            a.dead = true;
          }
          break;
        case 'foezone':
          if (a.delay > 0) { a.delay -= dt * (P.slowActive ? 0.6 : 1); break; }
          a.life -= dt; a.tickT -= dt;
          if (a.tickT <= 0) { a.tickT = 0.5; if (d2(a.x, a.y, P.x, P.y) < (a.R + P.r) ** 2) this.damagePlayer(a.dmg); }
          if (Math.random() < 0.4) this.addPart(a.x + rand(-a.R, a.R) * 0.7, a.y + rand(-a.R, a.R) * 0.7, 0, rand(-40, -15), pick([0x8be02c, 0x5aa020, 0xc040ff]), rand(2, 3.5), 0.6);
          if (a.life <= 0) a.dead = true;
          break;
        case 'foeslam':
          a.delay -= dt * (P.slowActive ? 0.6 : 1);
          if (a.delay <= 0) {
            if (d2(a.x, a.y, P.x, P.y) < (a.R + P.r) ** 2) this.damagePlayer(a.dmg);
            this.areas.push({ kind: 'flash', x: a.x, y: a.y, R: a.R, life: 0.3, max: 0.3, color: 0xff3030 });
            sfx.slam();
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
    if (this.pbs.filter(p => !p.battle).length >= 4) return;
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
    if (this.duel) return;
    this.pbT -= dt;
    if (this.pbT <= 0) { this.pbT = 18; if (Math.random() < 0.5) this.spawnPasserby(); }

    for (const pb of this.pbs) {
      pb.atkT -= dt; pb.dodgeCd -= dt;
      let mx = 0, my = 0, sp = pb.speed;
      if (pb.dashT > 0) {
        pb.dashT -= dt;
        pb.x += pb.dvx * dt; pb.y += pb.dvy * dt;
      } else if (pb.state === 'feud' || pb.state === 'friend') {
        // 找對面陣營最近的人，沒有就打妖獸
        let tg = null, bd = 450 * 450;
        for (const o of this.pbs) {
          if (o.battle !== pb.battle || o.side === pb.side || o.dead || o.hp <= 0) continue;
          const dd = d2(o.x, o.y, pb.x, pb.y);
          if (dd < bd) { bd = dd; tg = o; }
        }
        if (!tg) tg = this.nearestEnemyOnly(pb.x, pb.y, 380);
        if (tg) {
          const dx = tg.x - pb.x, dy = tg.y - pb.y, d = Math.hypot(dx, dy) || 1;
          if (d > 220) { mx = dx; my = dy; } else if (d < 140) { mx = -dx; my = -dy; } else { mx = -dy; my = dx; sp *= 0.5; }
          if (pb.atkT <= 0) {
            pb.atkT = rand(0.8, 1.1);
            this.shoot({ team: tg.isPb ? 'fac' : 'ally', fac: pb.battle, side: pb.side, x: pb.x, y: pb.y, ang: Math.atan2(dy, dx), speed: 380, dmg: pb.dmg, elem: pb.elem, life: 1.4, r: 7, pierce: 0, tex: `fu_${pb.elem}`, spin: 6 });
          }
        } else if (pb.state === 'friend' && d2(pb.x, pb.y, P.x, P.y) > 200 * 200) { mx = P.x - pb.x; my = P.y - pb.y; }
      } else if (pb.state === 'fighting' || pb.state === 'ally') {
        const tg = this.nearestEnemyOnly(pb.x, pb.y, 380);
        if (pb.state === 'ally') {
          // 跟在玩家身邊的固定站位；比較笨：偶爾會短暫衝進妖群
          if (pb.slot === undefined) pb.slot = rand(0, Math.PI * 2);
          const fx = P.x + Math.cos(pb.slot) * 70, fy = P.y + Math.sin(pb.slot) * 70;
          const dP = Math.sqrt(d2(pb.x, pb.y, P.x, P.y));
          pb.dumbT -= dt;
          if (pb.dumbT <= 0) pb.dumbT = rand(6, 10);
          const charging = pb.dumbT < 0.8 && tg && dP < 220;
          sp = Math.max(pb.speed, P.speed * 1.15) * (dP > 350 ? 1.8 : 1);
          if (charging) { mx = tg.x - pb.x; my = tg.y - pb.y; }
          else if (d2(pb.x, pb.y, fx, fy) > 20 * 20) { mx = fx - pb.x; my = fy - pb.y; }
        } else {
          pb.wanderT -= dt;
          if (pb.wanderT <= 0) { pb.wanderT = rand(1, 3); pb.wx = pb.x + rand(-120, 120); pb.wy = pb.y + rand(-120, 120); }
          mx = pb.wx - pb.x; my = pb.wy - pb.y; sp *= 0.5;
        }
        if (tg && pb.atkT <= 0) {
          pb.atkT = 0.8;
          this.shoot({ team: 'ally', x: pb.x, y: pb.y, ang: Math.atan2(tg.y - pb.y, tg.x - pb.x), speed: 420, dmg: pb.dmg, elem: pb.elem, life: 1.2, r: 7, pierce: 0, tex: `fu_${pb.elem}`, spin: 6 });
        }
      } else if (pb.state === 'hostile') {
        const dx = P.x - pb.x, dy = P.y - pb.y, d = Math.hypot(dx, dy) || 1;
        if (d > 260) { mx = dx; my = dy; } else if (d < 180) { mx = -dx; my = -dy; }
        else { mx = -dy; my = dx; sp *= 0.6; }
        let ts = P.slowActive ? this.realmSlow(pb.realm) : 1;
        sp *= ts;
        if (pb.atkT <= 0 && d < 450) {
          pb.atkT = 1.1 / Math.max(ts, 0.2);
          this.shoot({ team: 'foe', x: pb.x, y: pb.y, ang: Math.atan2(dy, dx), speed: 300, dmg: pb.dmg, elem: pb.elem, life: 2, r: 6, tex: `fu_${pb.elem}`, realm: pb.realm, spin: 6 });
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
      if (Math.abs(mx) > 1) pb.sprite.setFlipX(mx > 0);
      pb.label.setPosition(pb.x, pb.y - 24);
      pb.sprite.setAlpha(pb.state === 'fleeing' ? 0.6 : 1);

      if (pb.hp <= 0 && !pb.escaped) {
        pb.dead = true;
        if (pb.state === 'hostile' || pb.state === 'fleeing') {
          this.spawnDrop('scroll', pb.x, pb.y, { item: this.pbLoot(pb) });
          this.hud.toast(`你斬殺了 <b style="color:${ELEM_CSS[pb.elem]}">${pb.name}</b>，其儲物袋掉落傳承`, '#ffd98a');
        } else {
          this.hud.toast(`<b style="color:${ELEM_CSS[pb.elem]}">${pb.name}</b> ${pb.battle ? '戰死' : '被妖獸殺死了'}`, '#888');
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
    if (Math.random() < 0.55) {
      const id = pick(sk);
      const owned = this.P.skills.find(s => s.id === id);
      if (owned || this.P.skills.length < MAX_SKILLS) return { kind: owned ? 'up' : 'new', id, n: 1, g: grade };
    }
    return { kind: 'gf', elem: pb.elem, stat: Math.random() < 0.5 ? 'lq' : 'lg', grade, name: randGongfaName(pb.elem) };
  }

  // ---------- 機緣據點 ----------
  randomSpot(minR, maxR) {
    const P = this.P, Z = this.zone;
    for (let i = 0; i < 30; i++) {
      const a = rand(0, Math.PI * 2), R = rand(minR, maxR);
      const x = clamp(P.x + Math.cos(a) * R, 150, WORLD - 150), y = clamp(P.y + Math.sin(a) * R, 150, WORLD - 150);
      if (Z && d2(x, y, Z.cx, Z.cy) > (Z.R * 0.85) ** 2) continue;
      return { x, y };
    }
    return { x: clamp(P.x + rand(-400, 400), 150, WORLD - 150), y: clamp(P.y + rand(-400, 400), 150, WORLD - 150) };
  }

  spawnPoi(kind) {
    const { x, y } = this.randomSpot(500, 1100);
    const name = kind === 'wash' ? '洗靈池' : '煉神爐';
    const color = kind === 'wash' ? '#7fffe0' : '#ffb060';
    const o = { kind, x, y, name, color: parseInt(color.slice(1), 16) };
    o.sprite = this.add.image(x, y, `poi_${kind}`).setDepth(1);
    o.label = this.add.text(x, y - 36, name, { fontFamily: 'Microsoft JhengHei', fontSize: '14px', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(7);
    this.pois.push(o);
    this.hud.toast(`遠方出現了<b style="color:${color}">${name}</b>`, color);
  }

  updatePois(dt) {
    if (this.duel) return;
    this.poiT -= dt;
    if (this.poiT <= 0) {
      this.poiT = rand(45, 70);
      if (this.pois.length < 3) this.spawnPoi(this.pois.some(p => p.kind === 'wash') || Math.random() < 0.5 ? 'forge' : 'wash');
    }
  }

  removePoi(o) {
    o.sprite.destroy(); o.label.destroy();
    this.pois = this.pois.filter(p => p !== o);
  }

  usePoi(o) {
    const P = this.P;
    if (o.kind === 'wash') {
      const roll = () => {
        const vals = shuffle(ELEMS.map(e => P.lg[e]));
        const lg = Object.fromEntries(ELEMS.map((e, i) => [e, +vals[i].toFixed(2)]));
        const bonus = pick(ELEMS);
        lg[bonus] = +(lg[bonus] + 0.1).toFixed(2);
        const top = ELEMS.reduce((a, e) => (lg[e] > lg[a] ? e : a), ELEMS[0]);
        return { kind: 'wash', lg, note: `靈根重新洗牌，主靈根變為「${top}」，${bonus}靈根額外 +0.10` };
      };
      if (this.openEvent('洗靈池・洗亂靈根重塑根骨', [roll(), roll(), { kind: 'keep', label: '不洗，保持原本靈根' }], 2, 12)) this.removePoi(o);
      return;
    }
    // 煉神爐：把神通重練成同類型、不同屬性的神通，品階 +2
    const offers = [];
    for (const s of shuffle([...P.skills])) {
      if (offers.length >= 2) break;
      const kind = SKILLS[s.id].kind;
      const targets = SKILL_IDS.filter(id => SKILLS[id].kind === kind && SKILLS[id].elem !== SKILLS[s.id].elem && !P.skills.some(k => k.id === id));
      if (!targets.length) continue;
      const g0 = s.g || 1, g = Math.min(9, g0 + 2);
      offers.push({ kind: 'reforge', from: s.id, to: pick(targets), lvl: s.lvl, g0, g, price: Math.round(40 * g * (1 + this.gm * 0.15)) });
    }
    if (!offers.length) { this.hud.toast('煉神爐：沒有可以重練的神通', '#999'); return; }
    offers.push({ kind: 'keep', label: '不重練' });
    if (this.openEvent('煉神爐・重練神通（換屬性、升品階）', offers, offers.length - 1, 12)) this.removePoi(o);
  }

  // ---------- 陣營戰：正道 vs 魔道，3 打 3 ----------
  spawnBattle() {
    const gm = this.gm;
    const { x, y } = this.randomSpot(550, 900);
    const B = { id: this.idSeq++, names: [randSectName(), randEvilSect()], favor: null, x, y };
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 3; i++) {
        const elem = pick(ELEMS);
        const hp = 110 * (1 + gm * 0.3);
        const px = x + (side ? 130 : -130) + rand(-30, 30), py = y + (i - 1) * 55;
        const pb = {
          isPb: true, id: this.idSeq++, name: randName(), elem, power: 0, x: px, y: py, r: 13, hp, maxHp: hp,
          dmg: 8 * (1 + gm * 0.15), speed: 140, state: 'feud', battle: B, side,
          atkT: rand(0.3, 1), dodgeCd: 0, dashT: 0, dvx: 0, dvy: 0, wx: px, wy: py, wanderT: 0, dumbT: 0,
          realm: Math.min(4, Math.floor(gm / 6)),
          sprite: this.add.image(px, py, `pb_${elem}`).setDepth(3),
        };
        pb.label = this.add.text(px, py - 24, `${B.names[side]}・${pb.name}`, { fontFamily: 'Microsoft JhengHei', fontSize: '11px', color: side ? '#ff8080' : '#a0d8ff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(7);
        this.pbs.push(pb);
      }
    }
    this.battles.push(B);
    this.hud.toast(`<b style="color:#a0d8ff">${B.names[0]}</b> 與 <b style="color:#ff8080">${B.names[1]}</b> 正在火拼！靠近按 E 助陣、F 出手`, '#ffd98a');
  }

  // 玩家選邊：side 成為友軍，另一方敵對
  takeSide(B, side) {
    if (!B || B.favor !== null) return;
    B.favor = side;
    for (const pb of this.pbs) {
      if (pb.battle !== B) continue;
      pb.state = pb.side === side ? 'friend' : 'hostile';
    }
    this.hud.toast(`你助 <b>${B.names[side]}</b> 一臂之力，${B.names[1 - side]} 視你為敵！`, side ? '#ff8080' : '#a0d8ff');
  }

  updateBattles(dt) {
    if (this.duel) return;
    this.battleT -= dt;
    if (this.battleT <= 0) {
      this.battleT = rand(70, 100);
      if (!this.battles.length && this.pbs.length <= 4) this.spawnBattle();
    }
    for (const B of this.battles) {
      const alive = side => this.pbs.filter(p => p.battle === B && p.side === side && !p.dead && !p.escaped && p.hp > 0);
      const a = alive(0), b = alive(1);
      if (a.length && b.length) continue;
      B.done = true;
      const win = a.length ? 0 : b.length ? 1 : -1;
      const winners = win === 0 ? a : win === 1 ? b : [];
      if (win >= 0 && B.favor === win) {
        const lead = winners[0];
        this.spawnDrop('scroll', lead.x, lead.y, { item: this.pbLoot({ elem: lead.elem, power: 1 }) });
        this.hud.toast(`<b>${B.names[win]}</b> 獲勝，贈你一卷傳承答謝援手！`, '#ffd98a');
      } else if (win >= 0) {
        this.hud.toast(`<b>${B.names[win]}</b> 贏得了火拼`, '#999');
      }
      for (const p of winners) { p.state = 'fighting'; p.battle = null; p.label.setText(p.name); }
    }
    this.battles = this.battles.filter(B => !B.done);
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
      items.push({ kind: owned ? 'up' : 'new', id, n: 1, g: grade });
    }
    shuffle(items);
    const out = items.slice(0, 2);
    while (out.length < 3) out.push({ kind: 'gf', elem: s.elem, stat: Math.random() < 0.5 ? 'lq' : 'lg', grade, name: randGongfaName(s.elem) });
    const price = it => Math.round((it.kind === 'gf' ? 25 * it.grade : 50 + 25 * grade) * (1 + this.gm * 0.2));
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
    sfx.buy();
    this.applyOpt(it);
    s.shop[i] = null;
    s.shopVer++;
  }

  updateSects(dt) {
    const P = this.P;
    if (this.duel) { this.curSect = null; return; }
    this.sectT -= dt;
    if (this.sectT <= 0) { this.sectT = rand(15, 25); if (this.sects.length < Math.min(3, 1 + Math.floor(this.gm / 7))) this.spawnSect(); }
    this.curSect = null;
    for (const s of this.sects) {
      s.age += dt; s.atkT -= dt; s.shopT -= dt;
      if (s.shopT <= 0) this.refreshShop(s);
      if (s.atkT <= 0) {
        const tg = this.nearestEnemyOnly(s.x, s.y, 300);
        if (tg) {
          s.atkT = 0.9;
          this.shoot({ team: 'ally', x: s.x, y: s.y, ang: Math.atan2(tg.y - s.y, tg.x - s.x), speed: 450, dmg: s.dmg, elem: s.elem, life: 1, r: 8, pierce: 1, tex: `fu_${s.elem}`, trail: ELEM_HEX[s.elem] });
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
      sfx.craft();
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
      if (d.hidden) continue;
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
    if (d.kind !== 'stone') sfx.item();
    switch (d.kind) {
      case 'stone': P.stones += d.value; sfx.stone(); return;
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
    if (P.slowT > 0 && (P.slowT -= dt) <= 0) P.slowF = 1;
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
      sfx.levelup();
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.1);
    }
    // 大境界突破 → 天劫
    if (!this.trib && P.realm < 4 && P.level >= (P.realm + 1) * 10) {
      this.trib = { t: 9, strikeT: 0.5 };
      this.hud.toast(`⚡ 欲突破${REALMS[P.realm + 1]}，天劫降臨！`, '#bfd8ff');
      sfx.thunder();
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
      this.choice = { id: ++this.choiceId, opts: this.genOptions(), t: max, max, title: '突破小境界・擇一機緣' };
    }
    if (this.choice) {
      this.choice.t -= dt;
      if (this.choice.t <= 0) {
        const c = this.choice;
        const i = c.def !== undefined ? c.def : randi(0, c.opts.length - 1);
        this.hud.toast(c.def !== undefined ? '猶豫太久，機緣錯過了' : `猶豫太久，機緣隨機落在：${this.optLabel(c.opts[i])}`, '#999');
        this.pickChoice(i);
      }
    }
  }

  // 事件抉擇：優先於升級，逾時選 def
  openEvent(title, opts, def, time = 10) {
    if (this.choice) {
      if (this.choice.title && this.choice.event) { this.hud.toast('先完成眼前的抉擇', '#999'); return false; }
      this.pendingChoices++; // 把正在進行的升級放回佇列
    }
    this.choice = { id: ++this.choiceId, opts, t: time, max: time, title, def, event: true };
    return true;
  }

  pickChoice(i) {
    const c = this.choice;
    if (!c || !c.opts[i]) return;
    this.choice = null;
    sfx.select();
    this.applyOpt(c.opts[i]);
  }

  genOptions() {
    const P = this.P, pool = [];
    const mine = new Set(P.skills.map(s => SKILLS[s.id].elem));
    for (const e of ELEMS) {
      const w = mine.has(e) ? 1 : 0.45;
      pool.push({ kind: 'lg', elem: e, w }, { kind: 'lq', elem: e, w });
    }
    pool.push({ kind: 'attr', a: 'hp', w: 1 }, { kind: 'attr', a: 'shield', w: 1 }, { kind: 'attr', a: 'speed', w: 0.8 }, { kind: 'attr', a: 'S', w: 0.8 });
    const out = [];
    while (out.length < 3 && pool.length) {
      const tot = pool.reduce((a, o) => a + o.w, 0);
      let r = Math.random() * tot, idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  lvAmt(kind) { return kind === 'lg' ? 0.07 + 0.01 * this.P.realm : 0.1 + 0.02 * this.P.realm; }

  gfAmt(o) { return o.stat === 'lq' ? 0.08 + 0.03 * o.grade : 0.06 + 0.02 * o.grade; }

  optLabel(o) {
    const c = e => ELEM_CSS[e];
    switch (o.kind) {
      case 'new': return `<span style="color:${c(SKILLS[o.id].elem)}">${SKILLS[o.id].name}</span> ${GRADE_CN[o.g || 1]}品【新神通】`;
      case 'lg': return `<span style="color:${c(o.elem)}">${o.elem}</span>・洗練靈根`;
      case 'lq': return `<span style="color:${c(o.elem)}">${o.elem}</span>・凝聚靈氣`;
      case 'wash': return `新靈根：${ELEMS.map(e => `<span style="color:${c(e)}">${e}${o.lg[e].toFixed(2)}</span>`).join(' ')}`;
      case 'reforge': return `<span style="color:${c(SKILLS[o.from].elem)}">${SKILLS[o.from].name}</span> → <span style="color:${c(SKILLS[o.to].elem)}">${SKILLS[o.to].name}</span>`;
      case 'keep': return o.label || '維持原狀';
      case 'up': {
        const s = this.P.skills.find(k => k.id === o.id);
        return `<span style="color:${c(SKILLS[o.id].elem)}">${SKILLS[o.id].name}</span> Lv${s ? s.lvl : 0}→${Math.min(MAX_SKILL_LVL, (s ? s.lvl : 0) + (o.n || 1))}${o.g && s && o.g > (s.g || 1) ? `・${GRADE_CN[o.g]}品` : ''}`;
      }
      case 'gf': return `<span style="color:${c(o.elem)}">${o.name}</span> ${GRADE_CN[o.grade]}品`;
      case 'attr': return { hp: '淬體・肉身', shield: '凝元・護體真元', speed: '御風・遁速', S: '養神・神識' }[o.a];
    }
  }

  optDesc(o) {
    switch (o.kind) {
      case 'new': { const d = SKILLS[o.id]; return `${d.elem}・${d.kind === 'single' ? '單體' : '範圍'}：${d.desc}`; }
      case 'up': return `傷害 +30%、冷卻 -5%${(o.n || 1) > 1 ? `（升 ${o.n} 級）` : ''}${o.g ? `，品階提升至${GRADE_CN[o.g]}品` : ''}`;
      case 'lg': return `${o.elem}靈根 +${this.lvAmt('lg').toFixed(2)}（${o.elem}系攻速）`;
      case 'lq': return `${o.elem}靈氣 +${Math.round(this.lvAmt('lq') * 100)}%（${o.elem}系傷害）`;
      case 'wash': return o.note || '';
      case 'reforge': return `保留 Lv${o.lvl}，品階 ${GRADE_CN[o.g0]}→${GRADE_CN[o.g]}品，${SKILLS[o.to].desc}（耗 ${o.price} 靈石）`;
      case 'keep': return o.desc || '什麼都不做';
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
        P.skills.push({ id: o.id, lvl: 1, g: o.g || 1, t: 0 });
        break;
      case 'up': {
        const s = P.skills.find(k => k.id === o.id);
        if (s) { s.lvl = Math.min(MAX_SKILL_LVL, s.lvl + (o.n || 1)); s.g = Math.max(s.g || 1, o.g || 1); }
        else if (P.skills.length < MAX_SKILLS) P.skills.push({ id: o.id, lvl: 1, g: o.g || 1, t: 0 });
        break;
      }
      case 'lg': P.lg[o.elem] += this.lvAmt('lg'); break;
      case 'lq': P.lq[o.elem] += this.lvAmt('lq'); break;
      case 'wash':
        Object.assign(P.lg, o.lg);
        this.hud.toast('靈根重塑完成', '#7fffe0');
        return;
      case 'reforge': {
        const s = P.skills.find(k => k.id === o.from);
        if (!s || P.skills.some(k => k.id === o.to)) return;
        if (P.stones < o.price) { this.hud.toast('靈石不足，重練失敗', '#e05555'); return; }
        P.stones -= o.price;
        s.id = o.to; s.g = o.g; s.t = 0;
        sfx.craft();
        this.hud.toast(`神通重練：${this.optLabel(o)}`, '#ffb060');
        return;
      }
      case 'keep': return;
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
        case 'zone': {
          const k = Math.min(1, a.life);
          u.fillStyle(a.color, 0.18 * k).fillCircle(a.x, a.y, a.R);
          u.fillStyle(0xffd24a, (0.1 + 0.08 * Math.sin(this.t * 25 + a.x)) * k).fillCircle(a.x, a.y, a.R * 0.6);
          break;
        }
        case 'ring': f.lineStyle(4, a.color, 0.7).strokeCircle(a.x, a.y, a.r); break;
        case 'drop': f.lineStyle(2, a.color, 0.8).strokeCircle(a.x, a.y, a.R).fillStyle(a.color, 0.25 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R); break;
        case 'foezone':
          if (a.delay > 0) f.lineStyle(2, 0x8be02c, 0.9).strokeCircle(a.x, a.y, a.R).fillStyle(0x8be02c, 0.2 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R);
          else u.fillStyle(0x6ac020, 0.28 * Math.min(1, a.life)).fillCircle(a.x, a.y, a.R);
          break;
        case 'foeslam': f.lineStyle(3, 0xff3030, 0.9).strokeCircle(a.x, a.y, a.R).fillStyle(0xff3030, 0.35 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R); break;
        case 'lightning': f.lineStyle(2, 0xbfd8ff, 0.9).strokeCircle(a.x, a.y, a.R).fillStyle(0xbfd8ff, 0.35 * (1 - a.delay / a.max)).fillCircle(a.x, a.y, a.R); break;
        case 'flash': f.fillStyle(a.color, 0.35 * a.life / a.max).fillCircle(a.x, a.y, a.R); break;
      }
    }
    for (const p of this.parts) f.fillStyle(p.color, p.life / p.max).fillCircle(p.x, p.y, p.size * (0.4 + 0.6 * p.life / p.max));
    if (P.slowT > 0) f.lineStyle(2, P.slowF < 0.3 ? 0xf0f0f0 : 0xc040ff, 0.8).strokeCircle(P.x, P.y, 16 + Math.sin(this.t * 20) * 2);
    // 護盾
    if (P.shield > 0) f.lineStyle(2, 0x3aa7c7, 0.25 + 0.5 * P.shield / P.maxShield).strokeCircle(P.x, P.y, 20);
    // 路人血條
    for (const pb of this.pbs) {
      const col = pb.state === 'ally' || pb.state === 'friend' ? 0x5cc96b : pb.state === 'feud' ? (pb.side ? 0xff8080 : 0xa0d8ff) : pb.state === 'fighting' ? 0xcccccc : 0xe05555;
      this.hpBar(f, pb.x, pb.y + 20, 34, pb.hp / pb.maxHp, col);
    }
    for (const e of this.enemies) {
      if (e.boss || e.charger) this.hpBar(f, e.x, e.y + e.r + 5, e.r * 2, e.hp / e.maxHp, 0xe05555);
      if (!e.act) continue;
      if (e.act.kind === 'blink') f.lineStyle(2, ELEM_HEX[e.elem], 0.4 + 0.4 * Math.abs(Math.sin(this.t * 20))).strokeCircle(e.x, e.y, e.r + 8);
      // 衝鋒預警
      if (e.act.kind === 'charge' && e.act.phase === 'wind') {
        const len = e.boss ? 540 : 250, a = e.act.ang;
        const blink = 0.18 + 0.2 * Math.abs(Math.sin(this.t * 18));
        f.lineStyle(e.r * 2, 0xff3030, blink).lineBetween(e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len);
      }
      if (e.act.kind === 'summon') f.lineStyle(3, 0xff3030, 0.6).strokeCircle(e.x, e.y, e.r + 20 * (1 - e.act.t / 0.8) + 4);
    }
    if (this.duel) {
      const D = this.duel, pulse = 0.6 + 0.3 * Math.sin(this.t * 4);
      f.lineStyle(4000, 0x07000f, 0.9).strokeCircle(D.cx, D.cy, D.R + 2000);
      f.lineStyle(8, 0xb060ff, pulse).strokeCircle(D.cx, D.cy, D.R);
      f.lineStyle(2, 0xe0b0ff, 0.5).strokeCircle(D.cx, D.cy, D.R - 14);
      for (let i = 0; i < 12; i++) {
        const a = this.t * 0.6 + i / 12 * Math.PI * 2;
        f.fillStyle(0xe0b0ff, pulse).fillCircle(D.cx + Math.cos(a) * (D.R - 7), D.cy + Math.sin(a) * (D.R - 7), 4);
      }
    }
    if (this.zone) {
      const Z = this.zone, pulse = 0.6 + 0.3 * Math.sin(this.t * 6);
      f.lineStyle(6000, 0x14062a, 0.5).strokeCircle(Z.cx, Z.cy, Z.R + 3000);
      f.lineStyle(5, 0x9a6bff, pulse).strokeCircle(Z.cx, Z.cy, Z.R);
      for (let i = 0; i < 24; i++) {
        const a = this.t * 0.3 + i / 24 * Math.PI * 2;
        f.fillStyle(0xd8c0ff, pulse * 0.8).fillCircle(Z.cx + Math.cos(a) * Z.R, Z.cy + Math.sin(a) * Z.R, 3);
      }
    }
    // 邊界
    f.lineStyle(4, 0x6b2020, 0.8).strokeRect(0, 0, WORLD, WORLD);
    this.drawIndicators();
  }

  // 畫面外的重要目標：在螢幕邊緣畫箭頭
  drawIndicators() {
    const g = this.ind, cam = this.cameras.main, v = cam.worldView;
    g.clear();
    if (this.duel) return;
    const W = cam.width, H = cam.height, cx = W / 2, cy = H / 2, m = 26;
    const mark = (x, y, color, big) => {
      const sx = x - v.x, sy = y - v.y;
      if (sx > 0 && sy > 0 && sx < W && sy < H) return;
      const a = Math.atan2(sy - cy, sx - cx);
      const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const px = cx + Math.cos(a) * k, py = cy + Math.sin(a) * k, s = big ? 13 : 9;
      g.fillStyle(color, 0.95).fillTriangle(
        px + Math.cos(a) * s, py + Math.sin(a) * s,
        px + Math.cos(a + 2.5) * s, py + Math.sin(a + 2.5) * s,
        px + Math.cos(a - 2.5) * s, py + Math.sin(a - 2.5) * s);
      g.lineStyle(1.5, 0x000000, 0.7).strokeCircle(px - Math.cos(a) * 4, py - Math.sin(a) * 4, big ? 5 : 3);
    };
    for (const s of this.sects) mark(s.x, s.y, ELEM_HEX[s.elem]);
    for (const o of this.pois) mark(o.x, o.y, o.color);
    for (const B of this.battles) mark(B.x, B.y, 0xffd98a);
    for (const e of this.enemies) if (e.boss) mark(e.x, e.y, 0xff3030, true);
    if (this.outside && this.zone) mark(this.zone.cx, this.zone.cy, 0x9a6bff, true);
  }

  hpBar(g, x, y, w, frac, color) {
    g.fillStyle(0x000000, 0.6).fillRect(x - w / 2, y, w, 4);
    g.fillStyle(color, 1).fillRect(x - w / 2, y, w * clamp(frac, 0, 1), 4);
  }

  addPart(x, y, vx, vy, color, size, life) {
    if (this.parts.length > 700) return;
    this.parts.push({ x, y, vx, vy, color, size, life, max: life });
  }

  burst(x, y, color, n, speed, size, life) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(0.3, 1) * speed;
      this.addPart(x, y, Math.cos(a) * v, Math.sin(a) * v, color, size, life * rand(0.6, 1));
    }
  }

  updateParts(dt) {
    const drag = Math.pow(0.04, dt);
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= drag; p.vy *= drag;
    }
    this.parts = this.parts.filter(p => p.life > 0);
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

  endGame(win, reason) {
    if (this.over) return;
    this.endReason = reason;
    this.over = true;
    setIntensity(0);
    win ? sfx.win() : sfx.lose();
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
