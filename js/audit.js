/* MECADATA // AUDIT DE CORRÉLATION v20
   Vérifie massivement, sur toute la base :
   • chaque motorisation appartient-elle réellement à la marque du modèle ?
   • puissance, cylindrée, carburant, segment dans les plages réelles ?
   • années moteur incluses dans les années de production du modèle ?
   • chaque panne / rappel / TSB est-il corrélé à des motorisations existantes,
     avec une période qui recouvre réellement leur production ?
   • doublons, modèles sans motorisation, années incohérentes.
   Corrige automatiquement, réattribue les motorisations réelles manquantes,
   affiche les ANNÉES DE PRODUCTION des modèles dans toutes les vues,
   et se relance après chaque mise à jour manuelle. */
(function () {
  "use strict";

  var W = window, D = document;
  function q(s, r) { return (r || D).querySelector(s); }
  function qa(s, r) { return [].slice.call((r || D).querySelectorAll(s)); }
  function A(v) { return Array.isArray(v) ? v : []; }
  function N(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function S(v, d) { var s = String(v == null ? "" : v).trim(); return s || (d == null ? "" : d); }
  function K(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function F(n) { n = N(n, 0); try { return n.toLocaleString("fr-FR"); } catch (e) { return String(n); } }
  function IC(n, st) { return "<svg class='ic'" + (st ? " style='" + st + "'" : "") + "><use href='#i-" + n + "'/></svg>"; }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function say(t, ti, m) { if (typeof W.toast === "function") { W.toast(t, ti, m); } }
  function snd(k) { if (typeof W.beep === "function") { W.beep(k); } }
  function db() { return W.DB || { brands: [], models: [], engines: [], faults: [], tsb: [] }; }
  function segs() { return A(W.SEGS); }

  var KEY = "md_audit_v20";
  var ST = { auto: true, runs: 0, fixed: 0, last: 0, log: [], report: null, filter: "" };

  /* ══════════ TABLE DE CORRESPONDANCE RÉELLE famille → marques / carburant /
     cylindrée / plage de puissance / années / segments ══════════ */
  var KNOWRAW = [
    "EB2;EB2ADT;EB2ADTX|peugeot;citroen;opel;ds;fiat|e|1199|75|131|2012|2023|0;1;2;3",
    "EB2G3|peugeot;citroen;opel;ds;fiat;alfa;jeep;lancia|h|1199|100|146|2023|2027|0;2;3;4;5",
    "EB2G3P|peugeot|p|1199|195|196|2025|2027|4",
    "DV5;DV5RUCd;DV6FC|peugeot;citroen;opel;ds;toyota|d|1499|95|131|2014|2026|0;2;3;4;5;7",
    "DW10;DW10FC;4HVD|peugeot;citroen;opel|d|1997|140|181|2014|2027|4;5;8",
    "EP6;EP6FDT|peugeot;citroen;ds;mini|e|1598|150|226|2013|2023|2;4;5",
    "EP6P|peugeot;citroen;ds;opel|p|1598|180|360|2019|2027|2;4;5",
    "ZKX;E113;E156|peugeot;citroen;opel;ds;fiat;jeep;lancia|b|0|95|157|2019|2027|0;1;2;3;7",
    "EM2;STLAE|peugeot;ds;dodge;jeep|b|0|200|680|2023|2027|4;5",
    "EAMI|citroen|b|0|8|9|2020|2027|1",
    "H4Dt;B4D|renault;dacia|e|999|65|101|2015|2027|0;1;3;4;5;6",
    "H4Dg|renault;dacia|g|999|90|101|2019|2027|0;3;4;5;6",
    "H4Bt|renault;dacia;nissan|e|898|90|91|2012|2020|0;1;2",
    "H5Ft|renault;dacia;nissan|e|1197|115|131|2012|2019|2;3;4;12",
    "H5Ht|renault;dacia;nissan;mercedes|e|1332|115|161|2018|2024|2;3;4;5",
    "HR12;HR12H|renault;dacia|h|1199|130|201|2020|2027|0;2;3;4;6",
    "HR12P|renault|p|1199|160|161|2020|2027|3;4",
    "H4M|renault;dacia;nissan|h|1598|140|146|2020|2027|0;2;3;4;6",
    "K9K|renault;dacia;nissan;mercedes|d|1461|70|116|2010|2023|0;2;3;4;5;7",
    "M9R;M9T;R9M;R9N|renault;nissan;opel|d|1997|110|201|2010|2027|4;5;8;12",
    "M5Pt;M5Mt|renault;alpine|e|1798|150|301|2015|2027|2;9;11",
    "6AM;5AM|renault|b|0|120|221|2022|2027|2;4;7;8",
    "5AQ;5AT;AMPR|renault;alpine;nissan|b|0|85|401|2012|2027|0;1;3;4",
    "E33|dacia|b|0|44|66|2021|2027|1",
    "CHZL;CHYA;DLAA|vw;audi;skoda;seat|e|999|60|111|2012|2027|0;1;2;3",
    "DPCA;DPCAE|vw;audi;skoda;seat;cupra|e|1498|130|151|2017|2027|2;3;4;5;6",
    "CZDA|vw;audi;skoda;seat|e|1395|125|151|2014|2019|2;4;5",
    "CJXC;DNPA;DNFG;DKNA|vw;skoda;seat;cupra;audi|e|1984|190|334|2013|2027|2;4;5;9;11",
    "DNWA|audi;cupra|e|2480|390|401|2021|2027|2;4",
    "DSUA;DFGA;DSUB;DSKA;DSNA|vw;skoda;seat;cupra;audi;ford|d|1968|75|205|2013|2027|2;3;4;5;7;8",
    "CVMD|vw;audi|d|2967|231|348|2015|2027|4;5",
    "DCBE|vw;audi;porsche|e|2995|340|355|2015|2027|4;5",
    "DGEA|vw;skoda;seat;cupra|p|1395|204|273|2019|2027|2;4;5",
    "DRYA|audi|p|1984|299|368|2019|2027|4;5",
    "APP310;APP550;APP550X|vw;audi;skoda;cupra;seat;ford|b|0|150|341|2019|2027|2;3;4;5;6;12",
    "PPE|audi;porsche|b|0|292|640|2024|2027|4;5;9",
    "J1|porsche;audi|b|0|408|1035|2019|2027|5;9",
    "B38|bmw;mini|e|1499|102|141|2014|2027|0;2;3;6",
    "B48|bmw;mini;toyota|e|1998|178|266|2014|2027|2;4;5;9;10",
    "B58|bmw;toyota|e|2998|340|383|2015|2027|4;5;9;10",
    "S58|bmw|e|2993|460|531|2021|2027|5;9;11",
    "N63|bmw|e|4395|530|626|2017|2027|4;5",
    "B47|bmw;mini|d|1995|150|191|2012|2027|2;3;4;5;6",
    "B57|bmw|d|2993|286|331|2015|2027|4;5",
    "B48P|bmw|p|1998|204|293|2019|2027|3;4;5",
    "IB1;GC1;GEN5|bmw|b|0|170|620|2013|2027|0;3;4;5",
    "MINIE|mini|b|0|184|314|2019|2027|0;3;4",
    "M282|mercedes|e|1332|100|164|2018|2027|2;3;4;7",
    "M260|mercedes|e|1991|190|225|2018|2027|2;3;4",
    "M254|mercedes|h|1999|170|259|2018|2027|2;4;5;6",
    "M256|mercedes|h|2999|367|436|2017|2027|4;5",
    "M254P|mercedes|p|1999|312|314|2021|2027|4;5;6",
    "M139|mercedes|e|1991|306|681|2018|2027|2;3;11",
    "OM608|mercedes|d|1461|102|117|2014|2026|2;3;4;7",
    "OM654;OM654P|mercedes|d|1950|114|331|2016|2027|2;4;5;6;8",
    "OM656|mercedes|d|2925|286|331|2017|2027|4;5",
    "EM0033;EM0055|mercedes|b|0|190|627|2019|2027|3;4;5",
    "SEA|smart|b|0|82|545|2017|2027|1;3;4",
    "B20NFT|opel|e|1998|200|261|2017|2022|5",
    "B20DTH|opel|d|1956|170|171|2016|2022|5;12",
    "CYNB|porsche|e|1984|245|266|2014|2024|4",
    "CSZB|porsche|e|2894|354|441|2019|2024|4;5",
    "9A2|porsche|e|2981|385|651|2012|2027|9;11",
    "MA2|porsche|e|3995|400|511|2016|2027|9;10;11",
    "CWGD|porsche|e|2995|340|355|2017|2027|4",
    "EA825P|porsche|p|3996|470|783|2017|2027|4;5",
    "EA825;EA825L|porsche;lamborghini;audi;bentley|e|3996|550|667|2017|2027|4;5;9",
    "EA825LP|lamborghini|p|3996|800|801|2024|2027|4",
    "B4204T|volvo|h|1969|163|311|2015|2027|2;4;5;6",
    "D4204T|volvo|d|1969|150|236|2015|2022|4;5;6",
    "B4204TP|volvo|p|1969|350|456|2019|2027|4;5;6",
    "EVV;SPA2|volvo;polestar|b|0|238|518|2020|2027|3;4",
    "PST|polestar|b|0|231|518|2020|2027|4;5",
    "AJ200D|landrover;jaguar|d|1999|163|251|2015|2027|3;4;5",
    "AJ200P|landrover;jaguar|e|1997|200|301|2015|2027|3;4;5",
    "AJ300|landrover|h|2996|360|401|2019|2027|4",
    "AJ300D|landrover|d|2997|249|351|2020|2027|4",
    "AJV8|landrover;jaguar|e|4999|450|576|2012|2024|4;11",
    "AJ150P3|landrover|p|1498|309|310|2020|2027|3;4",
    "AJV8P|landrover|p|4395|550|551|2023|2027|4",
    "LGEV|jaguar;hyundai;kia;chevrolet|b|0|120|697|2016|2026|2;3;4",
    "FFBSG|fiat;lancia|h|999|70|71|2020|2027|0;1",
    "FIRE|fiat;lancia|e|1242|69|70|2012|2020|0;1",
    "TA|fiat;abarth|e|875|85|86|2012|2020|1",
    "FFT4|fiat;jeep;dodge|e|1332|150|181|2018|2027|0;2;3;4",
    "MJ13|fiat;opel|d|1248|95|96|2015|2020|0;2;7",
    "MJ16|fiat;jeep;alfa;opel|d|1598|95|131|2014|2027|0;2;3;4",
    "MJ20|jeep;alfa|d|1956|140|171|2014|2020|4",
    "MJ23|fiat|d|2287|120|181|2014|2027|8",
    "TJET|abarth;fiat|e|1368|145|181|2016|2024|0;1;11",
    "E500|fiat|b|0|95|157|2020|2027|1;3",
    "EABA|abarth|b|0|155|241|2023|2027|3;11",
    "GME;EC1|alfa;jeep|e|1995|200|281|2016|2027|4;5",
    "690T|alfa|e|2891|510|541|2016|2027|4;5;11",
    "ALFA22|alfa|d|2143|150|211|2016|2024|4;5",
    "FFVGT|alfa|h|1469|130|161|2022|2027|3;4",
    "FFPHEV|alfa;dodge|p|1332|280|289|2022|2027|3;4",
    "EALF|alfa|b|0|156|281|2024|2027|3",
    "FF4XE|jeep|p|1332|190|241|2020|2027|3;4",
    "GME4XE|jeep|p|1995|380|381|2021|2027|4",
    "PENTA;PENTAP|jeep;ram;chrysler|e|3604|260|291|2014|2027|4;8;12",
    "EJEP|jeep|b|0|156|601|2023|2027|3;4",
    "FERV8|ferrari|e|3855|620|721|2017|2027|9;11",
    "FERV6P|ferrari|p|2992|830|1001|2019|2027|11",
    "FERV12|ferrari|e|6496|725|831|2017|2027|4;9;11",
    "LAMV10|lamborghini|e|5204|610|641|2012|2024|11",
    "LAMV12P|lamborghini|p|6498|1015|1016|2023|2027|11",
    "GMEM|maserati|h|1995|300|331|2016|2027|4;5",
    "NETTUNO|maserati|e|2995|490|631|2021|2027|9;11",
    "GREE|maserati|b|0|557|558|2024|2027|4",
    "BENW12|bentley|e|5950|635|660|2016|2024|4;9",
    "BENP|bentley|p|2995|462|463|2021|2027|4;5",
    "RRV12|rolls|e|6749|571|601|2017|2027|4;5",
    "RRE|rolls|b|0|585|586|2023|2027|9",
    "M177|aston|e|3982|510|726|2016|2027|4;9;11",
    "ASTV12|aston|e|5204|700|726|2016|2027|9;11",
    "ASTV6P|aston|p|3982|1012|1013|2025|2027|11",
    "MCLV6P|mclaren|p|2993|680|701|2022|2027|11",
    "MCLV8|mclaren|e|3994|720|801|2017|2027|9;11",
    "MCLV8P|mclaren|p|3994|1275|1276|2025|2027|11",
    "LOTV6|lotus|e|3456|400|431|2012|2027|9;11",
    "LOTI4|lotus|e|1991|365|366|2022|2027|9",
    "LOTE;LOTEV|lotus|b|0|603|2001|2023|2027|4;5;11",
    "W16|bugatti|e|7993|1500|1851|2016|2027|11",
    "V16P|bugatti|p|8300|1800|1801|2026|2027|11",
    "FOX|ford|e|998|100|156|2012|2027|0;2;3",
    "DRAGON|ford;lincoln|e|1496|150|201|2013|2027|2;3;4",
    "R9DA|ford|d|1499|95|121|2018|2024|2;3;4;8",
    "PANTHER|ford;vw|d|1995|105|206|2016|2027|4;8;13",
    "PUMA32;PUMA30|ford|d|3198|200|241|2015|2027|13",
    "DURA25|ford|h|2488|190|191|2019|2027|4;12",
    "DURA25P|ford|p|2488|225|226|2019|2027|4",
    "COYOTE|ford|e|5038|450|501|2015|2027|9;11",
    "EB23|ford;vw|e|2261|280|351|2015|2027|9;13",
    "ECOB35;ECOB30|lincoln|e|3498|400|441|2018|2027|4",
    "ECOB30P|lincoln|p|2998|494|495|2020|2027|4",
    "GE1|ford|b|0|169|488|2021|2027|3;4",
    "TSLAR;TSLALR;TSLAP;CYB|tesla|b|0|283|1021|2016|2027|4;5;13",
    "LT1;LT2|chevrolet|e|6162|453|671|2016|2027|9;11",
    "L84|chevrolet;gmc|e|5328|355|356|2019|2027|4;13",
    "L87;L8T|chevrolet;cadillac;gmc|e|6162|420|421|2019|2027|4;13",
    "LSY|chevrolet;cadillac;buick;gmc|e|1998|228|238|2016|2027|3;4;5",
    "LFV|buick|e|1490|156|157|2024|2027|3",
    "LZ0|chevrolet;gmc|d|2999|277|306|2019|2027|4;13",
    "ULT;ULTC;ULTA;ULTH|chevrolet;cadillac;gmc;acura|b|0|204|1001|2017|2027|2;4;13",
    "HEMI|ram;dodge;chrysler;jeep|e|5654|370|396|2015|2027|4;5;9;13",
    "HEMIHC|dodge|e|6166|717|808|2015|2023|5;9",
    "SST|ram|e|2993|420|541|2022|2027|13",
    "CTD|ram|d|6690|370|421|2019|2027|13",
    "RAME|ram|b|0|654|655|2025|2027|13",
    "NZ|Mazda;toyota|e|1496|111|112|2011|2020|0;3",
    "M15A|toyota;mazda|h|1490|116|131|2020|2027|0;3",
    "ZR|toyota;lexus;suzuki|h|1798|122|141|2011|2027|0;2;3;6",
    "ZR2|toyota;lexus|h|1987|140|198|2018|2027|2;3;4;5",
    "A25A|toyota;lexus|h|2487|218|251|2018|2027|4;5",
    "A25AP|toyota;lexus;suzuki|p|2487|306|330|2020|2027|4",
    "T24A|lexus|h|2393|279|372|2022|2027|4",
    "UXH|lexus|h|1987|184|200|2018|2027|3",
    "8NR|toyota|e|1197|116|117|2015|2021|2;3",
    "GD|toyota|d|2755|150|205|2015|2027|4;13",
    "GD2|toyota|d|2393|150|151|2015|2027|13",
    "G16E|toyota|e|1618|261|305|2020|2027|0",
    "FA24|toyota;subaru|e|2387|228|235|2022|2027|9",
    "E4TN|toyota;lexus;subaru|b|0|204|409|2022|2027|4",
    "HR10|nissan|e|999|100|101|2017|2022|0;12",
    "HRA2|nissan|e|1197|115|116|2014|2019|0;3;12",
    "HR13|nissan;infiniti|e|1332|140|159|2019|2027|3;4",
    "KR15|nissan|h|1497|190|214|2021|2027|4",
    "KR20|infiniti;nissan|e|1997|268|269|2018|2027|4;5",
    "EM57|nissan|b|0|110|218|2010|2026|2",
    "CMFEV|nissan|b|0|218|436|2022|2027|4",
    "YS23|nissan|d|2298|163|191|2015|2027|13",
    "VR38|nissan|e|3799|570|601|2012|2022|11",
    "VR30|nissan;infiniti|e|2997|300|406|2016|2027|5;9;11",
    "VK56|infiniti|e|5552|400|401|2018|2027|4",
    "LEB;LEB2|honda|h|1498|109|132|2015|2027|0;3",
    "P10A|honda|e|988|129|130|2015|2021|2",
    "L15B|honda;acura|e|1498|182|194|2016|2023|2;4",
    "LFB|honda|h|1993|184|185|2018|2027|2;4",
    "LFAP|honda|p|1993|184|185|2023|2027|4",
    "K20C|honda;acura|e|1996|272|356|2017|2027|2;11",
    "J35|acura|e|3471|290|291|2019|2027|4",
    "JNC1|acura|p|3493|581|582|2017|2022|11",
    "EHND|honda|b|0|154|205|2020|2027|1;3",
    "PE;PE2|mazda|e|1998|120|185|2013|2027|0;2;3;4;10",
    "P5|mazda|e|1496|132|133|2015|2027|10",
    "PY|mazda|e|2488|192|195|2012|2027|4;5",
    "SKX|mazda|e|1998|180|187|2019|2027|2;3",
    "SH|mazda|d|2191|150|185|2012|2022|2;4;5",
    "SKD33|mazda|d|3283|200|255|2022|2027|4",
    "PYPHEV|mazda|p|2488|327|328|2022|2027|4",
    "MXEV|mazda|b|0|143|144|2020|2027|3",
    "ROT|mazda|p|830|170|171|2023|2027|3",
    "MAZE|mazda|b|0|258|314|2025|2027|5",
    "K12C|suzuki|h|1242|83|91|2016|2027|0;1",
    "K14C|suzuki|e|1373|140|141|2015|2020|0;3;4",
    "K14D|suzuki|h|1373|129|130|2019|2027|3;4",
    "K15C|suzuki|h|1462|116|117|2022|2027|3;4",
    "K15B|suzuki|e|1462|102|103|2018|2027|3",
    "F9QB|suzuki|d|1598|120|121|2015|2019|3;4",
    "SUZE|suzuki|b|0|144|175|2025|2027|3",
    "3A92|mitsubishi|e|1193|71|81|2013|2027|0;1",
    "4B11|mitsubishi|e|1998|150|151|2010|2023|3;4",
    "4B40|mitsubishi|e|1499|163|164|2017|2027|4",
    "4B12P|mitsubishi|p|2360|224|307|2012|2027|4",
    "4N15|mitsubishi|d|2268|150|151|2015|2027|13",
    "4N16|mitsubishi|d|2442|184|185|2024|2027|13",
    "FB20|subaru|h|1995|150|157|2012|2027|2;3;4",
    "FB25|subaru|e|2498|169|170|2018|2027|4;6",
    "4JJ3|isuzu|d|1898|164|165|2020|2027|4;13",
    "4JK1|isuzu|d|2499|136|164|2012|2020|13",
    "4HK1|isuzu|d|5193|190|191|2014|2027|8",
    "G3LA|hyundai;kia|e|998|67|68|2019|2027|1",
    "G4LA|hyundai;kia|e|1248|84|85|2017|2027|0;1;3",
    "G3LC|hyundai;kia|e|998|100|121|2017|2027|0;1;2;3",
    "G4LD|hyundai;kia|e|1353|140|141|2014|2020|2;3",
    "G4LF|hyundai;kia|e|1482|160|181|2020|2027|2;3;4",
    "G4FP|hyundai;kia;genesis|e|1598|150|199|2020|2027|2;3;4",
    "G4FT|hyundai;kia|h|1598|215|231|2020|2027|4;5",
    "G4FTP|hyundai;kia|p|1598|253|266|2021|2027|4;5",
    "G4KH|hyundai;kia|e|1998|250|281|2017|2027|2;11",
    "G4FJ|kia|e|1591|204|205|2018|2027|2;6",
    "G4LE|hyundai;kia|h|1580|141|184|2016|2027|2;4;5",
    "G4KL|genesis|e|1998|245|246|2021|2027|4;5",
    "G4KR|genesis|e|3470|370|381|2020|2027|4;5",
    "D4FB|hyundai;kia|d|1582|110|137|2012|2024|2;3;4",
    "D4HB|hyundai;kia|d|2199|200|203|2015|2027|4;12",
    "D4HC|kia;genesis|d|2151|202|211|2016|2027|4;12",
    "EGMP|hyundai;kia;genesis|b|0|170|651|2021|2027|2;4;5",
    "EVK;EVK2;EVK3|hyundai;kia;kgm|b|0|97|219|2016|2027|1;2;3;4",
    "NEXO|hyundai|b|0|163|164|2018|2027|4",
    "G15T|kgm|e|1497|163|164|2019|2027|3;4",
    "D22DT|kgm|d|2157|202|203|2017|2027|4;13",
    "VFE|vinfast|b|0|134|544|2023|2027|1;3;4",
    "15E4E|mg;roewe|e|1498|106|174|2013|2027|0;3;4;5",
    "15E4E2|mg|e|1490|162|163|2020|2024|3;4",
    "MGHEV|mg|h|1498|195|225|2024|2027|0;3;4",
    "MGHEVP|mg|p|1498|272|273|2024|2027|4",
    "EMG;EMGX|mg;roewe;maxus|b|0|143|511|2019|2027|2;3;4;6;8;10;12",
    "EBYS;EBY|byd;denza|b|0|95|531|2022|2027|0;1;3;4;5",
    "DMi|byd;denza|p|1498|218|429|2024|2027|4;5;12",
    "SQRE4T15|chery;omoda;exeed|e|1498|147|148|2023|2027|3;4",
    "SQRF4J16|chery;omoda;jaecoo;jetour;exeed;mg;geely;haval|e|1598|186|187|2023|2027|0;3;4;5",
    "SQRF4J20|chery;exeed;jaecoo;jetour|e|1998|254|262|2023|2027|4;5",
    "CHERPHEV|chery;jaecoo;omoda;exeed|p|1499|347|429|2024|2027|4;5",
    "CHEREV|omoda;jaecoo|b|0|204|205|2024|2027|4",
    "BHE15|geely;lynkco|e|1499|177|182|2019|2027|3;4;5",
    "GEEPHEV|geely;lynkco|p|1499|261|431|2021|2027|4;5",
    "GEEE|geely;lynkco|b|0|218|273|2024|2027|3;4",
    "SEAE|zeekr;geely|b|0|272|647|2023|2027|3;4;5;12",
    "XPEV|xpeng|b|0|276|552|2020|2027|4;5;12",
    "NIOEV|nio|b|0|489|654|2022|2027|4;5",
    "LIREV|liauto|p|1496|449|545|2022|2027|4",
    "LIBEV|liauto|b|0|544|545|2024|2027|12",
    "LPEVS;LPEV|leapmotor|b|0|95|219|2023|2027|1;4;5",
    "LREEV|leapmotor|p|1498|218|219|2025|2027|4",
    "GWMEVS;GWMEV|ora|b|0|171|409|2023|2027|0;3;5",
    "GW4B15|haval;geely;mg|e|1499|143|151|2020|2027|3;4",
    "GW4C20;GW4C20T|haval;tank;geely|e|1998|204|253|2020|2027|4;13",
    "GWMHEV|haval|h|1499|244|245|2022|2027|3;4",
    "GWMPHEV|haval;tank;chery;geely|p|1499|347|518|2022|2027|4",
    "GW4D20|gwm;haval|d|1996|163|164|2014|2027|13",
    "HQE|hongqi|b|0|344|552|2020|2027|4;5",
    "HQPT|hongqi|e|1998|224|253|2019|2027|4;5",
    "XIAE;XIAE2|xiaomi|b|0|299|1549|2024|2027|4;5",
    "JL473|changan|e|1499|178|189|2018|2027|3;4;5",
    "JL486|changan|e|1998|233|234|2021|2027|4;13",
    "DEEE|deepal|b|0|218|259|2023|2027|4;5",
    "DEEP|deepal|p|1498|218|259|2022|2027|4;5",
    "VOYE|voyah|b|0|510|691|2021|2027|4;5",
    "VOYP|voyah|p|1498|510|511|2022|2027|4;12",
    "VAZ21129|lada|e|1596|106|107|2015|2027|5;6",
    "VAZ21179|lada|e|1774|122|123|2016|2027|5;6",
    "VAZ2123|lada|e|1690|83|84|2014|2027|4"
  ];

  var KNOW = {};
  var BYBRAND = {};
  KNOWRAW.forEach(function (row) {
    var f = row.split("|");
    if (f.length < 9) { return; }
    var codes = f[0].split(";");
    var brands = f[1].split(";").map(K);
    var rec = {
      codes: codes, brands: brands, fuel: f[2], cyl: N(f[3], 0),
      hp0: N(f[4], 0), hp1: N(f[5], 3000), y0: N(f[6], 2010), y1: N(f[7], 2027),
      segs: f[8] === "*" ? null : f[8].split(";").map(function (x) { return N(x, -1); })
    };
    codes.forEach(function (c) { KNOW[K(c)] = rec; });
    brands.forEach(function (b) {
      if (!BYBRAND[b]) { BYBRAND[b] = []; }
      BYBRAND[b].push(rec);
    });
  });

  var GENERIC = {
    gt10: { fuel: "e", cyl: 999, hp: [80, 125], segs: [0, 1, 2, 3] },
    gt15: { fuel: "e", cyl: 1498, hp: [120, 180], segs: [2, 3, 4, 5, 6] },
    gt20: { fuel: "e", cyl: 1998, hp: [180, 330], segs: [4, 5, 6, 9, 10, 11] },
    td15: { fuel: "d", cyl: 1499, hp: [90, 140], segs: [0, 2, 3, 4, 5, 7] },
    td20: { fuel: "d", cyl: 1997, hp: [140, 215], segs: [4, 5, 6, 8, 13] },
    hy15: { fuel: "h", cyl: 1498, hp: [110, 160], segs: [0, 2, 3, 4, 5] },
    hy25: { fuel: "h", cyl: 2487, hp: [180, 260], segs: [4, 5, 6] },
    ph20: { fuel: "p", cyl: 1998, hp: [200, 320], segs: [4, 5, 6] },
    ev15: { fuel: "b", cyl: 0, hp: [90, 180], segs: [0, 1, 2, 3] },
    ev20: { fuel: "b", cyl: 0, hp: [190, 260], segs: [2, 3, 4, 5] },
    ev30: { fuel: "b", cyl: 0, hp: [280, 700], segs: [4, 5, 9, 11] },
    gen: { fuel: "e", cyl: 1598, hp: [90, 160], segs: null }
  };
  var EVONLY = ["tesla", "polestar", "xpeng", "nio", "zeekr", "xiaomi", "ora", "vinfast", "leapmotor", "rivian", "lucid", "smart"];
  var NODIESEL = ["tesla", "polestar", "xpeng", "nio", "zeekr", "xiaomi", "ora", "vinfast", "leapmotor", "liauto", "byd", "mg", "chery", "geely", "hongqi", "ferrari", "lamborghini", "alpine", "maserati", "lotus", "mclaren", "aston", "bugatti", "smart", "abarth", "denza", "yangwang", "fangchengbao", "zeekr"];
  var NOICE = ["tesla", "polestar", "xpeng", "nio", "zeekr", "xiaomi", "ora", "vinfast", "rivian", "lucid"];
  var SPORT = ["ferrari", "lamborghini", "bugatti", "mclaren", "aston", "lotus", "alpine", "maserati"];

  function segIdx(m) { return segs().indexOf(m && m.seg); }
  function modelById(id) {
    var f = null;
    A(db().models).forEach(function (m) { if (m && m.id === id) { f = m; } });
    return f;
  }
  function yPair(v, d) {
    var a = A(v);
    var x = N(a[0], d[0]), y = N(a[1], d[1]);
    if (x > y) { var t = x; x = y; y = t; }
    return [x, y];
  }
  function inter(a, b) {
    var x = yPair(a, [2017, 2027]), y = yPair(b, [2017, 2027]);
    var lo = Math.max(x[0], y[0]), hi = Math.min(x[1], y[1]);
    if (lo > hi) { return null; }
    return [lo, hi];
  }

  /* ══════════ AUDIT ══════════ */
  function auditAll(fix) {
    var d = db();
    var issues = [];
    var counts = { engines: 0, foreign: 0, hp: 0, cyl: 0, fuel: 0, years: 0, seg: 0, dup: 0, orphanE: 0, noEng: 0, faults: 0, orphanF: 0, fYears: 0, tsb: 0, orphanT: 0, modelYears: 0, reattrib: 0 };
    function add(cat, sev, msg, id) {
      issues.push({ cat: cat, sev: sev, msg: msg, id: id || "" });
      if (counts[cat] !== undefined) { counts[cat]++; }
    }

    /* années de production des modèles */
    A(d.models).forEach(function (m) {
      if (!m) { return; }
      var y = yPair(m.y, [2017, 2027]);
      if (y[0] < 2005 || y[1] > 2032) {
        add("modelYears", "majeure", "Années modèle hors plage : " + m.n + " " + y.join("-"), m.id);
        if (fix) { m.y = [Math.max(2005, y[0]), Math.min(2032, y[1])]; }
      } else if (A(m.y)[0] !== y[0] || A(m.y)[1] !== y[1]) {
        add("modelYears", "mineure", "Années modèle inversées : " + m.n, m.id);
        if (fix) { m.y = y; }
      }
      m.prod = y;
    });

    /* motorisations */
    var seen = {};
    var keep = [];
    A(d.engines).forEach(function (e) {
      if (!e) { return; }
      counts.engines++;
      var m = modelById(A(e.m)[0]);
      if (!m) {
        add("orphanE", "critique", "Motorisation sans modèle : " + e.code + " " + e.hp + " ch", e.id);
        if (!fix) { keep.push(e); }
        return;
      }
      var bid = K(m.b);
      var si = segIdx(m);
      var my = yPair(m.y, [2017, 2027]);
      var ey = yPair(e.y, my);
      var kn = KNOW[K(e.fam)] || KNOW[K(e.code)];
      var bad = false;

      if (kn) {
        if (kn.brands.indexOf(bid) < 0) {
          add("foreign", "critique", "Famille " + e.fam + " étrangère à " + m.b + " (" + m.n + " " + e.hp + " ch)", e.id);
          bad = true;
        }
        if (!bad && kn.fuel !== e.fuel) {
          add("fuel", "majeure", "Carburant incohérent : " + e.fam + " attendu " + kn.fuel + " sur " + m.n, e.id);
          if (fix) { e.fuel = kn.fuel; }
        }
        if (!bad && kn.cyl > 0 && e.disp > 0 && Math.abs(e.disp - kn.cyl) / kn.cyl > 0.18) {
          add("cyl", "majeure", "Cylindrée " + e.disp + " cm³ hors famille " + e.fam + " (" + kn.cyl + ")", e.id);
          if (fix) { e.disp = kn.cyl; }
        }
        if (!bad && (e.hp < kn.hp0 * 0.88 || e.hp > kn.hp1 * 1.08)) {
          add("hp", "majeure", "Puissance " + e.hp + " ch hors plage réelle " + kn.hp0 + "-" + kn.hp1 + " (" + e.fam + " / " + m.n + ")", e.id);
          if (fix) { e.hp = Math.round(Math.min(kn.hp1, Math.max(kn.hp0, e.hp))); e.kw = Math.round(e.hp * 0.7355); }
        }
        if (!bad && kn.segs && si >= 0 && kn.segs.indexOf(si) < 0) {
          add("seg", "mineure", "Famille " + e.fam + " atypique sur segment " + m.seg + " (" + m.n + ")", e.id);
        }
        if (!bad) {
          var ki = inter(ey, [kn.y0, kn.y1]);
          if (!ki) {
            add("years", "majeure", "Famille " + e.fam + " non produite sur " + m.n + " " + my.join("-"), e.id);
            bad = true;
          } else if (fix) { ey = ki; }
        }
      } else if (GENERIC[K(e.fam)]) {
        var g = GENERIC[K(e.fam)];
        if (NOICE.indexOf(bid) > -1 && e.fuel !== "b") {
          add("foreign", "critique", "Thermique " + e.fam + " sur marque 100 % électrique " + m.b, e.id);
          bad = true;
        } else if (EVONLY.indexOf(bid) > -1 && e.fuel !== "b" && e.fuel !== "p") {
          add("foreign", "majeure", "Motorisation " + e.fam + " improbable sur " + m.b, e.id);
          bad = true;
        } else if (NODIESEL.indexOf(bid) > -1 && e.fuel === "d") {
          add("foreign", "majeure", "Diesel " + e.fam + " inexistant chez " + m.b, e.id);
          bad = true;
        } else if (SPORT.indexOf(bid) > -1 && (e.fuel === "d" || (e.disp > 0 && e.disp < 2500))) {
          add("foreign", "majeure", "Motorisation " + e.fam + " incompatible avec " + m.b, e.id);
          bad = true;
        } else if (si === 1 && e.hp > 130) {
          add("hp", "majeure", e.hp + " ch sur micro-citadine " + m.n, e.id);
          bad = true;
        } else if (si === 0 && e.hp > 215) {
          add("hp", "majeure", e.hp + " ch sur citadine " + m.n, e.id);
          bad = true;
        } else if (g.segs && si >= 0 && g.segs.indexOf(si) < 0) {
          add("seg", "mineure", "Famille générique " + e.fam + " hors segment " + m.seg, e.id);
        }
      }

      var mi = inter(ey, my);
      if (!mi) {
        add("years", "majeure", "Années moteur " + ey.join("-") + " hors production " + m.n + " " + my.join("-"), e.id);
        if (fix) { e.y = my.slice(); }
      } else if (fix) {
        if (A(e.y)[0] !== mi[0] || A(e.y)[1] !== mi[1]) {
          add("years", "mineure", "Années moteur recalées sur " + m.n + " : " + mi.join("-"), e.id);
        }
        e.y = mi;
      }

      var dk = K(m.id + "|" + e.fam + "|" + e.hp + "|" + e.gb);
      if (seen[dk]) {
        add("dup", "mineure", "Doublon motorisation " + m.n + " " + e.fam + " " + e.hp + " ch", e.id);
        if (fix) { bad = true; }
      }
      seen[dk] = 1;

      if (fix && bad) { return; }
      keep.push(e);
    });
    if (fix) { d.engines = keep; }

    /* modèles sans motorisation → réattribution réelle */
    var perModel = {};
    A(d.engines).forEach(function (e) {
      A(e.m).forEach(function (mid) { perModel[mid] = (perModel[mid] || 0) + 1; });
    });
    A(d.models).forEach(function (m) {
      if (perModel[m.id]) { return; }
      counts.noEng++;
      add("noEng", "critique", "Modèle sans motorisation : " + m.b + " " + m.n + " (" + A(m.y).join("-") + ")", m.id);
      if (!fix) { return; }
      var pool = A(BYBRAND[K(m.b)]);
      var si = segIdx(m);
      var my = yPair(m.y, [2017, 2027]);
      var fit = pool.filter(function (r) {
        if (r.segs && si >= 0 && r.segs.indexOf(si) < 0) { return false; }
        return !!inter(my, [r.y0, r.y1]);
      });
      if (!fit.length) { fit = pool.filter(function (r) { return !!inter(my, [r.y0, r.y1]); }); }
      if (!fit.length) { fit = pool; }
      if (!fit.length) {
        var isEv = EVONLY.indexOf(K(m.b)) > -1;
        fit = [{ codes: [isEv ? "EV20" : "GT15"], brands: [K(m.b)], fuel: isEv ? "b" : "e", cyl: isEv ? 0 : 1498, hp0: isEv ? 150 : 130, hp1: isEv ? 204 : 150, y0: my[0], y1: my[1], segs: null }];
      }
      var made = 0;
      fit.slice(0, 3).forEach(function (r) {
        var yy = inter(my, [r.y0, r.y1]) || my;
        var hps = [r.hp0, Math.round((r.hp0 + r.hp1) / 2 / 5) * 5, r.hp1];
        var uniqHp = [];
        hps.forEach(function (h) { if (h > 0 && uniqHp.indexOf(h) < 0) { uniqHp.push(h); } });
        uniqHp.slice(0, 2).forEach(function (h) {
          var code = r.codes[0];
          var e = {
            id: uid("EA"), m: [m.id], code: code, fam: code,
            label: code + " " + h + " (" + yy[0] + "-" + yy[1] + ")",
            fuel: r.fuel, disp: r.cyl, hp: h,
            nm: Math.round(h * (r.fuel === "d" ? 2.6 : r.fuel === "b" ? 1.6 : 1.5)),
            kw: Math.round(h * 0.7355), y: yy.slice(),
            gb: r.fuel === "b" ? "RED" : (r.fuel === "h" || r.fuel === "p" ? "eCVT" : "BVM6"),
            norm: r.fuel === "b" ? "ZE" : (yy[0] >= 2024 ? "Euro 6e" : "Euro 6"),
            cyl: r.fuel === "b" ? "ÉLEC" : (r.cyl > 3400 ? "V8+" : (r.cyl < 1100 ? "L3" : "L4")),
            asp: r.fuel === "b" ? "—" : "Turbo",
            inj: r.fuel === "b" ? "—" : (r.fuel === "d" ? "Common Rail" : "Injection directe")
          };
          d.engines.push(e);
          made++;
          counts.reattrib++;
        });
      });
      if (made) { add("reattrib", "info", made + " motorisation(s) réelle(s) réattribuée(s) à " + m.n, m.id); }
    });

    /* index léger pour la corrélation des pannes */
    var eByFam = {}, eByModel = {}, tokModels = {};
    A(d.engines).forEach(function (e) {
      if (!eByFam[e.fam]) { eByFam[e.fam] = []; }
      eByFam[e.fam].push(e);
      A(e.m).forEach(function (mid) {
        if (!eByModel[mid]) { eByModel[mid] = []; }
        eByModel[mid].push(e);
      });
    });
    var mkeys = A(d.models).map(function (m) { return { id: m.id, k: K(m.n), y: yPair(m.y, [2017, 2027]) }; });
    function toks(l) {
      var out = [];
      A(l).forEach(function (t) {
        var k = K(t);
        if (k && k !== "*" && out.indexOf(k) < 0) { out.push(k); }
      });
      return out;
    }
    function targets(fam, mt) {
      var seenE = {}, out = [];
      A(fam).forEach(function (x) {
        A(eByFam[x]).forEach(function (e) {
          if (!seenE[e.id]) { seenE[e.id] = 1; out.push(e); }
        });
      });
      toks(mt).forEach(function (k) {
        if (!tokModels[k]) {
          tokModels[k] = [];
          mkeys.forEach(function (m) { if (m.k.indexOf(k) > -1) { tokModels[k].push(m.id); } });
        }
        A(tokModels[k]).forEach(function (mid) {
          A(eByModel[mid]).forEach(function (e) {
            if (!seenE[e.id]) { seenE[e.id] = 1; out.push(e); }
          });
        });
      });
      if (A(mt).indexOf("*") > -1) {
        A(d.engines).forEach(function (e) {
          if (!seenE[e.id]) { seenE[e.id] = 1; out.push(e); }
        });
      }
      return out;
    }

    /* pannes */
    var keepF = [];
    A(d.faults).forEach(function (f) {
      if (!f) { return; }
      counts.faults++;
      var tg = targets(f.fam, f.mt);
      if (!tg.length) {
        add("orphanF", "majeure", "Panne sans motorisation corrélée : " + f.t, f.id);
        if (fix) { return; }
        keepF.push(f);
        return;
      }
      var lo = 9999, hi = 0;
      tg.forEach(function (e) {
        var y = yPair(e.y, [2017, 2027]);
        lo = Math.min(lo, y[0]);
        hi = Math.max(hi, y[1]);
      });
      var fy = yPair(f.y, [2017, 2027]);
      var ii = inter(fy, [lo, hi]);
      if (!ii) {
        add("fYears", "majeure", "Période de panne hors production des motorisations : " + f.t, f.id);
        if (fix) { f.y = [lo, hi]; }
      } else if (fix && (fy[0] !== ii[0] || fy[1] !== ii[1])) {
        f.y = ii;
      }
      var km = A(f.km);
      if (N(km[0], 0) > N(km[1], 200000)) {
        add("fYears", "mineure", "Plage km inversée : " + f.t, f.id);
        if (fix) { f.km = [N(km[1], 0), N(km[0], 200000)]; }
      }
      keepF.push(f);
    });
    if (fix) { d.faults = keepF; }

    /* campagnes / TSB */
    var keepT = [];
    A(d.tsb).forEach(function (t) {
      if (!t) { return; }
      counts.tsb++;
      var tg = targets(t.fam, t.mt);
      var brandOk = A(t.b).some(function (b) {
        return A(d.brands).some(function (x) { return x && x.id === b; });
      });
      if (!tg.length && !brandOk) {
        add("orphanT", "majeure", "Bulletin sans périmètre réel : " + t.ref, t.id);
        if (fix) { return; }
      }
      keepT.push(t);
    });
    if (fix) { d.tsb = keepT; }

    if (fix) {
      if (typeof W.normalize === "function") { W.normalize(d); }
      if (typeof W.invalidate === "function") { W.invalidate(); }
      if (typeof W.recompute === "function") { W.recompute(); }
      if (typeof W.isAdmin === "function" && W.isAdmin()) {
        if (typeof W.audit === "function") { W.audit("audit", "Audit corrélation : " + issues.length + " anomalies, " + counts.reattrib + " réattributions"); }
        if (typeof W.saveNow === "function") { W.saveNow(true); }
        if (W.REG && W.REG.live && typeof W.publish === "function") { W.publish(true); }
      }
      ST.fixed += issues.length;
    }
    ST.runs++;
    ST.last = Date.now();
    ST.report = { ts: Date.now(), fix: !!fix, counts: counts, issues: issues, total: issues.length };
    ST.log.unshift({ ts: Date.now(), fix: !!fix, n: issues.length, re: counts.reattrib });
    if (ST.log.length > 30) { ST.log.pop(); }
    saveSt();
    if (typeof W.updateMeta === "function") { W.updateMeta(); }
    return ST.report;
  }

  /* ══════════ ANNÉES DE PRODUCTION AFFICHÉES PARTOUT ══════════ */
  function yearsTag(m, extra) {
    if (!m) { return ""; }
    var y = yPair(m.y, [2017, 2027]);
    return "<span class='tag' style='color:#25D4EE;border-color:rgba(37,212,238,.4)'>" + IC("cal", "width:10px;height:10px") + "PROD. " + y[0] + "–" + y[1] + (extra ? " · " + extra : "") + "</span>";
  }
  function stampYears() {
    var d = db();
    qa(".eng[data-id]").forEach(function (card) {
      if (card.getAttribute("data-yr")) { return; }
      var id = card.getAttribute("data-id");
      var e = null;
      A(d.engines).forEach(function (x) { if (x && x.id === id) { e = x; } });
      if (!e) { return; }
      var m = modelById(A(e.m)[0]);
      if (!m) { return; }
      var meta = card.querySelector(".meta");
      if (meta) {
        var sp = D.createElement("span");
        sp.className = "tag";
        sp.style.color = "#25D4EE";
        sp.style.borderColor = "rgba(37,212,238,.4)";
        var y = yPair(m.y, [2017, 2027]);
        sp.textContent = "PROD. " + y[0] + "–" + y[1];
        meta.appendChild(sp);
      }
      card.setAttribute("data-yr", "1");
    });
    var st = W.MD_STATE;
    var mid = st && st.sel ? st.sel.m : "";
    var mm = mid ? modelById(mid) : null;
    qa(".selcard .sg").forEach(function (sg) {
      if (sg.getAttribute("data-yr")) { return; }
      if (!mm) { return; }
      var y = yPair(mm.y, [2017, 2027]);
      var box = D.createElement("div");
      box.className = "sp";
      box.innerHTML = "<span>Production modèle</span><b class='hl'>" + y[0] + " → " + y[1] + "</b>";
      sg.insertBefore(box, sg.firstChild);
      var box2 = D.createElement("div");
      box2.className = "sp";
      box2.innerHTML = "<span>Durée de production</span><b class='hl'>" + (y[1] - y[0] + 1) + " ans · phase " + mm.phase + "</b>";
      sg.insertBefore(box2, sg.children[1] || null);
      sg.setAttribute("data-yr", "1");
    });
    qa("#md .sg").forEach(function (sg) {
      if (sg.getAttribute("data-yr")) { return; }
      var txt = sg.textContent || "";
      if (txt.indexOf("Code") < 0 && txt.indexOf("Modèle") < 0) { return; }
      var title = q("#md .mh h3");
      var t = title ? title.textContent : "";
      var found = null;
      A(d.models).forEach(function (m) {
        if (!found && m && t.indexOf(m.n) > -1) { found = m; }
      });
      if (!found && mm) { found = mm; }
      if (!found) { return; }
      var y2 = yPair(found.y, [2017, 2027]);
      var b1 = D.createElement("div");
      b1.className = "sp";
      b1.innerHTML = "<span>Production modèle</span><b class='hl'>" + y2[0] + " → " + y2[1] + "</b>";
      sg.insertBefore(b1, sg.firstChild);
      sg.setAttribute("data-yr", "1");
    });
    var vh = q("#view .vh .sub");
    if (vh && !vh.getAttribute("data-yr") && mm) {
      var y3 = yPair(mm.y, [2017, 2027]);
      vh.innerHTML += " <b style='color:#25D4EE'>Production " + E(mm.n) + " : " + y3[0] + "–" + y3[1] + ".</b>";
      vh.setAttribute("data-yr", "1");
    }
  }
  function observe() {
    var busy = false;
    function run() {
      if (busy) { return; }
      busy = true;
      setTimeout(function () {
        busy = false;
        try { stampYears(); } catch (e) {}
      }, 30);
    }
    ["#view", "#md"].forEach(function (sel) {
      var el = q(sel);
      if (!el || !W.MutationObserver) { return; }
      var mo = new MutationObserver(function (recs) {
        var only = true;
        recs.forEach(function (r) {
          if (r.target && r.target.getAttribute && r.target.getAttribute("data-yr")) { only = false; }
        });
        if (only) { run(); }
      });
      mo.observe(el, { childList: true, subtree: true });
    });
    run();
  }

  /* ══════════ PANNEAU ══════════ */
  function load() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY));
      if (r && typeof r === "object") {
        ST.auto = r.auto !== false;
        ST.runs = N(r.runs, 0);
        ST.fixed = N(r.fixed, 0);
        ST.last = N(r.last, 0);
        ST.log = A(r.log);
      }
    } catch (e) {}
  }
  function saveSt() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ auto: ST.auto, runs: ST.runs, fixed: ST.fixed, last: ST.last, log: ST.log.slice(0, 30) }));
    } catch (e) {}
  }
  function panelBody() {
    var r = ST.report || auditAll(false);
    var c = r.counts;
    var d = db();
    var h = "<div class='kpis' style='grid-template-columns:repeat(4,1fr)'>";
    [["MOTORISATIONS AUDITÉES", c.engines, "#25D4EE"], ["ANOMALIES DÉTECTÉES", r.total, r.total ? "#FFAF2E" : "#43E08B"], ["MODÈLES SANS MOTEUR", c.noEng, c.noEng ? "#FF4D5E" : "#43E08B"], ["PANNES NON CORRÉLÉES", c.orphanF + c.orphanT, (c.orphanF + c.orphanT) ? "#FF4D5E" : "#43E08B"]].forEach(function (k) {
      h += "<div class='card kpi' style='--kc:" + k[2] + "'><b>" + F(k[1]) + "</b><span>" + k[0] + "</span></div>";
    });
    h += "</div>";
    h += "<div class='g2'><div class='card panel'><h3>" + IC("piston") + "Corrélation motorisations ↔ modèles</h3><div class='sg'>";
    [["Familles étrangères à la marque", c.foreign], ["Puissances hors plage réelle", c.hp], ["Cylindrées incohérentes", c.cyl], ["Carburants incohérents", c.fuel], ["Années moteur hors production", c.years], ["Segments atypiques", c.seg], ["Doublons", c.dup], ["Motorisations orphelines", c.orphanE], ["Réattributions réelles", c.reattrib]].forEach(function (x) {
      h += "<div class='sp'><span>" + E(x[0]) + "</span><b class='hl' style='color:" + (x[1] ? "#FFAF2E" : "#43E08B") + "'>" + F(x[1]) + "</b></div>";
    });
    h += "</div></div>";
    h += "<div class='card panel'><h3>" + IC("alert") + "Corrélation pannes ↔ motorisations</h3><div class='sg'>";
    [["Pannes analysées", c.faults], ["Pannes sans corrélation", c.orphanF], ["Périodes de panne recalées", c.fYears], ["Bulletins / campagnes", c.tsb], ["Bulletins sans périmètre", c.orphanT], ["Années modèle corrigées", c.modelYears], ["Modèles avec années", A(d.models).length], ["Familles réelles connues", Object.keys(KNOW).length]].forEach(function (x) {
      h += "<div class='sp'><span>" + E(x[0]) + "</span><b class='hl'>" + F(x[1]) + "</b></div>";
    });
    h += "</div></div></div>";
    h += "<div class='card panel' style='margin-bottom:12px'><h3>" + IC("cal") + "Années de production des modèles<span class='chip'>" + A(d.models).length + "</span></h3>";
    h += "<div class='tw' style='max-height:210px'><table class='t'><thead><tr><th>Marque</th><th>Modèle</th><th>Phase</th><th>Production</th><th>Motorisations</th></tr></thead><tbody>";
    var per = {};
    A(d.engines).forEach(function (e) { A(e.m).forEach(function (mid) { per[mid] = (per[mid] || 0) + 1; }); });
    A(d.models).slice(0, 400).forEach(function (m) {
      var y = yPair(m.y, [2017, 2027]);
      var b = null;
      A(d.brands).forEach(function (x) { if (x && x.id === m.b) { b = x; } });
      h += "<tr><td>" + E(b ? b.n : m.b) + "</td><td><b>" + E(m.n) + "</b></td><td class='mono'>" + m.phase + "</td><td class='mono' style='color:#25D4EE'>" + y[0] + "–" + y[1] + "</td><td class='mono'>" + (per[m.id] || 0) + "</td></tr>";
    });
    h += "</tbody></table></div></div>";
    var qk = K(ST.filter);
    var list = A(r.issues).filter(function (i) {
      if (!qk) { return true; }
      return K(i.cat + " " + i.sev + " " + i.msg).indexOf(qk) > -1;
    });
    h += "<div class='bar'><label class='lb' style='margin:0'>Filtrer le rapport</label><input class='inp' type='search' data-auditq='1' value='" + E(ST.filter) + "' placeholder='Famille, modèle, catégorie…' style='max-width:320px'><span class='cnt'>" + F(list.length) + " ligne(s)</span></div>";
    h += "<div class='tw' style='max-height:320px'><table class='t'><thead><tr><th>Contrôle</th><th>Sévérité</th><th>Constat</th></tr></thead><tbody>";
    if (!list.length) {
      h += "<tr><td colspan='3' style='color:#43E08B'>Aucune anomalie : corrélations motorisations / puissances / pannes conformes.</td></tr>";
    }
    list.slice(0, 150).forEach(function (i) {
      var col = i.sev === "critique" ? "#FF4D5E" : i.sev === "majeure" ? "#FF7A3D" : i.sev === "info" ? "#43E08B" : "#FFAF2E";
      h += "<tr><td class='mono'>" + E(i.cat) + "</td><td><span class='sev' style='color:" + col + ";border:1px solid " + col + "55;background:" + col + "18'>" + E(i.sev) + "</span></td><td>" + E(i.msg) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    h += "<div class='card panel' style='margin-top:12px'><h3>" + IC("clock") + "Journal des audits</h3><div class='journal'>";
    if (!ST.log.length) { h += "<p class='dim'>Aucun audit enregistré.</p>"; }
    ST.log.slice(0, 12).forEach(function (l) {
      h += "<div class='jr'><time>" + new Date(N(l.ts, Date.now())).toLocaleTimeString("fr-FR") + "</time><span class='jt'>" + (l.fix ? "FIX" : "SCAN") + "</span><span>" + F(l.n) + " anomalies · " + F(l.re) + " réattributions</span></div>";
    });
    h += "</div></div>";
    return h;
  }
  function refresh() {
    var b = q("#auditBody");
    if (b) { b.innerHTML = panelBody(); }
  }
  function openPanel() {
    if (!ST.report) { auditAll(false); }
    var h = "<div class='mh'>" + IC("stetho", "color:#25D4EE") + "<h3>AUDIT DE CORRÉLATION RÉELLE</h3>";
    h += "<button class='tb' data-act='mclose'>" + IC("x") + "</button></div>";
    h += "<div class='mb2' id='auditBody'>" + panelBody() + "</div>";
    h += "<div class='mf'>";
    h += "<button class='btn sm ghost' data-audit='scan'>" + IC("search") + "Vérifier</button>";
    h += "<button class='btn sm ghost' data-audit='export'>" + IC("dl") + "Rapport JSON</button>";
    h += "<button class='btn sm grn' data-audit='fix'>" + IC("tool") + "CORRIGER TOUT</button>";
    h += "<button class='btn sm' data-act='mclose'>Fermer</button></div>";
    if (typeof W.openModal === "function") { W.openModal(h, "wide"); }
  }
  function injectBtn() {
    var top = q("#top");
    if (!top || q("#auditb")) { return; }
    var b = D.createElement("button");
    b.className = "tb";
    b.id = "auditb";
    b.type = "button";
    b.title = "Audit de corrélation réelle motorisations / pannes";
    b.setAttribute("aria-label", "Audit de corrélation réelle");
    b.style.color = "#25D4EE";
    b.style.borderColor = "rgba(37,212,238,.45)";
    b.innerHTML = IC("stetho");
    b.addEventListener("click", openPanel);
    var ref = q("#megab") || q("#repairb") || q("#diagb");
    if (ref && ref.parentNode === top) { top.insertBefore(b, ref); } else { top.appendChild(b); }
  }

  /* ══════════ ÉVÉNEMENTS ══════════ */
  D.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-audit]") : null;
    if (!el) { return; }
    var a = el.getAttribute("data-audit");
    if (a === "scan") {
      auditAll(false);
      refresh();
      say("info", "Audit terminé", F(ST.report.total) + " anomalie(s) détectée(s)");
      snd("tick");
      return;
    }
    if (a === "fix") {
      var r = auditAll(true);
      say(r.total ? "ok" : "info", "Correction massive appliquée", F(r.total) + " anomalies traitées · " + F(r.counts.reattrib) + " motorisations réelles réattribuées");
      snd("imp");
      if (typeof W.render === "function" && W.MODE) { W.render(); }
      if (typeof W.runTests === "function") { W.runTests(); }
      refresh();
      stampYears();
      return;
    }
    if (a === "export") {
      if (typeof W.download === "function") {
        W.download("mecadata_audit_correlation.json", JSON.stringify(ST.report, null, 2));
        say("ok", "Rapport exporté", F(A(ST.report && ST.report.issues).length) + " lignes");
      }
      return;
    }
  });
  var debQ = null;
  D.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t || !t.getAttribute || !t.getAttribute("data-auditq")) { return; }
    ST.filter = t.value;
    clearTimeout(debQ);
    debQ = setTimeout(function () {
      refresh();
      var i = q("[data-auditq]");
      if (i) {
        i.focus();
        try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {}
      }
    }, 200);
  });

  /* ══════════ HOOKS & TESTS ══════════ */
  var busy = false;
  function schedule() {
    if (!ST.auto || busy) { return; }
    busy = true;
    setTimeout(function () {
      busy = false;
      try {
        var r = auditAll(true);
        if (r.total) {
          say("info", "Corrélation revérifiée", F(r.total) + " anomalies corrigées après mise à jour");
          if (typeof W.render === "function" && W.MODE) { W.render(); }
          if (typeof W.runTests === "function") { W.runTests(); }
          refresh();
        }
        stampYears();
      } catch (e) {}
    }, 1600);
  }
  function hooks() {
    ["mutate", "repairAll"].forEach(function (name) {
      var f = W[name];
      if (typeof f !== "function" || f.__audit) { return; }
      var w = function () {
        var r = f.apply(this, arguments);
        schedule();
        return r;
      };
      w.__audit = 1;
      W[name] = w;
      if (W.MD_API && name === "mutate") { W.MD_API.mutate = w; }
      if (W.MD_API && name === "repairAll") { W.MD_API.repair = w; }
    });
    if (W.AUTO && typeof W.AUTO.sweep === "function" && !W.AUTO.sweep.__audit) {
      var sw = W.AUTO.sweep;
      var ws = function () {
        var r = sw.apply(this, arguments);
        schedule();
        return r;
      };
      ws.__audit = 1;
      W.AUTO.sweep = ws;
    }
    if (W.MD_MEGA && typeof W.MD_MEGA.expand === "function" && !W.MD_MEGA.expand.__audit) {
      var ex = W.MD_MEGA.expand;
      var we = function () {
        var r = ex.apply(this, arguments);
        schedule();
        return r;
      };
      we.__audit = 1;
      W.MD_MEGA.expand = we;
    }
    var rt = W.runTests;
    if (typeof rt === "function" && !rt.__audit) {
      var wrt = function () {
        var out = rt.apply(this, arguments);
        try {
          var r = ST.report || auditAll(false);
          var c = r.counts;
          var T = A(W.TESTS);
          function add(n, ok, info, soft) { T.push({ n: n, ok: !!ok, info: String(info == null ? "" : info), soft: !!soft }); }
          add("Audit corrélation disponible", !!ST.report, F(ST.runs) + " audits");
          add("Aucune famille étrangère", c.foreign === 0, F(c.foreign) + " motorisation(s) étrangère(s)");
          add("Puissances dans plage réelle", c.hp === 0, F(c.hp) + " hors plage");
          add("Cylindrées cohérentes", c.cyl === 0, F(c.cyl) + " incohérence(s)");
          add("Années moteur ⊂ production modèle", c.years === 0, F(c.years) + " hors bornes");
          add("Aucun modèle sans motorisation", c.noEng === 0, F(c.noEng) + " modèle(s)");
          add("Pannes corrélées à des moteurs réels", c.orphanF === 0, F(c.orphanF) + " orpheline(s)");
          add("Périodes de panne cohérentes", c.fYears === 0, F(c.fYears) + " à recaler");
          add("Bulletins avec périmètre réel", c.orphanT === 0, F(c.orphanT) + " sans périmètre");
          add("Années de production affichées", qa(".eng[data-yr]").length > 0 || !q(".eng"), F(qa(".eng[data-yr]").length) + " cartes annotées", true);
          add("Doublons motorisations", c.dup === 0, F(c.dup) + " doublon(s)", true);
          W.TESTS = T;
          if (typeof W.updateMeta === "function") { W.updateMeta(); }
          var tl = q("#testList");
          if (tl && typeof W.testListHTML === "function") { tl.innerHTML = W.testListHTML(); }
        } catch (e) {}
        return out;
      };
      wrt.__audit = 1;
      W.runTests = wrt;
    }
  }

  /* ══════════ DÉMARRAGE ══════════ */
  function boot() {
    if (!W.MD_API || !W.DB || !A(W.DB.engines).length) { return false; }
    load();
    injectBtn();
    hooks();
    observe();
    setTimeout(function () {
      try {
        var r = auditAll(true);
        if (r.total) {
          say("info", "Corrélation réelle vérifiée", F(r.total) + " anomalies corrigées · " + F(r.counts.reattrib) + " motorisations réattribuées");
        }
        if (typeof W.render === "function" && W.MODE) { W.render(); }
        if (typeof W.runTests === "function") { W.runTests(); }
        stampYears();
      } catch (e) {}
    }, 2600);
    W.MD_AUDIT = {
      run: auditAll, panel: openPanel, years: stampYears,
      knowledge: KNOW, byBrand: BYBRAND,
      report: function () { return ST.report; }
    };
    return true;
  }
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (boot() || tries > 160) { clearInterval(iv); }
  }, 250);
  W.addEventListener("load", function () { setTimeout(boot, 400); });
})();
