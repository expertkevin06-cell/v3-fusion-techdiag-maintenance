/* MECADATA // POIDS LOURDS — univers séparé du tourisme.
   Marques européennes, modèles, motorisations & puissances réelles,
   pannes détaillées 2017-2027, campagnes de rappel, TSB, bulletins.
   Fond dynamique : camion moderne type 24 Heures du Mans sur circuit. */
(function () {
  "use strict";
  var D = document;
  function $(s) { return D.querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function fmt(n) { n = num(n, 0); try { return n.toLocaleString("fr-FR"); } catch (e) { return String(n); } }
  function nk(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function slug(s) { return nk(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x"; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { var s = String(v == null ? "" : v).trim(); return s || (d == null ? "" : d); }
  function list(v) { return Array.isArray(v) ? v.filter(Boolean) : String(v == null ? "" : v).split(/[;,|]/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function pair(v, d) { var a = arr(v); return [num(a[0], d[0]), num(a[1], d[1])]; }
  function kmOf(f) { var p = pair(f && f.km, [0, 600000]); return p[0] > p[1] ? [p[1], p[0]] : p; }
  function yOf(f) { var p = pair(f && f.y, [2017, 2027]); return p[0] > p[1] ? [p[1], p[0]] : p; }
  function ic(n, st) { return "<svg class='ic'" + (st ? " style='" + st + "'" : "") + "><use href='#i-" + n + "'/></svg>"; }

  var SEGS = ["Tracteur routier", "Porteur lourd", "Chantier", "Distribution", "Moyen tonnage", "Bus & Autocar"];
  var SV = { critique: { w: 32, c: "#FF3B30" }, majeure: { w: 18, c: "#FF6A00" }, "modérée": { w: 9, c: "#FFD60A" }, mineure: { w: 4, c: "#35C4E8" }, info: { w: 0, c: "#3DDC84" } };
  var FQ = { "élevée": 1.25, moyenne: 1, faible: 0.7 };
  function nsev(v) { var k = nk(v), m = { critique: "critique", majeure: "majeure", moderee: "modérée", mineure: "mineure", info: "info" }; return m[k] || (SV[v] ? v : "modérée"); }
  function nfreq(v) { var k = nk(v), m = { elevee: "élevée", moyenne: "moyenne", faible: "faible" }; return m[k] || (FQ[v] ? v : "moyenne"); }

  var PLB = [
    ["daf", "DAF Trucks", "Pays-Bas", "Paccar"], ["volvt", "Volvo Trucks", "Suède", "Volvo Group"],
    ["scania", "Scania", "Suède", "Scania Group"], ["mbt", "Mercedes-Benz Trucks", "Allemagne", "Daimler Truck"],
    ["man", "MAN", "Allemagne", "Traton"], ["iveco", "Iveco", "Italie", "Iveco Group"],
    ["rt", "Renault Trucks", "France", "Volvo Group"], ["ft", "Ford Trucks", "Turquie", "Ford Otosan"],
    ["setra", "Setra", "Allemagne", "Daimler Bus"], ["solaris", "Solaris", "Pologne", "Solaris Bus"]
  ];
  var PLM = {
    daf: "XF^2017^2021^0^1|XG^2021^2027^0^2|XG+^2022^2027^0^2|CF^2017^2027^1^2|LF^2017^2027^4^2|XB^2023^2027^3^1",
    volvt: "FH^2017^2027^0^5|FH16^2017^2027^0^4|FH Electric^2021^2027^0^2|FM^2017^2027^1^4|FMX^2017^2027^2^4|FL^2017^2027^3^3|FE^2017^2027^4^3",
    scania: "S^2017^2027^0^2|R^2017^2027^0^2|G^2017^2027^1^2|P^2017^2027^3^2|L^2017^2027^5^2|XT^2017^2027^2^2",
    mbt: "Actros^2017^2027^0^5|Actros L^2021^2027^0^5|eActros^2021^2027^3^2|Arocs^2017^2027^2^4|Arocs Loader^2019^2027^2^4|Atego^2017^2027^3^4|Econic^2017^2027^3^3",
    man: "TGX^2017^2020^0^3|TGX GM^2020^2027^0^4|eTGX^2024^2027^0^1|TGS^2017^2027^1^4|TGM^2017^2027^3^3|TGE^2017^2027^4^2",
    iveco: "S-Way^2019^2027^0^2|X-Way^2017^2027^2^2|T-Way^2021^2027^2^1|Eurocargo^2017^2027^3^3|Daily^2017^2027^4^3|eDaily^2022^2027^4^2",
    rt: "T^2017^2027^0^3|T E-Tech^2023^2027^0^2|C^2017^2027^1^3|K^2017^2027^2^3|D^2017^2027^3^3|D Wide^2017^2027^3^3",
    ft: "F-MAX^2018^2027^0^2|F-ECO^2021^2027^0^2|F-LINE^2019^2027^1^2",
    setra: "ComfortClass 500^2017^2027^5^5|TopClass 500^2017^2027^5^5|ComfortClass 600^2023^2027^5^6",
    solaris: "Urbino 12^2017^2027^5^4|Urbino 18^2017^2027^5^4|Urbino Electric^2017^2027^5^5|InterUrbino^2019^2027^5^2"
  };
  var PLE = [
    "MX11|d|10800|PACCAR MX-11|370:1900,410:2000,450:2100|ZF Traxon|2017|2027|daf|0;1;3",
    "MX13|d|12900|PACCAR MX-13|430:2300,480:2500,530:2600|ZF Traxon|2017|2027|daf|0;1",
    "PX7|d|6700|PACCAR PX-7|250:950,280:1050,310:1200|ZF AS-Tronic|2017|2027|daf|3;4",
    "PX9|d|8900|PACCAR PX-9|360:1400,390:1500|ZF Traxon|2017|2027|daf|1;3",
    "VOD8|d|8000|Volvo D8|250:950,280:1100|I-Shift|2017|2027|volvt|3;4",
    "VOD11|d|11000|Volvo D11|380:1700,430:1900|I-Shift|2017|2027|volvt|1;3",
    "VOD13|d|13000|Volvo D13|420:2100,460:2300,500:2500,540:2600|I-Shift|2017|2027|volvt|0;1",
    "VOD17|d|16100|Volvo D17 FH16|750:3550|I-Shift|2017|2027|volvt|0",
    "VOEL|b|0|Volvo FH Electric|450:1200,666:1200|I-Shift|2021|2027|volvt|0;3",
    "SDC09|d|9300|Scania DC09|280:1200,320:1400,360:1550|Opticruise|2017|2027|scania|3;4;5",
    "SDC13|d|12700|Scania DC13|370:1700,410:1900,450:2100,500:2300|Opticruise|2017|2027|scania|0;1;3",
    "SDC16|d|16400|Scania DC16|520:2500,580:2700,650:3000,770:3300|Opticruise|2017|2027|scania|0;2",
    "MOM936|d|7700|OM 936|240:900,270:1000,300:1200,350:1400|PowerShift 3|2017|2027|mbt;setra|3;4;5",
    "MOM470|d|10700|OM 470|360:1700,390:1800,430:2100|PowerShift 3|2017|2027|mbt|1;3",
    "MOM471|d|12800|OM 471|420:2100,450:2200,480:2300,510:2500,530:2600|PowerShift 3|2017|2027|mbt|0;1",
    "MOM473|d|15600|OM 473|580:2800,630:3000|PowerShift 3|2017|2027|mbt|0;2",
    "MBEL|b|0|eActros / eBus|330:800,400:900,540:1000|Single-speed|2021|2027|mbt;solaris|3;5",
    "MD0836|d|6900|MAN D0836|250:950,290:1100,320:1250|TipMatic|2017|2027|man|3;4",
    "MD1556|d|12400|MAN D1556|330:1600,360:1700,400:1800|TipMatic|2020|2027|man|1;3",
    "MD2676|d|12400|MAN D2676|440:2100,470:2200,510:2400,540:2500|TipMatic|2017|2027|man|0;1",
    "MD3876|d|15200|MAN D3876|560:2700,640:3000|TipMatic|2017|2027|man|0;2",
    "MEL|b|0|MAN eTGX|449:1000|Single-speed|2024|2027|man|0;3",
    "ICF1C|d|3000|Iveco F1C|150:350,170:380,210:400|Hi-Tronix|2017|2027|iveco|4",
    "ICF4H|d|6700|Iveco F4H|220:800,250:900|Hi-Tronix|2017|2027|iveco|3;4",
    "ICC9|d|8700|Iveco Cursor 9|310:1300,340:1400,360:1500,400:1700|Hi-Tronix|2017|2027|iveco|1;3",
    "ICC11|d|11100|Iveco Cursor 11|420:1900,460:2100,480:2200|Hi-Tronix|2017|2027|iveco|0;1",
    "ICC13|d|12900|Iveco Cursor 13|480:2200,510:2300,560:2500|Hi-Tronix|2017|2027|iveco|0;2",
    "ICEL|b|0|Iveco eDaily électrique|350:700,480:900|Single-speed|2022|2027|iveco|3;4",
    "RDTI8|d|7700|Renault DTI 8|250:950,280:1050,320:1200|Optidriver|2017|2027|rt|3;4",
    "RDTI11|d|10800|Renault DTI 11|380:1700,430:1900,460:2000|Optidriver|2017|2027|rt|1;3",
    "RDTI13|d|12800|Renault DTI 13|440:2100,480:2300,520:2500|Optidriver|2017|2027|rt|0;1",
    "REEL|b|0|Renault T E-Tech|450:1000,666:1200|Optidriver|2023|2027|rt|0;3",
    "FEC75|d|7500|Ford Ecotorq 7.5|260:900,300:1000|ZF Traxon|2018|2027|ft|3;4",
    "FEC9|d|9000|Ford Ecotorq 9|330:1200,360:1400|ZF Traxon|2019|2027|ft|1;3",
    "FEC127|d|12700|Ford Ecotorq 12.7|420:2000,460:2200,500:2400|ZF Traxon|2018|2027|ft|0;1",
    "SETH|h|7700|Setra Hybrid Bus|320:1300|PowerShift 3|2019|2027|setra|5",
    "SOEL|b|0|Solaris Urbino Electric|160:600,240:900,320:1200|Single-speed|2017|2027|solaris|5",
    "SOD|d|6700|Solaris Cummins ISB|250:950,280:1050|ZF EcoLife|2017|2027|solaris|5"
  ];
  var PLF = [
    "SCR AdBlue cristallisation countdown|MX13;MX11;VOD13;VOD11;SDC13;MOM471;MD2676;ICC13;RDTI13;FEC127|XF;XG;FH;FM;S;R;Actros;TGX;S-Way;T;F-MAX|1;2;3;4;5|majeure|élevée|2017|2027|60000|450000|Countdown antipollution;P20E8;Odeur ammoniaque;Puissance limitée|Cristallisation urée dans réservoir-pompe et injecteur, sondes NOx dérivées en usage intensif.|Remplacement réservoir-pompe, injecteur urée, sondes NOx, reset SCR, AdBlue ISO 22241.|1200|3200|Rappel partiel constructeur|Antipollution",
    "Sondes NOx dérive Euro 6|MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13;FEC127|XF;FH;S;R;Actros;TGX;S-Way;T;F-MAX|2;3;4;5|modérée|élevée|2018|2027|80000|500000|Voyant moteur;Countdown;Conso AdBlue anormale|Sondes NOx amont/aval fatiguées par cycles thermiques lourds.|Diagnostic guidé, remplacement sonde dérivante, reset apprentissages.|400|1400|Surveillance|Antipollution",
    "DPF colmatage usage urbain|PX7;PX9;VOD8;VOD11;SDC09;MOM936;MD0836;ICC9;RDTI8;FEC75|LF;XB;FL;FE;P;L;Atego;Econic;TGM;Eurocargo;Daily;F-LINE|3;4;5|majeure|élevée|2017|2027|40000|300000|Voyant DPF;Régénérations fréquentes;Mode dégradé|Régénérations incomplètes en distribution urbaine, dilution huile.|Régénération forcée, nettoyage ou remplacement DPF, vidange immédiate si dilution.|300|2800|Surveillance|Antipollution",
    "EGR basse pression encrassée|MX11;MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13|XF;XG;FH;S;R;Actros;TGX;S-Way;T|1;2;3|modérée|moyenne|2017|2027|100000|500000|À-coups;Fumée;Perte puissance|Calamine clapet et radiateur EGR basse pression.|Nettoyage ou remplacement EGR + radiateur, adaptation valise.|350|1500|Surveillance|Antipollution",
    "Injecteurs pompe haute pression limaille|MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13;FEC127|XF;FH;S;Actros;TGX;S-Way;T;F-MAX|1;2;3|critique|faible|2017|2024|200000|900000|Casse injection;Claquement pompe;Mode dégradé permanent|Usure poussoir/came générant limaille dans tout le circuit common rail.|Pompe HP, poussoir, rinçage complet circuit, injecteurs, rampe.|4000|12000|Surveillance renforcée|Injection",
    "Turbo VGT géométrie grippée|MX11;MX13;VOD11;VOD13;SDC13;MOM470;MOM471;MD2676;ICC11;ICC13;RDTI11;RDTI13|XF;XG;FH;FM;S;R;G;Actros;Arocs;TGX;TGS;S-Way;X-Way;T;C|1;2;3|majeure|moyenne|2017|2027|150000|800000|Perte puissance;Sifflement;Fumée noire|Calamine ailettes géométrie variable et actionneur fatigué en longue distance.|Nettoyage mécanisme ou turbo complet, actionneur, apprentissage.|900|3800|Surveillance|Turbo",
    "Courroie accessoires galets usés|MX11;PX7;PX9;VOD8;VOD11;SDC09;MOM936;MD0836;ICC9;RDTI8;FEC9|LF;XB;CF;FL;FE;P;L;Atego;TGM;Eurocargo;Daily;F-LINE|3;4|majeure|moyenne|2017|2027|120000|400000|Sifflement;Voyant batterie;Rupture courroie|Galets tendeurs et courroie poly-V fatigués par vibrations chantier.|Kit courroie + galets + poulie débrayable, contrôle alignement.|250|900|Note entretien|Distribution",
    "Chaîne distribution tendeur|SDC09;SDC13;MOM936;MD0836;MD1556;ICC9;RDTI8|P;G;R;S;Atego;Econic;TGM;Eurocargo;D|2;3;4|majeure|faible|2017|2027|300000|1000000|Cliquetis à froid;Bruit chaîne|Tendeur hydraulique et guides usés sur forts kilométrages.|Kit chaîne + tendeur + guides, contrôle calage, huile spec.|1500|4500|Surveillance|Distribution",
    "Boîte robotisée mécatronique|Traxon;I-Shift;Opticruise;PowerShift;TipMatic;Hi-Tronix;Optidriver|XF;XG;FH;FM;S;R;G;Actros;Arocs;TGX;TGS;S-Way;Eurocargo;T;C;F-MAX|1;2;3;4|majeure|moyenne|2017|2027|200000|900000|À-coups;Passage au point mort;Voyant boîte;Refus de rapport|Mécatronique et embrayage usés par cycles lourds et démarrages en charge.|Mise à jour logiciel, vidange boîte, mécatronique ou embrayage robotisé si défaut pression.|800|4200|TSB logiciel|Transmission",
    "Embrayage robotisé patinage|I-Shift;Opticruise;PowerShift 3;TipMatic|FH;FM;S;R;G;Actros;Arocs;TGX;TGS|1;2|majeure|moyenne|2017|2027|250000|900000|Patinage;Odeur de brûlé;Démarrages en côte difficiles|Disque et diaphragme usés par démarrages en charge répétés.|Remplacement kit embrayage robotisé + apprentissages.|1500|5000|Surveillance|Transmission",
    "Retarder / Intarder fuite huile|SDC13;SDC16;MOM471;MD2676|S;R;G;XT;Actros;Arocs;TGX;TGS|1;2|modérée|moyenne|2017|2027|200000|800000|Perte freinage continu;Fuite huile;Surchauffe|Joint de ralentisseur hydraulique fatigué.|Remplacement joints ralentisseur, contrôle circuit huile et refroidissement.|900|3200|Surveillance|Freinage",
    "EBS valves modulatrices HS|MOM936;MOM471;MD2676;ICC13;MX13;VOD13|Actros;Arocs;Atego;TGX;TGS;S-Way;X-Way;XF;FH;FM|1;2;3|critique|moyenne|2017|2027|150000|700000|Voyant EBS;Freinage déséquilibré;Perte ABS|Valves modulatrices et capteurs de pression défaillants.|Remplacement valves EBS, purge circuit air, test banc freinage.|400|1800|Rappel partiel|Freinage",
    "Sécheur d'air cartouche saturée|*|XF;FH;FM;S;R;Actros;Arocs;TGX;S-Way;T;C;F-MAX;Urbino|1;2;3;4;5|modérée|élevée|2017|2027|60000|120000|Condensation circuit air;Voyant pression;Gel hivernal|Cartouche sécheur saturée entraînant eau dans circuits EBS/suspension.|Remplacement cartouche sécheur, purge réservoirs, contrôle compresseur.|80|300|Note entretien|Freinage",
    "Suspension pneumatique coussin fissuré|Actros;Arocs;TGX;TGS;S-Way;X-Way;XF;CF;FH;FM;T;C;K|XF;CF;FH;FM;FMX;S;R;G;XT;Actros;Arocs;TGX;TGS;S-Way;X-Way;T;C;K|1;2;3|modérée|moyenne|2017|2027|150000|700000|Affaissement essieu;Compresseur permanent;Voyant suspension|Coussins et valves de niveau fatigués par charges cycliques.|Remplacement coussin + valve de niveau, calibration hauteur.|300|1200|Surveillance|Suspension",
    "Direction assistée pompe fuite|MOM936;MD0836;ICC9;PX7;VOD8|Atego;Econic;TGM;Eurocargo;Daily;LF;XB;FL|3;4|majeure|moyenne|2017|2027|200000|800000|Fuite huile direction;Durcissement;Sifflement|Pompe assistée et flexibles fatigués.|Remplacement pompe + flexibles, purge circuit, contrôle crémaillère.|500|1800|Surveillance|Direction",
    "Crémaillère rotules usées|Atego;Daily;Eurocargo;LF;XB;FL;FE|Atego;Econic;Daily;Eurocargo;LF;XB;FL;FE|3;4|majeure|élevée|2017|2027|120000|500000|Jeu direction;Claquement;Usure pneus irrégulière|Rotules et biellettes usées par trottoirs et charges.|Remplacement rotules/biellettes, géométrie complète.|250|1100|Surveillance|Direction",
    "Faisceau remorque connecteur 15 plots|*|XF;FH;FM;S;R;G;Actros;Arocs;TGX;TGS;S-Way;T;C;F-MAX|1;2|modérée|élevée|2017|2027|80000|400000|Défauts éclairage remorque;Voyant remorque|Connecteur 15 plots oxydé et faisceau torsadé fatigué.|Nettoyage/remplacement connecteur, reprise faisceau, test fonctions remorque.|120|600|Surveillance|Électronique",
    "Calculateur VCI / VIC défaillant|VOD11;VOD13;MX11;MX13;SDC13;MOM471|FH;FM;XF;XG;S;R;Actros|1;2|majeure|faible|2017|2024|150000|700000|Voyants multiples;Perte fonctions;Redémarrages|Calculateur véhicule fatigué par chaleur et vibrations.|Remplacement calculateur + programmation + paramétrage fonctions.|800|3000|TSB constructeur|Électronique",
    "Batterie HV e-Truck dégradation|VOEL;MBEL;MEL;REEL;ICEL;SOEL|FH Electric;eActros;eTGX;T E-Tech;eDaily;Urbino Electric|1;2;3;5|modérée|moyenne|2021|2027|100000|600000|Autonomie réduite;Charge lente;Puissance bridée|Vieillissement cellules et déséquilibre modules en cycles intensifs.|Bilan SOH, équilibrage modules, mise à jour BMS, module si SOH bas.|0|15000|Surveillance|Batterie HV",
    "Recharge rapide CCS thermique|VOEL;MBEL;MEL;REEL|FH Electric;eActros;eTGX;T E-Tech|1;3|modérée|moyenne|2021|2027|50000|400000|Charge DC bridée;Surchauffe connecteur|Connecteur CCS et refroidissement câble sollicités à 350 kW.|Contrôle thermique connecteur, mise à jour courbe de charge, nettoyage contacts.|300|2500|Surveillance|Charge",
    "Pompe à carburant basse pression|MX11;MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13|XF;XG;FH;S;R;Actros;TGX;S-Way;T|1;2|majeure|moyenne|2017|2027|200000|900000|Démarrage difficile;Perte puissance;Air circuit|Pompe gavage et clapet anti-retour usés.|Remplacement pompe gavage + clapet, purge circuit, contrôle durites.|300|1100|Surveillance|Carburant",
    "Filtre gazole colmaté qualité|*|XF;CF;LF;FH;FM;FL;S;R;G;P;Actros;Arocs;Atego;TGX;TGS;TGM;S-Way;X-Way;Eurocargo;Daily;T;C;K;D;F-MAX;F-LINE|1;2;3;4|modérée|élevée|2017|2027|30000|90000|Perte puissance;Démarrage difficile;Voyant préfiltre|Gazole de qualité variable et préfiltre décanteur saturé.|Remplacement filtre + préfiltre décanteur, purge, contrôle qualité carburant.|80|350|Note entretien|Injection",
    "Refroidissement radiateur boue|Arocs;FMX;XT;T-Way;X-Way;K|Arocs;Arocs Loader;FMX;XT;T-Way;X-Way;K|2|majeure|moyenne|2017|2027|100000|500000|Surchauffe;Perte puissance;Voyant température|Radiateur colmaté par boue et débris de chantier.|Nettoyage radiateur + intercooler, contrôle ventilateur et visco-coupleur.|250|1200|Surveillance|Refroidissement",
    "Pompe à eau joint carbone|MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13|XF;FH;S;Actros;TGX;S-Way;T|1;2|modérée|moyenne|2017|2027|250000|900000|Fuite LDR;Suintement;Niveau bas|Joint carbone pompe à eau fatigué.|Remplacement pompe à eau ou kit joint, purge circuit, contrôle pression.|350|1400|Surveillance|Refroidissement",
    "Ventilateur visco-coupleur grippé|MOM471;MD2676;SDC13;MX13|Actros;Arocs;TGX;TGS;S;R;XF|1;2|modérée|moyenne|2017|2027|200000|800000|Surchauffe en montée;Bruit ventilateur|Visco-coupleur grippé ne modulant plus le flux d'air.|Remplacement visco-coupleur + contrôle pale et radiateur.|400|1500|Surveillance|Refroidissement",
    "Pont moteur roulement différentiel|MOM471;MD2676;SDC13;MX13;VOD13;ICC13|Actros;Arocs;TGX;TGS;S;R;G;XF;XG;FH;FM;S-Way;T;C|1;2|majeure|faible|2017|2027|400000|1200000|Ronflement pont;Vibrations;Huile pont chaude|Roulements de différentiel et couronne usés en forte charge.|Remplacement roulements différentiel, vidange pont huile spec, contrôle jeu couronne.|1200|4500|Surveillance|Transmission",
    "Arbre de transmission palier|TGX;TGS;Actros;Arocs;FH;FM;XF;CF;S-Way;T;C|XF;CF;FH;FM;S;R;Actros;Arocs;TGX;TGS;S-Way;T;C|1;2|modérée|moyenne|2017|2027|250000|900000|Vibrations à vitesse;Claquement en lâcher|Palier central et croisillons usés.|Remplacement palier + croisillons, équilibrage arbre.|400|1600|Surveillance|Transmission",
    "Freins disques plaquettes usure|*|XF;CF;LF;FH;FM;FL;FE;S;R;G;P;L;XT;Actros;Arocs;Atego;Econic;TGX;TGS;TGM;TGE;S-Way;X-Way;T-Way;Eurocargo;Daily;T;C;K;D;F-MAX;F-LINE;F-ECO|1;2;3;4|modérée|élevée|2017|2027|40000|120000|Témoin usure;Distance allongée;Bruit|Usure normale plaquettes/disques en exploitation.|Remplacement plaquettes + disques si cote, graissage coulisseaux, test EBS.|250|1200|Note entretien|Freinage",
    "ABS capteur roue couronne|Atego;Econic;Daily;Eurocargo;LF;XB;FL|Atego;Econic;Daily;Eurocargo;LF;XB;FL;FE|3;4|modérée|moyenne|2017|2027|120000|500000|Voyant ABS;Perte anti-patinage|Capteur ABS ou couronne dentée endommagés.|Remplacement capteur + couronne, effacement défauts, test dynamique.|150|600|Surveillance|Freinage",
    "ADAS radar frontal calibration|Actros L;TGX GM;FH;XF;XG;S-Way;T|Actros L;TGX GM;FH;XF;XG;S-Way;T|4;5|modérée|moyenne|2019|2027|50000|400000|ACC indisponible;Freinage d'urgence inactif;Voyant ADAS|Radar/caméra désalignés après choc ou remplacement pare-brise.|Calibration radar + caméra statique/dynamique, mise à jour logiciel ADAS.|250|1200|Note entretien|ADAS",
    "MirrorCam / OptiView écrans|Actros L;Actros|Actros;Actros L|4;5|modérée|faible|2019|2027|60000|400000|Image noire;Latence;Condensation caméra|Caméras MirrorCam et écrans portes sensibles à l'humidité.|Contrôle étanchéité, remplacement caméra/écran, mise à jour logiciel.|600|2800|Surveillance|Électronique",
    "Éclairage LED matrix module|Actros L;TGX GM;FH;XF;XG;S-Way|Actros L;TGX GM;FH;XF;XG;S-Way|4;5|modérée|faible|2019|2027|80000|500000|Segments éteints;Condensation optique|Module LED et étanchéité optique dégradés.|Remplacement module optique, contrôle étanchéité, calibration faisceau.|400|2200|Surveillance|Éclairage",
    "Cabine coussin suspension|XF;XG;FH;S;R;Actros;TGX;S-Way;T;F-MAX|XF;XG;FH;S;R;Actros;TGX;S-Way;T;F-MAX|1;2|mineure|moyenne|2017|2027|200000|800000|Oscillation cabine;Bruit;Confort dégradé|Coussins et amortisseurs de cabine fatigués.|Remplacement coussins + amortisseurs cabine, contrôle ancrages.|250|1000|Surveillance|Suspension",
    "Sellette d'attelage usure|XF;XG;FH;S;R;G;Actros;TGX;S-Way;T;F-MAX|XF;XG;FH;S;R;G;Actros;TGX;S-Way;T;F-MAX|0;1|critique|moyenne|2017|2027|200000|900000|Jeu attelage;Claquement;Usure piste|Piste et mâchoires de sellette usées par cycles d'attelage.|Remplacement sellette ou kit piste/mâchoires, graissage, contrôle ancrages châssis.|600|2500|Surveillance|Châssis",
    "Châssis longeron fissure chantier|Arocs;FMX;XT;T-Way;X-Way;K;C|Arocs;Arocs Loader;FMX;XT;T-Way;X-Way;K;C|2|critique|faible|2017|2027|300000|1000000|Fissure longeron;Déformation châssis|Fatigue de torsion en exploitation chantier/benne.|Contrôle magnétoscopique, renfort longeron constructeur, reprise fissure.|1500|6000|Surveillance renforcée|Châssis",
    "Prise de mouvement PTO|Arocs;FMX;XT;T-Way;K;C;TGS|Arocs;FMX;XT;T-Way;K;C;TGS|2|majeure|moyenne|2017|2027|150000|700000|PTO ne engage;Bruit;Fuite huile boîte|PTO et pignonnerie usées par cycles benne/malaxeur.|Remplacement PTO + pignonnerie, contrôle lubrification boîte.|700|2800|Surveillance|Transmission",
    "Hydraulique benne pompe|Arocs;FMX;XT;T-Way;X-Way;K;C;TGS|Arocs;FMX;XT;T-Way;X-Way;K;C;TGS|2|majeure|moyenne|2017|2027|100000|500000|Levée lente;Fuite hydraulique;Surchauffe huile|Pompe hydraulique et joints vérin fatigués.|Remplacement pompe + joints vérin, filtration huile hydraulique, contrôle flexibles.|600|2600|Surveillance|Châssis",
    "Compresseur d'air usure|MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13|XF;FH;S;Actros;TGX;S-Way;T|1;2|modérée|moyenne|2017|2027|250000|900000|Montée en pression lente;Fuite d'air;Huile dans circuit|Segments et clapets compresseur usés.|Remplacement compresseur ou kit segments, purge circuit, contrôle sécheur.|500|2000|Surveillance|Freinage",
    "Alternateur 24V régulateur|*|XF;CF;LF;FH;FM;FL;S;R;G;P;Actros;Arocs;Atego;TGX;TGS;S-Way;Eurocargo;Daily;T;C;D;F-MAX|1;2;3;4|modérée|moyenne|2017|2027|150000|600000|Voyant charge;Batteries faibles;Démarrages difficiles|Régulateur et diodes d'alternateur fatigués.|Remplacement alternateur ou régulateur, test charge 24V, contrôle batteries.|350|1400|Surveillance|Électronique",
    "Batteries 24V sulfatation|*|XF;CF;LF;FH;FM;FL;FE;S;R;G;P;L;Actros;Arocs;Atego;Econic;TGX;TGS;TGM;S-Way;X-Way;Eurocargo;Daily;T;C;K;D;F-MAX;F-LINE;Urbino|1;2;3;4;5|modérée|élevée|2017|2027|60000|180000|Démarrage difficile;Tension basse;Consommation au repos|Sulfatation par cycles courts et consommateurs au repos.|Test batteries 24V, remplacement paire, contrôle alternateur et consommateurs veille.|200|800|Note entretien|Électronique",
    "Bus portes pneumatique sécurité|Urbino 12;Urbino 18;ComfortClass;TopClass;L;Econic|Urbino 12;Urbino 18;ComfortClass 500;ComfortClass 600;TopClass 500;L;Econic|5;3|critique|moyenne|2017|2027|80000|400000|Porte ne ferme;Sécurité anti-pincement;Fuite air|Vérins et capteurs de porte pneumatiques fatigués.|Remplacement vérin + capteurs anti-pincement, test sécurité portes.|300|1500|Rappel partiel|Carrosserie",
    "Climatisation bus compresseur|Urbino;ComfortClass;TopClass;InterUrbino;L|Urbino 12;Urbino 18;ComfortClass 500;TopClass 500;InterUrbino;L|5|modérée|moyenne|2017|2027|100000|500000|Froid insuffisant;Bruit compresseur;Fuite R134a/R1234yf|Compresseur et condenseur sollicités en urbain.|Remplacement compresseur ou condenseur, recharge gaz spec, contrôle pressions.|400|1900|Surveillance|Climatisation"
  ];
  var PLT = [
    "RPL-DAF-2021-MX|daf|MX11;MX13|XF;CF;XG|1;2|RAPPEL PACCAR MX-11/MX-13 injecteurs|2021-05|Rappel|critique|Dérive de débit injecteurs pouvant casser le moteur sur lots 2019-2021.|Contrôle codage injecteurs, remplacement hors cote, mise à jour logiciel moteur.|Injection",
    "RPL-VOL-2020-FH|volvt|VOD13;VOD11|FH;FM|4;5|RAPPEL Volvo FH direction assistée|2020-09|Rappel|critique|Perte d'assistance direction sur colonne électrique.|Remplacement colonne assistance + calibration + test dynamique.|Direction",
    "RPL-SCA-2019-RET|scania|SDC13;SDC16|R;S;G;XT|1;2|RAPPEL Scania retarder fuite huile|2019-11|Rappel|majeure|Fuite huile ralentisseur pouvant provoquer un incendie.|Remplacement joints retarder + contrôle circuit huile + nettoyage.|Freinage",
    "RPL-MB-2021-ACT|mbt|MOM471;MOM473|Actros;Actros L;Arocs|4;5|RAPPEL Actros freinage EBS logiciel|2021-03|Rappel|critique|Anomalie logicielle EBS réduisant l'efficacité du freinage.|Mise à jour logicielle EBS + test banc + contrôle valves.|Freinage",
    "RPL-MB-2023-MIR|mbt|MOM471|Actros;Actros L|5|RAPPEL MirrorCam infiltration|2023-06|Rappel|majeure|Infiltration d'eau dans caméras MirrorCam.|Remplacement caméras étanches + mise à jour logiciel + contrôle joints.|Électronique",
    "RPL-MAN-2022-TGX|man|MD2676;MD3876|TGX;TGX GM;TGS|3;4|RAPPEL MAN TGX faisceau châssis|2022-02|Rappel|majeure|Faisceau châssis frottant pouvant couper fonctions EBS.|Repositionnement faisceau + protection + contrôle fonctions sécurité.|Électronique",
    "RPL-IVE-2020-SWAY|iveco|ICC11;ICC13|S-Way;X-Way|1;2|RAPPEL Iveco S-Way cabine ancrage|2020-07|Rappel|critique|Ancrages de cabine non conformes sur premiers lots.|Contrôle et remplacement ancrages cabine + couple serrage.|Châssis",
    "RPL-RT-2021-T|rt|RDTI11;RDTI13|T;C;K|1;2;3|RAPPEL Renault Trucks T Optidriver|2021-10|Rappel|majeure|Défaut logiciel Optidriver provoquant points morts intempestifs.|Mise à jour Optidriver + apprentissages + essai en charge.|Transmission",
    "RPL-FT-2022-FMAX|ft|FEC127|F-MAX;F-ECO|1;2|RAPPEL Ford F-MAX réservoir AdBlue|2022-05|Rappel|majeure|Fuite réservoir AdBlue par soudure non conforme.|Remplacement réservoir AdBlue + contrôle circuit + reset SCR.|Antipollution",
    "RPL-SET-2020-PORT|setra|MOM936|ComfortClass 500;TopClass 500|5|RAPPEL Setra portes pneumatiques|2020-04|Rappel|critique|Capteur anti-pincement de porte défaillant.|Remplacement capteurs + test sécurité portes + mise à jour.|Carrosserie",
    "RPL-SOL-2021-BATT|solaris|SOEL|Urbino Electric;Urbino 18|5|RAPPEL Solaris batterie HV|2021-08|Rappel|critique|Risque thermique module batterie sur lots identifiés.|Contrôle modules + mise à jour BMS + remplacement module suspect.|Batterie HV",
    "TSB-DAF-2019-TRX|daf|MX11;MX13;PX9|XF;CF;XG|1;2|TSB ZF Traxon vidange 300000 km|2019-04|Transmission|modérée|Usure prématurée sans vidange de boîte robotisée.|Vidange Traxon 300000 km + filtre + huile ZF TE-ML 01.|Transmission",
    "TSB-VOL-2021-ISH|volvt|VOD13;VOD11|FH;FM|4;5|TSB I-Shift embrayage apprentissage|2021-06|Transmission|modérée|À-coups après remplacement embrayage sans apprentissage.|Apprentissage I-Shift obligatoire + mise à jour logiciel boîte.|Transmission",
    "TSB-SCA-2020-OPT|scania|SDC13;SDC09|S;R;G;P|1;2;3|TSB Opticruise capteur position|2020-03|Transmission|modérée|Défaut capteur de position boîte provoquant refus de rapport.|Remplacement capteur + calibration + contrôle connectique.|Transmission",
    "TSB-MB-2022-PS3|mbt|MOM471;MOM470|Actros;Arocs|4;5|TSB PowerShift 3 refroidissement huile|2022-09|Transmission|modérée|Surchauffe huile boîte en montagne avec charges lourdes.|Contrôle échangeur huile boîte + mise à jour stratégie refroidissement.|Transmission",
    "TSB-MAN-2021-TIP|man|MD2676;MD1556|TGX;TGS|3;4|TSB TipMatic capteur embrayage|2021-02|Transmission|modérée|Capteur course embrayage dérivant causant à-coups.|Remplacement capteur + apprentissage TipMatic.|Transmission",
    "TSB-IVE-2022-HIX|iveco|ICC11;ICC13|S-Way;X-Way;T-Way|1;2|TSB Hi-Tronix pompe huile boîte|2022-04|Transmission|modérée|Pompe huile boîte fatiguée à forts kilométrages.|Contrôle pression pompe + remplacement si hors cote + vidange.|Transmission",
    "TSB-RT-2020-OPTD|rt|RDTI13;RDTI11|T;C|1;2|TSB Optidriver cartographie montagne|2020-08|Transmission|info|Stratégie de rétrogradage perfectible en descente longue.|Mise à jour cartographie Optidriver + contrôle retarder.|Transmission",
    "TSB-ALL-2023-NOX|daf;volvt;scania;mbt;man;iveco;rt;ft|MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13;FEC127|XF;FH;S;Actros;TGX;S-Way;T;F-MAX|2;3;4|TSB sondes NOx Euro 6 step E|2023-05|Antipollution|modérée|Dérive sondes NOx sur moteurs Euro 6 step E.|Contrôle dérive + remplacement sonde + reset SCR + AdBlue frais.|Antipollution",
    "TSB-ALL-2024-SCR|daf;volvt;scania;mbt;man;iveco;rt;ft|MX13;VOD13;SDC13;MOM471;MD2676;ICC13;RDTI13;FEC127|XF;FH;S;Actros;TGX;S-Way;T;F-MAX|2;3;4|TSB pompe AdBlue cristallisation|2024-03|Antipollution|majeure|Cristallisation urée pompe et injecteur en cycles courts.|Nettoyage/remplacement pompe + injecteur urée + reset countdown.|Antipollution",
    "TSB-ALL-2022-EBS|mbt;man;iveco;scania;volvt;daf|MOM471;MD2676;ICC13;SDC13;VOD13;MX13|Actros;TGX;S-Way;S;FH;XF|3;4;5|TSB valves EBS et sécheur d'air|2022-11|Freinage|modérée|Valves modulatrices et sécheur d'air à contrôler préventivement.|Remplacement cartouche sécheur + contrôle valves EBS + purge circuits.|Freinage",
    "TSB-ALL-2025-ADAS|mbt;man;volvt;daf;scania;rt|MOM471;MD2676;VOD13;MX13;SDC13;RDTI13|Actros L;TGX GM;FH;XF;XG;S-Way;T|4;5|TSB calibration radar/caméra ADAS|2025-02|ADAS|modérée|Perte fonctions ACC/AEBS après intervention pare-brise ou choc.|Calibration statique/dynamique radar + caméra + mise à jour ADAS.|ADAS",
    "TSB-ALL-2024-12V|mbt;man;iveco;rt;ft;daf;volvt;scania|MOM936;MD0836;ICF4H;RDTI8;FEC75;PX7;VOD8;SDC09|Atego;TGM;Eurocargo;D;F-LINE;LF;FL;P|3;4|TSB batteries 24V et alternateur|2024-06|Électronique|modérée|Sulfatation batteries et régulateurs d'alternateur en cycles urbains.|Test batteries 24V, remplacement paire, contrôle alternateur et veille.|Électronique",
    "TSB-ALL-2023-SEL|daf;volvt;scania;mbt;man;rt;ft|MX13;VOD13;SDC13;MOM471;MD2676;RDTI13;FEC127|XF;XG;FH;S;R;Actros;TGX;S-Way;T;F-MAX|0;1|TSB sellette d'attelage graissage|2023-09|Châssis|modérée|Usure prématurée piste de sellette sans graissage adapté.|Graissage spec + contrôle jeu piste/mâchoires + remplacement si cote.|Châssis",
    "TSB-BUS-2024-CLIM|setra;solaris;mbt;man|SETH;SOEL;MOM936;MD0836|ComfortClass;TopClass;Urbino;InterUrbino;L|5|TSB climatisation bus compresseur|2024-05|Climatisation|modérée|Compresseurs et condenseurs sollicités en exploitation urbaine.|Contrôle pressions, remplacement compresseur/condenseur, recharge gaz.|Climatisation",
    "TSB-BUS-2023-PORT|setra;solaris;mbt|SETH;SOEL;MOM936|ComfortClass;TopClass;Urbino;Citaro;L|5|TSB sécurité portes capteurs|2023-04|Carrosserie|critique|Capteurs anti-pincement et vérins de porte à contrôler.|Test sécurité portes + remplacement capteurs/vérins + mise à jour.|Carrosserie",
    "TSB-EV-2025-CCS|volvt;mbt;man;rt;iveco|VOEL;MBEL;MEL;REEL;ICEL|FH Electric;eActros;eTGX;T E-Tech;eDaily|1;2;3|TSB connecteur CCS thermique|2025-03|Charge|modérée|Échauffement connecteur CCS en recharge rapide 350 kW.|Contrôle thermique + nettoyage contacts + mise à jour courbe de charge.|Charge",
    "TSB-EV-2024-SOH|volvt;mbt;man;rt;solaris|VOEL;MBEL;MEL;REEL;SOEL|FH Electric;eActros;eTGX;T E-Tech;Urbino Electric|1;2;5|TSB bilan SOH batterie HV|2024-10|Batterie HV|info|Suivi SOH et équilibrage modules en exploitation intensive.|Bilan SOH annuel + équilibrage modules + mise à jour BMS.|Batterie HV"
  ];
  var PLS = [
    "pld|*|d|60000|6|10W-40 ACEA E7/E9|28-36|Selon constructeur|400000|24|Vidange moteur + filtre^60000^6;Filtre gazole^60000^6;Filtre à air^120000^12;Filtre habitacle^60000^6;Appoint AdBlue^10000^1;Contrôle DPF^120000^12;Contrôle EGR^120000^12;Sondes NOx test^120000^12;Vidange boîte robotisée^300000^24;Vidange pont^300000^24;Contrôle injecteurs^200000^24;Contrôle turbo^200000^24;Graissage sellette^30000^3;Contrôle EBS freins^60000^6;Contrôle suspension air^120000^12;Contrôle direction rotules^60000^6;Géométrie train avant^120000^12;Contrôle faisceau remorque^30000^3;Contrôle ADAS calibration^120000^12|Niveau huile;Niveau LDR;Niveau AdBlue;Pression pneus;Usure plaquettes;Fuites air;Fuites huile;Voyants valise;Jeu direction;État sellette;Éclairage;Fonctions remorque",
    "plb|*|b|30000|6|Sans objet|0|Réducteur|300000|12|Contrôle SOH batterie HV^30000^6;LDR batterie HV^120000^12;Contrôle connecteur CCS^30000^3;Filtre habitacle^30000^6;Liquide de freins^0^12;Contrôle EBS freins^30000^6;Contrôle suspension air^60000^12;Contrôle direction^30000^6;Huile réducteur^300000^24;Mise à jour BMS^30000^6;Contrôle thermique batterie^30000^3;Géométrie^60000^12|SOH HV;Températures batterie;Charge DC;Pression pneus;Usure plaquettes;Fuites air;Voyants;Connecteur CCS",
    "plh|*|h|40000|6|10W-40 ACEA E7/E9|26|Selon constructeur|300000|24|Vidange moteur + filtre^40000^6;Contrôle système hybride^40000^6;Filtre gazole^40000^6;Filtre à air^80000^12;Liquide de freins^0^12;Contrôle EBS^40000^6;Contrôle suspension^80000^12;Contrôle direction^40000^6;Vidange boîte^200000^24;Contrôle batterie HV^40000^6|Niveau huile;Niveau LDR;Pression pneus;Plaquettes;Fuites air;Voyants;Système hybride",
    "plg|*|*|60000|6|10W-40 ACEA E7/E9|30|Selon constructeur|400000|24|Vidange moteur + filtre^60000^6;Filtre gazole^60000^6;Filtre à air^120000^12;Liquide de freins^0^12;Contrôle freins EBS^60000^6;Contrôle direction^60000^6;Contrôle suspension^120000^12;Graissage général^30000^3|Niveau huile;Pression pneus;Plaquettes;Fuites air;Voyants"
  ];

  /* ── Construction base PL ── */
  var DB = { brands: [], models: [], engines: [], faults: [], tsb: [], svc: [] };
  (function build() {
    PLB.forEach(function (b) { DB.brands.push({ id: b[0], n: b[1], pays: b[2], grp: b[3] }); });
    Object.keys(PLM).forEach(function (bid) {
      PLM[bid].split("|").forEach(function (r) {
        var f = r.split("^"); if (!f[0]) return;
        var y0 = num(f[1], 2017), y1 = num(f[2], 2027); if (y0 > y1) { var t = y0; y0 = y1; y1 = t; }
        DB.models.push({ id: bid + "-" + slug(f[0]), b: bid, n: f[0], y: [y0, y1], seg: SEGS[num(f[3], 0)] || SEGS[0], segIdx: num(f[3], 0), phase: num(f[4], 1) });
      });
    });
    var n = 0;
    PLE.forEach(function (row) {
      var f = row.split("|"); if (f.length < 10) return;
      var code = f[0], fuel = f[1] === "b" ? "b" : (f[1] === "h" ? "h" : "d"), disp = num(f[2], 0), label = f[3];
      var vars = f[4].split(",").map(function (v) { var p = v.split(":"); return [num(p[0], 0), num(p[1], 0)]; }).filter(function (v) { return v[0] > 0; });
      var gb = f[5], y0 = num(f[6], 2017), y1 = num(f[7], 2027);
      var brands = f[8].split(";").map(nk); var segs = f[9].split(";").map(function (x) { return num(x, -1); });
      DB.models.forEach(function (m) {
        if (brands.indexOf(m.b) < 0) return;
        if (segs.indexOf(m.segIdx) < 0) return;
        var a = Math.max(y0, m.y[0]), b = Math.min(y1, m.y[1]); if (a > b) return;
        vars.forEach(function (v) {
          n++;
          DB.engines.push({ id: "P" + String(n).padStart(4, "0"), m: m.id, code: code, fam: code, label: label + " " + v[0], fuel: fuel, disp: disp, hp: v[0], nm: v[1], kw: Math.round(v[0] * 0.7355), y: [a, b], gb: gb, norm: fuel === "b" ? "ZE" : "Euro 6", seg: m.seg });
        });
      });
    });
    PLF.forEach(function (r, i) {
      var f = r.split("|"); if (f.length < 17) return;
      var c = pair([f[13], f[14]], [0, 0]); if (c[1] < c[0]) c[1] = c[0];
      DB.faults.push({ id: "PF" + String(i + 1).padStart(3, "0"), t: f[0], fam: list(f[1]), mt: list(f[2]), ph: list(f[3]), sev: nsev(f[4]), freq: nfreq(f[5]), y: yOf([f[6], f[7]]), km: kmOf([f[8], f[9]]), sym: list(f[10]), cause: f[11], fix: f[12], cost: c, status: f[15], dom: f[16] });
    });
    PLT.forEach(function (r, i) {
      var f = r.split("|"); if (f.length < 12) return;
      var d = str(f[6], "2026-01"); if (!/^\d{4}-\d{2}$/.test(d)) d = "2026-01";
      DB.tsb.push({ id: "PT" + String(i + 1).padStart(3, "0"), ref: f[0], b: list(f[1]), fam: list(f[2]), mt: list(f[3]), ph: list(f[4]), t: f[5], date: d, cat: f[7], sev: nsev(f[8]), sum: f[9], act: f[10], dom: f[11] });
    });
    PLS.forEach(function (r) {
      var f = r.split("|"); if (f.length < 11) return;
      DB.svc.push({ key: f[0], fuel: f[2], base: num(f[3], 60000), months: num(f[4], 6), oil: f[5], cap: f[6], dist: f[7], items: f[10].split(";").map(function (x) { var p = x.split("^"); return [p[0], num(p[1], 0), num(p[2], 0)]; }), controls: list(f[11]) });
    });
  })();
  var MIDX = {}, BIDX = {}, EIDX = {};
  DB.models.forEach(function (m) { MIDX[m.id] = m; });
  DB.brands.forEach(function (b) { BIDX[b.id] = b; });
  DB.engines.forEach(function (e) { EIDX[e.id] = e; });
  function modelOf(e) { return MIDX[e.m] || null; }
  function brandOf(e) { var m = modelOf(e); return m ? BIDX[m.b] : null; }
  function tokHit(l, name) { var a = arr(l); if (!a.length) return false; var n = nk(name); for (var i = 0; i < a.length; i++) { var t = nk(a[i]); if (t === "*" || (t && n.indexOf(t) > -1)) return true; } return false; }
  function fApply(f, e, m) { if (!f || !e || !m) return false; if (!(arr(f.fam).indexOf(e.fam) > -1 || tokHit(f.mt, m.n))) return false; var ph = arr(f.ph); return !ph.length || ph.indexOf("*") > -1 || ph.indexOf(String(m.phase)) > -1; }
  function tApply(t, e, m) { if (!t || !e || !m) return false; if (!(arr(t.fam).indexOf(e.fam) > -1 || tokHit(t.mt, m.n) || arr(t.b).indexOf(m.b) > -1)) return false; var ph = arr(t.ph); return !ph.length || ph.indexOf("*") > -1 || ph.indexOf(String(m.phase)) > -1; }
  function faultsFor(e) { var m = modelOf(e); return m ? DB.faults.filter(function (f) { return fApply(f, e, m); }) : []; }
  function tsbFor(e) { var m = modelOf(e); return m ? DB.tsb.filter(function (t) { return tApply(t, e, m); }) : []; }
  function isRecall(t) { return !!t && (t.cat === "Rappel" || /^RPL-/.test(String(t.ref))); }

  /* ── État & filtres ── */
  var ST = { b: "", m: "", e: "", y: 0, q: "", tab: "parc", sev: "" };
  function enginesFiltered() {
    var q = nk(ST.q);
    return DB.engines.filter(function (e) {
      var m = modelOf(e), b = brandOf(e);
      if (ST.b && (!m || m.b !== ST.b)) return false;
      if (ST.m && e.m !== ST.m) return false;
      if (ST.e && e.id !== ST.e) return false;
      if (ST.y && !(e.y[0] <= ST.y && ST.y <= e.y[1])) return false;
      if (q && nk([b ? b.n : "", m ? m.n : "", e.code, e.label, e.gb, e.seg].join(" ")).indexOf(q) < 0) return false;
      return true;
    });
  }
  function faultsFiltered() {
    var q = nk(ST.q);
    return DB.faults.filter(function (f) {
      if (ST.sev && f.sev !== ST.sev) return false;
      if (ST.y && !(f.y[0] <= ST.y && ST.y <= f.y[1])) return false;
      if (ST.b && arr(f.fam).length) { var ok = DB.engines.some(function (e) { var m = modelOf(e); return m && m.b === ST.b && arr(f.fam).indexOf(e.fam) > -1; }); var ok2 = arr(f.mt).length && DB.models.some(function (m) { return m.b === ST.b && tokHit(f.mt, m.n); }); if (!ok && !ok2) return false; }
      if (ST.m && !tokHit(f.mt, (MIDX[ST.m] || {}).n || "")) { var ok3 = arr(f.fam).length && DB.engines.some(function (e) { return e.m === ST.m && arr(f.fam).indexOf(e.fam) > -1; }); if (!ok3) return false; }
      if (q && nk([f.t, arr(f.fam).join(" "), arr(f.mt).join(" "), f.cause, f.fix, arr(f.sym).join(" "), f.dom].join(" ")).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return SV[b.sev].w - SV[a.sev].w; });
  }
  function tsbFiltered(recallsOnly) {
    var q = nk(ST.q);
    return DB.tsb.filter(function (t) {
      if (recallsOnly && !isRecall(t)) return false;
      if (ST.sev && t.sev !== ST.sev) return false;
      if (ST.y && !(num(t.date.slice(0, 4), 0) <= ST.y)) return false;
      if (ST.b && arr(t.b).indexOf(ST.b) < 0 && !(arr(t.fam).length && DB.engines.some(function (e) { var m = modelOf(e); return m && m.b === ST.b && arr(t.fam).indexOf(e.fam) > -1; }))) return false;
      if (ST.m && arr(t.b).indexOf((MIDX[ST.m] || {}).b) < 0 && !tokHit(t.mt, (MIDX[ST.m] || {}).n || "")) return false;
      if (q && nk([t.t, t.ref, arr(t.fam).join(" "), arr(t.mt).join(" "), t.sum, t.act, t.cat].join(" ")).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  /* ── Rendu ── */
  function sevTag(s) { s = nsev(s); return "<span class='sev " + (s === "modérée" ? "mode" : esc(s)) + "'>" + esc(s) + "</span>"; }
  function faultCard(f) {
    var kk = kmOf(f), c = (SV[f.sev] || SV["modérée"]).c;
    var h = "<div class='fcard' style='--sc:" + c + "'><div class='fh'><b>" + esc(f.t) + "</b>" + sevTag(f.sev) + "</div>";
    h += "<div class='tags'><span class='tag'>" + esc(f.dom) + "</span><span class='tag'>" + yOf(f).join("-") + "</span><span class='tag'>" + fmt(kk[0]) + "–" + fmt(kk[1]) + " km</span><span class='tag'>fréq. " + esc(f.freq) + "</span><span class='tag' style='color:#35C4E8'>" + esc(f.status) + "</span></div>";
    h += "<div class='tags'>" + arr(f.sym).map(function (s) { return "<span class='tag'>" + esc(s) + "</span>"; }).join("") + "</div>";
    h += "<p><b>Cause :</b> " + esc(f.cause) + "</p><p><b>Action :</b> " + esc(f.fix) + "</p>";
    h += "<div class='cost'>" + (f.cost[1] === 0 ? "Prise en charge / campagne" : fmt(f.cost[0]) + " – " + fmt(f.cost[1]) + " €") + "</div></div>";
    return h;
  }
  function tsbCard(t) {
    var rc = isRecall(t);
    var h = "<div class='tsb" + (rc ? " rc" : "") + "'><div style='display:flex;gap:7px;flex-wrap:wrap'><span class='ref'>" + esc(t.ref) + "</span>" + sevTag(t.sev) + "<span class='tag'>" + esc(t.cat) + "</span><span class='tag'>" + esc(t.date) + "</span></div><b>" + esc(t.t) + "</b><p>" + esc(t.sum) + "</p><div class='act'><b>ACTION :</b> " + esc(t.act) + "</div></div>";
    return h;
  }
  function engCard(e) {
    var m = modelOf(e), b = brandOf(e);
    var nf = faultsFor(e).length, nt = tsbFor(e).length, nr = tsbFor(e).filter(isRecall).length;
    return "<div class='card' data-eng='" + e.id + "' tabindex='0' style='--fc:" + (e.fuel === "b" ? "#35C4E8" : e.fuel === "h" ? "#3DDC84" : "#FF6A00") + "'><div class='top'><span>" + esc(b ? b.n : "—") + "</span><span class='tag'>" + esc(e.seg || (m ? m.seg : "")) + "</span><span class='tag' style='margin-left:auto'>phase " + (m ? m.phase : 1) + "</span></div><h4>" + esc(m ? m.n : "") + "</h4><div class='lbl'>" + esc(e.label) + "</div><div class='pw'><b>" + e.hp + "</b><span>ch · " + e.kw + " kW</span><span style='margin-left:auto'>" + e.nm + " Nm</span></div><div class='tags'><span class='tag'>" + esc(e.code) + "</span><span class='tag'>" + e.y.join("-") + "</span><span class='tag'>" + esc(e.gb) + "</span><span class='tag'>" + esc(e.norm) + "</span>" + (nr ? "<span class='tag' style='color:#FF6A00'>" + nr + " rappel(s)</span>" : "") + "</div><div class='tags'><span class='tag'>" + nf + " panne(s)</span><span class='tag'>" + nt + " bulletin(s)</span></div></div>";
  }
  function render() {
    var v = $("#plview"); if (!v) return;
    var cB = DB.brands.length, cM = DB.models.length, cE = DB.engines.length, cF = DB.faults.length, cT = DB.tsb.length, cR = DB.tsb.filter(isRecall).length;
    var h = "<div class='hero'><span class='race'>24H CAMIONS · CIRCUIT</span><span class='kick'>UNIVERS POIDS LOURDS — SÉPARÉ DU TOURISME</span><h1>MÉGA-BASE PL <i>2017 → 2027</i><br>" + cB + " marques européennes · " + cM + " modèles · " + fmt(cE) + " motorisations</h1><p>" + cF + " pannes connues détaillées, " + cT + " bulletins dont <b style='color:#FF6A00'>" + cR + " campagnes de rappel</b>. Filtres marque → modèle → motorisation → année, recherche massive sur pannes, rappels et TSB. Entretien et interventions par famille moteur.</p></div>";
    h += "<div class='kpis'>" + [["MARQUES", cB, "#FF6A00"], ["MODÈLES", cM, "#FFD60A"], ["MOTORISATIONS", cE, "#35C4E8"], ["PANNES", cF, "#FF3B30"], ["RAPPELS", cR, "#FF6A00"], ["TSB / BULLETINS", cT - cR, "#3DDC84"]].map(function (k) { return "<div class='kpi' style='--kc:" + k[2] + "'><b>" + fmt(k[1]) + "</b><span>" + k[0] + "</span></div>"; }).join("") + "</div>";
    h += "<div class='tabs'><button class='tab" + (ST.tab === "parc" ? " on" : "") + "' data-ptab='parc'>" + ic("truck") + "PARC & MOTORISATIONS<span class='n'>" + cE + "</span></button><button class='tab" + (ST.tab === "faults" ? " on" : "") + "' data-ptab='faults'>" + ic("alert") + "PANNES<span class='n'>" + cF + "</span></button><button class='tab" + (ST.tab === "tsb" ? " on" : "") + "' data-ptab='tsb'>" + ic("file") + "TSB / BULLETINS<span class='n'>" + (cT - cR) + "</span></button><button class='tab" + (ST.tab === "recalls" ? " on" : "") + "' data-ptab='recalls'>" + ic("bell") + "RAPPELS<span class='n'>" + cR + "</span></button></div>";
    h += "<div class='filters'><div><label class='lb'>1 · Marque européenne</label><select class='sel' data-pf='b'><option value=''>Toutes (" + cB + ")</option>" + DB.brands.map(function (b) { return "<option value='" + b.id + "'" + (ST.b === b.id ? " selected" : "") + ">" + esc(b.n) + " — " + esc(b.pays) + "</option>"; }).join("") + "</select></div>";
    var mods = ST.b ? DB.models.filter(function (m) { return m.b === ST.b; }) : [];
    h += "<div><label class='lb'>2 · Modèle</label><select class='sel' data-pf='m'" + (ST.b ? "" : " disabled") + "><option value=''>" + (ST.b ? mods.length + " modèle(s)" : "Choisir une marque") + "</option>" + mods.map(function (m) { return "<option value='" + m.id + "'" + (ST.m === m.id ? " selected" : "") + ">" + esc(m.n) + " · " + esc(m.seg) + " · phase " + m.phase + "</option>"; }).join("") + "</select></div>";
    var engs = ST.m ? DB.engines.filter(function (e) { return e.m === ST.m; }) : [];
    h += "<div><label class='lb'>3 · Motorisation & puissance</label><select class='sel' data-pf='e'" + (ST.m ? "" : " disabled") + "><option value=''>" + (ST.m ? engs.length + " motorisation(s)" : "Choisir un modèle") + "</option>" + engs.map(function (e) { return "<option value='" + e.id + "'" + (ST.e === e.id ? " selected" : "") + ">" + esc(e.label) + " · " + e.hp + " ch · " + e.nm + " Nm · " + e.y.join("-") + "</option>"; }).join("") + "</select></div>";
    h += "<div><label class='lb'>Année du véhicule</label><select class='sel' data-pf='y'><option value='0'>Toutes</option>" + [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map(function (y) { return "<option value='" + y + "'" + (ST.y === y ? " selected" : "") + ">" + y + "</option>"; }).join("") + "</select></div>";
    h += "<div><label class='lb'>Sévérité (pannes/TSB)</label><select class='sel' data-pf='sev'><option value=''>Toutes</option>" + Object.keys(SV).map(function (s) { return "<option value='" + s + "'" + (ST.sev === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div></div>";
    if (ST.tab === "parc") {
      var le = enginesFiltered();
      h += "<div class='bar'><span class='cnt'>" + fmt(le.length) + " motorisation(s) réelle(s)</span>" + (ST.e ? "<button class='btn pri' data-pact='detail' data-id='" + ST.e + "'>Fiche & corrélations</button>" : "") + "</div>";
      h += "<div class='grid'>" + (le.length ? le.slice(0, 120).map(engCard).join("") : "<div class='empty' style='grid-column:1/-1'>Aucune motorisation pour ces filtres.</div>") + "</div>";
    } else if (ST.tab === "faults") {
      var lf = faultsFiltered();
      h += "<div class='bar'><span class='cnt'>" + lf.length + " panne(s) détaillée(s)</span></div>";
      h += lf.length ? "<div class='g2'>" + lf.slice(0, 60).map(function (f) { return "<div>" + faultCard(f) + "</div>"; }).join("") + "</div>" : "<div class='empty'>Aucune panne pour ces filtres.</div>";
    } else {
      var lt = tsbFiltered(ST.tab === "recalls");
      h += "<div class='bar'><span class='cnt'>" + lt.length + " bulletin(s)</span></div>";
      h += lt.length ? "<div class='g2'>" + lt.slice(0, 60).map(function (t) { return "<div>" + tsbCard(t) + "</div>"; }).join("") + "</div>" : "<div class='empty'>Aucun bulletin pour ces filtres.</div>";
    }
    v.innerHTML = h;
    var sb = $("#stB"), sm = $("#stM"), se = $("#stE"), sf = $("#stF"), st = $("#stT");
    if (sb) sb.textContent = cB; if (sm) sm.textContent = cM; if (se) se.textContent = fmt(cE); if (sf) sf.textContent = cF; if (st) st.textContent = cT;
  }
  function openDetail(id) {
    var e = EIDX[id]; if (!e) return;
    var m = modelOf(e), b = brandOf(e), fs = faultsFor(e), ts = tsbFor(e), rc = ts.filter(isRecall);
    var svc = DB.svc.filter(function (s) { return s.fuel === e.fuel || s.key === "plg"; })[0] || DB.svc[0];
    var h = "<div class='sg'>" + [["Marque", b ? b.n : "—"], ["Modèle", m ? m.n : "—"], ["Segment", m ? m.seg : "—"], ["Phase", m ? m.phase : "—"], ["Code moteur", e.code], ["Puissance", e.hp + " ch / " + e.kw + " kW"], ["Couple", e.nm + " Nm"], ["Boîte", e.gb], ["Production", e.y.join("-")], ["Norme", e.norm], ["Huile", svc ? svc.oil : "—"], ["Intervalle", svc ? fmt(svc.base) + " km / " + svc.months + " mois" : "—"]].map(function (r) { return "<div class='sp'><span>" + esc(r[0]) + "</span><b class='hl'>" + esc(r[1]) + "</b></div>"; }).join("") + "</div>";
    h += "<h3 style='font:600 14px var(--gd);margin:14px 0 8px;color:#FF6A00'>Pannes connues (" + fs.length + ")</h3>";
    h += fs.length ? fs.map(faultCard).join("") : "<p style='color:var(--t2)'>Aucune panne corrélée.</p>";
    h += "<h3 style='font:600 14px var(--gd);margin:14px 0 8px;color:#FF6A00'>Rappels & bulletins (" + ts.length + ")</h3>";
    h += ts.length ? ts.map(tsbCard).join("") : "<p style='color:var(--t2)'>Aucun bulletin corrélé.</p>";
    h += "<h3 style='font:600 14px var(--gd);margin:14px 0 8px;color:#FF6A00'>Entretien type</h3><div class='tags'>" + (svc ? svc.items.slice(0, 14).map(function (i) { return "<span class='tag'>" + esc(i[0]) + (i[1] ? " · " + fmt(i[1]) + " km" : "") + "</span>"; }).join("") : "") + "</div>";
    var md = $("#plmodal"), ti = $("#pmTitle"), bd = $("#pmBody");
    if (ti) ti.textContent = (b ? b.n + " " : "") + (m ? m.n + " — " : "") + e.label;
    if (bd) bd.innerHTML = h;
    if (md) { md.classList.add("on"); D.body.classList.add("lock"); }
  }
  function closeDetail() { var md = $("#plmodal"); if (md) md.classList.remove("on"); D.body.classList.remove("lock"); }

  /* ── Fond dynamique : camion 24H sur circuit ── */
  var CV = null, CX = null, RAF = 0, T = 0, LAST = 0, SMOKE = [];
  function resize() { if (!CV) return; var d = Math.min(window.devicePixelRatio || 1, 1.5); CV.width = Math.max(1, innerWidth * d); CV.height = Math.max(1, innerHeight * d); CX.setTransform(d, 0, 0, d, 0, 0); }
  function drawScene(t) {
    var W = innerWidth, H = innerHeight, c = CX;
    var sky = c.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, "#05070F"); sky.addColorStop(0.6, "#0B1020"); sky.addColorStop(1, "#1A1206");
    c.fillStyle = sky; c.fillRect(0, 0, W, H * 0.62);
    for (var i = 0; i < 5; i++) {
      var fx = ((i * 0.23 + 0.08) * W + Math.sin(t * 0.2 + i) * 20), fy = H * 0.10;
      var g = c.createRadialGradient(fx, fy, 0, fx, fy, H * 0.30);
      g.addColorStop(0, "rgba(255,214,10,.20)"); g.addColorStop(1, "rgba(255,214,10,0)");
      c.fillStyle = g; c.fillRect(0, 0, W, H * 0.62);
      c.strokeStyle = "rgba(255,214,10,.35)"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, H * 0.30); c.stroke();
    }
    var gy = H * 0.40;
    c.fillStyle = "#0E0A05"; c.fillRect(0, gy, W, H * 0.06);
    for (i = 0; i < 26; i++) {
      var gx = ((i * 90 - (t * 260) % 90) % (W + 90)) - 45;
      c.fillStyle = i % 2 ? "rgba(255,106,0,.16)" : "rgba(244,237,228,.10)";
      c.fillRect(gx, gy, 46, H * 0.05);
    }
    var ty = H * 0.46;
    var tr = c.createLinearGradient(0, ty, 0, H);
    tr.addColorStop(0, "#20242B"); tr.addColorStop(0.5, "#171A20"); tr.addColorStop(1, "#0C0E12");
    c.fillStyle = tr; c.fillRect(0, ty, W, H - ty);
    var curb = H * 0.02;
    for (i = 0; i < 40; i++) {
      var cxp = ((i * 70 - (t * 620) % 70) % (W + 70)) - 35;
      c.fillStyle = i % 2 ? "#D32F2F" : "#F5F5F5";
      c.fillRect(cxp, ty - curb * 0.4, 36, curb * 0.5);
      c.fillRect(cxp, H - curb, 36, curb * 0.6);
    }
    c.strokeStyle = "rgba(245,245,245,.5)"; c.lineWidth = 4; c.setLineDash([46, 40]);
    c.lineDashOffset = -(t * 620) % 86;
    c.beginPath(); c.moveTo(0, H * 0.74); c.lineTo(W, H * 0.74); c.stroke(); c.setLineDash([]);
    var bx = W * 0.30, by = H * 0.66 + Math.sin(t * 9) * 2.2;
    c.save();
    c.strokeStyle = "rgba(255,106,0,.35)"; c.lineWidth = 2;
    for (i = 0; i < 7; i++) { var ly = by - 30 + i * 12; c.beginPath(); c.moveTo(bx - 260 - i * 26, ly); c.lineTo(bx - 120, ly); c.stroke(); }
    var tl = W * 0.30;
    c.fillStyle = "#E8E4DC"; c.fillRect(bx - tl, by - 62, tl - 40, 52);
    c.fillStyle = "#FF6A00"; c.fillRect(bx - tl, by - 62, 14, 52);
    c.fillStyle = "#120B05"; c.font = "700 20px " + "'Chakra Petch',system-ui"; c.fillText("24H", bx - tl + 30, by - 30);
    c.fillStyle = "#C2410C"; c.fillRect(bx - tl + 90, by - 46, tl - 150, 8);
    c.fillStyle = "#FF6A00";
    c.beginPath(); c.moveTo(bx - 40, by - 10); c.lineTo(bx - 40, by - 66); c.quadraticCurveTo(bx - 38, by - 78, bx - 22, by - 78); c.lineTo(bx + 34, by - 78); c.quadraticCurveTo(bx + 52, by - 78, bx + 58, by - 60); c.lineTo(bx + 66, by - 34); c.quadraticCurveTo(bx + 70, by - 22, bx + 70, by - 10); c.closePath(); c.fill();
    c.fillStyle = "#0B1020"; c.beginPath(); c.moveTo(bx + 12, by - 72); c.lineTo(bx + 40, by - 72); c.quadraticCurveTo(bx + 50, by - 72, bx + 54, by - 58); c.lineTo(bx + 58, by - 44); c.lineTo(bx + 12, by - 44); c.closePath(); c.fill();
    c.fillStyle = "#FFD60A"; c.fillRect(bx - 40, by - 30, 110, 6);
    var hg = c.createLinearGradient(bx + 70, by - 24, bx + 300, by - 6);
    hg.addColorStop(0, "rgba(255,244,214,.55)"); hg.addColorStop(1, "rgba(255,244,214,0)");
    c.fillStyle = hg; c.beginPath(); c.moveTo(bx + 66, by - 28); c.lineTo(bx + 320, by - 44); c.lineTo(bx + 320, by + 6); c.lineTo(bx + 66, by - 14); c.closePath(); c.fill();
    c.fillStyle = "#FF3B30"; c.fillRect(bx - tl - 4, by - 52, 5, 12);
    var wheels = [bx - tl + 40, bx - tl + 110, bx - 90, bx - 20, bx + 40];
    wheels.forEach(function (wx, wi) {
      c.fillStyle = "#0A0A0A"; c.beginPath(); c.arc(wx, by, 17, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#3A3A3A"; c.lineWidth = 3; c.beginPath(); c.arc(wx, by, 10, 0, Math.PI * 2); c.stroke();
      c.save(); c.translate(wx, by); c.rotate(t * 14);
      c.strokeStyle = "#8A8A8A"; c.lineWidth = 2;
      for (var s2 = 0; s2 < 5; s2++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(s2 * 1.256) * 9, Math.sin(s2 * 1.256) * 9); c.stroke(); }
      c.restore();
    });
    c.fillStyle = "rgba(255,106,0,.22)"; c.fillRect(bx - tl, by + 14, tl + 70, 5);
    if (SMOKE.length < 40 && Math.random() < 0.5) SMOKE.push({ x: bx - 34, y: by - 80, r: 3 + Math.random() * 4, a: 0.5, vx: -2 - Math.random() * 2, vy: -0.6 - Math.random() });
    SMOKE = SMOKE.filter(function (p) { return p.a > 0.02; });
    SMOKE.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.r += 0.5; p.a *= 0.96; c.fillStyle = "rgba(180,180,180," + p.a.toFixed(3) + ")"; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); });
    c.restore();
    c.fillStyle = "rgba(255,214,10,.9)"; c.font = "600 12px 'IBM Plex Mono',monospace";
    c.fillText("TOUR " + (Math.floor(t / 24) + 1), 16, 26);
    c.fillText(Math.round(96 + Math.sin(t * 0.7) * 14) + " km/h", 16, 44);
    c.fillStyle = "rgba(255,106,0,.85)";
    c.fillText("24 HEURES CAMIONS · PIT LANE", 16, 62);
  }
  function loop(n) { RAF = requestAnimationFrame(loop); var dt = Math.min(0.05, (n - LAST) / 1000); LAST = n; T += dt; drawScene(T); }
  function startScene() { CV = $("#plbg"); if (!CV) return; CX = CV.getContext("2d"); if (!CX) return; resize(); window.addEventListener("resize", resize); LAST = performance.now(); RAF = requestAnimationFrame(loop); D.addEventListener("visibilitychange", function () { if (D.hidden) { cancelAnimationFrame(RAF); } else { LAST = performance.now(); RAF = requestAnimationFrame(loop); } }); }

  /* ── Événements ── */
  function bind() {
    D.addEventListener("click", function (ev) {
      var t = ev.target;
      var card = t.closest ? t.closest("[data-eng]") : null;
      if (card) { ST.e = card.dataset.eng; openDetail(ST.e); render(); return; }
      var tab = t.closest ? t.closest("[data-ptab]") : null;
      if (tab) { ST.tab = tab.dataset.ptab; render(); return; }
      var det = t.closest ? t.closest("[data-pact='detail']") : null;
      if (det) { openDetail(det.dataset.id); return; }
      if (t.closest && t.closest("#pmClose")) { closeDetail(); return; }
      if (t.id === "plmodal") { closeDetail(); return; }
    });
    D.addEventListener("change", function (ev) {
      var t = ev.target; if (!t || !t.dataset || !t.dataset.pf) return;
      var k = t.dataset.pf;
      if (k === "b") { ST.b = t.value; ST.m = ""; ST.e = ""; }
      else if (k === "m") { ST.m = t.value; ST.e = ""; }
      else if (k === "e") { ST.e = t.value; }
      else if (k === "y") { ST.y = num(t.value, 0); }
      else if (k === "sev") { ST.sev = t.value; }
      render();
    });
    D.addEventListener("input", function (ev) {
      var t = ev.target; if (!t) return;
      if (t.id === "plq") { ST.q = t.value; render(); }
    });
    D.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeDetail();
      if (ev.key === "Enter" && ev.target && ev.target.classList && ev.target.classList.contains("card")) { var id = ev.target.dataset.eng; if (id) { ST.e = id; openDetail(id); } }
    });
  }
  function boot() { startScene(); bind(); render(); }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", boot); else boot();
})();
