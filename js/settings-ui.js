import { store } from './store.js';
import { h, $, toast } from './dom.js';
import { ICONS } from './icons.js';
import { THEMES } from './wallpaper/themes.js';
import { PARTICLE_KINDS } from './wallpaper/particles.js';
import { library, kindOf } from './wallpaper/library.js';
import { searchCity } from './widgets.js';

const TABS = [
  ['wallpaper', 'Wallpaper'],
  ['effects', 'Effects'],
  ['dashboard', 'Dashboard'],
];
const FX_LABELS = { none: 'Still', breeze: 'Breeze', water: 'Water', dream: 'Dream' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/* ───────────── small controls ───────────── */

function toggle(label, path, hint) {
  const get = () => path.split('.').reduce((o, k) => o[k], store.state);
  const input = h('input', { type: 'checkbox', checked: get(), onchange: () => store.set(path, input.checked) });
  return h(
    'label',
    { class: 'row' },
    h('span', { class: 'row-text' }, label, hint ? h('small', {}, hint) : null),
    h('span', { class: 'switch' }, input, h('i')),
  );
}

function slider(label, path, { min = 0, max = 100, step = 1, fmt = (v) => `${v}%` } = {}) {
  const get = () => path.split('.').reduce((o, k) => o[k], store.state);
  const out = h('output', {}, fmt(get()));
  const input = h('input', {
    type: 'range',
    min,
    max,
    step,
    value: get(),
    'aria-label': label,
    oninput: () => {
      out.textContent = fmt(+input.value);
      input.style.setProperty('--fill', `${((input.value - min) / (max - min)) * 100}%`);
      store.set(path, +input.value);
    },
  });
  input.style.setProperty('--fill', `${((get() - min) / (max - min)) * 100}%`);
  return h('div', { class: 'row col' }, h('div', { class: 'row-head' }, h('span', {}, label), out), input);
}

function segmented(label, path, options) {
  const get = () => path.split('.').reduce((o, k) => o[k], store.state);
  const group = h(
    'div',
    { class: `seg${options.length > 4 ? ' many' : ''}`, role: 'radiogroup', 'aria-label': label || path },
    options.map(([value, text]) =>
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': String(get() === value),
          onclick: () => {
            store.set(path, value);
            for (const b of group.children) b.setAttribute('aria-checked', String(b.dataset.v === String(value)));
          },
          'data-v': String(value),
        },
        text,
      ),
    ),
  );
  return h('div', { class: 'row col' }, label ? h('div', { class: 'row-head' }, h('span', {}, label)) : null, group);
}

const section = (title, ...children) => h('section', { class: 'group' }, title ? h('h3', {}, title) : null, ...children);

/* ───────────── panel ───────────── */

export function initSettings(wallpaper) {
  const panel = $('#settings');
  const body = h('div', { class: 'settings-body' });
  let tab = 'wallpaper';
  let built = false;

  const tabBar = h(
    'div',
    { class: 'tabs', role: 'tablist' },
    TABS.map(([id, label]) =>
      h('button', { role: 'tab', 'data-tab': id, onclick: () => showTab(id) }, label),
    ),
  );
  panel.append(
    h(
      'div',
      { class: 'settings-head' },
      h('h2', {}, 'Chromy'),
      h('button', { class: 'icon-btn sm ghost', html: ICONS.close, 'aria-label': 'Close settings', onclick: () => open(false) }),
    ),
    tabBar,
    body,
  );

  function showTab(id) {
    tab = id;
    for (const b of tabBar.children) b.setAttribute('aria-selected', String(b.dataset.tab === id));
    body.replaceChildren(id === 'wallpaper' ? wallpaperTab() : id === 'effects' ? effectsTab() : dashboardTab());
    body.scrollTop = 0;
  }

  function open(on, which) {
    if (on) {
      panel.hidden = false;
      if (!built || which) showTab(which || tab);
      built = true;
      requestAnimationFrame(() => document.body.classList.add('settings-open'));
    } else {
      document.body.classList.remove('settings-open');
      setTimeout(() => {
        if (!document.body.classList.contains('settings-open')) panel.hidden = true;
      }, 420);
    }
  }

  /* ── wallpaper tab ── */

  function wallpaperTab() {
    const liveGrid = h('div', { class: 'grid' });
    const cards = new Map();
    for (const t of THEMES) {
      const card = h(
        'button',
        {
          class: 'card',
          title: t.note,
          onclick: () => {
            store.set('wallpaper.kind', 'live');
            store.set('wallpaper.theme', t.id);
          },
        },
        h('span', { class: 'card-img', style: { backgroundColor: t.base } }),
        h('span', { class: 'card-name' }, t.name, h('i', { class: 'live-dot', style: { background: t.accent } })),
      );
      cards.set(t.id, card);
      liveGrid.append(card);
    }
    wallpaper.thumbnails((id, url) => {
      const img = cards.get(id)?.querySelector('.card-img');
      if (img) img.style.backgroundImage = `url(${url})`;
    });

    const myGrid = h('div', { class: 'grid' });
    const fileInput = h('input', {
      type: 'file',
      accept: 'image/*,video/mp4,video/webm',
      multiple: true,
      hidden: true,
      onchange: async () => {
        await addFiles([...fileInput.files]);
        fileInput.value = '';
      },
    });
    const fxRow = h('div', { class: 'fx-row' });

    async function refreshMine() {
      const items = await library.list();
      const { wallpaper: w } = store.state;
      myGrid.replaceChildren(
        h(
          'button',
          { class: 'card upload', onclick: () => fileInput.click() },
          h('span', { class: 'card-img' }, h('span', { class: 'upload-icon', html: ICONS.upload })),
          h('span', { class: 'card-name' }, 'Add image or video'),
        ),
        ...items.map((it) =>
          h(
            'div',
            { class: `card${w.kind === 'custom' && w.customId === it.id ? ' selected' : ''}`, 'data-id': it.id },
            h(
              'button',
              {
                class: 'card-hit',
                'aria-label': `Use ${it.name}`,
                onclick: () => {
                  store.set('wallpaper.customId', it.id);
                  store.set('wallpaper.kind', 'custom');
                },
              },
              h('span', { class: 'card-img', style: { backgroundImage: `url(${it.thumb})` } }),
              it.kind !== 'image' ? h('span', { class: 'kind-tag', html: ICONS.play }, it.kind === 'gif' ? 'GIF' : 'Video') : null,
            ),
            h('span', { class: 'card-name' }, h('span', { class: 'ellipsis' }, it.name)),
            h('button', {
              class: 'card-del',
              html: ICONS.trash,
              'aria-label': `Delete ${it.name}`,
              onclick: async () => {
                await library.remove(it.id);
                if (store.state.wallpaper.customId === it.id) {
                  store.set('wallpaper.customId', null);
                  store.set('wallpaper.kind', 'live');
                }
                refreshMine();
              },
            }),
          ),
        ),
      );
      markSelected();
    }

    function markSelected() {
      const { wallpaper: w } = store.state;
      for (const [id, card] of cards) card.classList.toggle('selected', w.kind === 'live' && w.theme === id);
      for (const c of myGrid.querySelectorAll('[data-id]')) {
        c.classList.toggle('selected', w.kind === 'custom' && w.customId === c.dataset.id);
      }
      fxRow.hidden = w.kind !== 'custom';
    }

    fxRow.append(
      segmented('Motion for still images', 'wallpaper.fx', Object.entries(FX_LABELS)),
      h('p', { class: 'hint' }, 'Adds gentle movement to a photo. Videos and GIFs play as they are.'),
    );

    // keep the selection ring in step with changes made elsewhere
    const off = store.subscribe((_, path) => {
      if (!liveGrid.isConnected) return off();
      if (path === '*' || path.startsWith('wallpaper')) markSelected();
    });
    wallpaperTab.refresh = refreshMine;
    refreshMine();

    return h(
      'div',
      {},
      section(
        'Live themes',
        liveGrid,
        toggle('Surprise me', 'wallpaper.shuffle', 'A different live theme on every new tab'),
      ),
      section(
        'My wallpapers',
        h('p', { class: 'hint' }, 'Images, GIFs, MP4 or WebM. You can also drop a file anywhere on the page. Files stay on this device.'),
        myGrid,
        fxRow,
        fileInput,
      ),
    );
  }

  async function addFiles(files) {
    const usable = files.filter((f) => kindOf(f.type));
    if (!usable.length) {
      toast('Choose an image, GIF, MP4 or WebM file.');
      return;
    }
    let last;
    for (const f of usable) {
      try {
        last = await library.add(f);
      } catch (err) {
        toast(err.name === 'QuotaExceededError' ? 'Not enough browser storage left for that file.' : err.message || 'That file could not be added.');
      }
    }
    if (last) {
      store.set('wallpaper.customId', last.id);
      store.set('wallpaper.kind', 'custom');
      toast(usable.length > 1 ? `${usable.length} wallpapers added` : 'Wallpaper added');
    }
    if (tab === 'wallpaper' && built) wallpaperTab.refresh?.();
  }

  /* ── effects tab ── */

  function effectsTab() {
    return h(
      'div',
      {},
      section(
        'Particles',
        segmented('', 'look.particles', PARTICLE_KINDS.map((k) => [k, cap(k)])),
        h('p', { class: 'hint' }, 'Layered over any wallpaper, including your own.'),
      ),
      section(
        'Motion',
        slider('Speed', 'look.speed', { min: 0, max: 250, step: 5, fmt: (v) => (v === 0 ? 'Paused' : `${(v / 100).toFixed(2)}×`) }),
        slider('Cursor parallax', 'look.parallax'),
      ),
      section(
        'Finish',
        slider('Dim', 'look.dim', { max: 70 }),
        slider('Blur', 'look.blur', { max: 30, fmt: (v) => `${v}px` }),
        toggle('Vignette', 'look.vignette'),
        toggle('Film grain', 'look.grain'),
      ),
      section(
        'Performance',
        segmented('Quality', 'look.quality', [
          ['battery', 'Battery'],
          ['balanced', 'Balanced'],
          ['ultra', 'Ultra'],
        ]),
        h('p', { class: 'hint' }, 'Battery renders at half resolution and 30 fps. Rendering always pauses when the tab is hidden.'),
      ),
    );
  }

  /* ── dashboard tab ── */

  function dashboardTab() {
    const nameInput = h('input', {
      class: 'field',
      value: store.state.name,
      placeholder: 'Your name',
      maxLength: 24,
      'aria-label': 'Your name',
      onchange: () => store.set('name', nameInput.value.trim()),
    });

    const results = h('div', { class: 'results' });
    const cityNow = h('div', { class: 'city-now' });
    const drawCity = () => {
      const c = store.state.weather.city;
      cityNow.replaceChildren(
        c
          ? h('span', {}, h('span', { class: 'inline-icon', html: ICONS.pin }), `${c.name}${c.region ? `, ${c.region}` : ''}`)
          : h('span', { class: 'muted' }, 'No city set'),
        c ? h('button', { class: 'text-btn', onclick: () => (store.set('weather.city', null), drawCity()) }, 'Remove') : '',
      );
    };
    const cityInput = h('input', { class: 'field', placeholder: 'Search for a city', 'aria-label': 'City' });
    const cityForm = h(
      'form',
      {
        class: 'inline-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const q = cityInput.value.trim();
          if (!q) return;
          results.replaceChildren(h('p', { class: 'hint' }, 'Searching…'));
          try {
            const found = await searchCity(q);
            results.replaceChildren(
              ...(found.length
                ? found.map((c) =>
                    h(
                      'button',
                      {
                        class: 'result',
                        type: 'button',
                        onclick: () => {
                          store.set('weather.city', c);
                          results.replaceChildren();
                          cityInput.value = '';
                          drawCity();
                        },
                      },
                      h('strong', {}, c.name),
                      h('span', {}, c.region),
                    ),
                  )
                : [h('p', { class: 'hint' }, 'No matches. Try a different spelling.')]),
            );
          } catch {
            results.replaceChildren(h('p', { class: 'hint' }, 'Could not reach the weather service. Check your connection and try again.'));
          }
        },
      },
      cityInput,
      h('button', { class: 'btn', type: 'submit' }, 'Search'),
    );
    drawCity();

    return h(
      'div',
      {},
      section('You', h('div', { class: 'row col' }, h('div', { class: 'row-head' }, h('span', {}, 'Name')), nameInput)),
      section(
        'Clock',
        segmented('Style', 'clock.font', [
          ['thin', 'Thin'],
          ['serif', 'Serif'],
          ['bold', 'Bold'],
          ['mono', 'Mono'],
        ]),
        toggle('24-hour time', 'clock.h24'),
        toggle('Show seconds', 'clock.seconds'),
      ),
      section(
        'Show on the page',
        toggle('Greeting', 'show.greeting'),
        toggle('Daily focus', 'show.focus'),
        toggle('Search', 'show.search'),
        toggle('Quick links', 'show.links'),
        toggle('Weather', 'show.weather'),
        toggle('Quote', 'show.quote'),
        toggle('To-do', 'show.todo'),
      ),
      section(
        'Weather',
        cityNow,
        cityForm,
        results,
        segmented('Units', 'weather.unit', [
          ['c', '°C'],
          ['f', '°F'],
        ]),
        h('p', { class: 'hint' }, 'Weather comes from Open-Meteo. Only the city you pick is sent.'),
      ),
      section(
        'Reset',
        h(
          'button',
          {
            class: 'btn danger',
            onclick: (e) => {
              const b = e.currentTarget;
              if (b.dataset.armed) {
                store.reset();
                showTab('dashboard');
                toast('Settings reset. Your uploaded wallpapers were kept.');
              } else {
                b.dataset.armed = '1';
                b.textContent = 'Click again to reset everything';
                setTimeout(() => {
                  delete b.dataset.armed;
                  b.textContent = 'Reset all settings';
                }, 4000);
              }
            },
          },
          'Reset all settings',
        ),
      ),
    );
  }

  /* ── open / close / drag & drop ── */

  $('#open-settings').innerHTML = ICONS.settings;
  $('#open-settings').addEventListener('click', () => open(!document.body.classList.contains('settings-open')));
  document.addEventListener('pointerdown', (e) => {
    if (!document.body.classList.contains('settings-open')) return;
    if (panel.contains(e.target) || e.target.closest('#open-settings, #theme-pill, #weather')) return;
    open(false);
  });

  const hint = $('#drop-hint');
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth++;
    hint.hidden = false;
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) hint.hidden = true;
  });
  window.addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    hint.hidden = true;
    addFiles([...e.dataTransfer.files]);
  });

  return {
    open: (which) => open(true, which),
    close: () => open(false),
    toggle: () => open(!document.body.classList.contains('settings-open')),
    get isOpen() {
      return document.body.classList.contains('settings-open');
    },
  };
}
