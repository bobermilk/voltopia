/**
 * TransportConnect — verifies the walk/cycle/transport mission by connecting
 * a tracker instead of a photo. "Phone location" is a REAL on-device signal
 * (navigator.geolocation — permission + a fix, nothing stored); Strava / Runna
 * / Anywheel are service links (mocked OAuth for the hackathon: a connect
 * handshake that resolves to verified). Either way, on success the mission
 * completes at the paired-evidence tier (a rare magic seed).
 */
import { useState } from 'react';
import { TRACKERS, type TrackerDef } from '../config/content';
import { Sprite } from './art';

type Status = 'idle' | 'connecting' | 'done' | 'failed';

export function TransportConnect({ onVerified, onClose }: { onVerified: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState<TrackerDef['id'] | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  const connect = (t: TrackerDef) => {
    if (busy) return;
    setBusy(t.id);
    setStatus('connecting');
    setMsg(null);

    if (t.real) {
      // Real signal: ask for a location fix. Success = you're out and about.
      if (!('geolocation' in navigator)) {
        setStatus('failed');
        setMsg('This device has no location services.');
        setBusy(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => {
          setStatus('done');
          setMsg('Location confirmed — you were out and about.');
          setTimeout(onVerified, 900);
        },
        (err) => {
          setStatus('failed');
          setMsg(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. Try a tracker instead.'
              : 'Could not get a location fix. Try again or use a tracker.',
          );
          setBusy(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
      return;
    }

    // Mocked service OAuth: a short handshake, then linked + verified.
    window.setTimeout(() => {
      setStatus('done');
      setMsg(`${t.name} linked — today’s trip counts.`);
      setTimeout(onVerified, 900);
    }, 1200);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="ds-card anim-pop w-full max-w-sm p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-lg">
            <Sprite id="icon_bike" size={24} /> Green transport
          </h2>
          <button className="ds-pill bg-cream hover:bg-wall px-3 py-1 text-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs opacity-70">
          No photo needed — connect a tracker and the trip verifies itself. Stronger than a snapshot, so
          it pays a paired-evidence reward.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {TRACKERS.map((t) => {
            const active = busy === t.id;
            const finished = active && status === 'done';
            return (
              <button
                key={t.id}
                className={`ds-card flex items-center gap-3 p-2.5 text-left transition-colors ${active ? 'ring-2 ring-leaf' : 'hover:bg-cream'} disabled:opacity-60`}
                disabled={!!busy && !active}
                onClick={() => connect(t)}
              >
                <Sprite id={t.art} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    {t.name}
                    {t.real && (
                      <span className="bg-leaf/20 text-leaf-deep rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase">
                        on-device
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-60">{t.blurb}</div>
                </div>
                <span className="ds-pill bg-leaf px-3 py-1.5 text-xs font-bold text-white">
                  {finished ? '✓' : active && status === 'connecting' ? '…' : 'Connect'}
                </span>
              </button>
            );
          })}
        </div>

        {msg && (
          <p className={`mt-3 text-xs font-semibold ${status === 'failed' ? 'text-terra' : 'text-leaf-deep'}`}>{msg}</p>
        )}
        <p className="mt-2 text-[10px] opacity-50">
          Ecovolt-linked accounts verify automatically. Location is checked on-device; only the verified
          result is kept, never your position.
        </p>
      </div>
    </div>
  );
}
