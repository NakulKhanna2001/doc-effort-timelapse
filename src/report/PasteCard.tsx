import type { EditEvent } from '../events/types';
import { formatDateTime } from '../format';

export function PasteCard({ events }: { events: EditEvent[] }) {
  const pastes = events.filter((e) => e.source === 'paste');

  if (pastes.length === 0) {
    return <p className="muted">No paste events detected — nice!</p>;
  }

  return (
    <table className="data" data-testid="paste-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Characters</th>
          <th>Preview</th>
        </tr>
      </thead>
      <tbody>
        {pastes.map((e) => {
          const preview = e.text.length > 60 ? e.text.slice(0, 60) + '…' : e.text;
          return (
            <tr key={e.seq} data-testid="paste-row">
              <td>{formatDateTime(e.t)}</td>
              <td>{e.len}</td>
              <td><code>{preview}</code></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
