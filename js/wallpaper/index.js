import { Engine } from './engine.js';
import { Particles } from './particles.js';
import { THEMES, IMAGE_FRAG, themeById } from './themes.js';
import { library } from './library.js';
import { store } from '../store.js';

const FX = { none: 0, breeze: 1, water: 2, dream: 3 };
const THUMB_KEY = 'chromy:thumbs:v2';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pick a lively accent colour out of a wallpaper thumbnail. */
function accentFrom(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      let best = [200, 210, 255];
      let score = -1;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const s = (mx - mn) * (0.4 + mx / 255);
        if (s > score) {
          score = s;
          best = [d[i], d[i + 1], d[i + 2]];
        }
      }
      // lift it so it stays readable on dark glass
      const mx = Math.max(...best, 1);
      const k = 235 / mx;
      const [r, g, b] = best.map((v) => Math.round(Math.min(255, v * k * 0.8 + 255 * 0.2)));
      resolve(`rgb(${r} ${g} ${b})`);
    };
    img.onerror = () => resolve('#c9d4ff');
    img.src = dataUrl;
  });
}

export class Wallpaper {
  constructor(root) {
    this.root = root;
    this.glCanvas = root.querySelector('#gl');
    this.video = root.querySelector('#wall-video');
    this.img = root.querySelector('#wall-img');
    this.veil = root.querySelector('#veil');
    this.engine = new Engine(this.glCanvas);
    this.particles = new Particles(root.querySelector('#fx'));
    this.engine.onRestore = () => this.apply(true);
    this.applied = null;
    this.objectUrl = null;
    this.first = true;

    window.addEventListener('resize', () => {
      this.engine.resize();
      this.particles.resize();
    });
    window.addEventListener('pointermove', (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = 1 - (e.clientY / window.innerHeight) * 2;
      this.engine.pointer(x, y);
      this.particles.pointer(x);
      const k = store.state.look.parallax / 100;
      root.style.setProperty('--px', `${(-x * 10 * k).toFixed(2)}px`);
      root.style.setProperty('--py', `${(y * 8 * k).toFixed(2)}px`);
    });
    document.addEventListener('visibilitychange', () => this.setActive(!document.hidden));
  }

  setActive(on) {
    if (on) {
      if (this.mode === 'gl') this.engine.start();
      this.particles.start();
      if (this.mode === 'video') this.video.play().catch(() => {});
    } else {
      this.engine.stop();
      this.particles.stop();
      this.video.pause();
    }
  }

  /** Cheap settings that never need a wallpaper reload. */
  applyLook() {
    const { look, wallpaper } = store.state;
    const speed = look.speed / 100;
    this.engine.speed = speed;
    this.engine.parallax = look.parallax / 100;
    this.engine.fx = FX[wallpaper.fx] ?? 1;
    this.engine.setQuality(look.quality);
    this.particles.speed = Math.max(0.15, speed);
    this.particles.set(look.particles);
    this.video.playbackRate = Math.min(2, Math.max(0.25, speed || 0.25));
    this.root.style.setProperty('--wall-blur', `${look.blur}px`);
    const shade = document.getElementById('shade');
    shade.style.setProperty('--dim', look.dim / 100);
    shade.classList.toggle('vignette', look.vignette);
    shade.classList.toggle('grain', look.grain);
  }

  setAccent(theme) {
    const s = document.documentElement.style;
    s.setProperty('--accent', theme.accent);
    s.setProperty('--base', theme.base);
    try {
      localStorage.setItem('chromy:paint', JSON.stringify({ accent: theme.accent, base: theme.base }));
    } catch {
      /* optional */
    }
  }

  show(mode) {
    this.mode = mode;
    this.glCanvas.hidden = mode !== 'gl';
    this.video.hidden = mode !== 'video';
    this.img.hidden = mode !== 'img';
    if (mode !== 'gl') this.engine.stop();
    else if (!document.hidden) this.engine.start();
    if (mode !== 'video') {
      this.video.pause();
      this.video.removeAttribute('src');
    }
    if (mode !== 'img') this.img.removeAttribute('src');
  }

  setUrl(blob) {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = blob ? URL.createObjectURL(blob) : null;
    return this.objectUrl;
  }

  async apply(force = false) {
    this.applyLook();
    const { wallpaper } = store.state;
    const key = wallpaper.kind === 'custom' && wallpaper.customId ? `c:${wallpaper.customId}` : `l:${wallpaper.theme}`;
    if (key === this.applied && !force) return;
    const token = (this.token = Symbol());
    this.applied = key;

    if (!this.first) {
      this.veil.classList.add('on');
      await wait(260);
      if (token !== this.token) return;
    }

    try {
      if (key.startsWith('c:')) await this.applyCustom(wallpaper.customId, token);
      else this.applyLive(wallpaper.theme);
    } catch (err) {
      console.error('[chromy] wallpaper failed, falling back to a live theme', err);
      store.set('wallpaper.kind', 'live');
      return;
    }
    if (token !== this.token) return;
    this.engine.draw();
    requestAnimationFrame(() => {
      this.root.classList.add('ready');
      this.veil.classList.remove('on');
    });
    this.first = false;
  }

  applyLive(id) {
    const theme = themeById(id);
    this.setAccent(theme);
    this.setUrl(null);
    if (!this.engine.ok || !this.engine.use(theme.frag)) {
      // no WebGL2: fall back to a soft animated CSS gradient in the theme colours
      this.show('none');
      this.root.classList.add('css-fallback');
      return;
    }
    this.root.classList.remove('css-fallback');
    this.show('gl');
  }

  async applyCustom(id, token) {
    const item = await library.get(id);
    if (!item) throw new Error('wallpaper is missing from the library');
    const accent = await accentFrom(item.thumb);
    if (token !== this.token) return;
    this.setAccent({ accent, base: '#08080c' });
    this.root.classList.remove('css-fallback');

    if (item.kind === 'image' && this.engine.ok) {
      const probe = await createImageBitmap(item.blob);
      const max = this.engine.maxTextureSize;
      const s = Math.min(1, max / Math.max(probe.width, probe.height));
      let bmp = probe;
      if (s < 1) {
        bmp = await createImageBitmap(item.blob, {
          resizeWidth: Math.round(probe.width * s),
          resizeHeight: Math.round(probe.height * s),
          resizeQuality: 'high',
        });
        probe.close();
      }
      if (token !== this.token) return;
      this.engine.use(IMAGE_FRAG);
      this.engine.setImage(bmp, bmp.width, bmp.height);
      bmp.close();
      this.setUrl(null);
      this.show('gl');
    } else if (item.kind === 'video') {
      this.show('video');
      this.video.src = this.setUrl(item.blob);
      this.video.playbackRate = Math.min(2, Math.max(0.25, store.state.look.speed / 100 || 0.25));
      await this.video.play().catch(() => {});
    } else {
      this.show('img');
      this.img.src = this.setUrl(item.blob);
      await this.img.decode().catch(() => {});
    }
  }

  /** Step through the live themes. */
  cycle(dir) {
    const { wallpaper } = store.state;
    const i = wallpaper.kind === 'live' ? THEMES.findIndex((t) => t.id === wallpaper.theme) : -1;
    const next = THEMES[(i + dir + THEMES.length) % THEMES.length];
    store.set('wallpaper.kind', 'live');
    store.set('wallpaper.theme', next.id);
    return next;
  }

  /** Render a small still of every live theme for the gallery (cached). */
  async thumbnails(onThumb) {
    let cache = {};
    try {
      cache = JSON.parse(localStorage.getItem(THUMB_KEY) || '{}');
    } catch {
      cache = {};
    }
    const missing = THEMES.filter((t) => !cache[t.id]);
    for (const t of THEMES) if (cache[t.id]) onThumb(t.id, cache[t.id]);
    if (!missing.length) return;

    const canvas = document.createElement('canvas');
    const eng = new Engine(canvas);
    if (!eng.ok) return;
    eng.fixedSize = [360, 225];
    eng.resize();
    eng.time = 40;
    eng.hourOverride = 18.2;
    for (const t of missing) {
      if (!eng.use(t.frag)) continue;
      eng.draw();
      cache[t.id] = canvas.toDataURL('image/jpeg', 0.8);
      onThumb(t.id, cache[t.id]);
      await wait(0);
    }
    eng.gl.getExtension('WEBGL_lose_context')?.loseContext();
    try {
      localStorage.setItem(THUMB_KEY, JSON.stringify(cache));
    } catch {
      /* cache is optional */
    }
  }
}
