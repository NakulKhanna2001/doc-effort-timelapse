import type { EditEvent, EditSource } from './types';

export interface BlameChar {
  seq: number;
  t: number;
  source: EditSource;
}

/** For each character in the final document, which event created it. */
export function buildBlame(events: EditEvent[]): BlameChar[] {
  let chars: BlameChar[] = [];
  for (const e of events) {
    const inserted: BlameChar[] = [...e.text].map(() => ({
      seq: e.seq,
      t: e.t,
      source: e.source,
    }));
    chars = [...chars.slice(0, e.from), ...inserted, ...chars.slice(e.to)];
  }
  return chars;
}
