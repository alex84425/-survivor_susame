// AI 生成素材（本機 Qwen-Image 2.1 + MiniMax H3，tools/import_ai.py 整理到 assets/ai/）
// 依 manifest 載入：靜態圖 ai_<組>_<名稱>，序列幀 ai_fxa_<名稱>（特效）、ai_ca_<名稱>（主角動畫）
export const AI = { man: null };

const STATIC = [['char', 'ai_char_'], ['mon', 'ai_mon_'], ['vfx', 'ai_vfx_'], ['icon', 'ai_icon_'], ['item', 'ai_item_'], ['env', 'ai_env_']];
const SHEETS = [['vfxanim', 'ai_fxa_'], ['charanim', 'ai_ca_']];

export function preloadAI(scene) {
  scene.load.json('aiman', 'assets/ai/manifest.json');
  scene.load.on('filecomplete-json-aiman', (_k, _t, m) => {
    AI.man = m;
    for (const [g, pre] of STATIC) for (const [k, src] of Object.entries(m[g] || {})) if (!scene.textures.exists(pre + k)) scene.load.image(pre + k, src);
    for (const [g, pre] of SHEETS) for (const [k, o] of Object.entries(m[g] || {})) {
      if (!scene.textures.exists(pre + k)) scene.load.spritesheet(pre + k, o.src, { frameWidth: o.size, frameHeight: o.size });
    }
  });
}

export function makeAIAnims(scene) {
  const m = AI.man;
  if (!m) return;
  for (const [k, o] of Object.entries(m.vfxanim || {})) {
    const key = 'ai_fxa_' + k;
    if (scene.textures.exists(key) && !scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: o.frames - 1 }), frameRate: 26 });
  }
  for (const [k, o] of Object.entries(m.charanim || {})) {
    const key = 'ai_ca_' + k;
    const loop = !k.endsWith('_attack');
    if (scene.textures.exists(key) && !scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: o.frames - 1 }), frameRate: loop ? 12 : 22, repeat: loop ? -1 : 0 });
  }
}

// 主角圖：元素 id（jin/mu/shui/huo/tu）＋性別
export const charKey = (id, sex) => `ai_char_${id}_${sex}`;
export const monKey = (type, variant) => `ai_mon_${type}_${variant}`;
export const iconSrc = id => `assets/ai/icon/${id}.webp`;
export const hasIcon = id => !!(AI.man && AI.man.icon && AI.man.icon[id]);
