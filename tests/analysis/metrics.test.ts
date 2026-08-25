import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { computeMetrics } from '../../src/analysis/metrics';

const typeAt = (seq: number, t: number, from: number, text: string) =>
  makeEvent({ seq, t, from, to: from, text, source: 'input' });

describe('computeMetrics', () => {
  it('counts typed vs pasted characters and paste stats', () => {
    const events = [
      typeAt(0, 0, 0, 'a'),
      typeAt(1, 1000, 1, 'b'),
      makeEvent({ seq: 2, t: 2000, from: 2, to: 2, text: 'PASTED', source: 'paste' }),
    ];
    const m = computeMetrics(events, { idleThresholdMs: 30000 });
    expect(m.typedChars).toBe(2);
    expect(m.pastedChars).toBe(6);
    expect(m.pasteCount).toBe(1);
    expect(m.largestPaste).toBe(6);
    expect(m.pasteRatio).toBeCloseTo(6 / 8);
  });

  it('sums active time only across gaps below the idle threshold', () => {
    const events = [
      typeAt(0, 0, 0, 'a'),
      typeAt(1, 5000, 1, 'b'),
      typeAt(2, 100000, 2, 'c'),
    ];
    const m = computeMetrics(events, { idleThresholdMs: 30000 });
    expect(m.activeTimeMs).toBe(5000);
  });
});
