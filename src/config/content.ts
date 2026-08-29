/**
 * content.ts — VOLTOPIA
 * ---------------------------------------------------------------------------
 * The content catalog: plants, objects, creatures, slots, quests, traders,
 * cosmetics. Structure and figures come from docs/SCHEME-v4.md §18 and
 * docs/ECONOMY.md §2 (slot layout verified against every hard requirement).
 *
 * Art note: every species id doubles as its sprite id in src/ui/art.tsx —
 * hand-drawn cartoony vectors, never platform emoji. Scene coordinates are
 * PORTRAIT (phone format), viewBox 1000 × 1600.
 * ---------------------------------------------------------------------------
 */

import type { EvidenceTier, GrownForm, Rarity, SeedRarity, SlotType } from './balance';

export const TAGS = [
  'Bright',
  'Fragrant',
  'Shady',
  'Fruiting',
  'Wet',
  'Tall',
  'Cosy',
] as const;
export type Tag = (typeof TAGS)[number];

export type TagValues = Partial<Record<Tag, number>>;

export const TAG_ICON: Record<Tag, string> = {
  Bright: 'tag_bright',
  Fragrant: 'tag_fragrant',
  Shady: 'tag_shady',
  Fruiting: 'tag_fruiting',
  Wet: 'tag_wet',
  Tall: 'tag_tall',
  Cosy: 'tag_cosy',
};

/* ═══════════════════════════════════════════════════════════════════════
   PLANTS — scheme §18, 10 species
   ═══════════════════════════════════════════════════════════════════════ */

export interface PlantSpecies {
  id: string;
  name: string;
  tags: TagValues;
  rarity: Rarity;
  slotTypes: SlotType[];
  inShop: boolean; // rare+ seeds come ONLY from packages
  blurb: string;
}

export const PLANTS: PlantSpecies[] = [
  { id: 'grass_tuft', name: 'Grass Tuft', tags: { Bright: 1 }, rarity: 'common', slotTypes: ['soil'], inShop: true, blurb: 'Humble, cheerful, and impossible to discourage.' },
  { id: 'sunflower', name: 'Sunflower', tags: { Bright: 3, Tall: 2 }, rarity: 'common', slotTypes: ['soil'], inShop: true, blurb: 'Follows the sun across the sky all day, then forgets where it was.' },
  { id: 'lavender', name: 'Lavender', tags: { Fragrant: 3, Bright: 1 }, rarity: 'uncommon', slotTypes: ['soil', 'elevated'], inShop: true, blurb: 'The whole garden smells like an afternoon nap.' },
  { id: 'fern', name: 'Fern', tags: { Shady: 3, Wet: 1 }, rarity: 'uncommon', slotTypes: ['soil', 'water_edge'], inShop: true, blurb: 'Unfurls one frond at a time, like it has all the time in the world.' },
  { id: 'mint_patch', name: 'Mint Patch', tags: { Fragrant: 2, Cosy: 1 }, rarity: 'uncommon', slotTypes: ['soil', 'elevated'], inShop: false, blurb: 'Give it a corner and it will politely take the whole bed.' },
  { id: 'berry_bush', name: 'Berry Bush', tags: { Fruiting: 3, Shady: 1 }, rarity: 'rare', slotTypes: ['soil'], inShop: false, blurb: 'The birds found it before you did. They always do.' },
  { id: 'water_lily', name: 'Water Lily', tags: { Wet: 4 }, rarity: 'rare', slotTypes: ['water_edge'], inShop: false, blurb: 'Sits on the pond like it invented stillness.' },
  { id: 'frangipani', name: 'Frangipani', tags: { Fragrant: 4, Tall: 2 }, rarity: 'rare', slotTypes: ['soil'], inShop: false, blurb: 'Drops perfect blossoms on the path, showing off.' },
  { id: 'night_jasmine', name: 'Night Jasmine', tags: { Fragrant: 5, Cosy: 2 }, rarity: 'legendary', slotTypes: ['soil', 'elevated'], inShop: false, blurb: 'Saves its scent for after dark, when it thinks nobody is around.' },
  { id: 'rain_tree', name: 'Rain Tree Sapling', tags: { Tall: 5, Shady: 3 }, rarity: 'legendary', slotTypes: ['soil'], inShop: false, blurb: 'One day this will shade the whole street. Today it needs you.' },
];

/** Sprite ids for pre-mature stages ('growing' renders the species art small). */
export const STAGE_ART = { seed: 'stage_seed', sprout: 'stage_sprout' } as const;

/* ═══════════════════════════════════════════════════════════════════════
   OBJECTS — scheme §18, 5 pieces. No upkeep, never wilt.
   ═══════════════════════════════════════════════════════════════════════ */

export type CreatureCategory = 'bird' | 'feline' | 'moth' | 'insect' | 'mammal';

export interface ObjectSpecies {
  id: string;
  name: string;
  tags: TagValues;
  /** Extra tags that only count at night (Stone Lantern). */
  tagsAtNight?: TagValues;
  spawnMultipliers?: Partial<Record<CreatureCategory, number>>;
  slotTypes: SlotType[];
  cost: number;
  blurb: string;
}

export const OBJECTS: ObjectSpecies[] = [
  { id: 'bird_bath', name: 'Bird Bath', tags: { Wet: 3 }, spawnMultipliers: { bird: 1.15 }, slotTypes: ['paving', 'soil'], cost: 120, blurb: 'Fresh water, no questions asked.' },
  { id: 'scratching_post', name: 'Scratching Post', tags: { Cosy: 3 }, spawnMultipliers: { feline: 1.3 }, slotTypes: ['paving'], cost: 150, blurb: 'Ownership will be decided by the first cat to use it.' },
  { id: 'stone_lantern', name: 'Stone Lantern', tags: {}, tagsAtNight: { Bright: 2 }, spawnMultipliers: { moth: 1.4 }, slotTypes: ['paving', 'soil'], cost: 180, blurb: 'A small warm light for the small dark hours.' },
  { id: 'log_pile', name: 'Log Pile', tags: { Shady: 3 }, spawnMultipliers: { insect: 1.2 }, slotTypes: ['soil'], cost: 100, blurb: 'To you, firewood. To a thousand small things, a city.' },
  { id: 'bird_feeder', name: 'Bird Feeder', tags: { Fruiting: 3 }, spawnMultipliers: { bird: 1.25 }, slotTypes: ['vertical', 'elevated'], cost: 160, blurb: 'The morning queue starts before sunrise.' },
];

/* ═══════════════════════════════════════════════════════════════════════
   CREATURES — scheme §18, 14 species. Preference weights 0–3 per tag.
   ═══════════════════════════════════════════════════════════════════════ */

export interface CreatureSpecies {
  id: string;
  name: string;
  rarity: Rarity;
  category: CreatureCategory;
  prefs: TagValues;
  /** Hard requirement: cannot appear unless every threshold is met. */
  requires?: TagValues;
  nightOnly?: boolean;
  recordedBy: number; // percent of gardeners, for the Field Guide line
  blurb: string;
  /** Cosmetic set unlocked by recording this creature (trophy class). */
  unlocksCosmetic?: string;
}

export const CREATURES: CreatureSpecies[] = [
  // Common — base tier of the two-stage roll
  { id: 'sparrow', name: 'Sparrow', rarity: 'common', category: 'bird', prefs: { Fruiting: 2, Bright: 1 }, recordedBy: 88, blurb: 'Argues with other sparrows about nothing, loudly, at dawn.' },
  { id: 'honeybee', name: 'Honeybee', rarity: 'common', category: 'insect', prefs: { Fragrant: 2, Bright: 2 }, recordedBy: 81, blurb: 'On the clock. Do not delay her, she has forty more stops.' },
  { id: 'cabbage_butterfly', name: 'Cabbage Butterfly', rarity: 'common', category: 'insect', prefs: { Fragrant: 2 }, recordedBy: 76, blurb: 'Flies like it is being remote-controlled by a distracted child.' },
  { id: 'garden_snail', name: 'Garden Snail', rarity: 'common', category: 'insect', prefs: { Wet: 2, Shady: 1 }, recordedBy: 69, blurb: 'Arrived last Tuesday. Still arriving.' },
  { id: 'stray_tabby', name: 'Stray Tabby', rarity: 'common', category: 'feline', prefs: { Cosy: 3 }, recordedBy: 64, blurb: 'Not your cat. Merely auditing your garden on a schedule.' },
  { id: 'ant_trail', name: 'Ant Trail', rarity: 'common', category: 'insect', prefs: { Fruiting: 2 }, recordedBy: 71, blurb: 'Ten thousand employees, zero meetings.' },
  // Uncommon
  { id: 'dragonfly', name: 'Dragonfly', rarity: 'uncommon', category: 'insect', prefs: { Wet: 2, Tall: 1 }, recordedBy: 38, blurb: 'A hundred million years of flight practice, and it shows.' },
  { id: 'moth', name: 'Moth', rarity: 'uncommon', category: 'moth', prefs: { Bright: 2, Fragrant: 1 }, nightOnly: true, recordedBy: 33, blurb: 'Loves your lantern with an intensity the lantern has not earned.' },
  { id: 'squirrel', name: 'Squirrel', rarity: 'uncommon', category: 'mammal', prefs: { Fruiting: 2, Tall: 2 }, recordedBy: 41, blurb: 'Buried something important here in 2019. Still checking.' },
  { id: 'hedgehog', name: 'Hedgehog', rarity: 'uncommon', category: 'mammal', prefs: { Shady: 2, Cosy: 2 }, recordedBy: 27, blurb: 'A small opinion with spikes. Prefers not to discuss it.' },
  // Rare — hard requirements begin
  { id: 'kingfisher', name: 'Kingfisher', rarity: 'rare', category: 'bird', prefs: { Wet: 3, Tall: 2 }, requires: { Wet: 6 }, recordedBy: 9, blurb: 'A splash of river-blue that makes the pond feel like a secret.', unlocksCosmetic: 'kingfisher_totem' },
  { id: 'firefly_swarm', name: 'Firefly Swarm', rarity: 'rare', category: 'insect', prefs: { Shady: 3, Wet: 2 }, nightOnly: true, recordedBy: 6, blurb: 'The dark corner of your garden, running its own light festival.', unlocksCosmetic: 'lantern_string' },
  // Legendary — real Singapore wildlife, deliberately
  { id: 'otter', name: 'Smooth-coated Otter', rarity: 'legendary', category: 'mammal', prefs: { Wet: 3 }, requires: { Wet: 10 }, recordedBy: 4, blurb: 'The whole family came. They heard your pond was the good one.', unlocksCosmetic: 'otter_pond_ornament' },
  { id: 'hornbill', name: 'Oriental Pied Hornbill', rarity: 'legendary', category: 'bird', prefs: { Tall: 3, Fruiting: 3 }, requires: { Tall: 8, Fruiting: 8 }, recordedBy: 2, blurb: 'Back from the brink and acting like it owns the skyline. Fair.', unlocksCosmetic: 'hornbill_perch' },
];

/* ═══════════════════════════════════════════════════════════════════════
   SLOTS — ECONOMY.md §2, verified layout. 16 base + 4 designated expansions.
   Coordinates in the PORTRAIT scene viewBox (1000 × 1600).
   ═══════════════════════════════════════════════════════════════════════ */

export interface SlotDef {
  id: string;
  type: SlotType;
  x: number;
  y: number;
  /** 'open' at new game, or index into OVERGROWN_PRICES, or 'expansion'. */
  start: 'open' | number | 'expansion';
  label: string;
}

export const SLOT_DEFS: SlotDef[] = [
  // Soil — lawn beds ×4, planter box ×2 (design: house band top, yard below)
  { id: 'soil_1', type: 'soil', x: 250, y: 720, start: 'open', label: 'Lawn bed' },
  { id: 'soil_2', type: 'soil', x: 620, y: 780, start: 'open', label: 'Lawn bed' },
  { id: 'soil_3', type: 'soil', x: 330, y: 950, start: 'open', label: 'Lawn bed' },
  { id: 'soil_4', type: 'soil', x: 730, y: 1000, start: 'open', label: 'Lawn bed' },
  { id: 'soil_5', type: 'soil', x: 190, y: 505, start: 0, label: 'Planter box' },
  { id: 'soil_6', type: 'soil', x: 855, y: 520, start: 3, label: 'Planter box' },
  // Water's edge — pond rim ×3 (pond bottom-right per the design)
  { id: 'water_1', type: 'water_edge', x: 420, y: 1180, start: 'open', label: 'Pond rim' },
  { id: 'water_2', type: 'water_edge', x: 690, y: 1105, start: 1, label: 'Pond rim' },
  { id: 'water_3', type: 'water_edge', x: 855, y: 1400, start: 6, label: 'Pond rim' },
  // Paving — porch (veranda deck) ×2, stepping stone
  { id: 'pave_1', type: 'paving', x: 640, y: 345, start: 'open', label: 'Porch' },
  { id: 'pave_2', type: 'paving', x: 845, y: 350, start: 'open', label: 'Porch' },
  { id: 'pave_3', type: 'paving', x: 545, y: 1000, start: 4, label: 'Stepping stone' },
  // Vertical — trellis on the wall, wall hook
  { id: 'vert_1', type: 'vertical', x: 152, y: 240, start: 2, label: 'Trellis' },
  { id: 'vert_2', type: 'vertical', x: 512, y: 205, start: 7, label: 'Wall hook' },
  // Elevated — fig branch peeking over the roof, window ledge
  { id: 'elev_1', type: 'elevated', x: 130, y: 96, start: 5, label: 'Fig branch' },
  { id: 'elev_2', type: 'elevated', x: 745, y: 252, start: 'open', label: 'Window ledge' },
  // Designated expansion areas — EXPANSION_SLOT_COST each, EXPANSION_LIMIT caps
  { id: 'xwater_1', type: 'water_edge', x: 330, y: 1345, start: 'expansion', label: 'Far pond rim' },
  { id: 'xwater_2', type: 'water_edge', x: 620, y: 1455, start: 'expansion', label: 'Pond shallows' },
  { id: 'xsoil_1', type: 'soil', x: 155, y: 1120, start: 'expansion', label: 'New bed' },
  { id: 'xelev_1', type: 'elevated', x: 292, y: 78, start: 'expansion', label: 'High branch' },
];

/** Where visitors stand. Three concurrent visitors max (balance.ts). */
export const VISITOR_ANCHORS = [
  { x: 430, y: 470, zone: 'steps' },
  { x: 265, y: 1180, zone: 'yard' },
  { x: 560, y: 1330, zone: 'pond' },
] as const;

/* ═══════════════════════════════════════════════════════════════════════
   QUESTS — scheme §10. The list is literally the government poster.
   ═══════════════════════════════════════════════════════════════════════ */

export interface DailyQuestDef {
  id: 'aircon_25' | 'fans_not_aircon' | 'sockets_off' | 'green_transport' | 'daily_login';
  name: string;
  guideline: string;
  icon: string;
  /** Which evidence tiers this quest supports (tier 4 = peer, P1). */
  tiers: EvidenceTier[];
  auto?: boolean; // daily_login completes itself
  /** Verified by connecting a tracker / GPS instead of a photo. */
  connect?: boolean;
}

export const DAILY_QUESTS: DailyQuestDef[] = [
  { id: 'aircon_25', name: 'Aircon at 25°C or higher', guideline: 'National save-energy campaign', icon: 'icon_aircon', tiers: [1, 2, 3] },
  { id: 'fans_not_aircon', name: 'Fans instead of aircon today', guideline: 'National save-energy campaign', icon: 'icon_fan', tiers: [1, 2] },
  { id: 'sockets_off', name: 'Switched off sockets before leaving', guideline: 'Standby load — save-energy campaign', icon: 'icon_plug', tiers: [1, 2] },
  { id: 'green_transport', name: 'Walked, cycled or took public transport', guideline: 'Green Plan 2030 walk-cycle-ride', icon: 'icon_bike', tiers: [1, 3], connect: true },
  { id: 'daily_login', name: 'Daily visit', guideline: '—', icon: 'icon_leaf', tiers: [1], auto: true },
];

/** Trackers the green-transport mission can connect to (P1: mocked OAuth). */
export interface TrackerDef {
  id: 'strava' | 'runna' | 'anywheel' | 'gps';
  name: string;
  art: string;
  blurb: string;
  /** GPS is a real on-device signal; the rest are mocked service links. */
  real?: boolean;
}
export const TRACKERS: TrackerDef[] = [
  { id: 'gps', name: 'Phone location', art: 'icon_location', blurb: 'Confirm you were out and moving — on-device, nothing stored.', real: true },
  { id: 'strava', name: 'Strava', art: 'logo_strava', blurb: 'Link your ride or run.' },
  { id: 'runna', name: 'Runna', art: 'logo_runna', blurb: 'Sync today’s run.' },
  { id: 'anywheel', name: 'Anywheel', art: 'logo_anywheel', blurb: 'Import a bike-share trip.' },
];

export interface BenchmarkQuestDef {
  id: 'water_under_130L' | 'electricity_under_average' | 'appliance_4_ticks' | 'fitting_2_ticks';
  name: string;
  benchmark: string;
  icon: string;
  kind: 'water_bill' | 'electricity_bill' | 'label_photo';
}

export const BENCHMARK_QUESTS: BenchmarkQuestDef[] = [
  { id: 'water_under_130L', name: 'Water under 130 L / person / day', benchmark: 'Green Plan 2030 target (national average: 141 L)', icon: 'icon_shower', kind: 'water_bill' },
  { id: 'electricity_under_average', name: 'Electricity under your flat-type average', benchmark: 'SP Group published averages', icon: 'icon_bolt', kind: 'electricity_bill' },
  { id: 'appliance_4_ticks', name: 'Appliance rated 4 ticks or more', benchmark: 'Mandatory Energy Labelling Scheme', icon: 'icon_label', kind: 'label_photo' },
  { id: 'fitting_2_ticks', name: 'Fitting rated 2 ticks or more', benchmark: 'Water Efficiency Labelling Scheme', icon: 'icon_tap', kind: 'label_photo' },
];

/** The live-timer shower mission (its own kind — a real-time intervention). */
export const SHOWER_MISSION = {
  id: 'five_min_shower' as const,
  name: 'Five-minute shower',
  guideline: 'Real-time feedback cuts use ~22% (Tiefenbeck 2018)',
  icon: 'icon_shower',
};

/* ═══════════════════════════════════════════════════════════════════════
   MAGIC SEEDS — the Gnome delivers them; the player grows them for loot.
   ═══════════════════════════════════════════════════════════════════════ */

/** The single deliverer. */
export const GNOME = {
  name: 'The Garden Gnome',
  art: 'gnome',
  arrival: 'A little clay gnome trundles up the path and leaves a glowing magic seed.',
};

/** Per-rarity magic-seed presentation (the "which tier" cue, before growing). */
export const MAGIC_SEED_RARITY: Record<SeedRarity, { label: string; color: string; glow: string }> = {
  common: { label: 'Common', color: '#7d9c52', glow: 'rgba(125,156,82,0.55)' },
  rare: { label: 'Rare', color: '#6fa8a0', glow: 'rgba(111,168,160,0.6)' },
  epic: { label: 'Epic', color: '#9c8ade', glow: 'rgba(156,138,222,0.65)' },
  legendary: { label: 'Legendary', color: '#e2b13c', glow: 'rgba(226,177,60,0.75)' },
};

/** Grown-form presentation for the sprout mini-game + reveal. */
export const GROWN_FORM_DEF: Record<GrownForm, { name: string; art: string; tierLabel: string }> = {
  seedling: { name: 'Seedling', art: 'form_seedling', tierLabel: 'common rewards' },
  sapling: { name: 'Sapling', art: 'form_sapling', tierLabel: 'rare rewards' },
  tree: { name: 'Tree', art: 'form_tree', tierLabel: 'epic rewards · often several' },
  huge_tree: { name: 'Huge Tree', art: 'form_huge_tree', tierLabel: 'legendary rewards · often several' },
};

/* ═══════════════════════════════════════════════════════════════════════
   COSMETICS — two classes (ECONOMY.md §6): creature-unlocked trophy sets
   vs generic decor. Only decor ever appears in packages.
   ═══════════════════════════════════════════════════════════════════════ */

export interface CosmeticDef {
  id: string;
  name: string;
  class: 'trophy' | 'decor';
  from: string; // creature id for trophies, 'package' for decor
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'otter_pond_ornament', name: 'Otter Pond Ornament', class: 'trophy', from: 'otter' },
  { id: 'hornbill_perch', name: 'Hornbill Perch', class: 'trophy', from: 'hornbill' },
  { id: 'kingfisher_totem', name: 'Kingfisher Totem', class: 'trophy', from: 'kingfisher' },
  { id: 'lantern_string', name: 'Firefly Lantern String', class: 'trophy', from: 'firefly_swarm' },
  { id: 'garden_gnome', name: 'Garden Gnome', class: 'decor', from: 'package' },
  { id: 'bunting', name: 'Festival Bunting', class: 'decor', from: 'package' },
  { id: 'pinwheel', name: 'Tin Pinwheel', class: 'decor', from: 'package' },
  { id: 'koi_flag', name: 'Koi Flag', class: 'decor', from: 'package' },
];

/* ═══════════════════════════════════════════════════════════════════════
   FRIENDS — demo data for the Social tab (P1 backend; layout per mockups).
   ═══════════════════════════════════════════════════════════════════════ */

export interface FriendDef {
  id: string;
  name: string;
  avatar: string; // creature sprite id
  guidePct: number;
  streak: number;
  showcase: string[]; // creature ids
  verified?: boolean;
}

export const FRIENDS: FriendDef[] = [
  { id: 'f1', name: 'Wei Lin', avatar: 'otter', guidePct: 86, streak: 23, showcase: ['otter', 'kingfisher', 'firefly_swarm'], verified: true },
  { id: 'f2', name: 'Priya', avatar: 'hedgehog', guidePct: 57, streak: 9, showcase: ['hedgehog', 'squirrel', 'moth'] },
  { id: 'f3', name: 'Marcus', avatar: 'stray_tabby', guidePct: 36, streak: 4, showcase: ['stray_tabby', 'honeybee', 'sparrow'] },
];

/* ═══════════════════════════════════════════════════════════════════════
   LOOKUPS
   ═══════════════════════════════════════════════════════════════════════ */

export const PLANT_BY_ID = Object.fromEntries(PLANTS.map((p) => [p.id, p]));
export const OBJECT_BY_ID = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));
export const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c]));
export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));
export const SLOT_DEF_BY_ID = Object.fromEntries(SLOT_DEFS.map((s) => [s.id, s]));
