import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { buildBlame } from '../../src/events/blame';

describe('buildBlame', () => {
  it('attributes each final character to the event that inserted it', () => {
    const events = [
      makeEvent({ seq: 0, t: 100, from: 0, to: 0, text: 'ab', source: 'input' }),
      makeEvent({ seq: 1, t: 200, from: 2, to: 2, text: 'XYZ', source: 'paste' }),
    ];
    const blame = buildBlame(events);
    expect(blame.map((b) => b.source)).toEqual(['input', 'input', 'paste', 'paste', 'paste']);
    expect(blame[2].seq).toBe(1);
    expect(blame[0].t).toBe(100);
  });
});
