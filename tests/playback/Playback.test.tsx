import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { Playback } from '../../src/playback/Playback';

const events = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'ab', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 2, to: 2, text: 'c', source: 'input' }),
];

describe('Playback', () => {
  it('renders the reconstructed doc at the scrub position', () => {
    render(<Playback events={events} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByTestId('playback-doc').textContent).toBe('ab');
    fireEvent.change(slider, { target: { value: '1' } });
    expect(screen.getByTestId('playback-doc').textContent).toBe('abc');
  });
});
