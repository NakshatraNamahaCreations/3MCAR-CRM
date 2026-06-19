import SalaryAdvance from '../models/SalaryAdvance.js';
import { AppError } from '../utils/apiResponse.js';
import { createLinkedCashOut } from '../utils/pettyCashHelper.js';

export const createAdvance = async (data) => {
  const payload = { ...data };
  if (!payload.advanceDate) payload.advanceDate = new Date();
  return SalaryAdvance.create(payload);
};

export const updateAdvance = async (id, data) => {
  const advance = await SalaryAdvance.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!advance) throw new AppError('Salary advance not found.', 404);
  return advance;
};

export const approveAdvance = async (id, userId) => {
  const advance = await SalaryAdvance.findById(id);
  if (!advance) throw new AppError('Salary advance not found.', 404);
  if (advance.status === 'approved') {
    throw new AppError('Salary advance is already approved.', 400);
  }

  advance.status = 'approved';
  advance.approvedBy = userId;

  if (advance.paymentMode === 'cash' && !advance.pettyCashId) {
    const cashOut = await createLinkedCashOut({
      amount: advance.amount,
      category: 'salary_advance',
      paymentPurpose: 'Salary advance',
      referenceType: 'salary_advance',
      referenceId: advance._id,
      createdBy: userId,
    });
    advance.pettyCashId = cashOut._id;
    advance.paidBy = userId;
  }

  await advance.save();
  return advance;
};

export const rejectAdvance = async (id, remarks) => {
  const advance = await SalaryAdvance.findById(id);
  if (!advance) throw new AppError('Salary advance not found.', 404);
  advance.status = 'rejected';
  if (remarks !== undefined) advance.remarks = remarks;
  await advance.save();
  return advance;
};

export const getAdvanceById = async (id) => {
  const advance = await SalaryAdvance.findById(id)
    .populate('employeeId')
    .populate('approvedBy', 'name email role')
    .populate('paidBy', 'name email role');
  if (!advance) throw new AppError('Salary advance not found.', 404);
  return advance;
};

export const getAdvances = async (query = {}) => {
  const { employeeId, status, paymentMode, repaymentMode, search, branchId } = query;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (employeeId) filter.employeeId = employeeId;
  if (status) filter.status = status;
  if (paymentMode) filter.paymentMode = paymentMode;
  if (repaymentMode) filter.repaymentMode = repaymentMode;
  if (search) filter.reason = { $regex: search, $options: 'i' };

  return SalaryAdvance.find(filter)
    .populate('employeeId')
    .populate('approvedBy', 'name email role')
    .sort({ advanceDate: -1, createdAt: -1 });
};

export const getByEmployeeId = async (employeeId) => {
  return SalaryAdvance.find({ employeeId })
    .populate('employeeId')
    .populate('approvedBy', 'name email role')
    .sort({ advanceDate: -1, createdAt: -1 });
};

export const getPending = async (status = 'pending') => {
  return SalaryAdvance.find({ status })
    .populate('employeeId')
    .sort({ advanceDate: -1, createdAt: -1 });
};

export const getMonthlyDeductions = async (month, year) => {
  const m = Number(month);
  const y = Number(year);
  return SalaryAdvance.find({
    status: 'approved',
    repaymentMode: 'salary_deduction',
    deductionMonth: m,
    deductionYear: y,
  })
    .populate('employeeId')
    .sort({ advanceDate: -1, createdAt: -1 });
};
