import { describe, it, expect } from 'vitest';
import { detectSessions } from '../../src/analysis/sessions';
import { makeEvent } from '../../src/events/types';

function ev(seq: number, t: number): ReturnType<typeof makeEvent> {
  return makeEvent({ seq, t, from: 0, to: 0, text: 'a', source: 'input' });
}

describe('detectSessions', () => {
  it('empty log → all empty, totalActiveMs 0', () => {
    const result = detectSessions([], 30_000);
    expect(result.sessions).toEqual([]);
    expect(result.breaks).toEqual([]);
    expect(result.totalActiveMs).toBe(0);
  });

  it('single event → one session with durationMs 0 and eventCount 1, no breaks', () => {
    const result = detectSessions([ev(0, 5000)], 30_000);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toEqual({ startT: 5000, endT: 5000, durationMs: 0, eventCount: 1 });
    expect(result.breaks).toEqual([]);
    expect(result.totalActiveMs).toBe(0);
  });

  it('two sessions separated by idle gap', () => {
    // t=0,1000,2000 then t=60000,61000 with threshold=30000
    const events = [
      ev(0, 0),
      ev(1, 1000),
      ev(2, 2000),
      ev(3, 60000),
      ev(4, 61000),
    ];
    const result = detectSessions(events, 30_000);

    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]).toEqual({ startT: 0, endT: 2000, durationMs: 2000, eventCount: 3 });
    expect(result.sessions[1]).toEqual({ startT: 60000, endT: 61000, durationMs: 1000, eventCount: 2 });

    expect(result.breaks).toHaveLength(1);
    expect(result.breaks[0]).toEqual({ afterSessionIndex: 0, startT: 2000, durationMs: 58000 });

    expect(result.totalActiveMs).toBe(3000);
  });

  it('events with gap exactly equal to threshold do not split', () => {
    const events = [ev(0, 0), ev(1, 30_000)];
    const result = detectSessions(events, 30_000);
    expect(result.sessions).toHaveLength(1);
    expect(result.breaks).toHaveLength(0);
  });

  it('events with gap one ms over threshold do split', () => {
    const events = [ev(0, 0), ev(1, 30_001)];
    const result = detectSessions(events, 30_000);
    expect(result.sessions).toHaveLength(2);
    expect(result.breaks).toHaveLength(1);
  });

  it('three sessions produce two breaks', () => {
    const events = [
      ev(0, 0),
      ev(1, 100_000),
      ev(2, 200_000),
    ];
    const result = detectSessions(events, 30_000);
    expect(result.sessions).toHaveLength(3);
    expect(result.breaks).toHaveLength(2);
    expect(result.breaks[0]).toEqual({ afterSessionIndex: 0, startT: 0, durationMs: 100_000 });
    expect(result.breaks[1]).toEqual({ afterSessionIndex: 1, startT: 100_000, durationMs: 100_000 });
    expect(result.totalActiveMs).toBe(0);
  });
});
