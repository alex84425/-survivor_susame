// 以 WebAudio 即時合成的音效與背景音樂（不需音檔）

let ctx = null, master, sfxBus, bgmBus, noiseBuf;
let muted = false, bgmOn = true;
let bgmTimer = null, nextNote = 0, step = 0;
let intensity = 0; // 0 平常 / 1 妖王在場
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

// ---------- 背景音樂：古琴風格的五聲音階撥弦 + 低音持續音 ----------
function pluck(freq, t, vol) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'triangle'; o2.type = 'sine';
  o.frequency.value = freq; o2.frequency.value = freq * 2.003;
  f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + 1.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(bgmBus);
  o.start(t); o2.start(t); o.stop(t + 1.9); o2.stop(t + 1.9);
}

function drone(freq, t, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bgmBus);
  o.start(t); o.stop(t + dur + 0.05);
}

function drum(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g); g.connect(bgmBus);
  o.start(t); o.stop(t + 0.35);
}

// 戰鬥音色
function bass(freq, t, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(bgmBus);
  o.start(t); o.stop(t + dur + 0.02);
}

function hat(t, vol) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(f); f.connect(g); g.connect(bgmBus);
  s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
}

function snare(t, vol) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  s.connect(f); f.connect(g); g.connect(bgmBus);
  s.start(t, Math.random() * 0.5); s.stop(t + 0.2);
  tone({ freq: 220, to: 120, type: 'triangle', dur: 0.1, vol: vol * 0.6, bus: bgmBus, delay: t - ctx.currentTime });
}

// 二胡般的主旋律：鋸齒波 + 顫音
function lead(freq, t, dur, vol) {
  const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(freq * 0.97, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
  lfo.frequency.value = 6; lg.gain.value = freq * 0.012; lfo.connect(lg); lg.connect(o.frequency);
  f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 3;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(bgmBus);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
}

// 銅鑼：模式切換時敲一下
function gong(t) {
  [55, 82.4, 110.7, 147].forEach((fq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(fq * 1.02, t); o.frequency.exponentialRampToValueAtTime(fq, t + 1.5);
    g.gain.setValueAtTime(0.22 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    o.connect(g); g.connect(bgmBus); o.start(t); o.stop(t + 3.1);
  });
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  s.connect(f); f.connect(g); g.connect(bgmBus); s.start(t); s.stop(t + 0.99);
}

// D 弗里吉亞（帶小二度，緊張感）
const PHRYG = [0, 1, 3, 5, 7, 8, 10];
const phr = (deg, oct = 0) => midi(50 + PHRYG[((deg % 7) + 7) % 7] + 12 * (Math.floor(deg / 7) + oct));
const BASS_RIFF = [0, 0, 0, 1, 0, 0, 3, 2];
const LEAD_RIFF = [7, -1, 8, 7, 5, -1, 4, 3, 4, -1, 5, 4, 3, 1, 0, -1];

let melodyDeg = 5, mode = -1;
function startBgm() {
  nextNote = ctx.currentTime + 0.2;
  bgmTimer = setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    if (intensity !== mode) {
      if (intensity > mode && mode !== -1) gong(ctx.currentTime + 0.05);
      mode = intensity; step = 0;
      nextNote = Math.max(nextNote, ctx.currentTime + (intensity ? 0.5 : 0.2));
    }
    // 0 平常 / 1 妖王戰 / 2 異空間單挑
    const beat = [0.36, 0.13, 0.115][mode];
    while (nextNote < ctx.currentTime + 0.3) {
      const t = nextNote;
      if (mode === 0) {
        if (step % 16 === 0) { drone(note(0, -2), t, beat * 16, 0.16); drone(note(3, -2), t, beat * 16, 0.08); }
        if (Math.random() < 0.5) {
          melodyDeg = Math.max(0, Math.min(11, melodyDeg + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
          pluck(note(melodyDeg, -1), t, 0.16);
          if (step % 8 === 0) pluck(note(melodyDeg - 5, -1), t, 0.1);
        }
      } else {
        const bar = Math.floor(step / 16), s16 = step % 16;
        // 低音 riff（八分音符）
        if (s16 % 2 === 0) bass(phr(BASS_RIFF[(s16 / 2) | 0] + (bar % 4 === 3 ? 1 : 0), -2), t, beat * 1.8, 0.2);
        // 鼓：大鼓、小鼓、碎拍
        if (s16 % 4 === 0 || (mode === 2 && s16 % 4 === 3)) drum(t, 0.45);
        if (s16 === 4 || s16 === 12) snare(t, 0.22);
        if (mode === 2 && s16 === 14) snare(t, 0.14);
        hat(t, s16 % 2 ? 0.03 : 0.06);
        // 二胡主旋律，每兩小節移調一次
        const ln = LEAD_RIFF[s16];
        if (ln >= 0 && s16 % 2 === 0) lead(phr(ln + (bar % 4 >= 2 ? 2 : 0), 0), t, beat * 2.2, mode === 2 ? 0.08 : 0.065);
        // 每小節開頭的不協和和弦重擊
        if (s16 === 0) [0, 1, 4].forEach(d => pluck(phr(d, -1), t, 0.1));
        if (step % 64 === 0 && step > 0) gong(t);
      }
      step++;
      nextNote += beat;
    }
  }, 50);
}
