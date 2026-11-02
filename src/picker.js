import { listStickers, updateSticker } from './db.js';
import { toInsertable } from './image.js';

const SRC = 'wbb-stickers';
const parentOrigin = location.ancestorOrigins?.[0] || '*';
const $ = (s) => document.querySelector(s);
const grid = $('#grid');
const q = $('#q');

let stickers = [];
let tab = 'all';
let urls = [];
let visible = [];

async function load() {
  stickers = await listStickers();
  render();
}

function filtered() {
  const term = q.value.trim().toLowerCase();
  let list = stickers.filter(
    (s) => !term || [s.name, s.pack, ...(s.tags || [])].join(' ').toLowerCase().includes(term),
  );
  if (tab === 'fav') list = list.filter((s) => s.favorite);
  if (tab === 'recent') {
    return list.filter((s) => s.lastUsed).sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 40);
  }
  return list.sort((a, b) => a.pack.localeCompare(b.pack) || a.added - b.added);
}

function render() {
  urls.forEach(URL.revokeObjectURL);
  urls = [];
  grid.replaceChildren();
  visible = filtered();

  if (!visible.length) {
    const div = document.createElement('div');
    div.className = 'empty';
    if (!stickers.length) {
      div.innerHTML = 'No stickers yet.<br><a>Open the manager</a> to import some.';
      div.querySelector('a').onclick = () => openManager();
    } else {
      div.textContent = tab === 'fav' ? 'No favorites yet — hover a sticker and click ☆.' : 'Nothing found.';
    }
    grid.append(div);
    return;
  }

  let lastPack = null;
  for (const s of visible) {
    if (tab === 'all' && s.pack !== lastPack) {
      const h = document.createElement('div');
      h.className = 'pack';
      h.textContent = s.pack;
      grid.append(h);
      lastPack = s.pack;
    }
    const url = URL.createObjectURL(s.blob);
    urls.push(url);
    const b = document.createElement('button');
    b.className = 's';
    b.title = s.name;
    b.innerHTML = `<img alt=""><span class="star"></span>`;
    b.querySelector('img').src = url;
    const star = b.querySelector('.star');
    star.textContent = s.favorite ? '★' : '☆';
    star.classList.toggle('on', s.favorite);
    star.onclick = (e) => {
      e.stopPropagation();
      s.favorite = !s.favorite;
      updateSticker(s.id, { favorite: s.favorite });
      render();
    };
    b.onclick = () => send(s);
    grid.append(b);
  }
}

function openManager() {
  chrome.runtime.sendMessage({ type: 'open-manager' }).catch(staleBanner);
}

function staleBanner() {
  if (document.querySelector('.stale')) return;
  const div = document.createElement('div');
  div.className = 'stale';
  div.textContent = 'Extension was reloaded — refresh Teams (Cmd+R).';
  document.body.prepend(div);
}

async function send(s) {
  let size = 160;
  let bg = '#3d3d3d';
  try {
    ({ size, bg } = await chrome.storage.local.get({ size, bg }));
  } catch {
    staleBanner();
  }
  const blob = await toInsertable(s.blob, Number(size), bg);
  parent.postMessage({ source: SRC, type: 'insert', blob, name: s.name }, parentOrigin);
  s.lastUsed = Date.now();
  s.uses = (s.uses || 0) + 1;
  updateSticker(s.id, { lastUsed: s.lastUsed, uses: s.uses });
}

q.addEventListener('input', render);
q.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && visible[0]) send(visible[0]);
  if (e.key === 'Escape') parent.postMessage({ source: SRC, type: 'close' }, parentOrigin);
});
document.addEventListener('keydown', (e) => {
  const shortcut = e.altKey && e.shiftKey && e.code === 'KeyS';
  if (shortcut) e.preventDefault();
  if (e.key === 'Escape' || shortcut) parent.postMessage({ source: SRC, type: 'close' }, parentOrigin);
});

for (const b of document.querySelectorAll('nav [data-tab]')) {
  b.onclick = () => {
    tab = b.dataset.tab;
    document.querySelectorAll('nav [data-tab]').forEach((x) => x.classList.toggle('on', x === b));
    render();
  };
}
$('#manage').onclick = () => openManager();

window.addEventListener('message', (e) => {
  if (e.source !== parent || (parentOrigin !== '*' && e.origin !== parentOrigin)) return;
  if (e.data?.source === SRC && e.data.type === 'opened') {
    q.select();
    q.focus();
    load();
  }
});

load();
q.focus();
