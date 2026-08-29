import { describe, it, expect } from 'vitest';
import { parseBillFigure } from './billOcr';

describe('bill figure extraction from OCR text', () => {
  it('reads the kWh figure off an electricity bill', () => {
    expect(parseBillFigure('Total electricity used 312 kWh this month', 'electricity')).toBe(312);
    expect(parseBillFigure('Consumption\n1,240 kWh', 'electricity')).toBe(1240);
    expect(parseBillFigure('kWh used: 288', 'electricity')).toBe(288);
    expect(parseBillFigure('Usage 405.5 kWh', 'electricity')).toBe(405.5);
  });

  it('reads the m³ figure off a water bill', () => {
    expect(parseBillFigure('Water consumption 42 m³', 'water')).toBe(42);
    expect(parseBillFigure('Used 38 m3 over the period', 'water')).toBe(38);
    expect(parseBillFigure('Total 15 cu m', 'water')).toBe(15);
  });

  it('returns null when no matching figure is present', () => {
    expect(parseBillFigure('Account number 123456 due 20 Aug', 'electricity')).toBe(null);
    expect(parseBillFigure('no numbers here', 'water')).toBe(null);
  });

  it("does not read an electricity bill's kWh as a water m³ figure", () => {
    expect(parseBillFigure('312 kWh', 'water')).toBe(null);
  });
});
