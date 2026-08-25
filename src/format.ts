/**
 * Formatting helpers for dates, durations, and text statistics.
 */

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

/** e.g. "May 11, 2025, 10:13:16 PM" */
export function formatDateTime(t: number): string {
  return DATE_TIME_FMT.format(t);
}

/** e.g. "10:13:16 PM" */
export function formatTime(t: number): string {
  return TIME_FMT.format(t);
}

/**
 * Human-readable duration.
 *
 * - < 60 s  → "N sec"
 * - < 3600 s → "M min" | "M min S sec"
 * - >= 3600 s → "H hr" | "H hr M min"
 * - 0 ms     → "0 sec"
 */
export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours >= 1) {
    if (minutes === 0) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
  }

  if (minutes >= 1) {
    if (seconds === 0) return `${minutes} min`;
    return `${minutes} min ${seconds} sec`;
  }

  return `${seconds} sec`;
}

/**
 * Count words by splitting on whitespace.
 * Empty or whitespace-only strings → 0.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Count sentences ended by [.!?]+.
 * Text with words but no terminal punctuation counts as 1 sentence.
 * Empty / whitespace-only → 0.
 */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;

  // Split on one-or-more terminal punctuation followed by whitespace or end-of-string.
  const chunks = trimmed.split(/[.!?]+(?:\s|$)/);

  // Count delimiters found + whether a trailing non-empty chunk exists.
  const delimiters = trimmed.match(/[.!?]+(?:\s|$)/g);
  if (!delimiters) {
    // No terminal punctuation at all but has words → 1 sentence.
    return 1;
  }

  // Each delimiter closes a sentence; trailing non-empty chunk (no terminal punct) adds 1.
  const trailingChunk = chunks[chunks.length - 1];
  const hasTrailing = /\S/.test(trailingChunk ?? '');
  return delimiters.length + (hasTrailing ? 1 : 0);
}
