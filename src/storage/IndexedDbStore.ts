import type { EditEvent } from '../events/types';
import type { StorageAdapter } from './StorageAdapter';

export class IndexedDbStore implements StorageAdapter {
  private dbPromise?: Promise<IDBDatabase>;

  constructor(private dbName = 'doc-timelapse') {}

  // Opened once and cached: per-append opens widened the window in which a
  // page unload could drop not-yet-committed events.
  private open(): Promise<IDBDatabase> {
    return (this.dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('events', { keyPath: ['docId', 'seq'] });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  async create(_docId?: string): Promise<void> {
    await this.open();
  }

  async append(docId: string, event: EditEvent): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      tx.objectStore('events').put({ docId, ...event });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async read(docId: string): Promise<EditEvent[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const range = IDBKeyRange.bound([docId, -Infinity], [docId, Infinity]);
      const req = tx.objectStore('events').getAll(range);
      req.onsuccess = () => resolve(req.result.map(({ docId: _d, ...e }) => e as EditEvent));
      req.onerror = () => reject(req.error);
    });
  }

  async list(): Promise<string[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const req = tx.objectStore('events').getAll();
      req.onsuccess = () => resolve([...new Set(req.result.map((r) => r.docId as string))]);
      req.onerror = () => reject(req.error);
    });
  }
}
