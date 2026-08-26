import express from 'express';

const app = express();
app.use(express.json());

const MODEL = 'gemini-3.6-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

app.post('/api/insights', async (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    return;
  }
  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });
  if (!upstream.ok) {
    const detail = await upstream.text();
    console.error(`gemini error ${upstream.status}: ${detail.slice(0, 300)}`);
    res.status(upstream.status).json({ error: `model request failed (${upstream.status})` });
    return;
  }
  const data = (await upstream.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('');
  res.json({ report: text });
});

app.listen(8787, () => console.log('insights proxy on :8787'));
