/**
 * guide.ts — recording visitors into the Field Guide.
 *
 * Player present + tap = interaction = full entry, first-record bonus, and
 * (for commons) the Postman (scheme §8, §11). Recording a creature with a
 * trophy cosmetic unlocks it (ECONOMY.md §6 — trophies prove achievement).
 */
import { FIRST_RECORD_BONUS, MAGIC_SEED_BY_FIRST_RECORD } from '../config/balance';
import { CREATURE_BY_ID } from '../config/content';
import { freshGuideEntry } from './catchup';
import { grantMagicSeed } from './magicSeeds';
import type { GameState } from './types';

export interface RecordResult {
  state: GameState;
  recorded?: {
    creatureId: string;
    firstRecord: boolean;
    bonus: number;
    cosmeticUnlocked?: string;
    magicSeedRarity?: string;
    mementoEarned?: boolean;
  };
}

export function recordVisitor(state: GameState, visitorId: string, now: number): RecordResult {
  const visitor = state.visitors.find((v) => v.id === visitorId);
  if (!visitor || visitor.departsAt <= now) return { state };
  const creature = CREATURE_BY_ID[visitor.creatureId];
  const entry = state.guide[creature.id] ?? freshGuideEntry();

  let draft: GameState = {
    ...state,
    visitors: state.visitors.map((v) => (v.id === visitorId ? { ...v, recordedThisVisit: true } : v)),
    guide: { ...state.guide },
    log: [...state.log],
  };

  if (entry.state === 'recorded') {
    // Repeat interaction — the visit was already counted at arrival.
    return { state: draft, recorded: { creatureId: creature.id, firstRecord: false, bonus: 0 } };
  }

  const bonus = FIRST_RECORD_BONUS[creature.rarity];
  draft.coins += bonus;
  draft.guide[creature.id] = {
    ...entry,
    state: 'recorded',
    recordedAt: now,
    visits: entry.visits + 1,
  };
  draft.log.push({ at: now, kind: 'record', text: `${creature.name} recorded! +${bonus} coins.` });

  let cosmeticUnlocked: string | undefined;
  if (creature.unlocksCosmetic && !draft.cosmetics.includes(creature.unlocksCosmetic)) {
    draft = { ...draft, cosmetics: [...draft.cosmetics, creature.unlocksCosmetic] };
    cosmeticUnlocked = creature.unlocksCosmetic;
  }

  let magicSeedRarity: string | undefined;
  const seedRarity = MAGIC_SEED_BY_FIRST_RECORD[creature.rarity];
  if (seedRarity) {
    draft = grantMagicSeed(draft, seedRarity, `first_record:${creature.id}`, now).state;
    magicSeedRarity = seedRarity;
  }

  return {
    state: draft,
    recorded: { creatureId: creature.id, firstRecord: true, bonus, cosmeticUnlocked, magicSeedRarity },
  };
}

/** Field Guide completion, shown on the home screen at all times (§9). */
export function guideCompletion(state: GameState): { recorded: number; total: number; pct: number } {
  const total = Object.keys(CREATURE_BY_ID).length;
  const recorded = Object.values(state.guide).filter((g) => g.state === 'recorded').length;
  return { recorded, total, pct: Math.round((recorded / total) * 100) };
}
