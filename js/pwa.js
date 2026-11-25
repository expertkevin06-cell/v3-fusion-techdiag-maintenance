/* MECADATA v9.1 — couche PWA : icônes PNG générées, service worker, installation, état réseau */
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
    c.strokeStyle = "rgba(37,212,238,.22)"; c.lineWidth = Math.max(1, s * 0.006);
    c.beginPath(); c.arc(s * 0.5, s * 0.5, s * 0.44, 0, Math.PI * 2); c.stroke();
    var k = mask ? 0.68 : 0.86;
    var pts = BOLT.map(function (p) { return [(0.5 + (p[0] - 0.5) * k) * s, (0.5 + (p[1] - 0.5) * k) * s]; });
    function path() { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
    c.save(); c.shadowColor = "rgba(255,168,0,.85)"; c.shadowBlur = s * 0.09;
    path(); c.fillStyle = "#FFA800"; c.fill(); c.restore();
    var g = c.createLinearGradient(0, s * 0.06, 0, s * 0.94);
    g.addColorStop(0, "#FFF5AA"); g.addColorStop(0.45, "#FFD60A"); g.addColorStop(1, "#FFA800");
    path(); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,245,170,.5)"; c.lineWidth = Math.max(1, s * 0.008);
    path(); c.stroke();
    c.restore();
  }
  function make(s, mask) {
    try {
      var cv = D.createElement("canvas"); cv.width = cv.height = s;
      var cx = cv.getContext("2d"); if (!cx) return null;
      draw(cx, s, mask);
      return cv.toDataURL("image/png");
    } catch (e) { return null; }
  }
  function generate() { SIZES.forEach(function (f) { var u = make(f[1], f[2]); if (u) GEN[f[0]] = u; }); }
  function link(rel, href, ex) {
    var l = D.createElement("link"); l.rel = rel; l.href = href;
    if (ex) Object.keys(ex).forEach(function (k) { l.setAttribute(k, ex[k]); });
    D.head.appendChild(l);
  }
  function meta(n, v) {
    var m = D.querySelector("meta[name='" + n + "']");
    if (!m) { m = D.createElement("meta"); m.name = n; D.head.appendChild(m); }
    m.content = v;
  }
  function probe(src, ok, ko) {
    var im = new Image();
    im.onload = function () { ok(); };
    im.onerror = function () { ko(); };
    im.src = src + "?p=" + Date.now();
  }
  function icons() {
    generate();
    meta("theme-color", "#04070D");
    meta("application-name", "MECADATA");
    meta("apple-mobile-web-app-title", "MECADATA");
    meta("msapplication-TileColor", "#04070D");
    probe("icons/favicon-32.png", function () {}, function () {
      if (GEN["favicon-32.png"]) link("icon", GEN["favicon-32.png"], { type: "image/png", sizes: "32x32" });
      if (GEN["favicon-16.png"]) link("icon", GEN["favicon-16.png"], { type: "image/png", sizes: "16x16" });
    });
    probe("icons/apple-touch-icon.png", function () {}, function () {
      if (GEN["apple-touch-icon.png"]) link("apple-touch-icon", GEN["apple-touch-icon.png"], { sizes: "180x180" });
    });
    probe("icons/icon-192.png", function () {}, function () {
      if (!GEN["icon-192.png"] || !GEN["icon-512.png"]) return;
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
      try {
        var b = new Blob([JSON.stringify(mf)], { type: "application/manifest+json" });
        link("manifest", URL.createObjectURL(b));
      } catch (e) {}
    });
    var boot = D.querySelector("#boot svg");
    if (boot && GEN["icon-192.png"]) {
      var img = D.createElement("img");
      img.src = GEN["icon-192.png"]; img.alt = ""; img.width = 60; img.height = 60;
      img.style.borderRadius = "15px";
      img.style.boxShadow = "0 0 36px rgba(255,168,0,.45)";
      boot.parentNode.replaceChild(img, boot);
    }
  }
  function status() {
    var el = D.getElementById("stPwa");
    if (!el) return;
    var off = navigator.onLine === false;
    el.classList.toggle("off", off);
    if (off) { el.textContent = "HORS LIGNE"; return; }
    if (installed) { el.textContent = "INSTALLÉE"; return; }
    if (deferred) { el.textContent = "INSTALLABLE"; return; }
    if (!isWeb) { el.textContent = "APK / LOCAL"; return; }
    el.textContent = swReg ? "PWA ACTIVE" : "NAVIGATEUR";
  }
  function toast(t, m) { if (window.MD_toast) window.MD_toast(t, m.title, m.msg); }
  function installBtn() {
    var b = D.getElementById("installb");
    if (!b) return;
    b.hidden = !deferred || installed;
    b.classList.toggle("inst", !!deferred && !installed);
    b.addEventListener("click", function () {
      if (!deferred) return;
      try {
        deferred.prompt();
        deferred.userChoice.then(function (r) {
          deferred = null;
          installBtnState();
          status();
          if (r && r.outcome === "accepted") toast("ok", { title: "Installation lancée", msg: "MECADATA s'ajoute à l'appareil." });
        }).catch(function () { deferred = null; installBtnState(); status(); });
      } catch (e) { deferred = null; installBtnState(); status(); }
    });
  }
  function installBtnState() {
    var b = D.getElementById("installb");
    if (!b) return;
    b.hidden = !deferred || installed;
    b.classList.toggle("inst", !!deferred && !installed);
  }
  function sw() {
    if (!isWeb || !("serviceWorker" in navigator)) { status(); return; }
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js", { scope: "./" }).then(function (reg) {
        swReg = reg; status();
        if (reg.waiting) notifyUpdate(reg);
        reg.addEventListener("updatefound", function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", function () {
            if (nw.state === "installed" && navigator.serviceWorker.controller) notifyUpdate(reg);
          });
        });
      }).catch(function () { swReg = null; status(); });
      navigator.serviceWorker.addEventListener("controllerchange", function () { status(); });
    });
  }
  function notifyUpdate(reg) {
    var box = D.getElementById("ts");
    if (!box || D.getElementById("pwaUpdate")) return;
    var el = D.createElement("div");
    el.className = "to info"; el.id = "pwaUpdate";
    el.innerHTML = "<svg class='ic'><use href='#i-reset'/></svg><div style='flex:1;min-width:0'><b>Mise à jour disponible</b><p>Une nouvelle version de la console est en cache.</p></div><button class='btn xs pri' id='pwaReload'>ACTIVER</button>";
    box.appendChild(el);
    var btn = D.getElementById("pwaReload");
    if (btn) btn.addEventListener("click", function () {
      try { if (reg.waiting) reg.waiting.postMessage("skipWaiting"); } catch (e) {}
      setTimeout(function () { location.reload(); }, 220);
    });
  }
  function net() {
    window.addEventListener("online", function () { status(); toast("ok", { title: "Connexion rétablie", msg: "Synchronisation possible." }); });
    window.addEventListener("offline", function () { status(); toast("warn", { title: "Hors ligne", msg: "La base en cache reste consultable." }); });
  }
  function standalone() {
    try {
      installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
      if (window.matchMedia) {
        var mq = window.matchMedia("(display-mode: standalone)");
        if (mq.addEventListener) mq.addEventListener("change", function (e) { installed = e.matches; installBtnState(); status(); });
      }
    } catch (e) {}
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; installBtnState(); status(); });
  window.addEventListener("appinstalled", function () { deferred = null; installed = true; installBtnState(); status(); toast("ok", { title: "MECADATA installée", msg: "Application ajoutée à l'appareil." }); });

  window.MD_PWA = { icons: GEN, sizes: SIZES, generate: generate, status: status, isWeb: isWeb };
  function boot() { standalone(); icons(); installBtn(); net(); sw(); status(); setTimeout(status, 1200); setTimeout(status, 3600); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();
  window.__MD_SCRIPTS.pwa = true;
})();
