import { useState } from 'react';
import type { EditEvent } from '../events/types';
import { buildInsightPayload } from '../ai/payload';
import { requestInsights } from '../ai/client';

interface Props {
  events: EditEvent[];
}

type State = 'idle' | 'loading' | 'success' | 'error';

export function InsightsCard({ events }: Props) {
  const [state, setState] = useState<State>('idle');
  const [report, setReport] = useState<string>('');

  async function handleGenerate() {
    setState('loading');
    try {
      const payload = buildInsightPayload(events, { idleThresholdMs: 30000 });
      const text = await requestInsights(payload);
      setReport(text);
      setState('success');
    } catch {
      setState('error');
    }
  }

  return (
    <div>
      <button
        className="btn-primary"
        data-testid="ai-generate"
        onClick={handleGenerate}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? 'Analyzing…' : 'Generate AI insights'}
      </button>
      {state === 'success' && (
        <pre className="ai-report" data-testid="ai-report">
          {report}
        </pre>
      )}
      {state === 'error' && (
        <p className="muted" data-testid="ai-error">
          Insights server not reachable. Start it with: ANTHROPIC_API_KEY=&lt;key&gt; npx tsx server/insights.ts
        </p>
      )}
    </div>
  );
}
