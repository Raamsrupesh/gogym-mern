import nodemailer from 'nodemailer';

let transport;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

async function sendEmail({ to, subject, text }) {
  const t = getTransport();
  if (!t) throw new Error('SMTP not configured');
  return t.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
export { sendEmail };