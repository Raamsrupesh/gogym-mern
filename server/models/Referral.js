import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  code: { type: String, required: true, uppercase: true, index: true },
  status: { type: String, enum: ['pending', 'converted', 'rewarded', 'rejected'], default: 'pending', index: true },
  reward: { type: String, trim: true, maxlength: 200 },
  newMemberDiscountInPaise: { type: Number, default: 0, min: 0 },
  referrerDiscountInPaise: { type: Number, default: 0, min: 0 },
  newMemberDiscountReservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  newMemberDiscountAppliedAt: Date,
  rewardedAt: Date,
}, { timestamps: true });

export default mongoose.model('Referral', referralSchema);
