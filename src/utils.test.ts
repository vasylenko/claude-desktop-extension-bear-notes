import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { convertCoreDataTimestamp, parseDateString } from './utils.js';

describe('parseDateString', () => {
  beforeEach(() => {
    // Fix "now" to January 15, 2026 for predictable tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('"start of last month" in January returns December of previous year', () => {
    const result = parseDateString('start of last month');

    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // December (0-indexed)
    expect(result.getDate()).toBe(1);
  });

  it('"end of last month" returns last day with end-of-day time', () => {
    const result = parseDateString('end of last month');

    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(31);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe('convertCoreDataTimestamp', () => {
  it('converts Core Data timestamp to correct ISO string', () => {
    // Core Data timestamp 0 = 2001-01-01 00:00:00 UTC
    const result = convertCoreDataTimestamp(0);

    expect(result).toBe('2001-01-01T00:00:00.000Z');
  });
});
