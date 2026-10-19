import Razorpay from 'razorpay';
import crypto from 'crypto';

const client = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export { client, verifyPaymentSignature, verifyWebhookSignature };