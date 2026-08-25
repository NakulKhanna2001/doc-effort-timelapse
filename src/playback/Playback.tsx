import { useState } from 'react';
import type { EditEvent } from '../events/types';
import { reconstruct } from '../events/reconstruct';
import { computeMetrics } from '../analysis/metrics';

export function Playback({ events }: { events: EditEvent[] }) {
  const [pos, setPos] = useState(events.length - 1);
  const doc = reconstruct(events, pos);
  const metrics = computeMetrics(events.slice(0, pos + 1), { idleThresholdMs: 30000 });

  return (
    <div>
      <input
        role="slider"
        type="range"
        min={0}
        max={events.length - 1}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
      />
      <pre data-testid="playback-doc">{doc}</pre>
      <div data-testid="playback-stats">
        typed: {metrics.typedChars} · pasted: {metrics.pastedChars}
      </div>
    </div>
  );
}
