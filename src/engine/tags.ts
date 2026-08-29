/**
 * tags.ts — garden tag totals, derived fresh every time.
 *
 * Scheme §6: garden tag value = sum over all occupied slots. Dormant plants
 * contribute 0. Shelved items contribute 0 (that is the whole answer to the
 * shelving exploit — see ECONOMY.md §4).
 */
import { NIGHT, STAGE_TAG_MULTIPLIER } from '../config/balance';
import { OBJECT_BY_ID, PLANT_BY_ID, TAGS, type Tag, type TagValues } from '../config/content';
import { hourOf } from './clock';
import { isDormant } from './plants';
import type { GameState } from './types';

export function isNight(gameMs: number): boolean {
  const h = hourOf(gameMs);
  return h >= NIGHT.startHour || h < NIGHT.endHour;
}

export function computeGardenTags(state: GameState, now: number): Record<Tag, number> {
  const totals = Object.fromEntries(TAGS.map((t) => [t, 0])) as Record<Tag, number>;
  const add = (tags: TagValues | undefined, mult = 1) => {
    if (!tags) return;
    for (const [tag, v] of Object.entries(tags)) totals[tag as Tag] += (v ?? 0) * mult;
  };

  for (const plant of Object.values(state.plants)) {
    if (plant.location === 'shelf') continue;
    if (isDormant(plant, now)) continue;
    add(PLANT_BY_ID[plant.speciesId]?.tags, STAGE_TAG_MULTIPLIER[plant.stage]);
  }
  for (const obj of Object.values(state.objects)) {
    if (obj.location === 'shelf') continue;
    const species = OBJECT_BY_ID[obj.speciesId];
    add(species?.tags);
    if (isNight(now)) add(species?.tagsAtNight);
  }
  return totals;
}

/** Product of spawn multipliers from placed objects for a creature category. */
export function spawnMultiplierFor(state: GameState, category: string): number {
  let m = 1;
  for (const obj of Object.values(state.objects)) {
    if (obj.location === 'shelf') continue;
    const mult = OBJECT_BY_ID[obj.speciesId]?.spawnMultipliers?.[category as never];
    if (mult) m *= mult;
  }
  return m;
}
