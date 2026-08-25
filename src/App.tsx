import { useMemo, useState } from 'react';
import { MemoryStore } from './storage/MemoryStore';
import { Editor } from './editor/Editor';
import { Playback } from './playback/Playback';
import type { EditEvent } from './events/types';

export default function App() {
  const store = useMemo(() => new MemoryStore(), []);
  const [events, setEvents] = useState<EditEvent[]>([]);
  useMemo(() => void store.create('doc1'), [store]);

  return (
    <div>
      <Editor docId="doc1" store={store} />
      <button onClick={async () => setEvents(await store.read('doc1'))}>Load timelapse</button>
      {events.length > 0 && <Playback events={events} />}
    </div>
  );
}
