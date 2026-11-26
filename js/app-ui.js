/* MECADATA v17 — partie 2 : rendu, portail, événements, autovérification, init.
   Chargé APRÈS js/app.js (partage des globales, scripts classiques). */
"use strict";

function sevTag(s) {
  s = nsev(s);
  return "<span class='sev " + (s === "modérée" ? "mode" : esc(s)) + "'>" + esc(s) + "</span>";
}
function fuelTag(f) {
  var x = FU[nfuel(f)] || { l: f, c: "#9FB2C8" };
  return "<span class='fuel' style='--fc:" + x.c + "'>" + x.l + "</span>";
}
function iviPill(v) {
  var l = IVL(v);
  return "<span class='ivp' style='--ic:" + l[1] + "'><i></i>IVI " + num(v, 0) + "</span>";
}
function corrRow(e) {
  var F = FU[e.fuel] || { c: "#FFD60A" };
  var b = brandOf(e), m = modelOf(e);
  return "<button class='corr' style='--fc:" + F.c + "' data-act='openEng' data-id='" + esc(e.id) + "'>" +
    "<div style='min-width:0'><b>" + esc((b ? b.n : "") + " " + (m ? m.n : "")) + "</b>" +
    "<small>" + esc(e.label) + " · " + esc(e.code) + "</small></div>" +
    "<span class='hp'>" + e.hp + "</span></button>";
}
function faultCard(f, hist, full) {
  if (!f) { return ""; }
  var kk = kmOf(f), yy = yOf(f), cc = costOf(f);
  var c = (SV[f.sev] || SV["modérée"]).c;
  var h = "<div class='fcard' style='--sc:" + c + (hist ? ";opacity:.6" : "") + "'>";
  h += "<div class='fh'><b>" + esc(f.t) + "</b>" + sevTag(f.sev) + "</div>";
  h += "<div class='tags'><span class='tag'>" + esc(f.dom) + "</span>";
  h += "<span class='tag'>" + yy.join("-") + "</span>";
  h += "<span class='tag'>" + fmt(kk[0]) + "–" + fmt(kk[1]) + " km</span>";
  h += "<span class='tag'>fréq. " + esc(f.freq) + "</span></div>";
  if (arr(f.sym).length) {
    h += "<div class='tags'>" + arr(f.sym).map(function (s) { return "<span class='tag'>" + esc(s) + "</span>"; }).join("") + "</div>";
  }
  h += "<p><b>Cause :</b> " + esc(f.cause) + "</p>";
  h += "<p><b>Action :</b> " + esc(f.fix) + "</p>";
  h += "<div class='cost'>" + ic("euro", "width:13px;height:13px");
  h += (cc[1] === 0 ? "Prise en charge / campagne" : fmt(cc[0]) + " – " + fmt(cc[1]) + " €") + "</div>";
  if (!full) {
    h += "<div style='margin-top:8px'><button class='btn xs ghost' data-act='openFault' data-id='" + esc(f.id) + "'>Détail & motorisations</button></div>";
  }
  return h + "</div>";
}
function tsbCard(t, full) {
  if (!t) { return ""; }
  var rc = isRecall(t);
  var h = "<div class='tsb" + (rc ? " rc" : "") + "'>";
  h += "<div style='display:flex;gap:7px;flex-wrap:wrap'><span class='ref'>" + esc(t.ref) + "</span>";
  h += sevTag(t.sev);
  h += "<span class='tag'>" + esc(t.cat) + "</span><span class='tag mono'>" + esc(t.date) + "</span></div>";
  h += "<b>" + esc(t.t) + "</b><p>" + esc(t.sum) + "</p>";
  h += "<div class='act'><b>ACTION :</b> " + esc(t.act) + "</div>";
  if (!full) {
    h += "<div style='margin-top:8px'><button class='btn xs ghost' data-act='openTsb' data-id='" + esc(t.id) + "'>Périmètre</button></div>";
  }
  return h + "</div>";
}
function mountAnim(sc) {
  $$(".brow .bt i", sc).forEach(function (i) { i.style.width = i.dataset.w; });
}
function openDetail(kind, id) {
  var head = "", body = "";
  if (kind === "engine") {
    var e = EIDX[id];
    if (!e) { return; }
    var b = brandOf(e), m = modelOf(e);
    var fs = faultsFor(e), ts = tsbFor(e), rc = ts.filter(isRecall);
    var v = ivi(e), L = IVL(v);
    var pl = buildPlan(e, m, b);
    head = (b ? b.n + " " : "") + (m ? m.n + " — " : "") + e.label;
    body = "<div class='sg'>" + [["Code", e.code], ["Famille", e.fam], ["Cylindrée", e.disp ? fmt(e.disp) + " cm³" : "—"], ["Puissance", e.hp + " ch / " + e.kw + " kW"], ["Couple", e.nm + " Nm"], ["Boîte", e.gb], ["Norme", e.norm], ["Production", yOf(e).join("-")], ["Modèle", m ? m.n : "—"], ["Phase", m ? m.phase : "—"], ["Région", b ? REGIONS[b.region] : "—"], ["IVI", v + " · " + L[0]]].map(function (r) {
      return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";
    body += "<div style='margin:12px 0'><button class='btn sm pri' data-act='selEng' data-id='" + esc(e.id) + "'>" + ic("wrench") + "Plan 200 000 km</button>";
    if (isAdmin()) { body += " <button class='btn sm ghost' data-act='expEng' data-id='" + esc(e.id) + "'>" + ic("dl") + "Exporter</button>"; }
    body += "</div>";
    body += "<h3 style='font:600 14px var(--gd);margin:10px 0 8px;color:#FFD60A'>Pannes (" + fs.length + ")</h3>";
    body += fs.length ? fs.slice(0, 12).map(function (f) { return faultCard(f, !f.active, true); }).join("") : "<p class='dim'>Aucune.</p>";
    body += "<h3 style='font:600 14px var(--gd);margin:10px 0 8px;color:#FFD60A'>Rappels & TSB (" + ts.length + ")</h3>";
    body += ts.length ? ts.slice(0, 12).map(function (t) { return tsbCard(t, true); }).join("") : "<p class='dim'>Aucun.</p>";
    body += "<h3 style='font:600 14px var(--gd);margin:10px 0 8px;color:#FFD60A'>Entretien (extrait)</h3><div class='tags'>" + pl.svc.items.slice(0, 10).map(function (it) {
      return "<span class='tag'>" + esc(it[0]) + (it[1] ? " · " + fmt(it[1]) + " km" : "") + "</span>";
    }).join("") + "</div>";
  } else if (kind === "fault") {
    var f = null;
    arr(DB.faults).forEach(function (x) { if (x && x.id === id) { f = x; } });
    if (!f) { return; }
    var af = engForFault(f);
    head = f.t;
    body = faultCard(f, false, true);
    body += "<h3 style='font:600 14px var(--gd);margin:12px 0 8px;color:#FFD60A'>Motorisations corrélées (" + af.length + ")</h3>";
    body += af.length ? af.slice(0, 30).map(corrRow).join("") : "<p class='dim'>Aucune.</p>";
  } else {
    var t = null;
    arr(DB.tsb).forEach(function (x) { if (x && x.id === id) { t = x; } });
    if (!t) { return; }
    var at = engForTsb(t);
    head = t.t;
    body = tsbCard(t, true);
    body += "<h3 style='font:600 14px var(--gd);margin:12px 0 8px;color:#FFD60A'>Périmètre corrélé (" + at.length + ")</h3>";
    body += at.length ? at.slice(0, 30).map(corrRow).join("") : "<p class='dim'>Aucun.</p>";
  }
  openModal("<div class='mh'>" + ic("info") + "<h3>" + esc(head) + "</h3><button class='tb' data-act='mclose'>" + ic("x") + "</button></div><div class='mb2'>" + body + "</div><div class='mf'><button class='btn pri' data-act='mclose'>Fermer</button></div>", "wide");
}

/* ---------- recherche prédictive ---------- */
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
function score(qn, hay) {
  var h = nk(hay);
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
function omniSearch(q) {
  var qn = nk(q);
  var syn = [];
  var hits = [], famSet = {}, brSet = {};
  var i, j;
  String(q || "").toLowerCase().split(/[\s,;]+/).filter(Boolean).forEach(function (w) {
    var k = nk(w);
    if (SYN[k]) { syn = syn.concat(SYN[k]); }
  });
  var wR = qn.indexOf("rappel") > -1;
  var wT = qn.indexOf("tsb") > -1;
  var wF = qn.indexOf("panne") > -1;
  arr(DB.engines).forEach(function (e) {
    var b = brandOf(e), m = modelOf(e);
    var hay = [(b ? b.n : ""), (m ? m.n : ""), "phase " + (m ? m.phase : ""), e.code, e.fam, e.label, (b ? REGIONS[b.region] : "")].join(" ");
    var sc = score(qn, hay);
    if (!sc && syn.length) {
      for (j = 0; j < syn.length; j++) {
        if (nk(e.fam + e.code + e.gb).indexOf(nk(syn[j])) > -1) { sc = 62; break; }
      }
    }
    if (sc > 0) {
      famSet[e.fam] = 1;
      if (m) { brSet[m.b] = 1; }
      hits.push({ kind: "engine", id: e.id, score: sc + 6, title: engName(e), sub: e.code + " · " + e.hp + " ch · phase " + (m ? m.phase : 1), color: (FU[e.fuel] || {}).c || "#FFD60A", badge: "MOTEUR" });
    }
  });
  arr(DB.faults).forEach(function (f) {
    var kk = kmOf(f);
    var hay = [f.t, arr(f.fam).join(" "), arr(f.mt).join(" "), f.cause, f.fix, arr(f.sym).join(" "), f.dom].join(" ");
    var sc = score(qn, hay);
    if (!sc) {
      for (j = 0; j < arr(f.fam).length; j++) {
        if (famSet[f.fam[j]]) { sc = 66; break; }
      }
    }
    if (!sc && syn.length) {
      for (j = 0; j < syn.length; j++) {
        if (nk(hay).indexOf(nk(syn[j])) > -1) { sc = 58; break; }
      }
    }
    if (sc > 0) {
      hits.push({ kind: "fault", id: f.id, score: sc + (wF ? 26 : 0) + (SV[f.sev] || SV["modérée"]).w * 0.6, title: f.t, sub: f.sev + " · " + f.dom + " · " + fmt(kk[0]) + "-" + fmt(kk[1]) + " km", color: (SV[f.sev] || SV["modérée"]).c, badge: "PANNE" });
    }
  });
  arr(DB.tsb).forEach(function (t) {
    var rc = isRecall(t);
    var hay = [t.t, t.ref, arr(t.fam).join(" "), arr(t.mt).join(" "), t.sum, t.cat].join(" ");
    var sc = score(qn, hay);
    if (!sc) {
      for (j = 0; j < arr(t.fam).length; j++) {
        if (famSet[t.fam[j]]) { sc = 64; break; }
      }
    }
    if (!sc) {
      for (j = 0; j < arr(t.b).length; j++) {
        if (brSet[t.b[j]]) { sc = 48; break; }
      }
    }
    if (sc > 0) {
      hits.push({ kind: "tsb", id: t.id, score: sc + (wR && rc ? 34 : wT && !rc ? 30 : 0) + (rc ? 12 : 0), title: t.t, sub: t.ref + " · " + t.date, color: rc ? "#FFD60A" : "#4D8DFF", badge: rc ? "RAPPEL" : "TSB" });
    }
  });
  arr(DB.models).forEach(function (m) {
    var b = BIDX[m.b];
    var sc = score(qn, (b ? b.n + " " : "") + m.n + " phase " + m.phase);
    if (sc > 0) {
      hits.push({ kind: "model", id: m.id, score: sc + 4, title: (b ? b.n + " " : "") + m.n, sub: "phase " + m.phase + " · " + yOf(m).join("-"), color: "#4D8DFF", badge: "MODÈLE" });
    }
  });
  arr(DB.brands).forEach(function (b) {
    var sc = score(qn, b.n + " " + b.pays + " " + REGIONS[b.region]);
    if (sc > 0) {
      hits.push({ kind: "brand", id: b.id, score: sc, title: b.n, sub: REGIONS[b.region], color: "#25D4EE", badge: "MARQUE" });
    }
  });
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
function hl(t, q) {
  var n = String(q || "").trim();
  if (!n) { return esc(t); }
  var i = String(t).toLowerCase().indexOf(n.toLowerCase());
  if (i < 0) { return esc(t); }
  return esc(String(t).slice(0, i)) + "<mark>" + esc(String(t).slice(i, i + n.length)) + "</mark>" + esc(String(t).slice(i + n.length));
}
function omniRender() {
  var box = $("#omnires");
  if (!box) { return; }
  var q = S.omni.q;
  if (!q || q.trim().length < 2) {
    box.innerHTML = "<div class='grp'>RECHERCHE PRÉDICTIVE MASSIVE</div><div class='hint'>" + ["3008 courroie", "3008 rappel", "AdBlue SCR", "EGR FAP", "EAT8", "Ioniq ICCU", "CVT", "P20E8"].map(function (s) {
      return "<button data-act='omniSeed' data-q='" + esc(s) + "'>" + esc(s) + "</button>";
    }).join("") + "</div>";
    box.classList.add("on");
    return;
  }
  var hits = omniSearch(q);
  S.omni.hits = hits;
  S.omni.idx = hits.length ? 0 : -1;
  if (!hits.length) {
    box.innerHTML = "<div class='grp'>AUCUN RÉSULTAT</div>";
    box.classList.add("on");
    return;
  }
  var html = "";
  ["fault", "tsb", "engine", "model", "brand"].forEach(function (k) {
    var g = hits.filter(function (x) { return x.kind === k; });
    if (!g.length) { return; }
    html += "<div class='grp'>" + { fault: "PANNES", tsb: "RAPPELS / TSB", engine: "MOTORISATIONS", model: "MODÈLES", brand: "MARQUES" }[k] + " · " + g.length + "</div>";
    g.forEach(function (it) {
      html += "<button class='hit" + (hits.indexOf(it) === S.omni.idx ? " sel" : "") + "' data-act='omniHit' data-kind='" + it.kind + "' data-id='" + esc(it.id) + "'>";
      html += "<span class='k' style='color:" + it.color + "'>" + it.badge + "</span>";
      html += "<span class='tx'><b>" + hl(it.title, q) + "</b><small>" + esc(it.sub) + "</small></span></button>";
    });
  });
  box.innerHTML = html;
  box.classList.add("on");
}
function omniClose() {
  var b = $("#omnires");
  if (b) { b.classList.remove("on"); }
  S.omni.idx = -1;
}
function omniGo(kind, id) {
  omniClose();
  if (kind === "engine" || kind === "fault" || kind === "tsb") {
    openDetail(kind, id);
  } else if (kind === "model") {
    var m = MIDX[id];
    if (m) {
      S.sel = { b: m.b, m: m.id, e: "" };
      location.hash = "#/explorer";
      render();
    }
  } else {
    S.sel = { b: id, m: "", e: "" };
    location.hash = "#/explorer";
    render();
  }
}

/* ---------- sélections & filtres ---------- */
function selEngine() { return S.sel.e ? (EIDX[S.sel.e] || null) : null; }
function modelsOf(b) {
  return arr(DB.models).filter(function (m) { return m.b === b; }).sort(function (a, b2) { return a.n.localeCompare(b2.n); });
}
function enginesOf(mid) {
  return arr(DB.engines).filter(function (e) { return arr(e.m).indexOf(mid) > -1; }).sort(function (a, b) { return a.hp - b.hp; });
}
function results() {
  var f = S.f;
  var q = nk(f.q);
  var l = arr(DB.engines).filter(function (e) {
    var m = modelOf(e), b = brandOf(e);
    if (S.sel.b && (!m || m.b !== S.sel.b)) { return false; }
    if (S.sel.m && arr(e.m).indexOf(S.sel.m) < 0) { return false; }
    if (S.sel.e && e.id !== S.sel.e) { return false; }
    if (f.region && b && b.region !== f.region) { return false; }
    if (arr(f.fuel).length && arr(f.fuel).indexOf(e.fuel) < 0) { return false; }
    if (q && nk([(b ? b.n : ""), (m ? m.n : ""), e.code, e.fam, e.label].join(" ")).indexOf(q) < 0) { return false; }
    return true;
  });
  var so = {
    brand: function (a, b) { return ((brandOf(a) || {}).n || "").localeCompare((brandOf(b) || {}).n || "") || b.hp - a.hp; },
    hpdesc: function (a, b) { return b.hp - a.hp; },
    year: function (a, b) { return yOf(b)[0] - yOf(a)[0]; },
    ivi: function (a, b) { return ivi(b) - ivi(a); }
  };
  return l.sort(so[f.sort] || so.brand);
}
function engCard(e) {
  var F = FU[e.fuel] || { c: "#FFD60A" };
  var b = brandOf(e), m = modelOf(e);
  var v = ivi(e);
  var nf = faultsFor(e).filter(function (f) { return f.sev !== "info"; }).length;
  var ts = tsbFor(e);
  var nr = ts.filter(isRecall).length;
  var h = "<article class='card hov eng' style='--fc:" + F.c + "' data-act='openEng' data-id='" + esc(e.id) + "' tabindex='0'>";
  h += "<div class='top'><span class='br'>" + esc(b ? b.n : "—") + "</span>" + fuelTag(e.fuel);
  h += "<span class='tag' style='margin-left:auto'>phase " + (m ? m.phase : 1) + "</span></div>";
  h += "<h4>" + esc(m ? m.n : "") + "</h4><div class='lbl'>" + esc(e.label) + "</div>";
  h += "<div class='pw'><b>" + e.hp + "</b><span>ch · " + e.kw + " kW</span><span style='margin-left:auto'>" + e.nm + " Nm</span></div>";
  h += "<div class='meta'><span class='tag mono'>" + esc(e.code) + "</span><span class='tag'>" + yOf(e).join("-") + "</span><span class='tag'>" + esc(e.gb) + "</span>";
  if (nr) { h += "<span class='tag' style='color:#FFD60A'>" + nr + " rappel(s)</span>"; }
  h += "</div><div class='ft'><span>" + nf + " panne(s)</span><span>" + ts.length + " bulletin(s)</span>" + iviPill(v) + "</div></article>";
  return h;
}

/* ---------- vues ---------- */
function vBord() {
  var c = META.counts;
  var h = "<div class='hero'><span class='kick'>MODULE 01 — POSTE DE BORD</span>";
  h += "<h2>MÉGA-BASE <i>2017 → 2027</i><br>" + fmt(c.b) + " marques · " + fmt(c.m) + " modèles · " + fmt(c.e) + " motorisations</h2>";
  h += "<p>" + fmt(c.f) + " pannes, " + fmt(c.t) + " bulletins dont <b style='color:#FFD60A'>" + fmt(c.rc) + " rappels</b>. Couverture puissances " + META.cover + " %. Recherche auto : " + AUTO.st.runs + " balayage(s), " + fmt(AUTO.st.added.m + AUTO.st.added.e + AUTO.st.added.f + AUTO.st.added.t) + " complément(s).</p>";
  h += "<div class='hint' style='padding:9px 0 0'>" + ["3008 courroie", "3008 rappel", "AdBlue SCR", "EGR FAP", "EAT8", "Ioniq ICCU", "CVT", "P20E8"].map(function (s) {
    return "<button data-act='omniSeed' data-q='" + esc(s) + "'>" + esc(s) + "</button>";
  }).join("") + "</div>";
  h += "<div class='acts'><a class='btn pri' href='#/explorer'>" + ic("car") + "Sélection du parc</a>";
  h += "<button class='btn grn' data-act='goDiag'>" + ic("stetho") + "Autovérification</button>";
  if (isAdmin()) {
    h += "<button class='btn amb' data-act='goAdmin'>" + ic("db") + "Administration</button>";
    h += "<button class='btn ghost' data-act='autoNow'>" + ic("spark") + "Recherche auto</button>";
    h += "<button class='btn ghost' data-act='saveNow'>" + ic("save") + "Sauvegarde locale</button>";
  }
  h += "<a class='btn' href='#/studio'>" + ic("spark") + "Studio</a></div>";
  h += "<div class='banner' style='margin:13px 0 0'>" + ic("reset", "width:14px;height:14px;color:#43E08B") + "<b>Cache purgé à l'ouverture</b><span class='dim mono' style='font-size:10.5px'>" + esc(purgeLabel()) + "</span><button class='btn xs ghost' data-act='purge'>PURGER</button></div></div>";
  h += "<div class='kpis'>" + [["db", "MARQUES", c.b, "#25D4EE"], ["car", "MODÈLES", c.m, "#4D8DFF"], ["piston", "MOTORISATIONS", c.e, "#E45CFF"], ["alert", "PANNES", c.f, "#FF4D5E"], ["bell", "RAPPELS", c.rc, "#FFD60A"], ["wrench", "DOMAINES", c.dom, "#43E08B"]].map(function (k) {
    return "<div class='card kpi' style='--kc:" + k[3] + "'>" + ic(k[0]) + "<b>" + fmt(k[2]) + "</b><span>" + k[1] + "</span></div>";
  }).join("") + "</div>";
  var regs = Object.keys(REGIONS).map(function (r) { return [r, META.regions[r] || 0]; });
  var rm = Math.max(1, Math.max.apply(null, regs.map(function (x) { return x[1]; })));
  h += "<div class='g2'><div class='card panel'><h3>Marques par région</h3><div class='bars'>";
  h += regs.map(function (x) {
    return "<div class='brow'><span class='bl'>" + REGIONS[x[0]] + "</span><div class='bt'><i data-w='" + Math.round(x[1] / rm * 100) + "%'></i></div><b>" + x[1] + "</b></div>";
  }).join("");
  h += "</div></div>";
  var fc = Object.keys(FU).map(function (f) {
    return [f, arr(DB.engines).filter(function (e) { return e.fuel === f; }).length];
  }).filter(function (x) { return x[1]; });
  var mx = Math.max(1, Math.max.apply(null, fc.map(function (x) { return x[1]; })));
  h += "<div class='card panel'><h3>Énergies du parc</h3><div class='bars'>";
  h += fc.map(function (x) {
    return "<div class='brow'><span class='bl'>" + FU[x[0]].l + "</span><div class='bt'><i data-w='" + Math.round(x[1] / mx * 100) + "%' style='--bc:" + FU[x[0]].c + "'></i></div><b>" + fmt(x[1]) + "</b></div>";
  }).join("");
  h += "</div></div></div>";
  return h;
}
function vExplorer() {
  var h = "<div class='vh'><div><span class='kick'>MODULE 02 — PARC 2017 → 2027</span><h1>SÉLECTION <i>PRÉCISE</i></h1>";
  h += "<div class='sub'>Marque → Modèle (phase) → Motorisation (puissance). Alimente le plan 200 000 km du module 4.</div></div></div>";
  h += "<div class='exwrap'><div class='card filters'>";
  h += "<div class='fsec'><label class='lb'>Région</label><select class='sel' data-f='region'><option value=''>Toutes</option>";
  h += Object.keys(REGIONS).map(function (r) {
    return "<option value='" + r + "'" + (S.f.region === r ? " selected" : "") + ">" + REGIONS[r] + "</option>";
  }).join("") + "</select></div>";
  var brands = arr(DB.brands).filter(function (b) { return !S.f.region || b.region === S.f.region; });
  h += "<div class='fsec'><label class='lb'>1 · Marque</label><select class='sel' data-sel='b'><option value=''>Toutes (" + brands.length + ")</option>";
  h += brands.map(function (b) {
    return "<option value='" + esc(b.id) + "'" + (S.sel.b === b.id ? " selected" : "") + ">" + esc(b.n) + " (" + (META.byBrand[b.id] || 0) + ")</option>";
  }).join("") + "</select></div>";
  var mods = S.sel.b ? modelsOf(S.sel.b) : [];
  h += "<div class='fsec'><label class='lb'>2 · Modèle & phase</label><select class='sel' data-sel='m'" + (S.sel.b ? "" : " disabled") + "><option value=''>" + (S.sel.b ? mods.length + " modèle(s)" : "Choisir une marque") + "</option>";
  h += mods.map(function (m) {
    return "<option value='" + esc(m.id) + "'" + (S.sel.m === m.id ? " selected" : "") + ">" + esc(m.n) + " · phase " + m.phase + " · " + yOf(m).join("-") + "</option>";
  }).join("") + "</select></div>";
  var engs = S.sel.m ? enginesOf(S.sel.m) : [];
  h += "<div class='fsec'><label class='lb'>3 · Motorisation & puissance</label><select class='sel' data-sel='e'" + (S.sel.m ? "" : " disabled") + "><option value=''>" + (S.sel.m ? engs.length + " motorisation(s)" : "Choisir un modèle") + "</option>";
  h += engs.map(function (e) {
    return "<option value='" + esc(e.id) + "'" + (S.sel.e === e.id ? " selected" : "") + ">" + esc(e.label) + " · " + e.hp + " ch · " + esc(e.code) + "</option>";
  }).join("") + "</select></div>";
  h += "<div class='fsec'><label class='lb'>Recherche</label><input class='inp' type='search' data-f='q' value='" + esc(S.f.q) + "'></div>";
  h += "<div class='fsec'><label class='lb'>Énergie</label><div class='chipset'>" + Object.keys(FU).map(function (k) {
    return "<button class='fc" + (arr(S.f.fuel).indexOf(k) > -1 ? " on" : "") + "' style='--fc:" + FU[k].c + "' data-act='ffuel' data-k='" + k + "'>" + FU[k].l + "</button>";
  }).join("") + "</div></div>";
  h += "<div class='fsec'><button class='btn sm ghost' data-act='resetSel' style='width:100%'>" + ic("reset") + "Réinitialiser</button></div></div><div>";
  var e = selEngine();
  if (e) {
    var m = modelOf(e), b = brandOf(e);
    var fs = faultsFor(e), ts = tsbFor(e), nr = ts.filter(isRecall).length;
    var v = ivi(e), L = IVL(v);
    h += "<div class='selcard'><h3>" + ic("check", "width:16px;height:16px") + "SÉLECTION — " + esc((b ? b.n + " " : "") + (m ? m.n : "")) + " · " + esc(e.label) + "</h3>";
    h += "<div class='sg'>" + [["Région", b ? REGIONS[b.region] : "—"], ["Phase", m ? m.phase : "—"], ["Code", e.code], ["Puissance", e.hp + " ch"], ["Couple", e.nm + " Nm"], ["Boîte", e.gb], ["Pannes", fs.length], ["Rappels", nr], ["IVI", v + " " + L[0]]].map(function (r) {
      return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";
    h += "<div style='margin-top:11px'><button class='btn pri sm' data-act='goPlan'>" + ic("wrench") + "Plan 200 000 km</button> ";
    h += "<button class='btn sm ghost' data-act='openEng' data-id='" + esc(e.id) + "'>Fiche</button></div></div>";
  }
  var l = results();
  var s2 = l.slice(0, S.shown);
  h += "<div class='bar'><span class='cnt'>" + fmt(l.length) + " motorisation(s)</span>";
  h += "<select class='sel' data-f='sort' style='margin-left:auto;width:auto'>";
  h += [["brand", "Marque A-Z"], ["hpdesc", "Puissance ↓"], ["year", "Année ↓"], ["ivi", "Vigilance ↓"]].map(function (o) {
    return "<option value='" + o[0] + "'" + (S.f.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
  }).join("") + "</select></div>";
  h += "<div class='eg'>" + (s2.length ? s2.map(engCard).join("") : "<div class='empty' style='grid-column:1/-1'>Aucune motorisation.</div>") + "</div>";
  h += "<div class='more'>" + (l.length > S.shown ? "<button class='btn ghost' data-act='more'>Afficher plus (" + (l.length - S.shown) + ")</button>" : "") + "</div></div></div>";
  return h;
}
function vTech() {
  var L = S.tech;
  var nr = arr(DB.tsb).filter(isRecall).length;
  var h = "<div class='vh'><div><span class='kick'>MODULE 03 — RECHERCHE EXTRÊME</span><h1>PANNES · TSB · <i>RAPPELS</i></h1></div></div>";
  h += "<div class='atabs'>" + [["faults", "PANNES (" + META.counts.f + ")"], ["tsb", "TSB (" + (META.counts.t - nr) + ")"], ["recalls", "RAPPELS (" + nr + ")"]].map(function (t) {
    return "<button class='at" + (L.tab === t[0] ? " on" : "") + "' data-act='techTab' data-t='" + t[0] + "'>" + t[1] + "</button>";
  }).join("") + "</div>";
  h += "<div class='card panel' style='margin-bottom:12px'><div class='fr f4'>";
  h += "<div><label class='lb'>Texte / code défaut</label><input class='inp' data-tf='q' value='" + esc(L.q) + "'></div>";
  h += "<div><label class='lb'>Région</label><select class='sel' data-tf='region'><option value=''>Toutes</option>" + Object.keys(REGIONS).map(function (r) {
    return "<option value='" + r + "'" + (L.region === r ? " selected" : "") + ">" + REGIONS[r] + "</option>";
  }).join("") + "</select></div>";
  h += "<div><label class='lb'>Marque</label><select class='sel' data-tf='brand'><option value=''>Toutes</option>" + arr(DB.brands).filter(function (b) { return !L.region || b.region === L.region; }).map(function (b) {
    return "<option value='" + esc(b.id) + "'" + (L.brand === b.id ? " selected" : "") + ">" + esc(b.n) + "</option>";
  }).join("") + "</select></div>";
  h += "<div><label class='lb'>Modèle</label><select class='sel' data-tf='model'" + (L.brand ? "" : " disabled") + "><option value=''>Tous</option>";
  if (L.brand) {
    h += modelsOf(L.brand).map(function (m) {
      return "<option value='" + esc(m.id) + "'" + (L.model === m.id ? " selected" : "") + ">" + esc(m.n) + "</option>";
    }).join("");
  }
  h += "</select></div></div>";
  h += "<div class='fr f4' style='margin-top:10px'>";
  h += "<div><label class='lb'>Phase</label><select class='sel' data-tf='phase'><option value=''>Toutes</option>" + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (p) {
    return "<option value='" + p + "'" + (L.phase === String(p) ? " selected" : "") + ">" + p + "</option>";
  }).join("") + "</select></div>";
  h += "<div><label class='lb'>Sévérité</label><select class='sel' data-tf='sev'><option value=''>Toutes</option>" + Object.keys(SV).map(function (s) {
    return "<option value='" + esc(s) + "'" + (L.sev === s ? " selected" : "") + ">" + s + "</option>";
  }).join("") + "</select></div>";
  var doms = {};
  arr(DB.faults).forEach(function (f) { doms[f.dom] = 1; });
  arr(DB.tsb).forEach(function (t) { doms[t.dom] = 1; });
  h += "<div><label class='lb'>Domaine</label><select class='sel' data-tf='dom'><option value=''>Tous</option>" + Object.keys(doms).sort().map(function (d) {
    return "<option value='" + esc(d) + "'" + (L.dom === d ? " selected" : "") + ">" + esc(d) + "</option>";
  }).join("") + "</select></div>";
  h += "<div><label class='lb'>Km véhicule</label><input class='inp mono' type='number' data-tf='km' value='" + esc(L.km) + "'></div></div></div>";
  var q = nk(L.q);
  var kmv = num(L.km, 0);
  var tm = L.model ? MIDX[L.model] : null;
  function ok(it) {
    if (!it) { return false; }
    if (L.region) {
      var r2 = false;
      arr(it.b).forEach(function (x) { if (BIDX[x] && BIDX[x].region === L.region) { r2 = true; } });
      if (!r2 && arr(it.fam).length) {
        r2 = arr(DB.engines).some(function (e) {
          var b = brandOf(e);
          return b && b.region === L.region && arr(it.fam).indexOf(e.fam) > -1;
        });
      }
      if (!r2 && arr(it.mt).length) {
        r2 = arr(DB.models).some(function (m) {
          var b = BIDX[m.b];
          return b && b.region === L.region && tokHit(it.mt, m.n);
        });
      }
      if (!r2) { return false; }
    }
    if (L.brand) {
      var hit = false;
      if (arr(it.mt).length) {
        hit = modelsOf(L.brand).some(function (m) { return tokHit(it.mt, m.n); });
      }
      if (!hit && arr(it.b).indexOf(L.brand) > -1) { hit = true; }
      if (!hit && arr(it.fam).length) {
        hit = arr(DB.engines).some(function (e) {
          var m = modelOf(e);
          return m && m.b === L.brand && arr(it.fam).indexOf(e.fam) > -1;
        });
      }
      if (!hit) { return false; }
    }
    if (tm && !tokHit(it.mt, tm.n)) {
      var fh = enginesOf(tm.id).some(function (e) { return arr(it.fam).indexOf(e.fam) > -1; });
      if (!fh) { return false; }
    }
    if (L.phase && arr(it.ph).length && arr(it.ph).indexOf("*") < 0 && arr(it.ph).indexOf(L.phase) < 0) { return false; }
    if (L.sev && it.sev !== L.sev) { return false; }
    if (L.dom && it.dom !== L.dom) { return false; }
    if (kmv) {
      var kk = kmOf(it);
      if (kmv < kk[0] || kmv > kk[1]) { return false; }
    }
    if (q) {
      var hay = [it.t, it.ref, it.cause, it.fix, it.sum, it.act, arr(it.sym).join(" "), arr(it.fam).join(" "), it.dom].join(" ");
      if (nk(hay).indexOf(q) < 0) { return false; }
    }
    return true;
  }
  var out = [];
  if (L.tab === "faults") {
    out = arr(DB.faults).filter(ok).sort(function (a, b) { return SV[b.sev].w - SV[a.sev].w; });
  } else {
    out = arr(DB.tsb).filter(function (t) {
      var rc = isRecall(t);
      if (L.tab === "recalls" && !rc) { return false; }
      if (L.tab === "tsb" && rc) { return false; }
      return ok(t);
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }
  h += "<div class='bar'><span class='cnt'>" + out.length + " résultat(s)</span></div>";
  h += "<div class='eg' style='grid-template-columns:repeat(auto-fill,minmax(340px,1fr))'>";
  if (out.length) {
    h += out.slice(0, 120).map(function (x) {
      return "<div>" + (L.tab === "faults" ? faultCard(x, false, false) : tsbCard(x, false)) + "</div>";
    }).join("");
  } else {
    h += "<div class='empty' style='grid-column:1/-1'>Aucun résultat.</div>";
  }
  h += "</div>";
  return h;
}
function vEntretien() {
  var e = selEngine();
  var h = "<div class='vh'><div><span class='kick'>MODULE 04 — ENTRETIEN 200 000 KM</span><h1>PLAN <i>PAR MOTORISATION</i></h1></div>";
  h += "<a class='btn sm ghost' href='#/explorer'>" + ic("car") + "Modifier</a></div>";
  if (!e) {
    h += "<div class='empty'>" + ic("wrench") + "<p><b>Aucune motorisation sélectionnée.</b></p>";
    h += "<a class='btn pri sm' href='#/explorer' style='margin-top:10px'>Ouvrir le parc</a></div>";
    return h;
  }
  var m = modelOf(e), b = brandOf(e);
  var pl = buildPlan(e, m, b);
  var s = pl.svc;
  var fl = arr(s.fluids).concat(["—", "—", "—", "—", "—", "—", "—"]).slice(0, 7);
  h += "<div class='selcard'><h3>" + ic("car", "width:16px;height:16px") + esc((b ? b.n + " " : "") + (m ? m.n : "")) + " · " + esc(e.label) + "</h3>";
  h += "<div class='sg'>" + [["Région", b ? REGIONS[b.region] : "—"], ["Phase", m ? m.phase : "—"], ["Code", e.code], ["Puissance", e.hp + " ch"], ["Boîte", e.gb], ["Intervalle", fmt(pl.base) + " km / " + pl.months + " mois"]].map(function (r) {
    return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>";
  }).join("") + "</div></div>";
  h += "<div class='oil'><div class='oc'><span>HUILE</span><b>" + esc(str(s.oil[0])) + "</b><p>" + (num(s.oil[1], 0) ? num(s.oil[1], 0) + " L" : "") + "</p></div>";
  h += "<div class='oc b'><span>DISTRIBUTION</span><b>" + esc(str(s.dist[0])) + "</b><p>" + (num(s.dist[1], 0) ? fmt(s.dist[1]) + " km" : "Chaîne — sans remplacement") + "</p></div></div>";
  h += "<div class='sg' style='margin-bottom:12px'>" + [["Freins", fl[0]], ["Refroid.", fl[1]], ["Couple roues", fl[2] + " Nm"], ["Pneus", fl[3] + "/" + fl[4] + " bar"], ["Clim", fl[5]], ["Batterie", fl[6]]].map(function (r) {
    return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>";
  }).join("") + "</div>";
  h += "<div class='tw'><table class='vtab'><thead><tr><th>Km</th><th>Mois</th><th>Interventions</th><th>Contrôles</th></tr></thead><tbody>";
  arr(pl.visits).forEach(function (v) {
    h += "<tr><td class='km'>" + fmt(v.km) + "</td><td class='ct'>" + num(v.mo, 0) + "</td><td><ul>";
    h += arr(v.ops).map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("");
    h += "</ul></td><td class='ct'>" + esc(arr(v.ctrl).join(" · ")) + "</td></tr>";
  });
  h += "</tbody></table></div>";
  h += "<p class='dim mono' style='font-size:9.5px;margin-top:9px'>PLAN COMPLET JUSQU'À 200 000 KM.</p>";
  var fs = faultsFor(e).filter(function (f) { return f.sev !== "info"; });
  var rc = tsbFor(e).filter(isRecall);
  h += "<div class='g2' style='margin-top:13px'><div class='card panel'><h3>Pannes à surveiller (" + fs.length + ")</h3>";
  h += fs.length ? fs.slice(0, 5).map(function (f) { return faultCard(f, !f.active, false); }).join("") : "<p class='dim'>Aucune.</p>";
  h += "</div><div class='card panel'><h3>Rappels (" + rc.length + ")</h3>";
  h += rc.length ? rc.map(function (t) { return tsbCard(t, false); }).join("") : "<p class='dim'>Aucun.</p>";
  h += "</div></div>";
  h += "<div class='calc'><h3>" + ic("cal") + "CALCULATEUR</h3><div class='fr f3'>";
  h += "<div><label class='lb'>Km actuel</label><input class='inp mono' type='number' data-calc='km' value='" + num(S.calc.km, 0) + "'></div>";
  h += "<div><label class='lb'>Année</label><input class='inp mono' type='number' data-calc='year' value='" + num(S.calc.year, 2021) + "'></div>";
  h += "<div><label class='lb'>Usage</label><select class='sel' data-calc='sev'><option value='1'>Normal</option><option value='0.75'>Sévère</option></select></div></div>";
  h += "<div class='due' id='dueList'>" + dueHTML(pl) + "</div></div>";
  return h;
}
function dueHTML(pl) {
  var km = clamp(S.calc.km, 0, 400000);
  var yr = clamp(S.calc.year, 2005, YMAX);
  var sev = num(S.calc.sev, 1) || 1;
  var s = pl.svc || SVC_FB;
  var rows = [];
  var base = Math.max(5000, Math.round(num(pl.base, 20000) * sev));
  var nx = Math.max(base, Math.ceil((km + 1) / base) * base);
  var rm = nx - km;
  rows.push(["Révision " + fmt(nx) + " km", rm, base, rm <= 1500 ? "now" : rm <= base * 0.2 ? "soon" : "ok"]);
  arr(s.items).forEach(function (it) {
    if (!Array.isArray(it)) { return; }
    var ik = num(it[1], 0);
    if (ik <= 0 || ik <= base) { return; }
    ik = Math.max(1000, Math.round(ik * sev));
    var n2 = Math.max(ik, Math.ceil((km + 1) / ik) * ik);
    var r2 = n2 - km;
    rows.push([str(it[0]), r2, ik, r2 <= 1500 ? "now" : r2 <= ik * 0.2 ? "soon" : "ok"]);
  });
  var dk = num(arr(s.dist)[1], 0);
  if (dk > 0) {
    rows.push(["Distribution", dk - km, dk, dk - km <= 0 ? "now" : dk - km <= 10000 ? "soon" : "ok"]);
  }
  rows.sort(function (a, b) { return a[1] - b[1]; });
  return rows.map(function (r) {
    var dc = r[3] === "now" ? "#FF4D5E" : r[3] === "soon" ? "#FFAF2E" : "#43E08B";
    var bd = r[1] <= 0 ? "DÉPASSÉ" : r[1] <= 1500 ? "À FAIRE" : "DANS " + fmt(r[1]) + " KM";
    return "<div class='drow' style='--dc:" + dc + "'><div class='dr1'><b>" + esc(r[0]) + "</b><span class='dbadge " + r[3] + "\">" + bd + "</span></div><div class='pb'><i style='width:" + clamp((1 - r[1] / r[2]) * 100, 0, 100) + "%'></i></div></div>";
  }).join("");
}
function vStudio() {
  var P = WP.P;
  var h = "<div class='vh'><div><span class='kick'>MODULE 05 — STUDIO</span><h1>FONDS <i>DYNAMIQUES</i></h1></div>";
  h += "<div style='display:flex;gap:7px'><button class='btn sm ghost' data-act='stRandom'>" + ic("dice") + "Aléatoire</button>";
  h += "<button class='btn sm ghost' data-act='stReset'>" + ic("reset") + "Reset</button></div></div>";
  h += "<div class='stwrap'><div class='card stage'><div class='screen'><canvas id='pv'></canvas><div class='hud' id='hud'></div></div>";
  h += "<div style='display:flex;gap:7px;margin-top:11px'><button class='btn sm " + (P.run ? "amb" : "ghost") + "' data-act='stRun'>" + (P.run ? "Pause" : "Lecture") + "</button>";
  h += "<button class='btn sm ghost' data-act='stDir'>" + (P.dir > 0 ? "Sens avant" : "Sens arrière") + "</button></div>";
  h += "<div class='psrow' style='margin-top:10px'>" + Object.keys(WP.PRESETS).map(function (n) {
    return "<button data-act='stPreset' data-n='" + esc(n) + "'>" + esc(n) + "</button>";
  }).join("") + "</div></div><div class='card ctrl'>";
  h += "<div class='csec'><label class='lb'>Scène</label><div class='mgrid'>" + WP.MODES.map(function (m) {
    return "<button class='mb" + (P.mode === m[0] ? " on" : "") + "' data-act='stMode' data-m='" + m[0] + "'><i style='background:linear-gradient(135deg," + WP.pal().a + "," + WP.pal().b + ")'></i>" + m[1] + "</button>";
  }).join("") + "</div></div>";
  h += "<div class='csec'><label class='lb'>Palette</label><div class='pgrid'>" + Object.keys(WP.TH).map(function (k) {
    return "<button class='pb pbth" + (!P.useCustom && P.theme === k ? " on" : "") + "' data-act='stTheme' data-t='" + k + "' style='background:linear-gradient(135deg," + WP.TH[k].a + "," + WP.TH[k].b + "," + WP.TH[k].c + ")'></button>";
  }).join("") + "</div>";
  h += "<div class='srow' style='margin-top:8px'><span>Personnalisée</span><label class='sw'><input type='checkbox' id='customToggle' data-act='stCustom'" + (P.useCustom ? " checked" : "") + "><i></i></label></div>";
  h += "<div class='crow' style='margin-top:8px'>" + [["bg", "Fond"], ["a", "Dom."], ["b", "Acc1"], ["c", "Acc2"], ["d", "Acc3"]].map(function (c) {
    return "<div><label>" + c[1] + "</label><input type='color' data-c='" + c[0] + "' value='" + ((P.custom || {})[c[0]] || "#000000") + "'></div>";
  }).join("") + "</div></div>";
  h += "<div class='csec'>" + [["speed", "Vitesse", 0, 200, 5], ["density", "Densité", 0, 100, 1], ["count", "Particules", 10, 400, 5], ["turb", "Turbulence", 0, 100, 1], ["scale", "Échelle", 20, 160, 2], ["glow", "Halo", 0, 100, 1], ["blur", "Flou", 0, 8, 0.5], ["stroke", "Trait", 0.5, 4, 0.1], ["drift", "Dérive", 0, 100, 1]].map(function (s) {
    return "<div><div class='srow'><span>" + s[1] + "</span><span class='sval' data-pv='" + s[0] + "'>" + WP.label(s[0], P[s[0]]) + "</span></div><input type='range' data-p='" + s[0] + "' min='" + s[2] + "' max='" + s[3] + "' step='" + s[4] + "' value='" + num(P[s[0]], 0) + "'></div>";
  }).join("") + "</div>";
  h += "<div class='csec'>" + [["grid", "Grille"], ["run", "Animation"], ["bg", "Fond global"]].map(function (t) {
    return "<div class='srow'><span>" + t[1] + "</span><label class='sw'><input type='checkbox' data-p='" + t[0] + "'" + (P[t[0]] ? " checked" : "") + "><i></i></label></div>";
  }).join("") + "</div></div></div>";
  return h;
}
function vAdmin() {
  if (!isAdmin()) { return "<div class='empty'>" + ic("lock") + "<p>Réservé administrateur.</p></div>"; }
  var A = S.adm;
  var h = "<div class='vh'><div><span class='kick'>MODULE 06 — ADMINISTRATION</span><h1>BASE · AUTO · ACCÈS · <i>DIFFUSION</i></h1></div>";
  h += "<button class='btn sm ghost' data-act='logout'>" + ic("lock") + "Quitter</button></div>";
  h += "<div class='banner'>" + ic("save", "width:15px;height:15px;color:#43E08B") + "<b>Sauvegarde locale admin</b>";
  h += "<span class='dim mono'>" + (LASTSAVE ? "dernière : " + new Date(LASTSAVE).toLocaleString("fr-FR") : "aucune") + " · " + META.size + " Ko</span>";
  h += "<button class='btn sm grn' data-act='saveNow'>" + ic("save") + "SAUVEGARDER</button>";
  h += "<button class='btn sm ghost' data-act='backupExp'>" + ic("dl") + "Backup JSON</button>";
  h += "<button class='btn sm ghost' data-act='backupImp'>" + ic("ul") + "Restaurer</button>";
  h += "<input type='file' id='bakFile' accept='.json' style='display:none'></div>";
  h += "<div class='banner'>" + ic("bcast", "width:15px;height:15px;color:#FFD60A") + "<b>Diffusion temps réel</b>";
  h += "<label class='sw'><input type='checkbox' data-act='liveToggle'" + (REG.live ? " checked" : "") + "><i></i></label>";
  h += "<span class='dim mono'>rév " + num(REG.rev, 0) + "</span><button class='btn sm pri' data-act='publish'>Diffuser</button></div>";
  h += "<div class='banner'>" + ic("reset", "width:15px;height:15px;color:#43E08B") + "<b>Cache</b><span class='dim mono'>" + esc(purgeLabel()) + "</span>";
  h += "<button class='btn sm ghost' data-act='purge'>Purger</button><button class='btn sm dgr' data-act='purgeAll'>Purge totale</button></div>";
  h += "<div class='atabs'>" + [["files", "FICHIERS"], ["auto", "RECHERCHE AUTO"], ["mega", "MÉGA-BASE"], ["import", "IMPORT"], ["access", "ACCÈS TIERS"], ["journal", "JOURNAL"]].map(function (t) {
    return "<button class='at" + (A.tab === t[0] ? " on" : "") + "' data-act='admTab' data-t='" + t[0] + "'>" + t[1] + "</button>";
  }).join("") + "</div>";
  if (A.tab === "auto") {
    var st = AUTO.st;
    var nxt = num(st.lastFull, 0) + 30 * 86400000;
    h += "<div class='card panel' style='margin-bottom:12px'><h3>" + ic("spark") + "Recherche automatique massive<span class='chip'>" + st.runs + " balayage(s)</span></h3>";
    h += "<p class='muted' style='font-size:12px'>Comble modèles/phases manquants, motorisations & puissances incomplètes, familles sans panne, marques sans bulletin ni rappel. Cycle complet tous les 30 jours + à chaque lancement.</p>";
    h += "<div class='sg' style='margin:10px 0'>" + [["Dernier balayage", st.last ? new Date(st.last).toLocaleString("fr-FR") : "jamais"], ["Prochain cycle 30 j", new Date(nxt).toLocaleDateString("fr-FR")], ["Modèles +", st.added.m], ["Motorisations +", st.added.e], ["Pannes +", st.added.f], ["Bulletins +", st.added.t], ["Couverture ≥2 mot.", META.cover + " %"], ["Au lancement", st.onLaunch ? "activé" : "désactivé"]].map(function (r) {
      return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";
    h += "<div class='srow' style='margin:10px 0'><span>Balayage automatique à chaque lancement</span><label class='sw'><input type='checkbox' data-act='autoToggle'" + (st.onLaunch ? " checked" : "") + "><i></i></label></div>";
    h += "<div style='display:flex;gap:7px;flex-wrap:wrap'><button class='btn pri sm' data-act='autoNow'>" + ic("spark") + "Balayage immédiat</button>";
    h += "<button class='btn amb sm' data-act='autoFull'>" + ic("reset") + "Cycle complet 30 j</button></div></div>";
    h += "<div class='card panel'><h3>Journal recherche auto</h3><div class='journal'>";
    h += arr(st.log).length ? arr(st.log).slice(0, 30).map(function (l) {
      return "<div class='jr'><time>" + new Date(l.ts).toLocaleTimeString("fr-FR") + "</time><span class='jt'>AUTO</span><span>" + esc(l.m) + "</span></div>";
    }).join("") : "<p class='dim'>Aucun balayage.</p>";
    h += "</div></div>";
  } else if (A.tab === "files") {
    h += "<div class='fgrid'>" + FILES.map(function (f) {
      var a = arr(DB[f[0]]);
      return "<div class='card hov filecard'><div class='fn'>" + ic("file") + f[0] + ".json</div><div class='ct'>" + fmt(a.length) + "</div><div class='fa'><button class='btn xs ghost' data-act='fileExp' data-k='" + f[0] + "'>" + ic("dl") + "JSON</button></div></div>";
    }).join("") + "</div>";
    h += "<div class='tools'><button class='btn pri sm' data-act='expAll'>" + ic("dl") + "Exporter la base</button>";
    h += "<button class='btn grn sm' data-act='saveNow'>" + ic("save") + "Sauvegarde locale</button>";
    h += "<button class='btn ghost sm' data-act='integrity'>" + ic("check") + "Intégrité</button>";
    h += "<button class='btn dgr sm' data-act='askReset'>" + ic("reset") + "Base usine</button></div>";
  } else if (A.tab === "mega") {
    var q = String(A.mega || "").toLowerCase();
    var cd = arr(RAW.cand).filter(function (c) {
      return c && (!q || nk(c.brand + c.model + c.code + c.label).indexOf(nk(q)) > -1);
    });
    h += "<div class='card panel'><h3>Mise à jour massive manuelle</h3>";
    h += "<input class='inp' data-mega='q' value='" + esc(A.mega) + "' placeholder='Rechercher…'>";
    h += "<div style='margin:10px 0'><button class='btn sm pri' data-act='megaAll'>Intégrer les " + cd.length + "</button></div>";
    h += "<div class='tw'><table class='t'><thead><tr><th>Marque</th><th>Modèle</th><th>Motorisation</th><th></th></tr></thead><tbody>";
    h += cd.map(function (c) {
      return "<tr><td>" + esc(c.brand) + "</td><td>" + esc(c.model) + " ph" + c.phase + "</td><td class='mono'>" + esc(c.label) + " " + c.hp + "ch</td><td><button class='btn xs pri' data-act='megaAdd' data-i='" + arr(RAW.cand).indexOf(c) + "'>Intégrer</button></td></tr>";
    }).join("");
    h += "</tbody></table></div></div>";
  } else if (A.tab === "import") {
    h += "<div class='card panel'><h3>Import multi-formats (admin seul)</h3>";
    h += "<div class='dz' id='dz' data-act='dzPick'>" + ic("ul") + "<div>Déposer un fichier ou cliquer</div></div>";
    h += "<div class='fmtrow'><span>JSON</span><span>CSV</span><span>TSV</span><span>XML</span><span>YAML</span><span>HTML</span></div>";
    h += "<input type='file' id='impFile' style='display:none'>";
    h += "<textarea class='inp mono' id='impText' rows='6' style='margin-top:10px'></textarea>";
    h += "<div id='impReport'></div>";
    h += "<div style='margin-top:10px'><button class='btn ghost sm' data-act='impAnalyze'>Analyser</button> ";
    h += "<button class='btn pri sm' id='impApply' data-act='impApply' disabled>Fusionner</button></div></div>";
  } else if (A.tab === "access") {
    var sess = tierSession();
    h += "<div class='card panel'><h3>Accès tiers<span class='chip'>" + (sess ? "session active" : "aucune session") + "</span></h3>";
    h += "<p class='muted' style='font-size:12px;margin-bottom:10px'>Une seule case mot de passe, communiquée hors application. Lecture seule. Coupure et révocation en temps réel.</p>";
    h += "<div class='srow' style='margin:10px 0'><span>Accès tiers autorisé</span><label class='sw'><input type='checkbox' data-act='tierOpen'" + (REG.tierOpen !== false ? " checked" : "") + "><i></i></label></div>";
    h += "<div><button class='btn dgr sm' data-act='kickTier'" + (sess ? "" : " disabled") + ">" + ic("lock") + "Révoquer la session</button></div></div>";
    h += "<div class='card panel' style='margin-top:12px'><h3>Journal des accès</h3><div class='journal'>";
    h += arr(REG.log).length ? arr(REG.log).slice(0, 30).map(function (l) {
      return "<div class='jr'><time>" + new Date(l.ts).toLocaleTimeString("fr-FR") + "</time><span>" + esc(l.a) + "</span></div>";
    }).join("") : "<p class='dim'>Aucune activité.</p>";
    h += "</div></div>";
  } else {
    h += "<div class='card panel'><h3>Journal</h3><div class='journal'>";
    h += AUDIT.slice().reverse().slice(0, 60).map(function (a) {
      return "<div class='jr'><time>" + new Date(a.ts).toLocaleTimeString("fr-FR") + "</time><span class='jt'>" + esc(a.type) + "</span><span>" + esc(a.msg) + "</span></div>";
    }).join("");
    h += "</div></div>";
  }
  return h;
}
function testListHTML() {
  var q = nk(S.tf);
  var h = "", n = 0;
  arr(TESTS).forEach(function (t) {
    if (!t) { return; }
    if (q && nk(t.n + " " + t.info).indexOf(q) < 0) { return; }
    n++;
    var c = t.ok ? "#43E08B" : t.soft ? "#FFAF2E" : "#FF4D5E";
    h += "<div class='tst' style='--tc:" + c + "'><span class='ti'>" + (t.ok ? "OK" : t.soft ? "!" : "X") + "</span><div style='flex:1'><b>" + esc(t.n) + "</b><small>" + esc(t.info) + "</small></div></div>";
  });
  return n ? h : "<div class='empty'>Aucun contrôle.</div>";
}
function vDiag() {
  var fl = arr(TESTS).filter(function (t) { return t && !t.ok && !t.soft; }).length;
  var wn = arr(TESTS).filter(function (t) { return t && !t.ok && t.soft; }).length;
  var col = fl ? "#FF4D5E" : wn ? "#FFAF2E" : "#43E08B";
  var h = "<div class='vh'><div><span class='kick'>MODULE 07 — AUTOVÉRIFICATION MASSIVE</span><h1>" + (TESTS.length || "…") + " CONTRÔLES</h1></div>";
  h += "<div style='display:flex;gap:7px'><button class='btn sm grn' data-act='runTests'>" + ic("reset") + "Relancer</button>";
  if (isAdmin()) { h += "<button class='btn sm ghost' data-act='expTests'>" + ic("dl") + "Rapport</button>"; }
  h += "</div></div>";
  h += "<div class='card panel' style='border-left:3px solid " + col + ";margin-bottom:12px'><h3>" + (TESTS.length - fl) + "/" + TESTS.length + " OK</h3>";
  h += "<p class='muted'>" + (fl ? fl + " bloquant(s). " : "Système opérationnel. ") + (wn ? wn + " avertissement(s). " : "") + "Cache : " + esc(purgeLabel()) + "</p></div>";
  h += "<div class='card panel'><input class='inp' data-tfilter='1' value='" + esc(S.tf) + "' placeholder='Filtrer…' style='margin-bottom:9px'>";
  h += "<div class='tests' id='testList'>" + testListHTML() + "</div></div>";
  return h;
}
function render() {
  var v = S.view;
  var m = $("#view");
  if (!m) { return; }
  if (v !== "studio") { WP.detach(); }
  var act = D.activeElement;
  var sel = null, caret = null;
  if (act && act.dataset) {
    if (act.dataset.f) { sel = "[data-f='" + act.dataset.f + "']"; }
    else if (act.dataset.tf) { sel = "[data-tf='" + act.dataset.tf + "']"; }
    else if (act.dataset.mega) { sel = "[data-mega]"; }
    if (sel) {
      try { caret = act.selectionStart; } catch (e) { caret = null; }
    }
  }
  $$(".nv,#tabs a").forEach(function (a) { a.classList.toggle("on", a.dataset.v === v); });
  var h = "";
  try {
    if (v === "bord") { h = vBord(); }
    else if (v === "explorer") { h = vExplorer(); }
    else if (v === "tech") { h = vTech(); }
    else if (v === "entretien") { h = vEntretien(); }
    else if (v === "studio") { h = vStudio(); }
    else if (v === "admin") { h = vAdmin(); }
    else { h = vDiag(); }
  } catch (e) {
    logErr("render", e);
    h = "<div class='card panel'><h3>Erreur de rendu</h3><p class='muted'>" + esc(e.message) + "</p><button class='btn sm ghost' data-act='purge'>Purger le cache</button></div>";
  }
  m.innerHTML = h;
  mountAnim(m);
  updateMeta();
  if (sel) {
    var el = $(sel, m);
    if (el) {
      el.focus();
      if (caret != null) {
        try { el.setSelectionRange(caret, caret); } catch (e) {}
      }
    }
  }
  if (v === "studio") {
    var cv = $("#pv");
    if (cv) { WP.attach(cv); WP.sync(); }
  }
}
function setTxt(id, v) {
  var e = $(id);
  if (e) { e.textContent = v; }
}
function updateMeta() {
  var c = META.counts;
  setTxt("#nEng", fmt(c.e));
  setTxt("#nTech", fmt(c.f + c.t));
  setTxt("#nPlan", fmt(c.dom));
  setTxt("#stLinks", fmt(META.links));
  setTxt("#stCorr", fmt(META.corr));
  setTxt("#stInt", META.integ.pct + "%");
  setTxt("#stSize", META.size + " Ko");
  setTxt("#stDiff", isAdmin() ? (REG.live ? "AUTO" : "MANUEL") + " r" + num(REG.rev, 0) : isTier() ? "LECTURE r" + num(REG.rev, 0) : "—");
  var fl = arr(TESTS).filter(function (t) { return t && !t.ok && !t.soft; }).length;
  setTxt("#stTest", TESTS.length ? (TESTS.length - fl) + "/" + TESTS.length : "…");
  setTxt("#nTest", TESTS.length ? (fl ? "!" : "OK") : "—");
  var ch = $("#ichip");
  if (ch) { ch.className = "chip " + (META.integ.ok ? "ok" : "bad"); }
  setTxt("#itxt", META.integ.ok ? "INTÈGRE" : "ERREURS");
  var ab = $("#admb");
  if (ab) {
    ab.innerHTML = ic(isAdmin() ? "unlock" : "lock");
    ab.classList.toggle("on", isAdmin());
  }
  setTxt("#rtxt", isAdmin() ? "Admin ING-3 — sauvegarde locale active." : isTier() ? "Tiers — lecture seule." : "Session non ouverte.");
  var sb = $("#sndb");
  if (sb) { sb.innerHTML = ic(PREF.sound ? "snd" : "mute"); }
  var na = $("#navAdmin");
  if (na) { na.style.display = isTier() ? "none" : ""; }
  updStor();
}
function updStor() {
  var b = $("#sbar"), t = $("#stxt");
  if (b) { b.style.width = clamp(META.size / 8192 * 100, 2, 100) + "%"; }
  if (t) {
    t.textContent = META.size + " Ko · " + (isAdmin() ? (STORE.local ? "local" : "mémoire") + (LASTSAVE ? " · " + new Date(LASTSAVE).toLocaleTimeString("fr-FR") : "") : isTier() ? "aucun stockage" : "—");
  }
}

/* ---------- autovérification ---------- */
function runTests() {
  var T = [];
  function chk(n, fn, soft) {
    try {
      var r = fn();
      T.push({ n: n, ok: !!r[0], info: String(r[1] == null ? "" : r[1]), soft: !!soft });
    } catch (e) {
      T.push({ n: n, ok: false, info: "EXCEPTION " + (e && e.message ? e.message : e), soft: true });
    }
  }
  chk("Noyau initialisé", function () { return [!!DB && Object.keys(MIDX).length > 0, Object.keys(MIDX).length + " modèles"]; });
  chk("Marques ≥ 50", function () { return [META.counts.b >= 50, META.counts.b]; });
  chk("Modèles ≥ 250", function () { return [META.counts.m >= 250, META.counts.m]; });
  chk("Motorisations ≥ 600", function () { return [META.counts.e >= 600, fmt(META.counts.e)]; });
  chk("Pannes ≥ 35", function () { return [META.counts.f >= 35, META.counts.f]; });
  chk("TSB ≥ 25", function () { return [META.counts.t >= 25, META.counts.t + " dont " + META.counts.rc + " rappels"]; });
  chk("Domaines ≥ 12", function () { return [META.counts.dom >= 12, META.counts.dom]; });
  chk("Familles ≥ 60", function () { return [META.counts.fam >= 60, META.counts.fam]; });
  Object.keys(REGIONS).forEach(function (r) {
    chk("Région " + REGIONS[r], function () { return [(META.regions[r] || 0) > 0, (META.regions[r] || 0) + " marques"]; });
  });
  chk("IDs uniques", function () {
    var s = {}, d = 0;
    FILES.forEach(function (f) {
      arr(DB[f[0]]).forEach(function (x) { if (x && s[x.id]) { d++; } if (x) { s[x.id] = 1; } });
    });
    return [d === 0, d + " doublon(s)"];
  });
  chk("Réf modèle→marque", function () {
    var bs = {};
    arr(DB.brands).forEach(function (b) { bs[b.id] = 1; });
    return [arr(DB.models).every(function (m) { return bs[m.b]; }), "ok"];
  });
  chk("Réf moteur→modèle", function () {
    var bad = 0;
    arr(DB.engines).forEach(function (e) {
      arr(e.m).forEach(function (i) { if (!MIDX[i]) { bad++; } });
    });
    return [bad === 0, bad + " orphelin(s)"];
  });
  chk("Couverture modèles", function () {
    var bad = arr(DB.models).filter(function (m) { return !(META.perModel[m.id] > 0); }).length;
    return [bad === 0, bad + " sans moteur"];
  });
  chk("Couverture ≥2 motorisations", function () { return [META.cover >= 60, META.cover + " %"]; }, true);
  chk("Phases 1-12", function () { return [arr(DB.models).every(function (m) { return m.phase >= 1 && m.phase <= 12; }), "ok"]; });
  chk("Puissances 1-3000", function () { return [arr(DB.engines).every(function (e) { return e.hp >= 1 && e.hp <= 3000; }), "ok"]; });
  chk("Énergies normalisées", function () { return [arr(DB.engines).every(function (e) { return !!FU[e.fuel]; }), "ok"]; });
  chk("Sévérités normalisées", function () {
    return [arr(DB.faults).every(function (f) { return !!SV[f.sev]; }) && arr(DB.tsb).every(function (t) { return !!SV[t.sev]; }), "ok"];
  });
  chk("Plages km valides", function () {
    return [arr(DB.faults).every(function (f) { var k = kmOf(f); return k[1] >= k[0]; }), "ok"];
  });
  chk("Pannes complètes", function () {
    return [arr(DB.faults).every(function (f) { return arr(f.sym).length && f.cause && f.fix; }), "ok"];
  });
  chk("TSB complets", function () {
    return [arr(DB.tsb).every(function (t) { return t.act && /^\d{4}-\d{2}$/.test(String(t.date)); }), "ok"];
  });
  chk("Pannes corrélées", function () {
    var bad = arr(DB.faults).filter(function (f) { return engForFault(f).length === 0; }).length;
    return [bad === 0, bad + " non corrélée(s)"];
  }, true);
  chk("TSB corrélés", function () {
    var bad = arr(DB.tsb).filter(function (t) { return engForTsb(t).length === 0; }).length;
    return [bad === 0, bad + " non corrélé(s)"];
  }, true);
  chk("Marques avec bulletin", function () {
    var hs = {};
    arr(DB.tsb).forEach(function (t) { arr(t.b).forEach(function (b) { hs[b] = 1; }); });
    var bad = arr(DB.brands).filter(function (b) { return !hs[b.id]; }).length;
    return [bad === 0, bad + " sans bulletin"];
  }, true);
  chk("Gabarits entretien ≥ 10", function () { return [svcList().length >= 10, svcList().length]; });
  chk("Plans 200 000 km (marques)", function () {
    var bad = 0, n = 0;
    arr(DB.brands).forEach(function (b) {
      var es = arr(DB.engines).filter(function (e) {
        var m = modelOf(e);
        return m && m.b === b.id;
      });
      if (!es.length) { bad++; return; }
      n++;
      if (lastKm(buildPlan(es[0], modelOf(es[0]), b)) < KMMAX) { bad++; }
    });
    return [bad === 0, n + " marques"];
  });
  chk("Plans échantillon", function () {
    var bad = 0, n = 0;
    arr(DB.engines).forEach(function (e, i) {
      if (i % 25) { return; }
      n++;
      var pl = buildPlan(e, modelOf(e), brandOf(e));
      if (lastKm(pl) < KMMAX || !arr(pl.visits).length || !arr(arr(pl.visits)[0].ops).length) { bad++; }
    });
    return [bad === 0, n + " moteurs"];
  });
  ["3008 courroie", "3008 rappel", "AdBlue SCR", "EGR FAP", "EAT8", "Ioniq ICCU", "CVT", "P20E8", "Chine", "Tesla", "HEMI"].forEach(function (q) {
    chk("Recherche « " + q + " »", function () {
      var r = omniSearch(q);
      return [r.length > 0, r.length];
    });
  });
  chk("Portail tiers : une seule case", function () {
    var g = gateHTML("tier");
    return [(g.match(/<input/g) || []).length === 1 && (g.match(/type='password'/g) || []).length === 1, "ok"];
  });
  chk("Secret tiers non affiché", function () {
    return [(gateHTML(null) + gateHTML("tier") + vAdmin()).indexOf(TPWD) < 0, "ok"];
  });
  chk("Mots de passe configurés", function () { return [TPWD.length >= 8 && PWD.length >= 8, "ok"]; });
  chk("Sauvegarde locale admin", function () {
    return [typeof saveNow === "function" && typeof backupExport === "function", isAdmin() ? (LASTSAVE ? "dernière " + new Date(LASTSAVE).toLocaleTimeString("fr-FR") : "en attente") : "réservée admin"];
  });
  chk("Purge cache ouverture", function () { return [PURGED.done, purgeLabel()]; });
  chk("DOM critique", function () {
    var miss = ["#view", "#rail", "#top", "#md", "#ts", "#bgc", "#omni", "#omnires", "#gate", "#status", "#tabs"].filter(function (s) { return !$(s); });
    return [miss.length === 0, miss.length ? miss.join(",") : "11/11"];
  });
  chk("Scènes studio", function () {
    var bad = [];
    WP.MODES.forEach(function (m) {
      try {
        var cv = D.createElement("canvas");
        cv.width = 160; cv.height = 100;
        var cx = cv.getContext("2d");
        var tg = { W: 160, H: 100, sc: 1 };
        tg.st = WP.mk(tg);
        var P2 = clone(WP.P);
        P2.mode = m[0];
        WP.draw(cx, 160, 100, 1, P2, tg.st, WP.pal(), 1);
      } catch (e) { bad.push(m[0]); }
    });
    return [bad.length === 0, bad.length ? bad.join(",") : WP.MODES.length + "/" + WP.MODES.length];
  });
  chk("Parseurs import", function () {
    var bad = [];
    [["json", '{"a":[1]}'], ["csv", "x;y\n1;2"], ["xml", "<r><i><x>1</x></i></r>"], ["yaml", "- x: 1"], ["html", "<table><tr><th>x</th></tr><tr><td>1</td></tr></table>"]].forEach(function (p) {
      try { if (!sniff("t." + p[0], p[1])) { bad.push(p[0]); } } catch (e) { bad.push(p[0]); }
    });
    return [bad.length === 0, bad.length ? bad.join(",") : "5/5"];
  });
  chk("Rendu 7 vues", function () {
    var bad = [];
    [["bord", vBord], ["explorer", vExplorer], ["tech", vTech], ["entretien", vEntretien], ["studio", vStudio], ["admin", vAdmin], ["diag", vDiag]].forEach(function (v) {
      try {
        var s = v[1]();
        if (typeof s !== "string" || !s.length) { bad.push(v[0]); }
      } catch (e) { bad.push(v[0]); }
    });
    return [bad.length === 0, bad.length ? bad.join(",") : "7/7"];
  });
  chk("Intégrité référentielle", function () {
    return [META.integ.ok, META.integ.err.length ? META.integ.err.slice(0, 3).join("|") : "0 erreur"];
  });
  chk("Exceptions capturées", function () {
    return [ERRORS.length === 0, ERRORS.length ? ERRORS.slice(-2).map(function (e) { return e.m; }).join("|") : "aucune"];
  }, true);
  TESTS = T;
  updateMeta();
  var tl = $("#testList");
  if (tl) { tl.innerHTML = testListHTML(); }
  return T;
}

/* ---------- portail ---------- */
function gateHTML(mode) {
  var h = "<div class='gcard2'><h1>MECADATA <i>//</i> PORTAIL</h1>";
  h += "<p class='gsub'>Cache purgé · " + esc(purgeLabel()) + "</p>";
  if (!mode) {
    h += "<div class='gmodes'>";
    h += "<div class='gmode' data-act='gateAdmin'><div class='gi'>" + ic("shield", "width:26px;height:26px") + "</div><h3>ADMINISTRATEUR</h3><p>Imports, exports, masses, recherche auto, sauvegarde locale, contrôle des accès, diffusion.</p></div>";
    h += "<div class='gmode' data-act='gateTier'><div class='gi'>" + ic("users", "width:26px;height:26px") + "</div><h3>TIERS</h3><p>Consultation protégée par mot de passe. Lecture seule : fiches, pannes, rappels, TSB, plans, studio.</p></div>";
    h += "</div>";
    h += "<p class='gnote'>Le mot de passe tiers est communiqué hors application et n'est jamais affiché.</p>";
  } else if (mode === "admin") {
    h += "<div class='gform'><form data-form='admin'><label class='lb'>Mot de passe administrateur</label>";
    h += "<input class='inp mono' type='password' name='pwd' id='gatePwd' value='' placeholder='••••••••' autocomplete='new-password' style='text-align:center;letter-spacing:.2em;font-size:16px'>";
    h += "<div style='display:flex;gap:8px;margin-top:11px'><button type='button' class='btn ghost' data-act='gateBack'>Retour</button>";
    h += "<button class='btn pri' style='flex:1'>OUVRIR ING-3</button></div></form>";
    h += "<p class='gnote'>Champ effacé à chaque lancement — aucun mot de passe conservé.</p></div>";
  } else {
    h += "<div class='gform'><form data-form='tier'><label class='lb'>Mot de passe tiers</label>";
    h += "<input class='inp mono' type='password' name='tpwd' id='gateTierPwd' value='' placeholder='••••••••' autocomplete='new-password' style='text-align:center;letter-spacing:.2em;font-size:16px'>";
    h += "<div style='display:flex;gap:8px;margin-top:11px'><button type='button' class='btn ghost' data-act='gateBack'>Retour</button>";
    h += "<button class='btn pri' style='flex:1'>" + ic("unlock") + "ENTRER EN CONSULTATION</button></div></form>";
    h += "<p class='gnote'>Une seule case · saisie masquée · aucune donnée enregistrée.</p></div>";
  }
  return h + "</div>";
}
function gateShow(mode) {
  GATE = mode || null;
  var g = $("#gate");
  if (!g) { return; }
  g.classList.remove("off");
  g.innerHTML = gateHTML(GATE);
  if (GATE === "admin") {
    var p = $("#gatePwd");
    if (p) { p.value = ""; setTimeout(function () { p.focus(); }, 60); }
  }
  if (GATE === "tier") {
    var t = $("#gateTierPwd");
    if (t) { t.value = ""; setTimeout(function () { t.focus(); }, 60); }
  }
}
function gateHide() {
  var g = $("#gate");
  if (g) { g.classList.add("off"); }
}
function enterAdmin() {
  MODE = "admin";
  gateHide();
  DB = clone(SEED);
  var raw = STORE.get(KEY);
  if (raw) {
    safe("load", function () {
      var d = JSON.parse(raw);
      if (d && d.db && arr(d.db.engines).length) {
        DB = d.db;
        AUDIT = arr(d.audit);
        if (d.prefs) { Object.keys(d.prefs).forEach(function (k) { PREF[k] = d.prefs[k]; }); }
        if (d.wp) { Object.keys(d.wp).forEach(function (k) { WP.P[k] = d.wp[k]; }); }
        LASTSAVE = num(d.ts, 0);
      }
    }, null);
  }
  FIXES += normalize(DB);
  recompute();
  WP.apply();
  audit("adm", "Session ING-3");
  saveNow(true);
  S.view = "bord";
  location.hash = "#/bord";
  render();
  idle(function () {
    AUTO.maybe();
    runTests();
    updateMeta();
  }, 400);
  toast("ok", "Session administrateur", "Sauvegarde locale active.");
  beep("imp");
}
function enterTier() {
  if (REG.tierOpen === false) {
    toast("err", "Accès tiers coupé", "Contactez l'administrateur.");
    gateShow("tier");
    return;
  }
  MODE = "tier";
  TIER = "TIER";
  TIER_TS = Date.now();
  gateHide();
  if (!applyTier()) {
    DB = clone(SEED);
    normalize(DB);
  }
  recompute();
  WP.apply();
  S.view = "bord";
  location.hash = "#/bord";
  render();
  idle(function () {
    runTests();
    updateMeta();
  }, 400);
  toast("info", "Consultation tiers", "Lecture seule — rév " + num(REG.rev, 0) + ".");
  beep("ok");
}
function tierSync() {
  if (!isTier()) { return; }
  if (REG.tierOpen === false || num(REG.tierKick, 0) > TIER_TS) {
    MODE = null;
    TIER = null;
    gateShow(null);
    updateMeta();
    toast("err", "Session tiers terminée", "Accès coupé ou révoqué.");
    return;
  }
  if (applyTier()) {
    recompute();
    updateMeta();
    render();
    toast("info", "Base mise à jour", "rév " + num(REG.rev, 0));
  }
}

/* ---------- imports ---------- */
function pick(r, names) {
  if (!r) { return undefined; }
  var i;
  for (i = 0; i < names.length; i++) {
    var v = r[names[i]];
    if (v !== undefined && v !== null && v !== "") { return v; }
  }
  var map = {};
  Object.keys(r).forEach(function (k) { map[nk(k)] = r[k]; });
  for (i = 0; i < names.length; i++) {
    var w = map[nk(names[i])];
    if (w !== undefined && w !== null && w !== "") { return w; }
  }
  return undefined;
}
function detectKind(r) {
  if (!r || typeof r !== "object") { return null; }
  if (pick(r, ["hp", "puissance", "ch", "kw", "code_moteur"]) !== undefined) { return "engines"; }
  if (pick(r, ["ref", "reference"]) !== undefined && pick(r, ["date"]) !== undefined) { return "tsb"; }
  if (pick(r, ["sev", "severite", "gravite"]) !== undefined) { return "faults"; }
  if (pick(r, ["segment", "carrosserie", "phase"]) !== undefined) { return "models"; }
  if (pick(r, ["pays", "country"]) !== undefined) { return "brands"; }
  return null;
}
function mapRec(r, kind) {
  if (kind === "brands") {
    var n = pick(r, ["n", "name", "nom", "marque"]);
    if (!n) { throw "nom manquant"; }
    var pays = str(pick(r, ["pays", "country"]), "—");
    return { id: str(pick(r, ["id"]), "B-" + slug(n)), n: str(n), pays: pays, grp: str(pick(r, ["grp", "group"]), "—"), region: str(pick(r, ["region"]), regionOf(pays)) };
  }
  if (kind === "models") {
    var mn = pick(r, ["n", "name", "nom", "model", "modele"]);
    if (!mn) { throw "nom manquant"; }
    var br = pick(r, ["b", "brand", "marque"]);
    if (!br) { throw "marque manquante"; }
    return { id: str(pick(r, ["id"]), "M-" + slug(br) + "-" + slug(mn)), b: str(br), bRaw: str(br), n: str(mn), y: [num(pick(r, ["y0", "from"]), 2017), num(pick(r, ["y1", "to"]), YMAX)], seg: str(pick(r, ["seg", "segment"]), "Compacte"), phase: clamp(num(pick(r, ["phase", "gen"]), 1), 1, 12) };
  }
  if (kind === "engines") {
    var code = pick(r, ["code", "code_moteur"]);
    if (!code) { throw "code manquant"; }
    var lab = pick(r, ["label", "name", "nom"]);
    if (!lab) { throw "libellé manquant"; }
    var hp = num(pick(r, ["hp", "puissance", "ch"]), 0);
    var kw = num(pick(r, ["kw"]), 0);
    if (!hp && kw) { hp = Math.round(kw * 1.3596); }
    if (!(hp > 0 && hp <= 3000)) { throw "puissance invalide"; }
    var mr = list(pick(r, ["m", "models", "modeles", "modele"]));
    if (!mr.length) {
      var mo = pick(r, ["modele", "model"]);
      if (mo) { mr = [str(mo)]; }
    }
    if (!mr.length) { throw "aucun modèle"; }
    return { id: "", m: [], mRaw: mr, code: str(code), fam: str(pick(r, ["fam", "famille"]), str(code)), label: str(lab), fuel: nfuel(pick(r, ["fuel", "energie"])), disp: num(pick(r, ["disp", "cm3"]), 0), hp: Math.round(hp), nm: num(pick(r, ["nm", "couple"]), 0), kw: Math.round(hp * 0.7355), y: [num(pick(r, ["y0", "from"]), 2017), num(pick(r, ["y1", "to"]), YMAX)], gb: str(pick(r, ["gb", "boite"]), "BVM") };
  }
  if (kind === "faults") {
    var t = pick(r, ["t", "title", "titre", "panne"]);
    if (!t) { throw "titre manquant"; }
    var c0 = num(pick(r, ["cost0"]), 0);
    var c1 = num(pick(r, ["cost1"]), c0);
    return { id: "", t: str(t), fam: list(pick(r, ["fam", "familles"])), mt: list(pick(r, ["mt", "modeles"])), ph: list(pick(r, ["ph", "phases"])), sev: nsev(pick(r, ["sev", "severite"])), freq: nfreq(pick(r, ["freq"])), y: [num(pick(r, ["y0"]), 2017), num(pick(r, ["y1"]), YMAX)], km: [num(pick(r, ["km0"]), 0), num(pick(r, ["km1"]), KMMAX)], sym: list(String(pick(r, ["sym", "symptomes"]) || "").replace(/\n/g, "|")), cause: str(pick(r, ["cause"]), "—"), fix: str(pick(r, ["fix", "solution"]), "—"), cost: [c0, Math.max(c0, c1)], status: str(pick(r, ["status", "statut"]), "Surveillance"), dom: str(pick(r, ["dom", "domaine"]), "Moteur") };
  }
  if (kind === "tsb") {
    var rf = pick(r, ["ref", "reference"]);
    if (!rf) { throw "réf manquante"; }
    var tt = pick(r, ["t", "title", "titre"]);
    if (!tt) { throw "titre manquant"; }
    return { id: "", ref: str(rf), b: list(pick(r, ["b", "marques"])), bRaw: list(pick(r, ["b", "marques"])), fam: list(pick(r, ["fam"])), mt: list(pick(r, ["mt", "modeles"])), ph: list(pick(r, ["ph"])), t: str(tt), date: str(pick(r, ["date"]), "2026-01").slice(0, 7), cat: str(pick(r, ["cat", "categorie"]), "Moteur"), sev: nsev(pick(r, ["sev"])), sum: str(pick(r, ["sum", "resume"]), "—"), act: str(pick(r, ["act", "action"]), "—"), dom: str(pick(r, ["dom"]), str(pick(r, ["cat"]), "Moteur")) };
  }
  throw "type inconnu";
}
function resolveAll(g) {
  var warn = [], drop = [], nb = [], nm = [];
  var bi = {}, bn = {}, mi = {}, mn = {}, seen = {};
  arr(DB.brands).forEach(function (b) { bi[b.id] = 1; bn[nk(b.n)] = b.id; });
  arr(DB.models).forEach(function (m) { mi[m.id] = 1; mn[nk(m.n)] = m.id; });
  function uq(k, base) {
    var id = base, i = 2;
    while (seen[k + id] || arr(DB[k]).some(function (x) { return x && x.id === id; })) { id = base + "-" + i; i++; }
    seen[k + id] = 1;
    return id;
  }
  function bid(v) {
    if (v == null || v === "") { return null; }
    var r = str(v);
    if (bi[r]) { return bi[r]; }
    var l = nk(r);
    if (bn[l]) { return bn[l]; }
    var id = uq("brands", "B-" + slug(r));
    bi[id] = 1; bn[l] = 1;
    nb.push({ id: id, n: r, pays: "—", grp: "—", region: "europe" });
    warn.push("marque créée " + r);
    return id;
  }
  function mid(v) {
    var r = str(v);
    if (!r) { return null; }
    if (mi[r]) { return mi[r]; }
    var l = nk(r);
    if (mn[l]) { return mn[l]; }
    var b = null, rest = r;
    Object.keys(bn).forEach(function (k) {
      if (!b && l.indexOf(k) === 0 && l.length > k.length + 2) {
        b = bn[k];
        rest = r.slice(k.length).replace(/^[\s\-:]+/, "");
      }
    });
    b = b || bid("Import");
    var id = uq("models", "M-" + slug(rest || r));
    mi[id] = 1; mn[nk(rest || r)] = 1;
    nm.push({ id: id, b: b, n: rest || r, y: [2017, YMAX], seg: "Compacte", phase: 1 });
    warn.push("modèle créé " + (rest || r));
    return id;
  }
  var out = { brands: [], models: [], engines: [], faults: [], tsb: [] };
  arr(g.brands).forEach(function (r) { r.id = r.id || uq("brands", "B-" + slug(r.n)); bi[r.id] = 1; out.brands.push(r); });
  arr(g.models).forEach(function (r) {
    var b = bid(r.bRaw || r.b);
    if (!b) { drop.push(r.n); return; }
    r.b = b; delete r.bRaw;
    r.id = r.id || uq("models", "M-" + slug(b) + "-" + slug(r.n));
    mi[r.id] = 1;
    out.models.push(r);
  });
  arr(g.engines).forEach(function (r) {
    var ms = arr(r.mRaw).map(mid).filter(Boolean);
    if (!ms.length) { drop.push(r.label); return; }
    r.m = ms; delete r.mRaw;
    r.id = r.id || uq("engines", "E-" + slug(r.code));
    out.engines.push(r);
  });
  arr(g.faults).forEach(function (r) { r.id = r.id || uq("faults", "F-" + slug(r.t)); out.faults.push(r); });
  arr(g.tsb).forEach(function (r) {
    r.b = arr(r.bRaw || r.b).map(bid).filter(Boolean);
    delete r.bRaw;
    r.id = r.id || uq("tsb", "T-" + slug(r.ref));
    out.tsb.push(r);
  });
  out.brands = nb.concat(out.brands);
  out.models = nm.concat(out.models);
  return { out: out, warn: warn, drop: drop };
}
var KEYFN = {
  brands: function (x) { return nk(x.n); },
  models: function (x) { return nk(x.b + x.n); },
  engines: function (x) { return nk(x.code + x.fam + x.label + x.hp); },
  faults: function (x) { return nk(x.t); },
  tsb: function (x) { return nk(x.ref || x.t); }
};
function upsert(kind, rec) {
  var a = arr(DB[kind]);
  var ex = null;
  if (rec.id) {
    a.forEach(function (x) { if (x && x.id === rec.id) { ex = x; } });
  }
  if (!ex) {
    var k = KEYFN[kind](rec);
    a.forEach(function (x) { if (x && KEYFN[kind](x) === k) { ex = x; } });
  }
  if (ex) {
    Object.keys(rec).forEach(function (kk) {
      var v = rec[kk];
      if (v == null || v === "") { return; }
      if (Array.isArray(v)) { if (v.length) { ex[kk] = v; } } else { ex[kk] = v; }
    });
    return "upd";
  }
  if (!rec.id || a.some(function (x) { return x && x.id === rec.id; })) {
    rec.id = uid(kind.charAt(0).toUpperCase());
  }
  a.push(rec);
  DB[kind] = a;
  return "add";
}
function parseDelim(t) {
  var first = String(t).split(/\r?\n/)[0] || "";
  var cs = [[";", 0], [",", 0], ["\t", 0], ["|", 0]];
  cs.forEach(function (c) { c[1] = first.split(c[0]).length - 1; });
  cs.sort(function (a, b) { return b[1] - a[1]; });
  var d = cs[0][1] > 0 ? cs[0][0] : ",";
  var rows = [], row = [], cur = "", q = false, i;
  for (i = 0; i < t.length; i++) {
    var ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; } else { q = false; }
      } else { cur += ch; }
    } else if (ch === '"') { q = true; }
    else if (ch === d) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") { i++; }
      row.push(cur); cur = "";
      if (row.some(function (x) { return String(x).trim(); })) { rows.push(row); }
      row = [];
    } else { cur += ch; }
  }
  row.push(cur);
  if (row.some(function (x) { return String(x).trim(); })) { rows.push(row); }
  if (rows.length < 2) { return []; }
  var hd = rows[0].map(function (x) { return String(x).trim(); });
  return rows.slice(1).map(function (r) {
    var o = {};
    hd.forEach(function (k, i2) { o[k] = r[i2] === undefined ? "" : r[i2]; });
    return o;
  });
}
function sniff(name, text) {
  var ext = String(name || "").split(".").pop().toLowerCase();
  var t = String(text || "").trim();
  if (ext === "json" || t[0] === "{" || t[0] === "[") {
    try { return { fmt: "JSON", data: JSON.parse(t) }; } catch (e) {}
  }
  if (/^<\?xml/.test(t) || /^<[a-zA-Z]/.test(t)) {
    if (/<table/i.test(t)) {
      var recs = safe("h", function () {
        var doc = new DOMParser().parseFromString(t, "text/html");
        var tb = doc.querySelector("table");
        if (!tb) { throw "x"; }
        var trs = tb.querySelectorAll("tr");
        if (trs.length < 2) { throw "x"; }
        var hd = [].slice.call(trs[0].children).map(function (c) { return c.textContent.trim(); });
        var out = [];
        for (var r = 1; r < trs.length; r++) {
          var cs = [].slice.call(trs[r].children);
          var o = {};
          hd.forEach(function (k, i) { o[k] = cs[i] ? cs[i].textContent.trim() : ""; });
          out.push(o);
        }
        return out;
      }, []);
      if (recs.length) { return { fmt: "HTML", records: recs }; }
    }
    var xr = safe("x", function () {
      var doc = new DOMParser().parseFromString(t, "application/xml");
      var kids = [].slice.call(doc.documentElement.children);
      var tc = {}, best = null, bn = 0;
      kids.forEach(function (k) {
        tc[k.tagName] = (tc[k.tagName] || 0) + 1;
        if (tc[k.tagName] > bn) { bn = tc[k.tagName]; best = k.tagName; }
      });
      return kids.filter(function (k) { return k.tagName === best; }).map(function (k) {
        var o = {};
        [].slice.call(k.children).forEach(function (c) { o[c.tagName] = c.textContent.trim(); });
        return o;
      });
    }, []);
    if (xr.length) { return { fmt: "XML", records: xr }; }
  }
  if (/^\s*-\s+\w+\s*:/.test(t) || ext === "yaml" || ext === "yml") {
    var out = [], cur = null;
    t.split(/\r?\n/).forEach(function (l) {
      if (!l.trim() || /^#/.test(l)) { return; }
      var m = l.match(/^\s*-\s*(.*)/);
      if (m) {
        if (cur) { out.push(cur); }
        cur = {};
        var kv = m[1].match(/^([^:]+):\s*(.*)/);
        if (kv) { cur[kv[1].trim()] = kv[2].trim(); }
        return;
      }
      var k2 = l.match(/^\s*([^:]+):\s*(.*)/);
      if (k2 && cur) { cur[k2[1].trim()] = k2[2].trim(); }
    });
    if (cur) { out.push(cur); }
    if (out.length) { return { fmt: "YAML", records: out }; }
  }
  var r2 = parseDelim(t);
  if (r2.length) { return { fmt: ext === "tsv" ? "TSV" : "CSV", records: r2 }; }
  throw "format non reconnu";
}
function analyze(parsed, label) {
  if (!isAdmin()) { toast("err", "Import refusé", "Admin seul."); return; }
  var rep = $("#impReport");
  if (!rep) { return; }
  var g = {}, rej = [];
  if (parsed && parsed.data && Array.isArray(parsed.data)) {
    var k = detectKind(parsed.data[0] || {});
    if (k) { g[k] = parsed.data; }
  } else if (parsed && parsed.data && typeof parsed.data === "object") {
    Object.keys(parsed.data).forEach(function (key) {
      var v = parsed.data[key];
      if (!Array.isArray(v) || !v.length) { return; }
      var kk = { marques: "brands", brands: "brands", modeles: "models", models: "models", motorisations: "engines", engines: "engines", pannes: "faults", faults: "faults", fiches: "faults", tsb: "tsb", rappels: "tsb", bulletins: "tsb" }[nk(key)] || detectKind(v[0]);
      if (kk) { g[kk] = (g[kk] || []).concat(v); }
    });
  } else if (parsed && parsed.records) {
    var k2 = detectKind(parsed.records[0] || {});
    if (k2) { g[k2] = parsed.records; }
  }
  if (!Object.keys(g).length) {
    rep.innerHTML = "<div class='rep rj'>Aucune collection reconnue.</div>";
    beep("err");
    return;
  }
  var mp = {};
  Object.keys(g).forEach(function (k) {
    mp[k] = [];
    arr(g[k]).forEach(function (r, i) {
      try { mp[k].push(mapRec(r, k)); } catch (e) { rej.push(k + "[" + i + "] " + e); }
    });
  });
  var R = resolveAll(mp);
  var ok = 0;
  Object.keys(R.out).forEach(function (k) { ok += arr(R.out[k]).length; });
  IMPORT = R;
  rep.innerHTML = "<div class='rep'><b class='ok'>" + ok + " prêt(s)</b> · <b class='rj'>" + (rej.length + R.drop.length) + " rejeté(s)</b> · <b class='wn'>" + R.warn.length + " création(s)</b><div class='mono' style='font-size:10px;margin-top:5px'>" + esc(parsed.fmt) + (label ? " · " + esc(label) : "") + "</div></div>";
  var ap = $("#impApply");
  if (ap) { ap.disabled = ok === 0; }
  beep(ok ? "ok" : "err");
}
function applyImport() {
  if (!isAdmin() || !IMPORT) { return; }
  snapshot("import");
  var ins = 0, up = 0;
  ["brands", "models", "engines", "faults", "tsb"].forEach(function (k) {
    arr(IMPORT.out[k]).forEach(function (r) {
      if (upsert(k, r) === "add") { ins++; } else { up++; }
    });
  });
  IMPORT = null;
  mutate("imp", "Import " + ins + "+" + up);
  saveNow(true);
  toast("ok", "Import fusionné", ins + " ajouts, " + up + " maj", true);
  beep("imp");
}
function megaSilent(i) {
  var c = arr(RAW.cand)[i];
  if (!c) { return; }
  if (!BIDX[c.brand]) {
    DB.brands.push({ id: c.brand, n: c.brand, pays: "—", grp: "—", region: "europe" });
    reindex();
  }
  var mid2 = c.brand + "-" + slug(c.model);
  var m = MIDX[mid2];
  if (!m) {
    DB.models.push({ id: mid2, b: c.brand, n: c.model, y: [c.y0, c.y1], seg: str(SEGS[c.seg], "Compacte"), phase: c.phase });
    reindex();
    m = MIDX[mid2];
  }
  if (!m) { return; }
  var dup = arr(DB.engines).some(function (e) {
    return arr(e.m).indexOf(mid2) > -1 && e.code === c.code && e.hp === c.hp;
  });
  if (dup) { return; }
  DB.engines.push(mkEng(arr(DB.engines).length + 1, mid2, c.code, c.code, c.label, c.fuel, c.disp, c.hp, c.nm, c.y0, c.y1, c.gb));
}

/* ---------- événements ---------- */
function bind() {
  D.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-act]") : null;
    if (!el) {
      if (!(ev.target.closest && ev.target.closest(".omni"))) { omniClose(); }
      return;
    }
    var a = el.dataset.act;
    var id = el.dataset.id;
    if (a === "gateAdmin") { gateShow("admin"); return; }
    if (a === "gateTier") { regLoad(); gateShow("tier"); return; }
    if (a === "gateBack") { gateShow(null); return; }
    if (a === "purge") { purgeCache(false); toast("ok", "Cache purgé", purgeLabel()); setTimeout(function () { location.reload(); }, 400); return; }
    if (a === "purgeAll") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      purgeCache(true);
      setTimeout(function () { location.reload(); }, 400);
      return;
    }
    if (a === "saveNow") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      saveNow(false);
      beep("ok");
      return;
    }
    if (a === "backupExp") { backupExport(); return; }
    if (a === "backupImp") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      var bf = $("#bakFile");
      if (bf) { bf.click(); }
      return;
    }
    if (a === "autoNow") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      var r = AUTO.sweep("manuel", false);
      toast(r.total ? "ok" : "info", "Recherche auto massive", r.total ? "+" + r.m + " modèles, +" + r.e + " mot., +" + r.f + " pannes, +" + r.t + " bulletins" : "Base déjà complète.");
      saveNow(true);
      render();
      beep("imp");
      return;
    }
    if (a === "autoFull") {
      if (!isAdmin()) { return; }
      snapshot("auto-full");
      var r2 = AUTO.sweep("cycle 30 jours", true);
      toast("ok", "Cycle complet terminé", r2.total + " complément(s).");
      saveNow(true);
      render();
      beep("imp");
      return;
    }
    if (a === "autoToggle") {
      if (!isAdmin()) { return; }
      AUTO.load();
      AUTO.st.onLaunch = !AUTO.st.onLaunch;
      AUTO.saveSt();
      render();
      return;
    }
    if (a === "tierOpen") {
      if (!isAdmin()) { return; }
      REG.tierOpen = !!el.checked;
      if (!REG.tierOpen) { REG.tierKick = Date.now(); }
      regLog(REG.tierOpen ? "Accès tiers autorisé" : "Accès tiers coupé");
      regSave();
      render();
      return;
    }
    if (a === "kickTier") {
      if (!isAdmin()) { return; }
      REG.tierKick = Date.now();
      regLog("Révocation session tiers");
      regSave();
      toast("warn", "Session tiers révoquée");
      render();
      return;
    }
    if (a === "omniSeed") {
      var o = $("#omni");
      if (o) { o.value = el.dataset.q; S.omni.q = el.dataset.q; o.focus(); omniRender(); }
      return;
    }
    if (a === "omniHit") { omniGo(el.dataset.kind, id); return; }
    if (a === "msearch") {
      var q = prompt("Recherche :");
      if (q) {
        var o2 = $("#omni");
        if (o2) { o2.value = q; S.omni.q = q; omniRender(); o2.focus(); }
      }
      return;
    }
    if (a === "snd") { PREF.sound = !PREF.sound; markDirty(); updateMeta(); return; }
    if (a === "run") { WP.set("run", !WP.P.run); return; }
    if (a === "goStudio") { location.hash = "#/studio"; return; }
    if (a === "goAdmin") {
      if (isAdmin()) { location.hash = "#/admin"; } else { gateShow("admin"); }
      return;
    }
    if (a === "goDiag") { location.hash = "#/diagnostic"; return; }
    if (a === "goPlan") { location.hash = "#/entretien"; return; }
    if (a === "runTests") { runTests(); location.hash = "#/diagnostic"; render(); return; }
    if (a === "expTests") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      download("rapport_tests.json", JSON.stringify({ cache: PURGED, auto: AUTO.st, tests: TESTS }, null, 2));
      return;
    }
    if (a === "integrity") {
      var g = META.integ;
      var hh = "<div class='mh'><h3>Intégrité</h3><button class='tb' data-act='mclose'>" + ic("x") + "</button></div>";
      hh += "<div class='mb2'><div class='rep'><b class='" + (g.ok ? "ok" : "rj") + "'>" + (g.ok ? "INTÈGRE" : "ERREURS") + "</b> " + g.pct + "%<ul>";
      hh += g.err.slice(0, 20).map(function (e) { return "<li class='rj'>" + esc(e) + "</li>"; }).join("");
      hh += "</ul></div></div><div class='mf'><button class='btn pri' data-act='mclose'>Fermer</button></div>";
      openModal(hh, "slim");
      return;
    }
    if (a === "undo") { doUndo(); return; }
    if (a === "mclose") { closeModal(); return; }
    if (a === "mscrim") { if (ev.target === el) { closeModal(); } return; }
    if (a === "openEng") { omniClose(); openDetail("engine", id); return; }
    if (a === "openFault") { omniClose(); openDetail("fault", id); return; }
    if (a === "openTsb") { omniClose(); openDetail("tsb", id); return; }
    if (a === "selEng") {
      var e = EIDX[id];
      if (e) {
        var m = modelOf(e);
        S.sel = { b: m ? m.b : "", m: m ? m.id : "", e: id };
        closeModal();
        location.hash = "#/entretien";
      }
      return;
    }
    if (a === "expEng") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      var xe = EIDX[id];
      if (xe) {
        download("fiche_" + xe.code + ".json", JSON.stringify({ engine: xe, plan: buildPlan(xe, modelOf(xe), brandOf(xe)) }, null, 2));
      }
      return;
    }
    if (a === "ffuel") {
      var k = el.dataset.k;
      var i = arr(S.f.fuel).indexOf(k);
      if (i > -1) { S.f.fuel.splice(i, 1); } else { S.f.fuel.push(k); }
      S.shown = 48;
      render();
      return;
    }
    if (a === "resetSel") { S.sel = { b: "", m: "", e: "" }; S.f = { q: "", fuel: [], region: "", sort: "brand" }; render(); return; }
    if (a === "more") { S.shown += 48; render(); return; }
    if (a === "techTab") { S.tech.tab = el.dataset.t; render(); return; }
    if (a === "admTab") {
      if (!isAdmin()) { return; }
      S.adm.tab = el.dataset.t;
      render();
      return;
    }
    if (a === "expAll") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      download("mecadata_base.json", JSON.stringify(DB, null, 2));
      return;
    }
    if (a === "fileExp") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      download(el.dataset.k + ".json", JSON.stringify(arr(DB[el.dataset.k]), null, 2));
      return;
    }
    if (a === "publish") { publish(false); render(); return; }
    if (a === "dzPick") {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      var f = $("#impFile");
      if (f) { f.click(); }
      return;
    }
    if (a === "impAnalyze") {
      if (!isAdmin()) { return; }
      var ta = $("#impText");
      if (!ta || !ta.value.trim()) {
        var rp = $("#impReport");
        if (rp) { rp.innerHTML = "<div class='rep rj'>Aucune donnée.</div>"; }
        return;
      }
      try { analyze(sniff("paste.txt", ta.value), "collage"); } catch (e) {
        var rp2 = $("#impReport");
        if (rp2) { rp2.innerHTML = "<div class='rep rj'>" + esc(String(e)) + "</div>"; }
      }
      return;
    }
    if (a === "impApply") { applyImport(); return; }
    if (a === "megaAdd") {
      if (!isAdmin()) { return; }
      megaSilent(num(el.dataset.i, -1));
      mutate("mega", "Candidat intégré");
      return;
    }
    if (a === "megaAll") {
      if (!isAdmin()) { return; }
      snapshot("mega");
      var q2 = nk(S.adm.mega);
      arr(RAW.cand).filter(function (c) {
        return c && (!q2 || nk(c.brand + c.model + c.code + c.label).indexOf(q2) > -1);
      }).forEach(function (c) { megaSilent(arr(RAW.cand).indexOf(c)); });
      mutate("mega", "Mise à jour massive");
      saveNow(true);
      toast("ok", "Méga-base enrichie");
      return;
    }
    if (a === "askReset") { confirmModal("Réinitialiser ?", "Base remplacée par l'usine.", "doReset", "Réinitialiser"); return; }
    if (a === "doReset") {
      closeModal();
      snapshot("reset");
      DB = clone(SEED);
      normalize(DB);
      mutate("del", "Base usine");
      saveNow(true);
      return;
    }
    if (a === "logout") { MODE = null; TIER = null; gateShow(null); updateMeta(); return; }
    if (a === "stMode") { WP.set("mode", el.dataset.m); return; }
    if (a === "stTheme") { WP.P.useCustom = false; WP.set("theme", el.dataset.t); return; }
    if (a === "stPreset") {
      var ps = WP.PRESETS[el.dataset.n];
      if (ps) {
        Object.keys(ps).forEach(function (k) { WP.P[k] = ps[k]; });
        WP.apply();
        WP.resize();
        render();
      }
      return;
    }
    if (a === "stRandom") { WP.randomize(); render(); return; }
    if (a === "stReset") { WP.reset(); render(); return; }
    if (a === "stRun") { WP.set("run", !WP.P.run); render(); return; }
    if (a === "stDir") { WP.set("dir", WP.P.dir > 0 ? -1 : 1); render(); return; }
    if (a === "stCustom") { WP.P.useCustom = !!el.checked; WP.drawAll(); markDirty(); WP.sync(); return; }
  });
  D.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t) { return; }
    if (t.id === "omni") { S.omni.q = t.value; omniRender(); return; }
    if (t.dataset && t.dataset.tfilter) {
      S.tf = t.value;
      var tl = $("#testList");
      if (tl) { tl.innerHTML = testListHTML(); }
      return;
    }
    if (t.dataset && t.dataset.c) { WP.setCustom(t.dataset.c, t.value); return; }
    if (t.dataset && t.dataset.p) {
      var k = t.dataset.p;
      var v;
      if (t.type === "checkbox") { v = t.checked; }
      else if (t.tagName === "SELECT") { v = k === "dir" ? num(t.value, 1) : t.value; }
      else { v = num(t.value, 0); }
      WP.set(k, v);
      return;
    }
    if (t.dataset && t.dataset.f) {
      S.f[t.dataset.f] = t.value;
      if (t.dataset.f === "region") { S.sel = { b: "", m: "", e: "" }; }
      S.shown = 48;
      deb(render, 140)();
      return;
    }
    if (t.dataset && t.dataset.tf) {
      S.tech[t.dataset.tf] = t.value;
      if (t.dataset.tf === "region") { S.tech.brand = ""; S.tech.model = ""; }
      if (t.dataset.tf === "brand") { S.tech.model = ""; }
      deb(render, 160)();
      return;
    }
    if (t.dataset && t.dataset.mega) { S.adm.mega = t.value; deb(render, 160)(); return; }
    if (t.dataset && t.dataset.calc) {
      S.calc[t.dataset.calc] = num(t.value, 0);
      var dl = $("#dueList");
      var e = selEngine();
      if (dl && e) { dl.innerHTML = dueHTML(buildPlan(e, modelOf(e), brandOf(e))); }
      return;
    }
  });
  D.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!t) { return; }
    if (t.dataset && t.dataset.sel) {
      var k = t.dataset.sel;
      S.sel[k] = t.value;
      if (k === "b") { S.sel.m = ""; S.sel.e = ""; }
      if (k === "m") { S.sel.e = ""; }
      S.shown = 48;
      render();
      return;
    }
    if (t.dataset && t.dataset.calc === "sev") {
      S.calc.sev = num(t.value, 1);
      var dl = $("#dueList");
      var e = selEngine();
      if (dl && e) { dl.innerHTML = dueHTML(buildPlan(e, modelOf(e), brandOf(e))); }
      return;
    }
    if (t.dataset && t.dataset.act === "liveToggle") {
      if (!isAdmin()) { return; }
      REG.live = !!t.checked;
      regLog("Diffusion " + (REG.live ? "ON" : "OFF"));
      if (REG.live) { publish(true); }
      regSave();
      render();
      return;
    }
    if (t.id === "bakFile" && t.files && t.files[0]) {
      if (!isAdmin()) { return; }
      var rd = new FileReader();
      rd.onload = function () {
        safe("bak", function () { backupRestore(JSON.parse(String(rd.result))); }, null);
      };
      rd.readAsText(t.files[0]);
      return;
    }
    if (t.id === "impFile" && t.files && t.files[0]) {
      if (!isAdmin()) { toast("err", "Réservé admin"); return; }
      var f = t.files[0];
      var rd2 = new FileReader();
      rd2.onload = function () {
        var ta = $("#impText");
        if (ta) { ta.value = String(rd2.result).slice(0, 200000); }
        try { analyze(sniff(f.name, String(rd2.result)), f.name); } catch (e) {}
      };
      rd2.readAsText(f);
      return;
    }
  });
  D.addEventListener("submit", function (ev) {
    var form = ev.target.closest ? ev.target.closest("[data-form]") : null;
    if (!form) { return; }
    ev.preventDefault();
    var fd = new FormData(form);
    if (form.dataset.form === "admin") {
      var p = $("#gatePwd");
      if (p) { p.value = ""; }
      if (fd.get("pwd") === PWD) { enterAdmin(); }
      else { toast("err", "Mot de passe incorrect"); beep("err"); gateShow("admin"); }
      return;
    }
    if (form.dataset.form === "tier") {
      var inp = $("#gateTierPwd");
      var val = String(fd.get("tpwd") || "");
      if (inp) { inp.value = ""; }
      regLoad();
      if (REG.tierOpen === false) { toast("err", "Accès tiers coupé"); gateShow("tier"); return; }
      if (val !== TPWD) { toast("err", "Mot de passe tiers incorrect"); beep("err"); gateShow("tier"); return; }
      enterTier();
      return;
    }
  });
  D.addEventListener("dragover", function (ev) {
    var dz = ev.target.closest ? ev.target.closest("#dz") : null;
    if (dz && isAdmin()) { ev.preventDefault(); dz.classList.add("over"); }
  });
  D.addEventListener("drop", function (ev) {
    var dz = ev.target.closest ? ev.target.closest("#dz") : null;
    if (!dz) { return; }
    ev.preventDefault();
    dz.classList.remove("over");
    if (!isAdmin()) { toast("err", "Réservé admin"); return; }
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!f) { return; }
    var rd = new FileReader();
    rd.onload = function () {
      try { analyze(sniff(f.name, String(rd.result)), f.name); } catch (e) {}
    };
    rd.readAsText(f);
  });
  D.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      if (modalOpen) { closeModal(); }
      else { omniClose(); }
      return;
    }
    if (ev.key === "/" && !/input|textarea|select/i.test(ev.target.tagName)) {
      var o = $("#omni");
      if (o && MODE) { ev.preventDefault(); o.focus(); }
      return;
    }
    if (ev.target && ev.target.id === "omni") {
      var box = $("#omnires");
      var els = box ? $$(".hit", box) : [];
      if (ev.key === "ArrowDown" && els.length) {
        ev.preventDefault();
        S.omni.idx = clamp(S.omni.idx + 1, 0, els.length - 1);
        els.forEach(function (x, i) { x.classList.toggle("sel", i === S.omni.idx); });
      } else if (ev.key === "ArrowUp" && els.length) {
        ev.preventDefault();
        S.omni.idx = clamp(S.omni.idx - 1, 0, els.length - 1);
        els.forEach(function (x, i) { x.classList.toggle("sel", i === S.omni.idx); });
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        var p = els[S.omni.idx] || els[0];
        if (p) { omniGo(p.dataset.kind, p.dataset.id); }
      }
    }
  });
  window.addEventListener("hashchange", function () {
    if (!MODE) { return; }
    route();
  });
  window.addEventListener("storage", function (ev) {
    if (ev.key === AKEY) {
      regLoad();
      if (isTier()) { tierSync(); }
      else if (isAdmin()) {
        updateMeta();
        if (S.view === "admin") { render(); }
      }
    }
    if (ev.key === PKEY && isTier()) { tierSync(); }
  });
  window.addEventListener("pagehide", function () { if (isAdmin()) { saveNow(true); } });
  D.addEventListener("visibilitychange", function () { if (D.hidden && isAdmin()) { saveNow(true); } });
  setInterval(function () {
    var c = $("#clk");
    if (c) { c.textContent = new Date().toLocaleTimeString("fr-FR"); }
  }, 1000);
  setInterval(function () { if (isAdmin() && DIRTY) { saveNow(true); } }, 15000);
  setInterval(function () {
    if (!CH && isTier()) { regLoad(); tierSync(); }
  }, 2000);
}
function route() {
  var h = (location.hash || "#/bord").replace("#/", "");
  var ok = isTier() ? ["bord", "explorer", "tech", "entretien", "studio", "diagnostic"] : ["bord", "explorer", "tech", "entretien", "studio", "admin", "diagnostic"];
  S.view = ok.indexOf(h) > -1 ? h : "bord";
  render();
}
function boot() {
  var o = $("#boot");
  var done = function () { if (o) { o.className = "off"; } };
  setTimeout(done, 700);
  var lg = $("#bl");
  var bb = $("#bbar");
  if (lg) { lg.innerHTML = "<div><b>OK</b> base chargée · portail prêt</div>"; }
  if (bb) { bb.style.width = "100%"; }
}
function init() {
  purgeCache(false);
  if (!window.MD_RAW) {
    logErr("init", new Error("MD_RAW absent"));
    window.__MD_READY = false;
    if (window.__MD_FAIL) { window.__MD_FAIL(); }
    return;
  }
  RAW = window.MD_RAW;
  SEED = safe("build", function () { return build(RAW); }, { brands: [], models: [], engines: [], faults: [], tsb: [] });
  safe("norm", function () { normalize(SEED); }, null);
  DB = clone(SEED);
  safe("reg", regLoad, null);
  safe("autoload", function () { AUTO.load(); }, null);
  safe("recompute", recompute, null);
  safe("ch", function () {
    if (window.BroadcastChannel) {
      CH = new BroadcastChannel("mecadata_v17");
      CH.onmessage = function (ev) {
        var m = ev.data || {};
        if (m.t === "reg") {
          regLoad();
          if (isTier()) { tierSync(); }
          else if (isAdmin()) {
            updateMeta();
            if (S.view === "admin") { render(); }
          }
        }
        if (m.t === "pub" && isTier()) { tierSync(); }
      };
    }
  }, null);
  safe("wp", function () { WP.init(); }, null);
  safe("bind", bind, null);
  safe("meta", updateMeta, null);
  safe("boot", boot, null);
  safe("gate", function () { gateShow(null); }, null);
  window.__MD_READY = true;
  window.__MD_SCRIPTS.app = true;
  var jf = $("#jsfail");
  if (jf && jf.parentNode) { jf.parentNode.removeChild(jf); }
  var fb = $("#fallback");
  if (fb && fb.parentNode) { fb.parentNode.removeChild(fb); }
  idle(function () { safe("tests", runTests, null); }, 900);
  setTimeout(function () { toast("ok", "Cache purgé à l'ouverture", purgeLabel()); }, 1800);
}
safe("init", init, null);
if (!window.__MD_READY) {
  if (window.__MD_LIFT) { window.__MD_LIFT(); }
  var g0 = $("#gate");
  if (g0) { g0.className = "off"; }
}
