/**
 * GuidePanel — per the design: Bestiary as a grid of circular portraits
 * (recorded / silhouette-? / dashed not-yet-seen), tapping one opens a
 * Critterbook detail page (framed portrait, trait pills, visits, memento,
 * costume row). Herbarium: grown-plant circles + plant health.
 */
import { useState } from 'react';
import { MEMENTO_AT_VISIT, RARITIES } from '../config/balance';
import { COSMETIC_BY_ID, CREATURES, PLANTS, STAGE_ART, TAG_ICON, type CreatureSpecies, type Tag } from '../config/content';
import { clueLines } from '../engine/catchup';
import { guideCompletion } from '../engine/guide';
import { isDormant } from '../engine/plants';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { TagChips } from './GardenScene';
import { Card, SectionTitle } from './Panels';

export function GuidePanel() {
  const [tab, setTab] = useState<'bestiary' | 'herbarium'>('bestiary');
  const [detail, setDetail] = useState<string | null>(null);
  const game = useStore((s) => s.game);
  const completion = guideCompletion(game);

  if (detail) {
    return <CritterbookDetail creatureId={detail} onBack={() => setDetail(null)} />;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="ds-pill flex gap-0.5 bg-paper p-0.5">
          {(['herbarium', 'bestiary'] as const).map((t) => (
            <button
              key={t}
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${tab === t ? 'bg-sage text-white' : 'opacity-55 hover:opacity-80'}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'bestiary' && (
          <span className="text-xs font-bold opacity-60">
            {completion.recorded} / {completion.total}
          </span>
        )}
      </div>
      <div className="mt-4">{tab === 'bestiary' ? <Bestiary onOpen={setDetail} /> : <Herbarium />}</div>
    </>
  );
}

/* ── bestiary: circular portrait grid ─────────────────────────────── */

function PortraitCircle({ c, onOpen }: { c: CreatureSpecies; onOpen: (id: string) => void }) {
  const guide = useStore((s) => s.game.guide);
  const entry = guide[c.id];
  const state = entry?.state ?? 'unknown';

  if (state === 'unknown') {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-ink/30">
          <svg viewBox="0 0 24 24" width="20" height="20" opacity={0.35}>
            <circle cx="8" cy="9" r="2.2" fill="#57422e" />
            <circle cx="16" cy="9" r="2.2" fill="#57422e" />
            <circle cx="12" cy="7" r="2.2" fill="#57422e" />
            <ellipse cx="12" cy="15" rx="4.6" ry="3.6" fill="#57422e" />
          </svg>
        </span>
        <span className="text-[10px] font-semibold opacity-40">not yet seen</span>
      </div>
    );
  }
  if (state === 'sighted') {
    return (
      <button className="flex flex-col items-center gap-1" onClick={() => onOpen(c.id)}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-ink/85 text-xl font-bold text-cream">
          ?
        </span>
        <span className="text-[10px] font-semibold opacity-55">sighted ×{entry!.sightings}</span>
      </button>
    );
  }
  return (
    <button className="flex flex-col items-center gap-1" onClick={() => onOpen(c.id)}>
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-leaf-mist/70">
        <Sprite id={c.id} size={48} />
        {entry!.mementoEarned && (
          <span className="absolute -right-1 -bottom-1">
            <Sprite id="icon_medal" size={18} />
          </span>
        )}
      </span>
      <span className="max-w-20 truncate text-[10px] font-bold">{c.name.split(' ').slice(-1)[0]}</span>
    </button>
  );
}

function Bestiary({ onOpen }: { onOpen: (id: string) => void }) {
  const game = useStore((s) => s.game);
  const sightedAway = Object.values(game.guide).filter((g) => g.state === 'sighted').length;
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold opacity-50">? = visited while you were away</p>
      {RARITIES.map((rarity) => (
        <div key={rarity}>
          <SectionTitle>{rarity}</SectionTitle>
          <div className="grid grid-cols-4 gap-x-1 gap-y-3">
            {CREATURES.filter((c) => c.rarity === rarity).map((c) => (
              <PortraitCircle key={c.id} c={c} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
      {sightedAway > 0 && (
        <div className="mt-4 flex gap-2 rounded-2xl border-2 border-ink/15 bg-paper p-3 text-[11px] leading-4 font-semibold opacity-80">
          <span className="text-terra">!</span>
          {sightedAway === 1 ? 'A critter' : `${sightedAway} critters`} came by while you were away — grow
          their favourite plants and stay watered to catch them next time.
        </div>
      )}
    </>
  );
}

/* ── critterbook detail (design board 5j) ─────────────────────────── */

function CritterbookDetail({ creatureId, onBack }: { creatureId: string; onBack: () => void }) {
  const game = useStore((s) => s.game);
  const c = CREATURES.find((x) => x.id === creatureId)!;
  const entry = game.guide[creatureId];
  const recorded = entry?.state === 'recorded';
  const no = CREATURES.indexOf(c) + 1;
  const clues = clueLines(c);
  const prefEntries = Object.entries(c.prefs).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const cosmetic = c.unlocksCosmetic ? COSMETIC_BY_ID[c.unlocksCosmetic] : null;
  const seenAt = entry?.firstSightedAt ?? entry?.recordedAt;
  const firstSeen = seenAt ? `Day ${Math.max(1, Math.floor((seenAt - game.createdAt) / 86400000) + 1)}` : '—';

  return (
    <>
      <div className="flex items-center justify-between">
        <button className="ds-pill bg-paper px-3 py-1 text-xs" onClick={onBack}>
          ← Field Guide
        </button>
        <span className="font-display text-lg">Critterbook</span>
        <span className="text-[11px] font-bold opacity-50">
          no. {String(no).padStart(2, '0')} / {CREATURES.length}
        </span>
      </div>

      <Card className="mt-3 bg-wall/60 p-4">
        <div className="flex items-center justify-between">
          <span className="ds-pill bg-paper px-4 py-1.5 text-base font-bold">
            {recorded ? c.name : '???'}
          </span>
          <span className="ds-pill bg-paper px-2.5 py-1 text-[10px] font-bold tracking-wider text-terra uppercase">
            {c.rarity}
          </span>
        </div>

        <div className="mt-3 flex gap-3">
          {/* framed portrait */}
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-32 w-32 items-center justify-center rounded-2xl border-[3px] border-ink bg-leaf-mist">
              {recorded ? <Sprite id={c.id} size={104} /> : <Sprite id={c.id} size={104} className="emoji-silhouette" />}
            </span>
            <span className="ds-pill bg-paper px-2 py-0.5 text-[10px] font-semibold">
              {recorded ? c.blurb.split('.')[0] : `sighted ×${entry?.sightings ?? 0}`}
            </span>
          </div>
          {/* labelled pills */}
          <div className="flex flex-1 flex-col gap-1.5">
            <Field label="Loves" value={recorded ? prefEntries.map(([t]) => t).join(' · ') : (entry?.cluesRevealed ?? 0) > 0 ? clues[0].replace('Prefers ', '').replace(' gardens', '') : '???'} />
            <Field label="Visits" value={String(entry?.visits ?? 0)} />
            <Field label="First seen" value={firstSeen} />
            <Field label="Recorded by" value={`${c.recordedBy}% of gardeners`} />
          </div>
        </div>

        {recorded ? (
          <>
            <div className="mt-3 flex justify-center gap-1.5">
              {prefEntries.map(([t, v]) => (
                <span key={t} className="ds-pill flex items-center gap-1 bg-paper px-2 py-0.5 text-[10px] font-bold">
                  <Sprite id={TAG_ICON[t as Tag]} size={13} /> {t} +{v}
                </span>
              ))}
            </div>
            <p className="mt-2 text-center text-xs opacity-70">{c.blurb}</p>
          </>
        ) : (
          <div className="mt-3">
            <SectionTitle>Clues so far</SectionTitle>
            <ul className="text-xs leading-5 font-semibold opacity-75">
              {clues.slice(0, entry?.cluesRevealed ?? 0).map((cl) => (
                <li key={cl}>· {cl}</li>
              ))}
              {(entry?.cluesRevealed ?? 0) < clues.length && (
                <li className="opacity-45">· each missed visit reveals one more…</li>
              )}
            </ul>
          </div>
        )}
      </Card>

      {recorded && entry!.mementoEarned && (
        <Card className="mt-2 flex items-center gap-3 border-leaf/50 bg-leaf/10">
          <Sprite id="icon_medal" size={34} />
          <div>
            <div className="text-sm font-bold">Memento earned</div>
            <div className="text-[11px] opacity-70">
              Left after the {MEMENTO_AT_VISIT}th visit · "it's yours now."
            </div>
          </div>
        </Card>
      )}
      {recorded && !entry!.mementoEarned && (
        <p className="mt-2 text-center text-[11px] font-semibold opacity-50">
          Memento at visit {MEMENTO_AT_VISIT} — {entry!.visits} so far.
        </p>
      )}

      {cosmetic && (
        <Card className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold opacity-70">Trophy</span>
          {game.cosmetics.includes(cosmetic.id) ? (
            <span className="ds-pill flex items-center gap-1.5 bg-sun/40 px-3 py-1 text-xs font-bold">
              <Sprite id={cosmetic.id} size={18} /> {cosmetic.name} ✓
            </span>
          ) : (
            <span className="rounded-full border-2 border-dashed border-ink/30 px-3 py-1 text-xs font-semibold opacity-50">
              record to unlock
            </span>
          )}
        </Card>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold tracking-wider uppercase opacity-45">{label}</div>
      <div className="ds-pill mt-0.5 bg-paper px-2.5 py-1 text-xs font-bold">{value}</div>
    </div>
  );
}

/* ── herbarium ────────────────────────────────────────────────────── */

function Herbarium() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const grown = PLANTS.filter((p) => Object.values(game.plants).some((pl) => pl.speciesId === p.id && pl.stage === 'mature'));
  return (
    <>
      <SectionTitle>Grown plants · {grown.length} / {PLANTS.length}</SectionTitle>
      <div className="grid grid-cols-4 gap-x-1 gap-y-3">
        {PLANTS.map((p) => {
          const instances = Object.values(game.plants).filter((pl) => pl.speciesId === p.id);
          const seedCount = game.seeds[p.id] ?? 0;
          const isGrown = instances.some((i) => i.stage === 'mature');
          const known = instances.length > 0 || seedCount > 0;
          return (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  isGrown
                    ? 'border-2 border-ink bg-paper'
                    : known
                      ? 'border-2 border-ink/40 bg-paper/60'
                      : 'border-2 border-dashed border-ink/25'
                }`}
              >
                <Sprite id={p.id} size={46} className={known ? undefined : 'emoji-silhouette opacity-40'} />
              </span>
              <span className={`max-w-20 truncate text-[10px] font-bold ${known ? '' : 'opacity-35'}`}>
                {known ? p.name.split(' ')[0] : '???'}
              </span>
            </div>
          );
        })}
      </div>

      <SectionTitle>Plant health</SectionTitle>
      <HealthSummary />

      <SectionTitle>Growing now</SectionTitle>
      <div className="flex flex-col gap-2">
        {Object.values(game.plants)
          .filter((pl) => pl.location !== 'shelf')
          .map((pl) => {
            const p = PLANTS.find((x) => x.id === pl.speciesId)!;
            const dormant = isDormant(pl, now);
            return (
              <Card key={pl.id} className="flex items-center gap-3 py-2">
                <Sprite
                  id={pl.stage === 'mature' || pl.stage === 'growing' ? p.id : STAGE_ART[pl.stage]}
                  size={34}
                  className={dormant ? 'emoji-dormant' : undefined}
                />
                <div className="flex-1">
                  <div className="text-sm font-bold">{p.name}</div>
                  <div className={`text-[10px] ${dormant ? 'text-terra font-bold' : 'opacity-55'}`}>
                    {pl.stage}
                    {dormant ? ' · wilted — water it!' : ''}
                  </div>
                </div>
                <TagChips tags={p.tags} />
              </Card>
            );
          })}
      </div>
    </>
  );
}

function HealthSummary() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const placed = Object.values(game.plants).filter((p) => p.location !== 'shelf');
  const dormant = placed.filter((p) => isDormant(p, now)).length;
  const shelved = Object.values(game.plants).length - placed.length;
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ['Lush', placed.length - dormant, 'bg-leaf/15 border-leaf/50', 'growing · attracts critters'],
        ['Wilted', dormant, 'bg-wall border-wood-pale', 'Water it!'],
        ['Shelved', shelved, 'bg-paper border-ink/20', 'frozen · no upkeep'],
      ].map(([label, n, cls, sub]) => (
        <div key={label as string} className={`rounded-2xl border-2 p-2.5 text-center ${cls}`}>
          <Sprite id="icon_leaf" size={22} className={label === 'Wilted' ? 'emoji-dormant' : label === 'Shelved' ? 'opacity-50' : undefined} />
          <div className="text-sm font-bold">
            {label} · {n}
          </div>
          <div className="text-[9px] leading-3 opacity-60">{sub}</div>
        </div>
      ))}
    </div>
  );
}
