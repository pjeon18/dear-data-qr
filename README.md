# 扫一扫 — A Dear Data postcard

A [Dear Data](http://www.dear-data.com/)-style personal data project about living
inside QR codes in China. For 29 days (simulated), every scanned QR code was
tallied hourly: payments, train gates, menus, logins, door access, documents.

**The visualization is itself a working QR code.** A real QR code (version 5,
error correction Q) encodes the postcard's message; each of its 682 dark modules
holds one hour of the record, chronological in reading order, extruded to the
height of that hour's scan count. Rotate it and it's a data sculpture; view it
from above ("Scan me") and a phone camera decodes it.

## Run

```bash
python3 -m http.server 5250
# → http://localhost:5250
```

No build step. Three.js r128 is vendored in `vendor/`.

## Regenerate the dataset

```bash
npm install        # once — qrcode (generator) + jsqr (self-test)
node scripts/generate.mjs
```

`scripts/generate.mjs` builds the QR matrix from the message, then simulates one
hour of data per dark module (seeded RNG, so output is reproducible): Poisson
draws per category with commute/lunch/dinner rhythms and weekend shifts.
Writes `data.js`.

Changing the message changes the QR geometry — dark-module count = hours of
data — so the record length adapts automatically. Pass custom content (e.g. a
WeChat contact URL) as an argument:

```bash
node scripts/generate.mjs "https://u.wechat.com/XXXX"
```

## Views

- **Sculpture / Scan me** — orbit view vs. top-down dolly-zoom. In scan view the
  bar footprints close to a solid grid, the HUD fades, and the code becomes
  machine-readable (verified with jsQR against the true perspective render —
  run `ddVerify()` in the console to re-check).
- **Ink / By purpose** — monochrome, or whole bars (tops included) colored by
  each hour's dominant purpose (Paying / Getting around / Food & menus /
  Everything else). Scan view always forces pure black so the code reads.
  Hovering a legend entry lifts that entire purpose group out of the sculpture.
- **Chronology / By height** — hours in diary order, or the same values
  re-dealt across the grid sorted tallest-to-flattest (the QR pattern never
  moves, so it still scans).
- Hover a bar for the hour's breakdown. Drag to orbit, scroll to zoom;
  dragging in scan view returns to the sculpture.

## Notes

- The dataset is synthetic — written as if hand-collected, in the Dear Data
  spirit, but generated (`scripts/generate.mjs` is the honest source).
- Categorical palette (blue/orange/aqua + neutral) validated with the dataviz
  skill's checker on pure white, all-pairs mode.
