import { useEffect, useRef } from 'react';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView, placeholder } from '@codemirror/view';
import type { StorageAdapter } from '../storage/StorageAdapter';
import { transactionToEvents } from './capture';
import { reconstruct } from '../events/reconstruct';

interface EditorProps {
  docId: string;
  store: StorageAdapter;
}

export function Editor({ docId, store }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    let view: EditorView | undefined;

    (async () => {
      const existing = await store.read(docId);
      if (disposed || !ref.current) return;
      seqRef.current = existing.length ? existing[existing.length - 1].seq + 1 : 0;
      view = new EditorView({
        parent: ref.current,
        state: EditorState.create({
          doc: reconstruct(existing),
          extensions: [
            EditorView.theme({
              '&': {
                border: '1px solid #bbb',
                borderRadius: '4px',
                minHeight: '240px',
                fontSize: '14px',
              },
              '.cm-content': { minHeight: '240px', padding: '8px' },
              '&.cm-focused': { outline: '2px solid #4a90d9' },
            }),
            placeholder('Start typing or paste text here…'),
            EditorView.lineWrapping,
            EditorView.updateListener.of((u) => {
              for (const tr of u.transactions) {
                const events = transactionToEvents(tr as Transaction, seqRef.current, Date.now());
                for (const e of events) {
                  seqRef.current = e.seq + 1;
                  void store.append(docId, e);
                }
              }
            }),
          ],
        }),
      });
      (ref.current as any)._cmView = view; // test hook
    })();

    return () => {
      disposed = true;
      view?.destroy();
    };
  }, [docId, store]);

  return <div ref={ref} className="cm-editor-host" />;
}
