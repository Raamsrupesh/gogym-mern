import mongoose from 'mongoose';

const featureConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: 'main', unique: true },
  referralsEnabled: { type: Boolean, default: false },
  referralReward: { type: String, default: '' },
  newMemberDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
  referrerDiscountInPaise: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export default mongoose.model('FeatureConfig', featureConfigSchema);
