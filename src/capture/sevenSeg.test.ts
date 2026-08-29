import { describe, it, expect } from 'vitest';
import { decodeSevenSegment, type SegMask } from './sevenSeg';

/** Which segments [a,b,c,d,e,f,g] each digit lights — mirrors a real display. */
const SEG: Record<string, number[]> = {
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

/**
 * Draw a number as thick seven-segment bars into a fresh mask, the inverse of
 * the decoder. Digits are spaced with a clear gap, like a real readout.
 */
function render(num: string, opt: { dw?: number; dh?: number; t?: number; gap?: number } = {}): SegMask {
  const dw = opt.dw ?? 30;
  const dh = opt.dh ?? 54;
  const t = opt.t ?? 6; // segment thickness
  const gap = opt.gap ?? 12;
  const pad = 8;
  const w = pad * 2 + num.length * dw + (num.length - 1) * gap;
  const h = pad * 2 + dh;
  const data = new Uint8Array(w * h);
  const set = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++)
        if (x >= 0 && x < w && y >= 0 && y < h) data[y * w + x] = 1;
  };

  for (let i = 0; i < num.length; i++) {
    const ox = pad + i * (dw + gap);
    const oy = pad;
    const mid = oy + dh / 2;
    const [a, b, c, d, e, f, g] = SEG[num[i]];
    if (a) set(ox + t, oy, ox + dw - t, oy + t);
    if (b) set(ox + dw - t, oy + t, ox + dw, mid);
    if (c) set(ox + dw - t, mid, ox + dw, oy + dh - t);
    if (d) set(ox + t, oy + dh - t, ox + dw - t, oy + dh);
    if (e) set(ox, mid, ox + t, oy + dh - t);
    if (f) set(ox, oy + t, ox + t, mid);
    if (g) set(ox + t, mid - t / 2, ox + dw - t, mid + t / 2);
  }
  return { data, w, h };
}

describe('seven-segment decoder', () => {
  it('reads every single digit', () => {
    for (const d of Object.keys(SEG)) {
      expect(decodeSevenSegment(render(d)).digits).toBe(d);
    }
  });

  it('reads multi-digit aircon temperatures', () => {
    for (const n of ['18', '23', '24', '25', '28', '30', '32', '16']) {
      const r = decodeSevenSegment(render(n));
      expect(r.confident).toBe(true);
      expect(r.digits).toBe(n);
    }
  });

  it('distinguishes 25 (accept) from 23/18 (reject) after range check', () => {
    const read = (n: string) => Number(decodeSevenSegment(render(n)).digits);
    expect(read('25') >= 25 && read('25') <= 32).toBe(true);
    expect(read('23') >= 25).toBe(false);
    expect(read('18') >= 25).toBe(false);
  });

  it('ignores a small mark (like a degree sign) beside the number', () => {
    // Render "25" then poke a tiny 3x3 blob up high to the right (a ° sign).
    const m = render('25');
    for (let y = 9; y < 12; y++) for (let x = m.w - 6; x < m.w - 3; x++) m.data[y * m.w + x] = 1;
    expect(decodeSevenSegment(m).digits).toBe('25');
  });
});
