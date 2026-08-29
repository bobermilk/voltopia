/**
 * Tutorial — Munchkin the cat, every garden's starting animal, walks the
 * player in: big character in the foreground with a speech bubble (the
 * classic villager-guide framing), asks for a name (saved to the profile,
 * cat becomes the first companion), then tours watering, visitors, the
 * Tabs tree menu, and missions. Runs once per save (game.tutorialDone).
 */
import { useState } from 'react';
import { useStore } from '../state/store';
import { Sprite } from './art';

interface Step {
  text: (name: string) => string;
  /** Where the bouncing arrow points, if anywhere. */
  point?: 'tabs' | 'beds' | 'dev';
  /** This step shows the name input instead of tap-to-continue. */
  nameInput?: boolean;
}

const STEPS: Step[] = [
  {
    text: () =>
      'Mrrp! A human! Finally. I’m Munchkin — resident cat of this garden. Short legs, big plans.',
  },
  {
    text: () => 'Before anything else: what should I call you?',
    nameInput: true,
  },
  {
    text: (n) =>
      `${n}. Good name. Purrfect, even. I’m officially your first companion now — you’ll find me on your profile, looking dignified.`,
  },
  {
    text: () =>
      'See those dirt patches in the yard? That’s where plants go. You already have seeds in your Inventory — plant one, then TAP it to water it. Tap whenever you see my little watering can pop up.',
    point: 'beds',
  },
  {
    text: () =>
      'Plants give the garden its charm, and charm brings creatures wandering in. Tap a visitor before it leaves to record it — miss it, and all you get is a mysterious clue. Very dramatic.',
  },
  {
    text: () =>
      'That tree button up there holds every tab — Shop, Missions, Inventory, Magic Seeds, Social, and the Field Guide, where your recorded creatures live. Everything is in the tree. Sensible, if you ask me.',
    point: 'tabs',
  },
  {
    text: () =>
      'Coins come from Missions — real things you do out there, like fans instead of aircon. Do one and the Gnome leaves a magic seed. Grow it in the Magic Seeds tab and the bigger it sprouts, the better the loot. Rare seeds ONLY come this way. No buying them. I checked.',
  },
  {
    text: (n) =>
      `That’s the whole secret, ${n}: drop by, water what’s wilted, and see who wandered in — the tree remembers the rest. If you need me, I’ll be supervising from the veranda.`,
  },
];

export function Tutorial() {
  const game = useStore((s) => s.game);
  const setProfile = useStore((s) => s.setProfile);
  const finishTutorial = useStore((s) => s.finishTutorial);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  if (game.tutorialDone) return null;
  const s = STEPS[step];
  const playerName = game.profile.name === 'Gardener' ? 'friend' : game.profile.name;

  const advance = () => {
    if (s.nameInput) return; // the input's button advances this one
    if (step >= STEPS.length - 1) finishTutorial();
    else setStep(step + 1);
  };

  const confirmName = () => {
    const trimmed = name.trim().slice(0, 20);
    if (trimmed) setProfile({ name: trimmed });
    setStep(step + 1);
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black/35" onClick={advance}>
      {/* skip */}
      <button
        className="ds-pill absolute top-3 right-3 bg-paper/90 px-3 py-1 text-xs opacity-80 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          finishTutorial();
        }}
      >
        Skip intro
      </button>

      {/* pointing arrow */}
      {s.point && <PointArrow at={s.point} />}

      {/* the cat, foreground left, with its bubble */}
      <div className="absolute right-3 bottom-6 left-3 flex items-end gap-1">
        <div className="anim-pop shrink-0 drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]" style={{ marginBottom: -6 }}>
          <Sprite id="munchkin_cat" size={132} />
        </div>
        <div className="relative mb-10 flex-1" onClick={(e) => s.nameInput && e.stopPropagation()}>
          {/* bubble tail */}
          <svg className="absolute -left-3 bottom-5" width="18" height="20" viewBox="0 0 18 20">
            <path d="M18 2 L1 14 L18 16 Z" fill="#fffdf6" stroke="#57422e" strokeWidth="2.4" strokeLinejoin="round" />
          </svg>
          <div className="ds-card anim-pop rounded-2xl px-4 py-3" key={step}>
            <p className="text-sm leading-5 font-semibold">{s.text(playerName)}</p>
            {s.nameInput ? (
              <div className="mt-2.5 flex gap-2">
                <input
                  autoFocus
                  className="ds-pill min-w-0 flex-1 bg-cream px-3 py-2 text-sm font-bold text-ink"
                  placeholder="your name"
                  value={name}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name.trim() && confirmName()}
                />
                <button
                  className="ds-pill bg-leaf px-3.5 py-2 text-sm font-bold text-white hover:brightness-105 disabled:opacity-40"
                  disabled={!name.trim()}
                  onClick={confirmName}
                >
                  That's me
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-right text-[10px] font-bold tracking-wide opacity-45 uppercase">
                tap to continue · {step + 1}/{STEPS.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A bouncing ink arrow pointing at the thing Munchkin is talking about. */
function PointArrow({ at }: { at: 'tabs' | 'beds' | 'dev' }) {
  const pos =
    at === 'tabs'
      ? 'top-24 left-7'
      : at === 'dev'
        ? 'top-14 right-16'
        : 'top-[46%] left-1/2 -translate-x-1/2';
  return (
    <div className={`pointer-events-none absolute ${pos}`} style={{ animation: 'bob 1s ease-in-out infinite' }}>
      <svg width="34" height="30" viewBox="0 0 34 30">
        <path d="M17 2 L32 28 L17 21 L2 28 Z" fill="#e2b13c" stroke="#57422e" strokeWidth="2.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
