import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
  amountInPaise: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['razorpay', 'cash', 'upi', 'other'], required: true },
  status: { type: String, enum: ['created', 'pending', 'captured', 'failed', 'refunded'], default: 'created', index: true },
  razorpayOrderId: { type: String, index: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for manual
  invoiceNumber: String,
  paidAt: Date,
}, { timestamps: true });

paymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
export default mongoose.model('Payment', paymentSchema);