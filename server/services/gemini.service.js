import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

async function askGemini(systemPrompt, userMessage) {
   try {
    // Create chat session
    const chat = await ai.chats.create({
      model: process.env.GEMINI_MODEL
    });

    // Get the full response all at once (Non-streaming)
    const result = await chat.sendMessage({ message: `${systemPrompt}\n\n${userMessage}` });

    // console.log("Gemini Answer:", result.text);

    // Send back regular JSON so you can see it easily in your tool/browser
    return result.text;

  } catch (error) {
    console.error('Chat error details:', error);
    res.status(500).json({ error: error.message });
  }
}
export { askGemini };
/*
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';


const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

  const { newMessage } = req.body;

  try {
    // Create chat session
    const chat = ai.chats.create({
      model: process.env.GEMINI_MODEL
    });

    // Get the full response all at once (Non-streaming)
    const result = await chat.sendMessage({ message: newMessage });

    console.log("Gemini Answer:", result.text);

    // Send back regular JSON so you can see it easily in your tool/browser
    res.json({ text: result.text });

  } catch (error) {
    console.error('Chat error details:', error);
    res.status(500).json({ error: error.message });
  }
});
*/