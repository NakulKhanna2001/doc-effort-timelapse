import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { makeEvent } from '../../src/events/types';
import { IndexedDbStore } from '../../src/storage/IndexedDbStore';

describe('IndexedDbStore', () => {
  let store: IndexedDbStore;
  beforeEach(async () => {
    store = new IndexedDbStore(`db-${Math.random()}`);
    await store.create('doc1');
  });

  it('persists and reads events in order', async () => {
    await store.append('doc1', makeEvent({ seq: 0, t: 1, from: 0, to: 0, text: 'a', source: 'input' }));
    await store.append('doc1', makeEvent({ seq: 1, t: 2, from: 1, to: 1, text: 'b', source: 'input' }));
    expect((await store.read('doc1')).map((e) => e.text)).toEqual(['a', 'b']);
  });
});
