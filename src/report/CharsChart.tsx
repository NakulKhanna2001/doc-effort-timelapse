import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Area,
  Bar,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { EditEvent } from '../events/types';
import { computeTimeline, type TimelinePoint } from '../analysis/timeline';
import { formatDateTime, formatTime, formatDuration } from '../format';

/** Returns the real epoch `t` of the point whose activeT is closest to the given value. */
export function nearestPointT(points: TimelinePoint[], activeT: number): number {
  if (points.length === 0) return 0;
  let best = points[0];
  let bestDist = Math.abs(points[0].activeT - activeT);
  for (let i = 1; i < points.length; i++) {
    const dist = Math.abs(points[i].activeT - activeT);
    if (dist < bestDist) {
      bestDist = dist;
      best = points[i];
    }
  }
  return best.t;
}

export function CharsChart({ events }: { events: EditEvent[] }) {
  const { points, pauses } = computeTimeline(events, { idleThresholdMs: 30000 });

  if (events.length === 0 || points.length < 2) {
    return <p className="muted">Not enough activity to chart yet.</p>;
  }

  return (
    <div data-testid="chars-chart">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={points}>
          <XAxis
            dataKey="activeT"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => formatTime(nearestPointT(points, v))}
            fontSize={11}
          />
          <YAxis fontSize={11} label={{ value: 'Characters', angle: -90, position: 'insideLeft', fontSize: 11, offset: 10 }} />
          <Area
            dataKey="docLen"
            name="Document length"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.15}
            dot={false}
            isAnimationActive={false}
          />
          <Bar
            dataKey="added"
            name="Added"
            fill="#16a34a"
            isAnimationActive={false}
          />
          <Bar
            dataKey="removed"
            name="Removed"
            fill="#dc2626"
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
        </ComposedChart>
      </ResponsiveContainer>
      {pauses.length > 0 && (
        <p className="muted">
          Breaks compressed: {pauses.map(p => formatDuration(p.durationMs)).join(', ')}
        </p>
      )}
    </div>
  );
}
