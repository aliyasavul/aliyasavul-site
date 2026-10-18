// Image-based 3D amber.
// The stone was rendered offline from 120 angles around it, with a depth map for every view.
// Each view is drawn as a mesh pushed out by its depth, so it can be turned and tilted in real
// 3D between (and a little beyond) the rendered angles; the two nearest views are blended.
// Cheap on the GPU: two small meshes and one blend per frame, whatever the screen size.

const VS_WARP = `#version 300 es
precision highp float;
in vec2 aUV;
uniform sampler2D uDepth;
uniform vec4 uCell;
uniform mat3 uRot;
uniform float uDist, uFocal, uAspect, uNear, uRange;
out vec2 vUV;
out float vMask;
void main(){
  vec2 d = textureLod(uDepth, uCell.xy + aUV * uCell.zw, 0.0).rg;
  float t = uNear + d.r * uRange;
  vec2 s = vec2((aUV.x - 0.5) * uAspect, 0.5 - aUV.y);
  vec3 P = vec3(0.0, 0.0, uDist) + normalize(vec3(s * uFocal, -1.0)) * t;
  vec3 Q = uRot * P;
  float z = uDist - Q.z;
  vec2 p = Q.xy / (uFocal * z);
  gl_Position = vec4(p.x / (0.5 * uAspect), p.y / 0.5, clamp((z - uNear) / uRange, 0.0, 1.0) * 2.0 - 1.0, 1.0);
  vUV = aUV;
  vMask = d.g;
}`;

const FS_WARP = `#version 300 es
precision mediump float;
uniform sampler2D uColor;
in vec2 vUV;
in float vMask;
out vec4 o;
void main(){ o = vec4(texture(uColor, vUV).rgb, vMask); }`;

const VS_FULL = `#version 300 es
in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS_MIX = `#version 300 es
precision mediump float;
uniform sampler2D uA, uB;
uniform float uMix, uLift;
in vec2 vUV;
out vec4 o;
void main(){
  vec4 c = mix(texture(uA, vUV), texture(uB, vUV), uMix);
  vec2 q = (vUV - 0.5) * 2.0;
  float r = length(q);
  float t = clamp((r - 0.86) / 0.14, 0.0, 1.0);
  float fade = 1.0 - t * t * (3.0 - 2.0 * t);
  vec3 col = c.rgb * fade;
  col += col * uLift * c.a;
  o = vec4(col, 1.0);
}`;

function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; }
// column-major 3x3 multiply (same layout as GLSL mat3)
function mul(a, b) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
  return o;
}
const TAU = Math.PI * 2;
const MAX_TURN = 0.08;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export function createStone(canvas, opts) {
  const o = Object.assign({
    count: 120, frame: (k) => '/assets/amber/c' + String(k).padStart(3, '0') + '.webp',
    depth: '/assets/amber/depth.webp', grid: [12, 10], cell: [160, 200],
    dist: 4.6, focal: 0.6, aspect: 0.8, near: 3.4, range: 2.4,
    maxTextures: 10, onFirstFrame: null,
  }, opts || {});

  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    return p;
  }
  let warp, mixP;
  try {
    warp = program(VS_WARP, FS_WARP);
    mixP = program(VS_FULL, FS_MIX);
  } catch (e) {
    return null;
  }
  const U = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const uw = U(warp, ['uDepth', 'uCell', 'uRot', 'uDist', 'uFocal', 'uAspect', 'uNear', 'uRange', 'uColor']);
  const um = U(mixP, ['uA', 'uB', 'uMix', 'uLift']);

  // grid mesh over the frame
  const GW = 80, GH = 100;
  const verts = new Float32Array((GW + 1) * (GH + 1) * 2);
  let vi = 0;
  for (let y = 0; y <= GH; y++) for (let x = 0; x <= GW; x++) { verts[vi++] = x / GW; verts[vi++] = y / GH; }
  const idx = new Uint16Array(GW * GH * 6);
  let ii = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const a = y * (GW + 1) + x, b = a + 1, c = a + GW + 1, d = c + 1;
    idx[ii++] = a; idx[ii++] = c; idx[ii++] = b; idx[ii++] = b; idx[ii++] = c; idx[ii++] = d;
  }
  const meshVao = gl.createVertexArray();
  gl.bindVertexArray(meshVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const aUV = gl.getAttribLocation(warp, 'aUV');
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const fullVao = gl.createVertexArray();
  gl.bindVertexArray(fullVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(mixP, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // render targets for the two warped views
  const targets = [0, 1].map(() => ({ fb: gl.createFramebuffer(), tex: gl.createTexture(), depth: gl.createRenderbuffer(), w: 0, h: 0 }));
  function sizeTargets(w, h) {
    for (const t of targets) {
      if (t.w === w && t.h === h) continue;
      t.w = w; t.h = h;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, t.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, t.depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /* ---- data: depth atlas and colour frames ---- */
  let depthTex = null, atlasW = 0, atlasH = 0, failed = false, firstDrawn = false;
  const blobs = new Array(o.count);
  const textures = new Map();
  const decoding = new Set();
  let dirty = true;

  function loadDepth() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        depthTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        atlasW = img.naturalWidth; atlasH = img.naturalHeight;
        dirty = true;
        resolve();
      };
      img.onerror = () => reject(new Error('depth'));
      img.src = o.depth;
    });
  }

  function order(n, start) {
    const out = [], seen = new Set();
    const push = (k) => { k = ((k % n) + n) % n; if (!seen.has(k)) { seen.add(k); out.push(k); } };
    push(start); push(start + 1); push(start - 1);
    for (const step of [24, 12, 6, 3, 2, 1]) for (let k = 0; k < n; k += step) push(start + k);
    return out;
  }
  let queue = [];
  let active = 0;
  function pump() {
    while (active < 4 && queue.length) {
      const k = queue.shift();
      if (blobs[k]) continue;
      active++;
      fetch(o.frame(k)).then((r) => (r.ok ? r.blob() : Promise.reject(new Error('frame ' + k)))).then((b) => {
        blobs[k] = b;
        if (textures.size < 2) dirty = true;
      }).catch(() => { /* a missing frame is covered by its neighbours */ }).finally(() => { active--; pump(); });
    }
  }

  const angleOf = (k) => (k / o.count) * TAU;
  function upload(k) {
    if (textures.has(k) || decoding.has(k) || !blobs[k] || decoding.size >= 3) return;
    decoding.add(k);
    createImageBitmap(blobs[k]).then((bmp) => {
      if (failed) { bmp.close && bmp.close(); return; }
      let entry = null;
      if (textures.size >= o.maxTextures) {
        let oldK = -1, oldT = Infinity;
        for (const [kk, v] of textures) if (v.used < oldT && !v.pinned) { oldT = v.used; oldK = kk; }
        if (oldK >= 0) { entry = textures.get(oldK); textures.delete(oldK); }
      }
      if (!entry) entry = { tex: gl.createTexture(), used: 0 };
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (bmp.close) bmp.close();
      entry.used = performance.now();
      textures.set(k, entry);
      dirty = true;
    }).catch(() => { blobs[k] = null; }).finally(() => decoding.delete(k));
  }
  function nearestReady(k) {
    if (textures.has(k)) return k;
    for (let d = 1; d < o.count / 2; d++) {
      if (textures.has((k + d) % o.count)) return (k + d) % o.count;
      if (textures.has((k - d + o.count) % o.count)) return (k - d + o.count) % o.count;
    }
    return -1;
  }

  /* ---- drawing ---- */
  let lastW = 0, lastH = 0, quality = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    let dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    const px = r.width * r.height * dpr * dpr;
    if (px > 2.4e6) dpr *= Math.sqrt(2.4e6 / px);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (w !== lastW || h !== lastH) {
      canvas.width = w; canvas.height = h; lastW = w; lastH = h;
      sizeTargets(w, h);
      dirty = true;
    }
  }

  function cellOf(k) {
    const [cols] = o.grid, [cw, ch] = o.cell;
    const col = k % cols, row = Math.floor(k / cols);
    return [(col * cw + 0.5) / atlasW, (row * ch + 0.5) / atlasH, (cw - 1) / atlasW, (ch - 1) / atlasH];
  }

  function drawView(target, k, yaw, pitch, roll) {
    const e = textures.get(k);
    e.used = performance.now();
    // a view is only ever turned a few degrees away from where it was rendered; if the right
    // view is not decoded yet the stone lags for a moment instead of stretching
    const turn = Math.max(-MAX_TURN, Math.min(MAX_TURN, wrap(yaw - angleOf(k))));
    const m = mul(rotZ(roll), mul(rotX(pitch), rotY(turn)));
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, target.w, target.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(warp);
    gl.bindVertexArray(meshVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, depthTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, e.tex);
    gl.uniform1i(uw.uDepth, 0);
    gl.uniform1i(uw.uColor, 1);
    gl.uniform4fv(uw.uCell, cellOf(k));
    gl.uniformMatrix3fv(uw.uRot, false, m);
    gl.uniform1f(uw.uDist, o.dist);
    gl.uniform1f(uw.uFocal, o.focal);
    gl.uniform1f(uw.uAspect, o.aspect);
    gl.uniform1f(uw.uNear, o.near);
    gl.uniform1f(uw.uRange, o.range);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    gl.disable(gl.DEPTH_TEST);
  }

  let last = { yaw: NaN, pitch: NaN, roll: NaN, lift: NaN };
  function render(yaw, pitch, roll, lift = 0, force = false) {
    if (failed || !depthTex) return false;
    resize();
    const pos = (((yaw % TAU) + TAU) % TAU) / TAU * o.count;
    const k0 = Math.floor(pos) % o.count, k1 = (k0 + 1) % o.count, f = pos - Math.floor(pos);
    const delta = isNaN(last.yaw) ? 0 : wrap(yaw - last.yaw);
    const dir = Math.sign(delta);
    upload(k0); upload(k1);
    // decode the views the stone is about to turn into (about a quarter second ahead)
    const ahead = Math.min(8, 2 + Math.ceil((Math.abs(delta) * 15) / (TAU / o.count)));
    for (let s = 1; s <= ahead; s++) upload((k0 + (dir < 0 ? -s : s + 1) + o.count * 4) % o.count);
    const a = nearestReady(k0), b = nearestReady(k1);
    if (a < 0) return false;
    const changed = dirty || Math.abs(yaw - last.yaw) > 1e-5 || Math.abs(pitch - last.pitch) > 1e-5 || Math.abs(roll - last.roll) > 1e-5 || Math.abs(lift - last.lift) > 1e-3;
    if (!changed && !force) return true;
    dirty = false;
    last = { yaw, pitch, roll, lift };
    drawView(targets[0], a, yaw, pitch, roll);
    const blend = b >= 0 && b !== a;
    if (blend) drawView(targets[1], b, yaw, pitch, roll);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(mixP);
    gl.bindVertexArray(fullVao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, targets[0].tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (blend ? targets[1] : targets[0]).tex);
    gl.uniform1i(um.uA, 0);
    gl.uniform1i(um.uB, 1);
    // when only one neighbour is ready, stay on it; otherwise blend by position between the two
    let mixAB = 0;
    if (blend) {
      const da = Math.abs(wrap(yaw - angleOf(a))), db = Math.abs(wrap(yaw - angleOf(b)));
      mixAB = da + db > 1e-6 ? da / (da + db) : 0.5;
    }
    gl.uniform1f(um.uMix, mixAB);
    gl.uniform1f(um.uLift, lift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    if (!firstDrawn) { firstDrawn = true; if (o.onFirstFrame) o.onFirstFrame(); }
    return true;
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); failed = true; if (o.onFail) o.onFail(); });

  const ready = loadDepth().then(() => {
    queue = order(o.count, 0);
    pump();
  }).catch(() => { failed = true; if (o.onFail) o.onFail(); });

  return {
    ready,
    render,
    get loaded() { return blobs.filter(Boolean).length; },
    get failed() { return failed; },
    get drawn() { return firstDrawn; },
    get quality() { return quality; },
    // lower the drawing resolution on slow devices (1 = full)
    setQuality(q) { q = Math.min(1, Math.max(0.4, q)); if (q !== quality) { quality = q; dirty = true; } },
    needsDraw() { return dirty; },
  };
}
