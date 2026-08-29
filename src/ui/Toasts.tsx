import { useStore } from '../state/store';
import { Sprite } from './art';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none absolute top-14 right-4 left-4 z-40 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          className="anim-toast bg-ink/92 pointer-events-auto flex max-w-full items-center gap-2 rounded-full py-1.5 pr-4 pl-2 text-left text-xs font-semibold text-white shadow-lg"
          onClick={() => dismiss(t.id)}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90">
            <Sprite id={t.icon} size={18} />
          </span>
          {t.text}
        </button>
      ))}
    </div>
  );
}
