import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { formatDateTime, formatDuration } from '../../src/format';
import { SessionsCard } from '../../src/report/SessionsCard';

// Two sessions separated by a gap > 30000ms
// Session 1: t=0 and t=1000, Session 2: t=120000
// Break: from t=1000 to t=120000 = 119000ms
const fixture = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'a', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 1, to: 1, text: 'b', source: 'input' }),
  makeEvent({ seq: 2, t: 120000, from: 2, to: 2, text: 'c', source: 'input' }),
];

describe('SessionsCard', () => {
  it('renders 2 session rows and 1 break row', () => {
    render(<SessionsCard events={fixture} />);
    const sessionRows = screen.getAllByTestId('session-row');
    const breakRows = screen.getAllByTestId('break-row');
    expect(sessionRows).toHaveLength(2);
    expect(breakRows).toHaveLength(1);
  });

  it('break row contains the formatted duration (119000ms)', () => {
    render(<SessionsCard events={fixture} />);
    const breakRow = screen.getByTestId('break-row');
    expect(breakRow.textContent).toContain(formatDuration(119000));
  });

  it('first session row contains formatDateTime of first event timestamp', () => {
    render(<SessionsCard events={fixture} />);
    const sessionRows = screen.getAllByTestId('session-row');
    expect(sessionRows[0].textContent).toContain(formatDateTime(0));
  });

  it('renders a sessions table', () => {
    render(<SessionsCard events={fixture} />);
    expect(screen.getByTestId('sessions-table')).toBeTruthy();
  });

  it('renders "No activity yet." when events is empty', () => {
    render(<SessionsCard events={[]} />);
    expect(screen.getByText('No activity yet.')).toBeTruthy();
  });
});
