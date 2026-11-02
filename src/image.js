const EXT_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

export async function toStorable(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (EXT_TYPES[ext] || /^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
    return file.type ? file : new Blob([file], { type: EXT_TYPES[ext] });
  }
  if (ext === 'webm' || file.type === 'video/webm') return webmFirstFrame(file);
  if (ext === 'tgs') throw new Error('animated .tgs is not supported yet');
  throw new Error('unsupported file type');
}

function webmFirstFrame(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.onloadeddata = () => (v.currentTime = 0.01);
    v.onseeked = () => {
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('cannot grab frame'))), 'image/png');
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('cannot decode video'));
    };
    v.src = url;
  });
}

export async function toInsertable(blob, maxSize, bg) {
  if (blob.type === 'image/gif') return blob;
  const bmp = await createImageBitmap(blob);
  const k = maxSize ? Math.min(1, maxSize / Math.max(bmp.width, bmp.height)) : 1;
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.convertToBlob({ type: 'image/png' });
}
