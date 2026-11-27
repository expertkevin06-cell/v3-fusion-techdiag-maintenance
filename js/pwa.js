/* MECADATA pwa v24 — ouverture la plus rapide possible.
   • preload des 5 modules quand l'app est servie en http(s) ;
   • families → perf puis faults/audit/tech en parallèle ;
   • splash fermé dès window.__MD_READY (poll 60 ms) sans attendre le timer ;
   • icônes à 3 s, service worker en idle 2,5 s (hors chemin critique) ;
   • univers PL / MOTOS & QUADS en overlay, retour sans rechargement. */
(function () {
  "use strict";
  var D = document;
  var BOLT = [[0.615, 0.055], [0.270, 0.545], [0.470, 0.545], [0.385, 0.945], [0.745, 0.415], [0.535, 0.415], [0.690, 0.055]];
  var SIZES = [["favicon-16.png", 16, false], ["favicon-32.png", 32, false], ["apple-touch-icon.png", 180, true], ["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-192.png", 192, true], ["icon-maskable-512.png", 512, true]];
  var MODULES = ["js/families.js?v=24", "js/perf.js?v=24", "js/faults.js?v=24", "js/audit.js?v=24", "js/techfilter.js?v=24"];
  var isWeb = /^https?:$/.test(location.protocol);
  var GEN = {}, deferred = null, installed = false, swReg = null;
  function idle(f, ms) {
    if (window.requestIdleCallback) { requestIdleCallback(function () { f(); }, { timeout: ms || 2500 }); }
    else { setTimeout(f, ms || 600); }
  }
  function note(m, src) {
    try { window.__MD_ERR.push({ msg: m, src: src, line: 0, col: 0 }); } catch (e) {}
  }
  function preload() {
    if (!isWeb) { return; }
    MODULES.forEach(function (src) {
      var l = D.createElement("link");
      l.rel = "preload";
      l.as = "script";
      l.href = src;
      D.head.appendChild(l);
    });
  }
  function loadScript(id, src, then) {
    if (D.getElementById(id)) { if (then) { then(); } return; }
    var s = D.createElement("script");
    s.id = id;
    s.src = src;
    s.async = false;
    s.onload = function () { if (then) { then(); } };
    s.onerror = function () {
      note("Chargement impossible : " + src, src);
      if (then) { then(); }
    };
    D.body.appendChild(s);
  }
  function loadModules() {
    loadScript("mdfam", MODULES[0], function () {
      loadScript("mdperf", MODULES[1], function () {
        loadScript("mdmega", MODULES[2], null);
        loadScript("mdaudit", MODULES[3], null);
        loadScript("mdtech", MODULES[4], null);
      });
    });
  }
  function liftWhenReady() {
    var n = 0;
    var iv = setInterval(function () {
      n++;
      if (window.__MD_READY) {
        clearInterval(iv);
        try { window.__MD_LIFT(); } catch (e) {}
      } else if (n > 100) {
        clearInterval(iv);
      }
    }, 60);
  }
  function draw(c, s, mask) {
    c.clearRect(0, 0, s, s);
    c.save();
    if (!mask) {
      var r = s * 0.22;
      c.beginPath();
      c.moveTo(r, 0); c.lineTo(s - r, 0); c.quadraticCurveTo(s, 0, s, r);
      c.lineTo(s, s - r); c.quadraticCurveTo(s, s, s - r, s);
      c.lineTo(r, s); c.quadraticCurveTo(0, s, 0, s - r);
      c.lineTo(0, r); c.quadraticCurveTo(0, 0, r, 0);
      c.closePath(); c.clip();
    }
    var bg = c.createRadialGradient(s * 0.42, s * 0.34, 0, s * 0.42, s * 0.34, s * 0.95);
    bg.addColorStop(0, "#111C31"); bg.addColorStop(1, "#04070D");
    c.fillStyle = bg; c.fillRect(0, 0, s, s);
    c.strokeStyle = "rgba(37,212,238,.22)";
    c.lineWidth = Math.max(1, s * 0.006);
    c.beginPath(); c.arc(s * 0.5, s * 0.5, s * 0.44, 0, Math.PI * 2); c.stroke();
    var k = mask ? 0.68 : 0.86;
    var pts = BOLT.map(function (p) { return [(0.5 + (p[0] - 0.5) * k) * s, (0.5 + (p[1] - 0.5) * k) * s]; });
    function path() {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) { c.lineTo(pts[i][0], pts[i][1]); }
      c.closePath();
    }
    c.save();
    c.shadowColor = "rgba(255,168,0,.85)";
    c.shadowBlur = s * 0.09;
    path(); c.fillStyle = "#FFA800"; c.fill();
    c.restore();
    var g = c.createLinearGradient(0, s * 0.06, 0, s * 0.94);
    g.addColorStop(0, "#FFF5AA"); g.addColorStop(0.45, "#FFD60A"); g.addColorStop(1, "#FFA800");
    path(); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,245,170,.5)";
    c.lineWidth = Math.max(1, s * 0.008);
    path(); c.stroke();
    c.restore();
  }
  function make(s, mask) {
    try {
      var cv = D.createElement("canvas");
      cv.width = cv.height = s;
      var cx = cv.getContext("2d");
      if (!cx) { return null; }
      draw(cx, s, mask);
      return cv.toDataURL("image/png");
    } catch (e) { return null; }
  }
  function generate() {
    SIZES.forEach(function (f) {
      var u = make(f[1], f[2]);
      if (u) { GEN[f[0]] = u; }
    });
  }
  function link(rel, href, ex) {
    var l = D.createElement("link");
    l.rel = rel; l.href = href;
    if (ex) { Object.keys(ex).forEach(function (k) { l.setAttribute(k, ex[k]); }); }
    D.head.appendChild(l);
  }
  function meta(n, v) {
    var m = D.querySelector("meta[name='" + n + "']");
    if (!m) { m = D.createElement("meta"); m.name = n; D.head.appendChild(m); }
    m.content = v;
  }
  function probe(src, ko) {
    var im = new Image();
    im.onerror = ko;
    im.src = src + "?p=" + Date.now();
  }
  function icons() {
    generate();
    meta("theme-color", "#04070D");
    meta("application-name", "MECADATA");
    meta("apple-mobile-web-app-title", "MECADATA");
    probe("icons/favicon-32.png", function () {
      if (GEN["favicon-32.png"]) { link("icon", GEN["favicon-32.png"], { type: "image/png", sizes: "32x32" }); }
      if (GEN["favicon-16.png"]) { link("icon", GEN["favicon-16.png"], { type: "image/png", sizes: "16x16" }); }
    });
    probe("icons/apple-touch-icon.png", function () {
      if (GEN["apple-touch-icon.png"]) { link("apple-touch-icon", GEN["apple-touch-icon.png"], { sizes: "180x180" }); }
    });
    probe("icons/icon-192.png", function () {
      if (!GEN["icon-192.png"] || !GEN["icon-512.png"]) { return; }
      var mf = {
        id: "/mecadata-expert", name: "MECADATA // INGÉNIEUR EXPERT", short_name: "MECADATA",
        lang: "fr-FR", start_url: "./index.html", scope: "./", display: "standalone",
        background_color: "#04070D", theme_color: "#04070D",
        icons: [
          { src: GEN["icon-192.png"], sizes: "192x192", type: "image/png", purpose: "any" },
          { src: GEN["icon-512.png"], sizes: "512x512", type: "image/png", purpose: "any" },
          { src: GEN["icon-maskable-512.png"], sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      };
      try { link("manifest", URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: "application/manifest+json" }))); } catch (e) {}
    });
    var boot = D.querySelector("#boot svg");
    if (boot && GEN["icon-192.png"]) {
      var img = D.createElement("img");
      img.src = GEN["icon-192.png"];
      img.alt = ""; img.width = 60; img.height = 60;
      img.style.borderRadius = "15px";
      img.style.boxShadow = "0 0 36px rgba(255,168,0,.45)";
      boot.parentNode.replaceChild(img, boot);
    }
  }
  function status() {
    var el = D.getElementById("stPwa");
    if (!el) { return; }
    el.classList.toggle("off", navigator.onLine === false);
    el.textContent = navigator.onLine === false ? "HORS LIGNE" : installed ? "INSTALLÉE" : deferred ? "INSTALLABLE" : !isWeb ? "APK / LOCAL" : swReg ? "PWA ACTIVE" : "NAVIGATEUR";
  }
  function installBtnState() {
    var b = D.getElementById("installb");
    if (!b) { return; }
    b.hidden = !deferred || installed;
    b.classList.toggle("inst", !!deferred && !installed);
  }
  function installBtn() {
    var b = D.getElementById("installb");
    if (!b) { return; }
    b.addEventListener("click", function () {
      if (!deferred) { return; }
      try {
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; installBtnState(); status(); })
          .catch(function () { deferred = null; installBtnState(); status(); });
      } catch (e) { deferred = null; installBtnState(); status(); }
    });
  }
  function notifyUpdate(reg) {
    var box = D.getElementById("ts");
    if (!box || D.getElementById("pwaUpdate")) { return; }
    var el = D.createElement("div");
    el.className = "to info";
    el.id = "pwaUpdate";
    el.innerHTML = "<svg class='ic'><use href='#i-reset'/></svg><div style='flex:1;min-width:0'><b>Mise à jour prête</b><p>Activation immédiate du nouveau code.</p></div><button class='btn xs pri' id='pwaReload'>ACTIVER</button>";
    box.appendChild(el);
    var btn = D.getElementById("pwaReload");
    if (btn) { btn.addEventListener("click", function () { activateWaiting(reg, true); }); }
  }
  function activateWaiting(reg, reload) {
    try {
      sessionStorage.setItem("md_sw_reload", reload ? "1" : "0");
      if (reg.waiting) { reg.waiting.postMessage("skipWaiting"); }
    } catch (e) {}
  }
  function sw() {
    if (!isWeb || !("serviceWorker" in navigator)) { status(); return; }
    navigator.serviceWorker.register("sw.js?v=24", { scope: "./" }).then(function (reg) {
      swReg = reg;
      status();
      try { reg.update(); } catch (e) {}
      if (reg.waiting) {
        var already = false;
        try { already = sessionStorage.getItem("md_sw_reload") === "1"; } catch (e) {}
        if (!already) { activateWaiting(reg, true); } else { notifyUpdate(reg); }
      }
      reg.addEventListener("updatefound", function () {
        var nw = reg.installing;
        if (!nw) { return; }
        nw.addEventListener("statechange", function () {
          if (nw.state === "installed" && navigator.serviceWorker.controller) { activateWaiting(reg, true); }
        });
      });
    }).catch(function () { swReg = null; status(); });
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      var once = false;
      try {
        once = sessionStorage.getItem("md_sw_reload") === "1";
        sessionStorage.removeItem("md_sw_reload");
      } catch (e) {}
      if (once) { location.reload(); }
      status();
    });
  }
  function net() {
    window.addEventListener("online", status);
    window.addEventListener("offline", status);
  }
  function standalone() {
    try {
      installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
      if (window.matchMedia) {
        var mq = window.matchMedia("(display-mode: standalone)");
        if (mq.addEventListener) {
          mq.addEventListener("change", function (e) { installed = e.matches; installBtnState(); status(); });
        }
      }
    } catch (e) {}
  }
  function addSymbol(id, inner) {
    if (D.getElementById(id)) { return; }
    var defs = D.querySelector("svg[aria-hidden='true'] defs");
    if (!defs) { return; }
    var sym = D.createElementNS("http://www.w3.org/2000/svg", "symbol");
    sym.setAttribute("id", id);
    sym.setAttribute("viewBox", "0 0 24 24");
    sym.innerHTML = inner;
    defs.appendChild(sym);
  }
  var UNI = null;
  function openUniverse(url, title) {
    closeUniverse();
    UNI = D.createElement("div");
    UNI.id = "mduni";
    UNI.style.cssText = "position:fixed;inset:0;z-index:400;background:#04070D;";
    var bar = D.createElement("div");
    bar.style.cssText = "position:absolute;top:0;left:0;right:0;height:44px;z-index:2;display:flex;align-items:center;gap:10px;padding:0 10px;background:rgba(4,7,13,.96);border-bottom:1px solid rgba(255,106,0,.4);";
    bar.innerHTML = "<button type='button' id='uniBack' style='display:inline-flex;align-items:center;gap:7px;font:600 11px system-ui;letter-spacing:.06em;color:#120B05;background:linear-gradient(135deg,#FFD9A8,#FF6A00 55%,#C2410C);padding:8px 12px;border:0;border-radius:9px;cursor:pointer'>← RETOUR TOURISME</button><span style='font:500 10px ui-monospace,monospace;color:#FF6A00'>" + title + " · UNIVERS SÉPARÉ</span>";
    var fr = D.createElement("iframe");
    fr.src = url;
    fr.title = title;
    fr.style.cssText = "position:absolute;top:44px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 44px);border:0;background:#0B0703;";
    UNI.appendChild(bar);
    UNI.appendChild(fr);
    D.body.appendChild(UNI);
    D.body.classList.add("lock");
    bar.querySelector("#uniBack").addEventListener("click", closeUniverse);
  }
  function closeUniverse() {
    if (!UNI) { return; }
    if (UNI.parentNode) { UNI.parentNode.removeChild(UNI); }
    UNI = null;
    D.body.classList.remove("lock");
  }
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (d && d.md === "uniback") { closeUniverse(); }
  });
  D.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && UNI) { closeUniverse(); }
  });
  function injectUniverses() {
    addSymbol("i-truck", "<path d='M1 6h12v10H1Z'/><path d='M13 9h5l3 3v4h-8Z'/><circle cx='6' cy='18' r='1.9'/><circle cx='17' cy='18' r='1.9'/><path d='M3 9h6'/>");
    addSymbol("i-moto", "<circle cx='5' cy='17' r='3.4'/><circle cx='19' cy='17' r='3.4'/><path d='M5 17l3-7h5l3 4h3'/><path d='M13 10l-2-3H8'/><path d='M16 14l2-4h2'/>");
    var UNIS = [["pl.html", "Poids lourds", "i-truck", "#FF6A00", "PL"], ["moto.html", "Motos & Quads", "i-moto", "#A8E63C", "MOTO"]];
    var rail = D.getElementById("rail");
    if (rail && !D.getElementById("uninav")) {
      var wrap = D.createElement("div");
      wrap.id = "uninav";
      UNIS.forEach(function (u) {
        var a = D.createElement("a");
        a.className = "nv";
        a.href = u[0];
        a.dataset.uni = u[0];
        a.innerHTML = "<svg class='ic' style='color:" + u[3] + "'><use href='#" + u[2] + "'/></svg><span>" + u[1] + "</span><em style='color:" + u[3] + ";border-color:" + u[3] + "55'>" + u[4] + "</em>";
        wrap.appendChild(a);
      });
      var diag = rail.querySelector("[data-v='diagnostic']");
      if (diag && diag.nextSibling) { rail.insertBefore(wrap, diag.nextSibling); } else { rail.appendChild(wrap); }
    }
    var tabs = D.getElementById("tabs");
    if (tabs && !tabs.querySelector("[data-uni]")) {
      UNIS.forEach(function (u) {
        var t = D.createElement("a");
        t.href = u[0];
        t.dataset.uni = u[0];
        t.innerHTML = "<svg class='ic'><use href='#" + u[2] + "'/></svg>" + u[4];
        tabs.appendChild(t);
      });
    }
    var top = D.getElementById("top");
    if (top && !top.querySelector("[data-uni]")) {
      var ref = D.getElementById("diagb");
      UNIS.slice().reverse().forEach(function (u) {
        var b = D.createElement("a");
        b.className = "tb";
        b.href = u[0];
        b.dataset.uni = u[0];
        b.title = u[1];
        b.setAttribute("aria-label", u[1]);
        b.innerHTML = "<svg class='ic' style='color:" + u[3] + "'><use href='#" + u[2] + "'/></svg>";
        if (ref) { top.insertBefore(b, ref); } else { top.appendChild(b); }
      });
    }
    D.addEventListener("click", function (ev) {
      var el = ev.target.closest ? ev.target.closest("[data-uni]") : null;
      if (!el) { return; }
      ev.preventDefault();
      openUniverse(el.dataset.uni, el.dataset.uni === "pl.html" ? "POIDS LOURDS" : "MOTOS & QUADS");
    });
  }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    installBtnState();
    status();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    installed = true;
    installBtnState();
    status();
  });
  window.MD_PWA = {
    icons: GEN, sizes: SIZES, generate: generate, status: status, isWeb: isWeb,
    openUniverse: openUniverse, closeUniverse: closeUniverse, loadModules: loadModules
  };
  function boot() {
    standalone();
    installBtn();
    net();
    status();
    injectUniverses();
    preload();
    loadModules();
    liftWhenReady();
    idle(icons, 3000);
    idle(sw, 2500);
    setTimeout(status, 2000);
  }
  if (D.readyState === "loading") { D.addEventListener("DOMContentLoaded", boot); } else { boot(); }
  window.__MD_SCRIPTS.pwa = true;
})();
