/**
 * magicSeeds.ts — the reworked reward system (replaces traders/packages).
 *
 * The Gnome delivers a MAGIC SEED whenever a real-world action verifies. Its
 * rarity (common/rare/epic/legendary) is set by which action earned it. The
 * player grows the seed in the Magic Seed tab: a hold-to-water mini-game where
 * the seed sprouts through forms (seedling → sapling → tree → huge tree). The
 * grown FORM decides the loot; the seed's rarity biases how high it reaches
 * (FORM_ODDS). Higher forms pay better AND pay multiple rewards.
 *
 * All randomness comes from the persisted seed+counter, so a demo run
 * reproduces exactly (scheme §7).
 */
import {
  FORM_LOOT,
  GROWN_FORMS,
  LOOT_COINS,
  PROMOTE_CHANCE,
  SEED_FLOOR,
  type GrownForm,
  type SeedRarity,
} from '../config/balance';
import { COSMETICS, OBJECTS, PLANTS } from '../config/content';
import { Draws } from './rng';
import type { GameState, GrowResult, LootResult, MagicSeedInstance } from './types';

/** Give the player a magic seed of the given rarity. */
export function grantMagicSeed(
  state: GameState,
  rarity: SeedRarity,
  source: string,
  now: number,
): { state: GameState; seed: MagicSeedInstance } {
  const seed: MagicSeedInstance = { id: `ms${state.nextId}`, rarity, arrivedAt: now, source };
  return {
    state: {
      ...state,
      nextId: state.nextId + 1,
      magicSeeds: [...state.magicSeeds, seed],
      log: [...state.log, { at: now, kind: 'seed', text: `The Gnome left a ${rarity} magic seed.` }],
    },
    seed,
  };
}

/** Stage index: 0 = bare seed, 1..4 = the four forms. */
function stageOf(form: GrownForm | null): number {
  return form ? GROWN_FORMS.indexOf(form) + 1 : 0;
}

export interface PromoteResult {
  state: GameState;
  promoted: boolean;
  /** The seed's form after this attempt (unchanged on failure). */
  form: GrownForm | null;
  /** Guaranteed (within the seed's floor) rather than a gamble. */
  guaranteed: boolean;
  /** No further watering possible (settled by a failed gamble, or maxed). */
  locked: boolean;
  /** The success chance that was rolled (1 for guaranteed). */
  chance: number;
}

/**
 * Resolve ONE watering charge: attempt to promote the seed from `current` to
 * the next form. Promotions up to the seed's floor always succeed; above the
 * floor they gamble on PROMOTE_CHANCE, and a failure locks the seed.
 * Deterministic — a gamble advances the persisted RNG counter.
 */
export function attemptPromote(
  state: GameState,
  seedId: string,
  current: GrownForm | null,
): PromoteResult {
  const seed = state.magicSeeds.find((s) => s.id === seedId);
  const cur = stageOf(current);
  if (!seed || cur >= 4) {
    return { state, promoted: false, form: current, guaranteed: false, locked: true, chance: 0 };
  }
  const nextForm = GROWN_FORMS[cur]; // the form we'd promote INTO (stage cur+1)
  const floorStage = stageOf(SEED_FLOOR[seed.rarity]);
  const guaranteed = cur + 1 <= floorStage;

  if (guaranteed) {
    return { state, promoted: true, form: nextForm, guaranteed: true, locked: false, chance: 1 };
  }
  const draws = new Draws(state.rng.seed, state.rng.counter);
  const chance = PROMOTE_CHANCE[nextForm];
  const promoted = draws.next() < chance;
  const next: GameState = { ...state, rng: { ...state.rng, counter: draws.counter } };
  return {
    state: next,
    promoted,
    form: promoted ? nextForm : current,
    guaranteed: false,
    locked: !promoted, // a failed gamble settles the seed here
    chance,
  };
}

function seedOfRarity(draws: Draws, rarity: 'common' | 'uncommon' | 'rare' | 'legendary', shopOnly = false): string {
  const pool = PLANTS.filter((p) => p.rarity === rarity && (!shopOnly || p.inShop));
  return draws.pick(pool).id;
}

/** Resolve one loot-pool entry into an applied reward + updated draft. */
function applyLootEntry(draft: GameState, entry: string, draws: Draws): LootResult {
  switch (entry) {
    case 'base_seed': {
      const id = seedOfRarity(draws, 'common', true);
      draft.seeds[id] = (draft.seeds[id] ?? 0) + 1;
      return { kind: 'seed', id, rarity: 'common' };
    }
    case 'uncommon_seed': {
      const id = seedOfRarity(draws, 'uncommon');
      draft.seeds[id] = (draft.seeds[id] ?? 0) + 1;
      return { kind: 'seed', id, rarity: 'uncommon' };
    }
    case 'rare_seed': {
      const id = seedOfRarity(draws, 'rare');
      draft.seeds[id] = (draft.seeds[id] ?? 0) + 1;
      return { kind: 'seed', id, rarity: 'rare' };
    }
    case 'legendary_seed': {
      const id = seedOfRarity(draws, 'legendary');
      draft.seeds[id] = (draft.seeds[id] ?? 0) + 1;
      return { kind: 'seed', id, rarity: 'legendary' };
    }
    case 'coins_small':
    case 'coins_med':
    case 'coins_big': {
      const band = LOOT_COINS[entry];
      const amount = draws.int(band.min, band.max);
      draft.coins += amount;
      return { kind: 'coins', amount };
    }
    case 'common_object':
    case 'object': {
      const species = draws.pick(OBJECTS);
      const id = `o${draft.nextId++}`;
      draft.objects[id] = { id, speciesId: species.id, location: 'shelf' };
      return { kind: 'object', id: species.id };
    }
    case 'cosmetic': {
      const unowned = COSMETICS.filter((c) => c.class === 'decor' && !draft.cosmetics.includes(c.id));
      if (unowned.length === 0) {
        const amount = draws.int(LOOT_COINS.coins_med.min, LOOT_COINS.coins_med.max);
        draft.coins += amount;
        return { kind: 'coins', amount };
      }
      const c = draws.pick(unowned);
      draft.cosmetics.push(c.id);
      return { kind: 'cosmetic', id: c.id };
    }
    default: {
      draft.coins += LOOT_COINS.coins_small.min;
      return { kind: 'coins', amount: LOOT_COINS.coins_small.min };
    }
  }
}

/**
 * Harvest a fully-grown magic seed at the form the mini-game settled on
 * (the promotion RNG already happened per-charge in attemptPromote): remove
 * the seed and pay out that form's loot (one or more rewards).
 */
export function growMagicSeed(
  state: GameState,
  seedId: string,
  form: GrownForm,
): { state: GameState; result: GrowResult | null } {
  const seed = state.magicSeeds.find((s) => s.id === seedId);
  if (!seed) return { state, result: null };

  const draws = new Draws(state.rng.seed, state.rng.counter);

  const draft: GameState = {
    ...state,
    magicSeeds: state.magicSeeds.filter((s) => s.id !== seedId),
    seeds: { ...state.seeds },
    objects: { ...state.objects },
    cosmetics: [...state.cosmetics],
  };

  const loot = FORM_LOOT[form];
  const rewards: LootResult[] = [];
  for (let i = 0; i < loot.rolls; i++) {
    const entry = draws.weighted(loot.pool.map(({ item, p }) => ({ item, weight: p })))!;
    rewards.push(applyLootEntry(draft, entry, draws));
  }

  draft.rng = { ...draft.rng, counter: draws.counter };
  return { state: draft, result: { form, rewards } };
}
