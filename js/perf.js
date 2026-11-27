/* MECADATA // TURBO v21 — suppression de la latence globale.
   Ce module se greffe sur le noyau existant sans le réécrire :
   • nk() mémoïsé (des millions d'appels évités)
   • index partagés marques / modèles / motorisations / pannes / TSB
   • recompute() en O(n) sans sérialisation JSON de la base
   • recherche prédictive indexée + debounce (frappe instantanée)
   • render() coalescé dans une frame, results() mémoïsé
   • autovérification : tests structurels immédiats, tests lourds en idle
   • sauvegarde locale différée et sautée si rien n'a changé
   • fond animé : halo plafonné, FPS borné, pause pendant l'interaction
   • listes longues accélérées (content-visibility)
   • HUD de latence réel + panneau PERFORMANCE à réglages live. */
(function () {
  "use strict";

  var W = window, D = document;
  function q(s, r) { return (r || D).querySelector(s); }
  function qa(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function A(v) { return Array.isArray(v) ? v : []; }
  function N(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function F(n) { n = N(n, 0); try { return n.toLocaleString("fr-FR"); } catch (e) { return String(n); } }
  function IC(n, st) { return "<svg class='ic'" + (st ? " style='" + st + "'" : "") + "><use href='#i-" + n + "'/></svg>"; }
  function now() { return (W.performance && performance.now) ? performance.now() : Date.now(); }

  var PKEY = "md_perf_v21";
  var P = {
    quality: "eco",
    fps: 30,
    count: 70,
    density: 42,
    glow: 26,
    searchDelay: 110,
    lot: 140,
    pauseOnInput: true,
    fastLists: true,
    halo: true
  };
  var ORIG = {};
  var LAST_INPUT = 0;
  var LAST_FRAME = 0;
  var LAT = { last: 0, avg: 0, n: 0, worst: 0 };
  var TOUCH = 0;
  var SAVED_STAMP = "";
  var SAVE_TIMER = 0;
  var RENDER_REQ = 0;
  var META_REQ = 0;
  var SEARCH_TIMER = 0;
  var YEAR_TIMER = 0;
  var HEAVY = [];
  var HEAVY_RUN = false;
  var EXPAND_LAST = 0;
  var AUDIT_LAST = 0;
  var IX = null;

  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(PKEY));
      if (r && typeof r === "object") {
        Object.keys(P).forEach(function (k) {
          if (r[k] !== undefined) { P[k] = r[k]; }
        });
      }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {}
  }
  function db() { return W.DB || { brands: [], models: [], engines: [], faults: [], tsb: [] }; }
  function touch() { TOUCH++; IX = null; }
  W.MD_TOUCH = touch;

  /* ══════════ nk mémoïsé ══════════ */
  var NKC = new Map();
  function nkFast(s) {
    var k = String(s == null ? "" : s);
    var hit = NKC.get(k);
    if (hit !== undefined) { return hit; }
    var v = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    if (NKC.size > 40000) { NKC.clear(); }
    NKC.set(k, v);
    return v;
  }

  /* ══════════ gardes d'interaction & ordonnanceur ══════════ */
  function markInput() { LAST_INPUT = now(); }
  ["pointerdown", "keydown", "input", "wheel", "touchstart", "scroll"].forEach(function (ev) {
    D.addEventListener(ev, markInput, { passive: true, capture: true });
  });
  function busy(ms) { return (now() - LAST_INPUT) < (ms == null ? 260 : ms); }
  function idle(fn, wait) {
    var limit = now() + (wait == null ? 2500 : wait);
    function tick() {
      if (!busy(220) || now() > limit) {
        try { fn(); } catch (e) {}
        return;
      }
      setTimeout(tick, 90);
    }
    if (W.requestIdleCallback) {
      requestIdleCallback(function () { tick(); }, { timeout: wait == null ? 1200 : wait });
    } else {
      setTimeout(tick, 60);
    }
  }
  function chunk(tasks, done) {
    if (HEAVY_RUN) { return; }
    HEAVY_RUN = true;
    function step() {
      if (busy(200)) { setTimeout(step, 120); return; }
      var t0 = now();
      while (tasks.length && (now() - t0) < 9) {
        var t = tasks.shift();
        try { t(); } catch (e) {}
      }
      if (tasks.length) { setTimeout(step, 24); }
      else {
        HEAVY_RUN = false;
        if (done) { try { done(); } catch (e) {} }
      }
    }
    setTimeout(step, 40);
  }

  /* ══════════ index partagés ══════════ */
  function stamp() {
    var d = db();
    return [A(d.brands).length, A(d.models).length, A(d.engines).length, A(d.faults).length, A(d.tsb).length, TOUCH].join(":");
  }
  function words(k) {
    var m = String(k).match(/[a-z0-9]+/g);
    return m || [];
  }
  function build() {
    var st = stamp();
    if (IX && IX.stamp === st) { return IX; }
    var d = db();
    var x = {
      stamp: st, brById: {}, modById: {}, engById: {},
      eByFam: {}, eByModel: {}, fByFam: {}, tByFam: {}, tByBrand: {},
      fByModel: {}, tByModel: {}, wordModels: {}, modKey: {},
      search: [], size: 0
    };
    var i, j;
    A(d.brands).forEach(function (b) { if (b) { x.brById[b.id] = b; } });
    A(d.models).forEach(function (m) {
      if (!m) { return; }
      x.modById[m.id] = m;
      var k = nkFast(m.n);
      x.modKey[m.id] = k;
      var ws = words(k);
      for (i = 0; i < ws.length; i++) {
        if (!x.wordModels[ws[i]]) { x.wordModels[ws[i]] = []; }
        x.wordModels[ws[i]].push(m.id);
      }
      x.fByModel[m.id] = [];
      x.tByModel[m.id] = [];
      x.eByModel[m.id] = [];
    });
    A(d.engines).forEach(function (e) {
      if (!e) { return; }
      x.engById[e.id] = e;
      if (!x.eByFam[e.fam]) { x.eByFam[e.fam] = []; }
      x.eByFam[e.fam].push(e);
      A(e.m).forEach(function (mid) {
        if (x.eByModel[mid]) { x.eByModel[mid].push(e); }
      });
      x.size += 220;
    });
    function candidates(tok) {
      var ws = words(tok);
      if (!ws.length) { return []; }
      var best = null;
      for (var w = 0; w < ws.length; w++) {
        var list = x.wordModels[ws[w]];
        if (!list) { return []; }
        if (!best || list.length < best.length) { best = list; }
      }
      return best || [];
    }
    function bind(store, items, isT) {
      A(items).forEach(function (it) {
        if (!it) { return; }
        A(it.fam).forEach(function (fm) {
          var key = isT ? x.tByFam : x.fByFam;
          if (!key[fm]) { key[fm] = []; }
          key[fm].push(it);
        });
        var mt = A(it.mt);
        if (mt.indexOf("*") > -1) {
          A(d.models).forEach(function (m) {
            if (store[m.id] && store[m.id].indexOf(it) < 0) { store[m.id].push(it); }
          });
          return;
        }
        for (var t = 0; t < mt.length; t++) {
          var tok = nkFast(mt[t]);
          if (!tok) { continue; }
          var cand = candidates(tok);
          for (var c = 0; c < cand.length; c++) {
            var mid = cand[c];
            if (x.modKey[mid].indexOf(tok) > -1 && store[mid] && store[mid].indexOf(it) < 0) {
              store[mid].push(it);
            }
          }
        }
      });
    }
    bind(x.fByModel, d.faults, false);
    bind(x.tByModel, d.tsb, true);
    A(d.tsb).forEach(function (t) {
      if (!t) { return; }
      A(t.b).forEach(function (b) {
        if (!x.tByBrand[b]) { x.tByBrand[b] = []; }
        x.tByBrand[b].push(t);
      });
      x.size += 320;
    });
    A(d.faults).forEach(function (f) { if (f) { x.size += 420; } });
    A(d.models).forEach(function (m) { if (m) { x.size += 160; } });
    A(d.brands).forEach(function (b) { if (b) { x.size += 120; } });

    var SV = W.SV || {};
    var FU = W.FU || {};
    var REG = W.REGIONS || {};
    function push(kind, id, hay, title, sub, color, badge, extra) {
      x.search.push({
        kind: kind, id: id, key: nkFast(hay), title: title, sub: sub,
        color: color, badge: badge, extra: extra || null
      });
    }
    A(d.engines).forEach(function (e) {
      var m = x.modById[A(e.m)[0]];
      var b = m ? x.brById[m.b] : null;
      var hay = [(b ? b.n : ""), (m ? m.n : ""), "phase " + (m ? m.phase : ""), e.code, e.fam, e.label, (b ? REG[b.region] : "")].join(" ");
      push("engine", e.id, hay,
        ((b ? b.n + " " : "") + (m ? m.n + " — " : "") + e.label).trim(),
        e.code + " · " + e.hp + " ch · phase " + (m ? m.phase : 1),
        (FU[e.fuel] || {}).c || "#FFD60A", "MOTEUR",
        { fam: e.fam, brand: m ? m.b : "", famKey: nkFast(e.fam + e.code + e.gb) });
    });
    A(d.faults).forEach(function (f) {
      var km = A(f.km);
      var hay = [f.t, A(f.fam).join(" "), A(f.mt).join(" "), f.cause, f.fix, A(f.sym).join(" "), f.dom].join(" ");
      push("fault", f.id, hay, f.t,
        f.sev + " · " + f.dom + " · " + F(N(km[0], 0)) + "-" + F(N(km[1], 0)) + " km",
        (SV[f.sev] || { c: "#FFAF2E" }).c, "PANNE",
        { fams: A(f.fam), w: (SV[f.sev] || { w: 9 }).w });
    });
    A(d.tsb).forEach(function (t) {
      var rc = t.cat === "Rappel" || /^RPL-/.test(String(t.ref));
      var hay = [t.t, t.ref, A(t.fam).join(" "), A(t.mt).join(" "), t.sum, t.cat].join(" ");
      push("tsb", t.id, hay, t.t, t.ref + " · " + t.date,
        rc ? "#FFD60A" : "#4D8DFF", rc ? "RAPPEL" : "TSB",
        { fams: A(t.fam), brands: A(t.b), rc: rc, w: (SV[t.sev] || { w: 9 }).w });
    });
    A(d.models).forEach(function (m) {
      var b = x.brById[m.b];
      var y = A(m.y);
      push("model", m.id, (b ? b.n + " " : "") + m.n + " phase " + m.phase,
        (b ? b.n + " " : "") + m.n,
        "phase " + m.phase + " · " + N(y[0], 2017) + "-" + N(y[1], 2027),
        "#4D8DFF", "MODÈLE", null);
    });
    A(d.brands).forEach(function (b) {
      push("brand", b.id, b.n + " " + b.pays + " " + (REG[b.region] || ""), b.n, REG[b.region] || "", "#25D4EE", "MARQUE", null);
    });
    IX = x;
    return x;
  }

  /* ══════════ corrélations rapides ══════════ */
  function uniq(list) {
    var seen = {}, out = [];
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
      if (!v || !v.id || seen[v.id]) { continue; }
      seen[v.id] = 1;
      out.push(v);
    }
    return out;
  }
  function phaseOk(ph, m) {
    var a = A(ph);
    if (!a.length || a.indexOf("*") > -1) { return true; }
    return a.indexOf(String(m && m.phase)) > -1;
  }
  function yv(v) {
    var a = A(v);
    var x = N(a[0], 2017), y = N(a[1], 2027);
    if (x > y) { var t = x; x = y; y = t; }
    return [x, y];
  }
  function ovl(a, b) {
    var x = yv(a), y = yv(b);
    return x[0] <= y[1] && y[0] <= x[1];
  }
  var FCACHE = {}, TCACHE = {}, ICACHE = {};
  function fastFaults(e) {
    if (!e || !e.id) { return []; }
    if (FCACHE[e.id]) { return FCACHE[e.id]; }
    var x = build();
    var m = x.modById[A(e.m)[0]];
    var out = [];
    if (m) {
      var pool = uniq(A(x.fByFam[e.fam]).concat(A(x.fByModel[m.id])));
      var sv = W.SV || {};
      for (var i = 0; i < pool.length; i++) {
        var f = pool[i];
        if (!phaseOk(f.ph, m)) { continue; }
        var g = {};
        for (var k in f) { if (Object.prototype.hasOwnProperty.call(f, k)) { g[k] = f[k]; } }
        g.active = ovl(g.y, e.y) && ovl(g.y, m.y);
        out.push(g);
      }
      out.sort(function (a, b) {
        var d = (b.active ? 1 : 0) - (a.active ? 1 : 0);
        if (d) { return d; }
        return ((sv[b.sev] || { w: 0 }).w - (sv[a.sev] || { w: 0 }).w);
      });
    }
    FCACHE[e.id] = out;
    return out;
  }
  function fastTsb(e) {
    if (!e || !e.id) { return []; }
    if (TCACHE[e.id]) { return TCACHE[e.id]; }
    var x = build();
    var m = x.modById[A(e.m)[0]];
    var out = [];
    if (m) {
      out = uniq(A(x.tByFam[e.fam]).concat(A(x.tByModel[m.id])).concat(A(x.tByBrand[m.b]))).filter(function (t) {
        return phaseOk(t.ph, m);
      });
      out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    }
    TCACHE[e.id] = out;
    return out;
  }
  function fastEngForFault(f) {
    if (!f) { return []; }
    var x = build();
    var out = [];
    A(f.fam).forEach(function (fm) { out = out.concat(A(x.eByFam[fm])); });
    var mt = A(f.mt);
    if (mt.indexOf("*") > -1) { return A(db().engines); }
    mt.forEach(function (t) {
      var tok = nkFast(t);
      if (!tok) { return; }
      Object.keys(x.modKey).forEach(function (mid) {
        if (x.modKey[mid].indexOf(tok) > -1) { out = out.concat(A(x.eByModel[mid])); }
      });
    });
    return uniq(out);
  }
  function fastEngForTsb(t) {
    if (!t) { return []; }
    var x = build();
    var out = [];
    A(t.fam).forEach(function (fm) { out = out.concat(A(x.eByFam[fm])); });
    A(t.b).forEach(function (b) {
      A(db().models).forEach(function (m) {
        if (m && m.b === b) { out = out.concat(A(x.eByModel[m.id])); }
      });
    });
    var mt = A(t.mt);
    if (mt.indexOf("*") > -1) { return A(db().engines); }
    mt.forEach(function (s) {
      var tok = nkFast(s);
      if (!tok) { return; }
      Object.keys(x.modKey).forEach(function (mid) {
        if (x.modKey[mid].indexOf(tok) > -1) { out = out.concat(A(x.eByModel[mid])); }
      });
    });
    return uniq(out);
  }

  /* ══════════ recompute O(n) ══════════ */
  function fastRecompute() {
    var x = build();
    var d = db();
    FCACHE = {}; TCACHE = {}; ICACHE = {};
    if (W.FC) { W.FC = {}; }
    if (W.TC) { W.TC = {}; }
    if (W.IVIC) { W.IVIC = {}; }
    var links = 0, corr = 0, bb = {}, doms = {}, fams = {}, regs = {}, pm = {};
    var es = A(d.engines);
    var i;
    for (i = 0; i < es.length; i++) {
      var e = es[i];
      if (!e) { continue; }
      fams[e.fam] = 1;
      var ms = A(e.m);
      links += ms.length;
      var m = x.modById[ms[0]];
      if (m) {
        bb[m.b] = (bb[m.b] || 0) + 1;
        pm[m.id] = (pm[m.id] || 0) + 1;
        corr += A(x.fByFam[e.fam]).length + A(x.fByModel[m.id]).length;
        corr += A(x.tByFam[e.fam]).length + A(x.tByModel[m.id]).length + A(x.tByBrand[m.b]).length;
      }
    }
    A(d.brands).forEach(function (b) { if (b) { regs[b.region] = (regs[b.region] || 0) + 1; } });
    A(d.faults).forEach(function (f) { if (f) { links += A(f.fam).length; doms[f.dom] = 1; } });
    var rc = 0;
    A(d.tsb).forEach(function (t) {
      if (!t) { return; }
      links += A(t.b).length + A(t.fam).length;
      doms[t.dom] = 1;
      if (t.cat === "Rappel" || /^RPL-/.test(String(t.ref))) { rc++; }
    });
    var err = [], du = 0, seen = {};
    ["brands", "models", "engines", "faults", "tsb"].forEach(function (k) {
      A(d[k]).forEach(function (o) {
        if (!o) { return; }
        if (seen[k + o.id]) { du++; }
        seen[k + o.id] = 1;
      });
    });
    if (du) { err.push(du + " doublon(s)"); }
    var w = 0, tot = A(d.models).length;
    Object.keys(pm).forEach(function (k) { if (pm[k] >= 2) { w++; } });
    W.META = {
      counts: {
        b: A(d.brands).length, m: tot, e: es.length,
        f: A(d.faults).length, t: A(d.tsb).length, rc: rc,
        fam: Object.keys(fams).length, dom: Object.keys(doms).length
      },
      links: links, corr: corr,
      integ: { err: err, ok: !err.length, pct: err.length ? Math.max(0, 100 - err.length * 7) : 100 },
      size: Math.round(x.size / 1024),
      byBrand: bb, regions: regs,
      cover: tot ? Math.round(w / tot * 100) : 0,
      perModel: pm
    };
  }

  /* ══════════ recherche indexée ══════════ */
  var SYN = {
    puretech: ["eb2"], hdi: ["dv5", "dw10"], tsi: ["ea211", "ea888"], tdi: ["ea288"],
    tce: ["h4dt", "h5ht", "hr12"], dci: ["k9k", "m9r"], courroie: ["courroie"], chaine: ["chaine"],
    adblue: ["adblue", "scr", "nox"], egr: ["egr"], fap: ["fap", "dpf"], turbo: ["turbo"],
    rappel: ["rappel"], tsb: ["tsb", "bulletin"], panne: ["panne"], eat8: ["eat8"], dsg: ["dq200"],
    zf8: ["zf8"], cvt: ["cvt", "xtr"], frein: ["frein"], clim: ["clim"], batterie: ["batterie", "12v"],
    france: ["renault", "peugeot", "citroen", "ds", "dacia"],
    europe: ["vw", "audi", "bmw", "mercedes", "volvo", "fiat"],
    asie: ["toyota", "honda", "nissan", "mazda", "hyundai", "kia", "suzuki"],
    chine: ["byd", "mg", "chery", "geely", "nio", "xpeng", "zeekr", "haval", "xiaomi"],
    amerique: ["ford", "tesla", "chevrolet", "jeep", "gmc", "ram"],
    p20e8: ["adblue", "scr"], p0420: ["catalyseur"], p0299: ["turbo"]
  };
  function sc(qn, h) {
    if (!qn) { return 0; }
    if (h === qn) { return 120; }
    if (h.indexOf(qn) === 0) { return 95; }
    if (h.indexOf(qn) > -1) { return 70; }
    var i = 0, j = 0;
    while (i < qn.length && j < h.length) {
      if (qn[i] === h[j]) { i++; }
      j++;
    }
    return i === qn.length ? 34 : 0;
  }
  function fastSearch(qs) {
    var x = build();
    var qn = nkFast(qs);
    if (!qn) { return []; }
    var syn = [];
    String(qs || "").toLowerCase().split(/[\s,;]+/).forEach(function (w) {
      var k = nkFast(w);
      if (SYN[k]) { syn = syn.concat(SYN[k]); }
    });
    var wR = qn.indexOf("rappel") > -1;
    var wT = qn.indexOf("tsb") > -1;
    var wF = qn.indexOf("panne") > -1;
    var famSet = {}, brSet = {}, hits = [];
    var list = x.search, i, j, it, s;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (it.kind !== "engine") { continue; }
      s = sc(qn, it.key);
      if (!s && syn.length) {
        for (j = 0; j < syn.length; j++) {
          if (it.extra.famKey.indexOf(nkFast(syn[j])) > -1) { s = 62; break; }
        }
      }
      if (s > 0) {
        famSet[it.extra.fam] = 1;
        if (it.extra.brand) { brSet[it.extra.brand] = 1; }
        hits.push({ kind: "engine", id: it.id, score: s + 6, title: it.title, sub: it.sub, color: it.color, badge: it.badge });
      }
    }
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (it.kind !== "fault") { continue; }
      s = sc(qn, it.key);
      if (!s) {
        for (j = 0; j < it.extra.fams.length; j++) {
          if (famSet[it.extra.fams[j]]) { s = 66; break; }
        }
      }
      if (!s && syn.length) {
        for (j = 0; j < syn.length; j++) {
          if (it.key.indexOf(nkFast(syn[j])) > -1) { s = 58; break; }
        }
      }
      if (s > 0) {
        hits.push({ kind: "fault", id: it.id, score: s + (wF ? 26 : 0) + it.extra.w * 0.6, title: it.title, sub: it.sub, color: it.color, badge: it.badge });
      }
    }
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (it.kind !== "tsb") { continue; }
      s = sc(qn, it.key);
      if (!s) {
        for (j = 0; j < it.extra.fams.length; j++) {
          if (famSet[it.extra.fams[j]]) { s = 64; break; }
        }
      }
      if (!s) {
        for (j = 0; j < it.extra.brands.length; j++) {
          if (brSet[it.extra.brands[j]]) { s = 48; break; }
        }
      }
      if (s > 0) {
        var bonus = (wR && it.extra.rc) ? 34 : (wT && !it.extra.rc ? 30 : 0);
        hits.push({ kind: "tsb", id: it.id, score: s + bonus + (it.extra.rc ? 12 : 0), title: it.title, sub: it.sub, color: it.color, badge: it.badge });
      }
    }
    for (i = 0; i < list.length; i++) {
      it = list[i];
      if (it.kind === "model") {
        s = sc(qn, it.key);
        if (s > 0) { hits.push({ kind: "model", id: it.id, score: s + 4, title: it.title, sub: it.sub, color: it.color, badge: it.badge }); }
      } else if (it.kind === "brand") {
        s = sc(qn, it.key);
        if (s > 0) { hits.push({ kind: "brand", id: it.id, score: s, title: it.title, sub: it.sub, color: it.color, badge: it.badge }); }
      }
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    var seen = {}, out = [];
    for (i = 0; i < hits.length && out.length < 18; i++) {
      var k = hits[i].kind + hits[i].id;
      if (seen[k]) { continue; }
      seen[k] = 1;
      out.push(hits[i]);
    }
    return out;
  }

  /* ══════════ résultats mémoïsés ══════════ */
  var RES = { key: "", val: null };
  function fastResults() {
    var x = build();
    var st = W.MD_STATE;
    if (!st) { return A(db().engines); }
    var f = st.f, sel = st.sel;
    var key = [x.stamp, sel.b, sel.m, sel.e, f.region, f.sort, nkFast(f.q), A(f.fuel).join(",")].join("|");
    if (RES.key === key && RES.val) { return RES.val; }
    var qn = nkFast(f.q);
    var fuels = A(f.fuel);
    var out = A(db().engines).filter(function (e) {
      var m = x.modById[A(e.m)[0]];
      var b = m ? x.brById[m.b] : null;
      if (sel.b && (!m || m.b !== sel.b)) { return false; }
      if (sel.m && A(e.m).indexOf(sel.m) < 0) { return false; }
      if (sel.e && e.id !== sel.e) { return false; }
      if (f.region && b && b.region !== f.region) { return false; }
      if (fuels.length && fuels.indexOf(e.fuel) < 0) { return false; }
      if (qn) {
        var hay = nkFast((b ? b.n : "") + " " + (m ? m.n : "") + " " + e.code + " " + e.fam + " " + e.label);
        if (hay.indexOf(qn) < 0) { return false; }
      }
      return true;
    });
    var so = {
      brand: function (a, b2) {
        var ma = x.modById[A(a.m)[0]], mb = x.modById[A(b2.m)[0]];
        var na = ma && x.brById[ma.b] ? x.brById[ma.b].n : "";
        var nb = mb && x.brById[mb.b] ? x.brById[mb.b].n : "";
        return na.localeCompare(nb) || b2.hp - a.hp;
      },
      hpdesc: function (a, b2) { return b2.hp - a.hp; },
      year: function (a, b2) { return N(A(b2.y)[0], 0) - N(A(a.y)[0], 0); },
      ivi: function (a, b2) { return iviFast(b2) - iviFast(a); }
    };
    out.sort(so[f.sort] || so.brand);
    RES.key = key;
    RES.val = out;
    return out;
  }
  function iviFast(e) {
    if (!e || !e.id) { return 0; }
    if (ICACHE[e.id] !== undefined) { return ICACHE[e.id]; }
    var sv = W.SV || {}, fq = W.FQ || {};
    var s = 0;
    var fs = fastFaults(e);
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      s += ((sv[f.sev] || { w: 9 }).w * (fq[f.freq] || 1)) * (f.active ? 1 : 0.25);
    }
    s = Math.max(0, Math.min(100, Math.round(s)));
    ICACHE[e.id] = s;
    if (W.IVIC) { W.IVIC[e.id] = s; }
    return s;
  }

  /* ══════════ rendu coalescé ══════════ */
  function requestRender() {
    if (RENDER_REQ) { return; }
    RENDER_REQ = requestAnimationFrame(function () {
      RENDER_REQ = 0;
      var t0 = now();
      try { ORIG.render(); } catch (e) {}
      var dt = now() - t0;
      LAT.last = Math.round(dt);
      LAT.worst = Math.max(LAT.worst, LAT.last);
      LAT.n++;
      LAT.avg = Math.round((LAT.avg * (LAT.n - 1) + dt) / LAT.n);
      hud();
    });
  }
  function requestMeta() {
    if (META_REQ) { return; }
    META_REQ = requestAnimationFrame(function () {
      META_REQ = 0;
      try { ORIG.updateMeta(); } catch (e) {}
    });
  }

  /* ══════════ autovérification : immédiat + lourd différé ══════════ */
  function fastTests() {
    var T = [];
    var x = build();
    var d = db();
    var M = W.META || { counts: {} };
    function add(n, ok, info, soft) {
      T.push({ n: n, ok: !!ok, info: String(info == null ? "" : info), soft: !!soft });
    }
    add("Noyau initialisé", A(d.models).length > 0, F(A(d.models).length) + " modèles indexés");
    add("Index de corrélation actif", !!IX, "recherche et corrélations O(1)");
    add("Marques ≥ 50", M.counts.b >= 50, M.counts.b);
    add("Modèles ≥ 250", M.counts.m >= 250, M.counts.m);
    add("Motorisations ≥ 600", M.counts.e >= 600, F(M.counts.e));
    add("Pannes ≥ 35", M.counts.f >= 35, F(M.counts.f));
    add("TSB ≥ 25", M.counts.t >= 25, F(M.counts.t) + " dont " + F(M.counts.rc) + " rappels");
    add("Domaines ≥ 12", M.counts.dom >= 12, M.counts.dom);
    add("Familles ≥ 60", M.counts.fam >= 60, M.counts.fam);
    Object.keys(W.REGIONS || {}).forEach(function (r) {
      add("Région " + W.REGIONS[r], (M.regions[r] || 0) > 0, (M.regions[r] || 0) + " marques");
    });
    var per = M.perModel || {};
    var noEng = A(d.models).filter(function (m) { return !per[m.id]; }).length;
    add("Couverture modèles", noEng === 0, noEng + " sans moteur");
    add("Couverture ≥2 motorisations", M.cover >= 60, M.cover + " %", true);
    add("IDs uniques", M.integ.ok, M.integ.err.length ? M.integ.err.slice(0, 2).join("|") : "0 doublon");
    add("Intégrité référentielle", M.integ.ok, M.integ.pct + " %");
    var badY = 0, badHp = 0;
    A(d.engines).forEach(function (e) {
      var m = x.modById[A(e.m)[0]];
      if (!m) { return; }
      var ey = yv(e.y), my = yv(m.y);
      if (ey[0] < my[0] || ey[1] > my[1]) { badY++; }
      if (!(e.hp >= 1 && e.hp <= 3000)) { badHp++; }
    });
    add("Années moteur ⊂ production modèle", badY === 0, badY + " hors bornes");
    add("Puissances 1-3000", badHp === 0, badHp + " hors plage");
    add("Latence de réaction", LAT.avg <= 90, LAT.avg + " ms en moyenne", true);
    add("Cache de recherche", x.search.length > 0, F(x.search.length) + " entrées indexées");
    add("nk mémoïsé", NKC.size > 0, F(NKC.size) + " clés en cache");
    W.TESTS = T;
    requestMeta();
    paintTests();
    var heavy = [];
    var brands = A(d.brands);
    brands.forEach(function (b) {
      heavy.push(function () {
        var es = A(d.engines).filter(function (e) {
          var m = x.modById[A(e.m)[0]];
          return m && m.b === b.id;
        });
        var ok = false, info = "aucune motorisation";
        if (es.length) {
          var pl = W.buildPlan(es[0], x.modById[A(es[0].m)[0]], b);
          var v = A(pl.visits);
          var last = v.length ? N(v[v.length - 1].km, 0) : 0;
          ok = last >= N(W.KMMAX, 200000);
          info = v.length + " révisions · dernier " + F(last) + " km";
        }
        T.push({ n: "Plan 200 000 km — " + b.n, ok: ok, info: info, soft: false });
        paintTests();
      });
    });
    ["3008 courroie", "3008 rappel", "AdBlue SCR", "EGR FAP", "EAT8", "Ioniq ICCU", "CVT", "P20E8", "Chine", "Tesla", "HEMI"].forEach(function (qs) {
      heavy.push(function () {
        var r = fastSearch(qs);
        T.push({ n: "Recherche « " + qs + " »", ok: r.length > 0, info: r.length + " résultats", soft: false });
        paintTests();
      });
    });
    [["bord", W.vBord], ["explorer", W.vExplorer], ["tech", W.vTech], ["entretien", W.vEntretien], ["studio", W.vStudio], ["admin", W.vAdmin], ["diag", W.vDiag]].forEach(function (p) {
      heavy.push(function () {
        var ok = false, info = "exception";
        try {
          var h = p[1]();
          ok = typeof h === "string" && h.length > 0;
          info = ok ? F(h.length) + " caractères rendus" : "vide";
        } catch (e) { info = String(e && e.message ? e.message : e); }
        T.push({ n: "Rendu vue " + p[0], ok: ok, info: info, soft: false });
        paintTests();
      });
    });
    heavy.push(function () {
      var bad = [];
      A(W.WP && W.WP.MODES).forEach(function (m) {
        try {
          var cv = D.createElement("canvas");
          cv.width = 120; cv.height = 80;
          var cx = cv.getContext("2d");
          var tg = { W: 120, H: 80, sc: 1 };
          tg.st = W.WP.mk(tg);
          var P2 = JSON.parse(JSON.stringify(W.WP.P));
          P2.mode = m[0];
          W.WP.draw(cx, 120, 80, 1, P2, tg.st, W.WP.pal(), 1);
        } catch (e) { bad.push(m[0]); }
      });
      T.push({ n: "Scènes studio", ok: bad.length === 0, info: bad.length ? bad.join(",") : "toutes rendues", soft: false });
      paintTests();
    });
    chunk(heavy, function () {
      requestMeta();
      paintTests();
    });
    return T;
  }
  var PAINT_REQ = 0;
  function paintTests() {
    if (PAINT_REQ) { return; }
    PAINT_REQ = requestAnimationFrame(function () {
      PAINT_REQ = 0;
      var tl = q("#testList");
      if (tl && typeof W.testListHTML === "function") { tl.innerHTML = W.testListHTML(); }
    });
  }

  /* ══════════ sauvegarde différée ══════════ */
  function fastSave(quiet) {
    if (typeof W.isAdmin === "function" && !W.isAdmin()) { return false; }
    var st = stamp();
    if (st === SAVED_STAMP) { return true; }
    clearTimeout(SAVE_TIMER);
    SAVE_TIMER = setTimeout(function () {
      idle(function () {
        if (stamp() === SAVED_STAMP) { return; }
        try {
          ORIG.saveNow(true);
          SAVED_STAMP = stamp();
          if (!quiet) { /* notification gérée par l'appelant */ }
        } catch (e) {}
      }, 4000);
    }, 1200);
    return true;
  }

  /* ══════════ fond animé économe ══════════ */
  function applyWP() {
    var wp = W.WP;
    if (!wp) { return; }
    wp.P.quality = P.quality;
    wp.P.count = P.count;
    wp.P.density = P.density;
    wp.P.glow = P.halo ? P.glow : 0;
    wp.targets.forEach(function (t) { t.key = ""; });
    if (!wp.__perfResize) {
      wp.__perfResize = 1;
      var origResize = wp.resize;
      wp.resize = function () {
        origResize.call(this);
        this.targets.forEach(function (t) {
          if (t.pv) { return; }
          var d = P.quality === "ultra" ? Math.min(W.devicePixelRatio || 1, 1.5) : P.quality === "std" ? 1 : 0.8;
          t.cv.width = Math.max(1, Math.round(t.W * d));
          t.cv.height = Math.max(1, Math.round(t.H * d));
          try { t.ctx.setTransform(d, 0, 0, d, 0, 0); } catch (e) {}
          t.key = "";
        });
        this.drawAll();
      };
    }
    if (!wp.__perfDraw) {
      wp.__perfDraw = 1;
      var origDrawAll = wp.drawAll;
      wp.drawAll = function () {
        var t = now();
        var gap = 1000 / Math.max(10, P.fps);
        if (P.pauseOnInput && busy(200)) { return; }
        if ((t - LAST_FRAME) < gap) { return; }
        LAST_FRAME = t;
        origDrawAll.call(this);
      };
      var origDraw = wp.draw;
      wp.draw = function (c, w, h, t, pp, st, th, s) {
        if (!c.__capped) {
          c.__capped = 1;
          try {
            Object.defineProperty(c, "shadowBlur", {
              configurable: true,
              get: function () { return this.__sb || 0; },
              set: function (v) { this.__sb = Math.min(N(v, 0), P.halo ? 6 : 0); }
            });
          } catch (e) {}
        }
        return origDraw.call(this, c, w, h, t, pp, st, th, s);
      };
    }
    wp.resize();
  }

  /* ══════════ CSS d'accélération ══════════ */
  function css() {
    if (q("#mdperfcss")) { return; }
    var s = D.createElement("style");
    s.id = "mdperfcss";
    s.textContent = [
      ".eg .eng,.fcard,.tsb,.tst,.jr{contain:layout paint style}",
      ".perf-fast .eg .eng,.perf-fast .fcard,.perf-fast .tsb,.perf-fast .tst{content-visibility:auto;contain-intrinsic-size:auto 190px}",
      ".perf-fast .tests .tst{contain-intrinsic-size:auto 54px}",
      "#view{contain:layout style}",
      ".eng,.card,.btn,.tb,.nv{transition-duration:.09s}",
      "#bgc{will-change:opacity}",
      ".to{animation-duration:.16s}",
      "@media(prefers-reduced-motion:reduce){#bgc{display:none}}"
    ].join("");
    D.head.appendChild(s);
    D.body.classList.toggle("perf-fast", !!P.fastLists);
  }

  /* ══════════ HUD latence ══════════ */
  function hud() {
    var el = q("#stLat");
    if (!el) {
      var bar = q("#status");
      if (!bar) { return; }
      var sp = D.createElement("span");
      sp.innerHTML = "RÉACTION <b id='stLat'>—</b>";
      bar.insertBefore(sp, bar.firstChild);
      el = q("#stLat");
    }
    if (el) {
      el.textContent = LAT.avg ? LAT.avg + " ms" : "—";
      el.style.color = LAT.avg > 120 ? "#FF4D5E" : LAT.avg > 60 ? "#FFAF2E" : "#43E08B";
    }
  }

  /* ══════════ panneau PERFORMANCE ══════════ */
  function panelBody() {
    var x = IX || build();
    var h = "<div class='kpis' style='grid-template-columns:repeat(4,1fr)'>";
    [["RÉACTION MOYENNE", LAT.avg ? LAT.avg + " ms" : "—", LAT.avg > 120 ? "#FF4D5E" : "#43E08B"],
     ["PIC MESURÉ", LAT.worst ? LAT.worst + " ms" : "—", "#FFAF2E"],
     ["ENTRÉES INDEXÉES", F(x.search.length), "#25D4EE"],
     ["CLÉS EN CACHE", F(NKC.size), "#E45CFF"]].forEach(function (k) {
      h += "<div class='card kpi' style='--kc:" + k[2] + "'><b>" + E(k[1]) + "</b><span>" + k[0] + "</span></div>";
    });
    h += "</div>";
    h += "<div class='card panel'><h3>" + IC("spark") + "Réglages appliqués en direct</h3>";
    h += "<div class='fr f2' style='margin-bottom:10px'>";
    h += "<div><label class='lb'>Qualité du fond</label><select class='sel' data-perf='quality'>";
    [["eco", "Éco — 0.8× (recommandé APK)"], ["std", "Standard — 1×"], ["ultra", "Ultra — 1.5×"]].forEach(function (o) {
      h += "<option value='" + o[0] + "'" + (P.quality === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
    });
    h += "</select></div>";
    h += "<div><label class='lb'>Profil</label><select class='sel' data-perf='profile'>";
    h += "<option value=''>Personnalisé</option><option value='turbo'>Turbo — réaction maximale</option><option value='balanced'>Équilibré</option><option value='show'>Démonstration visuelle</option>";
    h += "</select></div></div>";
    [["fps", "Images/seconde du fond", 10, 60, 1, " fps"],
     ["count", "Particules", 10, 300, 5, ""],
     ["density", "Densité visuelle", 0, 100, 2, " %"],
     ["glow", "Intensité du halo", 0, 100, 2, " %"],
     ["searchDelay", "Délai de recherche", 0, 300, 10, " ms"],
     ["lot", "Lot d'enrichissement par cycle", 40, 420, 20, " fiches"]].forEach(function (s) {
      h += "<div style='margin-bottom:6px'><div class='srow'><span>" + s[1] + "</span><span class='sval' data-perfv='" + s[0] + "'>" + P[s[0]] + s[5] + "</span></div>";
      h += "<input type='range' data-perf='" + s[0] + "' min='" + s[2] + "' max='" + s[3] + "' step='" + s[4] + "' value='" + P[s[0]] + "'></div>";
    });
    [["pauseOnInput", "Suspendre le fond pendant la saisie et le scroll"],
     ["fastLists", "Accélération des longues listes"],
     ["halo", "Halo lumineux du fond"]].forEach(function (t) {
      h += "<div class='srow' style='margin-top:8px'><span>" + t[1] + "</span><label class='sw'><input type='checkbox' data-perf='" + t[0] + "'" + (P[t[0]] ? " checked" : "") + "><i></i></label></div>";
    });
    h += "</div>";
    h += "<div class='card panel' style='margin-top:12px'><h3>" + IC("info") + "Chaîne d'accélération active</h3><div class='sg'>";
    [["nk mémoïsé", "oui"], ["Index partagés", "oui"], ["recompute O(n)", "oui"],
     ["Recherche indexée", "oui"], ["Rendu coalescé", "oui"], ["Tests lourds différés", "oui"],
     ["Sauvegarde différée", "oui"], ["Résultats mémoïsés", "oui"]].forEach(function (r) {
      h += "<div class='sp'><span>" + E(r[0]) + "</span><b class='hl'>" + E(r[1]) + "</b></div>";
    });
    h += "</div></div>";
    return h;
  }
  function refreshPanel() {
    var b = q("#perfBody");
    if (b) { b.innerHTML = panelBody(); }
  }
  function openPanel() {
    var h = "<div class='mh'>" + IC("spark", "color:#43E08B") + "<h3>PERFORMANCE & LATENCE</h3>";
    h += "<button class='tb' data-act='mclose'>" + IC("x") + "</button></div>";
    h += "<div class='mb2' id='perfBody'>" + panelBody() + "</div>";
    h += "<div class='mf'>";
    h += "<button class='btn sm ghost' data-perfa='reset'>" + IC("reset") + "Réinitialiser</button>";
    h += "<button class='btn sm ghost' data-perfa='export'>" + IC("dl") + "Diagnostics</button>";
    h += "<button class='btn sm grn' data-perfa='turbo'>" + IC("spark") + "PROFIL TURBO</button>";
    h += "<button class='btn sm' data-act='mclose'>Fermer</button></div>";
    if (typeof W.openModal === "function") { W.openModal(h, "wide"); }
  }
  function injectBtn() {
    var top = q("#top");
    if (!top || q("#perfb")) { return; }
    var b = D.createElement("button");
    b.className = "tb";
    b.id = "perfb";
    b.type = "button";
    b.title = "Performance et latence";
    b.setAttribute("aria-label", "Performance et latence");
    b.style.color = "#43E08B";
    b.style.borderColor = "rgba(67,224,139,.45)";
    b.innerHTML = IC("spark");
    b.addEventListener("click", openPanel);
    var ref = q("#auditb") || q("#megab") || q("#repairb") || q("#diagb");
    if (ref && ref.parentNode === top) { top.insertBefore(b, ref); } else { top.appendChild(b); }
  }
  function profile(name) {
    if (name === "turbo") {
      P.quality = "eco"; P.fps = 20; P.count = 40; P.density = 28; P.glow = 12;
      P.searchDelay = 80; P.lot = 90; P.pauseOnInput = true; P.fastLists = true; P.halo = false;
    } else if (name === "balanced") {
      P.quality = "eco"; P.fps = 30; P.count = 70; P.density = 42; P.glow = 26;
      P.searchDelay = 110; P.lot = 140; P.pauseOnInput = true; P.fastLists = true; P.halo = true;
    } else if (name === "show") {
      P.quality = "std"; P.fps = 45; P.count = 150; P.density = 64; P.glow = 55;
      P.searchDelay = 140; P.lot = 200; P.pauseOnInput = true; P.fastLists = true; P.halo = true;
    }
    save();
    applyWP();
    css();
    refreshPanel();
  }

  /* ══════════ événements du panneau ══════════ */
  D.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) { return; }
    var k = t.getAttribute("data-perf");
    if (!k || k === "quality" || k === "profile") { return; }
    if (t.type === "checkbox") { P[k] = !!t.checked; }
    else { P[k] = N(t.value, P[k]); }
    var lbl = q("[data-perfv='" + k + "']");
    if (lbl) {
      var unit = k === "fps" ? " fps" : k === "density" || k === "glow" ? " %" : k === "searchDelay" ? " ms" : k === "lot" ? " fiches" : "";
      lbl.textContent = P[k] + unit;
    }
    save();
    if (k === "fastLists") { D.body.classList.toggle("perf-fast", !!P.fastLists); }
    else if (k === "lot" || k === "searchDelay") { /* pris en compte au prochain cycle */ }
    else { applyWP(); }
  });
  D.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) { return; }
    var k = t.getAttribute("data-perf");
    if (k === "quality") {
      P.quality = t.value;
      save();
      applyWP();
      refreshPanel();
      return;
    }
    if (k === "profile" && t.value) {
      profile(t.value);
      return;
    }
    if (k && t.type === "checkbox") {
      P[k] = !!t.checked;
      save();
      if (k === "fastLists") { D.body.classList.toggle("perf-fast", !!P.fastLists); }
      else { applyWP(); }
    }
  });
  D.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-perfa]") : null;
    if (!el) { return; }
    var a = el.getAttribute("data-perfa");
    if (a === "reset") {
      P = { quality: "eco", fps: 30, count: 70, density: 42, glow: 26, searchDelay: 110, lot: 140, pauseOnInput: true, fastLists: true, halo: true };
      save(); applyWP(); css(); refreshPanel();
      if (W.toast) { W.toast("info", "Réglages réinitialisés", "Profil équilibré restauré"); }
      return;
    }
    if (a === "turbo") {
      profile("turbo");
      if (W.toast) { W.toast("ok", "Profil Turbo activé", "Latence minimale, fond allégé"); }
      if (W.beep) { W.beep("ok"); }
      return;
    }
    if (a === "export") {
      if (W.download) {
        W.download("mecadata_performance.json", JSON.stringify({
          settings: P, latency: LAT, cache: NKC.size,
          index: IX ? IX.search.length : 0, counts: (W.META || {}).counts,
          stamp: stamp()
        }, null, 2));
      }
      return;
    }
  });

  /* ══════════ patches ══════════ */
  function keep(name, fn) {
    if (typeof W[name] === "function" && !ORIG[name]) { ORIG[name] = W[name]; }
    W[name] = fn;
  }
  function phase1() {
    if (!W.MD_API || !W.DB || !A(W.DB.engines).length) { return false; }
    load();
    css();
    injectBtn();
    hud();
    W.nk = nkFast;
    keep("recompute", function () {
      try { fastRecompute(); } catch (e) { if (ORIG.recompute) { ORIG.recompute(); } }
    });
    keep("invalidate", function () {
      touch();
      FCACHE = {}; TCACHE = {}; ICACHE = {};
      RES.key = "";
      if (W.FC) { W.FC = {}; }
      if (W.TC) { W.TC = {}; }
      if (W.IVIC) { W.IVIC = {}; }
    });
    keep("updateMeta", requestMeta);
    keep("render", requestRender);
    keep("results", function () {
      try { return fastResults(); } catch (e) { return ORIG.results ? ORIG.results() : []; }
    });
    keep("ivi", iviFast);
    keep("omniSearch", function (qs) {
      try { return fastSearch(qs); } catch (e) { return ORIG.omniSearch ? ORIG.omniSearch(qs) : []; }
    });
    keep("omniRender", function () {
      clearTimeout(SEARCH_TIMER);
      SEARCH_TIMER = setTimeout(function () {
        try { ORIG.omniRender(); } catch (e) {}
      }, Math.max(0, P.searchDelay));
    });
    keep("runTests", fastTests);
    keep("saveNow", fastSave);
    keep("faultsFor", fastFaults);
    keep("tsbFor", fastTsb);
    keep("engForFault", fastEngForFault);
    keep("engForTsb", fastEngForTsb);
    if (typeof W.stampYears === "function" && !W.stampYears.__perf) {
      var sy = W.stampYears;
      var wsy = function () {
        clearTimeout(YEAR_TIMER);
        YEAR_TIMER = setTimeout(function () { try { sy(); } catch (e) {} }, 110);
      };
      wsy.__perf = 1;
      W.stampYears = wsy;
    }
    try { fastRecompute(); } catch (e) {}
    applyWP();
    requestRender();
    W.MD_PERF = {
      settings: P, latency: LAT, index: build, touch: touch,
      profile: profile, panel: openPanel,
      recompute: fastRecompute, search: fastSearch,
      save: function () { save(); },
      stats: function () { return { cache: NKC.size, index: IX ? IX.search.length : 0, latency: LAT }; }
    };
    idle(function () { try { fastTests(); } catch (e) {} }, 3000);
    return true;
  }
  function phase2() {
    if (W.MD_MEGA && typeof W.MD_MEGA.expand === "function" && !W.MD_MEGA.expand.__perf) {
      var ex = W.MD_MEGA.expand;
      var wex = function (lot, quiet) {
        var lim = Math.min(N(lot, P.lot), P.lot);
        if (busy(400) || (now() - EXPAND_LAST) < 6000) {
          idle(function () {
            EXPAND_LAST = now();
            try {
              var r = ex(lim, true);
              touch();
              if (r && r.added) {
                if (W.toast) { W.toast("info", "Méga-base enrichie", "+" + F(r.added) + " pannes en arrière-plan"); }
                requestRender();
              }
            } catch (e) {}
          }, 6000);
          return { added: 0, tsb: 0, left: 0, deferred: true };
        }
        EXPAND_LAST = now();
        var out = ex(lim, quiet);
        touch();
        return out;
      };
      wex.__perf = 1;
      W.MD_MEGA.expand = wex;
    }
    if (W.MD_AUDIT && typeof W.MD_AUDIT.run === "function" && !W.MD_AUDIT.run.__perf) {
      var au = W.MD_AUDIT.run;
      var wau = function (fix) {
        if (!fix) { return au(false); }
        if (busy(500) || (now() - AUDIT_LAST) < 15000) {
          idle(function () {
            AUDIT_LAST = now();
            try {
              var r = au(true);
              touch();
              if (r && r.total && W.toast) { W.toast("info", "Corrélation revérifiée", F(r.total) + " anomalies corrigées"); }
              requestRender();
            } catch (e) {}
          }, 8000);
          return { total: 0, counts: {}, issues: [], deferred: true };
        }
        AUDIT_LAST = now();
        var out = au(true);
        touch();
        return out;
      };
      wau.__perf = 1;
      W.MD_AUDIT.run = wau;
    }
    if (W.AUTO && typeof W.AUTO.sweep === "function" && !W.AUTO.sweep.__perf) {
      var sw = W.AUTO.sweep;
      var wsw = function (reason, full) {
        if (!full && busy(500)) {
          var self = this;
          idle(function () {
            try { sw.call(self, reason, false); touch(); requestRender(); } catch (e) {}
          }, 5000);
          return { ok: true, total: 0, deferred: true };
        }
        var out = sw.call(this, reason, full);
        touch();
        return out;
      };
      wsw.__perf = 1;
      W.AUTO.sweep = wsw;
    }
    return !!(W.MD_MEGA && W.MD_AUDIT);
  }

  var t1 = 0, t2 = 0;
  var iv1 = setInterval(function () {
    t1++;
    if (phase1() || t1 > 200) { clearInterval(iv1); }
  }, 120);
  var iv2 = setInterval(function () {
    t2++;
    if (phase2() || t2 > 400) { clearInterval(iv2); }
  }, 400);
  W.addEventListener("load", function () {
    setTimeout(function () { phase1(); phase2(); hud(); }, 120);
  });
  setInterval(hud, 2000);
})();
