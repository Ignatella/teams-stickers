const DB_NAME = 'teams-stickers';
const STORE = 'stickers';

let dbPromise;
function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const out = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const listStickers = () => run('readonly', (s) => s.getAll());

export const putStickers = (items) => run('readwrite', (s) => items.forEach((i) => s.put(i)));

export const deleteStickers = (ids) => run('readwrite', (s) => ids.forEach((id) => s.delete(id)));

export const updateSticker = (id, patch) =>
  run('readwrite', (s) => {
    const req = s.get(id);
    req.onsuccess = () => req.result && s.put({ ...req.result, ...patch });
  });

export function newSticker({ blob, name, pack }) {
  return {
    id: crypto.randomUUID(),
    name,
    pack: pack || 'Unsorted',
    tags: [],
    blob,
    favorite: false,
    added: Date.now(),
    lastUsed: 0,
    uses: 0,
  };
}
