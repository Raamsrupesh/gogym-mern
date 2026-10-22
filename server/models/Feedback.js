import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, required: true },
  overall: { type: Number, required: true, min: 1, max: 5 },
  cleanliness: { type: Number, min: 1, max: 5 },
  equipment: { type: Number, min: 1, max: 5 },
  trainer: { type: Number, min: 1, max: 5 },
  category: { type: String, trim: true, maxlength: 80 },
  message: { type: String, trim: true, maxlength: 3000 },
  response: { type: String, trim: true, maxlength: 3000 },
  resolved: { type: Boolean, default: false, index: true },
  publicApproved: { type: Boolean, default: false },
}, { timestamps: true });

feedbackSchema.index({ member: 1, period: 1 }, { unique: true });
export default mongoose.model('Feedback', feedbackSchema);
