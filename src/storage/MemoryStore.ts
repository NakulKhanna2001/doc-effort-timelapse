import type { EditEvent } from '../events/types';
import type { StorageAdapter } from './StorageAdapter';

export class MemoryStore implements StorageAdapter {
  private docs = new Map<string, EditEvent[]>();

  async create(docId: string): Promise<void> {
    if (!this.docs.has(docId)) this.docs.set(docId, []);
  }
  async append(docId: string, event: EditEvent): Promise<void> {
    const events = this.docs.get(docId) ?? [];
    events.push(event);
    this.docs.set(docId, events);
  }
  async read(docId: string): Promise<EditEvent[]> {
    return [...(this.docs.get(docId) ?? [])];
  }
  async list(): Promise<string[]> {
    return [...this.docs.keys()];
  }
}
