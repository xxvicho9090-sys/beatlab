// Exporta el beat como archivo MIDI (4 compases, una pista por instrumento) para abrirlo en FL Studio, Ableton, GarageBand, etc.
const PPQ = 480, STEP = PPQ / 4;
const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const text = (s) => Array.from(new TextEncoder().encode(s));
function track(name, events, tempo) {
  const ev = events.slice().sort((a, b) => a.t - b.t || a.off - b.off); const d = [];
  d.push(0, 0xff, 0x03, name.length, ...text(name));
  if (tempo) { const us = Math.round(60000000 / tempo); d.push(0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255, 0, 0xff, 0x58, 4, 4, 2, 24, 8); }
  let last = 0;
  ev.forEach((e) => { d.push(...vlq(e.t - last), (e.off ? 0x80 : 0x90) | e.ch, e.n, e.off ? 0 : e.v); last = e.t; });
  d.push(0, 0xff, 0x2f, 0);
  return [...text('MTrk'), ...u32(d.length), ...d];
}
export function beatToMidi(b) {
  const notes = (ch, list) => list.flatMap(({ s, l, n, v }) => [{ t: s * STEP, ch, n, v: Math.round(Math.max(1, Math.min(127, v * 127))), off: 0 }, { t: (s + Math.max(1, l)) * STEP - 6, ch, n, v: 0, off: 1 }]);
  const D = b.drum, map = { kick: 36, snare: 38, clap: 39, hat: 42, ohat: 46, perc: 37 }, drums = [];
  Object.entries(map).forEach(([k, n]) => D[k].forEach((v, s) => { if (v > 0) drums.push({ s, l: 1, n, v }); }));
  const tr = [
    track(b.name, [], b.bpm),
    track('Bateria', notes(9, drums), 0),
    track('808-Bajo', notes(0, b.bass.map((e) => ({ s: e.s, l: e.l, n: b.bassBase + e.n, v: e.v ?? 0.9 }))), 0),
    track('Melodia', notes(1, b.lead.map((e) => ({ s: e.s, l: e.l, n: b.leadBase + e.n, v: e.v ?? 0.8 }))), 0),
    track('Acordes', notes(2, b.chord.flatMap((e) => e.n.map((n) => ({ s: e.s, l: e.l, n: b.chordBase + n, v: (e.v ?? 0.8) * 0.8})))), 0),
  ];
  return new Uint8Array([...text('MThd'), ...u32(6), 0, 1, 0, tr.length, (PPQ >> 8) & 255, PPQ & 255, ...tr.flat()]);
}
