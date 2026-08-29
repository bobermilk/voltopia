/**
 * GardenScene — composed per the design artifact's garden boards: roof strip,
 * cream house wall with the big paned window, wooden veranda with steps down
 * to a flat sunlit yard, pond at the bottom right, fig canopy peeking over
 * the roof. Invisible anchor slots throughout (scheme §2).
 *
 * Interactions (per design direction):
 *  - TAP a plant → waters it (watering-can pour animation + floating cost).
 *    If watering would do nothing, tap opens the info popover instead.
 *  - LONG-PRESS a plant (or shift-click on desktop) → Water-all confirmation.
 *  - Parcels no longer pile at a gate — they live in the Parcels tab.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { OVERGROWN_PRICES, EXPANSION_SLOT_COST, EXPANSION_LIMIT, GROWTH } from '../config/balance';
import {
  CREATURE_BY_ID,
  OBJECT_BY_ID,
  PLANT_BY_ID,
  SLOT_DEFS,
  STAGE_ART,
  TAG_ICON,
  VISITOR_ANCHORS,
  type SlotDef,
} from '../config/content';
import { occupantOf, nextOvergrownPrice } from '../engine/actions';
import {
  canShelve,
  growthWaterReady,
  isDormant,
  isThirsty,
  nextGrowthWaterAt,
  thirstFraction,
  waterCost,
  wateringUseful,
} from '../engine/plants';
import { isNight } from '../engine/tags';
import type { GameState, PlantInstance, Visitor } from '../engine/types';
import { useStore } from '../state/store';
import { SceneSprite, Sprite } from './art';

const LONG_PRESS_MS = 500;

/** Munchkin's idle chatter — tap the resident cat on the veranda. */
const CAT_LINES = [
  'Mrrp. Carry on.',
  'I supervised the sunflower personally.',
  'The snail and I have an understanding.',
  'Water the plants, not the cat.',
  'Everything here is going exactly as I planned.',
  'The pond is off-limits. To me. By choice.',
];

interface Popover {
  slotId: string;
  x: number; // container-relative px
  y: number;
}

interface Pour {
  slotId: string;
  cost: number;
  key: number;
}

export function GardenScene() {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  const placement = useStore((s) => s.placement);
  const confirmPlacement = useStore((s) => s.confirmPlacement);
  const cancelPlacement = useStore((s) => s.cancelPlacement);
  const record_ = useStore((s) => s.record_);
  const dismissVisitor_ = useStore((s) => s.dismissVisitor_);
  const water = useStore((s) => s.water);
  const setWaterAllOpen = useStore((s) => s.setWaterAllOpen);
  const toast = useStore((s) => s.toast);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [pour, setPour] = useState<Pour | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ timer: number; fired: boolean } | null>(null);
  const pourSeq = useRef(0);
  const catLine = useRef(0);

  const night = isNight(now);
  const slotById = useMemo(() => Object.fromEntries(game.slots.map((s) => [s.id, s])), [game.slots]);

  const placementSpecies = placement
    ? (PLANT_BY_ID[placement.speciesId] ?? OBJECT_BY_ID[placement.speciesId])
    : null;

  const eligible = (def: SlotDef): boolean => {
    if (!placementSpecies) return false;
    const inst = slotById[def.id];
    return (
      inst?.status === 'open' &&
      placementSpecies.slotTypes.includes(def.type) &&
      !occupantOf(game, def.id)
    );
  };

  const openPopover = (def: SlotDef, e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    setPopover({
      slotId: def.id,
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  };

  /** Tap = water when useful, otherwise inspect. Shift-click = water all. */
  const clickSlot = (def: SlotDef, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pressRef.current?.fired) return; // long-press already handled it
    if (placement) {
      if (eligible(def)) confirmPlacement(def.id);
      else cancelPlacement();
      return;
    }
    const occ = occupantOf(game, def.id);
    if (occ?.kind === 'plant') {
      if (e.shiftKey) {
        setWaterAllOpen(true);
        return;
      }
      const plant = occ.item;
      const cost = waterCost(plant);
      if (wateringUseful(plant, now) && game.coins >= cost) {
        water(plant.id);
        setPour({ slotId: def.id, cost, key: ++pourSeq.current });
        window.setTimeout(() => setPour((p) => (p?.slotId === def.id ? null : p)), 1100);
        return;
      }
    }
    openPopover(def, e);
  };

  const pressStart = (def: SlotDef) => {
    const occ = occupantOf(game, def.id);
    if (occ?.kind !== 'plant' || placement) return;
    const state = { timer: 0, fired: false };
    state.timer = window.setTimeout(() => {
      state.fired = true;
      setWaterAllOpen(true);
    }, LONG_PRESS_MS);
    pressRef.current = state;
  };

  const pressEnd = () => {
    if (pressRef.current) {
      clearTimeout(pressRef.current.timer);
      // leave `fired` readable for the click that follows, then clear
      const cur = pressRef.current;
      window.setTimeout(() => {
        if (pressRef.current === cur) pressRef.current = null;
      }, 50);
    }
  };

  return (
    <div ref={wrapRef} className="absolute inset-0" onClick={() => setPopover(null)}>
      <svg
        viewBox="0 0 1000 1600"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-label="Your garden"
      >
        <Backdrop night={night} />

        {/* slots + occupants */}
        {SLOT_DEFS.map((def) => {
          const inst = slotById[def.id];
          if (!inst) return null;
          if (inst.status === 'overgrown') return <Bramble key={def.id} def={def} onClick={(e) => clickSlot(def, e)} />;
          if (inst.status === 'expansion') return <Expansion key={def.id} def={def} onClick={(e) => clickSlot(def, e)} />;
          const occ = occupantOf(game, def.id);
          return (
            <g
              key={def.id}
              onClick={(e) => clickSlot(def, e)}
              onPointerDown={() => pressStart(def)}
              onPointerUp={pressEnd}
              onPointerLeave={pressEnd}
              className="cursor-pointer"
            >
              {/* generous invisible hit area — SVG only hit-tests painted pixels */}
              <circle cx={def.x} cy={def.y - 34} r={64} fill="transparent" />
              <ellipse cx={def.x} cy={def.y + 10} rx={38} ry={11} fill="rgba(87,66,46,0.10)" />
              {placement && eligible(def) && (
                <circle cx={def.x} cy={def.y - 14} r={34} fill="rgba(143,174,98,0.45)" stroke="#4f7a42" strokeWidth={4} strokeDasharray="8 7" style={{ animation: 'pulse-slot 1.2s ease-in-out infinite' }} />
              )}
              {placement && !eligible(def) && !occ && (
                <circle cx={def.x} cy={def.y - 10} r={22} fill="rgba(87,66,46,0.10)" />
              )}
              {occ?.kind === 'plant' && <PlantSprite plant={occ.item} def={def} now={now} />}
              {occ?.kind === 'object' && <SceneSprite id={occ.item.speciesId} x={def.x} y={def.y + 16} size={132} />}
              {pour?.slotId === def.id && <PourFx def={def} cost={pour.cost} key={pour.key} />}
            </g>
          );
        })}

        {/* Munchkin, the resident cat — every garden's starting animal */}
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            toast('munchkin_cat', CAT_LINES[catLine.current++ % CAT_LINES.length]);
          }}
        >
          <circle cx={300} cy={352} r={52} fill="transparent" />
          <ellipse cx={300} cy={388} rx={34} ry={9} fill="rgba(87,66,46,0.14)" />
          <g className="anim-bob" style={{ animationDuration: '3.6s' }}>
            <SceneSprite id="munchkin_cat" x={300} y={388} size={112} />
          </g>
        </g>

        {/* visitors — animate in on arrival, walk/fly out + fade on departure.
            Kept mounted a beat past departsAt so the exit animation can play. */}
        {game.visitors
          .filter((v) => v.arrivedAt <= now && now < v.departsAt + EXIT_REAL_MS * game.clock.scale)
          .map((v) => (
            <VisitorSprite
              key={v.id}
              v={v}
              now={now}
              known={game.guide[v.creatureId]?.state === 'recorded'}
              onRecord={record_}
              onDismiss={dismissVisitor_}
            />
          ))}

        {night && <NightOverlay />}
      </svg>

      {placement && placementSpecies && (
        <div className="ds-card absolute top-28 left-1/2 z-20 w-[90%] max-w-sm -translate-x-1/2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Sprite id={placementSpecies.id} size={30} />
            <span className="flex-1 text-sm font-bold">Placing {placementSpecies.name} — tap a glowing spot</span>
            <button
              className="ds-pill bg-cream px-3 py-1 text-xs hover:bg-wall"
              onClick={cancelPlacement}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {popover && (
        <SlotPopover popover={popover} game={game} now={now} onClose={() => setPopover(null)} />
      )}
    </div>
  );
}

/* ── visitors ─────────────────────────────────────────────────────── */

/** Real-time length of the walk/fly-out on departure. */
const EXIT_REAL_MS = 1100;
const GROUND_INSECTS = new Set(['garden_snail', 'ant_trail']);

/** Winged creatures fly in/out; everything else saunters in on foot. */
function isFlyer(creatureId: string): boolean {
  const cat = CREATURE_BY_ID[creatureId]?.category;
  if (cat === 'bird' || cat === 'moth') return true;
  return cat === 'insect' && !GROUND_INSECTS.has(creatureId);
}

/** Flying insects & moths buzz around; birds and land animals waddle in place. */
function wanderClass(creatureId: string): string {
  const cat = CREATURE_BY_ID[creatureId]?.category;
  const buzzes = (cat === 'insect' && !GROUND_INSECTS.has(creatureId)) || cat === 'moth';
  return buzzes ? 'anim-buzz' : 'anim-waddle';
}

/**
 * One visiting creature. Plays an arrival animation once on mount (birds swoop
 * from above, land animals saunter in from the nearer side with a little
 * waltz), then settles into the idle bob. When `now` passes departsAt it plays
 * the matching exit (walk/fly off + fade) before the parent unmounts it.
 */
const HEART_PATH = 'M0 4 C -2 -2 -10 -1 -10 5 C -10 11 -2 13 0 16 C 2 13 10 11 10 5 C 10 -1 2 -2 0 4 Z';

function VisitorSprite({
  v,
  now,
  known,
  onRecord,
  onDismiss,
}: {
  v: Visitor;
  now: number;
  /** The creature is already in the Field Guide — clicking pats it. */
  known: boolean;
  onRecord: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [entered, setEntered] = useState(false);
  const [patKey, setPatKey] = useState(0); // >0 while patting; bumps per pat
  const [patCount, setPatCount] = useState(0); // monotonic — keys the pill fade
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const c = CREATURE_BY_ID[v.creatureId];
  const anchor = VISITOR_ANCHORS[v.anchor] ?? VISITOR_ANCHORS[0];
  const flyer = isFlyer(v.creatureId);
  const fromLeft = anchor.x < 500;
  const exiting = leaving || now >= v.departsAt;
  const patting = patKey > 0;

  const pat = () => {
    setPatKey((k) => k + 1);
    setPatCount((k) => k + 1); // restart the pill's fade on each pat
    setMenuOpen(true);
    window.setTimeout(() => setPatKey(0), 650);
  };
  const askLeave = () => {
    setMenuOpen(false);
    setLeaving(true);
    window.setTimeout(() => onDismiss(v.id), EXIT_REAL_MS);
  };

  const anim = exiting
    ? flyer
      ? 'anim-fly-out'
      : fromLeft
        ? 'anim-walk-out-l'
        : 'anim-walk-out-r'
    : !entered
      ? flyer
        ? 'anim-fly-in'
        : fromLeft
          ? 'anim-saunter-l'
          : 'anim-saunter-r'
      : undefined;

  return (
    <g
      className={exiting ? undefined : 'cursor-pointer'}
      style={exiting ? { pointerEvents: 'none' } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (exiting) return;
        if (known) pat();
        else onRecord(v.id);
      }}
    >
      <g className={anim}>
        <circle cx={anchor.x} cy={anchor.y - 40} r={70} fill="transparent" />
        <ellipse cx={anchor.x} cy={anchor.y + 12} rx={40} ry={12} fill="rgba(87,66,46,0.14)" />
        <g className={wanderClass(v.creatureId)}>
          <g key={patKey} className={patting ? 'anim-pat' : undefined}>
            <SceneSprite id={c.id} x={anchor.x} y={anchor.y + 12} size={144} className={c.rarity === 'legendary' ? 'anim-glow' : undefined} />
          </g>
          {!v.recordedThisVisit && !known && !exiting && (
            <g className="anim-twinkle">
              <circle cx={anchor.x + 48} cy={anchor.y - 96} r={16} fill="#e2b13c" stroke="#57422e" strokeWidth={3} />
              <path d={`M${anchor.x + 48} ${anchor.y - 104}v9`} stroke="#57422e" strokeWidth={4} strokeLinecap="round" />
              <circle cx={anchor.x + 48} cy={anchor.y - 89} r={2} fill="#57422e" />
            </g>
          )}
        </g>

        {/* heart particles when patted */}
        {patting &&
          [-34, -12, 12, 34].map((dx, i) => (
            <g key={`${patKey}-${i}`} transform={`translate(${anchor.x + dx / 2} ${anchor.y - 40})`}>
              <g className="anim-heart" style={{ ['--dx' as string]: `${dx}px`, animationDelay: `${i * 0.09}s` }}>
                <path d={HEART_PATH} fill="#e8688a" stroke="#57422e" strokeWidth={2} />
              </g>
            </g>
          ))}
      </g>

      {/* "ask to leave" interface — appears after patting a known animal */}
      {menuOpen && !exiting && (
        <g
          key={patCount}
          className="anim-leave-pill"
          transform={`translate(${anchor.x} ${anchor.y - 160})`}
          onAnimationEnd={() => setMenuOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            askLeave();
          }}
        >
          <rect x={-86} y={-24} width={172} height={48} rx={24} fill="#c67139" stroke="#57422e" strokeWidth={3} />
          <text x={0} y={8} textAnchor="middle" fontSize={22} fontWeight={700} fill="#fffdf6">
            Ask to leave
          </text>
        </g>
      )}
    </g>
  );
}

/* ── occupant sprites ─────────────────────────────────────────────── */

function PlantSprite({ plant, def, now }: { plant: PlantInstance; def: SlotDef; now: number }) {
  const dormant = isDormant(plant, now);
  const thirsty = isThirsty(plant, now);
  const needsWater = dormant || thirsty || growthWaterReady(plant, now) || plant.stage === 'seed';
  const artId = plant.stage === 'mature' || plant.stage === 'growing' ? plant.speciesId : STAGE_ART[plant.stage];
  const size = { seed: 64, sprout: 82, growing: 104, mature: 134 }[plant.stage];
  return (
    <g>
      <g className={dormant ? undefined : 'anim-sway'}>
        <SceneSprite id={artId} x={def.x} y={def.y + 14} size={size} className={dormant ? 'emoji-dormant' : undefined} opacity={plant.stage === 'growing' ? 0.95 : 1} />
      </g>
      {dormant && (
        <g opacity={0.85}>
          <text x={def.x + 34} y={def.y - size + 6} fontSize={30} fontWeight={800} fill="#7a8aa0" transform={`rotate(12 ${def.x + 34} ${def.y - size + 6})`}>
            z
          </text>
          <text x={def.x + 52} y={def.y - size - 12} fontSize={22} fontWeight={800} fill="#7a8aa0" transform={`rotate(12 ${def.x + 52} ${def.y - size - 12})`}>
            z
          </text>
        </g>
      )}
      {needsWater && (
        <g className="anim-twinkle">
          <circle cx={def.x + 38} cy={def.y - size + 4} r={19} fill="#fffdf6" stroke="#57422e" strokeWidth={2.4} />
          <SceneSprite id="watering_can" x={def.x + 38} y={def.y - size + 18} size={28} />
        </g>
      )}
    </g>
  );
}

/** The tap-to-water feedback: tilted can, droplets, floating cost. */
function PourFx({ def, cost }: { def: SlotDef; cost: number }) {
  return (
    <g pointerEvents="none">
      <g style={{ animation: 'pour 1s ease-in-out both', transformOrigin: `${def.x + 20}px ${def.y - 90}px` }}>
        <SceneSprite id="watering_can" x={def.x + 34} y={def.y - 66} size={64} />
      </g>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={def.x + 2 + i * 10}
          cy={def.y - 66}
          r={4}
          fill="#7db8d9"
          style={{ animation: `droplet 0.7s ease-in ${0.15 + i * 0.12}s both` }}
        />
      ))}
      <g style={{ animation: 'float-up 1s ease-out 0.1s both' }}>
        <text x={def.x - 34} y={def.y - 70} fontSize={26} fontWeight={800} fill="#8a5a1a" stroke="#fffdf6" strokeWidth={5} paintOrder="stroke">
          −{cost}
        </text>
      </g>
    </g>
  );
}

function Bramble({ def, onClick }: { def: SlotDef; onClick: (e: React.MouseEvent) => void }) {
  return (
    <g onClick={onClick} className="cursor-pointer">
      <ellipse cx={def.x} cy={def.y + 8} rx={42} ry={12} fill="rgba(60,55,30,0.16)" />
      <circle cx={def.x - 18} cy={def.y - 6} r={21} fill="#6d7a4a" stroke="#4a5230" strokeWidth={3} />
      <circle cx={def.x + 12} cy={def.y - 14} r={25} fill="#5d6a3e" stroke="#4a5230" strokeWidth={3} />
      <circle cx={def.x + 20} cy={def.y + 2} r={17} fill="#75824f" stroke="#4a5230" strokeWidth={3} />
      <path
        d={`M${def.x - 34} ${def.y + 4} q 14 -32 38 -36 M${def.x + 38} ${def.y} q -8 -30 -32 -34`}
        stroke="#4a5230"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
      {[
        [-30, -8],
        [4, -34],
        [30, -12],
      ].map(([dx, dy], i) => (
        <path key={i} d={`M${def.x + dx} ${def.y + dy}l6-8M${def.x + dx} ${def.y + dy}l-2-10`} stroke="#3c452a" strokeWidth={3} strokeLinecap="round" />
      ))}
      <path d={`M${def.x - 4} ${def.y - 40}c-4-8-2-14 4-16 5 4 5 11-4 16Z`} fill="#c08a7a" stroke="#4a5230" strokeWidth={2.4} />
    </g>
  );
}

function Expansion({ def, onClick }: { def: SlotDef; onClick: (e: React.MouseEvent) => void }) {
  return (
    <g onClick={onClick} className="cursor-pointer" opacity={0.7}>
      <circle cx={def.x} cy={def.y} r={30} fill="rgba(255,253,246,0.30)" stroke="#8a6f52" strokeWidth={3} strokeDasharray="7 8" />
      <path d={`M${def.x - 10} ${def.y}h20M${def.x} ${def.y - 10}v20`} stroke="#8a6f52" strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

/* ── the scene, per the design boards ─────────────────────────────── */

function Backdrop({ night }: { night: boolean }) {
  const wall = night ? '#cdb994' : '#f2e6c4';
  const wood = night ? '#8a5f3a' : '#c99a63';
  const woodLine = night ? '#6d4a2c' : '#a9713d';
  const yard = night ? '#8aa06c' : '#b7d494';
  return (
    <g>
      {/* roof strip */}
      <rect width={1000} height={48} fill={woodLine} />
      <rect y={44} width={1000} height={8} fill="#57422e" opacity={0.5} />

      {/* fig canopy peeking over the roof, top-left */}
      <g stroke="#4a5230" strokeWidth={4} fill={night ? '#3f5a40' : '#5e9457'}>
        <circle cx={90} cy={70} r={62} />
        <circle cx={210} cy={52} r={54} />
        <circle cx={310} cy={72} r={44} />
      </g>
      <g fill={night ? '#4c6e50' : '#74ac62'}>
        <circle cx={150} cy={50} r={40} />
        <circle cx={262} cy={44} r={32} />
      </g>

      {/* house wall */}
      <rect y={48} width={1000} height={262} fill={wall} />

      {/* big paned window */}
      <rect x={598} y={84} width={310} height={150} rx={10} fill="#57422e" />
      <rect x={608} y={94} width={290} height={130} rx={6} fill={night ? '#ffe9a8' : '#c7dae0'} />
      <path d="M705 94v130M801 94v130M608 159h290" stroke="#57422e" strokeWidth={7} />
      <rect x={586} y={234} width={334} height={18} rx={8} fill={woodLine} stroke="#57422e" strokeWidth={3} />

      {/* trellis on the wall (vert_1) */}
      <g stroke={woodLine} strokeWidth={5} opacity={0.9}>
        <path d="M112 150v140M192 150v140M104 190h96M104 250h96" />
        <path d="M112 150 192 230M192 150l-80 80" strokeWidth={3.4} />
      </g>

      {/* wall hook (vert_2) */}
      <path d="M512 178c-9 4-11 15-4 22" stroke="#57422e" strokeWidth={6} fill="none" strokeLinecap="round" />

      {/* veranda */}
      <rect y={300} width={1000} height={96} fill={wood} />
      <rect y={300} width={1000} height={12} fill="#e9cf9a" opacity={0.7} />
      <g stroke={woodLine} strokeWidth={4}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={45 + i * 86} y1={304} x2={45 + i * 86} y2={394} />
        ))}
      </g>
      <rect y={392} width={1000} height={8} fill="#57422e" opacity={0.45} />

      {/* steps down to the yard */}
      <g stroke="#57422e" strokeWidth={3}>
        <rect x={372} y={396} width={186} height={30} rx={6} fill={wood} />
        <rect x={386} y={424} width={158} height={28} rx={6} fill={night ? '#7c5433' : '#b9884f'} />
      </g>

      {/* yard */}
      <rect y={396} width={1000} height={1204} fill={yard} />
      {/* re-draw steps above yard */}
      <g stroke="#57422e" strokeWidth={3}>
        <rect x={372} y={398} width={186} height={28} rx={6} fill={wood} />
        <rect x={386} y={424} width={158} height={26} rx={6} fill={night ? '#7c5433' : '#b9884f'} />
      </g>

      {/* mowing freckles */}
      {[
        [180, 620],
        [560, 660],
        [850, 760],
        [260, 860],
        [640, 900],
        [150, 1290],
        [480, 1080],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={30} ry={9} fill="rgba(255,255,255,0.12)" />
      ))}

      {/* planter boxes flanking the steps zone */}
      <g stroke="#57422e" strokeWidth={3.4}>
        <rect x={118} y={462} width={144} height={52} rx={9} fill={night ? '#7c5433' : '#a97850'} />
        <rect x={784} y={478} width={144} height={52} rx={9} fill={night ? '#7c5433' : '#a97850'} />
        <path d="M126 480h128M792 496h128" stroke={woodLine} strokeWidth={3} />
      </g>

      {/* dirt patches under the lawn beds */}
      {[
        [250, 730],
        [620, 790],
        [330, 960],
        [730, 1010],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={62} ry={20} fill={night ? '#9a8a62' : '#d9c69a'} stroke={night ? '#7c6e4c' : '#c0a878'} strokeWidth={3} />
      ))}

      {/* pond, bottom-right */}
      <ellipse cx={660} cy={1285} rx={300} ry={185} fill={night ? '#5f8a96' : '#a8cfdc'} stroke={night ? '#48707c' : '#8ab8c8'} strokeWidth={10} />
      <ellipse cx={590} cy={1225} rx={110} ry={38} fill="rgba(255,255,255,0.4)" />
      <path d="M800 1360c22 8 50 8 70-2M480 1250c14-10 34-12 52-8" stroke="rgba(255,255,255,0.5)" strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* lily pad + cattail decoration */}
      <ellipse cx={780} cy={1240} rx={34} ry={13} fill={night ? '#4c7a50' : '#5e9457'} stroke="#3d6a44" strokeWidth={3} />
      <g stroke="#57422e" strokeWidth={3}>
        <path d="M930 1310c0-30 4-56 12-74" fill="none" />
        <rect x={932} y={1212} width={13} height={30} rx={6.5} fill="#8a5f3c" />
      </g>
      {/* rim stones */}
      <g fill={night ? '#8d8d85' : '#c8bda9'} stroke={night ? '#6d6d66' : '#a89d89'} strokeWidth={3}>
        <ellipse cx={352} cy={1240} rx={26} ry={11} />
        <ellipse cx={520} cy={1440} rx={22} ry={9} />
        <ellipse cx={905} cy={1180} rx={24} ry={10} />
      </g>

      {/* stepping stones */}
      <g fill={night ? '#b5ab97' : '#efe9db'} stroke={night ? '#8d8578' : '#c8bda9'} strokeWidth={3}>
        <ellipse cx={470} cy={520} rx={40} ry={14} />
        <ellipse cx={452} cy={590} rx={34} ry={12} />
        <ellipse cx={490} cy={668} rx={36} ry={13} />
        <ellipse cx={545} cy={1010} rx={44} ry={16} />
      </g>

      {/* leafy corner bush with morning-glory blooms, bottom-left */}
      <g>
        <ellipse cx={110} cy={1576} rx={130} ry={26} fill="rgba(60,55,30,0.14)" />
        {/* base foliage — layered rounded clumps, ink-outlined */}
        <g stroke="#3c4a28" strokeWidth={4} strokeLinejoin="round">
          <path
            d="M-10 1560 C-24 1500 20 1466 58 1486 C70 1452 132 1452 146 1490 C188 1470 232 1506 214 1552 C224 1572 190 1588 150 1584 L20 1584 C-6 1586 -14 1574 -10 1560 Z"
            fill={night ? '#3f5a40' : '#5e9350'}
          />
        </g>
        {/* lighter top highlights (no outline) */}
        <g fill={night ? '#4c6e50' : '#79b366'} stroke="none">
          <ellipse cx={44} cy={1500} rx={30} ry={20} />
          <ellipse cx={104} cy={1486} rx={34} ry={22} />
          <ellipse cx={168} cy={1508} rx={26} ry={17} />
        </g>
        <g fill={night ? '#5a7e5c' : '#8fc47a'} stroke="none" opacity={0.8}>
          <ellipse cx={72} cy={1492} rx={16} ry={10} />
          <ellipse cx={138} cy={1498} rx={14} ry={9} />
        </g>
        {/* trailing morning-glory vine + blooms climbing the fence corner */}
        <path d="M150 1490 C176 1452 168 1408 150 1372" fill="none" stroke="#3f6a38" strokeWidth={4} strokeLinecap="round" />
        {[
          [150, 1372, 15],
          [166, 1424, 15],
          [40, 1512, 15],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r={r} fill={i === 2 ? '#8f6fd0' : '#7f9edb'} stroke="#57422e" strokeWidth={3} />
            <circle r={5} fill="#fbf7ea" stroke="none" />
            <path d="M0 0l0 -6M0 0l5 3M0 0l-5 3" stroke="#e2b13c" strokeWidth={1.6} />
          </g>
        ))}
        {/* two leaves on the vine */}
        <path d="M158 1450c-9-3-12-11-8-18 8 1 13 8 8 18Z" fill={night ? '#3f5a40' : '#5e9350'} stroke="#3c4a28" strokeWidth={2.4} />
      </g>
    </g>
  );
}

/** Night is a colour, not a prop — no moon or stars to clip the scene. */
function NightOverlay() {
  return (
    <g pointerEvents="none">
      <rect width={1000} height={1600} fill="#1c2b4d" opacity={0.32} />
    </g>
  );
}

/* ── the tap popover (inspect / shelve / clear / claim) ───────────── */

function SlotPopover({
  popover,
  game,
  now,
  onClose,
}: {
  popover: Popover;
  game: GameState;
  now: number;
  onClose: () => void;
}) {
  const water = useStore((s) => s.water);
  const shelve = useStore((s) => s.shelve);
  const clearOvergrown_ = useStore((s) => s.clearOvergrown_);
  const buyExpansion_ = useStore((s) => s.buyExpansion_);
  const startPlacement = useStore((s) => s.startPlacement);
  const setPanel = useStore((s) => s.setPanel);

  const def = SLOT_DEFS.find((d) => d.id === popover.slotId)!;
  const inst = game.slots.find((s) => s.id === popover.slotId)!;
  const occ = occupantOf(game, popover.slotId);

  const left = Math.min(Math.max(8, popover.x - 140), 430 - 296);
  const top = Math.max(8, Math.min(popover.y + 14, (window.innerHeight || 800) - 280));

  let body: React.ReactNode;
  if (inst.status === 'overgrown') {
    const price = nextOvergrownPrice(game);
    const total = OVERGROWN_PRICES.length;
    body = (
      <>
        <div className="font-display text-sm">Overgrown {def.label.toLowerCase()}</div>
        <p className="mt-1 text-xs opacity-75">
          Bramble has claimed this {def.type.replace('_', ' ')} spot. Prices rise with each of the {total} you clear.
        </p>
        <button
          className="ds-pill mt-2 flex w-full items-center justify-center gap-1.5 bg-leaf px-3 py-2 text-sm text-white hover:brightness-105 disabled:opacity-40"
          disabled={game.coins < price}
          onClick={() => {
            clearOvergrown_(popover.slotId);
            onClose();
          }}
        >
          <Sprite id="icon_scissors" size={18} /> Clear for <Coin n={price} light />
        </button>
      </>
    );
  } else if (inst.status === 'expansion') {
    const limit = EXPANSION_LIMIT[def.type] ?? 0;
    const bought = game.expansionsBought[def.type] ?? 0;
    body = (
      <>
        <div className="font-display text-sm">{def.label}</div>
        <p className="mt-1 text-xs opacity-75">
          Designated expansion ground ({def.type.replace('_', ' ')}). {bought}/{limit} claimed.
        </p>
        <button
          className="ds-pill mt-2 flex w-full items-center justify-center gap-1.5 bg-leaf px-3 py-2 text-sm text-white hover:brightness-105 disabled:opacity-40"
          disabled={game.coins < EXPANSION_SLOT_COST || bought >= limit}
          onClick={() => {
            buyExpansion_(popover.slotId);
            onClose();
          }}
        >
          Claim for <Coin n={EXPANSION_SLOT_COST} light />
        </button>
      </>
    );
  } else if (!occ) {
    // Suggest seeds from inventory that can actually go in THIS slot type.
    const owned = Object.entries(game.seeds).filter(([, n]) => n > 0);
    const fits = owned.filter(([speciesId]) => PLANT_BY_ID[speciesId]?.slotTypes.includes(def.type));
    const shelvedPlants = Object.values(game.plants).filter(
      (p) => p.location === 'shelf' && PLANT_BY_ID[p.speciesId]?.slotTypes.includes(def.type),
    );
    const shelvedObjects = Object.values(game.objects).filter(
      (o) => o.location === 'shelf' && OBJECT_BY_ID[o.speciesId]?.slotTypes.includes(def.type),
    );
    body = (
      <>
        <div className="font-display text-sm">{def.label}</div>
        <p className="mt-0.5 text-[11px] opacity-65">Open {def.type.replace('_', ' ')} spot — plant something:</p>
        {fits.length === 0 && shelvedPlants.length === 0 && shelvedObjects.length === 0 ? (
          <button
            className="ds-pill bg-leaf mt-2 flex w-full items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold text-white hover:brightness-105"
            onClick={() => {
              setPanel('shop');
              onClose();
            }}
          >
            <Sprite id="icon_seedpack" size={16} /> No seeds fit — visit the Shop
          </button>
        ) : (
          <div className="panel-scroll mt-1.5 flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
            {fits.map(([speciesId, n]) => {
              const s = PLANT_BY_ID[speciesId];
              return (
                <button
                  key={speciesId}
                  className="ds-card flex items-center gap-2 p-1.5 text-left hover:bg-cream"
                  onClick={() => {
                    startPlacement({ kind: 'seed', speciesId });
                    onClose();
                  }}
                >
                  <Sprite id={s.id} size={30} />
                  <div className="flex-1">
                    <div className="text-xs font-bold">
                      {s.name} <span className="opacity-50">×{n}</span>
                    </div>
                    <TagChips tags={s.tags} />
                  </div>
                  <span className="ds-pill bg-leaf px-2 py-1 text-[11px] font-bold text-white">Plant</span>
                </button>
              );
            })}
            {shelvedPlants.map((p) => {
              const s = PLANT_BY_ID[p.speciesId];
              return (
                <button
                  key={p.id}
                  className="ds-card flex items-center gap-2 p-1.5 text-left hover:bg-cream"
                  onClick={() => {
                    startPlacement({ kind: 'shelf', itemId: p.id, speciesId: p.speciesId, isPlant: true });
                    onClose();
                  }}
                >
                  <Sprite id={s.id} size={30} />
                  <div className="flex-1 text-xs font-bold">{s.name} <span className="opacity-50">(shelved)</span></div>
                  <span className="ds-pill bg-sage px-2 py-1 text-[11px] font-bold text-white">Place</span>
                </button>
              );
            })}
            {shelvedObjects.map((o) => {
              const s = OBJECT_BY_ID[o.speciesId];
              return (
                <button
                  key={o.id}
                  className="ds-card flex items-center gap-2 p-1.5 text-left hover:bg-cream"
                  onClick={() => {
                    startPlacement({ kind: 'shelf', itemId: o.id, speciesId: o.speciesId, isPlant: false });
                    onClose();
                  }}
                >
                  <Sprite id={s.id} size={30} />
                  <div className="flex-1 text-xs font-bold">{s.name} <span className="opacity-50">(shelved)</span></div>
                  <span className="ds-pill bg-sage px-2 py-1 text-[11px] font-bold text-white">Place</span>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  } else if (occ.kind === 'object') {
    const species = OBJECT_BY_ID[occ.item.speciesId];
    body = (
      <>
        <div className="font-display flex items-center gap-2 text-sm">
          <Sprite id={species.id} size={28} /> {species.name}
        </div>
        <p className="mt-1 text-xs opacity-75">{species.blurb}</p>
        <TagChips tags={{ ...species.tags, ...(species.tagsAtNight ?? {}) }} />
        <button
          className="ds-pill mt-2 w-full bg-cream px-3 py-2 text-sm hover:bg-wall"
          onClick={() => {
            shelve(occ.item.id);
            onClose();
          }}
        >
          Shelve
        </button>
      </>
    );
  } else {
    const plant = occ.item;
    const species = PLANT_BY_ID[plant.speciesId];
    const dormant = isDormant(plant, now);
    const cost = waterCost(plant);
    const useful = wateringUseful(plant, now);
    const growReady = growthWaterReady(plant, now);
    const gapH = Math.max(0, Math.ceil((nextGrowthWaterAt(plant) - now) / 3600000));
    const shelvable = canShelve(plant, now);
    const { wateringsPerStage } = GROWTH[species.rarity];
    body = (
      <>
        <div className="flex items-center justify-between">
          <div className="font-display flex items-center gap-2 text-sm">
            <Sprite id={species.id} size={28} /> {species.name}
          </div>
          <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
            {plant.stage}
          </span>
        </div>
        {dormant ? (
          <p className="text-terra mt-1 text-xs font-bold">Wilted — closed up and drawing no visitors. Water it!</p>
        ) : (
          <ThirstBar fraction={thirstFraction(plant, now)} />
        )}
        {plant.stage !== 'mature' && (
          <p className="mt-1 text-xs opacity-75">
            Growth: {plant.wateringsThisStage}/{wateringsPerStage} waterings this stage
            {growReady ? ' — ready for a growth watering!' : gapH > 0 ? ` — next counts in ~${gapH}h` : ''}
          </p>
        )}
        <TagChips tags={species.tags} />
        <div className="mt-2 flex gap-2">
          <button
            className="ds-pill flex flex-1 items-center justify-center gap-1 whitespace-nowrap bg-pond px-2.5 py-2 text-xs text-white hover:brightness-105 disabled:opacity-40"
            disabled={!useful || game.coins < cost}
            onClick={() => {
              water(plant.id);
              onClose();
            }}
          >
            <Sprite id="watering_can" size={16} /> Water · <Coin n={cost} light />
          </button>
          <button
            className="ds-pill flex-1 bg-cream px-2.5 py-2 text-xs hover:bg-wall disabled:opacity-40"
            disabled={!shelvable.ok}
            title={shelvable.ok ? undefined : shelvable.reason}
            onClick={() => {
              shelve(plant.id);
              onClose();
            }}
          >
            Shelve
          </button>
        </div>
        {!shelvable.ok && <p className="mt-1 text-[11px] opacity-60">Can't shelve: {shelvable.reason}</p>}
        <p className="mt-1.5 text-[10px] opacity-45">Tip: tap the plant to water it · hold for Water-all</p>
      </>
    );
  }

  return (
    <div
      className="ds-card absolute z-30 w-72 p-3"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      {body}
    </div>
  );
}

function ThirstBar({ fraction }: { fraction: number }) {
  const pct = Math.round((1 - fraction) * 100);
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10px] font-bold tracking-wide uppercase opacity-60">
        <span>Hydration</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-0.5 h-2 w-full rounded-full bg-cream ring-1 ring-ink/15">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, background: pct > 25 ? '#6fa8a0' : '#e88a5d' }}
        />
      </div>
    </div>
  );
}

/** Inline coin amount with the coin sprite. */
export function Coin({ n, light }: { n: number; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${light ? '' : 'text-ink'}`}>
      <Sprite id="icon_coin" size={15} />
      {n}
    </span>
  );
}

export function TagChips({ tags }: { tags: Record<string, number | undefined> }) {
  const entries = Object.entries(tags).filter(([, v]) => (v ?? 0) !== 0);
  if (entries.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {entries.map(([tag, v]) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2 py-0.5 text-[11px] font-bold text-leaf-deep">
          <Sprite id={TAG_ICON[tag as keyof typeof TAG_ICON] ?? 'icon_leaf'} size={13} />
          {tag} +{v}
        </span>
      ))}
    </div>
  );
}
