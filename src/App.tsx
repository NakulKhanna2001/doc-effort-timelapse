import { useMemo, useState } from 'react';
import { IndexedDbStore } from './storage/IndexedDbStore';
import { Editor } from './editor/Editor';
import { Report } from './report/Report';
import type { EditEvent } from './events/types';

export default function App() {
  const store = useMemo(() => new IndexedDbStore(), []);
  const [events, setEvents] = useState<EditEvent[]>([]);
  useMemo(() => void store.create('doc1'), [store]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Doc Effort Timelapse</h1>
        <p>See how your document was written — history, charts, and authenticity signals</p>
      </header>
      <section className="card">
        <h2>Editor</h2>
        <p className="sub">Type or paste below — every edit is recorded</p>
        <Editor docId="doc1" store={store} />
        <div className="editor-actions">
          <button className="btn-primary" onClick={async () => setEvents(await store.read('doc1'))}>Generate report</button>
        </div>
      </section>
      {events.length > 0 && <Report events={events} />}
    </div>
  );
}
