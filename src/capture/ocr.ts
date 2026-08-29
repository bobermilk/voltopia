/**
 * ocr.ts — on-device digit OCR via Tesseract.js.
 *
 * Self-hosted from /public/tess (worker + wasm core + models) so nothing
 * leaves the device. Two models: `eng` for printed labels, `ssd_int` for the
 * SEVEN-SEGMENT digits on aircon remotes (the default model can't read those).
 *
 * Key correctness fixes:
 *  - page-seg mode 7 (single text line): the default mode tries to parse a
 *    whole page and reliably fails on a lone cropped number.
 *  - proper Otsu binarisation with auto polarity (works for dark-on-light AND
 *    light-on-display), plus gap-bridging dilation for seven-segment.
 *  - one worker cached per language.
 *
 * OCR UPGRADES a photo to auto-verified; it never gates the mission (the
 * caller falls back to a Declared submission).
 */
import type { Worker } from 'tesseract.js';
import { OCR, OCR_LANG, OCR_RULES, OCR_SEVEN_SEGMENT, type OcrRule } from '../config/balance';
import { decodeSevenSegment, type SegMask } from './sevenSeg';

const workers = new Map<string, Promise<Worker>>();

async function createTesseractWorker(lang: string): Promise<Worker> {
  const mod = await import('tesseract.js');
  const createWorker =
    (mod as { createWorker?: typeof import('tesseract.js').createWorker }).createWorker ??
    (mod as { default: { createWorker: typeof import('tesseract.js').createWorker } }).default.createWorker;
  return createWorker(lang, 1, {
    workerPath: OCR.workerPath,
    corePath: OCR.corePath,
    langPath: OCR.langPath,
  });
}

async function getWorker(lang: string): Promise<Worker> {
  let w = workers.get(lang);
  if (!w) {
    w = createTesseractWorker(lang).then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: OCR.charWhitelist,
        // 7 = treat the image as a single text line (a lone number).
        tessedit_pageseg_mode: '7' as unknown as import('tesseract.js').PSM,
      });
      return worker;
    });
    workers.set(lang, w);
  }
  return w;
}

/**
 * A separate worker for reading a WHOLE bill (a page of mixed text), not a lone
 * number: no digit whitelist (we need "kWh"/"m³" letters) and automatic page
 * segmentation. Cached independently of the number-only worker.
 */
let billWorker: Promise<Worker> | null = null;
async function getBillWorker(): Promise<Worker> {
  if (!billWorker) {
    billWorker = createTesseractWorker('eng').then(async (worker) => {
      // 3 = fully automatic page segmentation (a document, not one line).
      await worker.setParameters({ tessedit_pageseg_mode: '3' as unknown as import('tesseract.js').PSM });
      return worker;
    });
  }
  return billWorker;
}

/** OCR a whole bill image to plain text. Never throws — returns '' on failure. */
export async function readBillText(canvas: HTMLCanvasElement): Promise<string> {
  try {
    const worker = await getBillWorker();
    const { data } = await worker.recognize(canvas);
    return data.text || '';
  } catch {
    return '';
  }
}

export interface OcrResult {
  ran: boolean;
  passed: boolean;
  text: string;
  value: number | null;
  confidence?: number;
  hint?: string;
}

export function hasOcrRule(missionId: string): boolean {
  return !!OCR_RULES[missionId];
}

export function ocrHint(missionId: string): string | undefined {
  return OCR_RULES[missionId]?.hint;
}

/* ── preprocessing ─────────────────────────────────────────────────── */

/** Otsu threshold on a greyscale histogram. */
function otsu(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) {
      max = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Binarise a canvas into an ink mask: greyscale → Otsu threshold → mark the
 * DIGIT ink as 1 (auto-detecting polarity, so it works for dark-on-light AND a
 * lit display on a dark ground). No dilation — callers add it if they want.
 */
export function canvasToMask(src: HTMLCanvasElement): SegMask {
  const w = src.width;
  const h = src.height;
  const sctx = src.getContext('2d')!;
  const data = sctx.getImageData(0, 0, w, h).data;

  const grey = new Uint8Array(w * h);
  const hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++) {
    const g = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
    grey[i] = g;
    hist[g]++;
  }
  const th = otsu(hist, w * h);

  // Decide polarity: are the dark pixels the minority (ink) or the ground?
  let darkCount = 0;
  for (let i = 0; i < w * h; i++) if (grey[i] < th) darkCount++;
  const inkIsDark = darkCount < w * h * 0.5; // ink is usually the minority

  const bin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const below = grey[i] < th;
    bin[i] = (inkIsDark ? below : !below) ? 1 : 0;
  }
  return { data: bin, w, h };
}

/**
 * Build a clean black-on-white canvas Tesseract likes. Light dilation
 * solidifies thin printed strokes; seven-segment digits are NOT dilated (that
 * warps the shapes) — but seven-segment missions read via the decoder first
 * anyway, so this is only their fallback.
 */
function preprocess(src: HTMLCanvasElement, sevenSegment: boolean): HTMLCanvasElement {
  const { data: bin, w, h } = canvasToMask(src);
  const passes = sevenSegment ? 0 : 1;
  let cur = bin;
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let on = 0;
        for (let dy = -1; dy <= 1 && !on; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && cur[ny * w + nx]) {
              on = 1;
              break;
            }
          }
        }
        next[y * w + x] = on;
      }
    }
    cur = next;
  }

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d')!;
  const outImg = octx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = cur[i] ? 0 : 255; // black ink on white
    outImg.data[i * 4] = outImg.data[i * 4 + 1] = outImg.data[i * 4 + 2] = v;
    outImg.data[i * 4 + 3] = 255;
  }
  octx.putImageData(outImg, 0, 0);
  return out;
}

/**
 * Run OCR on a canvas crop (the aim box) and evaluate the mission's rule.
 * Never throws — on any failure returns { ran:false } so the caller can offer
 * a Declared fallback.
 */
export async function runOcr(missionId: string, canvas: HTMLCanvasElement): Promise<OcrResult> {
  const rule: OcrRule | null | undefined = OCR_RULES[missionId];
  if (!rule) return { ran: false, passed: false, text: '', value: null };
  try {
    // Seven-segment displays (aircon remotes) read through the deterministic
    // decoder first — Tesseract is unreliable on photographed digital digits.
    if (OCR_SEVEN_SEGMENT[missionId]) {
      const dec = decodeSevenSegment(canvasToMask(canvas));
      if (dec.confident && dec.digits) {
        const value = parseFloat(dec.digits);
        if (Number.isFinite(value)) {
          return { ran: true, passed: rule.ok(value), text: dec.digits, value, confidence: 100, hint: rule.hint };
        }
      }
      // Not a confident seven-segment read — fall through to Tesseract.
    }

    const lang = OCR_LANG[missionId] ?? 'eng';
    const worker = await getWorker(lang);
    const prepped = preprocess(canvas, !!OCR_SEVEN_SEGMENT[missionId]);
    const { data } = await worker.recognize(prepped);
    const text = (data.text || '').replace(/\s+/g, ' ').trim();
    const confidence = typeof data.confidence === 'number' ? data.confidence : 0;

    // Pull EVERY number the rule's pattern matches, not just the first. If the
    // frame yields more than one distinct value the read is ambiguous (a stray
    // ghost segment, or two numbers in view) — reject rather than gamble on the
    // one that happens to pass.
    const g = new RegExp(rule.extract.source, 'g');
    const found: number[] = [];
    for (let m = g.exec(text); m; m = g.exec(text)) found.push(parseFloat(m[1]));
    const distinct = [...new Set(found)];
    const value = distinct.length === 1 ? distinct[0] : null;

    const passed =
      value !== null && confidence >= OCR.minConfidence && rule.ok(value);
    return { ran: true, passed, text, value, confidence, hint: rule.hint };
  } catch {
    return { ran: false, passed: false, text: '', value: null, hint: rule.hint };
  }
}

/**
 * DEV self-test: render a number to a canvas and OCR it, so the whole pipeline
 * can be verified without a camera. Returns what the engine read.
 */
export async function ocrSelfTest(text = '25', sevenSegment = false): Promise<OcrResult & { drew: string }> {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 180;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = sevenSegment ? '#111' : '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  if (sevenSegment) {
    drawSevenSegment(ctx, text, c.width, c.height);
  } else {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 120px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2);
  }
  const res = await runOcr('aircon_25', c);
  return { ...res, drew: text };
}

/** Draw a number as lit seven-segment bars (for the self-test). */
function drawSevenSegment(ctx: CanvasRenderingContext2D, num: string, W: number, H: number) {
  const SEG: Record<string, number[]> = {
    '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1],
    '3': [1, 1, 1, 1, 0, 0, 1], '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1],
    '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0], '8': [1, 1, 1, 1, 1, 1, 1],
    '9': [1, 1, 1, 1, 0, 1, 1],
  };
  const dh = H * 0.66;
  const dw = dh * 0.56;
  const t = dh * 0.13;
  const gap = dw * 0.5;
  const totalW = num.length * dw + (num.length - 1) * gap;
  const ox0 = (W - totalW) / 2;
  const oy = (H - dh) / 2;
  ctx.fillStyle = '#25e0c0'; // lit segment colour
  const bar = (x0: number, y0: number, x1: number, y1: number) => ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let i = 0; i < num.length; i++) {
    const ox = ox0 + i * (dw + gap);
    const mid = oy + dh / 2;
    const [a, b, c, d, e, f, g] = SEG[num[i]] ?? [0, 0, 0, 0, 0, 0, 0];
    if (a) bar(ox + t, oy, ox + dw - t, oy + t);
    if (b) bar(ox + dw - t, oy + t, ox + dw, mid);
    if (c) bar(ox + dw - t, mid, ox + dw, oy + dh - t);
    if (d) bar(ox + t, oy + dh - t, ox + dw - t, oy + dh);
    if (e) bar(ox, mid, ox + t, oy + dh - t);
    if (f) bar(ox, oy + t, ox + t, mid);
    if (g) bar(ox + t, mid - t / 2, ox + dw - t, mid + t / 2);
  }
}

export async function disposeOcr() {
  const all = [...workers.values(), ...(billWorker ? [billWorker] : [])];
  for (const p of all) {
    try {
      (await p).terminate();
    } catch {
      // already gone
    }
  }
  workers.clear();
  billWorker = null;
}
