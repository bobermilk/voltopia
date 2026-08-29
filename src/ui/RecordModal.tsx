/**
 * RecordModal — the payoff for being present when a creature visits (§8).
 */
import { FIRST_RECORD_BONUS } from '../config/balance';
import { COSMETIC_BY_ID, CREATURE_BY_ID, GNOME, MAGIC_SEED_RARITY } from '../config/content';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { TagChips } from './GardenScene';

const RARITY_STYLE: Record<string, string> = {
  common: 'bg-stone-200 text-stone-700',
  uncommon: 'bg-leaf/20 text-leaf-deep',
  rare: 'bg-sky-200 text-sky-700',
  legendary: 'bg-amber-200 text-amber-700',
};

export function RecordModal() {
  const record = useStore((s) => s.record);
  const close = useStore((s) => s.closeRecord);
  const game = useStore((s) => s.game);
  if (!record) return null;

  const creature = CREATURE_BY_ID[record.creatureId];
  const entry = game.guide[record.creatureId];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-5" onClick={close}>
      <div
        className="ds-card anim-pop w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="anim-bob mx-auto flex h-32 w-32 items-center justify-center rounded-full border-[3px] border-ink bg-leaf-mist">
          <Sprite id={creature.id} size={100} />
        </span>
        <div className="mt-2 flex items-center justify-center gap-2">
          <h2 className="font-display text-xl">{creature.name}</h2>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${RARITY_STYLE[creature.rarity]}`}>
            {creature.rarity}
          </span>
        </div>
        <p className="mt-1 text-sm opacity-75">{creature.blurb}</p>
        <p className="mt-1 text-xs font-semibold opacity-50">Recorded by {creature.recordedBy}% of gardeners</p>
        <div className="mt-2 flex justify-center">
          <TagChips tags={creature.prefs} />
        </div>

        {record.firstRecord ? (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <div className="flex items-center justify-center gap-1.5 font-bold text-amber-700">
              <Sprite id="icon_sparkle" size={20} /> New Field Guide entry! +{record.bonus} coins
            </div>
            {record.cosmeticUnlocked && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-amber-700">
                <Sprite id={record.cosmeticUnlocked} size={22} /> Trophy unlocked:{' '}
                {COSMETIC_BY_ID[record.cosmeticUnlocked].name}
              </div>
            )}
            {record.magicSeedRarity && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-amber-700">
                <Sprite id={GNOME.art} size={22} />
                {GNOME.name} left a {MAGIC_SEED_RARITY[record.magicSeedRarity as keyof typeof MAGIC_SEED_RARITY].label} magic seed!
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
            Visit #{entry?.visits ?? '?'} — old friends still count.
            {entry?.mementoEarned && (
              <div className="mt-1 flex items-center justify-center gap-1">
                <Sprite id="icon_medal" size={18} /> Memento earned!
              </div>
            )}
          </div>
        )}

        <button
          className="ds-pill mt-4 w-full bg-leaf px-4 py-2.5 font-bold text-white hover:brightness-105"
          onClick={close}
        >
          Lovely.
        </button>
        <p className="mt-2 text-[10px] opacity-40">First-record bonus by rarity: {Object.values(FIRST_RECORD_BONUS).join(' / ')}</p>
      </div>
    </div>
  );
}
