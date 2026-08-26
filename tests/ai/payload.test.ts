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

  it('includes session breakdown in the payload', () => {
    // Two sessions split by a 599000ms gap
    const events = [
      makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'hello', source: 'input' }),
      makeEvent({ seq: 1, t: 1000, from: 5, to: 5, text: ' world', source: 'input' }),
      makeEvent({ seq: 2, t: 600000, from: 11, to: 11, text: 'next session', source: 'input' }),
      makeEvent({ seq: 3, t: 601000, from: 23, to: 23, text: ' continues', source: 'input' }),
    ];
    const payload = buildInsightPayload(events, { idleThresholdMs: 30000 });
    expect(payload.sessions.count).toBe(2);
    expect(payload.sessions.longestBreakMs).toBe(599000);
  });
});
