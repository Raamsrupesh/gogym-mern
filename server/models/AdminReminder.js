import mongoose from 'mongoose';

const adminReminderSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  scheduledAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['queued', 'sending', 'sent', 'failed'], default: 'queued', index: true },
  error: String,
  sentAt: Date,
}, { timestamps: true });

export default mongoose.model('AdminReminder', adminReminderSchema);
