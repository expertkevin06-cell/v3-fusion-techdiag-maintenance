/* MECADATA // MÉGA-BASE PANNES v19
   Recherche massive de pannes connues de tout ordre, toutes marques, tous
   modèles, toutes motorisations et puissances. Expansion progressive :
   un lot à chaque ouverture + un lot après CHAQUE mise à jour manuelle
   (import, méga-base, balayage auto, réparation, restauration).
   Génère pannes détaillées + campagnes de rappel + TSB + bulletins techniques.
   Index de corrélation O(1) : la base peut croître sans ralentir l'app.
   S'intègre au noyau existant (js/app.js + js/app-ui.js) sans les modifier. */
(function () {
  "use strict";

  var W = window, D = document;
  function q(s, r) { return (r || D).querySelector(s); }
  function qa(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function A(v) { return Array.isArray(v) ? v : []; }
  function N(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function S(v, d) { var s = String(v == null ? "" : v).trim(); return s || (d == null ? "" : d); }
  function L(v) {
    if (Array.isArray(v)) { return v.filter(Boolean); }
    return String(v == null ? "" : v).split(/[;,|]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function K(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function SL(s) { return K(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x"; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function F(n) { n = N(n, 0); try { return n.toLocaleString("fr-FR"); } catch (e) { return String(n); } }
  function IC(n, st) { return "<svg class='ic'" + (st ? " style='" + st + "'" : "") + "><use href='#i-" + n + "'/></svg>"; }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function say(t, ti, m) { if (typeof W.toast === "function") { W.toast(t, ti, m); } }
  function snd(k) { if (typeof W.beep === "function") { W.beep(k); } }

  var KEY = "md_mega_v19";
  var LOT = 420;
  var MAXF = 7000;
  var MAXT = 3200;
  var ST = { runs: 0, added: 0, last: 0, log: [], dom: "", sev: "", qq: "" };

  /* ══════════ CATALOGUE : 108 archétypes de pannes, tout ordre ══════════
     titre|domaine|sévérité|fréquence|cible|km0|km1|an0|an1|symptômes|cause|action|€min|€max|rappel
     cible : M:* (toutes familles moteur) · M:fuel=d/e/b/h,p · M:fam=CODES
             V:* (toutes marques) · V:seg=indices · V:fuel=b                */
  var CAT = [
    "Courroie humide désagrégée|Distribution|critique|élevée|M:fam=EB2,EB2ADT,EB2ADTX,EB2G3,FOX,PANTHER,R9DA,AJ150P3|40000|130000|2017|2024|Voyant pression huile;Crépine colmatée;Casse moteur|Courroie immergée dégradée par huile non conforme ou vidanges espacées, débris colmatant la crépine de pompe à huile.|Courroie dernière référence, dépose carter, nettoyage crépine et circuit, huile spec constructeur exclusive.|450|1400|1",
    "Chaîne AAC 7 mm allongée|Distribution|critique|moyenne|M:fam=DV5,DV5RUCd,DV6FC|50000|150000|2017|2023|Cliquetis à froid;Casse chaîne;Calage distribution|Chaîne d'arbre à cames sous-dimensionnée, guides et tendeurs usés, régénérations FAP aggravantes.|Kit chaîne 8 mm renforcé, pignons, carter modifié, contrôle calage et jeux AAC.|1200|2400|1",
    "Chaîne côté volant moteur|Distribution|critique|moyenne|M:fam=B47,B57,OM654|90000|270000|2017|2022|Cliquetis côté boîte;Bruit ralenti;Casse chaîne|Chaîne en bout de moteur côté volant moteur, allongement documenté sur forts kilométrages.|Kit chaîne complet dernière référence, guides, tendeur, contrôle calage moteur.|1400|3200|1",
    "Tendeur chaîne hydraulique|Distribution|majeure|moyenne|M:fuel=e|60000|200000|2017|2027|Cliquetis 2 s au démarrage;Bruit haut moteur|Tendeur hydraulique se vidant à l'arrêt, patins de guidage usés.|Tendeur et patins dernière référence, contrôle tension et calage.|350|1200|0",
    "Courroie accessoires et galets|Distribution|modérée|élevée|M:*|80000|180000|2017|2027|Sifflement;Voyant batterie;Rupture courroie|Courroie poly-V, galets tendeurs et poulie débrayable d'alternateur fatigués.|Kit courroie accessoires, galets, poulie débrayable, contrôle alignement.|200|650|0",
    "Courroie distribution échéance|Distribution|majeure|moyenne|M:fam=K9K,M9R,EA211,EA288,MJ16,MJ23,TJET,GD2|120000|210000|2017|2027|Bruit distribution;Risque casse moteur|Échéance constructeur de courroie atteinte ou dépassée, galets et pompe à eau d'origine.|Courroie + galets + pompe à eau, contrôle pignons et jeu aux soupapes.|450|1300|0",
    "Jeu aux soupapes hors cote|Distribution|modérée|moyenne|M:fam=H4Dg,H4Dt,K15C,GD,G16E|60000|160000|2017|2027|Perte puissance à chaud;Cliquetis;Ratés|Jeux aux soupapes dérivés, sièges renforcés GPL ou usage intensif.|Contrôle et réglage jeu aux soupapes, pastilles ou poussoirs selon architecture.|180|700|0",
    "Pompe à huile pression basse|Distribution|critique|faible|M:*|120000|300000|2017|2027|Voyant pression huile;Cognement;Casse moteur|Pompe à huile usée ou crépine partiellement colmatée, pression insuffisante en charge.|Mesure pression huile, remplacement pompe et crépine, contrôle coussinets.|600|2600|0",
    "Consommation huile segmentation|Moteur|critique|élevée|M:fuel=e|30000|140000|2017|2024|Appoint > 0,5 L/1000 km;Fumée bleue;Bougies encrassées|Segmentation et décanteur sensibles, dilution par trajets courts sur injection directe essence.|Test de consommation normé, segmentation si hors tolérance, nettoyage décanteur.|150|2200|1",
    "Dilution essence trajets courts|Moteur|majeure|élevée|M:fuel=e|5000|90000|2017|2027|Niveau huile qui monte;Odeur essence;Viscosité perdue|Trajets courts et injection directe envoyant du carburant dans le carter, huile dégradée.|Vidange rapprochée, mise à jour calculateur injection, trajets longs réguliers.|100|320|0",
    "Dilution gazole régénérations|Moteur|majeure|élevée|M:fuel=d|10000|120000|2017|2027|Niveau au-dessus repère X;Odeur gazole;Risque emballement|Régénérations FAP incomplètes en usage urbain envoyant du gazole dans l'huile moteur.|Vidange immédiate si dilution, jauge repère X à chaque plein, mise à jour PCM.|110|380|0",
    "Coussinets de bielles usés|Moteur|critique|faible|M:fam=K9K,G4KH,G4LD,KR20,N63,HEMI,LT1|80000|260000|2017|2024|Cognement à chaud;Limaille dans l'huile;Casse moteur|Usure des coussinets de bielles aggravée par vidanges espacées et charges élevées.|Analyse huile, mesure jeu coussinets, réfection bas moteur ou échange moteur.|900|6500|1",
    "Joint de culasse fuite|Moteur|critique|faible|M:*|100000|280000|2017|2027|Fumée blanche;Surchauffe;Mayonnaise huile|Surchauffe répétée ayant endommagé le joint de culasse et la planéité.|Culasse rectifiée, joint neuf, visserie neuve, purge complète circuit.|1500|3800|0",
    "Calamine admission injection directe|Moteur|modérée|élevée|M:fuel=e|40000|140000|2017|2027|Ralenti instable;Ratés à froid;Perte haut régime|Dépôts sur soupapes d'admission en injection directe, décanteur saturé.|Décalaminage walnut blasting, nettoyage décanteur, bougies neuves.|150|520|0",
    "Volant moteur bi-masse|Moteur|modérée|moyenne|M:fuel=d|90000|220000|2017|2027|Claquement ralenti;Vibrations démarrage;Bruit extinction|Volant moteur bi-masse usé, ressorts internes fatigués par cycles diesel.|Kit embrayage et volant moteur bi-masse, contrôle planéité et serrage.|900|2200|0",
    "Poussoirs désactivation cylindres|Moteur|critique|moyenne|M:fam=HEMI,HEMIHC,L84,L87,LT1,LT2|60000|200000|2017|2024|Claquement haut moteur;Ratés;Casse arbre à cames|Poussoirs de désactivation AFM/DFM et rouleaux usés, lubrification insuffisante.|Kit poussoirs révisé, arbre à cames si atteint, huile spec constructeur.|1500|4800|1",
    "Pompe haute pression limaille|Injection|critique|faible|M:fuel=d|90000|250000|2017|2024|Casse injection;Claquement pompe;Mode dégradé|Usure poussoir ou came d'entraînement générant de la limaille dans tout le circuit.|Pompe HP, poussoir, rinçage complet circuit, injecteurs et rampe.|2500|6500|0",
    "Injecteurs débit retour hors cote|Injection|majeure|moyenne|M:fuel=d|80000|240000|2017|2027|Claquements;Démarrage difficile;Ralenti instable|Usure injecteurs et qualité gazole, dérive des débits retour au-delà des tolérances.|Test débit retour, codage IMA/SCN, remplacement des injecteurs hors cote.|400|2000|0",
    "Injecteurs piézo essence|Injection|majeure|faible|M:fuel=e|70000|200000|2017|2027|Ratés;Voyant moteur;Perte puissance|Injecteurs piézoélectriques encrassés ou hors cote, mélange appauvri.|Test débit et étanchéité, nettoyage ou remplacement, codage calculateur.|350|1600|0",
    "Rampe common rail pression|Injection|majeure|faible|M:fuel=d|90000|250000|2017|2027|P0087;Mode dégradé;Calage|Capteur ou régulateur de pression rampe défaillant, alimentation insuffisante.|Diagnostic pression rail, régulateur ou capteur, contrôle pompe gavage.|250|1100|0",
    "Préfiltre gazole colmaté|Injection|modérée|élevée|M:fuel=d|30000|120000|2017|2027|Perte puissance;Démarrage difficile;Voyant préfiltre|Gazole de qualité variable et préfiltre décanteur saturé en eau et particules.|Remplacement filtre et préfiltre décanteur, purge, contrôle qualité carburant.|80|360|0",
    "Bougies de préchauffage|Injection|modérée|moyenne|M:fuel=d|80000|220000|2017|2027|Démarrage difficile à froid;Fumée blanche;Voyant préchauffage|Bougies ou boîtier de préchauffage usés, cylindres non assistés au démarrage.|Remplacement bougies et boîtier, effacement défauts, test démarrage à froid.|200|750|0",
    "Turbo géométrie variable grippée|Turbo|majeure|moyenne|M:fuel=d|70000|220000|2017|2027|Perte puissance;Sifflement;Fumée noire|Calamine sur ailettes de géométrie variable, actionneur fatigué par cycles thermiques.|Nettoyage mécanisme ou turbo complet, actionneur, apprentissage valise.|600|2200|0",
    "Wastegate turbo essence|Turbo|majeure|moyenne|M:fuel=e|60000|200000|2017|2027|P0299;Perte puissance;À-coups charge|Tringlerie ou actuateur de wastegate grippé, pression de suralimentation insuffisante.|Contrôle jeu tringlerie, actuateur, apprentissage pression suralimentation.|350|1500|0",
    "Alimentation huile turbo colmatée|Turbo|critique|moyenne|M:*|80000|220000|2017|2027|Casse turbo;Voyant pression huile;Sifflement|Canalisation d'alimentation huile et crépine colmatées par résidus de courroie ou calamine.|Turbo, canalisation et crépine neuves, vidange normative, contrôle pression.|900|2100|0",
    "Intercooler et durites fuite|Turbo|modérée|moyenne|M:*|60000|200000|2017|2027|Perte puissance;Sifflement;Fumée|Durites de suralimentation poreuses ou colliers desserrés, échangeur fissuré.|Test étanchéité circuit, durites et colliers, échangeur si fissuré.|200|900|0",
    "Actuateur turbo électronique|Turbo|modérée|faible|M:*|70000|220000|2018|2027|Mode dégradé;Voyant moteur;Perte reprise|Actuateur électronique de turbo hors cote ou connectique oxydée.|Contrôle alimentation et signal, remplacement actuateur, apprentissage.|400|1400|0",
    "Pompe AdBlue cristallisée|Antipollution|majeure|élevée|M:fuel=d|40000|160000|2017|2027|Countdown antipollution;P20E8;Odeur ammoniaque|Cristallisation de l'urée dans le réservoir-pompe et l'injecteur, sondes NOx dérivées.|Réservoir-pompe, injecteur urée, sondes NOx, reset SCR, AdBlue frais ISO 22241.|900|2100|1",
    "Sondes NOx dérive SCR|Antipollution|modérée|élevée|M:fuel=d|40000|180000|2018|2027|Voyant moteur;Countdown;Conso AdBlue anormale|Sondes NOx amont/aval fatiguées par cycles thermiques et qualité d'AdBlue.|Diagnostic guidé des deux sondes, remplacement, reset apprentissages SCR.|300|1400|0",
    "FAP colmatage usage urbain|Antipollution|majeure|élevée|M:fuel=d|30000|160000|2017|2027|Voyant FAP;Régénérations fréquentes;Mode dégradé|Régénérations incomplètes en ville, suie accumulée et dilution gazole dans l'huile.|Régénération forcée, nettoyage ou remplacement FAP, vidange si dilution.|120|1800|0",
    "Vanne EGR encrassée|Antipollution|modérée|élevée|M:*|40000|180000|2017|2027|À-coups;Fumée noire;Mode tortue|Calamine sur clapet EGR et radiateur basse pression, débit recyclé hors cote.|Nettoyage ou remplacement EGR et radiateur, adaptation valise.|150|900|0",
    "Refroidisseur EGR fuite glycol|Antipollution|critique|moyenne|M:fam=EA288,DFGA,DSUA,B47,B57,M9R,R9M|30000|190000|2017|2023|Odeur glycol;Fumée blanche;Surchauffe|Fuite interne du refroidisseur EGR, mélange glycol-suie inflammable au contact des points chauds.|Campagne : refroidisseur EGR, contrôle admission et faisceau, éligibilité VIN.|0|0|1",
    "Catalyseur efficacité basse|Antipollution|modérée|faible|M:fuel=e|90000|240000|2017|2027|P0420;Odeur;Perte puissance|Catalyseur dégradé par dilution ou ratés prolongés, rendement sous seuil.|Remplacement catalyseur, contrôle bougies, injecteurs et sondes.|500|1900|0",
    "Sonde lambda dérive|Antipollution|modérée|moyenne|M:fuel=e|60000|190000|2017|2027|Voyant moteur;Consommation en hausse;Ratés|Sonde lambda vieillissante, régulation de richesse hors tolérance.|Remplacement sonde, effacement adaptatifs carburant, essai routier.|150|550|0",
    "Circuit LP-EGR calamine|Antipollution|modérée|moyenne|M:fuel=d|50000|190000|2019|2027|À-coups;Voyant moteur;Mode dégradé|Calamine sur circuit EGR basse pression et clapet, débit hors plage.|Nettoyage circuit LP-EGR, clapet, adaptation calculateur.|200|900|0",
    "Module pompe à eau fissuré|Refroidissement|majeure|élevée|M:fuel=e|40000|140000|2017|2027|Fuite LDR;Surchauffe;Odeur sucrée|Module thermopompe plastique fissuré, défaut récurrent sur architecture essence.|Module complet, purge sous vide, contrôle durites et vase d'expansion.|350|950|0",
    "Pompe à eau joint carbone|Refroidissement|modérée|moyenne|M:*|90000|260000|2017|2027|Suintement weep hole;Fuite LDR;Niveau bas|Joint carbone de pompe à eau fatigué par cycles thermiques et kilomètres.|Pompe à eau ou kit joint, purge circuit, contrôle pression et courroie.|300|1300|0",
    "Thermostat bloqué ouvert|Refroidissement|modérée|moyenne|M:*|70000|220000|2017|2027|Chauffe lente;Consommation en hausse;Voyant moteur|Thermostat bloqué en position ouverte, moteur sous température nominale.|Remplacement thermostat et joint, purge, contrôle sonde température.|150|600|0",
    "Radiateur colmaté boue|Refroidissement|majeure|moyenne|V:seg=2,4,13|60000|250000|2017|2027|Surchauffe;Perte puissance;Voyant température|Radiateur et intercooler colmatés par boue, herbe et débris d'exploitation.|Nettoyage radiateur et intercooler, contrôle ventilateur et visco-coupleur.|200|1100|0",
    "Visco-coupleur ventilateur|Refroidissement|modérée|faible|M:*|150000|350000|2017|2027|Surchauffe en montée;Bruit ventilateur;Température instable|Visco-coupleur grippé ne modulant plus le flux d'air selon température.|Remplacement visco-coupleur, contrôle pales et radiateur.|400|1500|0",
    "Durite de dégazage fragile|Refroidissement|critique|faible|M:fam=FOX,DRAGON|40000|120000|2017|2021|Surchauffe;Odeur glycol;Risque incendie|Durite de dégazage fragile fuyant sur point chaud du collecteur.|Campagne : durite de dégazage et contrôle complet du circuit.|0|320|1",
    "Mécatronique boîte double embrayage|Transmission|majeure|moyenne|M:fam=EA211,GT10,CHZL,DLAA,DPCA,CZDA|40000|160000|2017|2027|À-coups;Point mort;Voyant boîte|Accumulateur de mécatronique et embrayage sec usés en usage urbain.|Mise à jour logiciel, mécatronique si pression hors cote, huile spec.|0|2100|0",
    "Vidange boîte double embrayage humide|Transmission|info|moyenne|M:fam=EA888,CJXC,DNPA,DNFG,DKNA|55000|120000|2017|2027|À-coups si huile dégradée;Usure prématurée|Embrayage humide dont l'huile doit être renouvelée malgré annonce à vie.|Vidange boîte et filtre tous les 60000 km, huile spec constructeur.|250|520|0",
    "Cartographie boîte automatique|Transmission|modérée|moyenne|M:fam=DV5,DW10,EP6P,EB2ADTX|20000|130000|2018|2024|À-coups 1-2;Hésitations;Passage brutal|Cartographie première série et apprentissages dérivés, gestion de couple perfectible.|Mise à jour calculateur boîte, recalibration, essai routier, vidange AW-1.|0|560|0",
    "Vidange boîte automatique 8 rapports|Transmission|info|moyenne|M:fam=B48,B58,B47,AJ200D,GME,CWGD|80000|130000|2017|2027|À-coups à froid;Usure si huile dégradée|Boîte annoncée lubrifiée à vie mais retours terrain favorisant la vidange.|Vidange et crépine 100000 km, huile spec constructeur exclusivement.|350|700|0",
    "CVT patinage chaîne|Transmission|majeure|moyenne|M:fam=HR13,KR20,HRA2,FB20,FB25|60000|180000|2017|2027|Patinage;Bruit chaîne CVT;Surchauffe|Huile CVT dégradée et chaîne poussante usée en usage chargé.|Vidange huile spec CVT 60000 km, apprentissages, contrôle refroidisseur.|300|2700|0",
    "Filtre batterie hybride colmaté|Hybridation|info|élevée|M:fuel=h,p|25000|120000|2017|2027|Batterie HV chaude;Puissance bridée;Ventilation bruyante|Filtre de refroidissement de batterie haute tension colmaté sous assise.|Nettoyage filtre tous les 30000 km, bilan santé batterie annuel.|0|90|0",
    "Boîte de transfert chaîne détendue|Transmission|majeure|faible|M:fam=EA825,AJV8,CWGD,CYNB,CSZB|70000|220000|2017|2024|À-coups;Bruit accélération;Voyant 4x4|Chaîne de boîte de transfert détendue, pignons et carter usés.|Transfert échange standard, huile spec, calibration coupleur.|900|3000|0",
    "Embrayage sec broutage|Embrayage|modérée|moyenne|M:fuel=e|30000|140000|2017|2027|Broutage basse vitesse;À-coups;Odeur|Disque et mécanisme usés, apprentissages de point de léchage dérivés.|Recalibration valise puis kit embrayage si usure constatée.|0|1600|0",
    "Embrayage hydraulique fuite|Embrayage|majeure|faible|V:*|80000|240000|2017|2027|Pédale molle;Passages difficiles;Perte embrayage|Maître ou récepteur d'embrayage fuyard, circuit hydraulique contaminé.|Remplacement maître/récepteur, purge complète, contrôle flexible.|250|1100|0",
    "Frein de parking électrique|Freinage|modérée|moyenne|V:*|60000|220000|2017|2027|Blocage;Voyant EPB;Frein ne se desserre pas|Actionneur ou câble de frein de parking fatigué, corrosion du mécanisme.|Remplacement actionneur, procédure de dépose, calibration valise.|250|1000|0",
    "Capteur ABS et couronne|Freinage|modérée|moyenne|V:*|40000|200000|2017|2027|Voyants ABS ESP;Régulateur inactif;Anti-patinage perdu|Capteur de roue ou couronne dentée dégradés par corrosion et boue.|Remplacement capteur et couronne, effacement défauts, essai dynamique.|120|520|0",
    "Maître-cylindre de frein|Freinage|critique|faible|V:*|90000|260000|2017|2027|Pédale qui descend;Perte freinage;Distance allongée|Joint de maître-cylindre fatigué, fuite interne du circuit primaire.|Kit réparation ou maître-cylindre neuf, purge complète, test pression.|200|900|0",
    "Étriers de frein grippés|Freinage|modérée|élevée|V:*|50000|180000|2017|2027|Freinage qui tire;Usure irrégulière;Échauffement|Coulisseaux d'étriers corrodés, pistons grippés par défaut d'entretien.|Révision étriers, graissage coulisseaux, plaquettes et purge liquide.|150|700|0",
    "Disques corrodés freinage régénératif|Freinage|mineure|élevée|M:fuel=b,h,p|15000|120000|2017|2027|Disques corrodés;Bruit;Freinage moins mordant|Freinage régénératif sollicitant peu les mécanismes, corrosion de surface.|Nettoyage et lubrification annuel, purge liquide tous les 2 ans.|80|320|0",
    "Liquide de freins hygroscopie|Freinage|modérée|élevée|V:*|40000|200000|2017|2027|Pédale spongieuse;Point d'ébullition bas;Freinage fade|Liquide de freins chargé en humidité après 2 ans, performance en baisse.|Purge complète DOT4 ou DOT4 LV selon spec, contrôle flexibles.|80|220|0",
    "Pompe à vide assistance freinage|Freinage|critique|faible|M:fam=EB2,EB2ADTX,DV5|0|100000|2017|2022|Pédale dure;Assistance réduite;Distance allongée|Défaillance de pompe à vide ou de clapet, perte d'assistance de freinage.|Campagne : pompe à vide, contrôle circuit assistance, essai instrumenté.|0|0|1",
    "Biellettes et silentblocs|Suspension|mineure|élevée|V:*|40000|180000|2017|2027|Claquement train avant;Usure pneus irrégulière;Flou direction|Biellettes de barre stabilisatrice et silentblocs de bras fatigués.|Remplacement biellettes ou bras complets, géométrie complète.|200|800|0",
    "Amortisseurs fuite et rebonds|Suspension|modérée|moyenne|V:*|80000|220000|2017|2027|Rebonds;Suintement;Tenue de route dégradée|Usure hydraulique des amortisseurs, butées et coupelles fatiguées.|Paire d'amortisseurs, butées, soufflets, géométrie et équilibrage.|300|1000|0",
    "Suspension pneumatique boudins|Suspension|modérée|moyenne|V:seg=4,5|80000|220000|2017|2027|Affaissement;Compresseur bruyant;Voyant suspension|Boudins percés et compresseur vieillissant, valves de niveau hors cote.|Remplacement boudin ou compresseur, calibration hauteur valise.|400|2400|0",
    "Rotules de direction usure|Direction|majeure|élevée|V:*|80000|240000|2017|2027|Jeu direction;Claquement;Usure pneus|Rotules et biellettes de direction usées par chocs et charges.|Remplacement rotules et biellettes, géométrie, couple spec.|200|900|0",
    "Roulements de roue|Châssis|mineure|moyenne|V:*|80000|240000|2017|2027|Ronflement évolutif;Bruit en courbe;Jeu roue|Usure normale des roulements, étanchéité perdue après lavages.|Remplacement moyeu complet, couple contrôlé, contrôle capteur ABS.|200|650|0",
    "Direction assistée électrique|Direction|modérée|faible|V:*|40000|180000|2017|2027|Direction dure;Voyant EPS;Assistance intermittente|Capteur d'angle ou moteur EPS défaillant, connectique oxydée.|Diagnostic EPS, calibration capteur d'angle, remplacement si nécessaire.|250|1500|0",
    "Colonne de direction assistance|Direction|critique|faible|V:*|60000|200000|2018|2024|Perte assistance;Voyant direction;Direction lourde|Défaut de colonne à assistance électrique sur lots identifiés.|Campagne : colonneassistance remplacée, calibration, essai dynamique.|0|0|1",
    "Crémaillère de direction fuite|Direction|modérée|faible|V:*|100000|280000|2017|2027|Fuite huile;Durcissement;Sifflement|Joints de crémaillère et flexibles fatigués, pompe assistée sollicitée.|Crémaillère ou kit joints, flexibles, purge et contrôle pression.|500|1900|0",
    "Batterie 12V sulfatation|Batterie 12V|modérée|élevée|V:*|20000|120000|2017|2027|Non prêt;Voyants aléatoires;Démarrage difficile|Batterie AGM/EFB sollicitée par cycles courts, veille et stockage prolongé.|Batterie AGM/EFB neuve, test alternateur, reset gestion énergie BSI.|150|420|0",
    "Alternateur régulateur|Électronique|modérée|moyenne|V:*|90000|260000|2017|2027|Voyant charge;Batteries faibles;Surtension|Régulateur et diodes d'alternateur fatigués, poulie débrayable usée.|Alternateur ou régulateur, poulie, courroie accessoires, test charge.|350|1200|0",
    "Démarreur solénoïde|Électronique|modérée|faible|V:*|90000|260000|2017|2027|Clic unique;Démarrage refusé;Lancement aléatoire|Solénoïde et charbons de démarreur usés, alimentation dégradée.|Démarreur échange standard, contrôle masses et câblage batterie.|250|800|0",
    "Faisceau de hayon caméra|Électronique|mineure|moyenne|V:*|30000|190000|2017|2027|Image noire;Lignes figées;Caméra intermittente|Faisceau de hayon fatigué à force d'ouvertures, conducteurs coupés.|Remplacement caméra et reprise faisceau hayon, calibration.|150|700|0",
    "Calculateur multimédia figé|Électronique|mineure|moyenne|M:fam=EB2,DV5,EP6P,EB2G3|10000|160000|2017|2024|Écran figé;Caméra noire;ADAS indisponible|Logiciel multimédia et BSI immature, faisceau de hayon sollicité.|Mise à jour BSI et multimédia, reprise faisceau, calibration caméra.|150|750|0",
    "Capteur position papillon|Électronique|modérée|moyenne|V:*|40000|180000|2017|2027|Ralenti erratique;À-coups;Voyant moteur|Capteur TPS dérivant et connecteurs oxydés, apprentissages perdus.|Contrôle et calibration TPS, nettoyage connectique, mise à jour ECU.|100|520|0",
    "Télématique décharge 12V|Électronique|modérée|moyenne|M:fuel=b|10000|150000|2019|2027|Batterie à plat après stockage;Non prêt;Fonctions perdues|Veille excessive du boîtier télématique sollicitant la batterie 12V.|Mise à jour gestion veille, batterie 12V AGM, maintien de charge.|0|340|0",
    "Cellules batterie risque thermique|Batterie HV|critique|faible|M:fam=LGEV,EM57,ULT,EGMP|0|120000|2018|2024|Charge limitée;Odeur;Voyant batterie|Court-circuit interne de cellules sur lots identifiés, emballement possible.|Campagne : BMS, modules ou pack complet, consignes de stationnement.|0|0|1",
    "Unité de charge intégrée ICCU|Charge|majeure|moyenne|M:fam=EGMP,EM0055|5000|90000|2021|2026|12V non chargée;Perte puissance;Charge AC impossible|Fusible ou transformateur de l'unité de charge défaillant.|Campagne logiciel ICCU puis remplacement si DTC, contrôle 12V et DC-DC.|0|2900|1",
    "Dégradation capacité batterie|Batterie HV|modérée|moyenne|M:fuel=b|60000|260000|2017|2027|Autonomie réduite;Charge lente;Puissance bridée|Vieillissement cellulaire et déséquilibre modules en cycles intensifs.|Bilan SOH, équilibrage modules, mise à jour BMS, modules si SOH bas.|0|9500|0",
    "Chargeur embarqué AC|Charge|modérée|moyenne|M:fuel=b,p|15000|140000|2018|2027|Charge AC interrompue;Charge lente;Véhicule non prêt|Chargeur embarqué et batterie 12V sollicités, connectique fatiguée.|Diagnostic OBC, mise à jour logiciel, 12V AGM, contrôle câble T2.|150|2400|0",
    "Verrouillage câble de charge|Charge|modérée|moyenne|M:fuel=b,p|10000|150000|2018|2027|Câble bloqué;Charge impossible;Voyant charge|Actionneur de verrouillage de prise défaillant, capteur de position hors cote.|Remplacement actionneur, contrôle connectique véhicule, essai charge.|200|1000|0",
    "Contacteurs haute tension|Batterie HV|critique|faible|M:fam=GE1,EM2|0|70000|2021|2024|Perte puissance soudaine;Mode tortue;Voyant HV|Ouverture sous charge des contacteurs haute tension, soudures fatiguées.|Campagne : boîtier contacteurs remis à niveau, logiciel, essai validation.|0|0|1",
    "Pompe à chaleur vanne 4 voies|Climatisation|modérée|moyenne|M:fuel=b|20000|160000|2020|2027|Chauffage faible hiver;Autonomie réduite;Bruit circuit|Vanne 4 voies ou compresseur électrique défaillant, cycle frigorifique perturbé.|Diagnostic frigorifique, vanne ou compresseur, mise à jour logiciel thermique.|400|2400|0",
    "Batterie 12V auxiliaire hybride|Hybridation|modérée|élevée|M:fuel=h,p|20000|130000|2017|2027|Non prêt malgré traction chargée;Voyants;Fonctions perdues|Batterie 12V très sollicitée en veille sur architecture hybride.|Batterie AGM, contrôle DC-DC, reset gestion énergie.|150|420|0",
    "Alterno-démarreur 48V courroie|Hybridation|modérée|faible|M:fam=M254,M256,EA211,DPCAE|20000|120000|2018|2027|Voyant 48V;Redémarrages erratiques;Perte assistance|Alterno-démarreur à courroie et DC-DC sollicités, courroie dédiée usée.|Contrôle RSG, courroie dédiée, batterie 48V, convertisseur DC-DC.|400|1800|0",
    "Prolongateur thermique peu sollicité|Hybridation|info|moyenne|M:fam=LIREV,DMi,GWMPHEV,SERP,AITOP|0|120000|2022|2027|Huile ancienne malgré faible km;Odeur carburant|Thermique utilisé comme générateur, cycles courts et condensation.|Vidange annuelle impérative, contrôle dilution, trajets longs réguliers.|120|340|0",
    "Condenseur de climatisation|Climatisation|mineure|moyenne|V:*|40000|180000|2017|2027|Froid insuffisant;Perte progressive;Fuite gaz|Condenseur percé par gravillons ou joints de fluide frigorigène dégradés.|Détection de fuite, condenseur, recharge gaz spec, contrôle pressions.|150|1200|0",
    "Volet de mixage air|Climatisation|mineure|moyenne|V:*|50000|200000|2017|2027|Température incohérente;Bruit sous planche;Air mal réparti|Actionneur de volet de mixage hors cote, engrenage cassé.|Remplacement actionneur, calibration boîtier climatisation.|150|600|0",
    "Radar ACC désalignement|ADAS|modérée|moyenne|V:*|10000|190000|2018|2027|ACC indisponible;Voyant radar;Freinage adaptatif perdu|Radar désaligné après choc de pare-chocs ou dépose sans calibration.|Calibration radar statique et dynamique après intervention.|150|600|0",
    "Caméra maintien de voie|ADAS|modérée|moyenne|V:*|10000|190000|2018|2027|Corrections intempestives;Voyant ADAS;Fonction inactive|Caméra mal calibrée après vitrage ou logiciel ancien.|Calibration caméra, mise à jour logiciel ADAS, essai routier.|0|500|0",
    "Capteur angle mort|ADAS|modérée|faible|V:*|30000|190000|2018|2027|Détection absente;Voyant rétroviseur;Alertes erratiques|Capteur radar arrière désaligné ou pare-chocs réparé sans calibration.|Contrôle et calibration capteurs arrière, reprise fixation.|200|800|0",
    "Freinage d'urgence intempestif|ADAS|critique|faible|V:*|5000|150000|2019|2026|Freinages fantômes;Alertes injustifiées;Perte de confiance|Fusion capteurs erronée, logiciel de décision immature sur certains lots.|Campagne logicielle AEBS, calibration caméra et radar, essai validation.|0|0|1",
    "Module éclairage matriciel|Éclairage|modérée|faible|V:*|30000|200000|2017|2027|Segments éteints;Condensation;Faisceau dégradé|Module LED et étanchéité d'optique dégradés, électronique de puissance fatiguée.|Remplacement module optique, contrôle étanchéité, calibration faisceau.|300|2400|0",
    "Condensation optique|Éclairage|mineure|moyenne|V:*|20000|200000|2017|2027|Buée interne;Portée réduite;Trace d'humidité|Évents d'optique bouchés et joints vieillis, humidité piégée.|Nettoyage évents, joints, séchage optique, contrôle fixation.|80|450|0",
    "Toit panoramique infiltration|Carrosserie|mineure|moyenne|V:*|40000|220000|2017|2027|Traces eau ciel de toit;Odeur humidité;Taches auréolées|Drains d'évacuation bouchés et joints de toit vieillis.|Nettoyage drains, joints, séchage habitacle, contrôle évacuations.|80|700|0",
    "Infiltration hayon et feux|Carrosserie|mineure|moyenne|V:*|40000|220000|2017|2027|Eau dans coffre;Humidité;Corrosion locale|Joints de hayon et de feux dégradés, évacuations obstruées.|Remplacement joints, reprise étanchéité, séchage et traitement.|100|600|0",
    "Rétroviseur rabattement|Carrosserie|mineure|faible|V:*|40000|220000|2017|2027|Rabattement inopérant;Bruit;Position instable|Moteur ou engrenage de rabattement usé, lubrification perdue.|Remplacement module rétroviseur, contrôle faisceau de porte.|120|600|0",
    "Corrosion bas de caisse|Carrosserie|modérée|moyenne|V:seg=0,2,4|60000|250000|2017|2027|Corrosion perforante;Rouille sous caisse;Peinture cloquée|Protection anticorrosion insuffisante en zone salée, rétention d'humidité.|Traitement antirouille, contrôle structure, reprise tôle si perforante.|400|2600|0",
    "Nappe de siège chauffant|Sellerie|mineure|faible|V:*|40000|220000|2017|2027|Chauffage inopérant;Voyant siège;Coupure intermittente|Nappe chauffante coupée par plis répétés, connectique sous siège sollicitée.|Remplacement nappe, contrôle faisceau et connecteur sous siège.|150|800|0",
    "Connecteur airbag sous siège|Airbags|modérée|moyenne|V:*|20000|200000|2017|2027|Voyant airbag permanent;Défaut mémorisé|Connecteur sous siège oxydé ou mal enclenché après déplacement.|Reprise connectique, effacement défaut, contrôle faisceau et prétensionneurs.|80|350|0",
    "Prétensionneur de ceinture|Airbags|critique|faible|V:*|0|150000|2017|2024|Voyant airbag;Ceinture inerte;Défaut sécurité|Prétensionneur pyrotechnique hors spécification sur lots identifiés.|Campagne : remplacement prétensionneur, contrôle calculateur et faisceau.|0|0|1",
    "Pompe de gavage carburant|Carburant|majeure|moyenne|M:*|80000|240000|2017|2027|Démarrage difficile;Perte puissance;Air dans circuit|Pompe de gavage et clapet anti-retour usés, alimentation HP insuffisante.|Pompe gavage et clapet, purge circuit, contrôle durites et pression.|300|1200|0",
    "Réservoir corrosion interne|Carburant|modérée|faible|V:*|80000|280000|2017|2027|Rouille dans filtre;Ratés;Fuite suintante|Condensation et carburant stocké dans réservoir acier, corrosion interne.|Nettoyage et traitement réservoir, filtre à carburant, contrôle étanchéité.|150|900|0",
    "Durites carburant poreuses|Carburant|modérée|moyenne|V:*|60000|240000|2017|2027|Odeur carburant;Suintement;Démarrage difficile|Durites vieillissantes et colliers fatigués, compatibilité biocarburant.|Remplacement durites et colliers spec carburant, contrôle étanchéité.|60|340|0",
    "Flexible échappement fissuré|Échappement|modérée|moyenne|M:fuel=d|80000|260000|2017|2027|Bruit sourd;Odeur gaz;Voyant antipollution|Flexible et tresse d'échappement fissurés par cycles thermiques et corrosion.|Remplacement flexible, contrôle supports et silentblocs, étanchéité.|150|700|0",
    "Supports échappement silentblocs|Échappement|mineure|moyenne|V:*|80000|260000|2017|2027|Claquement sous caisse;Vibrations;Bruit au ralenti|Silentblocs de suspension d'échappement déchirés, ligne désalignée.|Remplacement silentblocs, alignement ligne, contrôle colliers.|80|400|0",
    "Mise à jour logicielle OTA|Logiciel|mineure|moyenne|M:fuel=b|0|80000|2020|2027|Écran figé;Fonctions perdues;Non prêt après OTA|Campagnes logicielles successives et gestion 12V perfectible.|Dernière version logicielle, batterie 12V AGM, maintien de charge.|0|340|0",
    "Cartographie moteur à-coups|Logiciel|modérée|moyenne|M:fuel=e|5000|120000|2018|2027|À-coups à froid;Hésitations;Ralenti instable|Cartographie d'injection et d'allumage perfectible sur premières séries.|Mise à jour calculateur moteur, adaptation boîte, essai routier.|0|300|0",
    "Boîte électrifiée calage|Logiciel|modérée|moyenne|M:fam=EB2G3,EB2G3P|0|60000|2023|2026|À-coups;Calage au redémarrage;Transition brutale|Gestion de boîte électrifiée et 48V de première série à finaliser.|Mise à jour calculateur boîte et moteur, apprentissages, essai routier.|0|280|0",
    "Usure pneumatiques irrégulière|Pneumatiques|mineure|élevée|V:*|10000|120000|2017|2027|Usure en facettes;Vibrations;Bruit de roulement|Géométrie dérivée, amortisseurs fatigués, pression inadaptée.|Géométrie complète, rotation pneus, contrôle amortisseurs et pression.|100|450|0",
    "Boulons de moyeu desserrage|Pneumatiques|critique|faible|M:fam=E4TN|0|8000|2022|2024|Risque desserrage roue;Vibration;Bruit suspect|Défaut d'assemblage de moyeu sur premiers lots de plateforme électrique.|Campagne : boulons moyeu remplacés, couple contrôlé, VIN avant livraison.|0|0|1",
    "Berceau corrosion perforante|Châssis|modérée|faible|V:*|60000|260000|2017|2027|Corrosion perforante;Rouille sous caisse;Contrôle technique|Protection anticorrosion insuffisante et rétention de sel dans le berceau.|Traitement antirouille, contrôle structure, reprise ou remplacement berceau.|400|2800|0",
    "Huile specification non conforme|Entretien|majeure|élevée|M:*|5000|200000|2017|2027|Usure prématurée;Voyant pression;Bruit moteur|Huile ne respectant pas la norme constructeur, dégradation accélérée des organes.|Vidange avec huile spec exclusive, filtre neuf, contrôle circuit et pression.|100|400|0",
    "Filtres colmatés entretien|Entretien|mineure|élevée|V:*|20000|120000|2017|2027|Perte puissance;Consommation;Air habitacle faible|Filtres air, habitacle et carburant au-delà des échéances constructeur.|Remplacement filtres selon carnet, contrôle colmatage et débits.|80|380|0",
    "Antivol clé non reconnue|Électronique|modérée|faible|V:*|20000|220000|2017|2027|Démarrage refusé;Clé non reconnue;Voyant antivol|Transpondeur ou antenne d'antidémarrage défaillants, appairage perdu.|Appairage valise, remplacement antenne, contrôle transpondeur de clé.|150|800|0",
    "Serrure et lève-vitre|Carrosserie|mineure|moyenne|V:*|40000|220000|2017|2027|Vitre bloquée;Bruit moteur;Fermeture aléatoire|Mécanisme de lève-vitre et moteur fatigués, coulisses sèches.|Remplacement mécanisme, graissage coulisses, réinitialisation anti-pincement.|150|700|0",
    "Essuie-glace tringlerie|Carrosserie|mineure|moyenne|V:*|50000|240000|2017|2027|Balayage irrégulier;Bruit;Arrêt intempestif|Tringlerie et rotules d'essuie-glace grippées, moteur fatigué.|Remplacement tringlerie ou moteur, graissage, contrôle relais.|120|550|0",
    "Système lave-glace gel|Carrosserie|mineure|faible|V:*|20000|200000|2017|2027|Pas de projection;Bruit pompe;Gicleurs bouchés|Pompe de lave-glace grippée par gel, gicleurs et durites obstrués.|Remplacement pompe, purge circuit, gicleurs et liquide antigel.|80|350|0",
    "Batterie traction préconditionnement|Batterie HV|info|moyenne|M:fuel=b|10000|200000|2019|2027|Charge DC lente hiver;Autonomie réduite;Puissance bridée|Batterie froide non préconditionnée avant charge rapide.|Activation préconditionnement via navigation vers borne, mise à jour BMS.|0|0|0",
    "Réducteur électrique sifflement|Transmission|mineure|faible|M:fuel=b|60000|240000|2018|2027|Sifflement proportionnel vitesse;Bruit en décélération|Huile de réducteur dégradée ou roulements usés.|Vidange réducteur, contrôle roulements et jeu d'engrenages.|250|1600|0",
    "Prise de charge thermique|Charge|modérée|faible|M:fuel=b,p|5000|120000|2019|2027|Connecteur chaud;Charge bridée;Odeur|Broches de prise oxydées et échauffement en charge rapide répétée.|Nettoyage ou remplacement broches, contrôle étanchéité, courbe de charge.|150|900|0",
    "Freinage régénératif blending|Freinage|mineure|moyenne|M:fuel=b,h,p|10000|160000|2018|2027|À-coups au freinage;Transition brutale;Pédale incohérente|Blending régénératif-mécanique perfectible, capteur de pédale dérivant.|Mise à jour logiciel, purge freins, calibration capteur de pédale.|0|280|0",
    "Capteur hauteur suspension adaptative|Suspension|modérée|faible|V:seg=4,5|60000|220000|2017|2027|Voyant suspension;Raideur figée;Hauteur incohérente|Capteur de hauteur défaillant, tringlerie grippée.|Remplacement capteur, calibration valise, contrôle tringlerie.|250|1200|0",
    "Direction arrière active|Direction|modérée|faible|V:seg=4,5|60000|220000|2018|2027|Voyant direction;Braquage réduit;Comportement altéré|Actionneur de direction arrière hors cote, calibration perdue.|Diagnostic actionneur, calibration, remplacement si nécessaire.|500|2400|0",
    "Attelage faisceau remorque|Électronique|modérée|moyenne|V:seg=4,5,13|40000|220000|2017|2027|Défauts éclairage remorque;Voyant;Fonctions perdues|Connecteur de faisceau oxydé et câble torsadé fatigué.|Nettoyage ou remplacement connecteur, reprise faisceau, test fonctions.|120|650|0",
    "Boîtier préchauffage additionnel|Refroidissement|modérée|faible|M:fuel=d|80000|260000|2017|2027|Chauffe lente hiver;Fumée blanche;Bruit brûleur|Boîtier de préchauffage additionnel encrassé, bougie et pompe doseuse usées.|Nettoyage ou remplacement boîtier, bougie, pompe doseuse, purge.|400|1800|0",
    "Admission volet swirl|Injection|modérée|faible|M:fuel=d|80000|240000|2017|2027|À-coups;Bruit admission;Casse volet|Axe de volet swirl usé, calamine bloquant la cinématique.|Remplacement admission complète, volets, adaptation calculateur.|400|1600|0",
    "Pompe à eau électrique HV|Refroidissement|modérée|faible|M:fuel=b,h,p|40000|200000|2018|2027|Puissance bridée;Surchauffe batterie;Voyant HV|Pompe de refroidissement de batterie défaillante, débit insuffisant.|Remplacement pompe, purge circuit batterie, contrôle capteurs.|400|1600|0",
    "Refroidisseur huile joints|Moteur|modérée|faible|M:*|80000|260000|2017|2027|Suintement huile;Consommation;Odeur huile chaude|Joints de refroidisseur d'huile durcis par cycles thermiques répétés.|Remplacement joints, contrôle pression huile et étanchéité carter.|250|1000|0",
    "Carter ventilation décanteur|Moteur|modérée|moyenne|M:*|60000|220000|2017|2027|Consommation huile;Sifflement;Fuite suintante|Membrane de décanteur de carter percée, pression interne excessive.|Remplacement décanteur complet, contrôle reniflard et joints.|200|800|0",
    "Support moteur hydraulique|Moteur|modérée|moyenne|V:*|80000|260000|2017|2027|Vibrations ralenti;Claquement;Couple transmis brutal|Support moteur hydraulique fuyard, silentblocs déchirés.|Remplacement supports moteur et boîte, contrôle alignement ligne.|300|1200|0",
    "Cardan soufflet graisse|Transmission|mineure|moyenne|V:*|60000|220000|2017|2027|Graisse projetée;Claquement braquage;Usure cardan|Soufflet de cardan fissuré, graisse perdue et contamination.|Remplacement soufflet ou cardan complet, graissage et colliers.|150|700|0",
    "Différentiel autobloquant huile|Transmission|modérée|faible|V:seg=11,9|60000|240000|2017|2027|À-coups en manœuvre;Bruit pont;Usure disques|Huile de différentiel dégradée, disques de glissement limité usés.|Vidange huile spec LSD, contrôle disques et jeu, calibration.|300|1500|0",
    "Boîte manuelle synchronisateurs|Transmission|modérée|faible|M:*|100000|280000|2017|2027|Craquement passage;Rapport qui refuse;Bruit|Synchronisateurs usés, huile de boîte dégradée, tringlerie déréglée.|Vidange boîte, réglage tringlerie, réfection synchronisateurs si nécessaire.|300|2200|0",
    "Capteur température batterie|Batterie HV|modérée|faible|M:fuel=b,h,p|30000|200000|2018|2027|Charge bridée;Puissance limitée;Voyant HV|Sonde de température de module batterie dérivante, gestion conservatrice.|Contrôle sonde et faisceau, remplacement, mise à jour BMS.|200|1200|0",
    "Convertisseur DC-DC|Charge|majeure|faible|M:fuel=b,h,p|30000|200000|2018|2027|12V déchargée;Voyants multiples;Non prêt|Convertisseur DC-DC ne rechargeant plus la batterie 12V depuis la traction.|Diagnostic DC-DC, remplacement, contrôle 12V et gestion veille.|600|2600|0",
    "Gestion thermique moteur électrique|Refroidissement|modérée|faible|M:fuel=b|20000|200000|2019|2027|Puissance bridée;Alarme température;Charge lente|Circuit de refroidissement moteur et onduleur sollicité, pompe ou vanne hors cote.|Contrôle circuit, pompe, vanne, radiateur, mise à jour courbe thermique.|300|1900|0",
    "Sièges mémoire et réglages|Sellerie|mineure|faible|V:*|40000|220000|2017|2027|Mémoire perdue;Réglage inopérant;Bruit moteur|Moteur de réglage ou capteur de position hors cote, calibration perdue.|Remplacement moteur ou capteur, réinitialisation mémoires.|200|900|0",
    "Toit ouvrant motorisation|Carrosserie|mineure|faible|V:*|50000|240000|2017|2027|Toit bloqué;Bruit;Anti-pincement déclenché|Câbles et coulisses de toit ouvrant grippés, moteur fatigué.|Nettoyage et graissage coulisses, câbles, réinitialisation anti-pincement.|200|1100|0",
    "Hayon motorisé vérins|Carrosserie|mineure|moyenne|V:seg=4,5,6|50000|240000|2017|2027|Hayon lourd;Ouverture incomplète;Bruit vérin|Vérins de hayon fatigués, moteur et capteur de position hors cote.|Remplacement vérins, calibration hayon, contrôle faisceau.|250|1100|0",
    "Peinture et vernis dégradation|Carrosserie|mineure|faible|V:*|60000|260000|2017|2027|Vernis écaillé;Teinte passée;Micro-fissures|Vernis et couche claire dégradés par UV et lavages agressifs.|Polissage, reprise vernis localisée, protection céramique.|200|1500|0"
  ];

  /* ══════════ ARCHÉTYPES ══════════ */
  var ARCH = [];
  CAT.forEach(function (row, i) {
    var f = row.split("|");
    if (f.length < 15) { return; }
    var c0 = N(f[12], 0), c1 = N(f[13], 0);
    ARCH.push({
      i: i, t: f[0], dom: f[1], sev: f[2], freq: f[3], rule: f[4],
      k0: N(f[5], 0), k1: N(f[6], 200000), y0: N(f[7], 2017), y1: N(f[8], 2027),
      sym: L(f[9]), cause: f[10], fix: f[11],
      cost: [c0, Math.max(c0, c1)], recall: f[14] === "1"
    });
  });

  /* ══════════ CIBLES RÉELLES ISSUES DE LA BASE ══════════ */
  function db() { return W.DB || { brands: [], models: [], engines: [], faults: [], tsb: [] }; }
  function modelById(id) {
    var f = null;
    A(db().models).forEach(function (m) { if (m && m.id === id) { f = m; } });
    return f;
  }
  function famTargets() {
    var g = {};
    A(db().engines).forEach(function (e) {
      if (!e || !e.fam) { return; }
      if (!g[e.fam]) { g[e.fam] = { fam: e.fam, fuels: {}, brands: {}, models: {}, y0: 9999, y1: 0, n: 0 }; }
      var t = g[e.fam];
      t.fuels[e.fuel] = 1;
      t.n++;
      var m = modelById(A(e.m)[0]);
      if (m) {
        t.brands[m.b] = 1;
        if (Object.keys(t.models).length < 8) { t.models[m.n] = 1; }
        var y = A(e.y);
        t.y0 = Math.min(t.y0, N(y[0], 2017));
        t.y1 = Math.max(t.y1, N(y[1], 2027));
      }
    });
    return Object.keys(g).sort().map(function (k) {
      var t = g[k];
      return {
        fam: t.fam, fuels: Object.keys(t.fuels), brands: Object.keys(t.brands),
        models: Object.keys(t.models), y: [t.y0 === 9999 ? 2017 : t.y0, t.y1 || 2027], n: t.n
      };
    });
  }
  function brandTargets() {
    var mods = {};
    A(db().models).forEach(function (m) {
      if (!mods[m.b]) { mods[m.b] = []; }
      mods[m.b].push(m);
    });
    var hasEv = {};
    A(db().engines).forEach(function (e) {
      var m = modelById(A(e.m)[0]);
      if (m && e.fuel === "b") { hasEv[m.b] = 1; }
    });
    return A(db().brands).slice().sort(function (a, b) { return a.id.localeCompare(b.id); }).map(function (b) {
      var ms = mods[b.id] || [];
      return {
        b: b.id, n: b.n, region: b.region, ev: !!hasEv[b.id],
        models: ms.slice(0, 8).map(function (m) { return m.n; }),
        segs: ms.map(function (m) { return A(W.SEGS).indexOf(m.seg); }),
        y: [2017, 2027], count: ms.length
      };
    }).filter(function (t) { return t.count > 0; });
  }
  function ruleOk(rule, target, isFam) {
    var p = rule.split(":");
    var kind = p[0];
    var arg = p[1] || "*";
    if (kind === "M" && !isFam) { return false; }
    if (kind === "V" && isFam) { return false; }
    if (arg === "*") { return true; }
    var kv = arg.split("=");
    var key = kv[0], vals = L(kv[1] || "");
    if (key === "fuel") {
      if (isFam) {
        var hit = false;
        target.fuels.forEach(function (f) { if (vals.indexOf(f) > -1) { hit = true; } });
        return hit;
      }
      if (vals.indexOf("b") > -1) { return target.ev; }
      return true;
    }
    if (key === "fam") { return isFam && vals.indexOf(target.fam) > -1; }
    if (key === "seg") {
      if (isFam) { return false; }
      var ok = false;
      target.segs.forEach(function (s) { if (vals.indexOf(String(s)) > -1) { ok = true; } });
      return ok;
    }
    return false;
  }

  /* ══════════ TÂCHES (ordre entrelacé par domaine) ══════════ */
  function buildTasks() {
    var ft = famTargets(), bt = brandTargets();
    var byDom = {};
    ARCH.forEach(function (a) {
      var isFamRule = a.rule.indexOf("M:") === 0;
      var list = isFamRule ? ft : bt;
      list.forEach(function (tg) {
        if (!ruleOk(a.rule, tg, isFamRule)) { return; }
        var label = isFamRule ? tg.fam : tg.n;
        var brands = isFamRule ? tg.brands : [tg.b];
        var y0 = Math.max(a.y0, tg.y[0]);
        var y1 = Math.min(a.y1, tg.y[1]);
        if (y0 > y1) { return; }
        var task = {
          key: K(a.t + "|" + label),
          a: a, label: label, isFam: isFamRule,
          fam: isFamRule ? [tg.fam] : [],
          brands: brands, models: tg.models, y: [y0, y1],
          tref: K(a.t + "|" + label)
        };
        if (!byDom[a.dom]) { byDom[a.dom] = []; }
        byDom[a.dom].push(task);
      });
    });
    var doms = Object.keys(byDom).sort();
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      for (var d = 0; d < doms.length; d++) {
        var arrD = byDom[doms[d]];
        if (arrD[i]) { out.push(arrD[i]); more = true; }
      }
      i++;
    }
    return out;
  }

  /* ══════════ INDEX DE CORRÉLATION O(1) ══════════ */
  var IDX = { stamp: "", fF: {}, mF: {}, tF: {}, tB: {}, tM: {}, eF: {}, eM: {}, tokM: {} };
  function stamp() {
    var d = db();
    return [A(d.faults).length, A(d.tsb).length, A(d.engines).length, A(d.models).length, A(d.brands).length].join(":");
  }
  function ensureIndex() {
    var s = stamp();
    if (IDX.stamp === s) { return; }
    var d = db();
    IDX.fF = {}; IDX.mF = {}; IDX.tF = {}; IDX.tB = {}; IDX.tM = {}; IDX.eF = {}; IDX.eM = {}; IDX.tokM = {};
    var models = A(d.models), engines = A(d.engines);
    var mkey = models.map(function (m) { return { id: m.id, n: m.n, k: K(m.n) }; });
    mkey.forEach(function (m) { IDX.eM[m.id] = []; });
    engines.forEach(function (e) {
      if (!e) { return; }
      if (!IDX.eF[e.fam]) { IDX.eF[e.fam] = []; }
      IDX.eF[e.fam].push(e);
      A(e.m).forEach(function (mid) {
        if (IDX.eM[mid]) { IDX.eM[mid].push(e); }
      });
    });
    function toks(listT) {
      var out = [];
      A(listT).forEach(function (t) {
        var k = K(t);
        if (k && k !== "*" && out.indexOf(k) < 0) { out.push(k); }
      });
      return out;
    }
    var allTok = {};
    A(d.faults).forEach(function (f) {
      if (!f) { return; }
      A(f.fam).forEach(function (x) {
        if (!IDX.fF[x]) { IDX.fF[x] = []; }
        IDX.fF[x].push(f);
      });
      toks(f.mt).forEach(function (k) { allTok[k] = 1; });
    });
    A(d.tsb).forEach(function (t) {
      if (!t) { return; }
      A(t.fam).forEach(function (x) {
        if (!IDX.tF[x]) { IDX.tF[x] = []; }
        IDX.tF[x].push(t);
      });
      A(t.b).forEach(function (x) {
        if (!IDX.tB[x]) { IDX.tB[x] = []; }
        IDX.tB[x].push(t);
      });
      toks(t.mt).forEach(function (k) { allTok[k] = 1; });
    });
    Object.keys(allTok).forEach(function (k) {
      IDX.tokM[k] = [];
      mkey.forEach(function (m) {
        if (m.k.indexOf(k) > -1) { IDX.tokM[k].push(m.id); }
      });
    });
    function bindTok(store, items) {
      A(items).forEach(function (it) {
        if (!it) { return; }
        toks(it.mt).forEach(function (k) {
          A(IDX.tokM[k]).forEach(function (mid) {
            if (!store[mid]) { store[mid] = []; }
            if (store[mid].indexOf(it) < 0) { store[mid].push(it); }
          });
        });
      });
    }
    bindTok(IDX.mF, d.faults);
    bindTok(IDX.tM, d.tsb);
    IDX.stamp = s;
  }
  function uniq(list) {
    var seen = {}, out = [];
    A(list).forEach(function (x) {
      if (!x || !x.id || seen[x.id]) { return; }
      seen[x.id] = 1;
      out.push(x);
    });
    return out;
  }
  function phaseOk(ph, m) {
    var a = A(ph);
    if (!a.length || a.indexOf("*") > -1) { return true; }
    return a.indexOf(String(m && m.phase)) > -1;
  }
  function pairY(v) {
    var a = A(v);
    var x = N(a[0], 2017), y = N(a[1], 2027);
    return x > y ? [y, x] : [x, y];
  }
  function overlap(a, b) {
    var x = pairY(a), y = pairY(b);
    return x[0] <= y[1] && y[0] <= x[1];
  }
  function SVW() { return W.SV || { critique: { w: 32 }, majeure: { w: 18 }, "modérée": { w: 9 }, mineure: { w: 4 }, info: { w: 0 } }; }

  function megaFaultsFor(e) {
    if (!e || !e.id) { return []; }
    if (W.FC && W.FC[e.id]) { return W.FC[e.id]; }
    ensureIndex();
    var m = modelById(A(e.m)[0]);
    var out = [];
    if (m) {
      out = uniq(A(IDX.fF[e.fam]).concat(A(IDX.mF[m.id]))).filter(function (f) {
        return phaseOk(f.ph, m);
      }).map(function (f) {
        var g = {};
        Object.keys(f).forEach(function (k) { g[k] = f[k]; });
        g.active = overlap(g.y, e.y) && overlap(g.y, m.y);
        return g;
      }).sort(function (a, b) {
        var d = (b.active ? 1 : 0) - (a.active ? 1 : 0);
        var sv = SVW();
        return d || ((sv[b.sev] || { w: 0 }).w - (sv[a.sev] || { w: 0 }).w);
      });
    }
    if (W.FC) { W.FC[e.id] = out; }
    return out;
  }
  function megaTsbFor(e) {
    if (!e || !e.id) { return []; }
    if (W.TC && W.TC[e.id]) { return W.TC[e.id]; }
    ensureIndex();
    var m = modelById(A(e.m)[0]);
    var out = [];
    if (m) {
      out = uniq(A(IDX.tF[e.fam]).concat(A(IDX.tM[m.id])).concat(A(IDX.tB[m.b]))).filter(function (t) {
        return phaseOk(t.ph, m);
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    }
    if (W.TC) { W.TC[e.id] = out; }
    return out;
  }
  function megaEngForFault(f) {
    if (!f) { return []; }
    ensureIndex();
    var out = [];
    A(f.fam).forEach(function (x) { out = out.concat(A(IDX.eF[x])); });
    A(f.mt).forEach(function (t) {
      var k = K(t);
      if (!k) { return; }
      if (k === "*") { out = out.concat(A(db().engines)); return; }
      A(IDX.tokM[k]).forEach(function (mid) { out = out.concat(A(IDX.eM[mid])); });
    });
    return uniq(out);
  }
  function megaEngForTsb(t) {
    if (!t) { return []; }
    ensureIndex();
    var out = [];
    A(t.fam).forEach(function (x) { out = out.concat(A(IDX.eF[x])); });
    A(t.b).forEach(function (b) {
      A(db().engines).forEach(function (e) {
        var m = modelById(A(e.m)[0]);
        if (m && m.b === b) { out.push(e); }
      });
    });
    A(t.mt).forEach(function (x) {
      var k = K(x);
      if (!k) { return; }
      if (k === "*") { out = out.concat(A(db().engines)); return; }
      A(IDX.tokM[k]).forEach(function (mid) { out = out.concat(A(IDX.eM[mid])); });
    });
    return uniq(out);
  }
  function installIndex() {
    W.faultsFor = megaFaultsFor;
    W.tsbFor = megaTsbFor;
    W.engForFault = megaEngForFault;
    W.engForTsb = megaEngForTsb;
    var baseInv = W.invalidate;
    W.invalidate = function () {
      IDX.stamp = "";
      if (typeof baseInv === "function") { baseInv(); }
      else { W.FC = {}; W.TC = {}; W.IVIC = {}; }
    };
  }

  /* ══════════ EXPANSION ══════════ */
  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY));
      if (r && typeof r === "object") {
        ST.runs = N(r.runs, 0);
        ST.added = N(r.added, 0);
        ST.last = N(r.last, 0);
        ST.log = A(r.log);
      }
    } catch (e) {}
  }
  function saveSt() {
    try { localStorage.setItem(KEY, JSON.stringify({ runs: ST.runs, added: ST.added, last: ST.last, log: ST.log.slice(0, 40) })); } catch (e) {}
  }
  function journal(m) {
    ST.log.unshift({ ts: Date.now(), m: m });
    if (ST.log.length > 40) { ST.log.pop(); }
    saveSt();
  }
  function existing() {
    var f = {}, t = {};
    A(db().faults).forEach(function (x) { if (x) { f[K(x.t)] = 1; } });
    A(db().tsb).forEach(function (x) { if (x) { t[K(x.ref)] = 1; } });
    return { f: f, t: t };
  }
  function expand(lot, quiet) {
    var d = db();
    if (!A(d.engines).length) { return { added: 0, tsb: 0, left: 0 }; }
    var tasks = buildTasks();
    var ex = existing();
    var added = 0, tsbAdd = 0, left = 0;
    var now = new Date();
    var dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    for (var i = 0; i < tasks.length; i++) {
      var tk = tasks[i];
      if (ex.f[tk.key]) { continue; }
      if (A(d.faults).length >= MAXF) { left++; continue; }
      if (added >= lot) { left++; continue; }
      var a = tk.a;
      var scope = tk.isFam ? ("famille " + tk.label) : ("gamme " + tk.label);
      d.faults.push({
        id: uid("XF"),
        t: a.t + " — " + tk.label,
        fam: tk.fam, mt: tk.models, ph: ["*"],
        sev: a.sev, freq: a.freq,
        y: tk.y, km: [a.k0, a.k1],
        sym: a.sym,
        cause: a.cause + " Périmètre : " + scope + ", motorisations et puissances corrélées.",
        fix: a.fix,
        cost: a.cost,
        status: a.recall ? "Campagne constructeur" : (a.sev === "info" ? "Note technique" : "Veille technique"),
        dom: a.dom
      });
      ex.f[tk.key] = 1;
      added++;
      if ((a.recall || a.sev === "critique" || a.sev === "majeure") && A(d.tsb).length < MAXT) {
        var ref = (a.recall ? "RPL-MEGA-" : "TSB-MEGA-") + SL(tk.label).toUpperCase().slice(0, 14) + "-" + String(a.i + 1).padStart(3, "0");
        if (!ex.t[K(ref)]) {
          d.tsb.push({
            id: uid("XT"),
            ref: ref,
            b: tk.brands, fam: tk.fam, mt: tk.models, ph: ["*"],
            t: (a.recall ? "Campagne " : "Bulletin ") + a.t + " — " + tk.label,
            date: dateStr,
            cat: a.recall ? "Rappel" : a.dom,
            sev: a.sev,
            sum: a.cause,
            act: a.fix,
            dom: a.dom
          });
          ex.t[K(ref)] = 1;
          tsbAdd++;
        }
      }
    }
    if (added || tsbAdd) {
      if (typeof W.normalize === "function") { W.normalize(d); }
      if (typeof W.recompute === "function") { W.recompute(); }
      ensureIndex();
      if (typeof W.isAdmin === "function" && W.isAdmin()) {
        if (typeof W.audit === "function") { W.audit("mega", "Expansion méga-pannes : +" + added + " fiches, +" + tsbAdd + " bulletins"); }
        if (typeof W.saveNow === "function") { W.saveNow(true); }
        if (W.REG && W.REG.live && typeof W.publish === "function") { W.publish(true); }
      }
      ST.runs++;
      ST.added += added;
      ST.last = Date.now();
      journal("+" + added + " pannes, +" + tsbAdd + " bulletins/campagnes");
      if (typeof W.updateMeta === "function") { W.updateMeta(); }
      if (!quiet) {
        say("ok", "Méga-base enrichie", "+" + F(added) + " pannes · +" + F(tsbAdd) + " campagnes / TSB");
        snd("imp");
      }
    }
    return { added: added, tsb: tsbAdd, left: left, total: tasks.length };
  }

  /* ══════════ STATISTIQUES ══════════ */
  function stats() {
    var d = db();
    var doms = {}, fams = {}, brands = {}, covered = 0;
    A(d.faults).forEach(function (f) {
      if (!f) { return; }
      doms[f.dom] = (doms[f.dom] || 0) + 1;
      A(f.fam).forEach(function (x) { fams[x] = 1; });
    });
    A(d.tsb).forEach(function (t) {
      if (!t) { return; }
      doms[t.dom] = (doms[t.dom] || 0) + 1;
      A(t.b).forEach(function (x) { brands[x] = 1; });
    });
    var eng = A(d.engines);
    ensureIndex();
    eng.forEach(function (e) {
      var m = modelById(A(e.m)[0]);
      if (!m) { return; }
      if (A(IDX.fF[e.fam]).length || A(IDX.mF[m.id]).length) { covered++; }
    });
    var rc = A(d.tsb).filter(function (t) { return t && (t.cat === "Rappel" || /^RPL-/.test(String(t.ref))); }).length;
    var tasks = buildTasks();
    var ex = existing();
    var done = 0;
    tasks.forEach(function (t) { if (ex.f[t.key]) { done++; } });
    return {
      f: A(d.faults).length, t: A(d.tsb).length, rc: rc,
      dom: Object.keys(doms).length, doms: doms,
      fams: Object.keys(fams).length, brands: Object.keys(brands).length,
      cov: eng.length ? Math.round(covered / eng.length * 100) : 0,
      tasks: tasks.length, done: done,
      pct: tasks.length ? Math.round(done / tasks.length * 100) : 0
    };
  }

  /* ══════════ PANNEAU DE PILOTAGE ══════════ */
  function sevTag(s) {
    var v = String(s || "modérée");
    return "<span class='sev " + (v === "modérée" ? "mode" : E(v)) + "'>" + E(v) + "</span>";
  }
  function panelBody() {
    var st = stats();
    var d = db();
    var h = "<div class='kpis' style='grid-template-columns:repeat(4,1fr)'>";
    [["PANNES DÉTAILLÉES", st.f, "#E45CFF"], ["CAMPAGNES RAPPEL", st.rc, "#FFD60A"], ["TSB / BULLETINS", st.t - st.rc, "#25D4EE"], ["DOMAINES", st.dom, "#43E08B"]].forEach(function (k) {
      h += "<div class='card kpi' style='--kc:" + k[2] + "'><b>" + F(k[1]) + "</b><span>" + k[0] + "</span></div>";
    });
    h += "</div>";
    h += "<div class='card panel' style='margin-bottom:12px'><h3>" + IC("spark") + "Expansion progressive<span class='chip'>" + st.pct + " %</span></h3>";
    h += "<div class='brow' style='grid-template-columns:1fr 60px'><div class='bt'><i style='width:" + st.pct + "%;--bc:#E45CFF'></i></div><b>" + F(st.done) + "/" + F(st.tasks) + "</b></div>";
    h += "<div class='sg' style='margin-top:10px'>";
    [["Familles moteur couvertes", st.fams], ["Marques couvertes", st.brands], ["Motorisations avec panne", st.cov + " %"], ["Plafond pannes", F(MAXF)], ["Lot par cycle", F(LOT)], ["Cumul ajouté", F(ST.added)], ["Cycles", F(ST.runs)], ["Dernier cycle", ST.last ? new Date(ST.last).toLocaleTimeString("fr-FR") : "—"]].forEach(function (r) {
      h += "<div class='sp'><span>" + E(r[0]) + "</span><b class='hl'>" + E(r[1]) + "</b></div>";
    });
    h += "</div>";
    h += "<p class='dim mono' style='font-size:10px;margin-top:9px'>UN LOT EST AJOUTÉ À CHAQUE OUVERTURE ET APRÈS CHAQUE MISE À JOUR MANUELLE (IMPORT, MÉGA-BASE, BALAYAGE, RÉPARATION, RESTAURATION).</p></div>";
    var domKeys = Object.keys(st.doms).sort();
    h += "<div class='fr f3' style='margin-bottom:10px'>";
    h += "<div><label class='lb'>Domaine</label><select class='sel' data-megaf='dom'><option value=''>Tous (" + domKeys.length + ")</option>";
    domKeys.forEach(function (k) {
      h += "<option value='" + E(k) + "'" + (ST.dom === k ? " selected" : "") + ">" + E(k) + " (" + st.doms[k] + ")</option>";
    });
    h += "</select></div>";
    h += "<div><label class='lb'>Sévérité</label><select class='sel' data-megaf='sev'><option value=''>Toutes</option>";
    ["critique", "majeure", "modérée", "mineure", "info"].forEach(function (s) {
      h += "<option value='" + s + "'" + (ST.sev === s ? " selected" : "") + ">" + s + "</option>";
    });
    h += "</select></div>";
    h += "<div><label class='lb'>Recherche</label><input class='inp' type='search' data-megaq='1' value='" + E(ST.qq) + "' placeholder='Titre, cause, action, modèle…'></div></div>";
    var qk = K(ST.qq);
    var list = A(d.faults).filter(function (f) {
      if (!f) { return false; }
      if (ST.dom && f.dom !== ST.dom) { return false; }
      if (ST.sev && f.sev !== ST.sev) { return false; }
      if (qk && K([f.t, f.cause, f.fix, A(f.sym).join(" "), A(f.mt).join(" "), f.dom].join(" ")).indexOf(qk) < 0) { return false; }
      return true;
    }).sort(function (a, b) {
      var sv = SVW();
      return ((sv[b.sev] || { w: 0 }).w - (sv[a.sev] || { w: 0 }).w);
    });
    h += "<div class='bar'><span class='cnt'>" + F(list.length) + " fiche(s) correspondante(s)</span></div>";
    h += "<div style='max-height:44vh;overflow:auto'>";
    if (!list.length) {
      h += "<div class='empty'>Aucune fiche pour ces critères.</div>";
    } else {
      list.slice(0, 60).forEach(function (f) {
        var sv = SVW();
        var c = (sv[f.sev] || { c: "#FFAF2E" }).c;
        h += "<div class='fcard' style='--sc:" + c + "'><div class='fh'><b>" + E(f.t) + "</b>" + sevTag(f.sev) + "</div>";
        h += "<div class='tags'><span class='tag'>" + E(f.dom) + "</span><span class='tag'>" + A(f.y).join("-") + "</span><span class='tag'>" + F(A(f.km)[0]) + "–" + F(A(f.km)[1]) + " km</span><span class='tag'>fréq. " + E(f.freq) + "</span><span class='tag' style='color:#25D4EE'>" + E(f.status) + "</span></div>";
        h += "<div class='tags'>" + A(f.sym).map(function (s) { return "<span class='tag'>" + E(s) + "</span>"; }).join("") + "</div>";
        h += "<p><b>Cause :</b> " + E(f.cause) + "</p><p><b>Action :</b> " + E(f.fix) + "</p>";
        h += "<div class='cost'>" + (A(f.cost)[1] === 0 ? "Prise en charge / campagne" : F(A(f.cost)[0]) + " – " + F(A(f.cost)[1]) + " €") + "</div></div>";
      });
      if (list.length > 60) { h += "<p class='dim mono' style='font-size:10px'>+ " + F(list.length - 60) + " autres fiches — affinez les filtres.</p>"; }
    }
    h += "</div>";
    h += "<div class='card panel' style='margin-top:12px'><h3>" + IC("clock") + "Journal d'expansion</h3><div class='journal'>";
    if (!ST.log.length) { h += "<p class='dim'>Aucun cycle enregistré.</p>"; }
    ST.log.slice(0, 12).forEach(function (l) {
      h += "<div class='jr'><time>" + new Date(N(l.ts, Date.now())).toLocaleTimeString("fr-FR") + "</time><span class='jt'>MEGA</span><span>" + E(l.m) + "</span></div>";
    });
    h += "</div></div>";
    return h;
  }
  function openPanel() {
    var h = "<div class='mh'>" + IC("alert", "color:#E45CFF") + "<h3>MÉGA-BASE PANNES · CAMPAGNES · TSB</h3>";
    h += "<button class='tb' data-act='mclose'>" + IC("x") + "</button></div>";
    h += "<div class='mb2' id='megaBody'>" + panelBody() + "</div>";
    h += "<div class='mf'>";
    h += "<button class='btn sm ghost' data-mega='reindex'>" + IC("reset") + "Réindexer</button>";
    h += "<button class='btn sm ghost' data-mega='export'>" + IC("dl") + "Exporter</button>";
    h += "<button class='btn sm amb' data-mega='full'>" + IC("spark") + "Cycle complet</button>";
    h += "<button class='btn sm pri' data-mega='expand'>" + IC("plus") + "Expansion +" + LOT + "</button>";
    h += "<button class='btn sm' data-act='mclose'>Fermer</button></div>";
    if (typeof W.openModal === "function") { W.openModal(h, "wide"); }
  }
  function refreshPanel() {
    var b = q("#megaBody");
    if (b) { b.innerHTML = panelBody(); }
  }
  function injectBtn() {
    var top = q("#top");
    if (!top || q("#megab")) { return; }
    var b = D.createElement("button");
    b.className = "tb";
    b.id = "megab";
    b.type = "button";
    b.title = "Méga-base pannes · campagnes · TSB";
    b.setAttribute("aria-label", "Méga-base pannes, campagnes et TSB");
    b.style.color = "#E45CFF";
    b.style.borderColor = "rgba(228,92,255,.45)";
    b.innerHTML = IC("alert");
    b.addEventListener("click", function () { openPanel(); });
    var ref = q("#repairb") || q("#diagb");
    if (ref && ref.parentNode === top) { top.insertBefore(b, ref); } else { top.appendChild(b); }
  }

  /* ══════════ HOOKS : auto-amélioration à chaque mise à jour manuelle ══════════ */
  var busy = false;
  function schedule(reason) {
    if (busy) { return; }
    busy = true;
    setTimeout(function () {
      busy = false;
      safeRun(function () {
        var r = expand(LOT, true);
        if (r.added) {
          say("info", "Auto-amélioration méga-pannes", reason + " : +" + F(r.added) + " fiches");
          refreshPanel();
          if (typeof W.runTests === "function") { W.runTests(); }
        }
      });
    }, 700);
  }
  function safeRun(f) { try { f(); } catch (e) { try { W.__MD_ERR.push({ msg: "mega: " + (e && e.message ? e.message : e), src: "faults.js", line: 0, col: 0 }); } catch (x) {} } }
  function installHooks() {
    var m = W.mutate;
    if (typeof m === "function" && !m.__mega) {
      var wm = function (t, msg) {
        var r = m.apply(this, arguments);
        schedule("mise à jour manuelle");
        return r;
      };
      wm.__mega = 1;
      W.mutate = wm;
      if (W.MD_API) { W.MD_API.mutate = wm; }
    }
    var rp = W.repairAll;
    if (typeof rp === "function" && !rp.__mega) {
      var wr = function () {
        var r = rp.apply(this, arguments);
        schedule("réparation");
        return r;
      };
      wr.__mega = 1;
      W.repairAll = wr;
      if (W.MD_API) { W.MD_API.repair = wr; }
    }
    if (W.AUTO && typeof W.AUTO.sweep === "function" && !W.AUTO.sweep.__mega) {
      var sw = W.AUTO.sweep;
      var ws = function () {
        var r = sw.apply(this, arguments);
        schedule("balayage auto");
        return r;
      };
      ws.__mega = 1;
      W.AUTO.sweep = ws;
    }
    var rt = W.runTests;
    if (typeof rt === "function" && !rt.__mega) {
      var wrt = function () {
        var out = rt.apply(this, arguments);
        safeRun(function () {
          var st = stats();
          var T = A(W.TESTS);
          function add(n, ok, info, soft) { T.push({ n: n, ok: !!ok, info: String(info == null ? "" : info), soft: !!soft }); }
          add("Index méga-pannes actif", IDX.stamp !== "", "corrélation O(1) installée");
          add("Méga-pannes ≥ 1000", st.f >= 1000, F(st.f) + " fiches détaillées", true);
          add("Campagnes de rappel ≥ 100", st.rc >= 100, F(st.rc) + " campagnes", true);
          add("Domaines techniques ≥ 24", st.dom >= 24, st.dom + " domaines");
          add("Familles moteur avec panne", st.fams >= 60, st.fams + " familles couvertes");
          add("Marques avec bulletin", st.brands >= 50, st.brands + " marques");
          add("Motorisations couvertes ≥ 95 %", st.cov >= 95, st.cov + " % des motorisations");
          add("Progression méga-base", st.pct + " %", F(st.done) + "/" + F(st.tasks) + " combinaisons", true);
          add("Plafond base respecté", st.f <= MAXF && st.t <= MAXT, F(st.f) + "/" + F(MAXF) + " pannes");
          W.TESTS = T;
          if (typeof W.updateMeta === "function") { W.updateMeta(); }
          var tl = q("#testList");
          if (tl && typeof W.testListHTML === "function") { tl.innerHTML = W.testListHTML(); }
        });
        return out;
      };
      wrt.__mega = 1;
      W.runTests = wrt;
    }
  }

  /* ══════════ ÉVÉNEMENTS PANNEAU ══════════ */
  D.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-mega]") : null;
    if (!el) { return; }
    var a = el.getAttribute("data-mega");
    if (a === "expand") {
      var r = expand(LOT, false);
      if (!r.added) { say("info", "Méga-base à jour", "Toutes les combinaisons disponibles sont déjà intégrées."); }
      refreshPanel();
      if (typeof W.render === "function" && W.MODE) { W.render(); }
      if (typeof W.runTests === "function") { W.runTests(); }
      return;
    }
    if (a === "full") {
      var r2 = expand(MAXF, false);
      say(r2.added ? "ok" : "info", "Cycle complet terminé", r2.added ? "+" + F(r2.added) + " pannes, +" + F(r2.tsb) + " bulletins" : "Base déjà complète.");
      refreshPanel();
      if (typeof W.render === "function" && W.MODE) { W.render(); }
      if (typeof W.runTests === "function") { W.runTests(); }
      return;
    }
    if (a === "reindex") {
      IDX.stamp = "";
      if (typeof W.invalidate === "function") { W.invalidate(); }
      ensureIndex();
      if (typeof W.recompute === "function") { W.recompute(); }
      say("ok", "Index reconstruit", "Corrélations pannes / TSB / motorisations recalculées.");
      snd("ok");
      refreshPanel();
      return;
    }
    if (a === "export") {
      var d = db();
      if (typeof W.download === "function") {
        W.download("mecadata_mega_pannes.json", JSON.stringify({ faults: d.faults, tsb: d.tsb, stats: stats() }, null, 2));
        say("ok", "Méga-base exportée", F(A(d.faults).length) + " pannes · " + F(A(d.tsb).length) + " bulletins");
      }
      return;
    }
  });
  D.addEventListener("change", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute) { return; }
    var k = t.getAttribute("data-megaf");
    if (!k) { return; }
    if (k === "dom") { ST.dom = t.value; }
    if (k === "sev") { ST.sev = t.value; }
    refreshPanel();
  });
  var debQ = null;
  D.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute || !t.getAttribute("data-megaq")) { return; }
    ST.qq = t.value;
    clearTimeout(debQ);
    debQ = setTimeout(function () {
      refreshPanel();
      var i = q("[data-megaq]");
      if (i) {
        i.focus();
        try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {}
      }
    }, 200);
  });

  /* ══════════ DÉMARRAGE ══════════ */
  function boot() {
    if (!W.MD_API || !W.DB || !A(W.DB.engines).length) { return false; }
    load();
    installIndex();
    installHooks();
    injectBtn();
    ensureIndex();
    setTimeout(function () {
      safeRun(function () {
        var r = expand(LOT, true);
        if (r.added) {
          say("info", "Méga-base pannes enrichie", "+" + F(r.added) + " pannes · +" + F(r.tsb) + " campagnes / TSB");
          if (typeof W.render === "function" && W.MODE) { W.render(); }
        }
        if (typeof W.runTests === "function") { W.runTests(); }
        if (typeof W.updateMeta === "function") { W.updateMeta(); }
      });
    }, 1400);
    W.MD_MEGA = {
      expand: expand, stats: stats, panel: openPanel,
      catalog: ARCH.length, tasks: function () { return buildTasks().length; },
      reindex: function () { IDX.stamp = ""; ensureIndex(); }
    };
    return true;
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (boot() || tries > 120) { clearInterval(iv); }
  }, 250);
  W.addEventListener("load", function () { setTimeout(boot, 200); });
})();
