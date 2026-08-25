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
