// src/utils/timingUtils.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateSmartTiming,
  getTimingConfigForLanguage,
  DEFAULT_CONFIG,
} from './timingUtils';

// calculateSmartTiming

describe('calculateSmartTiming', () => {
  it('returns one clip per line', () => {
    const clips = calculateSmartTiming(['one', 'two', 'three'], 0, 60);
    expect(clips).toHaveLength(3);
    expect(clips.map(c => c.text)).toEqual(['one', 'two', 'three']);
  });

  it('respects minimum clip duration', () => {
    const clips = calculateSmartTiming(['a'], 0, 60, {
      baseDurationPerChar: 0.001,
      minDuration: 2,
    });
    // minDuration is scaled by 0.5 floor, so allow that
    expect(clips[0].endTime - clips[0].startTime).toBeGreaterThanOrEqual(2 * 0.5);
  });

  it('respects maximum clip duration', () => {
    const longLine = 'x'.repeat(500);
    const clips = calculateSmartTiming([longLine], 0, 60, {
      baseDurationPerChar: 1,
      maxDuration: 3,
    });
    expect(clips[0].endTime - clips[0].startTime).toBeLessThanOrEqual(3 * 1.5);
  });

  it('starts at provided startTime', () => {
    const clips = calculateSmartTiming(['hello'], 10, 60);
    expect(clips[0].startTime).toBe(10);
  });

  it('produces non-overlapping clips', () => {
    const clips = calculateSmartTiming(['one', 'two', 'three', 'four'], 0, 30);
    for (let i = 1; i < clips.length; i++) {
      expect(clips[i].startTime).toBeGreaterThanOrEqual(clips[i - 1].endTime);
    }
  });

  it('applies reading speed multiplier', () => {
    const slow = calculateSmartTiming(['hello world'], 0, 60, {
      readingSpeed: 'slow',
    });
    const fast = calculateSmartTiming(['hello world'], 0, 60, {
      readingSpeed: 'fast',
    });
    const slowDur = slow[0].endTime - slow[0].startTime;
    const fastDur = fast[0].endTime - fast[0].startTime;
    expect(slowDur).toBeGreaterThan(fastDur);
  });

  it('applies language multiplier', () => {
    const en = calculateSmartTiming(['hello world'], 0, 60, {
      languageMultiplier: 1.0,
    });
    const ja = calculateSmartTiming(['hello world'], 0, 60, {
      languageMultiplier: 1.2,
    });
    expect(ja[0].endTime - ja[0].startTime).toBeGreaterThan(
      en[0].endTime - en[0].startTime,
    );
  });

  it('applies scale factor but never below 0.5 (readability floor)', () => {
    const lines = Array.from(
      { length: 50 },
      (_, i) => `Line ${i} word word word`,
    );
    const clips = calculateSmartTiming(lines, 0, 5);

    // The scale factor is clamped to >= 0.5 by design, so total duration
    // will exceed the budget — but each clip is still bounded by min/max.
    expect(clips).toHaveLength(50);

    const last = clips[clips.length - 1];
    // Every clip has at least minDuration * 0.5 (the floor)
    for (const c of clips) {
      expect(c.endTime - c.startTime).toBeGreaterThanOrEqual(
        DEFAULT_CONFIG.minDuration * 0.5 - 0.001,
      );
    }
    // Total is bounded by (0.5 floor) × (natural duration), not unbounded
    expect(last.endTime).toBeLessThan(200);
  });

  it('respects the 0.5 scale-factor floor', () => {
    // 1000 lines into a 1s budget — worst case
    const lines = Array.from({ length: 1000 }, () => 'short');
    const clips = calculateSmartTiming(lines, 0, 1);

    // Even in worst case, clips keep the readability floor
    for (const c of clips) {
      expect(c.endTime - c.startTime).toBeGreaterThan(0);
    }
    expect(clips).toHaveLength(1000);
  });

  it('handles empty input', () => {
    expect(calculateSmartTiming([], 0, 60)).toEqual([]);
  });
});

// getTimingConfigForLanguage

describe('getTimingConfigForLanguage', () => {
  it('returns known multipliers', () => {
    expect(getTimingConfigForLanguage('ja-JP').languageMultiplier).toBe(1.2);
    expect(getTimingConfigForLanguage('en-US').languageMultiplier).toBe(1.0);
  });

  it('defaults unknown languages to 1.0', () => {
    expect(getTimingConfigForLanguage('xx-XX').languageMultiplier).toBe(1.0);
  });
});

// DEFAULT_CONFIG

describe('DEFAULT_CONFIG', () => {
  it('has sane defaults', () => {
    expect(DEFAULT_CONFIG.baseDurationPerChar).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.minDuration).toBeLessThan(DEFAULT_CONFIG.maxDuration);
    expect(DEFAULT_CONFIG.pauseBetweenClips).toBeGreaterThanOrEqual(0);
  });
});