import { describe, it, expect } from 'vitest';
import { computeTimeline } from '../../src/analysis/timeline';
import { makeEvent } from '../../src/events/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function inputEvent(seq: number, t: number, char: string) {
  return makeEvent({ seq, t, from: seq - 1, to: seq - 1, text: char, source: 'input' });
}

// ── 1. Empty ──────────────────────────────────────────────────────────────────

describe('computeTimeline – empty input', () => {
  it('returns empty points and pauses arrays', () => {
    const result = computeTimeline([], { idleThresholdMs: 30_000 });
    expect(result.points).toEqual([]);
    expect(result.pauses).toEqual([]);
  });
});

// ── 2. Steady typing – no pauses ─────────────────────────────────────────────

describe('computeTimeline – steady typing', () => {
  // 10 single-char 'input' events, 1 s apart (t = 0..9000), threshold 30 s
  const events = Array.from({ length: 10 }, (_, i) =>
    inputEvent(i + 1, i * 1000, String.fromCharCode(65 + i)),
  );
  const tl = computeTimeline(events, { idleThresholdMs: 30_000, targetPoints: 120 });

  it('produces no pauses', () => {
    expect(tl.pauses).toHaveLength(0);
  });

  it('last point docLen is 10', () => {
    const last = tl.points[tl.points.length - 1];
    expect(last.docLen).toBe(10);
  });

  it('docLen values across points are non-decreasing', () => {
    for (let i = 1; i < tl.points.length; i++) {
      expect(tl.points[i].docLen).toBeGreaterThanOrEqual(tl.points[i - 1].docLen);
    }
  });

  it('sum of added across all points equals 10', () => {
    const totalAdded = tl.points.reduce((s, p) => s + p.added, 0);
    expect(totalAdded).toBe(10);
  });

  it('last point activeT is 9000', () => {
    const last = tl.points[tl.points.length - 1];
    expect(last.activeT).toBe(9000);
  });
});

// ── 3. Paste spike ────────────────────────────────────────────────────────────

describe('computeTimeline – paste spike', () => {
  const events = [
    // 3 typed chars
    inputEvent(1, 0, 'a'),
    inputEvent(2, 500, 'b'),
    inputEvent(3, 1000, 'c'),
    // one paste: 100 chars
    makeEvent({ seq: 4, t: 1500, from: 3, to: 3, text: 'x'.repeat(100), source: 'paste' }),
  ];
  const tl = computeTimeline(events, { idleThresholdMs: 30_000 });

  it('some point has added >= 100', () => {
    expect(tl.points.some(p => p.added >= 100)).toBe(true);
  });

  it('final docLen is 103 (3 typed + 100 pasted)', () => {
    const last = tl.points[tl.points.length - 1];
    expect(last.docLen).toBe(103);
  });
});

// ── 4. Pause compression ──────────────────────────────────────────────────────

describe('computeTimeline – pause compression', () => {
  // events at t=0, t=1000, then t=600000 (gap 599000 ms >> threshold 30000)
  const events = [
    inputEvent(1, 0, 'a'),
    inputEvent(2, 1000, 'b'),
    inputEvent(3, 600_000, 'c'),
  ];
  const tl = computeTimeline(events, { idleThresholdMs: 30_000 });

  it('produces exactly one pause', () => {
    expect(tl.pauses).toHaveLength(1);
  });

  it('pause durationMs is 599000', () => {
    expect(tl.pauses[0].durationMs).toBe(599_000);
  });

  it('pause activeT equals 31000 (position of the event after the pause)', () => {
    // First event: activeT=0. Second: activeT=min(1000,30000)=1000.
    // Third: gap=599000 > threshold → cap at 30000 → activeT = 1000+30000 = 31000
    expect(tl.pauses[0].activeT).toBe(31_000);
  });

  it('last point activeT is 31000 (not 600000)', () => {
    const last = tl.points[tl.points.length - 1];
    expect(last.activeT).toBe(31_000);
  });
});

// ── 5. Deletion ───────────────────────────────────────────────────────────────

describe('computeTimeline – deletion', () => {
  // Insert 'abcde' one char at a time, then delete 'bc' (chars at positions 1-3)
  const events = [
    makeEvent({ seq: 1, t: 0,    from: 0, to: 0, text: 'a', source: 'input' }),
    makeEvent({ seq: 2, t: 500,  from: 1, to: 1, text: 'b', source: 'input' }),
    makeEvent({ seq: 3, t: 1000, from: 2, to: 2, text: 'c', source: 'input' }),
    makeEvent({ seq: 4, t: 1500, from: 3, to: 3, text: 'd', source: 'input' }),
    makeEvent({ seq: 5, t: 2000, from: 4, to: 4, text: 'e', source: 'input' }),
    // delete 'bc': from=1, to=3, text='', removed='bc'
    makeEvent({ seq: 6, t: 2500, from: 1, to: 3, text: '', source: 'delete', removed: 'bc' }),
  ];
  const tl = computeTimeline(events, { idleThresholdMs: 30_000 });

  it('final docLen is 3', () => {
    const last = tl.points[tl.points.length - 1];
    expect(last.docLen).toBe(3);
  });

  it('some point has removed >= 2', () => {
    expect(tl.points.some(p => p.removed >= 2)).toBe(true);
  });
});
