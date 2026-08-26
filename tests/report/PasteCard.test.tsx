import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { PasteCard } from '../../src/report/PasteCard';
import { formatDateTime } from '../../src/format';

describe('PasteCard', () => {
  it('shows empty message when no paste events', () => {
    const events = [
      makeEvent({ seq: 0, t: 1000, from: 0, to: 0, text: 'hello', source: 'input' }),
    ];
    render(<PasteCard events={events} />);
    expect(screen.getByText('No paste events detected — nice!')).toBeTruthy();
    expect(screen.queryByTestId('paste-table')).toBeNull();
  });

  it('shows a row per paste event with correct columns', () => {
    const longText = 'a'.repeat(80);
    const events = [
      makeEvent({ seq: 0, t: 1609459200000, from: 0, to: 0, text: longText, source: 'paste' }),
    ];
    render(<PasteCard events={events} />);

    const table = screen.getByTestId('paste-table');
    expect(table).toBeTruthy();

    const rows = screen.getAllByTestId('paste-row');
    expect(rows).toHaveLength(1);

    const rowText = rows[0].textContent ?? '';
    expect(rowText).toContain(formatDateTime(1609459200000));
    expect(rowText).toContain('80');
    // Preview: first 60 chars + '…'
    expect(rowText).toContain('a'.repeat(60) + '…');
  });
});
