/** Shared test helpers — build states directly, no UI involved. */
import { newGame } from './newGame';
import type { GameState } from './types';

export const DAY_MS = 24 * 3600 * 1000;

export function base(t0: number, seed = 12345): GameState {
  return newGame(t0, seed);
}

/** Drop a mature, freshly watered plant straight into a slot. */
export function matureAt(state: GameState, speciesId: string, slotId: string, now: number): string {
  const id = `pl${state.nextId++}`;
  state.plants[id] = {
    id,
    speciesId,
    stage: 'mature',
    wateringsThisStage: 0,
    lastWateredAt: now,
    lastGrowthWaterAt: now,
    plantedAt: now,
    location: slotId,
  };
  // ensure the slot is open for test setups that use bramble slots
  state.slots = state.slots.map((s) => (s.id === slotId ? { ...s, status: 'open' as const } : s));
  return id;
}

export function objectAt(state: GameState, speciesId: string, slotId: string): string {
  const id = `o${state.nextId++}`;
  state.objects[id] = { id, speciesId, location: slotId };
  state.slots = state.slots.map((s) => (s.id === slotId ? { ...s, status: 'open' as const } : s));
  return id;
}
