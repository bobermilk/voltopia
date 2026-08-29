/**
 * rng.ts — seeded, counter-addressed randomness (mulberry32 core).
 *
 * Scheme §7 requires a seeded RNG so a spawn sequence can be reproduced
 * exactly for the demo and for bug reports. The (seed, counter) pair lives in
 * GameState; every draw advances the counter, so replaying catchUp on the
 * same stored state yields byte-identical results.
 */

export function randAt(seed: number, counter: number): number {
  let a = (seed + Math.imul(counter + 1, 0x6d2b79f5)) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Mutable draw helper for use inside a single pure pass. */
export class Draws {
  private seed: number;
  counter: number;

  constructor(seed: number, counter: number) {
    this.seed = seed;
    this.counter = counter;
  }

  next(): number {
    return randAt(this.seed, this.counter++);
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))];
  }

  /** Weighted pick; weights must be ≥ 0 and not all zero. */
  weighted<T>(items: Array<{ item: T; weight: number }>): T | null {
    const total = items.reduce((s, i) => s + i.weight, 0);
    if (total <= 0) return null;
    let r = this.next() * total;
    for (const { item, weight } of items) {
      r -= weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1].item;
  }
}
