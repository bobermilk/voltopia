/**
 * quests.ts — the measurement instrument.
 *
 * Daily quests pay base coins × the evidence multiplier — evidence strength
 * scales the reward, it NEVER gates it (ECONOMY.md §5). Benchmark quests run
 * once per billing period; the first submitted bill of each type becomes the
 * player's PERSONAL BASELINE, which is the direct answer to "how would you
 * know whether it worked."
 */
import {
  BENCHMARK_QUEST_COINS,
  DAILY_QUEST_COINS,
  DHASH_DUPLICATE_DISTANCE,
  EVIDENCE_MULTIPLIER,
  MAGIC_SEED_BY_BENCHMARK,
  MAGIC_SEED_BY_EVIDENCE,
  NATIONAL_REFERENCE,
  PACKAGE_CAPS,
  SHOWER,
  type EvidenceTier,
  type SeedRarity,
} from '../config/balance';
import { BENCHMARK_QUESTS, DAILY_QUESTS } from '../config/content';
import { dayOf, periodOf } from './clock';
import { grantMagicSeed } from './magicSeeds';
import { hammingHex } from '../capture/verification';
import type { BillSubmission, GameState } from './types';

export interface QuestResult {
  state: GameState;
  ok: boolean;
  error?: string;
  coins?: number;
  /** Rarity of the magic seed the Gnome delivered, if any. */
  seedRarity?: SeedRarity;
  met?: boolean;
  baselineCaptured?: boolean;
}

export function isDoneToday(state: GameState, questId: string, now: number): boolean {
  return state.quests.dailies[questId]?.day === dayOf(now);
}

export function isDoneThisPeriod(state: GameState, questId: string, now: number): boolean {
  return state.quests.benchmarks[questId]?.lastPeriod === periodOf(now);
}

/** Reject a photo whose perceptual hash matches accepted evidence (§5 fix 3). */
export function isDuplicatePhoto(state: GameState, hash: string): boolean {
  return state.photoHashes.some((h) => hammingHex(h, hash) <= DHASH_DUPLICATE_DISTANCE);
}

export function completeDaily(
  state: GameState,
  questId: keyof typeof DAILY_QUEST_COINS,
  tier: EvidenceTier,
  now: number,
  photoHash?: string,
): QuestResult {
  const def = DAILY_QUESTS.find((q) => q.id === questId);
  if (!def || def.auto) return { state, ok: false, error: 'Unknown quest' };
  if (!def.tiers.includes(tier)) return { state, ok: false, error: 'Evidence tier not supported' };
  if (isDoneToday(state, questId, now)) return { state, ok: false, error: 'Already done today' };
  if (photoHash && isDuplicatePhoto(state, photoHash)) {
    return { state, ok: false, error: 'That photo matches one already submitted' };
  }

  const coins = Math.round(DAILY_QUEST_COINS[questId] * EVIDENCE_MULTIPLIER[tier]);
  const day = dayOf(now);
  let draft: GameState = {
    ...state,
    coins: state.coins + coins,
    quests: {
      ...state.quests,
      dailies: { ...state.quests.dailies, [questId]: { day, tier, coins } },
    },
    photoHashes: photoHash ? [...state.photoHashes, photoHash].slice(-60) : state.photoHashes,
    log: [...state.log, { at: now, kind: 'quest', text: `${def.name} — +${coins} coins.` }],
  };

  // Magic seed, if the daily caps allow (max/day + one per quest per day —
  // the once-a-day completion guard above already enforces the latter).
  let seedRarity: SeedRarity | undefined;
  if (draft.quests.packagesFromDailies < PACKAGE_CAPS.maxPerDayFromDailyQuests) {
    seedRarity = MAGIC_SEED_BY_EVIDENCE[tier];
    draft = grantMagicSeed(draft, seedRarity, `daily:${questId}`, now).state;
    draft.quests = { ...draft.quests, packagesFromDailies: draft.quests.packagesFromDailies + 1 };
  }

  return { state: draft, ok: true, coins, seedRarity };
}

function applyBenchmark(
  state: GameState,
  questId: keyof typeof BENCHMARK_QUEST_COINS,
  submission: BillSubmission,
  now: number,
  baselinePatch: Partial<NonNullable<GameState['baseline']>> | null,
  photoHash?: string,
): QuestResult {
  const def = BENCHMARK_QUESTS.find((q) => q.id === questId)!;
  if (isDoneThisPeriod(state, questId, now)) {
    return { state, ok: false, error: 'Once per billing period — come back next month' };
  }
  if (photoHash && isDuplicatePhoto(state, photoHash)) {
    return { state, ok: false, error: 'That bill photo matches one already submitted' };
  }

  const prev = state.quests.benchmarks[questId];
  const baselineCaptured = baselinePatch !== null && state.baseline?.capturedAt === undefined;
  let draft: GameState = {
    ...state,
    photoHashes: photoHash ? [...state.photoHashes, photoHash].slice(-60) : state.photoHashes,
    baseline: baselinePatch
      ? { capturedAt: state.baseline?.capturedAt ?? now, ...state.baseline, ...baselinePatch }
      : state.baseline,
    quests: {
      ...state.quests,
      benchmarks: {
        ...state.quests.benchmarks,
        [questId]: {
          lastPeriod: periodOf(now),
          submissions: [...(prev?.submissions ?? []), submission].slice(-24),
        },
      },
    },
    log: [...state.log],
  };

  let coins = 0;
  let seedRarity: SeedRarity | undefined;
  if (submission.met) {
    coins = BENCHMARK_QUEST_COINS[questId];
    draft.coins += coins;
    seedRarity = MAGIC_SEED_BY_BENCHMARK[questId];
    draft = grantMagicSeed(draft, seedRarity, `benchmark:${questId}`, now).state;
    draft.log.push({ at: now, kind: 'quest', text: `${def.name} — met! +${coins} coins.` });
  } else {
    draft.log.push({ at: now, kind: 'quest', text: `${def.name} — recorded. Not under target this period.` });
  }
  return { state: draft, ok: true, coins, seedRarity, met: submission.met, baselineCaptured };
}

/** PUB bill: m³ ÷ household size ÷ days → litres/person/day. */
export function submitWaterBill(
  state: GameState,
  input: { cubicMetres: number; householdSize: number; days: number },
  now: number,
  photoHash?: string,
): QuestResult {
  const { cubicMetres, householdSize, days } = input;
  if (!(cubicMetres > 0) || !(householdSize >= 1) || !(days >= 20)) {
    return { state, ok: false, error: 'Those figures do not look like a monthly bill' };
  }
  const value = Math.round((cubicMetres * 1000) / householdSize / days);
  const met = value <= NATIONAL_REFERENCE.waterTargetLitresPerPersonPerDay;
  const isFirst = state.baseline?.waterLitresPerPersonPerDay === undefined;
  return applyBenchmark(
    state,
    'water_under_130L',
    { at: now, value, met },
    now,
    isFirst ? { waterLitresPerPersonPerDay: value } : null,
    photoHash,
  );
}

/** SP bill: kWh for the month vs the published flat-type average. */
export function submitElectricityBill(
  state: GameState,
  input: { kwh: number; flatType: string },
  now: number,
  photoHash?: string,
): QuestResult {
  const { kwh, flatType } = input;
  const avg = NATIONAL_REFERENCE.electricityKwhPerMonth[flatType];
  if (!avg || !(kwh > 0)) return { state, ok: false, error: 'Pick a flat type and enter the kWh figure' };
  const met = kwh <= avg;
  const isFirst = state.baseline?.electricityKwhPerMonth === undefined;
  return applyBenchmark(
    state,
    'electricity_under_average',
    { at: now, value: kwh, flatType, met },
    now,
    isFirst ? { electricityKwhPerMonth: kwh, flatType } : null,
    photoHash,
  );
}

/** Label quests: accept-and-store with a live-camera photo (never a picker). */
export function submitLabelPhoto(
  state: GameState,
  questId: 'appliance_4_ticks' | 'fitting_2_ticks',
  photoHash: string,
  now: number,
): QuestResult {
  if (isDuplicatePhoto(state, photoHash)) {
    return { state, ok: false, error: 'That label photo matches one already submitted' };
  }
  const withHash: GameState = { ...state, photoHashes: [...state.photoHashes, photoHash].slice(-60) };
  return applyBenchmark(withHash, questId, { at: now, value: 1, met: true }, now, null);
}

/* ── the 5-minute shower timer ─────────────────────────────────────── */

/** Start the shower timer (idempotent — returns the same state if running). */
export function startShower(state: GameState, now: number): GameState {
  if (state.shower.startedAt !== null) return state;
  return { ...state, shower: { ...state.shower, startedAt: now } };
}

/** Cancel a running shower with no reward. */
export function cancelShower(state: GameState): GameState {
  if (state.shower.startedAt === null) return state;
  return { ...state, shower: { ...state.shower, startedAt: null } };
}

/**
 * Finish the shower. Complete iff the timer ran to (near) the end and it
 * hasn't already been done today. Grants coins + a rare magic seed.
 */
export function finishShower(
  state: GameState,
  now: number,
): QuestResult {
  if (state.shower.startedAt === null) return { state, ok: false, error: 'The shower timer is not running' };
  const elapsedSec = (now - state.shower.startedAt) / 1000;
  const complete = elapsedSec >= SHOWER.durationSec - SHOWER.graceSec;
  const today = dayOf(now);
  if (!complete) {
    return { state: cancelShower(state), ok: false, error: 'Stopped early — no reward this time' };
  }
  if (state.shower.lastDoneDay === today) {
    return { state: cancelShower(state), ok: false, error: 'Already showered short today' };
  }
  let draft: GameState = {
    ...state,
    coins: state.coins + SHOWER.coins,
    shower: { startedAt: null, lastDoneDay: today },
    log: [...state.log, { at: now, kind: 'quest', text: `Five-minute shower — +${SHOWER.coins} coins.` }],
  };
  draft = grantMagicSeed(draft, SHOWER.reward, 'shower', now).state;
  return { state: draft, ok: true, coins: SHOWER.coins, seedRarity: SHOWER.reward };
}
