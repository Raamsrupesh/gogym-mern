import mongoose from 'mongoose';
import AdminReminder from '../models/AdminReminder.js';
import User from '../models/User.js';

const invalid = (res, message) => res.status(400).json({ error: message });

export async function listAdminReminders(_req, res, next) {
  try {
    const reminders = await AdminReminder.find()
      .populate('member', 'name email')
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(500);
    res.json({ reminders });
  } catch (error) {
    next(error);
  }
}

export async function createAdminReminder(req, res, next) {
  try {
    const { memberId, title, message, scheduledAt } = req.body;
    const time = new Date(scheduledAt);
    if (typeof title !== 'string' || !title.trim() || title.length > 160 ||
      typeof message !== 'string' || !message.trim() || message.length > 2000 ||
      !scheduledAt || !Number.isFinite(time.getTime())) {
      return invalid(res, 'Provide a title, message, and valid scheduled time');
    }

    let members;
    if (memberId === 'all') {
      members = await User.find({ role: 'member', status: 'active' }).select('_id');
    } else {
      if (!mongoose.isValidObjectId(memberId)) return invalid(res, 'Select a valid member');
      const member = await User.findOne({ _id: memberId, role: 'member', status: 'active' }).select('_id');
      if (!member) return res.status(404).json({ error: 'Active member not found' });
      members = [member];
    }
    if (!members.length) return invalid(res, 'There are no active members to notify');
    const reminders = await AdminReminder.insertMany(members.map((member) => ({
      member: member._id,
      title: title.trim(),
      message: message.trim(),
      scheduledAt: time,
    })));
    res.status(201).json({ created: reminders.length });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminReminder(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const reminder = await AdminReminder.findByIdAndDelete(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
