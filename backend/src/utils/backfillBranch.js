/**
 * Backfill: stamp all existing records (created before multi-branch) with a
 * default branch so they remain visible under branch-scoped queries.
 * Defaults to the head-office branch (or the first branch).
 *
 * Run: node src/utils/backfillBranch.js
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Branch from '../models/Branch.js';

// Register every model so we can iterate them.
import '../models/Enquiry.js';
import '../models/EnquiryFollowup.js';
import '../models/Quote.js';
import '../models/QuoteFollowup.js';
import '../models/Customer.js';
import '../models/Vehicle.js';
import '../models/Appointment.js';
import '../models/JobCard.js';
import '../models/Service.js';
import '../models/Product.js';
import '../models/StockMovement.js';
import '../models/PPFUsage.js';
import '../models/Invoice.js';
import '../models/Payment.js';
import '../models/Delivery.js';
import '../models/Expense.js';
import '../models/PettyCash.js';
import '../models/Employee.js';
import '../models/Attendance.js';
import '../models/Salary.js';
import '../models/SalaryAdvance.js';
import '../models/Leave.js';

const MODELS = [
  'Enquiry', 'EnquiryFollowup', 'Quote', 'QuoteFollowup', 'Customer', 'Vehicle',
  'Appointment', 'JobCard', 'Service', 'Product', 'StockMovement', 'PPFUsage',
  'Invoice', 'Payment', 'Delivery', 'Expense', 'PettyCash', 'Employee',
  'Attendance', 'Salary', 'SalaryAdvance', 'Leave',
];

const run = async () => {
  await connectDB();

  const branch =
    (await Branch.findOne({ isHeadOffice: true })) || (await Branch.findOne().sort({ createdAt: 1 }));
  if (!branch) {
    console.error('[backfill] No branch found. Run `npm run seed:branches` first.');
    process.exit(1);
  }
  console.log(`[backfill] Using default branch: ${branch.name} (${branch._id})`);

  let total = 0;
  for (const name of MODELS) {
    const Model = mongoose.model(name);
    // Only models that actually have a branchId path get backfilled.
    if (!Model.schema.path('branchId')) {
      console.log(`[backfill] ${name}: no branchId field, skipped`);
      continue;
    }
    const res = await Model.updateMany(
      { $or: [{ branchId: { $exists: false } }, { branchId: null }] },
      { $set: { branchId: branch._id } }
    );
    const n = res.modifiedCount ?? res.nModified ?? 0;
    total += n;
    console.log(`[backfill] ${name}: ${n} records stamped`);
  }

  console.log(`[backfill] Done. Total records updated: ${total}`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[backfill] Failed:', err.message);
  process.exit(1);
});
