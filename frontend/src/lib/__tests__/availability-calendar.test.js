import { describe, test, expect } from 'vitest';
import { slotsToCells, cellsToSlots } from '../availability-calendar';

describe('availability calendar helpers', () => {
  test('handles empty input without producing slots', () => {
    expect(slotsToCells()).toEqual(new Set());
    expect(cellsToSlots(new Set())).toEqual([]);
  });

  test('expands slots into unique hourly cells', () => {
    const cells = slotsToCells([
      { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
    ]);

    expect([...cells].sort()).toEqual(['2-10', '2-11', '2-9']);
  });

  test('compresses consecutive cells and keeps gaps separate', () => {
    expect(cellsToSlots(new Set(['3-9', '3-10', '3-12']))).toEqual([
      { dayOfWeek: '3', startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: '3', startTime: '12:00', endTime: '13:00' },
    ]);
  });

  test('preserves a simple slot through the cell round trip', () => {
    const original = [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }];

    expect(cellsToSlots(slotsToCells(original))).toEqual([
      { dayOfWeek: '1', startTime: '09:00', endTime: '12:00' },
    ]);
  });
});
