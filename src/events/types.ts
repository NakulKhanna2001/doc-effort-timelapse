export type EditSource = 'input' | 'paste' | 'ime' | 'undo' | 'delete' | 'other';

export interface EditEvent {
  seq: number;
  t: number;
  from: number;
  to: number;
  text: string;
  removed: string;
  source: EditSource;
  len: number;
}

export interface DocumentHistory {
  docId: string;
  createdAt: number;
  events: EditEvent[];
}

export function makeEvent(
  e: Omit<EditEvent, 'len' | 'removed'> & { removed?: string },
): EditEvent {
  return { ...e, removed: e.removed ?? '', len: e.text.length };
}
