import type { EditEvent } from '../events/types';
import { reconstruct } from '../events/reconstruct';
import { computeMetrics } from '../analysis/metrics';
import { detectSessions } from '../analysis/sessions';
import { formatDateTime, formatDuration, countWords, countSentences } from '../format';

const IDLE_THRESHOLD_MS = 30000;

export function SummaryCard({ events }: { events: EditEvent[] }) {
  if (events.length === 0) {
    return <p>No activity yet.</p>;
  }

  const finalText = reconstruct(events);
  const metrics = computeMetrics(events, { idleThresholdMs: IDLE_THRESHOLD_MS });
  const sessions = detectSessions(events, IDLE_THRESHOLD_MS);

  const words = countWords(finalText);
  const chars = finalText.length;
  const sentences = countSentences(finalText);
  const wpm =
    sessions.totalActiveMs === 0
      ? 0
      : Math.round((metrics.typedChars / 5) / (sessions.totalActiveMs / 60000));

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="value" data-testid="summary-words">{words}</div>
          <div className="label">Total words</div>
        </div>
        <div className="stat">
          <div className="value" data-testid="summary-chars">{chars}</div>
          <div className="label">Total characters</div>
        </div>
        <div className="stat">
          <div className="value" data-testid="summary-sentences">{sentences}</div>
          <div className="label">Total sentences</div>
        </div>
        <div className="stat">
          <div className="value" data-testid="summary-wpm">{wpm}</div>
          <div className="label">Avg typing speed (WPM)</div>
        </div>
        <div className="stat">
          <div className="value">{events.length}</div>
          <div className="label">Events captured</div>
        </div>
        <div className="stat">
          <div className="value">{metrics.pasteCount}</div>
          <div className="label">Pastes</div>
        </div>
      </div>
      <p className="muted">
        <span data-testid="summary-first-edit">First edit: {formatDateTime(events[0].t)}</span>
        <br />
        <span data-testid="summary-last-edit">Last edit: {formatDateTime(events[events.length - 1].t)}</span>
        <br />
        <span data-testid="summary-active-time">Total active writing time: {formatDuration(sessions.totalActiveMs)}</span>
      </p>
    </>
  );
}
