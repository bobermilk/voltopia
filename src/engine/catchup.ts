/**
 * catchup.ts — THE core of Voltopia.
 *
 * The only way game time advances state. Pure and deterministic: given the
 * same (state, now) it produces the same result (all randomness comes from
 * the persisted seed+counter). The spawn tick "runs every 30 minutes whether
 * or not the app is open" (scheme §7) — implemented as this catch-up pass,
 * never as a live timer.
 *
 * Spawning is the TWO-STAGE roll from ECONOMY.md §3:
 *   1. Roll a rarity tier from fixed odds (TIER_ODDS).
 *   2. Weight within the tier by tag fit ×0.4 damping if already recorded,
 *      × object category multipliers. Empty tier falls down one (TIER_FALLBACK).
 *
 * A visitor that departs before the player saw it becomes a Sighting —
 * silhouette plus one more revealed clue. Absence is slow progress, not
 * punishment (scheme §8).
 */
import {
  DAILY_QUEST_COINS,
  EARLY_SPAWN,
  MAX_CATCHUP_TICKS,
  MAX_CONCURRENT_VISITORS,
  MEMENTO_AT_VISIT,
  RECORDED_DAMPING,
  SPAWN_REQUIRES_AFFINITY,
  SPAWN_TICK_MS,
  TIER_FALLBACK,
  TIER_ODDS,
  VISIT_MAX_MS,
  VISIT_MIN_MS,
  tagFitWeight,
  type Rarity,
} from '../config/balance';
import { CREATURES, CREATURE_BY_ID, VISITOR_ANCHORS, type CreatureSpecies, type Tag } from '../config/content';
import { dayOf } from './clock';
import { isDormant } from './plants';
import { Draws } from './rng';
import { computeGardenTags, isNight, spawnMultiplierFor } from './tags';
import type { GameState, GuideEntry, Visitor } from './types';

export type CatchUpEvent =
  | { kind: 'arrival'; creatureId: string; live: boolean }
  | { kind: 'sighting'; creatureId: string }
  | { kind: 'dormant'; plantId: string }
  | { kind: 'login_reward'; coins: number }
  | { kind: 'memento'; creatureId: string };

export interface CatchUpResult {
  state: GameState;
  events: CatchUpEvent[];
  /** False when the pass was a no-op — callers skip persisting/re-rendering. */
  changed: boolean;
}

export function freshGuideEntry(): GuideEntry {
  return { state: 'unknown', sightings: 0, visits: 0, cluesRevealed: 0 };
}

/** The clue ladder a Sighting reveals, one line per sighting. */
export function clueLines(creature: CreatureSpecies): string[] {
  const prefEntries = Object.entries(creature.prefs).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const lines = prefEntries.map(([tag]) => `Prefers ${tag} gardens`);
  if (creature.nightOnly) lines.push('Only comes out after dark');
  if (creature.requires) {
    for (const [tag, v] of Object.entries(creature.requires)) {
      lines.push(`Needs a garden with ${tag} ≥ ${v}`);
    }
  }
  return lines;
}

function tickIntervalAt(state: GameState, t: number): number {
  return t - state.createdAt < EARLY_SPAWN.untilMs ? EARLY_SPAWN.tickMs : SPAWN_TICK_MS;
}

/** Visitors departing at or before `t` leave; unseen ones become Sightings. */
function processDepartures(draft: GameState, t: number, events: CatchUpEvent[]) {
  const staying: Visitor[] = [];
  for (const v of draft.visitors) {
    if (v.departsAt > t) {
      staying.push(v);
      continue;
    }
    const entry = draft.guide[v.creatureId] ?? freshGuideEntry();
    if (entry.state !== 'recorded' && !v.recordedThisVisit) {
      const creature = CREATURE_BY_ID[v.creatureId];
      const maxClues = clueLines(creature).length;
      draft.guide[v.creatureId] = {
        ...entry,
        state: 'sighted',
        sightings: entry.sightings + 1,
        cluesRevealed: Math.min(maxClues, entry.cluesRevealed + 1),
        firstSightedAt: entry.firstSightedAt ?? v.arrivedAt,
      };
      draft.log.push({ at: v.departsAt, kind: 'sighting', text: `Something rustled away… (${creature.name} sighted)` });
      events.push({ kind: 'sighting', creatureId: v.creatureId });
    }
  }
  draft.visitors = staying;
}

function eligiblePool(
  draft: GameState,
  tier: Rarity,
  t: number,
  tags: Record<Tag, number>,
): Array<{ item: CreatureSpecies; weight: number }> {
  const pool: Array<{ item: CreatureSpecies; weight: number }> = [];
  for (const c of CREATURES) {
    if (c.rarity !== tier) continue;
    if (c.nightOnly && !isNight(t)) continue;
    if (draft.visitors.some((v) => v.creatureId === c.id)) continue;
    if (c.requires && Object.entries(c.requires).some(([tag, min]) => tags[tag as Tag] < (min ?? 0))) continue;
    const fit = tagFitWeight(tags, c.prefs as Record<string, number>);
    if (SPAWN_REQUIRES_AFFINITY && fit <= 1) continue; // empty garden feels empty
    const recorded = draft.guide[c.id]?.state === 'recorded';
    const weight = fit * (recorded ? RECORDED_DAMPING : 1) * spawnMultiplierFor(draft, c.category);
    if (weight > 0) pool.push({ item: c, weight });
  }
  return pool;
}

function rollSpawn(draft: GameState, t: number, draws: Draws, events: CatchUpEvent[], now: number) {
  const tags = computeGardenTags(draft, t);
  // Stage 1: rarity tier from fixed odds.
  let tier = draws.weighted(TIER_ODDS.map(({ tier, p }) => ({ item: tier, weight: p })));
  // Stage 2: tag fit within the tier, falling down a tier when empty.
  while (tier && tier !== 'none') {
    const pool = eligiblePool(draft, tier, t, tags);
    const creature = draws.weighted(pool);
    if (creature) {
      const usedAnchors = new Set(draft.visitors.map((v) => v.anchor));
      const anchor = VISITOR_ANCHORS.findIndex((_, i) => !usedAnchors.has(i));
      const departsAt = t + draws.range(VISIT_MIN_MS, VISIT_MAX_MS);
      draft.visitors.push({
        id: `v${draft.nextId++}`,
        creatureId: creature.id,
        arrivedAt: t,
        departsAt,
        anchor: anchor === -1 ? 0 : anchor,
      });
      const entry = draft.guide[creature.id] ?? freshGuideEntry();
      if (entry.state === 'recorded') {
        const visits = entry.visits + 1;
        draft.guide[creature.id] = { ...entry, visits };
        if (visits === MEMENTO_AT_VISIT && !entry.mementoEarned) {
          draft.guide[creature.id].mementoEarned = true;
          events.push({ kind: 'memento', creatureId: creature.id });
        }
      }
      draft.log.push({ at: t, kind: 'visit', text: `${creature.name} wandered in.` });
      events.push({ kind: 'arrival', creatureId: creature.id, live: departsAt > now });
      return;
    }
    tier = TIER_FALLBACK[tier];
  }
}

/** Cheap pre-check: is there anything for catchUp to do at `now`? */
export function hasPendingWork(state: GameState, now: number): boolean {
  if (now >= state.lastSpawnTickAt + tickIntervalAt(state, state.lastSpawnTickAt)) return true;
  if (state.visitors.some((v) => v.departsAt <= now)) return true;
  if (state.quests.dailies.daily_login?.day !== dayOf(now)) return true;
  for (const plant of Object.values(state.plants)) {
    if (plant.location === 'shelf') continue;
    if (!isDormant(plant, state.lastCatchUpAt) && isDormant(plant, now)) return true;
  }
  return false;
}

export function catchUp(state: GameState, now: number): CatchUpResult {
  if (!hasPendingWork(state, now)) {
    return { state, events: [], changed: false };
  }
  const draft: GameState = structuredClone(state);
  const events: CatchUpEvent[] = [];
  const draws = new Draws(draft.rng.seed, draft.rng.counter);

  // ── Daily boundary: login reward + daily-package counter reset ──
  const today = dayOf(now);
  if (draft.quests.packagesDay !== today) {
    draft.quests.packagesDay = today;
    draft.quests.packagesFromDailies = 0;
  }
  if (draft.quests.dailies.daily_login?.day !== today) {
    const coins = DAILY_QUEST_COINS.daily_login;
    draft.coins += coins;
    draft.quests.dailies.daily_login = { day: today, tier: 1, coins };
    draft.log.push({ at: now, kind: 'quest', text: `Daily visit — +${coins} coins.` });
    events.push({ kind: 'login_reward', coins });
  }

  // ── Spawn ticks, oldest first, departures before each roll ──
  // Safety valve sized against the steady-state cadence: the early-session
  // boost only lasts EARLY_SPAWN.untilMs, so it adds a bounded handful of
  // extra ticks and must NOT shrink the estimate window.
  const pending = Math.floor((now - draft.lastSpawnTickAt) / SPAWN_TICK_MS);
  if (pending > MAX_CATCHUP_TICKS) {
    draft.lastSpawnTickAt = now - MAX_CATCHUP_TICKS * SPAWN_TICK_MS;
    draft.log.push({ at: now, kind: 'info', text: 'A long time passed — the garden kept its own counsel.' });
  }
  let interval = tickIntervalAt(draft, draft.lastSpawnTickAt);
  let t = draft.lastSpawnTickAt + interval;
  while (t <= now) {
    processDepartures(draft, t, events);
    const free = MAX_CONCURRENT_VISITORS - draft.visitors.length;
    for (let i = 0; i < free; i++) rollSpawn(draft, t, draws, events, now);
    draft.lastSpawnTickAt = t;
    interval = tickIntervalAt(draft, t);
    t += interval;
  }
  processDepartures(draft, now, events);

  // ── Dormancy transitions since the previous pass (for the 3/day toasts) ──
  for (const plant of Object.values(draft.plants)) {
    if (plant.location === 'shelf') continue;
    if (!isDormant(plant, draft.lastCatchUpAt) && isDormant(plant, now)) {
      draft.log.push({ at: now, kind: 'dormant', text: 'A plant closed up, waiting for water.' });
      events.push({ kind: 'dormant', plantId: plant.id });
    }
  }

  draft.rng.counter = draws.counter;
  draft.lastCatchUpAt = now;
  if (draft.log.length > 200) draft.log = draft.log.slice(-200);
  return { state: draft, events, changed: true };
}
