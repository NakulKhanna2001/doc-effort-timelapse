import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryStore } from '../../src/storage/MemoryStore';
import { Editor } from '../../src/editor/Editor';

describe('Editor', () => {
  it('appends an event to the store when text is typed', async () => {
    const store = new MemoryStore();
    await store.create('doc1');
    const { container } = render(<Editor docId="doc1" store={store} />);
    const host = container.querySelector('.cm-editor-host') as any;
    const view = host._cmView;
    view.dispatch({ changes: { from: 0, insert: 'x' }, userEvent: 'input.type' });
    // store.append is async (fire-and-forget in the listener); allow microtasks to flush
    await new Promise((r) => setTimeout(r, 0));
    expect((await store.read('doc1')).map((e) => e.text)).toEqual(['x']);
  });
});
