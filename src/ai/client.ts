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
