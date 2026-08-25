import { Transaction } from '@codemirror/state';
import { makeEvent, type EditEvent, type EditSource } from '../events/types';

function classify(userEvent: string | undefined): EditSource {
  if (!userEvent) return 'other';
  if (userEvent.startsWith('input.paste')) return 'paste';
  if (userEvent.startsWith('input')) return 'input';
  if (userEvent.startsWith('delete')) return 'delete';
  if (userEvent.startsWith('undo') || userEvent.startsWith('redo')) return 'undo';
  return 'other';
}

/** Convert one CodeMirror transaction into zero or more EditEvents. */
export function transactionToEvents(tr: Transaction, startSeq: number, t: number): EditEvent[] {
  if (!tr.docChanged) return [];
  const source = classify(tr.annotation(Transaction.userEvent));
  const events: EditEvent[] = [];
  let seq = startSeq;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    events.push(
      makeEvent({
        seq: seq++,
        t,
        from: fromA,
        to: toA,
        text: inserted.toString(),
        removed: tr.startState.doc.sliceString(fromA, toA),
        source: toA > fromA && inserted.length === 0 ? 'delete' : source,
      }),
    );
  });
  return events;
}
