import Settings from '../models/Settings.js';

async function getPublicSettings(_req, res, next) {
  try {
    const settings = await Settings.findOne({ singleton: 'main' });
    if (!settings) return res.json({ settings: {} });

    const { taxConfig, chatbotKnowledge, ...publicSettings } = settings.toObject();
    res.json({ settings: publicSettings });
  } catch (error) {
    next(error);
  }
}

async function getAdminSettings(_req, res, next) {
  try {
    const settings = await Settings.findOne({ singleton: 'main' });
    res.json({ settings: settings || {} });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    if (req.body.chatbotKnowledge !== undefined &&
      (typeof req.body.chatbotKnowledge !== 'string' || req.body.chatbotKnowledge.length > 5000)) {
      return res.status(400).json({ error: 'Chatbot guidance must be text of 5,000 characters or fewer' });
    }
    const settings = await Settings.findOneAndUpdate(
      { singleton: 'main' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json({ settings });
  } catch (error) {
    next(error);
  }
}

export { getPublicSettings, getAdminSettings, updateSettings };
