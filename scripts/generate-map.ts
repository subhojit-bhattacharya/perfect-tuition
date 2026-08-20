#!/usr/bin/env -S npx tsx
/**
 * Generates the static OpenStreetMap image committed at
 * `site/public/map-dum-dum-park.png` (#10).
 *
 * Why a committed image and not an embed:
 *   - A Google Maps iframe is third-party Google JavaScript that contacts Google
 *     and can set cookies **on load, before any interaction**. That contradicts
 *     the no-third-party-tracker rule, which is flat and non-waivable because
 *     s.9(3) bans behavioural monitoring of children.
 *   - OpenStreetMap rather than Google's Static Maps API because that API's terms
 *     restrict storing and caching its imagery, and committing a PNG to a public
 *     repository is exactly that.
 *
 * Run once, commit the result. This is not part of the site build — the OSM tile
 * servers' usage policy asks for bulk downloading to be avoided, and a build that
 * hit them on every deploy would be exactly that.
 *
 *   npx tsx scripts/generate-map.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { REPO_ROOT } from "../api/src/config.js";
import { BUSINESS } from "../site/src/data/business.js";

const ZOOM = 16;
const TILE = 256;
/** 3x2 tiles = 768x512, enough context to place the pin on the road network. */
const COLS = 3;
const ROWS = 2;

const OUT = join(REPO_ROOT, "site", "public", "map-dum-dum-park.png");

function lonToTile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function latToTile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

async function fetchTile(x: number, y: number, z: number): Promise<Buffer> {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const res = await fetch(url, {
    headers: {
      // The tile usage policy requires an identifying User-Agent.
      "User-Agent": "perfect-tuition-site/1.0 (https://perfect-tuition.co.in)",
    },
  });
  if (!res.ok) throw new Error(`Tile ${z}/${x}/${y} returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const centreX = lonToTile(BUSINESS.geo.longitude, ZOOM);
const centreY = latToTile(BUSINESS.geo.latitude, ZOOM);

const startX = Math.floor(centreX) - Math.floor(COLS / 2);
const startY = Math.floor(centreY) - Math.floor(ROWS / 2);

console.log(
  `Fetching ${COLS * ROWS} tiles at zoom ${ZOOM} around ` +
    `${BUSINESS.geo.latitude}, ${BUSINESS.geo.longitude}…`,
);

const tiles: { x: number; y: number; data: Buffer }[] = [];
for (let dy = 0; dy < ROWS; dy++) {
  for (let dx = 0; dx < COLS; dx++) {
    const x = startX + dx;
    const y = startY + dy;
    tiles.push({ x: dx, y: dy, data: await fetchTile(x, y, ZOOM) });
    // Be a polite client.
    await new Promise((r) => setTimeout(r, 250));
  }
}

// Where the pin sits within the stitched image, in pixels.
const pinX = Math.round((centreX - startX) * TILE);
const pinY = Math.round((centreY - startY) * TILE);

const canvas = new PNG({ width: COLS * TILE, height: ROWS * TILE });

for (const tile of tiles) {
  const decoded = PNG.sync.read(tile.data);
  PNG.bitblt(decoded, canvas, 0, 0, TILE, TILE, tile.x * TILE, tile.y * TILE);
}

// Posterise before drawing the pin. OSM's carto style uses a narrow, flat
// palette, so collapsing near-identical shades costs nothing visible and roughly
// halves the file — which matters on the phone connections this site is read on.
posterise(canvas, 16);
drawPin(canvas, pinX, pinY);

const png = PNG.sync.write(canvas, { deflateLevel: 9 });
writeFileSync(OUT, png);
console.log(`Wrote ${OUT} (${(png.length / 1024).toFixed(0)} KB), pin at ${pinX},${pinY}.`);

/** Snaps each channel to `step`-sized buckets, lengthening the runs deflate sees. */
function posterise(image: PNG, step: number): void {
  for (let i = 0; i < image.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const value = image.data[i + channel]!;
      image.data[i + channel] = Math.min(255, Math.round(value / step) * step);
    }
  }
}

/** A filled circle with a white ring, drawn straight into the pixel buffer. */
function drawPin(image: PNG, cx: number, cy: number): void {
  const RADIUS = 9;
  const RING = 12;

  for (let y = cy - RING; y <= cy + RING; y++) {
    for (let x = cx - RING; x <= cx + RING; x++) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;

      const distance = Math.hypot(x - cx, y - cy);
      if (distance > RING) continue;

      const index = (image.width * y + x) << 2;
      // Brand blue inside, white ring around it so the pin reads on any tile.
      const [r, g, b] = distance <= RADIUS ? [37, 99, 235] : [255, 255, 255];
      image.data[index] = r!;
      image.data[index + 1] = g!;
      image.data[index + 2] = b!;
      image.data[index + 3] = 255;
    }
  }
}
