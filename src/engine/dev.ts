/**
 * dev.ts — the hidden demo panel's teeth (scheme §16, P0: "a judge will not
 * wait six hours for a hedgehog"). Everything here is a normal pure state
 * transform; time warp goes through the same clock the whole game uses, so
 * ×1440 accelerates every system at once.
 */
import { VISIT_MAX_MS, VISIT_MIN_MS, type SeedRarity } from '../config/balance';
import { CREATURE_BY_ID, PLANTS, VISITOR_ANCHORS } from '../config/content';
import { freshGuideEntry } from './catchup';
import { Draws } from './rng';
import { grantMagicSeed } from './magicSeeds';
import type { GameState } from './types';

export function devGrantCoins(state: GameState, amount: number): GameState {
  return { ...state, coins: state.coins + amount };
}

/** Force a visitor on screen right now (evicts the oldest if full). */
export function devForceSpawn(state: GameState, creatureId: string, now: number): GameState {
  if (!CREATURE_BY_ID[creatureId]) return state;
  const draws = new Draws(state.rng.seed, state.rng.counter);
  const visitors = [...state.visitors];
  if (visitors.length >= VISITOR_ANCHORS.length) visitors.shift();
  const used = new Set(visitors.map((v) => v.anchor));
  const anchor = VISITOR_ANCHORS.findIndex((_, i) => !used.has(i));
  visitors.push({
    id: `v${state.nextId}`,
    creatureId,
    arrivedAt: now,
    departsAt: now + draws.range(VISIT_MIN_MS, VISIT_MAX_MS),
    anchor: anchor === -1 ? 0 : anchor,
  });
  return {
    ...state,
    nextId: state.nextId + 1,
    visitors,
    rng: { ...state.rng, counter: draws.counter },
  };
}

export function devInstantGrow(state: GameState, now: number): GameState {
  const plants = Object.fromEntries(
    Object.entries(state.plants).map(([id, p]) => [
      id,
      { ...p, stage: 'mature' as const, wateringsThisStage: 0, lastWateredAt: now, lastGrowthWaterAt: now },
    ]),
  );
  return { ...state, plants };
}

export function devGrantMagicSeed(state: GameState, rarity: SeedRarity, now: number): GameState {
  return grantMagicSeed(state, rarity, 'dev', now).state;
}

/**
 * Pre-built showcase garden: the Otter build from ECONOMY.md §2 (Wet 12),
 * cleared brambles, a healthy Field Guide, and a Wizard chest at the gate.
 */
export function devShowcase(state: GameState, now: number): GameState {
  let draft: GameState = structuredClone(state);
  draft.coins = 900;
  draft.slots = draft.slots.map((s) => (s.status === 'overgrown' ? { ...s, status: 'open' } : s));
  draft.plants = {};
  draft.objects = {};
  draft.visitors = [];

  const plantAt = (speciesId: string, slotId: string) => {
    const id = `pl${draft.nextId++}`;
    draft.plants[id] = {
      id,
      speciesId,
      stage: 'mature',
      wateringsThisStage: 0,
      lastWateredAt: now,
      lastGrowthWaterAt: now,
      plantedAt: now - 12 * 24 * 3600 * 1000,
      location: slotId,
    };
  };
  const objectAt = (speciesId: string, slotId: string) => {
    const id = `o${draft.nextId++}`;
    draft.objects[id] = { id, speciesId, location: slotId };
  };

  // Otter build: 2 Water Lily on the pond + Bird Bath + 2 Fern (Wet 13).
  plantAt('water_lily', 'water_1');
  plantAt('water_lily', 'water_2');
  objectAt('bird_bath', 'soil_5');
  plantAt('fern', 'soil_1');
  plantAt('fern', 'water_3');
  plantAt('lavender', 'soil_2');
  plantAt('sunflower', 'soil_3');
  plantAt('frangipani', 'soil_4');
  plantAt('rain_tree', 'soil_6');
  objectAt('bird_feeder', 'vert_1');
  objectAt('stone_lantern', 'pave_1');
  objectAt('scratching_post', 'pave_2');

  // A lived-in Field Guide.
  const recorded = ['sparrow', 'honeybee', 'cabbage_butterfly', 'garden_snail', 'stray_tabby', 'dragonfly', 'hedgehog', 'kingfisher'];
  for (const id of recorded) {
    draft.guide[id] = {
      ...freshGuideEntry(),
      state: 'recorded',
      visits: id === 'sparrow' ? 14 : 3,
      recordedAt: now - 5 * 24 * 3600 * 1000,
    };
  }
  draft.guide.moth = { ...freshGuideEntry(), state: 'sighted', sightings: 2, cluesRevealed: 2, firstSightedAt: now - 2 * 24 * 3600 * 1000 };
  draft.guide.otter = { ...freshGuideEntry(), state: 'sighted', sightings: 1, cluesRevealed: 1, firstSightedAt: now - 24 * 3600 * 1000 };
  draft.cosmetics = ['kingfisher_totem', 'garden_gnome'];
  draft.seeds = { grass_tuft: 1, berry_bush: 1 };

  draft = grantMagicSeed(draft, 'legendary', 'showcase', now).state;
  draft.log.push({ at: now, kind: 'info', text: 'Showcase garden loaded.' });
  return draft;
}

/** Grant one seed of every species (content testing). */
export function devAllSeeds(state: GameState): GameState {
  const seeds = { ...state.seeds };
  for (const p of PLANTS) seeds[p.id] = (seeds[p.id] ?? 0) + 1;
  return { ...state, seeds };
}
