async function sendRenewalWhatsApp({ to, name, days, expiryDate }) {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_RENEWAL_TEMPLATE_NAME } = process.env;
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_API_VERSION || !WHATSAPP_RENEWAL_TEMPLATE_NAME) {
    throw new Error('WhatsApp Cloud API is not configured');
  }
  const recipient = String(to || '').replace(/\D/g, '');
  if (recipient.length < 8 || recipient.length > 15) {
    throw new Error('Member phone number must include its country code for WhatsApp delivery');
  }

  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: WHATSAPP_RENEWAL_TEMPLATE_NAME,
        language: { code: process.env.WHATSAPP_RENEWAL_TEMPLATE_LANGUAGE || 'en' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: days === 0 ? 'today' : `in ${days} days` },
            { type: 'text', text: expiryDate },
          ],
        }],
      },
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || `WhatsApp delivery failed with status ${response.status}`);
  }
  return result;
}

export { sendRenewalWhatsApp };
