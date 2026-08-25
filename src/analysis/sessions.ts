import type { EditEvent } from '../events/types';

export interface Session {
  startT: number;
  endT: number;
  durationMs: number;
  eventCount: number;
}

export interface Break {
  afterSessionIndex: number;
  startT: number;
  durationMs: number;
}

export interface SessionBreakdown {
  sessions: Session[];
  breaks: Break[];
  totalActiveMs: number;
}

export function detectSessions(events: EditEvent[], idleThresholdMs: number): SessionBreakdown {
  if (events.length === 0) {
    return { sessions: [], breaks: [], totalActiveMs: 0 };
  }

  const sessions: Session[] = [];
  const breaks: Break[] = [];

  let sessionStart = events[0].t;
  let sessionEnd = events[0].t;
  let eventCount = 1;

  for (let i = 1; i < events.length; i++) {
    const gap = events[i].t - events[i - 1].t;

    if (gap > idleThresholdMs) {
      // Close the current session
      const sessionIndex = sessions.length;
      sessions.push({
        startT: sessionStart,
        endT: sessionEnd,
        durationMs: sessionEnd - sessionStart,
        eventCount,
      });

      // Record the break
      breaks.push({
        afterSessionIndex: sessionIndex,
        startT: sessionEnd,
        durationMs: gap,
      });

      // Start a new session
      sessionStart = events[i].t;
      sessionEnd = events[i].t;
      eventCount = 1;
    } else {
      sessionEnd = events[i].t;
      eventCount++;
    }
  }

  // Close the final session
  sessions.push({
    startT: sessionStart,
    endT: sessionEnd,
    durationMs: sessionEnd - sessionStart,
    eventCount,
  });

  const totalActiveMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);

  return { sessions, breaks, totalActiveMs };
}
