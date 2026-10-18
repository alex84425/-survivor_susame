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

  // 刀光：新月形貼圖，朝瞄準方向
  slash(x, y, ang, R, color, heavy, flip) {
    const s = this.s;
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

  // 衝擊環
  ring(x, y, R, color, dur = 320) {
    const s = this.s, k = (R * 2) / 256;
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
    if (heavy) {
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
    this.flash(x, y, 220, 0xffd24a, 300);
    const star = s.add.image(x, y, 'fx_magic_05').setBlendMode(ADD).setTint(0xffe080).setDepth(8).setScale(0.4);
    s.tweens.add({ targets: star, scale: 2.4, alpha: { from: 1, to: 0 }, angle: 45, duration: 420, ease: 'Cubic.Out', onComplete: () => star.destroy() });
    this.ring(x, y, 180, 0xff5050, 400);
    this.sparks(x, y, 0xffd24a, 30);
  }

  // 法陣（施法、彈反）
  sigil(x, y, R, color, dur = 500) {
    const s = this.s, k = R * 2 / 256;
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
}
