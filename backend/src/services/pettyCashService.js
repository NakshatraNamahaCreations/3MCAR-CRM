import PettyCash from '../models/PettyCash.js';
import { AppError } from '../utils/apiResponse.js';
import { createPettyCashEntry, getCurrentBalance } from '../utils/pettyCashHelper.js';

/**
 * Create a petty cash transaction. Uses the helper so opening/closing balances
 * are computed and the available balance is validated for cash_out.
 */
export const create = async (data, userId) => {
  if (!data.transactionType) throw new AppError('transactionType is required.', 400);

  const entry = await createPettyCashEntry({
    transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
    transactionType: data.transactionType,
    category: data.category,
    amount: data.amount,
    paymentPurpose: data.paymentPurpose,
    paidTo: data.paidTo,
    receivedFrom: data.receivedFrom,
    referenceType: data.referenceType || 'manual',
    referenceId: data.referenceId || null,
    branchId: data.branchId,
    remarks: data.remarks,
    handledBy: data.handledBy || null,
    approvedBy: data.approvedBy || null,
    approvalStatus: data.approvalStatus || 'pending',
    createdBy: userId,
  });

  return entry;
};

/**
 * Update editable metadata on a petty cash entry. Amount / transactionType are
 * intentionally not editable here to avoid corrupting the running balance chain.
 */
export const update = async (id, data) => {
  const entry = await PettyCash.findById(id);
  if (!entry) throw new AppError('Petty cash entry not found.', 404);

  const fields = [
    'category',
    'paymentPurpose',
    'paidTo',
    'receivedFrom',
    'referenceType',
    'referenceId',
    'remarks',
    'handledBy',
    'approvedBy',
    'approvalStatus',
  ];
  for (const field of fields) {
    if (data[field] !== undefined) entry[field] = data[field];
  }
  if (data.transactionDate !== undefined) entry.transactionDate = new Date(data.transactionDate);

  await entry.save();
  return entry;
};

export const remove = async (id) => {
  const entry = await PettyCash.findByIdAndDelete(id);
  if (!entry) throw new AppError('Petty cash entry not found.', 404);
  return entry;
};

export const getAll = async (query = {}) => {
  const { startDate, endDate, category, transactionType, approvalStatus, search } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;

  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) filter.transactionDate.$lte = new Date(endDate);
  }
  if (category) filter.category = category;
  if (transactionType) filter.transactionType = transactionType;
  if (approvalStatus) filter.approvalStatus = approvalStatus;
  if (search) {
    filter.$or = [
      { category: { $regex: search, $options: 'i' } },
      { paymentPurpose: { $regex: search, $options: 'i' } },
      { paidTo: { $regex: search, $options: 'i' } },
      { receivedFrom: { $regex: search, $options: 'i' } },
      { remarks: { $regex: search, $options: 'i' } },
    ];
  }

  return PettyCash.find(filter)
    .populate('handledBy', 'name employeeNumber')
    .populate('approvedBy', 'name email role')
    .populate('createdBy', 'name email role')
    .sort({ transactionDate: -1, createdAt: -1 });
};

export const getById = async (id) => {
  const entry = await PettyCash.findById(id)
    .populate('handledBy', 'name employeeNumber')
    .populate('approvedBy', 'name email role')
    .populate('createdBy', 'name email role');
  if (!entry) throw new AppError('Petty cash entry not found.', 404);
  return entry;
};

const sumByType = (records) => {
  let cashIn = 0;
  let cashOut = 0;
  for (const r of records) {
    if (r.transactionType === 'cash_in') cashIn += r.amount;
    else if (r.transactionType === 'cash_out') cashOut += r.amount;
  }
  return { cashIn, cashOut };
};

/** Today's cash_in / cash_out totals plus the current running balance. */
export const getTodaySummary = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const records = await PettyCash.find({ transactionDate: { $gte: start, $lte: end } });
  const { cashIn, cashOut } = sumByType(records);
  const currentBalance = await getCurrentBalance();

  return {
    date: start,
    totalCashIn: cashIn,
    totalCashOut: cashOut,
    net: cashIn - cashOut,
    transactionCount: records.length,
    currentBalance,
  };
};

/** Cash_in / cash_out totals for a given month & year (defaults to current). */
export const getMonthlySummary = async (query = {}) => {
  const now = new Date();
  const month = query.month ? Number(query.month) : now.getMonth() + 1;
  const year = query.year ? Number(query.year) : now.getFullYear();

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await PettyCash.find({ transactionDate: { $gte: start, $lte: end } });
  const { cashIn, cashOut } = sumByType(records);
  const currentBalance = await getCurrentBalance();

  return {
    month,
    year,
    totalCashIn: cashIn,
    totalCashOut: cashOut,
    net: cashIn - cashOut,
    transactionCount: records.length,
    currentBalance,
  };
};

export const currentBalance = async () => {
  const balance = await getCurrentBalance();
  return { currentBalance: balance };
};

export const approve = async (id, userId) => {
  const entry = await PettyCash.findById(id);
  if (!entry) throw new AppError('Petty cash entry not found.', 404);
  entry.approvalStatus = 'approved';
  entry.approvedBy = userId;
  await entry.save();
  return entry;
};
