// Turns a decoded recording into an MP3 off the main thread, so the panel stays responsive.
// In:  { left: Float32Array, right: Float32Array | null, sampleRate, kbps }
// Out: { progress: 0..1 } while working, then { done: true, blob } (audio/mpeg), or { error }.
/* global lamejs */
importScripts('/admin/vendor/lame.min.js');

// 16-bit with a little triangular dither, so quiet fades stay smooth instead of turning grainy
function toInt16(src, dst, from, n) {
  for (let i = 0; i < n; i++) {
    const v = src[from + i] * 32767 + (Math.random() - Math.random());
    dst[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : Math.round(v);
  }
}

self.onmessage = (e) => {
  try {
    const { left, right, sampleRate, kbps } = e.data;
    const stereo = !!right;
    const enc = new lamejs.Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps);
    const block = 1152 * 20;
    const a = new Int16Array(block), b = new Int16Array(block);
    const parts = [];
    const total = left.length;
    let last = 0;
    for (let i = 0; i < total; i += block) {
      const n = Math.min(block, total - i);
      toInt16(left, a, i, n);
      if (stereo) toInt16(right, b, i, n);
      const out = stereo ? enc.encodeBuffer(a.subarray(0, n), b.subarray(0, n)) : enc.encodeBuffer(a.subarray(0, n));
      if (out.length) parts.push(new Uint8Array(out.buffer, out.byteOffset, out.length).slice());
      const p = (i + n) / total;
      if (p - last > 0.01) { last = p; self.postMessage({ progress: p }); }
    }
    const end = enc.flush();
    if (end.length) parts.push(new Uint8Array(end.buffer, end.byteOffset, end.length).slice());
    self.postMessage({ done: true, blob: new Blob(parts, { type: 'audio/mpeg' }) });
  } catch (err) {
    self.postMessage({ error: String((err && err.message) || err) });
  }
};
