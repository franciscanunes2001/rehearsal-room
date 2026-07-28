// Vercel serverless function — proxies chat requests to Google's Gemini API
// so the API key never touches the browser.
//
// Env vars to set in the Vercel project (Settings > Environment Variables):
//   GEMINI_API_KEY   - required, from Google AI Studio (aistudio.google.com)
//   GEMINI_MODEL     - optional, defaults to gemini-flash-latest (Google's self-updating
//                       alias for the current flash model, to dodge deprecations)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    return;
  }
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  const { system, messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages must be an array' });
    return;
  }

  // Gemini uses "user" / "model" roles instead of "user" / "assistant"
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }]
  }));

  const body = {
    contents,
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { maxOutputTokens: 4096 }
  };

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
      }
    );
    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json({ error: data?.error?.message || 'Gemini request failed' });
      return;
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '')
      .join('');

    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
