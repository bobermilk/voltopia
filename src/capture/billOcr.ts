/**
 * billOcr.ts — read an uploaded utility-bill photo (bills-only feature).
 *
 * One image load produces BOTH the perceptual dedup fingerprint (we never store
 * the image) and a Tesseract read of the whole page, from which we pull the
 * figure the quest needs: electricity → the kWh number, water → the m³ number.
 * OCR only PREFILLS the field; the player still confirms/edits before submit.
 */
import { readBillText } from './ocr';
import { dHash, toGrey } from './verification';

export type BillKind = 'water' | 'electricity';

/** Pull the target figure out of OCR'd bill text. Pure — unit-tested. */
export function parseBillFigure(text: string, kind: BillKind): number | null {
  const t = text.replace(/,/g, '').replace(/\s+/g, ' ');
  const patterns =
    kind === 'electricity'
      ? [
          /(\d+(?:\.\d+)?)\s*kwh/i, // "312 kWh"
          /(\d+(?:\.\d+)?)\s*k\s*wh/i, // "312 k Wh" (spacing noise)
          /kwh\D{0,10}(\d+(?:\.\d+)?)/i, // "kWh used: 312"
          /(?:usage|consumption|used)\D{0,12}(\d+(?:\.\d+)?)/i,
        ]
      : [
          /(\d+(?:\.\d+)?)\s*m(?:³|3)\b/i, // "42 m³" / "42 m3"
          /(\d+(?:\.\d+)?)\s*cu\.?\s*m/i, // "42 cu m"
          /(\d+(?:\.\d+)?)\s*(?:cubic|units?)/i,
          /(?:usage|consumption|used)\D{0,12}(\d+(?:\.\d+)?)/i,
        ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export interface BillRead {
  hash: string;
  value: number | null;
  text: string;
}

/** Load a bill image, fingerprint it, and OCR its figure. Rejects on a bad file. */
export function readBill(file: File, kind: BillKind): Promise<BillRead> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        const ratio = img.naturalHeight / img.naturalWidth;

        // Small canvas → perceptual hash (dedup); the image itself is discarded.
        const hw = 160;
        const hh = Math.max(1, Math.round(ratio * hw));
        const hc = document.createElement('canvas');
        hc.width = hw;
        hc.height = hh;
        const hctx = hc.getContext('2d')!;
        hctx.drawImage(img, 0, 0, hw, hh);
        const hash = dHash(Array.from(toGrey(hctx.getImageData(0, 0, hw, hh).data, hw, hh, 9, 8)));

        // Larger canvas → OCR (small text needs the resolution).
        const ow = Math.min(1600, img.naturalWidth || 1000);
        const oh = Math.max(1, Math.round(ratio * ow));
        const oc = document.createElement('canvas');
        oc.width = ow;
        oc.height = oh;
        oc.getContext('2d')!.drawImage(img, 0, 0, ow, oh);
        const text = await readBillText(oc);

        resolve({ hash, value: parseBillFigure(text, kind), text });
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}
