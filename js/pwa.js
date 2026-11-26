/* MECADATA v13 — couche PWA + entrée Poids Lourds.
   Injecte une case « PL » dédiée (rail, onglets mobile, barre du haut)
   pointant vers pl.html : univers poids lourd totalement séparé du tourisme. */
(function () {
  "use strict";
  var D = document;
  var BOLT = [[0.615, 0.055], [0.270, 0.545], [0.470, 0.545], [0.385, 0.945], [0.745, 0.415], [0.535, 0.415], [0.690, 0.055]];
  var SIZES = [["favicon-16.png", 16, false], ["favicon-32.png", 32, false], ["apple-touch-icon.png", 180, true], ["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-192.png", 192, true], ["icon-maskable-512.png", 512, true]];
  var isWeb = /^https?:$/.test(location.protocol);
  var GEN = {}, deferred = null, installed = false, swReg = null;

  function draw(c, s, mask) {
    c.clearRect(0, 0, s, s);
    c.save();
    if (!mask) {
      var r = s * 0.22;
      c.beginPath(); c.moveTo(r, 0); c.lineTo(s - r, 0); c.quadraticCurveTo(s, 0, s, r);
      c.lineTo(s, s - r); c.quadraticCurveTo(s, s, s - r, s); c.lineTo(r, s); c.quadraticCurveTo(0, s, 0, s - r);
      c.lineTo(0, r); c.quadraticCurveTo(0, 0, r, 0); c.closePath(); c.clip();
    }
    var bg = c.createRadialGradient(s * 0.42, s * 0.34, 0, s * 0.42, s * 0.34, s * 0.95);
    bg.addColorStop(0, "#111C31"); bg.addColorStop(1, "#04070D");
    c.fillStyle = bg; c.fillRect(0, 0, s, s);
    c.strokeStyle = "rgba(37,212,238,.22)"; c.lineWidth = Math.max(1, s * 0.006);
    c.beginPath(); c.arc(s * 0.5, s * 0.5, s * 0.44, 0, Math.PI * 2); c.stroke();
    var k = mask ? 0.68 : 0.86;
    var pts = BOLT.map(function (p) { return [(0.5 + (p[0] - 0.5) * k) * s, (0.5 + (p[1] - 0.5) * k) * s]; });
    function path() { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
    c.save(); c.shadowColor = "rgba(255,168,0,.85)"; c.shadowBlur = s * 0.09; path(); c.fillStyle = "#FFA800"; c.fill(); c.restore();
    var g = c.createLinearGradient(0, s * 0.06, 0, s * 0.94);
    g.addColorStop(0, "#FFF5AA"); g.addColorStop(0.45, "#FFD60A"); g.addColorStop(1, "#FFA800");
    path(); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,245,170,.5)"; c.lineWidth = Math.max(1, s * 0.008); path(); c.stroke();
    c.restore();
  }
  function make(s, mask) { try { var cv = D.createElement("canvas"); cv.width = cv.height = s; var cx = cv.getContext("2d"); if (!cx) return null; draw(cx, s, mask); return cv.toDataURL("image/png"); } catch (e) { return null; } }
  function generate() { SIZES.forEach(function (f) { var u = make(f[1], f[2]); if (u) GEN[f[0]] = u; }); }
  function link(rel, href, ex) { var l = D.createElement("link"); l.rel = rel; l.href = href; if (ex) Object.keys(ex).forEach(function (k) { l.setAttribute(k, ex[k]); }); D.head.appendChild(l); }
  function meta(n, v) { var m = D.querySelector("meta[name='" + n + "']"); if (!m) { m = D.createElement("meta"); m.name = n; D.head.appendChild(m); } m.content = v; }
  function probe(src, ko) { var im = new Image(); im.onerror = ko; im.src = src + "?p=" + Date.now(); }
  function icons() {
    generate();
    meta("theme-color", "#04070D"); meta("application-name", "MECADATA"); meta("apple-mobile-web-app-title", "MECADATA");
    probe("icons/favicon-32.png", function () { if (GEN["favicon-32.png"]) link("icon", GEN["favicon-32.png"], { type: "image/png", sizes: "32x32" }); if (GEN["favicon-16.png"]) link("icon", GEN["favicon-16.png"], { type: "image/png", sizes: "16x16" }); });
    probe("icons/apple-touch-icon.png", function () { if (GEN["apple-touch-icon.png"]) link("apple-touch-icon", GEN["apple-touch-icon.png"], { sizes: "180x180" }); });
    probe("icons/icon-192.png", function () {
      if (!GEN["icon-192.png"] || !GEN["icon-512.png"]) return;
      var mf = { id: "/mecadata-expert", name: "MECADATA // INGÉNIEUR EXPERT", short_name: "MECADATA", lang: "fr-FR", start_url: "./index.html", scope: "./", display: "standalone", background_color: "#04070D", theme_color: "#04070D", icons: [{ src: GEN["icon-192.png"], sizes: "192x192", type: "image/png", purpose: "any" }, { src: GEN["icon-512.png"], sizes: "512x512", type: "image/png", purpose: "any" }, { src: GEN["icon-maskable-512.png"], sizes: "512x512", type: "image/png", purpose: "maskable" }] };
      try { link("manifest", URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: "application/manifest+json" }))); } catch (e) {}
    });
    var boot = D.querySelector("#boot svg");
    if (boot && GEN["icon-192.png"]) { var img = D.createElement("img"); img.src = GEN["icon-192.png"]; img.alt = ""; img.width = 60; img.height = 60; img.style.borderRadius = "15px"; img.style.boxShadow = "0 0 36px rgba(255,168,0,.45)"; boot.parentNode.replaceChild(img, boot); }
  }
  function status() {
    var el = D.getElementById("stPwa"); if (!el) return;
    el.classList.toggle("off", navigator.onLine === false);
    el.textContent = navigator.onLine === false ? "HORS LIGNE" : installed ? "INSTALLÉE" : deferred ? "INSTALLABLE" : !isWeb ? "APK / LOCAL" : swReg ? "PWA ACTIVE" : "NAVIGATEUR";
  }
  function installBtnState() { var b = D.getElementById("installb"); if (!b) return; b.hidden = !deferred || installed; b.classList.toggle("inst", !!deferred && !installed); }
  function installBtn() {
    var b = D.getElementById("installb"); if (!b) return;
    b.addEventListener("click", function () {
      if (!deferred) return;
      try { deferred.prompt(); deferred.userChoice.then(function (r) { deferred = null; installBtnState(); status(); }).catch(function () { deferred = null; installBtnState(); status(); }); } catch (e) { deferred = null; installBtnState(); status(); }
    });
  }
  function notifyUpdate(reg) {
    var box = D.getElementById("ts"); if (!box || D.getElementById("pwaUpdate")) return;
    var el = D.createElement("div"); el.className = "to info"; el.id = "pwaUpdate";
    el.innerHTML = "<svg class='ic'><use href='#i-reset'/></svg><div style='flex:1;min-width:0'><b>Mise à jour disponible</b><p>Une nouvelle version est en cache.</p></div><button class='btn xs pri' id='pwaReload'>ACTIVER</button>";
    box.appendChild(el);
    var btn = D.getElementById("pwaReload");
    if (btn) btn.addEventListener("click", function () { try { if (reg.waiting) reg.waiting.postMessage("skipWaiting"); } catch (e) {} setTimeout(function () { location.reload(); }, 220); });
  }
  function sw() {
    if (!isWeb || !("serviceWorker" in navigator)) { status(); return; }
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js", { scope: "./" }).then(function (reg) {
        swReg = reg; status();
        if (reg.waiting) notifyUpdate(reg);
        reg.addEventListener("updatefound", function () { var nw = reg.installing; if (!nw) return; nw.addEventListener("statechange", function () { if (nw.state === "installed" && navigator.serviceWorker.controller) notifyUpdate(reg); }); });
      }).catch(function () { swReg = null; status(); });
    });
  }
  function net() {
    window.addEventListener("online", function () { status(); });
    window.addEventListener("offline", function () { status(); });
  }
  function standalone() {
    try {
      installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
      if (window.matchMedia) { var mq = window.matchMedia("(display-mode: standalone)"); if (mq.addEventListener) mq.addEventListener("change", function (e) { installed = e.matches; installBtnState(); status(); }); }
    } catch (e) {}
  }
  /* ── Case POIDS LOURDS injectée dans le menu tourisme ── */
  function injectPL() {
    if (document.getElementById("plnav")) return;
    var svg = D.querySelector("svg[aria-hidden='true'] defs");
    if (svg && !D.getElementById("i-truck")) {
      var sym = D.createElementNS("http://www.w3.org/2000/svg", "symbol");
      sym.setAttribute("id", "i-truck"); sym.setAttribute("viewBox", "0 0 24 24");
      sym.innerHTML = "<path d='M1 6h12v10H1Z'/><path d='M13 9h5l3 3v4h-8Z'/><circle cx='6' cy='18' r='1.9'/><circle cx='17' cy='18' r='1.9'/><path d='M3 9h6'/></svg>";
      svg.appendChild(sym);
    }
    var rail = D.getElementById("rail");
    if (rail) {
      var a = D.createElement("a");
      a.className = "nv"; a.id = "plnav"; a.href = "pl.html";
      a.innerHTML = "<svg class='ic' style='color:#FF6A00'><use href='#i-truck'/></svg><span>Poids lourds</span><em style='color:#FF6A00;border-color:rgba(255,106,0,.5)'>PL</em>";
      var diag = rail.querySelector("[data-v='diagnostic']");
      if (diag && diag.nextSibling) rail.insertBefore(a, diag.nextSibling); else rail.appendChild(a);
    }
    var tabs = D.getElementById("tabs");
    if (tabs) {
      var t = D.createElement("a");
      t.href = "pl.html";
      t.innerHTML = "<svg class='ic'><use href='#i-truck'/></svg>PL";
      tabs.appendChild(t);
    }
    var top = D.getElementById("top");
    if (top) {
      var b = D.createElement("a");
      b.className = "tb"; b.href = "pl.html"; b.title = "Univers Poids Lourds"; b.setAttribute("aria-label", "Univers Poids Lourds");
      b.innerHTML = "<svg class='ic' style='color:#FF6A00'><use href='#i-truck'/></svg>";
      var ref = D.getElementById("diagb");
      if (ref) top.insertBefore(b, ref); else top.appendChild(b);
    }
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; installBtnState(); status(); });
  window.addEventListener("appinstalled", function () { deferred = null; installed = true; installBtnState(); status(); });
  window.MD_PWA = { icons: GEN, sizes: SIZES, generate: generate, status: status, isWeb: isWeb };
  function boot() { standalone(); icons(); installBtn(); net(); sw(); status(); injectPL(); setTimeout(status, 1200); setTimeout(status, 3600); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();
  window.__MD_SCRIPTS.pwa = true;
})();
