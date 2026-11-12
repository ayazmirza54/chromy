// Settings store. Uses localStorage so the first frame can be painted with the
// right theme (chrome.storage is async and would cause a flash on every tab).

const KEY = 'chromy:v1';

const defaults = {
  name: '',
  wallpaper: { kind: 'live', theme: 'aurora', customId: null, shuffle: false, fx: 'breeze' },
  look: {
    particles: 'none',
    dim: 15,
    blur: 0,
    speed: 100,
    parallax: 60,
    vignette: true,
    grain: true,
    quality: 'balanced',
  },
  clock: { h24: false, seconds: false, font: 'thin' },
  show: { greeting: true, focus: true, search: true, links: true, weather: true, quote: true, todo: true },
  weather: { city: null, unit: 'c' },
  links: null,
  todos: [],
  focus: { text: '', done: false, date: '' },
};

function merge(base, over) {
  if (Array.isArray(base) || base === null || typeof base !== 'object') {
    return over === undefined ? base : over;
  }
  const out = {};
  for (const k of Object.keys(base)) {
    out[k] = over && typeof over === 'object' && k in over ? merge(base[k], over[k]) : base[k];
  }
  return out;
}

function read() {
  try {
    return merge(defaults, JSON.parse(localStorage.getItem(KEY) || '{}'));
  } catch {
    return merge(defaults, {});
  }
}

let state = read();
const listeners = new Set();

function emit(path) {
  for (const fn of listeners) fn(state, path);
}

export const store = {
  get state() {
    return state;
  },
  /** store.set('look.dim', 30) */
  set(path, value) {
    const keys = path.split('.');
    let obj = state;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable: keep working in memory */
    }
    emit(path);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  reset() {
    localStorage.removeItem(KEY);
    state = read();
    emit('*');
  },
};

// Keep several open new-tab pages in step with each other.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  state = read();
  emit('*');
});
