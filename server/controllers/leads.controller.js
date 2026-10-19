import Lead from '../models/Lead.js';

async function submitWebsiteEnquiry(req, res, next) {
  try {
    const { name, phone, email, message, source } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

    const lead = await Lead.create({ name, phone, email, message, source: source || 'website' });
    res.json({ ok: true, id: lead._id });
  } catch (error) {
    next(error);
  }
}

async function searchLeads(req, res, next) {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Lead.countDocuments(filter);
    res.json({ leads, total });
  } catch (error) {
    next(error);
  }
}

async function updateLead(req, res, next) {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ lead });
  } catch (error) {
    next(error);
  }
}

export { submitWebsiteEnquiry, searchLeads, updateLead };
