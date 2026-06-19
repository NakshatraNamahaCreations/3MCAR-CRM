/**
 * Professional quotation PDF (pdfkit), modelled on a studio-style template:
 * logo header, meta block, bill-to + vehicle boxes, service table, totals +
 * amount-in-words, payment terms + bank details, two-column T&C, signature
 * blocks, and a scan-to-pay QR footer.
 *
 * Company/bank identity is read from env (WORKSHOP_* / BANK_*), so nothing is
 * hard-coded. Returns a Promise (QR generation is async).
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from './numberToWords.js';

const C = {
  red: '#dc2626',
  ink: '#1f2937',
  sub: '#64748b',
  faint: '#94a3b8',
  line: '#e5e7eb',
  soft: '#f8fafc',
};

const rs = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Saved company Settings (from DB) take priority; env vars are the fallback.
const cfg = (s = {}) => {
  const pick = (val, env, def) => (val !== undefined && val !== null && val !== '' ? val : (env || def));
  return {
    brandTop: process.env.WORKSHOP_BRAND_TOP || '3M',
    brandRest: process.env.WORKSHOP_BRAND_REST || 'CAR CARE STUDIO',
    name: pick(s.companyName, process.env.WORKSHOP_NAME, '3M Car Care'),
    tagline: pick(s.tagline, process.env.WORKSHOP_TAGLINE, 'Premium Automotive Protection'),
    address: pick(s.address, process.env.WORKSHOP_ADDRESS, 'Jayanagar, Bengaluru'),
    phone: pick(s.phone, process.env.WORKSHOP_PHONE, ''),
    email: pick(s.email, process.env.WORKSHOP_EMAIL, ''),
    gstin: pick(s.gstin, process.env.WORKSHOP_GSTIN, ''),
    pan: pick(s.pan, process.env.WORKSHOP_PAN, ''),
    bankAccountName: pick(s.bankAccountName, '', ''),
    bankName: pick(s.bankName, process.env.BANK_NAME, ''),
    bankAccount: pick(s.bankAccountNumber, process.env.BANK_ACCOUNT_NO, ''),
    bankIfsc: pick(s.bankIfsc, process.env.BANK_IFSC, ''),
    upi: pick(s.upiId, process.env.WORKSHOP_UPI, ''),
    upiName: pick(s.upiDisplayName, '', ''),
    advance: pick(s.paymentAdvance, process.env.PAYMENT_ADVANCE, '50% at booking'),
    balance: pick(s.paymentBalance, process.env.PAYMENT_BALANCE, '50% on completion'),
    modes: pick(s.paymentModes, process.env.PAYMENT_MODES, 'Cash / UPI / Card / NEFT'),
  };
};

const DEFAULT_TERMS = [
  'Quotation valid for 15 days from date of issue.',
  'Payment: 50% advance, balance on completion.',
  'Warranty as per product/service terms.',
  'Vehicle must be free from modifications affecting service quality.',
  'Service time may vary based on vehicle condition.',
  'Not responsible for pre-existing damages not reported at drop-off.',
];

/** Build a QR PNG buffer (UPI payment link if configured, else company text). */
const makeQr = async (co, amount) => {
  const payload = co.upi
    ? `upi://pay?pa=${co.upi}&pn=${encodeURIComponent(co.upiName || co.name)}&am=${amount}&cu=INR`
    : `${co.name} — ${co.phone || ''}`;
  try {
    return await QRCode.toBuffer(payload, { margin: 1, width: 120 });
  } catch {
    return null;
  }
};

export const streamQuotePdf = async (quote, stream, settings = {}) => {
  const co = cfg(settings);
  const grand = quote.totalAmount || 0;
  const qr = await makeQr(co, grand);

  const M = 36;
  const doc = new PDFDocument({ size: 'A4', margin: M });
  doc.pipe(stream);

  const W = doc.page.width;
  const right = W - M;
  const contentW = right - M;

  // Top red rule
  doc.rect(0, 0, W, 4).fill(C.red);

  /* ---------------- Header ---------------- */
  let y = 22;
  doc.fillColor(C.red).font('Helvetica-Bold').fontSize(30).text(co.brandTop, M, y, { continued: false });
  const topW = doc.widthOfString(co.brandTop);
  doc.fillColor(C.ink).fontSize(12).text(co.brandRest.split(' ')[0] || '', M + topW + 6, y + 2);
  doc.fontSize(12).text(co.brandRest.split(' ').slice(1).join(' '), M + topW + 6, y + 16);
  doc.font('Helvetica').fillColor(C.sub).fontSize(8);
  doc.text(co.address, M, y + 36);
  doc.text([co.phone && `Phone: ${co.phone}`, co.email && `Email: ${co.email}`].filter(Boolean).join('  |  '), M, y + 47);
  doc.text([co.gstin && `GSTIN: ${co.gstin}`, co.pan && `PAN: ${co.pan}`].filter(Boolean).join('  |  '), M, y + 58);

  // Right: "Quotation" title + underline
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(22).text('Quotation', right - 200, y, { width: 200, align: 'right' });
  doc.moveTo(right - 120, y + 28).lineTo(right, y + 28).strokeColor(C.red).lineWidth(1.5).stroke();

  // Right meta block
  const metaRow = (label, value, yy, chip) => {
    doc.font('Helvetica').fontSize(8).fillColor(C.faint).text(label, right - 240, yy, { width: 110, align: 'right' });
    if (chip) {
      const w = doc.widthOfString(value) + 12;
      doc.roundedRect(right - w, yy - 2, w, 13, 3).fill('#dcfce7');
      doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(8).text(value, right - w, yy + 1, { width: w, align: 'center' });
    } else {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text(value, right - 125, yy, { width: 125, align: 'right' });
    }
  };
  let my = y + 40;
  metaRow('QUOTATION NO', quote.quoteNumber || '-', my); my += 14;
  metaRow('DATE', fmtDate(quote.createdAt), my); my += 14;
  const valid = new Date(quote.createdAt || Date.now());
  valid.setDate(valid.getDate() + 15);
  metaRow('VALID UNTIL', fmtDate(valid), my); my += 14;
  metaRow('STATUS', String(quote.status || 'draft').toUpperCase(), my, true);

  /* ---------------- Bill To + Vehicle boxes ---------------- */
  // Start below the header + meta block (meta extends to ~y+95) to avoid overlap.
  y = 134;
  const boxW = (contentW - 16) / 2;
  const boxH = 70;
  doc.roundedRect(M, y, boxW, boxH, 4).fillAndStroke(C.soft, C.line);
  doc.roundedRect(M + boxW + 16, y, boxW, boxH, 4).fillAndStroke(C.soft, C.line);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('BILL TO', M + 12, y + 10);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink).text(quote.customerName || '-', M + 12, y + 24);
  doc.font('Helvetica').fontSize(9).fillColor(C.sub).text(quote.phone || '', M + 12, y + 42);

  const vx = M + boxW + 16;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('VEHICLE INFORMATION', vx + 12, y + 10);
  const plate = deriveVehicleNo(quote.vehicleDetails);
  if (plate) {
    const pw = doc.widthOfString(plate.split('').join(' ')) + 16;
    doc.roundedRect(vx + 12, y + 24, pw, 18, 3).strokeColor(C.ink).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(plate.split('').join(' '), vx + 12, y + 28, { width: pw, align: 'center' });
  }
  doc.font('Helvetica').fontSize(9).fillColor(C.sub).text(quote.vehicleDetails || '—', vx + 12, y + 46, { width: boxW - 24 });

  /* ---------------- Service table ---------------- */
  y += boxH + 18;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red).text('SERVICE DETAILS', M, y, { characterSpacing: 1 });
  y += 16;
  const cols = { sno: M, desc: M + 36, warr: right - 230, qty: right - 150, rate: right - 100, amt: right - 50 };
  doc.moveTo(M, y).lineTo(right, y).strokeColor(C.red).lineWidth(1).stroke();
  y += 6;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.sub);
  doc.text('S.NO', cols.sno, y); doc.text('SERVICE DESCRIPTION', cols.desc, y);
  doc.text('WARRANTY', cols.warr, y, { width: 70, align: 'center' });
  doc.text('QTY', cols.qty, y, { width: 40, align: 'right' });
  doc.text('RATE (Rs.)', cols.rate, y, { width: 50, align: 'right' });
  doc.text('AMOUNT (Rs.)', cols.amt - 10, y, { width: 60, align: 'right' });
  y += 14;
  doc.moveTo(M, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.5).stroke();
  y += 8;

  (quote.lineItems || []).forEach((it, i) => {
    if (y > doc.page.height - 320) { doc.addPage(); y = M; }
    const qty = it.quantity ?? 1;
    const amt = it.total != null ? it.total : qty * (it.unitPrice || 0);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(String(i + 1).padStart(2, '0'), cols.sno, y);
    doc.font('Helvetica').fillColor(C.ink).text(it.itemName || '-', cols.desc, y, { width: cols.warr - cols.desc - 6 });
    doc.fillColor(C.faint).text('—', cols.warr, y, { width: 70, align: 'center' });
    doc.fillColor(C.red).text(String(qty), cols.qty, y, { width: 40, align: 'right' });
    doc.fillColor(C.ink).text(Number(it.unitPrice || 0).toLocaleString('en-IN'), cols.rate, y, { width: 50, align: 'right' });
    doc.font('Helvetica-Bold').text(Number(amt).toLocaleString('en-IN'), cols.amt - 10, y, { width: 60, align: 'right' });
    y += 18;
  });

  doc.moveTo(cols.warr, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.5).stroke();
  y += 8;
  doc.font('Helvetica').fontSize(9).fillColor(C.sub).text('Subtotal', cols.warr, y, { width: 120 });
  doc.fillColor(C.ink).text(rs(quote.subtotal).replace('Rs. ', 'Rs.'), cols.rate - 50, y, { width: 110, align: 'right' });
  y += 16;
  doc.moveTo(cols.warr, y).lineTo(right, y).strokeColor(C.ink).lineWidth(1).stroke();
  y += 6;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text('Grand Total', cols.warr, y, { width: 120 });
  doc.fillColor(C.red).text(rs(grand).replace('Rs. ', 'Rs.'), cols.rate - 50, y, { width: 110, align: 'right' });
  y += 22;

  // Amount in words
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.sub).text(numberToWords(grand), M, y);
  y += 22;

  /* ---------------- Payment terms + Bank details ---------------- */
  const colW = (contentW - 24) / 2;
  const py = y;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('PAYMENT TERMS', M, py, { characterSpacing: 0.5 });
  const pair = (label, value, yy, x, w) => {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.sub).text(label, x, yy);
    doc.font('Helvetica-Bold').fillColor(C.ink).text(value, x, yy, { width: w, align: 'right' });
  };
  let ly = py + 16;
  pair('ADVANCE', co.advance, ly, M, colW); ly += 14;
  pair('BALANCE', co.balance, ly, M, colW); ly += 14;
  doc.font('Helvetica').fontSize(8.5).fillColor(C.sub).text('MODE', M, ly);
  doc.font('Helvetica-Bold').fillColor(C.red).text(co.modes, M, ly, { width: colW, align: 'right' });

  const bx = M + colW + 24;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('BANK DETAILS', bx, py, { characterSpacing: 0.5 });
  let by = py + 16;
  if (co.bankAccountName) { pair('A/C NAME', co.bankAccountName, by, bx, colW); by += 14; }
  pair('BANK', co.bankName || '-', by, bx, colW); by += 14;
  pair('A/C NO.', co.bankAccount || '-', by, bx, colW); by += 14;
  pair('IFSC', co.bankIfsc || '-', by, bx, colW); by += 14;
  if (co.upi) pair('UPI', co.upi, by, bx, colW);

  y = Math.max(ly, by) + 24;

  /* ---------------- Terms & Conditions (two columns) ---------------- */
  const termList = (quote.termsAndConditions
    ? quote.termsAndConditions.split('\n').map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
    : DEFAULT_TERMS);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('TERMS & CONDITIONS', M, y, { characterSpacing: 0.5 });
  y += 14;
  const half = Math.ceil(termList.length / 2);
  const drawTerms = (arr, x, startIdx) => {
    let ty = y;
    arr.forEach((t, i) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text(`${startIdx + i + 1}.`, x, ty);
      doc.font('Helvetica').fillColor(C.sub).text(t, x + 14, ty, { width: colW - 16 });
      ty = doc.y + 4;
    });
    return ty;
  };
  const leftEnd = drawTerms(termList.slice(0, half), M, 0);
  const rightEnd = drawTerms(termList.slice(half), M + colW + 24, half);
  y = Math.max(leftEnd, rightEnd) + 18;

  /* ---------------- Signatures ---------------- */
  if (y > doc.page.height - 150) { doc.addPage(); y = M; }
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('CUSTOMER ACCEPTANCE', M, y);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text(`FOR ${co.name.toUpperCase()}`, bx, y);
  const sy = y + 40;
  doc.roundedRect(M, y + 14, colW, 34, 3).strokeColor(C.line).dash(2, { space: 2 }).stroke().undash();
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.faint).text('SIGN HERE', M, y + 27, { width: colW, align: 'center' });
  doc.moveTo(bx, sy + 10).lineTo(bx + colW, sy + 10).strokeColor(C.ink).lineWidth(0.8).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(co.name, bx, sy + 14, { width: colW, align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor(C.sub).text('Authorized Signatory', bx, sy + 26, { width: colW, align: 'center' });

  /* ---------------- Footer band + QR ---------------- */
  const fy = doc.page.height - 70;
  doc.moveTo(M, fy - 8).lineTo(right, fy - 8).strokeColor(C.line).lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(co.name, M, fy);
  doc.font('Helvetica').fontSize(8).fillColor(C.sub).text(co.tagline, M, fy + 12);
  doc.text([co.address, co.phone].filter(Boolean).join('  |  '), M, fy + 23);
  if (qr) {
    doc.image(qr, right - 50, fy - 6, { width: 46 });
    doc.font('Helvetica').fontSize(6.5).fillColor(C.faint).text('SCAN TO PAY', right - 70, fy + 42, { width: 66, align: 'center' });
  }

  // Bottom red rule
  doc.rect(0, doc.page.height - 4, W, 4).fill(C.red);

  doc.end();
};

/**
 * Pull a standard Indian plate (e.g. KA01AB1234 / KA01A1234) from free text.
 * Requires the series letter(s) between the RTO code and the final digits so it
 * doesn't false-match runs like "CRYSTA 20216". Returns null if none found.
 */
function deriveVehicleNo(text) {
  if (!text) return null;
  const compact = String(text).toUpperCase().replace(/\s|-/g, '');
  const m = compact.match(/[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}/);
  return m ? m[0] : null;
}

export default streamQuotePdf;
