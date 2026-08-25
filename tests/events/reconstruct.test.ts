import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { applyEvent, reconstruct } from '../../src/events/reconstruct';

const type = (seq: number, from: number, text: string) =>
  makeEvent({ seq, t: seq * 100, from, to: from, text, source: 'input' });

describe('applyEvent', () => {
  it('inserts text at a position', () => {
    expect(applyEvent('helo', type(0, 3, 'l'))).toBe('hello');
  });
  it('deletes a range', () => {
    const del = makeEvent({ seq: 1, t: 1, from: 1, to: 3, text: '', removed: 'el', source: 'delete' });
    expect(applyEvent('hello', del)).toBe('hlo');
  });
});

describe('reconstruct', () => {
  it('rebuilds the document at a given step', () => {
    const events = [type(0, 0, 'ab'), type(1, 2, 'c'), type(2, 0, 'X')];
    expect(reconstruct(events, 0)).toBe('ab');
    expect(reconstruct(events, 2)).toBe('Xabc');
  });
  it('reconstruct() with no bound returns the final document', () => {
    const events = [type(0, 0, 'ab'), type(1, 2, 'c')];
    expect(reconstruct(events)).toBe('abc');
  });
});
