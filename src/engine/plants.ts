/**
 * plants.ts — lifecycle: Seed → Sprout → Growing → Mature.
 *
 * Dormancy is DERIVED, never stored: a plant is dormant iff its thirst window
 * has lapsed. Plants never die (CLAUDE.md law). Watering restores Healthy
 * instantly and, if the growth gap has passed, counts toward the next stage —
 * so growth cannot be rushed by spamming water (scheme §4).
 */
import { GROWTH, WATER, WATER_SOON_FRACTION } from '../config/balance';
import { PLANT_BY_ID, type PlantSpecies } from '../config/content';
import type { GameState, PlantInstance, PlantStage } from './types';

export const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'growing', 'mature'];

export function speciesOf(plant: PlantInstance): PlantSpecies {
  return PLANT_BY_ID[plant.speciesId];
}

/** Seeds are inert (not yet sprouted) — they cannot be dormant. Shelved
 *  plants are FROZEN (ECONOMY.md §4): no thirst on the shelf, ever. */
export function isDormant(plant: PlantInstance, now: number): boolean {
  if (plant.stage === 'seed') return false;
  if (plant.location === 'shelf') return false;
  const { thirstMs } = WATER[speciesOf(plant).rarity];
  return now - plant.lastWateredAt > thirstMs;
}

export function thirstFraction(plant: PlantInstance, now: number): number {
  const { thirstMs } = WATER[speciesOf(plant).rarity];
  return Math.min(1, Math.max(0, (now - plant.lastWateredAt) / thirstMs));
}

/** Dormant or in the last quarter of the window — Water-all's default set. */
export function isThirsty(plant: PlantInstance, now: number): boolean {
  if (plant.stage === 'seed') return false;
  return isDormant(plant, now) || thirstFraction(plant, now) >= 1 - WATER_SOON_FRACTION;
}

export function waterCost(plant: PlantInstance): number {
  return WATER[speciesOf(plant).rarity].cost;
}

/** When the next growth-counting watering becomes available (game ms). */
export function nextGrowthWaterAt(plant: PlantInstance): number {
  if (plant.stage === 'mature') return Infinity;
  const { minGapMs } = GROWTH[speciesOf(plant).rarity];
  return plant.lastGrowthWaterAt + minGapMs;
}

export function growthWaterReady(plant: PlantInstance, now: number): boolean {
  return plant.stage !== 'mature' && now >= nextGrowthWaterAt(plant);
}

/**
 * Does watering this plant right now do anything? (Restore a dormant plant,
 * refresh a thirsty one, or count toward growth.) The UI disables the button
 * otherwise so a tap never silently burns coins.
 */
export function wateringUseful(plant: PlantInstance, now: number): boolean {
  return isThirsty(plant, now) || growthWaterReady(plant, now) || plant.stage === 'seed';
}

/**
 * Water one plant. Pure: returns a new state (or the same state if the
 * player can't afford it). Deducts coins, restores Healthy, advances growth
 * when the min-gap rule allows.
 */
export function waterPlant(state: GameState, plantId: string, now: number): GameState {
  const plant = state.plants[plantId];
  if (!plant) return state;
  const cost = waterCost(plant);
  if (state.coins < cost) return state;

  const species = speciesOf(plant);
  const { wateringsPerStage, minGapMs } = GROWTH[species.rarity];
  const next: PlantInstance = { ...plant, lastWateredAt: now };

  if (plant.stage !== 'mature' && now - plant.lastGrowthWaterAt >= minGapMs) {
    next.wateringsThisStage = plant.wateringsThisStage + 1;
    next.lastGrowthWaterAt = now;
    if (next.wateringsThisStage >= wateringsPerStage) {
      next.stage = STAGE_ORDER[STAGE_ORDER.indexOf(plant.stage) + 1];
      next.wateringsThisStage = 0;
    }
  }

  return {
    ...state,
    coins: state.coins - cost,
    plants: { ...state.plants, [plantId]: next },
  };
}

/** Scheme §3: only Mature + Healthy plants may be shelved. */
export function canShelve(plant: PlantInstance, now: number): { ok: boolean; reason?: string } {
  if (plant.stage !== 'mature') return { ok: false, reason: "It's still rooting" };
  if (isDormant(plant, now)) return { ok: false, reason: 'Water it first' };
  return { ok: true };
}

/** All placed plants needing water, with total cost — for Water-all. */
export function waterAllPlan(
  state: GameState,
  now: number,
  onlyThirsty: boolean,
): { plantIds: string[]; total: number } {
  const plantIds = Object.values(state.plants)
    .filter((p) => p.location !== 'shelf')
    .filter((p) => (onlyThirsty ? isThirsty(p, now) : wateringUseful(p, now)))
    .map((p) => p.id);
  const total = plantIds.reduce((s, id) => s + waterCost(state.plants[id]), 0);
  return { plantIds, total };
}
