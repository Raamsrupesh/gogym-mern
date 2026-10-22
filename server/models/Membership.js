import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planSnapshot: {
    name: String, priceInPaise: Number, durationDays: Number,
    joiningFeeInPaise: Number, benefits: [String], dietGuidance: { type: Boolean, default: false },
  },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending', index: true },
  activatedByPaymentId: { type: String },
  source: { type: String, enum: ['online', 'offline', 'renewal', 'extension'], default: 'online' },
}, { timestamps: true });

membershipSchema.index({ member: 1, status: 1 });
export default mongoose.model('Membership', membershipSchema);