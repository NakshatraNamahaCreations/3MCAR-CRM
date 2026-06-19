import Enquiry from '../models/Enquiry.js';
import EnquiryFollowup from '../models/EnquiryFollowup.js';
import Quote from '../models/Quote.js';
import Customer from '../models/Customer.js';
import Appointment from '../models/Appointment.js';
import JobCard from '../models/JobCard.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import PPFUsage from '../models/PPFUsage.js';
import PettyCash from '../models/PettyCash.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Salary from '../models/Salary.js';
import SalaryAdvance from '../models/SalaryAdvance.js';
import Leave from '../models/Leave.js';
import { getCurrentBalance } from '../utils/pettyCashHelper.js';
import { getLowStockProducts } from '../utils/stockHelper.js';

/* ----------------------------------------------------------------------------
 * Date boundary helpers (constructed fresh per call so "today" stays correct)
 * --------------------------------------------------------------------------*/
const getDateBoundaries = () => {
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    now,
    startOfToday,
    endOfToday,
    startOfMonth,
    endOfMonth,
    currentMonth: now.getMonth() + 1, // 1-12
    currentYear: now.getFullYear(),
  };
};

/** Sum a numeric field over a collection given a match filter. */
const sumField = async (Model, match, field) => {
  const result = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result.length ? result[0].total || 0 : 0;
};

/* ----------------------------------------------------------------------------
 * Main summary
 * --------------------------------------------------------------------------*/
export const getSummary = async () => {
  const b = getDateBoundaries();
  const todayRange = { $gte: b.startOfToday, $lte: b.endOfToday };
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const [
    totalEnquiries,
    hotEnquiries,
    pendingFollowups,
    todayFollowups,
    totalQuotes,
    acceptedQuotes,
    totalCustomers,
    todayAppointments,
    activeJobCards,
    completedJobCards,
    pendingInvoices,
    paidInvoices,
    todayRevenue,
    monthlyRevenue,
    lowStockProducts,
    ppfProducts,
    ppfUsageThisMonth,
    pendingPayments,
    deliveredVehicles,
    pettyCashBalance,
    todayCashIn,
    todayCashOut,
    pendingCashApprovals,
    totalEmployees,
    presentToday,
    absentToday,
    pendingLeaves,
    salaryPendingThisMonth,
    salaryPaidThisMonth,
    advancePending,
    monthlySalaryExpense,
  ] = await Promise.all([
    Enquiry.countDocuments({}),
    Enquiry.countDocuments({ status: 'hot' }),
    EnquiryFollowup.countDocuments({ status: 'pending' }),
    EnquiryFollowup.countDocuments({ followupDate: todayRange }),
    Quote.countDocuments({}),
    Quote.countDocuments({ status: 'confirmed' }),
    Customer.countDocuments({}),
    Appointment.countDocuments({ appointmentDate: todayRange }),
    JobCard.countDocuments({ status: { $in: ['created', 'assigned', 'work_started'] } }),
    JobCard.countDocuments({ status: { $in: ['work_completed', 'delivered'] } }),
    Invoice.countDocuments({ paymentStatus: { $in: ['unpaid', 'partial'] } }),
    Invoice.countDocuments({ paymentStatus: 'paid' }),
    sumField(Payment, { paymentDate: todayRange }, 'amount'),
    sumField(Payment, { paymentDate: monthRange }, 'amount'),
    getLowStockProducts(),
    Product.find({ isPPF: true, status: 'active' }).select('currentStock'),
    PPFUsage.aggregate([
      { $match: { usageDate: monthRange } },
      { $group: { _id: null, total: { $sum: { $add: ['$usedSqft', '$wastageSqft'] } } } },
    ]),
    sumField(Invoice, { invoiceStatus: 'generated' }, 'balanceAmount'),
    JobCard.countDocuments({ status: 'delivered' }),
    getCurrentBalance(),
    sumField(PettyCash, { transactionType: 'cash_in', transactionDate: todayRange }, 'amount'),
    sumField(PettyCash, { transactionType: 'cash_out', transactionDate: todayRange }, 'amount'),
    PettyCash.countDocuments({ approvalStatus: 'pending' }),
    Employee.countDocuments({}),
    Attendance.countDocuments({ attendanceDate: todayRange, status: 'present' }),
    Attendance.countDocuments({ attendanceDate: todayRange, status: 'absent' }),
    Leave.countDocuments({ status: 'pending' }),
    Salary.countDocuments({
      salaryMonth: b.currentMonth,
      salaryYear: b.currentYear,
      paymentStatus: 'pending',
    }),
    Salary.countDocuments({
      salaryMonth: b.currentMonth,
      salaryYear: b.currentYear,
      paymentStatus: 'paid',
    }),
    SalaryAdvance.countDocuments({ status: 'pending' }),
    sumField(
      Salary,
      { salaryMonth: b.currentMonth, salaryYear: b.currentYear, paymentStatus: 'paid' },
      'netSalary'
    ),
  ]);

  const ppfRemainingSqft = ppfProducts.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const ppfUsedThisMonth = ppfUsageThisMonth.length ? ppfUsageThisMonth[0].total || 0 : 0;

  return {
    totalEnquiries,
    hotEnquiries,
    pendingFollowups,
    todayFollowups,
    totalQuotes,
    acceptedQuotes,
    totalCustomers,
    todayAppointments,
    activeJobCards,
    completedJobCards,
    pendingInvoices,
    paidInvoices,
    todayRevenue,
    monthlyRevenue,
    lowStockCount: lowStockProducts.length,
    ppfRemainingSqft,
    ppfUsedThisMonth,
    pendingPayments,
    deliveredVehicles,
    pettyCashBalance,
    todayCashIn,
    todayCashOut,
    pendingCashApprovals,
    totalEmployees,
    presentToday,
    absentToday,
    pendingLeaves,
    salaryPendingThisMonth,
    salaryPaidThisMonth,
    advancePending,
    monthlySalaryExpense,
  };
};

/* ----------------------------------------------------------------------------
 * Consolidated, branch- & period-aware overview (KPIs + charts + lists).
 * `base` is a branch filter object: {} | {branchId} | {branchId:{$in:[...]}}.
 * --------------------------------------------------------------------------*/
const periodRange = (period) => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start;
  if (period === 'week') {
    const day = (now.getDay() + 6) % 7; // Monday = 0
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  return { start, end };
};

export const getOverview = async (base = {}, period = 'month') => {
  const b = getDateBoundaries();
  const { start, end } = periodRange(period);
  const range = { $gte: start, $lte: end };
  const M = (extra) => ({ ...base, ...extra });

  const [
    totalEnquiries, hotEnquiries, pendingFollowups, todayFollowups,
    totalQuotes, confirmedQuotes, totalCustomers, periodAppointments,
    activeJobCards, completedJobCards, deliveredVehicles,
    lowStockProducts, ppfProducts,
    pendingInvoices, paidInvoices, periodRevenue, pendingPayments,
    pettyCashBalance, cashIn, cashOut,
    totalEmployees, presentToday, absentToday, pendingLeaves,
    enquiryStatusAgg, jobCardStatusAgg,
    recentEnquiries, recentInvoices, recentAppointments,
  ] = await Promise.all([
    Enquiry.countDocuments(M({})),
    Enquiry.countDocuments(M({ status: 'hot' })),
    EnquiryFollowup.countDocuments(M({ status: 'pending' })),
    EnquiryFollowup.countDocuments(M({ followupDate: { $gte: b.startOfToday, $lte: b.endOfToday } })),
    Quote.countDocuments(M({})),
    Quote.countDocuments(M({ status: 'confirmed' })),
    Customer.countDocuments(M({})),
    Appointment.countDocuments(M({ appointmentDate: range })),
    JobCard.countDocuments(M({ status: { $in: ['created', 'assigned', 'work_started'] } })),
    JobCard.countDocuments(M({ status: { $in: ['work_completed', 'delivered'] }, updatedAt: range })),
    JobCard.countDocuments(M({ status: 'delivered', updatedAt: range })),
    getLowStockProducts(),
    Product.find(M({ isPPF: true, status: 'active' })).select('currentStock'),
    Invoice.countDocuments(M({ paymentStatus: { $in: ['unpaid', 'partial'] } })),
    Invoice.countDocuments(M({ paymentStatus: 'paid', updatedAt: range })),
    sumField(Payment, M({ paymentDate: range }), 'amount'),
    sumField(Invoice, M({ invoiceStatus: 'generated' }), 'balanceAmount'),
    getCurrentBalance(),
    sumField(PettyCash, M({ transactionType: 'cash_in', transactionDate: range }), 'amount'),
    sumField(PettyCash, M({ transactionType: 'cash_out', transactionDate: range }), 'amount'),
    Employee.countDocuments(M({})),
    Attendance.countDocuments(M({ attendanceDate: { $gte: b.startOfToday, $lte: b.endOfToday }, status: 'present' })),
    Attendance.countDocuments(M({ attendanceDate: { $gte: b.startOfToday, $lte: b.endOfToday }, status: 'absent' })),
    Leave.countDocuments(M({ status: 'pending' })),
    Enquiry.aggregate([{ $match: M({}) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    JobCard.aggregate([{ $match: M({}) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enquiry.find(M({})).sort({ createdAt: -1 }).limit(6).select('name phone status createdAt vehicleNumber'),
    Invoice.find(M({})).sort({ createdAt: -1 }).limit(6).populate('customerId', 'name').select('invoiceNumber customerName customerId grandTotal paymentStatus createdAt'),
    Appointment.find(M({})).sort({ appointmentDate: -1 }).limit(6).populate('customerId', 'name').populate('vehicleId', 'vehicleNumber').select('appointmentNumber appointmentDate appointmentTime status customerId vehicleId'),
  ]);

  // Revenue trend — last 7 days (daily), branch-scoped.
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(b.now.getFullYear(), b.now.getMonth(), b.now.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), ds, de });
  }
  const revenueSeries = [];
  for (const d of days) {
    const v = await sumField(Payment, M({ paymentDate: { $gte: d.ds, $lte: d.de } }), 'amount');
    revenueSeries.push({ label: d.label, value: v });
  }

  const ppfRemainingSqft = ppfProducts.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const mapAgg = (agg) => agg.filter((x) => x._id).map((x) => ({ label: x._id, value: x.count }));

  return {
    period,
    kpis: {
      totalEnquiries, hotEnquiries, pendingFollowups, todayFollowups,
      totalQuotes, confirmedQuotes, totalCustomers, periodAppointments,
      activeJobCards, completedJobCards, deliveredVehicles,
      lowStockCount: lowStockProducts.length, ppfRemainingSqft,
      pendingInvoices, paidInvoices, periodRevenue, pendingPayments,
      pettyCashBalance, cashIn, cashOut,
      totalEmployees, presentToday, absentToday, pendingLeaves,
    },
    charts: {
      revenueSeries,
      enquiryStatus: mapAgg(enquiryStatusAgg),
      jobCardStatus: mapAgg(jobCardStatusAgg),
    },
    lists: {
      recentEnquiries,
      recentInvoices,
      recentAppointments,
    },
  };
};

/* ----------------------------------------------------------------------------
 * Enquiry stats
 * --------------------------------------------------------------------------*/
export const getEnquiryStats = async () => {
  const b = getDateBoundaries();
  const todayRange = { $gte: b.startOfToday, $lte: b.endOfToday };
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const byStatusAgg = await Enquiry.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = byStatusAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = r.count;
    return acc;
  }, {});

  const bySourceAgg = await Enquiry.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
  ]);
  const bySource = bySourceAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = r.count;
    return acc;
  }, {});

  const [total, todayEnquiries, monthEnquiries, converted, pendingFollowups, todayFollowups] =
    await Promise.all([
      Enquiry.countDocuments({}),
      Enquiry.countDocuments({ createdAt: todayRange }),
      Enquiry.countDocuments({ createdAt: monthRange }),
      Enquiry.countDocuments({ status: 'converted' }),
      EnquiryFollowup.countDocuments({ status: 'pending' }),
      EnquiryFollowup.countDocuments({ followupDate: todayRange }),
    ]);

  const conversionRate = total ? Number(((converted / total) * 100).toFixed(2)) : 0;

  return {
    total,
    todayEnquiries,
    monthEnquiries,
    converted,
    conversionRate,
    pendingFollowups,
    todayFollowups,
    byStatus,
    bySource,
  };
};

/* ----------------------------------------------------------------------------
 * Job card stats
 * --------------------------------------------------------------------------*/
export const getJobCardStats = async () => {
  const b = getDateBoundaries();
  const todayRange = { $gte: b.startOfToday, $lte: b.endOfToday };
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const byStatusAgg = await JobCard.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = byStatusAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = r.count;
    return acc;
  }, {});

  const [total, todayCreated, monthCreated, active, completed, delivered, cancelled] =
    await Promise.all([
      JobCard.countDocuments({}),
      JobCard.countDocuments({ createdAt: todayRange }),
      JobCard.countDocuments({ createdAt: monthRange }),
      JobCard.countDocuments({ status: { $in: ['created', 'assigned', 'work_started'] } }),
      JobCard.countDocuments({ status: { $in: ['work_completed', 'delivered'] } }),
      JobCard.countDocuments({ status: 'delivered' }),
      JobCard.countDocuments({ status: 'cancelled' }),
    ]);

  return {
    total,
    todayCreated,
    monthCreated,
    active,
    completed,
    delivered,
    cancelled,
    byStatus,
  };
};

/* ----------------------------------------------------------------------------
 * Revenue stats
 * --------------------------------------------------------------------------*/
export const getRevenueStats = async () => {
  const b = getDateBoundaries();
  const todayRange = { $gte: b.startOfToday, $lte: b.endOfToday };
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const [todayRevenue, monthlyRevenue, totalRevenue, pendingPayments] = await Promise.all([
    sumField(Payment, { paymentDate: todayRange }, 'amount'),
    sumField(Payment, { paymentDate: monthRange }, 'amount'),
    sumField(Payment, {}, 'amount'),
    sumField(Invoice, { invoiceStatus: 'generated' }, 'balanceAmount'),
  ]);

  const byModeAgg = await Payment.aggregate([
    { $match: { paymentDate: monthRange } },
    { $group: { _id: '$paymentMode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const byPaymentMode = byModeAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = { total: r.total || 0, count: r.count };
    return acc;
  }, {});

  // Daily revenue trend for the current month
  const dailyTrendAgg = await Payment.aggregate([
    { $match: { paymentDate: monthRange } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const dailyTrend = dailyTrendAgg.map((r) => ({ date: r._id, total: r.total || 0 }));

  const [totalInvoices, paidInvoices, partialInvoices, unpaidInvoices, invoicedAmount] =
    await Promise.all([
      Invoice.countDocuments({ invoiceStatus: 'generated' }),
      Invoice.countDocuments({ invoiceStatus: 'generated', paymentStatus: 'paid' }),
      Invoice.countDocuments({ invoiceStatus: 'generated', paymentStatus: 'partial' }),
      Invoice.countDocuments({ invoiceStatus: 'generated', paymentStatus: 'unpaid' }),
      sumField(Invoice, { invoiceStatus: 'generated' }, 'grandTotal'),
    ]);

  return {
    todayRevenue,
    monthlyRevenue,
    totalRevenue,
    pendingPayments,
    invoicedAmount,
    byPaymentMode,
    dailyTrend,
    invoices: {
      total: totalInvoices,
      paid: paidInvoices,
      partial: partialInvoices,
      unpaid: unpaidInvoices,
    },
  };
};

/* ----------------------------------------------------------------------------
 * Inventory stats
 * --------------------------------------------------------------------------*/
export const getInventoryStats = async () => {
  const lowStockProducts = await getLowStockProducts();

  const [totalProducts, activeProducts, inactiveProducts] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'inactive' }),
  ]);

  const valueAgg = await Product.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        purchaseValue: { $sum: { $multiply: ['$currentStock', '$purchasePrice'] } },
        sellingValue: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
      },
    },
  ]);
  const stockValue = valueAgg.length
    ? {
        purchaseValue: valueAgg[0].purchaseValue || 0,
        sellingValue: valueAgg[0].sellingValue || 0,
      }
    : { purchaseValue: 0, sellingValue: 0 };

  const byCategoryAgg = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byCategory = byCategoryAgg.reduce((acc, r) => {
    acc[r._id || 'uncategorized'] = r.count;
    return acc;
  }, {});

  return {
    totalProducts,
    activeProducts,
    inactiveProducts,
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    stockValue,
    byCategory,
  };
};

/* ----------------------------------------------------------------------------
 * PPF stats
 * --------------------------------------------------------------------------*/
export const getPPFStats = async () => {
  const b = getDateBoundaries();
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const ppfProducts = await Product.find({ isPPF: true, status: 'active' }).select(
    'productName currentStock minimumStock'
  );
  const ppfRemainingSqft = ppfProducts.reduce((acc, p) => acc + (p.currentStock || 0), 0);

  const monthAgg = await PPFUsage.aggregate([
    { $match: { usageDate: monthRange } },
    {
      $group: {
        _id: null,
        usedSqft: { $sum: '$usedSqft' },
        wastageSqft: { $sum: '$wastageSqft' },
        count: { $sum: 1 },
      },
    },
  ]);
  const monthUsage = monthAgg.length
    ? {
        usedSqft: monthAgg[0].usedSqft || 0,
        wastageSqft: monthAgg[0].wastageSqft || 0,
        totalConsumed: (monthAgg[0].usedSqft || 0) + (monthAgg[0].wastageSqft || 0),
        count: monthAgg[0].count,
      }
    : { usedSqft: 0, wastageSqft: 0, totalConsumed: 0, count: 0 };

  const totalAgg = await PPFUsage.aggregate([
    {
      $group: {
        _id: null,
        usedSqft: { $sum: '$usedSqft' },
        wastageSqft: { $sum: '$wastageSqft' },
        count: { $sum: 1 },
      },
    },
  ]);
  const totalUsage = totalAgg.length
    ? {
        usedSqft: totalAgg[0].usedSqft || 0,
        wastageSqft: totalAgg[0].wastageSqft || 0,
        totalConsumed: (totalAgg[0].usedSqft || 0) + (totalAgg[0].wastageSqft || 0),
        count: totalAgg[0].count,
      }
    : { usedSqft: 0, wastageSqft: 0, totalConsumed: 0, count: 0 };

  return {
    ppfProductCount: ppfProducts.length,
    ppfRemainingSqft,
    ppfProducts,
    ppfUsedThisMonth: monthUsage.totalConsumed,
    monthUsage,
    totalUsage,
  };
};

/* ----------------------------------------------------------------------------
 * Petty cash stats
 * --------------------------------------------------------------------------*/
export const getPettyCashStats = async () => {
  const b = getDateBoundaries();
  const todayRange = { $gte: b.startOfToday, $lte: b.endOfToday };
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const [
    balance,
    todayCashIn,
    todayCashOut,
    monthCashIn,
    monthCashOut,
    pendingApprovals,
    approvedCount,
    rejectedCount,
  ] = await Promise.all([
    getCurrentBalance(),
    sumField(PettyCash, { transactionType: 'cash_in', transactionDate: todayRange }, 'amount'),
    sumField(PettyCash, { transactionType: 'cash_out', transactionDate: todayRange }, 'amount'),
    sumField(PettyCash, { transactionType: 'cash_in', transactionDate: monthRange }, 'amount'),
    sumField(PettyCash, { transactionType: 'cash_out', transactionDate: monthRange }, 'amount'),
    PettyCash.countDocuments({ approvalStatus: 'pending' }),
    PettyCash.countDocuments({ approvalStatus: 'approved' }),
    PettyCash.countDocuments({ approvalStatus: 'rejected' }),
  ]);

  const byCategoryAgg = await PettyCash.aggregate([
    { $match: { transactionType: 'cash_out', transactionDate: monthRange } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  const cashOutByCategory = byCategoryAgg.map((r) => ({
    category: r._id || 'uncategorized',
    total: r.total || 0,
    count: r.count,
  }));

  return {
    balance,
    todayCashIn,
    todayCashOut,
    monthCashIn,
    monthCashOut,
    pendingApprovals,
    approvedCount,
    rejectedCount,
    cashOutByCategory,
  };
};

/* ----------------------------------------------------------------------------
 * HR stats
 * --------------------------------------------------------------------------*/
export const getHRStats = async () => {
  const [totalEmployees, activeEmployees, inactiveEmployees, pendingLeaves, advancePending] =
    await Promise.all([
      Employee.countDocuments({}),
      Employee.countDocuments({ status: 'active' }),
      Employee.countDocuments({ status: { $in: ['inactive', 'resigned', 'terminated'] } }),
      Leave.countDocuments({ status: 'pending' }),
      SalaryAdvance.countDocuments({ status: 'pending' }),
    ]);

  const byRoleAgg = await Employee.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const byRole = byRoleAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = r.count;
    return acc;
  }, {});

  const byDepartmentAgg = await Employee.aggregate([
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);
  const byDepartment = byDepartmentAgg.reduce((acc, r) => {
    acc[r._id || 'unassigned'] = r.count;
    return acc;
  }, {});

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    pendingLeaves,
    advancePending,
    byRole,
    byDepartment,
  };
};

/* ----------------------------------------------------------------------------
 * Salary stats
 * --------------------------------------------------------------------------*/
export const getSalaryStats = async () => {
  const b = getDateBoundaries();
  const monthFilter = { salaryMonth: b.currentMonth, salaryYear: b.currentYear };

  const [
    pendingThisMonth,
    paidThisMonth,
    cancelledThisMonth,
    monthlySalaryExpense,
    pendingAmount,
    advancePendingCount,
    advancePendingAmount,
  ] = await Promise.all([
    Salary.countDocuments({ ...monthFilter, paymentStatus: 'pending' }),
    Salary.countDocuments({ ...monthFilter, paymentStatus: 'paid' }),
    Salary.countDocuments({ ...monthFilter, paymentStatus: 'cancelled' }),
    sumField(Salary, { ...monthFilter, paymentStatus: 'paid' }, 'netSalary'),
    sumField(Salary, { ...monthFilter, paymentStatus: 'pending' }, 'netSalary'),
    SalaryAdvance.countDocuments({ status: 'pending' }),
    sumField(SalaryAdvance, { status: 'pending' }, 'amount'),
  ]);

  return {
    month: b.currentMonth,
    year: b.currentYear,
    salaryPendingThisMonth: pendingThisMonth,
    salaryPaidThisMonth: paidThisMonth,
    salaryCancelledThisMonth: cancelledThisMonth,
    monthlySalaryExpense,
    salaryPendingAmount: pendingAmount,
    advancePending: advancePendingCount,
    advancePendingAmount,
  };
};

/* ----------------------------------------------------------------------------
 * Attendance stats
 * --------------------------------------------------------------------------*/
export const getAttendanceStats = async () => {
  const b = getDateBoundaries();
  const todayRange = { $gte: b.startOfToday, $lte: b.endOfToday };
  const monthRange = { $gte: b.startOfMonth, $lte: b.endOfMonth };

  const todayAgg = await Attendance.aggregate([
    { $match: { attendanceDate: todayRange } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const todayByStatus = todayAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = r.count;
    return acc;
  }, {});

  const [totalEmployees, presentToday, absentToday, halfDayToday, onLeaveToday] = await Promise.all([
    Employee.countDocuments({ status: 'active' }),
    Attendance.countDocuments({ attendanceDate: todayRange, status: 'present' }),
    Attendance.countDocuments({ attendanceDate: todayRange, status: 'absent' }),
    Attendance.countDocuments({ attendanceDate: todayRange, status: 'half_day' }),
    Attendance.countDocuments({
      attendanceDate: todayRange,
      status: { $in: ['paid_leave', 'unpaid_leave'] },
    }),
  ]);

  const monthAgg = await Attendance.aggregate([
    { $match: { attendanceDate: monthRange } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const monthByStatus = monthAgg.reduce((acc, r) => {
    acc[r._id || 'unknown'] = r.count;
    return acc;
  }, {});

  return {
    totalEmployees,
    presentToday,
    absentToday,
    halfDayToday,
    onLeaveToday,
    todayByStatus,
    monthByStatus,
  };
};

export default {
  getSummary,
  getEnquiryStats,
  getJobCardStats,
  getRevenueStats,
  getInventoryStats,
  getPPFStats,
  getPettyCashStats,
  getHRStats,
  getSalaryStats,
  getAttendanceStats,
};
