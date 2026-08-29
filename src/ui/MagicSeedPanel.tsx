/**
 * MagicSeedPanel — the "Magic Seed" tab (was Parcels). Every magic seed the
 * Gnome delivered waits here as a glowing orb tinted by its rarity. Tapping
 * "Grow" opens the sprout mini-game (GrowGame below): the seed sits centre
 * like a Pokémon-GO egg while the player press-and-holds a watering can. The
 * seed sprouts through forms — seedling → sapling → tree → huge tree — and
 * the form it reaches decides the loot. Seed rarity biases how high it goes.
 */
import { PACKAGE_CAPS } from '../config/balance';
import { GNOME, GROWN_FORM_DEF, MAGIC_SEED_RARITY } from '../config/content';
import { dayOf } from '../engine/clock';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { Card, SectionTitle } from './Panels';

const SOURCE_LABEL = (source: string): string => {
  if (source.startsWith('daily:')) return 'Daily mission';
  if (source.startsWith('benchmark:')) return 'Benchmark mission';
  if (source.startsWith('first_record:')) return 'First record';
  if (source === 'shower') return 'Five-minute shower';
  if (source === 'showcase' || source === 'dev') return 'Special delivery';
  return 'Delivery';
};

export function MagicSeedPanel() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const startGrowing = useStore((s) => s.startGrowing);

  const pending = game.magicSeeds;
  const emptySlots = Math.max(0, 4 - pending.length);
  const todayCount = game.quests.packagesDay === dayOf(now) ? game.quests.packagesFromDailies : 0;

  return (
    <>
      <div className="border-leaf/40 bg-leaf/10 rounded-2xl border-2 p-3 text-[11px] leading-4 font-semibold">
        The Gnome brings a magic seed every time you verify a real-world action. Grow it yourself — the
        bigger it sprouts, the better the loot. Magic seeds are never sold.
      </div>

      <SectionTitle>Ready to grow ({pending.length})</SectionTitle>
      {pending.length === 0 && (
        <Card className="text-center opacity-70">
          <Sprite id="magic_seed" size={44} className="emoji-silhouette" />
          <p className="mt-1 text-xs">No magic seeds right now. Complete a mission and the Gnome will be along.</p>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-2">
        {pending.map((seed) => {
          const r = MAGIC_SEED_RARITY[seed.rarity];
          return (
            <Card key={seed.id} className="text-center" style={{ boxShadow: `0 0 0 2px ${r.color}` }}>
              <div className="anim-glow inline-block" style={{ filter: `drop-shadow(0 0 10px ${r.glow})` }}>
                <Sprite id="magic_seed" size={56} />
              </div>
              <div className="mt-1 text-xs font-bold" style={{ color: r.color }}>
                {r.label} magic seed
              </div>
              <div className="text-[10px] opacity-55">{SOURCE_LABEL(seed.source)}</div>
              <button
                className="ds-pill bg-terra mt-2 w-full px-3 py-1.5 text-sm font-bold text-white hover:brightness-105"
                onClick={() => startGrowing(seed.id)}
              >
                Grow!
              </button>
            </Card>
          );
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            key={i}
            className="border-ink/25 flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3 text-center text-[11px] font-semibold opacity-50"
          >
            empty slot
            <span className="mt-0.5 text-[10px] font-normal">complete a mission</span>
          </div>
        ))}
      </div>

      <SectionTitle>What a seed can become</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {(['seedling', 'sapling', 'tree', 'huge_tree'] as const).map((form) => {
          const def = GROWN_FORM_DEF[form];
          return (
            <Card key={form} className="flex items-center gap-2">
              <Sprite id={def.art} size={38} />
              <div>
                <div className="text-xs font-bold">{def.name}</div>
                <div className="text-[10px] opacity-60">{def.tierLabel}</div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-2 text-[11px] font-semibold opacity-60">
        <Sprite id={GNOME.art} size={20} /> {GNOME.name} delivers · parcels from daily missions today:{' '}
        {todayCount}/{PACKAGE_CAPS.maxPerDayFromDailyQuests}
      </p>
    </>
  );
}
