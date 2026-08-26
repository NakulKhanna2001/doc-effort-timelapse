import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryStore } from '../../src/storage/MemoryStore';
import { Editor } from '../../src/editor/Editor';
import { makeEvent } from '../../src/events/types';

describe('Editor', () => {
  it('appends an event to the store when text is typed', async () => {
    const store = new MemoryStore();
    await store.create('doc1');
    const { container } = render(<Editor docId="doc1" store={store} />);
    const host = container.querySelector('.cm-editor-host') as any;
    // Wait for async init (the view is created asynchronously now)
    await waitFor(() => expect(host._cmView).toBeTruthy());
    const view = host._cmView;
    view.dispatch({ changes: { from: 0, insert: 'x' }, userEvent: 'input.type' });
    // store.append is async (fire-and-forget in the listener); allow microtasks to flush
    await new Promise((r) => setTimeout(r, 0));
    expect((await store.read('doc1')).map((e) => e.text)).toEqual(['x']);
  });

  it('resumes seq counter and restores doc from pre-existing events', async () => {
    const store = new MemoryStore();
    await store.create('doc1');
    // Pre-seed two events: seq 0 inserts 'ab' at 0, seq 1 inserts 'c' at 2 → doc = 'abc'
    await store.append('doc1', makeEvent({ seq: 0, t: 1, from: 0, to: 0, text: 'ab', source: 'input' }));
    await store.append('doc1', makeEvent({ seq: 1, t: 2, from: 2, to: 2, text: 'c', source: 'input' }));

    const { container } = render(<Editor docId="doc1" store={store} />);
    const host = container.querySelector('.cm-editor-host') as any;

    // Wait for async init and for the doc to be restored to 'abc'
    await waitFor(() => {
      expect(host._cmView).toBeTruthy();
      expect(host._cmView.state.doc.toString()).toBe('abc');
    });

    const view = host._cmView;
    // Dispatch insert 'd' at position 3 (end of 'abc')
    view.dispatch({ changes: { from: 3, insert: 'd' }, userEvent: 'input.type' });
    // Allow fire-and-forget store.append microtasks to flush
    await new Promise((r) => setTimeout(r, 0));

    const events = await store.read('doc1');
    expect(events).toHaveLength(3);
    expect(events[2].seq).toBe(2);
    expect(view.state.doc.toString()).toBe('abcd');
  });
});
