import Plan from '../models/Plan.js';
import Settings from '../models/Settings.js';
import Lead from '../models/Lead.js';
import { askGemini } from '../services/gemini.service.js';

async function answerChatbotQuestion(req, res, next) {
  try {
    const { message, captureLead, lead } = req.body;
    if (!message || typeof message !== 'string' || message.length > 800) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    const [settings, plans] = await Promise.all([
      Settings.findOne({ singleton: 'main' }),
      Plan.find({ active: true }),
    ]);
    const planFacts = plans
      .map((plan) => `- ${plan.name}: INR ${plan.priceInPaise / 100} for ${plan.durationDays} days. ${plan.description || ''}`)
      .join('\n');
    const business = settings || {};
    const systemPrompt = `You are the ${business.businessName || 'GoGym'} assistant. Answer ONLY from these facts.
Address: ${business.address || 'not set'}
Phone: ${business.phone || 'not set'}
WhatsApp: ${business.whatsapp || 'not set'}
Hours: ${business.openingHours || 'not set'}
Plans:
${planFacts || 'no plans configured'}
Refund policy: ${business.refundPolicy || 'not set'}
If you do not know, say "Please contact the gym directly" and give the phone number. Never invent prices.`;
    const reply = await askGemini(systemPrompt, message);

    if (captureLead && lead?.name && lead?.phone) {
      await Lead.create({ ...lead, source: 'chatbot' });
    }
    res.json({ reply });
  } catch (error) {
    next(error);
  }
}

export { answerChatbotQuestion };
