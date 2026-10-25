import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Referral from '../models/Referral.js';
import FeatureConfig from '../models/FeatureConfig.js';

export async function createReferralClaim(referredId, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  const config = await FeatureConfig.findOne({ singleton: 'main' });
  if (!config?.referralsEnabled) throw Object.assign(new Error('Referrals are not currently enabled'), { status: 403 });
  if (!code || code.length > 32) throw Object.assign(new Error('Referral code is invalid'), { status: 400 });

  const referrer = await User.findOne({ referralCode: code, role: 'member', status: 'active' });
  if (!referrer) throw Object.assign(new Error('Referral code is invalid'), { status: 400 });
  if (referrer._id.toString() === referredId.toString()) {
    throw Object.assign(new Error('You cannot refer yourself'), { status: 400 });
  }
  const membership = await Membership.exists({
    member: referrer._id, status: 'active', startDate: { $lte: new Date() }, expiryDate: { $gt: new Date() },
  });
  if (!membership) throw Object.assign(new Error('Referral code owner is not currently eligible'), { status: 400 });
  if (await Membership.exists({ member: referredId })) {
    throw Object.assign(new Error('Referral discounts are only available to new members'), { status: 400 });
  }
  if (await Referral.exists({ referred: referredId })) {
    throw Object.assign(new Error('A referral has already been recorded for this account'), { status: 409 });
  }

  try {
    return await Referral.create({
      referrer: referrer._id,
      referred: referredId,
      code,
      reward: config.referralReward,
      newMemberDiscountPercent: config.newMemberDiscountPercent || 0,
      referrerDiscountInPaise: config.referrerDiscountInPaise || 0,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw Object.assign(new Error('A referral has already been recorded for this account'), { status: 409 });
    }
    throw error;
  }
}

export async function completeReferralForMember(memberId) {
  let referral = await Referral.findOneAndUpdate(
    { referred: memberId, status: 'pending' },
    { $set: { status: 'converted' } },
    { new: true }
  );
  if (!referral) {
    referral = await Referral.findOne({ referred: memberId, status: { $in: ['converted', 'rewarded'] } });
  }
  if (!referral || referral.referrerDiscountInPaise <= 0) return referral;

  const credited = await User.updateOne(
    { _id: referral.referrer, referralRewardedIds: { $ne: referral._id } },
    {
      $inc: { referralDiscountBalanceInPaise: referral.referrerDiscountInPaise },
      $addToSet: { referralRewardedIds: referral._id },
    }
  );
  if (credited.modifiedCount) {
    referral.status = 'rewarded';
    referral.rewardedAt = new Date();
    await referral.save();
  }
  return referral;
}
