import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  code: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['basic', 'professional'], default: 'basic', index: true },
  description: { type: String, default: '' },
  priceInPaise: { type: Number, required: true, min: 0 },
  originalPriceInPaise: { type: Number, default: 0, min: 0 },
  joiningFeeInPaise: { type: Number, default: 0, min: 0 },
  durationDays: { type: Number, required: true, min: 1 },
  benefits: [String],
  dietGuidance: { type: Boolean, default: false },
  features: {
    gym_access: { type: Boolean, default: true },
    daily_session_limit: { type: Number, default: 1, min: 0 },
    training_guidance: { type: Boolean, default: false },
    diet_chart: { type: Boolean, default: false },
    bmi_report: { type: Boolean, default: false },
    body_measurements: { type: Boolean, default: false },
    progress_tracking: { type: Boolean, default: false },
    regular_assessments: { type: Boolean, default: false },
    priority_support: { type: Boolean, default: false },
  },
  active: { type: Boolean, default: true, index: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);