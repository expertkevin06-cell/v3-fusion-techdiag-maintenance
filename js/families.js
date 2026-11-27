/* MECADATA // REGISTRE FAMILLES v23
   Table canonique reliant chaque code moteur réel (variantes incluses) à sa
   famille : carburant, cylindrée, plage de puissances réelle, ANNÉES DE
   PRODUCTION, marques d'origine et technologies. Sert de référence unique à
   la corrélation pannes / rappels / TSB / bulletins ↔ marque ↔ modèle ↔
   motorisation ↔ puissance. */
(function () {
  "use strict";
  var W = window;
  function A(v) { return Array.isArray(v) ? v : []; }
  function N(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function K(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }

  /* canon|alias;alias|carburants|cyl|chMin|chMax|an0|an1|marques|technologies */
  var ROWS = [
    "EB2|EB2;EB2ADT;EB2ADTX;EB2G3;EB2G3P|e,h,p|1199|75|196|2012|2027|peugeot;citroen;opel;ds;fiat;alfa;jeep;lancia|turbo;gdi;belt",
    "DV5|DV5;DV5RUCd;DV5RUC;DV6FC|d|1499|95|131|2014|2026|peugeot;citroen;opel;ds;toyota|scr;egr;dpf",
    "DW10|DW10;DW10FC;4HVD|d|1997|140|181|2014|2027|peugeot;citroen;opel|scr;egr;dpf",
    "EP6|EP6;EP6FDT|e|1598|150|226|2013|2023|peugeot;citroen;ds;mini|gdi;turbo",
    "EP6P|EP6P|p|1598|180|360|2019|2027|peugeot;citroen;ds;opel|gdi;phev",
    "ZKX|ZKX;E113;E156|b|0|95|157|2019|2027|peugeot;citroen;opel;ds;fiat;jeep;lancia|ev",
    "EM2|EM2;STLAE|b|0|200|680|2023|2027|peugeot;ds;dodge;jeep|ev",
    "H4DT|H4Dt;H4Dg;B4D|e,g|999|65|101|2015|2027|renault;dacia|turbo",
    "H5HT|H5Ht;H5Ft|e|1197|115|161|2012|2024|renault;dacia;nissan;mercedes|turbo",
    "HR12|HR12;HR12H;HR12P|h,p|1199|130|201|2020|2027|renault;dacia|mhev",
    "K9K|K9K|d|1461|70|116|2010|2023|renault;dacia;nissan;mercedes|scr;egr;dpf",
    "M9R|M9R;M9T;R9M;R9N|d|1997|110|201|2010|2027|renault;nissan;opel|scr;dpf",
    "6AM|6AM;5AM;5AQ;5AT;AMPR|b|0|85|401|2012|2027|renault;alpine;nissan|ev",
    "EA211|EA211;CHZL;CHYA;DLAA|e|999|60|151|2012|2027|vw;audi;skoda;seat|turbo;gdi",
    "DPCA|DPCA;DPCAE;CZDA|e,h|1395|125|151|2014|2027|vw;audi;skoda;seat;cupra|turbo;gdi;mhev",
    "EA888|EA888;CJXC;DNPA;DNFG;DKNA|e|1984|190|334|2013|2027|vw;audi;skoda;seat;cupra|turbo;gdi",
    "DNWA|DNWA|e|2480|390|401|2021|2027|audi;cupra|turbo",
    "EA288|EA288;DSUA;DFGA;DSUB;DSKA;DSNA|d|1968|75|205|2013|2027|vw;audi;skoda;seat;cupra;ford|scr;egr;dpf",
    "DGEA|DGEA|p|1395|204|273|2019|2027|vw;skoda;seat;cupra|phev",
    "APP310|APP310;APP550;APP550X|b|0|150|341|2019|2027|vw;audi;skoda;cupra;seat;ford|ev",
    "PPE|PPE|b|0|292|640|2024|2027|audi;porsche|ev800",
    "J1|J1|b|0|408|1035|2019|2027|porsche;audi|ev800",
    "B48|B48;B38|e|1499|102|266|2014|2027|bmw;mini;toyota|turbo;gdi",
    "B58|B58|e|2998|340|383|2015|2027|bmw;toyota|turbo",
    "S58|S58|e|2993|460|531|2021|2027|bmw|turbo;perf",
    "N63|N63|e|4395|530|626|2017|2027|bmw|turbo;v8",
    "B47|B47;B57|d|1995|150|331|2012|2027|bmw;mini|scr;egr;dpf",
    "B48P|B48P|p|1998|204|293|2019|2027|bmw|phev",
    "GEN5|GEN5;GC1;IB1|b|0|170|620|2013|2027|bmw|ev",
    "MINIE|MINIE|b|0|184|314|2019|2027|mini|ev",
    "M254|M254;M260;M282|e,h|1332|100|259|2018|2027|mercedes|mhev;turbo",
    "M256|M256|h|2999|367|436|2017|2027|mercedes|mhev",
    "M139|M139|e|1991|306|681|2018|2027|mercedes|turbo;perf",
    "OM654|OM654;OM654P;OM656;OM608|d|1461|102|331|2014|2027|mercedes|scr;egr;dpf",
    "EM0055|EM0055;EM0033|b|0|190|627|2019|2027|mercedes|ev",
    "SEA|SEA|b|0|82|545|2017|2027|smart|ev",
    "FOX|FOX|e|998|100|156|2012|2027|ford|turbo;gdi;belt",
    "PANTHER|PANTHER;R9DA|d|1499|95|206|2016|2027|ford;vw|scr;dpf;belt",
    "COYOTE|COYOTE|e|5038|450|501|2015|2027|ford|v8",
    "GE1|GE1|b|0|169|488|2021|2027|ford|ev",
    "TSLALR|TSLALR;TSLAR;TSLAP;CYB|b|0|283|1021|2016|2027|tesla|ev",
    "HEMI|HEMI;HEMIHC|e|5654|370|808|2015|2027|ram;dodge;chrysler;jeep|v8;afm",
    "CTD|CTD|d|6690|370|421|2019|2027|ram|diesel;hd",
    "L87|L87;L84;LT1;LT2|e|5328|355|671|2016|2027|chevrolet;gmc;cadillac|v8",
    "ULT|ULT;ULTC;ULTA;ULTH|b|0|204|1001|2017|2027|chevrolet;cadillac;gmc;acura|ev",
    "ZR|ZR|h|1798|122|141|2011|2027|toyota;lexus;suzuki|hev",
    "ZR2|ZR2|h|1987|140|198|2018|2027|toyota;lexus|hev",
    "A25A|A25A;A25AP|h,p|2487|218|330|2018|2027|toyota;lexus;suzuki|hev;phev",
    "GD|GD;GD2|d|2393|150|205|2015|2027|toyota|diesel;scr",
    "E4TN|E4TN|b|0|204|409|2022|2027|toyota;lexus;subaru|ev",
    "G16E|G16E|e|1618|261|305|2020|2027|toyota|turbo;perf",
    "HR13|HR13|e|1332|140|159|2019|2027|nissan;infiniti|turbo",
    "KR20|KR20|e|1997|268|269|2018|2027|nissan;infiniti|turbo;vc",
    "KR15|KR15|h|1497|190|214|2021|2027|nissan|erev",
    "EM57|EM57|b|0|110|218|2010|2026|nissan|ev",
    "L15B|L15B|e|1498|182|194|2016|2023|honda;acura|turbo;gdi",
    "LFB|LFB;LFAP;LEB;LEB2|h,p|1498|109|185|2015|2027|honda|hev",
    "K20C|K20C|e|1996|272|356|2017|2027|honda;acura|turbo;perf",
    "PE|PE;PE2;PY;P5|e|1496|120|195|2012|2027|mazda|gdi;skyactiv",
    "SKX|SKX|e|1998|180|187|2019|2027|mazda|skyactiv",
    "SH|SH;SKD33|d|2191|150|255|2012|2027|mazda|diesel;scr",
    "G4FP|G4FP;G4LF;G4LD;G3LC;G4LA|e|998|67|199|2014|2027|hyundai;kia|turbo;gdi",
    "G4FT|G4FT;G4FTP|h,p|1598|215|266|2020|2027|hyundai;kia|hev;phev",
    "G4KH|G4KH|e|1998|250|281|2017|2027|hyundai;kia|turbo;theta",
    "D4HB|D4HB;D4FB;D4HC|d|1582|110|211|2012|2027|hyundai;kia|diesel;scr",
    "EGMP|EGMP|b|0|170|651|2021|2027|hyundai;kia;genesis|ev800",
    "AJ200D|AJ200D|d|1999|163|251|2015|2027|landrover;jaguar|diesel;scr",
    "AJ200P|AJ200P|e|1997|200|301|2015|2027|landrover;jaguar|turbo",
    "AJV8|AJV8|e|4999|450|576|2012|2024|landrover;jaguar|v8",
    "LGEV|LGEV|b|0|120|697|2016|2026|jaguar;hyundai;kia;chevrolet|ev",
    "MJ16|MJ16;MJ13;MJ20;MJ23|d|1248|95|181|2014|2027|fiat;jeep;alfa;opel|diesel;scr",
    "TJET|TJET|e|1368|145|181|2016|2024|abarth;fiat|turbo",
    "GME|GME;EC1|e|1995|200|281|2016|2027|alfa;jeep|turbo",
    "690T|690T|e|2891|510|541|2016|2027|alfa|v6;perf",
    "E500|E500;EABA;EALF|b|0|95|281|2020|2027|fiat;abarth;alfa|ev",
    "FF4XE|FF4XE;FFPHEV|p|1332|190|289|2020|2027|jeep;alfa;dodge|phev",
    "9A2|9A2|e|2981|385|651|2012|2027|porsche|flat6;turbo",
    "EA825|EA825;EA825L;EA825P|e,p|3996|470|801|2017|2027|porsche;lamborghini;audi|v8",
    "FERV8|FERV8|e|3855|620|721|2017|2027|ferrari|v8;turbo",
    "FERV6P|FERV6P|p|2992|830|1001|2019|2027|ferrari|v6;phev",
    "LAMV10|LAMV10|e|5204|610|641|2012|2024|lamborghini|v10",
    "NETTUNO|NETTUNO;GMEM|e,h|1995|300|631|2016|2027|maserati|v6;perf",
    "B4204T|B4204T;B4204TP;D4204T|h,p,d|1969|150|456|2015|2027|volvo|mhev;phev",
    "EVV|EVV;SPA2;PST|b|0|231|518|2020|2027|volvo;polestar|ev",
    "FB20|FB20;FB25;FA24|h,e|1995|150|235|2012|2027|subaru;toyota|boxer;hev",
    "4N15|4N15;4N16|d|2268|150|185|2015|2027|mitsubishi|diesel",
    "4B12P|4B12P|p|2360|224|307|2012|2027|mitsubishi|phev",
    "K14D|K14D;K12C;K14C;K15C|h,e|1242|83|141|2015|2027|suzuki|mhev",
    "SQRF4J16|SQRF4J16;SQRF4J20;SQRE4T15|e|1498|147|262|2023|2027|chery;omoda;jaecoo;jetour;exeed;mg;geely;haval|turbo;gdi",
    "GW4B15|GW4B15;GW4C20;GW4C20T|e|1499|143|253|2020|2027|haval;geely;tank|turbo",
    "GWMPHEV|GWMPHEV;GWMHEV|h,p|1499|244|518|2022|2027|haval;tank;chery;geely|phev",
    "EBY|EBY;EBYS|b|0|95|531|2022|2027|byd;denza|ev;blade",
    "DMI|DMi|p|1498|218|429|2024|2027|byd;denza|phev",
    "EMG|EMG;EMGX|b|0|143|511|2019|2027|mg;roewe;maxus|ev",
    "SEAE|SEAE|b|0|272|647|2023|2027|zeekr;geely|ev",
    "XPEV|XPEV|b|0|276|552|2020|2027|xpeng|ev",
    "NIOEV|NIOEV|b|0|489|654|2022|2027|nio|ev",
    "LIREV|LIREV;LREEV|p|1496|218|545|2022|2027|liauto;leapmotor|erev",
    "LPEV|LPEV;LPEVS|b|0|95|219|2023|2027|leapmotor|ev",
    "GWMEV|GWMEV;GWMEVS|b|0|171|409|2023|2027|ora|ev",
    "HQE|HQE|b|0|344|552|2020|2027|hongqi|ev",
    "XIAE|XIAE;XIAE2|b|0|299|1549|2024|2027|xiaomi|ev",
    "VFE|VFE|b|0|134|544|2023|2027|vinfast|ev",
    "D22DT|D22DT|d|2157|202|203|2017|2027|kgm|diesel",
    "G15T|G15T|e|1497|163|164|2019|2027|kgm|turbo",
    "GT10|GT10|e|999|80|125|2017|2027|*|turbo",
    "GT15|GT15|e|1498|120|180|2017|2027|*|turbo",
    "GT20|GT20|e|1998|180|330|2017|2027|*|turbo",
    "TD15|TD15|d|1499|90|140|2017|2026|*|scr",
    "TD20|TD20|d|1997|140|215|2017|2027|*|scr",
    "HY15|HY15|h|1498|110|160|2019|2027|*|hev",
    "HY25|HY25|h|2487|180|260|2018|2027|*|hev",
    "PH20|PH20|p|1998|200|320|2019|2027|*|phev",
    "EV15|EV15|b|0|90|180|2019|2027|*|ev",
    "EV20|EV20|b|0|190|260|2020|2027|*|ev",
    "EV30|EV30|b|0|280|700|2021|2027|*|ev",
    "GEN|GEN|e|1598|90|160|2017|2027|*|generic"
  ];

  var RECS = [];
  var BYALIAS = {};
  ROWS.forEach(function (row) {
    var f = row.split("|");
    if (f.length < 10) { return; }
    var rec = {
      id: K(f[0]),
      aliases: f[1].split(";").map(K).filter(Boolean),
      fuels: f[2].split(","),
      cyl: N(f[3], 0),
      hp0: N(f[4], 0),
      hp1: N(f[5], 3000),
      y0: N(f[6], 2010),
      y1: N(f[7], 2027),
      brands: f[8].split(";").map(K).filter(Boolean),
      tech: f[9].split(";").map(K).filter(Boolean)
    };
    RECS.push(rec);
    rec.aliases.forEach(function (a) { BYALIAS[a] = rec; });
    BYALIAS[rec.id] = rec;
  });

  function canon(code) {
    var k = K(code);
    if (!k) { return null; }
    if (BYALIAS[k]) { return BYALIAS[k]; }
    var i;
    for (i = 0; i < RECS.length; i++) {
      var r = RECS[i];
      var j;
      for (j = 0; j < r.aliases.length; j++) {
        var a = r.aliases[j];
        if (a.length >= 4 && (k.indexOf(a) === 0 || a.indexOf(k) === 0)) { return r; }
      }
    }
    return null;
  }
  function key(code) {
    var r = canon(code);
    return r ? r.id : K(code);
  }
  function same(a, b) {
    if (!a || !b) { return false; }
    return key(a) === key(b);
  }
  function info(code) { return canon(code); }
  function years(code) {
    var r = canon(code);
    return r ? [r.y0, r.y1] : null;
  }
  function brands(code) {
    var r = canon(code);
    return r ? r.brands : [];
  }
  function tech(code) {
    var r = canon(code);
    return r ? r.tech : [];
  }
  function hpOk(code, hp) {
    var r = canon(code);
    if (!r) { return true; }
    return hp >= r.hp0 * 0.85 && hp <= r.hp1 * 1.1;
  }
  W.MD_FAM = {
    recs: RECS, canon: canon, key: key, same: same, info: info,
    years: years, brands: brands, tech: tech, hpOk: hpOk
  };
  W.__MD_SCRIPTS = W.__MD_SCRIPTS || {};
  W.__MD_SCRIPTS.fam = true;
})();
