// Dear Data — QR Hours: dataset + QR matrix generator.
// The QR encodes the postcard message; each dark module holds one hour of the
// (simulated) field record, chronological in reading order. Dark-module count
// determines the record length, so the sculpture and the code are the same object.
import QRCode from 'qrcode';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pass custom content as argv (e.g. a WeChat contact URL):
//   node scripts/generate.mjs "https://u.wechat.com/XXXX"
const MESSAGE = process.argv[2] || 'Dear Data: each block is one hour of my QR-code life. -Paul';
const qr = QRCode.create(MESSAGE, { errorCorrectionLevel: 'Q' });
const size = qr.modules.size;
const bits = qr.modules.data; // Uint8Array, row-major, 1 = dark

let darkCount = 0;
const rows = [];
for (let r = 0; r < size; r++) {
  let row = '';
  for (let c = 0; c < size; c++) {
    const d = bits[r * size + c] ? 1 : 0;
    darkCount += d;
    row += d;
  }
  rows.push(row);
}
console.log(`QR v${qr.version} (${size}x${size}), EC Q, dark modules: ${darkCount} -> ${(darkCount / 24).toFixed(1)} days`);

// ---- deterministic RNG ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260810);
function poisson(lambda) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

// ---- record window: darkCount consecutive hours ending 2026-08-10 23:00 local ----
const END = new Date(2026, 7, 10, 23, 0, 0); // Aug 10 2026, 23:00
const H = darkCount;
const START = new Date(END.getTime() - (H - 1) * 3600_000);

// categories: [payment, transit, menu, login, access, docs]
const CATS = ['payment', 'transit', 'menu', 'login', 'access', 'docs'];

function lambdas(date) {
  const h = date.getHours();
  const wd = date.getDay();
  const wk = wd === 0 || wd === 6; // weekend

  const P = [ // payment, by hour 0..23
    .03,.02,.02,.02,.02,.05,.15,.5,.7,.6,.7,1.4,1.8,1.2,.7,.9,.6,.8,1.5,1.4,1.0,.8,.4,.15];
  const T = wk
    ? [.02,.01,.01,.01,.01,.02,.05,.1,.25,.45,.7,.7,.5,.45,.5,.5,.45,.5,.55,.5,.55,.6,.35,.1]
    : [.02,.01,.01,.01,.01,.03,.3,1.6,2.0,.9,.3,.25,.25,.25,.25,.3,.4,1.1,1.7,.9,.3,.2,.2,.05];
  const M = [0,0,0,0,0,0,.02,.08,.15,.2,.35,.7,1.3,.6,.2,.15,.2,.5,1.0,1.2,.6,.3,.12,.04];
  const L = [.05,.03,.02,.02,.02,.03,.08,.2,.3,.35,.35,.35,.35,.35,.35,.35,.35,.4,.45,.55,.55,.55,.4,.15];
  const A = wk
    ? [.02,.01,0,0,0,0,.02,.05,.1,.15,.4,.2,.15,.15,.15,.15,.15,.15,.2,.2,.3,.25,.1,.03]
    : [.02,.01,0,0,0,0,.05,.3,.8,.5,.15,.12,.3,.3,.12,.12,.15,.4,.7,.25,.3,.5,.15,.03];
  const D = wk
    ? [.02,.01,0,0,0,0,.01,.02,.05,.1,.15,.15,.15,.2,.35,.35,.35,.25,.12,.1,.08,.08,.05,.02]
    : [.02,.01,0,0,0,0,.02,.05,.1,.15,.12,.1,.1,.12,.12,.12,.12,.1,.08,.08,.1,.1,.06,.02];

  let pay = P[h], men = M[h];
  if (wk) {
    if (h >= 7 && h <= 9) pay *= 0.4;
    if (h >= 13 && h <= 17) pay *= 1.3;
    if (h >= 21 && h <= 23) pay *= 1.4;
    if (h === 10 || h === 11) men += 0.5; // brunch
  }
  return [pay, T[h], men, L[h], A[h], D[h]];
}

// ---- build hours ----
const hours = [];
for (let i = 0; i < H; i++) {
  const t = new Date(START.getTime() + i * 3600_000);
  const lam = lambdas(t);
  hours.push(lam.map(poisson));
}

const idxOf = (mo, day, hh) => {
  const t = new Date(2026, mo, day, hh, 0, 0);
  return Math.round((t.getTime() - START.getTime()) / 3600_000);
};
const bump = (i, cat, n) => { if (i >= 0 && i < H) hours[i][cat] += n; };

// ---- story hours (Dear Data annotations) ----
const notes = [];

// Sat Aug 1 — Hangzhou day trip
bump(idxOf(7, 1, 8), 1, 5); bump(idxOf(7, 1, 8), 4, 2);
bump(idxOf(7, 1, 9), 1, 2);
bump(idxOf(7, 1, 14), 5, 3); bump(idxOf(7, 1, 14), 0, 1);
bump(idxOf(7, 1, 18), 1, 3);
notes.push({ i: idxOf(7, 1, 8), title: 'The Hangzhou trip', text: 'High-speed rail to Hangzhou: ticket, two station gates, a seat check, then a rental bike at West Lake.' });

// Fri Jul 31 — hotpot night
bump(idxOf(6, 31, 19), 2, 4); bump(idxOf(6, 31, 19), 0, 3); bump(idxOf(6, 31, 20), 0, 2);
notes.push({ i: idxOf(6, 31, 19), title: 'Hotpot arithmetic', text: 'Dinner with friends. The menu, the extra napkins, the bill, and the group split were all QR codes.' });

// Tue Aug 4, 00:00 — visa paperwork
bump(idxOf(7, 4, 0), 5, 4); bump(idxOf(7, 4, 0), 3, 2);
notes.push({ i: idxOf(7, 4, 0), title: 'Midnight paperwork', text: 'Could not sleep, so I scanned my way through visa document uploads at midnight.' });

// Sun Aug 9 — typhoon rain, delivery day
bump(idxOf(7, 9, 12), 0, 2); bump(idxOf(7, 9, 19), 0, 3); bump(idxOf(7, 9, 19), 3, 2);
notes.push({ i: idxOf(7, 9, 19), title: 'Typhoon dinner', text: 'Heavy rain all day. Three food deliveries; even the pickup locker wanted a scan.' });

// ---- stats ----
const totals = hours.map(a => a.reduce((s, v) => s + v, 0));
const total = totals.reduce((s, v) => s + v, 0);
let busiestI = 0;
totals.forEach((v, i) => { if (v > totals[busiestI]) busiestI = i; });
const catTotals = CATS.map((_, c) => hours.reduce((s, a) => s + a[c], 0));
const daySet = new Set();
for (let i = 0; i < H; i++) daySet.add(new Date(START.getTime() + i * 3600_000).toDateString());
const days = daySet.size;
const maxCount = Math.max(...totals);

const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const stats = {
  total, days, maxCount,
  dailyAvg: +(total / (H / 24)).toFixed(1),
  busiest: { i: busiestI, count: totals[busiestI] },
  catTotals,
  rangeLabel: `${fmt(START)} – ${fmt(END)} 2026`,
};
console.log('total scans:', total, '| days:', days, '| max hour:', maxCount, '| busiest:', new Date(START.getTime() + busiestI * 3600_000).toString());
console.log('category totals:', Object.fromEntries(CATS.map((c, i) => [c, catTotals[i]])));

const out = `// Generated by scripts/generate.mjs — do not edit by hand.
window.QR_DATA = ${JSON.stringify({
  message: MESSAGE,
  size,
  rows,
  darkCount,
  startISO: START.toISOString(),
  cats: CATS,
  hours,
  notes,
  stats,
})};
`;
writeFileSync(join(__dirname, '..', 'data.js'), out);
console.log('wrote data.js');
