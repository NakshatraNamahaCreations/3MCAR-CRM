/**
 * Invoice PDF generation test. Builds a real invoice in-memory and renders the PDF,
 * verifying it produces a valid, non-trivial PDF buffer.
 * Run: node test/pdf.test.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Writable } from 'stream';
import fs from 'fs';

process.env.JWT_SECRET = 's';
process.env.WORKSHOP_NAME = '3M Car Care';
process.env.WORKSHOP_GSTIN = '29ABCDE1234F1Z5';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ FAIL: ${m}`); } };

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const dir = new URL('../src/models/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) await import('../src/models/' + f);

  const Customer = (await import('../src/models/Customer.js')).default;
  const Vehicle = (await import('../src/models/Vehicle.js')).default;
  const Invoice = (await import('../src/models/Invoice.js')).default;
  const invoiceService = await import('../src/services/invoiceService.js');
  const { streamInvoicePdf } = await import('../src/utils/invoicePdf.js');

  const cust = await Customer.create({ name: 'John Doe', phone: '9876543210', email: 'john@x.com', city: 'Bengaluru', state: 'KA' });
  const veh = await Vehicle.create({ customerId: cust._id, vehicleNumber: 'KA01AB1234', brand: 'Toyota', model: 'Fortuner', year: 2022 });

  const invoice = await Invoice.create({
    invoiceNumber: 'INV-2026-000099',
    customerId: cust._id, vehicleId: veh._id, invoiceDate: new Date(), invoiceType: 'GST',
    lineItems: [
      { itemType: 'service', name: 'Ceramic Coating', quantity: 1, unitPrice: 15000, taxPercentage: 18, total: 15000 },
      { itemType: 'ppf', name: 'PPF 40 sqft', quantity: 1, unitPrice: 60000, taxPercentage: 18, total: 60000 },
      { itemType: 'labour', name: 'Labour', quantity: 1, unitPrice: 2000, taxPercentage: 18, total: 2000 },
    ],
    subtotal: 77000, discountType: 'percentage', discountValue: 10, taxableAmount: 69300,
    gstAmount: 12474, cgstAmount: 6237, sgstAmount: 6237, grandTotal: 81774,
    paidAmount: 40000, balanceAmount: 41774, paymentStatus: 'partial', invoiceStatus: 'generated',
  });

  console.log('1. Render PDF to buffer');
  const populated = await invoiceService.getById(invoice._id);
  const chunks = [];
  const sink = new Writable({ write(c, e, cb) { chunks.push(c); cb(); } });
  await new Promise((resolve, reject) => {
    sink.on('finish', resolve);
    sink.on('error', reject);
    streamInvoicePdf(populated, sink);
  });
  const buf = Buffer.concat(chunks);
  assert(buf.length > 1000, `PDF buffer is non-trivial (${buf.length} bytes)`);
  assert(buf.slice(0, 5).toString() === '%PDF-', 'buffer starts with %PDF- magic header');
  assert(buf.slice(-6).toString().includes('EOF'), 'PDF ends with EOF marker');

  // Write a sample so it can be eyeballed
  const out = new URL('../test/sample-invoice.pdf', import.meta.url);
  fs.writeFileSync(out, buf);
  console.log(`  (sample written to test/sample-invoice.pdf)`);

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('\nCRASHED:', e.message); console.error(e.stack); process.exit(1); });
