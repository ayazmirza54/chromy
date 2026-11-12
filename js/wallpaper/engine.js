import { VERT } from './themes.js';

const QUALITY = {
  battery: { scale: 0.5, fps: 30 },
  balanced: { scale: 0.75, fps: 60 },
  ultra: { scale: 1, fps: 60 },
};

/** Full-screen fragment shader renderer. */
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.programs = new Map();
    this.current = null;
    this.speed = 1;
    this.parallax = 0.6;
    this.fx = 0;
    this.quality = QUALITY.balanced;
    // start from wall-clock time so a new tab continues the same animation
    this.time = (Date.now() / 1000) % 3600;
    this.mouse = [0, 0];
    this.target = [0, 0];
    this.running = false;
    this.last = 0;
    this.texRes = [1, 1];
    this.hourOverride = null;
    this.frame = this.frame.bind(this);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.running = false;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      const src = this.currentSrc;
      this.init();
      if (src) this.use(src);
      this.onRestore?.();
      this.start();
    });
    this.init();
  }

  get ok() {
    return !!this.gl;
  }

  init() {
    const gl = this.canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.gl = gl;
    this.programs.clear();
    this.current = null;
    this.texture = null;
    if (!gl) return;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.resize();
  }

  compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log);
    }
    return sh;
  }

  /** Switch to a fragment shader (compiled once, then cached). */
  use(fragSrc) {
    const gl = this.gl;
    if (!gl) return false;
    let prog = this.programs.get(fragSrc);
    if (!prog) {
      try {
        const p = gl.createProgram();
        gl.attachShader(p, this.compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, fragSrc));
        gl.bindAttribLocation(p, 0, 'a_pos');
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        prog = { p, u: {} };
        for (const n of ['u_res', 'u_time', 'u_mouse', 'u_hour', 'u_tex', 'u_texRes', 'u_fx']) {
          prog.u[n] = gl.getUniformLocation(p, n);
        }
        this.programs.set(fragSrc, prog);
      } catch (err) {
        console.error('[chromy] shader failed to compile\n', err.message);
        return false;
      }
    }
    this.current = prog;
    this.currentSrc = fragSrc;
    gl.useProgram(prog.p);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    return true;
  }

  /** Upload an image (ImageBitmap / canvas / img) for the image shader. */
  setImage(source, w, h) {
    const gl = this.gl;
    if (!gl) return;
    if (!this.texture) this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    this.texRes = [w, h];
  }

  get maxTextureSize() {
    return this.gl ? Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE), 4096) : 2048;
  }

  setQuality(name) {
    this.quality = QUALITY[name] || QUALITY.balanced;
    this.resize();
  }

  resize() {
    const gl = this.gl;
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = this.fixedSize ? 1 : dpr * this.quality.scale;
    const w = this.fixedSize ? this.fixedSize[0] : Math.max(2, Math.round(this.canvas.clientWidth * s));
    const h = this.fixedSize ? this.fixedSize[1] : Math.max(2, Math.round(this.canvas.clientHeight * s));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  }

  pointer(x, y) {
    this.target = [x, y];
  }

  draw() {
    const gl = this.gl;
    const c = this.current;
    if (!gl || !c) return;
    const now = new Date();
    const hour = this.hourOverride ?? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    gl.uniform2f(c.u.u_res, this.canvas.width, this.canvas.height);
    gl.uniform1f(c.u.u_time, this.time);
    gl.uniform2f(c.u.u_mouse, this.mouse[0] * this.parallax, this.mouse[1] * this.parallax);
    gl.uniform1f(c.u.u_hour, hour);
    gl.uniform1i(c.u.u_tex, 0);
    gl.uniform2f(c.u.u_texRes, this.texRes[0], this.texRes[1]);
    gl.uniform1f(c.u.u_fx, this.fx);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  frame(ts) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const minGap = 1000 / this.quality.fps - 2;
    if (ts - this.last < minGap) return;
    const dt = Math.min((ts - this.last) / 1000, 0.1);
    this.last = ts;
    this.time += dt * this.speed;
    const k = 1 - Math.exp(-dt * 3.5);
    this.mouse[0] += (this.target[0] - this.mouse[0]) * k;
    this.mouse[1] += (this.target[1] - this.mouse[1]) * k;
    this.draw();
  }

  start() {
    if (this.running || !this.gl) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
