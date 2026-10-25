import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stage: { type: String, required: true }, // e.g. "7d", "0d", "paid"
  channel: { type: String, enum: ['email', 'whatsapp', 'email_whatsapp', 'whatsapp_manual', 'none'], default: 'email_whatsapp' },
  status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued' },
  emailStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
  emailError: String,
  emailSentAt: Date,
  whatsappStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
  whatsappError: String,
  whatsappSentAt: Date,
  error: String,
  sentAt: Date,
}, { timestamps: true });

reminderSchema.index({ membership: 1, stage: 1 }, { unique: true });
export default mongoose.model('ReminderLog', reminderSchema);