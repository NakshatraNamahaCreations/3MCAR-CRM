import Attendance from '../models/Attendance.js';
import { AppError } from '../utils/apiResponse.js';
import { computeWorkingHours, summarizeAttendance } from '../utils/attendanceHelper.js';

/**
 * Normalize an arbitrary date input to the start of that day (00:00:00.000).
 * Ensures one attendance record per employee per calendar date.
 */
const startOfDay = (input) => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) throw new AppError('Invalid date provided', 400);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (input) => {
  const d = startOfDay(input);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Mark (upsert) a single attendance record for an employee on a date.
 * When both checkInTime and checkOutTime are present, working hours and
 * overtime are computed automatically.
 */
export const markAttendance = async (payload, markedBy) => {
  const {
    employeeId,
    attendanceDate,
    checkInTime,
    checkOutTime,
    status,
    lateMark,
    overtimeHours,
    remarks,
    branchId,
  } = payload;

  if (!employeeId) throw new AppError('employeeId is required', 400);

  const date = startOfDay(attendanceDate);

  const update = { markedBy };
  if (branchId !== undefined) update.branchId = branchId;
  if (status !== undefined) update.status = status;
  if (lateMark !== undefined) update.lateMark = lateMark;
  if (remarks !== undefined) update.remarks = remarks;
  if (checkInTime !== undefined) update.checkInTime = checkInTime ? new Date(checkInTime) : undefined;
  if (checkOutTime !== undefined) update.checkOutTime = checkOutTime ? new Date(checkOutTime) : undefined;

  if (checkInTime && checkOutTime) {
    const { totalWorkingHours, overtimeHours: ot } = computeWorkingHours(checkInTime, checkOutTime);
    update.totalWorkingHours = totalWorkingHours;
    update.overtimeHours = overtimeHours !== undefined ? overtimeHours : ot;
  } else if (overtimeHours !== undefined) {
    update.overtimeHours = overtimeHours;
  }

  const record = await Attendance.findOneAndUpdate(
    { employeeId, attendanceDate: date },
    { $set: update, $setOnInsert: { employeeId, attendanceDate: date } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('employeeId', 'name employeeCode designation department');

  return record;
};

/**
 * Mark attendance for many employees on a single date in one call.
 * Each record is upserted (employeeId + attendanceDate), so re-saving the
 * same day updates the existing rows instead of duplicating.
 * records: [{ employeeId, status, checkInTime?, checkOutTime?, overtimeHours?, remarks? }]
 */
export const bulkMarkAttendance = async ({ attendanceDate, records, branchId }, markedBy) => {
  if (!attendanceDate) throw new AppError('attendanceDate is required', 400);
  if (!Array.isArray(records) || records.length === 0) {
    throw new AppError('At least one employee record is required', 400);
  }

  let saved = 0;
  for (const rec of records) {
    if (!rec.employeeId) continue;
    await markAttendance(
      { ...rec, attendanceDate, branchId: branchId ?? rec.branchId },
      markedBy
    );
    saved += 1;
  }

  return { attendanceDate, count: saved };
};

export const updateAttendance = async (id, payload, markedBy) => {
  const record = await Attendance.findById(id);
  if (!record) throw new AppError('Attendance record not found', 404);

  const fields = ['status', 'lateMark', 'overtimeHours', 'remarks'];
  for (const f of fields) {
    if (payload[f] !== undefined) record[f] = payload[f];
  }
  if (payload.checkInTime !== undefined) record.checkInTime = payload.checkInTime ? new Date(payload.checkInTime) : undefined;
  if (payload.checkOutTime !== undefined) record.checkOutTime = payload.checkOutTime ? new Date(payload.checkOutTime) : undefined;

  if (record.checkInTime && record.checkOutTime) {
    const { totalWorkingHours, overtimeHours } = computeWorkingHours(record.checkInTime, record.checkOutTime);
    record.totalWorkingHours = totalWorkingHours;
    if (payload.overtimeHours === undefined) record.overtimeHours = overtimeHours;
  }

  record.markedBy = markedBy;
  await record.save();
  return record.populate('employeeId', 'name employeeCode designation department');
};

export const deleteAttendance = async (id) => {
  const record = await Attendance.findByIdAndDelete(id);
  if (!record) throw new AppError('Attendance record not found', 404);
  return record;
};

/**
 * List all attendance records, optionally filtered by branch, employee, or status.
 */
export const getAll = async (query = {}) => {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.employeeId) filter.employeeId = query.employeeId;
  if (query.status) filter.status = query.status;
  return Attendance.find(filter)
    .populate('employeeId', 'name employeeCode role')
    .sort({ attendanceDate: -1, createdAt: -1 });
};

/**
 * Get attendance records for one employee, optionally bounded by from/to dates.
 */
export const getByEmployeeId = async (employeeId, { from, to } = {}) => {
  const filter = { employeeId };
  if (from || to) {
    filter.attendanceDate = {};
    if (from) filter.attendanceDate.$gte = startOfDay(from);
    if (to) filter.attendanceDate.$lte = endOfDay(to);
  }
  return Attendance.find(filter)
    .sort({ attendanceDate: -1 })
    .populate('employeeId', 'name employeeCode designation department')
    .populate('markedBy', 'name email');
};

/**
 * Get all employees' attendance for a single date.
 */
export const getByDate = async (date, query = {}) => {
  const filter = {
    attendanceDate: { $gte: startOfDay(date), $lte: endOfDay(date) },
  };
  if (query.branchId) filter.branchId = query.branchId;
  return Attendance.find(filter)
    .sort({ 'employeeId': 1 })
    .populate('employeeId', 'name employeeCode designation department')
    .populate('markedBy', 'name email');
};

/**
 * Monthly report for an employee: records + payroll summary.
 */
export const getMonthlyReport = async (employeeId, month, year) => {
  if (!employeeId) throw new AppError('employeeId is required', 400);
  const m = Number(month);
  const y = Number(year);
  if (!m || m < 1 || m > 12 || !y) throw new AppError('Valid month (1-12) and year are required', 400);

  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const records = await Attendance.find({
    employeeId,
    attendanceDate: { $gte: start, $lte: end },
  })
    .sort({ attendanceDate: 1 })
    .populate('employeeId', 'name employeeCode designation department');

  const summary = summarizeAttendance(records);
  return { month: m, year: y, records, summary };
};

/**
 * Counts of each status for today.
 */
export const getTodaySummary = async () => {
  const filter = {
    attendanceDate: { $gte: startOfDay(), $lte: endOfDay() },
  };
  const records = await Attendance.find(filter).select('status overtimeHours totalWorkingHours');
  const summary = summarizeAttendance(records);
  return { date: startOfDay(), totalMarked: records.length, summary };
};

/**
 * Check in an employee: create/update today's record with checkInTime=now, status present.
 */
export const checkIn = async (employeeId, markedBy) => {
  if (!employeeId) throw new AppError('employeeId is required', 400);
  const date = startOfDay();
  const now = new Date();

  const record = await Attendance.findOneAndUpdate(
    { employeeId, attendanceDate: date },
    {
      $set: { checkInTime: now, status: 'present', markedBy },
      $setOnInsert: { employeeId, attendanceDate: date },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate('employeeId', 'name employeeCode designation department');

  return record;
};

/**
 * Check out an employee: set checkOutTime=now on today's record and recompute hours.
 */
export const checkOut = async (employeeId, markedBy) => {
  if (!employeeId) throw new AppError('employeeId is required', 400);
  const date = startOfDay();

  const record = await Attendance.findOne({ employeeId, attendanceDate: date });
  if (!record) throw new AppError('No check-in record found for today', 404);
  if (!record.checkInTime) throw new AppError('Employee has not checked in today', 400);

  record.checkOutTime = new Date();
  const { totalWorkingHours, overtimeHours } = computeWorkingHours(record.checkInTime, record.checkOutTime);
  record.totalWorkingHours = totalWorkingHours;
  record.overtimeHours = overtimeHours;
  record.markedBy = markedBy;

  await record.save();
  return record.populate('employeeId', 'name employeeCode designation department');
};
