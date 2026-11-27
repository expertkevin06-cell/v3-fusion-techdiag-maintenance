/* MECADATA // FILTRE MOTORISATION RÉELLE v22
   Ajoute au module « PANNES · TSB · RAPPELS » une case de sélection de la
   motorisation réelle et de sa puissance (code, ch, Nm, années de production).
   Les résultats affichés (pannes détaillées, campagnes de rappel, TSB,
   bulletins techniques) sont alors restreints à ceux réellement corrélés
   à cette motorisation précise, en plus des filtres marque / modèle / phase /
   sévérité / domaine / kilométrage / texte déjà présents.
   Module greffé : aucune réécriture du noyau ni des vues existantes. */
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

  var ENG = "";
  var ROW_ID = "tfEngRow";

  function tst() {
    return (W.MD_STATE && W.MD_STATE.tech) ? W.MD_STATE.tech : null;
  }
  function db() { return W.DB || { brands: [], models: [], engines: [], faults: [], tsb: [] }; }
  function engineById(id) {
    var f = null;
    A(db().engines).forEach(function (e) { if (e && e.id === id) { f = e; } });
    return f;
  }
  function modelById(id) {
    var f = null;
    A(db().models).forEach(function (m) { if (m && m.id === id) { f = m; } });
    return f;
  }
  function brandById(id) {
    var f = null;
    A(db().brands).forEach(function (b) { if (b && b.id === id) { f = b; } });
    return f;
  }
  function years(e) {
    var y = A(e && e.y);
    var a = N(y[0], 2017), b = N(y[1], 2027);
    if (a > b) { var t = a; a = b; b = t; }
    return a + "-" + b;
  }

  /* ---------- options du sélecteur ---------- */
  function engineList() {
    var st = tst();
    var out = [];
    if (!st) { return out; }
    if (st.model) {
      if (typeof W.enginesOf === "function") { out = A(W.enginesOf(st.model)); }
    } else if (st.brand) {
      A(db().engines).forEach(function (e) {
        if (!e) { return; }
        var m = modelById(A(e.m)[0]);
        if (m && m.b === st.brand) { out.push(e); }
      });
      out = out.slice(0, 400);
    }
    out.sort(function (a, b) { return a.hp - b.hp; });
    return out;
  }
  function optionLabel(e) {
    return e.label + " · " + e.hp + " ch / " + e.kw + " kW · " + e.nm + " Nm · " + e.code + " · " + years(e) + " · " + e.gb;
  }

  /* ---------- injection de la case ---------- */
  function ensureRow() {
    var panel = q("#view .card.panel");
    if (!panel) { return null; }
    var row = q("#" + ROW_ID);
    if (!row) {
      row = D.createElement("div");
      row.id = ROW_ID;
      row.className = "fr";
      row.style.marginTop = "10px";
      row.innerHTML =
        "<div><label class='lb'>4 · Motorisation réelle & puissance</label>" +
        "<select class='sel' data-techeng='1' id='tfEngSel'></select></div>" +
        "<div id='tfChip' style='align-self:end;display:flex;gap:6px;flex-wrap:wrap'></div>";
      panel.appendChild(row);
    }
    var sel = q("#tfEngSel", row);
    var list = engineList();
    var st = tst();
    if (!list.length) {
      sel.disabled = true;
      sel.innerHTML = "<option value=''>" + (st && st.brand ? "Aucune motorisation pour ce filtre" : "Choisir d'abord une marque ou un modèle") + "</option>";
      if (ENG) { ENG = ""; }
    } else {
      var valid = false;
      list.forEach(function (e) { if (e.id === ENG) { valid = true; } });
      if (!valid) { ENG = ""; }
      sel.disabled = false;
      var h = "<option value=''>Toutes les motorisations (" + list.length + ")</option>";
      list.forEach(function (e) {
        h += "<option value='" + E(e.id) + "'" + (ENG === e.id ? " selected" : "") + ">" + E(optionLabel(e)) + "</option>";
      });
      sel.innerHTML = h;
      sel.value = ENG;
    }
    paintChip();
    return row;
  }
  function paintChip() {
    var chip = q("#tfChip");
    if (!chip) { return; }
    var e = ENG ? engineById(ENG) : null;
    if (!e) {
      chip.innerHTML = "<span class='tag' style='color:#61748C'>Aucune motorisation sélectionnée : résultats sur tout le périmètre filtré.</span>";
      return;
    }
    var m = modelById(A(e.m)[0]);
    var b = m ? brandById(m.b) : null;
    var fs = typeof W.faultsFor === "function" ? W.faultsFor(e) : [];
    var ts = typeof W.tsbFor === "function" ? W.tsbFor(e) : [];
    var rc = ts.filter(function (t) { return t && (t.cat === "Rappel" || /^RPL-/.test(String(t.ref))); }).length;
    var h = "";
    h += "<span class='tag' style='color:#25D4EE;border-color:rgba(37,212,238,.4)'>" + IC("piston", "width:10px;height:10px") + E((b ? b.n + " " : "") + (m ? m.n : "")) + "</span>";
    h += "<span class='tag' style='color:#FFD60A;border-color:rgba(255,214,10,.4)'>" + E(e.label) + " · " + e.hp + " ch · " + e.nm + " Nm</span>";
    h += "<span class='tag'>" + E(e.code) + " · " + years(e) + "</span>";
    h += "<span class='tag' style='color:#FF4D5E;border-color:rgba(255,77,94,.4)'>" + fs.length + " panne(s)</span>";
    h += "<span class='tag' style='color:#FFD60A;border-color:rgba(255,214,10,.4)'>" + rc + " rappel(s)</span>";
    h += "<span class='tag' style='color:#4D8DFF;border-color:rgba(77,141,255,.4)'>" + ts.length + " bulletin(s)</span>";
    h += "<button class='btn xs ghost' data-tfclear='1'>" + IC("x", "width:10px;height:10px") + "Effacer</button>";
    chip.innerHTML = h;
  }

  /* ---------- filtrage des résultats affichés ---------- */
  function applyFilter() {
    var view = q("#view");
    if (!view) { return; }
    var e = ENG ? engineById(ENG) : null;
    var fset = {}, tset = {};
    if (e) {
      if (typeof W.faultsFor === "function") {
        W.faultsFor(e).forEach(function (f) { if (f) { fset[f.id] = 1; } });
      }
      if (typeof W.tsbFor === "function") {
        W.tsbFor(e).forEach(function (t) { if (t) { tset[t.id] = 1; } });
      }
    }
    var grid = q(".eg", view);
    var shown = 0, total = 0;
    if (grid) {
      A(grid.children).forEach(function (wrap) {
        var btn = wrap.querySelector("[data-act='openFault'],[data-act='openTsb']");
        if (!btn) { return; }
        total++;
        var id = btn.getAttribute("data-id");
        var act = btn.getAttribute("data-act");
        var ok = !e || (act === "openFault" ? !!fset[id] : !!tset[id]);
        wrap.style.display = ok ? "" : "none";
        if (ok) { shown++; }
      });
    }
    var cnt = q(".bar .cnt", view);
    if (cnt) {
      if (e) {
        cnt.textContent = shown + " / " + total + " résultat(s) corrélé(s) à " + e.label + " " + e.hp + " ch";
        cnt.style.color = "#25D4EE";
      } else {
        cnt.style.color = "";
      }
    }
    var empty = q(".eg .empty", view);
    if (!grid || !total) { return; }
    var note = q("#tfEmptyNote", view);
    if (shown === 0 && e) {
      if (!note) {
        note = D.createElement("div");
        note.id = "tfEmptyNote";
        note.className = "empty";
        note.style.gridColumn = "1/-1";
        note.style.marginTop = "10px";
        grid.parentNode.insertBefore(note, grid.nextSibling);
      }
      note.innerHTML = IC("alert", "width:22px;height:22px;color:#FFAF2E") +
        "<p><b>Aucune panne, rappel ou bulletin corrélé à cette motorisation avec les filtres actuels.</b></p>" +
        "<p class='dim' style='font-size:12px;margin-top:6px'>Élargissez la sévérité, le domaine ou l'année, ou effacez la motorisation pour revenir au périmètre complet.</p>";
    } else if (note) {
      note.parentNode.removeChild(note);
    }
  }

  function applyTech() {
    if (!W.MD_STATE || W.MD_STATE.view !== "tech") { return; }
    ensureRow();
    applyFilter();
  }

  /* ---------- greffe sur le rendu ---------- */
  function hookRender() {
    if (typeof W.render !== "function" || W.render.__tf) { return false; }
    var orig = W.render;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          try { applyTech(); } catch (e) {}
        });
      });
      return r;
    };
    wrapped.__tf = 1;
    W.render = wrapped;
    return true;
  }

  /* ---------- événements ---------- */
  D.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute || !t.getAttribute("data-techeng")) { return; }
    ENG = t.value || "";
    paintChip();
    applyFilter();
    if (W.beep) { W.beep("tick"); }
  });
  D.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-tfclear]") : null;
    if (!el) { return; }
    ENG = "";
    var sel = q("#tfEngSel");
    if (sel) { sel.value = ""; }
    paintChip();
    applyFilter();
    if (W.beep) { W.beep("tick"); }
  });
  D.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) { return; }
    if (t.getAttribute("data-tf") === "brand" || t.getAttribute("data-tf") === "model") {
      setTimeout(function () {
        ENG = "";
        applyTech();
      }, 220);
    }
  });

  /* ---------- démarrage ---------- */
  function boot() {
    if (!W.MD_API || !W.DB || !A(W.DB.engines).length) { return false; }
    if (!hookRender()) { return false; }
    setTimeout(applyTech, 400);
    W.MD_TECHFILT = {
      get: function () { return ENG; },
      set: function (id) {
        ENG = id || "";
        applyTech();
      },
      apply: applyTech,
      clear: function () { ENG = ""; applyTech(); }
    };
    return true;
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (boot() || tries > 200) { clearInterval(iv); }
  }, 150);
  W.addEventListener("load", function () { setTimeout(boot, 300); });
})();
