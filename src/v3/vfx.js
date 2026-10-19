// v3 特效：Kenney Particle Pack（CC0）貼圖 + 疊加混色 + 泛光
const ADD = Phaser.BlendModes.ADD;

export const VFX = ['slash_01', 'slash_03', 'circle_02', 'circle_05', 'spark_06', 'light_01', 'magic_01', 'magic_05',
  'smoke_04', 'fire_01', 'flame_05', 'muzzle_02', 'star_04', 'trace_02', 'twirl_02', 'scratch_01', 'dirt_02'];

export function preloadVfx(scene) {
  for (const k of VFX) if (!scene.textures.exists('fx_' + k)) scene.load.image('fx_' + k, `assets/vfx/${k}.png`);
}

export class Vfx {
  constructor(scene) {
    this.s = scene;
    const cam = scene.cameras.main;
    // 暗角營造夜戰氛圍（全畫面泛光會讓背景霧化，改由各特效自帶光暈）
    if (cam.postFX) cam.postFX.addVignette(0.5, 0.5, 0.95, 0.22);
    const mk = (tex, cfg) => scene.add.particles(0, 0, 'fx_' + tex, { emitting: false, ...cfg }).setDepth(cfg.depth ?? 7);
    this.sparkE = mk('star_04', { speed: { min: 140, max: 420 }, scale: { start: 0.22, end: 0 }, lifespan: { min: 180, max: 380 }, rotate: { min: 0, max: 360 }, blendMode: ADD });
    this.emberE = mk('circle_05', { speed: { min: 10, max: 40 }, scale: { start: 0.16, end: 0 }, lifespan: { min: 300, max: 600 }, blendMode: ADD });
    this.smokeE = mk('smoke_04', { speed: { min: 20, max: 70 }, scale: { start: 0.35, end: 0.9 }, alpha: { start: 0.35, end: 0 }, lifespan: { min: 500, max: 900 }, rotate: { min: 0, max: 360 }, depth: 6 });
    this.flameE = mk('flame_05', { speed: { min: 20, max: 60 }, angle: { min: 250, max: 290 }, scale: { start: 0.4, end: 0.05 }, alpha: { start: 0.9, end: 0 }, lifespan: { min: 350, max: 650 }, blendMode: ADD, depth: 5 });
    this.dirtE = mk('dirt_02', { speed: { min: 120, max: 360 }, scale: { start: 0.35, end: 0.1 }, alpha: { start: 1, end: 0 }, lifespan: { min: 300, max: 600 }, rotate: { min: 0, max: 360 }, gravityY: 300, depth: 6 });
    this.glows = [];
  }

  // ---------- AI 素材（assets/ai/vfx，黑底轉透明）----------
  has(k) { return this.s.textures.exists('ai_vfx_' + k); }
  // 靜態特效圖：size＝最長邊像素
  aiImg(k, x, y, o = {}) {
    if (!this.has(k)) return null;
    const s = this.s, src = s.textures.get('ai_vfx_' + k).getSourceImage();
    const sc = (o.size || 200) / Math.max(src.width, src.height);
    const im = s.add.image(x, y, 'ai_vfx_' + k).setBlendMode(ADD).setDepth(o.depth ?? 7).setScale(sc).setRotation(o.rot || 0).setAlpha(o.alpha ?? 1);
    if (o.tint) im.setTint(o.tint);
    if (o.keep) return im;
    const to = { alpha: 0, duration: o.dur ?? 300, ease: o.ease ?? 'Cubic.Out', delay: o.delay || 0, onComplete: () => im.destroy() };
    if (o.grow) to.scale = sc * o.grow;
    if (o.spin) to.angle = im.angle + o.spin;
    if (o.dy) to.y = y + o.dy;
    if (o.dx) to.x = x + o.dx;
    s.tweens.add({ targets: im, ...to });
    return im;
  }
  // 序列幀特效（H3 動畫拆的）
  anim(k, x, y, size, o = {}) {
    const key = 'ai_fxa_' + k, s = this.s;
    if (!s.anims.exists(key)) return null;
    const fw = s.textures.get(key).get(0).width;
    const sp = s.add.sprite(x, y, key).setBlendMode(ADD).setDepth(o.depth ?? 8).setScale(size / fw).setRotation(o.rot || 0);
    if (o.tint) sp.setTint(o.tint);
    sp.play({ key, frameRate: o.fps || 26 });
    sp.once('animationcomplete', () => sp.destroy());
    return sp;
  }
  // 跟著目標移動的特效圖
  follow(k, target, size, dur, o = {}) {
    const im = this.aiImg(k, target.x, target.y, { size, keep: true, depth: o.depth ?? 6, alpha: o.alpha ?? 0.9 });
    if (!im) return false;
    const s = this.s, base = im.scale;
    const upd = () => { im.setPosition(target.x + (o.ox || 0), target.y + (o.oy || 0)); if (o.spin) im.angle += o.spin; };
    s.events.on('update', upd);
    s.tweens.add({ targets: im, alpha: { from: o.alpha ?? 0.9, to: (o.alpha ?? 0.9) * 0.55 }, scale: { from: base, to: base * 1.04 }, yoyo: true, repeat: -1, duration: 260 });
    s.time.delayedCall(dur, () => { s.events.off('update', upd); s.tweens.add({ targets: im, alpha: 0, duration: 200, onComplete: () => im.destroy() }); });
    return true;
  }

  // 刀光：新月形貼圖，朝瞄準方向（金屬性重擊改用 AI 金色劍光）
  slash(x, y, ang, R, color, heavy, flip) {
    const s = this.s;
    if (heavy && color === 0xf2d16b && this.has('slash_gold')) {
      this.aiImg('slash_gold', x + Math.cos(ang) * R * 0.55, y + Math.sin(ang) * R * 0.55, { size: R * 1.9, rot: ang, dur: 240, grow: 1.15 });
    }
    // 大小對齊判定：新月外緣約落在攻擊距離 R
    const k = (R * 1.7) / 256;
    const img = s.add.image(x + Math.cos(ang) * R * 0.5, y + Math.sin(ang) * R * 0.5, 'fx_slash_01')
      .setBlendMode(ADD).setTint(color).setDepth(7).setScale(k, k * (heavy ? 1.15 : 0.9)).setRotation(ang - Math.PI / 2).setFlipX(!!flip);
    s.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, scaleX: k * 1.2, duration: heavy ? 220 : 150, ease: 'Cubic.Out', onComplete: () => img.destroy() });
    if (heavy) {
      const core = s.add.image(img.x, img.y, 'fx_slash_01').setBlendMode(ADD).setTint(0xffffff).setDepth(7).setScale(k * 0.8, k * 0.6).setRotation(img.rotation).setFlipX(!!flip);
      s.tweens.add({ targets: core, alpha: { from: 0.9, to: 0 }, duration: 160, onComplete: () => core.destroy() });
    }
  }

  // 敵人爪擊：紅色爪痕
  claw(x, y, ang, R) {
    const s = this.s, k = R * 1.6 / 256;
    const img = s.add.image(x + Math.cos(ang) * R * 0.55, y + Math.sin(ang) * R * 0.55, 'fx_scratch_01')
      .setBlendMode(ADD).setTint(0xff3030).setDepth(7).setScale(k).setRotation(ang);
    s.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, scale: k * 1.15, duration: 260, onComplete: () => img.destroy() });
  }

  // 衝擊環（大範圍改用 AI 衝擊波）
  ring(x, y, R, color, dur = 320) {
    const s = this.s, k = (R * 2) / 256;
    if (R >= 140 && this.has('shockwave')) this.aiImg('shockwave', x, y, { size: R * 0.6, grow: R * 2.1 / (R * 0.6), dur: dur + 120, depth: 6, alpha: 0.85 });
    const img = s.add.image(x, y, 'fx_circle_02').setBlendMode(ADD).setTint(color).setDepth(6).setScale(k * 0.3);
    s.tweens.add({ targets: img, scale: k * 1.05, alpha: { from: 1, to: 0 }, duration: dur, ease: 'Cubic.Out', onComplete: () => img.destroy() });
  }

  // 閃光
  flash(x, y, size, color, dur = 160) {
    const s = this.s, k = size / 128;
    const img = s.add.image(x, y, 'fx_circle_05').setBlendMode(ADD).setTint(color).setDepth(7).setScale(k);
    s.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, scale: k * 1.4, duration: dur, onComplete: () => img.destroy() });
  }

  // 命中火花
  hit(x, y, color, heavy) {
    this.sparkE.setParticleTint(color);
    this.sparkE.explode(heavy ? 14 : 6, x, y);
    this.flash(x, y, heavy ? 70 : 38, color, heavy ? 200 : 120);
    if (heavy && this.has('hit_spark')) this.aiImg('hit_spark', x, y, { size: 120, rot: Math.random() * 6, dur: 170, grow: 1.3 });
    else if (heavy) {
      const img = this.s.add.image(x, y, 'fx_muzzle_02').setBlendMode(ADD).setTint(0xffffff).setDepth(7).setScale(0.5).setRotation(Math.random() * 6);
      this.s.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, scale: 0.8, duration: 150, onComplete: () => img.destroy() });
    }
  }

  sparks(x, y, color, n) { this.sparkE.setParticleTint(color); this.sparkE.explode(n, x, y); }
  ember(x, y, color) { this.emberE.setParticleTint(color); this.emberE.emitParticleAt(x, y, 1); }
  smoke(x, y, n = 3) { this.smokeE.setParticleTint(0x666677); this.smokeE.explode(n, x, y); }
  flame(x, y) { this.flameE.emitParticleAt(x, y, 1); }
  dirt(x, y, n = 10) { this.dirtE.setParticleTint(0x9a7040); this.dirtE.explode(n, x, y); }

  // 處決：大閃光 + 星芒 + 環
  execute(x, y) {
    const s = this.s;
    this.anim('execute_anim', x, y, 300, { depth: 9 });
    this.flash(x, y, 220, 0xffd24a, 300);
    const star = s.add.image(x, y, 'fx_magic_05').setBlendMode(ADD).setTint(0xffe080).setDepth(8).setScale(0.4);
    s.tweens.add({ targets: star, scale: 2.4, alpha: { from: 1, to: 0 }, angle: 45, duration: 420, ease: 'Cubic.Out', onComplete: () => star.destroy() });
    this.ring(x, y, 180, 0xff5050, 400);
    this.sparks(x, y, 0xffd24a, 30);
  }

  // 法陣（施法、彈反）
  sigil(x, y, R, color, dur = 500) {
    const s = this.s, k = R * 2 / 256;
    // 依顏色挑對應五行的 AI 法陣
    const EL = [[0xf2d16b, 'jin'], [0x5cc96b, 'mu'], [0x4aa8ff, 'shui'], [0xff6a3d, 'huo'], [0xc08a4a, 'tu'], [0x7fd0ff, 'shui'], [0x7fffa0, 'mu']];
    const d = c => Math.abs((c >> 16) - (color >> 16)) + Math.abs(((c >> 8) & 255) - ((color >> 8) & 255)) + Math.abs((c & 255) - (color & 255));
    const el = EL.reduce((a, b) => d(b[0]) < d(a[0]) ? b : a)[1];
    if (this.has('magic_circle_' + el)) {
      const im = this.aiImg('magic_circle_' + el, x, y, { size: R * 2.2, keep: true, depth: 2, alpha: 0 });
      s.tweens.add({ targets: im, alpha: { from: 0.95, to: 0 }, angle: 60, duration: Math.max(dur, 400), onComplete: () => im.destroy() });
      return;
    }
    const img = s.add.image(x, y, 'fx_magic_01').setBlendMode(ADD).setTint(color).setDepth(2).setScale(k).setAlpha(0);
    s.tweens.add({ targets: img, alpha: { from: 0.9, to: 0 }, angle: 90, duration: dur, onComplete: () => img.destroy() });
  }

  // 水龍捲
  vortex(x, y, R, color) {
    const s = this.s, k = R * 2 / 256;
    const img = s.add.image(x, y, 'fx_twirl_02').setBlendMode(ADD).setTint(color).setDepth(6).setScale(k * 0.4);
    s.tweens.add({ targets: img, scale: k, angle: -540, alpha: { from: 1, to: 0 }, duration: 450, ease: 'Cubic.Out', onComplete: () => img.destroy() });
    this.ring(x, y, R, color, 400);
  }

  // 雷擊
  bolt(x, y, color) {
    const s = this.s;
    if (this.anim('lightning_anim', x, y - 90, 260, { depth: 9, fps: 30 })) return;
    const img = s.add.image(x, y - 120, 'fx_spark_06').setBlendMode(ADD).setTint(color).setDepth(8).setScale(0.5, 1.1);
    s.tweens.add({ targets: img, alpha: { from: 1, to: 0 }, duration: 200, onComplete: () => img.destroy() });
  }

  // 殘影
  ghost(sprite, color) {
    const s = this.s;
    const g = s.add.image(sprite.x, sprite.y, sprite.texture.key).setFlipX(sprite.flipX).setScale(sprite.scaleX, sprite.scaleY)
      .setRotation(sprite.rotation).setBlendMode(ADD).setTint(color).setAlpha(0.55).setDepth(3);
    s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  // 跟隨物件的光暈（投射物、火海、玩家）
  glow(target, size, color, alpha = 0.6) {
    const img = this.s.add.image(target.x, target.y, 'fx_circle_05').setBlendMode(ADD).setTint(color).setAlpha(alpha).setDepth(4).setScale(size / 128);
    return img;
  }

  // 鏡頭衝擊：重擊時輕微拉近
  punch(amount = 0.04, dur = 90) {
    const cam = this.s.cameras.main;
    if (this.punching) return;
    this.punching = true;
    this.s.tweens.add({ targets: cam, zoom: 1 + amount, duration: dur, yoyo: true, ease: 'Quad.Out', onComplete: () => { cam.setZoom(1); this.punching = false; } });
  }

  // ---------- 神通特效 ----------
  // 用完就淡出的貼圖
  img(tex, x, y, o = {}) {
    const s = this.s;
    const key = s.textures.exists(tex) ? tex : 'fx_' + tex;
    const im = s.add.image(x, y, key)
      .setBlendMode(o.normal ? Phaser.BlendModes.NORMAL : ADD).setTint(o.color ?? 0xffffff).setDepth(o.depth ?? 7)
      .setScale(o.sx ?? o.scale ?? 1, o.sy ?? o.scale ?? 1).setRotation(o.rot || 0).setAlpha(o.alpha ?? 1);
    if (o.origin) im.setOrigin(...o.origin);
    const to = { alpha: 0, duration: o.dur ?? 250, ease: o.ease ?? 'Cubic.Out', delay: o.delay || 0, onComplete: () => im.destroy() };
    if (o.grow) { to.scaleX = im.scaleX * o.grow; to.scaleY = im.scaleY * (o.growY ?? o.grow); }
    if (o.spin) to.angle = im.angle + o.spin;
    if (o.dy) to.y = y + o.dy;
    s.tweens.add({ targets: im, ...to });
    return im;
  }

  // 衝刺軌跡：拉長的光條
  streak(x, y, ang, len, color) {
    const mx = x + Math.cos(ang) * len / 2, my = y + Math.sin(ang) * len / 2;
    this.img('trace_02', mx, my, { color, sx: 0.5, sy: len / 256 * 1.3, rot: ang + Math.PI / 2, dur: 260 });
    this.img('trace_02', mx, my, { color: 0xffffff, sx: 0.18, sy: len / 256, rot: ang + Math.PI / 2, dur: 180 });
    this.sparks(x + Math.cos(ang) * len, y + Math.sin(ang) * len, color, 10);
  }

  // 居合：巨大的一閃，白線加擴散的刀光
  iai(x, y, ang, R, color) {
    const ex = x + Math.cos(ang) * R * 0.55, ey = y + Math.sin(ang) * R * 0.55;
    this.img('slash_03', ex, ey, { color, scale: R * 2.2 / 256, rot: ang, dur: 360, grow: 1.25 });
    this.img('trace_02', ex, ey, { color: 0xffffff, sx: 0.12, sy: R * 2.4 / 256, rot: ang, dur: 220 });
    this.flash(x, y, R * 1.6, color, 260);
    this.sparks(ex, ey, 0xffffff, 18);
    this.punch(0.05, 110);
  }

  // 金鐘罩：金色光罩跟著玩家
  bell(P, dur, color) {
    const s = this.s;
    if (this.follow('golden_bell', P, 120, dur, { oy: -10, alpha: 0.8 })) return;
    const a = s.add.image(P.x, P.y, 'fx_circle_02').setBlendMode(ADD).setTint(color).setDepth(6).setScale(0.55).setAlpha(0.9);
    const b = s.add.image(P.x, P.y - 4, 'fx_magic_01').setBlendMode(ADD).setTint(color).setDepth(6).setScale(0.4).setAlpha(0.5);
    const follow = () => { a.setPosition(P.x, P.y); b.setPosition(P.x, P.y - 4); b.angle += 2; };
    s.events.on('update', follow);
    s.tweens.add({ targets: [a, b], alpha: { from: 0.9, to: 0.35 }, yoyo: true, repeat: -1, duration: 160 });
    s.time.delayedCall(dur, () => { s.events.off('update', follow); a.destroy(); b.destroy(); });
  }

  // 毒刺撒地
  scatter(x, y, R, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * R;
      this.img('star_04', x + Math.cos(a) * r, y + Math.sin(a) * r, { color, scale: 0.12, dur: 600, delay: i * 15, spin: 90 });
    }
    this.ring(x, y, R, color, 380);
  }

  // 鞭擊：彎曲的藤蔓光條
  whip(x, y, ang, len, color) {
    const s = this.s, g = s.add.graphics().setDepth(7).setBlendMode(ADD);
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12, w = Math.sin(k * Math.PI) * 18;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(ang) * len * k - Math.sin(ang) * w, y + Math.sin(ang) * len * k + Math.cos(ang) * w));
    }
    const curve = new Phaser.Curves.Spline(pts);
    g.lineStyle(7, color, 0.6); curve.draw(g, 32);
    g.lineStyle(2, 0xffffff, 0.9); curve.draw(g, 32);
    s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
    this.hit(x + Math.cos(ang) * len, y + Math.sin(ang) * len, color, false);
  }

  // 治療葉片往上飄
  leaves(x, y, color, n) {
    for (let i = 0; i < n; i++) this.img('leaf_木', x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 30, { color, scale: 0.9, dur: 700, dy: -50, spin: 120, delay: i * 20 });
  }

  // 樹人破土
  sprout(x, y) {
    this.dirt(x, y, 14); this.smoke(x, y, 3);
    this.ring(x, y, 90, 0x5cc96b, 350);
  }
  treant(x, y) {
    const s = this.s, tex = s.textures.exists('env_tree') ? 'env_tree' : 'tree2';
    const k = tex === 'env_tree' ? 0.55 : 0.8;
    const im = s.add.image(x, y, tex).setOrigin(0.5, 0.9).setDepth(3).setTint(0x7dffb0).setScale(0.05);
    // 腳下的靈光，跟場景的樹區分
    const glow = s.add.image(x, y, 'fx_circle_05').setBlendMode(ADD).setTint(0x5cff8a).setDepth(2).setScale(1.1).setAlpha(0.55);
    s.tweens.add({ targets: glow, alpha: { from: 0.55, to: 0.25 }, yoyo: true, repeat: -1, duration: 450 });
    im.on('destroy', () => glow.destroy());
    s.tweens.add({ targets: im, scaleX: k, scaleY: k, duration: 380, ease: 'Back.Out' });
    s.tweens.add({ targets: im, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 500, delay: 380 });
    return im;
  }

  // 水分身
  mirror(sprite, color) {
    const s = this.s;
    const g = s.add.image(sprite.x, sprite.y, sprite.texture.key).setFlipX(sprite.flipX).setTint(color).setAlpha(0.75).setDepth(3);
    s.tweens.add({ targets: g, alpha: { from: 0.75, to: 0.45 }, yoyo: true, repeat: -1, duration: 400 });
    return g;
  }

  // 冰封：冰晶炸開加霜環
  frost(x, y, R) {
    this.flash(x, y, R * 1.4, 0x9fd8ff, 500);
    this.anim('ice_burst_anim', x, y, R * 2.4, { depth: 8 });
    this.aiImg('ice_ring', x, y, { size: R * 2.1, dur: 1400, depth: 3, alpha: 0.95 });
    this.img('magic_05', x, y, { color: 0xbfe8ff, scale: 0.3, grow: R * 2 / 256 / 0.3, dur: 600, spin: 60 });
    this.ring(x, y, R, 0x7fd0ff, 500);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      this.img('ice', x + Math.cos(a) * R * 0.6, y + Math.sin(a) * R * 0.6, { scale: 2.2, rot: a, dur: 900, normal: true });
    }
  }

  // 地面裂痕
  crack(x, y, R) {
    if (this.aiImg('earth_crack', x, y, { size: R * 2.2, dur: 900, depth: 1, alpha: 0.9, rot: Math.random() * 6 })) return;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      this.img('scratch_01', x + Math.cos(a) * R * 0.35, y + Math.sin(a) * R * 0.35, { color: 0x3a2410, scale: R * 1.1 / 256, rot: a, dur: 900, normal: true, depth: 1, alpha: 0.8 });
    }
  }

  // 重拳衝擊
  fist(x, y, ang, color) {
    this.img('muzzle_02', x, y, { color, scale: 0.9, rot: ang, dur: 220, grow: 1.4 });
    this.img('muzzle_02', x, y, { color: 0xffffff, scale: 0.5, rot: ang, dur: 160 });
    this.ring(x, y, 110, color, 300);
    this.dirt(x, y, 14);
  }

  // 浪湧：向前推的弧形水波
  wave(x, y, ang, R, color) {
    for (let i = 0; i < 3; i++) this.img('slash_01', x + Math.cos(ang) * R * (0.3 + i * 0.2), y + Math.sin(ang) * R * (0.3 + i * 0.2), { color, sx: R * 1.4 / 256, sy: R * 0.7 / 256, rot: ang - Math.PI / 2, dur: 300, delay: i * 50 });
  }

  // 迴旋斬：一圈的刀光
  whirl(x, y, R, color, heavy) {
    this.img('twirl_02', x, y, { color, scale: R * 2 / 256, spin: -360, dur: heavy ? 360 : 260 });
    this.img('circle_02', x, y, { scale: R * 2 / 256 * 0.9, dur: 200, alpha: 0.6 });
  }

  // 升龍火柱
  pillar(x, y, color) {
    this.aiImg('fire_pillar', x, y - 90, { size: 260, dur: 520, dy: -40, depth: 8 });
    for (let i = 0; i < 8; i++) this.img('flame_05', x + (Math.random() - 0.5) * 30, y, { color, sx: 0.6, sy: 1.4, origin: [0.5, 1], dur: 500, dy: -60 - i * 10, delay: i * 25 });
    this.flash(x, y, 200, color, 300);
    for (let i = 0; i < 10; i++) this.flame(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 40);
  }

  // 十字劍光
  cross(x, y, R, color) {
    for (const r of [Math.PI / 4, -Math.PI / 4]) {
      this.img('trace_02', x, y, { color, sx: 0.5, sy: R * 2.4 / 256, rot: r, dur: 420, grow: 1.2 });
      this.img('trace_02', x, y, { sx: 0.16, sy: R * 2.4 / 256, rot: r, dur: 300 });
    }
    this.flash(x, y, R * 1.6, color, 400);
    this.ring(x, y, R, color, 420);
    this.punch(0.06, 120);
  }

  // 劍陣落劍
  swordDrop(x, y, color) {
    const s = this.s;
    const sw = s.add.image(x, y - 140, 'sw_金').setBlendMode(ADD).setDepth(8).setScale(2.4).setRotation(Math.PI / 2).setTint(color);
    s.tweens.add({ targets: sw, y, duration: 90, ease: 'Quad.In', onComplete: () => { sw.destroy(); this.hit(x, y, color, false); } });
  }

  // 水龍捲本體（回傳，由 game 旋轉與銷毀）
  whirlpool(x, y, R, color) {
    const im = this.s.add.image(x, y, 'fx_twirl_02').setBlendMode(ADD).setTint(color).setDepth(2).setScale(R * 2.2 / 256).setAlpha(0.8);
    this.ring(x, y, R, color, 400);
    return im;
  }

  // 山河社稷印：方印砸下
  seal(x, y, R, color) {
    const s = this.s;
    this.anim('stone_seal_anim', x, y, R * 2.4, { depth: 8 });
    this.aiImg('stone_seal', x, y, { size: R * 1.5, dur: 700, grow: 1.1, depth: 7 });
    this.flash(x, y, R * 2.4, color, 600);
    const g = s.add.graphics().setDepth(6);
    g.lineStyle(10, color, 0.9).strokeRect(x - R * 0.7, y - R * 0.7, R * 1.4, R * 1.4);
    g.lineStyle(4, 0xffe0a0, 0.9).strokeRect(x - R * 0.55, y - R * 0.55, R * 1.1, R * 1.1);
    s.tweens.add({ targets: g, alpha: 0, duration: 900, onComplete: () => g.destroy() });
    this.ring(x, y, R * 1.2, color, 600);
  }

  // 落石
  rockFall(x, y, R) {
    const s = this.s;
    const rock = s.add.image(x, y - 10, 'rock3').setDepth(5).setScale(R / 30);
    s.tweens.add({ targets: rock, alpha: 0, scale: R / 40, duration: 500, delay: 200, onComplete: () => rock.destroy() });
  }

  // 爆炸（業火爆等）
  explode(x, y, R, color) {
    this.anim('fire_burst_anim', x, y, R * 2.8, { depth: 8 });
    this.flash(x, y, R * 2.2, color, 280);
    this.ring(x, y, R, color, 300);
    this.smoke(x, y, 3);
    for (let i = 0; i < 6; i++) this.flame(x + (Math.random() - 0.5) * R, y + (Math.random() - 0.5) * R);
  }

  // 流血爆發
  bleed(x, y) {
    this.aiImg('blood_burst', x, y, { size: 150, dur: 320, grow: 1.2 });
    this.sparkE.setParticleTint(0xff2040);
    this.sparkE.explode(20, x, y);
    this.img('muzzle_02', x, y, { color: 0xff2040, scale: 0.7, dur: 260, rot: Math.random() * 6 });
  }

  // 朱雀俯衝
  phoenix(x, y, color) {
    const s = this.s;
    if (this.has('phoenix')) {
      const im = this.aiImg('phoenix', x, y - 260, { size: 260, keep: true, depth: 9 });
      s.tweens.add({ targets: im, y, duration: 170, ease: 'Quad.In', onComplete: () => { im.destroy(); this.anim('fire_burst_anim', x, y, 340); } });
      return;
    }
    const b = s.add.image(x - 160, y - 260, 'fx_flame_05').setBlendMode(ADD).setTint(color).setDepth(9).setScale(1.6, 0.9).setRotation(Math.atan2(260, 160));
    s.tweens.add({ targets: b, x, y, duration: 160, ease: 'Quad.In', onComplete: () => b.destroy() });
  }
}
