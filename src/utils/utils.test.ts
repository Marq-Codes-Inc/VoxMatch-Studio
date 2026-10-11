// src/utils/utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatTime,
  timeStringToSeconds,
  getAspectRatio,
  hexToRgb,
  clamp01,
  generateId,
} from './utils';

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('00:00:00.000');
  });
  it('formats sub-minute', () => {
    expect(formatTime(5.5)).toBe('00:00:05.500');
  });
  it('formats hours/minutes', () => {
    expect(formatTime(3661.123)).toBe('01:01:01.123');
  });
  it('handles negatives gracefully', () => {
    expect(formatTime(-1)).toBe('00:00:00.000');
  });
  it('handles NaN', () => {
    expect(formatTime(NaN)).toBe('00:00:00.000');
  });
});

describe('timeStringToSeconds', () => {
  it('parses HH:MM:SS.mmm', () => {
    expect(timeStringToSeconds('00:00:05.500')).toBeCloseTo(5.5, 3);
    expect(timeStringToSeconds('01:01:01.000')).toBeCloseTo(3661, 3);
  });
  it('returns 0 for bad input', () => {
    expect(timeStringToSeconds('nonsense')).toBe(0);
    expect(timeStringToSeconds('')).toBe(0);
  });
  it('round-trips with formatTime', () => {
    const t = 123.456;
    expect(timeStringToSeconds(formatTime(t))).toBeCloseTo(t, 3);
  });
});

describe('getAspectRatio', () => {
  it('returns 16:9 by default', () => {
    expect(getAspectRatio({ aspectRatio: '16:9' } as any)).toBeCloseTo(16 / 9);
  });
  it('handles custom dimensions', () => {
    expect(
      getAspectRatio({
        aspectRatio: 'custom',
        customWidth: 1920,
        customHeight: 1080,
      } as any),
    ).toBeCloseTo(16 / 9);
  });
  it('falls back when missing', () => {
    expect(getAspectRatio({} as any)).toBeCloseTo(16 / 9);
  });
});

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#046466')).toBe('4, 100, 102');
  });
  it('handles missing #', () => {
    expect(hexToRgb('ffffff')).toBe('255, 255, 255');
  });
  it('returns fallback for garbage', () => {
    expect(hexToRgb('not-a-color')).toBe('0, 0, 0');
  });
});

describe('clamp01', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
  });
});

describe('generateId', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
  it('returns a non-empty string', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });
});
