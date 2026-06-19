/**
 * Salary slip PDF (pdfkit) — branded payslip with earnings/deductions breakdown.
 * Expects a salary doc with employeeId populated.
 */
import PDFDocument from 'pdfkit';
import { numberToWords } from './numberToWords.js';

const C = { red: '#dc2626', ink: '#1f2937', sub: '#64748b', faint: '#94a3b8', line: '#e5e7eb', soft: '#f8fafc' };
const rs = (n) => 'Rs.' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const cfg = () => ({
  brandTop: process.env.WORKSHOP_BRAND_TOP || '3M',
  brandRest: process.env.WORKSHOP_BRAND_REST || 'CAR CARE STUDIO',
  name: process.env.WORKSHOP_NAME || '3M Car Care',
  address: process.env.WORKSHOP_ADDRESS || 'Jayanagar, Bengaluru',
  phone: process.env.WORKSHOP_PHONE || '',
  gstin: process.env.WORKSHOP_GSTIN || '',
});

export const streamSalarySlipPdf = (salary, stream) => {
  const co = cfg();
  const emp = salary.employeeId || {};
  const M = 40;
  const doc = new PDFDocument({ size: 'A4', margin: M });
  doc.pipe(stream);
  const W = doc.page.width;
  const right = W - M;
  const contentW = right - M;

  doc.rect(0, 0, W, 4).fill(C.red);

  // Header
  let y = 24;
  doc.fillColor(C.red).font('Helvetica-Bold').fontSize(26).text(co.brandTop, M, y);
  const topW = doc.widthOfString(co.brandTop);
  doc.fillColor(C.ink).fontSize(11).text(co.brandRest, M + topW + 6, y + 6);
  doc.font('Helvetica').fillColor(C.sub).fontSize(8).text(co.address, M, y + 30);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(18).text('Salary Slip', right - 200, y, { width: 200, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(C.sub).text(`${MONTHS[salary.salaryMonth] || ''} ${salary.salaryYear}`, right - 200, y + 26, { width: 200, align: 'right' });

  doc.moveTo(M, 78).lineTo(right, 78).strokeColor(C.line).stroke();

  // Employee block
  y = 90;
  const col2 = M + contentW / 2;
  const line = (label, value, x, yy) => {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.faint).text(label, x, yy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink).text(value || '—', x + 90, yy);
  };
  line('Employee', emp.name, M, y);
  line('Code', emp.employeeCode, col2, y); y += 16;
  line('Designation', emp.designation || emp.role, M, y);
  line('Department', emp.department, col2, y); y += 16;
  line('Pay Period', `${MONTHS[salary.salaryMonth] || ''} ${salary.salaryYear}`, M, y);
  line('Status', String(salary.paymentStatus || 'pending').toUpperCase(), col2, y); y += 16;
  line('Working Days', String(salary.totalWorkingDays ?? '—'), M, y);
  line('Present / Absent', `${salary.presentDays || 0} / ${salary.absentDays || 0}`, col2, y); y += 22;

  // Earnings / Deductions two-column table
  const tableTop = y;
  const colW = (contentW - 16) / 2;
  const earnings = [
    ['Basic Salary', salary.basicSalary],
    ['HRA', salary.hra],
    ['Conveyance', salary.conveyanceAllowance],
    ['Medical', salary.medicalAllowance],
    ['Special Allowance', salary.specialAllowance],
    ['Overtime', salary.overtimeAmount],
    ['Bonus', salary.bonus],
  ].filter(([, v]) => (v || 0) !== 0 || true);
  const deductions = [
    ['PF', salary.pfDeduction],
    ['ESI', salary.esiDeduction],
    ['Professional Tax', salary.professionalTax],
    ['Attendance Deduction', salary.attendanceDeduction],
    ['Advance Deduction', salary.advanceDeduction],
    ['Other Deductions', salary.otherDeductions],
  ];

  const drawCol = (title, rowsArr, x, totalLabel, totalVal) => {
    doc.rect(x, tableTop, colW, 18).fill(C.soft);
    doc.fillColor(C.red).font('Helvetica-Bold').fontSize(9).text(title, x + 8, tableTop + 5);
    let ry = tableTop + 24;
    rowsArr.forEach(([label, val]) => {
      doc.font('Helvetica').fontSize(9).fillColor(C.sub).text(label, x + 8, ry);
      doc.font('Helvetica-Bold').fillColor(C.ink).text(rs(val), x, ry, { width: colW - 8, align: 'right' });
      ry += 16;
    });
    doc.moveTo(x, ry + 2).lineTo(x + colW, ry + 2).strokeColor(C.line).stroke();
    ry += 8;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink).text(totalLabel, x + 8, ry);
    doc.fillColor(C.red).text(rs(totalVal), x, ry, { width: colW - 8, align: 'right' });
    return ry + 20;
  };

  const totalEarnings = (salary.grossSalary || 0);
  const totalDeductions = (salary.pfDeduction || 0) + (salary.esiDeduction || 0) + (salary.professionalTax || 0)
    + (salary.attendanceDeduction || 0) + (salary.advanceDeduction || 0) + (salary.otherDeductions || 0);
  const leftEnd = drawCol('EARNINGS', earnings, M, 'Gross Earnings', totalEarnings);
  const rightEnd = drawCol('DEDUCTIONS', deductions, M + colW + 16, 'Total Deductions', totalDeductions);
  y = Math.max(leftEnd, rightEnd) + 10;

  // Net pay band
  doc.roundedRect(M, y, contentW, 34, 4).fill(C.soft);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(12).text('NET PAY', M + 12, y + 10);
  doc.fillColor(C.red).fontSize(14).text(rs(salary.netSalary), right - 200, y + 9, { width: 188, align: 'right' });
  y += 42;
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.sub).text(numberToWords(salary.netSalary), M, y);
  y += 24;

  if (salary.paymentStatus === 'paid') {
    doc.font('Helvetica').fontSize(8.5).fillColor('#15803d')
      .text(`Paid on ${salary.paymentDate ? new Date(salary.paymentDate).toLocaleDateString('en-IN') : '—'} via ${salary.paymentMode || ''}${salary.transactionId ? ' (' + salary.transactionId + ')' : ''}`, M, y);
  }

  const fy = doc.page.height - 50;
  doc.fontSize(8).font('Helvetica').fillColor(C.faint)
    .text('This is a computer-generated salary slip and does not require a signature.', M, fy, { width: contentW, align: 'center' });
  doc.rect(0, doc.page.height - 4, W, 4).fill(C.red);
  doc.end();
};

export default streamSalarySlipPdf;
