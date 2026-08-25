import { useEffect, useRef } from 'react';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView, placeholder } from '@codemirror/view';
import type { StorageAdapter } from '../storage/StorageAdapter';
import { transactionToEvents } from './capture';

interface EditorProps {
  docId: string;
  store: StorageAdapter;
}

export function Editor({ docId, store }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const view = new EditorView({
      parent: ref.current,
      state: EditorState.create({
        doc: '',
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
    return () => view.destroy();
  }, [docId, store]);

  return <div ref={ref} className="cm-editor-host" />;
}
