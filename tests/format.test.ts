import { describe, it, expect } from 'vitest';
import {
  formatDateTime,
  formatTime,
  formatDuration,
  countWords,
  countSentences,
} from '../src/format';

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------
describe('formatDateTime', () => {
  const t = new Date(2025, 4, 11, 22, 13, 16).getTime(); // May 11 2025 22:13:16 local

  it('matches the expected Intl string', () => {
    const expected = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(t);
    expect(formatDateTime(t)).toBe(expected);
  });

  it('has the right shape', () => {
    // e.g. "May 11, 2025, 10:13:16 PM"
    expect(formatDateTime(t)).toMatch(/\d{1,2}:\d{2}:\d{2} (AM|PM)/);
  });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------
describe('formatTime', () => {
  const t = new Date(2025, 4, 11, 22, 13, 16).getTime();

  it('matches the expected Intl string', () => {
    const expected = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(t);
    expect(formatTime(t)).toBe(expected);
  });

  it('has the right shape', () => {
    expect(formatTime(t)).toMatch(/\d{1,2}:\d{2}:\d{2} (AM|PM)/);
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  it('0 ms → "0 sec"', () => {
    expect(formatDuration(0)).toBe('0 sec');
  });

  it('5000 ms → "5 sec"', () => {
    expect(formatDuration(5000)).toBe('5 sec');
  });

  it('60000 ms → "1 min"', () => {
    expect(formatDuration(60000)).toBe('1 min');
  });

  it('2301000 ms → "38 min 21 sec"', () => {
    expect(formatDuration(2301000)).toBe('38 min 21 sec');
  });

  it('3720000 ms → "1 hr 2 min"', () => {
    expect(formatDuration(3720000)).toBe('1 hr 2 min');
  });

  it('3600000 ms (exactly 1 hr, 0 min) → "1 hr"', () => {
    expect(formatDuration(3600000)).toBe('1 hr');
  });

  it('sub-second rounds to 0 → "0 sec"', () => {
    expect(formatDuration(400)).toBe('0 sec');
  });
});

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------
describe('countWords', () => {
  it("'' → 0", () => {
    expect(countWords('')).toBe(0);
  });

  it('"  " (whitespace only) → 0', () => {
    expect(countWords('  ')).toBe(0);
  });

  it('"hello world" → 2', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('leading/trailing spaces are ignored', () => {
    expect(countWords('  foo bar baz  ')).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// countSentences
// ---------------------------------------------------------------------------
describe('countSentences', () => {
  it("'' → 0", () => {
    expect(countSentences('')).toBe(0);
  });

  it('"One. Two! Three?" → 3', () => {
    expect(countSentences('One. Two! Three?')).toBe(3);
  });

  it('"no punctuation" → 1', () => {
    expect(countSentences('no punctuation')).toBe(1);
  });

  it('whitespace-only → 0', () => {
    expect(countSentences('   ')).toBe(0);
  });

  it('multiple terminal punctuation grouped → counts once', () => {
    expect(countSentences('Really?! Yes.')).toBe(2);
  });
});
