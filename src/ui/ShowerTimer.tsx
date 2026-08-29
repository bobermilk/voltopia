/**
 * ShowerTimer — the live 5-minute shower intervention. A kingfisher swims in
 * a bird bath whose water drains as the countdown runs down to zero; reaching
 * the end (within grace) completes the mission for coins + a rare magic seed.
 * The timer IS the intervention (real-time feedback), not a verification gate.
 * Time is game-time, so the dev ×100 speed makes it demo-able in seconds.
 */
import { useEffect, useState } from 'react';
import { SHOWER } from '../config/balance';
import { useStore } from '../state/store';
import { Sprite } from './art';

export function ShowerTimer({ onClose }: { onClose: () => void }) {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const cancelShower_ = useStore((s) => s.cancelShower_);
  const finishShower_ = useStore((s) => s.finishShower_);
  const [, force] = useState(0);

  const startedAt = game.shower.startedAt;

  // Re-render ~10×/s so the countdown is smooth even at ×1 speed.
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(iv);
  }, []);

  // Auto-complete when the timer runs out.
  useEffect(() => {
    if (startedAt === null) return;
    const elapsed = (now - startedAt) / 1000;
    if (elapsed >= SHOWER.durationSec) {
      finishShower_();
      onClose();
    }
  });

  if (startedAt === null) {
    onClose();
    return null;
  }

  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const remaining = Math.max(0, SHOWER.durationSec - elapsed);
  const frac = remaining / SHOWER.durationSec; // 1 → 0
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);

  // Bird bath water level: full at start, empty at end.
  const waterTop = 150 - frac * 70; // y where water surface sits (higher frac = higher water = lower y)
  const kingY = waterTop + 12;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-6">
      <div className="ds-card anim-pop w-full max-w-sm p-6 text-center">
        <div className="flex items-center justify-center gap-2 font-bold">
          <Sprite id="icon_shower" size={22} /> Five-minute shower
        </div>

        {/* countdown */}
        <div className="font-display mt-2 text-6xl tabular-nums" style={{ color: frac < 0.2 ? '#c67139' : '#57422e' }}>
          {mm}:{ss.toString().padStart(2, '0')}
        </div>
        <p className="text-xs opacity-60">the water's draining — hop out before it's gone</p>

        {/* bird bath with draining water + swimming kingfisher */}
        <svg viewBox="0 0 200 200" width="200" height="200" className="mx-auto mt-2">
          {/* pedestal */}
          <rect x="88" y="150" width="24" height="34" rx="4" fill="#c8bda9" stroke="#57422e" strokeWidth="3" />
          <ellipse cx="100" cy="186" rx="34" ry="8" fill="#b5b5a8" stroke="#57422e" strokeWidth="3" />
          {/* basin */}
          <path d="M40 90 h120 a6 6 0 0 1 6 6 v6 a66 30 0 0 1 -132 0 v-6 a6 6 0 0 1 6 -6 Z" fill="#c8bda9" stroke="#57422e" strokeWidth="3" />
          {/* water — clipped to the basin, level = waterTop */}
          <defs>
            <clipPath id="basinClip">
              <path d="M46 96 h108 v6 a54 22 0 0 1 -108 0 Z" />
            </clipPath>
          </defs>
          <g clipPath="url(#basinClip)">
            <rect x="40" y={waterTop} width="120" height="80" fill="#8ecae6" opacity="0.9" />
            <ellipse cx="100" cy={waterTop} rx="54" ry="8" fill="#a8dbef" />
            {/* ripples */}
            <ellipse cx="82" cy={waterTop + 4} rx="12" ry="3" fill="rgba(255,255,255,0.5)" />
            {/* the kingfisher, swimming */}
            <g className="anim-bob" style={{ animationDuration: '1.6s' }} transform={`translate(100 ${kingY})`}>
              <g transform="translate(-19 -19) scale(0.6)">
                <SpriteRaw id="kingfisher" />
              </g>
            </g>
          </g>
          <ellipse cx="100" cy="96" rx="60" ry="10" fill="none" stroke="#57422e" strokeWidth="3" />
        </svg>

        <div className="mt-3 flex gap-2">
          <button
            className="ds-pill bg-leaf flex-1 px-4 py-2.5 font-bold text-white hover:brightness-105"
            onClick={() => {
              finishShower_();
              onClose();
            }}
          >
            I'm out! Done
          </button>
          <button
            className="ds-pill bg-cream hover:bg-wall px-4 py-2.5 font-bold"
            onClick={() => {
              cancelShower_();
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
        <p className="mt-2 text-[10px] opacity-50">
          Finishing the timer earns coins + a rare magic seed. The timer runs in game-time — dev ×100
          makes it fly.
        </p>
      </div>
    </div>
  );
}

/** Inline the raw kingfisher sprite paths (no <svg> wrapper) for scene use. */
import { SPRITES } from './art';
function SpriteRaw({ id }: { id: string }) {
  return SPRITES[id] ?? null;
}
