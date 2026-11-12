import { store } from './store.js';
import { h, $, toast } from './dom.js';
import { ICONS } from './icons.js';
import { QUOTES } from './quotes.js';

const ext = typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome : null;
const today = () => new Date().toLocaleDateString('en-CA');

/* ───────────── clock, date, greeting ───────────── */

function initClock() {
  const el = $('#clock');
  const dateEl = $('#date');
  const hm = h('span', { class: 'hm' });
  const sec = h('span', { class: 'sec' });
  const ampm = h('span', { class: 'ampm' });
  el.append(hm, h('span', { class: 'clock-side' }, ampm, sec));
  let lastMinute = -1;

  function tick() {
    const { clock } = store.state;
    const d = new Date();
    let hr = d.getHours();
    const pm = hr >= 12;
    if (!clock.h24) hr = hr % 12 || 12;
    const hh = clock.h24 ? String(hr).padStart(2, '0') : String(hr);
    hm.textContent = `${hh}:${String(d.getMinutes()).padStart(2, '0')}`;
    ampm.textContent = clock.h24 ? '' : pm ? 'PM' : 'AM';
    sec.textContent = clock.seconds ? String(d.getSeconds()).padStart(2, '0') : '';
    el.dataset.font = clock.font;
    if (d.getMinutes() !== lastMinute) {
      lastMinute = d.getMinutes();
      dateEl.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      renderGreeting();
    }
  }
  tick();
  setInterval(tick, 1000);
  return tick;
}

function partOfDay() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Good night';
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  if (hr < 22) return 'Good evening';
  return 'Good night';
}

function renderGreeting(editing = false) {
  const el = $('#greeting');
  const { name } = store.state;
  el.replaceChildren();
  if (!name || editing) {
    const commit = () => {
      const v = input.value.trim();
      if (v && v !== name) store.set('name', v);
      else if (name) renderGreeting();
    };
    const input = h('input', {
      class: 'name-input',
      placeholder: 'your name',
      value: name,
      maxLength: 24,
      size: Math.max(8, name.length + 1),
      'aria-label': 'Your name',
      onkeydown: (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
          input.value = name;
          input.blur();
        }
      },
      onblur: commit,
    });
    el.append(`${partOfDay()}, `, input);
    if (editing) {
      input.focus();
      input.select();
    }
    return;
  }
  const edit = () => renderGreeting(true);
  const nameEl = h(
    'span',
    {
      class: 'name',
      title: 'Click to change',
      tabIndex: 0,
      role: 'button',
      onclick: edit,
      onkeydown: (e) => e.key === 'Enter' && edit(),
    },
    name,
  );
  el.append(`${partOfDay()}, `, nameEl, '.');
}

/* ───────────── daily focus ───────────── */

function renderFocus() {
  const el = $('#focus');
  let { focus } = store.state;
  if (focus.date !== today()) focus = { text: '', done: false, date: today() };
  el.replaceChildren();
  if (!focus.text) {
    const input = h('input', {
      class: 'focus-input',
      maxLength: 90,
      'aria-label': 'Main focus for today',
      onkeydown: (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          store.set('focus', { text: input.value.trim(), done: false, date: today() });
        }
      },
    });
    el.append(h('label', { class: 'focus-q' }, 'What is your main focus for today?'), input);
    return;
  }
  el.append(
    h('div', { class: 'eyebrow' }, 'Today'),
    h(
      'div',
      { class: `focus-row${focus.done ? ' done' : ''}` },
      h('button', {
        class: 'check',
        html: ICONS.check,
        'aria-label': focus.done ? 'Mark as not done' : 'Mark as done',
        onclick: () => store.set('focus', { ...focus, done: !focus.done }),
      }),
      h('span', { class: 'focus-text' }, focus.text),
      h('button', {
        class: 'icon-btn sm ghost',
        html: ICONS.close,
        'aria-label': 'Clear focus',
        onclick: () => store.set('focus', { text: '', done: false, date: today() }),
      }),
    ),
  );
}

/* ───────────── search ───────────── */

function looksLikeUrl(q) {
  return /^(https?:\/\/|chrome:\/\/|localhost(:\d+)?(\/|$))/i.test(q) || /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(q);
}

function initSearch() {
  const form = $('#search');
  const input = $('#search-input');
  $('.search-icon', form).innerHTML = ICONS.search;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    if (looksLikeUrl(q)) {
      location.href = /^[a-z]+:\/\//i.test(q) ? q : `https://${q}`;
    } else if (ext?.search?.query) {
      // respects whichever search engine is set as Chrome's default
      ext.search.query({ text: q, disposition: 'CURRENT_TAB' });
    } else {
      location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }
  });
}

/* ───────────── quick links ───────────── */

const FALLBACK_LINKS = [
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Gmail', url: 'https://mail.google.com' },
  { title: 'YouTube', url: 'https://www.youtube.com' },
  { title: 'Calendar', url: 'https://calendar.google.com' },
  { title: 'Drive', url: 'https://drive.google.com' },
  { title: 'Claude', url: 'https://claude.ai' },
];
const MAX_LINKS = 10;

async function seedLinks() {
  if (store.state.links) return;
  let links = FALLBACK_LINKS;
  try {
    if (ext?.topSites) {
      const sites = await ext.topSites.get();
      const mine = (sites || []).slice(0, 8).map((s) => ({ title: shortTitle(s.title, s.url), url: s.url }));
      // a fresh profile has few top sites: top up with the defaults
      const seen = new Set(mine.map((l) => hostOf(l.url)));
      links = [...mine, ...FALLBACK_LINKS.filter((l) => !seen.has(hostOf(l.url)))].slice(0, Math.max(mine.length, 6));
    }
  } catch {
    /* keep the fallback */
  }
  store.set('links', links);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function shortTitle(title, url) {
  const t = (title || '').split(/\s[|·–—-]\s/)[0].trim();
  return t && t.length <= 18 ? t : hostOf(url).split('.')[0].replace(/^./, (c) => c.toUpperCase());
}

function favicon(url, title) {
  const letter = h('span', { class: 'fav-letter' }, ((title || hostOf(url))[0] || '?').toUpperCase());
  if (!ext) return letter;
  const src = `${ext.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=64`;
  return h('img', { src, alt: '', width: 28, height: 28, onerror: (e) => e.target.replaceWith(letter) });
}

function renderLinks() {
  const el = $('#links');
  const links = store.state.links || [];
  el.replaceChildren(
    ...links.map((l, i) =>
      h(
        'a',
        { class: 'link', href: l.url, title: l.url, style: { '--i': i } },
        h('span', { class: 'tile glass' }, favicon(l.url, l.title)),
        h('span', { class: 'link-label' }, l.title),
        h('button', {
          class: 'link-x',
          html: ICONS.close,
          'aria-label': `Remove ${l.title}`,
          onclick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            store.set('links', links.filter((_, j) => j !== i));
          },
        }),
      ),
    ),
  );
  if (links.length < MAX_LINKS) {
    el.append(
      h(
        'button',
        { class: 'link add', 'aria-label': 'Add a link', style: { '--i': links.length }, onclick: openLinkForm },
        h('span', { class: 'tile glass', html: ICONS.plus }),
        h('span', { class: 'link-label' }, 'Add'),
      ),
    );
  }
}

function openLinkForm(e) {
  document.querySelector('.link-form')?.remove();
  const url = h('input', { placeholder: 'example.com', required: true, 'aria-label': 'Link address' });
  const title = h('input', { placeholder: 'Name (optional)', maxLength: 18, 'aria-label': 'Link name' });
  const form = h(
    'form',
    {
      class: 'link-form popover glass',
      onsubmit: (ev) => {
        ev.preventDefault();
        let u = url.value.trim();
        if (!u) return;
        if (!/^[a-z]+:\/\//i.test(u)) u = `https://${u}`;
        try {
          new URL(u);
        } catch {
          toast('That does not look like a valid address.');
          return;
        }
        store.set('links', [...(store.state.links || []), { title: title.value.trim() || shortTitle('', u), url: u }]);
        form.remove();
      },
    },
    url,
    title,
    h('button', { class: 'btn primary', type: 'submit' }, 'Add link'),
  );
  e.currentTarget.after(form);
  url.focus();
  const away = (ev) => {
    if (form.contains(ev.target) || ev.target.closest('.link.add')) return;
    form.remove();
    document.removeEventListener('pointerdown', away);
  };
  document.addEventListener('pointerdown', away);
}

/* ───────────── weather (Open-Meteo, no API key) ───────────── */

const WX_CACHE = 'chromy:weather';

function wxIcon(code, isDay) {
  if (code === 0 || code === 1) return isDay ? 'sun' : 'moon';
  if (code === 2) return isDay ? 'partly' : 'cloud';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51) return 'rain';
  return 'cloud';
}

const WX_TEXT = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export async function searchCity(name) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=${encodeURIComponent(name)}`,
  );
  if (!res.ok) throw new Error('lookup failed');
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

async function loadWeather(city) {
  const key = `${city.lat.toFixed(2)},${city.lon.toFixed(2)}`;
  try {
    const c = JSON.parse(localStorage.getItem(WX_CACHE) || 'null');
    if (c && c.key === key && Date.now() - c.at < 30 * 60 * 1000) return c.data;
  } catch {
    /* refetch */
  }
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1',
  );
  if (!res.ok) throw new Error('weather failed');
  const j = await res.json();
  const data = {
    temp: j.current.temperature_2m,
    code: j.current.weather_code,
    day: !!j.current.is_day,
    hi: j.daily.temperature_2m_max[0],
    lo: j.daily.temperature_2m_min[0],
  };
  localStorage.setItem(WX_CACHE, JSON.stringify({ key, at: Date.now(), data }));
  return data;
}

async function renderWeather(openSettings) {
  const el = $('#weather');
  const { weather, show } = store.state;
  el.hidden = !show.weather;
  if (!show.weather) return;
  el.onclick = () => openSettings('dashboard');
  if (!weather.city) {
    el.className = 'weather empty';
    el.replaceChildren(h('span', { class: 'wx-icon', html: ICONS.pin }), h('span', { class: 'wx-city' }, 'Set your city'));
    return;
  }
  const conv = (c) => Math.round(weather.unit === 'f' ? (c * 9) / 5 + 32 : c);
  try {
    const d = await loadWeather(weather.city);
    el.className = 'weather';
    el.title = `${WX_TEXT[d.code] || ''} · High ${conv(d.hi)}° · Low ${conv(d.lo)}°`;
    el.replaceChildren(
      h('span', { class: 'wx-icon', html: ICONS[wxIcon(d.code, d.day)] }),
      h('span', { class: 'wx-temp' }, `${conv(d.temp)}°`),
      h(
        'span',
        { class: 'wx-meta' },
        h('span', { class: 'wx-city' }, weather.city.name),
        h('span', { class: 'wx-cond' }, WX_TEXT[d.code] || ''),
      ),
    );
  } catch {
    el.className = 'weather empty';
    el.replaceChildren(
      h('span', { class: 'wx-icon', html: ICONS.cloud }),
      h('span', { class: 'wx-city' }, `${weather.city.name} · weather unavailable`),
    );
  }
}

/* ───────────── quote ───────────── */

function initQuote() {
  const el = $('#quote');
  // one quote per day by default; click for another
  let i = Math.floor(Date.now() / 86400000) % QUOTES.length;
  const show = () => {
    const [text, by] = QUOTES[i];
    el.classList.remove('in');
    setTimeout(() => {
      el.replaceChildren(h('span', { class: 'q-text' }, `“${text}”`), h('span', { class: 'q-by' }, by));
      el.classList.add('in');
    }, 180);
  };
  el.addEventListener('click', () => {
    i = (i + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length;
    show();
  });
  show();
}

/* ───────────── to-dos ───────────── */

function renderTodo() {
  const btn = $('#open-todo');
  const pop = $('#todo-pop');
  const todos = store.state.todos;
  const left = todos.filter((t) => !t.done).length;
  btn.replaceChildren(h('span', { class: 'chip-icon', html: ICONS.list }), 'To-do', left ? h('span', { class: 'badge' }, left) : '');

  const hadFocus = pop.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
  const input = h('input', {
    class: 'todo-input',
    placeholder: 'Add a task…',
    maxLength: 120,
    'aria-label': 'New task',
    onkeydown: (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        store.set('todos', [...store.state.todos, { id: Date.now(), text: input.value.trim(), done: false }]);
      }
    },
  });
  const update = (id, patch) =>
    store.set('todos', store.state.todos.flatMap((t) => (t.id !== id ? [t] : patch ? [{ ...t, ...patch }] : [])));

  pop.replaceChildren(
    h(
      'div',
      { class: 'pop-head' },
      h('strong', {}, 'To-do'),
      todos.some((t) => t.done)
        ? h('button', { class: 'text-btn', onclick: () => store.set('todos', store.state.todos.filter((t) => !t.done)) }, 'Clear done')
        : h('span', { class: 'muted' }, left ? `${left} left` : ''),
    ),
    todos.length
      ? h(
          'ul',
          { class: 'todo-list' },
          todos.map((t) =>
            h(
              'li',
              { class: t.done ? 'done' : '' },
              h('button', {
                class: 'check sm',
                html: ICONS.check,
                'aria-label': t.done ? 'Mark as not done' : 'Mark as done',
                onclick: () => update(t.id, { done: !t.done }),
              }),
              h('span', { class: 'todo-text' }, t.text),
              h('button', { class: 'icon-btn sm ghost', html: ICONS.close, 'aria-label': 'Delete task', onclick: () => update(t.id, null) }),
            ),
          ),
        )
      : h('p', { class: 'empty-note' }, 'Nothing here yet. Add the first thing you want to get done.'),
    input,
  );
  if (hadFocus) input.focus();
}

function initTodo() {
  const btn = $('#open-todo');
  const pop = $('#todo-pop');
  const set = (open) => {
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) $('.todo-input', pop)?.focus();
  };
  btn.addEventListener('click', () => set(pop.hidden));
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
}

/* ───────────── wiring ───────────── */

function applyVisibility() {
  const { show } = store.state;
  $('#greeting').hidden = !show.greeting;
  $('#focus').hidden = !show.focus;
  $('#search').hidden = !show.search;
  $('#links').hidden = !show.links;
  $('#quote').hidden = !show.quote;
  $('#open-todo').hidden = !show.todo;
  if (!show.todo) $('#todo-pop').hidden = true;
}

export async function initWidgets({ openSettings }) {
  const tick = initClock();
  initSearch();
  initQuote();
  initTodo();
  renderFocus();
  renderTodo();
  applyVisibility();
  renderWeather(openSettings);
  await seedLinks();
  renderLinks();

  store.subscribe((_, path) => {
    const all = path === '*';
    if (all || path.startsWith('clock')) tick();
    if (all || path === 'name') renderGreeting();
    if (all || path === 'focus') renderFocus();
    if (all || path === 'links') renderLinks();
    if (all || path === 'todos') renderTodo();
    if (all || path.startsWith('show')) applyVisibility();
    if (all || path.startsWith('weather') || path === 'show.weather') renderWeather(openSettings);
  });
  setInterval(() => renderWeather(openSettings), 30 * 60 * 1000);
}
