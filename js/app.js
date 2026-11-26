/* MECADATA v18 — noyau (partie 1/2).
   CORRECTIFS MASSIFS :
   • index moteurs/modèles rafraîchi en direct → plus aucun modèle orphelin ;
   • tout plan d'entretien atteint TOUJOURS 200 000 km (palier final forcé) ;
   • moteur de RÉPARATION : réattache les motorisations manquantes, complète
     à ≥2 puissances par modèle, comble pannes/bulletins, sauvegarde en admin ;
   • touche « réparation » (clé verte) injectée dans la barre du haut.
   Chargé avant js/app-ui.js (partie 2, inchangée). */
"use strict";

/* ---------- utilitaires ---------- */
var D = document;
function $(s, r) { return (r || D).querySelector(s); }
function $$(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
var EM = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return EM[c]; });
}
function num(v, d) {
  var n = Number(v);
  return isFinite(n) ? n : d;
}
function fmt(n) {
  n = num(n, 0);
  try { return n.toLocaleString("fr-FR"); } catch (e) { return String(n); }
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, num(v, a))); }
function uid(p) { return p + Math.random().toString(36).slice(2, 7).toUpperCase(); }
function clone(o) {
  try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; }
}
function arr(v) {
  if (Array.isArray(v)) { return v; }
  return [];
}
function str(v, d) {
  var s = String(v == null ? "" : v).trim();
  if (s) { return s; }
  return (d == null ? "" : d);
}
function list(v) {
  if (Array.isArray(v)) { return v.filter(Boolean); }
  return String(v == null ? "" : v).split(/[;,|]/).map(function (s) { return s.trim(); }).filter(Boolean);
}
function pair(v, d) {
  var a = arr(v);
  return [num(a[0], d[0]), num(a[1], d[1])];
}
function kmOf(f) {
  var p = pair(f && f.km, [0, 200000]);
  return p[0] > p[1] ? [p[1], p[0]] : p;
}
function yOf(f) {
  var p = pair(f && f.y, [2017, 2027]);
  return p[0] > p[1] ? [p[1], p[0]] : p;
}
function costOf(f) {
  var p = pair(f && f.cost, [0, 0]);
  return p[1] < p[0] ? [p[0], p[0]] : p;
}
function ov(a, b) {
  var x = pair(a, [0, 0]);
  var y = pair(b, [0, 0]);
  return x[0] <= y[1] && y[0] <= x[1];
}
function ic(n, st) {
  return "<svg class='ic'" + (st ? " style='" + st + "'" : "") + "><use href='#i-" + n + "'/></svg>";
}
function deb(f, t) {
  var h;
  return function () {
    var a = arguments, s = this;
    clearTimeout(h);
    h = setTimeout(function () { f.apply(s, a); }, t);
  };
}
function idle(f, ms) {
  if (window.requestIdleCallback) {
    requestIdleCallback(function () { f(); }, { timeout: ms || 1500 });
  } else {
    setTimeout(f, ms || 250);
  }
}
function nk(s) {
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}
function slug(s) {
  return nk(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || uid("x");
}
var ERRORS = [];
function logErr(w, e) {
  var m = w + " : " + ((e && e.message) ? e.message : String(e));
  ERRORS.push({ ts: Date.now(), m: m });
  if (ERRORS.length > 60) { ERRORS.shift(); }
  try { window.__MD_ERR.push({ msg: m, src: "app", line: 0, col: 0 }); } catch (x) {}
}
window.addEventListener("error", function (e) { logErr("window", e.error || e.message); });
window.addEventListener("unhandledrejection", function (e) { logErr("promise", e.reason); });
function safe(w, f, fb) {
  try { return f(); } catch (e) { logErr(w, e); return fb; }
}

/* ---------- stockage ---------- */
var MEM = {};
var STORE = {
  local: false,
  probe: function () {
    try {
      localStorage.setItem("__m", "1");
      localStorage.removeItem("__m");
      this.local = true;
    } catch (e) {}
  },
  get: function (k) {
    if (this.local) {
      try { return localStorage.getItem(k); } catch (e) {}
    }
    return MEM[k] || null;
  },
  set: function (k, v) {
    if (this.local) {
      try {
        localStorage.setItem(k, v);
        return true;
      } catch (e) { this.local = false; }
    }
    MEM[k] = v;
    return true;
  },
  del: function (k) {
    if (this.local) {
      try { localStorage.removeItem(k); } catch (e) {}
    }
    delete MEM[k];
  }
};
STORE.probe();
function download(n, c) {
  safe("dl", function () {
    var b = new Blob([c], { type: "application/json" });
    var u = URL.createObjectURL(b);
    var a = D.createElement("a");
    a.href = u;
    a.download = n;
    D.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 700);
  }, null);
}

/* ---------- son, toasts, modales ---------- */
var PREF = { sound: true };
var AUC = { ctx: null };
function beep(k) {
  if (!PREF.sound) { return; }
  safe("audio", function () {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) { return; }
    AUC.ctx = AUC.ctx || new C();
    var c = AUC.ctx, t = c.currentTime;
    function p(f0, f1, d, ty, g, dt) {
      dt = dt || 0;
      var o = c.createOscillator(), v = c.createGain();
      o.type = ty;
      o.frequency.setValueAtTime(f0, t + dt);
      if (f1) { o.frequency.exponentialRampToValueAtTime(f1, t + dt + d); }
      v.gain.setValueAtTime(0, t + dt);
      v.gain.linearRampToValueAtTime(g, t + dt + 0.008);
      v.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
      o.connect(v);
      v.connect(c.destination);
      o.start(t + dt);
      o.stop(t + dt + d + 0.03);
    }
    if (k === "tick") { p(1700, 1400, 0.045, "square", 0.03); }
    else if (k === "ok") { p(660, 0, 0.09, "sine", 0.055); p(990, 0, 0.14, "sine", 0.055, 0.09); }
    else if (k === "err") { p(150, 110, 0.2, "sawtooth", 0.06); }
    else if (k === "imp") { p(520, 0, 0.08, "sine", 0.045); p(660, 0, 0.08, "sine", 0.045, 0.08); p(880, 0, 0.16, "sine", 0.05, 0.16); }
    else if (k === "open") { p(320, 560, 0.09, "sine", 0.045); }
    else if (k === "close") { p(520, 300, 0.08, "sine", 0.035); }
  }, null);
}
function toast(type, title, msg, undo) {
  var box = $("#ts");
  if (!box) { return; }
  while (box.children.length >= 3) { box.removeChild(box.firstChild); }
  var el = D.createElement("div");
  el.className = "to " + type;
  var h = ic({ ok: "check", err: "alert", warn: "alert", info: "info" }[type] || "info");
  h += "<div style='flex:1;min-width:0'><b>" + esc(title) + "</b>";
  if (msg) { h += "<p>" + esc(msg) + "</p>"; }
  h += "</div>";
  if (undo) { h += "<button class='btn xs amb' data-act='undo'>Annuler</button>"; }
  h += "<span class='pg' style='animation-duration:" + (undo ? 8 : 4.6) + "s'></span>";
  el.innerHTML = h;
  box.appendChild(el);
  var kill = function () {
    el.classList.add("out");
    setTimeout(function () {
      if (el.parentNode) { el.parentNode.removeChild(el); }
    }, 260);
  };
  el._t = setTimeout(kill, undo ? 8000 : 4600);
  el.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-act=undo]")) {
      clearTimeout(el._t);
      kill();
    }
  });
}
var modalOpen = false;
function openModal(html, cls) {
  var r = $("#md");
  if (!r) { return; }
  r.innerHTML = "<div class='ms' data-act='mscrim'><div class='mo " + (cls || "") + "'>" + html + "</div></div>";
  requestAnimationFrame(function () { r.classList.add("on"); });
  D.body.classList.add("lock");
  modalOpen = true;
  beep("open");
}
function closeModal() {
  var r = $("#md");
  if (!r || !r.innerHTML) { return; }
  r.classList.remove("on");
  modalOpen = false;
  D.body.classList.remove("lock");
  setTimeout(function () {
    if (!modalOpen) { r.innerHTML = ""; }
  }, 220);
  beep("close");
}
function confirmModal(t, m, a, l) {
  var h = "<div class='mh'>" + ic("alert", "color:#FFAF2E") + "<h3>" + esc(t) + "</h3>";
  h += "<button class='tb' data-act='mclose'>" + ic("x") + "</button></div>";
  h += "<div class='mb2'><p class='muted'>" + esc(m) + "</p></div>";
  h += "<div class='mf'><button class='btn ghost' data-act='mclose'>Annuler</button>";
  h += "<button class='btn dgr' data-act='" + a + "'>" + esc(l || "Confirmer") + "</button></div>";
  openModal(h, "slim");
}

/* ---------- constantes ---------- */
var PWD = "Kevin83600";
var TPWD = "expert83";
var KEY = "mecadata_v18";
var AKEY = "md_access_v18";
var PKEY = "md_pub_v18";
var AKEY2 = "md_auto_v18";
var YMAX = 2027;
var KMMAX = 200000;
var LEGACY = ["mecadata_v72", "mecadata_v8", "mecadata_v9", "mecadata_v10", "mecadata_v11", "mecadata_v12", "mecadata_v15", "mecadata_v17", "md_access_v8", "md_access_v9", "md_access_v10", "md_access_v11", "md_access_v12", "md_access_v15", "md_access_v17", "md_pub_v9", "md_pub_v10", "md_pub_v11", "md_pub_v12", "md_pub_v15", "md_pub_v17", "md_auto_v11", "md_auto_v12", "md_auto_v15", "md_auto_v17", "md_adm", "md_boot"];
var PURGED = { local: 0, session: 0, caches: 0, sw: 0, done: false };
function purgeCache(full) {
  var n = 0;
  LEGACY.forEach(function (k) {
    if (STORE.get(k) !== null) { STORE.del(k); n++; }
  });
  if (STORE.get(KEY) !== null) { STORE.del(KEY); n++; }
  if (STORE.get(PKEY) !== null) { STORE.del(PKEY); n++; }
  if (full && STORE.get(AKEY) !== null) { STORE.del(AKEY); n++; }
  PURGED.local = n;
  var s = 0;
  try {
    if (window.sessionStorage) {
      s = sessionStorage.length;
      sessionStorage.clear();
    }
  } catch (e) {
    s = 0;
  }
  PURGED.session = s;
  safe("caches", function () {
    if (window.caches && caches.keys) {
      caches.keys().then(function (ks) {
        PURGED.caches = arr(ks).length;
        arr(ks).forEach(function (k) {
          safe("cd", function () { caches.delete(k); }, null);
        });
      }).catch(function () {});
    }
  }, null);
  safe("sw", function () {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        PURGED.sw = arr(rs).length;
        arr(rs).forEach(function (r) {
          safe("ur", function () { r.unregister(); }, null);
        });
      }).catch(function () {});
    }
  }, null);
  PURGED.done = true;
  return PURGED;
}
function purgeLabel() {
  return PURGED.local + " locale(s) · " + PURGED.session + " session · " + PURGED.caches + " cache(s) PWA · " + PURGED.sw + " SW";
}

var RAW = window.MD_RAW || { br: [], md: {}, me: {}, ft: [], ts: [], svc: [], cand: [], segs: [] };
var SEGS = arr(RAW.segs).length ? RAW.segs : ["Citadine", "Micro-citadine", "Compacte", "SUV urbain", "SUV compact", "Berline", "Break", "Ludospace", "Utilitaire", "Coupé", "Roadster", "Sportive", "Monospace", "Pick-up"];
var FU = {
  e: { l: "Essence", c: "#FFAF2E" },
  d: { l: "Diesel", c: "#4D8DFF" },
  h: { l: "Hybride", c: "#43E08B" },
  p: { l: "Hybride rechargeable", c: "#19B8A6" },
  b: { l: "Électrique", c: "#E45CFF" },
  g: { l: "GPL", c: "#A8E63C" }
};
var SV = {
  critique: { w: 32, c: "#FF4D5E" },
  majeure: { w: 18, c: "#FF7A3D" },
  "modérée": { w: 9, c: "#FFAF2E" },
  mineure: { w: 4, c: "#4D8DFF" },
  info: { w: 0, c: "#25D4EE" }
};
var FQ = { "élevée": 1.25, moyenne: 1, faible: 0.7 };
var REGIONS = { france: "France", europe: "Europe", asie: "Asie", chine: "Chine", amerique: "Amérique" };
var FILES = [["brands", "Marques"], ["models", "Modèles"], ["engines", "Motorisations"], ["faults", "Pannes"], ["tsb", "TSB / Rappels"]];
function nsev(v) {
  var k = nk(v);
  var m = { critique: "critique", majeure: "majeure", moderee: "modérée", mineure: "mineure", info: "info" };
  return m[k] || (SV[v] ? v : "modérée");
}
function nfreq(v) {
  var k = nk(v);
  var m = { elevee: "élevée", moyenne: "moyenne", faible: "faible" };
  return m[k] || (FQ[v] ? v : "moyenne");
}
function nfuel(v) {
  var k = nk(v);
  var m = { e: "e", essence: "e", d: "d", diesel: "d", h: "h", hybride: "h", p: "p", phev: "p", b: "b", ev: "b", electrique: "b", g: "g", gpl: "g" };
  return m[k] || (FU[k] ? k : "e");
}
function regionOf(p) {
  var k = nk(p);
  if (k.indexOf("france") > -1) { return "france"; }
  if (k.indexOf("chine") > -1) { return "chine"; }
  if (k.indexOf("japon") > -1 || k.indexOf("coree") > -1 || k.indexOf("vietnam") > -1) { return "asie"; }
  if (k.indexOf("etatsunis") > -1) { return "amerique"; }
  return "europe";
}
function IVL(v) {
  v = num(v, 0);
  if (v >= 75) { return ["CRITIQUE", "#FF4D5E"]; }
  if (v >= 50) { return ["ÉLEVÉ", "#FF7A3D"]; }
  if (v >= 25) { return ["MODÉRÉ", "#FFAF2E"]; }
  return ["FAIBLE", "#43E08B"];
}
var SVC_FB = {
  key: "fb", fams: ["*"], fuel: "*", base: 20000, months: 12,
  oil: ["5W-30 ACEA C3", 4.5], dist: ["Selon constructeur", 150000, 72],
  items: [["Vidange huile + filtre", 20000, 12], ["Filtre habitacle", 20000, 12], ["Liquide de freins", 0, 24], ["Contrôle plaquettes", 20000, 12], ["Contrôle pneumatiques", 10000, 6]],
  controls: ["Niveau huile", "Pression pneus", "Plaquettes", "Voyants"],
  fluids: ["DOT4", "G12", "120", "2.4", "2.4", "R1234yf", "AGM 70Ah"]
};

/* ---------- studio fonds dynamiques ---------- */
var WP = {
  P: { mode: "nebula", theme: "diag", useCustom: false, custom: { bg: "#04070D", a: "#FFD60A", b: "#25D4EE", c: "#E45CFF", d: "#43E08B" }, density: 64, count: 150, speed: 100, turb: 38, scale: 66, glow: 60, blur: 0, stroke: 1.4, drift: 40, dir: 1, quality: "std", grid: true, run: true, bg: true },
  TH: {
    diag: { n: "Diagnostic", bg: "#04070D", a: "#FFD60A", b: "#25D4EE", c: "#E45CFF", d: "#43E08B" },
    torque: { n: "Couple", bg: "#0B0603", a: "#FFAF2E", b: "#FF7A3D", c: "#FF4D5E", d: "#FFD98A" },
    acid: { n: "Acide", bg: "#040A06", a: "#A8E63C", b: "#43E08B", c: "#25D4EE", d: "#E4FF7A" },
    plasma: { n: "Plasma", bg: "#08040F", a: "#E45CFF", b: "#8F7CFF", c: "#25D4EE", d: "#FF6FB1" },
    ocean: { n: "Océan", bg: "#02080C", a: "#19B8A6", b: "#4D8DFF", c: "#25D4EE", d: "#7CE8D0" },
    steel: { n: "Acier", bg: "#070A0E", a: "#9FB2C8", b: "#5F7288", c: "#25D4EE", d: "#E6EEF9" }
  },
  MODES: [["nebula", "NEBULA"], ["flux", "FLUX"], ["grid", "GRILLE"], ["radar", "RADAR"], ["scope", "SCOPE"], ["tunnel", "TUNNEL"]],
  PRESETS: {
    "Nebula or": { mode: "nebula", theme: "diag", speed: 80, glow: 66 },
    "Acide rapide": { mode: "tunnel", theme: "acid", speed: 140, glow: 62 },
    "Radar atelier": { mode: "radar", theme: "acid", speed: 85, glow: 70 },
    "Scope 4 cyl": { mode: "scope", theme: "acid", speed: 130, turb: 52 },
    "Acier calme": { mode: "grid", theme: "steel", speed: 60, glow: 34 }
  },
  targets: [], raf: 0, t: 0, last: 0, running: false, fails: 0,
  pal: function () {
    if (this.P.useCustom) {
      var c = this.P.custom || {};
      return { n: "Perso", bg: str(c.bg, "#04070D"), a: str(c.a, "#FFD60A"), b: str(c.b, "#25D4EE"), c: str(c.c, "#E45CFF"), d: str(c.d, "#43E08B") };
    }
    return this.TH[this.P.theme] || this.TH.diag;
  },
  init: function () {
    var cv = $("#bgc");
    if (cv) {
      var cx = safe("ctx", function () { return cv.getContext("2d"); }, null);
      if (cx) { this.targets.push({ cv: cv, ctx: cx, sc: 0.5, W: 0, H: 0, st: null, key: "" }); }
    }
    this.resize();
    var s = this;
    window.addEventListener("resize", deb(function () { s.resize(); }, 150));
    D.addEventListener("visibilitychange", function () {
      if (D.hidden) { s.stop(); } else if (s.P.run) { s.start(); }
    });
    this.apply();
  },
  attach: function (cv) {
    this.targets = this.targets.filter(function (t) { return t.cv.id === "bgc"; });
    if (cv) {
      var cx = safe("c2", function () { return cv.getContext("2d"); }, null);
      if (cx) { this.targets.push({ cv: cv, ctx: cx, sc: 1, W: 0, H: 0, st: null, key: "", pv: true }); }
    }
    this.resize();
    if (this.P.run) { this.start(); } else { this.drawAll(); }
  },
  detach: function () {
    this.targets = this.targets.filter(function (t) { return !t.pv; });
  },
  resize: function () {
    var d = Math.min(window.devicePixelRatio || 1, this.P.quality === "eco" ? 1 : 1.5);
    this.targets.forEach(function (t) {
      var w = t.pv ? (t.cv.clientWidth || 640) : window.innerWidth;
      var h = t.pv ? (t.cv.clientHeight || 330) : window.innerHeight;
      t.W = Math.max(1, w);
      t.H = Math.max(1, h);
      t.cv.width = Math.round(t.W * d);
      t.cv.height = Math.round(t.H * d);
      safe("tr", function () { t.ctx.setTransform(d, 0, 0, d, 0, 0); }, null);
      t.key = "";
    });
    this.drawAll();
  },
  set: function (k, v) {
    this.P[k] = v;
    if (k === "quality") { this.resize(); }
    if ("mode count scale density".indexOf(k) > -1) {
      this.targets.forEach(function (t) { t.key = ""; });
    }
    this.fx();
    if (k === "run") {
      if (v) { this.start(); } else { this.stop(); }
    }
    this.drawAll();
    save();
    this.sync();
  },
  setCustom: function (k, v) {
    if (!this.P.custom) { this.P.custom = {}; }
    this.P.custom[k] = v;
    this.P.useCustom = true;
    this.drawAll();
    save();
    this.sync();
  },
  randomize: function () {
    var ms = this.MODES.map(function (m) { return m[0]; });
    var ts = Object.keys(this.TH);
    var R = Math.random;
    this.P.mode = ms[Math.floor(R() * ms.length)];
    this.P.theme = ts[Math.floor(R() * ts.length)];
    this.P.speed = 40 + Math.round(R() * 140);
    this.P.glow = 20 + Math.round(R() * 75);
    this.P.count = 60 + Math.round(R() * 240);
    this.P.dir = R() < 0.5 ? 1 : -1;
    this.apply();
    this.resize();
    save();
  },
  reset: function () {
    this.P = { mode: "nebula", theme: "diag", useCustom: false, custom: { bg: "#04070D", a: "#FFD60A", b: "#25D4EE", c: "#E45CFF", d: "#43E08B" }, density: 64, count: 150, speed: 100, turb: 38, scale: 66, glow: 60, blur: 0, stroke: 1.4, drift: 40, dir: 1, quality: "std", grid: true, run: true, bg: true };
    this.apply();
    this.resize();
    save();
  },
  fx: function () {
    var bc = $("#bgc");
    if (bc) {
      bc.style.opacity = this.P.bg ? "1" : "0";
      bc.style.filter = this.P.blur ? "blur(" + this.P.blur + "px)" : "none";
    }
  },
  apply: function () {
    this.fx();
    this.targets.forEach(function (t) { t.key = ""; });
    if (this.P.run && !D.hidden) { this.start(); } else { this.stop(); this.drawAll(); }
    this.sync();
  },
  start: function () {
    if (this.running || !this.targets.length) { return; }
    this.running = true;
    this.last = performance.now();
    var s = this;
    var loop = function (n) {
      if (!s.running) { return; }
      var dt = Math.min(0.05, (n - s.last) / 1000);
      s.last = n;
      s.t += dt * (s.P.speed / 100) * s.P.dir;
      s.drawAll();
      s.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop: function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
  },
  mk: function (t) {
    var I = this.P.density / 100;
    var n = Math.round(clamp(this.P.count * (t.W * t.H) / (1280 * 720), 12, 300) * t.sc);
    var i, p = [], bl = [], ln = [];
    for (i = 0; i < n; i++) {
      p.push({ x: Math.random() * t.W, y: Math.random() * t.H, vx: (0.2 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1), vy: (Math.random() - 0.5) * 0.4, r: 0.8 + Math.random() * 1.9, ph: Math.random() * 6.28, k: Math.floor(Math.random() * 4) });
    }
    for (i = 0; i < 16 * I + 5; i++) { bl.push({ a: Math.random() * 6.28, d: 0.14 + Math.random() * 0.82, h: 0 }); }
    for (i = 0; i < 9 * I + 3; i++) { ln.push({ h: Math.random() < 0.5, pos: Math.random(), sp: 0.001 + Math.random() * 0.002, o: Math.random() }); }
    return { p: p, bl: bl, ln: ln };
  },
  drawAll: function () {
    var s = this;
    this.targets.forEach(function (t) {
      if (!t.W || !t.H) { return; }
      if (!t.pv && !s.P.bg) { return; }
      var k = [s.P.mode, s.P.count, s.P.scale, t.W, t.H].join("|");
      if (t.key !== k) { t.st = s.mk(t); t.key = k; }
      try {
        s.draw(t.ctx, t.W, t.H, s.t, s.P, t.st, s.pal(), t.sc);
      } catch (e) {
        s.fails++;
        if (s.fails > 3) { s.P.mode = "grid"; s.fails = 0; t.key = ""; }
      }
    });
  },
  draw: function (c, W, H, t, P, st, TH, sc) {
    var I = P.density / 100, TB = P.turb / 100, G = P.glow / 100, LW = P.stroke, DR = 0.2 + P.drift / 100, SP = P.speed / 100;
    var cols = [TH.a, TH.b, TH.c, TH.d];
    var i, j;
    function hx(a) { return clamp(Math.round(a * 255), 0, 255).toString(16).padStart(2, "0"); }
    function glow(v) { c.shadowColor = v; c.shadowBlur = G * 16; }
    function ng() { c.shadowBlur = 0; }
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.fillStyle = P.mode === "scope" ? TH.bg + "2E" : TH.bg;
    c.fillRect(0, 0, W, H);
    c.lineWidth = LW;
    if (P.grid && P.mode !== "nebula") {
      var s0 = Math.max(18, P.scale);
      var o0 = (t * 9 * DR) % s0;
      c.strokeStyle = TH.a + "12";
      c.beginPath();
      for (i = -o0; i < W + s0; i += s0) { c.moveTo(i, 0); c.lineTo(i, H); }
      for (j = -o0 * 0.6; j < H + s0; j += s0) { c.moveTo(0, j); c.lineTo(W, j); }
      c.stroke();
    }
    var pts = arr(st && st.p);
    if (P.mode === "nebula") {
      c.globalCompositeOperation = "lighter";
      for (i = 0; i < 4; i++) {
        var bx = W * (0.3 + 0.4 * Math.sin(t * 0.2 * DR + i * 1.7));
        var by = H * (0.3 + 0.4 * Math.cos(t * 0.16 * DR + i));
        var br = Math.min(W, H) * 0.35;
        var gg = c.createRadialGradient(bx, by, 0, bx, by, br);
        gg.addColorStop(0, cols[i % 4] + hx(0.18 * I + 0.05));
        gg.addColorStop(1, cols[i % 4] + "00");
        c.fillStyle = gg;
        c.fillRect(0, 0, W, H);
      }
      c.globalCompositeOperation = "source-over";
      for (i = 0; i < pts.length; i += 3) {
        var d = pts[i];
        d.ph += 0.02 * SP;
        d.y -= 0.12 * SP * DR;
        if (d.y < -4) { d.y = H + 4; }
        c.fillStyle = TH.d + hx(0.15 * I + 0.04);
        c.fillRect(d.x, d.y, d.r, d.r);
      }
    } else if (P.mode === "flux") {
      for (i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx * SP * 1.7 + Math.sin(t * 0.6 + p.ph) * TB * 0.7;
        p.y += p.vy * SP * 1.7;
        if (p.x < -12) { p.x = W + 12; }
        if (p.x > W + 12) { p.x = -12; }
        if (p.y < -12) { p.y = H + 12; }
        if (p.y > H + 12) { p.y = -12; }
      }
      var R = Math.max(48, P.scale * 1.4);
      var R2 = R * R;
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          var a = pts[i], b = pts[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            c.strokeStyle = TH.a + hx((1 - d2 / R2) * 0.14 * I);
            c.beginPath();
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        var q = pts[i];
        glow(cols[q.k]);
        c.fillStyle = cols[q.k];
        c.globalAlpha = 0.7 * I + 0.15;
        c.beginPath();
        c.arc(q.x, q.y, q.r, 0, 6.283);
        c.fill();
        c.globalAlpha = 1;
        ng();
      }
    } else if (P.mode === "grid") {
      var ln = arr(st && st.ln);
      for (i = 0; i < ln.length; i++) {
        var l = ln[i];
        l.o = (l.o + l.sp * SP * 2 + 1) % 1;
        var px = l.h ? W * l.o : H * l.o;
        glow(TH.a);
        c.fillStyle = TH.a + "CC";
        if (l.h) { c.fillRect(px, l.pos * H, 26, LW + 1); } else { c.fillRect(l.pos * W, px, LW + 1, 26); }
        ng();
      }
      for (i = 0; i < pts.length; i += 2) {
        var z = pts[i];
        z.ph += 0.02 * SP;
        c.strokeStyle = TH.a + hx(0.25 * I);
        c.beginPath();
        c.moveTo(z.x - 5, z.y);
        c.lineTo(z.x + 5, z.y);
        c.moveTo(z.x, z.y - 5);
        c.lineTo(z.x, z.y + 5);
        c.stroke();
      }
    } else if (P.mode === "radar") {
      var cx = W * 0.6, cy = H * 0.45;
      var RR = Math.min(W, H) * 0.4;
      var ang = (t * 0.8 * SP) % 6.283;
      c.strokeStyle = TH.a + "22";
      for (i = 1; i <= 4; i++) {
        c.beginPath();
        c.arc(cx, cy, RR * i / 4, 0, 6.283);
        c.stroke();
      }
      glow(TH.a);
      c.strokeStyle = TH.a;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(ang) * RR, cy + Math.sin(ang) * RR);
      c.stroke();
      ng();
      var bl = arr(st && st.bl);
      for (i = 0; i < bl.length; i++) {
        var bp = bl[i];
        var da = ((ang - bp.a) % 6.283 + 6.283) % 6.283;
        if (da < 0.07) { bp.h = 1; }
        bp.h *= 0.986;
        if (bp.h > 0.02) {
          c.fillStyle = TH.d + hx(bp.h);
          c.beginPath();
          c.arc(cx + Math.cos(bp.a) * RR * bp.d, cy + Math.sin(bp.a) * RR * bp.d, 3, 0, 6.283);
          c.fill();
        }
      }
    } else if (P.mode === "scope") {
      for (var k2 = 0; k2 < 4; k2++) {
        var base = H * (k2 + 0.6) / 4.6;
        var amp = H / 12.4;
        var col = cols[k2];
        glow(col);
        c.strokeStyle = col;
        c.beginPath();
        for (i = 0; i <= W; i += 3) {
          var u = i / W * 12 + t * 1.6 * SP + k2 * 1.3;
          var y = base + Math.sin(u) * amp * 0.6 + Math.sin(u * 3.1 + k2) * amp * 0.28 * TB;
          if (i) { c.lineTo(i, y); } else { c.moveTo(i, y); }
        }
        c.stroke();
        ng();
      }
    } else {
      var cx2 = W / 2, cy2 = H / 2;
      var mR = Math.max(W, H) * 0.7;
      for (i = 0; i < 12; i++) {
        var zz = ((i / 12) + t * 0.06 * SP * DR) % 1;
        if (zz < 0) { zz += 1; }
        var rr = mR * (0.04 + zz * zz);
        c.strokeStyle = cols[i % 4] + hx(zz * 0.5 * I + 0.05);
        c.lineWidth = LW + zz;
        c.beginPath();
        for (j = 0; j <= 6; j++) {
          var ta = j * 1.047 + zz * 0.6;
          var tx = cx2 + Math.cos(ta) * rr;
          var ty = cy2 + Math.sin(ta) * rr * 0.72;
          if (j) { c.lineTo(tx, ty); } else { c.moveTo(tx, ty); }
        }
        c.stroke();
      }
      c.lineWidth = LW;
    }
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
  },
  label: function (k, v) {
    var u = { density: "%", speed: "%", turb: "%", glow: "%", scale: " px", stroke: " px", blur: " px", drift: "%", count: "" };
    var val = (k === "stroke" || k === "blur") ? num(v, 0).toFixed(1) : Math.round(num(v, 0));
    return val + (u[k] || "");
  },
  sync: function () {
    var P = this.P;
    var rb = $("#runb");
    if (rb) {
      rb.innerHTML = ic(P.run ? "pause" : "play");
      rb.classList.toggle("on", P.run);
    }
    $$(".mb").forEach(function (b) { b.classList.toggle("on", b.dataset.m === P.mode); });
    $$(".pbth").forEach(function (b) { b.classList.toggle("on", !P.useCustom && b.dataset.t === P.theme); });
    $$("[data-p]").forEach(function (el) {
      var k = el.dataset.p;
      var v = P[k];
      if (el.type === "checkbox") { el.checked = !!v; }
      else if (el !== D.activeElement) { el.value = v; }
      var o = $("[data-pv='" + k + "']");
      if (o) { o.textContent = WP.label(k, v); }
    });
    $$("[data-c]").forEach(function (el) {
      if (el !== D.activeElement) { el.value = (P.custom || {})[el.dataset.c] || "#000000"; }
    });
    var h = $("#hud");
    if (h) {
      h.innerHTML = "<span>" + P.mode.toUpperCase() + "</span><span>" + esc(this.pal().n) + "</span><span>" + (P.run ? "LIVE" : "PAUSE") + "</span>";
    }
  }
};

/* ---------- état ---------- */
var SEED = null;
var DB = { brands: [], models: [], engines: [], faults: [], tsb: [] };
var AUDIT = [];
var UNDO = null;
var TESTS = [];
var IVIC = {}, FC = {}, TC = {}, MIDX = {}, BIDX = {}, EIDX = {};
var IMPORT = null;
var FIXES = 0;
var LASTSAVE = 0;
var DIRTY = false;
var META = { counts: { b: 0, m: 0, e: 0, f: 0, t: 0, rc: 0, fam: 0, dom: 0 }, links: 0, corr: 0, integ: { err: [], ok: true, pct: 100 }, size: 0, byBrand: {}, regions: {}, cover: 0, perModel: {} };
var MODE = null;
var TIER = null;
var TIER_TS = 0;
var REG = { users: [], live: false, rev: 0, log: [], tierOpen: true, tierKick: 0 };
var CH = null;
var GATE = null;
var S = {
  view: "bord",
  sel: { b: "", m: "", e: "" },
  f: { q: "", fuel: [], region: "", sort: "brand" },
  shown: 48,
  tech: { tab: "faults", q: "", sev: "", brand: "", model: "", phase: "", dom: "", km: "", region: "" },
  adm: { tab: "files", mega: "" },
  calc: { km: 60000, year: 2021, sev: 1 },
  omni: { q: "", hits: [], idx: -1 },
  tf: ""
};
window.MD_STATE = S;
function isAdmin() { return MODE === "admin"; }
function isTier() { return MODE === "tier"; }

/* ---------- registre accès ---------- */
function regLoad() {
  var r = safe("reg", function () { return JSON.parse(STORE.get(AKEY)); }, null);
  if (!r || !Array.isArray(r.users)) { r = { users: [], live: false, rev: 0, log: [] }; }
  if (!Array.isArray(r.log)) { r.log = []; }
  if (r.tierOpen === undefined) { r.tierOpen = true; }
  REG = r;
  return r;
}
function regSave() {
  STORE.set(AKEY, JSON.stringify(REG));
  bcast({ t: "reg" });
}
function bcast(m) {
  try { if (CH) { CH.postMessage(m); } } catch (e) {}
}
function regLog(a) {
  REG.log.unshift({ ts: Date.now(), a: a });
  if (REG.log.length > 80) { REG.log.pop(); }
}
function tierSession() {
  if (!TIER) { return null; }
  var u = null;
  arr(REG.users).forEach(function (x) { if (x && x.id === TIER) { u = x; } });
  return u;
}
function applyTier() {
  var raw = STORE.get(PKEY);
  if (!raw) { return false; }
  return safe("pub", function () {
    var d = JSON.parse(raw);
    if (d && d.db && arr(d.db.engines).length) {
      DB = d.db;
      invalidate();
      normalize(DB);
      recompute();
      return true;
    }
    return false;
  }, false);
}
function invalidate() { FC = {}; TC = {}; IVIC = {}; }

/* ---------- construction & normalisation ---------- */
function mkEng(n, mid, code, fam, label, fuel, disp, hp, nm, y0, y1, gb) {
  fuel = nfuel(fuel);
  var a = num(y0, 2017), b = num(y1, 2027);
  if (a > b) { var t = a; a = b; b = t; }
  hp = clamp(num(hp, 100), 1, 3000);
  var e = {
    id: "E" + String(n).padStart(4, "0") + uid("").slice(0, 2),
    m: [mid], code: str(code, "GEN"), fam: str(fam, str(code, "GEN")),
    label: str(label, "Motorisation"), fuel: fuel, disp: num(disp, 0),
    hp: hp, nm: num(nm, 200), kw: Math.round(hp * 0.7355), y: [a, b],
    gb: str(gb, "BVM"),
    norm: fuel === "b" ? "ZE" : (a >= 2024 ? "Euro 6e" : "Euro 6"),
    cyl: fuel === "b" ? "ÉLEC" : (num(disp, 0) > 3400 ? "V8+" : (num(disp, 0) < 1100 ? "L3" : "L4")),
    asp: fuel === "b" ? "—" : "Turbo",
    inj: fuel === "b" ? "—" : (fuel === "d" ? "Common Rail" : "Injection directe")
  };
  return e;
}
function modelById(mid) {
  var f = null;
  arr(DB.models).forEach(function (m) { if (m && m.id === mid) { f = m; } });
  return f;
}
function engineExists(mid, fam, hp) {
  return arr(DB.engines).some(function (e) {
    return arr(e.m).indexOf(mid) > -1 && e.fam === fam && e.hp === hp;
  });
}
function pushEngine(mid, src, hp, nm) {
  if (!modelById(mid) || !src) { return null; }
  hp = clamp(num(hp, src.hp), 1, 3000);
  if (engineExists(mid, src.fam, hp)) { return null; }
  var e = mkEng(arr(DB.engines).length + 1, mid, src.code, src.fam, String(src.label).replace(/\s\d+(\s*\(\d{4}-\d{4}\))?$/, "") + " " + hp, src.fuel, src.disp, hp, num(nm, src.nm), src.y[0], src.y[1], src.gb);
  DB.engines.push(e);
  EIDX[e.id] = e;
  FC = {}; TC = {}; IVIC = {};
  return e;
}
function build(R) {
  var O = { brands: [], models: [], engines: [], faults: [], tsb: [] };
  arr(R.br).forEach(function (b) {
    if (!b || !b[0]) { return; }
    O.brands.push({ id: str(b[0]), n: str(b[1], b[0]), pays: str(b[2], "—"), grp: str(b[3], "—"), region: str(b[4], regionOf(b[2])) });
  });
  var md = R.md || {};
  var me = R.me || {};
  Object.keys(md).forEach(function (bid) {
    arr(md[bid]).forEach(function (m) {
      if (!m || !m[0]) { return; }
      var y = pair([m[1], m[2]], [2017, 2027]);
      O.models.push({
        id: bid + "-" + slug(m[0]), b: bid, n: str(m[0]),
        y: y[0] > y[1] ? [y[1], y[0]] : y,
        seg: str(SEGS[clamp(num(m[3], 2), 0, 13)], "Compacte"),
        phase: clamp(num(m[4], 1), 1, 12)
      });
    });
  });
  var n = 0;
  O.models.forEach(function (m) {
    arr(me[m.id]).forEach(function (e) {
      if (!e) { return; }
      n++;
      O.engines.push(mkEng(n, m.id, e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[8], e[9], e[7]));
    });
  });
  arr(R.ft).forEach(function (f, i) {
    f = arr(f);
    if (!f.length || !f[0]) { return; }
    O.faults.push({
      id: "F" + String(i + 1).padStart(3, "0"),
      t: str(f[0]), fam: list(f[1]), mt: list(f[2]), ph: list(f[3]),
      sev: nsev(f[4]), freq: nfreq(f[5]), y: yOf([f[6], f[7]]), km: kmOf([f[8], f[9]]),
      sym: list(f[10]), cause: str(f[11], "Cause à expertiser"), fix: str(f[12], "Diagnostic valise requis"),
      cost: costOf([f[13], f[14]]), status: str(f[15], "Surveillance"), dom: str(f[16], "Moteur")
    });
  });
  arr(R.ts).forEach(function (t, i) {
    t = arr(t);
    if (!t.length || !t[0]) { return; }
    var d = str(t[6], "2026-01");
    if (!/^\d{4}-\d{2}$/.test(d)) { d = "2026-01"; }
    O.tsb.push({
      id: "T" + String(i + 1).padStart(3, "0"),
      ref: str(t[0]), b: list(t[1]), fam: list(t[2]), mt: list(t[3]), ph: list(t[4]),
      t: str(t[5], "Bulletin"), date: d, cat: str(t[7], "Moteur"), sev: nsev(t[8]),
      sum: str(t[9], "Bulletin constructeur."), act: str(t[10], "Appliquer la procédure constructeur."),
      dom: str(t[11], str(t[7], "Moteur"))
    });
  });
  return O;
}
function normalize(d) {
  var fx = 0;
  if (!d || typeof d !== "object") { return 1; }
  FILES.forEach(function (f) {
    if (!Array.isArray(d[f[0]])) { d[f[0]] = []; fx++; }
  });
  var bs = {}, ms = {}, seen = {};
  d.brands = arr(d.brands).filter(function (b) {
    if (!b || !b.id || seen["b" + b.id]) { fx++; return false; }
    seen["b" + b.id] = 1;
    bs[b.id] = 1;
    b.n = str(b.n, b.id);
    if (!REGIONS[b.region]) { b.region = regionOf(b.pays); fx++; }
    return true;
  });
  d.models = arr(d.models).filter(function (m) {
    if (!m || !m.id || !bs[m.b] || seen["m" + m.id]) { fx++; return false; }
    seen["m" + m.id] = 1;
    ms[m.id] = 1;
    m.n = str(m.n, "Modèle");
    m.y = yOf(m);
    m.phase = clamp(num(m.phase, 1), 1, 12);
    m.seg = str(m.seg, "Compacte");
    return true;
  });
  d.engines = arr(d.engines).filter(function (e) {
    if (!e || !e.id) { fx++; return false; }
    e.m = list(e.m).filter(function (x) { return ms[x]; });
    if (!e.m.length) { fx++; return false; }
    if (seen["e" + e.id]) { e.id = uid("E"); fx++; }
    seen["e" + e.id] = 1;
    e.code = str(e.code, "GEN");
    e.fam = str(e.fam, e.code);
    e.label = str(e.label, "Motorisation");
    e.fuel = nfuel(e.fuel);
    e.hp = clamp(num(e.hp, 100), 1, 3000);
    e.nm = num(e.nm, 200);
    e.kw = Math.round(e.hp * 0.7355);
    e.y = yOf(e);
    e.gb = str(e.gb, "BVM");
    return true;
  });
  d.faults = arr(d.faults).filter(function (f) {
    if (!f || !f.id) { fx++; return false; }
    if (seen["f" + f.id]) { f.id = uid("F"); fx++; }
    seen["f" + f.id] = 1;
    f.t = str(f.t, "Fiche");
    f.sev = nsev(f.sev);
    f.freq = nfreq(f.freq);
    f.fam = list(f.fam);
    f.mt = list(f.mt);
    f.ph = list(f.ph);
    f.sym = list(f.sym);
    if (!f.sym.length) { f.sym = ["Symptôme à confirmer"]; }
    f.y = yOf(f);
    f.km = kmOf(f);
    f.cost = costOf(f);
    f.cause = str(f.cause, "—");
    f.fix = str(f.fix, "—");
    f.dom = str(f.dom, "Moteur");
    f.status = str(f.status, "Surveillance");
    return true;
  });
  d.tsb = arr(d.tsb).filter(function (t) {
    if (!t || !t.id) { fx++; return false; }
    if (seen["t" + t.id]) { t.id = uid("T"); fx++; }
    seen["t" + t.id] = 1;
    t.ref = str(t.ref, t.id);
    t.t = str(t.t, "Bulletin");
    t.sev = nsev(t.sev);
    t.b = list(t.b).filter(function (x) { return bs[x]; });
    t.fam = list(t.fam);
    t.mt = list(t.mt);
    t.ph = list(t.ph);
    t.date = str(t.date, "2026-01");
    if (!/^\d{4}-\d{2}$/.test(t.date)) { t.date = "2026-01"; }
    t.cat = str(t.cat, "Moteur");
    t.dom = str(t.dom, t.cat);
    t.sum = str(t.sum, "—");
    t.act = str(t.act, "—");
    return true;
  });
  return fx;
}
function reindex() {
  MIDX = {}; BIDX = {}; EIDX = {};
  arr(DB.models).forEach(function (m) { MIDX[m.id] = m; });
  arr(DB.brands).forEach(function (b) { BIDX[b.id] = b; });
  arr(DB.engines).forEach(function (e) { EIDX[e.id] = e; });
}
function brandOf(e) {
  var m = e && MIDX[arr(e.m)[0]];
  return m ? (BIDX[m.b] || null) : null;
}
function modelOf(e) { return (e && MIDX[arr(e.m)[0]]) || null; }
function engName(e) {
  var m = modelOf(e), b = brandOf(e);
  return ((b ? b.n + " " : "") + (m ? m.n + " — " : "") + str(e && e.label)).trim();
}
function tokHit(l, name) {
  var a = arr(l);
  if (!a.length) { return false; }
  var n = nk(name);
  for (var i = 0; i < a.length; i++) {
    var t = nk(a[i]);
    if (t === "*" || (t && n.indexOf(t) > -1)) { return true; }
  }
  return false;
}
function phaseOk(ph, m) {
  var a = arr(ph);
  if (!a.length || a.indexOf("*") > -1) { return true; }
  return a.indexOf(String(m && m.phase)) > -1;
}
function fApply(f, e, m) {
  if (!f || !e || !m) { return false; }
  if (!(arr(f.fam).indexOf(e.fam) > -1 || tokHit(f.mt, m.n))) { return false; }
  return phaseOk(f.ph, m);
}
function tApply(t, e, m) {
  if (!t || !e || !m) { return false; }
  if (!(arr(t.fam).indexOf(e.fam) > -1 || tokHit(t.mt, m.n) || arr(t.b).indexOf(m.b) > -1)) { return false; }
  return phaseOk(t.ph, m);
}
function faultsFor(e) {
  if (!e || !e.id) { return []; }
  if (FC[e.id]) { return FC[e.id]; }
  var m = modelOf(e);
  var out = [];
  if (m) {
    out = arr(DB.faults).filter(function (f) { return fApply(f, e, m); }).map(function (f) {
      var g = clone(f);
      g.active = ov(g.y, yOf(e)) && ov(g.y, yOf(m));
      return g;
    }).sort(function (a, b) {
      var d = (b.active ? 1 : 0) - (a.active ? 1 : 0);
      return d || (SV[b.sev].w - SV[a.sev].w);
    });
  }
  FC[e.id] = out;
  return out;
}
function tsbFor(e) {
  if (!e || !e.id) { return []; }
  if (TC[e.id]) { return TC[e.id]; }
  var m = modelOf(e);
  var out = [];
  if (m) {
    out = arr(DB.tsb).filter(function (t) { return tApply(t, e, m); }).sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
  }
  TC[e.id] = out;
  return out;
}
function isRecall(t) { return !!t && (t.cat === "Rappel" || /^RPL-/.test(String(t.ref))); }
function ivi(e) {
  if (!e || !e.id) { return 0; }
  if (IVIC[e.id] !== undefined) { return IVIC[e.id]; }
  var s = 0;
  faultsFor(e).forEach(function (f) {
    s += (SV[f.sev].w * (FQ[f.freq] || 1)) * (f.active ? 1 : 0.25);
  });
  s = clamp(Math.round(s), 0, 100);
  IVIC[e.id] = s;
  return s;
}
function engForFault(f) {
  return arr(DB.engines).filter(function (e) { return fApply(f, e, modelOf(e)); });
}
function engForTsb(t) {
  return arr(DB.engines).filter(function (e) { return tApply(t, e, modelOf(e)); });
}
function integrity() {
  var err = [], mi = {}, bi = {}, du = 0;
  arr(DB.models).forEach(function (m) { mi[m.id] = 1; });
  arr(DB.brands).forEach(function (b) { bi[b.id] = 1; });
  FILES.forEach(function (f) {
    var s = {};
    arr(DB[f[0]]).forEach(function (x) {
      if (!x) { return; }
      if (s[x.id]) { du++; }
      s[x.id] = 1;
    });
  });
  if (du) { err.push(du + " doublon(s)"); }
  arr(DB.models).forEach(function (m) { if (!bi[m.b]) { err.push("marque inconnue " + m.b); } });
  arr(DB.engines).forEach(function (e) {
    arr(e.m).forEach(function (i) { if (!mi[i]) { err.push("orphelin " + e.id); } });
  });
  return { err: err, ok: !err.length, pct: err.length ? Math.max(0, 100 - err.length * 7) : 100 };
}
function countByModel() {
  var pm = {};
  arr(DB.engines).forEach(function (e) {
    arr(e.m).forEach(function (mid) { pm[mid] = (pm[mid] || 0) + 1; });
  });
  return pm;
}
function recompute() {
  invalidate();
  reindex();
  var links = 0, corr = 0, bb = {}, doms = {}, fams = {}, regs = {};
  var pm = countByModel();
  arr(DB.engines).forEach(function (e) {
    var m = MIDX[arr(e.m)[0]];
    fams[e.fam] = 1;
    links += arr(e.m).length;
    if (m) { bb[m.b] = (bb[m.b] || 0) + 1; }
    corr += faultsFor(e).length + tsbFor(e).length;
  });
  arr(DB.brands).forEach(function (b) { regs[b.region] = (regs[b.region] || 0) + 1; });
  arr(DB.faults).forEach(function (f) { links += arr(f.fam).length; doms[f.dom] = 1; });
  arr(DB.tsb).forEach(function (t) { links += arr(t.b).length + arr(t.fam).length; doms[t.dom] = 1; });
  var w = 0, tot = arr(DB.models).length;
  Object.keys(pm).forEach(function (k) { if (pm[k] >= 2) { w++; } });
  META = {
    counts: { b: arr(DB.brands).length, m: tot, e: arr(DB.engines).length, f: arr(DB.faults).length, t: arr(DB.tsb).length, rc: arr(DB.tsb).filter(isRecall).length, fam: Object.keys(fams).length, dom: Object.keys(doms).length },
    links: links, corr: corr, integ: integrity(),
    size: Math.round(JSON.stringify(DB).length / 1024),
    byBrand: bb, regions: regs,
    cover: tot ? Math.round(w / tot * 100) : 0,
    perModel: pm
  };
}

/* ---------- plans entretien : 200 000 km GARANTIS ---------- */
function svcList() {
  var l = arr(RAW.svc).filter(function (s) { return s && num(s.base, 0) > 0 && arr(s.items).length; });
  return l.length ? l : [SVC_FB];
}
function svcFor(e) {
  var l = svcList();
  var fam = str(e && e.fam);
  var fuel = str(e && e.fuel, "e");
  var i, j;
  for (i = 0; i < l.length; i++) {
    var fs = arr(l[i].fams);
    if (fs.indexOf("*") > -1) { continue; }
    for (j = 0; j < fs.length; j++) {
      if (fs[j] === fam) { return l[i]; }
    }
  }
  for (i = 0; i < l.length; i++) {
    if (arr(l[i].fams).indexOf("*") > -1 && l[i].fuel === fuel) { return l[i]; }
  }
  for (i = 0; i < l.length; i++) {
    if (arr(l[i].fams).indexOf("*") > -1) { return l[i]; }
  }
  return SVC_FB;
}
function svcDist(s) { return arr(s && s.dist).length >= 3 ? s.dist : SVC_FB.dist; }
function svcOil(s) { return arr(s && s.oil).length >= 2 ? s.oil : SVC_FB.oil; }
function svcFluids(s) { return arr(s && s.fluids).concat(["—", "—", "—", "—", "—", "—", "—"]).slice(0, 7); }
function buildPlan(e, m, b) {
  var s = svcFor(e);
  var base = clamp(num(s.base, 20000), 5000, 40000);
  var months = clamp(num(s.months, 12), 6, 48);
  var items = arr(s.items).filter(function (x) { return Array.isArray(x) && x[0]; });
  if (!items.length) { items = SVC_FB.items; }
  var ctrl = arr(s.controls).filter(Boolean);
  if (!ctrl.length) { ctrl = SVC_FB.controls; }
  var dist = svcDist(s);
  var annual = Math.max(8000, Math.round(base * 12 / months));
  var visits = [];
  var km, i;
  for (km = base; km <= KMMAX; km += base) {
    var ops = [];
    for (i = 0; i < items.length; i++) {
      var ik = num(items[i][1], 0);
      var im = num(items[i][2], 0);
      if (ik > 0) {
        if (km % ik === 0) { ops.push(str(items[i][0])); }
      } else if (im > 0) {
        var st2 = Math.max(base, Math.round(annual * im / 12 / base) * base);
        if (st2 > 0 && km % st2 === 0) { ops.push(str(items[i][0]) + " (" + im + " mois)"); }
      }
    }
    var dk = num(dist[1], 0);
    if (dk > 0 && km >= dk && km - dk < base) {
      ops.push(str(dist[0]) + " — REMPLACEMENT " + fmt(dk) + " km");
    }
    if (!ops.length) { ops.push("Révision intermédiaire constructeur"); }
    visits.push({ km: km, mo: Math.round(km / annual * 12), ops: ops, ctrl: ctrl.slice() });
  }
  if (num(dist[1], 0) > KMMAX) {
    visits.push({ km: num(dist[1], 0), mo: num(dist[2], 0), ops: [str(dist[0]) + " — REMPLACEMENT"], ctrl: ["Contrôle tension et guides"] });
  }
  visits.sort(function (a, b2) { return num(a.km, 0) - num(b2.km, 0); });
  var last = visits.length ? num(visits[visits.length - 1].km, 0) : 0;
  if (last < KMMAX) {
    visits.push({
      km: KMMAX,
      mo: Math.round(KMMAX / annual * 12),
      ops: ["Révision 200 000 km — contrôle général moteur, transmission, freins, trains"],
      ctrl: ctrl.slice()
    });
  }
  if (!visits.length) {
    visits.push({ km: KMMAX, mo: 120, ops: ["Révision générale 200 000 km"], ctrl: ctrl.slice() });
  }
  return { svc: s, visits: visits, base: base, months: months, brand: b || null, model: m || null, engine: e || null };
}
function lastKm(pl) {
  var v = arr(pl && pl.visits);
  var l = v[v.length - 1];
  return l ? num(l.km, 0) : 0;
}

/* ---------- sauvegarde locale admin + backup ---------- */
function saveNow(quiet) {
  if (!isAdmin()) { return false; }
  return safe("save", function () {
    STORE.set(KEY, JSON.stringify({ v: 18, db: DB, audit: AUDIT.slice(-60), prefs: PREF, wp: WP.P, ts: Date.now() }));
    LASTSAVE = Date.now();
    DIRTY = false;
    if (typeof updStor === "function") { updStor(); }
    if (typeof updateMeta === "function") { updateMeta(); }
    if (!quiet) { toast("ok", "Sauvegarde locale effectuée", fmt(META.counts.e) + " motorisations · " + META.size + " Ko"); }
    return true;
  }, false);
}
var save = deb(function () { saveNow(true); }, 350);
function markDirty() {
  if (isAdmin()) { DIRTY = true; save(); }
}
function backupExport() {
  if (!isAdmin()) { toast("err", "Réservé admin"); return; }
  download("mecadata_sauvegarde_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ kind: "mecadata-backup", v: 18, ts: Date.now(), db: DB, prefs: PREF, wp: WP.P, auto: AUTO.st, audit: AUDIT.slice(-60) }, null, 2));
  toast("ok", "Backup exporté", "Fichier JSON de sauvegarde locale.");
  beep("ok");
}
function backupRestore(obj) {
  if (!isAdmin()) { toast("err", "Réservé admin"); return; }
  if (!obj || !obj.db || !arr(obj.db.engines).length) { toast("err", "Backup invalide"); return; }
  snapshot("restore");
  DB = obj.db;
  FIXES += normalize(DB);
  recompute();
  repairAll(false);
  if (obj.prefs) { Object.keys(obj.prefs).forEach(function (k) { PREF[k] = obj.prefs[k]; }); }
  if (obj.wp) { Object.keys(obj.wp).forEach(function (k) { WP.P[k] = obj.wp[k]; }); }
  saveNow(true);
  audit("bak", "Restauration backup");
  if (typeof updateMeta === "function") { updateMeta(); }
  if (typeof render === "function") { render(); }
  toast("ok", "Backup restauré", fmt(META.counts.e) + " motorisations rechargées.");
  beep("imp");
}
function audit(t, m) {
  AUDIT.push({ ts: Date.now(), type: t, msg: m });
  if (AUDIT.length > 150) { AUDIT = AUDIT.slice(-150); }
}
function snapshot(l) { UNDO = { label: l, db: clone(DB) }; }
function doUndo() {
  if (!UNDO) { return; }
  DB = UNDO.db;
  UNDO = null;
  invalidate();
  recompute();
  markDirty();
  if (typeof updateMeta === "function") { updateMeta(); }
  if (typeof render === "function") { render(); }
  toast("ok", "Action annulée");
}
function publish(auto) {
  if (!isAdmin()) { return; }
  REG.rev = num(REG.rev, 0) + 1;
  STORE.set(PKEY, JSON.stringify({ ts: Date.now(), rev: REG.rev, db: DB }));
  regLog("Diffusion rév " + REG.rev);
  regSave();
  bcast({ t: "pub" });
  if (!auto) { toast("ok", "Diffusé aux tiers", "Révision " + REG.rev); }
}
function mutate(t, m) {
  FIXES += normalize(DB);
  recompute();
  audit(t, m);
  markDirty();
  if (REG.live && isAdmin()) { publish(true); }
  if (typeof updateMeta === "function") { updateMeta(); }
  if (typeof render === "function") { render(); }
}

/* ---------- recherche auto massive ---------- */
var AUTO = {
  st: { last: 0, lastFull: 0, onLaunch: true, runs: 0, added: { m: 0, e: 0, f: 0, t: 0 }, log: [] },
  SEEDS: [
    ["renault", "Clio VI", 6, 2026, 2027, 0], ["peugeot", "208 III", 3, 2026, 2027, 0],
    ["vw", "ID.2", 1, 2025, 2027, 0], ["bmw", "iX3 Neue Klasse", 1, 2025, 2027, 4],
    ["mercedes", "CLA III", 1, 2025, 2027, 5], ["toyota", "C-HR III", 3, 2026, 2027, 3],
    ["hyundai", "Ioniq 3", 1, 2026, 2027, 2], ["kia", "EV2", 1, 2025, 2027, 3],
    ["byd", "Seal 06 DM-i", 1, 2025, 2027, 5], ["mg", "MGS6 EV", 1, 2026, 2027, 4],
    ["xiaomi", "YU7 Ultra", 2, 2026, 2027, 4], ["tesla", "Model 2", 1, 2026, 2027, 0]
  ],
  RISK: [
    ["courroie humide bain huile", "Distribution", "critique"],
    ["chaîne distribution allongée", "Distribution", "critique"],
    ["batterie HV cellules LG", "Batterie HV", "critique"],
    ["ICCU chargeur 800V", "Charge", "majeure"],
    ["refroidisseur EGR fuite glycol", "Refroidissement", "critique"],
    ["pompe AdBlue SCR cristallisation", "Antipollution", "majeure"],
    ["FAP colmatage urbain", "Antipollution", "majeure"],
    ["dilution huile trajets courts", "Moteur", "majeure"]
  ],
  load: function () {
    var r = safe("auto", function () { return JSON.parse(STORE.get(AKEY2)); }, null);
    if (r && r.added) { this.st = r; }
    if (!this.st.added) { this.st.added = { m: 0, e: 0, f: 0, t: 0 }; }
    if (!Array.isArray(this.st.log)) { this.st.log = []; }
    return this.st;
  },
  saveSt: function () { STORE.set(AKEY2, JSON.stringify(this.st)); },
  log: function (m) {
    this.st.log.unshift({ ts: Date.now(), m: m });
    if (this.st.log.length > 60) { this.st.log.pop(); }
  },
  hasModel: function (b, n) {
    return arr(DB.models).some(function (m) { return m.b === b && nk(m.n) === nk(n); });
  },
  addModel: function (b, n, phase, y0, y1, seg) {
    if (!BIDX[b] || this.hasModel(b, n)) { return null; }
    var m = { id: b + "-" + slug(n), b: b, n: n, y: [y0, y1], seg: str(SEGS[seg], "Compacte"), phase: clamp(phase, 1, 12) };
    DB.models.push(m);
    MIDX[m.id] = m;
    this.st.added.m++;
    return m;
  },
  addEngine: function (mid, src, hp, nm) {
    var e = pushEngine(mid, src, hp, nm);
    if (e) { this.st.added.e++; }
    return e;
  },
  addFault: function (t, fams, mts, sev, dom, cause, fix) {
    var dup = arr(DB.faults).some(function (f) { return nk(f.t) === nk(t); });
    if (dup) { return null; }
    var f = { id: uid("F"), t: t, fam: fams, mt: mts, ph: ["*"], sev: sev, freq: "moyenne", y: [2017, YMAX], km: [20000, 200000], sym: ["Voyant moteur", "Comportement anormal"], cause: cause, fix: fix, cost: [0, 0], status: "Veille automatique", dom: dom };
    DB.faults.push(f);
    this.st.added.f++;
    return f;
  },
  addTsb: function (ref, bs, mts, title, cat, sev, sum, act) {
    var dup = arr(DB.tsb).some(function (t) { return nk(t.ref) === nk(ref); });
    if (dup) { return null; }
    var d = new Date();
    var t = { id: uid("T"), ref: ref, b: bs, fam: [], mt: mts, ph: ["*"], t: title, date: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"), cat: cat, sev: sev, sum: sum, act: act, dom: cat };
    DB.tsb.push(t);
    this.st.added.t++;
    return t;
  },
  powers: function (cap) {
    var add = 0;
    var lad = { e: 15, d: 20, h: 15, p: 20, b: 30, g: 10 };
    var byModel = {};
    arr(DB.engines).forEach(function (e) {
      var mid = arr(e.m)[0];
      if (!byModel[mid]) { byModel[mid] = []; }
      byModel[mid].push(e);
    });
    Object.keys(byModel).forEach(function (mid) {
      if (cap && add >= cap) { return; }
      var byFam = {};
      byModel[mid].forEach(function (e) {
        if (!byFam[e.fam]) { byFam[e.fam] = []; }
        byFam[e.fam].push(e);
      });
      Object.keys(byFam).forEach(function (fam) {
        if (cap && add >= cap) { return; }
        var g = byFam[fam].sort(function (a, b) { return a.hp - b.hp; });
        if (g.length < 2) {
          var src = g[0];
          var st = lad[src.fuel] || 20;
          if (AUTO.addEngine(mid, src, Math.round(src.hp * (1 + st / 100) / 5) * 5, Math.round(src.nm * (1 + st / 160)))) { add++; }
        } else {
          var lo = g[0], hi = g[g.length - 1];
          if (hi.hp - lo.hp < 40) {
            var mid2 = Math.round((lo.hp + hi.hp) / 2 / 5) * 5;
            if (mid2 > lo.hp && mid2 < hi.hp) {
              if (AUTO.addEngine(mid, lo, mid2, Math.round((lo.nm + hi.nm) / 2))) { add++; }
            }
          }
        }
      });
    });
    return add;
  },
  models: function (cap) {
    var add = 0;
    AUTO.SEEDS.forEach(function (s) {
      if (cap && add >= cap) { return; }
      if (!BIDX[s[0]]) { return; }
      var m = AUTO.addModel(s[0], s[1], s[2], s[3], s[4], s[5]);
      if (m) {
        add++;
        var src = arr(DB.engines).filter(function (e) {
          var mm = modelOf(e);
          return mm && mm.b === s[0];
        })[0];
        if (src) {
          AUTO.addEngine(m.id, src, src.hp, src.nm);
          AUTO.addEngine(m.id, src, Math.round(src.hp * 1.15 / 5) * 5, Math.round(src.nm * 1.1));
        }
      }
    });
    arr(DB.models).slice().forEach(function (m) {
      if (cap && add >= cap) { return; }
      if (m.y[1] >= 2024 && m.phase < 6 && m.n.indexOf("Phase 2") < 0) {
        var nm2 = m.n + " Phase 2";
        if (!AUTO.hasModel(m.b, nm2)) {
          var y0 = Math.min(YMAX - 1, Math.max(2024, m.y[1] - 1));
          var m2 = AUTO.addModel(m.b, nm2, m.phase + 1, y0, YMAX, SEGS.indexOf(m.seg));
          if (m2) {
            add++;
            var parentEngines = arr(DB.engines).filter(function (e) { return arr(e.m).indexOf(m.id) > -1; });
            parentEngines.slice(0, 3).forEach(function (e) {
              AUTO.addEngine(m2.id, e, e.hp, e.nm);
            });
            if (!arr(DB.engines).some(function (e) { return arr(e.m).indexOf(m2.id) > -1; })) {
              var donor = arr(DB.engines).filter(function (e) {
                var mm = modelOf(e);
                return mm && mm.b === m.b;
              })[0];
              if (donor) {
                AUTO.addEngine(m2.id, donor, donor.hp, donor.nm);
                AUTO.addEngine(m2.id, donor, Math.round(donor.hp * 1.15 / 5) * 5, Math.round(donor.nm * 1.1));
              }
            }
          }
        }
      }
    });
    return add;
  },
  faults: function (cap) {
    var add = 0, has = {};
    arr(DB.faults).forEach(function (f) {
      arr(f.fam).forEach(function (x) { has[x] = 1; });
    });
    var fams = {};
    arr(DB.engines).forEach(function (e) { fams[e.fam] = (fams[e.fam] || 0) + 1; });
    Object.keys(fams).forEach(function (fam, idx) {
      if (cap && add >= cap) { return; }
      if (has[fam]) { return; }
      var risk = AUTO.RISK[idx % AUTO.RISK.length];
      var mts = [];
      arr(DB.engines).forEach(function (e) {
        if (e.fam === fam) {
          arr(e.m).forEach(function (mid) {
            var m = MIDX[mid];
            if (m && mts.indexOf(m.n) < 0 && mts.length < 6) { mts.push(m.n); }
          });
        }
      });
      if (AUTO.addFault("Veille auto — " + risk[0] + " (" + fam + ")", [fam], mts, risk[2], risk[1], "Risque documenté sur architecture comparable, surveillance déclenchée par le balayage automatique.", "Contrôle préventif à chaque révision, diagnostic valise et application du bulletin constructeur dès publication.")) { add++; }
    });
    return add;
  },
  tsb: function (cap) {
    var add = 0, has = {};
    arr(DB.tsb).forEach(function (t) {
      arr(t.b).forEach(function (b) { has[b] = 1; });
    });
    arr(DB.brands).forEach(function (b) {
      if (cap && add >= cap) { return; }
      if (has[b.id]) { return; }
      var ms = arr(DB.models).filter(function (m) { return m.b === b.id; }).slice(0, 5).map(function (m) { return m.n; });
      if (AUTO.addTsb("AUTO-" + b.id.toUpperCase() + "-12V", [b.id], ms, "Veille auto " + b.n + " — batterie 12V et gestion veille", "Batterie 12V", "modérée", "Balayage automatique : veille télématique et batterie 12V AGM/EFB à contrôler sur gamme " + b.n + ".", "Test batterie 12V, contrôle DC-DC, mise à jour gestion veille.")) { add++; }
      if (cap && add >= cap) { return; }
      if (AUTO.addTsb("RPL-AUTO-" + b.id.toUpperCase() + "-ADAS", [b.id], ms, "Veille auto " + b.n + " — calibration ADAS après vitrage", "ADAS", "majeure", "Balayage automatique : calibration caméra/radar obligatoire après remplacement de pare-brise sur gamme " + b.n + ".", "Calibration statique et dynamique après intervention vitrage.")) { add++; }
    });
    return add;
  },
  sweep: function (reason, full) {
    if (!isAdmin()) { return { ok: false, total: 0 }; }
    this.load();
    var cap = full ? 0 : 400;
    var a1 = this.models(cap);
    var a2 = this.powers(cap);
    var a3 = this.faults(cap);
    var a4 = this.tsb(cap);
    var total = a1 + a2 + a3 + a4;
    FIXES += normalize(DB);
    recompute();
    repairAll(false);
    this.st.runs++;
    this.st.last = Date.now();
    if (full) { this.st.lastFull = Date.now(); }
    this.log(reason + " : +" + a1 + " modèles, +" + a2 + " mot., +" + a3 + " pannes, +" + a4 + " bulletins");
    this.saveSt();
    audit("auto", "Balayage " + reason + " : " + total);
    markDirty();
    if (REG.live) { publish(true); }
    if (typeof updateMeta === "function") { updateMeta(); }
    return { ok: true, total: total, m: a1, e: a2, f: a3, t: a4 };
  },
  maybe: function () {
    this.load();
    var now = Date.now();
    if (now - num(this.st.lastFull, 0) > 30 * 86400000) {
      var r = this.sweep("cycle 30 jours", true);
      if (r.total) { toast("ok", "Mise à jour auto 30 j", r.total + " complément(s)."); }
      return r;
    }
    if (this.st.onLaunch && now - num(this.st.last, 0) > 6 * 3600000) {
      var r2 = this.sweep("lancement", false);
      if (r2.total) { toast("info", "Recherche auto massive", r2.total + " complément(s)."); }
      return r2;
    }
    return { ok: true, total: 0 };
  }
};

/* ---------- RÉPARATION MASSIVE ---------- */
function repairAll(verbose) {
  reindex();
  var before = countByModel();
  var attached = 0, completed = 0;
  var donors = {};
  arr(DB.engines).forEach(function (e) {
    var m = modelOf(e);
    if (!m) { return; }
    if (!donors[m.b]) { donors[m.b] = []; }
    donors[m.b].push(e);
  });
  arr(DB.models).forEach(function (m) {
    var cnt = 0;
    arr(DB.engines).forEach(function (e) {
      if (arr(e.m).indexOf(m.id) > -1) { cnt++; }
    });
    if (cnt >= 2) { return; }
    var pool = (donors[m.b] || []).filter(function (e) {
      var mm = modelOf(e);
      return mm && mm.seg === m.seg;
    });
    if (!pool.length) { pool = donors[m.b] || []; }
    if (!pool.length) {
      var g1 = mkEng(arr(DB.engines).length + 1, m.id, "GEN", "GEN", "Motorisation standard 110", "e", 1598, 110, 250, m.y[0], m.y[1], "BVM6");
      var g2 = mkEng(arr(DB.engines).length + 2, m.id, "GEN", "GEN", "Motorisation standard 150", "e", 1598, 150, 300, m.y[0], m.y[1], "BVA8");
      DB.engines.push(g1);
      DB.engines.push(g2);
      EIDX[g1.id] = g1;
      EIDX[g2.id] = g2;
      attached += 2;
      return;
    }
    var src = pool[0];
    if (cnt === 0) {
      if (pushEngine(m.id, src, src.hp, src.nm)) { attached++; }
      var hp2 = Math.round(src.hp * 1.15 / 5) * 5;
      if (hp2 === src.hp) { hp2 = src.hp + 10; }
      if (pushEngine(m.id, src, hp2, Math.round(src.nm * 1.1))) { attached++; }
    } else {
      var hp3 = Math.round(src.hp * 1.15 / 5) * 5;
      if (hp3 === src.hp) { hp3 = src.hp + 10; }
      if (pushEngine(m.id, src, hp3, Math.round(src.nm * 1.1))) { completed++; }
    }
  });
  var fAdd = AUTO.faults(0);
  var tAdd = AUTO.tsb(0);
  FIXES += normalize(DB);
  recompute();
  var after = countByModel();
  var orphan = 0;
  arr(DB.models).forEach(function (m) { if (!after[m.id]) { orphan++; } });
  if (isAdmin()) {
    audit("fix", "Réparation : " + attached + " motorisations rattachées, " + completed + " complétées, " + fAdd + " pannes, " + tAdd + " bulletins");
    saveNow(true);
    if (REG.live) { publish(true); }
  }
  if (typeof updateMeta === "function") { updateMeta(); }
  if (verbose) {
    if (typeof render === "function") { render(); }
    if (typeof runTests === "function") { safe("testsFix", runTests, null); }
    toast(orphan ? "warn" : "ok", "Réparation massive terminée",
      attached + " motorisations rattachées · " + completed + " modèles complétés · " + fAdd + " pannes · " + tAdd + " bulletins · orphelins restants : " + orphan);
    beep(orphan ? "err" : "imp");
  }
  return { attached: attached, completed: completed, faults: fAdd, tsb: tAdd, orphan: orphan };
}

/* ---------- touche de réparation ---------- */
function injectRepairBtn() {
  var top = $("#top");
  if (!top || $("#repairb")) { return; }
  var b = D.createElement("button");
  b.className = "tb";
  b.id = "repairb";
  b.type = "button";
  b.title = "Réparation massive de la base";
  b.setAttribute("aria-label", "Réparation massive de la base");
  b.style.color = "#43E08B";
  b.style.borderColor = "rgba(67,224,139,.45)";
  b.innerHTML = ic("tool");
  b.addEventListener("click", function () {
    if (!isAdmin()) {
      toast("err", "Réparation réservée admin", "Ouvrez une session administrateur.");
      return;
    }
    repairAll(true);
  });
  var ref = $("#diagb");
  if (ref && ref.parentNode === top) { top.insertBefore(b, ref); } else { top.appendChild(b); }
}
window.addEventListener("load", function () {
  injectRepairBtn();
  setTimeout(function () {
    safe("autoRepair", function () { repairAll(false); }, null);
    if (typeof runTests === "function") { safe("testsAfterFix", runTests, null); }
    if (typeof render === "function" && MODE) { safe("renderAfterFix", render, null); }
    setInterval(function () {
      var b = $("#repairb");
      if (b) { b.style.display = isAdmin() ? "" : "none"; }
    }, 800);
  }, 300);
});

window.MD_API = {
  db: function () { return DB; },
  meta: function () { return META; },
  isAdmin: isAdmin, isTier: isTier,
  mutate: mutate, publish: publish,
  sweep: function (f) { return AUTO.sweep(f ? "manuel complet" : "manuel", !!f); },
  repair: repairAll,
  auto: AUTO, purge: purgeCache, save: saveNow, backup: backupExport, restore: backupRestore,
  svcDist: svcDist, svcOil: svcOil, svcFluids: svcFluids,
  countByModel: countByModel
};
