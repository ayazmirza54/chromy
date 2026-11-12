import { store } from './store.js';
import { $ } from './dom.js';
import { ICONS } from './icons.js';
import { Wallpaper } from './wallpaper/index.js';
import { THEMES, themeById } from './wallpaper/themes.js';
import { initWidgets } from './widgets.js';
import { initSettings } from './settings-ui.js';

// "Surprise me": pick a different live theme for this tab before first paint.
{
  const { wallpaper } = store.state;
  if (wallpaper.shuffle && wallpaper.kind === 'live') {
    const others = THEMES.filter((t) => t.id !== wallpaper.theme);
    store.set('wallpaper.theme', others[Math.floor(Math.random() * others.length)].id);
  }
}

const wallpaper = new Wallpaper($('#wall'));
const settings = initSettings(wallpaper);

/* theme pill (top left) */
const pill = $('#theme-pill');
const themeName = $('#theme-name');
pill.querySelector('[data-dir="-1"]').innerHTML = ICONS.left;
pill.querySelector('[data-dir="1"]').innerHTML = ICONS.right;
pill.addEventListener('click', (e) => {
  const dir = e.target.closest('[data-dir]')?.dataset.dir;
  if (dir) wallpaper.cycle(+dir);
  else if (e.target.closest('#theme-name')) settings.open('wallpaper');
});

function labelTheme() {
  const { wallpaper: w } = store.state;
  const custom = w.kind === 'custom' && w.customId;
  themeName.textContent = custom ? 'My wallpaper' : themeById(w.theme).name;
}

store.subscribe((_, path) => {
  if (path === '*' || path.startsWith('wallpaper')) {
    labelTheme();
    wallpaper.apply();
  } else if (path.startsWith('look')) {
    wallpaper.applyLook();
  }
});

labelTheme();
wallpaper.apply();
initWidgets({ openSettings: (tab) => settings.open(tab) });

/* keyboard */
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (e.key === 'Escape') {
    if (settings.isOpen) settings.close();
    else if (typing) e.target.blur();
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') {
    e.preventDefault();
    $('#search-input').focus();
  } else if (e.key === ',') {
    settings.toggle();
  } else if (e.key === ']') {
    wallpaper.cycle(1);
  } else if (e.key === '[') {
    wallpaper.cycle(-1);
  }
});

// reveal the interface once fonts are in, so nothing reflows on screen
(document.fonts?.ready || Promise.resolve()).then(() => document.body.classList.add('loaded'));
