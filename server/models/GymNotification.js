import mongoose from 'mongoose';

const gymNotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['workout_plan', 'trainer_note', 'diet_plan', 'message'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  readAt: Date,
  emailStatus: { type: String, enum: ['not_configured', 'sent', 'failed'], default: 'not_configured' },
  emailError: String,
}, { timestamps: true });

export default mongoose.model('GymNotification', gymNotificationSchema);
