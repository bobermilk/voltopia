/**
 * CameraCapture — live-stream-only evidence capture.
 *
 * THE integrity rule (CLAUDE.md): there is NO <input type="file"> in this
 * component or anywhere else in the app. Every frame comes from one live
 * MediaStream, so the photo gallery is physically unreachable and a
 * downloaded image cannot enter the pipeline. Do not add a gallery fallback
 * for convenience — that would delete the whole guarantee.
 *
 * Analysis is on-device; we store only the perceptual hash (a fingerprint),
 * never the photo itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { OCR, PAIRED_CAPTURE } from '../config/balance';
import { Sprite } from '../ui/art';
import { hasOcrRule, ocrHint, runOcr } from './ocr';
import { correlation, dHash, toGrey } from './verification';

export interface CaptureResult {
  hash?: string;
  paired?: boolean;
  /** True when on-device OCR read the required value from the frame. */
  ocrVerified?: boolean;
  /** OCR couldn't verify — the player chose to submit as Declared (tier 1). */
  declaredFallback?: boolean;
}

interface Frame {
  hash: string;
  grey32: Float64Array;
  at: number;
  thumb: string;
}

export function CameraCapture({
  mode,
  title,
  ocrMissionId,
  onDone,
}: {
  mode: 'single' | 'paired';
  title: string;
  /** When set and OCR has a rule for it, the frame is auto-read (aim box). */
  ocrMissionId?: string;
  onDone: (result: CaptureResult | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [first, setFirst] = useState<Frame | null>(null);
  const [verdict, setVerdict] = useState<'match' | 'mismatch' | null>(null);
  const [remaining, setRemaining] = useState(Math.round(PAIRED_CAPTURE.windowMs / 1000));
  const [reading, setReading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);

  const ocrOn = !!ocrMissionId && hasOcrRule(ocrMissionId) && mode === 'single';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('Camera unavailable. You can still complete the quest as Declared — evidence raises the reward, it never gates it.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Paired mode: countdown between the two shots.
  useEffect(() => {
    if (mode !== 'paired' || !first) return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((first.at + PAIRED_CAPTURE.windowMs - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setFirst(null); // window expired — start over
        setRemaining(Math.round(PAIRED_CAPTURE.windowMs / 1000));
      }
    }, 250);
    return () => clearInterval(iv);
  }, [mode, first]);

  const grabFrame = useCallback((): Frame | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const w = 160;
    const h = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * w));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    return {
      hash: dHash(Array.from(toGrey(rgba, w, h, 9, 8))),
      grey32: toGrey(rgba, w, h, 32, 32),
      at: Date.now(),
      thumb: canvas.toDataURL('image/jpeg', 0.6),
    };
  }, []);

  /** Crop the centered aim box from the live video into a canvas for OCR. */
  const grabAimBox = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const bw = vw * OCR.aimBox.w;
    const bh = vh * OCR.aimBox.h;
    const bx = (vw - bw) / 2;
    const by = (vh - bh) / 2;
    // Upscale the crop — small digits OCR far better enlarged.
    const scale = Math.max(1, 480 / bw);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bw * scale);
    canvas.height = Math.round(bh * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, bx, by, bw, bh, 0, 0, canvas.width, canvas.height);
    // Light contrast boost + greyscale for the engine.
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = g > 128 ? Math.min(255, g * 1.2) : Math.max(0, g * 0.8);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }, []);

  const capture = () => {
    const frame = grabFrame();
    if (!frame) return;
    if (mode === 'single') {
      if (ocrOn && ocrMissionId) {
        const box = grabAimBox();
        if (box) {
          setReading(true);
          setOcrMsg(null);
          runOcr(ocrMissionId, box).then((res) => {
            setReading(false);
            if (res.ran && res.passed) {
              // Read a valid number → this is the verified photo tier.
              setOcrMsg('read');
              setTimeout(() => onDone({ hash: frame.hash, ocrVerified: true }), 800);
            } else if (res.ran) {
              // OCR ran but the number wasn't valid/found. Do NOT accept as a
              // verified photo — the whole point is the number must be there.
              // Let them reframe, or fall back to Declared (tier 1).
              setOcrMsg(
                res.value !== null
                  ? `Read "${res.value}" — that doesn't meet the mission. Line the number up and try again.`
                  : 'No number in the box. Line up the reading and try again.',
              );
            } else {
              // OCR genuinely unavailable (engine failed to load). Don't silently
              // pass — say so and let them submit as Declared instead.
              setOcrMsg('unavailable');
            }
          });
          return;
        }
      }
      onDone({ hash: frame.hash });
      return;
    }
    if (!first) {
      setFirst(frame);
      return;
    }
    // Second shot: same scene? (Deliberately lenient — see balance.ts.)
    const corr = correlation(first.grey32, frame.grey32);
    if (corr >= PAIRED_CAPTURE.minCorrelation) {
      setVerdict('match');
      setTimeout(() => onDone({ hash: first.hash, paired: true }), 900);
    } else {
      setVerdict('mismatch');
      setTimeout(() => {
        setVerdict(null);
        setFirst(null);
      }, 1600);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Sprite id="icon_camera" size={24} /> {title}
          </h2>
          <button className="rounded-full bg-stone-200 px-3 py-1 text-sm font-bold hover:bg-stone-300" onClick={() => onDone(null)}>
            ✕
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-600 ring-1 ring-orange-200">{error}</p>
        ) : (
          <>
            <div className="relative mt-3 overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
              {/* OCR aim box */}
              {ocrOn && (
                <div
                  className="pointer-events-none absolute rounded-lg border-2 border-dashed border-white/90"
                  style={{
                    left: `${(0.5 - OCR.aimBox.w / 2) * 100}%`,
                    top: `${(0.5 - OCR.aimBox.h / 2) * 100}%`,
                    width: `${OCR.aimBox.w * 100}%`,
                    height: `${OCR.aimBox.h * 100}%`,
                  }}
                >
                  <span className="absolute -top-6 left-0 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                    line up the number here
                  </span>
                </div>
              )}
              {first && mode === 'paired' && (
                <img
                  src={first.thumb}
                  className="absolute top-2 left-2 h-16 w-24 rounded-lg object-cover ring-2 ring-white"
                  alt="first shot"
                />
              )}
              {verdict === 'match' && (
                <div className="bg-leaf/70 absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                  ✓ Same scene — verified
                </div>
              )}
              {verdict === 'mismatch' && (
                <div className="absolute inset-0 flex items-center justify-center bg-orange-500/70 p-4 text-center text-sm font-bold text-white">
                  Scenes don't match — hold the camera steady and try the pair again
                </div>
              )}
              {reading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-bold text-white">
                  Reading the number…
                </div>
              )}
              {ocrMsg === 'read' && (
                <div className="bg-leaf/75 absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                  ✓ Verified on-device
                </div>
              )}
            </div>
            {mode === 'paired' && (
              <p className="mt-2 text-xs opacity-70">
                {first
                  ? `Now the second shot, from the same position — ${remaining}s left.`
                  : 'Two shots from the same position within 60 seconds. First one now.'}
              </p>
            )}
            {ocrOn && !ocrMsg && (
              <p className="mt-2 text-xs opacity-70">{ocrHint(ocrMissionId!) ?? 'Frame the number in the box.'}</p>
            )}
            {ocrMsg && ocrMsg !== 'read' && ocrMsg !== 'unavailable' && (
              <p className="text-terra mt-2 text-xs font-semibold">{ocrMsg}</p>
            )}
            {ocrMsg === 'unavailable' && (
              <p className="text-terra mt-2 text-xs font-semibold">
                The on-device scanner couldn't start. You can submit as Declared instead — it just pays
                less.
              </p>
            )}
            <button
              className="bg-pond mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-white shadow hover:brightness-105 disabled:opacity-50"
              onClick={capture}
              disabled={reading || ocrMsg === 'read'}
            >
              <Sprite id="icon_camera" size={20} />
              {mode === 'paired' && first ? 'Second shot' : ocrOn ? (ocrMsg ? 'Scan again' : 'Scan number') : 'Capture'}
            </button>
            {/* OCR-gated: no silent photo accept. Only a Declared (tier-1) fallback. */}
            {ocrOn && ocrMsg && ocrMsg !== 'read' && (
              <button
                className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-2 text-sm font-bold ring-1 ring-stone-200 hover:bg-stone-200"
                onClick={() => onDone({ declaredFallback: true })}
              >
                Can't scan — submit as Declared (½ reward)
              </button>
            )}
          </>
        )}
        <p className="mt-2 text-[10px] opacity-50">
          Live camera only — there is no upload button in this app. Analysed on this device; only a
          fingerprint is stored, never the photo.
        </p>
      </div>
    </div>
  );
}
