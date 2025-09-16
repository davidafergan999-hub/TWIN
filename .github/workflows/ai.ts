export async function chat(system: string, user: string, json = false) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
      temperature: 0.8,
      max_tokens: 200,
      ...(json ? { response_format: { type: 'json_object' } } : {})
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
