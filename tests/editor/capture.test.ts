import { describe, it, expect } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { transactionToEvents } from '../../src/editor/capture';

function makeTr(doc: string, changes: any, userEvent?: string): Transaction {
  const state = EditorState.create({ doc });
  return state.update({ changes, userEvent });
}

describe('transactionToEvents', () => {
  it('maps a typed insertion to an input EditEvent', () => {
    const tr = makeTr('ab', { from: 2, insert: 'c' }, 'input.type');
    const events = transactionToEvents(tr, 0, 5000);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ seq: 0, from: 2, to: 2, text: 'c', source: 'input' });
  });

  it('maps a paste to a paste EditEvent', () => {
    const tr = makeTr('', { from: 0, insert: 'pasted' }, 'input.paste');
    const events = transactionToEvents(tr, 3, 5000);
    expect(events[0]).toMatchObject({ seq: 3, text: 'pasted', source: 'paste' });
  });

  it('maps a deletion, capturing removed text', () => {
    const tr = makeTr('hello', { from: 1, to: 3 }, 'delete.backward');
    const events = transactionToEvents(tr, 0, 5000);
    expect(events[0]).toMatchObject({ from: 1, to: 3, text: '', removed: 'el', source: 'delete' });
  });
});
