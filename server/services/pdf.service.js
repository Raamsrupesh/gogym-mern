import PDFDocument from 'pdfkit';

function buildReceipt({ business, receiptNumber, issueDate, member, plan, amountInPaise, paymentId, method }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.fontSize(20).text(`${business.businessName || 'GoGym'} — Payment Receipt`, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#555')
    .text(`Receipt #: ${receiptNumber}`)
    .text(`Date: ${issueDate}`)
    .text(`Member: ${member}`)
    .text(`Plan: ${plan}`)
    .text(`Payment ref: ${paymentId} (${method})`);
  doc.moveDown();
  doc.fillColor('#000').fontSize(12).text('Amount paid', { continued: true }).text(`  INR ${(amountInPaise / 100).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#777').text(
    'This document is a payment receipt. GST tax invoice details are governed by the business tax configuration.'
  );
  doc.end();
  return doc;
}
export { buildReceipt };