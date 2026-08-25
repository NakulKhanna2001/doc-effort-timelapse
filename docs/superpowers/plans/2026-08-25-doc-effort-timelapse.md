# Doc Effort Timelapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an event-sourced editor that records every edit to a document and reveals effort/authenticity through interactive playback and an AI narrative report.

**Architecture:** CodeMirror 6 emits a normalized `EditEvent` for every change into an append-only per-document log (the single source of truth). Playback, analysis (metrics + blame), and AI insights are all read-only derivations of that log.

**Tech Stack:** TypeScript, Vite + React, CodeMirror 6, IndexedDB (behind a `StorageAdapter`), `@anthropic-ai/sdk` via a small server proxy, Vitest + Playwright.

---

## File Structure

```
src/
  events/
    types.ts            # EditEvent, EditSource, DocumentHistory
    reconstruct.ts      # applyEvent, reconstruct (pure)
    blame.ts            # buildBlame (pure)
  storage/
    StorageAdapter.ts   # interface
    MemoryStore.ts      # in-memory adapter (tests/dev)
    IndexedDbStore.ts   # browser persistence
  editor/
    capture.ts          # transactionToEvents (CodeMirror -> EditEvent[])
    Editor.tsx          # React CodeMirror wrapper wired to a store
  analysis/
    metrics.ts          # computeMetrics (pure)
    effort.ts           # effortScore (pure)
  playback/
    Playback.tsx        # scrubber + read-only render + stats
  ai/
    payload.ts          # buildInsightPayload (pure)
    prompt.ts           # prompt template
    client.ts           # calls the server proxy
  App.tsx
server/
  insights.ts           # POST /api/insights -> Claude API (key server-side)
tests/                  # mirrors src/ for Vitest; e2e/ for Playwright
```

Files that change together live together (events, storage, editor, analysis, playback, ai each own one responsibility). The event log is the source of truth; every other unit only reads it.

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Scaffold the project**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install codemirror @codemirror/state @codemirror/view @codemirror/commands
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react
```

- [ ] **Step 2: Add a Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
```

- [ ] **Step 3: Add a smoke test**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/smoke.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git init && git add -A
git commit -m "chore: scaffold vite + react + ts + vitest"
```

---

## Task 2: Event types

**Files:**
- Create: `src/events/types.ts`
- Test: `tests/events/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/events/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { EditEvent } from '../../src/events/types';
import { makeEvent } from '../../src/events/types';

describe('makeEvent', () => {
  it('fills len from text and defaults removed to empty', () => {
    const e: EditEvent = makeEvent({ seq: 0, t: 100, from: 0, to: 0, text: 'hi', source: 'input' });
    expect(e.len).toBe(2);
    expect(e.removed).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/events/types.test.ts`
Expected: FAIL ("Cannot find module .../types").

- [ ] **Step 3: Write minimal implementation**

Create `src/events/types.ts`:
```ts
export type EditSource = 'input' | 'paste' | 'ime' | 'undo' | 'delete' | 'other';

export interface EditEvent {
  seq: number;
  t: number;
  from: number;
  to: number;
  text: string;
  removed: string;
  source: EditSource;
  len: number;
}

export interface DocumentHistory {
  docId: string;
  createdAt: number;
  events: EditEvent[];
}

export function makeEvent(
  e: Omit<EditEvent, 'len' | 'removed'> & { removed?: string },
): EditEvent {
  return { ...e, removed: e.removed ?? '', len: e.text.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/events/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/events/types.ts tests/events/types.test.ts
git commit -m "feat: add EditEvent types and makeEvent helper"
```

---

## Task 3: Document reconstruction

**Files:**
- Create: `src/events/reconstruct.ts`
- Test: `tests/events/reconstruct.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/events/reconstruct.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { applyEvent, reconstruct } from '../../src/events/reconstruct';

const type = (seq: number, from: number, text: string) =>
  makeEvent({ seq, t: seq * 100, from, to: from, text, source: 'input' });

describe('applyEvent', () => {
  it('inserts text at a position', () => {
    expect(applyEvent('helo', type(0, 3, 'l'))).toBe('hello');
  });
  it('deletes a range', () => {
    const del = makeEvent({ seq: 1, t: 1, from: 1, to: 3, text: '', removed: 'el', source: 'delete' });
    expect(applyEvent('hello', del)).toBe('hlo');
  });
});

describe('reconstruct', () => {
  it('rebuilds the document at a given step', () => {
    const events = [type(0, 0, 'ab'), type(1, 2, 'c'), type(2, 0, 'X')];
    expect(reconstruct(events, 0)).toBe('ab');
    expect(reconstruct(events, 2)).toBe('Xabc');
  });
  it('reconstruct() with no bound returns the final document', () => {
    const events = [type(0, 0, 'ab'), type(1, 2, 'c')];
    expect(reconstruct(events)).toBe('abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/events/reconstruct.test.ts`
Expected: FAIL ("Cannot find module .../reconstruct").

- [ ] **Step 3: Write minimal implementation**

Create `src/events/reconstruct.ts`:
```ts
import type { EditEvent } from './types';

export function applyEvent(text: string, e: EditEvent): string {
  return text.slice(0, e.from) + e.text + text.slice(e.to);
}

/** Rebuild the document after applying events 0..upTo (inclusive). */
export function reconstruct(events: EditEvent[], upTo?: number): string {
  const end = upTo === undefined ? events.length - 1 : upTo;
  let text = '';
  for (let i = 0; i <= end; i++) text = applyEvent(text, events[i]);
  return text;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/events/reconstruct.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/events/reconstruct.ts tests/events/reconstruct.test.ts
git commit -m "feat: reconstruct document state from event log"
```

---

## Task 4: Blame map

**Files:**
- Create: `src/events/blame.ts`
- Test: `tests/events/blame.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/events/blame.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { buildBlame } from '../../src/events/blame';

describe('buildBlame', () => {
  it('attributes each final character to the event that inserted it', () => {
    const events = [
      makeEvent({ seq: 0, t: 100, from: 0, to: 0, text: 'ab', source: 'input' }),
      makeEvent({ seq: 1, t: 200, from: 2, to: 2, text: 'XYZ', source: 'paste' }),
    ];
    const blame = buildBlame(events);
    expect(blame.map((b) => b.source)).toEqual(['input', 'input', 'paste', 'paste', 'paste']);
    expect(blame[2].seq).toBe(1);
    expect(blame[0].t).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/events/blame.test.ts`
Expected: FAIL ("Cannot find module .../blame").

- [ ] **Step 3: Write minimal implementation**

Create `src/events/blame.ts`:
```ts
import type { EditEvent, EditSource } from './types';

export interface BlameChar {
  seq: number;
  t: number;
  source: EditSource;
}

/** For each character in the final document, which event created it. */
export function buildBlame(events: EditEvent[]): BlameChar[] {
  let chars: BlameChar[] = [];
  for (const e of events) {
    const inserted: BlameChar[] = [...e.text].map(() => ({
      seq: e.seq,
      t: e.t,
      source: e.source,
    }));
    chars = [...chars.slice(0, e.from), ...inserted, ...chars.slice(e.to)];
  }
  return chars;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/events/blame.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/events/blame.ts tests/events/blame.test.ts
git commit -m "feat: build per-character blame map from event log"
```

---

## Task 5: Storage adapter + in-memory store

**Files:**
- Create: `src/storage/StorageAdapter.ts`, `src/storage/MemoryStore.ts`
- Test: `tests/storage/MemoryStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/storage/MemoryStore.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { MemoryStore } from '../../src/storage/MemoryStore';

describe('MemoryStore', () => {
  it('appends events and reads them back in order', async () => {
    const store = new MemoryStore();
    await store.create('doc1');
    await store.append('doc1', makeEvent({ seq: 0, t: 1, from: 0, to: 0, text: 'a', source: 'input' }));
    await store.append('doc1', makeEvent({ seq: 1, t: 2, from: 1, to: 1, text: 'b', source: 'input' }));
    const events = await store.read('doc1');
    expect(events.map((e) => e.text)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage/MemoryStore.test.ts`
Expected: FAIL ("Cannot find module .../MemoryStore").

- [ ] **Step 3: Write minimal implementation**

Create `src/storage/StorageAdapter.ts`:
```ts
import type { EditEvent } from '../events/types';

export interface StorageAdapter {
  create(docId: string): Promise<void>;
  append(docId: string, event: EditEvent): Promise<void>;
  read(docId: string): Promise<EditEvent[]>;
  list(): Promise<string[]>;
}
```

Create `src/storage/MemoryStore.ts`:
```ts
import type { EditEvent } from '../events/types';
import type { StorageAdapter } from './StorageAdapter';

export class MemoryStore implements StorageAdapter {
  private docs = new Map<string, EditEvent[]>();

  async create(docId: string): Promise<void> {
    if (!this.docs.has(docId)) this.docs.set(docId, []);
  }
  async append(docId: string, event: EditEvent): Promise<void> {
    const events = this.docs.get(docId) ?? [];
    events.push(event);
    this.docs.set(docId, events);
  }
  async read(docId: string): Promise<EditEvent[]> {
    return [...(this.docs.get(docId) ?? [])];
  }
  async list(): Promise<string[]> {
    return [...this.docs.keys()];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/storage/MemoryStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/StorageAdapter.ts src/storage/MemoryStore.ts tests/storage/MemoryStore.test.ts
git commit -m "feat: add StorageAdapter interface and in-memory store"
```

---

## Task 6: CodeMirror change normalization

**Files:**
- Create: `src/editor/capture.ts`
- Test: `tests/editor/capture.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/editor/capture.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { transactionToEvents } from '../../src/editor/capture';

function makeTr(doc: string, changes: any, userEvent?: string): Transaction {
  const state = EditorState.create({ doc });
  return state.update({ changes, userEvent });
}

describe('transactionToEvents', () => {
  it('maps a typed insertion to an input EditEvent', () => {
    const tr = makeTr('ab', { from: 2, insert: 'c' }, 'input.type');
    const events = transactionToEvents(tr, 0, 5000);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ seq: 0, from: 2, to: 2, text: 'c', source: 'input' });
  });

  it('maps a paste to a paste EditEvent', () => {
    const tr = makeTr('', { from: 0, insert: 'pasted' }, 'input.paste');
    const events = transactionToEvents(tr, 3, 5000);
    expect(events[0]).toMatchObject({ seq: 3, text: 'pasted', source: 'paste' });
  });

  it('maps a deletion, capturing removed text', () => {
    const tr = makeTr('hello', { from: 1, to: 3 }, 'delete.backward');
    const events = transactionToEvents(tr, 0, 5000);
    expect(events[0]).toMatchObject({ from: 1, to: 3, text: '', removed: 'el', source: 'delete' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/capture.test.ts`
Expected: FAIL ("Cannot find module .../capture").

- [ ] **Step 3: Write minimal implementation**

Create `src/editor/capture.ts`:
```ts
import type { Transaction } from '@codemirror/state';
import { makeEvent, type EditEvent, type EditSource } from '../events/types';

function classify(userEvent: string | undefined): EditSource {
  if (!userEvent) return 'other';
  if (userEvent.startsWith('input.paste')) return 'paste';
  if (userEvent.startsWith('input')) return 'input';
  if (userEvent.startsWith('delete')) return 'delete';
  if (userEvent.startsWith('undo') || userEvent.startsWith('redo')) return 'undo';
  return 'other';
}

/** Convert one CodeMirror transaction into zero or more EditEvents. */
export function transactionToEvents(tr: Transaction, startSeq: number, t: number): EditEvent[] {
  if (!tr.docChanged) return [];
  const source = classify(tr.annotation(Transaction.userEvent));
  const events: EditEvent[] = [];
  let seq = startSeq;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    events.push(
      makeEvent({
        seq: seq++,
        t,
        from: fromA,
        to: toA,
        text: inserted.toString(),
        removed: tr.startState.doc.sliceString(fromA, toA),
        source: toA > fromA && inserted.length === 0 ? 'delete' : source,
      }),
    );
  });
  return events;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/capture.test.ts`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add src/editor/capture.ts tests/editor/capture.test.ts
git commit -m "feat: normalize CodeMirror transactions into EditEvents"
```

---

## Task 7: Analysis metrics

**Files:**
- Create: `src/analysis/metrics.ts`
- Test: `tests/analysis/metrics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/analysis/metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { computeMetrics } from '../../src/analysis/metrics';

const typeAt = (seq: number, t: number, from: number, text: string) =>
  makeEvent({ seq, t, from, to: from, text, source: 'input' });

describe('computeMetrics', () => {
  it('counts typed vs pasted characters and paste stats', () => {
    const events = [
      typeAt(0, 0, 0, 'a'),
      typeAt(1, 1000, 1, 'b'),
      makeEvent({ seq: 2, t: 2000, from: 2, to: 2, text: 'PASTED', source: 'paste' }),
    ];
    const m = computeMetrics(events, { idleThresholdMs: 30000 });
    expect(m.typedChars).toBe(2);
    expect(m.pastedChars).toBe(6);
    expect(m.pasteCount).toBe(1);
    expect(m.largestPaste).toBe(6);
    expect(m.pasteRatio).toBeCloseTo(6 / 8);
  });

  it('sums active time only across gaps below the idle threshold', () => {
    const events = [
      typeAt(0, 0, 0, 'a'),
      typeAt(1, 5000, 1, 'b'), // 5s gap, counts
      typeAt(2, 100000, 2, 'c'), // 95s gap, idle, does not count
    ];
    const m = computeMetrics(events, { idleThresholdMs: 30000 });
    expect(m.activeTimeMs).toBe(5000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analysis/metrics.test.ts`
Expected: FAIL ("Cannot find module .../metrics").

- [ ] **Step 3: Write minimal implementation**

Create `src/analysis/metrics.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analysis/metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analysis/metrics.ts tests/analysis/metrics.test.ts
git commit -m "feat: compute effort metrics from event log"
```

---

## Task 8: Effort score

**Files:**
- Create: `src/analysis/effort.ts`
- Test: `tests/analysis/effort.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/analysis/effort.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { effortScore } from '../../src/analysis/effort';
import type { Metrics } from '../../src/analysis/metrics';

const base: Metrics = {
  typedChars: 100, pastedChars: 0, pasteCount: 0, largestPaste: 0,
  pasteRatio: 0, activeTimeMs: 60000, deletions: 10,
};

describe('effortScore', () => {
  it('scores genuine typing higher than a paste dump', () => {
    const typed = effortScore(base);
    const pasted = effortScore({ ...base, typedChars: 0, pastedChars: 100, pasteRatio: 1, pasteCount: 1, largestPaste: 100, deletions: 0 });
    expect(typed).toBeGreaterThan(pasted);
  });
  it('returns a value between 0 and 100', () => {
    const s = effortScore(base);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analysis/effort.test.ts`
Expected: FAIL ("Cannot find module .../effort").

- [ ] **Step 3: Write minimal implementation**

Create `src/analysis/effort.ts`:
```ts
import type { Metrics } from './metrics';

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Transparent, tunable heuristic:
 *  - low paste ratio raises the score
 *  - churn (deletions relative to typed chars) signals genuine drafting
 *  - some active time is required for a high score
 */
export function effortScore(m: Metrics): number {
  const pastePenalty = m.pasteRatio * 60;
  const churn = m.typedChars === 0 ? 0 : Math.min(m.deletions / m.typedChars, 1);
  const churnBonus = churn * 20;
  const activityBonus = Math.min(m.activeTimeMs / 60000, 1) * 20; // up to 1 min
  return clamp(80 - pastePenalty + churnBonus + activityBonus);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analysis/effort.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analysis/effort.ts tests/analysis/effort.test.ts
git commit -m "feat: add transparent effort score heuristic"
```

---

## Task 9: AI insight payload builder

**Files:**
- Create: `src/ai/payload.ts`
- Test: `tests/ai/payload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/ai/payload.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeEvent } from '../../src/events/types';
import { buildInsightPayload } from '../../src/ai/payload';

describe('buildInsightPayload', () => {
  it('summarizes metrics and paste events into a stable shape', () => {
    const events = [
      makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'hi', source: 'input' }),
      makeEvent({ seq: 1, t: 2000, from: 2, to: 2, text: 'BIGPASTE', source: 'paste' }),
    ];
    const payload = buildInsightPayload(events, { idleThresholdMs: 30000 });
    expect(payload.metrics.pasteCount).toBe(1);
    expect(payload.effortScore).toBeGreaterThanOrEqual(0);
    expect(payload.pasteEvents).toEqual([{ seq: 1, t: 2000, size: 8 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/payload.test.ts`
Expected: FAIL ("Cannot find module .../payload").

- [ ] **Step 3: Write minimal implementation**

Create `src/ai/payload.ts`:
```ts
import type { EditEvent } from '../events/types';
import { computeMetrics, type Metrics, type MetricsOptions } from '../analysis/metrics';
import { effortScore } from '../analysis/effort';

export interface InsightPayload {
  metrics: Metrics;
  effortScore: number;
  pasteEvents: { seq: number; t: number; size: number }[];
  durationMs: number;
}

export function buildInsightPayload(events: EditEvent[], opts: MetricsOptions): InsightPayload {
  const metrics = computeMetrics(events, opts);
  const pasteEvents = events
    .filter((e) => e.source === 'paste')
    .map((e) => ({ seq: e.seq, t: e.t, size: e.len }));
  const durationMs = events.length ? events[events.length - 1].t - events[0].t : 0;
  return { metrics, effortScore: effortScore(metrics), pasteEvents, durationMs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/payload.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ai/payload.ts tests/ai/payload.test.ts
git commit -m "feat: build structured payload for AI insights"
```

---

## Task 10: AI prompt + server proxy + client

**Files:**
- Create: `src/ai/prompt.ts`, `server/insights.ts`, `src/ai/client.ts`
- Test: `tests/ai/prompt.test.ts`

Before implementing the Claude call, invoke the `claude-api` skill to confirm the current model id and SDK usage. Default candidates: `claude-sonnet-4-6` (cost) or `claude-opus-4-8` (depth).

- [ ] **Step 1: Write the failing test (prompt builder is pure)**

Create `tests/ai/prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../src/ai/prompt';

describe('buildPrompt', () => {
  it('embeds the payload JSON and asks for the required sections', () => {
    const prompt = buildPrompt({
      metrics: { typedChars: 5, pastedChars: 0, pasteCount: 0, largestPaste: 0, pasteRatio: 0, activeTimeMs: 1000, deletions: 0 },
      effortScore: 80, pasteEvents: [], durationMs: 1000,
    });
    expect(prompt).toContain('"effortScore": 80');
    expect(prompt).toContain('Authenticity assessment');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/prompt.test.ts`
Expected: FAIL ("Cannot find module .../prompt").

- [ ] **Step 3: Write the prompt builder**

Create `src/ai/prompt.ts`:
```ts
import type { InsightPayload } from './payload';

export function buildPrompt(payload: InsightPayload): string {
  return [
    'You are analyzing how a document was written, from an edit-event log summary.',
    'Do not accuse; describe evidence. Cover these sections:',
    '1. Process narrative',
    '2. Authenticity assessment',
    '3. Flagged sections (large instant insertions, if any)',
    '',
    'Data:',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the server proxy (key stays server-side)**

Run: `npm install express @anthropic-ai/sdk && npm install -D @types/express`

Create `server/insights.ts`:
```ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/insights', async (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6', // confirm via claude-api skill
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  res.json({ report: text });
});

app.listen(8787, () => console.log('insights proxy on :8787'));
```

- [ ] **Step 6: Write the client**

Create `src/ai/client.ts`:
```ts
import { buildPrompt } from './prompt';
import type { InsightPayload } from './payload';

export async function requestInsights(payload: InsightPayload): Promise<string> {
  const res = await fetch('/api/insights', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: buildPrompt(payload) }),
  });
  if (!res.ok) throw new Error(`insights request failed: ${res.status}`);
  const data = (await res.json()) as { report: string };
  return data.report;
}
```

- [ ] **Step 7: Manual smoke test**

Run: `ANTHROPIC_API_KEY=sk-... npx tsx server/insights.ts` then POST a sample payload with curl. Expected: a JSON `{ report: "..." }`.

- [ ] **Step 8: Commit**

```bash
git add src/ai/prompt.ts src/ai/client.ts server/insights.ts tests/ai/prompt.test.ts package.json
git commit -m "feat: AI insights prompt, server proxy, and client"
```

---

## Task 11: IndexedDB storage adapter

**Files:**
- Create: `src/storage/IndexedDbStore.ts`
- Test: `tests/storage/IndexedDbStore.test.ts`

- [ ] **Step 1: Install fake-indexeddb for tests**

Run: `npm install -D fake-indexeddb`

- [ ] **Step 2: Write the failing test**

Create `tests/storage/IndexedDbStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { makeEvent } from '../../src/events/types';
import { IndexedDbStore } from '../../src/storage/IndexedDbStore';

describe('IndexedDbStore', () => {
  let store: IndexedDbStore;
  beforeEach(async () => {
    store = new IndexedDbStore(`db-${Math.random()}`);
    await store.create('doc1');
  });

  it('persists and reads events in order', async () => {
    await store.append('doc1', makeEvent({ seq: 0, t: 1, from: 0, to: 0, text: 'a', source: 'input' }));
    await store.append('doc1', makeEvent({ seq: 1, t: 2, from: 1, to: 1, text: 'b', source: 'input' }));
    expect((await store.read('doc1')).map((e) => e.text)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/storage/IndexedDbStore.test.ts`
Expected: FAIL ("Cannot find module .../IndexedDbStore").

- [ ] **Step 4: Write minimal implementation**

Create `src/storage/IndexedDbStore.ts`:
```ts
import type { EditEvent } from '../events/types';
import type { StorageAdapter } from './StorageAdapter';

export class IndexedDbStore implements StorageAdapter {
  constructor(private dbName = 'doc-timelapse') {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('events', { keyPath: ['docId', 'seq'] });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async create(): Promise<void> {
    await this.open(); // ensures schema exists
  }

  async append(docId: string, event: EditEvent): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      tx.objectStore('events').put({ docId, ...event });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async read(docId: string): Promise<EditEvent[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const range = IDBKeyRange.bound([docId, -Infinity], [docId, Infinity]);
      const req = tx.objectStore('events').getAll(range);
      req.onsuccess = () => resolve(req.result.map(({ docId: _d, ...e }) => e as EditEvent));
      req.onerror = () => reject(req.error);
    });
  }

  async list(): Promise<string[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const req = tx.objectStore('events').getAll();
      req.onsuccess = () => resolve([...new Set(req.result.map((r) => r.docId as string))]);
      req.onerror = () => reject(req.error);
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/storage/IndexedDbStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/storage/IndexedDbStore.ts tests/storage/IndexedDbStore.test.ts package.json
git commit -m "feat: IndexedDB storage adapter for the event log"
```

---

## Task 12: Editor component wired to a store

**Files:**
- Create: `src/editor/Editor.tsx`
- Test: `tests/editor/Editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/editor/Editor.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryStore } from '../../src/storage/MemoryStore';
import { Editor } from '../../src/editor/Editor';

describe('Editor', () => {
  it('appends an event to the store when text is typed', async () => {
    const store = new MemoryStore();
    await store.create('doc1');
    const { container } = render(<Editor docId="doc1" store={store} />);
    // Simulate a CodeMirror dispatch via the exposed test hook.
    const view = (container.querySelector('.cm-editor') as any)?._cmView;
    view.dispatch({ changes: { from: 0, insert: 'x' }, userEvent: 'input.type' });
    expect((await store.read('doc1')).map((e) => e.text)).toEqual(['x']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/Editor.test.tsx`
Expected: FAIL ("Cannot find module .../Editor").

- [ ] **Step 3: Write minimal implementation**

Create `src/editor/Editor.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { StorageAdapter } from '../storage/StorageAdapter';
import { transactionToEvents } from './capture';

interface EditorProps {
  docId: string;
  store: StorageAdapter;
}

export function Editor({ docId, store }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!ref.current) return;
    const view = new EditorView({
      parent: ref.current,
      state: EditorState.create({
        doc: '',
        extensions: [
          EditorView.updateListener.of((u) => {
            for (const tr of u.transactions) {
              const events = transactionToEvents(tr as Transaction, seqRef.current, Date.now());
              for (const e of events) {
                seqRef.current = e.seq + 1;
                void store.append(docId, e);
              }
            }
          }),
        ],
      }),
    });
    (ref.current as any)._cmView = view; // test hook
    return () => view.destroy();
  }, [docId, store]);

  return <div ref={ref} className="cm-editor-host" />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/Editor.test.tsx`
Expected: PASS. (If the `.cm-editor` query needs adjusting, target the host div's `_cmView`.)

- [ ] **Step 5: Commit**

```bash
git add src/editor/Editor.tsx tests/editor/Editor.test.tsx
git commit -m "feat: editor component streaming events to a store"
```

---

## Task 13: Playback scrubber

**Files:**
- Create: `src/playback/Playback.tsx`
- Test: `tests/playback/Playback.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/playback/Playback.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeEvent } from '../../src/events/types';
import { Playback } from '../../src/playback/Playback';

const events = [
  makeEvent({ seq: 0, t: 0, from: 0, to: 0, text: 'ab', source: 'input' }),
  makeEvent({ seq: 1, t: 1000, from: 2, to: 2, text: 'c', source: 'input' }),
];

describe('Playback', () => {
  it('renders the reconstructed doc at the scrub position', () => {
    render(<Playback events={events} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByTestId('playback-doc').textContent).toBe('ab');
    fireEvent.change(slider, { target: { value: '1' } });
    expect(screen.getByTestId('playback-doc').textContent).toBe('abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/playback/Playback.test.tsx`
Expected: FAIL ("Cannot find module .../Playback").

- [ ] **Step 3: Write minimal implementation**

Create `src/playback/Playback.tsx`:
```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/playback/Playback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/playback/Playback.tsx tests/playback/Playback.test.tsx
git commit -m "feat: interactive playback scrubber with live stats"
```

---

## Task 14: App wiring + Playwright e2e

**Files:**
- Create/Modify: `src/App.tsx`
- Test: `e2e/timelapse.spec.ts`, `playwright.config.ts`

- [ ] **Step 1: Wire the app**

Replace `src/App.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { MemoryStore } from './storage/MemoryStore';
import { Editor } from './editor/Editor';
import { Playback } from './playback/Playback';
import type { EditEvent } from './events/types';

export default function App() {
  const store = useMemo(() => new MemoryStore(), []);
  const [events, setEvents] = useState<EditEvent[]>([]);
  useMemo(() => void store.create('doc1'), [store]);

  return (
    <div>
      <Editor docId="doc1" store={store} />
      <button onClick={async () => setEvents(await store.read('doc1'))}>Load timelapse</button>
      {events.length > 0 && <Playback events={events} />}
    </div>
  );
}
```

- [ ] **Step 2: Install Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium`

- [ ] **Step 3: Write the e2e test**

Create `e2e/timelapse.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('type then replay', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('.cm-content').click();
  await page.keyboard.type('hello');
  await page.getByText('Load timelapse').click();
  const slider = page.getByRole('slider');
  await slider.fill('0');
  await expect(page.getByTestId('playback-doc')).toHaveText('h');
  await slider.fill('4');
  await expect(page.getByTestId('playback-doc')).toHaveText('hello');
});
```

- [ ] **Step 4: Run e2e (dev server must be running)**

Run: `npm run dev &` then `npx playwright test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx e2e/timelapse.spec.ts playwright.config.ts package.json
git commit -m "feat: wire app and add end-to-end timelapse test"
```

---

## Task 15: Full test sweep

- [ ] **Step 1: Run the whole unit suite**

Run: `npx vitest run`
Expected: all tests PASS.

- [ ] **Step 2: Run e2e**

Run: `npx playwright test`
Expected: PASS.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "test: full suite green"
```

---

## Self-Review Notes

- **Spec coverage:** capture (T6, T12), append-only log + reconstruction (T3, T5, T11), blame (T4), metrics + effort (T7, T8), interactive playback (T13), AI insights post-processing (T9, T10), both prose & code via CodeMirror (T6, T12), StorageAdapter swap (T5→T11). All spec sections map to tasks.
- **Type consistency:** `EditEvent`/`makeEvent` (T2) reused everywhere; `Metrics`/`MetricsOptions` (T7) reused by T8/T9; `StorageAdapter` (T5) implemented by T11 and consumed by T12; `InsightPayload` (T9) consumed by T10.
- **Open questions from spec** are deferred as noted (idle threshold defaulted to 30s; typing-run coalescing not implemented — raw capture first, per YAGNI).
