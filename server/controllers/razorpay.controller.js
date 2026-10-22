import Plan from '../models/Plan.js';
import Payment from '../models/Payment.js';
import Membership from '../models/Membership.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import Counter from '../models/Counter.js';
import { client, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service.js';
import { completeReferralForMember } from '../services/referrals.service.js';

async function createRazorpayOrder(req, res, next) {
  let payment;
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan || !plan.active) return res.status(400).json({ error: 'Plan unavailable' });

    const originalAmount = plan.priceInPaise + (plan.joiningFeeInPaise || 0);
    if (!Number.isSafeInteger(originalAmount) || originalAmount < 100) {
      return res.status(400).json({ error: 'Plan total must be at least ₹1' });
    }
    const pendingPayment = await Payment.findOne({ member: req.user.sub, status: 'created' }).sort({ createdAt: -1 });
    if (pendingPayment) {
      if (pendingPayment.createdAt > new Date(Date.now() - 35 * 60 * 1000)) {
        return res.status(409).json({ error: 'A payment checkout is already open. Complete or close it before starting another.' });
      }
      await releasePaymentDiscounts(pendingPayment);
    }
    payment = await Payment.create({
      member: req.user.sub,
      plan: plan._id,
      amountInPaise: originalAmount,
      originalAmountInPaise: originalAmount,
      method: 'razorpay',
      status: 'created',
    });

    const referral = await Referral.findOne({
      referred: req.user.sub,
      status: 'pending',
      newMemberDiscountAppliedAt: { $exists: false },
      newMemberDiscountReservedBy: { $exists: false },
    });
    let referralDiscount = 0;
    if (referral?.newMemberDiscountInPaise > 0) {
      const requested = Math.min(referral.newMemberDiscountInPaise, originalAmount - 100);
      if (requested > 0) {
        const reserved = await Referral.findOneAndUpdate(
          { _id: referral._id, status: 'pending', newMemberDiscountReservedBy: { $exists: false }, newMemberDiscountAppliedAt: { $exists: false } },
          { $set: { newMemberDiscountReservedBy: payment._id } },
          { new: true }
        );
        if (reserved) {
          referralDiscount = requested;
          payment.referral = referral._id;
        }
      }
    }

    const user = await User.findById(req.user.sub).select('referralDiscountBalanceInPaise');
    const availableCredit = user?.referralDiscountBalanceInPaise || 0;
    const creditLimit = Math.max(0, originalAmount - 100 - referralDiscount);
    const referrerDiscount = Math.min(availableCredit, creditLimit);
    if (referrerDiscount > 0) {
      await User.findOneAndUpdate(
        {
          _id: req.user.sub,
          referralDiscountBalanceInPaise: { $gte: referrerDiscount },
          'referralDiscountReservation.payment': { $exists: false },
        },
        { $set: { referralDiscountReservation: { payment: payment._id, amountInPaise: referrerDiscount } } },
        { new: true }
      );
    }
    const reservedCredit = referrerDiscount > 0 && (await User.exists({
      _id: req.user.sub, 'referralDiscountReservation.payment': payment._id,
    })) ? referrerDiscount : 0;
    const amount = originalAmount - referralDiscount - reservedCredit;
    payment.amountInPaise = amount;
    payment.referralDiscountInPaise = referralDiscount;
    payment.referrerDiscountInPaise = reservedCredit;
    if (!referralDiscount) payment.referral = undefined;
    await payment.save();

    const order = await client.orders.create({
      amount,
      currency: 'INR',
      receipt: `gogym_${Date.now()}`,
      expire_by: Math.floor(Date.now() / 1000) + 30 * 60,
      notes: { planId: plan._id.toString(), memberId: req.user.sub },
    });
    payment.razorpayOrderId = order.id;
    await payment.save();
    res.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      originalAmountInPaise: originalAmount,
      referralDiscountInPaise: referralDiscount,
      referrerDiscountInPaise: reservedCredit,
    });
  } catch (error) {
    if (payment?._id) await releasePaymentDiscounts(payment);
    next(error);
  }
}

async function verifyRazorpayPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const isValidSignature = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!isValidSignature) return res.status(400).json({ error: 'Invalid signature' });

    const result = await activatePaidOrder(razorpay_order_id, razorpay_payment_id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function handleRazorpayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ error: 'Bad signature' });
    }

    const event = JSON.parse(req.body.toString());
    const eventId = event.event_id || `${event.event}:${event.payload?.payment?.entity?.id}`;
    const existingEvent = await Counter.findOne({ _id: `wh:${eventId}` });
    if (existingEvent) return res.json({ ok: true, deduped: true });
    await Counter.create({ _id: `wh:${eventId}`, seq: 1 });

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      await activatePaidOrder(payment.order_id, payment.id);
    } else if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      await failPaidOrder(payment.order_id);
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function activatePaidOrder(orderId, razorpayPaymentId) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (payment.status === 'captured') {
    await settlePaymentDiscounts(payment);
    await completeReferralForMember(payment.member);
    return { ok: true, alreadyProcessed: true };
  }
  if (payment.status === 'failed') throw Object.assign(new Error('This payment order is no longer active'), { status: 409 });

  const plan = await Plan.findById(payment.plan);
  const now = new Date();
  const expiryDate = new Date(now.getTime() + plan.durationDays * 86400000);
  const membership = await Membership.create({
    member: payment.member,
    plan: plan._id,
    planSnapshot: {
      name: plan.name,
      priceInPaise: plan.priceInPaise,
      durationDays: plan.durationDays,
      joiningFeeInPaise: plan.joiningFeeInPaise,
      benefits: plan.benefits,
      dietGuidance: plan.dietGuidance,
    },
    startDate: now,
    expiryDate,
    status: 'active',
    activatedByPaymentId: razorpayPaymentId,
    source: 'online',
  });

  const invoiceSequence = await Counter.next('invoice');
  const invoiceNumber = `GOGYM-${new Date().getFullYear()}-${String(invoiceSequence).padStart(6, '0')}`;
  payment.status = 'captured';
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.paidAt = now;
  payment.membership = membership._id;
  payment.invoiceNumber = invoiceNumber;
  await payment.save();
  await settlePaymentDiscounts(payment);
  await completeReferralForMember(payment.member);

  await AuditLog.create({
    action: 'payment.captured',
    target: payment._id.toString(),
    details: { razorpayPaymentId, amountInPaise: payment.amountInPaise },
  });

  return { ok: true, membershipId: membership._id, invoiceNumber };
}

async function settlePaymentDiscounts(payment) {
  if (payment.referral && payment.referralDiscountInPaise > 0) {
    await Referral.updateOne(
      { _id: payment.referral, newMemberDiscountReservedBy: payment._id, newMemberDiscountAppliedAt: { $exists: false } },
      { $set: { newMemberDiscountAppliedAt: new Date() }, $unset: { newMemberDiscountReservedBy: 1 } }
    );
  }
  if (payment.referrerDiscountInPaise > 0) {
    await User.updateOne(
      { _id: payment.member, 'referralDiscountReservation.payment': payment._id, referralDiscountBalanceInPaise: { $gte: payment.referrerDiscountInPaise } },
      {
        $inc: { referralDiscountBalanceInPaise: -payment.referrerDiscountInPaise },
        $unset: { referralDiscountReservation: 1 },
      }
    );
  }
}

async function releasePaymentDiscounts(payment) {
  await Payment.updateOne({ _id: payment._id, status: 'created' }, { $set: { status: 'failed' } });
  if (payment.referral) {
    await Referral.updateOne(
      { _id: payment.referral, newMemberDiscountReservedBy: payment._id },
      { $unset: { newMemberDiscountReservedBy: 1 } }
    );
  }
  await User.updateOne(
    { _id: payment.member, 'referralDiscountReservation.payment': payment._id },
    { $unset: { referralDiscountReservation: 1 } }
  );
}

async function failPaidOrder(orderId) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId, status: 'created' });
  if (payment) await releasePaymentDiscounts(payment);
}

async function failRazorpayPayment(req, res, next) {
  try {
    if (typeof req.body.orderId !== 'string' || !req.body.orderId) {
      return res.status(400).json({ error: 'Payment order ID is required' });
    }
    const payment = await Payment.findOne({ razorpayOrderId: req.body.orderId, member: req.user.sub });
    if (!payment) return res.status(404).json({ error: 'Payment order not found' });
    if (payment.status === 'created') await releasePaymentDiscounts(payment);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook, failRazorpayPayment };
