/**
 * clock.ts — the game clock.
 *
 * All stored timestamps are in GAME time. Game time runs at `scale` × real
 * time from an anchor pair, so TIME_SCALE = 1440 accelerates every timed
 * system at once (watering windows, growth gaps, spawn ticks, visits) with
 * no other code involved. Changing scale re-anchors, so game time is always
 * continuous and monotonic.
 */
import type { GameState } from './types';

export type Clock = GameState['clock'];

export function gameNow(clock: Clock, realNow: number = Date.now()): number {
  return clock.anchorGame + (realNow - clock.anchorReal) * clock.scale;
}

export function withScale(clock: Clock, scale: number, realNow: number = Date.now()): Clock {
  return { anchorReal: realNow, anchorGame: gameNow(clock, realNow), scale };
}

/** Dev panel: jump game time forward by `ms` (never backward). */
export function advanced(clock: Clock, ms: number, realNow: number = Date.now()): Clock {
  return {
    anchorReal: realNow,
    anchorGame: gameNow(clock, realNow) + Math.max(0, ms),
    scale: clock.scale,
  };
}

/** Game-time day string (local timezone) — quest reset boundary. */
export function dayOf(gameMs: number): string {
  const d = new Date(gameMs);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Game-time billing period (calendar month). */
export function periodOf(gameMs: number): string {
  const d = new Date(gameMs);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
}

export function hourOf(gameMs: number): number {
  return new Date(gameMs).getHours();
}
