import { useEffect } from 'react';
import { useStore } from './state/store';
import { GardenScene } from './ui/GardenScene';
import { HUD } from './ui/HUD';
import { LoadingScreen } from './ui/LoadingScreen';
import { Panels } from './ui/Panels';
import { RecordModal } from './ui/RecordModal';
import { Toasts } from './ui/Toasts';
import { GnomeLayer } from './ui/GnomeLayer';
import { Tutorial } from './ui/Tutorial';
import { DevPanel } from './ui/DevPanel';

export default function App() {
  const tick = useStore((s) => s.tick);
  const toggleDev = useStore((s) => s.toggleDev);
  const cancelPlacement = useStore((s) => s.cancelPlacement);
  const tutorialDone = useStore((s) => s.game.tutorialDone);
  const loading = useStore((s) => s.loading);
  const setLoading = useStore((s) => s.setLoading);

  // The 1 Hz tick drives RENDERING and calls the pure catch-up pass.
  // Game state never advances inside a timer callback of its own.
  useEffect(() => {
    tick();
    const iv = setInterval(tick, 1000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`') toggleDev();
      if (e.key === 'Escape') cancelPlacement();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDev, cancelPlacement]);

  // Portrait phone format: the game lives in a phone-sized frame; on wide
  // screens the sides are bordered out (letterboxed) so it stays portrait.
  return (
    <div className="phone-stage">
      <div className="phone-frame">
        <GardenScene />
        <HUD />
        <Panels />
        <Toasts />
        <GnomeLayer />
        <RecordModal />
        <DevPanel />
        {!loading && !tutorialDone && <Tutorial />}
        {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      </div>
    </div>
  );
}
