import { describe, it, expect } from 'vitest';
import type { EditEvent } from '../../src/events/types';
import { makeEvent } from '../../src/events/types';

describe('makeEvent', () => {
  it('fills len from text and defaults removed to empty', () => {
    const e: EditEvent = makeEvent({ seq: 0, t: 100, from: 0, to: 0, text: 'hi', source: 'input' });
    expect(e.len).toBe(2);
    expect(e.removed).toBe('');
  });
});
