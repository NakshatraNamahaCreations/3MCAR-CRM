import Expense from '../models/Expense.js';
import { AppError } from '../utils/apiResponse.js';
import { createLinkedCashOut } from '../utils/pettyCashHelper.js';

/**
 * Create an expense. When paid via petty cash, a linked cash_out petty cash
 * entry is created and referenced back on the expense.
 */
export const create = async (data, userId) => {
  const {
    expenseDate,
    category,
    amount,
    paymentMode = 'cash',
    paidTo,
    remarks,
    branchId,
  } = data;

  if (!category) throw new AppError('Expense category is required.', 400);
  if (amount == null || Number(amount) <= 0) {
    throw new AppError('Expense amount must be greater than zero.', 400);
  }

  const expense = await Expense.create({
    expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    category,
    amount: Number(amount),
    paymentMode,
    paidTo,
    remarks,
    branchId,
    createdBy: userId,
  });

  if (paymentMode === 'petty_cash') {
    const cashOut = await createLinkedCashOut({
      amount: Number(amount),
      category: 'expense',
      paymentPurpose: category,
      paidTo,
      referenceType: 'expense',
      referenceId: expense._id,
      createdBy: userId,
      remarks,
    });
    expense.pettyCashId = cashOut._id;
    await expense.save();
  }

  return expense;
};

export const update = async (id, data) => {
  const expense = await Expense.findById(id);
  if (!expense) throw new AppError('Expense not found.', 404);

  const fields = ['expenseDate', 'category', 'amount', 'paymentMode', 'paidTo', 'remarks'];
  for (const field of fields) {
    if (data[field] !== undefined) {
      if (field === 'expenseDate') expense.expenseDate = new Date(data.expenseDate);
      else if (field === 'amount') expense.amount = Number(data.amount);
      else expense[field] = data[field];
    }
  }

  await expense.save();
  return expense;
};

export const remove = async (id) => {
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) throw new AppError('Expense not found.', 404);
  return expense;
};

export const getAll = async (query = {}) => {
  const { startDate, endDate, category, paymentMode, search } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;

  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) filter.expenseDate.$gte = new Date(startDate);
    if (endDate) filter.expenseDate.$lte = new Date(endDate);
  }
  if (category) filter.category = category;
  if (paymentMode) filter.paymentMode = paymentMode;
  if (search) {
    filter.$or = [
      { category: { $regex: search, $options: 'i' } },
      { paidTo: { $regex: search, $options: 'i' } },
      { remarks: { $regex: search, $options: 'i' } },
    ];
  }

  return Expense.find(filter)
    .populate('createdBy', 'name email role')
    .populate('pettyCashId')
    .sort({ expenseDate: -1, createdAt: -1 });
};

/** Group expenses by category and sum amounts within an optional date range. */
export const report = async (query = {}) => {
  const { startDate, endDate } = query;
  const match = {};
  if (startDate || endDate) {
    match.expenseDate = {};
    if (startDate) match.expenseDate.$gte = new Date(startDate);
    if (endDate) match.expenseDate.$lte = new Date(endDate);
  }

  const grouped = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  const byCategory = grouped.map((g) => ({
    category: g._id,
    totalAmount: g.totalAmount,
    count: g.count,
  }));

  const grandTotal = byCategory.reduce((sum, g) => sum + g.totalAmount, 0);

  return { byCategory, grandTotal };
};
