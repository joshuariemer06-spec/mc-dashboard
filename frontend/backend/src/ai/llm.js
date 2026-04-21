export async function llmChat({ system, messages }) {
  const base = process.env.AI_BASE_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!base || !key || !model) return null;

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      ...messages
    ],
    temperature: 0.2
  };

  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || null;
}
