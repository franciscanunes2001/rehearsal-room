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
    generationConfig: { maxOutputTokens: 8192 }
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
      console.error('Gemini request failed', r.status, data?.error);
      // On rate-limit/quota errors (429), Google includes a suggested wait in
      // error.details as a RetryInfo entry (e.g. retryDelay: "19.38s") — surface it
      // so the client can wait and retry once instead of just giving up.
      const retryInfo = data?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
      const retryAfterSeconds = retryInfo?.retryDelay ? parseFloat(retryInfo.retryDelay) : null;
      res.status(r.status).json({ error: data?.error?.message || 'Gemini request failed', retryAfterSeconds });
      return;
    }

    const candidate = data?.candidates?.[0];
    const text = (candidate?.content?.parts || []).map(p => p.text || '').join('');
    const finishReason = candidate?.finishReason;

    // finishReason other than STOP means the response was cut short (hit the token
    // cap) or withheld (safety/recitation) — surface it so the caller can tell that
    // apart from a plain network failure instead of just seeing an empty string.
    if (!text || (finishReason && finishReason !== 'STOP')) {
      console.error('Gemini returned no usable text', { finishReason, promptFeedback: data?.promptFeedback });
    }

    res.status(200).json({ text, finishReason });
  } catch (err) {
    console.error('negotiate handler threw', err);
    res.status(500).json({ error: String(err) });
  }
}
