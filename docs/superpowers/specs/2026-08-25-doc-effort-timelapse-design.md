# Doc Effort Timelapse — Design Spec

**Date:** 2026-08-25
**Status:** Approved design, ready for implementation planning

## Problem

When people write documents or code, we can't tell how much genuine effort went
in. Someone who types incrementally over time looks the same, in the final
artifact, as someone who pastes a large block in one instant. We want a tool
that records *how* a document was built and reveals effort and authenticity —
essentially **"git blame + a timelapse" for any document**.

## Goals

- Capture every edit (typed char, deletion, paste) with a timestamp and source.
- Maintain an append-only history per document that can reconstruct the document
  at any point in time and attribute ("blame") each character.
- Provide **interactive playback**: a scrubber that replays the document being
  built keystroke-by-keystroke, with live stats.
- Compute effort/authenticity **metrics** from the history (paste ratio, active
  time, cadence, churn, largest paste).
- Generate an **AI narrative report** *after* the data is computed, by feeding a
  structured prompt with the metrics + event summary to an LLM.
- Work for **both prose and code** (single editing surface).

## Non-Goals (YAGNI)

- Multi-user / real-time collaboration (no CRDT/OT backend yet).
- Cloud accounts, sharing, org management.
- Integrations with Google Docs / Notion / Word.
- Definitive "cheating" verdicts — we surface evidence, not accusations.

## Approach

**Event-sourced editor on CodeMirror 6.** CodeMirror 6 handles both code and
prose and exposes every change as a *transaction* that already reports what was
inserted/deleted, where, and the `userEvent` source (e.g. `input.type`,
`input.paste`). We normalize each transaction into an `EditEvent` and append it
to a per-document log. The log is the **single source of truth**; playback,
analysis, and AI are all read-only derivations of it.

Rejected alternatives:
- **Snapshot + diff** — coarse timelapse, fuzzy paste detection; undercuts the
  effort premise.
- **CRDT/OT (Yjs)** — powerful and collaboration-ready but overkill for
  single-author effort analysis; adds complexity we don't need yet.

## Architecture & Units

```
Editor (CodeMirror) --events--> History Store --read--> Playback (scrubber)
                                     |
                                     +----read----> Analysis (metrics) --> AI Insights (LLM report)
```

1. **Editor + capture** — CodeMirror 6 wrapped so each transaction becomes a
   normalized `EditEvent` handed to the store. Knows nothing about analysis or
   playback.
2. **History Store** — append-only event log per document; can reconstruct doc
   state at any event index and replay a range. Storage behind a
   `StorageAdapter` interface (start with IndexedDB; a server backend can be
   swapped in later without touching consumers).
3. **Playback** — read-only consumer that replays events over a timeline
   scrubber with live stats. Never mutates the log.
4. **Analysis** — pure functions folding the event log into metrics and a blame
   map. Easy to unit test.
5. **AI Insights** — takes computed metrics + a compact event summary, fills a
   structured prompt, returns a narrative report. Strictly post-processing.

**Key boundary:** the event log is the source of truth; every other unit is a
read-only derivation, so each can change independently and be tested in
isolation.

## Data Model

```ts
type EditSource = 'input' | 'paste' | 'ime' | 'undo' | 'delete' | 'other';

interface EditEvent {
  seq: number;      // monotonic index within a document
  t: number;        // epoch milliseconds
  from: number;     // start position of the change
  to: number;       // end position replaced (== from for pure insert)
  text: string;     // inserted text ('' for a pure deletion)
  removed: string;  // deleted text ('' for a pure insertion) — enables blame + reconstruction
  source: EditSource; // derived from CodeMirror transaction userEvent
  len: number;      // text.length, denormalized for fast stats
}

interface DocumentHistory {
  docId: string;
  createdAt: number;
  events: EditEvent[]; // append-only
}
```

- **Reconstruction:** apply events `0..i` to an empty string to get the document
  at step `i`.
- **Blame:** while applying events, maintain a parallel array where each
  character carries the `seq`, `t`, and `source` of the event that inserted it.
- **Batching (optimization, not v1-critical):** rapid single-character `input`
  events may be coalesced into "typing runs" for storage; paste events always
  stay atomic. Store raw first; coalescing is a later optimization.

## Analysis / Metrics

Derived by pure functions over the event log:

- Active time = sum of inter-event gaps below an idle threshold (e.g. 30s).
- Keystroke count; chars typed vs. chars pasted.
- Paste events: count, sizes, largest paste.
- Paste ratio = pasted chars / total chars retained in final doc.
- Typing cadence (chars/min over active time); burst detection.
- Churn = deletions/rewrites (genuine drafting churns; paste-dumps don't).
- **Effort score** = heuristic combining paste ratio (−), active time (+),
  cadence realism (+), churn (+). Documented, tunable, transparent.
- **Blame map** for the final document: which characters were typed vs pasted,
  and when.

## Interactive Playback

- Timeline scrubber with play / pause / speed control.
- Renders the reconstructed document at the scrub position in a **read-only**
  CodeMirror view.
- Highlights pasted regions; markers on the timeline for paste events.
- Live stats panel updates as you scrub.

## AI Insights

- On demand ("Generate report"), assemble a structured JSON payload — metrics +
  an event summary (sessions, paste events with sizes, timeline milestones) —
  into a prompt template.
- Call the Claude API and return a narrative report: process narrative,
  authenticity assessment, flagged sections.
- Deterministic input in, text out. The API key stays server-side (small Node /
  serverless proxy); the client never holds it.
- Model choice finalized at implementation time (consult the `claude-api` skill);
  default candidates: `claude-sonnet-4-6` for cost, `claude-opus-4-8` for depth.

## Tech Stack

- TypeScript, Vite + React.
- CodeMirror 6 editing surface.
- IndexedDB behind a `StorageAdapter` interface for the event log.
- `@anthropic-ai/sdk` via a small server proxy for AI insights.
- Testing: Vitest for pure analysis/reconstruction functions; Playwright for
  editor + playback interaction.

## Testing Strategy

- **Unit (Vitest):** reconstruction (apply N events → expected text), blame
  attribution, each metric, effort score on crafted event logs (pure-typed vs
  paste-heavy vs mixed).
- **Integration (Playwright):** type + paste into the editor, confirm events are
  captured with correct `source`, scrub the timeline, and verify the rendered
  document matches reconstruction.
- **AI:** golden structured-payload tests (assert the payload shape from known
  metrics); the LLM call itself is smoke-tested, not asserted on exact prose.

## Open Questions (resolve during planning)

- IndexedDB only vs. optional server persistence for v1.
- Exact idle threshold and effort-score weights (start with defaults, tune).
- Whether to coalesce typing runs at capture time or keep raw and coalesce on
  read.
