/**
 * Draws the PinJar mark into the PNG sizes the manifest asks for.
 *
 * The icon is generated rather than committed as five opaque binaries: the
 * shape lives in one place, a color change is a one-line edit here, and anyone
 * can see what the toolbar icon actually is without opening an image editor.
 *
 * No dependency does the drawing. A jar is two rounded rectangles and three
 * circles, which is a page of arithmetic — far less than the cost of adding an
 * image library to a project that deliberately keeps very few (docs/concept.md
 * §7.4). `zlib` writes the PNG and ships with Node.
 *
 * Run: `node scripts/build-icon.mjs`
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/*
 * The palette, from assets/tailwind.css. The mark uses the light-mode values:
 * a toolbar icon sits on browser chrome we do not control, so it carries its
 * own contrast rather than assuming a background.
 */
const FLAG_RED = [0xc4, 0x20, 0x21];
const CRIMSON_VIOLET = [0x56, 0x16, 0x43];
const GLASS = [0xff, 0xff, 0xff];

/** The mark, in the 24×24 grid the SVG uses. */
const ART = {
  lid: { x: 7, y: 2, w: 10, h: 3, r: 1.3 },
  band: { x: 8.4, y: 4.6, w: 7.2, h: 2, r: 0.3 },
  body: { x: 5, y: 6.6, w: 14, h: 15.4, r: 4 },
  dots: [
    { cx: 9.3, cy: 13, r: 1.5 },
    { cx: 14.2, cy: 11.3, r: 1.5 },
    { cx: 12, cy: 17.2, r: 1.5 },
  ],
};

/*
 * Small sizes are not the large one scaled down. Below about 32px three dots
 * turn into a smudge and a hairline outline disappears, so the small variants
 * drop a dot and thicken the stroke — the same call the design board makes.
 */
const SIZES = [
  { px: 128, stroke: 1.0, dots: 3 },
  { px: 96, stroke: 1.1, dots: 3 },
  { px: 48, stroke: 1.2, dots: 3 },
  { px: 32, stroke: 1.5, dots: 2 },
  { px: 16, stroke: 1.9, dots: 2 },
];

/** Supersampling factor per axis; 4 means 16 samples a pixel. */
const SAMPLES = 4;

/** Distance to a rounded rectangle: negative inside, positive outside. */
function roundedRectDistance(px, py, { x, y, w, h, r }) {
  const halfW = w / 2;
  const halfH = h / 2;
  const radius = Math.min(r, halfW, halfH);
  const dx = Math.abs(px - (x + halfW)) - (halfW - radius);
  const dy = Math.abs(py - (y + halfH)) - (halfH - radius);

  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function circleDistance(px, py, { cx, cy, r }) {
  return Math.hypot(px - cx, py - cy) - r;
}

/**
 * The color at one sample point, or null where the icon is transparent.
 *
 * Painter's order, bottom to top: lid, the band under it, the glass body, the
 * outline around that body, then whatever is inside the jar.
 */
function sampleColor(px, py, { stroke, dots }) {
  for (let index = 0; index < dots; index += 1) {
    if (circleDistance(px, py, ART.dots[index]) <= 0) {
      return CRIMSON_VIOLET;
    }
  }

  const body = roundedRectDistance(px, py, ART.body);
  if (body <= 0) {
    // Inside the outline ring, or in the glass it encloses.
    return body >= -stroke ? FLAG_RED : GLASS;
  }

  if (roundedRectDistance(px, py, ART.lid) <= 0) {
    return FLAG_RED;
  }

  if (roundedRectDistance(px, py, ART.band) <= 0) {
    return FLAG_RED;
  }

  return null;
}

/**
 * Renders one size to RGBA bytes.
 *
 * Color is averaged only over the samples that actually hit something, so an
 * edge pixel takes the shape's color at partial alpha rather than being mixed
 * with transparent black — which is what leaves a dark fringe around a
 * generated icon.
 */
function render({ px, stroke, dots }) {
  const pixels = Buffer.alloc(px * px * 4);
  const step = 24 / px / SAMPLES;
  const origin = 24 / px / SAMPLES / 2;

  for (let y = 0; y < px; y += 1) {
    for (let x = 0; x < px; x += 1) {
      let hits = 0;
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const color = sampleColor(
            (x * 24) / px + origin + sx * step,
            (y * 24) / px + origin + sy * step,
            { stroke, dots },
          );

          if (color !== null) {
            hits += 1;
            r += color[0];
            g += color[1];
            b += color[2];
          }
        }
      }

      const offset = (y * px + x) * 4;
      if (hits > 0) {
        pixels[offset] = Math.round(r / hits);
        pixels[offset + 1] = Math.round(g / hits);
        pixels[offset + 2] = Math.round(b / hits);
        pixels[offset + 3] = Math.round((hits / (SAMPLES * SAMPLES)) * 255);
      }
    }
  }

  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, checksum]);
}

function toPng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha

  // Every scanline is prefixed with its filter type; 0 means "none".
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');
mkdirSync(outputDirectory, { recursive: true });

for (const size of SIZES) {
  const file = join(outputDirectory, `${size.px}.png`);
  writeFileSync(file, toPng(render(size), size.px));
  console.log(`wrote icon/${size.px}.png`);
}
