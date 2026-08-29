/**
 * sevenSeg.ts — a deterministic seven-segment display decoder.
 *
 * Tesseract (even with a seven-segment model) is unreliable on a photographed
 * digital display: glare, low contrast and the segment GAPS all throw it off.
 * But seven-segment digits are rigidly structured, so we can read them directly:
 * binarise → split into digit boxes → test which of the 7 segments are lit →
 * map the lit pattern to a digit.
 *
 * This module is PURE (operates on a binary mask, no DOM) so the engine tests
 * can exercise it. The canvas → mask bridge lives in ocr.ts.
 *
 *      a
 *    ┌───┐
 *  f │   │ b
 *    ├─g─┤
 *  e │   │ c
 *    └───┘
 *      d
 */

/** A binary ink mask: data[y*w + x] === 1 where a lit segment is. */
export interface SegMask {
  data: Uint8Array;
  w: number;
  h: number;
}

// Lit-segment patterns in order [a, b, c, d, e, f, g].
const DIGIT_PATTERNS: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Ink count per column, over the whole mask. */
function columnInk(m: SegMask): number[] {
  const cols = new Array(m.w).fill(0);
  for (let y = 0; y < m.h; y++) {
    const row = y * m.w;
    for (let x = 0; x < m.w; x++) if (m.data[row + x]) cols[x]++;
  }
  return cols;
}

/** Trim a column range vertically to the rows that actually contain ink. */
function rowBounds(m: SegMask, x0: number, x1: number): { y0: number; y1: number } {
  let y0 = -1;
  let y1 = -1;
  for (let y = 0; y < m.h; y++) {
    let any = false;
    const row = y * m.w;
    for (let x = x0; x <= x1; x++) {
      if (m.data[row + x]) {
        any = true;
        break;
      }
    }
    if (any) {
      if (y0 < 0) y0 = y;
      y1 = y;
    }
  }
  return { y0, y1 };
}

/** Fraction of lit pixels inside a fractional sub-rectangle of a digit box. */
function segFrac(m: SegMask, b: Box, fx0: number, fx1: number, fy0: number, fy1: number): number {
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  const x0 = b.x0 + Math.floor(fx0 * bw);
  const x1 = b.x0 + Math.ceil(fx1 * bw);
  const y0 = b.y0 + Math.floor(fy0 * bh);
  const y1 = b.y0 + Math.ceil(fy1 * bh);
  let lit = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    const row = y * m.w;
    for (let x = x0; x < x1; x++) {
      total++;
      if (m.data[row + x]) lit++;
    }
  }
  return total ? lit / total : 0;
}

/** Decode a single already-cropped digit box. Returns the char or null. */
function decodeDigit(m: SegMask, b: Box): string | null {
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  if (bh < 6) return null; // too small to be a digit

  // A "1" is a lone narrow bar — the zone test is unreliable for it, so key
  // off the aspect ratio instead.
  if (bw / bh < 0.38) return '1';

  const ON = 0.28; // a segment counts as lit above this fill fraction
  const seg = [
    segFrac(m, b, 0.18, 0.82, 0.0, 0.2), // a  top
    segFrac(m, b, 0.68, 1.0, 0.1, 0.48), // b  top-right
    segFrac(m, b, 0.68, 1.0, 0.52, 0.9), // c  bottom-right
    segFrac(m, b, 0.18, 0.82, 0.8, 1.0), // d  bottom
    segFrac(m, b, 0.0, 0.32, 0.52, 0.9), // e  bottom-left
    segFrac(m, b, 0.0, 0.32, 0.1, 0.48), // f  top-left
    segFrac(m, b, 0.18, 0.82, 0.41, 0.59), // g middle
  ].map((v) => (v >= ON ? 1 : 0));

  // Nearest pattern by Hamming distance; accept only a clear, near-exact match.
  let best: string | null = null;
  let bestDist = 99;
  let tie = false;
  for (const [digit, pat] of Object.entries(DIGIT_PATTERNS)) {
    let d = 0;
    for (let i = 0; i < 7; i++) if (pat[i] !== seg[i]) d++;
    if (d < bestDist) {
      bestDist = d;
      best = digit;
      tie = false;
    } else if (d === bestDist) {
      tie = true;
    }
  }
  return bestDist <= 1 && !tie ? best : null;
}

/**
 * Decode a whole seven-segment number from a binary mask.
 * Returns the digit string and whether every glyph decoded cleanly.
 */
export function decodeSevenSegment(m: SegMask): { digits: string; confident: boolean } {
  const cols = columnInk(m);
  const maxCol = Math.max(1, ...cols);
  const active = cols.map((c) => c > maxCol * 0.06); // ignore near-empty columns

  // Group consecutive active columns into candidate glyphs.
  const groups: Box[] = [];
  let start = -1;
  for (let x = 0; x <= m.w; x++) {
    const on = x < m.w && active[x];
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      const { y0, y1 } = rowBounds(m, start, x - 1);
      if (y0 >= 0) groups.push({ x0: start, x1: x - 1, y0, y1 });
      start = -1;
    }
  }
  if (groups.length === 0) return { digits: '', confident: false };

  // Keep only full-height glyphs — this drops the °, a decimal point, a colon.
  const tallest = Math.max(...groups.map((g) => g.y1 - g.y0 + 1));
  const digits = groups.filter((g) => g.y1 - g.y0 + 1 >= tallest * 0.6);

  let out = '';
  let confident = digits.length > 0;
  for (const b of digits) {
    const d = decodeDigit(m, b);
    if (d === null) {
      confident = false;
    } else {
      out += d;
    }
  }
  return { digits: out, confident: confident && out.length > 0 };
}
