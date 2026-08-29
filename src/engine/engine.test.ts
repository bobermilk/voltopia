/**
 * Engine tests — the rules that must never drift:
 * economy figures pinned to ECONOMY.md, the never-tick catch-up pass,
 * the two-stage spawn roll, the shelving freeze, growth min-gaps.
 */
import { describe, expect, it } from 'vitest';
import { DAY_MS, base, matureAt, objectAt } from './testUtils';
import { HOUR, WATER, EVIDENCE_MULTIPLIER, OVERGROWN_PRICES, EXPANSION_SLOT_COST } from '../config/balance';
import { gameNow, withScale } from './clock';
import { catchUp } from './catchup';
import { waterPlant, isDormant, canShelve, waterAllPlan } from './plants';
import { computeGardenTags } from './tags';
import {
  buyExpansion,
  buyObject,
  buySeed,
  clearOvergrown,
  nextOvergrownPrice,
  plantSeed,
  shelveItem,
  unshelvePlantTo,
} from './actions';
import { recordVisitor } from './guide';
import { completeDaily, finishShower, startShower, submitElectricityBill, submitWaterBill } from './quests';
import { attemptPromote, growMagicSeed } from './magicSeeds';
import { SHOWER, SEED_FLOOR } from '../config/balance';
import { correlation, dHash, hammingHex } from '../capture/verification';

const T0 = new Date(2026, 7, 1, 10, 0, 0).getTime(); // 10:00 local, daytime

describe('clock', () => {
  it('scales game time and stays continuous across re-anchoring', () => {
    const c1 = { anchorReal: 1000, anchorGame: 1000, scale: 1 };
    expect(gameNow(c1, 61_000)).toBe(61_000);
    const c2 = withScale(c1, 1440, 61_000);
    expect(gameNow(c2, 61_000)).toBe(61_000); // no jump at the switch
    expect(gameNow(c2, 61_000 + 60_000)).toBe(61_000 + 60_000 * 1440); // 1 real min = 1 game day
  });
});

describe('economy — pinned to ECONOMY.md', () => {
  it('upkeep per day matches the solved table (0.3 / 1.5 / 5.3 / 20.0)', () => {
    const perDay = (r: keyof typeof WATER) => WATER[r].cost / (WATER[r].thirstMs / DAY_MS);
    expect(perDay('common')).toBeCloseTo(0.33, 1);
    expect(perDay('uncommon')).toBeCloseTo(1.5, 1);
    expect(perDay('rare')).toBeCloseTo(5.33, 1);
    expect(perDay('legendary')).toBeCloseTo(20.0, 1);
  });

  it('no thirst window is under 24 h (the design law)', () => {
    for (const { thirstMs } of Object.values(WATER)) expect(thirstMs).toBeGreaterThanOrEqual(24 * HOUR);
  });
});

describe('growth — min gap cannot be rushed', () => {
  it('legendary takes 12 growth waterings, 24h apart, seed → mature', () => {
    let s = base(T0);
    s.coins = 1000; // 12 legendary waterings cost 240 — more than starting coins
    s.seeds.rain_tree = 1;
    s = plantSeed(s, 'rain_tree', 'soil_2', T0).state;
    const id = Object.values(s.plants).find((p) => p.speciesId === 'rain_tree')!.id;

    // Spamming water immediately after the first watering does nothing.
    s = waterPlant(s, id, T0);
    expect(s.plants[id].wateringsThisStage).toBe(1);
    s = waterPlant(s, id, T0 + 1 * HOUR);
    expect(s.plants[id].wateringsThisStage).toBe(1); // gap not met — no progress

    // 24h cadence: 11 more growth waterings finish it.
    let t = T0;
    for (let i = 0; i < 11; i++) {
      t += 24 * HOUR;
      s = waterPlant(s, id, t);
    }
    expect(s.plants[id].stage).toBe('mature');
    expect(t - T0).toBe(11 * 24 * HOUR); // ~12 days seed to mature, as designed
  });

  it('common: 3 waterings 4h apart reach mature', () => {
    let s = base(T0);
    s.seeds.grass_tuft = 1;
    s = plantSeed(s, 'grass_tuft', 'soil_2', T0).state;
    const id = Object.values(s.plants).find((p) => p.location === 'soil_2')!.id;
    s = waterPlant(s, id, T0);
    s = waterPlant(s, id, T0 + 4 * HOUR);
    s = waterPlant(s, id, T0 + 8 * HOUR);
    expect(s.plants[id].stage).toBe('mature');
  });
});

describe('dormancy — derived, recoverable, never fatal', () => {
  it('a mature common goes dormant after 72h and one watering restores it', () => {
    let s = base(T0);
    const id = matureAt(s, 'grass_tuft', 'soil_2', T0);
    expect(isDormant(s.plants[id], T0 + 71 * HOUR)).toBe(false);
    expect(isDormant(s.plants[id], T0 + 73 * HOUR)).toBe(true);
    const coinsBefore = s.coins;
    s = waterPlant(s, id, T0 + 100 * HOUR);
    expect(isDormant(s.plants[id], T0 + 100 * HOUR)).toBe(false);
    expect(s.coins).toBe(coinsBefore - WATER.common.cost);
  });

  it('dormant plants contribute 0 tags', () => {
    const s = base(T0);
    matureAt(s, 'sunflower', 'soil_2', T0);
    expect(computeGardenTags(s, T0 + 1 * HOUR).Bright).toBeGreaterThan(0);
    expect(computeGardenTags(s, T0 + 80 * HOUR).Bright).toBe(0);
  });
});

describe('shelving — the freeze ruling', () => {
  it('only mature + healthy plants shelve; shelf time never counts', () => {
    let s = base(T0);
    const id = matureAt(s, 'lavender', 'soil_2', T0);
    expect(canShelve(s.plants[id], T0 + 1 * HOUR).ok).toBe(true);
    expect(canShelve(s.plants[id], T0 + 80 * HOUR).ok).toBe(false); // dormant (48h window)

    s = shelveItem(s, id, T0 + 1 * HOUR).state;
    // 100 days on the shelf — still healthy, still mature, contributes 0 tags.
    const later = T0 + 100 * DAY_MS;
    expect(isDormant(s.plants[id], later)).toBe(false);
    expect(computeGardenTags(s, later).Fragrant).toBe(0);
    const un = unshelvePlantTo(s, id, 'soil_3', later);
    expect(un.ok).toBe(true);
    expect(un.state.plants[id].stage).toBe('mature');
    expect(isDormant(un.state.plants[id], later + 1 * HOUR)).toBe(false);
  });

  it('growing plants cannot be shelved', () => {
    let s = base(T0);
    s.seeds.fern = 1;
    s = plantSeed(s, 'fern', 'soil_2', T0).state;
    const id = Object.values(s.plants).find((p) => p.location === 'soil_2')!.id;
    s = waterPlant(s, id, T0);
    expect(canShelve(s.plants[id], T0).ok).toBe(false);
    expect(shelveItem(s, id, T0).ok).toBe(false);
  });
});

describe('catch-up pass — the only way time moves', () => {
  it('is deterministic: same (state, now) → identical result', () => {
    const s = base(T0);
    matureAt(s, 'sunflower', 'soil_2', T0);
    matureAt(s, 'lavender', 'soil_3', T0);
    const a = catchUp(s, T0 + 2 * DAY_MS);
    const b = catchUp(s, T0 + 2 * DAY_MS);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('is idempotent: running again at the same now changes nothing', () => {
    const s = base(T0);
    matureAt(s, 'sunflower', 'soil_2', T0);
    const once = catchUp(s, T0 + 1 * DAY_MS).state;
    const twice = catchUp(once, T0 + 1 * DAY_MS);
    expect(twice.events).toHaveLength(0);
    expect(JSON.stringify(twice.state)).toBe(JSON.stringify(once));
  });

  it('an empty garden spawns nothing at all', () => {
    const s = base(T0);
    s.plants = {}; // remove even the starter plant
    const { state } = catchUp(s, T0 + 7 * DAY_MS);
    expect(state.visitors).toHaveLength(0);
    expect(Object.keys(state.guide)).toHaveLength(0);
  });

  it('spawns only creatures with affinity to the garden tags', () => {
    const s = base(T0); // starter grass only → Bright 1
    const { state } = catchUp(s, T0 + 10 * DAY_MS);
    const seen = new Set([
      ...state.visitors.map((v) => v.creatureId),
      ...Object.keys(state.guide),
    ]);
    // The Bright-lovers: sparrow, honeybee, and (after dark) the moth.
    for (const id of seen) expect(['sparrow', 'honeybee', 'moth']).toContain(id);
  });

  it('leaves still-in-window visitors live and tappable after catch-up', () => {
    const s = base(T0);
    matureAt(s, 'sunflower', 'soil_2', T0);
    const now = T0 + 3 * DAY_MS;
    const { state } = catchUp(s, now);
    for (const v of state.visitors) expect(v.departsAt).toBeGreaterThan(now);
  });

  it('unseen departures become Sightings with one clue revealed at a time', () => {
    const s = base(T0);
    matureAt(s, 'sunflower', 'soil_2', T0);
    const { state } = catchUp(s, T0 + 20 * DAY_MS);
    const sighted = Object.values(state.guide).filter((g) => g.state === 'sighted');
    expect(sighted.length).toBeGreaterThan(0);
    for (const g of sighted) {
      expect(g.cluesRevealed).toBeGreaterThan(0);
      expect(g.cluesRevealed).toBeLessThanOrEqual(g.sightings);
    }
  });

  it('credits the daily login exactly once per game day', () => {
    const s = base(T0);
    const day1 = catchUp(s, T0 + 1 * HOUR).state;
    const day1b = catchUp(day1, T0 + 2 * HOUR).state;
    expect(day1b.coins).toBe(day1.coins);
    const day2 = catchUp(day1b, T0 + 26 * HOUR).state;
    expect(day2.coins).toBe(day1.coins + 10);
  });
});

describe('two-stage spawn — hard requirements are hard', () => {
  it('the Otter NEVER appears below Wet 10, and does appear at Wet 12', () => {
    // Wet 9: 2 lilies + fern (4+4+1). Below threshold — never, regardless of luck.
    const low = base(T0);
    matureAt(low, 'water_lily', 'water_1', T0);
    matureAt(low, 'water_lily', 'water_2', T0);
    matureAt(low, 'fern', 'water_3', T0);
    // keep them watered by re-watering via direct stamp each catch-up window
    let s = low;
    for (let d = 1; d <= 60; d++) {
      for (const p of Object.values(s.plants)) {
        p.lastWateredAt = T0 + d * DAY_MS; // museum keeper: no dormancy in this test
      }
      s = catchUp(s, T0 + d * DAY_MS).state;
    }
    expect(s.guide.otter).toBeUndefined();
    expect(s.visitors.every((v) => v.creatureId !== 'otter')).toBe(true);

    // Wet 13 (ECONOMY.md rare path): 2 lilies + bird bath + 2 ferns.
    const high = base(T0);
    matureAt(high, 'water_lily', 'water_1', T0);
    matureAt(high, 'water_lily', 'water_2', T0);
    objectAt(high, 'bird_bath', 'soil_2');
    matureAt(high, 'fern', 'soil_3', T0);
    matureAt(high, 'fern', 'water_3', T0);
    let h = high;
    let otterSeen = false;
    for (let d = 1; d <= 60 && !otterSeen; d++) {
      for (const p of Object.values(h.plants)) p.lastWateredAt = T0 + d * DAY_MS;
      h = catchUp(h, T0 + d * DAY_MS).state;
      otterSeen = h.guide.otter !== undefined || h.visitors.some((v) => v.creatureId === 'otter');
    }
    expect(otterSeen).toBe(true); // ~1 per 8 days once the requirement is met
  });

  it('night-only creatures only arrive at night', () => {
    const s = base(T0);
    matureAt(s, 'lavender', 'soil_2', T0);
    objectAt(s, 'stone_lantern', 'pave_1');
    let cur = s;
    const mothArrivals: number[] = [];
    for (let d = 1; d <= 30; d++) {
      for (const p of Object.values(cur.plants)) p.lastWateredAt = T0 + d * DAY_MS;
      const r = catchUp(cur, T0 + d * DAY_MS);
      cur = r.state;
      for (const v of cur.visitors) if (v.creatureId === 'moth') mothArrivals.push(v.arrivedAt);
    }
    for (const at of mothArrivals) {
      const h = new Date(at).getHours();
      expect(h >= 19 || h < 7).toBe(true);
    }
  });
});

describe('recording & first-record rewards', () => {
  it('recording pays the rarity bonus and commons summon the Postman', () => {
    let s = base(T0);
    matureAt(s, 'sunflower', 'soil_2', T0);
    let cur = catchUp(s, T0 + 2 * DAY_MS).state;
    // find a live visitor; keep advancing until one is present
    let day = 2;
    while (cur.visitors.length === 0 && day < 30) {
      day++;
      for (const p of Object.values(cur.plants)) p.lastWateredAt = T0 + day * DAY_MS;
      cur = catchUp(cur, T0 + day * DAY_MS).state;
    }
    expect(cur.visitors.length).toBeGreaterThan(0);
    const v = cur.visitors[0];
    const coinsBefore = cur.coins;
    const seedsBefore = cur.magicSeeds.length;
    const res = recordVisitor(cur, v.id, T0 + day * DAY_MS);
    expect(res.recorded?.firstRecord).toBe(true);
    expect(res.state.coins).toBe(coinsBefore + 50); // common first-record bonus
    expect(res.state.magicSeeds.length).toBe(seedsBefore + 1); // the Gnome's seed
    expect(res.state.magicSeeds.at(-1)?.rarity).toBe('common');
    expect(res.state.guide[v.creatureId].state).toBe('recorded');
  });
});

describe('quests — evidence scales, never gates', () => {
  it('daily quest pays base × evidence multiplier and grants the right seed rarity', () => {
    const s = base(T0);
    const r = completeDaily(s, 'aircon_25', 3, T0);
    expect(r.ok).toBe(true);
    expect(r.coins).toBe(Math.round(25 * EVIDENCE_MULTIPLIER[3]));
    expect(r.seedRarity).toBe('rare'); // paired capture → rare magic seed
    expect(r.state.magicSeeds.at(-1)?.rarity).toBe('rare');
    const again = completeDaily(r.state, 'aircon_25', 1, T0 + 1 * HOUR);
    expect(again.ok).toBe(false); // once per day
  });

  it('caps daily-quest magic seeds at 3/day but still pays coins', () => {
    let s = base(T0);
    s = completeDaily(s, 'aircon_25', 1, T0).state;
    s = completeDaily(s, 'fans_not_aircon', 1, T0).state;
    s = completeDaily(s, 'sockets_off', 1, T0).state;
    expect(s.magicSeeds).toHaveLength(3);
    const r4 = completeDaily(s, 'green_transport', 1, T0);
    expect(r4.ok).toBe(true);
    expect(r4.coins).toBe(Math.round(30 * EVIDENCE_MULTIPLIER[1])); // declared pays half
    expect(r4.state.magicSeeds).toHaveLength(3); // capped
  });

  it('water bill: first submission becomes the baseline; meeting 130L grants a legendary seed', () => {
    const s = base(T0);
    const r = submitWaterBill(s, { cubicMetres: 4.2, householdSize: 2, days: 30 }, T0);
    expect(r.ok).toBe(true);
    expect(r.met).toBe(true); // 70 L/person/day
    expect(r.state.baseline?.waterLitresPerPersonPerDay).toBe(70);
    expect(r.state.magicSeeds.at(-1)?.rarity).toBe('legendary');
    expect(r.state.coins).toBe(s.coins + 300);
    const again = submitWaterBill(r.state, { cubicMetres: 4, householdSize: 2, days: 30 }, T0 + 1 * DAY_MS);
    expect(again.ok).toBe(false); // once per billing period
  });

  it('bill photo upload: the fingerprint is stored, and a reused bill photo is rejected', () => {
    const s = base(T0);
    // A submission with an attached bill-photo hash stores that fingerprint.
    const r = submitWaterBill(s, { cubicMetres: 4.2, householdSize: 2, days: 30 }, T0, 'abc123');
    expect(r.ok).toBe(true);
    expect(r.state.photoHashes).toContain('abc123');
    // Next period, the SAME photo is rejected as a duplicate (no double-dipping).
    const reuse = submitWaterBill(r.state, { cubicMetres: 4, householdSize: 2, days: 30 }, T0 + 40 * DAY_MS, 'abc123');
    expect(reuse.ok).toBe(false);
    // A submission with no photo still works (upload is optional).
    const noPhoto = submitElectricityBill(s, { kwh: 500, flatType: '4-room' }, T0);
    expect(noPhoto.ok).toBe(true);
    expect(noPhoto.state.photoHashes).toHaveLength(0);
  });

  it('electricity bill over the flat-type average records but does not pay', () => {
    const s = base(T0);
    const r = submitElectricityBill(s, { kwh: 500, flatType: '4-room' }, T0);
    expect(r.ok).toBe(true);
    expect(r.met).toBe(false);
    expect(r.state.coins).toBe(s.coins);
    expect(r.state.magicSeeds).toHaveLength(0); // no seed when the benchmark isn't met
    expect(r.state.baseline?.electricityKwhPerMonth).toBe(500); // baseline still captured
    expect(r.state.quests.benchmarks.electricity_under_average?.submissions).toHaveLength(1);
  });
});

describe('magic seeds', () => {
  it('harvest pays that form\'s loot: huge tree pays several, seedling pays one', () => {
    let s = base(T0);
    s = submitWaterBill(s, { cubicMetres: 4, householdSize: 2, days: 30 }, T0).state;
    const seed = s.magicSeeds.at(-1)!;
    expect(seed.rarity).toBe('legendary');
    const huge = growMagicSeed(s, seed.id, 'huge_tree');
    expect(huge.result!.form).toBe('huge_tree');
    expect(huge.result!.rewards.length).toBeGreaterThan(1); // FORM_LOOT huge = 3 rolls
    expect(huge.state.magicSeeds).toHaveLength(0); // consumed

    const one = growMagicSeed(s, seed.id, 'seedling');
    expect(one.result!.rewards).toHaveLength(1);
  });

  it('promotions up to the seed floor are GUARANTEED (legendary → huge tree every time)', () => {
    let s = base(T0);
    s = submitWaterBill(s, { cubicMetres: 4, householdSize: 2, days: 30 }, T0).state; // legendary
    const seed = s.magicSeeds.at(-1)!;
    expect(SEED_FLOOR[seed.rarity]).toBe('huge_tree');
    // Walk seed → seedling → sapling → tree → huge, all guaranteed.
    let form: 'seedling' | 'sapling' | 'tree' | 'huge_tree' | null = null;
    for (const expected of ['seedling', 'sapling', 'tree', 'huge_tree'] as const) {
      const res = attemptPromote(s, seed.id, form);
      expect(res.guaranteed).toBe(true);
      expect(res.promoted).toBe(true);
      expect(res.form).toBe(expected);
      s = res.state;
      form = res.form as typeof form;
    }
    // At huge tree, no further promotion.
    const capped = attemptPromote(s, seed.id, 'huge_tree');
    expect(capped.locked).toBe(true);
    expect(capped.promoted).toBe(false);
  });

  it('a common seed reaches its seedling floor for free, then GAMBLES above it', () => {
    let s = base(T0);
    s = completeDaily(s, 'aircon_25', 1, T0).state; // common seed → floor seedling
    const seed = s.magicSeeds.at(-1)!;
    expect(SEED_FLOOR[seed.rarity]).toBe('seedling');
    // seed → seedling is guaranteed (within floor).
    const toSeedling = attemptPromote(s, seed.id, null);
    expect(toSeedling.guaranteed).toBe(true);
    expect(toSeedling.form).toBe('seedling');
    // seedling → sapling is a gamble (above floor): it advances the RNG.
    const gamble = attemptPromote(toSeedling.state, seed.id, 'seedling');
    expect(gamble.guaranteed).toBe(false);
    expect(gamble.chance).toBeLessThan(1);
    expect(gamble.state.rng.counter).toBe(toSeedling.state.rng.counter + 1);
    // Whatever the roll, the form only stays or advances, never drops.
    expect(['seedling', 'sapling']).toContain(gamble.form);
    if (!gamble.promoted) expect(gamble.locked).toBe(true); // a fail settles it
  });
});

describe('five-minute shower', () => {
  it('completes only when the timer runs to the end, granting a rare seed', () => {
    let s = base(T0);
    s = startShower(s, T0);
    expect(s.shower.startedAt).toBe(T0);
    // Stopping early fails.
    const early = finishShower(s, T0 + 60_000);
    expect(early.ok).toBe(false);
    expect(early.state.shower.startedAt).toBeNull();
    // Running the full duration succeeds.
    s = startShower(s, T0);
    const done = finishShower(s, T0 + SHOWER.durationSec * 1000);
    expect(done.ok).toBe(true);
    expect(done.coins).toBe(SHOWER.coins);
    expect(done.state.magicSeeds.at(-1)?.rarity).toBe('rare');
    // Once per day.
    const again = startShower(done.state, T0 + SHOWER.durationSec * 1000 + 1000);
    const againDone = finishShower(again, T0 + 2 * SHOWER.durationSec * 1000);
    expect(againDone.ok).toBe(false);
  });
});

describe('slots & shop', () => {
  it('placement respects slot type and occupancy', () => {
    let s = base(T0);
    s.seeds.water_lily = 1;
    expect(plantSeed(s, 'water_lily', 'soil_2', T0).ok).toBe(false); // lily needs water's edge
    const ok = plantSeed(s, 'water_lily', 'water_1', T0);
    expect(ok.ok).toBe(true);
    s = ok.state;
    s.seeds.fern = 1;
    expect(plantSeed(s, 'fern', 'water_1', T0).ok).toBe(false); // occupied
    expect(plantSeed(s, 'fern', 'water_2', T0).ok).toBe(false); // overgrown
  });

  it('overgrown prices climb the ladder regardless of expansions', () => {
    let s = base(T0);
    s.coins = 5000;
    expect(nextOvergrownPrice(s)).toBe(OVERGROWN_PRICES[0]);
    s = clearOvergrown(s, 'soil_5').state;
    expect(nextOvergrownPrice(s)).toBe(OVERGROWN_PRICES[1]);
    s = buyExpansion(s, 'xsoil_1').state; // 500-coin designated area
    expect(s.coins).toBe(5000 - OVERGROWN_PRICES[0] - EXPANSION_SLOT_COST);
    expect(nextOvergrownPrice(s)).toBe(OVERGROWN_PRICES[1]); // ladder unaffected
  });

  it('expansion caps per type hold', () => {
    let s = base(T0);
    s.coins = 5000;
    s = buyExpansion(s, 'xwater_1').state;
    s = buyExpansion(s, 'xwater_2').state;
    expect(s.expansionsBought.water_edge).toBe(2);
    // no third water-edge expansion area exists; soil cap is 1:
    s = buyExpansion(s, 'xsoil_1').state;
    expect(buyExpansion(s, 'xsoil_1').ok).toBe(false); // already open
  });

  it('rare seeds are not purchasable — packages only', () => {
    const s = base(T0);
    expect(buySeed(s, 'water_lily').ok).toBe(false);
    expect(buySeed(s, 'grass_tuft').ok).toBe(true);
    expect(buyObject(s, 'bird_bath').ok).toBe(true);
  });
});

describe('water-all plan', () => {
  it('defaults to only-what-is-thirsty and sums the real cost', () => {
    const s = base(T0);
    matureAt(s, 'water_lily', 'water_1', T0); // rare: 36h window
    matureAt(s, 'sunflower', 'soil_2', T0); // common: 72h window
    const at40h = waterAllPlan(s, T0 + 40 * HOUR, true);
    // lily (dormant at 40h) + starter grass? grass watered at T0, 72h window → not thirsty at 40h
    expect(at40h.plantIds).toHaveLength(1);
    expect(at40h.total).toBe(WATER.rare.cost);
  });
});

describe('verification math', () => {
  it('dHash is stable and Hamming distance separates different scenes', () => {
    const grad = Array.from({ length: 72 }, (_, i) => (i % 9) * 10);
    const same = dHash(grad);
    expect(dHash(grad)).toBe(same);
    expect(hammingHex(same, same)).toBe(0);
    const reversed = Array.from({ length: 72 }, (_, i) => 80 - (i % 9) * 10);
    expect(hammingHex(same, dHash(reversed))).toBeGreaterThan(20);
  });

  it('correlation: identical → 1, inverted → -1', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    const b = a.map((v) => 9 - v);
    expect(correlation(a, a)).toBeCloseTo(1, 5);
    expect(correlation(a, b)).toBeCloseTo(-1, 5);
  });
});
