/**
 * ShopPanel — per the design's shop board: category chips, a two-column
 * seed grid with rarity chips and terracotta price pills, an objects list,
 * and the grounds section. Rare+ seeds are deliberately absent: parcels
 * are their only source.
 */
import { useState } from 'react';
import { SEED_PRICES, EXPANSION_SLOT_COST } from '../config/balance';
import { OBJECTS, PLANTS } from '../config/content';
import { nextOvergrownPrice } from '../engine/actions';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { Coin, TagChips } from './GardenScene';
import { Card } from './Panels';

type Cat = 'seeds' | 'objects' | 'grounds';

export function ShopPanel() {
  const game = useStore((s) => s.game);
  const [cat, setCat] = useState<Cat>('seeds');

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['seeds', 'objects', 'grounds'] as Cat[]).map((c) => (
            <button
              key={c}
              className={`ds-pill px-3 py-1.5 text-xs capitalize ${cat === c ? 'bg-sage text-white' : 'bg-paper hover:bg-cream'}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <Coin n={game.coins} />
      </div>

      <div className="mt-3">
        {cat === 'seeds' && <SeedsCat />}
        {cat === 'objects' && <ObjectsCat />}
        {cat === 'grounds' && <GroundsCat />}
      </div>
    </>
  );
}

const RARITY_CHIP: Record<string, string> = {
  common: 'bg-leaf/20 text-leaf-deep',
  uncommon: 'bg-pond-pale text-ink',
  rare: 'bg-blush/60 text-ink',
  legendary: 'bg-sun/50 text-ink',
};

function SeedsCat() {
  const game = useStore((s) => s.game);
  const buySeed_ = useStore((s) => s.buySeed_);
  const shopSeeds = PLANTS.filter((p) => p.inShop);
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {shopSeeds.map((s) => {
          const price = SEED_PRICES[s.rarity]!;
          return (
            <Card key={s.id} className="flex flex-col items-center p-3 text-center">
              <span className="relative">
                <Sprite id="stage_seed" size={52} />
                <span className="absolute -right-2 -bottom-1 rounded-full border-2 border-ink bg-paper p-0.5">
                  <Sprite id={s.id} size={24} />
                </span>
              </span>
              <div className="mt-1.5 text-sm font-bold">{s.name}</div>
              <span className={`mt-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${RARITY_CHIP[s.rarity]}`}>
                {s.rarity} · {s.slotTypes[0].replace('_', ' ')}
              </span>
              <button
                className="ds-pill mt-2 flex w-full items-center justify-center gap-1 bg-terra px-3 py-1.5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-40"
                disabled={game.coins < price}
                onClick={() => buySeed_(s.id)}
              >
                <Coin n={price} light />
              </button>
            </Card>
          );
        })}
      </div>
      <p className="mt-2 rounded-xl border-2 border-dashed border-ink/20 p-2.5 text-[11px] opacity-70">
        Rare and legendary seeds are never sold. They arrive in trader parcels — and traders only come
        when you've done something real.
      </p>
    </>
  );
}

function ObjectsCat() {
  const game = useStore((s) => s.game);
  const buyObject_ = useStore((s) => s.buyObject_);
  return (
    <div className="flex flex-col gap-2">
      {OBJECTS.map((o) => (
        <Card key={o.id} className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-cream">
            <Sprite id={o.id} size={42} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{o.name}</div>
            <div className="text-[11px] opacity-60">{o.blurb}</div>
            <TagChips tags={{ ...o.tags, ...(o.tagsAtNight ?? {}) }} />
          </div>
          <button
            className="ds-pill flex shrink-0 items-center gap-1 bg-terra px-3 py-1.5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-40"
            disabled={game.coins < o.cost}
            onClick={() => buyObject_(o.id)}
          >
            <Coin n={o.cost} light />
          </button>
        </Card>
      ))}
      <p className="rounded-xl border-2 border-dashed border-ink/20 p-2.5 text-[11px] opacity-70">
        Objects never wilt and cost nothing to keep — the safe, permanent way to shape a garden.
      </p>
    </div>
  );
}

function GroundsCat() {
  const game = useStore((s) => s.game);
  const brambles = game.slots.filter((s) => s.status === 'overgrown').length;
  const expansions = game.slots.filter((s) => s.status === 'expansion').length;
  return (
    <div className="flex flex-col gap-2">
      <Card>
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <Sprite id="icon_scissors" size={18} /> Overgrown corners
        </div>
        <p className="mt-0.5 text-xs opacity-70">
          {brambles > 0 ? (
            <>
              {brambles} bramble patch{brambles === 1 ? '' : 'es'} left — tap one in the garden to clear it.
              Next: <Coin n={nextOvergrownPrice(game)} />.
            </>
          ) : (
            'All clear! The whole base garden is yours.'
          )}
        </p>
      </Card>
      {expansions > 0 && (
        <Card>
          <div className="text-sm font-bold">Designated expansions</div>
          <p className="mt-0.5 text-xs opacity-70">
            {expansions} dashed circle{expansions === 1 ? '' : 's'} in the garden — <Coin n={EXPANSION_SLOT_COST} />{' '}
            each, for running two builds at once.
          </p>
        </Card>
      )}
    </div>
  );
}
