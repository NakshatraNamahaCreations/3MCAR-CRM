/**
 * End-to-end pipeline integration test against an in-memory MongoDB.
 * Exercises the full CRM -> Workshop -> Finance flow through the service layer
 * to prove the business rules fire.
 *
 * Run: node test/pipeline.test.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.STANDARD_WORKING_HOURS = '8';

let pass = 0;
let fail = 0;
const assert = (cond, msg) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ FAIL: ${msg}`); }
};

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('In-memory MongoDB started.\n');

  // Register EVERY model so cross-model populate() works.
  const modelsDir = new URL('../src/models/', import.meta.url);
  const fs = await import('fs');
  for (const f of fs.readdirSync(modelsDir).filter((x) => x.endsWith('.js'))) {
    await import('../src/models/' + f);
  }

  // Dynamic imports AFTER env + connection are set
  const User = (await import('../src/models/User.js')).default;
  const Enquiry = (await import('../src/models/Enquiry.js')).default;
  const Customer = (await import('../src/models/Customer.js')).default;
  const Vehicle = (await import('../src/models/Vehicle.js')).default;
  const Appointment = (await import('../src/models/Appointment.js')).default;
  const JobCard = (await import('../src/models/JobCard.js')).default;
  const Product = (await import('../src/models/Product.js')).default;
  const Invoice = (await import('../src/models/Invoice.js')).default;

  const enquiryService = await import('../src/services/enquiryService.js');
  const quoteService = await import('../src/services/quoteService.js');
  const conversionService = await import('../src/services/conversionService.js');
  const jobCardService = await import('../src/services/jobCardService.js');
  const invoiceService = await import('../src/services/invoiceService.js');
  const paymentService = await import('../src/services/paymentService.js');
  const deliveryService = await import('../src/services/deliveryService.js');

  const call = (mod, names) => {
    for (const n of names) if (typeof mod[n] === 'function') return mod[n];
    if (mod.default && typeof mod.default === 'object') {
      for (const n of names) if (typeof mod.default[n] === 'function') return mod.default[n];
    }
    return null;
  };

  // --- Setup: admin user + products ---
  const admin = await User.create({ name: 'Admin', email: 'a@a.com', password: 'x', role: 'admin' });
  const uid = admin._id;

  const consumable = await Product.create({
    productName: 'Ceramic Coating Bottle', unitType: 'bottle', sellingPrice: 2000,
    currentStock: 10, openingStock: 10, gstPercentage: 18,
  });
  const ppfFilm = await Product.create({
    productName: 'PPF Film Roll', unitType: 'sqft', sellingPrice: 150, isPPF: true,
    currentStock: 100, openingStock: 100, gstPercentage: 18,
  });

  // === 1. ENQUIRY ===
  console.log('1. Enquiry');
  const createEnquiry = call(enquiryService, ['createEnquiry', 'create']);
  assert(!!createEnquiry, 'enquiryService exposes a create function');
  const enquiry = await createEnquiry({
    name: 'John Doe', phone: '9876543210', email: 'john@x.com',
    vehicleNumber: 'KA01AB1234', vehicleBrand: 'Toyota', vehicleModel: 'Fortuner', vehicleYear: 2022,
    source: 'walk_in', status: 'hot',
  }, uid);
  assert(enquiry && enquiry._id, 'enquiry created');

  // === 2. QUOTE ===
  console.log('2. Quote');
  const createQuote = call(quoteService, ['createFromEnquiry', 'createQuoteFromEnquiry', 'create']);
  assert(!!createQuote, 'quoteService exposes a create-from-enquiry function');
  const quote = await createQuote({
    enquiryId: enquiry._id,
    lineItems: [
      { itemName: 'Ceramic Coating', quantity: 1, unitPrice: 15000, taxPercentage: 18 },
      { itemName: 'Full Car PPF', quantity: 1, unitPrice: 60000, taxPercentage: 18 },
    ],
    taxType: 'GST', discountType: 'percentage', discountValue: 10,
  }, uid);
  assert(quote && quote._id, 'quote created from enquiry');
  assert(!!quote.quoteNumber, `quote has number (${quote.quoteNumber})`);
  assert(quote.totalAmount > 0, `quote total computed (${quote.totalAmount})`);

  // === 3. ACCEPT QUOTE -> CONVERSION ===
  console.log('3. Quote acceptance -> auto-conversion');
  const result = await conversionService.acceptQuoteAndConvert(quote._id, uid);
  const freshEnquiry = await Enquiry.findById(enquiry._id);
  const customer = await Customer.findOne({ phone: '9876543210' });
  const vehicle = await Vehicle.findOne({ vehicleNumber: 'KA01AB1234' });
  const draftAppt = await Appointment.findOne({ quoteId: quote._id });
  assert(freshEnquiry.status === 'converted', 'enquiry status -> converted');
  assert(!!customer, 'customer auto-created from enquiry');
  assert(!!vehicle, 'vehicle auto-created');
  assert(!!draftAppt && draftAppt.status === 'draft', 'draft appointment auto-created');
  assert(String(draftAppt.customerId) === String(customer._id), 'appointment linked to customer');

  // === 4. JOB CARD from appointment ===
  console.log('4. Job card from appointment');
  const createJC = call(jobCardService, ['createFromAppointment']);
  assert(!!createJC, 'jobCardService exposes createFromAppointment');
  const jobCard = await createJC(draftAppt._id, uid);
  assert(jobCard && jobCard._id, `job card created (${jobCard.jobCardNumber})`);

  // === 5. Add product + PPF usage (NO deduction yet) ===
  console.log('5. Add product & PPF usage (stock must NOT deduct yet)');
  const addProduct = call(jobCardService, ['addProductUsage']);
  const addPPF = call(jobCardService, ['addPPFUsage']);
  await addProduct(jobCard._id, { productId: consumable._id, quantity: 2 });
  await addPPF(jobCard._id, {
    ppfProductId: ppfFilm._id, usedSqft: 40, wastageSqft: 5, usageArea: 'Full car',
    totalRollSqft: 100,
  });
  const prodAfterAdd = await Product.findById(consumable._id);
  const ppfAfterAdd = await Product.findById(ppfFilm._id);
  assert(prodAfterAdd.currentStock === 10, `consumable stock unchanged after add (${prodAfterAdd.currentStock})`);
  assert(ppfAfterAdd.currentStock === 100, `PPF stock unchanged after add (${ppfAfterAdd.currentStock})`);

  // === 6. Complete job -> stock deducts ===
  console.log('6. Complete job card (stock deducts now)');
  const completeJC = call(jobCardService, ['completeJobCard', 'complete']);
  await completeJC(jobCard._id, uid);
  const prodDone = await Product.findById(consumable._id);
  const ppfDone = await Product.findById(ppfFilm._id);
  const jcDone = await JobCard.findById(jobCard._id);
  assert(jcDone.status === 'work_completed', 'job card status -> work_completed');
  assert(prodDone.currentStock === 8, `consumable deducted 2 -> 8 (got ${prodDone.currentStock})`);
  assert(ppfDone.currentStock === 55, `PPF deducted 45 (40+5) -> 55 (got ${ppfDone.currentStock})`);

  // === 7. Generate invoice ===
  console.log('7. Invoice from job card');
  const genInvoice = call(invoiceService, ['createFromJobCard']);
  const invoice = await genInvoice(jobCard._id, uid);
  assert(invoice && invoice._id, `invoice created (${invoice.invoiceNumber})`);
  assert(invoice.grandTotal > 0, `invoice grandTotal computed (${invoice.grandTotal})`);
  assert(invoice.paymentStatus === 'unpaid', 'invoice starts unpaid');

  // === 8. Delivery blocked before payment ===
  console.log('8. Delivery gate (must block until paid)');
  const deliver = call(deliveryService, ['deliverVehicle', 'deliver']);
  let blocked = false;
  try { await deliver({ jobCardId: jobCard._id }, uid); }
  catch { blocked = true; }
  assert(blocked, 'delivery BLOCKED while invoice unpaid');

  // === 9. Split payment -> paid ===
  console.log('9. Split payment -> invoice paid -> job card paid');
  const addPayment = call(paymentService, ['addPayment', 'create']);
  const half = Math.round(invoice.grandTotal / 2);
  await addPayment({ invoiceId: invoice._id, amount: half, paymentMode: 'cash' }, uid);
  const invPartial = await Invoice.findById(invoice._id);
  assert(invPartial.paymentStatus === 'partial', `invoice partial after first payment (${invPartial.paymentStatus})`);
  await addPayment({ invoiceId: invoice._id, amount: invoice.grandTotal - half, paymentMode: 'upi' }, uid);
  const invPaid = await Invoice.findById(invoice._id);
  const jcPaid = await JobCard.findById(jobCard._id);
  assert(invPaid.paymentStatus === 'paid', 'invoice fully paid after split payment');
  assert(Math.abs(invPaid.balanceAmount) < 0.01, `invoice balance ~0 (${invPaid.balanceAmount})`);
  assert(jcPaid.status === 'paid', 'job card status -> paid');

  // === 10. Delivery now allowed ===
  console.log('10. Delivery after full payment');
  const delivery = await deliver({ jobCardId: jobCard._id }, uid);
  const jcDelivered = await JobCard.findById(jobCard._id);
  const apptDone = await Appointment.findById(draftAppt._id);
  assert(!!delivery, 'delivery record created');
  assert(jcDelivered.status === 'delivered', 'job card status -> delivered');
  assert(apptDone.status === 'completed', 'appointment status -> completed');

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);

  await mongoose.disconnect();
  await mongod.stop();
  process.exit(fail ? 1 : 0);
};

main().catch((e) => {
  console.error('\nTEST CRASHED:', e.message);
  console.error(e.stack);
  process.exit(1);
});
