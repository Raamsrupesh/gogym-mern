import PDFDocument from 'pdfkit';

const LOGO_URL =
  'https://res.cloudinary.com/dbeasd4ey/image/upload/v1792595176/WhatsApp_Image_2026-10-21_at_18.42.42.jpg';

// Cache the logo so it is not downloaded for every receipt.
let logoPromise;

function getLogo() {
  if (!logoPromise) {
    logoPromise = fetch(LOGO_URL, {
      signal: AbortSignal.timeout(10000),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Logo download failed: ${response.status}`);
        }

        return Buffer.from(await response.arrayBuffer());
      })
      .catch((error) => {
        logoPromise = undefined;
        throw error;
      });
  }

  return logoPromise;
}

async function buildReceipt({
  business,
  receiptNumber,
  issueDate,
  member,
  plan,
  amountInPaise,
  paymentId,
  method,
}) {
  const paid = Number(amountInPaise);

  if (!Number.isSafeInteger(paid) || paid < 0) {
    throw new Error('amountInPaise must be a non-negative integer.');
  }

  // Download before creating the PDF so failures reject cleanly.
  const logo = await getLogo();

  const doc = new PDFDocument({
    size: 'A4',
    margin: 32,
  });

  const businessName = business?.businessName || 'GoGym';

  // Existing string arguments remain supported.
  const memberName =
    typeof member === 'object' && member !== null
      ? member.name || '-'
      : member || '-';

  const planName =
    typeof plan === 'object' && plan !== null
      ? plan.name || '-'
      : plan || '-';

  const formattedDate =
    issueDate instanceof Date
      ? issueDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
        })
      : String(issueDate || '-');

  const amount = `INR ${(paid / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const left = 32;
  const width = doc.page.width - left * 2;
  const right = left + width;
  const middle = left + width / 2;

  const orange = '#E84920';
  const border = '#777777';

  function text(
    value,
    x,
    y,
    w,
    {
      size = 8,
      bold = false,
      align = 'left',
      color = '#111111',
      height = 20,
    } = {}
  ) {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor(color)
      .text(String(value ?? ''), x, y, {
        width: w,
        height,
        align,
        ellipsis: true,
      });
  }

  function line(x1, y1, x2, y2) {
    doc
      .save()
      .lineWidth(0.6)
      .strokeColor(border)
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .stroke()
      .restore();
  }

  function box(x, y, w, h) {
    doc
      .save()
      .lineWidth(0.6)
      .strokeColor(border)
      .rect(x, y, w, h)
      .stroke()
      .restore();
  }

  function bar(label, x, y, w, align = 'left') {
    doc
      .save()
      .fillColor(orange)
      .rect(x, y, w, 15)
      .fill()
      .restore();

    text(label, x + 5, y + 4, w - 10, {
      size: 7,
      bold: true,
      color: '#FFFFFF',
      align,
      height: 10,
    });
  }

  function amountInWords(paise) {
    const small = [
      'Zero', 'One', 'Two', 'Three', 'Four', 'Five',
      'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
      'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
      'Nineteen',
    ];

    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty',
      'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    function words(n) {
      if (n < 20) return small[n];

      if (n < 100) {
        return `${tens[Math.floor(n / 10)]}${
          n % 10 ? ` ${small[n % 10]}` : ''
        }`;
      }

      for (const [scale, label] of [
        [10000000, 'Crore'],
        [100000, 'Lakh'],
        [1000, 'Thousand'],
        [100, 'Hundred'],
      ]) {
        if (n >= scale) {
          return `${words(Math.floor(n / scale))} ${label}${
            n % scale ? ` ${words(n % scale)}` : ''
          }`;
        }
      }

      return '';
    }

    const rupees = Math.floor(paise / 100);
    const remainder = paise % 100;

    return `${words(rupees)} Rupees${
      remainder ? ` and ${words(remainder)} Paise` : ''
    } Only`;
  }

  // Document title
  text('Payment Receipt', left, 35, width, {
    size: 11,
    bold: true,
    align: 'center',
  });

  // Business header
  box(left, 54, width, 64);

  doc.image(logo, left + 8, 61, {
    fit: [85, 47],
    align: 'center',
    valign: 'center',
  });

  text(businessName, left + 110, 61, width - 118, {
    size: 13,
    bold: true,
    align: 'right',
  });

  text(business?.address || '', left + 110, 79, width - 118, {
    size: 7,
    align: 'right',
    height: 16,
  });

  text(
    [
      business?.phone ? `Phone: ${business.phone}` : '',
      business?.email ? `Email: ${business.email}` : '',
    ].filter(Boolean).join(' | '),
    left + 110,
    96,
    width - 118,
    { size: 6.5, align: 'right', height: 10 }
  );

  text(
    business?.gstin ? `GSTIN: ${business.gstin}` : '',
    left + 110,
    107,
    width - 118,
    { size: 6.5, align: 'right', height: 9 }
  );

  // Member and receipt details
  bar('Bill To', left, 118, width / 2);
  bar('Receipt Details', middle, 118, width / 2, 'right');

  box(left, 118, width, 60);
  line(middle, 118, middle, 178);

  text(memberName, left + 6, 140, width / 2 - 12, {
    size: 9,
    bold: true,
    height: 28,
  });

  text(`Receipt No: ${receiptNumber || '-'}`, middle + 6, 139, width / 2 - 12, {
    size: 7,
    align: 'right',
    height: 10,
  });

  text(`Date: ${formattedDate}`, middle + 6, 151, width / 2 - 12, {
    size: 7,
    align: 'right',
    height: 10,
  });

  text(`Method: ${method || '-'}`, middle + 6, 163, width / 2 - 12, {
    size: 7,
    align: 'right',
    height: 10,
  });

  // Only show columns supported by the original arguments.
  const columns = [
    { label: '#', ratio: 0.05, value: '1' },
    { label: 'Item Name / Plan', ratio: 0.43, value: planName },
    { label: 'Quantity', ratio: 0.10, value: '1' },
    { label: 'Price / Unit', ratio: 0.21, value: amount },
    { label: 'Amount', ratio: 0.21, value: amount },
  ];

  doc
    .save()
    .fillColor(orange)
    .rect(left, 178, width, 23)
    .fill()
    .restore();

  box(left, 178, width, 66);
  line(left, 201, right, 201);

  let x = left;

  columns.forEach((column, index) => {
    const columnWidth = width * column.ratio;
    const align = index === 1 ? 'left' : 'center';

    if (index > 0) line(x, 178, x, 244);

    text(column.label, x + 4, 186, columnWidth - 8, {
      size: 7,
      bold: true,
      color: '#FFFFFF',
      align,
      height: 11,
    });

    text(column.value, x + 4, 211, columnWidth - 8, {
      size: 7.5,
      bold: index === 1,
      align,
      height: 27,
    });

    x += columnWidth;
  });

  // Total
  box(left, 244, width, 18);

  text('Total', left + 5, 249, width / 2, {
    size: 7.5,
    bold: true,
    height: 11,
  });

  text(amount, right - 140, 249, 135, {
    size: 7.5,
    bold: true,
    align: 'right',
    height: 11,
  });

  // Amount in words and payment summary
  bar('Receipt Amount in Words', left, 262, width / 2, 'center');
  bar('Amounts', middle, 262, width / 2);

  box(left, 262, width, 95);
  line(middle, 262, middle, 357);

  text(amountInWords(paid), left + 8, 287, width / 2 - 16, {
    size: 8,
    align: 'center',
    height: 35,
  });

  text(
    `Payment reference: ${paymentId || '-'}`,
    left + 8,
    328,
    width / 2 - 16,
    { size: 6.5, color: '#555555', height: 23 }
  );

  const summary = [
    ['Sub Total', amount],
    ['Total', amount],
    ['Received', amount],
    ['Balance', 'INR 0.00'],
  ];

  summary.forEach(([label, value], index) => {
    const y = 277 + index * 20;

    if (index > 0) line(middle, y, right, y);

    text(label, middle + 5, y + 6, width / 2 - 110, {
      size: 7.5,
      bold: label === 'Total',
      height: 11,
    });

    text(value, right - 110, y + 6, 105, {
      size: 7.5,
      bold: label === 'Total',
      align: 'right',
      height: 11,
    });
  });

  // Terms and signature
  const termsY = 357;
  const termsHeight = 285;

  box(left, termsY, width, termsHeight);
  line(middle, termsY, middle, termsY + termsHeight);
  bar('Terms and Conditions', left, termsY, width / 2);

  const terms = [
    `${businessName} - Membership Terms & Conditions`,
    '',
    '1. Membership: Non-transferable and non-refundable. Validity and session limits follow the selected plan.',
    '',
    '2. Responsibility: Work out at your own risk. Use equipment safely and follow trainer instructions.',
    '',
    '3. Discipline: Re-rack weights after use and respect other members.',
    '',
    '4. Belongings: Members are responsible for their personal belongings.',
    '',
    '5. Access: Only registered members are allowed.',
    '',
    '6. Timings: Follow the gym timings and facility rules displayed at the premises.',
    '',
    '7. Training: Do not train other members without management permission.',
    '',
    '8. Respect the gym. Respect others. Stay fit!',
    '',
    'For questions or assistance, please contact the gym.',
    '',
    'Stay committed, stay fit!',
    '',
    `The ${businessName} Team`,
  ].join('\n');

  text(terms, left + 7, termsY + 23, width / 2 - 14, {
    size: 7.2,
    height: termsHeight - 30,
  });

  text(`For: ${businessName}`, middle + 8, termsY + 12, width / 2 - 16, {
    size: 8,
    align: 'center',
  });

  line(middle + 65, termsY + 80, right - 65, termsY + 80);

  text(
    'Authorized Signatory',
    middle + 8,
    termsY + 88,
    width / 2 - 16,
    { size: 8, bold: true, align: 'center' }
  );

  text(
    'This document is a payment receipt. GST tax invoice details are governed by the business tax configuration.',
    left,
    termsY + termsHeight + 10,
    width,
    {
      size: 6.5,
      color: '#777777',
      align: 'center',
      height: 22,
    }
  );

  doc.end();
  return doc;
}

export { buildReceipt };