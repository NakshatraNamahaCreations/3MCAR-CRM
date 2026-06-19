/**
 * Professional GST/Non-GST invoice PDF (pdfkit), matching the quotation template
 * style: logo header, meta block, bill-to + vehicle boxes, line-item table,
 * tax breakdown + amount-in-words, paid/balance, bank details, T&C, signatures,
 * and a scan-to-pay QR footer. Company/bank identity from env. Returns a Promise.
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from './numberToWords.js';

const C = {
  red: '#dc2626', ink: '#1f2937', sub: '#64748b', faint: '#94a3b8', line: '#e5e7eb', soft: '#f8fafc',
};

const rs = (n) =>
  'Rs.' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    bankName: pick(s.bankName, process.env.BANK_NAME, ''),
    bankAccount: pick(s.bankAccountNumber, process.env.BANK_ACCOUNT_NO, ''),
    bankIfsc: pick(s.bankIfsc, process.env.BANK_IFSC, ''),
    upi: pick(s.upiId, process.env.WORKSHOP_UPI, ''),
    upiName: pick(s.upiDisplayName, '', ''),
  };
};

const DEFAULT_TERMS = [
  'Goods/services once delivered are not returnable.',
  'Warranty as per product/service terms.',
  'Please verify all details on receipt.',
  'Interest @18% p.a. on overdue payments.',
  'Subject to local jurisdiction.',
  'This is a computer-generated invoice.',
];

const STATUS_CHIP = {
  paid: { bg: '#dcfce7', fg: '#15803d' },
  partial: { bg: '#fef3c7', fg: '#b45309' },
  unpaid: { bg: '#fee2e2', fg: '#b91c1c' },
};

const makeQr = async (co, amount) => {
  const payload = co.upi
    ? `upi://pay?pa=${co.upi}&pn=${encodeURIComponent(co.upiName || co.name)}&am=${amount}&cu=INR`
    : `${co.name} — ${co.phone || ''}`;
  try { return await QRCode.toBuffer(payload, { margin: 1, width: 120 }); } catch { return null; }
};

const itemLabel = (it) => {
  const name = it.name || it.itemName || '-';
  return it.itemType && it.itemType !== 'service' ? `${name}` : name;
};

export const streamInvoicePdf = async (invoice, stream, settings = {}) => {
  const co = cfg(settings);
  const grand = invoice.grandTotal || 0;
  const balance = invoice.balanceAmount != null ? invoice.balanceAmount : grand;
  const qr = await makeQr(co, balance > 0 ? balance : grand);

  const M = 36;
  const doc = new PDFDocument({ size: 'A4', margin: M });
  doc.pipe(stream);

  const W = doc.page.width;
  const right = W - M;
  const contentW = right - M;

  doc.rect(0, 0, W, 4).fill(C.red);

  /* Header */
  let y = 22;
  doc.fillColor(C.red).font('Helvetica-Bold').fontSize(30).text(co.brandTop, M, y);
  const topW = doc.widthOfString(co.brandTop);
  doc.fillColor(C.ink).fontSize(12).text(co.brandRest.split(' ')[0] || '', M + topW + 6, y + 2);
  doc.fontSize(12).text(co.brandRest.split(' ').slice(1).join(' '), M + topW + 6, y + 16);
  doc.font('Helvetica').fillColor(C.sub).fontSize(8);
  doc.text(co.address, M, y + 36);
  doc.text([co.phone && `Phone: ${co.phone}`, co.email && `Email: ${co.email}`].filter(Boolean).join('  |  '), M, y + 47);
  doc.text([co.gstin && `GSTIN: ${co.gstin}`, co.pan && `PAN: ${co.pan}`].filter(Boolean).join('  |  '), M, y + 58);

  const title = invoice.invoiceType === 'Non-GST' ? 'Invoice' : 'Tax Invoice';
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(22).text(title, right - 220, y, { width: 220, align: 'right' });
  doc.moveTo(right - 130, y + 28).lineTo(right, y + 28).strokeColor(C.red).lineWidth(1.5).stroke();

  const metaRow = (label, value, yy, chipColors) => {
    doc.font('Helvetica').fontSize(8).fillColor(C.faint).text(label, right - 240, yy, { width: 110, align: 'right' });
    if (chipColors) {
      doc.font('Helvetica-Bold').fontSize(8);
      const w = doc.widthOfString(value) + 12;
      doc.roundedRect(right - w, yy - 2, w, 13, 3).fill(chipColors.bg);
      doc.fillColor(chipColors.fg).text(value, right - w, yy + 1, { width: w, align: 'center' });
    } else {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink).text(value, right - 125, yy, { width: 125, align: 'right' });
    }
  };
  let my = y + 40;
  metaRow('INVOICE NO', invoice.invoiceNumber || '-', my); my += 14;
  metaRow('DATE', fmtDate(invoice.invoiceDate || invoice.createdAt), my); my += 14;
  metaRow('TYPE', invoice.invoiceType || 'GST', my); my += 14;
  metaRow('PAYMENT', String(invoice.paymentStatus || 'unpaid').toUpperCase(), my, STATUS_CHIP[invoice.paymentStatus] || STATUS_CHIP.unpaid);

  /* Bill To + Vehicle */
  // Start below the header + meta block to avoid overlap.
  y = 134;
  const cust = invoice.customerId || {};
  const veh = invoice.vehicleId || {};
  const boxW = (contentW - 16) / 2;
  const boxH = 70;
  doc.roundedRect(M, y, boxW, boxH, 4).fillAndStroke(C.soft, C.line);
  doc.roundedRect(M + boxW + 16, y, boxW, boxH, 4).fillAndStroke(C.soft, C.line);

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('BILL TO', M + 12, y + 10);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink).text(cust.name || '-', M + 12, y + 24);
  doc.font('Helvetica').fontSize(9).fillColor(C.sub);
  doc.text(cust.phone || '', M + 12, y + 42);
  const addr = [cust.address, cust.city, cust.state].filter(Boolean).join(', ');
  if (addr) doc.text(addr, M + 12, y + 53, { width: boxW - 24 });

  const vx = M + boxW + 16;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text('VEHICLE INFORMATION', vx + 12, y + 10);
  if (veh.vehicleNumber) {
    const plate = String(veh.vehicleNumber).toUpperCase().split('').join(' ');
    const pw = doc.widthOfString(plate) + 16;
    doc.roundedRect(vx + 12, y + 24, pw, 18, 3).strokeColor(C.ink).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text(plate, vx + 12, y + 28, { width: pw, align: 'center' });
  }
  const vehLine = [veh.brand, veh.model, veh.year].filter(Boolean).join(' ');
  doc.font('Helvetica').fontSize(9).fillColor(C.sub).text(vehLine || '—', vx + 12, y + 46, { width: boxW - 24 });

  /* Line items */
  y += boxH + 18;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red).text('INVOICE DETAILS', M, y, { characterSpacing: 1 });
  y += 16;
  const cols = { sno: M, desc: M + 30, qty: right - 200, rate: right - 140, tax: right - 80, amt: right - 50 };
  doc.moveTo(M, y).lineTo(right, y).strokeColor(C.red).lineWidth(1).stroke();
  y += 6;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.sub);
  doc.text('S.NO', cols.sno, y);
  doc.text('DESCRIPTION', cols.desc, y);
  doc.text('QTY', cols.qty, y, { width: 40, align: 'right' });
  doc.text('RATE', cols.rate, y, { width: 50, align: 'right' });
  doc.text('GST%', cols.tax, y, { width: 30, align: 'right' });
  doc.text('AMOUNT', cols.amt - 10, y, { width: 60, align: 'right' });
  y += 14;
  doc.moveTo(M, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.5).stroke();
  y += 8;

  (invoice.lineItems || []).forEach((it, i) => {
    if (y > doc.page.height - 320) { doc.addPage(); y = M; }
    const qty = it.quantity ?? 1;
    const amt = it.total != null ? it.total : qty * (it.unitPrice || 0);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(String(i + 1).padStart(2, '0'), cols.sno, y);
    doc.font('Helvetica').fillColor(C.ink).text(itemLabel(it), cols.desc, y, { width: cols.qty - cols.desc - 6 });
    doc.fillColor(C.red).text(String(qty), cols.qty, y, { width: 40, align: 'right' });
    doc.fillColor(C.ink).text(Number(it.unitPrice || 0).toLocaleString('en-IN'), cols.rate, y, { width: 50, align: 'right' });
    doc.fillColor(C.sub).text(`${it.taxPercentage || 0}`, cols.tax, y, { width: 30, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(C.ink).text(Number(amt).toLocaleString('en-IN'), cols.amt - 10, y, { width: 60, align: 'right' });
    y += 18;
  });

  /* Totals — right-aligned block; values share the line-items' right edge. */
  const TOT_X = right - 300;        // left edge of the totals block
  const LABEL_W = 150;              // label column (right-aligned, 10px gap to value)
  const VAL_X = right - 150;        // value column left
  const VAL_W = 150;                // value column (right-aligned ends at `right`)
  doc.moveTo(TOT_X, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.5).stroke();
  y += 8;
  const totRow = (label, value, opts = {}) => {
    const size = opts.big ? 11 : 9;
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(opts.color || C.sub);
    doc.text(label, TOT_X, y, { width: LABEL_W, align: 'right' });
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(opts.color || C.ink);
    doc.text(rs(value), VAL_X, y, { width: VAL_W, align: 'right' });
    y += opts.big ? 19 : 14;
  };
  totRow('Subtotal', invoice.subtotal);
  if (invoice.discountValue > 0) {
    const disc = invoice.subtotal - (invoice.taxableAmount ?? invoice.subtotal);
    totRow('Discount', -disc, { color: C.red });
  }
  if (invoice.invoiceType !== 'Non-GST') {
    if (invoice.igstAmount > 0) totRow('IGST', invoice.igstAmount);
    else { totRow('CGST', invoice.cgstAmount); totRow('SGST', invoice.sgstAmount); }
  }
  doc.moveTo(TOT_X, y).lineTo(right, y).strokeColor(C.ink).lineWidth(1).stroke();
  y += 6;
  totRow('Grand Total', grand, { bold: true, big: true, color: C.red });
  if (invoice.paidAmount > 0 || invoice.paymentStatus !== 'unpaid') {
    totRow('Paid', invoice.paidAmount, { color: '#15803d' });
    totRow('Balance Due', balance, { bold: true, color: balance > 0 ? C.red : '#15803d' });
  }

  // Amount in words (left half — kept clear of the totals block on the right)
  const wordsY = y - (invoice.paidAmount > 0 ? 95 : 60);
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.sub).text(numberToWords(grand), M, Math.max(wordsY, y - 80), { width: right - 310 - M });
  y += 18;

  const colW = (contentW - 24) / 2;

  /* Terms */
  const termList = invoice.termsAndConditions
    ? invoice.termsAndConditions.split('\n').map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
    : DEFAULT_TERMS;
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
  const lEnd = drawTerms(termList.slice(0, half), M, 0);
  const rEnd = drawTerms(termList.slice(half), M + colW + 24, half);
  y = Math.max(lEnd, rEnd) + 18;

  /* Bottom block — signature sits directly above the footer, both anchored to
   * the page bottom. Only break to a new page if the terms actually reach the
   * reserved bottom zone (so the footer/QR never spills onto an empty page). */
  const FOOTER_H = 70;
  const SIG_H = 72;
  const reservedTop = doc.page.height - FOOTER_H - SIG_H - 10;
  if (y > reservedTop) { doc.addPage(); }

  const fy = doc.page.height - FOOTER_H;
  const sigY = fy - SIG_H;

  const bx = M + colW + 24;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red).text(`FOR ${co.name.toUpperCase()}`, bx, sigY);
  doc.moveTo(bx, sigY + 40).lineTo(bx + colW, sigY + 40).strokeColor(C.ink).lineWidth(0.8).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(co.name, bx, sigY + 44, { width: colW, align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor(C.sub).text('Authorized Signatory', bx, sigY + 56, { width: colW, align: 'center' });

  /* Footer + QR */
  doc.moveTo(M, fy - 8).lineTo(right, fy - 8).strokeColor(C.line).lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(co.name, M, fy);
  doc.font('Helvetica').fontSize(8).fillColor(C.sub).text(co.tagline, M, fy + 12);
  doc.text([co.address, co.phone].filter(Boolean).join('  |  '), M, fy + 23);
  if (qr) {
    doc.image(qr, right - 50, fy - 6, { width: 46 });
    doc.font('Helvetica').fontSize(6.5).fillColor(C.faint).text('SCAN TO PAY', right - 70, fy + 42, { width: 66, align: 'center' });
  }

  doc.rect(0, doc.page.height - 4, W, 4).fill(C.red);
  doc.end();
};

export default streamInvoicePdf;
