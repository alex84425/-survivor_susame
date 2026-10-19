// 修仙 v3：黑帝斯 × 黑夜君臨。第一階段＝單挑手感測試場
import { sfx, initAudio, toggleMute, toggleBgm, setIntensity } from '../sfx.js';
import { ELEMS, ELEM_CSS, ELEM_HEX, elemMult, PX_FACE } from '../data.js';
import { CLASSES, ENEMIES, LEVEL, NIGHT_KINGS } from './kits.js';
import { preloadAI, makeAIAnims, charKey, monKey, iconSrc, hasIcon } from './ai.js';
import { preloadImages, makeTextures, unitTex } from './gfx.js';
import { preloadVfx, Vfx } from './vfx.js';
import { ATTR, ATTR_BASE, SOFT_CAP, startAttr, scaleMul, SKILLS, START_SKILL, GONGFA, TIER_CN, gfDesc, MATS, forgeCost, forgeMul, innateTier, inscribeSlots } from './arts.js';
import { CAST } from './skills.js';

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
  init(data) { this.clsKey = (data && data.cls) || window.__cls || '金'; this.sex = (data && data.sex) || window.__sex || 'm'; }
  preload() {
    preloadImages(this); preloadVfx(this); preloadAI(this);
    // 草原素材（Gemini 生成，tools/cutout.py 處理）；清單在 assets/env/env.json
    this.load.json('envlist', 'assets/env/env.json');
    this.load.on('filecomplete-json-envlist', (_k, _t, list) => { for (const k of list || []) if (!this.textures.exists('env_' + k)) this.load.image('env_' + k, `assets/env/${k}.png`); });
  }

  create() {
    makeTextures(this);
    makeAIAnims(this);
    for (const e of ELEMS) unitTex(this, `pl_${e}`, CLASSES[e].img, 58, ELEM_CSS[e], '修');
    for (const [k, T] of Object.entries(ENEMIES)) if (T.img) unitTex(this, `en_${k}`, T.img, T.size, ELEM_CSS[T.elem], T.name[0]);

    this.cameras.main.setBounds(0, 0, W, W);
    this.buildMeadow();
    this.vfx = new Vfx(this);
    this.tele = this.add.graphics().setDepth(1);
    this.fx = this.add.graphics().setDepth(6);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,Q,E,R,F,ENTER,M,B,ONE,TWO,THREE,FOUR');
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
    hud.toast('左鍵普攻・右鍵／E 神通・Q 大招・空白閃避・R 丹藥・F 篝火/寶箱/處決・Tab 行囊（換神通、功法）', '#999');
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
      level: 1, runes: 0, dmgMul: 1, lastHit: -9,
      attr: startAttr(this.clsKey), skills: [], equip: { R: null, E: null }, cd: { R: 0, E: 0 }, chain: null, chainBuf: null, swordHeart: {},
      gf: [], mer: [null, null, null], mats: Object.fromEntries(Object.keys(MATS).map(k => [k, 0])),
      combo: 0, comboT2: 0, flowT: 0, flowLatch: false, execBuffT: 0, execBuff: 0, fateT: 0, fate: 0, fateBase: 0, ultT: 0,
      regenT: 0, regenRate: 0, flameT: 0, shield: 0, shieldT: 0, guardT: 0, flaskT: 0,
      hp: C.hp, maxHp: C.hp, st: 100, maxSt: 100, stDelay: 0, mp: 60, maxMp: 100, ult: 0,
      flask: 3, flaskMax: 3, speed: C.speed,
      dodgeCd: 0, dashT: 0, dvx: 0, dvy: 0, inv: 0, dodgeAt: -9, stunT: 0, rootT: 0,
      act: null, mcharge: -1, holdT: 0, buffer: false, comboIdx: 0, comboT: 0, critNext: false, fireCd: 0, charge: -1, parry: 0, armorT: 0, pulseT: 0,
    };
    // AI 主角圖（依主修與性別），沒有就用舊的像素圖
    const ck = charKey(C.id, this.sex);
    if (this.textures.exists(ck)) {
      this.P.sprite = this.add.sprite(this.P.x, this.P.y, ck).setDepth(4).setOrigin(0.5, 0.86);
      this.P.bs = 104 / this.textures.get(ck).getSourceImage().height;
      this.P.ai = ck; this.P.sex = this.sex;
    } else {
      this.P.sprite = this.add.image(this.P.x, this.P.y, `pl_${this.clsKey}`).setDepth(4);
      this.P.bs = 1;
    }
    this.P.equip.R = this.gainSkill(START_SKILL[this.clsKey], true);
    this.recalc(true);
  }

  // ---------- 屬性、神通、功法 ----------
  gainSkill(id, silent) {
    const inst = { id, plus: 0, ins: [] };
    this.P.skills.push(inst);
    if (!silent) {
      const P = this.P;
      if (!P.equip.E) { P.equip.E = inst; hud.toast(`習得神通 <b>${SKILLS[id].name}</b>，已裝在 E`, '#ffd98a'); }
      else hud.toast(`習得神通 <b>${SKILLS[id].name}</b>，到篝火可以換上`, '#ffd98a');
      hud.start(this);
    }
    return inst;
  }

  gainGongfa(id, tier) {
    const P = this.P, G = GONGFA[id], item = { id, tier };
    const name = `${id}・${TIER_CN[tier]}`;
    const keep = () => { P.gf.push(item); hud.toast(`功法 <b>${name}</b> 收進行囊（Tab 打開）`, '#c0a0ff'); };
    if (G.slot === '經脈') {
      const same = P.mer.findIndex(m => m && m.id === id);
      if (same >= 0) {
        if (P.mer[same].tier >= tier) { keep(); return; }
        P.gf.push(P.mer[same]); P.mer[same] = item; this.recalc();
        hud.toast(`經脈的 <b>${id}</b> 升為${TIER_CN[tier]}`, '#c0a0ff'); return;
      }
      const i = P.mer.findIndex(m => !m);
      if (i >= 0) { P.mer[i] = item; this.recalc(); hud.toast(`功法 <b>${name}</b> 運入經脈：${gfDesc(id, tier)}`, '#c0a0ff'); return; }
      // 經脈滿了：當場選要取代哪一條
      const opts = P.mer.map(m => ({ label: `取代 ${m.id}・${TIER_CN[m.tier]}`, desc: `換成 ${name}：${gfDesc(id, tier)}（舊的收進行囊）` }));
      opts.push({ label: '收進行囊', desc: '之後按 Tab 再換' });
      this.offer(`得到 ${name}・經脈已滿`, opts, j => {
        if (j >= 3) { keep(); return; }
        P.gf.push(P.mer[j]); P.mer[j] = item; this.recalc();
        hud.toast(`功法 <b>${name}</b> 運入經脈`, '#c0a0ff');
      });
      return;
    }
    for (const k of ['R', 'E']) {
      const inst = P.equip[k];
      if (inst && this.canInscribe(inst, item) === true) { inst.ins.push(item); hud.toast(`功法 <b>${name}</b> 銘刻到 ${SKILLS[inst.id].name}：${gfDesc(id, tier)}`, '#c0a0ff'); return; }
    }
    // 裝備中的神通槽滿了：當場選要取代哪一條銘刻（被換下的降一品）
    const opts = [], acts = [];
    for (const k of ['R', 'E']) {
      const inst = P.equip[k];
      if (!inst || this.canInscribe(inst, item, true) !== true) continue;
      inst.ins.forEach((g, j) => {
        opts.push({ label: `${SKILLS[inst.id].name}：取代 ${g.id}・${TIER_CN[g.tier]}`, desc: `換成 ${name}：${gfDesc(id, tier)}（舊的${g.tier ? '降一品收進行囊' : '一品會消失'}）`, elem: SKILLS[inst.id].elem });
        acts.push([inst, j]);
      });
    }
    if (!opts.length) { keep(); return; }
    opts.splice(3);
    opts.push({ label: '收進行囊', desc: '之後按 Tab 再換' });
    this.offer(`得到 ${name}・銘刻槽已滿`, opts, j => {
      if (j >= acts.length || j >= 3) { keep(); return; }
      const [inst, slot] = acts[j], old = inst.ins[slot];
      inst.ins[slot] = item;
      if (old.tier > 0) P.gf.push({ id: old.id, tier: old.tier - 1 });
      hud.toast(`功法 <b>${name}</b> 銘刻到 ${SKILLS[inst.id].name}`, '#c0a0ff');
    });
  }

  canInscribe(inst, item, ignoreFull) {
    const S = SKILLS[inst.id], G = GONGFA[item.id];
    if (G.slot !== '神通') return '這是經脈功法';
    if (G.need === 'chain' && !S.chain) return '只能銘刻在連段神通';
    if (G.need === 'charge' && !S.charge) return '只能銘刻在蓄力神通';
    if (!ignoreFull && inst.ins.length >= inscribeSlots(S.q, inst.plus)) return '銘刻槽已滿';
    if (inst.ins.some(g => g.id === item.id)) return '已經有同名功法';
    if (S.innate[0] === item.id && item.tier <= innateTier(S, inst.plus)) return '天生功法品階已經一樣或更高';
    return true;
  }

  // 經脈功法的品（沒有＝-1）與數值
  gt(id) { const m = this.P.mer.find(g => g && g.id === id); return m ? m.tier : -1; }
  mv(id, k = 'v') { const t = this.gt(id); return t < 0 ? 0 : GONGFA[id][k][t]; }
  // 神通上的功法（天生＋銘刻）
  skT(inst, id) {
    if (!inst) return -1;
    const S = SKILLS[inst.id];
    let t = S.innate[0] === id ? innateTier(S, inst.plus) : -1;
    for (const g of inst.ins) if (g.id === id) t = Math.max(t, g.tier);
    return t;
  }
  sv(inst, id, k = 'v') { const t = this.skT(inst, id); return t < 0 ? 0 : GONGFA[id][k][t]; }

  // 屬性與裝備改變後重算衍生數值
  recalc(init) {
    const P = this.P, C = P.cls, A = P.attr, b = k => Math.max(0, A[k] - ATTR_BASE);
    const hpK = init ? 1 : P.hp / P.maxHp;
    P.maxHp = Math.round(C.hp * (1 + LEVEL.hp * (P.level - 1)) * (1 + 0.02 * b('土')));
    P.hp = Math.min(P.maxHp, Math.max(1, hpK * P.maxHp));
    P.maxMp = 100 + 3 * b('水'); P.mp = Math.min(P.mp, P.maxMp);
    P.cdMul = 1 - 0.005 * b('水');
    P.spdBase = 1 + 0.006 * b('金');
    P.dodgeCost = (22 - 0.5 * b('金')) * (this.gt('狂刃') >= 0 ? 1.25 : 1);
    P.ultMul = 1 + 0.02 * b('火'); P.burnMul = 1 + 0.02 * b('火');
    P.statusMul = 1 + 0.02 * b('木'); P.lootMul = 1 + 0.01 * b('木');
    P.poiseMul = 1 + 0.01 * b('土');
    const ds = this.gt('丹師');
    P.flaskMax = 3 + (ds >= 1 ? 1 : 0) - (this.gt('破釜') >= 0 ? 1 : 0); P.flask = Math.min(P.flask, P.flaskMax);
    P.flaskHeal = 0.4 * (1 + (ds === 0 ? 0.1 : ds === 2 ? 0.15 : 0));
    P.speed = C.speed * (this.gt('鐵壁') >= 0 ? 0.92 : 1);
    P.dmgMul = 1 + LEVEL.dmg * (P.level - 1);
    const eff = v => v <= SOFT_CAP ? v : SOFT_CAP + (v - SOFT_CAP) / 2;
    P.basicMul = (1 + 0.018 * eff(A[P.elem])) / (1 + 0.018 * 16);
  }

  // 神通的傷害倍率：屬性補正 × 強化 × 等級；屬性不足 ×0.6
  skillMul(inst) {
    const P = this.P, S = SKILLS[inst.id];
    const ok = Object.entries(S.req).every(([e, n]) => P.attr[e] >= n);
    return scaleMul(S.sc, P.attr) * forgeMul(S.q, inst.plus) * P.dmgMul * (ok ? 1 : 0.6);
  }
  reqOk(inst) { return Object.entries(SKILLS[inst.id].req).every(([e, n]) => this.P.attr[e] >= n); }
  spd() { const P = this.P; return P.spdBase * (P.flowT > 0 ? 1 + this.mv('心流') : 1); }

  skillCtx(slot, inst) {
    const S = SKILLS[inst.id];
    let mul = this.skillMul(inst);
    if (this.P.swordHeart[slot]) { mul *= 1 + this.P.swordHeart[slot]; this.P.swordHeart[slot] = 0; }
    return { S, inst, slot, mul, ang: this.aim, pt: { ...this.aimPt }, ho: extra => ({ sk: inst, slot, elem: S.elem, ...extra }) };
  }

  skillCost(inst, full = true) {
    const S = SKILLS[inst.id], P = this.P;
    let c = S.cost * (full ? 1 : 0.5) * (this.skT(inst, '燃元') >= 0 ? 1.3 : 1);
    if (P.flowT > 0) c *= 1 - this.mv('心流', 'v2');
    return c;
  }
  skillCd(inst) { return SKILLS[inst.id].cd * this.P.cdMul * (1 - this.sv(inst, '急攻')); }

  useSkill(slot) {
    const P = this.P, inst = P.equip[slot];
    if (!inst) { hud.toast(`${slot === 'R' ? '右鍵' : 'E'} 格沒有神通：清妖巢開寶箱可以拿到`, '#999'); return; }
    const S = SKILLS[inst.id];
    if (S.chain && P.chain && P.chain.slot === slot) { P.chainBuf = slot; return; }
    if (P.cd[slot] > 0 || P.stunT > 0 || P.dashT > 0) return;
    // 普攻出手後可以用神通取消後搖
    if (P.act && !(P.act.combo && P.act.fired) && !(P.act.chain && P.act.fired) && inst.id !== 'xuanbing') return;
    const cost = this.skillCost(inst);
    if (P.mp < cost) { hud.toast('真元不足', '#3aa7c7'); return; }
    if (!this.reqOk(inst)) this.reqWarn(inst);
    if (P.chain) this.endChain();
    P.mp -= cost; P.charge = -1;
    if (P.act && P.act.combo) P.act = null;
    if (S.chain) {
      P.chain = { slot, inst, S, i: 0, at: this.t, c: this.skillCtx(slot, inst), hits: new Set() };
      this.chainStep();
      return;
    }
    P.cd[slot] = this.skillCd(inst);
    CAST[inst.id](this, this.skillCtx(slot, inst));
  }

  reqWarn(inst) {
    if ((this.reqWarnT || 0) > this.t) return;
    this.reqWarnT = this.t + 8;
    const S = SKILLS[inst.id];
    hud.toast(`屬性不足（需要 ${Object.entries(S.req).map(([e, n]) => `${e} ${n}`).join('、')}）：${S.name}傷害 ×0.6`, '#e05555');
  }

  // 蓄力類神通：前搖＝蓄力，速蓄縮短並減傷
  chargeAct(c, fire, armor) {
    const k = this.sv(c.inst, '速蓄'), tg = this.snapTarget(260);
    const ang = tg ? Math.atan2(tg.y - this.P.y, tg.x - this.P.x) : this.aim;
    this.startAct({ wind: c.S.charge * (1 - k), rec: 0.35, move: 0.25, ang, armor, chargeDR: k, charging: c.S.elem, fire: () => fire(ang) });
  }

  // ---------- 連段 ----------
  chainStep() {
    const P = this.P, ch = P.chain, steps = ch.S.chain, st = steps[ch.i], last = ch.i === steps.length - 1, inst = ch.inst;
    ch.i++;
    const c = ch.c, fin = last ? 1 + this.sv(inst, '終結技') : 1;
    const dmg = st.dmg * c.mul * fin;
    const ho = c.ho({ poise: st.poise * (last ? 1 + this.sv(inst, '終結技', 'v2') : 1), chain: ch, step: ch.i, finisher: last, heavy: last, melee: true, kb: st.kb ?? (last ? 260 : 110), burn: st.burn, root: st.root, slow: st.slow });
    const tg = st.k === 'blink' ? null : this.snapTarget(240);
    let ang = tg ? Math.atan2(tg.y - P.y, tg.x - P.x) : this.aim, dist = st.lunge ? 30 : 0;
    if (tg && st.lunge) dist = clamp(Math.hypot(tg.x - P.x, tg.y - P.y) - tg.r - P.r - (st.range || st.R || 100) * 0.45, 0, st.lunge);
    const wind = last ? 0.14 : 0.08, lt = Math.max(wind, 0.07);
    ch.at = this.t + wind;
    const col = ELEM_HEX[ch.S.elem];
    this.startAct({
      wind, rec: last ? 0.3 : 0.17, move: 0.35, chain: true, ang, armor: ch.S.elem === '土',
      lungeT: dist > 0 ? lt : 0, lungeV: dist / lt,
      fire: () => {
        P.lean = last ? 0.3 : 0.18; P.sq = last ? 0.12 : 0.06;
        let n = 0;
        switch (st.k) {
          case 'arc': {
            this.slashFx(P.x, P.y, ang, st.range, st.half, col, last);
            const hit = this.enemiesIn(P.x, P.y, ang, st.range, st.half);
            for (const e of hit) this.hurtE(e, dmg, { ...ho, kx: P.x, ky: P.y });
            n = hit.length;
            if (st.pull) for (const e of hit) this.pullTo(e, P.x + Math.cos(ang) * 55, P.y + Math.sin(ang) * 55);
            if (st.pull) this.vfx.whip(P.x, P.y, ang, st.range, col);
            if (st.wave) this.shootP({ x: P.x, y: P.y, ang, speed: 1000, dmg: dmg * 0.5, life: st.wave / 1000, r: 24, tex: `sw_${ch.S.elem}`, pierce: 99, scale: 3, trail: col, ho: { ...ho, finisher: false } });
            if (st.slow) this.vfx.wave(P.x, P.y, ang, st.range, col);
            break;
          }
          case 'circle':
            n = this.hitCircle(P.x, P.y, st.R, dmg, ho);
            this.vfx.whirl(P.x, P.y, st.R, col, last);
            if (st.fire) this.areas.push({ own: 'p', kind: 'zone', x: P.x, y: P.y, R: st.R, life: 2, max: 2, tick: 0.5, tickT: 0.5, dmg: 6 * c.mul, color: col, ho: c.ho({ poise: 1, burn: 1, dot: true }) });
            if (st.pillar) this.vfx.pillar(P.x, P.y, col);
            if (st.quake) { this.vfx.crack(P.x, P.y, st.R); this.vfx.dirt(P.x, P.y, 20); this.vfx.smoke(P.x, P.y, 6); }
            break;
          case 'blink': {
            // 優先找還沒被這套連段砍過的敵人
            let best = null, bd = Infinity;
            for (const e of this.enemies) {
              if (e.hp <= 0) continue;
              const dd = d2(e.x, e.y, P.x, P.y) + (ch.hits.has(e) ? 1e6 : 0);
              if (dd < 420 * 420 + (ch.hits.has(e) ? 1e6 : 0) && dd < bd) { bd = dd; best = e; }
            }
            if (best) {
              ch.hits.add(best);
              this.vfx.flash(P.x, P.y, 70, col, 160);
              const a = Math.atan2(best.y - P.y, best.x - P.x);
              P.x = best.x + Math.cos(a) * (best.r + 26); P.y = best.y + Math.sin(a) * (best.r + 26);
              ang = a + Math.PI; P.inv = Math.max(P.inv, 0.15);
            }
            this.slashFx(P.x, P.y, ang, st.range, st.half, col, true);
            for (const e of this.enemiesIn(P.x, P.y, ang, st.range, st.half)) { this.hurtE(e, dmg, { ...ho, kx: P.x, ky: P.y }); n++; }
            break;
          }
          case 'cross':
            n = this.hitCircle(P.x, P.y, st.R, dmg, ho);
            this.vfx.cross(P.x, P.y, st.R, col);
            for (let i = 0; i < 8; i++) this.shootP({ x: P.x, y: P.y, ang: i * Math.PI / 4, speed: 900, dmg: dmg * 0.2, life: 0.4, r: 18, tex: `sw_${ch.S.elem}`, pierce: 99, scale: 2.4, trail: col, ho: { ...ho, finisher: false } });
            break;
          case 'rush':
            P.dashT = 0.15; P.dvx = Math.cos(ang) * st.len / 0.15; P.dvy = Math.sin(ang) * st.len / 0.15;
            this.dashHit = { hit: new Set(), until: this.t + 0.25, dmg, o: { ...ho, kb: 300 } };
            this.vfx.streak(P.x, P.y, ang, st.len, col);
            break;
        }
        if (n) { this.hitstop = Math.max(this.hitstop, last ? 0.08 : 0.035); if (last) { this.cameras.main.shake(140, 0.006); this.vfx.punch(0.035); } }
        sfx.swing(ch.S.elem, last);
        if (last) sfx.slam();
      },
    });
  }

  updateChain() {
    const P = this.P, ch = P.chain;
    if (!ch) return;
    const since = this.t - ch.at, busy = P.act && !(P.act.chain && P.act.fired);
    if (P.chainBuf === ch.slot && ch.i < ch.S.chain.length && since >= 0.15 && !busy && P.stunT <= 0) {
      P.chainBuf = null;
      const cost = this.skillCost(ch.inst, false);
      if (P.mp < cost) { hud.toast('真元不足', '#3aa7c7'); this.endChain(); return; }
      P.mp -= cost;
      this.chainStep();
      return;
    }
    if ((since > 0.6 || ch.i >= ch.S.chain.length) && !P.act) this.endChain();
  }

  endChain() {
    const P = this.P, ch = P.chain;
    if (!ch) return;
    P.cd[ch.slot] = this.skillCd(ch.inst);
    P.chain = null; P.chainBuf = null;
  }

  // 扇形內的敵人
  enemiesIn(x, y, ang, range, half) {
    return this.enemies.filter(e => {
      if (e.hp <= 0) return false;
      const dd = Math.sqrt(d2(e.x, e.y, x, y));
      return dd <= range + e.r && (dd <= e.r || angDiff(Math.atan2(e.y - y, e.x - x), ang) <= half);
    });
  }

  pullTo(e, x, y) {
    if (e.T.boss || e.T.dummy) return;
    e.x = x; e.y = y; e.atk = null;
    e.sprite.setPosition(x, y);
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
      [['wolf', 'wolf'], ['spider', 'spider'], ['wolf', 'spider'], ['snake', 'wolf'], ['bat', 'bat'], ['wisp', 'wisp'], ['bat', 'wolf']],
      [['wolf', 'wolf', 'wolf'], ['bear', 'wolf'], ['spider', 'spider', 'snake'], ['boar', 'wolf'], ['crane', 'bat'], ['jiangshi', 'jiangshi'], ['scorpion', 'wisp'], ['python', 'bat']],
      [['bear', 'spider', 'spider'], ['boar', 'boar', 'snake'], ['ogre', 'wolf'], ['bear', 'bear'], ['golem', 'wisp'], ['toad', 'jiangshi', 'jiangshi'], ['python', 'scorpion'], ['crane', 'crane', 'bat']],
      [['ogre', 'bear', 'spider'], ['ogre', 'boar', 'snake'], ['bear', 'bear', 'snake', 'wolf'], ['tianmo', 'wisp', 'wisp'], ['golem', 'scorpion', 'python'], ['tianmo', 'crane']],
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
    if (this.textures.exists('ai_item_bonfire')) {
      b.sprite = this.add.image(x, y, 'ai_item_bonfire').setDepth(1).setOrigin(0.5, 0.75).setTint(0x8a8a8a).setAlpha(0.85);
      b.sprite.setScale(86 / this.textures.get('ai_item_bonfire').getSourceImage().height);
      b.ai = true;
    } else b.sprite = this.add.image(x, y, 'bonfire3_off').setDepth(1);
    // 篝火旁兩座石燈
    if (this.textures.exists('ai_env_stone_lantern')) for (const dx of [-70, 70]) this.add.image(x + dx, y - 20, 'ai_env_stone_lantern').setOrigin(0.5, 0.9).setDepth(8 + (y - 20) / W).setScale(0.28);
    this.bonfires.push(b);
  }

  addCamp(x, y, tier, list) {
    const c = { x, y, tier, members: [], cleared: false };
    if (this.textures.exists('ai_env_camp_nest')) this.add.image(x, y, 'ai_env_camp_nest').setDepth(-6).setScale(0.75 + 0.12 * tier).setAlpha(0.95);
    list.forEach((k, i) => c.members.push(this.spawn(k, x + Math.cos(i * 2.1) * 75, y + Math.sin(i * 2.1) * 75, c, tier)));
    this.camps.push(c);
  }

  updateCamps() {
    for (const c of this.camps) {
      if (c.cleared || c.members.some(e => e.hp > 0)) continue;
      c.cleared = true;
      const ch = { x: c.x, y: c.y, tier: c.tier, open: false };
      const ct = this.textures.exists('ai_item_chest') ? 'ai_item_chest' : 'chest3';
      ch.sprite = this.add.image(c.x, c.y, ct).setDepth(2);
      if (ct !== 'chest3') ch.sprite.setScale(64 / this.textures.get(ct).getSourceImage().width);
      ch.glow = this.vfx.glow(ch, 160, 0xffd98a, 0.5).setDepth(1);
      this.chests.push(ch);
      this.vfx.flash(c.x, c.y, 200, 0xffd98a, 400);
      hud.toast('清空妖巢，出現了寶箱（F 開啟）', '#ffd98a');
    }
  }

  openChest(ch) {
    const P = this.P;
    ch.open = true; ch.glow.destroy();
    if (this.textures.exists('ai_item_chest_open') && ch.sprite.texture.key === 'ai_item_chest') { ch.sprite.setTexture('ai_item_chest_open'); ch.sprite.setScale(64 / this.textures.get('ai_item_chest_open').getSourceImage().width); }
    else ch.sprite.setTexture('chest3_open');
    this.vfx.sparks(ch.x, ch.y, 0xffd98a, 24);
    sfx.item();
    const T = ch.tier;
    // 強化材料直接拿
    if (T <= 1) this.addMat('下品靈晶', 2 + (Math.random() < 0.5 ? 1 : 0));
    else if (T === 2) { this.addMat('中品靈晶', 1 + (Math.random() < 0.5 ? 1 : 0)); this.addMat('下品靈晶', 1); }
    else { this.addMat('上品靈晶', 1); this.addMat('中品靈晶', 1); if (Math.random() < 0.3 * P.lootMul) this.addMat('天外隕晶', 1); }
    const runes = Math.round(80 * (1 + T));
    const opts = [];
    const sk = this.rollSkill(T >= 2 && Math.random() < 0.3 * P.lootMul);
    if (sk) opts.push({ label: `神通：${SKILLS[sk].name}`, desc: this.skillBrief(sk), elem: SKILLS[sk].elem, kind: 'skill', id: sk, icon: sk });
    for (const g of this.rollGongfa(sk ? 1 : 2, [[0.75, 0.25, 0], [0.4, 0.6, 0], [0, 0.8, 0.2], [0, 0.5, 0.5]][T])) opts.push({ label: `功法：${g.id}・${TIER_CN[g.tier]}`, desc: `〔${GONGFA[g.id].cat}・${GONGFA[g.id].slot}〕${gfDesc(g.id, g.tier)}`, kind: 'gf', g });
    opts.push({ label: `靈石 ×${runes}`, desc: '拿去篝火升級或強化', kind: 'runes', n: runes });
    this.offer('寶箱・擇一', opts, i => {
      const o = opts[i];
      if (o.kind === 'runes') P.runes += o.n;
      else if (o.kind === 'skill') this.gainSkill(o.id);
      else this.gainGongfa(o.g.id, o.g.tier);
    });
  }

  addMat(k, n) { this.P.mats[k] += n; hud.toast(`<span style="color:${MATS[k]}">${k} ×${n}</span>`, MATS[k]); }

  rollSkill(heaven) {
    const own = new Set(this.P.skills.map(s => s.id));
    let pool = Object.keys(SKILLS).filter(id => !own.has(id) && (SKILLS[id].q === '天') === heaven);
    if (!pool.length) pool = Object.keys(SKILLS).filter(id => !own.has(id));
    // 偏向自己屬性高的神通
    pool.sort(() => Math.random() - 0.5).sort((a, b) => (this.P.attr[SKILLS[b].elem] - this.P.attr[SKILLS[a].elem]) * 0.15 + (Math.random() - 0.5));
    return pool[0];
  }
  skillBrief(id) {
    const S = SKILLS[id];
    return `${S.q}品・${S.type}・${S.desc}（${S.cost} 真元／${S.cd}s，需要 ${Object.entries(S.req).map(([e, n]) => `${e}${n}`).join('、')}）`;
  }
  // 抽 n 個不重複的功法；tw：一二三品機率
  rollGongfa(n, tw) {
    const ids = Object.keys(GONGFA).sort(() => Math.random() - 0.5).slice(0, n);
    return ids.map(id => { const r = Math.random(); return { id, tier: r < tw[0] ? 0 : r < tw[0] + tw[1] ? 1 : 2 }; });
  }
  offerGongfa(title, tw) {
    const gs = this.rollGongfa(3, tw);
    this.offer(title, gs.map(g => ({ label: `${g.id}・${TIER_CN[g.tier]}`, desc: `〔${GONGFA[g.id].cat}・${GONGFA[g.id].slot}〕${gfDesc(g.id, g.tier)}` })), i => this.gainGongfa(gs[i].id, gs[i].tier));
  }

  // ---------- 篝火：點亮給功法、回滿、打開篝火介面（升級、換神通、功法、強化） ----------
  rest(b) {
    const P = this.P;
    P.hp = P.maxHp; P.flask = P.flaskMax; P.mp = P.maxMp; P.st = P.maxSt;
    this.vfx.sparks(b.x, b.y, 0xff9a3c, 24);
    if (!b.lit) {
      b.lit = true;
      if (b.ai) b.sprite.clearTint().setAlpha(1); else b.sprite.setTexture('bonfire3');
      b.glow = this.vfx.glow(b, 420, 0xff9a3c, 0.3).setDepth(-8);
      this.offerGongfa('點亮篝火・五行祖師傳下功法', [0.8, 0.2, 0]);
      return;
    }
    if (this.bag) hud.closeBonfire(this);
    this.paused = true;
    hud.bonfire(this, null, 'fire');
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
      if (tn >= 510 && !F.boss) { F.boss = true; this.spawnBoss(pick(NIGHT_KINGS[night].filter(k => ENEMIES[k]))); }
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
      sprite: null, bs: 1, face: PX_FACE[T.img] || 0,
    };
    // AI 妖獸圖：低等級用帥氣版，等級 2 以上用恐怖版；夜王狂怒時換恐怖版
    const ak = monKey(type, tier >= 2 ? 'scary' : 'cool');
    if (this.textures.exists(ak)) {
      e.sprite = this.add.image(x, y, ak).setOrigin(0.5, 0.62).setDepth(T.boss ? 3 : 2);
      this.setMonScale(e);
      e.face = 1;
    } else e.sprite = this.add.image(x, y, T.img ? `en_${type}` : 'dummy3').setDepth(T.boss ? 3 : 2);
    this.enemies.push(e);
    return e;
  }

  inCombat() { return this.t < (this.combatUntil || 0); }

  // 行囊：隨時換神通、經脈、銘刻（升級與強化仍要在篝火）
  toggleBag() {
    if (this.paused || this.over) return;
    if (this.bag) { hud.closeBonfire(this); return; }
    this.bag = true;
    hud.bonfire(this, null, 'bag');
  }

  setMonScale(e) {
    const src = this.textures.get(e.sprite.texture.key).getSourceImage();
    e.bs = e.T.size * (e.T.boss ? 1.5 : 1.35) / Math.max(src.width, src.height);
    e.sprite.setScale(e.bs);
  }

  // ---------- 主迴圈 ----------
  update(_, deltaMs) {
    let raw = Math.min(deltaMs / 1000, 0.05);
    if (this.over) return;
    if (this.paused || (this.bag && !this.inCombat())) { this.clickL = this.clickR = this.upL = 0; return; }
    if (this.bag) raw *= 0.2;
    this.updateTexts(raw);
    if (this.hitstop > 0) { this.hitstop -= raw; this.draw(); return; }
    if (this.slowmo > 0) this.slowmo -= raw;
    const ets = this.slowmo > 0 ? 0.25 : 1;
    const dt = raw, edt = raw * ets;
    this.t += dt;
    this.updateNight(dt);
    if (this.bag) { this.clickL = this.clickR = this.upL = 0; } else this.updatePlayer(dt);
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
    // 一般戰鬥：附近有追著你的妖獸，離開戰鬥 4 秒後才換回探索
    if (this.enemies.some(e => e.aggro && e.hp > 0 && !e.T.dummy && d2(e.x, e.y, this.P.x, this.P.y) < 700 * 700)) {
      this.combatUntil = this.t + 6;
      if (this.combatSince == null) this.combatSince = this.t;
    } else if (this.t >= (this.combatUntil || 0)) this.combatSince = null;
    const fighting = this.combatSince != null && this.t - this.combatSince > 1;
    setBgmMode(nearBoss ? (nearBoss.T.final ? 2 : 1) : fighting ? 3 : 0);
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
    P.dodgeCd -= dt; P.inv -= dt; P.stunT -= dt; P.rootT -= dt; P.fireCd -= dt; P.parry -= dt; P.comboT -= dt;
    P.cd.R -= dt; P.cd.E -= dt;
    P.stDelay -= dt;
    if (P.stDelay <= 0) P.st = Math.min(P.maxSt, P.st + 45 * dt);
    if (P.comboT <= 0 && !P.act) P.comboIdx = 0;
    if (P.armorT > 0) {
      P.armorT -= dt; P.pulseT -= dt;
      if (P.pulseT <= 0) { P.pulseT = 1; this.hitCircle(P.x, P.y, 170, C.ult.dmg, { poise: 25, kb: 260 }); this.ringFx(P.x, P.y, 170, ELEM_HEX['土']); sfx.slam(); }
    }
    // 連擊數：2 秒沒命中歸零
    if (P.combo > 0 && (P.comboT2 -= dt) <= 0) { P.combo = 0; P.flowLatch = false; }
    P.flowT -= dt; P.execBuffT -= dt; P.fateT -= dt; P.ultT -= dt; P.flaskT -= dt; P.guardT -= dt;
    // 均衡：持續回真元
    P.mp = Math.min(P.maxMp, P.mp + this.mv('均衡', 'v2') * dt);
    // 回春術
    if (P.regenT > 0) { P.regenT -= dt; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * P.regenRate * dt); if (Math.random() < 0.3) this.vfx.leaves(P.x, P.y, 0x7fffa0, 1); }
    // 岩甲
    if (P.shield > 0 && (P.shieldT -= dt) <= 0) P.shield = 0;
    // 烈焰護體：周圍灼燒
    if (P.flameT > 0) {
      P.flameT -= dt; P.flameTick -= dt;
      if (P.flameTick <= 0) { P.flameTick = 0.5; const c = P.flameC; this.hitCircle(P.x, P.y, 110, c.S.dmg * c.mul, c.ho({ poise: c.S.poise, burn: 1, dot: true })); }
      if (Math.random() < 0.6) this.vfx.flame(P.x + rand(-26, 26), P.y + rand(-10, 20));
    }
    // 水分身
    if (this.decoy && (this.decoy.t -= dt) <= 0) { this.vfx.flash(this.decoy.x, this.decoy.y, 90, 0x9fd8ff, 200); this.decoy.sprite.destroy(); this.decoy = null; }
    this.updateChain();
    if (JD(k.M)) hud.toast(toggleMute() ? '已靜音' : '已開啟聲音', '#999');
    if (JD(k.B)) hud.toast(toggleMusic() ? '背景音樂：開' : '背景音樂：關', '#999');

    // 閃避
    let mx = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown);
    let my = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown);
    const dodgeCost = P.dodgeCost;
    if (JD(k.SPACE) && P.dodgeCd <= 0 && P.st >= dodgeCost && P.stunT <= 0 && P.dashT <= 0) {
      const a = mx || my ? Math.atan2(my, mx) : this.aim;
      P.dvx = Math.cos(a) * 1250; P.dvy = Math.sin(a) * 1250;
      P.dashT = 0.16; P.inv = 0.26 + this.mv('身法') - (this.gt('以攻為守') >= 0 ? 0.03 : 0); P.dodgeAt = this.t; P.dodgeCd = 0.32;
      P.st -= dodgeCost; P.stDelay = 0.6;
      if (P.chain) this.endChain();
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
    P.sprite.setPosition(P.x, P.y).setFlipX(Math.cos(this.aim) * (P.ai ? 1 : PX_FACE[C.img] || 1) < 0);
    P.sprite.setAlpha(P.inv > 0 ? 0.6 : 1);
    // 程序動畫：待機呼吸、移動晃動、受擊壓扁、出招前傾
    P.sq = (P.sq || 0) * Math.pow(0.0005, dt); P.lean = (P.lean || 0) * Math.pow(0.001, dt);
    const moving = (mx || my) && P.dashT <= 0;
    const bob = moving ? Math.sin(this.t * 16) * 0.05 : Math.sin(this.t * 3) * 0.02;
    // 主角動畫（有 AI 序列幀才播）：出招＝攻擊、移動＝奔跑、其餘＝待機
    if (P.ai) {
      const base = P.ai.replace('ai_char_', 'ai_ca_'), a = P.act;
      const atk = a && (a.combo || a.chain || a.charging || a.ang !== undefined && a.fire && !a.flask);
      const want = atk && this.anims.exists(base + '_attack') ? base + '_attack' : moving && this.anims.exists(base + '_run') ? base + '_run' : this.anims.exists(base + '_idle') ? base + '_idle' : null;
      if (want) {
        const cur = P.sprite.anims.currentAnim && P.sprite.anims.currentAnim.key;
        if (want.endsWith('_attack')) { if (P.animAct !== a) { P.animAct = a; P.sprite.play({ key: want, frameRate: Math.max(18, 12 / Math.max(0.25, a.wind + a.rec)) }); } }
        else if (cur !== want || !P.sprite.anims.isPlaying) P.sprite.play(want);
        P.animated = true;
      } else if (P.animated) { P.sprite.stop(); P.sprite.setTexture(P.ai); P.animated = false; }
    }
    P.sprite.setScale(P.bs * (1 + P.sq), P.bs * (1 - P.sq + bob)).setRotation((moving ? Math.sin(this.t * 8) * 0.07 : 0) + P.lean * Math.sign(Math.cos(this.aim) || 1));
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

    // 神通（右鍵、E）
    if (Rp) this.useSkill('R');
    if (JD(k.E)) this.useSkill('E');
    // 抉擇
    if (this.choice) { if (JD(k.ONE)) this.pickChoice(0); else if (JD(k.TWO)) this.pickChoice(1); else if (JD(k.THREE)) this.pickChoice(2); else if (JD(k.FOUR)) this.pickChoice(3); }
    // 大招
    if (JD(k.Q)) {
      if (P.ult < 100) hud.toast(`大招氣 ${Math.floor(P.ult)}%`, '#ffd98a');
      else if (P.stunT <= 0 && P.dashT <= 0) { P.ult = 0; P.act = null; P.charge = -1; if (P.chain) this.endChain(); this.castUlt(); }
    }
    // 丹藥
    if (JD(k.R)) {
      if (P.flask <= 0) hud.toast('丹藥用完了，回篝火補充', '#e05555');
      else if (free) {
        P.flask--;
        P.flaskT = 3.45;
        this.startAct({ wind: 0.45, rec: 0.15, move: 0.3, flask: true, fire: () => { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * P.flaskHeal); this.burst(P.x, P.y, 0x7fffa0, 16, 120, 3, 0.5); sfx.item(); } });
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

  // 出招速度（金屬性、心流）縮短前搖與後搖
  startAct(o) {
    const k = this.spd();
    this.P.act = { t: 0, fired: false, move: 0.5, ang: this.aim, ...o };
    this.P.act.wind /= k; this.P.act.rec /= k;
  }

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
        sfx.swing(P.elem, s.heavy);
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
          this.dashHit = { hit: new Set(), until: this.t + 0.28, dmg: K.dmg, o: { poise: K.poise, heavy: true, melee: true, mark: 6 } };
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

  castUlt() {
    const P = this.P, C = P.cls, U = C.ult;
    hud.banner(U.name);
    // 大招期間（天命用）
    P.ultT = { 金: 1.3, 木: 7, 水: 0.6, 火: 1.3, 土: 7 }[P.elem];
    if (this.gt('天命') >= 0) { P.fateBase = P.fate = this.mv('天命'); P.fateT = P.ultT + 8; }
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
        this.vfx.aiImg('leaf_storm', pt.x, pt.y, { size: 520, dur: 7000, spin: 900, ease: 'Quad.In', depth: 3, alpha: 0.85 });
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

  // 異常中的敵人（乘勢）
  afflicted(e) { return e.burn > 0 || e.poisT > 0 || e.slowT > 0 || e.rootT > 0 || e.freezeT > 0; }

  hurtE(e, base, o = {}) {
    const P = this.P;
    if (e.hp <= 0) return;
    const elem = o.elem || P.elem, sk = o.sk;
    let m = elemMult(elem, e.elem), crit = false;
    const xk = this.gt('相剋');
    if (xk >= 0) { if (m > 1) m = GONGFA.相剋.v[xk]; else if (m < 1) m = GONGFA.相剋.v2[xk]; }
    if (P.elem === '金' && (e.markT > 0 || e.hp < e.maxHp * 0.4)) m *= 1.25;
    if (P.elem === '木' && e.T.fast) m *= 1.3;
    if (e.stagT > 0) m *= 1.3;
    if (!sk) m *= P.dmgMul * (o.exec ? 1 : P.basicMul);
    // 攻擊加成（同一類相加，最後乘上去）
    let add = 0;
    for (const id of ['庚金訣', '長春訣', '癸水訣', '丙火訣', '戊土訣']) if (GONGFA[id].elem === elem) add += this.mv(id);
    if (P.hp < P.maxHp * 0.3) add += this.mv('背水一戰');
    if (this.t - P.lastHit < 5) add += this.mv('怒氣');
    if (P.hp >= P.maxHp - 0.5) add += this.mv('圓滿');
    add += this.mv('捨身') + this.mv('破釜');
    if (o.basic) add += this.mv('狂刃');
    if (o.melee || sk) add += this.mv('均衡');
    if (P.combo >= 5) add += this.mv('連擊') * Math.min(10, Math.floor(P.combo / 5));
    if (P.execBuffT > 0) add += P.execBuff;
    if (P.fateT > 0) add += P.fate;
    if (this.afflicted(e)) add += this.mv('乘勢');
    if (sk) {
      if (e.stagT > 0) add += this.sv(sk, '破綻追擊');
      if (e.hp < e.maxHp * 0.4 || e.markT > 0) add += this.sv(sk, '追獵');
      add += this.sv(sk, '燃元');
      if (this.skT(sk, '急攻') >= 0) add -= 0.1;
    }
    m *= 1 + add;
    if (o.iai && e.stagT > 0) m *= 1.5;
    if (o.exec) m *= 1 + this.mv('處決者');
    if (o.basic && P.critNext) { m *= 1.5; crit = true; P.critNext = false; }
    const dmg = base * m * rand(0.95, 1.05);
    e.hp -= dmg;
    if (e.T.dummy) { this.dps.push([this.t, dmg]); e.hp = e.maxHp; }
    e.flash = 0.07; e.sprite.setTintFill(0xffffff);
    e.sq = o.heavy ? 0.22 : 0.12;
    if (!o.dot) {
      this.vfx.hit(e.x, e.y, ELEM_HEX[elem], o.heavy || crit);
      if (o.heavy || crit) this.vfx.punch(o.exec ? 0.07 : 0.025);
      sfx.hit(elem, o.heavy || o.exec || o.finisher, crit);
    }
    if (!e.aggro) this.alert(e);
    // 韌性：土屬性與破甲加成
    const poise = (o.poise || 0) * P.poiseMul * (1 + this.sv(sk, '破甲'));
    if (o.forceStagger && e.stagT <= 0) { this.stagger(e); if (sk) P.mp = Math.min(P.maxMp, P.mp + this.sv(sk, '破勢')); }
    else if (poise && e.stagT <= 0 && !o.exec) {
      e.poise -= poise;
      if (e.poise <= 0) { this.stagger(e); if (sk) P.mp = Math.min(P.maxMp, P.mp + this.sv(sk, '破勢')); }
    }
    // 異常
    const st = P.statusMul * (e.T.boss ? 0.6 : 1);
    const burn = (o.burn || 0) + this.sv(sk, '灼燒') + (o.basic && P.flameT > 0 ? 1 : 0);
    if (burn) { e.burn = Math.min(6, e.burn + burn); e.burnT = 4; }
    const pois = this.sv(sk, '中毒');
    if (pois && e.poisT <= 0) { e.pois = (e.pois || 0) + pois * st; if (e.pois >= 100) { e.pois = 0; e.poisT = 8; this.popText(e.x, e.y - e.r - 22, '中毒', '#8be02c', 18); this.vfx.sparks(e.x, e.y, 0x8be02c, 14); } }
    const bleed = this.sv(sk, '流血');
    if (bleed) {
      e.bleed = (e.bleed || 0) + bleed * st;
      if (e.bleed >= 100) {
        e.bleed = 0;
        const bd = e.maxHp * (e.T.boss ? 0.05 : 0.12);
        e.hp -= bd; this.popText(e.x, e.y - e.r - 22, `流血 ${Math.round(bd)}`, '#ff3048', 20);
        this.vfx.bleed(e.x, e.y);
      }
    }
    const chill = this.sv(sk, '寒冰');
    if (chill) { e.slowT = Math.max(e.slowT, 1.5); e.slowF = Math.min(e.slowF, 1 - chill); }
    if (Math.random() < this.sv(sk, '定身') * P.statusMul && !e.T.boss) e.rootT = Math.max(e.rootT, 1);
    if (sk && (o.heavy || o.charge) && !o.echo && this.skT(sk, '震岳') >= 0) {
      this.hitCircle(e.x, e.y, 90, this.sv(sk, '震岳') * P.dmgMul, { poise: 8, echo: true, elem: '土', dot: true });
      this.vfx.crack(e.x, e.y, 90);
    }
    if (o.root) e.rootT = Math.max(e.rootT, o.root);
    if (o.mark) e.markT = o.mark;
    if (o.slow) { e.slowT = Math.max(e.slowT, o.slowT || 0.3); e.slowF = Math.min(e.slowF, o.slow); }
    if (o.melee && !e.T.boss && e.atk && e.atk.phase === 'wind') e.atk.t -= 0.12;
    if (o.kb && !e.T.boss && !e.T.dummy && e.stagT <= 0) {
      const a = Math.atan2(e.y - o.ky, e.x - o.kx);
      e.kx += Math.cos(a) * o.kb; e.ky += Math.sin(a) * o.kb;
    }
    if (o.finisher && o.chain && e.stagT > 0 && !e.T.boss) { const a = Math.atan2(e.y - P.y, e.x - P.x); e.kx += Math.cos(a) * 500; e.ky += Math.sin(a) * 500; }
    if (o.basic) {
      P.mp = Math.min(P.maxMp, P.mp + 4 + this.mv('回氣'));
      if (P.elem === '水') P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.006);
    }
    // 連段：餘韻（每段一次）、流轉（每套一次）
    if (o.chain && !o.dot) {
      const ch = o.chain;
      if (ch.yun !== o.step) { ch.yun = o.step; P.mp = Math.min(P.maxMp, P.mp + this.sv(sk, '餘韻')); }
      if (o.finisher && !ch.flowed && this.skT(sk, '流轉') >= 0) {
        ch.flowed = true;
        const other = o.slot === 'R' ? 'E' : 'R';
        P.cd[other] -= this.sv(sk, '流轉');
      }
    }
    // 連擊數（持續傷害不算）
    if (!o.dot && !o.echo) {
      P.combo++; P.comboT2 = 2;
      if (P.combo >= 15 && !P.flowLatch && this.gt('心流') >= 0) { P.flowLatch = true; P.flowT = 6; this.popText(P.x, P.y - 46, '心流', '#9fe8ff', 20); this.vfx.ring(P.x, P.y, 90, 0x9fe8ff, 400); }
    }
    if (P.ultT > 0 && P.fateT > 0) P.fate = Math.min(P.fateBase + 0.1, P.fate + 0.01);
    const cm = P.combo >= 30 ? 1.6 : P.combo >= 20 ? 1.4 : P.combo >= 10 ? 1.2 : 1;
    P.ult = Math.min(100, P.ult + dmg * 0.07 * P.ultMul * cm);
    if (crit || o.heavy || o.exec) this.popText(e.x, e.y - e.r - 10, `${Math.round(dmg)}${crit ? '!' : ''}`, crit ? '#ffd24a' : '#ffffff', crit || o.exec ? 22 : 16);
    if (e.hp <= 0) this.kill(e, o);
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
    if (this.gt('處決者') >= 0) { P.execBuffT = 5; P.execBuff = this.mv('處決者', 'v2'); }
    sfx.execute();
  }

  alert(e) {
    if (e.T.dummy) return;
    e.aggro = true;
    if (e.camp) for (const o of e.camp.members) if (o.hp > 0) o.aggro = true;
    if (e.T.boss && !e.announced) { e.announced = true; hud.banner(e.T.name); sfx.roar(); }
  }

  kill(e, o = {}) {
    const P = this.P;
    e.hp = 0;
    const sp = e.sprite;
    sp.setTintFill(0xffffff);
    this.tweens.add({ targets: sp, alpha: 0, scaleX: sp.scaleX * 1.4, scaleY: sp.scaleY * 0.2, duration: 260, ease: 'Cubic.In', onComplete: () => sp.destroy() });
    this.vfx.sparks(e.x, e.y, ELEM_HEX[e.elem], e.T.boss ? 30 : 14);
    this.vfx.smoke(e.x, e.y, e.T.boss ? 10 : 4);
    this.vfx.flash(e.x, e.y, e.T.boss ? 260 : 90, ELEM_HEX[e.elem], 260);
    sfx.kill();
    if (e.T.dummy) return;
    const gain = Math.round((e.T.exp || 0) * (1 + 0.5 * (e.tier || 0)));
    if (gain) { P.runes += gain; this.popText(e.x, e.y - e.r - 20, `+${gain} 靈石`, '#7fffe0', 15); }
    if (o.sk && this.skT(o.sk, '業火爆') >= 0) {
      this.hitCircle(e.x, e.y, 100, this.sv(o.sk, '業火爆') * P.dmgMul, { poise: 10, echo: true, elem: '火', burn: 1 });
      this.vfx.explode(e.x, e.y, 100, 0xff8a2a);
    }
    if (this.gt('嗜殺') >= 0) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * this.mv('嗜殺'));
    // 掉落強化材料
    if (e.T.elite) { this.addMat('中品靈晶', 1); if (Math.random() < 0.3 * P.lootMul) { const [g] = this.rollGongfa(1, [0.3, 0.6, 0.1]); this.gainGongfa(g.id, g.tier); } }
    else if (!e.T.boss && Math.random() < 0.08 * P.lootMul) this.addMat(e.tier >= 2 ? '中品靈晶' : '下品靈晶', 1);
    if (e.T.boss) {
      sfx.bossDie();
      if (e.T.final) { this.time.delayedCall(1500, () => this.victory()); hud.banner('妖皇伏誅'); }
      else {
        hud.banner(`${e.T.name}伏誅`);
        this.addMat('天外隕晶', 1); this.addMat('上品靈晶', 1);
        const sk = this.rollSkill(true);
        if (sk) this.offer('擊敗夜王・天品神通', [{ label: `神通：${SKILLS[sk].name}`, desc: this.skillBrief(sk), elem: SKILLS[sk].elem, icon: sk }, { label: '改拿功法', desc: '從三個二～三品功法中選一個' }], i => i === 0 ? this.gainSkill(sk) : this.offerGongfa('擊敗夜王・功法', [0, 0.5, 0.5]));
        else this.offerGongfa('擊敗夜王・功法', [0, 0.5, 0.5]);
        P.flask = P.flaskMax;
      }
    }
  }

  // 玩家被打：回傳是否真的受傷。kind：'dot' 毒液、火焰、毒池
  hitPlayer(dmg, src, kind) {
    const P = this.P;
    if (P.inv > 0) {
      if (this.t - P.dodgeAt < 0.2 + this.mv('心眼') && this.slowmo <= 0) this.perfectDodge();
      return false;
    }
    if (P.parry > 0) {
      P.parry = 0; P.inv = 0.4; P.act = null;
      P.mp = Math.min(P.maxMp, P.mp + 30);
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * this.mv('鏡水'));
      if (src && src.hp > 0) { this.stagger(src); src.freezeT = 1.5; }
      this.popText(P.x, P.y - 40, '彈反', '#7fd0ff', 24);
      this.vfx.sigil(P.x, P.y, 70, 0x7fd0ff, 500);
      this.vfx.hit(P.x + Math.cos(this.aim) * 20, P.y + Math.sin(this.aim) * 20, 0xbfe8ff, true);
      this.ringFx(P.x, P.y, 60, ELEM_HEX['水']);
      this.hitstop = 0.12;
      sfx.craft();
      return false;
    }
    // 金鐘罩：擋下正面攻擊並反彈
    if (P.guardT > 0 && (!src || angDiff(Math.atan2(src.y - P.y, src.x - P.x), P.guardAng) < 1.7)) {
      if (src && src.hp > 0) { const c = P.guardHo; this.hurtE(src, dmg * 0.5 * c.mul, c.ho({ poise: 20 })); }
      this.vfx.hit(P.x + Math.cos(P.guardAng) * 24, P.y + Math.sin(P.guardAng) * 24, 0xffe080, true);
      this.vfx.ring(P.x, P.y, 50, 0xffe080, 250);
      this.hitstop = 0.05; sfx.craft();
      return false;
    }
    // 減傷功法：全部相乘，總減傷最多 60%
    let k = 1;
    const cut = v => { k *= 1 - v; };
    const full = P.hp >= P.maxHp - 0.5;
    cut(this.mv('鐵壁'));
    if (P.hp < P.maxHp * 0.3) cut(this.mv('金身不壞'));
    if (full) cut(this.mv('無垢'));
    if (this.t - P.lastHit < 3) cut(this.mv('痛定'));
    if (this.t - P.dodgeAt < 1.5) cut(this.mv('閃避餘勁'));
    if (P.act || P.chain) cut(this.mv('以攻為守'));
    if (P.flaskT > 0) cut(this.mv('服丹護體'));
    if (this.gt('以寡敵眾') >= 0 && this.enemies.filter(e => e.hp > 0 && e.aggro && d2(e.x, e.y, P.x, P.y) < 300 * 300).length >= 3) cut(this.mv('以寡敵眾'));
    if (dmg > P.maxHp * 0.15) cut(this.mv('不屈'));
    if (src && src.T && src.T.boss) cut(this.mv('斬妖'));
    if (kind === 'dot') cut(this.mv('百毒不侵'));
    if (P.act && P.act.chargeDR && !P.act.fired) cut(P.act.chargeDR);
    k = Math.max(0.4, k) * (this.gt('捨身') >= 0 ? 1.1 : 1);
    const dr = k * (P.armorT > 0 ? 0.3 : 1) * (P.elem === '土' && P.act && P.act.armor ? 0.7 : 1);
    let hurt = dmg * dr;
    // 岩甲護盾先吸收
    if (P.shield > 0) { const a = Math.min(P.shield, hurt); P.shield -= a; hurt -= a; this.vfx.hit(P.x, P.y, ELEM_HEX['土'], false); }
    P.lastHit = this.t;
    P.hp -= hurt;
    P.combo = 0; P.flowLatch = false;
    if (P.flowT > 0) { P.flowT = 0; this.popText(P.x, P.y - 44, '心流中斷', '#9fb8c8', 16); }
    P.sq = 0.28;
    this.vfx.hit(P.x, P.y, 0xff3030, true);
    this.cameras.main.shake(120, 0.005);
    sfx.hurt();
    const armored = P.armorT > 0 || (P.act && P.act.armor) || P.shield > 0;
    if (!armored) {
      P.stunT = 0.28; P.act = null; P.charge = -1;
      if (P.chain) this.endChain();
      if (src) { const a = Math.atan2(P.y - src.y, P.x - src.x); P.x += Math.cos(a) * 30; P.y += Math.sin(a) * 30; }
    }
    if (P.hp <= 0) { P.hp = 0; this.gameOver(); }
    return true;
  }

  perfectDodge() {
    const P = this.P;
    this.slowmo = 1.1;
    P.critNext = true;
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * this.mv('鏡水'));
    P.mp = Math.min(P.maxMp, P.mp + 10);
    // 劍心：重置神通冷卻
    for (const k of ['R', 'E']) {
      const inst = P.equip[k];
      if (inst && this.skT(inst, '劍心') >= 0) { P.cd[k] = Math.min(P.cd[k], 0); P.swordHeart[k] = this.sv(inst, '劍心'); }
    }
    this.vfx.aiImg('dodge_ghost', P.x, P.y - 20, { size: 200, dur: 500, grow: 1.3, depth: 3 });
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
        this.hurtE(e, this.dashHit.dmg, { ...this.dashHit.o, kx: P.x, ky: P.y });
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.flash > 0 && (e.flash -= dt) <= 0) e.sprite.clearTint();
      e.markT -= dt; e.rootT -= dt; e.slowT -= dt;
      if (e.slowT <= 0) e.slowF = 1;
      for (const k in e.cds) e.cds[k] -= dt;
      if (e.poisT > 0) {
        e.poisT -= dt;
        e.hp -= e.maxHp * (e.T.boss ? 0.006 : 0.02) * dt;
        if (Math.random() < 0.15) this.part(e.x + rand(-e.r, e.r) * 0.6, e.y + rand(-e.r, e.r) * 0.6, 0, 0, 0x8be02c);
        if (e.hp <= 0 && !e.T.dummy) { this.kill(e); continue; }
        if (e.T.dummy) e.hp = e.maxHp;
      }
      if (e.bleed > 0) e.bleed = Math.max(0, e.bleed - 4 * dt);
      if (e.pois > 0) e.pois = Math.max(0, e.pois - 4 * dt);
      if (e.burn > 0) {
        e.burnT -= dt; e.burnTick -= dt;
        if (e.burnTick <= 0) { e.burnTick = 0.5; e.hp -= e.burn * 1.5 * this.P.burnMul; if (e.hp <= 0) { this.kill(e); continue; } }
        if (Math.random() < 0.25 * e.burn) this.vfx.flame(e.x + rand(-e.r, e.r) * 0.6, e.y + rand(-e.r, e.r) * 0.4);
        if (e.burnT <= 0) e.burn = 0;
      }
      if (e.T.dummy) { e.sprite.setPosition(e.x, e.y); continue; }
      // 第二階段
      if (e.T.phase2 && !e.phase2 && e.hp < e.maxHp * 0.5) {
        e.phase2 = true; e.windMul = 0.8; e.speedMul = 1.15;
        const sk = monKey(e.type, 'scary');
        if (this.textures.exists(sk) && e.sprite.texture.key !== sk) { e.sprite.setTexture(sk); this.setMonScale(e); this.vfx.flash(e.x, e.y, 260, 0xff3030, 400); }
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

      const tg = this.decoy && e.aggro ? this.decoy : P;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
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
      if (e.atk && e.atk.phase === 'dash') e.sprite.setScale(e.bs * 1.25, e.bs * 0.85);
      else e.sprite.setScale(e.bs * (1 + e.sq) * (1 + 0.1 * ant), e.bs * (1 - e.sq) * (1 + 0.1 * ant + Math.sin(this.t * 4 + e.x) * 0.02));
      e.sprite.setRotation(ant ? -Math.cos(e.atk.ang) * 0.12 * ant : 0);
      if (ant > 0.7 && Math.random() < 0.3) this.part(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), 0, 0, 0xff4040);
      const face = Math.abs(vx) > 5 ? vx : dx, fc = e.face;
      if (fc) e.sprite.setFlipX(face * fc < 0);
    }
    if (this.enemies.some(e => e.hp <= 0)) this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  startAtk(e, id, m) {
    if (m.cd) e.cds[id] = m.cd;
    const tg = this.decoy || this.P;
    e.atk = { id, m, i: 0, phase: 'wind', t: 0, wind: this.windOf(e, m.steps[0]), ang: Math.atan2(tg.y - e.y, tg.x - e.x), tx: tg.x, ty: tg.y };
  }

  windOf(e, st) { return rand(st.wind[0], st.wind[1]) * (e.windMul || 1); }

  updateAtk(e, dt) {
    const P = this.P, a = e.atk, st = a.m.steps[a.i];
    a.t += dt;
    if (a.phase === 'wind') {
      const track = st.track || 0.6;
      const tg = this.decoy || P;
      if (a.t < a.wind * track) { a.ang = Math.atan2(tg.y - e.y, tg.x - e.x); a.tx = tg.x; a.ty = tg.y; }
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
      case 'line': {
        if (st.dash) { a.phase = 'dash'; a.hitP = false; sfx.dash(); return; }
        // 原地直線攻擊（啄、尾刺、舌頭）：點到線段距離
        const ex = Math.cos(a.ang), ey = Math.sin(a.ang), px = P.x - e.x, py = P.y - e.y, t = clamp(px * ex + py * ey, 0, st.len);
        if (Math.hypot(px - ex * t, py - ey * t) < st.width / 2 + P.r) this.hitPlayer(st.dmg * e.dmgMul, e);
        this.vfx.claw(e.x + ex * st.len * 0.5, e.y + ey * st.len * 0.5, a.ang, st.len * 0.6);
        break;
      }
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
    // 金劍氣、火球：有 AI 特效圖就用（劍氣朝右、火球朝左）
    const aiTex = o.tex === 'sw_金' ? 'ai_vfx_sword_qi' : o.tex === 'fire_火' ? 'ai_vfx_fireball' : null;
    if (aiTex && this.textures.exists(aiTex)) {
      const src = this.textures.get(aiTex).getSourceImage(), want = (o.r || 8) * 5.5 * (o.scale || 1) * (aiTex.endsWith('qi') ? 1.6 : 1);
      p.sprite = this.add.image(o.x, o.y, aiTex).setDepth(5).setRotation(o.ang + (aiTex.endsWith('fireball') ? Math.PI : 0)).setScale(want / Math.max(src.width, src.height)).setBlendMode(Phaser.BlendModes.ADD);
    } else p.sprite = this.add.image(o.x, o.y, o.tex).setDepth(5).setRotation(o.ang).setScale(o.scale || 1).setBlendMode(Phaser.BlendModes.ADD);
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
          this.hitCircle(p.x, p.y, p.explode, p.dmg, { poise: p.poise, burn: p.burn, basic: p.basic, heavy: p.heavy, kb: 160, ...p.ho });
          this.ringFx(p.x, p.y, p.explode, ELEM_HEX['火']);
          this.vfx.flash(p.x, p.y, p.explode * 2, 0xff8a2a, 260); this.vfx.smoke(p.x, p.y, p.heavy ? 6 : 2);
          for (let i = 0; i < (p.heavy ? 8 : 3); i++) this.vfx.flame(p.x + rand(-p.explode, p.explode) * 0.5, p.y + rand(-p.explode, p.explode) * 0.5);
          if (p.heavy) { this.hitstop = 0.06; this.cameras.main.shake(140, 0.006); }
          sfx.slam();
        } else this.hurtE(e, p.dmg, { poise: p.poise, burn: p.burn, root: p.root, basic: p.basic, heavy: p.heavy, kb: 60, ...p.ho, kx: p.x - p.vx, ky: p.y - p.vy });
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
        if (this.hitPlayer(p.dmg, p.src, p.tex === 'venom' || p.tex === 'fire_火' ? 'dot' : null) && p.root) { P.rootT = p.root; hud.toast('被蛛網纏住了！', '#f0f0f0'); }
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
            this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: a.poise, burn: a.burn, slow: a.slow, ...a.ho });
          }
          if (a.slow) for (const e of this.enemies) if (d2(e.x, e.y, a.x, a.y) < a.R * a.R) { e.slowT = 0.3; e.slowF = a.slow; }
          if (Math.random() < (a.small ? 0.25 : 0.7)) {
            const an = rand(0, Math.PI * 2), rr = rand(0, a.R) * 0.9, x = a.x + Math.cos(an) * rr, y = a.y + Math.sin(an) * rr;
            if (a.color === ELEM_HEX['火']) this.vfx.flame(x, y); else this.part(x, y, 0, 0, a.color);
          }
          if (a.life <= 0) a.dead = true;
          break;
        case 'drop':
          a.delay -= t;
          if (a.delay <= 0) {
            this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: a.poise, burn: a.burn, heavy: a.meteor, kb: a.meteor ? 300 : 60, ...a.ho });
            this.ringFx(a.x, a.y, a.R, a.color);
            this.vfx.sparks(a.x, a.y, a.color, a.meteor ? 30 : 6);
            if (a.rock || a.seal) {
              if (a.seal) this.vfx.seal(a.x, a.y, a.R, a.color); else this.vfx.rockFall(a.x, a.y, a.R);
              this.vfx.crack(a.x, a.y, a.R); this.vfx.dirt(a.x, a.y, a.seal ? 30 : 16); this.vfx.smoke(a.x, a.y, a.seal ? 14 : 5);
              this.hitstop = a.seal ? 0.14 : 0.06; this.cameras.main.shake(a.seal ? 400 : 160, a.seal ? 0.016 : 0.007); this.vfx.punch(a.seal ? 0.08 : 0.04); sfx.slam();
            } else if (a.meteor) {
              if (a.bird) this.vfx.phoenix(a.x, a.y, a.color);
              else this.vfx.anim('fire_burst_anim', a.x, a.y, a.R * 3);
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
          if (a.tickT <= 0) { a.tickT = a.tick; if (d2(P.x, P.y, a.x, a.y) < (a.R + P.r) ** 2) this.hitPlayer(a.dmg, null, 'dot'); }
          if (Math.random() < 0.3) this.part(a.x + rand(-a.R, a.R) * 0.7, a.y + rand(-a.R, a.R) * 0.7, 0, 0, 0xc070ff);
          if (a.life <= 0) a.dead = true;
          break;
        case 'fx':
          a.life -= dt;
          if (a.life <= 0) a.dead = true;
          break;
        case 'swords': {
          // 誅仙劍陣：陣中飛劍輪流追擊陣內的敵人
          a.life -= t; a.tickT -= t;
          if (a.tickT <= 0 && a.n > 0) {
            a.tickT = 4 / 12;
            const inside = this.enemies.filter(e => e.hp > 0 && d2(e.x, e.y, a.x, a.y) < (a.R + e.r) ** 2);
            if (inside.length) {
              const e = pick(inside); a.n--;
              this.vfx.swordDrop(e.x, e.y, a.color);
              this.hurtE(e, a.dmg, { ...a.ho, kx: a.x, ky: a.y });
            }
          }
          if (Math.random() < 0.4) this.part(a.x + rand(-a.R, a.R) * 0.8, a.y + rand(-a.R, a.R) * 0.8, 0, 0, a.color);
          if (a.life <= 0) a.dead = true;
          break;
        }
        case 'treant': {
          // 樹人：每 0.5 秒鞭打範圍內最近的敵人
          if (!a.spr) a.spr = this.vfx.treant(a.x, a.y);
          a.life -= t; a.tickT -= t;
          if (a.tickT <= 0) {
            a.tickT = a.tick;
            let best = null, bd = a.R * a.R;
            for (const e of this.enemies) { if (e.hp <= 0) continue; const dd = d2(e.x, e.y, a.x, a.y); if (dd < bd) { bd = dd; best = e; } }
            if (best) { this.vfx.whip(a.x, a.y - 20, Math.atan2(best.y - a.y + 20, best.x - a.x), Math.sqrt(bd), a.color); this.hurtE(best, a.dmg, { ...a.ho, kx: a.x, ky: a.y }); }
          }
          if (a.life <= 0) { a.dead = true; this.vfx.smoke(a.x, a.y, 4); this.tweens.add({ targets: a.spr, alpha: 0, scaleY: 0.2, duration: 300, onComplete: () => a.spr.destroy() }); }
          break;
        }
        case 'whirl': {
          // 水龍捲：持續把敵人吸向中心
          if (!a.spr) a.spr = this.vfx.whirlpool(a.x, a.y, a.R, a.color);
          a.spr.rotation -= 8 * t;
          a.life -= t; a.tickT -= t;
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.T.boss || e.T.dummy) continue;
            const dd = Math.sqrt(d2(e.x, e.y, a.x, a.y));
            if (dd < a.R * 1.8 && dd > 8) { e.x += (a.x - e.x) / dd * 260 * t; e.y += (a.y - e.y) / dd * 260 * t; }
          }
          if (a.tickT <= 0) { a.tickT = a.tick; this.hitCircle(a.x, a.y, a.R, a.dmg, { poise: 6, ...a.ho, dot: false }); }
          if (Math.random() < 0.6) this.part(a.x + rand(-a.R, a.R) * 0.7, a.y + rand(-a.R, a.R) * 0.7, 0, 0, 0x9fd8ff);
          if (a.life <= 0) { a.dead = true; this.tweens.add({ targets: a.spr, alpha: 0, scale: a.spr.scale * 1.4, duration: 300, onComplete: () => a.spr.destroy() }); }
          break;
        }
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
    // 影子
    g.fillStyle(0x000000, 0.22).fillEllipse(P.x, P.y + 10, 40, 12);
    for (const e of this.enemies) if (e.hp > 0 && !e.T.dummy && Math.abs(e.x - P.x) < 1100 && Math.abs(e.y - P.y) < 800) g.fillStyle(0x000000, 0.22).fillEllipse(e.x, e.y + e.r * 0.75, e.r * 2.6, e.r * 0.8);
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
    // 神通蓄力
    if (P.act && P.act.charging && !P.act.fired) {
      const k = clamp(P.act.t / P.act.wind, 0, 1), col = ELEM_HEX[P.act.charging];
      f.lineStyle(3, col, 0.5 + 0.4 * k).strokeCircle(P.x, P.y, 46 - 24 * k);
      f.lineStyle(2, 0xffffff, k > 0.95 ? 0.9 : 0.3).beginPath().arc(P.x, P.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k).strokePath();
      if (Math.random() < 0.6) this.part(P.x + rand(-40, 40), P.y + rand(-40, 40), 0, 0, col);
    }
    if (P.shield > 0) f.lineStyle(3, 0xc08a4a, 0.7).strokeCircle(P.x, P.y, 28).fillStyle(0xc08a4a, 0.12).fillCircle(P.x, P.y, 28);
    if (P.flowT > 0) f.lineStyle(2, 0x9fe8ff, 0.4 + 0.3 * Math.sin(this.t * 12)).strokeCircle(P.x, P.y, 34);
    if (this.decoy) f.lineStyle(2, 0x9fd8ff, 0.6).strokeCircle(this.decoy.x, this.decoy.y, 26);
    for (const a of this.areas) if (a.kind === 'swords') f.lineStyle(2, a.color, 0.5 + 0.2 * Math.sin(this.t * 8)).strokeCircle(a.x, a.y, a.R);
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
    const P = s.P, C = P.cls;
    const sk = k => { const i = P.equip[k]; return i ? [`${SKILLS[i.id].name}${i.plus ? ` +${i.plus}` : ''}`, `${Math.round(s.skillCost(i))} 真元${SKILLS[i.id].chain ? '・連段' : ''}`, SKILLS[i.id].elem, i.id] : ['（空）', '寶箱取得', null, null]; };
    const R = sk('R'), E = sk('E');
    $('slots').innerHTML = [
      ['左鍵', C.basic.name, C.basic.charged ? '按住＝蓄力重擊' : '', P.elem],
      ['右鍵', R[0], R[1], R[2], R[3]],
      ['E', E[0], E[1], E[2], E[3]],
      ['Q', C.ult.name, '大招', P.elem],
      ['R', '丹藥', '', null],
    ].map(([k, n, c, e, id], i) => `<div class="slot${id && hasIcon(id) ? ' hasic' : ''}" id="slot${i}"${e ? ` style="border-color:${ELEM_CSS[e]}88"` : ''}>${id && hasIcon(id) ? `<img class="ic" src="${iconSrc(id)}" alt="">` : ''}<div class="key">${k}</div><div class="nm"${e ? ` style="color:${ELEM_CSS[e]}"` : ''}>${n}</div><div class="lv">${c}</div><div class="pips"></div><div class="cd"></div></div>`).join('');
  },
  update(s) {
    const P = s.P;
    $('who').innerHTML = `<b style="color:${ELEM_CSS[P.elem]}">${P.elem}・${P.cls.name}　Lv${P.level}</b><span class="small">靈石 ${P.runes}${P.level < LEVEL.max ? ` / 升級需 ${LEVEL.cost(P.level)}${P.runes >= LEVEL.cost(P.level) ? '（回篝火升級！）' : ''}` : ''}</span>`;
    $('attrs').innerHTML = ELEMS.map(e => `<span style="color:${ELEM_CSS[e]}">${e}${P.attr[e]}</span>`).join(' ');
    $('hpb').style.width = `${P.hp / P.maxHp * 100}%`; $('hpt').textContent = `肉身 ${Math.ceil(P.hp)} / ${P.maxHp}`;
    $('stb').style.width = `${P.st / P.maxSt * 100}%`;
    $('mpb').style.width = `${P.mp / P.maxMp * 100}%`; $('mpt').textContent = `真元 ${Math.floor(P.mp)}`;
    const cdOf = k => { const i = P.equip[k]; return !i ? 1 : P.chain && P.chain.slot === k ? 0 : clamp(P.cd[k] / s.skillCd(i), 0, 1); };
    const cd = [0, cdOf('R'), cdOf('E'), 1 - P.ult / 100, P.flask ? 0 : 1];
    cd.forEach((v, i) => { const el = document.querySelector(`#slot${i} .cd`); if (el) el.style.width = `${v * 100}%`; });
    // 連段進度
    for (const [k, i] of [['R', 1], ['E', 2]]) {
      const el = document.querySelector(`#slot${i} .pips`), inst = P.equip[k];
      if (!el) continue;
      el.innerHTML = inst && SKILLS[inst.id].chain ? [0, 1, 2].map(j => `<i class="${P.chain && P.chain.slot === k && j < P.chain.i ? 'on' : ''}"></i>`).join('') : '';
    }
    const cb = $('combo');
    cb.classList.toggle('hidden', P.combo < 3);
    if (P.combo >= 3) cb.innerHTML = `<b>${P.combo}</b><span>連擊${P.combo >= 30 ? '・大招氣 ×1.6' : P.combo >= 20 ? '・大招氣 ×1.4' : P.combo >= 10 ? '・大招氣 ×1.2' : ''}${P.flowT > 0 ? '・心流' : ''}</span>`;
    const u = document.querySelector('#slot3 .lv'); if (u) u.textContent = P.ult >= 100 ? '可施放！' : `${Math.floor(P.ult)}%`;
    const f = document.querySelector('#slot4 .lv'); if (f) f.textContent = `剩 ${P.flask} 瓶`;
    $('slowfx').classList.toggle('on', s.slowmo > 0);
    $('night').textContent = s.nightInfo + (s.outside ? '　⚡ 你在結界外！' : '');
    $('boons').innerHTML = P.mer.filter(Boolean).map(g => `<span class="gf">${g.id}${'ⅠⅡⅢ'[g.tier]}</span>`).join('') + (P.gf.length ? `<span class="small">　卷軸 ${P.gf.length} 張待裝備</span>` : '');
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
    else if (s.nearFire) pr = `<b style="color:#ff9a3c">[F] ${s.nearFire.lit ? '篝火休息（回滿、升級、強化、功法）' : '點亮篝火（獲得功法）'}</b>`;
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
    box.innerHTML = `<div class="ctitle">${c.title}<span class="small">　按 ${c.opts.map((_, i) => i + 1).join("／")} 或點選（遊戲不會暫停）</span></div><div class="copts">${c.opts.map((o, i) =>
      `<div class="copt${o.duo ? ' duo' : ''}" data-i="${i}" style="border-color:${o.elem ? ELEM_CSS[o.elem] : '#6b5a2e'}"><div class="k">${i + 1}</div>${o.icon && hasIcon(o.icon) ? `<img class="ic" src="${iconSrc(o.icon)}" alt="">` : ''}<div class="n" style="color:${o.elem ? ELEM_CSS[o.elem] : '#ffd98a'}">${o.label}</div><div class="d">${o.desc}</div></div>`).join('')}</div>`;
    box.querySelectorAll('.copt').forEach(el => el.onclick = () => s.pickChoice(+el.dataset.i));
  },
  hideChoice() { $('choice').classList.add('hidden'); $('v3hud').classList.remove('choosing'); },
  // ---------- 篝火介面（暫停遊戲） ----------
  bonfire(s, tab, mode) {
    const box = $('bonfire'), P = s.P;
    if (mode) this.bfMode = mode;
    const bag = this.bfMode === 'bag';
    this.bfTab = tab || this.bfTab || (bag ? 'gf' : 'lv');
    if (bag && this.bfTab === 'lv') this.bfTab = 'gf';
    box.classList.remove('hidden');
    const t = this.bfTab;
    const ec = (e, x = e) => `<span style="color:${ELEM_CSS[e]}">${x}</span>`;
    const mats = Object.keys(MATS).map(k => `<span style="color:${MATS[k]}">${k} ${P.mats[k]}</span>`).join('　');
    let body = '';
    if (t === 'lv') {
      const cost = LEVEL.cost(P.level), can = P.level < LEVEL.max && P.runes >= cost;
      body = `<p>升一級：肉身 +${Math.round(LEVEL.hp * 100)}%、傷害 +${Math.round(LEVEL.dmg * 100)}%，並把 1 點加到五行之一。${P.level < LEVEL.max ? `需要靈石 <b>${cost}</b>（現有 ${P.runes}）` : '已達上限'}</p>
      <div class="attrs">${ELEMS.map(e => `<div class="attr" style="border-color:${ELEM_CSS[e]}">
        <div class="an">${ec(e, `${e}・${ATTR[e].stat}`)}<b>${P.attr[e]}</b></div>
        <div class="small">每點：${ATTR[e].side}；補正${e}系神通</div>
        <button data-act="lv" data-e="${e}" ${can ? '' : 'disabled'}>升級 +1</button></div>`).join('')}</div>
      <p class="small">屬性 30 點以後補正收益減半。神通需求不足時傷害 ×0.6。</p>`;
    } else if (t === 'sk') {
      body = P.skills.map((inst, idx) => {
        const S = SKILLS[inst.id], fc = forgeCost(S.q, inst.plus), slotN = inscribeSlots(S.q, inst.plus);
        const okReq = s.reqOk(inst);
        const eq = ['R', 'E'].find(k => P.equip[k] === inst);
        const canForge = fc && P.mats[fc.mat] >= fc.n && P.runes >= fc.runes;
        const ins = Array.from({ length: slotN }, (_, j) => inst.ins[j]
          ? `<span class="gf">${inst.ins[j].id}${'ⅠⅡⅢ'[inst.ins[j].tier]} <a data-act="unins" data-i="${idx}" data-j="${j}" title="拆下會降一品">拆</a></span>`
          : '<span class="gf empty">空銘刻槽</span>').join('');
        return `<div class="skrow${eq ? ' on' : ''}" style="border-left-color:${ELEM_CSS[S.elem]}">
          <div class="sh">${hasIcon(inst.id) ? `<img class="ic" src="${iconSrc(inst.id)}" alt="">` : ''}${ec(S.elem, `<b>${S.name}${inst.plus ? ` +${inst.plus}` : ''}</b>`)} <span class="tag">${S.q}品・${S.type}</span>${eq ? `<span class="tag eq">已裝 ${eq === 'R' ? '右鍵' : 'E'}</span>` : ''}</div>
          <div class="small">${S.desc}</div>
          <div class="small">補正 ${Object.entries(S.sc).map(([e, g]) => ec(e, `${e}${g}`)).join(' ')}・需求 <span style="color:${okReq ? '#9c968a' : '#ff6060'}">${Object.entries(S.req).map(([e, n]) => `${e}${n}`).join(' ')}</span>・${S.cost} 真元／${S.cd}s・傷害倍率 ×${s.skillMul(inst).toFixed(2)}</div>
          <div class="gfs"><span class="gf innate">天生 ${S.innate[0]}${'ⅠⅡⅢ'[innateTier(S, inst.plus)]}</span>${ins}</div>
          <div class="btns"><button data-act="eq" data-k="R" data-i="${idx}" ${eq === 'R' ? 'disabled' : ''}>裝到右鍵</button><button data-act="eq" data-k="E" data-i="${idx}" ${eq === 'E' ? 'disabled' : ''}>裝到 E</button>
          ${!fc ? '<span class="small">已強化到頂</span>' : bag ? `<span class="small">強化 +${inst.plus + 1} 要在篝火（${fc.mat}×${fc.n}、靈石 ${fc.runes}）</span>` : `<button data-act="forge" data-i="${idx}" ${canForge ? '' : 'disabled'}>強化 +${inst.plus + 1}：${fc.mat}×${fc.n}、靈石 ${fc.runes}</button>`}</div></div>`;
      }).join('') + `<p class="small">強化：凡品每級傷害 +10%，+3 天生功法升一品，+5 開第二個銘刻槽；天品每級 +18%，+3 天生功法三品並開第二槽。</p>`;
    } else {
      const mer = P.mer.map((g, j) => g
        ? `<div class="mer"><b>${g.id}・${TIER_CN[g.tier]}</b><div class="small">${gfDesc(g.id, g.tier)}</div><button data-act="unmer" data-j="${j}">卸下</button></div>`
        : '<div class="mer empty">空經脈</div>').join('');
      const inv = P.gf.map((g, idx) => {
        const G = GONGFA[g.id];
        let btns = '';
        if (G.slot === '經脈') btns = `<button data-act="mer" data-i="${idx}" ${P.mer.some(m => !m) && !P.mer.some(m => m && m.id === g.id) ? '' : 'disabled'}>運入經脈</button>`;
        else btns = P.skills.map((inst, si) => { const ok = s.canInscribe(inst, g); return ok === true ? `<button data-act="ins" data-i="${idx}" data-s="${si}">銘刻到 ${SKILLS[inst.id].name}</button>` : ''; }).join('') || '<span class="small">沒有能銘刻的神通（槽滿或類型不合）</span>';
        return `<div class="gfrow"><b>${g.id}・${TIER_CN[g.tier]}</b> <span class="tag">${G.cat}・${G.slot}</span><div class="small">${gfDesc(g.id, g.tier)}</div><div class="btns">${btns}</div></div>`;
      }).join('') || '<p class="small">沒有未使用的功法卷軸。開寶箱、點篝火、打精英和夜王可以拿到。</p>';
      body = `<h3>經脈（全身生效，同名不疊加）</h3><div class="mers">${mer}</div><h3>功法卷軸</h3>${inv}
        <p class="small">神通類功法銘刻在神通上，只影響那門神通；從神通上拆下會降一品（一品會消失）。</p>`;
    }
    const head = bag ? `<b>行囊</b>${s.inCombat() ? '<span class="warn">戰鬥中：時間變慢，但沒有停</span>' : '<span class="small">（暫停中）</span>'}` : '<b>篝火</b>';
    const tabs = [['lv', '升級・屬性'], ['sk', `神通（${P.skills.length}）`], ['gf', `功法・經脈（${P.gf.length}）`]].filter(([k]) => !bag || k !== 'lv');
    box.classList.toggle('bag', bag);
    box.innerHTML = `<div class="bfhead">${head}　Lv${P.level}・靈石 ${P.runes}　${mats}<button class="close" data-act="close">離開（${bag ? 'Tab' : 'F'}／Esc）</button></div>
      <div class="bftabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${t === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="bfbody">${body}</div>`;
    box.onclick = ev => {
      const b = ev.target.closest('[data-act],[data-tab]');
      if (!b || b.disabled) return;
      if (b.dataset.tab) { this.bonfire(s, b.dataset.tab); return; }
      const a = b.dataset.act, i = +b.dataset.i;
      if (a === 'close') { this.closeBonfire(s); return; }
      if (a === 'lv') { P.runes -= LEVEL.cost(P.level); P.level++; P.attr[b.dataset.e]++; s.recalc(); P.hp = P.maxHp; sfx.levelup(); }
      if (a === 'eq') {
        const inst = P.skills[i], k = b.dataset.k, other = k === 'R' ? 'E' : 'R';
        if (P.equip[other] === inst) P.equip[other] = P.equip[k];
        P.equip[k] = inst; P.cd[k] = 0;
      }
      if (a === 'forge') {
        const inst = P.skills[i], S = SKILLS[inst.id], fc = forgeCost(S.q, inst.plus);
        P.mats[fc.mat] -= fc.n; P.runes -= fc.runes; inst.plus++; sfx.craft();
      }
      if (a === 'unins') { const inst = P.skills[i], [g] = inst.ins.splice(+b.dataset.j, 1); if (g.tier > 0) P.gf.push({ id: g.id, tier: g.tier - 1 }); }
      if (a === 'ins') { const [g] = P.gf.splice(i, 1); P.skills[+b.dataset.s].ins.push(g); sfx.craft(); }
      if (a === 'mer') { const [g] = P.gf.splice(i, 1); P.mer[P.mer.findIndex(m => !m)] = g; s.recalc(); sfx.craft(); }
      if (a === 'unmer') { const j = +b.dataset.j; P.gf.push(P.mer[j]); P.mer[j] = null; s.recalc(); }
      this.start(s);
      this.bonfire(s);
    };
  },
  closeBonfire(s) {
    $('bonfire').classList.add('hidden');
    s.paused = false; s.bag = false;
    s.input.keyboard.resetKeys();
  },
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
// 每首歌一個 Audio，切換時交叉淡入淡出；切回來會從上次的位置繼續，不會重新下載
let bgmTracks = null, bgmMode = -1, bgmFader = null;
const bgmEls = {};
const BGM_VOL = 0.45;
async function startBgmFile() {
  if (bgmTracks) return;
  let files = [];
  try { const r = await fetch('assets/audio/list.json'); if (r.ok) files = await r.json(); } catch (e) { /* 其他伺服器沒有這個清單 */ }
  if (!files.length) return;
  const find = k => files.find(n => n.toLowerCase().startsWith(k));
  const any = find('bgm.') || files[0];
  // 0 探索、1 夜王、2 決戰、3 一般戰鬥
  bgmTracks = [find('bgm_explore') || any, find('bgm_battle') || find('bgm_explore') || any, find('bgm_final') || find('bgm_battle') || any, find('bgm_combat') || find('bgm_explore') || any];
  toggleBgm(); // 關掉合成音樂
  const kick = () => { const el = bgmEls[bgmTracks[bgmMode]]; if (el && el.paused && !bgmMuted) el.play().catch(() => {}); };
  window.addEventListener('pointerdown', kick, { once: true }); window.addEventListener('keydown', kick, { once: true });
  setBgmMode(0);
}
let bgmMuted = false;
// B 鍵：有音樂檔時開關音樂檔，沒有時開關合成音樂
function toggleMusic() {
  if (!bgmTracks) return toggleBgm();
  bgmMuted = !bgmMuted;
  const m = bgmMode; bgmMode = -1; setBgmMode(m);
  return !bgmMuted;
}
function setBgmMode(m) {
  if (!bgmTracks || m === bgmMode) return;
  bgmMode = m;
  const file = bgmTracks[m];
  if (!bgmEls[file]) { const el = new Audio('assets/audio/' + file); el.loop = true; el.volume = 0; el.preload = 'auto'; bgmEls[file] = el; }
  const cur = bgmEls[file];
  if (cur.paused && !bgmMuted) cur.play().catch(() => {});
  // 單一淡入淡出迴圈：目前的歌往 BGM_VOL，其他往 0，降到 0 就暫停（保留位置）
  if (bgmFader) return;
  bgmFader = setInterval(() => {
    let done = true;
    for (const [f, el] of Object.entries(bgmEls)) {
      const want = f === bgmTracks[bgmMode] && !bgmMuted ? BGM_VOL : 0;
      const v = el.volume + Math.sign(want - el.volume) * 0.045;
      el.volume = Math.abs(want - el.volume) <= 0.045 ? want : Math.min(1, Math.max(0, v));
      if (el.volume === 0 && !el.paused) el.pause();
      if (el.volume !== want) done = false;
    }
    if (done) { clearInterval(bgmFader); bgmFader = null; }
  }, 100);
}

// ---------- 職業選擇 ----------
let game = null;
function showSelect() {
  $('over').classList.add('hidden');
  $('v3hud').classList.add('hidden');
  const box = $('select');
  box.classList.remove('hidden');
  const sex = window.__sex || 'm';
  box.innerHTML = `<h1>選擇主修</h1>
  <div class="sexsel"><button data-sex="m" class="${sex === 'm' ? 'on' : ''}">男修</button><button data-sex="f" class="${sex === 'f' ? 'on' : ''}">女修</button><span class="small">（Tab 鍵切換）</span></div>
  <div class="cards">${ELEMS.map((e, i) => {
    const C = CLASSES[e];
    return `<div class="card" data-e="${e}" style="border-color:${ELEM_CSS[e]}">
      <div class="k">${i + 1}</div><img class="por" src="assets/ai/char/${C.id}_${sex}.webp" onerror="this.remove()" alt="">
      <h2 style="color:${ELEM_CSS[e]}">${e}・${C.name}</h2><div class="role">${C.role}</div>
      <p><b>普攻</b> ${C.basic.name}：${C.basic.desc}</p><p><b>神通</b> ${SKILLS[START_SKILL[e]].name}：${SKILLS[START_SKILL[e]].desc}</p>
      <p><b>大招</b> ${C.ult.name}：${C.ult.desc}</p><p><b>被動</b> ${C.passive}</p><p class="small">肉身 ${C.hp}・遁速 ${C.speed}</p></div>`;
  }).join('')}</div><div class="small">WASD 移動・滑鼠瞄準・左鍵普攻・右鍵／E 神通・Q 大招・空白閃避（敵人出手瞬間閃＝完美閃避）・R 丹藥・F 處決/篝火・Tab 行囊</div>`;
  box.querySelectorAll('.card').forEach(el => el.onclick = () => start(el.dataset.e));
  box.querySelectorAll('.sexsel button').forEach(el => el.onclick = () => { window.__sex = el.dataset.sex; showSelect(); });
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
  } else game.scene.getScene('arena').scene.restart({ cls: e, sex: window.__sex || 'm' });
}

window.addEventListener('keydown', ev => {
  const open = !$('bonfire').classList.contains('hidden');
  if (game && $('select').classList.contains('hidden') && (ev.key === 'Tab' || ev.key === 'i' || ev.key === 'I')) {
    ev.preventDefault();
    const sc = game.scene.getScene('arena');
    if (open && !sc.bag) { hud.closeBonfire(sc); return; }
    sc.toggleBag(); return;
  }
  if (open && (ev.key === 'Escape' || ev.key === 'f' || ev.key === 'F')) { hud.closeBonfire(game.scene.getScene('arena')); return; }
  if (!$('select').classList.contains('hidden')) {
    if (ev.key === 'Tab') { ev.preventDefault(); window.__sex = (window.__sex || 'm') === 'm' ? 'f' : 'm'; showSelect(); return; }
    const i = +ev.key - 1;
    if (i >= 0 && i < 5) start(ELEMS[i]);
  } else if (ev.key === 'Enter' && !$('over').classList.contains('hidden')) showSelect();
});

showSelect();
