/**
 * HR + Finance smoke test: employee, attendance, salary generation,
 * petty cash auto cash-out linking, and expense->petty-cash linkage.
 * Run: node test/hr.test.mjs
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'test_secret';
process.env.STANDARD_WORKING_HOURS = '8';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ FAIL: ${m}`); } };

const call = (mod, names) => {
  for (const n of names) if (typeof mod[n] === 'function') return mod[n];
  if (mod.default && typeof mod.default === 'object')
    for (const n of names) if (typeof mod.default[n] === 'function') return mod.default[n];
  return null;
};

const main = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('In-memory MongoDB started.\n');

  const fs = await import('fs');
  const modelsDir = new URL('../src/models/', import.meta.url);
  for (const f of fs.readdirSync(modelsDir).filter((x) => x.endsWith('.js'))) await import('../src/models/' + f);

  const User = (await import('../src/models/User.js')).default;
  const Employee = (await import('../src/models/Employee.js')).default;
  const PettyCash = (await import('../src/models/PettyCash.js')).default;
  const { getCurrentBalance, createPettyCashEntry } = await import('../src/utils/pettyCashHelper.js');

  const empService = await import('../src/services/employeeService.js');
  const attService = await import('../src/services/attendanceService.js');
  const salService = await import('../src/services/salaryService.js');
  const expService = await import('../src/services/expenseService.js');

  const admin = await User.create({ name: 'Admin', email: 'a@a.com', password: 'x', role: 'admin' });
  const uid = admin._id;

  // --- Petty cash: seed balance ---
  console.log('1. Petty cash running balance');
  await createPettyCashEntry({ transactionType: 'cash_in', amount: 50000, category: 'opening', createdBy: uid });
  let bal = await getCurrentBalance();
  assert(bal === 50000, `cash_in sets balance to 50000 (${bal})`);

  // insufficient cash_out guard
  let guarded = false;
  try { await createPettyCashEntry({ transactionType: 'cash_out', amount: 99999, category: 'x', createdBy: uid }); }
  catch { guarded = true; }
  assert(guarded, 'cash_out blocked when insufficient balance');

  // --- Employee ---
  console.log('2. Employee');
  const createEmp = call(empService, ['createEmployee', 'create']);
  const emp = await createEmp({
    name: 'Tech One', phone: '9000000001', role: 'technician',
    salaryType: 'monthly', basicSalary: 26000,
  }, uid);
  assert(!!emp._id && !!emp.employeeCode, `employee created (${emp.employeeCode})`);

  // --- Attendance: mark some present/absent ---
  console.log('3. Attendance');
  const mark = call(attService, ['markAttendance', 'create']);
  const y = 2026, mo = 4;
  for (let d = 1; d <= 5; d++) {
    await mark({ employeeId: emp._id, attendanceDate: new Date(y, mo - 1, d), status: 'present' }, uid);
  }
  await mark({ employeeId: emp._id, attendanceDate: new Date(y, mo - 1, 6), status: 'absent' }, uid);
  const Attendance = (await import('../src/models/Attendance.js')).default;
  const attCount = await Attendance.countDocuments({ employeeId: emp._id });
  assert(attCount === 6, `6 attendance records (${attCount})`);

  // --- Salary generation ---
  console.log('4. Salary generation from attendance');
  const genSalary = call(salService, ['generateForEmployee']);
  assert(!!genSalary, 'salaryService exposes generateForEmployee');
  const salary = await genSalary(emp._id, mo, y, { bonus: 1000 }, uid);
  assert(!!salary && salary.netSalary > 0, `salary generated, net=${salary.netSalary}`);
  assert(salary.paymentStatus === 'pending', 'salary starts pending');

  // --- Mark salary paid by cash -> petty cash cash_out ---
  console.log('5. Salary paid by cash -> petty cash auto cash_out');
  const markPaid = call(salService, ['markAsPaid']);
  const balBefore = await getCurrentBalance();
  await markPaid(salary._id, { paymentMode: 'cash' }, uid);
  const balAfter = await getCurrentBalance();
  const linked = await PettyCash.findOne({ referenceType: 'salary_payment', referenceId: salary._id });
  assert(!!linked, 'petty cash cash_out auto-created for cash salary');
  assert(balAfter === balBefore - salary.netSalary, `balance reduced by net salary (${balBefore}->${balAfter})`);

  // --- Expense paid by petty_cash -> auto cash_out ---
  console.log('6. Expense by petty_cash -> auto cash_out');
  const createExp = call(expService, ['createExpense', 'create']);
  const exp = await createExp({ expenseDate: new Date(), category: 'fuel', amount: 500, paymentMode: 'petty_cash', paidTo: 'Pump' }, uid);
  const expLinked = await PettyCash.findOne({ referenceType: 'expense', referenceId: exp._id });
  assert(!!expLinked, 'petty cash cash_out auto-created for petty_cash expense');

  console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error('\nTEST CRASHED:', e.message); console.error(e.stack); process.exit(1); });
