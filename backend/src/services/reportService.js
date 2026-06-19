import Enquiry from '../models/Enquiry.js';
import EnquiryFollowup from '../models/EnquiryFollowup.js';
import Quote from '../models/Quote.js';
import Customer from '../models/Customer.js';
import Appointment from '../models/Appointment.js';
import JobCard from '../models/JobCard.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import PPFUsage from '../models/PPFUsage.js';
import Expense from '../models/Expense.js';
import PettyCash from '../models/PettyCash.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Salary from '../models/Salary.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import Leave from '../models/Leave.js';

/**
 * Build a Mongo date-range filter for a given field from req.query.from / req.query.to.
 * `from` is inclusive start-of-day, `to` is inclusive end-of-day.
 */
const dateRange = (field, from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    range.$gte = start;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
};

const addIf = (filter, key, value) => {
  if (value !== undefined && value !== null && value !== '') filter[key] = value;
};

// ---------- SALES / CRM ----------

export const enquiryReport = async (q = {}) => {
  const filter = { ...dateRange('createdAt', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'source', q.source);
  addIf(filter, 'assignedTo', q.assignedTo);
  addIf(filter, 'customerId', q.customerId);
  return Enquiry.find(filter)
    .populate('assignedTo', 'name role')
    .populate('createdBy', 'name')
    .populate('customerId', 'name phone customerCode')
    .sort({ createdAt: -1 })
    .lean();
};

export const followupReport = async (q = {}) => {
  const filter = { ...dateRange('followupDate', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'enquiryId', q.enquiryId);
  addIf(filter, 'assignedTo', q.assignedTo);
  return EnquiryFollowup.find(filter)
    .populate('enquiryId', 'name phone status')
    .populate('assignedTo', 'name role')
    .populate('createdBy', 'name')
    .sort({ followupDate: -1 })
    .lean();
};

export const quoteReport = async (q = {}) => {
  const filter = { ...dateRange('createdAt', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'enquiryId', q.enquiryId);
  return Quote.find(filter)
    .populate('enquiryId', 'name phone')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

export const customerReport = async (q = {}) => {
  const filter = { ...dateRange('createdAt', q.from, q.to) };
  addIf(filter, 'city', q.city);
  addIf(filter, 'state', q.state);
  addIf(filter, 'source', q.source);
  if (q.search) {
    filter.$or = [
      { name: { $regex: q.search, $options: 'i' } },
      { phone: { $regex: q.search, $options: 'i' } },
      { customerCode: { $regex: q.search, $options: 'i' } },
    ];
  }
  return Customer.find(filter).sort({ createdAt: -1 }).lean();
};

export const appointmentReport = async (q = {}) => {
  const filter = { ...dateRange('appointmentDate', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'customerId', q.customerId);
  return Appointment.find(filter)
    .populate('customerId', 'name phone customerCode')
    .populate('vehicleId', 'vehicleNumber brand model')
    .populate('createdBy', 'name')
    .sort({ appointmentDate: -1 })
    .lean();
};

export const jobCardReport = async (q = {}) => {
  const filter = { ...dateRange('createdAt', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'customerId', q.customerId);
  addIf(filter, 'assignedTechnicianId', q.technicianId);
  return JobCard.find(filter)
    .populate('customerId', 'name phone customerCode')
    .populate('vehicleId', 'vehicleNumber brand model')
    .populate('assignedTechnicianId', 'name employeeCode')
    .populate('serviceAdvisorId', 'name employeeCode')
    .sort({ createdAt: -1 })
    .lean();
};

// ---------- BILLING ----------

export const invoiceReport = async (q = {}) => {
  const filter = { ...dateRange('invoiceDate', q.from, q.to) };
  addIf(filter, 'paymentStatus', q.paymentStatus);
  addIf(filter, 'invoiceStatus', q.invoiceStatus || q.status);
  addIf(filter, 'invoiceType', q.invoiceType);
  addIf(filter, 'customerId', q.customerId);
  addIf(filter, 'jobCardId', q.jobCardId);
  return Invoice.find(filter)
    .populate('customerId', 'name phone customerCode')
    .populate('vehicleId', 'vehicleNumber brand model')
    .populate('jobCardId', 'jobCardNumber')
    .sort({ invoiceDate: -1 })
    .lean();
};

export const paymentReport = async (q = {}) => {
  const filter = { ...dateRange('paymentDate', q.from, q.to) };
  addIf(filter, 'paymentMode', q.paymentMode);
  addIf(filter, 'customerId', q.customerId);
  addIf(filter, 'invoiceId', q.invoiceId);
  return Payment.find(filter)
    .populate('invoiceId', 'invoiceNumber grandTotal')
    .populate('customerId', 'name phone customerCode')
    .populate('receivedBy', 'name')
    .sort({ paymentDate: -1 })
    .lean();
};

// ---------- INVENTORY ----------

export const productInventoryReport = async (q = {}) => {
  const filter = {};
  addIf(filter, 'category', q.category);
  addIf(filter, 'status', q.status);
  if (q.isPPF !== undefined && q.isPPF !== '') filter.isPPF = q.isPPF === 'true' || q.isPPF === true;
  if (q.lowStock === 'true' || q.lowStock === true) {
    filter.$expr = { $lte: ['$currentStock', '$minimumStock'] };
  }
  if (q.search) {
    filter.$or = [
      { productName: { $regex: q.search, $options: 'i' } },
      { sku: { $regex: q.search, $options: 'i' } },
    ];
  }
  return Product.find(filter).sort({ productName: 1 }).lean();
};

export const stockMovementReport = async (q = {}) => {
  const filter = { ...dateRange('createdAt', q.from, q.to) };
  addIf(filter, 'movementType', q.movementType);
  addIf(filter, 'referenceType', q.referenceType);
  addIf(filter, 'productId', q.productId);
  return StockMovement.find(filter)
    .populate('productId', 'productName sku unitType')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

export const ppfUsageReport = async (q = {}) => {
  const filter = { ...dateRange('usageDate', q.from, q.to) };
  addIf(filter, 'ppfProductId', q.productId || q.ppfProductId);
  addIf(filter, 'customerId', q.customerId);
  addIf(filter, 'jobCardId', q.jobCardId);
  addIf(filter, 'technicianId', q.technicianId);
  return PPFUsage.find(filter)
    .populate('ppfProductId', 'productName sku')
    .populate('customerId', 'name phone')
    .populate('jobCardId', 'jobCardNumber')
    .populate('technicianId', 'name employeeCode')
    .sort({ usageDate: -1 })
    .lean();
};

// ---------- FINANCE ----------

export const expenseReport = async (q = {}) => {
  const filter = { ...dateRange('expenseDate', q.from, q.to) };
  addIf(filter, 'category', q.category);
  addIf(filter, 'paymentMode', q.paymentMode);
  return Expense.find(filter)
    .populate('createdBy', 'name')
    .populate('pettyCashId', 'transactionType amount')
    .sort({ expenseDate: -1 })
    .lean();
};

export const pettyCashReport = async (q = {}) => {
  const filter = { ...dateRange('transactionDate', q.from, q.to) };
  addIf(filter, 'transactionType', q.transactionType);
  addIf(filter, 'category', q.category);
  addIf(filter, 'referenceType', q.referenceType);
  addIf(filter, 'approvalStatus', q.approvalStatus || q.status);
  return PettyCash.find(filter)
    .populate('handledBy', 'name employeeCode')
    .populate('approvedBy', 'name')
    .populate('createdBy', 'name')
    .sort({ transactionDate: -1 })
    .lean();
};

/**
 * Daily cash report: cash inflow (cash payments + petty cash_in) vs
 * cash outflow (cash expenses + petty cash_out) for the range, plus rows.
 */
export const dailyCashReport = async (q = {}) => {
  const payments = await Payment.find({
    paymentMode: 'cash',
    ...dateRange('paymentDate', q.from, q.to),
  })
    .populate('customerId', 'name phone')
    .populate('invoiceId', 'invoiceNumber')
    .sort({ paymentDate: -1 })
    .lean();

  const pettyCash = await PettyCash.find({ ...dateRange('transactionDate', q.from, q.to) })
    .populate('handledBy', 'name')
    .sort({ transactionDate: -1 })
    .lean();

  const cashExpenses = await Expense.find({
    paymentMode: { $in: ['cash', 'petty_cash'] },
    ...dateRange('expenseDate', q.from, q.to),
  })
    .sort({ expenseDate: -1 })
    .lean();

  const cashInFromPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const pettyIn = pettyCash
    .filter((p) => p.transactionType === 'cash_in')
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pettyOut = pettyCash
    .filter((p) => p.transactionType === 'cash_out')
    .reduce((s, p) => s + (p.amount || 0), 0);
  const expenseOut = cashExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const totalIn = cashInFromPayments + pettyIn;
  const totalOut = pettyOut + expenseOut;

  return {
    summary: {
      cashInFromPayments,
      pettyCashIn: pettyIn,
      pettyCashOut: pettyOut,
      cashExpenses: expenseOut,
      totalIn,
      totalOut,
      netCash: totalIn - totalOut,
    },
    payments,
    pettyCash,
    cashExpenses,
  };
};

// ---------- HR / PAYROLL ----------

export const employeeReport = async (q = {}) => {
  const filter = {};
  addIf(filter, 'status', q.status);
  addIf(filter, 'role', q.role);
  addIf(filter, 'department', q.department);
  addIf(filter, 'salaryType', q.salaryType);
  if (q.search) {
    filter.$or = [
      { name: { $regex: q.search, $options: 'i' } },
      { phone: { $regex: q.search, $options: 'i' } },
      { employeeCode: { $regex: q.search, $options: 'i' } },
    ];
  }
  return Employee.find(filter).sort({ name: 1 }).lean();
};

export const attendanceReport = async (q = {}) => {
  const filter = { ...dateRange('attendanceDate', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'employeeId', q.employeeId);
  return Attendance.find(filter)
    .populate('employeeId', 'name employeeCode role department')
    .populate('markedBy', 'name')
    .sort({ attendanceDate: -1 })
    .lean();
};

/**
 * Monthly attendance: aggregate per-employee status counts for a month/year.
 */
export const monthlyAttendanceReport = async (q = {}) => {
  const month = Number(q.month);
  const year = Number(q.year);
  const filter = {};
  if (month && year) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    filter.attendanceDate = { $gte: start, $lte: end };
  } else {
    Object.assign(filter, dateRange('attendanceDate', q.from, q.to));
  }
  addIf(filter, 'employeeId', q.employeeId);

  const records = await Attendance.find(filter)
    .populate('employeeId', 'name employeeCode role department')
    .lean();

  const map = new Map();
  for (const r of records) {
    const emp = r.employeeId;
    const id = emp?._id?.toString() || 'unknown';
    if (!map.has(id)) {
      map.set(id, {
        employeeId: emp?._id || null,
        name: emp?.name || 'Unknown',
        employeeCode: emp?.employeeCode || '',
        department: emp?.department || '',
        present: 0,
        absent: 0,
        halfDay: 0,
        paidLeave: 0,
        unpaidLeave: 0,
        weeklyOff: 0,
        holiday: 0,
        totalWorkingHours: 0,
        overtimeHours: 0,
        totalRecords: 0,
      });
    }
    const row = map.get(id);
    row.totalRecords += 1;
    row.totalWorkingHours += r.totalWorkingHours || 0;
    row.overtimeHours += r.overtimeHours || 0;
    switch (r.status) {
      case 'present': row.present += 1; break;
      case 'absent': row.absent += 1; break;
      case 'half_day': row.halfDay += 1; break;
      case 'paid_leave': row.paidLeave += 1; break;
      case 'unpaid_leave': row.unpaidLeave += 1; break;
      case 'weekly_off': row.weeklyOff += 1; break;
      case 'holiday': row.holiday += 1; break;
      default: break;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const salaryReport = async (q = {}) => {
  const filter = {};
  if (q.month) filter.salaryMonth = Number(q.month);
  if (q.year) filter.salaryYear = Number(q.year);
  addIf(filter, 'paymentStatus', q.paymentStatus || q.status);
  addIf(filter, 'employeeId', q.employeeId);
  if (q.from || q.to) Object.assign(filter, dateRange('paymentDate', q.from, q.to));
  return Salary.find(filter)
    .populate('employeeId', 'name employeeCode role department')
    .populate('generatedBy', 'name')
    .populate('paidBy', 'name')
    .sort({ salaryYear: -1, salaryMonth: -1 })
    .lean();
};

export const salaryAdvanceReport = async (q = {}) => {
  const filter = { ...dateRange('advanceDate', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'employeeId', q.employeeId);
  return SalaryAdvance.find(filter)
    .populate('employeeId', 'name employeeCode role')
    .populate('approvedBy', 'name')
    .populate('paidBy', 'name')
    .sort({ advanceDate: -1 })
    .lean();
};

export const leaveReport = async (q = {}) => {
  const filter = { ...dateRange('fromDate', q.from, q.to) };
  addIf(filter, 'status', q.status);
  addIf(filter, 'leaveType', q.leaveType);
  addIf(filter, 'employeeId', q.employeeId);
  return Leave.find(filter)
    .populate('employeeId', 'name employeeCode role department')
    .populate('approvedBy', 'name')
    .sort({ fromDate: -1 })
    .lean();
};

/**
 * Payroll report: salary rows for a month/year plus aggregate totals.
 */
export const payrollReport = async (q = {}) => {
  const filter = {};
  if (q.month) filter.salaryMonth = Number(q.month);
  if (q.year) filter.salaryYear = Number(q.year);
  addIf(filter, 'paymentStatus', q.paymentStatus);
  if (q.from || q.to) Object.assign(filter, dateRange('paymentDate', q.from, q.to));

  const rows = await Salary.find(filter)
    .populate('employeeId', 'name employeeCode role department')
    .sort({ 'employeeId.name': 1 })
    .lean();

  const totals = rows.reduce(
    (acc, r) => {
      acc.grossSalary += r.grossSalary || 0;
      acc.advanceDeduction += r.advanceDeduction || 0;
      acc.otherDeductions += r.otherDeductions || 0;
      acc.bonus += r.bonus || 0;
      acc.netSalary += r.netSalary || 0;
      if (r.paymentStatus === 'paid') acc.paidNet += r.netSalary || 0;
      else if (r.paymentStatus === 'pending') acc.pendingNet += r.netSalary || 0;
      return acc;
    },
    { grossSalary: 0, advanceDeduction: 0, otherDeductions: 0, bonus: 0, netSalary: 0, paidNet: 0, pendingNet: 0 }
  );

  return { totals, rows };
};

// ---------- PROFIT & LOSS ----------

/**
 * Profit & Loss for a date range.
 * revenue  = sum of all payments in range
 * expenses = sum of Expense + sum of paid Salary netSalary + petty cash_out
 * profit   = revenue - expenses
 */
export const profitAndLossReport = async (q = {}) => {
  const paymentMatch = { ...dateRange('paymentDate', q.from, q.to) };
  const expenseMatch = { ...dateRange('expenseDate', q.from, q.to) };
  const pettyMatch = { transactionType: 'cash_out', ...dateRange('transactionDate', q.from, q.to) };

  const [payments, expenses, pettyOut] = await Promise.all([
    Payment.find(paymentMatch).select('amount').lean(),
    Expense.find(expenseMatch).select('amount').lean(),
    PettyCash.find(pettyMatch).select('amount').lean(),
  ]);

  // Paid salaries by paymentDate when range provided, else by month/year.
  const salaryMatch = { paymentStatus: 'paid' };
  if (q.from || q.to) {
    Object.assign(salaryMatch, dateRange('paymentDate', q.from, q.to));
  } else {
    if (q.month) salaryMatch.salaryMonth = Number(q.month);
    if (q.year) salaryMatch.salaryYear = Number(q.year);
  }
  const salaries = await Salary.find(salaryMatch).select('netSalary').lean();

  const revenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const directExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const salaryExpenses = salaries.reduce((s, x) => s + (x.netSalary || 0), 0);
  const pettyCashExpenses = pettyOut.reduce((s, p) => s + (p.amount || 0), 0);
  const expensesTotal = directExpenses + salaryExpenses + pettyCashExpenses;

  return {
    revenue,
    expenses: expensesTotal,
    profit: revenue - expensesTotal,
    breakdown: {
      paymentsRevenue: revenue,
      directExpenses,
      salaryExpenses,
      pettyCashExpenses,
    },
  };
};
