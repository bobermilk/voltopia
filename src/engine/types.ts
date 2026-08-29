/**
 * types.ts — the persisted game state.
 *
 * Everything time-based stores GAME-time timestamps (ms). Nothing in here is
 * ever advanced by a timer: state changes only through the pure functions in
 * this folder, above all `catchUp(state, now)`.
 */
import type { Baseline, EvidenceTier, GrownForm, Rarity, SeedRarity, SlotType } from '../config/balance';

export type PlantStage = 'seed' | 'sprout' | 'growing' | 'mature';

export interface PlantInstance {
  id: string;
  speciesId: string;
  stage: PlantStage;
  wateringsThisStage: number;
  /** Last watering of any kind — drives thirst/dormancy. */
  lastWateredAt: number;
  /** Last watering that counted toward growth — drives the min-gap rule. */
  lastGrowthWaterAt: number;
  plantedAt: number;
  location: string; // slot id, or 'shelf'
}

export interface ObjectInstance {
  id: string;
  speciesId: string;
  location: string; // slot id, or 'shelf'
}

export type SlotStatus = 'open' | 'overgrown' | 'expansion';

export interface SlotInstance {
  id: string; // matches SLOT_DEFS id
  status: SlotStatus;
  /** Index into OVERGROWN_PRICES when status === 'overgrown'. */
  overgrownIndex?: number;
}

export interface Visitor {
  id: string;
  creatureId: string;
  arrivedAt: number;
  departsAt: number;
  anchor: number; // index into VISITOR_ANCHORS
  /** Set when the player records this visit (repeat visits count too). */
  recordedThisVisit?: boolean;
}

export type GuideState = 'unknown' | 'sighted' | 'recorded';

export interface GuideEntry {
  state: GuideState;
  /** Unrecorded departures — each reveals one more clue. */
  sightings: number;
  /** Completed visits after recording — memento at MEMENTO_AT_VISIT. */
  visits: number;
  cluesRevealed: number;
  firstSightedAt?: number;
  recordedAt?: number;
  mementoEarned?: boolean;
}

/** A magic seed waiting in the Magic Seed tab to be grown. */
export interface MagicSeedInstance {
  id: string;
  rarity: SeedRarity;
  arrivedAt: number;
  source: string;
}

export interface DailyCompletion {
  day: string; // game-time YYYY-MM-DD
  tier: EvidenceTier;
  coins: number;
}

export interface BillSubmission {
  at: number;
  value: number; // L/person/day or kWh/month
  flatType?: string;
  met: boolean;
}

export interface LogEvent {
  at: number;
  kind: 'sighting' | 'visit' | 'record' | 'seed' | 'quest' | 'dormant' | 'info';
  text: string;
}

/** The live 5-minute shower timer (a real-time intervention, not stored ticks). */
export interface ShowerState {
  /** Game-time ms the timer was started, or null when idle. */
  startedAt: number | null;
  /** Last completion's game-time day, for the once-per-day cap. */
  lastDoneDay?: string;
}

export interface GameState {
  version: number;
  createdAt: number;
  coins: number;
  clock: { anchorReal: number; anchorGame: number; scale: number };
  rng: { seed: number; counter: number };
  nextId: number;
  slots: SlotInstance[];
  plants: Record<string, PlantInstance>;
  objects: Record<string, ObjectInstance>;
  seeds: Record<string, number>;
  cosmetics: string[];
  visitors: Visitor[];
  lastSpawnTickAt: number;
  /** Game time of the previous catch-up pass (dormancy-transition detection). */
  lastCatchUpAt: number;
  guide: Record<string, GuideEntry>;
  quests: {
    dailies: Partial<Record<string, DailyCompletion>>;
    /** Day the daily-package counter refers to, and its count. */
    packagesDay: string;
    packagesFromDailies: number;
    benchmarks: Partial<Record<string, { lastPeriod: string; submissions: BillSubmission[] }>>;
  };
  baseline: Baseline | null;
  /** Magic seeds waiting to be grown (replaces the old package queue). */
  magicSeeds: MagicSeedInstance[];
  shower: ShowerState;
  /** dHash hex strings of accepted photo evidence (duplicate rejection). */
  photoHashes: string[];
  log: LogEvent[];
  expansionsBought: Partial<Record<SlotType, number>>;
  /** Player profile (scheme §13; layout per mockups). */
  profile: { name: string; avatar: string; showcase: string[] };
  /** Munchkin-cat intro finished (fresh saves start false). */
  tutorialDone: boolean;
  /** EcoVolt utility-data account linked — verifies habits automatically. */
  ecovoltLinked: boolean;
}

/** One resolved reward from growing a magic seed. */
export interface LootResult {
  kind: 'seed' | 'coins' | 'object' | 'cosmetic';
  id?: string; // species / cosmetic id
  amount?: number; // coins
  rarity?: Rarity;
}

/** The full outcome of growing one magic seed. */
export interface GrowResult {
  form: GrownForm;
  rewards: LootResult[];
}
