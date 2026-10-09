import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";

function hiba(uzenet) {
  throw new Error(uzenet);
}
function helyekListaja(leiras) {
  const szamok = [];
  for (const resz of leiras.split(",")) {
    const m = resz.trim().match(/^(\d+)(?:-(\d+)(?:\/(\d+))?)?$/);
    if (!m)
      hiba(`Hib\xE1s helyle\xEDr\xE1s: "${resz.trim()}"`);
    const eleje = Number(m[1]);
    const vege = Number(m[2] || m[1]);
    const lepes = Number(m[3] || 1);
    for (let i = eleje;i <= vege; i += lepes)
      szamok.push(i);
  }
  return szamok;
}
var tort = function(s) {
  const [szamlalo, nevezo] = s.split("/");
  return nevezo === undefined ? Number(szamlalo) : Number(szamlalo) / Number(nevezo);
};
function beolvasElrendezes(szoveg, nev) {
  const sorok = [];
  const inaktiv = new Set;
  const kilogo = new Set;
  const kihagyott = new Set;
  const nevek = [];
  for (const nyers of szoveg.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const sor = nyers.split("#")[0].trim();
    if (!sor)
      continue;
    const m = sor.match(/^(inakt[ií]v|kil[óo]g[óo]|kihagyott sor|m[áa]s n[ée]v):(.*)$/i);
    if (m) {
      const kulcs = m[1].toLowerCase();
      if (kulcs.startsWith("inakt"))
        helyekListaja(m[2]).forEach((x) => inaktiv.add(x));
      else if (kulcs.startsWith("kil"))
        helyekListaja(m[2]).forEach((x) => kilogo.add(x));
      else if (kulcs.startsWith("kihagy"))
        helyekListaja(m[2]).forEach((x) => kihagyott.add(x));
      else
        m[2].split(",").map((x) => x.trim()).filter((x) => x).forEach((x) => nevek.push(x));
      continue;
    }
    const cellak = [];
    for (const resz of sor.split(/\s+/)) {
      if (resz === "|") {
        cellak.push(null);
        continue;
      }
      if (resz === ".") {
        cellak.push({ jel: ".", w: 1 });
        continue;
      }
      const j = resz.match(/^([+*])(\d+(?:\.\d+)?(?:\/\d+)?)$/);
      if (j) {
        cellak.push({ jel: j[1], w: tort(j[2]) });
        continue;
      }
      const t = resz.match(/^(\d+)(?:-(\d+))?$/);
      if (!t)
        hiba(`Hib\xE1s elem a ${nev} terem le\xEDr\xE1s\xE1ban: "${resz}"`);
      const eleje = Number(t[1]);
      const vege = Number(t[2] || t[1]);
      const irany = vege >= eleje ? 1 : -1;
      for (let i = eleje;i !== vege + irany; i += irany)
        cellak.push(i);
    }
    sorok.push(cellak);
  }
  const szekek = [].concat(...sorok).filter((c) => typeof c === "number");
  const latott = new Set;
  const duplikalt = new Set;
  for (const c of szekek)
    (latott.has(c) ? duplikalt : latott).add(c);
  if (duplikalt.size)
    hiba(`${nev}: ezek a sz\xE9kek t\xF6bbsz\xF6r szerepelnek: ${Array.from(duplikalt).sort((a, b) => a - b).slice(0, 10).join(", ")}`);
  for (const [cimke, halmaz] of [["inakt\xEDv", inaktiv], ["kil\xF3g\xF3", kilogo]]) {
    const nemLetezo = Array.from(halmaz).filter((c) => !latott.has(c)).sort((a, b) => a - b);
    if (nemLetezo.length)
      hiba(`${nev}: ezek a(z) ${cimke} sz\xE9kek nincsenek a sorokban: ${nemLetezo.slice(0, 10).join(", ")}`);
  }
  if (!szekek.length)
    hiba(`${nev}: a terem le\xEDr\xE1s\xE1ban nincs egy sz\xE9k sem.`);
  return { sorok, inaktiv, kilogo, kihagyott, nevek };
}
function blokkok(sor) {
  const b = [[]];
  let lepes = 1;
  for (const c of sor) {
    if (c === null)
      b.push([]);
    else if (typeof c === "number")
      b[b.length - 1].push({ szek: c, w: lepes });
    else if (c.jel === "*")
      lepes = c.w;
    else
      b[b.length - 1].push({ szek: null, w: c.w * (c.jel === "." ? lepes : 1) });
  }
  return b.filter((x) => x.length);
}
var g = function(x) {
  return String(Number(x.toPrecision(6)));
};
function svgTerkep(sorok, inaktiv, foglalt = new Set) {
  const SZ = 16, M = 14, KOZ = 4, LEPCSO = 18, FELSO = 30, MARGO = 18;
  const szel = (blokk) => blokk.reduce((s, e) => s + e.w, 0);
  const belso = Math.max(...sorok.map((s) => {
    const b = blokkok(s);
    return b.reduce((x, bl) => x + szel(bl), 0) * SZ + LEPCSO * (b.length - 1);
  }));
  const w = belso + 2 * MARGO;
  const h = FELSO + sorok.length * (M + KOZ) + 10;
  const elemek = [
    `<rect x="${g(w / 4)}" y="4" width="${g(w / 2)}" height="14" rx="3" fill="#888"/>` + `<text x="${g(w / 2)}" y="11" text-anchor="middle" dominant-baseline="central" font-size="9" letter-spacing="1" fill="#fff">T\xC1BLA</text>`
  ];
  sorok.forEach((sor, idx) => {
    const i = idx + 1;
    const b = blokkok(sor);
    const res = (belso - b.reduce((x2, bl) => x2 + szel(bl), 0) * SZ) / Math.max(b.length - 1, 1);
    let x = MARGO;
    const y = FELSO + (i - 1) * (M + KOZ);
    for (const [sx, horgony] of [[MARGO - 5, "end"], [w - MARGO + 5, "start"]]) {
      elemek.push(`<text class="sorszam" x="${g(sx)}" y="${g(y + M / 2)}" text-anchor="${horgony}" dominant-baseline="central"` + ` font-size="7" font-weight="400" fill="#999">${i}</text>`);
    }
    for (const blokk of b) {
      for (const { szek: c, w: wd } of blokk) {
        if (c !== null) {
          const sw = wd * SZ - 1;
          let osztaly = "", halvany = "", xJel = "";
          if (inaktiv.has(c)) {
            osztaly = ' class="inaktiv"';
            halvany = ' opacity="0.4"';
            xJel = `<path d="M${x.toFixed(2)} ${y}L${(x + sw).toFixed(2)} ${y + M}M${(x + sw).toFixed(2)} ${y}L${x.toFixed(2)} ${y + M}"` + ` stroke="#1f2328" stroke-width="1.2" stroke-linecap="round"/>`;
          } else if (foglalt.has(c)) {
            osztaly = ' class="foglalt"';
          }
          elemek.push(`<g data-szek="${c}" data-sor="${i}"${osztaly}><rect x="${x.toFixed(2)}" y="${y}" width="${sw.toFixed(2)}" height="${M}" rx="2" fill="#e4e7eb"/>` + `<text x="${(x + sw / 2).toFixed(2)}" y="${g(y + M / 2)}" text-anchor="middle" dominant-baseline="central"` + ` font-size="${Math.min(c < 100 ? 7.5 : 6.4, 0.5 * sw).toFixed(2)}" fill="#1f2328"${halvany}>${c}</text>${xJel}</g>`);
        }
        x += wd * SZ;
      }
      x += res;
    }
  });
  return `<svg class="terkep" viewBox="0 0 ${g(w)} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif" font-weight="600" letter-spacing="-0.15">${elemek.join("")}</svg>`;
}
function beepit(regi, u) {
  if (!/^[a-z0-9_-]+$/.test(u.zh))
    hiba(`Hib\xE1s ZH azonos\xEDt\xF3: ${u.zh}`);
  if (!u.terem)
    hiba("Hi\xE1nyzik a terem neve.");
  const elr = beolvasElrendezes(u.elrendezes, u.terem);
  const letezo = new Set([].concat(...elr.sorok).filter((c) => typeof c === "number"));
  const adat = regi || { cim: u.cim, salt: u.zh, helyek: {}, terkepek: {} };
  if (adat.salt !== u.zh)
    hiba(`A ${u.zh} ZH salt \xE9rt\xE9ke nem a ZH azonos\xEDt\xF3ja, ezt a ZH-t nem lehet b\u0151v\xEDteni.`);
  for (const [hash, hely] of Object.entries(adat.helyek))
    if (hely[0] === u.terem)
      delete adat.helyek[hash];
  for (const [hash, szek] of Object.entries(u.helyek)) {
    if (!/^[0-9a-f]{16}$/.test(hash))
      hiba(`Hib\xE1s hash: ${hash}`);
    if (!letezo.has(szek))
      hiba(`${u.terem}: nincs ${szek}. sz\xE9k.`);
    adat.helyek[hash] = [u.terem, szek];
  }
  adat.cim = u.cim;
  adat.terkepek[u.terem] = svgTerkep(elr.sorok, elr.inaktiv);
  return adat;
}

var uzenet = JSON.parse(process.env.UZENET || "{}");
if (!/^[a-z0-9_-]+$/.test(uzenet.zh || ""))
  hiba(`Hib\xE1s ZH azonos\xEDt\xF3: ${uzenet.zh}`);
var fajl = `zh/${uzenet.zh}.json`;
var regi = existsSync(fajl) ? JSON.parse(readFileSync(fajl, "utf8")) : null;
var adat = beepit(regi, uzenet);
mkdirSync("zh", { recursive: true });
writeFileSync(fajl, JSON.stringify(adat));
console.log(`${fajl}: ${uzenet.terem}, ${Object.keys(uzenet.helyek).length} f\u0151. Termek: ${Object.keys(adat.terkepek).join(", ")}`);
