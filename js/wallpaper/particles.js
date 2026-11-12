// A light 2D particle layer that sits above any wallpaper (live or custom).

const rnd = (a, b) => a + Math.random() * (b - a);

const KINDS = {
  snow: {
    count: 140,
    spawn: (p, w, h) => {
      p.z = rnd(0.3, 1);
      p.x = rnd(0, w);
      p.y = rnd(-h, 0);
      p.r = 1 + p.z * 2.4;
      p.vy = 22 + p.z * 55;
      p.ph = rnd(0, 6.28);
    },
    step: (p, dt, t, wind) => {
      p.y += p.vy * dt;
      p.x += (Math.sin(t * 0.7 + p.ph) * 14 + wind * 60) * p.z * dt;
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = 0.35 + p.z * 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    },
    style: (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(255,255,255,.6)';
      ctx.shadowBlur = 6;
    },
  },
  rain: {
    count: 260,
    spawn: (p, w, h) => {
      p.z = rnd(0.35, 1);
      p.x = rnd(-w * 0.2, w * 1.1);
      p.y = rnd(-h, 0);
      p.len = 10 + p.z * 26;
      p.vy = 620 + p.z * 780;
    },
    step: (p, dt, t, wind) => {
      p.y += p.vy * dt;
      p.x += (0.14 + wind * 0.25) * p.vy * dt;
    },
    draw: (ctx, p, wind) => {
      const k = 0.14 + wind * 0.25;
      ctx.globalAlpha = 0.1 + p.z * 0.28;
      ctx.lineWidth = 0.6 + p.z * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - k * p.len, p.y - p.len);
      ctx.stroke();
    },
    style: (ctx) => {
      ctx.strokeStyle = '#cfe2ff';
      ctx.lineCap = 'round';
    },
  },
  fireflies: {
    count: 46,
    everywhere: true,
    spawn: (p, w, h) => {
      p.x = rnd(0, w);
      p.y = rnd(h * 0.25, h);
      p.r = rnd(1.2, 2.8);
      p.ph = rnd(0, 6.28);
      p.sp = rnd(0.25, 0.8);
      p.a = rnd(0, 6.28);
    },
    step: (p, dt, t) => {
      p.a += Math.sin(t * p.sp + p.ph) * dt * 1.4;
      p.x += Math.cos(p.a) * 16 * p.sp * dt;
      p.y += (Math.sin(p.a) * 12 - 3) * p.sp * dt;
    },
    draw: (ctx, p, wind, t) => {
      const glow = Math.max(0, Math.sin(t * p.sp * 1.7 + p.ph * 3));
      ctx.globalAlpha = 0.12 + glow * 0.88;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    },
    style: (ctx) => {
      ctx.fillStyle = '#f6ffb0';
      ctx.shadowColor = '#d8ff5a';
      ctx.shadowBlur = 16;
    },
  },
  dust: {
    count: 70,
    everywhere: true,
    spawn: (p, w, h) => {
      p.z = rnd(0.2, 1);
      p.x = rnd(0, w);
      p.y = rnd(0, h);
      p.r = 1 + p.z * p.z * 9;
      p.ph = rnd(0, 6.28);
      p.vx = rnd(-6, 6);
      p.vy = rnd(-9, -2);
    },
    step: (p, dt, t, wind) => {
      p.x += (p.vx + Math.sin(t * 0.3 + p.ph) * 5 + wind * 20 * p.z) * dt;
      p.y += p.vy * dt;
    },
    draw: (ctx, p, wind, t) => {
      ctx.globalAlpha = (0.05 + 0.16 * (1 - p.z)) * (0.6 + 0.4 * Math.sin(t * 0.5 + p.ph));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    },
    style: (ctx) => {
      ctx.fillStyle = '#fff3dc';
    },
  },
  petals: {
    count: 42,
    spawn: (p, w, h) => {
      p.z = rnd(0.4, 1);
      p.x = rnd(-w * 0.3, w);
      p.y = rnd(-h, 0);
      p.r = 4 + p.z * 6;
      p.vy = 28 + p.z * 40;
      p.ph = rnd(0, 6.28);
      p.rot = rnd(0, 6.28);
      p.vr = rnd(-1.5, 1.5);
    },
    step: (p, dt, t, wind) => {
      p.y += (p.vy + Math.sin(t * 1.3 + p.ph) * 12) * dt;
      p.x += (26 + Math.sin(t * 0.8 + p.ph) * 30 + wind * 70) * p.z * dt;
      p.rot += p.vr * dt;
    },
    draw: (ctx, p, wind, t) => {
      ctx.globalAlpha = 0.45 + p.z * 0.45;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.55 + 0.4 * Math.sin(t * 1.6 + p.ph));
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.9, -p.r * 0.6, p.r * 0.7, p.r * 0.7, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.7, -p.r * 0.9, -p.r * 0.6, 0, -p.r);
      ctx.fill();
      ctx.restore();
    },
    style: (ctx) => {
      ctx.fillStyle = '#ffc4d6';
    },
  },
};

export const PARTICLE_KINDS = ['none', ...Object.keys(KINDS)];

export class Particles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.kind = null;
    this.items = [];
    this.wind = 0;
    this.targetWind = 0;
    this.t = 0;
    this.speed = 1;
    this.running = false;
    this.frame = this.frame.bind(this);
  }

  set(kind) {
    const def = KINDS[kind] || null;
    if (def === this.kind) return;
    this.kind = def;
    this.items = [];
    this.canvas.style.display = def ? 'block' : 'none';
    if (!def) {
      this.stop();
      return;
    }
    this.resize();
    const { w, h } = this;
    const n = Math.round(def.count * Math.min(1.6, (w * h) / (1440 * 900)));
    for (let i = 0; i < n; i++) {
      const p = {};
      def.spawn(p, w, h);
      // pre-scatter so the screen is not empty on the first frame
      p.y = def.everywhere ? p.y : Math.random() * h;
      this.items.push(p);
    }
    this.start();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  pointer(x) {
    this.targetWind = x;
  }

  frame(ts) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((ts - this.last) / 1000, 0.05) * this.speed;
    this.last = ts;
    this.t += dt;
    this.wind += (this.targetWind - this.wind) * Math.min(1, dt * 2);
    const { ctx, w, h, kind } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    kind.style(ctx);
    const m = 40;
    for (const p of this.items) {
      kind.step(p, dt, this.t, this.wind);
      if (p.y > h + m || p.x > w + m * 4 || p.x < -w * 0.35 || p.y < -h - m) {
        kind.spawn(p, w, h);
        if (kind.everywhere) {
          // re-enter from the edge it left through instead of popping in
          p.y = p.vy < 0 || kind === KINDS.fireflies ? h + m * 0.5 : -m * 0.5;
        }
      }
      kind.draw(ctx, p, this.wind, this.t);
    }
    ctx.restore();
  }

  start() {
    if (this.running || !this.kind) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
