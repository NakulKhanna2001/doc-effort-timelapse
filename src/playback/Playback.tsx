import { useState, useEffect } from 'react';
import type { EditEvent } from '../events/types';
import { reconstruct } from '../events/reconstruct';
import { computeMetrics } from '../analysis/metrics';
import { formatDateTime, formatTime, formatDuration } from '../format';

export function Playback({ events }: { events: EditEvent[] }) {
  const [pos, setPos] = useState(events.length > 0 ? events.length - 1 : 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;

    // If at end, restart from beginning
    let current = pos;
    if (current >= events.length - 1) {
      setPos(0);
      return;
    }

    const gap = events[current + 1].t - events[current].t;
    const delay = Math.max(30, Math.min(gap, 2000) / speed);

    const id = setTimeout(() => {
      const next = current + 1;
      setPos(next);
      if (next >= events.length - 1) {
        setPlaying(false);
      }
    }, delay);

    return () => clearTimeout(id);
  }, [playing, pos, speed, events]);

  if (events.length === 0) {
    return <p>No activity yet.</p>;
  }

  const doc = reconstruct(events, pos);
  const metrics = computeMetrics(events.slice(0, pos + 1), { idleThresholdMs: 30000 });

  const handlePlayPause = () => {
    setPlaying((p) => !p);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button
          data-testid="playback-play"
          className="btn-primary"
          onClick={handlePlayPause}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <select
          data-testid="playback-speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          <option value={0.2}>0.2x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
        <input
          role="slider"
          type="range"
          min={0}
          max={events.length - 1}
          value={pos}
          onChange={(e) => {
            setPlaying(false);
            setPos(Number(e.target.value));
          }}
          style={{ flex: 1 }}
        />
      </div>
      <div data-testid="playback-times" className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
        {pos === 0
          ? `First edit: ${formatDateTime(events[0].t)}`
          : `Previous edit: ${formatDateTime(events[pos - 1].t)} | This edit: ${formatTime(events[pos].t)} | Gap: ${formatDuration(events[pos].t - events[pos - 1].t)}`}
      </div>
      <pre data-testid="playback-doc" style={{ whiteSpace: 'pre-wrap' }}>{doc}</pre>
      <div data-testid="playback-stats">
        typed: {metrics.typedChars} · pasted: {metrics.pastedChars}
      </div>
    </div>
  );
}
