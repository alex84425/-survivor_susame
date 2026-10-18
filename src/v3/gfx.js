// v3 貼圖：像素圖載入、投射物與特效貼圖
import { ELEMS, ELEM_CSS } from '../data.js';

export const IMG = ['wolf', 'bear', 'spider', 'tiger', 'mage', 'fencer', 'boar', 'snake', 'fox', 'scorpion', 'crocodile', 'ogre', 'bat', 'goblin', 'dragon', 'lion', 'trex', 'gorilla'];

export function preloadImages(scene) {
  for (const k of IMG) {
    if (!scene.textures.exists('px_' + k)) scene.load.image('px_' + k, `assets/img/px_${k}.png`);
  }
}

export function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext(), w, h);
  t.refresh();
}

function blob(scene, key, w, h, color) {
  canvasTex(scene, key, w, h, c => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
  });
}

// 角色 / 妖獸：像素圖 + 腳下光圈
export function unitTex(scene, key, img, size, color, fallback) {
  canvasTex(scene, key, size, size, c => {
    c.save();
    c.globalAlpha = 0.3; c.fillStyle = color;
    c.beginPath(); c.ellipse(size / 2, size * 0.88, size * 0.34, size * 0.09, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.9; c.lineWidth = 2; c.strokeStyle = color; c.stroke();
    c.restore();
    if (scene.textures.exists('px_' + img)) {
      c.imageSmoothingEnabled = false;
      c.drawImage(scene.textures.get('px_' + img).getSourceImage(), 0, 0, size, size * 0.93);
    } else {
      c.fillStyle = color; c.font = `bold ${size * 0.5}px "Microsoft JhengHei"`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(fallback, size / 2, size / 2);
    }
  });
}

export function makeTextures(scene) {
  canvasTex(scene, 'bg3', 128, 128, c => {
    c.fillStyle = '#141820'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#1b2029'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 128, 128);
    c.fillStyle = '#1f2533';
    for (let i = 0; i < 8; i++) c.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  });
  for (const e of ELEMS) {
    const col = ELEM_CSS[e];
    canvasTex(scene, `sw_${e}`, 36, 10, (c, w, h) => {
      c.shadowColor = col; c.shadowBlur = 4;
      const g = c.createLinearGradient(10, 0, w, 0); g.addColorStop(0, col); g.addColorStop(1, '#ffffff');
      c.fillStyle = g; c.beginPath(); c.moveTo(w - 1, h / 2); c.lineTo(11, 2); c.lineTo(11, h - 2); c.closePath(); c.fill();
      c.fillStyle = col; c.fillRect(8, 0, 3, h); c.fillRect(1, h / 2 - 1.5, 7, 3);
    });
    canvasTex(scene, `leaf_${e}`, 22, 12, (c, w, h) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, h / 2);
      c.quadraticCurveTo(w / 2, -3, w, h / 2); c.quadraticCurveTo(w / 2, h + 3, 0, h / 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, h / 2); c.lineTo(w - 3, h / 2); c.stroke();
    });
    canvasTex(scene, `fire_${e}`, 26, 26, (c, w, h) => {
      const g = c.createRadialGradient(w / 2 + 3, h / 2, 1, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.3, '#ffd24a'); g.addColorStop(0.65, col); g.addColorStop(1, 'rgba(255,60,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
    });
    canvasTex(scene, `bb_${e}`, 18, 18, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#1a0010'); g.addColorStop(0.55, '#3a0a20'); g.addColorStop(0.75, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
    });
    blob(scene, `p_${e}`, 16, 16, col);
  }
  canvasTex(scene, 'venom', 16, 16, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#eaffb0'); g.addColorStop(0.4, '#8be02c'); g.addColorStop(0.8, '#7a2cc0'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
  });
  canvasTex(scene, 'web', 20, 20, (c, w, h) => {
    c.strokeStyle = '#f0f0f0'; c.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 9, h / 2 + Math.sin(a) * 9); c.lineTo(w / 2 - Math.cos(a) * 9, h / 2 - Math.sin(a) * 9); c.stroke(); }
    c.beginPath(); c.arc(w / 2, h / 2, 4, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(w / 2, h / 2, 8, 0, Math.PI * 2); c.stroke();
  });
  canvasTex(scene, 'rock3', 40, 36, c => {
    c.fillStyle = '#8a6136'; c.strokeStyle = '#3d2a12'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(6, 10); c.lineTo(18, 2); c.lineTo(32, 6); c.lineTo(38, 20); c.lineTo(28, 34); c.lineTo(10, 32); c.lineTo(2, 20); c.closePath();
    c.fill(); c.stroke();
  });
  canvasTex(scene, 'wave', 34, 14, (c, w, h) => {
    c.strokeStyle = '#ffb0ff'; c.lineWidth = 3;
    c.beginPath(); c.arc(-6, h / 2, w - 4, -0.5, 0.5); c.stroke();
  });
  canvasTex(scene, 'bonfire3', 52, 52, c => {
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(8, 46); c.lineTo(44, 34); c.moveTo(44, 46); c.lineTo(8, 34); c.stroke();
    const g = c.createRadialGradient(26, 28, 2, 26, 28, 22);
    g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ffb030'); g.addColorStop(1, 'rgba(255,80,0,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(26, 4); c.quadraticCurveTo(44, 28, 26, 42); c.quadraticCurveTo(8, 28, 26, 4); c.fill();
  });
  canvasTex(scene, 'dummy3', 40, 50, c => {
    c.fillStyle = '#7a5530'; c.fillRect(17, 10, 6, 38);
    c.fillRect(6, 18, 28, 6);
    c.fillStyle = '#a07040'; c.beginPath(); c.arc(20, 10, 8, 0, Math.PI * 2); c.fill();
  });
}
