/**
 * actions.ts — placement, shelving, shop, slots. All pure.
 */
import {
  EXPANSION_LIMIT,
  EXPANSION_SLOT_COST,
  OVERGROWN_PRICES,
  SEED_PRICES,
} from '../config/balance';
import { OBJECT_BY_ID, PLANT_BY_ID, SLOT_DEF_BY_ID } from '../config/content';
import { canShelve } from './plants';
import type { GameState, ObjectInstance, PlantInstance } from './types';

export type ActionResult = { state: GameState; ok: boolean; error?: string };

const fail = (state: GameState, error: string): ActionResult => ({ state, ok: false, error });

export function occupantOf(
  state: GameState,
  slotId: string,
): { kind: 'plant'; item: PlantInstance } | { kind: 'object'; item: ObjectInstance } | null {
  for (const p of Object.values(state.plants)) {
    if (p.location === slotId) return { kind: 'plant', item: p };
  }
  for (const o of Object.values(state.objects)) {
    if (o.location === slotId) return { kind: 'object', item: o };
  }
  return null;
}

function slotAccepts(state: GameState, slotId: string, slotTypes: string[]): string | null {
  const slot = state.slots.find((s) => s.id === slotId);
  const def = SLOT_DEF_BY_ID[slotId];
  if (!slot || !def) return 'No such slot';
  if (slot.status !== 'open') return slot.status === 'overgrown' ? 'Still overgrown' : 'Not unlocked yet';
  if (!slotTypes.includes(def.type)) return "This doesn't go there";
  if (occupantOf(state, slotId)) return 'Something is already there';
  return null;
}

/** Plant a seed from inventory into an open, empty, type-matching slot. */
export function plantSeed(state: GameState, speciesId: string, slotId: string, now: number): ActionResult {
  const species = PLANT_BY_ID[speciesId];
  if (!species) return fail(state, 'Unknown seed');
  if ((state.seeds[speciesId] ?? 0) < 1) return fail(state, 'No seeds of that kind');
  const err = slotAccepts(state, slotId, species.slotTypes);
  if (err) return fail(state, err);

  const id = `pl${state.nextId}`;
  const plant: PlantInstance = {
    id,
    speciesId,
    stage: 'seed',
    wateringsThisStage: 0,
    lastWateredAt: now,
    lastGrowthWaterAt: 0, // first growth watering is always allowed
    plantedAt: now,
    location: slotId,
  };
  return {
    ok: true,
    state: {
      ...state,
      nextId: state.nextId + 1,
      seeds: { ...state.seeds, [speciesId]: state.seeds[speciesId] - 1 },
      plants: { ...state.plants, [id]: plant },
    },
  };
}

/** Move a shelved plant or object back into the garden. */
export function placeFromShelf(state: GameState, itemId: string, slotId: string): ActionResult {
  const plant = state.plants[itemId];
  const object = state.objects[itemId];
  const species = plant ? PLANT_BY_ID[plant.speciesId] : object ? OBJECT_BY_ID[object.speciesId] : null;
  if (!species) return fail(state, 'Unknown item');
  const item = (plant ?? object)!;
  if (item.location !== 'shelf') return fail(state, 'Not on the shelf');
  const err = slotAccepts(state, slotId, species.slotTypes);
  if (err) return fail(state, err);

  if (plant) {
    return {
      ok: true,
      state: { ...state, plants: { ...state.plants, [itemId]: { ...plant, location: slotId } } },
    };
  }
  return {
    ok: true,
    state: { ...state, objects: { ...state.objects, [itemId]: { ...object!, location: slotId } } },
  };
}

/**
 * Shelve. Objects: always. Plants: Mature + Healthy only (scheme §3).
 * Shelved plants are FROZEN — no thirst, no cost, state preserved
 * (ECONOMY.md §4 ruling). The freeze is implemented right here: thirst is
 * measured from lastWateredAt, so stamping it to `now` on unshelve would be
 * wrong — instead we stamp on shelve AND on unshelve, which together mean
 * shelf time never counts against the plant.
 */
export function shelveItem(state: GameState, itemId: string, now: number): ActionResult {
  const plant = state.plants[itemId];
  if (plant) {
    if (plant.location === 'shelf') return fail(state, 'Already shelved');
    const gate = canShelve(plant, now);
    if (!gate.ok) return fail(state, gate.reason!);
    return {
      ok: true,
      state: {
        ...state,
        plants: {
          ...state.plants,
          [itemId]: { ...plant, location: 'shelf', lastWateredAt: now, lastGrowthWaterAt: now },
        },
      },
    };
  }
  const object = state.objects[itemId];
  if (object) {
    if (object.location === 'shelf') return fail(state, 'Already shelved');
    return {
      ok: true,
      state: { ...state, objects: { ...state.objects, [itemId]: { ...object, location: 'shelf' } } },
    };
  }
  return fail(state, 'Unknown item');
}

/** Companion to the freeze: re-placing a shelved plant refreshes its clock. */
export function unshelvePlantTo(state: GameState, plantId: string, slotId: string, now: number): ActionResult {
  const placed = placeFromShelf(state, plantId, slotId);
  if (!placed.ok || !state.plants[plantId]) return placed;
  const plant = placed.state.plants[plantId];
  return {
    ok: true,
    state: {
      ...placed.state,
      plants: {
        ...placed.state.plants,
        [plantId]: { ...plant, lastWateredAt: now, lastGrowthWaterAt: now },
      },
    },
  };
}

export function buySeed(state: GameState, speciesId: string): ActionResult {
  const species = PLANT_BY_ID[speciesId];
  if (!species || !species.inShop) return fail(state, 'Not sold here — try a trader package');
  const price = SEED_PRICES[species.rarity];
  if (price === undefined) return fail(state, 'Not sold here');
  if (state.coins < price) return fail(state, 'Not enough coins');
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - price,
      seeds: { ...state.seeds, [speciesId]: (state.seeds[speciesId] ?? 0) + 1 },
    },
  };
}

export function buyObject(state: GameState, speciesId: string): ActionResult {
  const species = OBJECT_BY_ID[speciesId];
  if (!species) return fail(state, 'Unknown object');
  if (state.coins < species.cost) return fail(state, 'Not enough coins');
  const id = `o${state.nextId}`;
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - species.cost,
      nextId: state.nextId + 1,
      objects: { ...state.objects, [id]: { id, speciesId, location: 'shelf' } },
    },
  };
}

/**
 * Bramble prices rise with how many the player has already cleared, in any
 * order (ECONOMY.md sink #1: front-loaded cheap, last around day 125).
 */
function clearedOvergrownCount(state: GameState): number {
  return state.slots.filter(
    (s) => s.status === 'open' && typeof SLOT_DEF_BY_ID[s.id]?.start === 'number',
  ).length;
}

/** Next bramble price, for UI. */
export function nextOvergrownPrice(state: GameState): number {
  const cleared = clearedOvergrownCount(state);
  return OVERGROWN_PRICES[Math.min(cleared, OVERGROWN_PRICES.length - 1)];
}

/** Clear a bramble slot at the current OVERGROWN_PRICES step. */
export function clearOvergrown(state: GameState, slotId: string): ActionResult {
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot || slot.status !== 'overgrown') return fail(state, 'Nothing to clear');
  const price = nextOvergrownPrice(state);
  if (state.coins < price) return fail(state, `Needs ${price} coins`);
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - price,
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, status: 'open' as const } : s)),
    },
  };
}

/** Buy a designated expansion slot — the deliberate late-game sink. */
export function buyExpansion(state: GameState, slotId: string): ActionResult {
  const slot = state.slots.find((s) => s.id === slotId);
  const def = SLOT_DEF_BY_ID[slotId];
  if (!slot || !def || slot.status !== 'expansion') return fail(state, 'Not an expansion area');
  const limit = EXPANSION_LIMIT[def.type] ?? 0;
  const bought = state.expansionsBought[def.type] ?? 0;
  if (bought >= limit) return fail(state, 'No more expansions of this type');
  if (state.coins < EXPANSION_SLOT_COST) return fail(state, `Needs ${EXPANSION_SLOT_COST} coins`);
  return {
    ok: true,
    state: {
      ...state,
      coins: state.coins - EXPANSION_SLOT_COST,
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, status: 'open' as const } : s)),
      expansionsBought: { ...state.expansionsBought, [def.type]: bought + 1 },
    },
  };
}
