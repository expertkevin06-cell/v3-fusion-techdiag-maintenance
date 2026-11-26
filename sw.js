"use strict";
/* MECADATA sw v16 — network-first pour index.html et js/*.js :
   le code frais gagne toujours, le cache ne sert qu'en secours hors-ligne.
   Le changement de VERSION supprime automatiquement les anciens caches
   (cause du app.js périmé qui rejouait la SyntaxError 'catch'). */
var VERSION = "mecadata-v16";
var CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./js/data.js?v=16",
  "./js/app.js?v=16",
  "./js/pwa.js?v=16",
  "./icons/icon.svg"
];
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(CORE.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { if (k !== VERSION) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* Navigation : réseau d'abord, repli cache */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(VERSION).then(function (c) { c.put("./index.html", copy); });
        return r;
      }).catch(function () {
        return caches.match("./index.html").then(function (r) { return r || new Response("Hors ligne", { status: 503 }); });
      })
    );
    return;
  }
  var path = url.pathname;
  var isScript = /\.js(\?|$)/.test(path) || path.indexOf("/js/") > -1;
  var isDoc = /\.html?(\?|$)/.test(path);
  /* Scripts et pages : network-first (code toujours à jour) */
  if (isScript || isDoc) {
    e.respondWith(
      fetch(req).then(function (r) {
        if (r && r.status === 200 && r.type === "basic") {
          var copy = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return r;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || new Response("", { status: 503 }); });
      })
    );
    return;
  }
  /* Le reste (icônes, manifest, données) : cache-first + mise en cache progressive */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (r) {
        if (r && r.status === 200 && r.type === "basic") {
          var copy = r.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return r;
      }).catch(function () { return new Response("", { status: 404 }); });
    })
  );
});
self.addEventListener("message", function (e) {
  if (e.data === "skipWaiting") self.skipWaiting();
});
