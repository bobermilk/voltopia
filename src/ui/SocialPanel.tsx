/**
 * SocialPanel — straight from the design's Social board: Me | Friends tabs,
 * profile hero (avatar circle, name, companion line, progress bar), Top 3
 * companions with medals, Collection preview circles, stats rows, and the
 * big Send-gift button on a friend's page. Friends are demo data (P1
 * backend); the layout is the real one.
 */
import { useState } from 'react';
import { CREATURES, CREATURE_BY_ID, FRIENDS, type FriendDef } from '../config/content';
import { guideCompletion } from '../engine/guide';
import { useStore } from '../state/store';
import { Sprite } from './art';
import { Card, SectionTitle } from './Panels';

const MEDAL = ['#e2b13c', '#c8bda9', '#c99a63'];

export function SocialPanel() {
  const [tab, setTab] = useState<'me' | 'friends'>('me');
  const [friend, setFriend] = useState<FriendDef | null>(null);

  return (
    <>
      <div className="flex items-center gap-4 px-1">
        {(['me', 'friends'] as const).map((t) => (
          <button
            key={t}
            className={`pb-1 text-sm font-bold capitalize ${tab === t ? 'border-b-[3px] border-terra text-ink' : 'opacity-45'}`}
            onClick={() => {
              setTab(t);
              setFriend(null);
            }}
          >
            {t === 'me' ? 'Me' : `Friends`}
            {t === 'friends' && <span className="ml-1 text-[10px] opacity-60">{FRIENDS.length}</span>}
          </button>
        ))}
        {friend && (
          <button className="ds-pill ml-auto bg-paper px-3 py-0.5 text-xs" onClick={() => setFriend(null)}>
            ← back
          </button>
        )}
      </div>

      <div className="mt-3">
        {tab === 'me' ? <MeTab /> : friend ? <FriendProfile f={friend} /> : <FriendList onOpen={setFriend} />}
      </div>
    </>
  );
}

/* ── shared building blocks (per the design board) ────────────────── */

function Hero({
  avatar,
  name,
  sub,
  pct,
  barLabel,
}: {
  avatar: string;
  name: string;
  sub: string;
  pct: number;
  barLabel: string;
}) {
  return (
    <Card className="bg-leaf-mist/50 text-center">
      <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-ink bg-paper">
        <Sprite id={avatar} size={72} />
      </span>
      <div className="font-display mt-2 text-xl">{name}</div>
      <div className="text-xs font-semibold opacity-60">{sub}</div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-display text-lg text-terra">{pct}%</span>
        <div className="h-3 flex-1 rounded-full bg-paper ring-1 ring-ink/25">
          <div className="h-3 rounded-full bg-terra" style={{ width: `${Math.max(3, pct)}%` }} />
        </div>
        <span className="text-[10px] font-bold opacity-50">{barLabel}</span>
      </div>
    </Card>
  );
}

function TopThree({ ids, title }: { ids: string[]; title: string }) {
  if (ids.length === 0) return null;
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {ids.slice(0, 3).map((cid, i) => (
          <Card key={cid} className="relative pt-4 text-center">
            <span
              className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink text-[11px] font-bold"
              style={{ background: MEDAL[i] }}
            >
              {i + 1}
            </span>
            <Sprite id={cid} size={46} />
            <div className="mt-1 text-[11px] font-bold">{CREATURE_BY_ID[cid].name.split(' ').slice(-1)[0]}</div>
            <div className="text-[9px] opacity-50">{CREATURE_BY_ID[cid].recordedBy}% have this</div>
          </Card>
        ))}
      </div>
    </>
  );
}

function CollectionPreview({ recorded, total, unknownIds }: { recorded: string[]; total: number; unknownIds: number }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold">
          Collection <span className="text-terra">{recorded.length} / {total}</span>
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {recorded.slice(0, 5).map((cid) => (
          <span key={cid} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-leaf-mist/60">
            <Sprite id={cid} size={30} />
          </span>
        ))}
        {Array.from({ length: Math.min(2, Math.max(0, total - recorded.length)) }, (_, i) => (
          <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/80 text-sm font-bold text-cream">
            ?
          </span>
        ))}
        {unknownIds > 0 && (
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-ink/30 text-[10px] font-bold opacity-60">
            +{unknownIds}
          </span>
        )}
      </div>
    </Card>
  );
}

function StatRows({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="mt-3 flex flex-col gap-2 px-1">
      {rows.map(([icon, label, value]) => (
        <div key={label} className="flex items-center gap-2 text-sm">
          <Sprite id={icon} size={18} />
          <span className="flex-1 font-semibold opacity-75">{label}</span>
          <span className="font-display text-terra">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Me ───────────────────────────────────────────────────────────── */

function MeTab() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const setProfile = useStore((s) => s.setProfile);
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState(game.profile.name);
  const completion = guideCompletion(game);

  const recorded = CREATURES.filter((c) => game.guide[c.id]?.state === 'recorded').map((c) => c.id);
  const day = Math.max(1, Math.floor((now - game.createdAt) / 86400000) + 1);
  const missionsDone = Object.values(game.quests.dailies).filter(Boolean).length;
  const showcase = game.profile.showcase.length > 0 ? game.profile.showcase : recorded.slice(0, 3);

  const toggleShowcase = (cid: string) => {
    const cur = game.profile.showcase;
    const next = cur.includes(cid) ? cur.filter((x) => x !== cid) : [...cur, cid].slice(-3);
    setProfile({ showcase: next });
  };

  return (
    <>
      <Hero
        avatar={game.profile.avatar}
        name={game.profile.name}
        sub={`& ${CREATURE_BY_ID[game.profile.avatar]?.name ?? 'Munchkin the cat'}`}
        pct={completion.pct}
        barLabel={`${completion.recorded} / ${completion.total}`}
      />

      <TopThree ids={showcase} title="Top 3 companions — tap below to change" />

      <SectionTitle>Collection</SectionTitle>
      <CollectionPreview recorded={recorded} total={completion.total} unknownIds={Math.max(0, completion.total - recorded.length - 2)} />

      <StatRows
        rows={[
          ['icon_check', 'Missions completed', String(missionsDone)],
          ['tag_wet', 'Waterings given', String(game.log.filter((l) => l.kind === 'quest').length + missionsDone)],
          ['icon_sparkle', 'Creatures recorded', String(recorded.length)],
          ['icon_clock', 'Gardening since', `Day 1 · now Day ${day}`],
        ]}
      />

      <SectionTitle>Display name</SectionTitle>
      <div className="flex gap-2">
        <input
          className="ds-pill flex-1 bg-paper px-3 py-2 text-sm font-semibold text-ink"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="ds-pill bg-leaf px-4 py-2 text-sm font-bold text-white hover:brightness-105 disabled:opacity-40"
          disabled={!name.trim() || name.trim() === game.profile.name}
          onClick={() => {
            setProfile({ name: name.trim() });
            toast('icon_check', 'Name saved.');
          }}
        >
          Save
        </button>
      </div>

      <SectionTitle>Avatar & showcase</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {/* Munchkin is always available — the first companion */}
        <div className={`ds-card flex flex-col items-center gap-1 p-2 ${game.profile.avatar === 'munchkin_cat' ? 'bg-sun/25' : ''}`}>
          <Sprite id="munchkin_cat" size={40} />
          <span className="text-[8px] font-bold tracking-wide uppercase opacity-50">companion</span>
          <button
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${game.profile.avatar === 'munchkin_cat' ? 'bg-terra text-white' : 'bg-cream hover:bg-wall'}`}
            onClick={() => setProfile({ avatar: 'munchkin_cat' })}
          >
            avatar
          </button>
        </div>
      </div>
      {recorded.length === 0 ? (
        <p className="mt-2 rounded-xl border-2 border-dashed border-ink/20 p-3 text-xs opacity-70">
          Record creatures to unlock more avatars and a showcase.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {recorded.map((cid) => {
            const isAvatar = game.profile.avatar === cid;
            const inShowcase = game.profile.showcase.includes(cid);
            return (
              <div key={cid} className={`ds-card flex flex-col items-center gap-1 p-2 ${isAvatar ? 'bg-sun/25' : ''}`}>
                <Sprite id={cid} size={40} />
                <div className="flex gap-1">
                  <button
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isAvatar ? 'bg-terra text-white' : 'bg-cream hover:bg-wall'}`}
                    onClick={() => setProfile({ avatar: cid })}
                  >
                    avatar
                  </button>
                  <button
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${inShowcase ? 'bg-sun' : 'bg-cream hover:bg-wall'}`}
                    onClick={() => toggleShowcase(cid)}
                  >
                    top 3
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Friends ──────────────────────────────────────────────────────── */

function FriendList({ onOpen }: { onOpen: (f: FriendDef) => void }) {
  return (
    <>
      <div className="rounded-2xl border-2 border-leaf/40 bg-leaf/10 p-3 text-[11px] leading-4 font-semibold">
        Rarity is the flex — "recorded by 4% of gardeners" only means something because friends can
        see it. Visiting reveals one clue about a creature in their garden.
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {FRIENDS.map((f) => (
          <Card key={f.id} className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-leaf-mist/60">
              <Sprite id={f.avatar} size={38} />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-bold">
                {f.name}
                {f.verified && (
                  <span className="flex items-center gap-0.5 rounded-full bg-pond/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-pond uppercase">
                    <Sprite id="icon_bolt" size={10} /> verified
                  </span>
                )}
              </div>
              <div className="text-[11px] opacity-60">
                Field Guide {f.guidePct}% · streak {f.streak} days
              </div>
            </div>
            <button className="ds-pill bg-leaf px-3 py-1.5 text-xs font-bold text-white hover:brightness-105" onClick={() => onOpen(f)}>
              Visit
            </button>
          </Card>
        ))}
      </div>
      <p className="mt-2 rounded-xl border-2 border-dashed border-ink/20 p-2.5 text-[11px] opacity-70">
        Add-by-code and nudges ship with the friends backend — these profiles show the layout with
        demo gardeners.
      </p>
    </>
  );
}

function FriendProfile({ f }: { f: FriendDef }) {
  const toast = useStore((s) => s.toast);
  const total = CREATURES.length;
  const recordedCount = Math.round((f.guidePct / 100) * total);
  return (
    <>
      <Hero avatar={f.avatar} name={f.name} sub={`& ${CREATURE_BY_ID[f.avatar].name}`} pct={f.guidePct} barLabel={`${recordedCount} / ${total}`} />
      <TopThree ids={f.showcase} title="Top 3 companions" />
      <SectionTitle>Collection</SectionTitle>
      <CollectionPreview recorded={f.showcase} total={total} unknownIds={Math.max(0, recordedCount - f.showcase.length)} />
      <StatRows
        rows={[
          ['icon_check', 'Missions completed', String(40 + f.streak * 5)],
          ['tag_wet', 'Litres of water saved', (f.streak * 90).toLocaleString()],
          ['icon_sparkle', 'Rare creatures', String(f.showcase.length)],
          ['icon_clock', 'Gardening since', 'Mar 2026'],
        ]}
      />
      <button
        className="ds-pill mt-4 flex w-full items-center justify-center gap-2 bg-terra px-4 py-3 font-bold text-white shadow-md hover:brightness-105"
        onClick={() => toast('icon_gift', `A gift for ${f.name} — sending ships with the friends backend (P1).`)}
      >
        <Sprite id="icon_gift" size={20} /> Send gift <span className="text-xs font-semibold opacity-80">seed pack · 1 free daily</span>
      </button>
    </>
  );
}
