// Motor de audio de Beatlab: síntesis 100 % propia (sin muestras) con Web Audio.
// Se usa igual en vivo (AudioContext) y para exportar (OfflineAudioContext).
export const TRACKS = ['kick', 'snare', 'clap', 'hat', 'ohat', 'perc', 'bass', 'lead', 'chord'];
export const TRACK_LABEL = { kick: 'Bombo', snare: 'Caja', clap: 'Clap', hat: 'Hi-hat', ohat: 'Open hat', perc: 'Perc', bass: '808 / Bajo', lead: 'Melodía', chord: 'Acordes' };

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const hash = (n) => { n = Math.imul(n ^ (n >>> 15), 2246822507); n = Math.imul(n ^ (n >>> 13), 3266489909); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

const cache = new WeakMap();
function noiseBuf(ctx) {
  let c = cache.get(ctx) || {};
  if (!c.noise) {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    let s = 1234567;
    for (let i = 0; i < d.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
    c.noise = b; cache.set(ctx, c);
  }
  return c.noise;
}
function makeIR(ctx, secs, decay) {
  const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let s = 99991 + ch * 777;
    for (let i = 0; i < len; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const x = s / 2147483648 - 1; d[i] = x * Math.pow(1 - i / len, decay) * (i < 400 ? i / 400 : 1); }
  }
  return b;
}
const curve = (amt) => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * amt) / Math.tanh(amt); } return c; };

export function createGraph(ctx, beat) {
  const fx = beat.kit.fx;
  const g = { ctx, bus: {}, lastOpen: null };
  const pre = ctx.createGain(); pre.gain.value = 0.3;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = fx.lp || 20000; lp.Q.value = 0.5;
  const sat = ctx.createWaveShaper(); sat.curve = curve(fx.sat || 1.2); sat.oversample = '2x';
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.2; comp.attack.value = 0.012; comp.release.value = 0.18;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  const out = ctx.createGain(); out.gain.value = 0.92;
  pre.connect(hp).connect(lp).connect(sat).connect(comp).connect(lim).connect(out).connect(ctx.destination);
  g.out = out;
  if (!(ctx instanceof OfflineAudioContext)) { const an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.75; out.connect(an); g.an = an; }

  const rev = ctx.createConvolver(); rev.buffer = makeIR(ctx, fx.revTime || 2.2, 2.6);
  const revIn = ctx.createGain(), revOut = ctx.createGain(); revOut.gain.value = 0.9;
  const revHp = ctx.createBiquadFilter(); revHp.type = 'highpass'; revHp.frequency.value = 350;
  revIn.connect(revHp).connect(rev).connect(revOut).connect(pre);
  const stepDur = 60 / beat.bpm / 4;
  const dly = ctx.createDelay(2); dly.delayTime.value = stepDur * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.38;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  const dlyIn = ctx.createGain();
  dlyIn.connect(dly); dly.connect(dlp).connect(fb).connect(dly); dlp.connect(pre);

  g.lp = lp; g.baseLp = fx.lp || 20000;
  g.thrD = ctx.createGain(); g.thrD.gain.value = 0; sat.connect(g.thrD).connect(dlyIn);
  g.thrR = ctx.createGain(); g.thrR.gain.value = 0; sat.connect(g.thrR).connect(revIn);
  const sendRev = { snare: 0.12, clap: 0.18, lead: 0.28, chord: 0.3, perc: 0.1 };
  const sendDly = { lead: 0.2, snare: 0.04, chord: 0.06 };
  TRACKS.forEach((t, k) => {
    const vol = ctx.createGain(), duck = ctx.createGain(), pan = ctx.createStereoPanner();
    const m = beat.mix[t];
    vol.gain.value = m.mute ? 0 : m.vol;
    pan.pan.value = m.pan ?? ({ hat: 0.25, ohat: -0.25, perc: 0.3, lead: -0.15, chord: 0.12 }[t] || 0);
    vol.connect(duck).connect(pan).connect(pre);
    const r = ctx.createGain(); r.gain.value = (sendRev[t] || 0) * (fx.rev ?? 1); duck.connect(r).connect(revIn);
    const d = ctx.createGain(); d.gain.value = (sendDly[t] || 0) * (fx.dly ?? 1); duck.connect(d).connect(dlyIn);
    g.bus[t] = { in: vol, duck, pan };
  });
  return g;
}
export function applyMix(g, beat) {
  TRACKS.forEach((t) => { const m = beat.mix[t]; g.bus[t].in.gain.setTargetAtTime(m.mute ? 0 : m.vol, g.ctx.currentTime, 0.02); });
}

function noiseSrc(g, t, dur) { const s = g.ctx.createBufferSource(); s.buffer = noiseBuf(g.ctx); s.loop = true; s.start(t, hash(Math.floor(t * 1000)) * 1.5); s.stop(t + dur); return s; }
const env = (a, t, v, att, dec) => { a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(v, t + att); a.gain.exponentialRampToValueAtTime(0.0008, t + att + dec); };

function kick(g, t, v, k) {
  const c = g.ctx, o = c.createOscillator(), a = c.createGain(), ws = c.createWaveShaper();
  ws.curve = curve(k.drive || 1.5);
  o.frequency.setValueAtTime(k.pitch, t); o.frequency.exponentialRampToValueAtTime(k.end, t + (k.sweep || 0.08));
  env(a, t, v, 0.002, k.decay);
  o.connect(ws).connect(a).connect(g.bus.kick.in); o.start(t); o.stop(t + k.decay + 0.08);
  if (k.click) { const n = noiseSrc(g, t, 0.02), f = c.createBiquadFilter(), ag = c.createGain(); f.type = 'highpass'; f.frequency.value = 2500; env(ag, t, v * k.click, 0.001, 0.012); n.connect(f).connect(ag).connect(g.bus.kick.in); }
  duck(g, t, k.duck ?? 0.35);
}
function duck(g, t, amt) {
  ['bass', 'chord', 'lead'].forEach((n) => {
    const p = g.bus[n].duck.gain, depth = n === 'bass' ? amt * 0.9 : amt * 0.55;
    p.setValueAtTime(1 - depth, t); p.setTargetAtTime(1, t + 0.012, n === 'bass' ? 0.05 : 0.11);
  });
}
function snare(g, t, v, s, bus = 'snare') {
  const c = g.ctx, n = noiseSrc(g, t, s.decay + 0.1), f = c.createBiquadFilter(), a = c.createGain();
  f.type = 'bandpass'; f.frequency.value = s.noiseHz || 2200; f.Q.value = 0.7; env(a, t, v * (s.noise ?? 0.8), 0.001, s.decay);
  n.connect(f).connect(a).connect(g.bus[bus].in);
  if (s.body) {
    const o = c.createOscillator(), b = c.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(s.tone * 1.6, t); o.frequency.exponentialRampToValueAtTime(s.tone, t + 0.04);
    env(b, t, v * s.body, 0.001, s.decay * 0.7); o.connect(b).connect(g.bus[bus].in); o.start(t); o.stop(t + s.decay + 0.1);
  }
}
function clap(g, t, v, s) {
  const c = g.ctx;
  for (let i = 0; i < 4; i++) {
    const tt = t + i * 0.011 * (i === 3 ? 1.6 : 1), n = noiseSrc(g, tt, 0.25), f = c.createBiquadFilter(), a = c.createGain();
    f.type = 'bandpass'; f.frequency.value = s.hz || 1500; f.Q.value = 1.1;
    env(a, tt, v * 0.55, 0.001, i === 3 ? s.decay : 0.012); n.connect(f).connect(a).connect(g.bus.clap.in);
  }
}
function rim(g, t, v) {
  const c = g.ctx, o = c.createOscillator(), a = c.createGain(), f = c.createBiquadFilter();
  o.type = 'square'; o.frequency.value = 820; f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 2; env(a, t, v * 0.5, 0.001, 0.035);
  o.connect(f).connect(a).connect(g.bus.perc.in); o.start(t); o.stop(t + 0.08);
}
function hat(g, t, v, h, open) {
  const c = g.ctx, dec = open ? h.open : h.decay, n = noiseSrc(g, t, dec + 0.05), f = c.createBiquadFilter(), a = c.createGain();
  f.type = 'highpass'; f.frequency.value = h.hp; f.Q.value = 0.9; env(a, t, v * 0.55, 0.001, dec);
  n.connect(f).connect(a).connect(g.bus[open ? 'ohat' : 'hat'].in);
  if (open) g.lastOpen = a; else if (g.lastOpen) { g.lastOpen.gain.cancelScheduledValues(t); g.lastOpen.gain.setTargetAtTime(0, t, 0.004); g.lastOpen = null; }
}
function perc(g, t, v, kind, vi) {
  const c = g.ctx;
  if (kind === 'rim') return rim(g, t, v);
  if (kind === 'shaker') { const n = noiseSrc(g, t, 0.1), f = c.createBiquadFilter(), a = c.createGain(); f.type = 'bandpass'; f.frequency.value = 6500; f.Q.value = 1.4; env(a, t, v * 0.5, 0.012, 0.05); n.connect(f).connect(a).connect(g.bus.perc.in); return; }
  const o = c.createOscillator(), a = c.createGain(), base = [196, 262, 330][vi % 3]; // conga/tom
  o.frequency.setValueAtTime(base * 1.25, t); o.frequency.exponentialRampToValueAtTime(base, t + 0.05); env(a, t, v * 0.7, 0.001, 0.16);
  o.connect(a).connect(g.bus.perc.in); o.start(t); o.stop(t + 0.25);
}
function bass808(g, t, midi, len, v, k, to) {
  const c = g.ctx, o = c.createOscillator(), o2 = c.createOscillator(), a = c.createGain(), ws = c.createWaveShaper(), pre = c.createGain();
  ws.curve = curve(k.drive || 2.2); o.type = 'sine'; o2.type = 'triangle'; pre.gain.value = 0.9;
  const f = mtof(midi), end = t + len, rel = k.release || 0.08;
  o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.012);
  o2.frequency.setValueAtTime(f * 2, t); o2.detune.value = 3;
  if (to != null) {
    const ft = mtof(to);
    [o, o2].forEach((x, i) => { x.frequency.setValueAtTime(f * (i ? 2 : 1), t + len * 0.3); x.frequency.exponentialRampToValueAtTime(ft * (i ? 2 : 1), t + len * 0.85); });
  }
  const og = c.createGain(); og.gain.value = 0.22;
  a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(v, t + 0.004);
  a.gain.setTargetAtTime(v * (k.sustain ?? 0.55), t + 0.02, k.decay || 0.9);
  a.gain.setValueAtTime(v * (k.sustain ?? 0.55) * 0.9, end); a.gain.exponentialRampToValueAtTime(0.0008, end + rel);
  o.connect(pre); o2.connect(og).connect(pre); pre.connect(ws).connect(a).connect(g.bus.bass.in);
  o.start(t); o2.start(t); o.stop(end + rel + 0.05); o2.stop(end + rel + 0.05);
}
function synthBass(g, t, midi, len, v, k) {
  const c = g.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), a = c.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = mtof(midi + 12); o2.frequency.value = mtof(midi);
  f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.18);
  const end = t + len; a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(v * 0.6, t + 0.006); a.gain.setValueAtTime(v * 0.5, end); a.gain.exponentialRampToValueAtTime(0.0008, end + 0.07);
  o.connect(f); o2.connect(f); f.connect(a).connect(g.bus.bass.in); o.start(t); o2.start(t); o.stop(end + 0.1); o2.stop(end + 0.1);
}
function whine(g, t, midi, len, v) { // lead "G-funk": serrucho con portamento y vibrato
  const c = g.ctx, o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), a = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(midi) * 0.94, t); o.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.07);
  l.frequency.value = 5.5; lg.gain.value = 9; l.connect(lg).connect(o.detune);
  f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 3;
  a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(v * 0.34, t + 0.03); a.gain.setValueAtTime(v * 0.3, t + len); a.gain.exponentialRampToValueAtTime(0.0008, t + len + 0.18);
  o.connect(f).connect(a).connect(g.bus.lead.in); o.start(t); l.start(t); o.stop(t + len + 0.25); l.stop(t + len + 0.25);
}
function bell(g, t, midi, len, v) {
  const c = g.ctx, f = mtof(midi), o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), a = c.createGain();
  o.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.7);
  m.connect(mg).connect(o.frequency);
  env(a, t, v * 0.4, 0.002, Math.max(0.6, len + 0.5)); o.connect(a).connect(g.bus.lead.in); o.start(t); m.start(t); o.stop(t + len + 1.4); m.stop(t + len + 1.4);
}
function pluck(g, t, midi, len, v) {
  const c = g.ctx, f = c.createBiquadFilter(), a = c.createGain();
  f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.25);
  env(a, t, v * 0.36, 0.003, Math.max(0.22, len * 0.8));
  [0, 7, -7].forEach((d) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + len + 0.6); });
  f.connect(a).connect(g.bus.lead.in);
}
function cowbell(g, t, midi, len, v) {
  const c = g.ctx, a = c.createGain(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
  const r = mtof(midi) / 440;
  [540, 800].forEach((hz) => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = hz * r; o.connect(f); o.start(t); o.stop(t + 0.4); });
  env(a, t, v * 0.5, 0.001, Math.max(0.18, Math.min(0.4, len))); f.connect(a).connect(g.bus.lead.in);
}
function rageSaw(g, t, midi, len, v) {
  const c = g.ctx, a = c.createGain(), f = c.createBiquadFilter(), ws = c.createWaveShaper(); ws.curve = curve(5);
  f.type = 'lowpass'; f.frequency.value = 4800; f.Q.value = 2;
  [-18, -9, 0, 9, 18].forEach((d) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = d; o.connect(ws); o.start(t); o.stop(t + len + 0.25); });
  a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(v * 0.17, t + 0.008); a.gain.setValueAtTime(v * 0.15, t + len); a.gain.exponentialRampToValueAtTime(0.0008, t + len + 0.12);
  ws.connect(f).connect(a).connect(g.bus.lead.in);
}
function softKeys(g, t, midi, len, v, bus = 'lead', amp = 1) { // piano eléctrico tipo Rhodes
  const c = g.ctx, f = mtof(midi), a = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
  env(a, t, v * 0.3 * amp, 0.004, Math.max(0.9, len * 1.2));
  [[1, 'sine', 1], [2, 'sine', 0.35], [4, 'sine', 0.08], [1.003, 'triangle', 0.4]].forEach(([m, type, lv]) => {
    const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f * m; og.gain.value = lv; o.connect(og).connect(lp); o.start(t); o.stop(t + len + 1.6);
  });
  lp.connect(a).connect(g.bus[bus].in);
}
function padVoice(g, t, midi, len, v, kind, bus = 'chord') {
  const c = g.ctx, a = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8;
  const strings = kind === 'strings';
  f.frequency.setValueAtTime(strings ? 2400 : 1100, t); f.frequency.linearRampToValueAtTime(strings ? 3200 : 1900, t + len * 0.6);
  const att = strings ? 0.12 : 0.18;
  a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(v * 0.14, t + att); a.gain.setValueAtTime(v * 0.12, t + len); a.gain.linearRampToValueAtTime(0.0001, t + len + 0.5);
  [-11, 0, 11].forEach((d) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + len + 0.6); });
  f.connect(a).connect(g.bus[bus].in);
}
function stab(g, t, midi, len, v, bus = 'chord') {
  const c = g.ctx, a = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(3600, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
  env(a, t, v * 0.22, 0.003, Math.max(0.16, len)); ['sawtooth', 'square'].forEach((ty, i) => { const o = c.createOscillator(); o.type = ty; o.frequency.value = mtof(midi) * (i ? 1.004 : 1); o.connect(f); o.start(t); o.stop(t + len + 0.4); });
  f.connect(a).connect(g.bus[bus].in);
}
function soulChop(g, t, midi, len, v) { // sensación de muestra de soul subida de tono, con vaivén de cinta
  const c = g.ctx, a = c.createGain(), bp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
  bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.6; lfo.frequency.value = 4.2; lg.gain.value = 14;
  env(a, t, v * 0.42, 0.01, Math.max(0.4, len * 0.9));
  [['sawtooth', 0], ['triangle', 5]].forEach(([ty, d]) => { const o = c.createOscillator(); o.type = ty; o.frequency.value = mtof(midi); o.detune.value = d; lfo.connect(lg).connect(o.detune); o.connect(bp); o.start(t); o.stop(t + len + 1); });
  lfo.start(t); lfo.stop(t + len + 1); bp.connect(a).connect(g.bus.chord.in);
}
export function crash(g, t, v = 0.6) { const c = g.ctx, n = noiseSrc(g, t, 2.4), f = c.createBiquadFilter(), a = c.createGain(); f.type = 'highpass'; f.frequency.value = 5000; env(a, t, v * 0.5, 0.002, 1.6); n.connect(f).connect(a).connect(g.bus.perc.in); }
export function riser(g, t, dur) { const c = g.ctx, n = noiseSrc(g, t, dur + 0.1), f = c.createBiquadFilter(), a = c.createGain(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur); a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(0.35, t + dur); a.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05); n.connect(f).connect(a).connect(g.bus.perc.in); }

const LEADS = { bell, pluck, cowbell, rage: rageSaw, keys: (g, t, m, l, v) => softKeys(g, t, m, l, v), whine, soul: soulChop, stab: (g, t, m, l, v) => stab(g, t, m, l, v, 'lead'), pad: (g, t, m, l, v) => padVoice(g, t, m, l, v, 'pad', 'lead') };

// Reproduce el contenido de un paso (16avos) en el instante `t`.
export function playStep(g, beat, step, t, sd, mask, absStep) {
  const D = beat.drum, K = beat.kit, i = step % beat.steps, on = (n) => !mask || mask[n] !== false;
  const hum = beat.human ?? 0.5;
  let ts = t + (i % 2 ? (beat.swing - 0.5) * 2 * sd : 0);
  const j = (n, amt) => (hash(absStep * 31 + n) - 0.5) * 2 * amt * hum;
  const vv = (n, v) => Math.min(1, Math.max(0.05, v * (1 + j(n + 7, 0.12))));
  if (on('kick') && D.kick[i] > 0) kick(g, ts + j(1, 0.002), vv(1, D.kick[i]), K.kick);
  if (on('snare') && D.snare[i] > 0) snare(g, ts + j(2, 0.003), vv(2, D.snare[i]), K.snare);
  if (on('clap') && D.clap[i] > 0) clap(g, ts + j(3, 0.003), vv(3, D.clap[i]), K.clap);
  if (on('hat') && D.hat[i] > 0) {
    const r = D.roll[i] || 0, v = D.hat[i];
    if (r > 1) for (let k = 0; k < r; k++) hat(g, ts + (k * sd) / r, vv(4 + k, v * (0.55 + 0.45 * ((k + 1) / r))), K.hat, false);
    else hat(g, ts + j(4, 0.005), vv(4, v), K.hat, false);
  }
  if (on('ohat') && D.ohat[i] > 0) hat(g, ts + j(5, 0.003), vv(5, D.ohat[i]), K.hat, true);
  if (on('perc') && D.perc[i] > 0) perc(g, ts + j(6, 0.004), vv(6, D.perc[i]), K.perc, i);
  if (on('bass')) beat.bass.filter((e) => e.s === i).forEach((e) => {
    const m = beat.bassBase + e.n, len = Math.max(0.1, e.l * sd - 0.01);
    if (K.bass.type === 'synth') synthBass(g, ts, m, len, e.v ?? 0.9, K.bass); else bass808(g, ts, m, len, e.v ?? 0.9, K.bass, e.to != null ? beat.bassBase + e.to : null);
  });
  if (on('lead')) beat.lead.filter((e) => e.s === i).forEach((e) => (LEADS[K.lead] || bell)(g, ts + j(8, 0.004), beat.leadBase + e.n, Math.max(0.12, e.l * sd), e.v ?? 0.8));
  if (on('chord')) beat.chord.filter((e) => e.s === i).forEach((e) => e.n.forEach((n, k) => {
    const m = beat.chordBase + n, len = e.l * sd, tt = ts + k * 0.004;
    if (K.chord === 'keys') softKeys(g, tt, m, len, e.v ?? 0.8, 'chord', 1);
    else if (K.chord === 'stab') stab(g, tt, m, len, e.v ?? 0.8);
    else if (K.chord === 'soul') soulChop(g, tt, m + 12, len, e.v ?? 0.8);
    else padVoice(g, tt, m, len, e.v ?? 0.8, K.chord);
  }));
}
export function preview(g, name, beat) {
  const t = g.ctx.currentTime + 0.01, K = beat.kit, sd = 60 / beat.bpm / 4;
  if (name === 'kick') kick(g, t, 0.95, K.kick);
  else if (name === 'snare') snare(g, t, 0.9, K.snare);
  else if (name === 'clap') clap(g, t, 0.9, K.clap);
  else if (name === 'hat') hat(g, t, 0.9, K.hat, false);
  else if (name === 'ohat') hat(g, t, 0.9, K.hat, true);
  else if (name === 'perc') perc(g, t, 0.9, K.perc, 1);
  else if (name === 'bass') { if (K.bass.type === 'synth') synthBass(g, t, beat.bassBase + 7, 0.5, 0.9, K.bass); else bass808(g, t, beat.bassBase + 7, 0.9, 0.95, K.bass); }
  else if (name === 'lead') (LEADS[K.lead] || bell)(g, t, beat.leadBase + 7, 0.5, 0.9);
  else if (name === 'chord') beat.chord.slice(0, 1).forEach((e) => e.n.forEach((n) => (K.chord === 'keys' ? softKeys(g, t, beat.chordBase + n, 1.2, 0.9, 'chord') : padVoice(g, t, beat.chordBase + n, 1.2, 0.9, K.chord))));
}

// Ambiente: crepitar de vinilo para lo-fi y similares.
export function startVinyl(g, t0, t1) {
  const c = g.ctx, b = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = b.getChannelData(0); let s = 4242;
  for (let i = 0; i < d.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const r = s / 4294967296; d[i] = (r - 0.5) * 0.012 + (r > 0.9996 ? (r - 0.9996) * 900 * (i % 2 ? 1 : -1) : 0); }
  const src = c.createBufferSource(); src.buffer = b; src.loop = true; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200; const gn = c.createGain(); gn.gain.value = 0.9;
  src.connect(f).connect(gn).connect(g.out); src.start(t0); src.stop(t1); return src;
}

// ---- Canción: estructura por secciones ----
export function songPlan(beat) {
  const all = Object.fromEntries(TRACKS.map((t) => [t, true]));
  const only = (...ks) => Object.fromEntries(TRACKS.map((t) => [t, ks.includes(t)]));
  const secs = [
    { name: 'Intro', loops: 1, mask: only('chord', 'lead', 'hat', 'perc') },
    { name: 'Verso 1', loops: 2, mask: only('kick', 'snare', 'clap', 'hat', 'ohat', 'perc', 'bass', 'chord') },
    { name: 'Estribillo', loops: 2, mask: all },
    { name: 'Verso 2', loops: 2, mask: only('kick', 'snare', 'clap', 'hat', 'ohat', 'perc', 'bass', 'chord', 'lead') },
    { name: 'Estribillo', loops: 2, mask: all },
    { name: 'Puente', loops: 1, mask: only('chord', 'lead', 'perc', 'bass') },
    { name: 'Final', loops: 1, mask: only('chord', 'lead', 'kick', 'snare') },
  ];
  let a = 0; secs.forEach((s) => { s.from = a; a += s.loops; }); return { secs, loops: a };
}
export function sectionAt(plan, loop) { return plan.secs.find((s) => loop >= s.from && loop < s.from + s.loops) || null; }

// Programa un tramo [from, to) de pasos absolutos. `mode`: 'loop' | 'song'.
export function scheduleSteps(g, beat, from, to, t0, mode, plan) {
  const sd = 60 / beat.bpm / 4;
  for (let s = from; s < to; s++) {
    const loop = Math.floor(s / beat.steps), idx = s % beat.steps, t = t0 + s * sd;
    let mask = null;
    if (mode === 'song') {
      const sec = sectionAt(plan, loop);
      if (!sec) continue;
      mask = sec.mask;
      if (idx === 0 && s > 0 && sec.from === loop) crash(g, t, 0.55);
      if (idx === beat.steps - 16 && loop === sec.from + sec.loops - 1) { const nx = sectionAt(plan, loop + 1); if (nx && nx.name === 'Estribillo') riser(g, t, sd * 16); }
    }
    playStep(g, beat, idx, t, sd, mask, s);
  }
}

// ---- WAV ----
export function encodeWav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const d = []; for (let c = 0; c < ch; c++) d.push(buf.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, d[c][i])); out.setInt16(o, x < 0 ? x * 32768 : x * 32767, true); o += 2; }
  return new Uint8Array(out.buffer);
}
export async function renderBeat(beat, mode) {
  const sd = 60 / beat.bpm / 4, plan = songPlan(beat), loops = mode === 'song' ? plan.loops : 4, total = loops * beat.steps, tail = 3;
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil((total * sd + tail) * sr), sr), g = createGraph(ctx, beat);
  scheduleSteps(g, beat, 0, total, 0.05, mode === 'song' ? 'song' : 'loop', plan);
  if (beat.kit.fx.vinyl) startVinyl(g, 0, total * sd + tail);
  return encodeWav(await ctx.startRendering());
}
