/**
 * verification.ts — perceptual hashing and paired-capture checks.
 *
 * Pure math on greyscale arrays; no DOM in here so it unit-tests cleanly.
 * The capture pipeline feeds it frames taken ONLY from a live MediaStream
 * (see CameraCapture.tsx — there is no <input type="file"> anywhere in the
 * app, which is the single highest-value integrity feature we have).
 *
 * - dHash: 64-bit difference hash, stable under resize/recompress — catches
 *   the same photo re-saved or screenshotted, which a byte hash cannot.
 * - correlation: Pearson coefficient between two downsampled greyscale
 *   frames — paired capture checks the scene stayed the same. Deliberately
 *   lenient (threshold in balance.ts): a plausibility check, not a verdict.
 */

/** 9×8 greyscale → 64-bit dHash as a 16-char hex string. */
export function dHash(grey9x8: Float64Array | number[]): string {
  if (grey9x8.length !== 72) throw new Error('dHash expects 9×8 = 72 samples');
  let hex = '';
  let nibble = 0;
  let bits = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = grey9x8[y * 9 + x];
      const right = grey9x8[y * 9 + x + 1];
      nibble = (nibble << 1) | (left > right ? 1 : 0);
      bits++;
      if (bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

/** Hamming distance between two same-length hex hashes. */
export function hammingHex(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Pearson correlation between two equal-length greyscale frames. */
export function correlation(a: Float64Array | number[], b: Float64Array | number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return 0;
  return cov / Math.sqrt(va * vb);
}

export function meanBrightness(grey: Float64Array | number[]): number {
  let s = 0;
  for (let i = 0; i < grey.length; i++) s += grey[i];
  return grey.length ? s / grey.length : 0;
}

/** RGBA ImageData bytes → greyscale samples at the given grid size. */
export function toGrey(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  gridW: number,
  gridH: number,
): Float64Array {
  const out = new Float64Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      // Average the source block this grid cell covers.
      const x0 = Math.floor((gx * srcW) / gridW);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * srcW) / gridW));
      const y0 = Math.floor((gy * srcH) / gridH);
      const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * srcH) / gridH));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * srcW + x) * 4;
          sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
          count++;
        }
      }
      out[gy * gridW + gx] = count ? sum / count : 0;
    }
  }
  return out;
}
