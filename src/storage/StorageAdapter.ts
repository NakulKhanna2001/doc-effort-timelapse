import type { EditEvent } from '../events/types';

export interface StorageAdapter {
  create(docId: string): Promise<void>;
  append(docId: string, event: EditEvent): Promise<void>;
  read(docId: string): Promise<EditEvent[]>;
  list(): Promise<string[]>;
}
