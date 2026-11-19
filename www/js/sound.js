// 효과음 — 소리 파일 없이 Web Audio로 합성한다. 첫 터치 때 켜지고, 설정(meta.mute)으로 끌 수 있다.
let ac = null, master = null, muted = false, noiseBuf = null;
const last = {};

function ensure() {
  if (ac) return true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  ac = new AC(); master = ac.createGain(); master.gain.value = 0.22; master.connect(ac.destination);
  const n = ac.sampleRate * 0.4; noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
function tone(type, f0, f1, dur, vol, at = 0) {
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(filter, freq, dur, vol, at = 0) {
  const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = filter; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const notes = (fs, step, dur, vol, type = 'triangle') => fs.forEach((f, i) => tone(type, f, f, dur, vol, i * step));

const SFX = {
  inf() { noise('bandpass', 1900, 0.05, 0.5); },                                  // 소총
  art() { tone('sine', 130, 38, 0.22, 0.9); noise('lowpass', 500, 0.2, 0.6); },   // 포격
  med() { tone('sine', 700, 880, 0.06, 0.18); },                                  // 의무
  sig() { tone('square', 950, 320, 0.07, 0.16); },                                // 통신
  summon() { notes([523, 784], 0.07, 0.09, 0.4); },
  merge() { notes([523, 659, 784], 0.07, 0.11, 0.45); },
  hidden() { notes([523, 659, 784, 1047, 1319], 0.08, 0.16, 0.5); },
  camp() { notes([392, 523, 659], 0.06, 0.12, 0.4, 'square'); },
  sell() { notes([1047, 1319], 0.05, 0.07, 0.3); },
  deny() { tone('square', 180, 140, 0.12, 0.25); },
  wave() { tone('sine', 160, 60, 0.25, 0.8); noise('lowpass', 300, 0.2, 0.4); },
  boss() { notes([196, 147, 196, 147], 0.18, 0.2, 0.5, 'sawtooth'); },
  bossdie() { tone('sine', 110, 30, 0.6, 1); noise('lowpass', 700, 0.5, 0.8); },
  win() { notes([523, 659, 784, 1047, 784, 1047], 0.13, 0.22, 0.5); },
  lose() { notes([392, 330, 262, 196], 0.2, 0.3, 0.45, 'sawtooth'); },
};
const GAP = { inf: 0.07, art: 0.12, med: 0.15, sig: 0.1 };   // 같은 소리가 겹쳐 시끄럽지 않게 하는 최소 간격(초)

export const Sound = {
  unlock() { if (ensure() && ac.state === 'suspended') ac.resume(); },
  setMuted(m) { muted = !!m; },
  get muted() { return muted; },
  play(name) {
    if (muted || !ac || ac.state !== 'running' || !SFX[name]) return;
    const now = ac.currentTime, gap = GAP[name] || 0.03;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now; SFX[name]();
  },
};
