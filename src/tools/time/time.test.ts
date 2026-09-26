import { describe, expect, test } from 'vitest';
import { currentTimestamp, fromLocalDateTime, fromTimestamp } from './time';

describe('timestamp conversion', () => {
  test('uses the explicitly selected timestamp unit', () => {
    expect(fromTimestamp('1000', 'seconds')).toEqual({
      ok: true,
      value: new Date(1_000_000),
    });
    expect(fromTimestamp('1000', 'milliseconds')).toEqual({
      ok: true,
      value: new Date(1000),
    });
  });

  test('returns whole seconds and exact milliseconds for current time', () => {
    expect(currentTimestamp(new Date(1500))).toEqual({
      seconds: 1,
      milliseconds: 1500,
    });
  });

  test('rejects non-integers and values beyond the Date range', () => {
    expect(fromTimestamp('1.5', 'seconds').ok).toBe(false);
    expect(fromTimestamp('999999999999999999', 'milliseconds').ok).toBe(false);
  });

  test('rejects normalized impossible local dates', () => {
    expect(fromLocalDateTime('2026-02-30T12:00').ok).toBe(false);
    expect(fromLocalDateTime('not-a-date').ok).toBe(false);
  });
});
