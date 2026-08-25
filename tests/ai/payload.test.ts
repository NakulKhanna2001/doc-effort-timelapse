import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { buildInsightPayload } from '../../src/ai/payload';

describe('buildInsightPayload', () => {
  it('summarizes metrics and paste events into a stable shape', () => {
    const events = [
      makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'hi', source: 'input' }),
      makeEvent({ seq: 1, t: 2000, from: 2, to: 2, text: 'BIGPASTE', source: 'paste' }),
    ];
    const payload = buildInsightPayload(events, { idleThresholdMs: 30000 });
    expect(payload.metrics.pasteCount).toBe(1);
    expect(payload.effortScore).toBeGreaterThanOrEqual(0);
    expect(payload.pasteEvents).toEqual([{ seq: 1, t: 2000, size: 8 }]);
  });
});
