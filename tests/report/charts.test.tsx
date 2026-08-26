import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { formatDuration } from '../../src/format';
import { CharsChart, nearestPointT } from '../../src/report/CharsChart';
import { SpeedChart } from '../../src/report/SpeedChart';
import type { TimelinePoint } from '../../src/analysis/timeline';

// ── nearestPointT unit tests ──────────────────────────────────────────────────

const threePoints: TimelinePoint[] = [
  { activeT: 0, t: 10, docLen: 1, added: 1, removed: 0, wpm: 0 },
  { activeT: 1000, t: 1010, docLen: 2, added: 1, removed: 0, wpm: 60 },
  { activeT: 2000, t: 600010, docLen: 3, added: 1, removed: 0, wpm: 60 },
];

describe('nearestPointT', () => {
  it('returns t of the point whose activeT is closest (900 → 1010)', () => {
    expect(nearestPointT(threePoints, 900)).toBe(1010);
  });

  it('returns t of exact match (2000 → 600010)', () => {
    expect(nearestPointT(threePoints, 2000)).toBe(600010);
  });
});

// ── Fixture helpers ───────────────────────────────────────────────────────────

/** Two close events then a long pause (>30s), creating a visible break. */
const pauseFixture = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'hello world', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 11, to: 11, text: ' typing more text here', source: 'input' }),
  // 599 second gap → idleThreshold 30000ms → pause of 599000ms
  makeEvent({ seq: 2, t: 600000, from: 33, to: 33, text: ' after a long break', source: 'input' }),
];

// ── CharsChart tests ──────────────────────────────────────────────────────────

describe('CharsChart', () => {
  it('shows empty guard when events is empty', () => {
    render(<CharsChart events={[]} />);
    expect(screen.getByText('Not enough activity to chart yet.')).toBeTruthy();
  });

  it('shows empty guard when only 1 event (< 2 points)', () => {
    const singleEvent = [makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'a', source: 'input' })];
    render(<CharsChart events={singleEvent} />);
    expect(screen.getByText('Not enough activity to chart yet.')).toBeTruthy();
  });

  it('renders chars-chart testid with pause fixture', () => {
    render(
      <div style={{ width: 800, height: 300 }}>
        <CharsChart events={pauseFixture} />
      </div>
    );
    expect(screen.getByTestId('chars-chart')).toBeTruthy();
  });

  it('shows "Breaks compressed" text with the correct pause duration', () => {
    render(
      <div style={{ width: 800, height: 300 }}>
        <CharsChart events={pauseFixture} />
      </div>
    );
    // The gap from t=1000 to t=600000 is 599000ms
    const breaksText = screen.getByText(/Breaks compressed:/);
    expect(breaksText.textContent).toContain(formatDuration(599000));
  });
});

// ── SpeedChart tests ──────────────────────────────────────────────────────────

describe('SpeedChart', () => {
  it('shows empty guard when events is empty', () => {
    render(<SpeedChart events={[]} />);
    expect(screen.getByText('Not enough activity to chart yet.')).toBeTruthy();
  });

  it('renders speed-chart testid with pause fixture', () => {
    render(
      <div style={{ width: 800, height: 300 }}>
        <SpeedChart events={pauseFixture} />
      </div>
    );
    expect(screen.getByTestId('speed-chart')).toBeTruthy();
  });
});
