import type { EditEvent } from './types';

export function applyEvent(text: string, e: EditEvent): string {
  return text.slice(0, e.from) + e.text + text.slice(e.to);
}

/** Rebuild the document after applying events 0..upTo (inclusive). */
export function reconstruct(events: EditEvent[], upTo?: number): string {
  const end = upTo === undefined ? events.length - 1 : upTo;
  let text = '';
  for (let i = 0; i <= end; i++) text = applyEvent(text, events[i]);
  return text;
}
