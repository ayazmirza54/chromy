// Live themes. Every theme is a fragment shader that implements
//   vec3 scene(vec2 uv, vec2 p)
// uv is 0..1, p is aspect-corrected and centred (y from -1 to 1).

export const VERT = `#version 300 es
in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const HEAD = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_hour;
uniform sampler2D u_tex;
uniform vec2 u_texRes;
uniform float u_fx;
out vec4 outColor;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
float disc(float r, float d){
  return r > 0.0001 ? 1.0 - smoothstep(r * 0.5, r, d) : 0.0;
}
float stars(vec2 p, float dens, float t){
  vec2 g = p * dens;
  vec2 id = floor(g), f = fract(g) - 0.5;
  float h = hash21(id);
  vec2 o = (vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5) * 0.7;
  float d = length(f - o);
  float tw = 0.65 + 0.35 * sin(t * (1.0 + h * 3.0) + h * 40.0);
  float r = 0.03 + 0.05 * fract(h * 17.0);
  return (1.0 - smoothstep(0.0, r, d)) * step(0.8, h) * tw;
}
`;

const TAIL = `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  vec3 col = scene(uv, p);
  col += (hash21(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;
  outColor = vec4(max(col, 0.0), 1.0);
}`;

const AURORA = `
float ridge(float x, float seed){
  return fbm(vec2(x, seed));
}
vec3 scene(vec2 uv, vec2 p){
  float t = u_time;
  vec2 q = p + u_mouse * vec2(0.03, 0.015);
  float y = q.y * 0.5 + 0.5;

  vec3 col = mix(vec3(0.02, 0.07, 0.11), vec3(0.004, 0.012, 0.04), smoothstep(0.0, 0.9, y));
  float st = stars(q + u_mouse * 0.01, 22.0, t) + 0.6 * stars(q + 4.0, 41.0, t * 0.7);
  col += vec3(0.85, 0.92, 1.0) * st * smoothstep(0.25, 0.7, y);

  float glow = 0.0;
  vec3 aur = vec3(0.0);
  for (float i = 0.0; i < 4.0; i++) {
    float x = q.x * (0.9 + i * 0.28) + i * 3.7;
    float wave = fbm(vec2(x * 0.55 + t * 0.045 * (1.0 + i * 0.3), i * 4.0 + t * 0.02));
    float base = -0.42 + i * 0.13 + wave * 0.75;
    float h = q.y - base;
    float rays = 0.5 + 0.5 * noise(vec2(x * 7.0 + t * 0.12, i * 7.0 + t * 0.05));
    rays *= 0.72 + 0.28 * noise(vec2(x * 19.0 - t * 0.08, t * 0.12 + i));
    float body = smoothstep(0.0, 0.05, h) * exp(-h * (3.1 - i * 0.3));
    float a = body * rays * (0.8 - i * 0.13);
    vec3 c = mix(vec3(0.12, 1.0, 0.55), vec3(0.15, 0.55, 1.0), smoothstep(0.0, 0.5, h));
    c = mix(c, vec3(0.62, 0.22, 0.95), smoothstep(0.3, 0.95, h));
    aur += c * a;
    glow += a;
  }
  col += aur * 0.62;
  col += vec3(0.04, 0.22, 0.16) * exp(-max(y - 0.15, 0.0) * 3.0) * (0.25 + 0.3 * glow);

  // mountains
  float m1 = -0.62 + 0.34 * ridge(q.x * 0.9 + 3.0 + u_mouse.x * 0.02, 1.3);
  float m2 = -0.86 + 0.42 * ridge(q.x * 1.5 + 9.0 + u_mouse.x * 0.05, 5.1);
  col = mix(col, vec3(0.015, 0.05, 0.075), smoothstep(0.004, -0.004, q.y - m1));
  col = mix(col, vec3(0.004, 0.012, 0.022), smoothstep(0.004, -0.004, q.y - m2));
  return col;
}`;

const NEBULA = `
vec3 scene(vec2 uv, vec2 p){
  float t = u_time * 0.035;
  vec2 q = p * 0.95 + u_mouse * 0.05;
  vec2 w = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(q + 3.0 * w + vec2(1.7, 9.2) + t * 0.6),
                fbm(q + 3.0 * w + vec2(8.3, 2.8) - t * 0.4));
  float f = fbm(q + 3.2 * r);

  vec3 col = mix(vec3(0.008, 0.008, 0.035), vec3(0.11, 0.05, 0.36), smoothstep(0.25, 0.75, f));
  col = mix(col, vec3(0.85, 0.16, 0.52), smoothstep(0.45, 0.95, length(r)) * 0.75);
  col = mix(col, vec3(0.12, 0.62, 0.98), smoothstep(0.22, 0.5, w.x * f) * 0.6);
  col += vec3(1.0, 0.78, 0.55) * pow(f, 5.0) * 2.2;
  col *= 0.3 + 1.35 * f;

  float dust = smoothstep(0.75, 0.2, f);
  float s = stars(p + u_mouse * 0.02, 26.0, u_time) + 0.7 * stars(p + 7.0 + u_mouse * 0.035, 14.0, u_time * 0.6)
          + 0.5 * stars(p + 2.0, 52.0, u_time * 1.3);
  col += vec3(0.9, 0.93, 1.0) * s * (0.35 + 0.65 * dust);
  col *= 1.0 - 0.35 * dot(p * 0.55, p * 0.55);
  return col;
}`;

// colourway comes from PAL_A..PAL_D defines
const SILK = `
vec3 scene(vec2 uv, vec2 p){
  float t = u_time * 0.11;
  vec2 q = p * 0.85 + u_mouse * 0.07;
  for (float i = 1.0; i < 5.0; i++) {
    q.x += 0.34 / i * sin(i * 1.5 * q.y + t * 1.3 + i * 1.7);
    q.y += 0.34 / i * cos(i * 1.3 * q.x + t + i * 2.3);
  }
  float n = 0.5 + 0.5 * sin(q.x * 1.7 + q.y * 1.4);
  float m = 0.5 + 0.5 * cos(q.y * 2.0 - q.x * 0.9 + t);
  vec3 col = mix(PAL_A, PAL_B, smoothstep(0.0, 0.65, n));
  col = mix(col, PAL_C, smoothstep(0.3, 0.95, m * n + 0.18 * m));
  col = mix(col, PAL_D, pow(n * m, 2.5) * 0.9);
  // soft sheen along the folds
  float sheen = pow(abs(sin(q.x * 2.2 + q.y * 1.4 + t * 0.6)), 14.0);
  col += PAL_D * sheen * 0.07;
  col *= 1.0 - 0.22 * dot(p * 0.5, p * 0.5);
  return col;
}`;

const HORIZON = `
vec3 scene(vec2 uv, vec2 p){
  float h = u_hour;
  float t = u_time;
  float day = smoothstep(5.0, 8.0, h) * (1.0 - smoothstep(17.0, 20.0, h));
  float gold = exp(-pow((h - 6.4) / 1.3, 2.0)) + exp(-pow((h - 18.6) / 1.3, 2.0));
  gold = min(gold, 1.0);

  vec3 top = mix(vec3(0.015, 0.025, 0.09), vec3(0.16, 0.42, 0.82), day);
  top = mix(top, vec3(0.2, 0.16, 0.42), gold * 0.75);
  vec3 bot = mix(vec3(0.07, 0.09, 0.24), vec3(0.68, 0.84, 0.96), day);
  bot = mix(bot, vec3(1.0, 0.56, 0.36), gold);

  float y = uv.y;
  vec3 col = mix(bot, top, smoothstep(0.18, 1.0, y));

  // sun and moon travel on an arc
  float asp = u_res.x / u_res.y;
  float ang = (h - 6.0) / 12.0 * 3.14159;
  vec2 sun = vec2(-cos(ang) * asp * 0.62, sin(ang) * 1.05 - 0.38);
  vec2 moon = vec2(cos(ang) * asp * 0.62, -sin(ang) * 1.05 - 0.38);
  float sd = length(p - sun);
  vec3 sunCol = mix(vec3(1.0, 0.96, 0.85), vec3(1.0, 0.62, 0.3), gold);
  col += sunCol * (smoothstep(0.085, 0.075, sd) + 0.42 * exp(-sd * 3.2) + 0.25 * exp(-sd * 1.1));
  float md = length(p - moon);
  float night = 1.0 - smoothstep(0.0, 0.6, day + gold * 0.5);
  float crescent = smoothstep(0.062, 0.056, md) * smoothstep(0.05, 0.062, length(p - moon - vec2(0.03, 0.018)));
  col += vec3(0.9, 0.93, 1.0) * (crescent + 0.1 * exp(-md * 5.0)) * night;
  col += vec3(0.85, 0.9, 1.0) * (stars(p, 24.0, t) + 0.6 * stars(p + 5.0, 43.0, t)) * night * smoothstep(0.3, 0.75, y);

  // clouds
  float cl = fbm(vec2(p.x * 0.9 + t * 0.012, p.y * 3.2 + 4.0));
  cl = smoothstep(0.52, 0.8, cl) * smoothstep(0.42, 0.75, y);
  vec3 cloudCol = mix(bot * 1.15 + 0.08, vec3(1.0, 0.72, 0.6), gold * 0.6);
  col = mix(col, cloudCol, cl * (0.18 + 0.4 * day + 0.3 * gold));

  // layered ridges with haze
  vec3 far = mix(bot, top, 0.35) * mix(0.75, 0.9, day);
  far = mix(far, vec3(0.6, 0.34, 0.5), gold * 0.85);
  far += vec3(0.03, 0.04, 0.09) * (1.0 - day) * (1.0 - gold);
  vec3 near = mix(vec3(0.008, 0.012, 0.035), vec3(0.03, 0.09, 0.13), day);
  near = mix(near, vec3(0.07, 0.03, 0.12), gold * 0.8);
  for (float i = 0.0; i < 6.0; i++) {
    float k = i / 5.0;
    float x = p.x * (0.55 + k * 0.9) + i * 13.7 + u_mouse.x * (0.01 + k * 0.07) + t * 0.002 * (1.0 + i);
    float r = fbm(vec2(x, i * 3.3));
    r += 0.35 * pow(noise(vec2(x * 2.6, i)), 2.0) * (1.0 - k);
    float ht = 0.02 - k * 0.78 + r * mix(0.46, 0.34, k) - u_mouse.y * k * 0.02;
    float mask = smoothstep(0.004, -0.004, p.y - ht);
    vec3 layer = mix(far, near, pow(k, 1.25));
    float mist = exp(-max(ht - p.y, 0.0) * 5.0) * (1.0 - k) * 0.5;
    layer = mix(layer, bot, mist * 0.5);
    col = mix(col, layer, mask);
  }
  return col;
}`;

const OUTRUN = `
vec3 scene(vec2 uv, vec2 p){
  float t = u_time;
  float hz = -0.1 + u_mouse.y * 0.02;
  vec3 col;
  if (p.y > hz) {
    float y = p.y - hz;
    col = mix(vec3(0.95, 0.2, 0.55), vec3(0.2, 0.03, 0.34), smoothstep(0.0, 0.55, y));
    col = mix(col, vec3(0.03, 0.01, 0.1), smoothstep(0.35, 1.15, y));
    col += vec3(0.9, 0.85, 1.0) * stars(p + u_mouse * 0.01, 26.0, t) * smoothstep(0.35, 0.9, y);

    vec2 sc = vec2(-u_mouse.x * 0.03, hz + 0.34);
    float d = length(p - sc);
    float sy = (p.y - sc.y) / 0.42;
    float bands = smoothstep(0.0, 0.08, sin((p.y - hz) * 46.0 - t * 0.7) + mix(1.25, -0.35, clamp(0.5 - sy * 0.5, 0.0, 1.0)));
    float disc = smoothstep(0.42, 0.413, d) * bands;
    vec3 sunCol = mix(vec3(1.0, 0.16, 0.5), vec3(1.0, 0.86, 0.3), clamp(sy * 0.5 + 0.55, 0.0, 1.0));
    col = mix(col, sunCol, disc);
    col += vec3(1.0, 0.25, 0.55) * 0.3 * exp(-max(d - 0.42, 0.0) * 4.5);

    // distant ridge
    float rx = p.x * 2.2 + 2.0;
    float rid = hz + 0.02 + 0.17 * abs(fract(rx * 0.5) - 0.5) * (0.5 + noise(vec2(floor(rx * 0.5) * 3.1, 2.0)))
              * smoothstep(0.25, 0.9, abs(p.x));
    col = mix(col, vec3(0.06, 0.01, 0.16), smoothstep(0.004, -0.004, p.y - rid));
  } else {
    float z = 1.0 / (hz - p.y);
    vec2 g = vec2(p.x * z * 0.9 + u_mouse.x * 0.2, z * 0.9 + t * 0.55);
    vec2 f = abs(fract(g) - 0.5);
    vec2 w = fwidth(g) * 1.3;
    vec2 ln = smoothstep(0.5 - w - 0.012, vec2(0.494), f);
    float line = max(ln.x, ln.y);
    float fade = exp(-z * 0.085);
    col = mix(vec3(0.05, 0.01, 0.14), vec3(0.015, 0.0, 0.05), clamp(1.0 - fade, 0.0, 1.0) * 0.4);
    col += mix(vec3(0.1, 0.9, 1.0), vec3(1.0, 0.2, 0.75), smoothstep(0.0, 0.7, 1.0 - fade)) * line * fade * 1.15;
    col += vec3(1.0, 0.2, 0.6) * 0.5 * exp(-(hz - p.y) * 16.0);
  }
  col *= 1.0 - 0.2 * dot(p * 0.5, p * 0.5);
  return col;
}`;

const BOKEH = `
vec3 lights(vec2 q, float blur){
  vec3 col = mix(vec3(0.016, 0.022, 0.05), vec3(0.06, 0.05, 0.12), smoothstep(-1.0, 0.6, q.y));
  col += vec3(0.2, 0.09, 0.14) * exp(-pow((q.y + 0.25) * 2.2, 2.0)) * 0.35;
  for (float i = 0.0; i < 3.0; i++) {
    float sc = 2.6 + i * 2.1;
    vec2 g = q * sc + vec2(i * 7.3 + u_time * 0.006 * (i + 1.0), i * 3.1);
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash21(id + i * 17.0);
    vec2 o = (vec2(hash21(id + 1.3), hash21(id + 2.7)) - 0.5) * 0.36;
    float r = mix(0.13, 0.3, hash21(id + 5.0)) * blur;
    float d = length(f - o);
    float b = (1.0 - smoothstep(r * 0.82, r, d)) * (0.55 + 0.45 * smoothstep(r * 0.4, r, d));
    vec3 c = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.16, 0.22), smoothstep(0.55, 0.75, h));
    c = mix(c, vec3(0.2, 0.8, 0.95), smoothstep(0.78, 0.86, h));
    c = mix(c, vec3(1.0, 0.92, 0.8), smoothstep(0.92, 0.96, h));
    float fl = 0.75 + 0.25 * sin(u_time * (0.4 + h) + h * 50.0);
    float band = exp(-pow((q.y + 0.12 + 0.06 * i) * 1.25, 2.0));
    col += c * b * step(0.5, h) * fl * band * (1.15 - i * 0.22) / (0.4 + blur * 0.6);
  }
  return col;
}

vec3 scene(vec2 uv, vec2 p){
  vec2 q = p + u_mouse * 0.03;
  vec3 col = lights(q, 1.0);
  // a nearer, softer layer that drifts the other way
  col += (lights(q * 0.6 + vec2(-u_time * 0.01 + 3.0, 0.08) + u_mouse * 0.04, 1.25) - lights(vec2(0.0, 9.0), 1.0)) * 0.45;
  col *= 1.0 - 0.3 * dot(p * 0.55, p * 0.55);
  return max(col, 0.0);
}`;

const WARP = `
vec3 scene(vec2 uv, vec2 p){
  float t = u_time * 0.05;
  vec2 c = p - u_mouse * 0.12;
  float neb = fbm(c * 0.9 + vec2(t * 0.3, 0.0));
  vec3 col = mix(vec3(0.004, 0.006, 0.02), vec3(0.05, 0.03, 0.14), neb);
  col += vec3(0.02, 0.08, 0.16) * pow(fbm(c * 1.6 - t * 0.2 + 5.0), 2.0);
  float ca = cos(t * 0.3), sa = sin(t * 0.3);
  c = mat2(ca, -sa, sa, ca) * c;
  for (float i = 0.0; i < 1.0; i += 1.0 / 10.0) {
    float depth = fract(i + t);
    float sc = mix(22.0, 0.35, depth);
    float fade = smoothstep(0.0, 0.25, depth) * smoothstep(1.0, 0.92, depth);
    vec2 g = c * sc + i * 453.2;
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash21(id);
    vec2 o = (vec2(fract(h * 61.0), fract(h * 34.0)) - 0.5) * 0.4;
    float d = length(f - o);
    float s = 0.0022 / (d * d + 0.0007) * (1.0 - smoothstep(0.08, 0.28, d)) * step(0.78, h);
    vec3 tint = mix(vec3(0.65, 0.8, 1.0), vec3(1.0, 0.82, 0.65), fract(h * 91.0));
    col += tint * s * fade * 0.5;
  }
  col += vec3(0.25, 0.4, 0.9) * 0.1 * exp(-length(c) * 2.5);
  col *= 1.0 - 0.25 * dot(p * 0.5, p * 0.5);
  return col;
}`;

const TOPO = `
float sm(vec2 p){
  return 0.6 * noise(p) + 0.28 * noise(p * 2.03 + 11.0) + 0.12 * noise(p * 4.1 + 37.0);
}
vec3 scene(vec2 uv, vec2 p){
  float t = u_time * 0.03;
  vec2 q = p * 1.15 + u_mouse * 0.06;
  float n = sm(q + vec2(t, -t * 0.6)) + 0.25 * sm(q * 0.5 - t * 0.5 + 9.0);
  float v = n * 16.0 + t * 1.5;
  float w = fwidth(v);
  float l = abs(fract(v) - 0.5);
  float line = 1.0 - smoothstep(0.6 * w, 2.0 * w, l);
  float major = step(0.5, 1.0 - abs(mod(floor(v + 0.5), 5.0) - 0.0)) ;
  vec3 bg = mix(vec3(0.02, 0.035, 0.05), vec3(0.035, 0.085, 0.1), n);
  bg = mix(bg, vec3(0.07, 0.05, 0.11), smoothstep(0.55, 0.95, n));
  vec3 lc = mix(vec3(0.18, 0.85, 0.72), vec3(0.95, 0.55, 0.85), smoothstep(0.4, 0.9, n));
  vec3 col = bg + lc * line * mix(0.3, 0.9, major);
  col += lc * 0.06 * smoothstep(0.6, 1.0, n);
  col *= 1.0 - 0.3 * dot(p * 0.5, p * 0.5);
  return col;
}`;

// Used for the user's own still images: cover-fit, slow zoom, parallax and
// one of a few displacement effects (u_fx).
const IMAGE = `
vec2 cover(vec2 uv){
  float ra = u_res.x / u_res.y, ta = u_texRes.x / u_texRes.y;
  vec2 s = ra > ta ? vec2(1.0, ta / ra) : vec2(ra / ta, 1.0);
  uv = (uv - 0.5) * s + 0.5;
  return vec2(uv.x, 1.0 - uv.y); // image rows are stored top-down
}
vec3 scene(vec2 uv, vec2 p){
  float t = u_time;
  float zoom = 1.07 + (u_fx > 0.5 ? 0.035 * sin(t * 0.05) : 0.0);
  vec2 q = (uv - 0.5) / zoom + 0.5 - u_mouse * 0.012;
  vec3 col;
  if (u_fx < 0.5) {
    col = texture(u_tex, cover(q)).rgb;
  } else if (u_fx < 1.5) {
    // breeze: slow, large-scale drift that makes skies and foliage breathe
    vec2 d = vec2(fbm(uv * 2.6 + vec2(t * 0.06, 0.0)), fbm(uv * 2.6 + vec2(7.0, -t * 0.05))) - 0.5;
    col = texture(u_tex, cover(q + d * 0.014)).rgb;
  } else if (u_fx < 2.5) {
    // water: ripples that get stronger toward the bottom of the frame
    float k = smoothstep(0.75, 0.0, uv.y);
    vec2 d = vec2(sin(uv.y * 70.0 + t * 1.3) + sin(uv.y * 31.0 - t * 0.9 + uv.x * 6.0),
                  cos(uv.x * 22.0 + t * 0.8)) * 0.0022 * k;
    col = texture(u_tex, cover(q + d)).rgb;
    col += vec3(0.05) * k * pow(max(sin(uv.y * 70.0 + t * 1.3), 0.0), 8.0);
  } else {
    // dream: drifting colour fringes and a slow glow
    vec2 dir = (uv - 0.5) * (0.006 + 0.003 * sin(t * 0.4));
    col.r = texture(u_tex, cover(q + dir)).r;
    col.g = texture(u_tex, cover(q)).g;
    col.b = texture(u_tex, cover(q - dir)).b;
    vec3 soft = texture(u_tex, cover(q), 4.0).rgb;
    col = mix(col, max(col, soft), 0.35 + 0.15 * sin(t * 0.3));
  }
  return col;
}`;

const frag = (body, defines = '') => `${HEAD}\n${defines}\n${body}\n${TAIL}`;
const pal = (a, b, c, d) =>
  ['A', 'B', 'C', 'D'].map((k, i) => `#define PAL_${k} vec3(${[a, b, c, d][i].join(',')})`).join('\n');

export const IMAGE_FRAG = frag(IMAGE);

export const THEMES = [
  { id: 'aurora', name: 'Aurora', note: 'Northern lights over a still ridge', accent: '#5ef2b0', base: '#03101a', frag: frag(AURORA) },
  { id: 'horizon', name: 'Horizon', note: 'Follows your local time of day', accent: '#ffb37a', base: '#141a3a', frag: frag(HORIZON) },
  { id: 'nebula', name: 'Nebula', note: 'Slow-churning deep space clouds', accent: '#ff7ac3', base: '#05051a', frag: frag(NEBULA) },
  {
    id: 'silk', name: 'Silk', note: 'Liquid sunset gradient', accent: '#ffb07a', base: '#1a0a33',
    frag: frag(SILK, pal([0.05, 0.02, 0.2], [0.42, 0.1, 0.62], [1.0, 0.4, 0.38], [1.0, 0.8, 0.5])),
  },
  {
    id: 'glacier', name: 'Glacier', note: 'Liquid ice and teal', accent: '#7fe3ff', base: '#04121f',
    frag: frag(SILK, pal([0.01, 0.04, 0.1], [0.03, 0.22, 0.42], [0.1, 0.62, 0.72], [0.75, 0.97, 0.95])),
  },
  {
    id: 'obsidian', name: 'Obsidian', note: 'Quiet graphite folds', accent: '#d7dbe6', base: '#0a0a0d',
    frag: frag(SILK, pal([0.02, 0.02, 0.028], [0.08, 0.085, 0.11], [0.2, 0.2, 0.25], [0.62, 0.62, 0.7])),
  },
  { id: 'bokeh', name: 'City Lights', note: 'Out-of-focus lights after dark', accent: '#ffb36b', base: '#070912', frag: frag(BOKEH) },
  { id: 'outrun', name: 'Outrun', note: 'Retro sun and an endless grid', accent: '#ff5fb7', base: '#12031f', frag: frag(OUTRUN) },
  { id: 'warp', name: 'Warp', note: 'Drifting through a star field', accent: '#9db8ff', base: '#03040c', frag: frag(WARP) },
  { id: 'topo', name: 'Contour', note: 'Shifting topographic lines', accent: '#4fe0c0', base: '#060d12', frag: frag(TOPO) },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
