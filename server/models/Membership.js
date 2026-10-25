import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  planSnapshot: {
    name: String, priceInPaise: Number, durationDays: Number,
    category: { type: String, enum: ['basic', 'professional'] },
    joiningFeeInPaise: Number, benefits: [String], dietGuidance: { type: Boolean, default: false },
    features: {
      gym_access: Boolean,
      daily_session_limit: Number,
      training_guidance: Boolean,
      diet_chart: Boolean,
      bmi_report: Boolean,
      body_measurements: Boolean,
      progress_tracking: Boolean,
      regular_assessments: Boolean,
      priority_support: Boolean,
    },
  },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending', index: true },
  activatedByPaymentId: { type: String },
  source: { type: String, enum: ['online', 'offline', 'renewal', 'extension'], default: 'online' },
}, { timestamps: true });

membershipSchema.index({ member: 1, status: 1 });
export default mongoose.model('Membership', membershipSchema);