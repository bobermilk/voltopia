/**
 * balance.ts — VOLTOPIA
 * ---------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for every tunable number in the game.
 * Nothing in this file may be duplicated into a component. If a judge
 * challenges a figure, it must be a one-line change here.
 *
 * All economy numbers below are solved, not guessed. See ECONOMY.md for the
 * arithmetic and the sustainability curve they produce.
 * ---------------------------------------------------------------------------
 */

/* ═════════════════════════════════════════════════════════════════════════
   TIME
   ═══════════════════════════════════════════════════════════════════════ */

export const MIN = 60_000;
export const HOUR = 60 * MIN;

/** Demo recording: set to 1440. Every timed system accelerates together. */
export let TIME_SCALE = 1;
export function setTimeScale(v: number) { TIME_SCALE = v; }

export const SPAWN_TICK_MS = 30 * MIN;
export const VISIT_MIN_MS = 20 * MIN;
export const VISIT_MAX_MS = 90 * MIN;
export const MAX_CONCURRENT_VISITORS = 3;

/* ═════════════════════════════════════════════════════════════════════════
   RARITY
   ═══════════════════════════════════════════════════════════════════════ */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

/* ═════════════════════════════════════════════════════════════════════════
   WATERING  — the primary coin sink
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * DESIGN LAW: no thirst window is ever shorter than 24 h.
 *
 * A player who opens the app once a day must never find a dormant plant.
 * Rarity raises the COST of upkeep, never the FREQUENCY — otherwise the game
 * becomes the nagging app the brief is written against, and the "30 seconds,
 * twice a day" thesis dies.
 */
export const WATER: Record<Rarity, { cost: number; thirstMs: number }> = {
  common:    { cost: 1,  thirstMs: 72 * HOUR },
  uncommon:  { cost: 3,  thirstMs: 48 * HOUR },
  rare:      { cost: 8,  thirstMs: 36 * HOUR },
  legendary: { cost: 20, thirstMs: 24 * HOUR },
};

/** Growth: each stage needs N waterings AND a minimum real-time gap. */
export const GROWTH: Record<Rarity, { wateringsPerStage: number; minGapMs: number }> = {
  common:    { wateringsPerStage: 1, minGapMs: 4 * HOUR },
  uncommon:  { wateringsPerStage: 2, minGapMs: 8 * HOUR },
  rare:      { wateringsPerStage: 3, minGapMs: 12 * HOUR },
  legendary: { wateringsPerStage: 4, minGapMs: 24 * HOUR },
};
// Legendary: 3 stages x 4 waterings x 24h gap ~= 12 days seed to mature.
// Combined with a monthly-ish legendary seed, that is the "week of effort" bar.

/* ═════════════════════════════════════════════════════════════════════════
   SLOTS
   ═══════════════════════════════════════════════════════════════════════ */

export type SlotType = 'soil' | 'water_edge' | 'paving' | 'vertical' | 'elevated';

/** Base scene: 16 slots. 8 open at start, 8 drawn as bramble. */
export const BASE_SLOTS: Record<SlotType, number> = {
  soil: 6,
  water_edge: 3,
  paving: 3,
  vertical: 2,
  elevated: 2,
};

/** Clearing the 8 overgrown slots, in order. Rising, but front-loaded cheap. */
export const OVERGROWN_PRICES = [150, 250, 400, 600, 850, 1150, 1500, 2000];

/**
 * Paid expansion beyond the 16, in designated areas only. Deliberately
 * expensive — this is the late-game money sink that stops coin inflation once
 * the garden is full.
 */
export const EXPANSION_SLOT_COST = 500;
export const EXPANSION_LIMIT: Partial<Record<SlotType, number>> = {
  water_edge: 2,
  soil: 1,
  elevated: 1,
};

/* ═════════════════════════════════════════════════════════════════════════
   SPAWNING  — two-stage roll, NOT the old multiplicative formula
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * WHY THIS REPLACED THE v4 FORMULA:
 *   weight = base_rarity x (1 + SUM(tag x pref))
 * With base rarities of 100 vs 1, any common that shares a legendary's tag
 * preference dominates it. In a Wet-12 garden built specifically to attract
 * the Otter, the Garden Snail (also Wet-preferring, base 100) outweighed the
 * Otter roughly 68:1. The player's deliberate build was punished by its own
 * success.
 *
 * Two-stage fixes it and is far easier to tune and to explain:
 *   1. Roll a rarity tier from fixed odds.
 *   2. Weight WITHIN that tier by tag fit.
 * Rarity stays legible ("recorded by 4% of gardeners") and a targeted build
 * reliably produces the creature it was built for.
 */
export const TIER_ODDS: Array<{ tier: Rarity | 'none'; p: number }> = [
  { tier: 'none',      p: 0.350 },
  { tier: 'common',    p: 0.450 },
  { tier: 'uncommon',  p: 0.160 },
  { tier: 'rare',      p: 0.037 },
  { tier: 'legendary', p: 0.003 },
];
// ~40 effective rolls/day => legendary sighting ~1 per 8 days ONCE its hard
// requirement is met. Rare ~1.5/day.

/** If the rolled tier has no eligible creature, fall down one tier. */
export const TIER_FALLBACK: Record<Rarity, Rarity | 'none'> = {
  legendary: 'rare',
  rare: 'uncommon',
  uncommon: 'common',
  common: 'none',
};

/** Within-tier weight. Tag fit only; rarity is already handled by stage 1. */
export function tagFitWeight(
  gardenTags: Record<string, number>,
  prefs: Record<string, number>,
): number {
  let s = 0;
  for (const [tag, pref] of Object.entries(prefs)) s += (gardenTags[tag] ?? 0) * pref;
  return 1 + s;
}

/**
 * Damping: already-recorded creatures still visit (repeat visits drive the
 * Critterbook visit counter and unlock mementos at visit 15) but must not
 * crowd out unseen ones. 0.4 keeps them present without blocking discovery.
 */
export const RECORDED_DAMPING = 0.4;
export const MEMENTO_AT_VISIT = 15;

/* ═════════════════════════════════════════════════════════════════════════
   SHELVING
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * RULING (per design): shelved plants are frozen. No thirst timer, no water
 * cost, state preserved exactly.
 *
 * The v4 doc worried this reopens an exploit — shelve everything, pay no
 * upkeep, deploy only when checking for visitors. It does not, because
 * shelved items contribute 0 tags, so a shelved garden spawns NOTHING. Spawn
 * ticks run offline and produce Sightings, which are real progress. Shelving
 * to avoid upkeep therefore forfeits all discovery, at every tier.
 *
 * The one surviving edge case is shelving overnight while asleep, saving
 * roughly a third of upkeep in exchange for losing overnight Sightings and
 * doing the swap by hand twice a day. That trade is bad for the player and
 * requires real tedium, so it needs no mechanical block.
 *
 * Only MATURE + HEALTHY plants may be shelved. Growing plants are still
 * rooting; dormant plants must be watered first.
 */
export const SHELVED_PLANTS_FREEZE = true;

/* ═════════════════════════════════════════════════════════════════════════
   QUESTS & INCOME
   ═══════════════════════════════════════════════════════════════════════ */

export const DAILY_QUEST_COINS = {
  aircon_25: 25,
  fans_not_aircon: 20,
  sockets_off: 10,
  green_transport: 30,
  daily_login: 10,
} as const;
// Committed player (all five): 95/day. Casual (~three): ~60/day.

export const BENCHMARK_QUEST_COINS = {
  water_under_130L: 300,
  electricity_under_average: 300,
  appliance_4_ticks: 200,
  fitting_2_ticks: 200,
} as const;

export const FIRST_RECORD_BONUS: Record<Rarity, number> = {
  common: 50, uncommon: 100, rare: 250, legendary: 1000,
};

export const STARTING_COINS = 150;

/* ═════════════════════════════════════════════════════════════════════════
   MAGIC SEEDS — the reworked reward system (replaces traders/packages)
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * One deliverer now: the Gnome brings a MAGIC SEED whenever a real-world
 * action is verified. The seed's RARITY is the "tier" the old traders used
 * to encode — common / rare / epic / legendary — set by which action earned
 * it. The player grows the seed themselves (hold-to-water mini-game); the
 * grown FORM decides the loot. Seed rarity biases which form it reaches.
 */
export type SeedRarity = 'common' | 'rare' | 'epic' | 'legendary';
export const SEED_RARITIES: SeedRarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Grown forms, worst → best. Higher forms give better + more numerous loot. */
export type GrownForm = 'seedling' | 'sapling' | 'tree' | 'huge_tree';
export const GROWN_FORMS: GrownForm[] = ['seedling', 'sapling', 'tree', 'huge_tree'];

/**
 * The seed's rarity GUARANTEES a floor form — a legendary seed always sprouts
 * a huge tree (legendary), an epic always a tree, and so on. That's the point:
 * the reward you earned is the reward you get.
 */
export const SEED_FLOOR: Record<SeedRarity, GrownForm> = {
  common: 'seedling',
  rare: 'sapling',
  epic: 'tree',
  legendary: 'huge_tree',
};

/**
 * Growing is a hold-to-water gacha (Brawl Stars Starr-Drop style). Each
 * watering "charge" runs ONE promotion check to the next form. Promotions up
 * to the seed's floor always succeed; promotions ABOVE the floor are a gamble
 * with these odds, and the FIRST failure settles the seed there for good — so
 * you can push a common seed toward legendary, but almost never make it.
 *
 * Per-step odds → cumulative reach-huge-tree from each seed rarity:
 *   common (floor seedling): .45·.26·.12 ≈ 1.4%   (Starr-Drop-legendary rare)
 *   rare   (floor sapling):  .26·.12     ≈ 3.1%
 *   epic   (floor tree):     .12         = 12%
 *   legendary (floor huge):  guaranteed  = 100%
 */
export const PROMOTE_CHANCE: Record<GrownForm, number> = {
  seedling: 1.0, // a seed always sprouts to at least a seedling
  sapling: 0.45,
  tree: 0.26,
  huge_tree: 0.12,
};

/**
 * Charge time (ms of continuous watering) each promotion needs before its
 * check fires. Higher tiers take LONGER — the epic→legendary charge is the
 * longest, to draw out the suspense. Applies to guaranteed and gambled
 * promotions alike.
 */
export const PROMOTE_HOLD_MS: Record<GrownForm, number> = {
  seedling: 900,
  sapling: 1500,
  tree: 2300,
  huge_tree: 3400,
};

/** Growth stages, bare seed first. Index 0 = seed, 1..4 = the four forms. */
export const GROW_STAGES = ['seed', ...GROWN_FORMS] as const;
export type GrowStage = (typeof GROW_STAGES)[number];

/**
 * Loot pools by grown FORM. `rolls` = how many independent draws the form
 * pays out (higher forms pay more, and repeats stack). A roll picks one entry
 * weighted by p. Seed-item entries yield a REAL plant seed of that rarity.
 */
export interface FormLoot {
  rolls: number;
  pool: Array<{ item: string; p: number }>;
}
export const FORM_LOOT: Record<GrownForm, FormLoot> = {
  seedling: {
    rolls: 1,
    pool: [
      { item: 'base_seed', p: 0.55 },
      { item: 'coins_small', p: 0.35 },
      { item: 'common_object', p: 0.10 },
    ],
  },
  sapling: {
    rolls: 1,
    pool: [
      { item: 'uncommon_seed', p: 0.55 },
      { item: 'object', p: 0.25 },
      { item: 'coins_med', p: 0.12 },
      { item: 'cosmetic', p: 0.08 },
    ],
  },
  tree: {
    rolls: 2, // epic form: likelihood of multiple rewards
    pool: [
      { item: 'rare_seed', p: 0.50 },
      { item: 'object', p: 0.22 },
      { item: 'cosmetic', p: 0.16 },
      { item: 'coins_big', p: 0.12 },
    ],
  },
  huge_tree: {
    rolls: 3, // legendary form: high likelihood of multiple rewards
    pool: [
      { item: 'legendary_seed', p: 0.42 },
      { item: 'rare_seed', p: 0.28 },
      { item: 'cosmetic', p: 0.18 },
      { item: 'coins_big', p: 0.12 },
    ],
  },
};

/** Coin bands referenced by the loot pools. */
export const LOOT_COINS = {
  coins_small: { min: 10, max: 25 },
  coins_med: { min: 25, max: 50 },
  coins_big: { min: 60, max: 120 },
} as const;

/** Which seed rarity each source grants. */
export const MAGIC_SEED_BY_EVIDENCE: Record<EvidenceTier, SeedRarity> = {
  1: 'common', // declared
  2: 'common', // photo
  3: 'rare',   // paired capture / timer
  4: 'epic',   // peer confirmed (P1)
};

/** Benchmark bill/label missions grant the top tiers. */
export const MAGIC_SEED_BY_BENCHMARK: Record<keyof typeof BENCHMARK_QUEST_COINS, SeedRarity> = {
  water_under_130L: 'legendary',
  electricity_under_average: 'legendary',
  appliance_4_ticks: 'epic',
  fitting_2_ticks: 'epic',
};

/** First record of a common creature still gifts a starter magic seed. */
export const MAGIC_SEED_BY_FIRST_RECORD: Partial<Record<Rarity, SeedRarity>> = {
  common: 'common',
};

export const PACKAGE_CAPS = {
  maxPerDayFromDailyQuests: 3,
  onePerQuestPerDay: true,
  benchmarkOncePerBillingPeriod: true,
} as const;

/* ═════════════════════════════════════════════════════════════════════════
   MEASUREMENT  — this is what the rubric scores, not the quest count
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * The first submitted bill of each type becomes the player's PERSONAL
 * BASELINE. Every later submission is plotted against it. This converts the
 * quest log from a completion tracker into a measurement instrument for
 * roughly an hour of work, and it is the direct answer to "how would you know
 * whether it worked."
 */
export interface Baseline {
  waterLitresPerPersonPerDay?: number;
  electricityKwhPerMonth?: number;
  flatType?: string;
  capturedAt: number;
}

/** National reference figures. ONE source, cited on screen. */
export const NATIONAL_REFERENCE = {
  source: 'PUB / SP Group published averages, cited on screen',
  waterTargetLitresPerPersonPerDay: 130,   // Green Plan 2030 target
  waterNationalAverage: 141,
  electricityKwhPerMonth: {
    '1-room': 160, '2-room': 230, '3-room': 320,
    '4-room': 325, '5-room': 450, 'executive': 550,
  } as Record<string, number>,
} as const;

/* ═════════════════════════════════════════════════════════════════════════
   VERIFICATION TIERS  — evidence strength scales reward, never gates it
   ═══════════════════════════════════════════════════════════════════════ */

export type EvidenceTier = 1 | 2 | 3 | 4;

export const EVIDENCE_MULTIPLIER: Record<EvidenceTier, number> = {
  /**
   * Designer ruling (2026-08-29): declared-only completions pay HALF the
   * base so honest evidence is always the better deal. Note this halves
   * the ECONOMY.md income table for a declared-only player (~47/day
   * committed instead of ~95) — photo-tier play restores it.
   */
  1: 0.5,   // declared
  2: 1.25,  // single live-camera photo
  3: 1.6,   // paired capture or completed timer
  4: 2.0,   // peer confirmed
};

/* ═════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════ */

export const MAX_NOTIFICATIONS_PER_DAY = 3;
export const WIDGET_CYCLE_MS = 15 * MIN;

/* ═════════════════════════════════════════════════════════════════════════
   BUILD-SESSION ADDITIONS
   Tunables introduced during implementation. Everything below follows the
   same law as everything above: components import these, never inline them.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Tag contribution by growth stage. Scheme §6 only defines mature (full) and
 * dormant (0); partial contribution for younger stages makes cause-and-effect
 * visible in the first session (§19: "be generous at the start").
 */
export const STAGE_TAG_MULTIPLIER = {
  seed: 0,
  sprout: 0.5,
  growing: 0.75,
  mature: 1,
} as const;

/**
 * Shop seed prices (ECONOMY.md sink #2: "Seeds — 20–200 from the shop").
 * Only species flagged `inShop` are purchasable — rare and legendary seeds
 * come ONLY from packages (scheme §4; load-bearing for the pitch).
 */
export const SEED_PRICES: Partial<Record<Rarity, number>> = {
  common: 20,
  uncommon: 70,
};

/** Coins result when a package loot roll lands on 'coins'. */
export const PACKAGE_COINS = { min: 15, max: 40 };

/** Night window (local game time) for night-only creatures and night tags. */
export const NIGHT = { startHour: 19, endHour: 7 };

/**
 * Catch-up safety valve. At TIME_SCALE 1440 a long-closed tab could imply
 * hundreds of thousands of ticks; beyond this cap we fast-forward the tick
 * cursor. Normal play (30-min ticks, days away) never comes near it.
 */
export const MAX_CATCHUP_TICKS = 2000;

/**
 * First-session generosity (§19: fill 4 slots, record 3 creatures inside
 * 10 minutes). For the first hour of a save the spawn tick runs faster.
 */
export const EARLY_SPAWN = { untilMs: 1 * HOUR, tickMs: 5 * MIN };

/**
 * Scheme §7: "an empty garden should feel empty." A creature is only
 * eligible to spawn once the garden has at least one point in a tag it
 * prefers (in addition to any hard requirement).
 */
export const SPAWN_REQUIRES_AFFINITY = true;

/**
 * UI: a plant is "thirsty soon" in the last quarter of its window. Water-all
 * defaults to dormant + thirsty-soon (ECONOMY.md open item: confirmation,
 * never a silent 61-coin tap).
 */
export const WATER_SOON_FRACTION = 0.25;

/** Paired capture (evidence tier 3): two frames, same scene, tight window. */
export const PAIRED_CAPTURE = {
  windowMs: 60_000,
  /**
   * Deliberately lenient — a genuinely dark or glossy frame carries little
   * structure; this is a plausibility check, not a verdict (see chat notes).
   */
  minCorrelation: 0.3,
};

/** dHash duplicate rejection: Hamming distance ≤ this = same photo reused. */
export const DHASH_DUPLICATE_DISTANCE = 10;

/* ═════════════════════════════════════════════════════════════════════════
   OCR VERIFICATION  — Tesseract.js, fully on-device
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Some photo missions can be OCR-verified from the live frame: read the digits
 * inside an aim box and check them. This runs entirely on-device (self-hosted
 * WASM + model in /public/tess) so the "nothing leaves the phone" promise
 * holds. OCR UPGRADES a photo to auto-verified; a miss never blocks — the
 * player can still submit as a declared photo (evidence scales, never gates).
 */
export const OCR = {
  workerPath: '/tess/worker.min.js',
  corePath: '/tess/', // tesseract-core-*.wasm.js live here
  langPath: '/tess/', // <lang>.traineddata.gz
  /** Only these characters are considered — digits + the degree/temp glyphs. */
  charWhitelist: '0123456789.°CF',
  /** Fraction of the frame the aim box covers (centered). */
  aimBox: { w: 0.62, h: 0.4 },
  /**
   * Reject reads below this Tesseract confidence (0–100). Confidence guards
   * only against garbled digits — the 25–32 range rule already rejects any
   * clearly-read out-of-range value (e.g. 18). Seven-segment reads off a phone
   * camera land lower than clean printed digits, so this floor is deliberately
   * modest: high enough to drop a scrambled scan, low enough that a legible 25
   * is accepted.
   */
  minConfidence: 55,
};

/**
 * Which trained model each OCR mission uses. Aircon remotes show SEVEN-SEGMENT
 * digits (the gapped "digital clock" style) which the default `eng` model
 * can't read — those use `ssd_int`, a model trained on seven-segment displays.
 * Efficiency labels are printed, so `eng` is fine.
 */
export const OCR_LANG: Record<string, string> = {
  // Combined: reads both the seven-segment (ssd_int) digits on a remote AND
  // ordinary printed digits (eng) on an LCD or a phone screen.
  aircon_25: 'ssd_int+eng',
  appliance_4_ticks: 'eng',
  fitting_2_ticks: 'eng',
};

/** Missions whose digits are seven-segment — they get gap-bridging dilation. */
export const OCR_SEVEN_SEGMENT: Record<string, boolean> = {
  aircon_25: true,
};

/**
 * Per-mission OCR rule: a regex over the OCR text and a predicate on the first
 * captured number. `null` here means the mission is photo-only (no OCR check).
 */
export interface OcrRule {
  /** Grab the first integer/decimal in the text. */
  extract: RegExp;
  /** Passes when the number satisfies this. */
  ok: (n: number) => boolean;
  hint: string;
}
export const OCR_RULES: Record<string, OcrRule | null> = {
  // aircon must read 25°C or higher
  aircon_25: { extract: /(\d{2})/, ok: (n) => n >= 25 && n <= 32, hint: 'Point at the thermostat — it must read 25°C or higher.' },
  // efficiency labels: tick rating
  appliance_4_ticks: { extract: /(\d)/, ok: (n) => n >= 4, hint: 'Frame the energy label — 4 ticks or more.' },
  fitting_2_ticks: { extract: /(\d)/, ok: (n) => n >= 2, hint: 'Frame the water label — 2 ticks or more.' },
};

/* ═════════════════════════════════════════════════════════════════════════
   SHOWER MISSION  — the 5-minute timer intervention
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * The timer IS the intervention (real-time feedback cut consumption 22% in
 * Tiefenbeck 2018), not a verification gate. Start it, keep a short shower,
 * and the bird bath drains as a kingfisher swims below the countdown.
 * Completing it grants a rare magic seed.
 */
export const SHOWER = {
  durationSec: 5 * 60,
  reward: 'rare' as SeedRarity,
  coins: 40,
  /** Grace: still counts as complete if stopped within this of the end. */
  graceSec: 15,
};

/** Starter kit (§19). Species ids refer to src/config/content.ts. */
export const STARTER = {
  seeds: { grass_tuft: 2, sunflower: 1 } as Record<string, number>,
  /** One mature plant pre-placed so the very first screen shows life. */
  maturePlaced: 'grass_tuft',
};

/** Toast auto-dismiss. */
export const TOAST_MS = 4200;
