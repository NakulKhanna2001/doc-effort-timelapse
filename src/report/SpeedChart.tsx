import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { EditEvent } from '../events/types';
import { computeTimeline } from '../analysis/timeline';
import { formatDateTime, formatTime, formatDuration } from '../format';
import { nearestPointT } from './CharsChart';

export function SpeedChart({ events }: { events: EditEvent[] }) {
  const { points, pauses } = computeTimeline(events, { idleThresholdMs: 30000 });

  if (events.length === 0 || points.length < 2) {
    return <p className="muted">Not enough activity to chart yet.</p>;
  }

  return (
    <div data-testid="speed-chart">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points}>
          <XAxis
            dataKey="activeT"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => formatTime(nearestPointT(points, v))}
            fontSize={11}
          />
          <YAxis fontSize={11} label={{ value: 'WPM', angle: -90, position: 'insideLeft', fontSize: 11, offset: 10 }} />
          <Line
            dataKey="wpm"
            name="Words per minute"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
          <Tooltip
            labelFormatter={(v) => formatDateTime(nearestPointT(points, Number(v)))}
          />
          <Legend />
          {pauses.map((p, i) => (
            <ReferenceLine
              key={i}
              x={p.activeT}
              stroke="#98a2b3"
              strokeDasharray="4 4"
              label={{ value: formatDuration(p.durationMs) + ' pause', fontSize: 11, fill: '#667085', position: 'top' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {pauses.length > 0 && (
        <p className="muted">
          Breaks compressed: {pauses.map(p => formatDuration(p.durationMs)).join(', ')}
        </p>
      )}
    </div>
  );
}
