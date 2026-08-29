/**
 * InventoryPanel — Seeds · Plants · Objects · Cosmetics (scheme §3), laid
 * out as card grids. Every seed shows its grown form right next to the
 * packet, so you always know what you're planting. Shelving is the strategy
 * layer: swap builds to hunt specific creatures.
 */
import { useState } from 'react';
import { COSMETICS, OBJECT_BY_ID, PLANT_BY_ID, SLOT_DEF_BY_ID, STAGE_ART } from '../config/content';
import { canShelve, isDormant, waterCost, wateringUseful } from '../engine/plants';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { TagChips } from './GardenScene';
import { Card, SectionTitle } from './Panels';

type Tab = 'seeds' | 'plants' | 'objects' | 'cosmetics';

export function InventoryPanel() {
  const [tab, setTab] = useState<Tab>('seeds');
  return (
    <>
      <div className="flex gap-1.5">
        {(['seeds', 'plants', 'objects', 'cosmetics'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`ds-pill px-3 py-1.5 text-xs capitalize ${tab === t ? 'bg-sage text-white' : 'bg-paper hover:bg-cream'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'seeds' && <SeedsTab />}
        {tab === 'plants' && <PlantsTab />}
        {tab === 'objects' && <ObjectsTab />}
        {tab === 'cosmetics' && <CosmeticsTab />}
      </div>
    </>
  );
}

function SeedsTab() {
  const seeds = useStore((s) => s.game.seeds);
  const startPlacement = useStore((s) => s.startPlacement);
  const owned = Object.entries(seeds).filter(([, n]) => n > 0);
  if (owned.length === 0) {
    return <Empty text="No seeds. The Shop sells the basics — the good ones come from trader parcels." />;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {owned.map(([speciesId, count]) => {
        const s = PLANT_BY_ID[speciesId];
        return (
          <Card key={speciesId} className="flex flex-col items-center p-3 text-center">
            {/* the seed packet with its grown form right beside it */}
            <span className="flex items-end gap-1">
              <Sprite id="stage_seed" size={44} />
              <span className="border-ink bg-cream rounded-full border-2 p-1">
                <Sprite id={s.id} size={30} title={`grows into ${s.name}`} />
              </span>
            </span>
            <div className="mt-1.5 text-sm leading-4 font-bold">
              {s.name} <span className="opacity-50">×{count}</span>
            </div>
            <div className="mt-0.5 text-[9px] tracking-wide uppercase opacity-50">
              {s.slotTypes.join(' · ').replace(/_/g, "'s ")}
            </div>
            <div className="mt-1 flex justify-center">
              <TagChips tags={s.tags} />
            </div>
            <button
              className="ds-pill bg-leaf mt-2 w-full py-1.5 text-sm font-bold text-white hover:brightness-105"
              onClick={() => startPlacement({ kind: 'seed', speciesId })}
            >
              Plant
            </button>
          </Card>
        );
      })}
    </div>
  );
}

function PlantsTab() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const startPlacement = useStore((s) => s.startPlacement);
  const shelve = useStore((s) => s.shelve);
  const water = useStore((s) => s.water);

  const placed = Object.values(game.plants).filter((p) => p.location !== 'shelf');
  const shelved = Object.values(game.plants).filter((p) => p.location === 'shelf');

  return (
    <>
      <SectionTitle>In the garden ({placed.length})</SectionTitle>
      {placed.length === 0 && <Empty text="Nothing planted yet." />}
      <div className="grid grid-cols-2 gap-2">
        {placed.map((p) => {
          const s = PLANT_BY_ID[p.speciesId];
          const wilted = isDormant(p, now);
          const gate = canShelve(p, now);
          const artId = p.stage === 'mature' || p.stage === 'growing' ? s.id : STAGE_ART[p.stage];
          return (
            <Card key={p.id} className="flex flex-col items-center p-3 text-center">
              <Sprite id={artId} size={46} className={wilted ? 'emoji-dormant' : undefined} />
              <div className="mt-1 text-sm leading-4 font-bold">{s.name}</div>
              <div className={`text-[10px] ${wilted ? 'text-terra font-bold' : 'opacity-55'}`}>
                {SLOT_DEF_BY_ID[p.location]?.label} · {p.stage}
                {wilted ? ' · wilted — water it!' : ''}
              </div>
              <div className="mt-2 flex w-full gap-1.5">
                <button
                  className="ds-pill bg-pond flex flex-1 items-center justify-center gap-1 py-1.5 text-xs font-bold text-white hover:brightness-105 disabled:opacity-40"
                  disabled={!wateringUseful(p, now) || game.coins < waterCost(p)}
                  onClick={() => water(p.id)}
                >
                  <Sprite id="watering_can" size={15} /> {waterCost(p)}
                </button>
                <button
                  className="ds-pill bg-cream hover:bg-wall flex-1 py-1.5 text-xs font-bold disabled:opacity-40"
                  disabled={!gate.ok}
                  title={gate.ok ? undefined : gate.reason}
                  onClick={() => shelve(p.id)}
                >
                  Shelve
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionTitle>On the shelf ({shelved.length}) — frozen, no upkeep</SectionTitle>
      {shelved.length === 0 && <Empty text="Shelved mature plants keep their stage forever — swap builds freely." />}
      <div className="grid grid-cols-2 gap-2">
        {shelved.map((p) => {
          const s = PLANT_BY_ID[p.speciesId];
          return (
            <Card key={p.id} className="flex flex-col items-center p-3 text-center">
              <Sprite id={s.id} size={46} />
              <div className="mt-1 text-sm leading-4 font-bold">{s.name}</div>
              <div className="mt-0.5 flex justify-center">
                <TagChips tags={s.tags} />
              </div>
              <button
                className="ds-pill bg-leaf mt-2 w-full py-1.5 text-sm font-bold text-white hover:brightness-105"
                onClick={() => startPlacement({ kind: 'shelf', itemId: p.id, speciesId: p.speciesId, isPlant: true })}
              >
                Place
              </button>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function ObjectsTab() {
  const game = useStore((s) => s.game);
  const startPlacement = useStore((s) => s.startPlacement);
  const shelve = useStore((s) => s.shelve);
  const placed = Object.values(game.objects).filter((o) => o.location !== 'shelf');
  const shelved = Object.values(game.objects).filter((o) => o.location === 'shelf');
  return (
    <>
      <SectionTitle>In the garden ({placed.length})</SectionTitle>
      {placed.length === 0 && <Empty text="Objects never wilt and cost nothing to keep." />}
      <div className="grid grid-cols-2 gap-2">
        {placed.map((o) => {
          const s = OBJECT_BY_ID[o.speciesId];
          return (
            <Card key={o.id} className="flex flex-col items-center p-3 text-center">
              <Sprite id={s.id} size={46} />
              <div className="mt-1 text-sm leading-4 font-bold">{s.name}</div>
              <div className="text-[10px] opacity-55">{SLOT_DEF_BY_ID[o.location]?.label}</div>
              <button
                className="ds-pill bg-cream hover:bg-wall mt-2 w-full py-1.5 text-xs font-bold"
                onClick={() => shelve(o.id)}
              >
                Shelve
              </button>
            </Card>
          );
        })}
      </div>
      <SectionTitle>On the shelf ({shelved.length})</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {shelved.map((o) => {
          const s = OBJECT_BY_ID[o.speciesId];
          return (
            <Card key={o.id} className="flex flex-col items-center p-3 text-center">
              <Sprite id={s.id} size={46} />
              <div className="mt-1 text-sm leading-4 font-bold">{s.name}</div>
              <div className="mt-0.5 flex justify-center">
                <TagChips tags={{ ...s.tags, ...(s.tagsAtNight ?? {}) }} />
              </div>
              <button
                className="ds-pill bg-leaf mt-2 w-full py-1.5 text-sm font-bold text-white hover:brightness-105"
                onClick={() => startPlacement({ kind: 'shelf', itemId: o.id, speciesId: o.speciesId, isPlant: false })}
              >
                Place
              </button>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function CosmeticsTab() {
  const owned = useStore((s) => s.game.cosmetics);
  const trophies = COSMETICS.filter((c) => c.class === 'trophy');
  const decor = COSMETICS.filter((c) => c.class === 'decor');
  return (
    <>
      <SectionTitle>Trophies — earned by recording, never sold</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {trophies.map((c) => {
          const has = owned.includes(c.id);
          return (
            <Card key={c.id} className={`text-center ${has ? '' : 'opacity-45'}`}>
              <Sprite id={c.id} size={44} className={has ? undefined : 'emoji-silhouette'} />
              <div className="mt-1 text-xs font-bold">{has ? c.name : '???'}</div>
              <div className="text-[10px] opacity-60">{has ? 'Proof of achievement' : 'Record its creature'}</div>
            </Card>
          );
        })}
      </div>
      <SectionTitle>Decor — from trader parcels</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {decor.map((c) => {
          const has = owned.includes(c.id);
          return (
            <Card key={c.id} className={`text-center ${has ? '' : 'opacity-45'}`}>
              <Sprite id={c.id} size={44} className={has ? undefined : 'emoji-silhouette'} />
              <div className="mt-1 text-xs font-bold">{has ? c.name : '???'}</div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border-2 border-dashed border-ink/20 p-3 text-xs opacity-70">{text}</p>;
}
