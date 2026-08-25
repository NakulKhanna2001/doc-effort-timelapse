import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { reconstruct } from '../../src/events/reconstruct';
import { formatDateTime, formatDuration, countWords } from '../../src/format';
import { SummaryCard } from '../../src/report/SummaryCard';

// events: type 'Hello ' at t=0 (seq0), type 'world. ' at t=1000 (seq1), paste 'Copied text!' at t=2000 (seq2)
// from = running length; to = from (appending)
const fixture = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'Hello ', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 6, to: 6, text: 'world. ', source: 'input' }),
  makeEvent({ seq: 2, t: 2000, from: 13, to: 13, text: 'Copied text!', source: 'paste' }),
];

describe('SummaryCard', () => {
  it('renders summary-words with the correct word count', () => {
    render(<SummaryCard events={fixture} />);
    const finalText = reconstruct(fixture);
    const expected = String(countWords(finalText));
    expect(screen.getByTestId('summary-words').textContent).toContain(expected);
  });

  it('renders summary-chars with the correct character count', () => {
    render(<SummaryCard events={fixture} />);
    const finalText = reconstruct(fixture);
    expect(screen.getByTestId('summary-chars').textContent).toContain(String(finalText.length));
  });

  it('renders summary-first-edit with the formatted first timestamp', () => {
    render(<SummaryCard events={fixture} />);
    expect(screen.getByTestId('summary-first-edit').textContent).toContain(formatDateTime(0));
  });

  it('renders summary-last-edit with the formatted last timestamp', () => {
    render(<SummaryCard events={fixture} />);
    expect(screen.getByTestId('summary-last-edit').textContent).toContain(formatDateTime(2000));
  });

  it('renders summary-active-time with the formatted active duration', () => {
    render(<SummaryCard events={fixture} />);
    // totalActiveMs: gap 0→1000 (1000ms) + gap 1000→2000 (1000ms) = 2000ms
    expect(screen.getByTestId('summary-active-time').textContent).toContain(formatDuration(2000));
  });

  it('renders "—" for WPM when active time is too short to be meaningful', () => {
    // fixture has only 2s of active time — below the 5s minimum
    render(<SummaryCard events={fixture} />);
    expect(screen.getByTestId('summary-wpm').textContent).toBe('—');
  });

  it('renders a sane numeric WPM once there is enough active time', () => {
    // 100 typed chars over 60s of active time → (100/5)/1min = 20 WPM
    const events = Array.from({ length: 11 }, (_, i) =>
      makeEvent({ seq: i, t: i * 6000, from: i * 10, to: i * 10, text: i < 10 ? 'abcdefghij' : '', source: 'input' }),
    ).slice(0, 10);
    render(<SummaryCard events={events} />);
    const wpm = parseInt(screen.getByTestId('summary-wpm').textContent ?? '', 10);
    expect(wpm).toBeGreaterThan(0);
    expect(wpm).toBeLessThan(300);
  });

  it('renders "No activity yet." when events is empty', () => {
    render(<SummaryCard events={[]} />);
    expect(screen.getByText('No activity yet.')).toBeTruthy();
  });
});
