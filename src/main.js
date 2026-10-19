import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/jetbrains-mono';
import './style.css';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { TRACKS, TRACK_LABEL, createGraph, applyMix, scheduleSteps, songPlan, sectionAt, preview, startVinyl, renderBeat } from './audio.js';
import { PRESETS, ORDER, SCALES, KEYS, generate, rerollTrack } from './gen.js';
import { listBeats, saveBeat, deleteBeat, importBeats, initStore, getKV, setKV } from './store.js';
import { startUpdates, checkForUpdate, applyNow, onUpdateStatus, getUpdateStatus, notifyReady, applyPendingOnColdStart } from './updater.js';

const native = Capacitor.isNativePlatform();
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IC = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.6 5 6.5 5c2 0 3.5 1.2 5.5 3 2-1.8 3.5-3 5.5-3 2.9 0 4.7 2.6 3.5 5.8C19 15.600 12 20 12 20z"/></svg>',
  heartF: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.6 5 6.5 5c2 0 3.5 1.2 5.5 3 2-1.8 3.5-3 5.5-3 2.9 0 4.7 2.6 3.5 5.8C19 15.600 12 20 12 20z"/></svg>',
  lib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5v14M9 5v14M14 7l5 12"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

const S = { beat: null, lock: {}, bar: 0, playing: false, mode: 'loop', lib: [], dirty: null };
let ctx = null, graph = null, timer = null, raf = 0, t0 = 0, nextStep = 0, plan = null;

function toast(msg) { document.querySelectorAll('.toast').forEach((e) => e.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2200); }
const keyName = (b) => `${KEYS[b.key]}${b.scale === 'major' ? '' : 'm'}`;
const scaleOf = (b) => SCALES[b.scale].i;

// ---------------- audio en vivo ----------------
function ensureCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); if (ctx.state !== 'running') ctx.resume(); return ctx; }
function buildGraph() { if (graph) { try { graph.out.disconnect(); } catch { /* ya desconectado */ } } graph = createGraph(ensureCtx(), S.beat); return graph; }
function start(mode = 'loop') {
  stop(true); S.mode = mode; S.playing = true; plan = songPlan(S.beat);
  buildGraph(); t0 = ctx.currentTime + 0.08; nextStep = 0;
  if (S.beat.kit.fx.vinyl) graph.vinyl = startVinyl(graph, t0, t0 + 60 * 60);
  tick(); timer = setInterval(tick, 25); raf = requestAnimationFrame(frame); render();
}
function stop(silent) {
  clearInterval(timer); cancelAnimationFrame(raf); S.playing = false;
  if (graph) { try { graph.vinyl?.stop(); graph.out.disconnect(); } catch { /* ok */ } graph = null; }
  if (!silent) render();
}
function tick() {
  if (!S.playing) return;
  const sd = 60 / S.beat.bpm / 4, limit = S.mode === 'song' ? plan.loops * S.beat.steps : Infinity;
  const until = Math.min(limit, Math.floor((ctx.currentTime + 0.15 - t0) / sd) + 1);
  if (until > nextStep) { scheduleSteps(graph, S.beat, nextStep, until, t0, S.mode, plan); nextStep = until; }
  if (S.mode === 'song' && ctx.currentTime - t0 > limit * sd + 2.5) { stop(); toast('Fin de la canción'); }
}
function frame() {
  if (!S.playing) return;
  const sd = 60 / S.beat.bpm / 4, s = Math.max(0, Math.floor((ctx.currentTime - t0) / sd)), idx = s % S.beat.steps, bar = Math.floor(idx / 16);
  if (bar !== S.bar && S.mode === 'loop' && S.follow !== false) { S.bar = bar; renderGrid(); }
  document.querySelectorAll('.cell.play').forEach((c) => c.classList.remove('play'));
  if (Math.floor(idx / 16) === S.bar) document.querySelectorAll(`.cell[data-s="${idx % 16}"]`).forEach((c) => c.classList.add('play'));
  if (S.mode === 'song') { const sec = sectionAt(plan, Math.floor(s / S.beat.steps)); document.querySelectorAll('.song span').forEach((e, i) => e.classList.toggle('on', plan.secs[i] === sec)); }
  raf = requestAnimationFrame(frame);
}

// ---------------- edición ----------------
const DRUMS = ['kick', 'snare', 'clap', 'hat', 'ohat', 'perc'];
function cellOn(t, s) {
  const b = S.beat;
  if (DRUMS.includes(t)) return b.drum[t][s] > 0;
  return b[t].some((e) => e.s === s);
}
function toggleCell(t, s) {
  const b = S.beat;
  if (DRUMS.includes(t)) {
    if (b.drum[t][s] > 0) { b.drum[t][s] = 0; if (t === 'hat') b.drum.roll[s] = 0; } else { b.drum[t][s] = t === 'hat' || t === 'perc' ? 0.7 : 0.9; if (graph && !S.playing) preview(graph, t, b); }
  } else {
    const i = b[t].findIndex((e) => e.s === s);
    if (i >= 0) b[t].splice(i, 1);
    else {
      const bar = Math.floor(s / 16), d = b.prog[bar % b.prog.length], sc = scaleOf(b), at = (x) => sc[((x % 7) + 7) % 7] + 12 * Math.floor(x / 7);
      if (t === 'bass') b.bass.push({ s, l: 2, n: at(d) % 12, v: 0.9 });
      else if (t === 'lead') b.lead.push({ s, l: 2, n: at(d + 2) + 12, v: 0.8 });
      else b.chord.push({ s, l: 8, n: [at(d), at(d + 2), at(d + 4)], v: 0.8 });
    }
  }
  touched();
}
let saveT = 0;
function touched() { renderGrid(); if (S.beat.id) { clearTimeout(saveT); saveT = setTimeout(async () => { await saveBeat(S.beat); S.lib = await listBeats(); }, 700); } persistCurrent(); }
let curT = 0;
function persistCurrent() { clearTimeout(curT); curT = setTimeout(() => setKV('current', JSON.parse(JSON.stringify(S.beat))).catch(() => {}), 500); }

function newBeat(opts = {}) {
  const prev = S.beat;
  const id = opts.genre || prev?.genre || 'trap';
  const b = generate(id, { bpm: opts.bpm, key: opts.key, scale: opts.scale, lock: S.lock, prev: Object.keys(S.lock).some((k) => S.lock[k]) ? prev : null });
  if (prev && !opts.genre && !opts.fresh) { b.mix = prev.mix; b.swing = prev.swing; b.human = prev.human; }
  S.beat = b; S.bar = 0; if (S.playing) start(S.mode); persistCurrent(); render();
}

// ---------------- exportar ----------------
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
async function exportWav(mode) {
  toast('Renderizando…'); const bytes = await renderBeat(S.beat, mode);
  const name = `${S.beat.name.replace(/[^\w\-· ]+/g, '').replace(/[ ·]+/g, '_')}_${S.beat.bpm}bpm${mode === 'song' ? '_cancion' : ''}.wav`;
  await deliver(name, bytes, 'audio/wav');
}
async function deliver(name, bytes, type) {
  if (native) {
    const r = await Filesystem.writeFile({ path: name, directory: Directory.Cache, data: b64(bytes) });
    await Share.share({ title: name, files: [r.uri], dialogTitle: 'Guardar o compartir' }).catch(() => {});
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
}

// ---------------- hojas ----------------
function sheet(html, onMount) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg) bg.remove(); });
  document.body.append(bg); onMount?.(bg); return bg;
}
async function openLibrary() {
  S.lib = await listBeats();
  const draw = (bg) => {
    const box = $('.lib', bg);
    box.innerHTML = S.lib.length ? S.lib.map((b) => `<div class="item" data-id="${b.id}"><button class="t" data-a="load">${esc(b.name)}<small>${esc(PRESETS[b.genre]?.name || b.genre)} · ${b.bpm} BPM · ${keyName(b)}</small></button><button class="ib" data-a="ren" aria-label="Renombrar">✎</button><button class="ib" data-a="del" aria-label="Eliminar">${IC.trash}</button></div>`).join('') : '<div class="empty">Todavía no guardaste beats.<br>Toca <b>Guardar</b> cuando te guste uno y quedará aquí, aunque cierres o actualices la app.</div>';
  };
  sheet(`<div class="mono">${S.lib.length} guardados</div><h2>Mis beats</h2><div class="lib"></div>
    <button class="wide" data-a="exp">Descargar copia de seguridad</button><button class="wide" data-a="imp">Restaurar copia de seguridad</button><input type="file" accept="application/json" hidden id="impf">`, (bg) => {
    draw(bg);
    bg.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-a]'); if (!btn) return; const id = btn.closest('.item')?.dataset.id, a = btn.dataset.a, b = S.lib.find((x) => x.id === id);
      if (a === 'load' && b) { S.beat = JSON.parse(JSON.stringify(b)); S.bar = 0; S.lock = {}; if (S.playing) start(S.mode); persistCurrent(); render(); bg.remove(); }
      if (a === 'del' && b) { if (btn.dataset.sure) { await deleteBeat(id); if (S.beat.id === id) delete S.beat.id; S.lib = await listBeats(); draw(bg); render(); } else { btn.dataset.sure = 1; btn.style.background = '#FF4B2B'; btn.style.color = '#0B0B0E'; toast('Toca otra vez para borrar'); setTimeout(() => { delete btn.dataset.sure; btn.style = ''; }, 2500); } }
      if (a === 'ren' && b) { const n = prompt('Nombre del beat', b.name); if (n && n.trim()) { b.name = n.trim().slice(0, 40); await saveBeat(b); if (S.beat.id === id) S.beat.name = b.name; S.lib = await listBeats(); draw(bg); render(); } }
      if (a === 'exp') await deliver(`beatlab-respaldo-${new Date().toISOString().slice(0, 10)}.json`, new TextEncoder().encode(JSON.stringify({ app: 'beatlab', v: 1, beats: S.lib })), 'application/json');
      if (a === 'imp') $('#impf', bg).click();
    });
    $('#impf', bg).addEventListener('change', async (e) => { try { const d = JSON.parse(await e.target.files[0].text()); const n = await importBeats(d.beats || []); S.lib = await listBeats(); draw(bg); toast(`${n} beats restaurados`); } catch { toast('Archivo no válido'); } });
  });
}
function openExport() {
  sheet(`<div class="mono">Calidad estudio · WAV 44,1 kHz</div><h2>Exportar</h2>
    <button class="wide pri" data-m="loop">Loop de 4 compases</button><button class="wide" data-m="song">Canción completa (intro, versos, estribillos, puente)</button>`, (bg) => {
    bg.addEventListener('click', async (e) => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; bg.remove(); try { await exportWav(m); } catch (err) { console.error(err); toast('No se pudo exportar'); } });
  });
}
function openSettings() {
  const st = getUpdateStatus();
  const txt = { idle: 'Sin comprobar', checking: 'Buscando…', latest: 'Estás al día', downloading: `Descargando ${st.version || ''}…`, ready: `Versión ${st.version} lista`, offline: 'Sin conexión' }[st.state] || '';
  sheet(`<div class="mono">Versión ${__APP_VERSION__}</div><h2>Ajustes</h2>
    <div class="card" style="margin-top:10px"><div class="mono">Actualizaciones</div><p id="ust" style="margin:6px 0 0">${txt}</p></div>
    <button class="wide pri" id="ubtn">${st.state === 'ready' ? 'Aplicar ahora' : 'Buscar actualización'}</button>
    <div class="card" style="margin-top:12px"><div class="mono">Humanizar · ${Math.round((S.beat.human ?? 0.5) * 100)}%</div><input type="range" id="hum" min="0" max="100" value="${Math.round((S.beat.human ?? 0.5) * 100)}" aria-label="Humanizar"></div>
    <p class="empty" style="padding:12px 4px">Beatlab se actualiza sola desde internet. Tus beats guardados se conservan.</p>`, (bg) => {
    const off = onUpdateStatus((s) => { const el = $('#ust', bg); if (el) el.textContent = { checking: 'Buscando…', latest: 'Estás al día', downloading: `Descargando ${s.version || ''}…`, ready: `Versión ${s.version} lista`, offline: 'Sin conexión' }[s.state] || ''; });
    new MutationObserver(() => { if (!bg.isConnected) off(); }).observe(document.body, { childList: true });
    $('#ubtn', bg).onclick = async () => { if (getUpdateStatus().state === 'ready') await applyNow(); else { await checkForUpdate(); } };
    $('#hum', bg).oninput = (e) => { S.beat.human = e.target.value / 100; $('.mono', e.target.closest('.card')).textContent = `Humanizar · ${e.target.value}%`; persistCurrent(); };
  });
}

// ---------------- render ----------------
function render() {
  const b = S.beat, P = PRESETS[b.genre], up = getUpdateStatus();
  const sel = $('#app');
  sel.innerHTML = `
  <div class="top"><div><div class="mono">Estudio de beats</div><h1 class="logo">BEATLAB</h1></div>
    <button class="chip-v ${up.state === 'ready' ? 'up' : ''}" id="ver">${up.state === 'ready' ? 'Actualizar' : 'v' + __APP_VERSION__}</button></div>
  <div class="genres" role="tablist">${ORDER.map((id) => `<button class="genre ${id === b.genre ? 'on' : ''}" data-g="${id}">${PRESETS[id].name}</button>`).join('')}</div>
  <div class="info"><b>${esc(P.name)}</b><div class="mono" style="margin-top:2px">${esc(P.city)} · ${esc(P.era)}</div><p>Referentes del estilo: ${esc(P.refs)}.</p></div>
  <div class="grid2">
    <div class="card"><div class="mono">BPM</div><div class="big"><button class="step" data-bpm="-1" aria-label="Menos BPM">−</button><span id="bpm">${b.bpm}</span><button class="step" data-bpm="1" aria-label="Más BPM">+</button></div>
      <div class="bar"><i style="width:${Math.round(((b.bpm - 55) / 115) * 100)}%"></i></div></div>
    <div class="card"><div class="mono">Tonalidad</div><div class="big"><span>${esc(keyName(b))}</span></div>
      <select class="key" id="key" aria-label="Tonalidad">${KEYS.map((k, i) => `<option value="${i}" ${i === b.key ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
  </div>
  <div class="card"><div class="mono">Escala</div><select class="key" id="scale" aria-label="Escala">${Object.entries(SCALES).map(([k, v]) => `<option value="${k}" ${k === b.scale ? 'selected' : ''}>${v.n}</option>`).join('')}</select>
    <div class="mono" style="margin-top:12px">Swing · ${Math.round(b.swing * 100)}%</div><input type="range" id="swing" min="50" max="72" value="${Math.round(b.swing * 100)}" aria-label="Swing"></div>
  <div class="sec-h"><div class="mono">Patrón · 16 pasos</div><div class="tabs">${[0, 1, 2, 3].map((i) => `<button class="tab ${i === S.bar ? 'on' : ''}" data-bar="${i}">${i + 1}</button>`).join('')}</div></div>
  <div class="seq" id="seq"></div>
  <div class="sec-h"><div class="mono">Mezcla</div></div>
  <div class="mix">${TRACKS.map((t) => `<div class="mrow" data-t="${t}"><button class="n" data-a="prev" style="text-align:left">${TRACK_LABEL[t]}</button>
    <input type="range" min="0" max="100" value="${Math.round(b.mix[t].vol * 100)}" data-vol="${t}" aria-label="Volumen ${TRACK_LABEL[t]}">
    <button class="ib ${b.mix[t].mute ? 'on' : ''}" data-a="mute" aria-label="Silenciar ${TRACK_LABEL[t]}">${IC.mute}</button>
    <button class="ib ${S.lock[t] ? 'on' : ''}" data-a="lock" aria-label="Bloquear ${TRACK_LABEL[t]}">${IC.lock}</button>
    <button class="ib" data-a="dice" aria-label="Regenerar ${TRACK_LABEL[t]}">${IC.dice}</button></div>`).join('')}</div>
  <div class="sec-h"><div class="mono">Estructura de canción</div></div>
  <div class="song">${songPlan(b).secs.map((s) => `<span>${s.name}${s.loops > 1 ? ' ×' + s.loops : ''}</span>`).join('')}</div>
  <div class="dock"><div class="dock-in">
    <div class="dock-top"><button id="save" class="${b.id ? 'saved' : ''}">${b.id ? IC.heartF : IC.heart}${b.id ? 'Guardado' : 'Guardar'}</button><button id="lib">${IC.lib}Mis beats</button><button id="exp">${IC.dl}Exportar</button><button id="cfg">${IC.cog}Ajustes</button></div>
    <div class="dock-main"><button class="play" id="play" aria-label="${S.playing ? 'Detener' : 'Reproducir'}">${S.playing ? IC.stop : IC.play}</button><button class="gen" id="gen">GENERAR BEAT</button></div>
  </div></div>`;
  renderGrid(); bind();
}
function renderGrid() {
  const b = S.beat, o = S.bar * 16, seq = $('#seq'); if (!seq) return;
  seq.innerHTML = TRACKS.map((t) => `<div class="row"><button class="rl ${b.mix[t].mute ? 'm' : ''}" data-a="prev" data-t="${t}">${TRACK_LABEL[t].split(' ')[0]}</button><div class="cells">${Array.from({ length: 16 }, (_, i) => `<button class="cell ${t} ${i % 4 === 0 ? 'b4' : ''} ${cellOn(t, o + i) ? 'on' : ''}" data-t="${t}" data-s="${i}" aria-label="${TRACK_LABEL[t]} paso ${o + i + 1}"></button>`).join('')}</div></div>`).join('');
  document.querySelectorAll('.tab').forEach((e, i) => e.classList.toggle('on', i === S.bar));
}
function bind() {
  const app = $('#app');
  app.onclick = (e) => {
    const g = e.target.closest('[data-g]'); if (g) { S.lock = {}; newBeat({ genre: g.dataset.g, fresh: true }); return; }
    const bar = e.target.closest('[data-bar]'); if (bar) { S.bar = +bar.dataset.bar; S.follow = false; renderGrid(); return; }
    const c = e.target.closest('.cell'); if (c) { ensureCtx(); if (!graph) graph = createGraph(ctx, S.beat); toggleCell(c.dataset.t, S.bar * 16 + +c.dataset.s); return; }
    const bpm = e.target.closest('[data-bpm]'); if (bpm) { S.beat.bpm = Math.max(55, Math.min(170, S.beat.bpm + +bpm.dataset.bpm)); if (S.playing) start(S.mode); persistCurrent(); render(); return; }
    const row = e.target.closest('[data-a]');
    if (row && row.closest('.mrow')) {
      const t = row.closest('.mrow').dataset.t, a = row.dataset.a;
      if (a === 'mute') { S.beat.mix[t].mute = !S.beat.mix[t].mute; if (graph) applyMix(graph, S.beat); touched(); render(); }
      if (a === 'lock') { S.lock[t] = !S.lock[t]; render(); }
      if (a === 'dice') { S.beat = rerollTrack(S.beat, t); if (S.playing) start(S.mode); persistCurrent(); render(); }
      if (a === 'prev') { ensureCtx(); const g2 = graph || createGraph(ctx, S.beat); preview(g2, t, S.beat); }
      return;
    }
    if (row && row.classList.contains('rl')) { ensureCtx(); const g2 = graph || createGraph(ctx, S.beat); preview(g2, row.dataset.t, S.beat); return; }
    const id = e.target.closest('button')?.id;
    if (id === 'play') { if (S.playing) stop(); else { S.follow = true; start('loop'); } }
    if (id === 'gen') { ensureCtx(); S.follow = true; newBeat({}); if (!S.playing) start('loop'); }
    if (id === 'save') save();
    if (id === 'lib') openLibrary();
    if (id === 'exp') openExport();
    if (id === 'cfg' || id === 'ver') openSettings();
  };
  app.oninput = (e) => {
    const t = e.target;
    if (t.dataset.vol) { S.beat.mix[t.dataset.vol].vol = t.value / 100; if (graph) applyMix(graph, S.beat); touchedLite(); }
    if (t.id === 'swing') { S.beat.swing = t.value / 100; t.previousElementSibling.textContent = `Swing · ${t.value}%`; touchedLite(); }
  };
  app.onchange = (e) => {
    const t = e.target;
    if (t.id === 'key' || t.id === 'scale') {
      const b = S.beat, key = t.id === 'key' ? +t.value : b.key, scale = t.id === 'scale' ? t.value : b.scale;
      const nb = generate(b.genre, { seed: b.seed, bpm: b.bpm, key, scale, prog: b.prog });
      nb.mix = b.mix; nb.swing = b.swing; nb.human = b.human; if (b.id) nb.id = b.id, nb.name = b.name;
      S.beat = nb; if (S.playing) start(S.mode); persistCurrent(); render();
    }
  };
}
function touchedLite() { if (S.beat.id) { clearTimeout(saveT); saveT = setTimeout(() => saveBeat(S.beat), 700); } persistCurrent(); }
async function save() {
  const was = !!S.beat.id; await saveBeat(S.beat); S.lib = await listBeats(); render();
  toast(was ? 'Cambios guardados' : 'Beat guardado en Mis beats');
}

// ---------------- arranque ----------------
(async () => {
  await applyPendingOnColdStart().catch(() => {});
  await initStore().catch(() => {});
  let cur = null; try { cur = await getKV('current'); } catch { /* sin datos */ }
  S.beat = cur && cur.v === 1 && cur.drum ? cur : generate('trap');
  S.lib = await listBeats().catch(() => []);
  onUpdateStatus((s) => { if (s.state === 'ready' || s.state === 'latest') { const v = $('#ver'); if (v) { v.textContent = s.state === 'ready' ? 'Actualizar' : 'v' + __APP_VERSION__; v.classList.toggle('up', s.state === 'ready'); } } });
  render(); notifyReady(); startUpdates();
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.playing) stop(); });
})();
