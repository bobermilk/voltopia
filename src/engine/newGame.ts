/**
 * newGame.ts — initial state. Generous start per scheme §19: starter coins,
 * a couple of seeds, one mature plant already living in the first lawn bed.
 */
import { STARTER, STARTING_COINS, TIME_SCALE } from '../config/balance';
import { SLOT_DEFS } from '../config/content';
import type { GameState, SlotInstance } from './types';

export const SAVE_VERSION = 1;

export function newGame(realNow: number, seed: number): GameState {
  const now = realNow; // game time === real time until the scale changes
  const slots: SlotInstance[] = SLOT_DEFS.map((d) => ({
    id: d.id,
    status: d.start === 'open' ? 'open' : d.start === 'expansion' ? 'expansion' : 'overgrown',
    ...(typeof d.start === 'number' ? { overgrownIndex: d.start } : {}),
  }));

  const state: GameState = {
    version: SAVE_VERSION,
    createdAt: now,
    coins: STARTING_COINS,
    clock: { anchorReal: realNow, anchorGame: now, scale: TIME_SCALE },
    rng: { seed, counter: 0 },
    nextId: 1,
    slots,
    plants: {},
    objects: {},
    seeds: { ...STARTER.seeds },
    cosmetics: [],
    visitors: [],
    lastSpawnTickAt: now,
    lastCatchUpAt: now,
    guide: {},
    quests: { dailies: {}, packagesDay: '', packagesFromDailies: 0, benchmarks: {} },
    baseline: null,
    magicSeeds: [],
    shower: { startedAt: null },
    photoHashes: [],
    log: [{ at: now, kind: 'info', text: 'Welcome to your garden. Something will notice it soon.' }],
    expansionsBought: {},
    // Munchkin the cat is every garden's first companion (and avatar).
    profile: { name: 'Gardener', avatar: 'munchkin_cat', showcase: [] },
    tutorialDone: false,
    ecovoltLinked: false,
  };

  // One mature starter plant so the very first screen already shows life.
  const id = `pl${state.nextId++}`;
  state.plants[id] = {
    id,
    speciesId: STARTER.maturePlaced,
    stage: 'mature',
    wateringsThisStage: 0,
    lastWateredAt: now,
    lastGrowthWaterAt: now,
    plantedAt: now,
    location: 'soil_1',
  };
  return state;
}
