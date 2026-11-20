// All sound is synthesized with the Web Audio API, so the game ships no audio files.
let ac = null;
let master = null;
let rainGain = null;
let muted = false;

export function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.35;
  master.connect(ac.destination);
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.35, ac.currentTime, 0.05);
}
export const isMuted = () => muted;

function tone(freq, dur, type = 'sine', vol = 0.4, slideTo = null, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseBuffer(seconds) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(dur, vol, freq, type = 'lowpass', delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(dur);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const whoosh = () => noise(0.35, 0.25, 2500, 'bandpass');
export const splash = () => { noise(0.4, 0.5, 1400); tone(420, 0.12, 'sine', 0.15, 180); };
export const plop = () => tone(700, 0.09, 'sine', 0.25, 260);
export const bite = () => { tone(880, 0.09, 'square', 0.18); tone(1320, 0.12, 'square', 0.18, null, 0.09); };
export const click = () => tone(1800 + Math.random() * 400, 0.02, 'square', 0.05);
export const snap = () => { noise(0.12, 0.7, 5000, 'highpass'); tone(320, 0.35, 'sawtooth', 0.2, 60); };
export const fail = () => { tone(400, 0.18, 'triangle', 0.2, 300); tone(300, 0.3, 'triangle', 0.2, 180, 0.15); };
export const thunder = () => { noise(2.2, 0.9, 160); noise(0.3, 0.5, 900, 'lowpass', 0.05); };
export const sizzle = () => { noise(0.9, 0.35, 3000, 'highpass'); noise(0.5, 0.2, 800, 'bandpass', 0.2); };
export const coin = () => { tone(988, 0.08, 'square', 0.12); tone(1319, 0.2, 'square', 0.12, null, 0.08); };

export function fanfare(rank) {
  const scale = [523, 659, 784, 1047, 1319, 1568];
  const n = 3 + rank;
  for (let i = 0; i < n; i++) tone(scale[i % scale.length] * (i >= 6 ? 2 : 1), 0.22, 'triangle', 0.22, null, i * 0.09);
}

export function setRain(level) {
  if (!ac) return;
  if (!rainGain) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(2);
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    rainGain = ac.createGain();
    rainGain.gain.value = 0;
    src.connect(f).connect(rainGain).connect(master);
    src.start();
  }
  rainGain.gain.setTargetAtTime(level * 0.22, ac.currentTime, 1);
}
