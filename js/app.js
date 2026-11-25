/* MECADATA v9.5 — moteur blindé.
   • Chaque étape d'initialisation est isolée : une exception ne peut plus
     produire d'écran noir ni bloquer l'ouverture.
   • Chaque contrôle d'autovérification est isolé : un test qui échoue est
     signalé, jamais propagé.
   • buildPlan garantit toujours au moins une révision et atteint 200 000 km,
     quel que soit l'état des gabarits d'entretien.
   • Purge du cache (localStorage applicatif, session, CacheStorage PWA,
     service workers) à chaque ouverture. */
(function () {
  "use strict";
  var D = document;
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  var EM = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return EM[c]; }); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function fmt(n) { n = num(n, 0); try { return n.toLocaleString("fr-FR"); } catch (e) { return String(n); } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, num(v, a))); }
  function uid(p) { return p + Math.random().toString(36).slice(2, 7).toUpperCase(); }
  function clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { var s = String(v == null ? "" : v).trim(); return s || (d || ""); }
  function list(v) { if (Array.isArray(v)) return v.filter(Boolean); return String(v == null ? "" : v).split(/[;,|]/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function pair(v, d) { var a = arr(v); return [num(a[0], d[0]), num(a[1], d[1])]; }
  function kmOf(f) { var p = pair(f && f.km, [0, 200000]); if (p[0] > p[1]) return [p[1], p[0]]; return p; }
  function yOf(f) { var p = pair(f && f.y, [2017, 2027]); if (p[0] > p[1]) return [p[1], p[0]]; return p; }
  function costOf(f) { var p = pair(f && f.cost, [0, 0]); if (p[1] < p[0]) p[1] = p[0]; return p; }
  function ov(a, b) { var x = pair(a, [0, 0]), y = pair(b, [0, 0]); return x[0] <= y[1] && y[0] <= x[1]; }
  function ic(n, st) { return "<svg class='ic'" + (st ? " style='" + st + "'" : "") + "><use href='#i-" + n + "'/></svg>"; }
  function deb(f, t) { var h; return function () { var a = arguments, s = this; clearTimeout(h); h = setTimeout(function () { f.apply(s, a); }, t); }; }
  function nk(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function slug(s) { return nk(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || uid("x"); }
  var ERRORS = [];
  function logErr(w, e) { var m = w + " : " + ((e && e.message) ? e.message : String(e)); ERRORS.push({ ts: Date.now(), m: m }); if (ERRORS.length > 60) ERRORS.shift(); try { window.__MD_ERR.push({ msg: m, src: "app", line: 0, col: 0 }); } catch (x) {} }
  window.addEventListener("error", function (e) { logErr("window", e.error || e.message); });
  window.addEventListener("unhandledrejection", function (e) { logErr("promise", e.reason); });
  function safe(w, f, fb) { try { return f(); } catch (e) { logErr(w, e); return fb; } }

  var MEM = {};
  var STORE = {
    local: false, session: false,
    probe: function () { try { localStorage.setItem("__m", "1"); localStorage.removeItem("__m"); this.local = true; } catch (e) {} try { sessionStorage.setItem("__m", "1"); sessionStorage.removeItem("__m"); this.session = true; } catch (e) {} },
    get: function (k) { if (this.local) { try { return localStorage.getItem(k); } catch (e) {} } return MEM[k] || null; },
    set: function (k, v) { if (this.local) { try { localStorage.setItem(k, v); return true; } catch (e) { this.local = false; } } MEM[k] = v; return true; },
    del: function (k) { if (this.local) { try { localStorage.removeItem(k); } catch (e) {} } delete MEM[k]; }
  };
  STORE.probe();
  function download(n, c, m) { safe("dl", function () { var b = new Blob([c], { type: m || "application/json" }), u = URL.createObjectURL(b), a = D.createElement("a"); a.href = u; a.download = n; D.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 700); }, null); }

  var PREF = { sound: true }, AU = { ctx: null };
  function beep(k) {
    if (!PREF.sound) return;
    safe("audio", function () {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      AU.ctx = AU.ctx || new C(); if (AU.ctx.state === "suspended") AU.ctx.resume();
      var c = AU.ctx, t = c.currentTime;
      function p(f0, f1, d, ty, g, dt) { dt = dt || 0; var o = c.createOscillator(), v = c.createGain(); o.type = ty; o.frequency.setValueAtTime(f0, t + dt); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dt + d); v.gain.setValueAtTime(0, t + dt); v.gain.linearRampToValueAtTime(g, t + dt + 0.008); v.gain.exponentialRampToValueAtTime(0.0001, t + dt + d); o.connect(v); v.connect(c.destination); o.start(t + dt); o.stop(t + dt + d + 0.03); }
      if (k === "tick") p(1700, 1400, 0.045, "square", 0.03);
      else if (k === "open") p(320, 560, 0.09, "sine", 0.045);
      else if (k === "close") p(520, 300, 0.08, "sine", 0.035);
      else if (k === "ok") { p(660, 0, 0.09, "sine", 0.055); p(990, 0, 0.14, "sine", 0.055, 0.09); }
      else if (k === "err") p(150, 110, 0.2, "sawtooth", 0.06);
      else if (k === "del") p(240, 110, 0.14, "square", 0.045);
      else if (k === "imp") { p(520, 0, 0.08, "sine", 0.045); p(660, 0, 0.08, "sine", 0.045, 0.08); p(880, 0, 0.16, "sine", 0.05, 0.16); }
    }, null);
  }
  function toast(type, title, msg, undo) {
    var box = $("#ts"); if (!box) return;
    while (box.children.length >= 3) box.removeChild(box.firstChild);
    var el = D.createElement("div"); el.className = "to " + type;
    var h = ic({ ok: "check", err: "alert", warn: "alert", info: "info" }[type] || "info") + "<div style='flex:1;min-width:0'><b>" + esc(title) + "</b>" + (msg ? "<p>" + esc(msg) + "</p>" : "") + "</div>";
    if (undo) h += "<button class='btn xs amb' data-act='undo'>Annuler</button>";
    h += "<span class='pg' style='animation-duration:" + (undo ? 8 : 4.6) + "s'></span>";
    el.innerHTML = h; box.appendChild(el);
    var kill = function () { el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260); };
    el._t = setTimeout(kill, undo ? 8000 : 4600);
    el.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-act=undo]")) { clearTimeout(el._t); kill(); } });
  }
  var modalOpen = false;
  function openModal(html, cls) { var r = $("#md"); if (!r) return; r.innerHTML = "<div class='ms' data-act='mscrim'><div class='mo " + (cls || "") + "'>" + html + "</div></div>"; requestAnimationFrame(function () { r.classList.add("on"); }); D.body.classList.add("lock"); modalOpen = true; beep("open"); var f = r.querySelector("input,select,textarea,button"); if (f) setTimeout(function () { f.focus(); }, 80); }
  function closeModal() { var r = $("#md"); if (!r || !r.innerHTML) return; r.classList.remove("on"); modalOpen = false; if (!S.drawer) D.body.classList.remove("lock"); setTimeout(function () { if (!modalOpen) r.innerHTML = ""; }, 220); beep("close"); }
  function confirmModal(t, m, a, l) { openModal("<div class='mh'>" + ic("alert", "color:#FFAF2E") + "<h3>" + esc(t) + "</h3><button class='tb' data-act='mclose'>" + ic("x") + "</button></div><div class='mb2'><p class='muted'>" + esc(m) + "</p></div><div class='mf'><button class='btn ghost' data-act='mclose'>Annuler</button><button class='btn dgr' data-act='" + a + "'>" + esc(l || "Confirmer") + "</button></div>", "slim"); }

  /* ══════════ PURGE DU CACHE À L'OUVERTURE ══════════ */
  var PWD = "Kevin83600", TPWD = "expert83";
  var KEY = "mecadata_v9", AKEY = "md_access_v9", PKEY = "md_pub_v9";
  var LEGACY = ["mecadata_v72", "mecadata_v73", "mecadata_v8", "mecadata_v81", "md_access_v8", "md_access_v81", "md_pub_v8", "md_pub_v81", "md_adm", "md_boot"];
  var PURGED = { local: 0, session: 0, caches: 0, sw: 0, done: false };
  function purgeCache(full) {
    var n = 0;
    LEGACY.forEach(function (k) { if (STORE.get(k) !== null) { STORE.del(k); n++; } });
    if (STORE.get(KEY) !== null) { STORE.del(KEY); n++; }
    if (STORE.get(PKEY) !== null) { STORE.del(PKEY); n++; }
    if (full && STORE.get(AKEY) !== null) { STORE.del(AKEY); n++; }
    PURGED.local = n;
    var s = 0;
    try { if (window.sessionStorage) { s = sessionStorage.length; sessionStorage.clear(); } } catch (e) {}
    PURGED.session = s;
    Object.keys(MEM).forEach(function (k) { if (full || k.indexOf("s:") === 0) delete MEM[k]; });
    safe("caches", function () {
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) {
          PURGED.caches = arr(ks).length;
          arr(ks).forEach(function (k) { safe("cacheDel", function () { caches.delete(k); }, null); });
        }).catch(function () {});
      }
    }, null);
    safe("sw", function () {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          PURGED.sw = arr(rs).length;
          arr(rs).forEach(function (r) { safe("unreg", function () { r.unregister(); }, null); });
        }).catch(function () {});
      }
    }, null);
    PURGED.done = true;
    return PURGED;
  }
  function purgeLabel() { return PURGED.local + " entrée(s) locale(s) · " + PURGED.session + " session · " + PURGED.caches + " cache(s) PWA · " + PURGED.sw + " service worker(s)"; }

  /* ══════════ STUDIO ══════════ */
  var WP = {
    P: { mode: "nebula", theme: "diag", useCustom: false, custom: { bg: "#04070D", a: "#FFD60A", b: "#25D4EE", c: "#E45CFF", d: "#43E08B" }, density: 64, count: 150, speed: 100, turb: 38, scale: 66, glow: 60, blur: 0, stroke: 1.4, drift: 40, dir: 1, quality: "std", grid: true, run: true, bg: true },
    TH: { diag: { n: "Diagnostic", bg: "#04070D", a: "#FFD60A", b: "#25D4EE", c: "#E45CFF", d: "#43E08B" }, torque: { n: "Couple", bg: "#0B0603", a: "#FFAF2E", b: "#FF7A3D", c: "#FF4D5E", d: "#FFD98A" }, acid: { n: "Acide", bg: "#040A06", a: "#A8E63C", b: "#43E08B", c: "#25D4EE", d: "#E4FF7A" }, plasma: { n: "Plasma", bg: "#08040F", a: "#E45CFF", b: "#8F7CFF", c: "#25D4EE", d: "#FF6FB1" }, ocean: { n: "Océan", bg: "#02080C", a: "#19B8A6", b: "#4D8DFF", c: "#25D4EE", d: "#7CE8D0" }, steel: { n: "Acier", bg: "#070A0E", a: "#9FB2C8", b: "#5F7288", c: "#25D4EE", d: "#E6EEF9" }, ember: { n: "Braise", bg: "#0A0405", a: "#FF4D5E", b: "#FF7A3D", c: "#FFAF2E", d: "#FFC9A8" }, violet: { n: "Violet", bg: "#06040F", a: "#8F7CFF", b: "#E45CFF", c: "#4D8DFF", d: "#C9BFFF" } },
    MODES: [["nebula", "NEBULA"], ["aurora", "AURORA"], ["flux", "FLUX"], ["grid", "GRILLE"], ["radar", "RADAR"], ["scope", "SCOPE"], ["gears", "MÉCA"], ["tunnel", "TUNNEL"]],
    PRESETS: { "Nebula or": { mode: "nebula", theme: "diag", density: 66, count: 160, speed: 80, turb: 40, scale: 70, glow: 66, stroke: 1.4, drift: 42, dir: 1 }, "Braise lente": { mode: "aurora", theme: "ember", density: 72, count: 120, speed: 45, turb: 26, scale: 88, glow: 74, stroke: 1.2, drift: 24, dir: 1 }, "Tunnel acide": { mode: "tunnel", theme: "acid", density: 60, count: 140, speed: 140, turb: 30, scale: 60, glow: 62, stroke: 1.6, drift: 30, dir: 1 }, "Radar atelier": { mode: "radar", theme: "acid", density: 60, count: 110, speed: 85, turb: 30, scale: 70, glow: 70, stroke: 1.6, drift: 30, dir: 1 }, "Scope 4 cyl": { mode: "scope", theme: "acid", density: 66, count: 100, speed: 130, turb: 52, scale: 60, glow: 66, stroke: 1.6, drift: 18, dir: 1 }, "Méca couple": { mode: "gears", theme: "torque", density: 60, count: 90, speed: 80, turb: 24, scale: 74, glow: 52, stroke: 1.6, drift: 22, dir: 1 }, "Grille acier": { mode: "grid", theme: "steel", density: 55, count: 80, speed: 60, turb: 20, scale: 48, glow: 34, stroke: 1.2, drift: 26, dir: 1 }, "Flux océan": { mode: "flux", theme: "ocean", density: 68, count: 170, speed: 110, turb: 48, scale: 64, glow: 58, stroke: 1.2, drift: 34, dir: 1 } },
    targets: [], raf: 0, t: 0, last: 0, running: false, fails: 0,
    pal: function () { if (this.P.useCustom) { var c = this.P.custom || {}; return { n: "Personnalisée", bg: str(c.bg, "#04070D"), a: str(c.a, "#FFD60A"), b: str(c.b, "#25D4EE"), c: str(c.c, "#E45CFF"), d: str(c.d, "#43E08B") }; } return this.TH[this.P.theme] || this.TH.diag; },
    init: function () { var cv = $("#bgc"); if (cv) { var cx = safe("ctx", function () { return cv.getContext("2d"); }, null); if (cx) this.targets.push({ cv: cv, ctx: cx, scale: 0.5, W: 0, H: 0, st: null, key: "" }); } this.resize(); var s = this; window.addEventListener("resize", deb(function () { s.resize(); }, 150)); D.addEventListener("visibilitychange", function () { if (D.hidden) s.stop(); else if (s.P.run) s.start(); }); if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) this.P.run = false; this.apply(); },
    attach: function (cv) { this.targets = this.targets.filter(function (t) { return t.cv.id === "bgc"; }); if (cv) { var cx = safe("ctx2", function () { return cv.getContext("2d"); }, null); if (cx) this.targets.push({ cv: cv, ctx: cx, scale: 1, W: 0, H: 0, st: null, key: "", preview: true }); } this.resize(); if (this.P.run) this.start(); else this.drawAll(); },
    detach: function () { this.targets = this.targets.filter(function (t) { return !t.preview; }); },
    resize: function () { var d = Math.min(window.devicePixelRatio || 1, this.P.quality === "eco" ? 1 : (this.P.quality === "ultra" ? 2 : 1.5)); this.targets.forEach(function (t) { var w = t.preview ? (t.cv.clientWidth || 640) : window.innerWidth, h = t.preview ? (t.cv.clientHeight || 330) : window.innerHeight; t.W = Math.max(1, w); t.H = Math.max(1, h); t.cv.width = Math.round(t.W * d); t.cv.height = Math.round(t.H * d); safe("tr", function () { t.ctx.setTransform(d, 0, 0, d, 0, 0); }); t.key = ""; }); this.drawAll(); },
    set: function (k, v) { this.P[k] = v; if (k === "quality") this.resize(); if (["mode", "count", "scale", "density"].indexOf(k) > -1) this.targets.forEach(function (t) { t.key = ""; }); this.fx(); if (k === "run") { if (v) this.start(); else this.stop(); } this.drawAll(); save(); this.sync(); },
    setCustom: function (k, v) { if (!this.P.custom) this.P.custom = {}; this.P.custom[k] = v; this.P.useCustom = true; this.drawAll(); save(); this.sync(); },
    randomize: function () { var ms = this.MODES.map(function (m) { return m[0]; }), ts = Object.keys(this.TH), R = Math.random; this.P.mode = ms[Math.floor(R() * ms.length)]; this.P.theme = ts[Math.floor(R() * ts.length)]; this.P.useCustom = R() < 0.4; if (this.P.useCustom) { var h = function () { return hsl(Math.floor(R() * 360), 70 + Math.floor(R() * 30), 55 + Math.floor(R() * 15)); }; this.P.custom = { bg: hsl(Math.floor(R() * 360), 40, 4), a: h(), b: h(), c: h(), d: h() }; } this.P.density = 30 + Math.round(R() * 65); this.P.count = 60 + Math.round(R() * 240); this.P.speed = 40 + Math.round(R() * 140); this.P.turb = Math.round(R() * 90); this.P.scale = 28 + Math.round(R() * 110); this.P.glow = 20 + Math.round(R() * 75); this.P.stroke = +(0.7 + R() * 2.3).toFixed(1); this.P.drift = 10 + Math.round(R() * 80); this.P.dir = R() < 0.5 ? 1 : -1; this.apply(); this.resize(); save(); },
    reset: function () { this.P = { mode: "nebula", theme: "diag", useCustom: false, custom: { bg: "#04070D", a: "#FFD60A", b: "#25D4EE", c: "#E45CFF", d: "#43E08B" }, density: 64, count: 150, speed: 100, turb: 38, scale: 66, glow: 60, blur: 0, stroke: 1.4, drift: 40, dir: 1, quality: "std", grid: true, run: true, bg: true }; this.apply(); this.resize(); save(); },
    fx: function () { var bc = $("#bgc"); if (bc) { bc.style.opacity = this.P.bg ? "1" : "0"; bc.style.filter = this.P.blur ? ("blur(" + this.P.blur + "px)") : "none"; } var sc = $("#screen"); if (sc) { var c = sc.querySelector("canvas"); if (c) c.style.filter = this.P.blur ? ("blur(" + this.P.blur + "px)") : "none"; } },
    apply: function () { this.fx(); this.targets.forEach(function (t) { t.key = ""; }); if (this.P.run && !D.hidden) this.start(); else { this.stop(); this.drawAll(); } this.sync(); },
    start: function () { if (this.running || !this.targets.length) return; this.running = true; this.last = performance.now(); var s = this; var loop = function (n) { if (!s.running) return; var dt = Math.min(0.05, (n - s.last) / 1000); s.last = n; s.t += dt * (s.P.speed / 100) * s.P.dir; s.drawAll(); s.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); },
    stop: function () { this.running = false; cancelAnimationFrame(this.raf); },
    mk: function (t) { var P = this.P, W = t.W, H = t.H, I = P.density / 100, n = Math.round(clamp(P.count * (W * H) / (1280 * 720), 12, 320) * t.scale), i, pts = [], bl = [], ln = []; for (i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (0.2 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1), vy: (Math.random() - 0.5) * 0.4, r: 0.8 + Math.random() * 1.9, p: Math.random() * 6.28, k: Math.floor(Math.random() * 4) }); for (i = 0; i < Math.round(16 * I) + 5; i++) bl.push({ a: Math.random() * 6.28, d: 0.14 + Math.random() * 0.82, h: 0 }); for (i = 0; i < Math.round(9 * I) + 3; i++) ln.push({ h: Math.random() < 0.5, pos: Math.random(), sp: 0.0007 + Math.random() * 0.0022, o: Math.random() }); return { pts: pts, blips: bl, lanes: ln, gears: null, goff: 0 }; },
    drawAll: function () { var s = this; this.targets.forEach(function (t) { if (!t.W || !t.H) return; if (!t.preview && !s.P.bg) return; var k = [s.P.mode, s.P.count, s.P.scale, s.P.density, t.W, t.H, t.scale].join("|"); if (t.key !== k) { t.st = s.mk(t); t.key = k; } try { s.draw(t.ctx, t.W, t.H, s.t, s.P, t.st, s.pal(), t.scale); } catch (e) { s.fails++; logErr("scene", e); if (s.fails > 3) { s.P.mode = "grid"; s.fails = 0; t.key = ""; } } }); },
    draw: function (c, W, H, t, P, st, TH, sc) {
      var I = P.density / 100, TB = P.turb / 100, G = P.glow / 100, LW = P.stroke, DR = 0.2 + P.drift / 100, SP = P.speed / 100, cols = [TH.a, TH.b, TH.c, TH.d], i, j;
      function glow(v) { c.shadowColor = v; c.shadowBlur = G * 16; } function ng() { c.shadowBlur = 0; }
      function hx(a) { return clamp(Math.round(a * 255), 0, 255).toString(16).padStart(2, "0"); }
      c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.fillStyle = (P.mode === "scope") ? TH.bg + "2E" : TH.bg; c.fillRect(0, 0, W, H); c.lineWidth = LW; c.lineCap = "round";
      if (P.grid && P.mode !== "aurora" && P.mode !== "nebula") { var s0 = Math.max(18, P.scale), o0 = (t * 9 * DR) % s0; c.strokeStyle = TH.a + "12"; c.beginPath(); for (i = -o0; i < W + s0; i += s0) { c.moveTo(i, 0); c.lineTo(i, H); } for (j = -o0 * 0.6; j < H + s0; j += s0) { c.moveTo(0, j); c.lineTo(W, j); } c.stroke(); }
      if (P.mode === "nebula" || P.mode === "aurora") {
        c.globalCompositeOperation = "lighter";
        var bl = [[0.28, 0.32, 0], [0.72, 0.6, 1], [0.5, 0.2, 2], [0.34, 0.8, 3], [0.82, 0.24, 0]];
        for (i = 0; i < bl.length; i++) { var b = bl[i], bx = W * (b[0] + Math.sin(t * 0.19 * DR + i * 1.7) * 0.14), by = H * (b[1] + Math.cos(t * 0.16 * DR + i * 1.1) * 0.14), br = Math.min(W, H) * (0.3 + 0.12 * Math.sin(t * 0.27 + i)); var gg = c.createRadialGradient(bx, by, 0, bx, by, br); gg.addColorStop(0, cols[b[2]] + hx(0.2 * I + 0.05)); gg.addColorStop(0.55, cols[b[2]] + hx(0.07 * I)); gg.addColorStop(1, cols[b[2]] + "00"); c.fillStyle = gg; c.fillRect(0, 0, W, H); }
        c.globalCompositeOperation = "source-over";
        var du = arr(st && st.pts).slice(0, Math.round(90 * sc));
        for (i = 0; i < du.length; i++) { var d = du[i]; d.p += 0.02 * SP; d.y -= 0.12 * SP * DR; if (d.y < -4) d.y = H + 4; if (d.y > H + 4) d.y = -4; c.fillStyle = TH.d + hx((0.12 + Math.sin(d.p) * 0.12) * I + 0.04); c.fillRect(d.x, d.y, d.r * 0.9, d.r * 0.9); }
      } else if (P.mode === "flux") {
        var pts = arr(st && st.pts);
        for (i = 0; i < pts.length; i++) { var p = pts[i]; p.x += p.vx * SP * 1.7 + Math.sin(t * 0.6 + p.p) * TB * 0.7; p.y += p.vy * SP * 1.7 + Math.cos(t * 0.5 + p.p) * TB * 0.7; if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12; if (p.y < -12) p.y = H + 12; if (p.y > H + 12) p.y = -12; }
        var R = Math.max(48, P.scale * 1.4), R2 = R * R;
        for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) { var a = pts[i], b2 = pts[j], dx = a.x - b2.x, dy = a.y - b2.y, d2 = dx * dx + dy * dy; if (d2 < R2) { c.strokeStyle = TH.a + hx((1 - d2 / R2) * 0.14 * I); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b2.x, b2.y); c.stroke(); } }
        for (i = 0; i < pts.length; i++) { var q = pts[i], col = cols[q.k % 4]; glow(col); c.fillStyle = col; c.globalAlpha = 0.72 * I + 0.15; c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.283); c.fill(); c.globalAlpha = 1; ng(); }
      } else if (P.mode === "grid") {
        var s1 = Math.max(18, P.scale), o1 = (t * 9 * DR) % s1; c.strokeStyle = TH.b + "14"; c.beginPath(); for (i = -o1 * 2; i < W + H; i += s1 * 4) { c.moveTo(i, 0); c.lineTo(i - H, H); } c.stroke();
        var lanes = arr(st && st.lanes);
        for (i = 0; i < lanes.length; i++) { var l = lanes[i]; l.o = (l.o + l.sp * SP * 2 + 1) % 1; var px = l.h ? W * l.o : H * l.o; glow(TH.a); c.fillStyle = TH.a + "CC"; if (l.h) c.fillRect(px, Math.floor(l.pos * H / s1) * s1 - o1 * 0.6, 26, LW + 1); else c.fillRect(Math.floor(l.pos * W / s1) * s1 - o1, px, LW + 1, 26); ng(); }
        var gp = arr(st && st.pts);
        for (i = 0; i < gp.length; i += 2) { var z = gp[i]; if (!z) continue; z.p += 0.02 * SP; c.strokeStyle = TH.a + hx((0.22 + Math.sin(z.p) * 0.18) * I); c.beginPath(); c.moveTo(z.x - 5, z.y); c.lineTo(z.x + 5, z.y); c.moveTo(z.x, z.y - 5); c.lineTo(z.x, z.y + 5); c.stroke(); }
      } else if (P.mode === "radar") {
        var cx = W * 0.66, cy = H * 0.46, RR = Math.min(W, H) * 0.42, ang = (t * 0.8 * SP) % 6.283; c.strokeStyle = TH.a + "22";
        for (i = 1; i <= 4; i++) { c.beginPath(); c.arc(cx, cy, RR * i / 4, 0, 6.283); c.stroke(); }
        c.beginPath(); c.moveTo(cx - RR, cy); c.lineTo(cx + RR, cy); c.moveTo(cx, cy - RR); c.lineTo(cx, cy + RR); c.stroke();
        if (c.createConicGradient) { var cg = c.createConicGradient(ang, cx, cy); cg.addColorStop(0, TH.a + "55"); cg.addColorStop(0.14, TH.a + "00"); cg.addColorStop(1, TH.a + "00"); c.fillStyle = cg; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, RR, 0, 6.283); c.fill(); }
        glow(TH.a); c.strokeStyle = TH.a; c.lineWidth = LW + 0.6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * RR, cy + Math.sin(ang) * RR); c.stroke(); ng(); c.lineWidth = LW;
        var bs = arr(st && st.blips);
        for (i = 0; i < bs.length; i++) { var bp = bs[i]; if (!bp) continue; var da = ((ang - bp.a) % 6.283 + 6.283) % 6.283; if (da < 0.07) bp.h = 1; bp.h *= 0.986; if (bp.h > 0.02) { glow(TH.d); c.fillStyle = TH.d + hx(bp.h * 0.9); c.beginPath(); c.arc(cx + Math.cos(bp.a) * RR * bp.d, cy + Math.sin(bp.a) * RR * bp.d, 3, 0, 6.283); c.fill(); ng(); } }
      } else if (P.mode === "scope") {
        var ch = Math.max(2, Math.round(2 + I * 4));
        for (var k2 = 0; k2 < ch; k2++) { var base = H * (k2 + 0.6) / (ch + 0.2), amp = H / (ch * 3.1), col2 = cols[k2 % 4]; glow(col2); c.strokeStyle = col2; c.lineWidth = LW + 0.4; c.beginPath(); for (i = 0; i <= W; i += 3) { var u = i / W * 12 + t * 1.6 * SP + k2 * 1.3, y = base + Math.sin(u) * amp * 0.6 + Math.sin(u * 3.1 + k2) * amp * 0.28 * TB; if (i) c.lineTo(i, y); else c.moveTo(i, y); } c.stroke(); ng(); c.fillStyle = col2 + "99"; c.font = "9px monospace"; c.fillText("CYL" + (k2 + 1), 8, base - amp - 4); }
        c.lineWidth = LW;
      } else if (P.mode === "gears") {
        var sg = Math.max(30, P.scale), ag = t * 0.7 * SP * DR * 2;
        if (!st.gears) { var defs = [[sg * 1.15, 18], [sg * 0.78, 12], [sg * 0.55, 9], [sg * 0.9, 14]], ar = []; for (i = 0; i < defs.length; i++) { var r2 = defs[i][0], pr = ar[i - 1], ccx = i ? pr.cx + pr.r + r2 + sg * 0.16 : 0; ar.push({ cx: ccx, r: r2, teeth: defs[i][1], col: cols[i % 4], dir: i % 2 ? -1 : 1, ratio: 18 / defs[i][1] }); } st.gears = ar; st.goff = -ar[ar.length - 1].cx / 2; }
        c.save(); c.translate(W * 0.5 + st.goff, H * 0.44);
        for (i = 0; i < st.gears.length; i++) { var g2 = st.gears[i]; c.save(); c.translate(g2.cx, 0); c.rotate(ag * g2.dir * g2.ratio); glow(g2.col); c.strokeStyle = g2.col; c.lineWidth = LW + 0.5; c.beginPath(); c.arc(0, 0, g2.r, 0, 6.283); c.stroke(); for (j = 0; j < g2.teeth; j++) { var aa = j * 6.283 / g2.teeth; c.beginPath(); c.moveTo(Math.cos(aa) * g2.r, Math.sin(aa) * g2.r); c.lineTo(Math.cos(aa) * (g2.r + sg * 0.16), Math.sin(aa) * (g2.r + sg * 0.16)); c.stroke(); } ng(); c.restore(); }
        c.restore(); c.lineWidth = LW;
      } else {
        var cx2 = W * 0.5, cy2 = H * 0.5, maxR = Math.max(W, H) * 0.75, rings = Math.round(10 + I * 16);
        for (i = 0; i < rings; i++) { var zz = ((i / rings) + (t * 0.06 * SP * DR)) % 1; if (zz < 0) zz += 1; var rr = maxR * (0.04 + zz * zz), al = clamp(zz * 0.9, 0, 1) * (0.25 + I * 0.5), col3 = cols[i % 4]; glow(col3); c.strokeStyle = col3 + hx(al * 0.55); c.lineWidth = LW + zz * 1.6; c.beginPath(); for (j = 0; j <= 6; j++) { var ta = j * 1.0472 + t * 0.05 * DR + zz * 0.6, tx = cx2 + Math.cos(ta) * rr, ty = cy2 + Math.sin(ta) * rr * 0.72; if (j) c.lineTo(tx, ty); else c.moveTo(tx, ty); } c.stroke(); ng(); }
        c.lineWidth = LW;
      }
      c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    },
    label: function (k, v) { var u = { density: "%", speed: "%", turb: "%", glow: "%", scale: " px", stroke: " px", blur: " px", drift: "%", count: "" }; return ((k === "stroke" || k === "blur") ? num(v, 0).toFixed(1) : Math.round(num(v, 0))) + (u[k] || ""); },
    sync: function () { var P = this.P, rb = $("#runb"); if (rb) { rb.innerHTML = ic(P.run ? "pause" : "play"); rb.classList.toggle("on", P.run); } $$(".mb").forEach(function (b) { b.classList.toggle("on", b.dataset.m === P.mode); }); $$(".pb").forEach(function (b) { b.classList.toggle("on", !P.useCustom && b.dataset.t === P.theme); }); $$("[data-p]").forEach(function (el) { var k = el.dataset.p, v = P[k]; if (el.type === "checkbox") el.checked = !!v; else if (el !== D.activeElement) el.value = v; var o = $("[data-pv='" + k + "']"); if (o) o.textContent = WP.label(k, v); }); $$("[data-c]").forEach(function (el) { if (el !== D.activeElement) el.value = (P.custom || {})[el.dataset.c] || "#000000"; }); var ct = $("#customToggle"); if (ct) ct.checked = !!P.useCustom; var h = $("#hud"); if (h) h.innerHTML = "<span>" + P.mode.toUpperCase() + "</span><span>" + esc(this.pal().n).toUpperCase() + "</span><span>" + (P.dir > 0 ? "AVANT" : "ARRIÈRE") + "</span><span>" + (P.run ? "LIVE" : "PAUSE") + "</span>"; }
  };
  function hsl(h, s, l) { s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { var v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return Math.round(255 * v).toString(16).padStart(2, "0"); }; return "#" + f(0) + f(8) + f(4); }

  /* ══════════ CONSTANTES ══════════ */
  var YMAX = 2027, KMMAX = 200000;
  var RAW = window.MD_RAW || { br: [], md: {}, me: {}, ft: [], ts: [], svc: [], cand: [], segs: [] };
  var SEGS = arr(RAW.segs).length ? RAW.segs : ["Citadine", "Micro-citadine", "Compacte", "SUV urbain", "SUV compact", "Berline", "Break", "Ludospace", "Utilitaire", "Coupé", "Roadster", "Sportive", "Monospace", "Pick-up"];
  var FU = { e: { l: "Essence", c: "#FFAF2E" }, d: { l: "Diesel", c: "#4D8DFF" }, h: { l: "Hybride", c: "#43E08B" }, p: { l: "Hybride rechargeable", c: "#19B8A6" }, b: { l: "Électrique", c: "#E45CFF" }, g: { l: "GPL", c: "#A8E63C" } };
  var SV = { critique: { w: 32, c: "#FF4D5E" }, majeure: { w: 18, c: "#FF7A3D" }, "modérée": { w: 9, c: "#FFAF2E" }, mineure: { w: 4, c: "#4D8DFF" }, info: { w: 0, c: "#25D4EE" } };
  var FQ = { "élevée": 1.25, moyenne: 1, faible: 0.7 };
  var REGIONS = { france: "France", europe: "Europe", asie: "Asie", chine: "Chine", amerique: "Amérique" };
  var FILES = [["brands", "brands.json", "Marques"], ["models", "models.json", "Modèles"], ["engines", "engines.json", "Motorisations"], ["faults", "faults.json", "Pannes"], ["tsb", "tsb.json", "TSB / Rappels"]];
  function nsev(v) { var k = nk(v), m = { critique: "critique", critical: "critique", majeure: "majeure", major: "majeure", moderee: "modérée", moderate: "modérée", moyenne: "modérée", mineure: "mineure", minor: "mineure", faible: "mineure", info: "info", note: "info" }; return m[k] || (SV[v] ? v : "modérée"); }
  function nfreq(v) { var k = nk(v), m = { elevee: "élevée", high: "élevée", moyenne: "moyenne", medium: "moyenne", faible: "faible", low: "faible" }; return m[k] || (FQ[v] ? v : "moyenne"); }
  function nfuel(v) { var k = nk(v), m = { e: "e", essence: "e", petrol: "e", d: "d", diesel: "d", h: "h", hybride: "h", hybrid: "h", p: "p", phev: "p", rechargeable: "p", b: "b", ev: "b", electrique: "b", electric: "b", g: "g", gpl: "g" }; return m[k] || (FU[k] ? k : "e"); }
  function regionOf(p) { var k = nk(p); if (k.indexOf("france") > -1) return "france"; if (k.indexOf("chine") > -1) return "chine"; if (k.indexOf("japon") > -1 || k.indexOf("coree") > -1 || k.indexOf("vietnam") > -1) return "asie"; if (k.indexOf("etatsunis") > -1) return "amerique"; return "europe"; }
  function IVL(v) { v = num(v, 0); return v >= 75 ? ["CRITIQUE", "#FF4D5E"] : v >= 50 ? ["ÉLEVÉ", "#FF7A3D"] : v >= 25 ? ["MODÉRÉ", "#FFAF2E"] : ["FAIBLE", "#43E08B"]; }
  var SVC_FALLBACK = { key: "fallback", fams: ["*"], fuel: "*", base: 20000, months: 12, oil: ["5W-30 ACEA C3", 4.5], dist: ["Selon constructeur", 150000, 72], items: [["Vidange huile + filtre", 20000, 12], ["Filtre habitacle", 20000, 12], ["Filtre à air", 40000, 48], ["Bougies", 60000, 48], ["Liquide de freins", 0, 24], ["Liquide refroidissement", 120000, 60], ["Contrôle plaquettes disques", 20000, 12], ["Contrôle trains géométrie", 40000, 24], ["Contrôle pneumatiques", 10000, 6]], controls: ["Niveau huile", "Niveau LDR", "Pression pneus", "Plaquettes", "Jeux direction", "Fuites sous caisse", "Voyants valise"], fluids: ["DOT4", "G12 OAT", "120", "2.4", "2.4", "R1234yf", "AGM 70Ah"] };

  /* ══════════ ÉTAT ══════════ */
  var SEED = null, DB = { brands: [], models: [], engines: [], faults: [], tsb: [] }, AUDIT = [], UNDO = null, TESTS = [], IVIC = {}, MIDX = {}, BIDX = {}, EIDX = {}, IMPORT = null, FIXES = 0, LASTSAVE = 0, DIRTY = false, PENDING = 0;
  var META = { counts: { b: 0, m: 0, e: 0, f: 0, t: 0, rc: 0, fam: 0, dom: 0 }, links: 0, corr: 0, integ: { err: [], ok: true, pct: 100 }, size: 0, byBrand: {}, regions: {} };
  var MODE = null, TIER = null, REG = { users: [], live: false, rev: 0, log: [] }, CH = null, GATE_MODE = null;
  var S = { view: "bord", sel: { b: "", m: "", e: "" }, f: { q: "", fuel: [], region: "", sort: "brand" }, shown: 48, tech: { tab: "faults", q: "", sev: "", brand: "", model: "", phase: "", dom: "", km: "", region: "" }, adm: { tab: "files", mega: "" }, calc: { km: 60000, year: 2021, sev: 1 }, drawer: null, omni: { q: "", hits: [], idx: -1 }, testFilter: "" };
  window.MD_STATE = S;
  function isAdmin() { return MODE === "admin"; }
  function isTier() { return MODE === "tier"; }

  /* ══════════ ACCÈS ══════════ */
  function regLoad() { var raw = STORE.get(AKEY), r = null; if (raw) safe("reg", function () { r = JSON.parse(raw); }, null); if (!r || !Array.isArray(r.users)) r = { users: [], live: false, rev: 0, log: [] }; if (!Array.isArray(r.log)) r.log = []; r.rev = num(r.rev, 0); REG = r; return r; }
  function regSave() { STORE.set(AKEY, JSON.stringify(REG)); bcast({ t: "reg" }); }
  function bcast(m) { try { if (CH) CH.postMessage(m); } catch (e) {} }
  function regLog(a) { REG.log.unshift({ ts: Date.now(), a: a }); if (REG.log.length > 80) REG.log.pop(); }
  function pendingCount() { return arr(REG.users).filter(function (u) { return u && u.status === "pending"; }).length; }
  function tierUser() { if (!TIER) return null; var us = arr(REG.users); for (var i = 0; i < us.length; i++) if (us[i] && us[i].id === TIER) return us[i]; return null; }
  function tierName() { var u = tierUser(); return u ? str(u.name, "") : ""; }
  function applyTierSnapshot() { var raw = STORE.get(PKEY); if (!raw) return false; return safe("pub", function () { var d = JSON.parse(raw); if (d && d.db && arr(d.db.engines).length) { DB = d.db; FIXES += normalize(DB); recompute(); return true; } return false; }, false); }

  /* ══════════ CATALOGUE ══════════ */
  function mkEng(n, mid, code, fam, label, fuel, disp, hp, nm, y0, y1, gb) {
    fuel = nfuel(fuel); disp = num(disp, 0); hp = clamp(num(hp, 100), 1, 3000); nm = num(nm, 200);
    var cyl = fuel === "b" ? "ÉLEC" : (disp >= 6000 ? "W12+" : (disp > 3400 ? "V8+" : (disp > 2400 ? "6 cyl." : (disp < 1100 ? "L3" : "L4"))));
    var a = num(y0, 2017), b = num(y1, 2027); if (a > b) { var t = a; a = b; b = t; }
    return { id: "E" + String(n).padStart(4, "0"), m: [mid], code: str(code, "GEN"), fam: str(fam, str(code, "GEN")), label: str(label, "Motorisation"), fuel: fuel, disp: disp, hp: hp, nm: nm, kw: Math.round(hp * 0.7355), y: [a, b], gb: str(gb, "BVM"), norm: fuel === "b" ? "ZE" : (a >= 2024 ? "Euro 6e" : (a >= 2020 ? "Euro 6d" : "Euro 6")), cyl: cyl, asp: fuel === "b" ? "—" : "Turbo", inj: fuel === "b" ? "—" : (fuel === "d" ? "Common Rail" : "Injection directe") };
  }
  function build(R) {
    var Out = { brands: [], models: [], engines: [], faults: [], tsb: [] };
    arr(R.br).forEach(function (b) { if (!b || !b[0]) return; Out.brands.push({ id: str(b[0], "x"), n: str(b[1], b[0]), pays: str(b[2], "—"), grp: str(b[3], "—"), region: str(b[4], regionOf(b[2])) }); });
    var md = R.md || {}, me = R.me || {};
    Object.keys(md).forEach(function (bid) {
      arr(md[bid]).forEach(function (m) {
        if (!m || !m[0]) return;
        var y0 = num(m[1], 2017), y1 = num(m[2], 2027); if (y0 > y1) { var t = y0; y0 = y1; y1 = t; }
        Out.models.push({ id: bid + "-" + slug(m[0]), b: bid, n: str(m[0], "Modèle"), y: [y0, y1], seg: str(SEGS[clamp(num(m[3], 2), 0, 13)], "Compacte"), phase: clamp(num(m[4], 1), 1, 12) });
      });
    });
    var n = 0;
    Out.models.forEach(function (m) {
      arr(me[m.id]).forEach(function (e) { if (!e) return; n++; Out.engines.push(mkEng(n, m.id, e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[8], e[9], e[7])); });
    });
    arr(R.ft).forEach(function (f, i) {
      f = arr(f); if (!f.length) return;
      var c = pair([f[13], f[14]], [0, 0]); if (c[1] < c[0]) c[1] = c[0];
      var yy = pair([f[6], f[7]], [2017, YMAX]); if (yy[0] > yy[1]) yy = [yy[1], yy[0]];
      var kk = pair([f[8], f[9]], [0, KMMAX]); if (kk[0] > kk[1]) kk = [kk[1], kk[0]];
      Out.faults.push({ id: "F" + String(i + 1).padStart(3, "0"), t: str(f[0], "Fiche"), fam: list(f[1]), mt: list(f[2]), ph: list(f[3]), sev: nsev(f[4]), freq: nfreq(f[5]), y: yy, km: kk, sym: list(f[10]), cause: str(f[11], "Cause à expertiser"), fix: str(f[12], "Diagnostic valise requis"), cost: c, status: str(f[15], "Surveillance"), dom: str(f[16], "Moteur") });
    });
    arr(R.ts).forEach(function (t, i) {
      t = arr(t); if (!t.length) return;
      var date = str(t[6], "2026-01"); if (!/^\d{4}-\d{2}$/.test(date)) date = "2026-01";
      Out.tsb.push({ id: "T" + String(i + 1).padStart(3, "0"), ref: str(t[0], "REF-" + (i + 1)), b: list(t[1]), fam: list(t[2]), mt: list(t[3]), ph: list(t[4]), t: str(t[5], "Bulletin"), date: date, cat: str(t[7], "Moteur"), sev: nsev(t[8]), sum: str(t[9], "Bulletin technique constructeur."), act: str(t[10], "Appliquer la procédure constructeur."), dom: str(t[11], str(t[7], "Moteur")) });
    });
    return Out;
  }
  function normalize(d) {
    var fx = 0;
    if (!d || typeof d !== "object") return 1;
    FILES.forEach(function (f) { if (!Array.isArray(d[f[0]])) { d[f[0]] = []; fx++; } });
    var bs = {}, ms = {}, seen = {};
    d.brands = arr(d.brands).filter(function (b) { if (!b || !b.id) { fx++; return false; } if (seen["b" + b.id]) { fx++; return false; } seen["b" + b.id] = 1; bs[b.id] = 1; b.n = str(b.n, b.id); b.pays = str(b.pays, "—"); b.grp = str(b.grp, "—"); if (!REGIONS[b.region]) { b.region = regionOf(b.pays); fx++; } return true; });
    d.models = arr(d.models).filter(function (m) { if (!m || !m.id || !bs[m.b]) { fx++; return false; } if (seen["m" + m.id]) { fx++; return false; } seen["m" + m.id] = 1; ms[m.id] = 1; m.n = str(m.n, "Modèle"); m.y = yOf(m); m.phase = clamp(num(m.phase, 1), 1, 12); m.seg = str(m.seg, "Compacte"); return true; });
    d.engines = arr(d.engines).filter(function (e) {
      if (!e || !e.id) { fx++; return false; }
      e.m = list(e.m).filter(function (x) { return ms[x]; });
      if (!e.m.length) { fx++; return false; }
      if (seen["e" + e.id]) { e.id = uid("E"); fx++; }
      seen["e" + e.id] = 1;
      e.code = str(e.code, "GEN"); e.fam = str(e.fam, e.code); e.label = str(e.label, "Motorisation");
      e.fuel = nfuel(e.fuel); e.disp = num(e.disp, 0); e.hp = clamp(num(e.hp, 100), 1, 3000); e.nm = num(e.nm, 200);
      e.kw = Math.round(e.hp * 0.7355); e.y = yOf(e); e.gb = str(e.gb, "BVM");
      e.norm = str(e.norm, e.fuel === "b" ? "ZE" : "Euro 6"); e.cyl = str(e.cyl, "L4"); e.asp = str(e.asp, "Turbo"); e.inj = str(e.inj, "Injection directe");
      return true;
    });
    d.faults = arr(d.faults).filter(function (f) {
      if (!f || !f.id) { fx++; return false; }
      if (seen["f" + f.id]) { f.id = uid("F"); fx++; }
      seen["f" + f.id] = 1;
      f.t = str(f.t, "Fiche"); var s = nsev(f.sev); if (s !== f.sev) fx++; f.sev = s;
      var q = nfreq(f.freq); if (q !== f.freq) fx++; f.freq = q;
      f.fam = list(f.fam); f.mt = list(f.mt); f.ph = list(f.ph); f.sym = list(f.sym);
      if (!f.sym.length) { f.sym = ["Symptôme à confirmer"]; fx++; }
      f.y = yOf(f); f.km = kmOf(f); f.cost = costOf(f);
      f.cause = str(f.cause, "Cause à expertiser"); f.fix = str(f.fix, "Diagnostic valise requis");
      f.status = str(f.status, "Surveillance"); f.dom = str(f.dom, "Moteur");
      return true;
    });
    d.tsb = arr(d.tsb).filter(function (t) {
      if (!t || !t.id) { fx++; return false; }
      if (seen["t" + t.id]) { t.id = uid("T"); fx++; }
      seen["t" + t.id] = 1;
      t.ref = str(t.ref, t.id); t.t = str(t.t, "Bulletin");
      var s = nsev(t.sev); if (s !== t.sev) fx++; t.sev = s;
      t.b = list(t.b).filter(function (x) { return bs[x]; }); t.fam = list(t.fam); t.mt = list(t.mt); t.ph = list(t.ph);
      t.date = str(t.date, "2026-01"); if (!/^\d{4}-\d{2}$/.test(t.date)) { t.date = "2026-01"; fx++; }
      t.cat = str(t.cat, "Moteur"); t.dom = str(t.dom, t.cat);
      t.sum = str(t.sum, "Bulletin technique constructeur."); t.act = str(t.act, "Appliquer la procédure constructeur.");
      return true;
    });
    return fx;
  }
  function reindex() { MIDX = {}; BIDX = {}; EIDX = {}; arr(DB.models).forEach(function (m) { MIDX[m.id] = m; }); arr(DB.brands).forEach(function (b) { BIDX[b.id] = b; }); arr(DB.engines).forEach(function (e) { EIDX[e.id] = e; }); }
  function brandOf(e) { if (!e) return null; var m = MIDX[arr(e.m)[0]]; return m ? (BIDX[m.b] || null) : null; }
  function modelOf(e) { if (!e) return null; return MIDX[arr(e.m)[0]] || null; }
  function engName(e) { var m = modelOf(e), b = brandOf(e); return ((b ? b.n : "") + " " + (m ? m.n : "") + " — " + str(e && e.label, "")).trim(); }
  function tokHit(l, name) { var a = arr(l); if (!a.length) return false; var n = nk(name); for (var i = 0; i < a.length; i++) { var t = nk(a[i]); if (t === "*") return true; if (t && n.indexOf(t) > -1) return true; } return false; }
  function phaseOk(ph, m) { var a = arr(ph); if (!a.length || a.indexOf("*") > -1) return true; return a.indexOf(String(m && m.phase)) > -1; }
  function fApply(f, e, m) { if (!f || !e || !m) return false; if (!(arr(f.fam).indexOf(e.fam) > -1 || tokHit(f.mt, m.n))) return false; return phaseOk(f.ph, m); }
  function tApply(t, e, m) { if (!t || !e || !m) return false; if (!(arr(t.fam).indexOf(e.fam) > -1 || tokHit(t.mt, m.n) || arr(t.b).indexOf(m.b) > -1)) return false; return phaseOk(t.ph, m); }
  function faultsFor(e) { var m = modelOf(e); if (!m) return []; var out = []; arr(DB.faults).forEach(function (f) { if (!fApply(f, e, m)) return; var g = clone(f); g.km = kmOf(f); g.y = yOf(f); g.cost = costOf(f); g.active = ov(g.y, yOf(e)) && ov(g.y, yOf(m)); out.push(g); }); out.sort(function (a, b) { var d = (b.active ? 1 : 0) - (a.active ? 1 : 0); return d !== 0 ? d : ((SV[b.sev] || SV["modérée"]).w - (SV[a.sev] || SV["modérée"]).w); }); return out; }
  function tsbFor(e) { var m = modelOf(e); if (!m) return []; var out = []; arr(DB.tsb).forEach(function (t) { if (tApply(t, e, m)) out.push(t); }); out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); return out; }
  function isRecall(t) { return !!t && (t.cat === "Rappel" || /^RPL-/.test(String(t.ref))); }
  function ivi(e) { if (!e || !e.id) return 0; if (IVIC[e.id] !== undefined) return IVIC[e.id]; var s = 0, fs = faultsFor(e); for (var i = 0; i < fs.length; i++) { var w = (SV[fs[i].sev] || SV["modérée"]).w * (FQ[fs[i].freq] || 1); s += fs[i].active ? w : w * 0.25; } s = clamp(Math.round(s), 0, 100); IVIC[e.id] = s; return s; }
  function enginesForFault(f) { return arr(DB.engines).filter(function (e) { return fApply(f, e, modelOf(e)); }); }
  function enginesForTsb(t) { return arr(DB.engines).filter(function (e) { return tApply(t, e, modelOf(e)); }); }
  function integrity() { var err = [], mi = {}, bi = {}, du = 0; arr(DB.models).forEach(function (m) { mi[m.id] = 1; }); arr(DB.brands).forEach(function (b) { bi[b.id] = 1; }); FILES.forEach(function (f) { var s = {}; arr(DB[f[0]]).forEach(function (x) { if (!x) return; if (s[x.id]) du++; s[x.id] = 1; }); }); if (du) err.push(du + " id dupliqué(s)"); arr(DB.models).forEach(function (m) { if (!bi[m.b]) err.push("marque inconnue " + m.b); }); arr(DB.engines).forEach(function (e) { arr(e.m).forEach(function (i) { if (!mi[i]) err.push("moteur orphelin " + e.id); }); }); arr(DB.faults).forEach(function (f) { if (!SV[f.sev]) err.push("sévérité " + f.sev); }); return { err: err, ok: !err.length, pct: err.length ? Math.max(0, 100 - err.length * 7) : 100 }; }
  function recompute() {
    IVIC = {}; reindex();
    var links = 0, corr = 0, bb = {}, doms = {}, fams = {}, regs = {}, i;
    var es = arr(DB.engines);
    for (i = 0; i < es.length; i++) { var e = es[i], m = MIDX[arr(e.m)[0]]; fams[e.fam] = 1; links += arr(e.m).length; if (m) bb[m.b] = (bb[m.b] || 0) + 1; corr += faultsFor(e).length + tsbFor(e).length; }
    arr(DB.brands).forEach(function (b) { regs[b.region] = (regs[b.region] || 0) + 1; });
    arr(DB.faults).forEach(function (f) { links += arr(f.fam).length; doms[f.dom] = 1; });
    arr(DB.tsb).forEach(function (t) { links += arr(t.b).length + arr(t.fam).length; doms[t.dom] = 1; });
    META = { counts: { b: arr(DB.brands).length, m: arr(DB.models).length, e: es.length, f: arr(DB.faults).length, t: arr(DB.tsb).length, rc: arr(DB.tsb).filter(isRecall).length, fam: Object.keys(fams).length, dom: Object.keys(doms).length }, links: links, corr: corr, integ: integrity(), size: Math.round(JSON.stringify(DB).length / 1024), byBrand: bb, regions: regs };
  }

  /* ══════════ PLAN 200 000 KM — GARANTI ══════════ */
  function svcList() { var l = arr(RAW.svc).filter(function (s) { return s && num(s.base, 0) > 0; }); return l.length ? l : [SVC_FALLBACK]; }
  function svcFor(e) {
    var l = svcList(), i, j, fam = str(e && e.fam, ""), fuel = str(e && e.fuel, "e");
    for (i = 0; i < l.length; i++) { var s = l[i], fs = arr(s.fams); if (fs.indexOf("*") > -1) continue; for (j = 0; j < fs.length; j++) if (fs[j] === fam) return s; }
    for (i = 0; i < l.length; i++) { var g = l[i]; if (arr(g.fams).indexOf("*") > -1 && g.fuel === fuel) return g; }
    for (i = 0; i < l.length; i++) { if (arr(l[i].fams).indexOf("*") > -1) return l[i]; }
    return SVC_FALLBACK;
  }
  function buildPlan(e, m, b) {
    var s = svcFor(e) || SVC_FALLBACK;
    var base = clamp(num(s.base, 20000), 5000, 40000), months = clamp(num(s.months, 12), 6, 48);
    var items = arr(s.items).filter(function (x) { return Array.isArray(x) && x[0]; });
    if (!items.length) items = SVC_FALLBACK.items;
    var controls = arr(s.controls).filter(Boolean); if (!controls.length) controls = SVC_FALLBACK.controls;
    var dist = arr(s.dist).length >= 3 ? s.dist : SVC_FALLBACK.dist;
    var annual = Math.max(8000, Math.round(base * (12 / months))), visits = [], km, i;
    for (km = base; km <= KMMAX; km += base) {
      var ops = [];
      for (i = 0; i < items.length; i++) {
        var it = items[i], ik = num(it[1], 0), im = num(it[2], 0);
        if (ik > 0) { if (km % ik === 0) ops.push(str(it[0], "Opération")); }
        else if (im > 0) { var due = Math.round(annual * im / 12), step = Math.max(base, Math.round(due / base) * base); if (step > 0 && km % step === 0) ops.push(str(it[0], "Opération") + " (échéance " + im + " mois)"); }
      }
      var dk = num(dist[1], 0);
      if (dk > 0 && km >= dk && km - dk < base) ops.push(str(dist[0], "Distribution") + " — REMPLACEMENT (" + fmt(dk) + " km / " + num(dist[2], 0) + " mois)");
      if (!ops.length) ops.push("Révision intermédiaire constructeur");
      visits.push({ km: km, mo: Math.round(km / annual * 12), ops: ops, ctrl: controls.slice() });
    }
    if (num(dist[1], 0) > KMMAX) visits.push({ km: num(dist[1], 0), mo: num(dist[2], 0), ops: [str(dist[0], "Distribution") + " — REMPLACEMENT"], ctrl: ["Contrôle tension et guides"] });
    if (!visits.length) visits.push({ km: KMMAX, mo: Math.round(KMMAX / annual * 12), ops: ["Révision générale 200 000 km"], ctrl: controls.slice() });
    visits.sort(function (a, b2) { return num(a.km, 0) - num(b2.km, 0); });
    return { svc: s, visits: visits, base: base, months: months, annual: annual, brand: b || null, model: m || null, engine: e || null };
  }
  function lastVisitKm(pl) { var v = arr(pl && pl.visits); var l = v[v.length - 1]; return l ? num(l.km, 0) : 0; }
  function planHTML(pl, compact) {
    var s = pl.svc || SVC_FALLBACK, e = pl.engine || {}, m = pl.model, b = pl.brand, h = "", i, j;
    var oil = arr(s.oil).length >= 2 ? s.oil : SVC_FALLBACK.oil, dist = arr(s.dist).length >= 3 ? s.dist : SVC_FALLBACK.dist;
    var fl = arr(s.fluids); while (fl.length < 7) fl.push("—");
    h += "<div class='selcard'><h3>" + ic("car", "width:16px;height:16px") + " " + esc((b ? b.n : "—") + " " + (m ? m.n : "")) + " · " + esc(str(e.label, "Motorisation")) + "</h3>";
    h += "<div class='sg'><div class='sp'><span>Région</span><b class='hl'>" + (b ? REGIONS[b.region] : "—") + "</b></div><div class='sp'><span>Phase</span><b class='hl'>" + (m ? m.phase : "—") + "</b></div><div class='sp'><span>Code moteur</span><b class='hl'>" + esc(str(e.code, "—")) + "</b></div><div class='sp'><span>Puissance</span><b class='hl'>" + num(e.hp, 0) + " ch / " + num(e.kw, 0) + " kW</b></div><div class='sp'><span>Couple</span><b class='hl'>" + num(e.nm, 0) + " Nm</b></div><div class='sp'><span>Boîte</span><b class='hl'>" + esc(str(e.gb, "—")) + "</b></div><div class='sp'><span>Production</span><b class='hl'>" + yOf(e).join("-") + "</b></div><div class='sp'><span>Intervalle</span><b class='hl'>" + fmt(pl.base) + " km / " + pl.months + " mois</b></div></div></div>";
    h += "<div class='oil'><div class='oc'><span>" + ic("oil", "width:11px;height:11px") + "HUILE</span><b>" + esc(str(oil[0], "—")) + "</b><p>" + (num(oil[1], 0) ? num(oil[1], 0) + " L · " : "") + esc(str(e.fam, "—")) + "</p></div>";
    h += "<div class='oc b'><span>" + ic("piston", "width:11px;height:11px") + "DISTRIBUTION</span><b>" + esc(str(dist[0], "—")) + "</b><p>" + (num(dist[1], 0) ? fmt(dist[1]) + " km" + (num(dist[2], 0) ? " / " + num(dist[2], 0) + " mois" : "") : "Chaîne — sans remplacement programmé") + "</p></div></div>";
    h += "<div class='sg' style='margin-bottom:12px'>" + [["Liquide de freins", fl[0]], ["Refroidissement", fl[1]], ["Couple roues", fl[2] + " Nm"], ["Pression pneus", fl[3] + " / " + fl[4] + " bar"], ["Fluide clim", fl[5]], ["Batterie 12V", fl[6]]].map(function (r) { return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>"; }).join("") + "</div>";
    h += "<div class='tw' style='max-height:" + (compact ? "380px" : "none") + ";overflow:auto'><table class='vtab'><thead><tr><th>Kilométrage</th><th>Échéance</th><th>Interventions</th><th>Contrôles systématiques</th></tr></thead><tbody>";
    for (i = 0; i < arr(pl.visits).length; i++) { var v = pl.visits[i]; if (!v) continue; h += "<tr><td class='km'>" + fmt(v.km) + " km</td><td class='ct'>" + num(v.mo, 0) + " mois</td><td><ul>"; for (j = 0; j < arr(v.ops).length; j++) h += "<li>" + esc(v.ops[j]) + "</li>"; h += "</ul></td><td class='ct'>" + esc(arr(v.ctrl).join(" · ")) + "</td></tr>"; }
    h += "</tbody></table></div><p class='dim mono' style='font-size:9.5px;margin-top:9px'>PLAN COMPLET JUSQU'À 200 000 KM — ESTIMATION INGÉNIEUR, CARNET CONSTRUCTEUR PRIORITAIRE.</p>";
    return h;
  }
  function dueHTML(pl) {
    var km = clamp(S.calc.km, 0, 400000), yr = clamp(S.calc.year, 2005, YMAX), sev = num(S.calc.sev, 1) || 1;
    var now = new Date(), age = Math.max(1, (now.getFullYear() - yr) * 12 + now.getMonth()), rows = [], s = pl.svc || SVC_FALLBACK, i;
    var base = Math.max(5000, Math.round(num(pl.base, 20000) * sev)), next = Math.max(base, Math.ceil((km + 1) / base) * base), rem = next - km;
    rows.push({ op: "Révision " + fmt(next) + " km", u: rem / base, badge: rem <= 1500 ? "ÉCHÉANCE PROCHE" : (rem <= base * 0.2 ? "BIENTÔT" : "DANS " + fmt(rem) + " KM"), cls: rem <= 1500 ? "now" : (rem <= base * 0.2 ? "soon" : "ok"), pct: clamp((base - rem) / base * 100, 0, 100), detail: "Prochaine révision à " + fmt(next) + " km" });
    var items = arr(s.items);
    for (i = 0; i < items.length; i++) { var it = items[i]; if (!Array.isArray(it)) continue; var raw = num(it[1], 0); if (raw <= 0 || raw <= base) continue; var ik = Math.max(1000, Math.round(raw * sev)), nx = Math.max(ik, Math.ceil((km + 1) / ik) * ik), rm = nx - km; rows.push({ op: str(it[0], "Opération"), u: rm / ik, badge: rm <= 1500 ? "À FAIRE" : (rm <= ik * 0.2 ? "BIENTÔT" : "DANS " + fmt(rm) + " KM"), cls: rm <= 1500 ? "now" : (rm <= ik * 0.2 ? "soon" : "ok"), pct: clamp((ik - rm) / ik * 100, 0, 100), detail: "Échéance " + fmt(nx) + " km" }); }
    var dist = arr(s.dist), dk = num(dist[1], 0);
    if (dk > 0) { var dr = dk - km; rows.push({ op: "Distribution : " + str(dist[0], "—"), u: Math.max(0, dr) / dk, badge: dr <= 0 ? "DÉPASSÉ" : (dr <= 10000 ? "À PLANIFIER" : "DANS " + fmt(Math.max(0, dr)) + " KM"), cls: dr <= 0 ? "now" : (dr <= 10000 ? "soon" : "ok"), pct: clamp(km / dk * 100, 0, 100), detail: "Remplacement à " + fmt(dk) + " km / " + num(dist[2], 0) + " mois" }); }
    var bf = Math.ceil(age / 24) * 24, br = bf - age;
    rows.push({ op: "Liquide de freins", u: br / 24, badge: br <= 1 ? "À FAIRE" : (br <= 3 ? "BIENTÔT" : "DANS " + br + " MOIS"), cls: br <= 1 ? "now" : (br <= 3 ? "soon" : "ok"), pct: clamp((24 - br) / 24 * 100, 0, 100), detail: "Échéance temporelle 24 mois" });
    rows.sort(function (a, b) { return a.u - b.u; });
    var h = ""; rows.forEach(function (r) { var dc = r.cls === "now" ? "#FF4D5E" : (r.cls === "soon" ? "#FFAF2E" : "#43E08B"); h += "<div class='drow' style='--dc:" + dc + "'><div class='dr1'><b>" + esc(r.op) + "</b><span class='dbadge " + r.cls + "'>" + r.badge + "</span></div><div class='pb'><i style='width:" + Math.round(r.pct) + "%'></i></div><div class='dim mono' style='font-size:9.5px;margin-top:5px'>" + esc(r.detail) + "</div></div>"; });
    return h;
  }

  /* ══════════ SAUVEGARDE ══════════ */
  function saveNow() { if (!isAdmin()) return; safe("save", function () { STORE.set(KEY, JSON.stringify({ v: 95, db: DB, audit: AUDIT.slice(-60), prefs: PREF, wp: WP.P, ts: Date.now() })); LASTSAVE = Date.now(); DIRTY = false; updStor(); }, null); }
  var save = deb(saveNow, 350);
  function markDirty() { if (!isAdmin()) return; DIRTY = true; save(); }
  function audit(t, m) { AUDIT.push({ ts: Date.now(), type: t, msg: m }); if (AUDIT.length > 150) AUDIT = AUDIT.slice(-150); }
  function snapshot(l) { UNDO = { label: l, db: clone(DB) }; }
  function doUndo() { if (!UNDO) return; DB = UNDO.db; var l = UNDO.label; UNDO = null; mutate("imp", "Annulation : " + l); toast("ok", "Action annulée"); }
  function publish(auto) { if (!isAdmin()) return; REG.rev = num(REG.rev, 0) + 1; STORE.set(PKEY, JSON.stringify({ ts: Date.now(), rev: REG.rev, db: DB })); regLog("Diffusion rev " + REG.rev + (auto ? " (auto)" : "")); regSave(); bcast({ t: "pub", rev: REG.rev }); if (!auto) toast("ok", "Diffusé aux tiers", "Révision " + REG.rev + " — " + fmt(META.counts.e) + " motorisations."); }
  function mutate(t, m) { FIXES += normalize(DB); recompute(); audit(t, m); markDirty(); if (REG.live && isAdmin()) publish(true); updateMeta(); render(); if (S.drawer) renderDrawer(); }

  /* ══════════ FRAGMENTS ══════════ */
  function sevTag(s) { s = nsev(s); return "<span class='sev " + (s === "modérée" ? "mode" : esc(s)) + "'>" + esc(s) + "</span>"; }
  function fuelTag(f) { var x = FU[nfuel(f)] || { l: f, c: "#9FB2C8" }; return "<span class='fuel' style='--fc:" + x.c + "'>" + x.l + "</span>"; }
  function iviPill(v) { var l = IVL(v); return "<span class='ivp' style='--ic:" + l[1] + "'><i></i>IVI " + num(v, 0) + "</span>"; }
  function corrRow(e) { var F = FU[e.fuel] || { c: "#FFD60A" }, b = brandOf(e), m = modelOf(e); return "<button class='corr' style='--fc:" + F.c + "' data-act='openEng' data-id='" + esc(e.id) + "'><div style='min-width:0'><b>" + esc((b ? b.n : "") + " " + (m ? m.n : "")) + "</b><small>" + esc(e.label) + " · " + esc(e.code) + " · " + yOf(e).join("-") + "</small></div><span class='hp'>" + e.hp + "<small style='font-size:9px'> ch</small></span></button>"; }
  function faultCard(f, hist, full) {
    if (!f) return "";
    var c = (SV[f.sev] || SV["modérée"]).c, kk = kmOf(f), yy = yOf(f), cc = costOf(f), h = "";
    h += "<div class='fcard' style='--sc:" + c + ";" + (hist ? "opacity:.62" : "") + "'><div class='fh'><b>" + esc(f.t) + "</b>" + sevTag(f.sev) + "</div>";
    h += "<div class='tags'><span class='tag'>" + esc(str(f.dom, "Moteur")) + "</span><span class='tag'>" + yy[0] + "-" + yy[1] + "</span><span class='tag'>" + fmt(kk[0]) + "–" + fmt(kk[1]) + " km</span><span class='tag'>fréq. " + esc(str(f.freq, "moyenne")) + "</span>";
    if (arr(f.ph).length) h += "<span class='tag'>phase " + esc(arr(f.ph).join("/")) + "</span>";
    if (hist) h += "<span class='tag'>HORS PÉRIODE</span>";
    h += "<span class='tag' style='color:#25D4EE'>" + esc(str(f.status, "Surveillance")) + "</span></div>";
    var sy = arr(f.sym);
    if (sy.length) { h += "<div class='tags'>"; sy.forEach(function (s) { h += "<span class='tag'>" + ic("act", "width:10px;height:10px;color:#FFAF2E") + esc(s) + "</span>"; }); h += "</div>"; }
    h += "<p><b>Cause :</b> " + esc(str(f.cause, "—")) + "</p><p><b>Action :</b> " + esc(str(f.fix, "—")) + "</p>";
    h += "<div class='cost'>" + ic("euro", "width:13px;height:13px") + (cc[1] === 0 ? "Prise en charge / campagne" : fmt(cc[0]) + " – " + fmt(cc[1]) + " €") + "</div>";
    if (!full) h += "<div style='margin-top:8px'><button class='btn xs ghost' data-act='openFault' data-id='" + esc(f.id) + "'>" + ic("chev", "width:11px;height:11px") + "Détail & motorisations</button></div>";
    return h + "</div>";
  }
  function tsbCard(t, full) {
    if (!t) return "";
    var rc = isRecall(t), h = "";
    h += "<div class='tsb" + (rc ? " rc" : "") + "'><div style='display:flex;gap:7px;align-items:center;flex-wrap:wrap'><span class='ref'>" + esc(t.ref) + "</span>" + sevTag(t.sev);
    h += "<span class='tag'>" + (rc ? ic("bell", "width:10px;height:10px;color:#FFD60A") : "") + esc(str(t.cat, "Moteur")) + "</span><span class='tag mono'>" + esc(t.date) + "</span>";
    if (arr(t.ph).length) h += "<span class='tag'>phase " + esc(arr(t.ph).join("/")) + "</span>";
    h += "</div><b>" + esc(t.t) + "</b><p>" + esc(str(t.sum, "—")) + "</p><div class='act'><b style='font-size:11px;color:" + (rc ? "#FFD60A" : "#4D8DFF") + "'>ACTION :</b> " + esc(str(t.act, "—")) + "</div>";
    if (!full) h += "<div style='margin-top:8px'><button class='btn xs ghost' data-act='openTsb' data-id='" + esc(t.id) + "'>" + ic("chev", "width:11px;height:11px") + "Périmètre</button></div>";
    return h + "</div>";
  }
  function mountAnim(sc) { $$(".brow .bt i", sc).forEach(function (i) { i.style.width = i.dataset.w; }); }

  /* ══════════ DRAWER ══════════ */
  function openDrawer(type, id, push) { if (S.drawer && push) S.drawer.hist.push({ type: S.drawer.type, id: S.drawer.id, tab: S.drawer.tab }); else if (!S.drawer) S.drawer = { hist: [] }; S.drawer.type = type; S.drawer.id = id; S.drawer.tab = type === "engine" ? "fiche" : "main"; renderDrawer(); D.body.classList.add("lock"); requestAnimationFrame(function () { var r = $("#dr"); if (r) r.classList.add("on"); }); beep("open"); }
  function closeDrawer() { var r = $("#dr"); if (!r || !r.innerHTML) return; r.classList.remove("on"); S.drawer = null; if (!modalOpen) D.body.classList.remove("lock"); setTimeout(function () { if (!S.drawer) r.innerHTML = ""; }, 320); beep("close"); }
  function renderDrawer() {
    if (!S.drawer) return;
    var d = S.drawer, head = "", tabs = "", body = "", i;
    if (d.type === "engine") {
      var e = EIDX[d.id]; if (!e) { closeDrawer(); return; }
      var b = brandOf(e), m = modelOf(e), F = FU[e.fuel] || { c: "#FFD60A" }, fs = faultsFor(e), ts = tsbFor(e), rc = ts.filter(isRecall), v = ivi(e), L = IVL(v), pl = buildPlan(e, m, b);
      head = "<div class='dh' style='--fc:" + F.c + "'><div class='row'>" + (d.hist.length ? "<button class='tb' data-act='drback'>" + ic("back") + "</button>" : "");
      head += "<span class='tag mono'>" + esc(b ? b.n : "—") + "</span>" + fuelTag(e.fuel) + "<span class='tag'>" + esc(m ? m.n : "") + " · phase " + (m ? m.phase : 1) + "</span>";
      if (rc.length) head += "<span class='tag' style='color:#FFD60A'>" + ic("bell", "width:10px;height:10px") + rc.length + " rappel(s)</span>";
      head += "<button class='tb x' data-act='drclose'>" + ic("x") + "</button></div><h2>" + esc(e.label) + "</h2><div class='sub mono'>" + esc(e.code) + " · " + yOf(e).join("-") + " · " + e.hp + " ch / " + e.kw + " kW · " + e.nm + " Nm</div></div>";
      var dt = [["fiche", "Fiche", "piston"], ["pannes", "Pannes", "alert", fs.length], ["tsb", "TSB", "file", ts.length], ["plan", "Entretien", "wrench"], ["corr", "Corrélations", "spark"]];
      tabs = "<div class='dtabs'>"; dt.forEach(function (t) { tabs += "<button class='dt " + (d.tab === t[0] ? "on" : "") + "' data-act='drtab' data-t='" + t[0] + "'>" + ic(t[2], "width:13px;height:13px") + t[1] + (t[3] !== undefined ? "<span class='n'>" + t[3] + "</span>" : "") + "</button>"; }); tabs += "</div>";
      if (d.tab === "fiche") {
        var rows = [["Code moteur", e.code], ["Famille", e.fam], ["Cylindrée", e.disp ? fmt(e.disp) + " cm³" : "—"], ["Architecture", e.cyl], ["Puissance", e.hp + " ch / " + e.kw + " kW"], ["Couple", e.nm + " Nm"], ["Suralimentation", e.asp], ["Injection", e.inj], ["Norme", e.norm], ["Boîte", e.gb], ["Production", yOf(e).join(" → ")], ["Énergie", (FU[e.fuel] || {}).l || e.fuel], ["Modèle", m ? m.n : "—"], ["Phase modèle", m ? m.phase : "—"], ["Segment", m ? m.seg : "—"], ["Région", b ? REGIONS[b.region] : "—"], ["IVI", v + " / 100 · " + L[0]]];
        body = "<div class='sg'>"; rows.forEach(function (r) { body += "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>"; }); body += "</div>";
        body += "<div style='display:flex;gap:7px;flex-wrap:wrap;margin-top:13px'><button class='btn sm pri' data-act='selEng' data-id='" + esc(e.id) + "'>" + ic("wrench") + "Plan d'entretien 200 000 km</button>";
        if (isAdmin()) body += "<button class='btn sm ghost' data-act='expEng' data-id='" + esc(e.id) + "'>" + ic("dl") + "Exporter</button>";
        body += "</div>";
      } else if (d.tab === "pannes") body = fs.length ? fs.map(function (f) { return faultCard(f, !f.active, false); }).join("") : "<div class='empty'>" + ic("check") + "<p>Aucune panne référencée.</p></div>";
      else if (d.tab === "tsb") body = ts.length ? ts.map(function (t) { return tsbCard(t, false); }).join("") : "<div class='empty'>" + ic("file") + "<p>Aucun bulletin corrélé.</p></div>";
      else if (d.tab === "plan") body = planHTML(pl, true);
      else { var same = arr(DB.engines).filter(function (x) { return x.fam === e.fam && x.id !== e.id; }); body = "<div class='card panel'><h3>" + ic("spark") + "Famille " + esc(e.fam) + " — " + same.length + " autre(s)</h3>" + (same.length ? same.slice(0, 24).map(corrRow).join("") : "<p class='dim'>Première motorisation de cette famille.</p>") + "</div>"; }
    } else if (d.type === "fault") {
      var f = null, fa = arr(DB.faults); for (i = 0; i < fa.length; i++) if (fa[i] && fa[i].id === d.id) f = fa[i];
      if (!f) { closeDrawer(); return; }
      var af = enginesForFault(f), kk = kmOf(f), yy = yOf(f);
      head = "<div class='dh' style='--fc:" + (SV[f.sev] || SV["modérée"]).c + "'><div class='row'>" + (d.hist.length ? "<button class='tb' data-act='drback'>" + ic("back") + "</button>" : "") + sevTag(f.sev) + "<span class='tag'>" + esc(f.dom) + "</span><button class='tb x' data-act='drclose'>" + ic("x") + "</button></div><h2>" + esc(f.t) + "</h2><div class='sub mono'>" + yy[0] + "-" + yy[1] + " · " + fmt(kk[0]) + "–" + fmt(kk[1]) + " km</div></div>";
      body = faultCard(f, false, true) + "<div class='card panel' style='margin-top:12px'><h3>" + ic("car") + "Motorisations corrélées<span class='chip'>" + af.length + "</span></h3>" + (af.length ? af.slice(0, 30).map(corrRow).join("") : "<p class='dim'>Aucune.</p>") + (af.length > 30 ? "<p class='dim mono' style='font-size:10px'>+ " + (af.length - 30) + " autres…</p>" : "") + "</div>";
    } else {
      var t = null, ta = arr(DB.tsb); for (i = 0; i < ta.length; i++) if (ta[i] && ta[i].id === d.id) t = ta[i];
      if (!t) { closeDrawer(); return; }
      var at = enginesForTsb(t);
      head = "<div class='dh' style='--fc:" + (isRecall(t) ? "#FFD60A" : "#4D8DFF") + "'><div class='row'>" + (d.hist.length ? "<button class='tb' data-act='drback'>" + ic("back") + "</button>" : "") + "<span class='tag mono'>" + esc(t.ref) + "</span>" + sevTag(t.sev) + "<button class='tb x' data-act='drclose'>" + ic("x") + "</button></div><h2>" + esc(t.t) + "</h2><div class='sub mono'>" + esc(t.date) + " · " + esc(t.cat) + "</div></div>";
      body = tsbCard(t, true) + "<div class='card panel' style='margin-top:12px'><h3>" + ic("car") + "Périmètre corrélé<span class='chip'>" + at.length + "</span></h3>" + (at.length ? at.slice(0, 30).map(corrRow).join("") : "<p class='dim'>Aucun.</p>") + "</div>";
    }
    var dr = $("#dr"); if (!dr) return;
    dr.innerHTML = "<div class='sc' data-act='drclose'></div><aside class='dw'>" + head + tabs + "<div class='db'>" + body + "</div><div class='dfoot'>SYNTHÈSE INGÉNIEUR — CONFIRMER AU VIN</div></aside>";
    mountAnim(dr);
  }

  /* ══════════ RECHERCHE ══════════ */
  var SYN = { puretech: ["eb2"], hdi: ["dv5", "dw10"], bluehdi: ["dv5", "dw10"], tsi: ["ea211", "ea888", "dpca"], tfsi: ["ea888", "dkna", "dnwa"], tdi: ["ea288", "dsua"], tce: ["h4dt", "h5ht", "hr12"], dci: ["k9k", "m9r", "r9m"], courroie: ["courroie", "distribution"], chaine: ["chaine", "aac"], adblue: ["adblue", "scr", "nox"], scr: ["scr", "nox"], egr: ["egr"], fap: ["fap", "dpf"], turbo: ["turbo"], rappel: ["rappel"], tsb: ["tsb", "bulletin"], panne: ["panne"], eat8: ["eat8"], dsg: ["dq200", "dq381"], zf8: ["zf8"], cvt: ["cvt", "xtr", "lineartronic"], pdk: ["pdk"], frein: ["frein", "freinage"], clim: ["clim"], batterie: ["batterie", "12v"], ecran: ["ecran", "bsi"], france: ["renault", "peugeot", "citroen", "ds", "dacia", "alpine"], europe: ["vw", "audi", "bmw", "mercedes", "volvo", "fiat", "alfa", "porsche"], asie: ["toyota", "honda", "nissan", "mazda", "hyundai", "kia", "suzuki", "subaru"], chine: ["byd", "mg", "chery", "geely", "nio", "xpeng", "zeekr", "haval", "xiaomi"], amerique: ["ford", "tesla", "chevrolet", "jeep", "gmc", "ram", "cadillac"], p20e8: ["adblue", "scr"], p204f: ["adblue", "scr"], p0420: ["catalyseur"], p0300: ["rates", "allumage"], p0087: ["pression", "carburant"], p0299: ["turbo"], p0401: ["egr"], p2002: ["fap", "dpf"] };
  function score(qn, hay) { var h = nk(hay); if (!qn) return 0; if (h === qn) return 120; if (h.indexOf(qn) === 0) return 95; if (h.indexOf(qn) > -1) return 70; var i = 0, j = 0; while (i < qn.length && j < h.length) { if (qn[i] === h[j]) i++; j++; } return i === qn.length ? 34 : 0; }
  function omniSearch(q) {
    var qn = nk(q), raw = String(q || "").toLowerCase().split(/[\s,;]+/).filter(Boolean), syn = [], i, j;
    raw.forEach(function (w) { var k = nk(w); if (SYN[k]) syn = syn.concat(SYN[k]); });
    var wantR = qn.indexOf("rappel") > -1, wantT = qn.indexOf("tsb") > -1 || qn.indexOf("bulletin") > -1, wantF = qn.indexOf("panne") > -1;
    var hits = [], famSet = {}, brandSet = {};
    arr(DB.engines).forEach(function (e) {
      var b = brandOf(e), m = modelOf(e), hay = [(b ? b.n : ""), (m ? m.n : ""), "phase " + (m ? m.phase : ""), e.code, e.fam, e.label, (b ? b.pays : ""), (b ? REGIONS[b.region] : "")].join(" ");
      var sc = score(qn, hay);
      if (!sc && syn.length) for (j = 0; j < syn.length; j++) if (nk(e.fam).indexOf(nk(syn[j])) > -1 || nk(e.code).indexOf(nk(syn[j])) > -1 || nk(e.gb).indexOf(nk(syn[j])) > -1) { sc = 62; break; }
      if (sc > 0) { famSet[e.fam] = 1; if (m) brandSet[m.b] = 1; hits.push({ kind: "engine", id: e.id, score: sc + 6, title: engName(e), sub: e.code + " · " + e.hp + " ch · phase " + (m ? m.phase : 1) + " · " + (b ? REGIONS[b.region] : ""), color: (FU[e.fuel] || {}).c || "#FFD60A", badge: "MOTEUR" }); }
    });
    arr(DB.faults).forEach(function (f) {
      var kk = kmOf(f), hay = [f.t, arr(f.fam).join(" "), arr(f.mt).join(" "), f.cause, f.fix, arr(f.sym).join(" "), f.dom].join(" ");
      var sc = score(qn, hay);
      if (!sc) { var ff = arr(f.fam); for (j = 0; j < ff.length; j++) if (famSet[ff[j]]) { sc = 66; break; } }
      if (!sc && syn.length) for (j = 0; j < syn.length; j++) if (nk(hay).indexOf(nk(syn[j])) > -1) { sc = 58; break; }
      if (sc > 0) hits.push({ kind: "fault", id: f.id, score: sc + (wantF ? 26 : 0) + (SV[f.sev] || SV["modérée"]).w * 0.6, title: f.t, sub: f.sev + " · " + f.dom + " · " + fmt(kk[0]) + "-" + fmt(kk[1]) + " km", color: (SV[f.sev] || SV["modérée"]).c, badge: "PANNE" });
    });
    arr(DB.tsb).forEach(function (t) {
      var rc = isRecall(t), hay = [t.t, t.ref, arr(t.fam).join(" "), arr(t.mt).join(" "), t.sum, t.act, t.cat].join(" ");
      var sc = score(qn, hay);
      if (!sc) { var ff = arr(t.fam); for (j = 0; j < ff.length; j++) if (famSet[ff[j]]) { sc = 64; break; } }
      if (!sc) { var bb = arr(t.b); for (j = 0; j < bb.length; j++) if (brandSet[bb[j]]) { sc = 48; break; } }
      if (!sc && syn.length) for (j = 0; j < syn.length; j++) if (nk(hay).indexOf(nk(syn[j])) > -1) { sc = 56; break; }
      if (sc > 0) hits.push({ kind: "tsb", id: t.id, score: sc + (wantR && rc ? 34 : (wantT && !rc ? 30 : 0)) + (rc ? 12 : 0) + (SV[t.sev] || SV["modérée"]).w * 0.5, title: t.t, sub: t.ref + " · " + t.date + " · " + t.cat, color: rc ? "#FFD60A" : "#4D8DFF", badge: rc ? "RAPPEL" : "TSB" });
    });
    arr(DB.models).forEach(function (m) { var b = BIDX[m.b], sc = score(qn, (b ? b.n + " " + b.pays + " " + REGIONS[b.region] + " " : "") + m.n + " phase " + m.phase); if (sc > 0) hits.push({ kind: "model", id: m.id, score: sc + 4, title: (b ? b.n + " " : "") + m.n, sub: "phase " + m.phase + " · " + m.seg + " · " + yOf(m).join("-"), color: "#4D8DFF", badge: "MODÈLE" }); });
    arr(DB.brands).forEach(function (b) { var sc = score(qn, b.n + " " + b.pays + " " + b.grp + " " + REGIONS[b.region]); if (sc > 0) hits.push({ kind: "brand", id: b.id, score: sc, title: b.n, sub: b.pays + " · " + b.grp + " · " + REGIONS[b.region], color: "#25D4EE", badge: "MARQUE" }); });
    hits.sort(function (a, b) { return b.score - a.score; });
    var seen = {}, out = []; for (i = 0; i < hits.length && out.length < 18; i++) { var k = hits[i].kind + ":" + hits[i].id; if (seen[k]) continue; seen[k] = 1; out.push(hits[i]); }
    return out;
  }
  function hl(text, q) { var n = String(q || "").trim(); if (!n) return esc(text); var idx = String(text).toLowerCase().indexOf(n.toLowerCase()); if (idx < 0) return esc(text); return esc(String(text).slice(0, idx)) + "<mark>" + esc(String(text).slice(idx, idx + n.length)) + "</mark>" + esc(String(text).slice(idx + n.length)); }
  function omniRender() {
    var box = $("#omnires"); if (!box) return; var q = S.omni.q;
    if (!q || q.trim().length < 2) { var seeds = ["3008 courroie", "3008 rappel", "1.5 BlueHDi chaine", "AdBlue SCR", "EGR FAP", "EAT8 à-coups", "Ioniq 5 ICCU", "CVT Nissan", "Chine 12V", "P20E8"]; var h = "<div class='grp'>RECHERCHE PRÉDICTIVE — TOUTES MARQUES · MODÈLES · PHASES · PANNES · RAPPELS · TSB</div><div class='hint'>"; seeds.forEach(function (s) { h += "<button data-act='omniSeed' data-q='" + esc(s) + "'>" + esc(s) + "</button>"; }); box.innerHTML = h + "</div>"; box.classList.add("on"); return; }
    var hits = omniSearch(q); S.omni.hits = hits; S.omni.idx = hits.length ? 0 : -1;
    if (!hits.length) { box.innerHTML = "<div class='grp'>AUCUN RÉSULTAT POUR « " + esc(q) + " »</div>"; box.classList.add("on"); return; }
    var order = ["fault", "tsb", "engine", "model", "brand"], lab = { fault: "PANNES CONNUES", tsb: "CAMPAGNES DE RAPPEL / TSB / BULLETINS", engine: "MOTORISATIONS", model: "MODÈLES", brand: "MARQUES" }, html = "";
    order.forEach(function (kind) { var grp = hits.filter(function (x) { return x.kind === kind; }); if (!grp.length) return; html += "<div class='grp'>" + lab[kind] + " · " + grp.length + "</div>"; grp.forEach(function (it) { var gi = hits.indexOf(it); html += "<button class='hit" + (gi === S.omni.idx ? " sel" : "") + "' data-act='omniHit' data-kind='" + it.kind + "' data-id='" + esc(it.id) + "'><span class='k' style='color:" + it.color + "'>" + it.badge + "</span><span class='tx'><b>" + hl(it.title, q) + "</b><small>" + esc(it.sub) + "</small></span>" + ic("chev", "width:12px;height:12px;color:#61748C") + "</button>"; }); });
    box.innerHTML = html; box.classList.add("on");
  }
  function omniClose() { var b = $("#omnires"); if (b) b.classList.remove("on"); S.omni.idx = -1; }
  function omniActivate(kind, id) { omniClose(); var inp = $("#omni"); if (inp) inp.blur(); if (kind === "engine" || kind === "fault" || kind === "tsb") openDrawer(kind, id, !!S.drawer); else if (kind === "model") { var m = MIDX[id]; if (m) { S.sel.b = m.b; S.sel.m = m.id; S.sel.e = ""; location.hash = "#/explorer"; render(); } beep("tick"); } else { S.sel.b = id; S.sel.m = ""; S.sel.e = ""; location.hash = "#/explorer"; render(); beep("tick"); } }
  function omniMove(d) { var box = $("#omnires"); if (!box || !box.classList.contains("on")) return; var els = $$(".hit", box); if (!els.length) return; S.omni.idx = clamp(S.omni.idx + d, 0, els.length - 1); els.forEach(function (el, i) { el.classList.toggle("sel", i === S.omni.idx); }); if (els[S.omni.idx]) els[S.omni.idx].scrollIntoView({ block: "nearest" }); }

  /* ══════════ VUES ══════════ */
  function selEngine() { return S.sel.e ? (EIDX[S.sel.e] || null) : null; }
  function modelsOfBrand(b) { return arr(DB.models).filter(function (m) { return m.b === b; }).sort(function (a, b2) { return a.n.localeCompare(b2.n); }); }
  function enginesOfModel(mid) { return arr(DB.engines).filter(function (e) { return arr(e.m).indexOf(mid) > -1; }).sort(function (a, b) { return a.hp - b.hp; }); }
  function results() {
    var f = S.f, q = String(f.q || "").trim().toLowerCase();
    var l = arr(DB.engines).filter(function (e) {
      var m = modelOf(e), b = brandOf(e);
      if (S.sel.b && (!m || m.b !== S.sel.b)) return false;
      if (S.sel.m && arr(e.m).indexOf(S.sel.m) < 0) return false;
      if (S.sel.e && e.id !== S.sel.e) return false;
      if (f.region && b && b.region !== f.region) return false;
      if (arr(f.fuel).length && arr(f.fuel).indexOf(e.fuel) < 0) return false;
      if (q) { var hay = [(b ? b.n : ""), (m ? m.n : ""), e.code, e.fam, e.label, (b ? b.pays : "")].join(" ").toLowerCase(); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
    var so = { brand: function (a, b) { var x = brandOf(a), y = brandOf(b); return ((x ? x.n : "")).localeCompare(y ? y.n : "") || b.hp - a.hp; }, hpdesc: function (a, b) { return b.hp - a.hp; }, year: function (a, b) { return yOf(b)[0] - yOf(a)[0]; }, ivi: function (a, b) { return ivi(b) - ivi(a); } };
    return l.sort(so[f.sort] || so.brand);
  }
  function engCard(e) {
    var F = FU[e.fuel] || { c: "#FFD60A" }, b = brandOf(e), m = modelOf(e), v = ivi(e), nf = faultsFor(e).filter(function (f) { return f.sev !== "info"; }).length, ts = tsbFor(e), nr = ts.filter(isRecall).length;
    var h = "<article class='card hov eng' style='--fc:" + F.c + "' data-act='openEng' data-id='" + esc(e.id) + "' tabindex='0'>";
    h += "<div class='top'><span class='br'>" + esc(b ? b.n : "—") + "</span>" + fuelTag(e.fuel) + "<span class='tag' style='margin-left:auto'>phase " + (m ? m.phase : 1) + "</span></div>";
    h += "<h4>" + esc(m ? m.n : "") + "</h4><div class='lbl'>" + esc(e.label) + "</div>";
    h += "<div class='pw'><b>" + e.hp + "</b><span>ch · " + e.kw + " kW</span><span style='margin-left:auto'>" + e.nm + " Nm</span></div>";
    h += "<div class='meta'><span class='tag mono'>" + esc(e.code) + "</span><span class='tag'>" + yOf(e).join("-") + "</span><span class='tag'>" + esc(e.gb) + "</span>";
    if (nr) h += "<span class='tag' style='color:#FFD60A'>" + ic("bell", "width:9px;height:9px") + nr + "</span>";
    h += "</div><div class='ft'><span>" + ic("alert", "width:12px;height:12px;color:" + (nf ? "#FFAF2E" : "#61748C")) + " " + nf + "</span><span>" + ic("file", "width:12px;height:12px;color:" + (ts.length ? "#4D8DFF" : "#61748C")) + " " + ts.length + "</span>" + iviPill(v) + "</div></article>";
    return h;
  }
  function vBord() {
    var c = META.counts, h = "";
    h += "<div class='hero'><span class='kick'>MODULE 01 — POSTE DE BORD</span><h2>MÉGA-BASE <i>2017 → 2027</i><br>" + fmt(c.b) + " marques · " + fmt(c.m) + " modèles · " + fmt(c.e) + " motorisations</h2>";
    h += "<p>Françaises, européennes, asiatiques, chinoises et américaines. " + fmt(c.f) + " pannes détaillées, " + fmt(c.t) + " bulletins dont <b style='color:#FFD60A'>" + fmt(c.rc) + " campagnes de rappel</b>, " + c.dom + " domaines techniques. Plans d'entretien complets jusqu'à 200 000 km pour chaque marque, modèle, phase, motorisation et puissance sélectionnés.</p>";
    h += "<div class='hint' style='padding:9px 0 0'>";["3008 courroie", "3008 rappel", "1.5 BlueHDi chaine", "AdBlue SCR", "EGR FAP", "EAT8 à-coups", "Ioniq 5 ICCU", "CVT Nissan", "Chine 12V", "P20E8"].forEach(function (s) { h += "<button data-act='omniSeed' data-q='" + esc(s) + "'>" + ic("search", "width:9px;height:9px") + esc(s) + "</button>"; }); h += "</div>";
    h += "<div class='acts'><a class='btn pri' href='#/explorer'>" + ic("car") + "Sélection précise du parc</a><button class='btn grn' data-act='goDiag'>" + ic("stetho") + "Autovérification massive</button>";
    if (isAdmin()) h += "<button class='btn amb' data-act='goAdmin'>" + ic("db") + "Administration</button>";
    h += "<a class='btn' href='#/studio'>" + ic("spark") + "Studio fond</a></div>";
    h += "<div class='banner' style='margin:13px 0 0'>" + ic("reset", "width:14px;height:14px;color:#43E08B") + "<b>Cache purgé à l'ouverture</b><span class='dim mono' style='font-size:10.5px'>" + esc(purgeLabel()) + "</span><button class='btn xs ghost' data-act='purgeAgain'>PURGER À NOUVEAU</button></div></div>";
    var kp = [["db", "MARQUES", c.b, "#25D4EE"], ["car", "MODÈLES", c.m, "#4D8DFF"], ["piston", "MOTORISATIONS", c.e, "#E45CFF"], ["alert", "PANNES", c.f, "#FF4D5E"], ["bell", "RAPPELS", c.rc, "#FFD60A"], ["wrench", "DOMAINES", c.dom, "#43E08B"]];
    h += "<div class='kpis'>"; kp.forEach(function (k) { h += "<div class='card kpi' style='--kc:" + k[3] + "'>" + ic(k[0]) + "<b>" + fmt(k[2]) + "</b><span>" + k[1] + "</span></div>"; }); h += "</div>";
    var regs = Object.keys(REGIONS).map(function (r) { return { r: r, n: META.regions[r] || 0 }; });
    var rm = Math.max.apply(null, regs.map(function (x) { return x.n; }).concat([1]));
    h += "<div class='g2'><div class='card panel'><h3>" + ic("db") + "Marques par région<span class='chip'>" + fmt(c.b) + "</span></h3><div class='bars'>";
    regs.forEach(function (x) { h += "<div class='brow'><span class='bl'>" + REGIONS[x.r] + "</span><div class='bt'><i data-w='" + Math.round(x.n / rm * 100) + "%' style='--bc:" + (x.r === "france" ? "#4D8DFF" : x.r === "europe" ? "#25D4EE" : x.r === "asie" ? "#FF4D5E" : x.r === "chine" ? "#FFD60A" : "#43E08B") + "'></i></div><b>" + x.n + "</b></div>"; });
    h += "</div></div>";
    var fc = Object.keys(FU).map(function (f) { return { f: f, n: arr(DB.engines).filter(function (e) { return e.fuel === f; }).length }; }).filter(function (x) { return x.n; });
    var mx = Math.max.apply(null, fc.map(function (x) { return x.n; }).concat([1]));
    h += "<div class='card panel'><h3>" + ic("piston") + "Énergies du parc<span class='chip'>" + fmt(c.e) + "</span></h3><div class='bars'>";
    fc.forEach(function (x) { h += "<div class='brow'><span class='bl'>" + FU[x.f].l + "</span><div class='bt'><i data-w='" + Math.round(x.n / mx * 100) + "%' style='--bc:" + FU[x.f].c + "'></i></div><b>" + fmt(x.n) + "</b></div>"; });
    h += "</div></div></div>";
    var al = arr(DB.faults).filter(function (f) { return f.sev === "critique"; }).slice(0, 5);
    var rc = arr(DB.tsb).filter(isRecall).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 5);
    h += "<div class='g2'><div class='card panel'><h3>" + ic("alert", "color:#FF4D5E") + "Alertes prioritaires</h3><div class='feed'>";
    al.forEach(function (f) { h += "<button class='fi' data-act='openFault' data-id='" + esc(f.id) + "'><span class='fx'>" + ic("alert", "width:14px;height:14px") + "</span><span style='flex:1;min-width:0'><b>" + esc(f.t) + "</b><small>" + esc(f.dom) + " · " + esc(arr(f.fam).slice(0, 3).join(" · ")) + "</small></span>" + ic("chev", "width:13px;height:13px;color:#61748C") + "</button>"; });
    if (!al.length) h += "<p class='dim'>Aucune alerte critique.</p>";
    h += "</div></div><div class='card panel'><h3>" + ic("bell", "color:#FFD60A") + "Campagnes de rappel</h3><div class='feed'>";
    rc.forEach(function (t) { h += "<button class='fi r' data-act='openTsb' data-id='" + esc(t.id) + "'><span class='fx'>" + ic("bell", "width:14px;height:14px") + "</span><span style='flex:1;min-width:0'><b>" + esc(t.t) + "</b><small>" + esc(t.ref) + " · " + esc(t.date) + "</small></span>" + ic("chev", "width:13px;height:13px;color:#61748C") + "</button>"; });
    if (!rc.length) h += "<p class='dim'>Aucune campagne.</p>";
    h += "</div></div></div>";
    return h;
  }
  function vExplorer() {
    var h = "";
    h += "<div class='vh'><div><span class='kick'>MODULE 02 — PARC 2017 → 2027</span><h1>SÉLECTION <i>PRÉCISE</i></h1><div class='sub'>Marque → Modèle (phase) → Motorisation (puissance). La sélection alimente directement le plan d'entretien du module 4 jusqu'à 200 000 km.</div></div></div>";
    h += "<div class='exwrap'><div class='card filters'>";
    h += "<div class='fsec'><label class='lb'>Région</label><select class='sel' data-f='region'><option value=''>Toutes les régions</option>";
    Object.keys(REGIONS).forEach(function (r) { h += "<option value='" + r + "' " + (S.f.region === r ? "selected" : "") + ">" + REGIONS[r] + " (" + (META.regions[r] || 0) + " marques)</option>"; }); h += "</select></div>";
    var brands = arr(DB.brands).filter(function (b) { return !S.f.region || b.region === S.f.region; });
    h += "<div class='fsec'><label class='lb'>1 · Marque</label><select class='sel' data-sel='b'><option value=''>Toutes les marques (" + brands.length + ")</option>";
    brands.forEach(function (b) { h += "<option value='" + esc(b.id) + "' " + (S.sel.b === b.id ? "selected" : "") + ">" + esc(b.n) + " (" + (META.byBrand[b.id] || 0) + ")</option>"; }); h += "</select></div>";
    var mods = S.sel.b ? modelsOfBrand(S.sel.b) : [];
    h += "<div class='fsec'><label class='lb'>2 · Modèle & phase</label><select class='sel' data-sel='m' " + (S.sel.b ? "" : "disabled") + "><option value=''>" + (S.sel.b ? mods.length + " modèle(s)" : "Choisir une marque") + "</option>";
    mods.forEach(function (m) { h += "<option value='" + esc(m.id) + "' " + (S.sel.m === m.id ? "selected" : "") + ">" + esc(m.n) + " · phase " + m.phase + " · " + yOf(m).join("-") + "</option>"; }); h += "</select></div>";
    var engs = S.sel.m ? enginesOfModel(S.sel.m) : [];
    h += "<div class='fsec'><label class='lb'>3 · Motorisation & puissance</label><select class='sel' data-sel='e' " + (S.sel.m ? "" : "disabled") + "><option value=''>" + (S.sel.m ? engs.length + " motorisation(s)" : "Choisir un modèle") + "</option>";
    engs.forEach(function (e) { h += "<option value='" + esc(e.id) + "' " + (S.sel.e === e.id ? "selected" : "") + ">" + esc(e.label) + " · " + e.hp + " ch · " + esc(e.code) + " · " + esc(e.gb) + "</option>"; }); h += "</select></div>";
    h += "<div class='fsec'><label class='lb'>Recherche libre</label><input class='inp' type='search' data-f='q' value='" + esc(S.f.q) + "' placeholder='Code, famille, libellé, pays…'></div>";
    h += "<div class='fsec'><label class='lb'>Énergie</label><div class='chipset'>";
    Object.keys(FU).forEach(function (k) { h += "<button class='fc " + (arr(S.f.fuel).indexOf(k) > -1 ? "on" : "") + "' style='--fc:" + FU[k].c + "' data-act='ffuel' data-k='" + k + "'>" + FU[k].l + "</button>"; }); h += "</div></div>";
    h += "<div class='fsec'><button class='btn sm ghost' data-act='resetSel' style='width:100%'>" + ic("reset") + "Réinitialiser la sélection</button></div></div>";
    h += "<div>";
    var e = selEngine();
    if (e) {
      var m = modelOf(e), b = brandOf(e), fs = faultsFor(e), ts = tsbFor(e), nr = ts.filter(isRecall).length, v = ivi(e), L = IVL(v);
      h += "<div class='selcard'><h3>" + ic("check", "width:16px;height:16px") + " SÉLECTION ACTIVE — " + esc((b ? b.n : "") + " " + (m ? m.n : "")) + " · " + esc(e.label) + "</h3>";
      h += "<div class='sg'><div class='sp'><span>Région</span><b class='hl'>" + (b ? REGIONS[b.region] : "—") + "</b></div><div class='sp'><span>Phase modèle</span><b class='hl'>" + (m ? m.phase : "—") + "</b></div><div class='sp'><span>Code moteur</span><b class='hl'>" + esc(e.code) + "</b></div><div class='sp'><span>Puissance</span><b class='hl'>" + e.hp + " ch / " + e.kw + " kW</b></div><div class='sp'><span>Couple</span><b class='hl'>" + e.nm + " Nm</b></div><div class='sp'><span>Boîte</span><b class='hl'>" + esc(e.gb) + "</b></div><div class='sp'><span>Production</span><b class='hl'>" + yOf(e).join("-") + "</b></div><div class='sp'><span>Pannes corrélées</span><b class='hl'>" + fs.length + "</b></div><div class='sp'><span>Rappels</span><b class='hl'>" + nr + "</b></div><div class='sp'><span>IVI</span><b class='hl' style='color:" + L[1] + "'>" + v + " · " + L[0] + "</b></div></div>";
      h += "<div style='display:flex;gap:7px;flex-wrap:wrap;margin-top:11px'><button class='btn pri sm' data-act='goPlan'>" + ic("wrench") + "Plan d'entretien 200 000 km</button><button class='btn sm ghost' data-act='openEng' data-id='" + esc(e.id) + "'>" + ic("piston") + "Fiche technique</button></div></div>";
    }
    var l = results(), s = l.slice(0, S.shown);
    h += "<div class='bar'><span class='cnt'>" + fmt(l.length) + " motorisation(s)</span><select class='sel' data-f='sort' style='margin-left:auto;width:auto'>";
    [["brand", "Marque A-Z"], ["hpdesc", "Puissance ↓"], ["year", "Année ↓"], ["ivi", "Vigilance ↓"]].forEach(function (o) { h += "<option value='" + o[0] + "' " + (S.f.sort === o[0] ? "selected" : "") + ">" + o[1] + "</option>"; });
    h += "</select></div><div class='eg'>" + (s.length ? s.map(engCard).join("") : "<div class='empty' style='grid-column:1/-1'>" + ic("search") + "<p>Aucune motorisation ne correspond.</p></div>") + "</div>";
    h += "<div class='more'>" + (l.length > S.shown ? "<button class='btn ghost' data-act='more'>Afficher plus (" + fmt(l.length - S.shown) + ")</button>" : "") + "</div></div></div>";
    return h;
  }
  function vTech() {
    var L = S.tech, h = "", i, nr = arr(DB.tsb).filter(isRecall).length;
    h += "<div class='vh'><div><span class='kick'>MODULE 03 — RECHERCHE TECHNIQUE EXTRÊME</span><h1>PANNES · TSB · <i>RAPPELS</i></h1><div class='sub'>Corrélation réelle marque / modèle / phase / motorisation, toutes régions 2017-2027. Filtres cumulables région, domaine, sévérité, kilométrage, code défaut et texte intégral.</div></div></div>";
    h += "<div class='atabs'><button class='at " + (L.tab === "faults" ? "on" : "") + "' data-act='techTab' data-t='faults'>" + ic("alert", "width:13px;height:13px") + "PANNES<span class='n'>" + META.counts.f + "</span></button>";
    h += "<button class='at " + (L.tab === "tsb" ? "on" : "") + "' data-act='techTab' data-t='tsb'>" + ic("file", "width:13px;height:13px") + "TSB / BULLETINS<span class='n'>" + (META.counts.t - nr) + "</span></button>";
    h += "<button class='at " + (L.tab === "recalls" ? "on" : "") + "' data-act='techTab' data-t='recalls'>" + ic("bell", "width:13px;height:13px") + "RAPPELS<span class='n'>" + nr + "</span></button></div>";
    h += "<div class='card panel' style='margin-bottom:12px'><div class='fr f4'>";
    h += "<div><label class='lb'>Texte intégral / code défaut</label><input class='inp' type='search' data-tf='q' value='" + esc(L.q) + "' placeholder='Symptôme, P20E8, cause, action…'></div>";
    h += "<div><label class='lb'>Région</label><select class='sel' data-tf='region'><option value=''>Toutes</option>";
    Object.keys(REGIONS).forEach(function (r) { h += "<option value='" + r + "' " + (L.region === r ? "selected" : "") + ">" + REGIONS[r] + "</option>"; }); h += "</select></div>";
    var tbrands = arr(DB.brands).filter(function (b) { return !L.region || b.region === L.region; });
    h += "<div><label class='lb'>Marque</label><select class='sel' data-tf='brand'><option value=''>Toutes</option>";
    tbrands.forEach(function (b) { h += "<option value='" + esc(b.id) + "' " + (L.brand === b.id ? "selected" : "") + ">" + esc(b.n) + "</option>"; }); h += "</select></div>";
    h += "<div><label class='lb'>Modèle</label><select class='sel' data-tf='model' " + (L.brand ? "" : "disabled") + "><option value=''>Tous</option>";
    if (L.brand) modelsOfBrand(L.brand).forEach(function (m) { h += "<option value='" + esc(m.id) + "' " + (L.model === m.id ? "selected" : "") + ">" + esc(m.n) + " · phase " + m.phase + "</option>"; }); h += "</select></div></div>";
    h += "<div class='fr f4' style='margin-top:10px'><div><label class='lb'>Phase</label><select class='sel' data-tf='phase'><option value=''>Toutes</option>";
    for (i = 1; i <= 12; i++) h += "<option value='" + i + "' " + (L.phase === String(i) ? "selected" : "") + ">Phase " + i + "</option>"; h += "</select></div>";
    h += "<div><label class='lb'>Sévérité</label><select class='sel' data-tf='sev'><option value=''>Toutes</option>";
    Object.keys(SV).forEach(function (s) { h += "<option value='" + esc(s) + "' " + (L.sev === s ? "selected" : "") + ">" + s + "</option>"; }); h += "</select></div>";
    var doms = {}; arr(DB.faults).forEach(function (f) { doms[f.dom] = 1; }); arr(DB.tsb).forEach(function (t) { doms[t.dom] = 1; });
    h += "<div><label class='lb'>Domaine technique</label><select class='sel' data-tf='dom'><option value=''>Tous (" + Object.keys(doms).length + ")</option>";
    Object.keys(doms).sort().forEach(function (d) { h += "<option value='" + esc(d) + "' " + (L.dom === d ? "selected" : "") + ">" + esc(d) + "</option>"; }); h += "</select></div>";
    h += "<div><label class='lb'>Kilométrage véhicule</label><input class='inp mono' type='number' min='0' max='400000' step='5000' data-tf='km' value='" + esc(L.km) + "' placeholder='ex. 90000'></div></div></div>";
    var q = String(L.q || "").trim().toLowerCase(), kmv = num(L.km, 0), out = [], targetModel = L.model ? MIDX[L.model] : null;
    function ctxOk(item) {
      if (!item) return false;
      if (L.region) {
        var rok = false, ib = arr(item.b);
        for (var i4 = 0; i4 < ib.length; i4++) if (BIDX[ib[i4]] && BIDX[ib[i4]].region === L.region) { rok = true; break; }
        if (!rok && arr(item.fam).length) { var eg = arr(DB.engines).filter(function (e) { var b = brandOf(e); return b && b.region === L.region && arr(item.fam).indexOf(e.fam) > -1; }); if (eg.length) rok = true; }
        if (!rok && arr(item.mt).length) { var mm = arr(DB.models).filter(function (m) { var b = BIDX[m.b]; return b && b.region === L.region && tokHit(item.mt, m.n); }); if (mm.length) rok = true; }
        if (!rok) return false;
      }
      if (L.brand) {
        var hit = false;
        if (arr(item.mt).length) { var mods = modelsOfBrand(L.brand); for (var i2 = 0; i2 < mods.length; i2++) if (tokHit(item.mt, mods[i2].n)) { hit = true; break; } }
        if (!hit && arr(item.b).indexOf(L.brand) > -1) hit = true;
        if (!hit && arr(item.fam).length) { var engs = arr(DB.engines).filter(function (e) { var m = modelOf(e); return m && m.b === L.brand && arr(item.fam).indexOf(e.fam) > -1; }); if (engs.length) hit = true; }
        if (!hit) return false;
      }
      if (targetModel && !tokHit(item.mt, targetModel.n)) { var famHit = false, me = enginesOfModel(targetModel.id); for (var i3 = 0; i3 < me.length; i3++) if (arr(item.fam).indexOf(me[i3].fam) > -1) { famHit = true; break; } if (!famHit) return false; }
      if (L.phase && arr(item.ph).length && arr(item.ph).indexOf("*") < 0 && arr(item.ph).indexOf(L.phase) < 0) return false;
      if (L.sev && item.sev !== L.sev) return false;
      if (L.dom && item.dom !== L.dom) return false;
      if (kmv) { var kk = kmOf(item); if (kmv < kk[0] || kmv > kk[1]) return false; }
      if (q) { var hay = [item.t, item.ref, item.cause, item.fix, item.sum, item.act, arr(item.sym).join(" "), arr(item.fam).join(" "), arr(item.mt).join(" "), item.dom].join(" ").toLowerCase(); if (hay.indexOf(q) < 0) return false; }
      return true;
    }
    if (L.tab === "faults") { out = arr(DB.faults).filter(ctxOk).sort(function (a, b) { return (SV[b.sev] || SV["modérée"]).w - (SV[a.sev] || SV["modérée"]).w; }); h += "<div class='bar'><span class='cnt'>" + out.length + " fiche(s) corrélée(s)</span></div><div class='eg' style='grid-template-columns:repeat(auto-fill,minmax(340px,1fr))'>"; out.slice(0, 120).forEach(function (f) { h += "<div>" + faultCard(f, false, false) + "<div class='dim mono' style='font-size:9.5px;margin:-4px 0 9px 4px'>" + enginesForFault(f).length + " motorisation(s) corrélée(s)</div></div>"; }); }
    else { out = arr(DB.tsb).filter(function (t) { var rc = isRecall(t); if (L.tab === "recalls" && !rc) return false; if (L.tab === "tsb" && rc) return false; return ctxOk(t); }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); h += "<div class='bar'><span class='cnt'>" + out.length + " bulletin(s) corrélé(s)</span></div><div class='eg' style='grid-template-columns:repeat(auto-fill,minmax(340px,1fr))'>"; out.slice(0, 120).forEach(function (t) { h += "<div>" + tsbCard(t, false) + "</div>"; }); }
    if (!out.length) h += "<div class='empty' style='grid-column:1/-1'>" + ic("search") + "<p>Aucun résultat pour ces critères.</p></div>";
    h += "</div>"; return h;
  }
  function vEntretien() {
    var e = selEngine(), h = "";
    h += "<div class='vh'><div><span class='kick'>MODULE 04 — ENTRETIEN JUSQU'À 200 000 KM</span><h1>PLAN <i>PAR MOTORISATION</i></h1><div class='sub'>Le plan reprend exactement la sélection du module 2 : marque, modèle, phase, code moteur, puissance et boîte. Toutes les interventions et tous les contrôles, de la première révision à 200 000 km.</div></div>";
    h += "<a class='btn sm ghost' href='#/explorer'>" + ic("car") + "Modifier la sélection</a></div>";
    if (!e) { h += "<div class='empty'>" + ic("wrench") + "<p><b>Aucune motorisation sélectionnée.</b></p><p class='dim' style='font-size:12px;margin-top:6px'>Choisissez marque → modèle → motorisation dans le module 2 pour obtenir le plan complet.</p><a class='btn pri sm' href='#/explorer' style='margin-top:12px'>" + ic("car") + "Ouvrir le parc</a></div>"; return h; }
    var m = modelOf(e), b = brandOf(e), pl = buildPlan(e, m, b);
    h += planHTML(pl, false);
    var fs = faultsFor(e).filter(function (f) { return f.sev !== "info"; }), rc = tsbFor(e).filter(isRecall);
    h += "<div class='g2' style='margin-top:13px'><div class='card panel'><h3>" + ic("alert", "color:#FFAF2E") + "Pannes à surveiller<span class='chip'>" + fs.length + "</span></h3>" + (fs.length ? fs.slice(0, 6).map(function (f) { return faultCard(f, !f.active, false); }).join("") : "<p class='dim'>Aucune panne référencée.</p>") + "</div>";
    h += "<div class='card panel'><h3>" + ic("bell", "color:#FFD60A") + "Campagnes de rappel<span class='chip'>" + rc.length + "</span></h3>" + (rc.length ? rc.map(function (t) { return tsbCard(t, false); }).join("") : "<p class='dim'>Aucune campagne de rappel sur ce périmètre.</p>") + "</div></div>";
    h += "<div class='calc'><h3>" + ic("cal") + "CALCULATEUR D'ÉCHÉANCE</h3><div class='fr f3'>";
    h += "<div><label class='lb'>Kilométrage actuel</label><input class='inp mono' type='number' min='0' max='400000' step='1000' data-calc='km' value='" + num(S.calc.km, 0) + "'></div>";
    h += "<div><label class='lb'>Mise en circulation</label><input class='inp mono' type='number' min='2005' max='" + YMAX + "' data-calc='year' value='" + num(S.calc.year, 2021) + "'></div>";
    h += "<div><label class='lb'>Profil d'usage</label><select class='sel' data-calc='sev'><option value='1' " + (num(S.calc.sev, 1) === 1 ? "selected" : "") + ">Normal</option><option value='0.75' " + (num(S.calc.sev, 1) === 0.75 ? "selected" : "") + ">Sévère (urbain / charge)</option></select></div></div>";
    h += "<div class='due' id='dueList'>" + dueHTML(pl) + "</div></div>";
    return h;
  }
  function vStudio() {
    var P = WP.P, h = "";
    h += "<div class='vh'><div><span class='kick'>MODULE 05 — STUDIO FOND D'ÉCRAN</span><h1>FONDS <i>DYNAMIQUES</i></h1><div class='sub'>8 scènes animées, palette entièrement pilotable, vitesse et sens de défilement." + (isTier() ? " En session tiers, les réglages ne sont pas enregistrés." : "") + "</div></div>";
    h += "<div style='display:flex;gap:7px;flex-wrap:wrap'><button class='btn sm ghost' data-act='stRandom'>" + ic("dice") + "Aléatoire</button><button class='btn sm ghost' data-act='stReset'>" + ic("reset") + "Réinitialiser</button></div></div>";
    h += "<div class='stwrap'><div class='card stage'><div class='screen' id='screen'><canvas id='pv'></canvas><div class='hud' id='hud'></div></div>";
    h += "<div style='display:flex;gap:7px;flex-wrap:wrap;margin-top:11px'><button class='btn sm " + (P.run ? "amb" : "ghost") + "' data-act='stRun'>" + ic(P.run ? "pause" : "play") + (P.run ? "Pause" : "Lecture") + "</button><button class='btn sm ghost' data-act='stDir'>" + ic("reset") + (P.dir > 0 ? "Sens : avant" : "Sens : arrière") + "</button></div>";
    h += "<div class='psrow' style='margin-top:10px'>"; Object.keys(WP.PRESETS).forEach(function (n) { h += "<button data-act='stPreset' data-n='" + esc(n) + "'>" + esc(n) + "</button>"; }); h += "</div></div>";
    h += "<div class='card ctrl'><div class='csec'><label class='lb'>Scène animée</label><div class='mgrid'>";
    WP.MODES.forEach(function (m) { h += "<button class='mb " + (P.mode === m[0] ? "on" : "") + "' data-act='stMode' data-m='" + m[0] + "'><i style='background:linear-gradient(135deg," + WP.pal().a + "," + WP.pal().b + ")'></i>" + m[1] + "</button>"; }); h += "</div></div>";
    h += "<div class='csec'><label class='lb'>Palette prédéfinie</label><div class='pgrid'>";
    Object.keys(WP.TH).forEach(function (k) { var v = WP.TH[k]; h += "<button class='pb " + (!P.useCustom && P.theme === k ? "on" : "") + "' data-act='stTheme' data-t='" + k + "' title='" + esc(v.n) + "' style='background:linear-gradient(135deg," + v.a + "," + v.b + "," + v.c + ")'></button>"; }); h += "</div>";
    h += "<div class='srow' style='margin-top:8px'><span>Palette personnalisée</span><label class='sw'><input type='checkbox' id='customToggle' data-act='stCustom' " + (P.useCustom ? "checked" : "") + "><i></i></label></div>";
    h += "<div class='crow' style='margin-top:8px'>";[["bg", "Fond"], ["a", "Dominante"], ["b", "Accent 1"], ["c", "Accent 2"], ["d", "Accent 3"]].forEach(function (c) { h += "<div><label>" + c[1] + "</label><input type='color' data-c='" + c[0] + "' value='" + ((P.custom || {})[c[0]] || "#000000") + "'></div>"; }); h += "</div></div>";
    var sl = [["speed", "Vitesse de défilement", 0, 200, 5], ["density", "Densité", 0, 100, 1], ["count", "Particules", 10, 400, 5], ["turb", "Turbulence", 0, 100, 1], ["scale", "Échelle / grille", 20, 160, 2], ["glow", "Halo lumineux", 0, 100, 1], ["blur", "Flou", 0, 8, 0.5], ["stroke", "Épaisseur trait", 0.5, 4, 0.1], ["drift", "Dérive caméra", 0, 100, 1]];
    h += "<div class='csec'>"; sl.forEach(function (s) { h += "<div><div class='srow'><span>" + s[1] + "</span><span class='sval' data-pv='" + s[0] + "'>" + WP.label(s[0], P[s[0]]) + "</span></div><input type='range' data-p='" + s[0] + "' min='" + s[2] + "' max='" + s[3] + "' step='" + s[4] + "' value='" + num(P[s[0]], 0) + "'></div>"; }); h += "</div>";
    h += "<div class='csec'><div class='fr f2'><div><label class='lb'>Sens</label><select class='sel' data-p='dir'><option value='1' " + (P.dir > 0 ? "selected" : "") + ">Avant</option><option value='-1' " + (P.dir < 0 ? "selected" : "") + ">Arrière</option></select></div>";
    h += "<div><label class='lb'>Qualité</label><select class='sel' data-p='quality'><option value='eco' " + (P.quality === "eco" ? "selected" : "") + ">Éco 1×</option><option value='std' " + (P.quality === "std" ? "selected" : "") + ">Standard 1.5×</option><option value='ultra' " + (P.quality === "ultra" ? "selected" : "") + ">Ultra 2×</option></select></div></div></div>";
    h += "<div class='csec'>";[["grid", "Grille & repères"], ["run", "Animation"], ["bg", "Fond global"]].forEach(function (t) { h += "<div class='srow'><span>" + t[1] + "</span><label class='sw'><input type='checkbox' data-p='" + t[0] + "' " + (P[t[0]] ? "checked" : "") + "><i></i></label></div>"; }); h += "</div></div></div>";
    return h;
  }
  function vAdmin() {
    if (!isAdmin()) return "<div class='empty'>" + ic("lock") + "<p>Module réservé à la session administrateur.</p></div>";
    var A = S.adm, h = "";
    h += "<div class='vh'><div><span class='kick'>MODULE 06 — ADMINISTRATION ING-3</span><h1>BASE · ACCÈS · <i>DIFFUSION</i></h1><div class='sub'>Imports, exports et mises à jour massives réservés à l'administrateur. Gestion des accès tiers en temps réel et diffusion contrôlée.</div></div>";
    h += "<div style='display:flex;gap:7px'><span class='chip warn'>" + ic("shield", "width:11px;height:11px") + "ING-3</span><button class='btn sm ghost' data-act='logout'>" + ic("lock") + "Quitter</button></div></div>";
    h += "<div class='banner'>" + ic("bcast", "width:15px;height:15px;color:#FFD60A") + "<b>Diffusion temps réel</b><label class='sw'><input type='checkbox' data-act='liveToggle' " + (REG.live ? "checked" : "") + "><i></i></label>";
    h += "<span class='dim mono'>rév. " + num(REG.rev, 0) + "</span><button class='btn sm pri' data-act='publish'>" + ic("bcast") + "Diffuser maintenant</button></div>";
    h += "<div class='banner'>" + ic("reset", "width:15px;height:15px;color:#43E08B") + "<b>Cache</b><span class='dim mono' style='font-size:10.5px'>" + esc(purgeLabel()) + "</span><button class='btn sm ghost' data-act='purgeAgain'>Purger</button><button class='btn sm dgr' data-act='purgeAll'>Purge totale + accès</button></div>";
    h += "<div class='atabs'>";[["files", "FICHIERS", "db", META.counts.e], ["mega", "MÉGA-BASE", "spark", arr(RAW.cand).length], ["import", "IMPORT", "ul", ""], ["access", "ACCÈS TIERS", "users", pendingCount()], ["journal", "JOURNAL", "clock", AUDIT.length]].forEach(function (t) { h += "<button class='at " + (A.tab === t[0] ? "on" : "") + "' data-act='admTab' data-t='" + t[0] + "'>" + ic(t[2], "width:13px;height:13px") + t[1] + (t[3] !== "" ? "<span class='n'>" + t[3] + "</span>" : "") + "</button>"; }); h += "</div>";
    if (A.tab === "files") {
      h += "<div class='fgrid'>";
      FILES.forEach(function (f) { var a = arr(DB[f[0]]), k = Math.round(JSON.stringify(a).length / 1024); h += "<div class='card hov filecard'><div class='fn'>" + ic("file") + f[1] + "</div><div class='ct'>" + fmt(a.length) + " <small>entrées</small></div><div class='dim mono' style='font-size:9px'>" + k + " Ko · " + f[2] + "</div><div class='fa'><button class='btn xs ghost' data-act='fileExp' data-k='" + f[0] + "'>" + ic("dl", "width:11px;height:11px") + "JSON</button><button class='btn xs amb' data-act='admTab' data-t='import'>" + ic("ul", "width:11px;height:11px") + "Importer</button></div></div>"; });
      h += "</div><div class='tools'><button class='btn pri sm' data-act='expAll'>" + ic("dl") + "Exporter la base complète</button><button class='btn ghost sm' data-act='saveNow'>" + ic("save") + "Sauvegarder</button><button class='btn ghost sm' data-act='integrity'>" + ic("check") + "Intégrité</button><button class='btn dgr sm' data-act='askReset'>" + ic("reset") + "Base usine</button></div>";
      h += "<div class='card panel'><h3>" + ic("info") + "État de la méga-base</h3><div class='sg'>";
      [["Marques", META.counts.b], ["Modèles", META.counts.m], ["Motorisations", META.counts.e], ["Pannes", META.counts.f], ["TSB / rappels", META.counts.t], ["Domaines", META.counts.dom], ["Familles moteur", META.counts.fam], ["Liaisons", META.links], ["Corrélations", META.corr], ["Intégrité", META.integ.pct + " %"], ["Réparations auto", FIXES], ["Poids", META.size + " Ko"]].forEach(function (r) { h += "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + fmt(r[1]) + "</b></div>"; }); h += "</div></div>";
    } else if (A.tab === "mega") {
      var q = String(A.mega || "").trim().toLowerCase();
      var cands = arr(RAW.cand).filter(function (c) { if (!c) return false; if (!q) return true; return (c.brand + " " + c.model + " " + c.code + " " + c.label + " " + c.note).toLowerCase().indexOf(q) > -1; });
      h += "<div class='card panel' style='margin-bottom:12px'><h3>" + ic("spark") + "Mise à jour massive — recherche & intégration</h3>";
      h += "<p class='muted' style='font-size:12px;margin-bottom:10px'>Catalogue candidats 2025-2027 : nouvelles marques, nouveaux modèles commercialisés et motorisations corrélées. Réservé administrateur. La diffusion aux tiers reste soumise à votre accord.</p>";
      h += "<div class='fr f2'><div><label class='lb'>Recherche candidat</label><input class='inp' type='search' data-mega='q' value='" + esc(A.mega) + "' placeholder='Marque, modèle, code moteur, technologie…'></div>";
      h += "<div><label class='lb'>Corrélation sélection module 2</label><input class='inp' value='" + esc(S.sel.b ? (BIDX[S.sel.b] ? BIDX[S.sel.b].n : "") + " " + (S.sel.m && MIDX[S.sel.m] ? MIDX[S.sel.m].n : "") : "aucune sélection") + "' disabled></div></div>";
      h += "<div style='display:flex;gap:7px;margin-top:10px;flex-wrap:wrap'><button class='btn sm pri' data-act='megaAll'>" + ic("plus") + "Intégrer les " + cands.length + " résultat(s)</button><button class='btn sm ghost' data-act='megaSel'>" + ic("car") + "Filtrer sur la marque sélectionnée</button></div></div>";
      h += "<div class='tw'><table class='t'><thead><tr><th>Type</th><th>Marque</th><th>Modèle / phase</th><th>Motorisation</th><th>Période</th><th>Note</th><th></th></tr></thead><tbody>";
      cands.forEach(function (c) { var bi = BIDX[c.brand]; h += "<tr><td><span class='tag'>" + esc(c.type) + "</span></td><td>" + esc(bi ? bi.n : c.brand) + "</td><td><b>" + esc(c.model) + "</b> <span class='tag'>phase " + c.phase + "</span></td><td class='mono'>" + esc(c.label) + " · " + c.hp + " ch · " + esc(c.code) + "</td><td class='mono'>" + c.y0 + "-" + c.y1 + "</td><td class='dim' style='font-size:11px'>" + esc(c.note) + "</td><td><button class='btn xs pri' data-act='megaAdd' data-i='" + arr(RAW.cand).indexOf(c) + "'>Intégrer</button></td></tr>"; });
      h += "</tbody></table></div>";
    } else if (A.tab === "import") {
      h += "<div class='card panel'><h3>" + ic("ul") + "Import universel multi-formats — administrateur seul</h3>";
      h += "<div class='dz' id='dz' data-act='dzPick'>" + ic("ul") + "<div><b>Déposer un fichier</b> ou cliquer</div><div class='dim mono' style='font-size:10px;margin-top:4px'>VALIDATION AVANT ÉCRITURE · FUSION SANS DOUBLON · DIFFUSION SUR ACCORD</div></div>";
      h += "<div class='fmtrow'><span>JSON</span><span>JSONL</span><span>CSV</span><span>TSV</span><span>XML</span><span>YAML</span><span>HTML</span><span>XLSX</span><span>ODS</span><span>JS</span><span>TXT</span></div>";
      h += "<input type='file' id='impFile' style='display:none'>";
      h += "<div style='margin-top:12px'><label class='lb'>…ou coller les données</label><textarea class='inp mono' id='impText' rows='7'></textarea></div>";
      h += "<div id='impReport'></div><div style='display:flex;gap:7px;margin-top:11px;flex-wrap:wrap'><button class='btn ghost sm' data-act='impAnalyze'>" + ic("check") + "Analyser</button><button class='btn pri sm' id='impApply' data-act='impApply' disabled>" + ic("ul") + "Fusionner dans la base</button></div></div>";
    } else if (A.tab === "access") {
      h += "<div class='card panel' style='margin-bottom:12px'><h3>" + ic("users") + "Demandes & sessions tiers<span class='chip'>" + pendingCount() + " en attente</span></h3>";
      h += "<p class='muted' style='font-size:12px;margin-bottom:10px'>Le tiers saisit son prénom et le mot de passe <b class='mono' style='color:#FFD60A'>expert83</b>, puis attend votre validation. Vous acceptez, refusez ou révoquez en temps réel. Le tiers consulte uniquement les fiches techniques et le studio ; il ne peut ni importer, ni exporter, ni mettre à jour, ni sauvegarder localement.</p>";
      var us = arr(REG.users);
      if (!us.length) h += "<div class='empty'>" + ic("users") + "<p>Aucune demande pour le moment.</p></div>";
      else {
        h += "<div class='tw'><table class='t'><thead><tr><th>Prénom</th><th>Statut</th><th>Demande</th><th>Dernière action</th><th style='text-align:right'>Décision</th></tr></thead><tbody>";
        us.forEach(function (u) { if (!u) return; var col = u.status === "granted" ? "#43E08B" : (u.status === "pending" ? "#FFD60A" : "#FF4D5E"); h += "<
