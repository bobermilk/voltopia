/**
 * store.ts — zustand store: persisted GameState + transient UI state.
 *
 * Every game mutation goes through pure engine functions and is persisted.
 * The 1 Hz UI tick calls `tick()`, which advances `now` and runs the pure
 * catch-up pass only when it has real work — the interval drives RENDERING,
 * never game state (CLAUDE.md law).
 *
 * Toast icons are sprite ids from src/ui/art.tsx — no platform emoji.
 */
import { create } from 'zustand';
import * as B from '../config/balance';
import { CREATURE_BY_ID, COSMETIC_BY_ID, PLANT_BY_ID, OBJECT_BY_ID } from '../config/content';
import {
  buyExpansion,
  buyObject,
  buySeed,
  clearOvergrown,
  placeFromShelf,
  plantSeed,
  shelveItem,
  unshelvePlantTo,
  type ActionResult,
} from '../engine/actions';
import { catchUp, type CatchUpEvent } from '../engine/catchup';
import { advanced, gameNow, withScale } from '../engine/clock';
import * as dev from '../engine/dev';
import { recordVisitor, type RecordResult } from '../engine/guide';
import { newGame, SAVE_VERSION } from '../engine/newGame';
import { waterAllPlan, waterPlant } from '../engine/plants';
import {
  cancelShower,
  completeDaily,
  finishShower,
  startShower,
  submitElectricityBill,
  submitLabelPhoto,
  submitWaterBill,
  type QuestResult,
} from '../engine/quests';
import { attemptPromote, growMagicSeed, type PromoteResult } from '../engine/magicSeeds';
import type { GameState, GrowResult, MagicSeedInstance } from '../engine/types';
import type { GrownForm, SeedRarity } from '../config/balance';

const SAVE_KEY = 'voltopia-save';

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState & { packages?: unknown[] };
      if (parsed.version === SAVE_VERSION) {
        // Backfill any field a save from an earlier build of this version
        // is missing — otherwise reading e.g. game.magicSeeds.length in a
        // later render crashes the whole app. Every added GameState field
        // MUST have a default here.
        parsed.profile ??= { name: 'Gardener', avatar: 'munchkin_cat', showcase: [] };
        parsed.tutorialDone ??= true;
        // Magic-seed rework: old saves have `packages` but no magicSeeds/shower.
        parsed.magicSeeds ??= [];
        parsed.shower ??= { startedAt: null };
        parsed.ecovoltLinked ??= false;
        delete parsed.packages;
        return parsed;
      }
    }
  } catch {
    // fall through to a fresh save
  }
  return newGame(Date.now(), Math.floor(Math.random() * 2 ** 31));
}

function persist(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage full/unavailable — the game keeps running in memory
  }
}

export interface Toast {
  id: number;
  icon: string; // sprite id
  text: string;
}

export type Placement =
  | { kind: 'seed'; speciesId: string }
  | { kind: 'shelf'; itemId: string; speciesId: string; isPlant: boolean };

export type Panel = 'inventory' | 'magicseeds' | 'guide' | 'quests' | 'shop' | 'social' | 'ecovolt' | null;

/** The grow-a-magic-seed mini-game flow. */
export interface GrowingFlow {
  seed: MagicSeedInstance;
  /** Current grown form (null = still a bare seed). */
  current: GrownForm | null;
  /** No more watering — settled by a failed gamble or maxed at huge tree. */
  locked: boolean;
  /** The last charge's outcome, for a brief success/fail flash in the UI. */
  lastAttempt?: PromoteResult;
  result?: GrowResult; // set once harvested, drives the reveal
}

interface Store {
  game: GameState;
  now: number; // game-time ms, refreshed every UI tick
  toasts: Toast[];
  panel: Panel;
  placement: Placement | null;
  record: RecordResult['recorded'] | null;
  /** The magic seed currently being grown (mini-game), and its outcome. */
  growing: GrowingFlow | null;
  seedBanner: { rarity: SeedRarity; at: number } | null;
  devOpen: boolean;
  /** Water-all confirmation (opened by long-press / shift-click on a plant). */
  waterAllOpen: boolean;
  /** Boot overlay — true until the loading screen finishes. */
  loading: boolean;

  tick: () => void;
  setLoading: (v: boolean) => void;
  /** Dev: wipe the save and rerun the whole boot — loading screen → tutorial. */
  restartGame: () => void;
  toast: (icon: string, text: string) => void;
  dismissToast: (id: number) => void;
  setPanel: (p: Panel) => void;
  startPlacement: (p: Placement) => void;
  cancelPlacement: () => void;
  confirmPlacement: (slotId: string) => void;
  water: (plantId: string) => void;
  waterMany: (plantIds: string[]) => void;
  shelve: (itemId: string) => void;
  record_: (visitorId: string) => void;
  /** Ask a (recorded) visitor to leave — removes it, freeing its slot. */
  dismissVisitor_: (visitorId: string) => void;
  closeRecord: () => void;
  buySeed_: (speciesId: string) => void;
  buyObject_: (speciesId: string) => void;
  clearOvergrown_: (slotId: string) => void;
  buyExpansion_: (slotId: string) => void;
  completeDaily_: (questId: keyof typeof B.DAILY_QUEST_COINS, tier: B.EvidenceTier, hash?: string) => QuestResult;
  submitWater_: (input: { cubicMetres: number; householdSize: number; days: number }, photoHash?: string) => QuestResult;
  submitElectricity_: (input: { kwh: number; flatType: string }, photoHash?: string) => QuestResult;
  submitLabel_: (questId: 'appliance_4_ticks' | 'fitting_2_ticks', hash: string) => QuestResult;
  // magic seeds
  startGrowing: (seedId: string) => void;
  /** Run one watering charge — attempt a promotion; returns the outcome. */
  waterMagicSeed: () => PromoteResult | null;
  /** Harvest the seed at its current form and reveal the loot. */
  harvestSeed: () => void;
  closeGrowing: () => void;
  clearSeedBanner: () => void;
  // shower mission
  startShower_: () => void;
  cancelShower_: () => void;
  finishShower_: () => QuestResult;
  setProfile: (patch: Partial<GameState['profile']>) => void;
  setWaterAllOpen: (open: boolean) => void;
  /** Munchkin-cat intro: mark finished (persisted). */
  finishTutorial: () => void;
  /** Link (or unlink) the EcoVolt utility-data account (persisted). */
  setEcovoltLinked: (linked: boolean) => void;

  toggleDev: () => void;
  devSetScale: (scale: number) => void;
  devAdvanceHours: (h: number) => void;
  devCoins: (n: number) => void;
  devSpawn: (creatureId: string) => void;
  devGrow: () => void;
  devMagicSeed: (rarity: SeedRarity) => void;
  devShowcase_: () => void;
  devAllSeeds_: () => void;
  devReset: () => void;
}

let toastSeq = 1;

export const useStore = create<Store>((set, get) => {
  const initial = load();
  persist(initial);

  /** Commit a new game state: persist + set. */
  const commit = (game: GameState) => {
    persist(game);
    set({ game, now: gameNow(game.clock) });
  };

  const pushToast = (icon: string, text: string) => {
    const t: Toast = { id: toastSeq++, icon, text };
    set((s) => ({ toasts: [...s.toasts.slice(-3), t] }));
    setTimeout(() => get().dismissToast(t.id), B.TOAST_MS);
  };

  /** Watch for a freshly delivered magic seed → Gnome banner. */
  const bannerForNewSeeds = (before: GameState, after: GameState) => {
    if (after.magicSeeds.length > before.magicSeeds.length) {
      const seed = after.magicSeeds[after.magicSeeds.length - 1];
      set({ seedBanner: { rarity: seed.rarity, at: Date.now() } });
    }
  };

  const emitEvents = (events: CatchUpEvent[]) => {
    for (const e of events) {
      switch (e.kind) {
        case 'arrival':
          if (e.live) pushToast('icon_eye', `Something's rustling in the bushes…`);
          break;
        case 'sighting':
          pushToast('icon_sparkle', 'You just missed a visitor — a new clue was left behind.');
          break;
        case 'dormant':
          pushToast('icon_sleep', 'A plant has wilted. Water it!');
          break;
        case 'login_reward':
          pushToast('stage_sprout', `Daily visit — +${e.coins} coins.`);
          break;
        case 'memento':
          pushToast('icon_medal', `${CREATURE_BY_ID[e.creatureId].name} left you a memento — visit ${B.MEMENTO_AT_VISIT}!`);
          break;
      }
    }
  };

  /** Run an engine action, toast on failure, commit on success. */
  const act = (fn: (g: GameState) => ActionResult): boolean => {
    const before = get().game;
    const r = fn(before);
    if (!r.ok) {
      if (r.error) pushToast('icon_block', r.error);
      return false;
    }
    commit(r.state);
    bannerForNewSeeds(before, r.state);
    return true;
  };

  const runCatchUp = () => {
    const { game } = get();
    const now = gameNow(game.clock);
    const r = catchUp(game, now);
    if (r.changed) {
      const before = game;
      commit(r.state);
      bannerForNewSeeds(before, r.state);
      emitEvents(r.events);
    } else {
      set({ now });
    }
  };

  return {
    game: initial,
    now: gameNow(initial.clock),
    toasts: [],
    panel: null,
    placement: null,
    record: null,
    growing: null,
    seedBanner: null,
    devOpen: false,
    waterAllOpen: false,
    loading: true,

    tick: runCatchUp,
    setLoading: (v) => set({ loading: v }),
    restartGame: () => {
      const fresh = newGame(Date.now(), Math.floor(Math.random() * 2 ** 31));
      commit(fresh);
      set({
        panel: null,
        placement: null,
        record: null,
        growing: null,
        seedBanner: null,
        waterAllOpen: false,
        devOpen: false,
        toasts: [],
        loading: true,
      });
    },
    toast: pushToast,
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    setPanel: (panel) => set({ panel, placement: null }),

    startPlacement: (placement) => set({ placement, panel: null }),
    cancelPlacement: () => set({ placement: null }),
    confirmPlacement: (slotId) => {
      const p = get().placement;
      if (!p) return;
      const now = get().now;
      const ok = act((g) =>
        p.kind === 'seed'
          ? plantSeed(g, p.speciesId, slotId, now)
          : p.isPlant
            ? unshelvePlantTo(g, p.itemId, slotId, now)
            : placeFromShelf(g, p.itemId, slotId),
      );
      if (ok) {
        set({ placement: null });
        pushToast('stage_sprout', p.kind === 'seed' ? 'Seed planted — water it to wake it up.' : 'Placed.');
      }
    },

    water: (plantId) => {
      const g = get().game;
      const now = get().now;
      const before = g.coins;
      const next = waterPlant(g, plantId, now);
      if (next === g || next.coins === before) {
        pushToast('icon_coin', 'Not enough coins to water.');
        return;
      }
      commit(next);
    },
    waterMany: (plantIds) => {
      let g = get().game;
      const now = get().now;
      let spent = 0;
      for (const id of plantIds) {
        const next = waterPlant(g, id, now);
        if (next !== g) {
          spent += g.coins - next.coins;
          g = next;
        }
      }
      commit(g);
      pushToast('tag_wet', `Watered ${plantIds.length} plants for ${spent} coins.`);
    },

    shelve: (itemId) => {
      if (act((g) => shelveItem(g, itemId, get().now))) pushToast('icon_bag', 'Moved to the shelf.');
    },

    record_: (visitorId) => {
      const before = get().game;
      const r = recordVisitor(before, visitorId, get().now);
      if (!r.recorded) return;
      commit(r.state);
      bannerForNewSeeds(before, r.state);
      set({ record: r.recorded });
    },
    closeRecord: () => set({ record: null }),
    dismissVisitor_: (visitorId) => {
      const g = get().game;
      if (!g.visitors.some((v) => v.id === visitorId)) return;
      commit({ ...g, visitors: g.visitors.filter((v) => v.id !== visitorId) });
    },

    buySeed_: (id) => {
      if (act((g) => buySeed(g, id))) pushToast('stage_seed', `${PLANT_BY_ID[id].name} seed — plant it from the Inventory.`);
    },
    buyObject_: (id) => {
      if (act((g) => buyObject(g, id))) pushToast('icon_bag', `${OBJECT_BY_ID[id].name} is on your shelf.`);
    },
    clearOvergrown_: (slotId) => {
      if (act((g) => clearOvergrown(g, slotId))) pushToast('icon_scissors', 'Bramble cleared! A new spot opens up.');
    },
    buyExpansion_: (slotId) => {
      if (act((g) => buyExpansion(g, slotId))) pushToast('icon_leaf', 'New ground claimed.');
    },

    completeDaily_: (questId, tier, hash) => {
      const before = get().game;
      const r = completeDaily(before, questId, tier, get().now, hash);
      if (r.ok) {
        commit(r.state);
        bannerForNewSeeds(before, r.state);
        pushToast('icon_check', `+${r.coins} coins${r.seedRarity ? ' — the Gnome left a magic seed!' : ''}`);
      } else if (r.error) {
        pushToast('icon_block', r.error);
      }
      return r;
    },
    submitWater_: (input, photoHash) => {
      const before = get().game;
      const r = submitWaterBill(before, input, get().now, photoHash);
      if (r.ok) {
        commit(r.state);
        bannerForNewSeeds(before, r.state);
      } else if (r.error) pushToast('icon_block', r.error);
      return r;
    },
    submitElectricity_: (input, photoHash) => {
      const before = get().game;
      const r = submitElectricityBill(before, input, get().now, photoHash);
      if (r.ok) {
        commit(r.state);
        bannerForNewSeeds(before, r.state);
      } else if (r.error) pushToast('icon_block', r.error);
      return r;
    },
    submitLabel_: (questId, hash) => {
      const before = get().game;
      const r = submitLabelPhoto(before, questId, hash, get().now);
      if (r.ok) {
        commit(r.state);
        bannerForNewSeeds(before, r.state);
      } else if (r.error) pushToast('icon_block', r.error);
      return r;
    },

    startGrowing: (seedId) => {
      const seed = get().game.magicSeeds.find((s) => s.id === seedId);
      if (!seed) return;
      // The seed skips straight to its guaranteed floor form (rare → sapling,
      // legendary → huge tree). Everything above the floor is a gamble.
      const floor = B.SEED_FLOOR[seed.rarity];
      const locked = floor === 'huge_tree'; // legendary is already maxed
      set({ growing: { seed, current: floor, locked }, seedBanner: null });
    },
    waterMagicSeed: () => {
      const flow = get().growing;
      if (!flow || flow.locked || flow.result) return null;
      const res = attemptPromote(get().game, flow.seed.id, flow.current);
      commit(res.state); // persists the RNG advance on a gamble
      set({
        growing: { ...flow, current: res.form, locked: res.locked, lastAttempt: res },
      });
      return res;
    },
    harvestSeed: () => {
      const flow = get().growing;
      if (!flow || flow.result || flow.current === null) return;
      const { state, result } = growMagicSeed(get().game, flow.seed.id, flow.current);
      if (!result) return;
      commit(state);
      set({ growing: { ...flow, result } });
    },
    closeGrowing: () => set({ growing: null }),
    clearSeedBanner: () => set({ seedBanner: null }),

    startShower_: () => {
      commit(startShower(get().game, get().now));
      pushToast('icon_shower', 'Shower timer started — keep it short!');
    },
    cancelShower_: () => commit(cancelShower(get().game)),
    finishShower_: () => {
      const before = get().game;
      const r = finishShower(before, get().now);
      if (r.ok) {
        commit(r.state);
        bannerForNewSeeds(before, r.state);
        pushToast('icon_check', `Nice and quick — +${r.coins} coins & a rare magic seed!`);
      } else if (r.error) {
        commit(r.state);
        pushToast('icon_block', r.error);
      }
      return r;
    },
    setProfile: (patch) => {
      const g = get().game;
      commit({ ...g, profile: { ...g.profile, ...patch } });
    },
    setWaterAllOpen: (open) => set({ waterAllOpen: open }),
    finishTutorial: () => {
      const g = get().game;
      if (!g.tutorialDone) commit({ ...g, tutorialDone: true });
    },
    setEcovoltLinked: (linked) => {
      const g = get().game;
      if (g.ecovoltLinked !== linked) commit({ ...g, ecovoltLinked: linked });
    },

    toggleDev: () => set((s) => ({ devOpen: !s.devOpen })),
    devSetScale: (scale) => {
      const g = get().game;
      B.setTimeScale(scale);
      commit({ ...g, clock: withScale(g.clock, scale) });
      pushToast('icon_fast', `Time ×${scale}`);
      runCatchUp();
    },
    devAdvanceHours: (h) => {
      const g = get().game;
      commit({ ...g, clock: advanced(g.clock, h * B.HOUR) });
      runCatchUp();
      pushToast('icon_clock', `+${h}h`);
    },
    devCoins: (n) => commit(dev.devGrantCoins(get().game, n)),
    devSpawn: (creatureId) => {
      commit(dev.devForceSpawn(get().game, creatureId, get().now));
      pushToast('icon_sparkle', `${CREATURE_BY_ID[creatureId].name} appears.`);
    },
    devGrow: () => {
      commit(dev.devInstantGrow(get().game, get().now));
      pushToast('tag_tall', 'All plants mature.');
    },
    devMagicSeed: (rarity) => {
      const before = get().game;
      const after = dev.devGrantMagicSeed(before, rarity, get().now);
      commit(after);
      bannerForNewSeeds(before, after);
    },
    devShowcase_: () => {
      commit(dev.devShowcase(get().game, get().now));
      pushToast('icon_tree_menu', 'Showcase garden loaded.');
    },
    devAllSeeds_: () => {
      commit(dev.devAllSeeds(get().game));
      pushToast('stage_seed', 'One of every seed.');
    },
    devReset: () => {
      get().restartGame();
    },
  };
});

/* ── Derived helpers used across the UI ── */

export function useWaterAllPlan(onlyThirsty: boolean) {
  const game = useStore((s) => s.game);
  const now = useStore((s) => s.now);
  return waterAllPlan(game, now, onlyThirsty);
}

export { COSMETIC_BY_ID };
