import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/insights', async (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  res.json({ report: text });
});

app.listen(8787, () => console.log('insights proxy on :8787'));
