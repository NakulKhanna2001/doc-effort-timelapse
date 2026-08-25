import type { EditEvent } from '../events/types';

export interface TimelinePoint {
  t: number;        // real epoch ms of the last event in the bucket
  activeT: number;  // ms position on the compressed (active-time) x-axis, at bucket end
  docLen: number;   // document length at bucket end
  added: number;    // chars added in bucket
  removed: number;  // chars removed in bucket
  wpm: number;      // (typed chars in bucket / 5) / bucket minutes; 0 if no active time or no typing
}

export interface PauseMarker {
  activeT: number;
  t: number;
  durationMs: number;
}

export interface Timeline {
  points: TimelinePoint[];
  pauses: PauseMarker[];
}

// Sources that count as "typed" for WPM calculation
const TYPED_SOURCES = new Set<EditEvent['source']>(['input', 'ime']);

export function computeTimeline(
  events: EditEvent[],
  opts: { idleThresholdMs: number; targetPoints?: number },
): Timeline {
  if (events.length === 0) {
    return { points: [], pauses: [] };
  }

  const { idleThresholdMs, targetPoints = 120 } = opts;

  // ── Step 1: compute activeT for each event and collect pauses ────────────

  const activeTimes: number[] = new Array(events.length);
  const pauses: PauseMarker[] = [];

  activeTimes[0] = 0;

  for (let i = 1; i < events.length; i++) {
    const gap = events[i].t - events[i - 1].t;
    const cappedGap = Math.min(gap, idleThresholdMs);
    activeTimes[i] = activeTimes[i - 1] + cappedGap;

    if (gap > idleThresholdMs) {
      pauses.push({
        activeT: activeTimes[i],   // position of the event AFTER the pause
        t: events[i].t,
        durationMs: gap,
      });
    }
  }

  // ── Step 2: bucketing ────────────────────────────────────────────────────

  const totalActiveSpan = activeTimes[events.length - 1];
  const bucketWidth = Math.max(totalActiveSpan / targetPoints, 1);

  // Collect per-event data and assign to buckets
  // Each bucket stores: lastEventIdx, docLen at last event, sums of added/removed/typed
  interface BucketAccum {
    lastT: number;
    lastActiveT: number;
    lastDocLen: number;
    added: number;
    removed: number;
    typed: number;
  }

  const buckets = new Map<number, BucketAccum>();

  let runningDocLen = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const eActiveT = activeTimes[i];

    // Update running document length
    runningDocLen += e.text.length - e.removed.length;

    // Assign to bucket (clamp last event to last bucket index)
    const maxBucket = targetPoints - 1;
    const bucketIdx = Math.min(Math.floor(eActiveT / bucketWidth), maxBucket);

    const isTyped = TYPED_SOURCES.has(e.source);

    const existing = buckets.get(bucketIdx);
    if (existing) {
      // Update last-event fields (later event in bucket wins)
      existing.lastT = e.t;
      existing.lastActiveT = eActiveT;
      existing.lastDocLen = runningDocLen;
      existing.added += e.text.length;
      existing.removed += e.removed.length;
      existing.typed += isTyped ? e.len : 0;
    } else {
      buckets.set(bucketIdx, {
        lastT: e.t,
        lastActiveT: eActiveT,
        lastDocLen: runningDocLen,
        added: e.text.length,
        removed: e.removed.length,
        typed: isTyped ? e.len : 0,
      });
    }
  }

  // ── Step 3: emit points in bucket order ──────────────────────────────────

  const sortedBucketKeys = Array.from(buckets.keys()).sort((a, b) => a - b);

  const points: TimelinePoint[] = sortedBucketKeys.map(bucketIdx => {
    const b = buckets.get(bucketIdx)!;
    // Active-time width covered by this bucket
    const bucketActiveMs = bucketWidth;
    const wpm =
      b.typed === 0 || bucketActiveMs === 0
        ? 0
        : (b.typed / 5) / (bucketActiveMs / 60_000);

    return {
      t: b.lastT,
      activeT: b.lastActiveT,
      docLen: b.lastDocLen,
      added: b.added,
      removed: b.removed,
      wpm,
    };
  });

  return { points, pauses };
}
