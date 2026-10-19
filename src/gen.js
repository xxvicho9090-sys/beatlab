// Generador de beats: cada estilo de rap de EE. UU. tiene su propio kit, tempo, escala,
// ritmo de bombo/caja/hats, lógica de 808 y de melodía. Todo se deriva de una semilla.
import { TRACKS } from './audio.js';

export const SCALES = {
  minor: { n: 'menor', i: [0, 2, 3, 5, 7, 8, 10] },
  phrygian: { n: 'frigio', i: [0, 1, 3, 5, 7, 8, 10] },
  harmonic: { n: 'menor armónica', i: [0, 2, 3, 5, 7, 8, 11] },
  dorian: { n: 'dórico', i: [0, 2, 3, 5, 7, 9, 10] },
  major: { n: 'mayor', i: [0, 2, 4, 5, 7, 9, 11] },
};
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const kick = (pitch, end, decay, o = {}) => ({ pitch, end, decay, click: 0.25, drive: 1.6, ...o });
const SN = (o) => ({ tone: 190, decay: 0.18, noise: 0.8, body: 0.5, noiseHz: 2300, ...o });

// kick/snare/hat/…: posiciones base (0-15) + variaciones; bass: estrategia; lead: densidad.
export const PRESETS = {
  trap: {
    name: 'Trap', city: 'Atlanta', era: '2012 – hoy', refs: 'Metro Boomin · Future · 21 Savage · Travis Scott · Gucci Mane',
    bpm: [132, 146], scales: ['minor', 'phrygian', 'harmonic'], swing: 0.5,
    kick: { base: [0], extra: [3, 6, 7, 10, 11, 14], n: [2, 4] }, snare: { pos: [8], clap: true },
    hat: { grid: 2, roll: 0.35, accent: [0, 4, 8, 12] }, ohat: { pos: [14], p: 0.5 }, perc: null,
    bass: 'kick', slide: 0.12, lead: { dens: 0.28, range: [0, 9], oct: 1 }, chordRhythm: 'whole', prog: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 0, 5, 6]],
    kit: { kick: kick(135, 44, 0.55, { drive: 2 }), snare: SN({ tone: 200, decay: 0.2 }), clap: { hz: 1500, decay: 0.2 }, hat: { hp: 7500, decay: 0.035, open: 0.2 }, perc: 'rim', bass: { type: '808', decay: 1.1, sustain: 0.6, drive: 2.4 }, lead: 'bell', chord: 'pad', fx: { gain: 0.6, rev: 0.9, dly: 0.9, sat: 1.4 } },
  },
  melodic: {
    name: 'Trap melódico', city: 'Atlanta / Miami', era: '2016 – hoy', refs: 'Future · Lil Uzi Vert · Juice WRLD · Roddy Ricch · Lil Baby',
    bpm: [140, 156], scales: ['minor', 'harmonic', 'dorian'], swing: 0.5,
    kick: { base: [0], extra: [7, 10, 11, 14], n: [1, 3] }, snare: { pos: [8], clap: true },
    hat: { grid: 2, roll: 0.3, accent: [0, 4, 8, 12] }, ohat: { pos: [6, 14], p: 0.35 }, perc: null,
    bass: 'kick', slide: 0.08, lead: { dens: 0.55, range: [2, 14], oct: 1, arp: true }, chordRhythm: 'half', prog: [[0, 5, 2, 6], [5, 6, 0, 0], [0, 2, 5, 4]],
    kit: { kick: kick(130, 46, 0.45), snare: SN({ tone: 210, decay: 0.16 }), clap: { hz: 1700, decay: 0.16 }, hat: { hp: 8000, decay: 0.03, open: 0.18 }, perc: 'rim', bass: { type: '808', decay: 0.9, sustain: 0.55, drive: 2 }, lead: 'pluck', chord: 'keys', fx: { gain: 0.75, rev: 1.1, dly: 1.2 } },
  },
  rage: {
    name: 'Rage', city: 'Atlanta', era: '2020 – hoy', refs: 'Playboi Carti · Ken Carson · Yeat · Destroy Lonely',
    bpm: [142, 158], scales: ['minor', 'phrygian'], swing: 0.5,
    kick: { base: [0, 6], extra: [3, 10, 11, 14], n: [1, 3] }, snare: { pos: [8], clap: true },
    hat: { grid: 2, roll: 0.25, accent: [0, 8] }, ohat: null, perc: null,
    bass: 'kick', slide: 0.2, lead: { dens: 0.4, range: [7, 16], oct: 1 }, chordRhythm: 'half', prog: [[0, 6, 5, 6], [0, 0, 5, 4]],
    kit: { kick: kick(150, 42, 0.5, { drive: 3, click: 0.4 }), snare: SN({ tone: 220, decay: 0.15, noise: 1 }), clap: { hz: 1800, decay: 0.14 }, hat: { hp: 8500, decay: 0.03, open: 0.16 }, perc: 'rim', bass: { type: '808', decay: 1, sustain: 0.65, drive: 3.4 }, lead: 'rage', chord: 'pad', fx: { gain: 0.5, rev: 0.7, dly: 0.8, sat: 2 } },
  },
  boombap: {
    name: 'Boom bap', city: 'Nueva York', era: '1988 – 2000', refs: 'Nas · DJ Premier · Pete Rock · Wu-Tang Clan · Mobb Deep · Notorious B.I.G.',
    bpm: [84, 96], scales: ['dorian', 'minor', 'harmonic'], swing: 0.6,
    kick: { base: [0, 10], extra: [3, 7, 13], n: [1, 2] }, snare: { pos: [4, 12], clap: false },
    hat: { grid: 2, roll: 0, accent: [0, 4, 8, 12], sparse: 0.12 }, ohat: { pos: [14], p: 0.3 }, perc: null,
    bass: 'groove', slide: 0, lead: { dens: 0.3, range: [0, 9], oct: 0 }, chordRhythm: 'chop', prog: [[0, 3, 0, 4], [0, 5, 3, 4], [0, 2, 3, 4]],
    kit: { kick: kick(120, 50, 0.3, { drive: 1.3, click: 0.35 }), snare: SN({ tone: 185, decay: 0.2, noise: 0.9 }), clap: { hz: 1400, decay: 0.2 }, hat: { hp: 6500, decay: 0.045, open: 0.2 }, perc: 'rim', bass: { type: '808', decay: 0.4, sustain: 0.5, drive: 1.6, release: 0.05 }, lead: 'keys', chord: 'soul', fx: { rev: 0.7, dly: 0.5, lp: 7500, vinyl: true, sat: 1.5 } },
  },
  soul: {
    name: 'Soul chop', city: 'Chicago / Nueva York', era: '2000 – 2010', refs: 'Kanye West · Jay-Z · Just Blaze · Common · Lupe Fiasco',
    bpm: [86, 98], scales: ['major', 'dorian', 'minor'], swing: 0.58,
    kick: { base: [0, 9], extra: [3, 6, 12, 14], n: [1, 2] }, snare: { pos: [4, 12], clap: true },
    hat: { grid: 2, roll: 0, accent: [0, 4, 8, 12], sparse: 0.1 }, ohat: { pos: [14], p: 0.4 }, perc: 'shaker',
    bass: 'groove', slide: 0, lead: { dens: 0.35, range: [0, 11], oct: 1 }, chordRhythm: 'chop', prog: [[0, 5, 3, 4], [0, 3, 4, 0], [5, 3, 0, 4]],
    kit: { kick: kick(125, 48, 0.32, { drive: 1.4 }), snare: SN({ tone: 190, decay: 0.19 }), clap: { hz: 1500, decay: 0.18 }, hat: { hp: 7000, decay: 0.04, open: 0.2 }, perc: 'shaker', bass: { type: '808', decay: 0.5, sustain: 0.5, drive: 1.6, release: 0.06 }, lead: 'soul', chord: 'soul', fx: { rev: 0.8, dly: 0.5, lp: 11000, sat: 1.4 } },
  },
  gfunk: {
    name: 'G-funk', city: 'Los Ángeles', era: '1992 – 1999', refs: 'Dr. Dre · Snoop Dogg · Warren G · Nate Dogg · Ice Cube',
    bpm: [90, 100], scales: ['dorian', 'minor'], swing: 0.55,
    kick: { base: [0, 10], extra: [3, 7, 14], n: [1, 2] }, snare: { pos: [4, 12], clap: true },
    hat: { grid: 2, roll: 0, accent: [0, 4, 8, 12], sparse: 0.08 }, ohat: { pos: [6, 14], p: 0.5 }, perc: 'shaker',
    bass: 'funk', slide: 0, lead: { dens: 0.45, range: [4, 14], oct: 1, hold: true }, chordRhythm: 'chop', prog: [[0, 3, 0, 4], [0, 5, 3, 4], [0, 0, 3, 3]],
    kit: { kick: kick(118, 52, 0.28, { drive: 1.2, click: 0.35 }), snare: SN({ tone: 180, decay: 0.17, noise: 0.85 }), clap: { hz: 1300, decay: 0.2 }, hat: { hp: 7000, decay: 0.04, open: 0.22 }, perc: 'shaker', bass: { type: 'synth' }, lead: 'whine', chord: 'keys', fx: { rev: 0.8, dly: 0.6, sat: 1.3 } },
  },
  chidrill: {
    name: 'Drill Chicago', city: 'Chicago', era: '2011 – 2016', refs: 'Chief Keef · Lil Durk · King Von · G Herbo',
    bpm: [136, 144], scales: ['phrygian', 'minor'], swing: 0.5,
    kick: { base: [0], extra: [3, 7, 10, 11, 14], n: [2, 3] }, snare: { pos: [8], clap: false },
    hat: { grid: 2, roll: 0.45, accent: [0, 8], trip: true }, ohat: null, perc: 'rim',
    bass: 'kick', slide: 0.35, lead: { dens: 0.22, range: [0, 7], oct: 1 }, chordRhythm: 'whole', prog: [[0, 1, 0, 6], [0, 5, 1, 0]],
    kit: { kick: kick(140, 43, 0.6, { drive: 2.2 }), snare: SN({ tone: 210, decay: 0.2, noise: 0.95 }), clap: { hz: 1500, decay: 0.2 }, hat: { hp: 7800, decay: 0.03, open: 0.14 }, perc: 'rim', bass: { type: '808', decay: 1.2, sustain: 0.6, drive: 2.6 }, lead: 'bell', chord: 'strings', fx: { gain: 0.65, rev: 1.1, dly: 0.9, sat: 1.5 } },
  },
  nydrill: {
    name: 'Drill Nueva York', city: 'Brooklyn', era: '2019 – hoy', refs: 'Pop Smoke · Fivio Foreign · Sheff G · Sleepy Hallow · Kay Flock',
    bpm: [138, 146], scales: ['phrygian', 'minor', 'harmonic'], swing: 0.5,
    kick: { base: [0, 6], extra: [3, 10, 13, 14], n: [2, 3] }, snare: { pos: [8], clap: true },
    hat: { grid: 2, roll: 0.5, accent: [0, 8], trip: true }, ohat: { pos: [14], p: 0.3 }, perc: 'rim',
    bass: 'kick', slide: 0.45, lead: { dens: 0.3, range: [0, 9], oct: 1 }, chordRhythm: 'half', prog: [[0, 5, 1, 0], [0, 6, 5, 0]],
    kit: { kick: kick(138, 42, 0.62, { drive: 2.4 }), snare: SN({ tone: 215, decay: 0.19 }), clap: { hz: 1600, decay: 0.19 }, hat: { hp: 8000, decay: 0.03, open: 0.14 }, perc: 'rim', bass: { type: '808', decay: 1.3, sustain: 0.62, drive: 2.8 }, lead: 'pluck', chord: 'strings', fx: { gain: 0.65, rev: 0.9, dly: 1, sat: 1.6 } },
  },
  crunk: {
    name: 'Crunk', city: 'Atlanta / Memphis', era: '2000 – 2006', refs: 'Lil Jon · Three 6 Mafia · Ying Yang Twins · Ludacris · Youngbloodz',
    bpm: [72, 80], scales: ['minor', 'phrygian'], swing: 0.5, double: true,
    kick: { base: [0, 8], extra: [3, 6, 11, 14], n: [1, 2] }, snare: { pos: [4, 12], clap: true },
    hat: { grid: 2, roll: 0, accent: [0, 4, 8, 12] }, ohat: { pos: [2, 6, 10, 14], p: 0.6 }, perc: null,
    bass: 'kick', slide: 0, lead: { dens: 0.3, range: [0, 7], oct: 0, stab: true }, chordRhythm: 'stab', prog: [[0, 0, 5, 6], [0, 3, 0, 4]],
    kit: { kick: kick(125, 46, 0.5, { drive: 2.2 }), snare: SN({ tone: 190, decay: 0.2, noise: 1 }), clap: { hz: 1300, decay: 0.26 }, hat: { hp: 6500, decay: 0.05, open: 0.24 }, perc: 'rim', bass: { type: '808', decay: 1, sustain: 0.6, drive: 2.4 }, lead: 'stab', chord: 'stab', fx: { gain: 0.8, rev: 0.5, dly: 0.3, sat: 1.8 } },
  },
  phonk: {
    name: 'Phonk', city: 'Memphis', era: '1995 – hoy', refs: 'Three 6 Mafia · DJ Paul · Gangsta Boo · Tommy Wright III · Kordhell',
    bpm: [128, 142], scales: ['phrygian', 'minor', 'harmonic'], swing: 0.52,
    kick: { base: [0], extra: [3, 6, 7, 10, 11, 14], n: [2, 4] }, snare: { pos: [8], clap: true },
    hat: { grid: 2, roll: 0.3, accent: [0, 4, 8, 12], trip: true }, ohat: { pos: [14], p: 0.5 }, perc: 'rim',
    bass: 'kick', slide: 0.2, lead: { dens: 0.5, range: [0, 9], oct: 1, cow: true }, chordRhythm: 'whole', prog: [[0, 1, 0, 6], [0, 5, 0, 4]],
    kit: { kick: kick(145, 42, 0.6, { drive: 3, click: 0.4 }), snare: SN({ tone: 195, decay: 0.2, noise: 1 }), clap: { hz: 1400, decay: 0.22 }, hat: { hp: 7000, decay: 0.04, open: 0.2 }, perc: 'rim', bass: { type: '808', decay: 1.1, sustain: 0.65, drive: 3.6 }, lead: 'cowbell', chord: 'pad', fx: { gain: 0.55, rev: 0.7, dly: 0.7, sat: 2.2, lp: 14000 } },
  },
  screwed: {
    name: 'Chopped & screwed', city: 'Houston', era: '1990 – hoy', refs: 'DJ Screw · UGK · Slim Thug · Travis Scott · Paul Wall',
    bpm: [62, 72], scales: ['minor', 'dorian', 'phrygian'], swing: 0.52,
    kick: { base: [0], extra: [6, 10, 11], n: [1, 2] }, snare: { pos: [8], clap: true },
    hat: { grid: 2, roll: 0.12, accent: [0, 8], sparse: 0.15 }, ohat: { pos: [14], p: 0.5 }, perc: 'rim',
    bass: 'sustain', slide: 0.1, lead: { dens: 0.2, range: [0, 9], oct: 1 }, chordRhythm: 'whole', prog: [[0, 5, 2, 6], [0, 3, 5, 4]],
    kit: { kick: kick(120, 44, 0.7, { drive: 2 }), snare: SN({ tone: 170, decay: 0.28 }), clap: { hz: 1100, decay: 0.3 }, hat: { hp: 6000, decay: 0.05, open: 0.28 }, perc: 'rim', bass: { type: '808', decay: 1.6, sustain: 0.7, drive: 2.2 }, lead: 'pad', chord: 'pad', fx: { gain: 0.7, rev: 1.4, dly: 1.1, revTime: 3, lp: 9000 } },
  },
  hyphy: {
    name: 'Hyphy', city: 'Área de la Bahía', era: '2002 – 2008', refs: 'E-40 · Mac Dre · Too Short · Keak da Sneak · The Pack',
    bpm: [98, 108], scales: ['minor', 'dorian'], swing: 0.5,
    kick: { base: [0, 6, 10], extra: [3, 13, 14], n: [1, 2] }, snare: { pos: [4, 12], clap: true },
    hat: { grid: 2, roll: 0.1, accent: [0, 4, 8, 12] }, ohat: { pos: [2, 10], p: 0.5 }, perc: 'shaker',
    bass: 'funk', slide: 0, lead: { dens: 0.35, range: [0, 9], oct: 1, stab: true }, chordRhythm: 'stab', prog: [[0, 0, 3, 4], [0, 5, 3, 4]],
    kit: { kick: kick(122, 50, 0.3, { drive: 1.6 }), snare: SN({ tone: 185, decay: 0.15, noise: 0.95 }), clap: { hz: 1500, decay: 0.17 }, hat: { hp: 7500, decay: 0.035, open: 0.2 }, perc: 'shaker', bass: { type: 'synth' }, lead: 'stab', chord: 'stab', fx: { rev: 0.5, dly: 0.5, sat: 1.7 } },
  },
  lofi: {
    name: 'Lo-fi / Jazz rap', city: 'Costa Este y Oeste', era: '1993 – hoy', refs: 'J Dilla · A Tribe Called Quest · MF DOOM · Madlib · Nujabes',
    bpm: [72, 88], scales: ['dorian', 'minor', 'major'], swing: 0.64,
    kick: { base: [0, 10], extra: [3, 7, 13], n: [1, 2] }, snare: { pos: [4, 12], clap: false },
    hat: { grid: 2, roll: 0, accent: [0, 4, 8, 12], sparse: 0.2 }, ohat: { pos: [14], p: 0.3 }, perc: 'shaker',
    bass: 'groove', slide: 0, lead: { dens: 0.3, range: [0, 11], oct: 1 }, chordRhythm: 'chop', prog: [[1, 4, 0, 0], [0, 5, 1, 4], [3, 4, 0, 5]], sevenths: true,
    kit: { kick: kick(110, 50, 0.26, { drive: 1.1, click: 0.2 }), snare: SN({ tone: 175, decay: 0.2, noise: 0.7, noiseHz: 1800 }), clap: { hz: 1200, decay: 0.2 }, hat: { hp: 6000, decay: 0.04, open: 0.16 }, perc: 'shaker', bass: { type: '808', decay: 0.35, sustain: 0.5, drive: 1.3, release: 0.05 }, lead: 'keys', chord: 'keys', fx: { rev: 0.9, dly: 0.5, lp: 5200, vinyl: true, sat: 1.2 } },
  },
  cloud: {
    name: 'Cloud rap', city: 'Harlem / Atlanta', era: '2009 – hoy', refs: 'A$AP Rocky · Clams Casino · Lil B · Travis Scott · Yung Lean',
    bpm: [128, 140], scales: ['minor', 'dorian', 'harmonic'], swing: 0.5, half: true,
    kick: { base: [0], extra: [10, 14], n: [1, 2] }, snare: { pos: [8], clap: true },
    hat: { grid: 4, roll: 0.1, accent: [0, 8], sparse: 0.3 }, ohat: { pos: [14], p: 0.5 }, perc: null,
    bass: 'sustain', slide: 0.1, lead: { dens: 0.25, range: [4, 14], oct: 1 }, chordRhythm: 'whole', prog: [[0, 5, 2, 6], [0, 3, 0, 5]], sevenths: true,
    kit: { kick: kick(118, 46, 0.5, { drive: 1.4, click: 0.1 }), snare: SN({ tone: 180, decay: 0.28, noise: 0.7 }), clap: { hz: 1300, decay: 0.3 }, hat: { hp: 7000, decay: 0.05, open: 0.3 }, perc: 'rim', bass: { type: '808', decay: 1.3, sustain: 0.6, drive: 1.8 }, lead: 'bell', chord: 'strings', fx: { gain: 0.85, rev: 1.7, dly: 1.3, revTime: 3.4, sat: 1.1 } },
  },
};
export const ORDER = ['trap', 'melodic', 'rage', 'boombap', 'soul', 'gfunk', 'chidrill', 'nydrill', 'crunk', 'phonk', 'screwed', 'hyphy', 'lofi', 'cloud'];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const zeros = (n) => new Array(n).fill(0);
const noteAt = (sc, d) => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

function chordNotes(sc, d, sev) {
  const n = [noteAt(sc, d), noteAt(sc, d + 2), noteAt(sc, d + 4)];
  if (sev) n.push(noteAt(sc, d + 6));
  return n;
}
function voice(prev, notes) { // inversión más cercana al acorde anterior, dentro de un registro cómodo
  let best = notes, bd = Infinity;
  for (let inv = 0; inv < notes.length; inv++) {
    const v = notes.map((n, k) => (k < inv ? n + 12 : n));
    for (const sh of [-12, 0]) {
      const w = v.map((x) => x + sh), c = w.reduce((a, b) => a + b, 0) / w.length;
      const d = prev ? Math.abs(c - prev) : Math.abs(c - 7);
      if (d < bd) { bd = d; best = w; }
    }
  }
  return best;
}

export const emptyMix = () => Object.fromEntries(TRACKS.map((t) => [t, { vol: { kick: 0.72, snare: 0.75, clap: 0.6, hat: 0.5, ohat: 0.45, perc: 0.45, bass: 0.5, lead: 0.6, chord: 0.55 }[t], mute: false }]));

// opts: { seed, bpm, key, scale, lock:{track:true}, prev: beat (para conservar pistas bloqueadas) }
export function generate(id, opts = {}) {
  const P = PRESETS[id], seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31), r = rng(seed);
  const bpm = opts.bpm ?? Math.round(P.bpm[0] + r() * (P.bpm[1] - P.bpm[0]));
  const key = opts.key ?? Math.floor(r() * 12);
  const scale = opts.scale ?? pick(r, P.scales);
  const sc = SCALES[scale].i, steps = 64;
  const beat = {
    v: 1, genre: id, seed, bpm, key, scale, steps, swing: P.swing, human: 0.5,
    drum: { kick: zeros(steps), snare: zeros(steps), clap: zeros(steps), hat: zeros(steps), ohat: zeros(steps), perc: zeros(steps), roll: zeros(steps) },
    bass: [], lead: [], chord: [], mix: emptyMix(), kit: P.kit,
    bassBase: 24 + key + (key > 6 ? -12 : 0) + 12, leadBase: 60 + key, chordBase: 48 + key,
    name: `${P.name} · ${KEYS[key]}${scale === 'major' ? '' : 'm'}`,
  };
  if (beat.bassBase > 40) beat.bassBase -= 12;
  const prog = opts.prog ?? pick(r, P.prog);
  beat.prog = prog;
  const bars = 4, B = 16;

  // ---------- batería ----------
  for (let b = 0; b < bars; b++) {
    const o = b * B, fill = b === 3, vary = b === 1 || b === 3;
    let kicks = [...P.kick.base];
    const [lo, hi] = P.kick.n, ex = [...P.kick.extra];
    const nEx = lo + Math.floor(r() * (hi - lo + 1));
    for (let k = 0; k < nEx && ex.length; k++) kicks.push(ex.splice(Math.floor(r() * ex.length), 1)[0]);
    if (b === 0 || !beat._kicksCache) beat._kicksCache = beat._kicksCache || kicks;
    kicks = b === 2 ? beat._kicksCache : (vary && b !== 0 ? [...new Set([...beat._kicksCache, ...kicks.slice(-1)])] : (b === 0 ? beat._kicksCache : kicks));
    kicks.forEach((s) => { beat.drum.kick[o + s] = s === 0 ? 1 : 0.8 + r() * 0.15; });
    P.snare.pos.forEach((s) => { beat.drum.snare[o + s] = 0.95; if (P.snare.clap) beat.drum.clap[o + s] = 0.85; });
    if (fill) { [12, 13, 14, 15].forEach((s, k) => { if (r() < 0.8) { beat.drum.snare[o + s] = 0.5 + k * 0.12; } }); }
    // hats
    const H = P.hat, g = H.grid;
    for (let s = 0; s < B; s += g) {
      if (H.sparse && r() < H.sparse) continue;
      const acc = H.accent.includes(s);
      beat.drum.hat[o + s] = acc ? 0.9 : 0.5 + r() * 0.25;
    }
    if (H.roll && r() < (fill ? 1 : H.roll)) {
      const at = pick(r, [6, 7, 10, 11, 14, 15]);
      beat.drum.hat[o + at] = 0.85; beat.drum.roll[o + at] = H.trip ? 3 : pick(r, [2, 3, 4]);
      if (r() < 0.5) { const at2 = pick(r, [13, 14, 15]); beat.drum.hat[o + at2] = 0.8; beat.drum.roll[o + at2] = pick(r, [3, 4, 6]); }
    }
    if (H.trip && !fill) { for (let s = 0; s < B; s += 4) if (r() < 0.35) { beat.drum.hat[o + s + 2] = 0.7; beat.drum.roll[o + s + 2] = 3; } }
    if (P.ohat && (b % 2 === 1 || r() < 0.4)) P.ohat.pos.forEach((s) => { if (r() < P.ohat.p) { beat.drum.ohat[o + s] = 0.7; beat.drum.hat[o + s] = 0; beat.drum.roll[o + s] = 0; } });
    if (P.perc) { for (let s = 0; s < B; s += 2) if (r() < (P.perc === 'shaker' ? 0.7 : 0.18)) beat.drum.perc[o + s + (P.perc === 'shaker' ? 0 : 1)] = 0.4 + r() * 0.3; }
    // reggaeton-like doble tiempo en crunk: hat extra
  }
  delete beat._kicksCache;

  // ---------- acordes ----------
  let prevC = null;
  prog.forEach((d, b) => {
    const notes = voice(prevC, chordNotes(sc, d, P.sevenths)); prevC = notes.reduce((a, c) => a + c, 0) / notes.length;
    const o = b * B, R = P.chordRhythm;
    if (R === 'whole') beat.chord.push({ s: o, l: 16, n: notes, v: 0.8 });
    else if (R === 'half') { beat.chord.push({ s: o, l: 8, n: notes, v: 0.8 }); beat.chord.push({ s: o + 8, l: 8, n: notes, v: 0.7 }); }
    else if (R === 'stab') [0, 3, 6, 10].forEach((s) => { if (s === 0 || r() < 0.7) beat.chord.push({ s: o + s, l: 2, n: notes, v: s === 0 ? 0.9 : 0.7 }); });
    else [0, 3, 6, 10, 12].forEach((s) => { if (s === 0 || r() < 0.65) beat.chord.push({ s: o + s, l: s === 0 ? 3 : 2, n: notes, v: s === 0 ? 0.85 : 0.65 }); });
  });

  // ---------- bajo / 808 ----------
  const rootAt = (b) => noteAt(sc, prog[b]) % 12;
  for (let b = 0; b < bars; b++) {
    const o = b * B, root = rootAt(b), fifth = (root + 7) % 12;
    if (P.bass === 'kick') {
      const ks = []; for (let s = 0; s < B; s++) if (beat.drum.kick[o + s] > 0) ks.push(s);
      ks.forEach((s, k) => {
        const nxt = k + 1 < ks.length ? ks[k + 1] : B + ks[0], l = Math.max(1, Math.min(nxt - s, 8));
        const e = { s: o + s, l, n: root, v: 0.95 };
        if (r() < P.slide && l >= 2) e.to = root + pick(r, [-2, -1, 1, 2, 5, 7, -5, 12]);
        if (k > 0 && r() < 0.15) e.n = fifth;
        beat.bass.push(e);
      });
    } else if (P.bass === 'sustain') {
      beat.bass.push({ s: o, l: 12, n: root, v: 0.95 });
      if (r() < 0.6) beat.bass.push({ s: o + 12, l: 4, n: r() < 0.5 ? fifth : root, v: 0.85 });
    } else {
      const pat = P.bass === 'funk' ? [0, 3, 6, 8, 10, 11, 14] : [0, 3, 6, 10, 14];
      pat.forEach((s, k) => {
        if (k > 0 && r() > (P.bass === 'funk' ? 0.72 : 0.55)) return;
        const n = k === 0 ? root : pick(r, [root, root, fifth, (root + 12) % 24, noteAt(sc, prog[b] + 2) % 12]);
        beat.bass.push({ s: o + s, l: k + 1 < pat.length ? Math.min(2, pat[k + 1] - s) : 2, n, v: k === 0 ? 0.95 : 0.8 });
      });
    }
  }

  // ---------- melodía ----------
  const L = P.lead, motifs = [];
  const mk = () => {
    const ev = []; let deg = pick(r, [0, 2, 4]); const pos = [];
    for (let s = 0; s < B; s += (L.arp ? 1 : 2)) { if (s === 0 || r() < L.dens * (L.arp ? 0.55 : 1) * (s % 4 === 0 ? 1.4 : 1)) pos.push(s); }
    pos.forEach((s, k) => {
      const step = pick(r, [-2, -1, -1, 0, 1, 1, 2]);
      deg = Math.max(-2, Math.min(9, deg + step));
      const nx = k + 1 < pos.length ? pos[k + 1] : B, l = L.hold ? Math.max(2, nx - s) : Math.max(1, Math.min(nx - s, L.stab ? 2 : 4));
      ev.push({ s, l, d: deg, v: 0.6 + r() * 0.35 });
    });
    return ev;
  };
  const A = mk(), Bm = mk();
  for (let b = 0; b < bars; b++) {
    const motif = b === 3 ? Bm : (b === 1 && r() < 0.5 ? Bm : A), cd = prog[b];
    motif.forEach((m, k) => {
      let d = m.d; const strong = m.s % 4 === 0;
      if (strong) { const ch = [cd, cd + 2, cd + 4]; d = ch.reduce((a, c) => (Math.abs(c - d) < Math.abs(a - d) ? c : a), ch[0]); }
      const n = noteAt(sc, d) + (L.oct ? 12 : 0);
      if (b > 0 && r() < 0.12) return;
      beat.lead.push({ s: b * B + m.s, l: m.l, n: n % 36, v: m.v });
    });
  }
  beat.leadBase = 60 + key - (L.oct ? 12 : 0) + (P.kit.lead === 'whine' ? 0 : 0);

  // ---------- pistas bloqueadas ----------
  if (opts.prev && opts.lock) {
    TRACKS.forEach((t) => {
      if (!opts.lock[t]) return;
      if (['kick', 'snare', 'clap', 'hat', 'ohat', 'perc'].includes(t)) { beat.drum[t] = opts.prev.drum[t].slice(); if (t === 'hat') beat.drum.roll = opts.prev.drum.roll.slice(); }
      else beat[t] = JSON.parse(JSON.stringify(opts.prev[t]));
    });
    TRACKS.forEach((t) => { if (opts.prev.mix[t]) beat.mix[t] = { ...opts.prev.mix[t] }; });
  }
  return beat;
}

// Regenera solo una pista conservando el resto.
export function rerollTrack(beat, track) {
  const keep = {}; TRACKS.forEach((t) => { keep[t] = t !== track && !(track === 'hat' && t === 'hat'); });
  const lock = {}; TRACKS.forEach((t) => { lock[t] = t !== track; });
  if (['kick', 'snare', 'clap', 'ohat', 'perc'].includes(track)) lock.hat = true;
  const nb = generate(beat.genre, { seed: Math.floor(Math.random() * 2 ** 31), bpm: beat.bpm, key: beat.key, scale: beat.scale, prog: beat.prog, lock, prev: beat });
  nb.seed = beat.seed; nb.name = beat.name; nb.swing = beat.swing; nb.human = beat.human; nb.mix = beat.mix;
  // La progresión se mantiene: acordes y bajo vienen de `prev` si están bloqueados; si no, se regeneran con otra semilla.
  return nb;
}
