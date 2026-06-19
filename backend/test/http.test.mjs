/**
 * Full HTTP-stack smoke test: boots the real Express app against in-memory Mongo,
 * seeds an admin, then exercises login + a few authenticated endpoints over HTTP.
 * Run: node test/http.test.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'http_test_secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ FAIL: ${m}`); } };

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  // register all models
  const fs = await import('fs');
  const dir = new URL('../src/models/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) await import('../src/models/' + f);

  const User = (await import('../src/models/User.js')).default;
  const Branch = (await import('../src/models/Branch.js')).default;
  const branch = await Branch.create({ name: 'Main', code: 'MAIN' });
  await User.create({ name: 'Admin', email: 'admin@workshop.com', password: 'Admin@123', role: 'admin', branches: [branch._id], activeBranchId: branch._id });

  const app = (await import('../src/app.js')).default;
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api`;
  console.log(`Server listening on ${port}\n`);

  const req = async (method, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  };

  console.log('1. Health');
  const health = await req('GET', '/health');
  assert(health.status === 200 && health.json.success, 'GET /health -> 200 success');

  console.log('2. Auth guard');
  const noAuth = await req('GET', '/enquiries');
  assert(noAuth.status === 401, 'protected route without token -> 401');

  console.log('3. Login');
  const badLogin = await req('POST', '/auth/login', { body: { email: 'admin@workshop.com', password: 'wrong' } });
  assert(badLogin.status === 401, 'wrong password -> 401');
  const login = await req('POST', '/auth/login', { body: { email: 'admin@workshop.com', password: 'Admin@123' } });
  assert(login.status === 200 && login.json.data?.token, 'valid login -> token');
  const token = login.json.data.token;

  console.log('4. Authenticated CRUD over HTTP');
  const profile = await req('GET', '/auth/profile', { token });
  assert(profile.status === 200 && profile.json.data?.email === 'admin@workshop.com', 'GET /auth/profile -> admin');

  const createEnq = await req('POST', '/enquiries', { token, body: { name: 'HTTP Test', phone: '9111122233', source: 'website', status: 'warm' } });
  assert(createEnq.status === 200 || createEnq.status === 201, `POST /enquiries -> ${createEnq.status}`);
  const listEnq = await req('GET', '/enquiries', { token });
  assert(listEnq.status === 200 && Array.isArray(listEnq.json.data), 'GET /enquiries -> array');

  console.log('5. Dashboard over HTTP');
  const dash = await req('GET', '/dashboard/summary', { token });
  assert(dash.status === 200 && dash.json.data, `GET /dashboard/summary -> ${dash.status}`);

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('\nCRASHED:', e.message); console.error(e.stack); process.exit(1); });
