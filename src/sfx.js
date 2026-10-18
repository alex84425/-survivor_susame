// 以 WebAudio 即時合成的音效與背景音樂（不需音檔）

let ctx = null, master, sfxBus, bgmBus, noiseBuf;
let muted = false, bgmOn = true;
let bgmTimer = null, nextNote = 0, step = 0;
let intensity = 0; // 0 探索 / 1 妖王戰 / 2 決戰
const last = {};

function throttle(name, ms) {
  const now = performance.now();
  if (last[name] && now - last[name] < ms) return false;
  last[name] = now;
  return true;
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  bgmBus = ctx.createGain(); bgmBus.gain.value = bgmOn ? 0.32 : 0; bgmBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startBgm();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
  return muted;
}

export function toggleBgm() {
  bgmOn = !bgmOn;
  if (bgmBus) bgmBus.gain.setTargetAtTime(bgmOn ? 0.32 : 0, ctx.currentTime, 0.1);
  return bgmOn;
}

export function setIntensity(v) { intensity = v; }

function tone({ freq, to, type = 'sine', dur = 0.12, vol = 0.2, attack = 0.004, delay = 0, bus = sfxBus, filter }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filter;
    o.connect(f); node = f;
  }
  node.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.2, type = 'lowpass', freq = 1000, to, q = 1, delay = 0 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

// 五聲音階（宮商角徵羽）D 調
const PENTA = [0, 2, 4, 7, 9];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const note = (deg, oct = 0) => midi(62 + PENTA[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct));

export const sfx = {
  shoot(elem) {
    if (!throttle('shoot' + elem, 90)) return;
    switch (elem) {
      case '金': tone({ freq: 1500, to: 900, type: 'triangle', dur: 0.1, vol: 0.07 }); break;
      case '木': tone({ freq: 420, to: 620, type: 'sine', dur: 0.14, vol: 0.09 }); break;
      case '水': tone({ freq: 900, to: 1500, type: 'sine', dur: 0.12, vol: 0.07 }); break;
      case '火': noise({ dur: 0.18, vol: 0.12, type: 'bandpass', freq: 600, to: 2000, q: 1.5 }); break;
      case '土': tone({ freq: 150, to: 70, type: 'square', dur: 0.14, vol: 0.06, filter: 600 }); break;
    }
  },
  hit() { if (throttle('hit', 45)) noise({ dur: 0.05, vol: 0.06, type: 'highpass', freq: 2500 }); },
  kill() { if (throttle('kill', 60)) tone({ freq: 300, to: 120, type: 'triangle', dur: 0.08, vol: 0.06 }); },
  stone() { if (throttle('stone', 70)) tone({ freq: 1800 + Math.random() * 400, type: 'sine', dur: 0.07, vol: 0.04 }); },
  item() { [0, 2, 4].forEach((d, i) => tone({ freq: note(d, 1), type: 'triangle', dur: 0.18, vol: 0.09, delay: i * 0.06 })); },
  levelup() { [0, 1, 2, 3, 4, 5].forEach((d, i) => tone({ freq: note(d, 1), type: 'triangle', dur: 0.25, vol: 0.1, delay: i * 0.05 })); },
  select() { tone({ freq: note(4, 1), type: 'triangle', dur: 0.15, vol: 0.1 }); },
  hurt() { if (throttle('hurt', 160)) tone({ freq: 180, to: 60, type: 'square', dur: 0.15, vol: 0.09, filter: 900 }); },
  roar() {
    if (!throttle('roar', 400)) return;
    tone({ freq: 110, to: 45, type: 'sawtooth', dur: 0.9, vol: 0.16, filter: 500, attack: 0.05 });
    noise({ dur: 0.8, vol: 0.12, type: 'lowpass', freq: 500, to: 150 });
  },
  warn() { if (throttle('warn', 200)) tone({ freq: 260, to: 700, type: 'sawtooth', dur: 0.5, vol: 0.07, filter: 1800 }); },
  dash() { noise({ dur: 0.4, vol: 0.14, type: 'bandpass', freq: 300, to: 1200, q: 2 }); },
  barrage() { if (throttle('barrage', 150)) tone({ freq: 500, to: 250, type: 'square', dur: 0.12, vol: 0.06, filter: 1500 }); },
  slam() {
    if (!throttle('slam', 80)) return;
    noise({ dur: 0.35, vol: 0.2, type: 'lowpass', freq: 400, to: 80 });
    tone({ freq: 90, to: 40, type: 'sine', dur: 0.35, vol: 0.2 });
  },
  thunder() {
    if (!throttle('thunder', 120)) return;
    noise({ dur: 0.08, vol: 0.18, type: 'highpass', freq: 3000 });
    noise({ dur: 0.6, vol: 0.18, type: 'lowpass', freq: 600, to: 60, delay: 0.03 });
  },
  craft() { [0, 0.12].forEach(d => tone({ freq: 2200, to: 2000, type: 'triangle', dur: 0.3, vol: 0.08, delay: d })); },
  buy() { tone({ freq: 1300, type: 'square', dur: 0.06, vol: 0.05, filter: 3000 }); tone({ freq: 1900, type: 'square', dur: 0.1, vol: 0.05, filter: 3000, delay: 0.06 }); },
  slow() { tone({ freq: 600, to: 120, type: 'sine', dur: 0.5, vol: 0.1 }); },
  sweep() { noise({ dur: 0.4, vol: 0.1, type: 'bandpass', freq: 3000, to: 400, q: 3 }); },
  bossDie() {
    noise({ dur: 1.2, vol: 0.22, type: 'lowpass', freq: 800, to: 50 });
    [4, 3, 2, 0].forEach((d, i) => tone({ freq: note(d, 1), type: 'triangle', dur: 0.4, vol: 0.1, delay: 0.3 + i * 0.12 }));
  },
  win() { [0, 2, 4, 5, 7, 9, 10].forEach((d, i) => tone({ freq: note(d, 0), type: 'triangle', dur: 0.6, vol: 0.12, delay: i * 0.15 })); },
  lose() { [4, 3, 2, 1, 0].forEach((d, i) => tone({ freq: note(d, -1), type: 'sine', dur: 0.7, vol: 0.12, delay: i * 0.22 })); },
};

// ---------- 背景音樂：國風戰鬥配樂（參考《覓長生》〈戰〉的編制：古箏、琵琶輪指、笛子／二胡、大鼓、鈸） ----------
// 三首：0 探索（古箏 + 笛子，慢）、1 妖王戰（琵琶輪指 + 二胡 + 戰鼓）、2 決戰（更快、鼓更密）

const hz = n => 440 * Math.pow(2, (n - 69) / 12);
// 探索：D 宮調（D E F# A B）；戰鬥：D 羽調（D F G A C）
const GONG = [62, 64, 66, 69, 71];
const YU = [62, 65, 67, 69, 72];
const deg = (scale, d) => scale[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5);

function out(node, t, vol, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  node.connect(g); g.connect(bgmBus);
  return g;
}

// 古箏：明亮的撥弦，帶一點下滑的按音
function zheng(n, t, vol = 0.14, dur = 1.6) {
  const f = hz(n);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter();
  o1.type = 'triangle'; o2.type = 'sawtooth';
  o1.frequency.setValueAtTime(f * 1.01, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  o2.frequency.setValueAtTime(f * 2.002, t);
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(600, t + dur * 0.8);
  const mix = ctx.createGain(); mix.gain.value = 1;
  const g2 = ctx.createGain(); g2.gain.value = 0.18;
  o1.connect(mix); o2.connect(g2); g2.connect(mix); mix.connect(lp);
  out(lp, t, vol, dur);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}

// 琵琶：短促清脆，用來輪指
function pipa(n, t, vol = 0.07) {
  const o = ctx.createOscillator(), bp = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = hz(n);
  bp.type = 'bandpass'; bp.frequency.value = hz(n) * 3; bp.Q.value = 1.2;
  o.connect(bp); out(bp, t, vol, 0.22);
  o.start(t); o.stop(t + 0.25);
}

// 笛子：正弦 + 氣聲 + 延遲顫音，進音從下方滑上
function dizi(n, t, dur, vol = 0.09) {
  const f = hz(n);
  const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
  lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, dur * 0.5));
  lfo.connect(lg); lg.connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
  g.gain.setValueAtTime(vol, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bgmBus);
  // 氣聲
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(vol * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  s.connect(bp); bp.connect(ng); ng.connect(bgmBus);
  o.start(t); lfo.start(t); s.start(t, Math.random()); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05); s.stop(t + 0.2);
}

// 二胡：鋸齒 + 共鳴 + 揉弦
function erhu(n, t, dur, vol = 0.07) {
  const f = hz(n);
  const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createBiquadFilter(), pk = ctx.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  lfo.frequency.value = 6; lg.gain.value = f * 0.014; lfo.connect(lg); lg.connect(o.frequency);
  lp.type = 'lowpass'; lp.frequency.value = 2600;
  pk.type = 'peaking'; pk.frequency.value = 900; pk.gain.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
  g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(pk); pk.connect(g); g.connect(bgmBus);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}

// 大鼓（咚）
function dagu(t, vol = 0.5) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.3);
  out(o, t, vol, 0.42); o.start(t); o.stop(t + 0.45);
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  s.connect(lp); out(lp, t, vol * 0.5, 0.08); s.start(t, Math.random()); s.stop(t + 0.1);
}

// 小鼓（嗒）
function xiaogu(t, vol = 0.18) {
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.06);
  out(o, t, vol, 0.09); o.start(t); o.stop(t + 0.1);
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500;
  s.connect(bp); out(bp, t, vol * 0.6, 0.07); s.start(t, Math.random()); s.stop(t + 0.08);
}

// 木魚
function muyu(t, vol = 0.1) {
  const o = ctx.createOscillator(); o.frequency.value = 820;
  out(o, t, vol, 0.07); o.start(t); o.stop(t + 0.08);
}

// 鈸
function bo(t, vol = 0.12) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
  s.connect(hp); out(hp, t, vol, 1.3); s.start(t, Math.random() * 0.2); s.stop(t + 1.32);
}

// 銅鑼：模式切換時
function gong(t) {
  [55, 82.4, 110.7, 147].forEach((fq, i) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(fq * 1.02, t); o.frequency.exponentialRampToValueAtTime(fq, t + 1.5);
    out(o, t, 0.22 / (i + 1), 3); o.start(t); o.stop(t + 3.1);
  });
  bo(t, 0.16);
}

function drone(n, t, dur, vol) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(n);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bgmBus); o.start(t); o.stop(t + dur + 0.05);
}

// ---- 曲譜 ----
// 探索曲：笛子旋律 [音級, 八分音符數]，D 宮調；-1＝休止
const CALM_MEL = [
  [3, 4], [4, 2], [5, 2], [6, 6], [5, 2], [4, 3], [3, 1], [2, 2], [1, 2], [0, 8],
  [2, 2], [3, 2], [4, 2], [5, 2], [6, 4], [7, 2], [6, 2], [5, 3], [4, 1], [3, 2], [2, 2], [3, 8],
  [-1, 8], [5, 4], [3, 4], [4, 2], [3, 2], [2, 4], [1, 4], [2, 2], [3, 2], [0, 8], [-1, 8],
];
const CALM_ROOTS = [0, 0, 3, 3, -2, -2, 0, 0]; // 每兩小節換根音（音級）
// 戰鬥曲：主旋律 [音級, 十六分音符數]，D 羽調
const WAR_MEL = [
  [3, 4], [3, 2], [4, 2], [5, 6], [4, 2],
  [3, 2], [2, 2], [1, 2], [2, 2], [3, 8],
  [5, 4], [6, 2], [7, 2], [8, 6], [7, 2],
  [6, 2], [5, 2], [4, 2], [5, 2], [3, 8],
  [5, 2], [5, 2], [4, 2], [3, 2], [2, 4], [3, 4],
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 8],
  [8, 4], [7, 4], [6, 4], [5, 4],
  [4, 4], [3, 4], [5, 8],
];
const WAR_ROOTS = [0, 0, -2, 0, 2, -1, 0, 0]; // 每小節根音

function startBgm() {
  let mode = -1, step = 0, mi = 0, mLeft = 0;
  nextNote = ctx.currentTime + 0.2;
  bgmTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    if (intensity !== mode) {
      if (intensity > mode && mode !== -1) gong(ctx.currentTime + 0.05);
      mode = intensity; step = 0; mi = 0; mLeft = 0;
      nextNote = Math.max(nextNote, ctx.currentTime + (mode ? 0.6 : 0.3));
    }
    // 探索：八分音符 0.39 秒（約 77 BPM）；戰鬥：十六分音符 0.1 秒（150 BPM）；決戰：0.09 秒
    const stepDur = [0.39, 0.1, 0.09][mode];
    while (nextNote < ctx.currentTime + 0.3) {
      const t = nextNote;
      if (mode === 0) {
        const bar = Math.floor(step / 8), s8 = step % 8, root = CALM_ROOTS[bar % 8];
        if (s8 === 0 && bar % 2 === 0) { drone(deg(GONG, root) - 24, t, stepDur * 16, 0.12); drone(deg(GONG, root + 3) - 24, t, stepDur * 16, 0.05); }
        // 古箏分解和弦
        const arp = [root, root + 3, root + 5, root + 3, root + 6, root + 5, root + 3, root + 1];
        if (Math.random() < 0.85) zheng(deg(GONG, arp[s8]) - 12, t, s8 === 0 ? 0.13 : 0.08);
        if (s8 === 4 && Math.random() < 0.5) muyu(t, 0.05);
        // 笛子旋律
        if (mLeft <= 0) {
          const [d, len] = CALM_MEL[mi % CALM_MEL.length]; mi++;
          mLeft = len;
          if (d >= 0) dizi(deg(GONG, d) + 12, t, len * stepDur * 0.95, 0.075);
        }
        mLeft--;
      } else {
        const bar = Math.floor(step / 16), s16 = step % 16, root = WAR_ROOTS[bar % 8];
        // 戰鼓：咚 . . . . . 咚 . 咚 . . 咚 . . . .（決戰再加密）
        if (s16 === 0) dagu(t, 0.55);
        if (s16 === 6 || s16 === 8 || s16 === 11) dagu(t, 0.38);
        if (mode === 2 && (s16 === 3 || s16 === 14)) dagu(t, 0.3);
        if (s16 === 4 || s16 === 12) xiaogu(t, 0.2);
        if (bar % 4 === 3 && s16 >= 12) xiaogu(t, 0.12 + (s16 - 12) * 0.03); // 小節末過門
        if (s16 % 2 === 1) muyu(t, mode === 2 ? 0.06 : 0.04);
        if (s16 === 0 && bar % 4 === 0) bo(t, 0.13);
        // 低音
        if (s16 % 4 === 0) drone(deg(YU, root) - 24, t, stepDur * 4, 0.16);
        // 琵琶輪指：根音與五度交替
        if (s16 % 2 === 0) pipa(deg(YU, s16 % 4 === 0 ? root : root + 3) - 12 + (s16 >= 8 ? 12 : 0), t, 0.06);
        if (mode === 2 && s16 % 2 === 1) pipa(deg(YU, root + 5) - 12, t, 0.04);
        // 主旋律：二胡（決戰加笛子八度）
        if (mLeft <= 0) {
          const [d, len] = WAR_MEL[mi % WAR_MEL.length]; mi++;
          mLeft = len;
          const n = deg(YU, d);
          erhu(n, t, len * stepDur * 0.95, mode === 2 ? 0.08 : 0.068);
          if (mode === 2) dizi(n + 12, t, len * stepDur * 0.9, 0.04);
        }
        mLeft--;
        if (step % 128 === 0 && step > 0) gong(t);
      }
      step++;
      nextNote += stepDur;
    }
  }, 50);
}
