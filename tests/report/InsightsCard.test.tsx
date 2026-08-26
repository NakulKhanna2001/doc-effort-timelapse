import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { InsightsCard } from '../../src/report/InsightsCard';

const fixture = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'hello', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 5, to: 5, text: ' world', source: 'input' }),
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InsightsCard', () => {
  it('renders the generate button', () => {
    render(<InsightsCard events={fixture} />);
    expect(screen.getByTestId('ai-generate')).toBeTruthy();
    expect(screen.getByTestId('ai-generate').textContent).toContain('Generate AI insights');
  });

  it('shows the ai-report on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ report: 'Great writing process!' }),
    }));

    render(<InsightsCard events={fixture} />);
    fireEvent.click(screen.getByTestId('ai-generate'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-report').textContent).toContain('Great writing process!');
    });
  });

  it('shows the ai-error when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<InsightsCard events={fixture} />);
    fireEvent.click(screen.getByTestId('ai-generate'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-error')).toBeTruthy();
      expect(screen.getByTestId('ai-error').textContent).toContain('Insights server not reachable');
    });
  });
});
