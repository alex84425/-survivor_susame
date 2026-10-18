// 修仙 v3：黑帝斯 × 黑夜君臨。第一階段＝單挑手感測試場
import { sfx, initAudio, toggleMute, toggleBgm, setIntensity } from '../sfx.js';
import { ELEMS, ELEM_CSS, ELEM_HEX, elemMult, PX_FACE } from '../data.js';
import { CLASSES, ENEMIES, BOONS, LEVEL } from './kits.js';
import { preloadImages, makeTextures, unitTex } from './gfx.js';
import { preloadVfx, Vfx } from './vfx.js';

const W = 9000;
const params = new URLSearchParams(location.search);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const angDiff = (a, b) => Math.abs(Phaser.Math.Angle.Wrap(a - b));
const $ = id => document.getElementById(id);

class Arena extends Phaser.Scene {
  constructor() { super('arena'); }
  init(data) { this.clsKey = (data && data.cls) || window.__cls || '金'; }
  preload() {
    preloadImages(this); preloadVfx(this);
    // 草原素材（Gemini 生成，tools/cutout.py 處理）；清單在 assets/env/env.json
    this.load.json('envlist', 'assets/env/env.json');
    this.load.on('filecomplete-json-envlist', (_k, _t, list) => { for (const k of list || []) if (!this.textures.exists('env_' + k)) this.load.image('env_' + k, `assets/env/${k}.png`); });
  }

  create() {
    makeTextures(this);
    for (const e of ELEMS) unitTex(this, `pl_${e}`, CLASSES[e].img, 58, ELEM_CSS[e], '修');
    for (const [k, T] of Object.entries(ENEMIES)) if (T.img) unitTex(this, `en_${k}`, T.img, T.size, ELEM_CSS[T.elem], T.name[0]);

    this.cameras.main.setBounds(0, 0, W, W);
    this.buildMeadow();
    this.vfx = new Vfx(this);
    this.tele = this.add.graphics().setDepth(1);
    this.fx = this.add.graphics().setDepth(6);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,Q,E,R,F,ENTER,M,B,ONE,TWO,THREE');
    this.input.keyboard.on('keydown', initAudio);
    this.input.on('pointerdown', initAudio);
    this.input.mouse.disableContextMenu();
    // 快速點擊時按下與放開可能落在同一幀，用事件記錄確保不漏
    this.clickL = 0; this.clickR = 0; this.upL = 0;
    this.input.on('pointerdown', p => { if (p.button === 0) this.clickL++; else if (p.button === 2) this.clickR++; });
    this.input.on('pointerup', p => { if (p.button === 0) this.upL++; });

    this.t = 0; this.over = false; this.hitstop = 0; this.slowmo = 0; this.hudT = 0;
    this.enemies = []; this.pp = []; this.ep = []; this.areas = []; this.parts = []; this.dps = [];
    this.prevL = false; this.prevR = false;
    this.texts = [];
    for (let i = 0; i < 30; i++) this.texts.push(this.add.text(0, 0, '', { fontFamily: 'Microsoft JhengHei', fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 }).setDepth(9).setOrigin(0.5).setVisible(false));
    this.textIdx = 0;

    this.initPlayer();
    this.cameras.main.startFollow(this.P.sprite, true, 0.12, 0.12);
    // 白天草原：玩家光源很淡（第二階段夜晚再加強）
    this.pLight = this.vfx.glow(this.P, 520, 0xfff0c0, 0.05).setDepth(-8);
    this.choice = null; this.choiceQ = [];
    this.clock = 0; this.clockMul = params.get('fast') ? +params.get('fast') : 1; this.night = -1; this.zoneTick = 0; this.nightInfo = '';
    this.nightShade = this.add.rectangle(0, 0, 4000, 4000, 0x0a1030, 0).setOrigin(0).setScrollFactor(0).setDepth(15);
    this.genWorld();
    hud.start(this);
    hud.toast(`主修：${this.P.elem}・${this.P.cls.name}。點亮篝火得心法、清妖巢開寶箱、殺怪得靈石回篝火升級。兩夜之後斬殺妖皇！`);
    hud.toast('左鍵普攻・右鍵戰技・E 撿到的戰技・Q 大招・空白閃避・R 丹藥・F 篝火/寶箱/處決', '#999');
    startBgmFile();
  }

  // ---------- 草原 ----------
  buildMeadow() {
    const tex = this.textures.exists('env_grass') ? 'env_grass' : 'grass_proc';
    // 素材草地偏亮，稍微壓暗讓角色與預警更突出
    this.add.tileSprite(0, 0, W, W, tex).setOrigin(0).setDepth(-10).setTint(tex === 'env_grass' ? 0xc8d4b8 : 0xffffff);
    // 深淺草地斑塊，打散平鋪的重複感
    for (let i = 0; i < 520; i++) this.add.ellipse(rand(0, W), rand(0, W), rand(200, 520), rand(140, 360), Math.random() < 0.5 ? 0x2e5a22 : 0x7aa850, rand(0.12, 0.22)).setDepth(-9).setAngle(rand(0, 180));
    // 地貌物件：有 Gemini 素材（160px）就用，沒有就用程式畫的備案；sc 是素材時的縮放範圍
    const prop = (k, fallback, sc, fsc) => this.textures.exists('env_' + k) ? ['env_' + k, sc] : [fallback, fsc];
    const keep = (x, y) => d2(x, y, W / 2, W / 2) > 300 * 300;
    const scatter = (n, k, fallback, sc, fsc, depth, avoid) => {
      const [tex, range] = prop(k, fallback, sc, fsc);
      for (let i = 0; i < n; i++) {
        const x = rand(0, W), y = rand(0, W);
        if (avoid && !keep(x, y)) continue;
        this.add.image(x, y, tex).setDepth(depth).setScale(rand(range[0], range[1])).setFlipX(Math.random() < 0.5);
      }
    };
    scatter(3600, 'tuft', 'tuft', [0.16, 0.26], [0.8, 1.2], -8, false);
    scatter(1500, 'flower', 'flower', [0.16, 0.24], [0.8, 1.3], -8, false);
    scatter(520, 'stone', 'stone2', [0.25, 0.45], [0.8, 1.6], -7, true);
    scatter(560, 'bush', 'bush2', [0.35, 0.55], [0.9, 1.4], -7, true);
    scatter(160, 'stump', 'bush2', [0.3, 0.4], [0.6, 0.8], -7, true);
    // 樹叢：在角色上層，走到樹後面會被遮住
    const [treeTex, treeSc] = prop('tree', 'tree2', [0.9, 1.35], [1, 1.5]);
    this.trees = [];
    for (let i = 0; i < 110; i++) {
      const cx = rand(200, W - 200), cy = rand(200, W - 200);
      if (!keep(cx, cy)) continue;
      for (let j = 0; j < 7; j++) {
        const x = cx + rand(-200, 200), y = cy + rand(-150, 150);
        if (keep(x, y)) this.trees.push(this.add.image(x, y, treeTex).setDepth(8 + y / W).setOrigin(0.5, 0.9).setScale(rand(treeSc[0], treeSc[1])).setFlipX(Math.random() < 0.5));
      }
    }
  }

  // ---------- 玩家 ----------
  initPlayer() {
    const C = CLASSES[this.clsKey];
    this.P = {
      elem: this.clsKey, cls: C, x: W / 2, y: W / 2 + 40, r: 14,
      level: 1, runes: 0, dmgMul: 1, boons: new Set(), eSkill: null, eLvl: 1, eCd: 0, lastHit: -9, critCount: 0, vajraT: 0,
      hp: C.hp, maxHp: C.hp, st: 100, maxSt: 100, stDelay: 0, mp: 60, maxMp: 100, ult: 0,
      flask: 3, flaskMax: 3, speed: C.speed,
      dodgeCd: 0, dashT: 0, dvx: 0, dvy: 0, inv: 0, dodgeAt: -9, stunT: 0, rootT: 0,
      act: null, mcharge: -1, holdT: 0, buffer: false, comboIdx: 0, comboT: 0, critNext: false, skillCd: 0, fireCd: 0, charge: -1, parry: 0, armorT: 0, pulseT: 0,
    };
    this.P.sprite = this.add.image(this.P.x, this.P.y, `pl_${this.clsKey}`).setDepth(4);
  }

  // ---------- 世界：篝火、妖巢、寶箱 ----------
  genWorld() {
    this.bonfires = []; this.camps = []; this.chests = [];
    const C = W / 2;
    this.addBonfire(C, C - 90);
    this.spawn('dummy', C + 230, C + 40); this.spawn('dummy', C + 300, C - 60);
    const G = 4, cs = W / G;
    for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
      const x = (gx + rand(0.25, 0.75)) * cs, y = (gy + rand(0.25, 0.75)) * cs;
      if (d2(x, y, C, C) > 1000 * 1000) this.addBonfire(x, y);
    }
    const COMPS = [
      [['wolf', 'wolf'], ['spider', 'spider'], ['wolf', 'spider'], ['snake', 'wolf']],
      [['wolf', 'wolf', 'wolf'], ['bear', 'wolf'], ['spider', 'spider', 'snake'], ['boar', 'wolf']],
      [['bear', 'spider', 'spider'], ['boar', 'boar', 'snake'], ['ogre', 'wolf'], ['bear', 'bear']],
      [['ogre', 'bear', 'spider'], ['ogre', 'boar', 'snake'], ['bear', 'bear', 'snake', 'wolf']],
    ];
    const G2 = 9, cs2 = W / G2;
    for (let gx = 0; gx < G2; gx++) for (let gy = 0; gy < G2; gy++) {
      const x = (gx + rand(0.2, 0.8)) * cs2, y = (gy + rand(0.2, 0.8)) * cs2;
      const dist = Math.hypot(x - C, y - C);
      if (dist < 650 || Math.random() < 0.2 || this.bonfires.some(b => d2(b.x, b.y, x, y) < 380 * 380)) continue;
      const tier = Math.min(3, Math.floor(dist / 1250));
      this.addCamp(x, y, tier, pick(COMPS[tier]));
    }
  }

  addBonfire(x, y) {
    const b = { x, y, lit: false };
    b.sprite = this.add.image(x, y, 'bonfire3_off').setDepth(1);
    this.bonfires.push(b);
  }

  addCamp(x, y, tier, list) {
    const c = { x, y, tier, members: [], cleared: false };
    list.forEach((k, i) => c.members.push(this.spawn(k, x + Math.cos(i * 2.1) * 75, y + Math.sin(i * 2.1) * 75, c, tier)));
    this.camps.push(c);
  }

  updateCamps() {
    for (const c of this.camps) {
      if (c.cleared || c.members.some(e => e.hp > 0)) continue;
      c.cleared = true;
      const ch = { x: c.x, y: c.y, tier: c.tier, open: false };
      ch.sprite = this.add.image(c.x, c.y, 'chest3').setDepth(2);
      ch.glow = this.vfx.glow(ch, 160, 0xffd98a, 0.5).setDepth(1);
      this.chests.push(ch);
      this.vfx.flash(c.x, c.y, 200, 0xffd98a, 400);
      hud.toast('清空妖巢，出現了寶箱（F 開啟）', '#ffd98a');
    }
  }

  openChest(ch) {
    const P = this.P;
    ch.open = true; ch.sprite.setTexture('chest3_open'); ch.glow.destroy();
    this.vfx.sparks(ch.x, ch.y, 0xffd98a, 24);
    sfx.item();
    const els = ELEMS.filter(e => e !== P.elem).sort(() => Math.random() - 0.5).slice(0, 2);
    const runes = Math.round(80 * (1 + ch.tier));
    const opts = els.map(e => {
      const S = CLASSES[e].skill, same = P.eSkill === e;
      return { label: `${same ? '強化' : P.eSkill ? '替換 E：' : '學會 E：'}${S.name}`, desc: `${e}屬戰技・${S.desc}（${S.cost} 真元）`, elem: e, kind: 'skill' };
    });
    opts.push({ label: `靈石 ×${runes}`, desc: '拿去篝火升級', kind: 'runes', n: runes });
    this.offer('寶箱・擇一', opts, i => {
      const o = opts[i];
      if (o.kind === 'runes') { P.runes += o.n; return; }
      if (P.eSkill === o.elem) P.eLvl++; else { P.eSkill = o.elem; P.eLvl = 1; P.eCd = 0; }
      hud.start(this);
    });
  }

  // ---------- 篝火：點亮給心法、回滿、用靈石升級 ----------
  rest(b) {
    const P = this.P;
    P.hp = P.maxHp; P.flask = P.flaskMax; P.mp = P.maxMp; P.st = P.maxSt;
    this.vfx.sparks(b.x, b.y, 0xff9a3c, 24);
    let lv = 0;
    while (P.level < LEVEL.max && P.runes >= LEVEL.cost(P.level)) {
      P.runes -= LEVEL.cost(P.level); P.level++; lv++;
      const k = 1 + LEVEL.hp; P.maxHp = Math.round(P.maxHp * k); P.hp = P.maxHp;
      P.dmgMul += LEVEL.dmg;
    }
    if (lv) { sfx.levelup(); hud.banner(`修為精進 ${lv} 級・Lv${P.level}`); }
    if (!b.lit) {
      b.lit = true; b.sprite.setTexture('bonfire3');
      b.glow = this.vfx.glow(b, 420, 0xff9a3c, 0.3).setDepth(-8);
      this.offerBoons('點亮篝火・五行祖師賜下心法');
    } else if (!lv) hud.toast('在篝火旁休息：肉身、丹藥、真元回滿', '#ff9a3c');
  }

  // ---------- 心法 ----------
  has(id) { return this.P.boons.has(id); }

  offerBoons(title) {
    const P = this.P, owned = P.boons;
    const elemsOwned = new Set([...owned].map(id => BOONS[id].elem).filter(Boolean));
    const singles = Object.keys(BOONS).filter(id => !BOONS[id].duo && !owned.has(id));
    const duos = Object.keys(BOONS).filter(id => BOONS[id].duo && !owned.has(id) && BOONS[id].duo.every(e => elemsOwned.has(e)));
    const opts = [];
    if (duos.length && Math.random() < 0.6) opts.push(pick(duos));
    const pool = singles.sort(() => Math.random() - 0.5).sort((a, b) => (BOONS[b].elem === P.elem) - (BOONS[a].elem === P.elem) + (Math.random() - 0.5) * 1.6);
    for (const id of pool) {
      if (opts.length >= 3) break;
      if (opts.some(o => BOONS[o].elem && BOONS[o].elem === BOONS[id].elem)) continue;
      opts.push(id);
    }
    if (!opts.length) return;
    this.offer(title, opts.map(id => ({ label: BOONS[id].name, desc: BOONS[id].desc, elem: BOONS[id].elem || BOONS[id].duo[0], duo: !!BOONS[id].duo })), i => this.applyBoon(opts[i]));
  }

  applyBoon(id) {
    const P = this.P;
    P.boons.add(id);
    if (id === 'mu_wind') P.speed *= 1.12;
    if (id === 'shui_tide') { P.maxMp += 40; P.mp += 40; }
    if (id === 'tu_rock') { P.maxHp = Math.round(P.maxHp * 1.25); P.hp = Math.min(P.maxHp, P.hp * 1.25); }
    hud.toast(`習得心法：<b>${BOONS[id].name}</b>　${BOONS[id].desc}`, ELEM_CSS[BOONS[id].elem || BOONS[id].duo[0]]);
  }

  // ---------- 抉擇（遊戲不暫停） ----------
  offer(title, opts, cb) {
    if (this.choice) { this.choiceQ.push([title, opts, cb]); return; }
    this.choice = { title, opts, cb };
    hud.showChoice(this);
  }

  pickChoice(i) {
    const c = this.choice;
    if (!c || !c.opts[i]) return;
    this.choice = null;
    hud.hideChoice();
    sfx.select();
    c.cb(i);
    if (this.choiceQ.length) this.offer(...this.choiceQ.shift());
  }

  // ---------- 兩夜與結界 ----------
  // 第一夜 0～9 分：5 分起收縮、8.5 分夜王翼虎；第二夜 9～18 分：14 分起收縮、17.5 分夜王蛟龍；18 分起最終王
  updateNight(dt) {
    const P = this.P;
    this.clock += dt * this.clockMul;
    const t = this.clock, DAY = 540;
    const night = t < DAY ? 0 : t < DAY * 2 ? 1 : 2;
    if (night !== this.night) {
      this.night = night;
      if (night < 2) {
        const C = W / 2, spread = night === 0 ? 700 : 1800;
        const cx = clamp(C + rand(-spread, spread), 2200, W - 2200), cy = clamp(C + rand(-spread, spread), 2200, W - 2200);
        this.zone = { cx, cy, R0: night === 0 ? 4400 : 3800, Rmin: 850, R: night === 0 ? 4400 : 3800 };
        hud.banner(night === 0 ? '第一夜' : '第二夜');
        if (night === 1) hud.toast('新的一夜：天雷結界在別處重新展開', '#b090ff');
      } else {
        this.zone = { cx: this.zone.cx, cy: this.zone.cy, R0: this.zone.R, Rmin: 700, R: this.zone.R };
        hud.banner('決戰');
      }
      this.flags = {};
    }
    const Z = this.zone, tn = t - night * DAY, F = this.flags;
    if (night < 2) {
      Z.R = Z.R0 + (Z.Rmin - Z.R0) * clamp((tn - 300) / 200, 0, 1);
      if (tn >= 300 && !F.shrink) { F.shrink = true; hud.toast('⚡ 天雷結界開始收縮！', '#b090ff'); }
      if (tn >= 510 && !F.boss) { F.boss = true; this.spawnBoss(night === 0 ? 'tiger' : 'dragon'); }
    } else {
      Z.R = Z.R0 + (Z.Rmin - Z.R0) * clamp(tn / 40, 0, 1);
      if (!F.boss) { F.boss = true; this.spawnBoss('emperor'); }
    }
    // 結界外受雷擊
    this.outside = d2(P.x, P.y, Z.cx, Z.cy) > Z.R * Z.R;
    if (this.outside && (this.zoneTick -= dt) <= 0) {
      this.zoneTick = 0.5;
      P.hp -= P.maxHp * 0.04; P.lastHit = this.t;
      this.vfx.bolt(P.x, P.y, 0xbfd8ff);
      if (P.hp <= 0) { P.hp = 0; this.gameOver(); }
    }
    // 夜色：每一夜越來越暗
    const dark = night < 2 ? 0.34 * clamp(tn / DAY, 0, 1) : 0.4;
    this.nightShade.setAlpha(dark);
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const sec = x => Math.max(0, x / this.clockMul);
    const tag = ['第一夜', '第二夜', '決戰'][night];
    if (night === 2) this.nightInfo = `${tag}・斬殺妖皇`;
    else if (tn < 300) this.nightInfo = `${tag}・結界 ${fmt(sec(300 - tn))} 後收縮`;
    else if (tn < 510) this.nightInfo = `${tag}・夜王 ${fmt(sec(510 - tn))} 後現身`;
    else this.nightInfo = `${tag}・夜王現身`;
  }

  spawnBoss(type) {
    const P = this.P, Z = this.zone;
    const a = rand(0, Math.PI * 2), r = Math.min(350, Z.R * 0.5);
    const x = clamp(Z.cx + Math.cos(a) * r, 100, W - 100), y = clamp(Z.cy + Math.sin(a) * r, 100, W - 100);
    const b = this.spawn(type, x, y, null, 0);
    b.aggro = true; b.announced = true;
    hud.banner(ENEMIES[type].name);
    this.cameras.main.shake(500, 0.008);
    sfx.roar();
    if (d2(P.x, P.y, x, y) > 900 * 900) hud.toast(`${ENEMIES[type].name}在結界中央現身，看小地圖紅點`, '#ff5050');
  }

  spawn(type, x, y, camp, tier = 0) {
    const T = ENEMIES[type];
    const hp = T.hp * (1 + 0.5 * tier);
    const e = {
      type, T, x, y, r: T.r, hp, maxHp: hp, poise: T.poise * (1 + 0.3 * tier), maxPoise: T.poise * (1 + 0.3 * tier), elem: T.elem, tier, dmgMul: 1 + 0.25 * tier,
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
    this.updateNight(dt);
    this.updatePlayer(dt);
    this.updateEnemies(edt);
    this.updateCamps();
    this.updatePProj(dt);
    this.updateEProj(edt);
    this.updateAreas(dt, edt);
    this.updateParts(dt);
    // 玩家附近的樹變半透明，避免擋住預警
    for (const tr of this.trees) {
      const near = Math.abs(tr.x - this.P.x) < 260 && this.P.y < tr.y + 20 && tr.y - this.P.y < 230;
      const want = near ? 0.35 : 1;
      if (tr.alpha !== want) tr.setAlpha(tr.alpha + (want - tr.alpha) * Math.min(1, dt * 10));
    }
    this.draw();
    // 背景音樂：探索 → 妖王在附近時戰鬥曲 → 妖皇決戰
    const nearBoss = this.enemies.find(e => e.T.boss && e.aggro && e.hp > 0 && d2(e.x, e.y, this.P.x, this.P.y) < 1600 * 1600);
    setIntensity(nearBoss ? (nearBoss.T.final ? 2 : 1) : 0);
    setBgmMode(nearBoss ? (nearBoss.T.final ? 2 : 1) : 0);
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
    const Lp = (L && !this.prevL) || this.clickL > 0, Lr = (!L && this.prevL) || (this.upL > 0 && !L), Rp = (R && !this.prevR) || this.clickR > 0;
    this.clickL = 0; this.clickR = 0; this.upL = 0;
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
    const dodgeCost = this.has('mu_wind') ? 15 : 22;
    if (JD(k.SPACE) && P.dodgeCd <= 0 && P.st >= dodgeCost && P.stunT <= 0 && P.dashT <= 0) {
      const a = mx || my ? Math.atan2(my, mx) : this.aim;
      P.dvx = Math.cos(a) * 1250; P.dvy = Math.sin(a) * 1250;
      P.dashT = 0.16; P.inv = 0.26; P.dodgeAt = this.t; P.dodgeCd = 0.32;
      P.st -= dodgeCost; P.stDelay = 0.6;
      if (this.has('duo_rainwood')) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.03);
      P.act = null; P.charge = -1;
      if (P.elem === '金') P.critNext = true;
      sfx.dash();
    }

    // 移動
    if (P.dashT > 0) {
      P.dashT -= dt;
      P.x += P.dvx * dt; P.y += P.dvy * dt;
      P.ghostT = (P.ghostT || 0) - dt;
      if (P.ghostT <= 0) { P.ghostT = 0.025; this.vfx.ghost(P.sprite, ELEM_HEX[P.elem]); }
    } else if (P.stunT <= 0 && P.rootT <= 0 && (mx || my)) {
      let mul = P.act ? P.act.move : 1;
      if (P.mcharge >= 0) mul = Math.min(mul, 0.4);
      if (P.charge >= 0) mul = Math.min(mul, C.basic.move);
      const l = Math.hypot(mx, my);
      P.x += mx / l * P.speed * mul * dt; P.y += my / l * P.speed * mul * dt;
    }
    P.x = clamp(P.x, 20, W - 20); P.y = clamp(P.y, 20, W - 20);
    P.sprite.setPosition(P.x, P.y).setFlipX(Math.cos(this.aim) * (PX_FACE[C.img] || 1) < 0);
    P.sprite.setAlpha(P.inv > 0 ? 0.6 : 1);
    // 程序動畫：待機呼吸、移動晃動、受擊壓扁、出招前傾
    P.sq = (P.sq || 0) * Math.pow(0.0005, dt); P.lean = (P.lean || 0) * Math.pow(0.001, dt);
    const moving = (mx || my) && P.dashT <= 0;
    const bob = moving ? Math.sin(this.t * 16) * 0.05 : Math.sin(this.t * 3) * 0.02;
    P.sprite.setScale(1 + P.sq, 1 - P.sq + bob).setRotation((moving ? Math.sin(this.t * 8) * 0.07 : 0) + P.lean * Math.sign(Math.cos(this.aim) || 1));
    this.pLight.setPosition(P.x, P.y);

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
      if ((L || Lp) && free && P.charge < 0) P.charge = 0;
      if (P.charge >= 0) {
        P.charge += dt;
        if (Lr || P.stunT > 0) { if (P.stunT <= 0) this.basicFire(P.charge); P.charge = -1; }
      }
    } else {
      if (Lp) { if (free) this.basicCombo(); else P.buffer = true; P.holdT = 0; }
      if (L) {
        P.holdT = (P.holdT || 0) + dt;
        if (C.basic.charged && P.holdT > 0.3 && !P.act && P.stunT <= 0 && P.dashT <= 0) P.mcharge = P.mcharge >= 0 ? P.mcharge + dt : 0;
      } else {
        if (P.mcharge >= 0.35) this.chargedAttack();
        P.mcharge = -1; P.holdT = 0;
      }
      if (P.buffer && free && P.mcharge < 0) { P.buffer = false; this.basicCombo(); }
    }

    // 戰技
    if (Rp && P.skillCd <= 0 && P.stunT <= 0 && P.dashT <= 0 && (!P.act || P.elem === '水')) {
      if (P.mp < C.skill.cost) hud.toast('真元不足', '#3aa7c7');
      else { P.mp -= C.skill.cost; P.skillCd = C.skill.cd * (this.has('shui_tide') ? 0.75 : 1); P.charge = -1; this.castSkill(P.elem, 1.25); }
    }
    P.eCd -= dt;
    if (JD(k.E)) {
      const S = P.eSkill && CLASSES[P.eSkill].skill;
      if (!S) hud.toast('E 格還沒有戰技：清空妖巢開寶箱可以拿到', '#999');
      else if (P.eCd > 0 || P.stunT > 0 || P.dashT > 0 || (P.act && P.eSkill !== '水')) { /* 冷卻或動作中 */ }
      else if (P.mp < S.cost) hud.toast('真元不足', '#3aa7c7');
      else { P.mp -= S.cost; P.eCd = S.cd * (this.has('shui_tide') ? 0.75 : 1); P.charge = -1; this.castSkill(P.eSkill, 1 + 0.25 * (P.eLvl - 1)); }
    }
    // 抉擇
    if (this.choice) { if (JD(k.ONE)) this.pickChoice(0); else if (JD(k.TWO)) this.pickChoice(1); else if (JD(k.THREE)) this.pickChoice(2); }
    // 心法：回春、金剛劍計時
    if (this.has('mu_spring') && this.t - P.lastHit > 3) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.015 * dt);
    P.vajraT -= dt;
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
    this.nearFire = this.bonfires.find(b => d2(P.x, P.y, b.x, b.y) < 90 * 90) || null;
    this.nearChest = this.chests.find(c => !c.open && d2(P.x, P.y, c.x, c.y) < 80 * 80) || null;
    if (JD(k.F)) {
      if (this.execTarget && P.stunT <= 0) this.execute(this.execTarget);
      else if (this.nearChest) this.openChest(this.nearChest);
      else if (this.nearFire) this.rest(this.nearFire);
    }
  }

  startAct(o) { this.P.act = { t: 0, fired: false, move: 0.5, ang: this.aim, ...o }; }

  // ---------- 普攻 ----------
  basicCombo() {
    const P = this.P, C = P.cls, steps = C.basic.steps;
    const i = P.comboT > 0 ? P.comboIdx : 0;
    const s = steps[i];
    P.comboIdx = (i + 1) % steps.length;
    // 吸附：前方 220 內有敵人就轉向並在前搖期間突進到他面前
    const tg = this.snapTarget(220);
    let ang = this.aim, dist = s.lunge ? Math.min(s.lunge, 30) : 0;
    if (tg) {
      ang = Math.atan2(tg.y - P.y, tg.x - P.x);
      const d = Math.hypot(tg.x - P.x, tg.y - P.y) - tg.r - P.r;
      dist = clamp(d - s.range * 0.45, 0, 90 + (s.lunge > 60 ? 40 : 0));
    }
    const lt = Math.max(s.wind, 0.07);
    this.startAct({
      wind: s.wind, rec: s.rec, move: C.basic.move, combo: true, ang, armor: P.elem === '土',
      lungeT: dist > 0 ? lt : 0, lungeV: dist / lt,
      fire: () => {
        P.lean = s.heavy ? 0.3 : 0.18; P.sq = s.heavy ? 0.12 : 0.06;
        this.slashFx(P.x, P.y, ang, s.range, s.half, ELEM_HEX[P.elem], s.heavy);
        const n = this.hitArc(P.x, P.y, ang, s.range, s.half, s.dmg, { poise: s.poise, basic: true, melee: true, heavy: s.heavy, kb: s.heavy ? 240 : 110 });
        sfx.shoot(P.elem);
        if (n) {
          this.hitstop = Math.max(this.hitstop, s.heavy ? 0.07 : 0.03);
          if (C.basic.mpHit) P.mp = Math.min(P.maxMp, P.mp + C.basic.mpHit * n);
          if (C.basic.shieldHit) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * C.basic.shieldHit);
        }
        if (s.wave) this.shootP({ x: P.x, y: P.y, ang, speed: 1000, dmg: s.wave.dmg, poise: 10, life: s.wave.range / 1000 + 0.06, r: 22, tex: 'sw_金', pierce: 99, scale: 2.6, trail: ELEM_HEX['金'] });
      },
    });
  }

  // 近戰吸附的目標：瞄準方向 ±70° 內最近的敵人
  snapTarget(range) {
    const P = this.P;
    let best = null, bd = range * range;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dd = d2(e.x, e.y, P.x, P.y);
      if (dd > bd || angDiff(Math.atan2(e.y - P.y, e.x - P.x), this.aim) > 1.2) continue;
      bd = dd; best = e;
    }
    return best;
  }

  // 蓄力重擊（按住左鍵放開）
  chargedAttack() {
    const P = this.P, K = P.cls.basic.charged, tg = this.snapTarget(260);
    const ang = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : this.aim;
    switch (K.kind) {
      case 'thrust':
        this.startAct({ wind: 0.05, rec: 0.3, move: 0, ang, fire: () => {
          P.dashT = 0.16; P.dvx = Math.cos(ang) * K.len / 0.16; P.dvy = Math.sin(ang) * K.len / 0.16; P.inv = 0.18;
          this.dashHit = { hit: new Set(), until: this.t + 0.28, dmg: K.dmg, poise: K.poise };
          this.vfx.slash(P.x + Math.cos(ang) * 60, P.y + Math.sin(ang) * 60, ang, K.len * 0.6, ELEM_HEX['金'], true);
          this.vfx.flash(P.x, P.y, 120, ELEM_HEX['金'], 200);
          sfx.dash();
        } });
        break;
      case 'quake':
        this.startAct({ wind: 0.12, rec: 0.4, move: 0, armor: true, fire: () => {
          this.hitCircle(P.x, P.y, K.R, K.dmg, { poise: K.poise, kb: 420, heavy: true, melee: true });
          this.ringFx(P.x, P.y, K.R, ELEM_HEX['土']);
          this.vfx.dirt(P.x, P.y, 24); this.vfx.smoke(P.x, P.y, 8); this.vfx.punch(0.06, 110);
          this.cameras.main.shake(220, 0.01); this.hitstop = 0.1; sfx.slam();
        } });
        break;
      case 'vortex':
        this.startAct({ wind: 0.1, rec: 0.35, move: 0.2, fire: () => {
          for (const e of this.enemies) {
            if (e.hp <= 0 || d2(e.x, e.y, P.x, P.y) > (K.R + e.r) ** 2) continue;
            if (!e.T.boss && !e.T.dummy) { const a = Math.atan2(P.y - e.y, P.x - e.x); e.kx += Math.cos(a) * 520; e.ky += Math.sin(a) * 520; }
          }
          this.hitCircle(P.x, P.y, K.R, K.dmg, { poise: K.poise, heavy: true });
          this.vfx.vortex(P.x, P.y, K.R, ELEM_HEX['水']);
          this.hitstop = 0.06; sfx.slow();
        } });
        break;
    }
  }

  basicWood() {
    const P = this.P, C = P.cls.basic;
    this.shootP({ x: P.x, y: P.y, ang: this.aim + rand(-0.04, 0.04), speed: C.speed, dmg: C.dmg, poise: C.poise, life: C.life, r: 8, tex: 'leaf_木', homing: C.homing, basic: true, trail: 0x5cc96b });
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
  castSkill(elem = this.P.elem, mul = 1) {
    const P = this.P, S0 = CLASSES[elem].skill, S = { ...S0, dmg: S0.dmg * mul };
    switch (elem) {
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
          this.vfx.dirt(P.x, P.y, 18); this.vfx.smoke(P.x, P.y, 6); this.vfx.punch(0.04);
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
    m *= P.dmgMul;
    if (o.basic && this.has('jin_edge')) m *= 1.2;
    if (this.has('jin_hunt') && (e.markT > 0 || e.hp < e.maxHp * 0.4)) m *= 1.2;
    if (this.has('huo_heart') && e.burn > 0) m *= 1.25;
    if (P.vajraT > 0) m *= 1.4;
    if (o.basic && (P.critNext || P.critCount > 0)) { m *= 1.5; crit = true; if (P.critCount > 0) P.critCount--; else P.critNext = false; }
    const dmg = base * m * rand(0.95, 1.05);
    e.hp -= dmg;
    if (e.T.dummy) { this.dps.push([this.t, dmg]); e.hp = e.maxHp; }
    e.flash = 0.07; e.sprite.setTintFill(0xffffff);
    e.sq = o.heavy ? 0.22 : 0.12;
    this.vfx.hit(e.x, e.y, ELEM_HEX[P.elem], o.heavy || crit);
    if (o.heavy || crit) this.vfx.punch(o.exec ? 0.07 : 0.025);
    sfx.hit();
    if (!e.aggro) this.alert(e);
    if (o.poise && e.stagT <= 0) {
      e.poise -= o.poise * (o.exec ? 0 : 1);
      if (e.poise <= 0) this.stagger(e);
    }
    const burn = (o.burn || 0) + (this.has('huo_karma') ? 1 : 0);
    if (burn) { e.burn = Math.min(6, e.burn + burn); e.burnT = 4; }
    if (crit && this.has('duo_frostblade')) e.freezeT = Math.max(e.freezeT, 1);
    if (this.has('mu_bind') && Math.random() < 0.12) e.rootT = Math.max(e.rootT, 1);
    if (this.has('shui_frost')) { e.slowT = 1.5; e.slowF = Math.min(e.slowF, 0.7); }
    if (o.heavy && !o.echo && this.has('tu_quake')) this.hitCircle(e.x, e.y, 90, 25, { poise: 8, echo: true });
    if (o.heavy && !o.echo && this.has('duo_lava') && (this.lavaT || 0) < this.t) { this.lavaT = this.t + 0.5; this.areas.push({ own: 'p', kind: 'zone', x: e.x, y: e.y, R: 70, life: 2, max: 2, tick: 0.4, tickT: 0, dmg: 8, poise: 2, burn: 1, color: ELEM_HEX['火'] }); }
    if (o.root) e.rootT = o.root;
    if (o.mark) e.markT = o.mark;
    if (o.slow) { e.slowT = 0.3; e.slowF = o.slow; }
    if (o.melee && !e.T.boss && e.atk && e.atk.phase === 'wind') e.atk.t -= 0.12;
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
    this.vfx.execute(e.x, e.y);
    this.popText(e.x, e.y - e.r - 34, '處決', '#ff5050', 28);
    this.hitstop = 0.18;
    this.cameras.main.shake(220, 0.01);
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.05);
    P.ult = Math.min(100, P.ult + 15);
    if (this.has('duo_vajra')) P.vajraT = 6;
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
    const sp = e.sprite;
    sp.setTintFill(0xffffff);
    this.tweens.add({ targets: sp, alpha: 0, scaleX: 1.4, scaleY: 0.2, duration: 260, ease: 'Cubic.In', onComplete: () => sp.destroy() });
    this.vfx.sparks(e.x, e.y, ELEM_HEX[e.elem], e.T.boss ? 30 : 14);
    this.vfx.smoke(e.x, e.y, e.T.boss ? 10 : 4);
    this.vfx.flash(e.x, e.y, e.T.boss ? 260 : 90, ELEM_HEX[e.elem], 260);
    sfx.kill();
    const gain = Math.round((e.T.exp || 0) * (1 + 0.5 * (e.tier || 0)));
    if (gain) { this.P.runes += gain; this.popText(e.x, e.y - e.r - 20, `+${gain} 靈石`, '#7fffe0', 15); }
    if (this.has('huo_burst') && !e.T.dummy) { this.hitCircle(e.x, e.y, 100, 40, { poise: 10, echo: true }); this.vfx.flash(e.x, e.y, 200, 0xff8a2a, 250); }
    if (this.has('duo_wildfire') && e.burn > 0) for (const o of this.enemies) if (o.hp > 0 && d2(o.x, o.y, e.x, e.y) < 160 * 160) { o.burn = Math.min(6, o.burn + 3); o.burnT = 4; }
    if (e.T.boss) {
      sfx.bossDie();
      if (e.T.final) { this.time.delayedCall(1500, () => this.victory()); hud.banner('妖皇伏誅'); }
      else { hud.banner(`${e.T.name}伏誅`); this.offerBoons('擊敗夜王・五行祖師賜下心法'); this.P.flask = this.P.flaskMax; }
    }
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
      if (this.has('shui_mirror')) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.08);
      if (src && src.hp > 0) { this.stagger(src); src.freezeT = 1.5; }
      this.popText(P.x, P.y - 40, '彈反', '#7fd0ff', 24);
      this.vfx.sigil(P.x, P.y, 70, 0x7fd0ff, 500);
      this.vfx.hit(P.x + Math.cos(this.aim) * 20, P.y + Math.sin(this.aim) * 20, 0xbfe8ff, true);
      this.ringFx(P.x, P.y, 60, ELEM_HEX['水']);
      this.hitstop = 0.12;
      sfx.craft();
      return false;
    }
    const dr = (P.armorT > 0 ? 0.3 : 1) * (P.elem === '土' && P.act && P.act.armor ? 0.7 : 1) * (this.has('tu_thick') ? 0.85 : 1);
    P.lastHit = this.t;
    P.hp -= dmg * dr;
    P.sq = 0.28;
    this.vfx.hit(P.x, P.y, 0xff3030, true);
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
    if (this.has('jin_heart')) P.critCount = 3;
    if (this.has('shui_mirror')) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.08);
    P.mp = Math.min(P.maxMp, P.mp + 10);
    this.popText(P.x, P.y - 44, '神識・完美閃避', '#c0a0ff', 20);
    this.vfx.ring(P.x, P.y, 140, 0xb090ff, 500);
    this.vfx.flash(P.x, P.y, 160, 0x9a70ff, 300);
    sfx.slow();
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
        if (e.burnTick <= 0) { e.burnTick = 0.5; e.hp -= e.burn * 1.5; if (e.hp <= 0) { this.kill(e); continue; } }
        if (Math.random() < 0.25 * e.burn) this.vfx.flame(e.x + rand(-e.r, e.r) * 0.6, e.y + rand(-e.r, e.r) * 0.4);
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
      e.sq = (e.sq || 0) * Math.pow(0.002, dt);
      let ant = 0;
      if (e.atk && e.atk.phase === 'wind') ant = clamp(e.atk.t / e.atk.wind, 0, 1);
      if (e.atk && e.atk.phase === 'dash') e.sprite.setScale(1.25, 0.85);
      else e.sprite.setScale((1 + e.sq) * (1 + 0.1 * ant), (1 - e.sq) * (1 + 0.1 * ant + Math.sin(this.t * 4 + e.x) * 0.02));
      e.sprite.setRotation(ant ? -Math.cos(e.atk.ang) * 0.12 * ant : 0);
      if (ant > 0.7 && Math.random() < 0.3) this.part(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), 0, 0, 0xff4040);
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
      if (!a.hitP && d2(e.x, e.y, P.x, P.y) < (e.r + P.r + st.width * 0.3) ** 2) { a.hitP = true; this.hitPlayer(st.dmg * e.dmgMul, e); }
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
        if (dd < st.range + P.r && angDiff(Math.atan2(P.y - e.y, P.x - e.x), a.ang) < st.half) this.hitPlayer(st.dmg * e.dmgMul, e);
        this.vfx.claw(e.x, e.y, a.ang, st.range);
        e.sq = -0.15;
        break;
      }
      case 'line':
        if (st.dash) { a.phase = 'dash'; a.hitP = false; sfx.dash(); return; }
        break;
      case 'circle': {
        const cx = st.at === 'self' ? e.x : a.tx, cy = st.at === 'self' ? e.y : a.ty;
        if (d2(P.x, P.y, cx, cy) < (st.R + P.r) ** 2) this.hitPlayer(st.dmg * e.dmgMul, e);
        this.ringFx(cx, cy, st.R, 0xff4040);
        this.vfx.dirt(cx, cy, st.rock ? 16 : 10); this.vfx.smoke(cx, cy, 4);
        sfx.slam();
        break;
      }
      case 'ring':
        this.areas.push({ own: 'e', kind: 'ring', x: e.x, y: e.y, r: e.r, R: st.R, speed: st.speed, dmg: st.dmg * e.dmgMul, src: e, hit: false });
        sfx.roar();
        break;
      case 'proj':
        for (let i = 0; i < st.n; i++) {
          const ang = a.ang + (st.n > 1 ? (i / (st.n - 1) - 0.5) * st.spread * 2 : 0);
          this.shootE({ x: e.x, y: e.y, ang, speed: st.speed, dmg: st.dmg * e.dmgMul, r: st.size, tex: st.tex, root: st.root, src: e });
        }
        sfx.barrage();
        break;
      case 'hop':
        a.phase = 'hop'; return;
      case 'pool':
        this.areas.push({ own: 'e', kind: 'pool', x: a.tx, y: a.ty, R: st.R, life: st.life, tick: 0.5, tickT: 0, dmg: st.dmg * e.dmgMul, src: e });
        break;
      case 'summon':
        for (let i = 0; i < st.n; i++) { const w = this.spawn(st.type, e.x + rand(-80, 80), e.y + rand(-80, 80), null, 1); w.aggro = true; }
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
    p.sprite = this.add.image(o.x, o.y, o.tex).setDepth(5).setRotation(o.ang).setScale(o.scale || 1).setBlendMode(Phaser.BlendModes.ADD);
    p.glow = this.vfx.glow(p, (o.r || 8) * 7 * (o.scale || 1), o.trail || ELEM_HEX[this.P.elem], 0.55);
    this.pp.push(p);
  }

  shootE(o) {
    const p = { ...o, vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, life: 3 };
    p.sprite = this.add.image(o.x, o.y, o.tex).setDepth(5).setRotation(o.ang).setScale(o.r / 7);
    p.glow = this.vfx.glow(p, o.r * 9, o.tex === 'venom' ? 0x8be02c : o.tex === 'web' ? 0xffffff : o.tex === 'wave' ? 0xff80ff : 0xff5030, 0.5);
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
      p.sprite.setPosition(p.x, p.y); p.glow.setPosition(p.x, p.y);
      if (p.trail) this.part(p.x, p.y, 0, 0, p.trail);
      for (const e of this.enemies) {
        if (e.hp <= 0 || p.hit.has(e) || d2(e.x, e.y, p.x, p.y) > (e.r + p.r) ** 2) continue;
        p.hit.add(e);
        if (p.explode) {
          this.hitCircle(p.x, p.y, p.explode, p.dmg, { poise: p.poise, burn: p.burn, basic: p.basic, heavy: p.heavy, kb: 160 });
          this.ringFx(p.x, p.y, p.explode, ELEM_HEX['火']);
          this.vfx.flash(p.x, p.y, p.explode * 2, 0xff8a2a, 260); this.vfx.smoke(p.x, p.y, p.heavy ? 6 : 2);
          for (let i = 0; i < (p.heavy ? 8 : 3); i++) this.vfx.flame(p.x + rand(-p.explode, p.explode) * 0.5, p.y + rand(-p.explode, p.explode) * 0.5);
          if (p.heavy) { this.hitstop = 0.06; this.cameras.main.shake(140, 0.006); }
          sfx.slam();
        } else this.hurtE(e, p.dmg, { poise: p.poise, burn: p.burn, root: p.root, basic: p.basic, heavy: p.heavy, kx: p.x - p.vx, ky: p.y - p.vy, kb: 60 });
        if (--p.pierce < 0) { p.life = 0; break; }
      }
      if (p.life <= 0) { p.sprite.destroy(); p.glow.destroy(); }
    }
    this.pp = this.pp.filter(p => p.life > 0);
  }

  updateEProj(dt) {
    const P = this.P;
    for (const p of this.ep) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y); p.glow.setPosition(p.x, p.y);
      if (d2(p.x, p.y, P.x, P.y) < (p.r + P.r) ** 2) {
        if (this.hitPlayer(p.dmg, null) && p.root) { P.rootT = p.root; hud.toast('被蛛網纏住了！', '#f0f0f0'); }
        if (P.inv <= 0 || P.parry > 0) p.life = 0;
      }
      if (p.life <= 0) { p.sprite.destroy(); p.glow.destroy(); }
    }
    this.ep = this.ep.filter(p => p.life > 0);
  }

  updateAreas(dt, edt) {
    const P = this.P;
    for (const a of this.areas) {
      const t = a.own === 'e' ? edt : dt;
      if ((a.kind === 'zone' || a.kind === 'pool') && !a.glow) a.glow = this.vfx.glow(a, a.R * 2.6, a.kind === 'pool' ? 0xa040ff : a.color, 0.4).setDepth(0);
      switch (a.kind) {
        case 'zone':
          a.life -= t; a.tickT -= t;
          if (a.tickT <= 0) {
            a.tickT = a.tick;
            this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: a.poise, burn: a.burn, slow: a.slow });
          }
          if (a.slow) for (const e of this.enemies) if (d2(e.x, e.y, a.x, a.y) < a.R * a.R) { e.slowT = 0.3; e.slowF = a.slow; }
          if (Math.random() < 0.7) {
            const an = rand(0, Math.PI * 2), rr = rand(0, a.R) * 0.9, x = a.x + Math.cos(an) * rr, y = a.y + Math.sin(an) * rr;
            if (a.color === ELEM_HEX['火']) this.vfx.flame(x, y); else this.part(x, y, 0, 0, a.color);
          }
          if (a.life <= 0) a.dead = true;
          break;
        case 'drop':
          a.delay -= t;
          if (a.delay <= 0) {
            this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: a.poise, burn: a.burn, heavy: a.meteor, kb: a.meteor ? 300 : 60 });
            this.ringFx(a.x, a.y, a.R, a.color);
            this.vfx.sparks(a.x, a.y, a.color, a.meteor ? 30 : 6);
            if (a.meteor) {
              this.vfx.flash(a.x, a.y, a.R * 3, 0xff8a2a, 500); this.vfx.smoke(a.x, a.y, 14); this.vfx.dirt(a.x, a.y, 24);
              for (let i = 0; i < 20; i++) this.vfx.flame(a.x + rand(-a.R, a.R) * 0.7, a.y + rand(-a.R, a.R) * 0.7);
              this.vfx.punch(0.08, 140);
              this.hitstop = 0.1; this.cameras.main.shake(400, 0.016); sfx.slam();
            } else { this.vfx.bolt(a.x, a.y, a.color); sfx.hit(); }
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
          if (Math.random() < 0.3) this.part(a.x + rand(-a.R, a.R) * 0.7, a.y + rand(-a.R, a.R) * 0.7, 0, 0, 0xc070ff);
          if (a.life <= 0) a.dead = true;
          break;
        case 'fx':
          a.life -= dt;
          if (a.life <= 0) a.dead = true;
          break;
      }
    }
    for (const a of this.areas) if (a.dead && a.glow) a.glow.destroy();
    this.areas = this.areas.filter(a => !a.dead);
  }

  // ---------- 繪製 ----------
  draw() {
    const g = this.tele, f = this.fx, P = this.P;
    g.clear(); f.clear();
    // 篝火範圍、寶箱
    for (const b of this.bonfires) if (Math.abs(b.x - P.x) < 900 && Math.abs(b.y - P.y) < 700) g.fillStyle(b.lit ? 0xff9a3c : 0x999999, 0.08).fillCircle(b.x, b.y, 90);
    // 結界
    if (this.zone) {
      const Z = this.zone, pulse = 0.6 + 0.3 * Math.sin(this.t * 6);
      f.lineStyle(9000, 0x140630, 0.45).strokeCircle(Z.cx, Z.cy, Z.R + 4500);
      f.lineStyle(5, 0x9a6bff, pulse).strokeCircle(Z.cx, Z.cy, Z.R);
    }
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
          g.lineStyle(2, 0xb050ff, 0.9).strokeCircle(a.tx, a.ty, st.R).fillStyle(0xb050ff, 0.25 * k).fillCircle(a.tx, a.ty, st.R * k);
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
          if (a.sword) { f.lineStyle(6, a.color, 0.35).lineBetween(a.x, a.y - 40 - a.delay * 300, a.x, a.y - a.delay * 300); f.lineStyle(2, 0xffffff, 0.95).lineBetween(a.x, a.y - 40 - a.delay * 300, a.x, a.y - a.delay * 300); }
          break;
        case 'ring': f.lineStyle(6, 0xff6060, 0.8).strokeCircle(a.x, a.y, a.r); break;
        case 'pool': g.fillStyle(0x9a40e0, 0.3 * Math.min(1, a.life)).fillCircle(a.x, a.y, a.R); break;
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
    // 妖獸出招後的恢復＝可以打的窗口
    for (const e of this.enemies) if (e.atk && e.atk.phase === 'rec' && e.hp > 0) g.lineStyle(2, 0xffe080, 0.45).strokeCircle(e.x, e.y, e.r + 6);
    // 玩家狀態
    if (P.mcharge >= 0) {
      const ready = P.mcharge >= 0.35, k = Math.min(1, P.mcharge / 0.35);
      f.lineStyle(ready ? 4 : 2, ready ? 0xffffff : ELEM_HEX[P.elem], ready ? 0.6 + 0.3 * Math.sin(this.t * 20) : 0.6).strokeCircle(P.x, P.y, 18 + 14 * k);
      if (Math.random() < 0.5) this.part(P.x + rand(-20, 20), P.y + rand(-20, 20), 0, 0, ELEM_HEX[P.elem]);
    }
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

  slashFx(x, y, ang, R, half, color, heavy) { this.flipSlash = !this.flipSlash; this.vfx.slash(x, y, ang, R, color, heavy, this.flipSlash); }
  ringFx(x, y, R, color) { this.vfx.ring(x, y, R, color); }

  part(x, y, vx, vy, color) { this.vfx.ember(x, y, color); }
  burst(x, y, color, n) { this.vfx.sparks(x, y, color, Math.min(30, n)); }
  updateParts(dt) {
    const drag = Math.pow(0.05, dt);
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= drag; p.vy *= drag; }
    this.parts = this.parts.filter(p => p.life > 0);
  }

  popText(x, y, s, color, size) {
    const t = this.texts[this.textIdx];
    this.textIdx = (this.textIdx + 1) % this.texts.length;
    t.setText(s).setPosition(x, y).setColor(color).setFontSize(size).setVisible(true).setAlpha(1).setScale(1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' });
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
    hud.over(false, this);
  }

  victory() {
    if (this.over) return;
    this.over = true;
    sfx.win();
    hud.over(true, this);
  }
}

// ---------- 介面（DOM） ----------
const hud = {
  start(s) {
    $('v3hud').classList.remove('hidden');
    $('over').classList.add('hidden');
    if (!s.t) $('toasts').innerHTML = '';
    const P = s.P, C = P.cls, E = P.eSkill && CLASSES[P.eSkill].skill;
    $('slots').innerHTML = [
      ['左鍵', C.basic.name, C.basic.charged ? '按住＝蓄力重擊' : ''],
      ['右鍵', C.skill.name, `${C.skill.cost} 真元`],
      ['E', E ? `${E.name}${P.eLvl > 1 ? ` +${P.eLvl - 1}` : ''}` : '（空）', E ? `${E.cost} 真元` : '寶箱取得'],
      ['Q', C.ult.name, '大招'],
      ['R', '丹藥', ''],
    ].map(([k, n, c], i) => `<div class="slot" id="slot${i}"><div class="key">${k}</div><div class="nm">${n}</div><div class="lv">${c}</div><div class="cd"></div></div>`).join('');
  },
  update(s) {
    const P = s.P;
    $('who').innerHTML = `<b style="color:${ELEM_CSS[P.elem]}">${P.elem}・${P.cls.name}　Lv${P.level}</b><span class="small">靈石 ${P.runes}${P.level < LEVEL.max ? ` / 升級需 ${LEVEL.cost(P.level)}${P.runes >= LEVEL.cost(P.level) ? '（回篝火升級！）' : ''}` : ''}</span>`;
    $('hpb').style.width = `${P.hp / P.maxHp * 100}%`; $('hpt').textContent = `肉身 ${Math.ceil(P.hp)} / ${P.maxHp}`;
    $('stb').style.width = `${P.st / P.maxSt * 100}%`;
    $('mpb').style.width = `${P.mp / P.maxMp * 100}%`; $('mpt').textContent = `真元 ${Math.floor(P.mp)}`;
    const E = P.eSkill && CLASSES[P.eSkill].skill;
    const cd = [0, Math.max(0, P.skillCd / P.cls.skill.cd), E ? Math.max(0, P.eCd / E.cd) : 1, 1 - P.ult / 100, P.flask ? 0 : 1];
    cd.forEach((v, i) => { const el = document.querySelector(`#slot${i} .cd`); if (el) el.style.width = `${v * 100}%`; });
    const u = document.querySelector('#slot3 .lv'); if (u) u.textContent = P.ult >= 100 ? '可施放！' : `${Math.floor(P.ult)}%`;
    const f = document.querySelector('#slot4 .lv'); if (f) f.textContent = `剩 ${P.flask} 瓶`;
    $('slowfx').classList.toggle('on', s.slowmo > 0);
    $('night').textContent = s.nightInfo + (s.outside ? '　⚡ 你在結界外！' : '');
    $('boons').innerHTML = [...P.boons].map(id => `<span style="color:${ELEM_CSS[BOONS[id].elem || BOONS[id].duo[0]]}">${BOONS[id].name}</span>`).join('・');
    // 妖王血條
    const boss = s.enemies.find(e => e.T.boss && e.aggro && e.hp > 0 && d2(e.x, e.y, P.x, P.y) < 1400 * 1400);
    $('bossbar').classList.toggle('hidden', !boss);
    if (boss) {
      $('bossname').textContent = boss.T.name + (boss.phase2 ? '・狂怒' : '');
      $('bosshp').style.width = `${boss.hp / boss.maxHp * 100}%`;
      $('bosspoise').style.width = `${boss.poise / boss.maxPoise * 100}%`;
    }
    let pr = '';
    if (s.execTarget) pr = '<b style="color:#ff5050">[F] 處決</b>';
    else if (s.nearChest) pr = '<b style="color:#ffd98a">[F] 開啟寶箱</b>';
    else if (s.nearFire) pr = `<b style="color:#ff9a3c">[F] ${s.nearFire.lit ? '篝火休息（回滿、升級）' : '點亮篝火（獲得心法）'}</b>`;
    else { const dm = s.enemies.find(e => e.T.dummy && d2(e.x, e.y, P.x, P.y) < 400 * 400); if (dm) pr = `木樁 DPS <b style="color:#ffd98a">${Math.round(s.dpsNow())}</b>`; }
    $('prompt').innerHTML = pr;
    this.minimap(s);
  },
  minimap(s) {
    const cv = $('minimap'), c = cv.getContext('2d'), S = cv.width / W, P = s.P;
    c.fillStyle = '#20381c'; c.fillRect(0, 0, cv.width, cv.height);
    const Z = s.zone;
    if (Z) {
      c.fillStyle = 'rgba(20,6,48,.6)'; c.fillRect(0, 0, cv.width, cv.height);
      c.save(); c.beginPath(); c.arc(Z.cx * S, Z.cy * S, Z.R * S, 0, Math.PI * 2); c.clip(); c.fillStyle = '#2e5226'; c.fillRect(0, 0, cv.width, cv.height); c.restore();
      c.strokeStyle = '#a07bff'; c.lineWidth = 1.5; c.beginPath(); c.arc(Z.cx * S, Z.cy * S, Z.R * S, 0, Math.PI * 2); c.stroke();
    }
    for (const cp of s.camps) if (!cp.cleared) { c.fillStyle = ['#c08080', '#e06060', '#ff3a3a', '#ff0000'][cp.tier]; c.fillRect(cp.x * S - 2, cp.y * S - 2, 3 + cp.tier, 3 + cp.tier); }
    for (const ch of s.chests) if (!ch.open) { c.fillStyle = '#ffd98a'; c.fillRect(ch.x * S - 2, ch.y * S - 2, 4, 4); }
    for (const b of s.bonfires) { c.fillStyle = b.lit ? '#ffb030' : '#8a8070'; c.beginPath(); c.arc(b.x * S, b.y * S, 3, 0, Math.PI * 2); c.fill(); }
    for (const e of s.enemies) if (e.T.boss && e.hp > 0) { c.fillStyle = '#ff2020'; c.beginPath(); c.arc(e.x * S, e.y * S, 5, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(P.x * S, P.y * S, 3.5, 0, Math.PI * 2); c.fill();
  },
  showChoice(s) {
    const c = s.choice, box = $('choice');
    box.classList.remove('hidden'); $('v3hud').classList.add('choosing');
    box.innerHTML = `<div class="ctitle">${c.title}<span class="small">　1／2／3 或點選（遊戲不會暫停）</span></div><div class="copts">${c.opts.map((o, i) =>
      `<div class="copt${o.duo ? ' duo' : ''}" data-i="${i}" style="border-color:${o.elem ? ELEM_CSS[o.elem] : '#6b5a2e'}"><div class="k">${i + 1}</div><div class="n" style="color:${o.elem ? ELEM_CSS[o.elem] : '#ffd98a'}">${o.label}</div><div class="d">${o.desc}</div></div>`).join('')}</div>`;
    box.querySelectorAll('.copt').forEach(el => el.onclick = () => s.pickChoice(+el.dataset.i));
  },
  hideChoice() { $('choice').classList.add('hidden'); $('v3hud').classList.remove('choosing'); },
  toast(msg, color = '#ffd98a') {
    const d = document.createElement('div');
    d.className = 'toast'; d.style.borderLeftColor = color; d.innerHTML = msg;
    const box = $('toasts'); box.prepend(d);
    while (box.children.length > 5) box.lastChild.remove();
    setTimeout(() => d.remove(), 7000);
  },
  banner(text) { const b = $('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); },
  over(win, s) {
    const o = $('over'); o.classList.remove('hidden');
    hud.hideChoice();
    const m = Math.floor(s.t / 60), sec = Math.floor(s.t % 60);
    o.innerHTML = win
      ? `<h1>斬殺妖皇・飛昇</h1><div>用時 ${m} 分 ${sec} 秒・Lv${s.P.level}・心法 ${s.P.boons.size} 個</div><div class="small">按 Enter 或點這裡再來一局</div>`
      : `<h1>身死道消</h1><div>撐了 ${m} 分 ${sec} 秒・Lv${s.P.level}</div><div class="small">按 Enter 或點這裡重新選擇主修</div>`;
    o.onclick = showSelect;
  },
};

// 外部背景音樂（自用，assets/audio/ 不上傳）：
//   bgm_explore.* 探索、bgm_battle.* 妖王戰、bgm_final.* 決戰；只有一個檔案時全程播它
let bgmEl = null, bgmTracks = null, bgmMode = -1;
async function startBgmFile() {
  if (bgmTracks) return;
  let files = [];
  try { const r = await fetch('assets/audio/list.json'); if (r.ok) files = await r.json(); } catch (e) { /* 其他伺服器沒有這個清單 */ }
  if (!files.length) return;
  const find = k => files.find(n => n.toLowerCase().startsWith(k));
  const any = find('bgm.') || files[0];
  bgmTracks = [find('bgm_explore') || any, find('bgm_battle') || find('bgm_explore') || any, find('bgm_final') || find('bgm_battle') || any];
  toggleBgm(); // 關掉合成音樂
  const kick = () => { if (bgmEl) bgmEl.play().catch(() => {}); };
  window.addEventListener('pointerdown', kick, { once: true }); window.addEventListener('keydown', kick, { once: true });
  window.addEventListener('keydown', ev => { if (bgmEl && (ev.key === 'b' || ev.key === 'B')) bgmEl.paused ? bgmEl.play() : bgmEl.pause(); });
  setBgmMode(0);
}
function setBgmMode(m) {
  if (!bgmTracks || m === bgmMode) return;
  const file = bgmTracks[m];
  bgmMode = m;
  if (bgmEl && bgmEl.src.endsWith(encodeURI(file))) return;
  const old = bgmEl;
  bgmEl = new Audio('assets/audio/' + file); bgmEl.loop = true; bgmEl.volume = 0;
  bgmEl.play().catch(() => {});
  // 交叉淡入淡出 1 秒
  let k = 0;
  const iv = setInterval(() => { k += 0.1; bgmEl.volume = Math.min(0.45, 0.45 * k); if (old) old.volume = Math.max(0, 0.45 * (1 - k)); if (k >= 1) { clearInterval(iv); if (old) old.pause(); } }, 100);
}

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
