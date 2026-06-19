/**
 * Seed script: creates a default admin user if none exists.
 * Run with: npm run seed
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@workshop.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin user already exists: ${email}`);
  } else {
    await User.create({
      name: 'Workshop Admin',
      email,
      phone: '0000000000',
      password,
      role: 'admin',
      status: 'active',
    });
    console.log(`[seed] Created admin user -> email: ${email}  password: ${password}`);
    console.log('[seed] Change this password after first login.');
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
