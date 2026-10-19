async function askGemini(systemPrompt, userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nCustomer: ${userMessage}` }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('AI unavailable');
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Please contact the gym directly.';
}
export { askGemini };