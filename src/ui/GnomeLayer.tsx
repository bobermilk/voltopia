/**
 * GnomeLayer — the Gnome delivery banner + the magic-seed grow mini-game.
 *
 * Grow game: the seed floats centre like a Pokémon-GO egg. The player
 * press-and-holds a watering can; while held, the can pours and growth
 * accrues (GROW_GAME.pointsPerSecond) from a limited reservoir that refills
 * between holds. As growth passes each form's threshold the seed visibly
 * sprouts to that form. Releasing pauses (with a gentle idle drain). "Harvest"
 * locks in the highest form reached; the seed's rarity then biases whether it
 * lucks even higher (FORM_ODDS), and the reveal pays out the loot.
 */
import { useEffect, useRef, useState } from 'react';
import { GROWN_FORMS, PROMOTE_HOLD_MS, SEED_FLOOR, type GrownForm } from '../config/balance';
import {
  COSMETIC_BY_ID,
  GNOME,
  GROWN_FORM_DEF,
  MAGIC_SEED_RARITY,
  OBJECT_BY_ID,
  PLANT_BY_ID,
} from '../config/content';
import { useStore } from '../state/store';
import { Sprite } from './art';

export function GnomeLayer() {
  return (
    <>
      <GnomeBanner />
      <GrowGame />
    </>
  );
}

function GnomeBanner() {
  const banner = useStore((s) => s.seedBanner);
  const clear = useStore((s) => s.clearSeedBanner);
  const setPanel = useStore((s) => s.setPanel);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(clear, 5000);
    return () => clearTimeout(t);
  }, [banner, clear]);

  if (!banner) return null;
  const r = MAGIC_SEED_RARITY[banner.rarity];
  return (
    <div className="absolute right-4 bottom-24 left-4 z-30 flex justify-center">
      <button
        className="ds-card anim-pop flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => {
          clear();
          setPanel('magicseeds');
        }}
      >
        <span className="anim-bob">
          <Sprite id={GNOME.art} size={52} />
        </span>
        <div>
          <div className="font-display text-sm">{GNOME.name}</div>
          <div className="max-w-60 text-xs opacity-75">{GNOME.arrival}</div>
          <div className="text-xs font-bold" style={{ color: r.color }}>
            A {r.label} magic seed — tap to grow it →
          </div>
        </div>
      </button>
    </div>
  );
}

function GrowGame() {
  const flow = useStore((s) => s.growing);
  if (!flow) return null;
  return <GrowGameInner key={flow.seed.id} />;
}

/** Stage index: 0 = bare seed, 1..4 = the four forms. */
function stageOf(form: GrownForm | null): number {
  return form ? GROWN_FORMS.indexOf(form) + 1 : 0;
}

function GrowGameInner() {
  const flow = useStore((s) => s.growing)!;
  const waterMagicSeed = useStore((s) => s.waterMagicSeed);
  const harvestSeed = useStore((s) => s.harvestSeed);
  const closeGrowing = useStore((s) => s.closeGrowing);

  const [charge, setCharge] = useState(0); // 0..1 toward the next promotion
  const [heldNow, setHeldNow] = useState(false);
  const [flash, setFlash] = useState<'up' | 'settle' | null>(null);
  const holding = useRef(false);
  const chargeRef = useRef(0);
  const last = useRef(0);

  const r = MAGIC_SEED_RARITY[flow.seed.rarity];
  const result = flow.result;
  const current = flow.current;
  const locked = flow.locked;
  const curStage = stageOf(current);

  // What the NEXT charge is working toward.
  const nextForm: GrownForm | null = curStage < 4 ? GROWN_FORMS[curStage] : null;
  const floorStage = stageOf(SEED_FLOOR[flow.seed.rarity]);
  // Since the seed starts at its floor, every remaining promotion is a gamble.
  const nextIsGuaranteed = nextForm !== null && curStage + 1 <= floorStage;
  const chargeMs = nextForm ? PROMOTE_HOLD_MS[nextForm] : 0;

  const formDef = current ? GROWN_FORM_DEF[current] : null;
  const seedArt = current ? formDef!.art : 'magic_seed';

  // The charge loop: while holding, fill toward chargeMs; on completion fire
  // one promotion attempt through the engine. setInterval (not rAF) so it
  // keeps running even when the tab is backgrounded.
  useEffect(() => {
    if (result || locked || nextForm === null) return;
    last.current = performance.now();
    const iv = setInterval(() => {
      const now = performance.now();
      const dt = now - last.current;
      last.current = now;
      if (holding.current) {
        chargeRef.current = Math.min(chargeMs, chargeRef.current + dt);
        if (chargeRef.current >= chargeMs) {
          // fire the attempt
          chargeRef.current = 0;
          setCharge(0);
          const res = waterMagicSeed();
          if (res) {
            setFlash(res.promoted ? 'up' : 'settle');
            setTimeout(() => setFlash(null), res.promoted ? 500 : 1200);
            if (!res.promoted) holding.current = false;
          }
          return;
        }
      } else {
        // ease the charge back down when not holding (keeps the suspense)
        chargeRef.current = Math.max(0, chargeRef.current - dt * 1.5);
      }
      setCharge(chargeRef.current / chargeMs);
    }, 40);
    return () => clearInterval(iv);
  }, [result, locked, nextForm, chargeMs, waterMagicSeed]);

  const press = () => {
    if (locked || nextForm === null) return;
    holding.current = true;
    setHeldNow(true);
  };
  const release = () => {
    holding.current = false;
    setHeldNow(false);
  };

  const canWater = !locked && nextForm !== null;
  const seedScale = 0.85 + curStage * 0.07 + charge * 0.05;

  return (
    <div className="bg-night/95 absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden select-none">
      {/* rays */}
      <div className="pointer-events-none absolute top-[42%] left-1/2" style={{ animation: 'rays-spin 50s linear infinite', transformOrigin: 'center' }}>
        <svg width="1200" height="1200" viewBox="-600 -600 1200 1200" style={{ transform: 'translate(-50%,-50%)' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0 0 L110 -600 L-110 -600 Z" fill="rgba(245,239,216,0.07)" transform={`rotate(${i * 30})`} />
          ))}
        </svg>
      </div>

      {result ? (
        <Reveal form={result.form} rewards={result.rewards} rarity={flow.seed.rarity} onClose={closeGrowing} />
      ) : (
        <div className="relative flex h-full w-full flex-col items-center justify-between py-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-cream/90">
              <Sprite id={GNOME.art} size={28} /> Growing a <span style={{ color: r.color }}>{r.label}</span> seed
            </div>
            <div className="font-display mt-1 text-2xl text-cream">{current ? formDef!.name : 'Magic Seed'}</div>
            <div className="text-xs text-cream/60">
              {locked
                ? 'Settled — this is your harvest.'
                : nextForm === null
                  ? 'Fully grown!'
                  : `Keep watering to reach a ${GROWN_FORM_DEF[nextForm].name}…`}
            </div>
          </div>

          {/* the egg-like seed with a circular charge ring */}
          <div className="relative flex h-52 w-52 items-center justify-center">
            <div className="absolute h-52 w-52 rounded-full" style={{ background: `radial-gradient(circle, ${r.glow} 0%, transparent 70%)` }} />
            {/* charge ring */}
            {canWater && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(245,239,216,0.15)" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke={nextIsGuaranteed ? '#a4c274' : r.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - charge)}
                  style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                />
              </svg>
            )}
            <div
              className={`${heldNow ? 'anim-glow' : ''} ${flash === 'up' ? 'anim-pop' : ''}`}
              style={{ transform: `scale(${seedScale})`, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
              <Sprite id={seedArt} size={130} />
            </div>
            {flash === 'settle' && (
              <div className="absolute -bottom-2 rounded-full bg-terra/90 px-3 py-1 text-xs font-bold text-white">
                It settled here!
              </div>
            )}
            {heldNow && (
              <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="bg-pond absolute h-2 w-2 rounded-full" style={{ left: (i - 1) * 12, animation: `droplet 0.6s ease-in ${i * 0.12}s infinite` }} />
                ))}
              </div>
            )}
          </div>

          {/* the watering can — press & hold */}
          <div className="flex flex-col items-center gap-2">
            <button
              className="border-cream/60 bg-paper/95 flex h-24 w-24 touch-none items-center justify-center rounded-full border-4 shadow-lg select-none active:scale-95 disabled:opacity-40"
              disabled={!canWater}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                press();
              }}
              onPointerUp={release}
              onPointerCancel={release}
              onMouseDown={press}
              onMouseUp={release}
              onMouseLeave={release}
              onTouchStart={(e) => {
                e.preventDefault();
                press();
              }}
              onTouchEnd={release}
            >
              <span className={heldNow ? 'anim-shake' : undefined}>
                <Sprite id="watering_can" size={64} />
              </span>
            </button>
            <div className="text-xs font-bold text-cream/70">
              {canWater ? 'Press & hold to water' : locked ? 'No more watering' : 'Fully grown'}
            </div>
          </div>

          <button
            className="ds-pill bg-leaf px-6 py-2.5 font-bold text-white shadow-md hover:brightness-105 disabled:opacity-40"
            disabled={current === null}
            onClick={harvestSeed}
          >
            {current ? `Harvest ${formDef!.name}` : 'Water it first'}
          </button>
        </div>
      )}
    </div>
  );
}

function Reveal({
  form,
  rewards,
  rarity,
  onClose,
}: {
  form: GrownForm;
  rewards: import('../engine/types').LootResult[];
  rarity: import('../config/balance').SeedRarity;
  onClose: () => void;
}) {
  const def = GROWN_FORM_DEF[form];
  const r = MAGIC_SEED_RARITY[rarity];
  return (
    <div className="relative flex flex-col items-center px-6 text-center" onClick={onClose}>
      <span className="rounded-full bg-black/25 px-4 py-1.5 text-[10px] font-bold tracking-[0.15em] text-cream/85 uppercase" style={{ color: r.color }}>
        {r.label} seed grew a…
      </span>
      <h1 className="font-display mt-3 text-4xl text-cream drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{def.name}!</h1>
      <div className="anim-pop mt-4">
        <Sprite id={def.art} size={140} className={form === 'huge_tree' ? 'anim-glow' : undefined} />
      </div>

      <div className="mt-6 flex flex-wrap items-stretch justify-center gap-2">
        {rewards.map((loot, i) => (
          <RewardCard key={i} loot={loot} />
        ))}
      </div>
      {rewards.length > 1 && (
        <span className="mt-3 rounded-full bg-sun/25 px-4 py-1.5 text-xs font-bold text-sun">
          {rewards.length} rewards!
        </span>
      )}

      <button className="ds-pill bg-leaf mt-6 px-6 py-2.5 font-bold text-white hover:brightness-105" onClick={onClose}>
        Take it all
      </button>
    </div>
  );
}

function RewardCard({ loot }: { loot: import('../engine/types').LootResult }) {
  const card = (() => {
    switch (loot.kind) {
      case 'seed': {
        const s = PLANT_BY_ID[loot.id!];
        return { art: s.id, badge: 'stage_seed', title: `${s.name} seed`, sub: `${loot.rarity} plant`, big: loot.rarity === 'legendary' };
      }
      case 'coins':
        return { art: 'icon_coin', title: `+${loot.amount}`, sub: 'coins', big: false };
      case 'object': {
        const o = OBJECT_BY_ID[loot.id!];
        return { art: o.id, title: o.name, sub: 'on your shelf', big: false };
      }
      case 'cosmetic': {
        const c = COSMETIC_BY_ID[loot.id!];
        return { art: c.id, title: c.name, sub: 'decor', big: false };
      }
    }
  })();
  return (
    <div className={`ds-card w-28 p-3 ${card.big ? 'ring-4 ring-sun' : ''}`}>
      <div className="relative inline-block">
        <Sprite id={card.art} size={52} />
        {'badge' in card && card.badge && (
          <span className="border-ink bg-paper absolute -right-2 -bottom-1 rounded-full border-2 p-0.5">
            <Sprite id={card.badge} size={18} />
          </span>
        )}
      </div>
      <div className="mt-1 text-xs leading-4 font-bold">{card.title}</div>
      <div className="text-[10px] opacity-60">{card.sub}</div>
    </div>
  );
}
