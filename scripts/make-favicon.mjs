// @ts-check
/**
 * Draw the tab icon, as a PNG and as a real .ico.
 *
 * Two separate faults made the tab look empty.
 *
 * `/favicon.ico` answered 404. Browsers request that path by default whatever
 * the document declares, and the document declared only an SVG — which Safari
 * and several others will not use as a tab icon at all. The console QA even had
 * an ignore rule for the resulting 404, which is the shape of a check being
 * taught to accept a defect.
 *
 * And the mark itself was a `#e8eaed` square: light grey on Chrome's light tab
 * strip, which is also light grey. Where the SVG did render, it rendered
 * invisibly. The ground is now the ink colour, so the mark reads on a light
 * strip and on a dark one.
 *
 * Rasterised here rather than committed as an opaque binary, so the icon has a
 * source. Supersampled 4x for edges; the geometry is the caliper arc from
 * `public/favicon.svg`, kept deliberately heavy because at 32 pixels a fine
 * stroke is a grey smudge.
 *
 *   node scripts/make-favicon.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 32;
const SS = 4; // supersampling factor

const INK = [0x1b, 0x1e, 0x24]; // ground
const MARK = [0xe8, 0xea, 0xed]; // the arc
const ACCENT = [0xc8, 0x10, 0x2e]; // the upper jaw

/** Distance from a point to a line segment, for stroked paths. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Colour one sample, in the 100x100 space the SVG uses.
 *
 * Returns null for "ground". The arc is the same open circle as the SVG: centre
 * (50,50), radius 30, left-hand three quarters, with the two jaws running right.
 */
function sample(x, y) {
  const half = 4.5; // half of the 9-unit stroke

  // The two jaws first: they sit on top of the arc where they meet it.
  if (distanceToSegment(x, y, 68, 28, 90, 28) <= half) return ACCENT;
  if (distanceToSegment(x, y, 68, 72, 90, 72) <= half) return MARK;

  // The open arc: inside the annulus, and not in the right-hand opening.
  const dx = x - 50;
  const dy = y - 50;
  const radius = Math.hypot(dx, dy);
  if (Math.abs(radius - 30) <= half) {
    const openingHalfHeight = 22;
    const inOpening = dx > 0 && Math.abs(dy) < openingHalfHeight;
    if (!inOpening) return MARK;
  }
  return null;
}

/** RGBA pixels, supersampled and composited onto the ground. */
function render() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const ux = ((x + (sx + 0.5) / SS) / SIZE) * 100;
          const uy = ((y + (sy + 0.5) / SS) / SIZE) * 100;
          const colour = sample(ux, uy) ?? INK;
          r += colour[0];
          g += colour[1];
          b += colour[2];
        }
      }
      const samples = SS * SS;
      const offset = (y * SIZE + x) * 4;
      pixels[offset] = Math.round(r / samples);
      pixels[offset + 1] = Math.round(g / samples);
      pixels[offset + 2] = Math.round(b / samples);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

/** Minimal PNG writer: one IHDR, one IDAT, one IEND. */
function toPng(pixels) {
  const crcTable = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc = (buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, checksum]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // Each scanline is prefixed with its filter type; 0 is "none".
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (SIZE * 4 + 1)] = 0;
    pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO wrapping the PNG. The format has allowed a PNG payload since Vista. */
function toIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry[0] = SIZE; // width
  entry[1] = SIZE; // height
  entry[2] = 0; // palette size
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32BE(0, 8);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset to the payload

  return Buffer.concat([header, entry, png]);
}

const pixels = render();
const png = toPng(pixels);
writeFileSync("public/favicon-32.png", png);
writeFileSync("public/favicon.ico", toIco(png));
console.log(`wrote public/favicon-32.png (${png.length} bytes) and public/favicon.ico`);
