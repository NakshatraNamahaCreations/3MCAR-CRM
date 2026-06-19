/**
 * Seed the 3M Car Care branches and assign the admin user to all of them.
 * Idempotent. Run: node src/utils/seedBranches.js
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';

const BRANCHES = [
  { name: 'Nagasandra', code: 'NGS', city: 'Bangalore', state: 'Karnataka', address: 'Nagasandra, Tumkur Road', isHeadOffice: true },
  { name: 'Kanakapura Road', code: 'KNK', city: 'Bangalore', state: 'Karnataka', address: 'Kanakapura Road' },
];

const run = async () => {
  await connectDB();

  const ids = [];
  for (const b of BRANCHES) {
    let branch = await Branch.findOne({ $or: [{ code: b.code }, { name: b.name }] });
    if (!branch) {
      branch = await Branch.create({ ...b, status: 'active' });
      console.log(`[seedBranches] Created branch: ${b.name} (${b.code})`);
    } else {
      console.log(`[seedBranches] Branch exists: ${b.name}`);
    }
    ids.push(branch._id);
  }

  // Assign every admin to all branches, default active = first (head office).
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    admin.branches = ids;
    if (!admin.activeBranchId) admin.activeBranchId = ids[0];
    await admin.save();
    console.log(`[seedBranches] Assigned admin ${admin.email} to ${ids.length} branches`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[seedBranches] Failed:', err.message);
  process.exit(1);
});
