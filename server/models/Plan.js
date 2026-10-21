import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  priceInPaise: { type: Number, required: true, min: 0 },
  originalPriceInPaise: { type: Number, default: 0, min: 0 },
  joiningFeeInPaise: { type: Number, default: 0, min: 0 },
  durationDays: { type: Number, required: true, min: 1 },
  benefits: [String],
  active: { type: Boolean, default: true, index: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);