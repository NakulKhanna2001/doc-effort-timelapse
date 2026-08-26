import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { Playback } from '../../src/playback/Playback';
import { formatTime, formatDuration } from '../../src/format';

const events = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'ab', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 2, to: 2, text: 'c', source: 'input' }),
];

afterEach(() => {
  vi.useRealTimers();
});

describe('Playback', () => {
  it('renders the reconstructed doc at the scrub position', () => {
    render(<Playback events={events} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByTestId('playback-doc').textContent).toBe('ab');
    fireEvent.change(slider, { target: { value: '1' } });
    expect(screen.getByTestId('playback-doc').textContent).toBe('abc');
  });

  it('shows timestamp bar with gap when scrubbed to pos > 0', () => {
    const fixtureEvents = [
      makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'x', source: 'input' }),
      makeEvent({ seq: 1, t: 5000, from: 1, to: 1, text: 'y', source: 'input' }),
    ];
    render(<Playback events={fixtureEvents} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1' } });
    const timesBar = screen.getByTestId('playback-times');
    expect(timesBar.textContent).toContain(formatTime(5000));
    expect(timesBar.textContent).toContain(formatDuration(5000));
  });

  it('play advances through events and stops at end', async () => {
    vi.useFakeTimers();
    const fixtureEvents = [
      makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'a', source: 'input' }),
      makeEvent({ seq: 1, t: 100, from: 1, to: 1, text: 'b', source: 'input' }),
      makeEvent({ seq: 2, t: 200, from: 2, to: 2, text: 'c', source: 'input' }),
    ];
    render(<Playback events={fixtureEvents} />);

    // Scrub to start
    const slider = screen.getByRole('slider');
    act(() => {
      fireEvent.change(slider, { target: { value: '0' } });
    });

    // Click play
    const playBtn = screen.getByTestId('playback-play');
    act(() => {
      fireEvent.click(playBtn);
    });

    // Advance timers step by step to allow React state updates between steps
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
    }

    // Should be at the last event, showing full text
    expect(screen.getByTestId('playback-doc').textContent).toBe('abc');
    // Button should be back to play (stopped)
    expect(screen.getByTestId('playback-play').textContent).toBe('▶ Play');
  });
});
