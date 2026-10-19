// Beats guardados: IndexedDB + copia espejo en el almacenamiento de la app (sobrevive a limpiezas del WebView).
import { openDB } from 'idb';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const native = Capacitor.isNativePlatform();
const dbp = openDB('beatlab', 1, { upgrade(db) { db.createObjectStore('beats', { keyPath: 'id' }); db.createObjectStore('kv'); } });
const BACKUP = 'backup/beats.json';

export async function listBeats() { return (await (await dbp).getAll('beats')).sort((a, b) => b.savedAt - a.savedAt); }
export async function getKV(k) { return (await dbp).get('kv', k); }
export async function setKV(k, v) { return (await dbp).put('kv', v, k); }

async function mirror() {
  if (!native) return;
  try {
    const all = await listBeats();
    await Filesystem.writeFile({ path: BACKUP, directory: Directory.Data, data: JSON.stringify({ app: 'beatlab', v: 1, beats: all }), encoding: Encoding.UTF8, recursive: true });
  } catch (e) { console.warn('Copia espejo no disponible', e); }
}
export async function saveBeat(beat) {
  if (!beat.id) beat.id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  beat.savedAt = Date.now();
  await (await dbp).put('beats', JSON.parse(JSON.stringify(beat)));
  mirror(); return beat;
}
export async function deleteBeat(id) { await (await dbp).delete('beats', id); mirror(); }
export async function importBeats(list) {
  const db = await dbp; let n = 0;
  for (const b of list) { if (b && b.genre && b.drum && b.id) { await db.put('beats', b); n++; } }
  mirror(); return n;
}

// Al abrir: pide almacenamiento persistente y, si la base quedó vacía, recupera la copia espejo.
export async function initStore() {
  try { await navigator.storage?.persist?.(); } catch { /* sin soporte */ }
  if (!native) return;
  try {
    if ((await listBeats()).length === 0) {
      const f = await Filesystem.readFile({ path: BACKUP, directory: Directory.Data, encoding: Encoding.UTF8 });
      const data = JSON.parse(typeof f.data === 'string' ? f.data : await f.data.text());
      if (data?.beats?.length) await importBeats(data.beats);
    }
  } catch { /* no hay copia aún */ }
}
