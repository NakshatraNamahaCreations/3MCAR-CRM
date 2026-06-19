import Leave from '../models/Leave.js';
import { AppError } from '../utils/apiResponse.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const computeTotalDays = (fromDate, toDate) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  const diff = Math.round((to - from) / MS_PER_DAY) + 1; // inclusive
  return diff > 0 ? diff : 1;
};

export const applyLeave = async (data) => {
  if (!data.fromDate || !data.toDate) {
    throw new AppError('fromDate and toDate are required.', 400);
  }
  const payload = { ...data };
  payload.totalDays = computeTotalDays(data.fromDate, data.toDate);
  return Leave.create(payload);
};

export const updateLeave = async (id, data) => {
  const payload = { ...data };
  if (data.fromDate || data.toDate) {
    const existing = await Leave.findById(id);
    if (!existing) throw new AppError('Leave not found.', 404);
    payload.totalDays = computeTotalDays(
      data.fromDate || existing.fromDate,
      data.toDate || existing.toDate
    );
  }
  const leave = await Leave.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!leave) throw new AppError('Leave not found.', 404);
  return leave;
};

export const approveLeave = async (id, userId) => {
  const leave = await Leave.findById(id);
  if (!leave) throw new AppError('Leave not found.', 404);
  leave.status = 'approved';
  leave.approvedBy = userId;
  await leave.save();
  return leave;
};

export const rejectLeave = async (id, remarks) => {
  const leave = await Leave.findById(id);
  if (!leave) throw new AppError('Leave not found.', 404);
  leave.status = 'rejected';
  if (remarks !== undefined) leave.remarks = remarks;
  await leave.save();
  return leave;
};

export const getLeaveById = async (id) => {
  const leave = await Leave.findById(id)
    .populate('employeeId')
    .populate('approvedBy', 'name email role');
  if (!leave) throw new AppError('Leave not found.', 404);
  return leave;
};

export const getLeaves = async (query = {}) => {
  const { employeeId, leaveType, status, search } = query;
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (employeeId) filter.employeeId = employeeId;
  if (leaveType) filter.leaveType = leaveType;
  if (status) filter.status = status;
  if (search) filter.reason = { $regex: search, $options: 'i' };

  return Leave.find(filter)
    .populate('employeeId')
    .populate('approvedBy', 'name email role')
    .sort({ fromDate: -1, createdAt: -1 });
};

export const getByEmployeeId = async (employeeId) => {
  return Leave.find({ employeeId })
    .populate('employeeId')
    .populate('approvedBy', 'name email role')
    .sort({ fromDate: -1, createdAt: -1 });
};

export const getPending = async () => {
  return Leave.find({ status: 'pending' })
    .populate('employeeId')
    .sort({ fromDate: -1, createdAt: -1 });
};

export const getCalendar = async (startDate, endDate) => {
  // Overlap: leave.fromDate <= rangeEnd AND leave.toDate >= rangeStart
  const overlapFilter = { status: 'approved' };
  if (startDate) overlapFilter.toDate = { $gte: new Date(startDate) };
  if (endDate) overlapFilter.fromDate = { $lte: new Date(endDate) };

  return Leave.find(overlapFilter)
    .populate('employeeId')
    .sort({ fromDate: 1 });
};

export const getMonthlyReport = async (month, year) => {
  const m = Number(month);
  const y = Number(year);
  const rangeStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const rangeEnd = new Date(y, m, 0, 23, 59, 59, 999);

  return Leave.find({
    fromDate: { $lte: rangeEnd },
    toDate: { $gte: rangeStart },
  })
    .populate('employeeId')
    .populate('approvedBy', 'name email role')
    .sort({ fromDate: 1 });
};
