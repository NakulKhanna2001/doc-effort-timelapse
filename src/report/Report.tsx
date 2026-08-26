import type { EditEvent } from '../events/types';
import { Playback } from '../playback/Playback';
import { SummaryCard } from './SummaryCard';
import { SessionsCard } from './SessionsCard';
import { CharsChart } from './CharsChart';
import { SpeedChart } from './SpeedChart';
import { PasteCard } from './PasteCard';
import { InsightsCard } from './InsightsCard';

export function Report({ events }: { events: EditEvent[] }) {
  return (
    <div data-testid="report">
      <section className="card">
        <h2>Summary</h2>
        <p className="sub">Totals, typing speed, and first/last edit</p>
        <SummaryCard events={events} />
      </section>
      <section className="card"><h2>Writing Replay</h2><p className="sub">Watch the document being written</p><Playback events={events} /></section>
      <section className="card">
        <h2>Sessions &amp; Breaks</h2>
        <p className="sub">When you worked and when you paused</p>
        <SessionsCard events={events} />
      </section>
      <section className="card"><h2>Characters Over Time</h2><p className="sub">Document growth, additions and removals</p><CharsChart events={events} /></section>
      <section className="card"><h2>Typing Speed</h2><p className="sub">Words per minute over time</p><SpeedChart events={events} /></section>
      <section className="card"><h2>Paste Events</h2><p className="sub">Text that arrived in one go</p><PasteCard events={events} /></section>
      <section className="card">
        <h2>AI Insights</h2>
        <p className="sub">A narrative read of the writing process — powered by Gemini</p>
        <InsightsCard events={events} />
      </section>
    </div>
  );
}
