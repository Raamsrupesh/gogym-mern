import Payment from '../models/Payment.js';
import Settings from '../models/Settings.js';
import { buildReceipt } from '../services/pdf.service.js';

async function downloadPaymentReceipt(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('member').populate('plan');
    if (!payment || payment.status !== 'captured') {
      return res.status(404).json({ error: 'Not found' });
    }

    const isStaff = req.user.role === 'owner' || req.user.role === 'staff';
    const isPaymentOwner = payment.member && payment.member._id.toString() === req.user.sub;
    if (!isStaff && !isPaymentOwner) return res.status(403).json({ error: 'Forbidden' });

    const settings = (await Settings.findOne({ singleton: 'main' })) || {};
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${payment.invoiceNumber || payment._id}.pdf"`
    );
    const receipt = buildReceipt({
      business: settings,
      receiptNumber: payment.invoiceNumber || String(payment._id),
      issueDate: (payment.paidAt || payment.createdAt).toISOString().slice(0, 10),
      member: payment.member?.name || 'Member',
      plan: payment.plan?.name || 'Plan',
      amountInPaise: payment.amountInPaise,
      paymentId: payment.razorpayPaymentId || String(payment._id),
      method: payment.method,
    });
    receipt.pipe(res);
  } catch (error) {
    next(error);
  }
}

export { downloadPaymentReceipt };
