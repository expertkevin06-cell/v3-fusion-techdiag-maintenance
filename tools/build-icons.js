#!/usr/bin/env node
/* Générateur d'icônes PWA MECADATA — Node.js, zéro dépendance.
   Usage : node tools/build-icons.js
   Produit icons/icon-192.png, icon-512.png, icon-maskable-192.png,
   icon-maskable-512.png, apple-touch-icon.png, favicon-32.png,
   favicon-16.png, icon.svg, preview.html */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const OUT = path.join(__dirname, "..", "icons");
const C = { bg0: [4, 7, 13], bg1: [17, 28, 49], hi: [255, 245, 170], mid: [255, 214, 10], lo: [255, 168, 0], ring: [37, 212, 238] };
const BOLT = [[0.615, 0.055], [0.270, 0.545], [0.470, 0.545], [0.385, 0.945], [0.745, 0.415], [0.535, 0.415], [0.690, 0.055]];

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii"), c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, c]);
}
function png(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  return Buffer.concat([sig, chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
function inside(x, y, p) {
  let ins = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
  }
  return ins;
}
function scale(p, s) { return p.map(q => [0.5 + (q[0] - 0.5) * s, 0.5 + (q[1] - 0.5) * s]); }
function edge(x, y, p) {
  let best = 1e9;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const ax = p[j][0], ay = p[j][1], bx = p[i][0], by = p[i][1];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((x - ax) * dx + (y - ay) * dy) / L : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < best) best = d;
  }
  return best;
}
function render(size, mask) {
  const SS = size <= 64 ? 4 : 3, buf = Buffer.alloc(size * size * 4);
  const poly = scale(BOLT, mask ? 0.68 : 0.86), glowR = mask ? 0.30 : 0.36, rad = mask ? 0 : 0.22;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = (x + (sx + 0.5) / SS) / size, py = (y + (sy + 0.5) / SS) / size;
      const d = Math.hypot(px - 0.42, py - 0.34) / 1.05;
      let col = mix(C.bg1, C.bg0, Math.min(1, d * 1.25));
      if (Math.abs(Math.hypot(px - 0.5, py - 0.5) - 0.44) < 0.006) col = mix(col, C.ring, 0.22);
      const eg = edge(px, py, poly), ins = inside(px, py, poly);
      if (!ins && eg < glowR) col = mix(col, C.lo, Math.pow(1 - eg / glowR, 2.4) * 0.55);
      if (ins) {
        const t = Math.max(0, Math.min(1, (py - 0.06) / 0.88));
        let bc = mix(C.hi, C.mid, Math.min(1, t * 1.6));
        bc = mix(bc, C.lo, Math.max(0, t - 0.55) / 0.45);
        if (eg < 0.018) bc = mix(bc, C.hi, 0.45 * (1 - eg / 0.018));
        col = bc;
      }
      let al = 255;
      if (rad > 0) {
        const cx = Math.max(rad, Math.min(1 - rad, px)), cy = Math.max(rad, Math.min(1 - rad, py)), dd = Math.hypot(px - cx, py - cy);
        if (dd > rad) al = 0; else if (dd > rad - 1.5 / size) al = Math.round(255 * (rad - dd) / (1.5 / size));
      }
      r += col[0]; g += col[1]; b += col[2]; a += al;
    }
    const n = SS * SS, o = (y * size + x) * 4;
    buf[o] = Math.round(r / n); buf[o + 1] = Math.round(g / n); buf[o + 2] = Math.round(b / n); buf[o + 3] = Math.round(a / n);
  }
  return buf;
}
function svg() {
  const pts = BOLT.map(p => (p[0] * 512).toFixed(1) + "," + (p[1] * 512).toFixed(1)).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><radialGradient id="bg" cx="42%" cy="34%" r="78%"><stop offset="0" stop-color="#111C31"/><stop offset="1" stop-color="#04070D"/></radialGradient>
<linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF5AA"/><stop offset=".45" stop-color="#FFD60A"/><stop offset="1" stop-color="#FFA800"/></linearGradient>
<clipPath id="round"><rect width="512" height="512" rx="112"/></clipPath></defs>
<g clip-path="url(#round)"><rect width="512" height="512" fill="url(#bg)"/>
<circle cx="256" cy="256" r="225" fill="none" stroke="#25D4EE" stroke-opacity=".22" stroke-width="4"/>
<polygon points="${pts}" fill="url(#bolt)"/>
<polygon points="${pts}" fill="none" stroke="#FFF5AA" stroke-opacity=".5" stroke-width="5"/></g></svg>`;
}
function write(n, d) { fs.writeFileSync(path.join(OUT, n), d); console.log("  OK  icons/" + n + "  (" + (d.length / 1024).toFixed(1) + " Ko)"); }

(function main() {
  console.log("\nMECADATA // génération des icônes PWA — éclair jaune\n");
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const T = [
    ["icon-192.png", 192, false], ["icon-512.png", 512, false],
    ["icon-maskable-192.png", 192, true], ["icon-maskable-512.png", 512, true],
    ["apple-touch-icon.png", 180, true], ["favicon-32.png", 32, false], ["favicon-16.png", 16, false]
  ];
  T.forEach(t => write(t[0], png(t[1], t[1], render(t[1], t[2]))));
  write("icon.svg", Buffer.from(svg(), "utf8"));
  write("preview.html", Buffer.from(`<!doctype html><meta charset="utf-8"><title>Icônes MECADATA</title>
<style>body{background:#04070D;color:#E6EEF9;font:14px system-ui;padding:28px}
.r{display:flex;gap:22px;flex-wrap:wrap;align-items:flex-end;margin-top:18px}
figure{margin:0;text-align:center}figcaption{color:#61748C;font-size:11px;margin-top:8px}
img{background:#0C1424;border-radius:14px;border:1px solid rgba(96,160,255,.2)}
h1{font-size:20px}p{color:#9FB2C8}</style>
<h1>MECADATA — icônes PWA</h1><p>Éclair jaune · prêtes pour PWABuilder.</p><div class="r">
${T.map(t => `<figure><img src="${t[0]}" width="${Math.min(t[1], 160)}" height="${Math.min(t[1], 160)}"><figcaption>${t[0]}<br>${t[1]}×${t[1]}</figcaption></figure>`).join("")}
</div>`, "utf8"));
  console.log("\nTerminé. Déployez icons/ à la racine, puis https://www.pwabuilder.com/\n");
})();
