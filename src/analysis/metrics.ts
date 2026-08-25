import type { EditEvent } from '../events/types';

export interface Metrics {
  typedChars: number;
  pastedChars: number;
  pasteCount: number;
  largestPaste: number;
  pasteRatio: number;
  activeTimeMs: number;
  deletions: number;
}

export interface MetricsOptions {
  idleThresholdMs: number;
}

export function computeMetrics(events: EditEvent[], opts: MetricsOptions): Metrics {
  let typedChars = 0;
  let pastedChars = 0;
  let pasteCount = 0;
  let largestPaste = 0;
  let deletions = 0;
  let activeTimeMs = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.source === 'paste') {
      pasteCount++;
      pastedChars += e.len;
      largestPaste = Math.max(largestPaste, e.len);
    } else if (e.source === 'delete') {
      deletions += e.removed.length;
    } else {
      typedChars += e.len;
    }
    if (i > 0) {
      const gap = e.t - events[i - 1].t;
      if (gap <= opts.idleThresholdMs) activeTimeMs += gap;
    }
  }

  const total = typedChars + pastedChars;
  return {
    typedChars,
    pastedChars,
    pasteCount,
    largestPaste,
    pasteRatio: total === 0 ? 0 : pastedChars / total,
    activeTimeMs,
    deletions,
  };
}
