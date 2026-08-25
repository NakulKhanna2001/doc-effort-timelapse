import { describe, it, expect } from 'vitest';
import { effortScore } from '../../src/analysis/effort';
import type { Metrics } from '../../src/analysis/metrics';

const base: Metrics = {
  typedChars: 100, pastedChars: 0, pasteCount: 0, largestPaste: 0,
  pasteRatio: 0, activeTimeMs: 60000, deletions: 10,
};

describe('effortScore', () => {
  it('scores genuine typing higher than a paste dump', () => {
    const typed = effortScore(base);
    const pasted = effortScore({ ...base, typedChars: 0, pastedChars: 100, pasteRatio: 1, pasteCount: 1, largestPaste: 100, deletions: 0 });
    expect(typed).toBeGreaterThan(pasted);
  });
  it('returns a value between 0 and 100', () => {
    const s = effortScore(base);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
