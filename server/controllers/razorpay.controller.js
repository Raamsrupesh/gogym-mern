import Plan from '../models/Plan.js';
import Payment from '../models/Payment.js';
import Membership from '../models/Membership.js';
import AuditLog from '../models/AuditLog.js';
import Counter from '../models/Counter.js';
import { client, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpay.service.js';

async function createRazorpayOrder(req, res, next) {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);
    if (!plan || !plan.active) return res.status(400).json({ error: 'Plan unavailable' });

    const amount = plan.priceInPaise + (plan.joiningFeeInPaise || 0);
    const order = await client.orders.create({
      amount,
      currency: 'INR',
      receipt: `gogym_${Date.now()}`,
      notes: { planId: plan._id.toString(), memberId: req.user.sub },
    });
    const payment = await Payment.create({
      member: req.user.sub,
      plan: plan._id,
      amountInPaise: amount,
      method: 'razorpay',
      status: 'created',
      razorpayOrderId: order.id,
    });
    res.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });
  } catch (error) {
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
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function activatePaidOrder(orderId, razorpayPaymentId) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) throw Object.assign(new Error('Order not found'), { status: 404 });
  if (payment.status === 'captured') return { ok: true, alreadyProcessed: true };

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

  await AuditLog.create({
    action: 'payment.captured',
    target: payment._id.toString(),
    details: { razorpayPaymentId, amountInPaise: payment.amountInPaise },
  });

  return { ok: true, membershipId: membership._id, invoiceNumber };
}

export { createRazorpayOrder, verifyRazorpayPayment, handleRazorpayWebhook };
