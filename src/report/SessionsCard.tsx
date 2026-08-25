import type { EditEvent } from '../events/types';
import { detectSessions } from '../analysis/sessions';
import { formatDateTime, formatDuration } from '../format';

const IDLE_THRESHOLD_MS = 30000;

export function SessionsCard({ events }: { events: EditEvent[] }) {
  if (events.length === 0) {
    return <p>No activity yet.</p>;
  }

  const { sessions, breaks } = detectSessions(events, IDLE_THRESHOLD_MS);

  // Build interleaved rows: session 0, break 0 (if afterSessionIndex 0), session 1, break 1, ...
  type Row =
    | { kind: 'session'; startT: number; durationMs: number; eventCount: number }
    | { kind: 'break'; startT: number; durationMs: number };

  const rows: Row[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    rows.push({ kind: 'session', startT: s.startT, durationMs: s.durationMs, eventCount: s.eventCount });
    const brk = breaks.find((b) => b.afterSessionIndex === i);
    if (brk) {
      rows.push({ kind: 'break', startT: brk.startT, durationMs: brk.durationMs });
    }
  }

  return (
    <table className="data" data-testid="sessions-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Started</th>
          <th>Duration</th>
          <th>Events</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) =>
          row.kind === 'session' ? (
            <tr key={idx} data-testid="session-row">
              <td style={{ color: '#16a34a' }}>&#9679; Editing session</td>
              <td>{formatDateTime(row.startT)}</td>
              <td>{formatDuration(row.durationMs)}</td>
              <td>{row.eventCount}</td>
            </tr>
          ) : (
            <tr key={idx} data-testid="break-row">
              <td style={{ color: '#98a2b3' }}>&#9679; Break</td>
              <td>{formatDateTime(row.startT)}</td>
              <td>{formatDuration(row.durationMs)}</td>
              <td>&#8212;</td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}
