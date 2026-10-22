import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function askGemini(systemPrompt, userMessage) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Chatbot is not configured: GEMINI_API_KEY is missing');
  if (!process.env.GEMINI_MODEL) throw new Error('Chatbot is not configured: GEMINI_MODEL is missing');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const chat = await ai.chats.create({
    model: process.env.GEMINI_MODEL,
    config: { systemInstruction: systemPrompt },
  });
  const result = await chat.sendMessage({ message: userMessage });
  if (!result.text) throw new Error('Chatbot returned an empty response');
  return result.text;
}

export { askGemini };
