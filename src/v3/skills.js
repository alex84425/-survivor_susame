// 神通招式。c：{ S 神通資料, inst 持有的神通, mul 傷害倍率, ho(extra) 命中參數, ang 瞄準方向, pt 滑鼠點 }
// s：Arena 場景。連段神通的每一段由 game.js 的 chainStep 處理，這裡放單發神通。
import { ELEM_HEX } from '../data.js';
import { sfx } from '../sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);
const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const H = e => ELEM_HEX[e];

export const CAST = {
  // ---------- 金 ----------
  feijian(s, c) {
    const P = s.P, ang = c.ang;
    s.startAct({ wind: 0.06, rec: 0.22, move: 0, ang, fire: () => {
      P.dashT = 0.17; P.dvx = Math.cos(ang) * 1530; P.dvy = Math.sin(ang) * 1530; P.inv = 0.22;
      s.vfx.streak(P.x, P.y, ang, 260, H('金'));
    } });
    s.dashHit = { hit: new Set(), until: s.t + 0.32, dmg: c.S.dmg * c.mul, o: c.ho({ poise: c.S.poise, mark: 6, heavy: true }) };
    sfx.dash();
  },
  jianqi(s, c) {
    const P = s.P, ang = s.assist(c.ang, 400);
    s.startAct({ wind: 0.08, rec: 0.18, move: 0.5, ang, fire: () => {
      for (let i = -1; i <= 1; i++) s.shootP({ x: P.x, y: P.y, ang: ang + i * 0.22, speed: 950, dmg: c.S.dmg * c.mul, life: 0.38, r: 20, tex: 'sw_金', pierce: 99, scale: 2.2, trail: H('金'), ho: c.ho({ poise: c.S.poise }) });
      s.vfx.flash(P.x + Math.cos(ang) * 30, P.y + Math.sin(ang) * 30, 90, H('金'), 160);
      sfx.shoot('金');
    } });
  },
  zhantie(s, c) {
    const P = s.P;
    s.chargeAct(c, (ang) => {
      const n = s.hitArc(P.x, P.y, ang, 210, 1.4, c.S.dmg * c.mul, c.ho({ poise: c.S.poise, heavy: true, charge: true, iai: true, kb: 200 }));
      s.vfx.iai(P.x, P.y, ang, 210, H('金'));
      if (n) { s.hitstop = 0.1; s.cameras.main.shake(160, 0.008); }
      sfx.slam();
    });
  },
  jinzhong(s, c) {
    const P = s.P;
    P.guardT = 1.5; P.guardAng = c.ang; P.guardHo = c;
    s.vfx.bell(P, 1500, H('金'));
    sfx.craft();
  },
  zhuxian(s, c) {
    s.areas.push({ own: 'p', kind: 'swords', x: c.pt.x, y: c.pt.y, R: 170, life: 4, max: 4, n: 12, tickT: 0.2, dmg: c.S.dmg * c.mul, ho: c.ho({ poise: c.S.poise }), color: H('金') });
    s.vfx.sigil(c.pt.x, c.pt.y, 170, H('金'), 4000);
    sfx.craft();
  },
  // ---------- 木 ----------
  chanteng(s, c) {
    const P = s.P;
    s.shootP({ x: P.x, y: P.y, ang: s.assist(c.ang, 600), speed: 560, dmg: c.S.dmg * c.mul, life: 1.3, r: 10, tex: 'leaf_木', scale: 1.6, trail: 0x2a8a3a, ho: c.ho({ poise: c.S.poise, root: 2.5 }) });
    sfx.shoot('木');
  },
  duji(s, c) {
    s.areas.push({ own: 'p', kind: 'zone', x: c.pt.x, y: c.pt.y, R: 115, life: 5, max: 5, tick: 0.5, tickT: 0, dmg: c.S.dmg * c.mul, color: 0x8be02c, thorns: true, ho: c.ho({ poise: c.S.poise, dot: true }) });
    s.vfx.scatter(c.pt.x, c.pt.y, 115, 0x8be02c);
    s.vfx.aiImg('poison_cloud', c.pt.x, c.pt.y, { size: 290, dur: 5000, ease: 'Quad.In', depth: 3, alpha: 0.8 });
    sfx.shoot('木');
  },
  tengbian(s, c) {
    const P = s.P, ang = s.assist(c.ang, 280);
    s.startAct({ wind: 0.12, rec: 0.25, move: 0.4, ang, fire: () => {
      s.vfx.whip(P.x, P.y, ang, 260, H('木'));
      for (const e of s.enemiesIn(P.x, P.y, ang, 260, 0.28)) {
        s.hurtE(e, c.S.dmg * c.mul, c.ho({ poise: c.S.poise, kx: P.x, ky: P.y }));
        s.pullTo(e, P.x + Math.cos(ang) * 60, P.y + Math.sin(ang) * 60);
      }
      sfx.shoot('木');
    } });
  },
  huichun(s, c) {
    const P = s.P;
    P.regenT = 6; P.regenRate = 0.05;
    s.vfx.follow('heal', P, 150, 6000, { oy: -20, alpha: 0.7 });
    s.vfx.sigil(P.x, P.y, 90, 0x7fffa0, 900);
    s.vfx.leaves(P.x, P.y, 0x7fffa0, 18);
    sfx.item();
  },
  wanmu(s, c) {
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rand(-0.3, 0.3), x = c.pt.x + Math.cos(a) * 90, y = c.pt.y + Math.sin(a) * 90;
      s.areas.push({ own: 'p', kind: 'treant', x, y, R: 170, life: 8, max: 8, tickT: 0.3 + i * 0.15, tick: 0.5, dmg: c.S.dmg * c.mul, ho: c.ho({ poise: c.S.poise }), color: H('木') });
      s.vfx.sprout(x, y);
    }
    sfx.slam();
  },
  // ---------- 水 ----------
  xuanbing(s) {
    const P = s.P;
    P.act = null; P.parry = 0.35;
    s.startAct({ wind: 0.35, rec: 0.2, move: 0.2, fire: () => {} });
    s.vfx.sigil(P.x, P.y, 40, 0x7fd0ff, 350);
  },
  bingzhui(s, c) {
    const P = s.P, ang = s.assist(c.ang, 600);
    s.shootP({ x: P.x, y: P.y, ang, speed: 820, dmg: c.S.dmg * c.mul, life: 0.8, r: 9, tex: 'ice', scale: 1.3, trail: 0xbfe8ff, ho: c.ho({ poise: c.S.poise, slow: 0.6, slowT: 1.2 }) });
    sfx.shoot('水');
  },
  longjuan(s, c) {
    s.areas.push({ own: 'p', kind: 'whirl', x: c.pt.x, y: c.pt.y, R: 130, life: 3, max: 3, tick: 0.5, tickT: 0, dmg: c.S.dmg * c.mul, ho: c.ho({ poise: c.S.poise }), color: H('水') });
    sfx.slow();
  },
  jinghua(s, c) {
    const P = s.P;
    s.decoy = { x: P.x, y: P.y, t: 4, sprite: s.vfx.mirror(P.sprite, H('水')) };
    s.vfx.flash(P.x, P.y, 100, 0x9fd8ff, 250);
    const ang = c.ang;
    P.x += Math.cos(ang) * 200; P.y += Math.sin(ang) * 200; P.inv = Math.max(P.inv, 0.3);
    s.vfx.flash(P.x, P.y, 100, 0x9fd8ff, 250);
    sfx.dash();
  },
  hanyu(s, c) {
    const P = s.P;
    s.startAct({ wind: 0.3, rec: 0.3, move: 0, fire: () => {
      for (const e of s.enemies) if (e.hp > 0 && d2(e.x, e.y, P.x, P.y) < 360 * 360) { s.hurtE(e, c.S.dmg * c.mul, c.ho({ poise: c.S.poise, heavy: true })); e.freezeT = Math.max(e.freezeT, 4); e.atk = null; }
      s.vfx.frost(P.x, P.y, 360);
      s.cameras.main.shake(240, 0.008); s.hitstop = 0.08;
      sfx.slow();
    } });
  },
  // ---------- 火 ----------
  fentian(s, c) {
    s.areas.push({ own: 'p', kind: 'zone', x: c.pt.x, y: c.pt.y, R: 110, life: 3, max: 3, tick: 0.4, tickT: 0, dmg: c.S.dmg * c.mul, color: H('火'), ho: c.ho({ poise: c.S.poise, burn: 1, dot: true }) });
    s.vfx.flash(c.pt.x, c.pt.y, 200, 0xff8a2a, 300);
    sfx.shoot('火');
  },
  huoqiu(s, c) {
    const P = s.P, ang = s.assist(c.ang, 600);
    s.shootP({ x: P.x, y: P.y, ang, speed: 620, dmg: c.S.dmg * c.mul, life: 1.2, r: 12, tex: 'fire_火', explode: 80, scale: 1.6, trail: 0xff8a2a, ho: c.ho({ poise: c.S.poise, burn: 1 }) });
    sfx.shoot('火');
  },
  huti(s, c) {
    const P = s.P;
    P.flameT = 8; P.flameTick = 0; P.flameC = c;
    s.vfx.follow('aura_flame', P, 230, 8000, { alpha: 0.75, spin: 1.5 });
    s.vfx.flash(P.x, P.y, 160, 0xff8a2a, 300);
    sfx.shoot('火');
  },
  yanbao(s, c) {
    const P = s.P, ang = c.ang;
    s.startAct({ wind: 0.05, rec: 0.18, move: 0, ang, fire: () => {
      P.dashT = 0.16; P.dvx = Math.cos(ang) * 1375; P.dvy = Math.sin(ang) * 1375; P.inv = 0.2;
      for (let i = 0; i <= 4; i++) {
        const x = P.x + Math.cos(ang) * 55 * i, y = P.y + Math.sin(ang) * 55 * i;
        s.areas.push({ own: 'p', kind: 'zone', x, y, R: 42, life: 2, max: 2, tick: 0.4, tickT: 0.2, dmg: 6 * c.mul, color: H('火'), small: true, ho: c.ho({ poise: 1, burn: 1, dot: true }) });
      }
    } });
    s.dashHit = { hit: new Set(), until: s.t + 0.3, dmg: c.S.dmg * c.mul, o: c.ho({ poise: c.S.poise, burn: 1 }) };
    sfx.dash();
  },
  zhuque(s, c) {
    for (let i = 0; i < 3; i++) {
      const x = c.pt.x + rand(-90, 90), y = c.pt.y + rand(-90, 90);
      s.areas.push({ own: 'p', kind: 'drop', x, y, R: 140, delay: 0.6 + i * 0.5, max: 0.6 + i * 0.5, dmg: c.S.dmg * c.mul, color: H('火'), meteor: true, bird: true, ho: c.ho({ poise: c.S.poise, burn: 2, heavy: true }) });
    }
    sfx.roar();
  },
  // ---------- 土 ----------
  dilie(s, c) {
    const P = s.P;
    s.startAct({ wind: 0.35, rec: 0.55, move: 0.1, armor: true, fire: () => {
      s.hitCircle(P.x, P.y, 160, c.S.dmg * c.mul, c.ho({ poise: c.S.poise, kb: 380, heavy: true }));
      s.vfx.crack(P.x, P.y, 160);
      s.ringFx(P.x, P.y, 160, H('土'));
      s.vfx.dirt(P.x, P.y, 18); s.vfx.smoke(P.x, P.y, 6); s.vfx.punch(0.04);
      s.cameras.main.shake(160, 0.006); sfx.slam(); s.hitstop = 0.06;
    } });
  },
  luoshi(s, c) {
    s.areas.push({ own: 'p', kind: 'drop', x: c.pt.x, y: c.pt.y, R: 80, delay: 0.5, max: 0.5, dmg: c.S.dmg * c.mul, color: H('土'), rock: true, ho: c.ho({ poise: c.S.poise, heavy: true }) });
    s.vfx.aiImg('rock_spikes', c.pt.x, c.pt.y - 30, { size: 200, delay: 450, dur: 600, depth: 6 });
    sfx.shoot('土');
  },
  yanjia(s, c) {
    const P = s.P;
    P.shield = Math.round(P.maxHp * 0.25); P.shieldT = 10;
    s.vfx.ring(P.x, P.y, 60, H('土'), 400); s.vfx.dirt(P.x, P.y, 12);
    sfx.slam();
  },
  bengshan(s, c) {
    const P = s.P;
    s.chargeAct(c, (ang) => {
      const n = s.hitArc(P.x, P.y, ang, 140, 0.9, c.S.dmg * c.mul, c.ho({ poise: c.S.poise, heavy: true, charge: true, kb: 380, melee: true }));
      s.vfx.fist(P.x + Math.cos(ang) * 70, P.y + Math.sin(ang) * 70, ang, H('土'));
      if (n) { s.hitstop = 0.12; s.cameras.main.shake(200, 0.01); s.vfx.punch(0.06, 110); }
      sfx.slam();
    }, true);
  },
  sheji(s, c) {
    s.areas.push({ own: 'p', kind: 'drop', x: c.pt.x, y: c.pt.y, R: 260, delay: 0.9, max: 0.9, dmg: c.S.dmg * c.mul, color: H('土'), seal: true, ho: c.ho({ poise: 0, heavy: true, forceStagger: true, kb: 200 }) });
    sfx.roar();
  },
};
