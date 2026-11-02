import { listStickers, putStickers, deleteStickers, updateSticker, newSticker } from './db.js';
import { toStorable } from './image.js';

const $ = (s) => document.querySelector(s);
let stickers = [];
let urls = [];

const baseName = (n) => n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

async function importFiles(entries) {
  const existing = new Set(stickers.map((s) => `${s.pack}/${s.name}/${s.blob.size}`));
  const out = [];
  const errors = [];
  let skipped = 0;
  for (const { file, pack } of entries) {
    try {
      const blob = await toStorable(file);
      const s = newSticker({ blob, name: baseName(file.name), pack: $('#pack').value.trim() || pack });
      const key = `${s.pack}/${s.name}/${blob.size}`;
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      existing.add(key);
      out.push(s);
    } catch (e) {
      errors.push(`${file.name}: ${e.message}`);
    }
  }
  if (out.length) await putStickers(out);
  $('#log').textContent = [
    `Imported ${out.length}` + (skipped ? `, skipped ${skipped} duplicates` : '') + (errors.length ? `, ${errors.length} failed:` : '.'),
    ...errors.slice(0, 20),
  ].join('\n');
  await load();
}

const packFromPath = (path) => (path.includes('/') ? path.split('/')[0] : '');

async function readEntry(entry, pack, acc) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    acc.push({ file, pack });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    let batch;
    do {
      batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      for (const e of batch) await readEntry(e, pack || entry.name, acc);
    } while (batch.length);
  }
}

function render() {
  urls.forEach(URL.revokeObjectURL);
  urls = [];
  const packs = [...new Set(stickers.map((s) => s.pack))].sort();
  const pf = $('#packFilter');
  const current = pf.value;
  pf.innerHTML = '<option value="">All packs</option>';
  for (const p of packs) pf.add(new Option(`${p} (${stickers.filter((s) => s.pack === p).length})`, p));
  pf.value = packs.includes(current) ? current : '';
  $('#deletePack').hidden = !pf.value;
  $('#count').textContent = `(${stickers.length})`;

  const term = $('#filter').value.trim().toLowerCase();
  const list = stickers
    .filter((s) => !pf.value || s.pack === pf.value)
    .filter((s) => !term || [s.name, s.pack, ...s.tags].join(' ').toLowerCase().includes(term))
    .sort((a, b) => a.pack.localeCompare(b.pack) || a.added - b.added);

  const lib = $('#lib');
  lib.replaceChildren();
  for (const s of list) {
    const url = URL.createObjectURL(s.blob);
    urls.push(url);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img alt="">
      <input class="name" title="Name">
      <input class="tags" placeholder="tags, comma separated">
      <div class="meta"><span></span><div>
        <button class="fav" title="Favorite"></button>
        <button class="del danger" title="Delete">✕</button>
      </div></div>`;
    card.querySelector('img').src = url;
    const name = card.querySelector('.name');
    name.value = s.name;
    name.onchange = () => updateSticker(s.id, { name: (s.name = name.value.trim() || s.name) });
    const tags = card.querySelector('.tags');
    tags.value = s.tags.join(', ');
    tags.onchange = () => {
      s.tags = tags.value.split(',').map((t) => t.trim()).filter(Boolean);
      updateSticker(s.id, { tags: s.tags });
    };
    card.querySelector('.meta span').textContent = s.pack;
    const fav = card.querySelector('.fav');
    const paintFav = () => {
      fav.textContent = s.favorite ? '★' : '☆';
      fav.classList.toggle('on', s.favorite);
    };
    paintFav();
    fav.onclick = () => {
      s.favorite = !s.favorite;
      updateSticker(s.id, { favorite: s.favorite });
      paintFav();
    };
    card.querySelector('.del').onclick = async () => {
      await deleteStickers([s.id]);
      await load();
    };
    lib.append(card);
  }
}

async function load() {
  stickers = await listStickers();
  render();
}

$('#files').onchange = (e) => {
  importFiles([...e.target.files].map((file) => ({ file, pack: '' })));
  e.target.value = '';
};
$('#folder').onchange = (e) => {
  importFiles([...e.target.files].map((file) => ({ file, pack: packFromPath(file.webkitRelativePath) })));
  e.target.value = '';
};

const drop = $('#drop');
drop.ondragover = (e) => {
  e.preventDefault();
  drop.classList.add('over');
};
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = async (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const entries = [...e.dataTransfer.items].map((i) => i.webkitGetAsEntry()).filter(Boolean);
  const acc = [];
  for (const entry of entries) await readEntry(entry, '', acc);
  importFiles(acc);
};

$('#filter').oninput = render;
$('#packFilter').onchange = render;
$('#deletePack').onclick = async () => {
  const pack = $('#packFilter').value;
  const ids = stickers.filter((s) => s.pack === pack).map((s) => s.id);
  if (!confirm(`Delete pack "${pack}" (${ids.length} stickers)?`)) return;
  await deleteStickers(ids);
  await load();
};

const size = $('#size');
chrome.storage.local.get({ size: 160 }).then((v) => (size.value = String(v.size)));
size.onchange = () => chrome.storage.local.set({ size: Number(size.value) });

const bgMode = $('#bgMode');
const bgColor = $('#bgColor');
const presets = [...bgMode.options].map((o) => o.value).filter((v) => v !== 'custom');
chrome.storage.local.get({ bg: '#3d3d3d' }).then(({ bg }) => {
  const custom = !presets.includes(bg);
  bgMode.value = custom ? 'custom' : bg;
  bgColor.value = custom ? bg : '#3d3d3d';
  bgColor.hidden = !custom;
});
bgMode.onchange = () => {
  const custom = bgMode.value === 'custom';
  bgColor.hidden = !custom;
  chrome.storage.local.set({ bg: custom ? bgColor.value : bgMode.value });
};
bgColor.oninput = () => chrome.storage.local.set({ bg: bgColor.value });

load();
