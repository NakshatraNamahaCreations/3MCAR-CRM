/**
 * Branch-scoping test: data created in branch A must not appear when scoped to branch B,
 * and admin-with-no-branch sees everything.
 * Run: node test/branch.test.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 's';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ FAIL: ${m}`); } };

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const fs = await import('fs');
  const dir = new URL('../src/models/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) await import('../src/models/' + f);

  const User = (await import('../src/models/User.js')).default;
  const Branch = (await import('../src/models/Branch.js')).default;
  const enquiryService = await import('../src/services/enquiryService.js');

  const A = await Branch.create({ name: 'Branch A', code: 'A' });
  const B = await Branch.create({ name: 'Branch B', code: 'B' });
  const admin = await User.create({ name: 'Admin', email: 'a@a.com', password: 'x', role: 'admin', branches: [A._id, B._id] });

  const create = enquiryService.createEnquiry || enquiryService.default?.createEnquiry;
  const list = enquiryService.getAllEnquiries || enquiryService.default?.getAllEnquiries;

  // Create 2 enquiries in A, 1 in B (branchId arrives via the payload, as controllers pass it).
  await create({ name: 'A1', phone: '1', branchId: A._id }, admin._id);
  await create({ name: 'A2', phone: '2', branchId: A._id }, admin._id);
  await create({ name: 'B1', phone: '3', branchId: B._id }, admin._id);

  console.log('1. Branch isolation on list');
  const inA = await list({ branchId: String(A._id) });
  const inB = await list({ branchId: String(B._id) });
  assert(inA.length === 2 && inA.every((e) => String(e.branchId) === String(A._id)), `branch A sees only its 2 (got ${inA.length})`);
  assert(inB.length === 1 && String(inB[0].branchId) === String(B._id), `branch B sees only its 1 (got ${inB.length})`);

  console.log('2. Admin with no branch sees all');
  const all = await list({}); // no branchId => no filter
  assert(all.length === 3, `unscoped list returns all 3 (got ${all.length})`);

  console.log('3. Create stamps branchId');
  assert(inA.every((e) => e.branchId), 'created enquiries carry branchId');

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('CRASHED:', e.message); console.error(e.stack); process.exit(1); });
