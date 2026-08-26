import type { EditEvent } from '../events/types';
import { computeMetrics, type Metrics, type MetricsOptions } from '../analysis/metrics';
import { effortScore } from '../analysis/effort';
import { detectSessions } from '../analysis/sessions';

export interface InsightPayload {
  metrics: Metrics;
  effortScore: number;
  pasteEvents: { seq: number; t: number; size: number }[];
  durationMs: number;
  sessions: { count: number; totalActiveMs: number; longestBreakMs: number };
}

export function buildInsightPayload(events: EditEvent[], opts: MetricsOptions): InsightPayload {
  const metrics = computeMetrics(events, opts);
  const pasteEvents = events
    .filter((e) => e.source === 'paste')
    .map((e) => ({ seq: e.seq, t: e.t, size: e.len }));
  const durationMs = events.length ? events[events.length - 1].t - events[0].t : 0;
  const { sessions, breaks, totalActiveMs } = detectSessions(events, opts.idleThresholdMs);
  const longestBreakMs = breaks.length > 0 ? Math.max(...breaks.map((b) => b.durationMs)) : 0;
  return {
    metrics,
    effortScore: effortScore(metrics),
    pasteEvents,
    durationMs,
    sessions: { count: sessions.length, totalActiveMs, longestBreakMs },
  };
}
