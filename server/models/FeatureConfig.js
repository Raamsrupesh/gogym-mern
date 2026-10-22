import mongoose from 'mongoose';

const featureConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: 'main', unique: true },
  referralsEnabled: { type: Boolean, default: false },
  referralReward: { type: String, default: '' },
  newMemberDiscountInPaise: { type: Number, default: 0, min: 0 },
  referrerDiscountInPaise: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export default mongoose.model('FeatureConfig', featureConfigSchema);
