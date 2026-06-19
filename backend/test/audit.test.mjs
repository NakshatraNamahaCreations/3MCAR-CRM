/**
 * Audit-trail test: every model auto-captures branchId, createdBy, updatedBy
 * from the per-request context (no controller wiring needed).
 * Run: node test/audit.test.mjs
 */
import '../src/config/registerPlugins.js'; // must precede model compilation
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 's'; process.env.JWT_EXPIRES_IN = '1d'; process.env.NODE_ENV = 'test';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ FAIL: ${m}`); } };

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  const fs = await import('fs');
  const dir = new URL('../src/models/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) await import('../src/models/' + f);

  console.log('1. Audit fields exist on a model that never declared createdBy');
  const Customer = (await import('../src/models/Customer.js')).default;
  assert(!!Customer.schema.path('createdBy'), 'Customer.createdBy added by plugin');
  assert(!!Customer.schema.path('updatedBy'), 'Customer.updatedBy added by plugin');
  assert(!!Customer.schema.path('branchId'), 'Customer.branchId present');

  console.log('2. Auto-stamp from request context over HTTP');
  const User = (await import('../src/models/User.js')).default;
  const Branch = (await import('../src/models/Branch.js')).default;
  const branch = await Branch.create({ name: 'NGS', code: 'NGS' });
  const admin = await User.create({ name: 'A', email: 'a@a.com', password: 'Admin@123', role: 'admin', branches: [branch._id], activeBranchId: branch._id });

  const app = (await import('../src/app.js')).default;
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const tok = (await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@a.com', password: 'Admin@123' }) })).json()).data.token;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` };

  const created = (await (await fetch(base + '/customers', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Audit', phone: '9000000000' }) })).json()).data;
  assert(String(created.createdBy) === String(admin._id), 'createdBy auto-stamped to acting user');
  assert(String(created.branchId) === String(branch._id), 'branchId auto-stamped to active branch');

  console.log('3. updatedBy stamped on update');
  const updated = (await (await fetch(base + `/customers/${created._id}`, { method: 'PUT', headers: H, body: JSON.stringify({ city: 'Bengaluru' }) })).json()).data;
  assert(String(updated.updatedBy) === String(admin._id), 'updatedBy auto-stamped on update');

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  server.close(); await mongoose.disconnect(); await mongod.stop();
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('CRASHED:', e.message); console.error(e.stack); process.exit(1); });
