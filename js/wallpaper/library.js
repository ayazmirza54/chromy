// The user's own wallpapers (images, GIFs and videos) live in IndexedDB so
// they can be far larger than what localStorage or chrome.storage allow.

const DB = 'chromy-wallpapers';
const STORE = 'items';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function thumbFrom(source, sw, sh) {
  const w = 360;
  const h = 225;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const s = Math.max(w / sw, h / sh);
  c.getContext('2d').drawImage(source, (w - sw * s) / 2, (h - sh * s) / 2, sw * s, sh * s);
  return c.toDataURL('image/jpeg', 0.78);
}

function videoThumb(blob) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(blob);
    const done = (fn, arg) => {
      URL.revokeObjectURL(url);
      fn(arg);
    };
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onloadeddata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => done(resolve, thumbFrom(v, v.videoWidth, v.videoHeight));
    v.onerror = () => done(reject, new Error('This video format is not supported by Chrome.'));
    v.src = url;
  });
}

export function kindOf(type) {
  if (type.startsWith('video/')) return 'video';
  if (type === 'image/gif') return 'gif';
  if (type.startsWith('image/')) return 'image';
  return null;
}

export const library = {
  async list() {
    const all = (await tx('readonly', (s) => s.getAll())) || [];
    // thumbnails only; blobs are loaded on demand
    return all.sort((a, b) => b.added - a.added).map(({ blob, ...meta }) => meta);
  },

  get(id) {
    return tx('readonly', (s) => s.get(id));
  },

  async add(file) {
    const kind = kindOf(file.type);
    if (!kind) throw new Error('Choose an image, GIF or video file.');
    let thumb;
    if (kind === 'video') {
      thumb = await videoThumb(file);
    } else {
      const bmp = await createImageBitmap(file);
      thumb = thumbFrom(bmp, bmp.width, bmp.height);
      bmp.close();
    }
    const item = {
      id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      kind,
      type: file.type,
      added: Date.now(),
      thumb,
      blob: file,
    };
    await tx('readwrite', (s) => s.put(item));
    return item;
  },

  remove(id) {
    return tx('readwrite', (s) => s.delete(id));
  },
};
