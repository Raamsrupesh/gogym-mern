import { GoogleGenAI } from '@google/genai';
import '../config/env.js';

async function askGemini(systemPrompt, userMessage) {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw Object.assign(new Error('Chatbot is not configured: add GEMINI_API_KEY to server/.env'), { status: 503 });
  }

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  try {
    const result = await ai.interactions.create({
      model,
      input: userMessage,
      system_instruction: systemPrompt,
      store: false,
    });
    const text = result.output_text?.trim();
    if (!text) {
      throw Object.assign(new Error('Gemini returned an empty response'), { status: 502, isGeminiError: true });
    }
    return text;
  } catch (error) {
    if (error.isGeminiError) throw error;
    const status = Number(error.status || error.statusCode);
    let message = 'Gemini request failed. Check the server logs and Gemini configuration.';
    if (status === 400 || status === 404) {
      message = `Gemini could not use model "${model}". Check GEMINI_MODEL in server/.env.`;
    } else if (status === 401 || status === 403) {
      message = 'Gemini rejected the API key or its permissions. Check GEMINI_API_KEY and Google AI Studio access.';
    } else if (status === 429) {
      message = 'Gemini API quota or rate limit reached. Check the Google AI Studio project quota.';
    } else if (status >= 500 && status <= 599) {
      message = 'Gemini is temporarily unavailable. Please try again shortly.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      message = 'Could not reach the Gemini API. Check the server network connection and try again.';
    }
    throw Object.assign(new Error(message), { status: 502, cause: error });
  }
}

export { askGemini };
