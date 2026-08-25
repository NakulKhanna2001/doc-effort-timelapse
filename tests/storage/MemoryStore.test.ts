import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { MemoryStore } from '../../src/storage/MemoryStore';

describe('MemoryStore', () => {
  it('appends events and reads them back in order', async () => {
    const store = new MemoryStore();
    await store.create('doc1');
    await store.append('doc1', makeEvent({ seq: 0, t: 1, from: 0, to: 0, text: 'a', source: 'input' }));
    await store.append('doc1', makeEvent({ seq: 1, t: 2, from: 1, to: 1, text: 'b', source: 'input' }));
    const events = await store.read('doc1');
    expect(events.map((e) => e.text)).toEqual(['a', 'b']);
  });
});
