(() => {
  if (window.top !== window || document.getElementById('teams-stickers-host')) return;

  const SRC = 'wbb-stickers';
  const EXT_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
  const COMPOSER_SEL = [
    '[data-tid="ckeditor"][contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
  ].join(',');
  const PANEL_W = 360;
  const PANEL_H = 440;

  let composer = null;
  let frame = null;
  let open = false;

  const host = document.createElement('div');
  host.id = 'teams-stickers-host';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .btn {
        position: fixed; z-index: 2147483646; width: 34px; height: 34px;
        border-radius: 50%; border: none; cursor: pointer; font-size: 18px;
        background: #5b5fc7; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.25);
        display: flex; align-items: center; justify-content: center; opacity: .85;
        transition: opacity .15s, transform .15s;
      }
      .btn:hover, .btn.active { opacity: 1; transform: scale(1.08); }
      .panel {
        position: fixed; z-index: 2147483647; width: ${PANEL_W}px; height: ${PANEL_H}px;
        border-radius: 10px; overflow: hidden; display: none;
        box-shadow: 0 8px 28px rgba(0,0,0,.3); background: #fff;
      }
      .panel.open { display: block; }
      iframe { width: 100%; height: 100%; border: 0; display: block; }
      .toast {
        position: fixed; z-index: 2147483647; left: 50%; bottom: 80px; transform: translateX(-50%);
        background: #242424; color: #fff; font: 13px system-ui, sans-serif;
        padding: 8px 14px; border-radius: 6px; opacity: 0; transition: opacity .2s; pointer-events: none;
      }
      .toast.show { opacity: 1; }
    </style>
    <button class="btn" title="Stickers (Alt+Shift+S)">🐻</button>
    <div class="panel"></div>
    <div class="toast"></div>
  `;
  const btn = root.querySelector('.btn');
  const panel = root.querySelector('.panel');
  const toastEl = root.querySelector('.toast');
  document.documentElement.appendChild(host);

  const isVisible = (el) => el.getClientRects().length > 0;

  function findComposer() {
    if (composer?.isConnected && isVisible(composer)) return composer;
    return [...document.querySelectorAll(COMPOSER_SEL)].filter(isVisible).pop() || null;
  }

  function place() {
    const x = innerWidth - 56;
    const y = innerHeight - 56;
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
    panel.style.left = `${Math.max(8, Math.min(x + 34 - PANEL_W, innerWidth - PANEL_W - 8))}px`;
    panel.style.top = `${Math.max(8, y - PANEL_H - 6)}px`;
  }

  function toggle(force) {
    const next = force ?? !open;
    if (next && !chrome.runtime?.id) {
      toast('Teams Stickers was updated — refresh this page (Cmd+R)');
      return;
    }
    open = next;
    if (open && !frame) {
      frame = document.createElement('iframe');
      frame.src = chrome.runtime.getURL('src/picker.html');
      frame.allow = 'clipboard-write';
      panel.appendChild(frame);
    } else if (open) {
      frame.contentWindow.postMessage({ source: SRC, type: 'opened' }, EXT_ORIGIN);
    }
    place();
    panel.classList.toggle('open', open);
    btn.classList.toggle('active', open);
    if (open) frame.focus();
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function dispatchPaste(el, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }

  function dispatchDrop(el, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    const r = el.getBoundingClientRect();
    const opts = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 10 };
    el.dispatchEvent(new DragEvent('dragenter', opts));
    el.dispatchEvent(new DragEvent('dragover', opts));
    el.dispatchEvent(new DragEvent('drop', opts));
  }

  function composerArea(el) {
    let a = el;
    for (let i = 0; i < 3 && a.parentElement; i++) a = a.parentElement;
    return a;
  }

  function attempt(el, file, dispatch, ms = 1000) {
    return new Promise((resolve) => {
      const mo = new MutationObserver(() => done(true));
      const timer = setTimeout(() => done(false), ms);
      function done(changed) {
        mo.disconnect();
        clearTimeout(timer);
        resolve(changed);
      }
      mo.observe(composerArea(el), { childList: true, subtree: true });
      dispatch(el, file);
    });
  }

  async function copyToClipboard(blob) {
    if (blob.type !== 'image/png') return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    }
  }

  async function insert(blob, name) {
    const ext = blob.type === 'image/gif' ? 'gif' : 'png';
    const file = new File([blob], `${name || 'sticker'}.${ext}`, { type: blob.type });
    const el = findComposer();
    toggle(false);
    if (el) {
      el.focus();
      if ((await attempt(el, file, dispatchPaste)) || (await attempt(el, file, dispatchDrop))) return;
    }
    if (await copyToClipboard(blob)) toast('Sticker copied — press Ctrl+V in the message box');
    else toast(el ? 'Could not insert sticker' : 'Click into a message box first');
  }

  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', () => toggle());

  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target.closest?.(COMPOSER_SEL);
      if (el) composer = el;
    },
    true,
  );

  document.addEventListener(
    'mousedown',
    (e) => {
      if (open && !e.composedPath().includes(host)) toggle(false);
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        toggle();
      } else if (open && e.key === 'Escape') {
        toggle(false);
      }
    },
    true,
  );

  window.addEventListener('message', (e) => {
    if (e.origin !== EXT_ORIGIN || !frame || e.source !== frame.contentWindow) return;
    const d = e.data;
    if (d?.source !== SRC) return;
    if (d.type === 'insert' && d.blob instanceof Blob) insert(d.blob, d.name);
    else if (d.type === 'close') toggle(false);
  });

  addEventListener('resize', place);
  place();
})();
