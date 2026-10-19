import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stage: { type: String, required: true }, // e.g. "7d", "0d", "paid"
  channel: { type: String, enum: ['email', 'whatsapp_manual', 'none'], default: 'email' },
  status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued' },
  error: String,
  sentAt: Date,
}, { timestamps: true });

reminderSchema.index({ membership: 1, stage: 1 }, { unique: true });
export default mongoose.model('ReminderLog', reminderSchema);