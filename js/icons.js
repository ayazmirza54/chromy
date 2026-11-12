const svg = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const ICONS = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>'),
  settings: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 1.8-2M3.5 12l1 1 1.8-2M3.5 18l1 1 1.8-2"/>'),
  left: svg('<path d="m14.5 6-6 6 6 6"/>'),
  right: svg('<path d="m9.5 6 6 6-6 6"/>'),
  upload: svg('<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>'),
  pin: svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>'),
  play: svg('<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>'),
  spark: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),

  // weather
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'),
  cloud: svg('<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5h.2a4 4 0 0 1 0 8H7Z"/>'),
  partly: svg('<circle cx="8" cy="8" r="3"/><path d="M8 2.5v1M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/><path d="M9.5 20a3.7 3.7 0 0 1-.4-7.38A5 5 0 0 1 18.6 13.5h.2a3.25 3.25 0 0 1 0 6.5H9.5Z"/>'),
  rain: svg('<path d="M7 15.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5h.2a4 4 0 0 1 .8 7.9"/><path d="M9 18.5l-1 2.5M13 18.5l-1 2.5M17 18.5l-1 2.5"/>'),
  snow: svg('<path d="M7 15.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5h.2a4 4 0 0 1 .8 7.9"/><path d="M8.5 19.5h.01M12 21h.01M12 18h.01M15.5 19.5h.01" stroke-width="2.4"/>'),
  storm: svg('<path d="M7 15.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7.5h.2a4 4 0 0 1 .8 7.9"/><path d="m12.5 13-2.5 4h4l-2.5 4"/>'),
  fog: svg('<path d="M7 13.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 5.5h.2a4 4 0 0 1 2.3 7.3"/><path d="M4 17h16M6 20.5h12"/>'),
};
