// Runs before first paint: restores the last theme colours so a new tab never
// flashes white while the wallpaper spins up.
try {
  var paint = JSON.parse(localStorage.getItem('chromy:paint') || 'null');
  if (paint) {
    document.documentElement.style.setProperty('--base', paint.base);
    document.documentElement.style.setProperty('--accent', paint.accent);
  }
} catch (e) {}
