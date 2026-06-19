import * as attendanceService from '../services/attendanceService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const markAttendance = asyncHandler(async (req, res) => {
  const record = await attendanceService.markAttendance({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Attendance marked successfully', data: record });
});

export const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.bulkMarkAttendance(
    { ...req.body, branchId: req.activeBranchId },
    req.user._id
  );
  sendSuccess(res, { message: `Attendance saved for ${data.count} employee(s)`, data });
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const record = await attendanceService.updateAttendance(req.params.id, req.body, req.user._id);
  sendSuccess(res, { message: 'Attendance updated successfully', data: record });
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  await attendanceService.deleteAttendance(req.params.id);
  sendSuccess(res, { message: 'Attendance deleted successfully' });
});

export const getAll = asyncHandler(async (req, res) => {
  const data = await attendanceService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Attendance fetched', data });
});

export const getByEmployeeId = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const records = await attendanceService.getByEmployeeId(req.params.employeeId, { from, to });
  sendSuccess(res, { message: 'Attendance records fetched successfully', data: records });
});

export const getByDate = asyncHandler(async (req, res) => {
  const records = await attendanceService.getByDate(req.query.date, { branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Attendance for date fetched successfully', data: records });
});

export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { employeeId, month, year } = req.query;
  const report = await attendanceService.getMonthlyReport(employeeId, month, year);
  sendSuccess(res, { message: 'Monthly attendance report fetched successfully', data: report });
});

export const getTodaySummary = asyncHandler(async (req, res) => {
  const summary = await attendanceService.getTodaySummary();
  sendSuccess(res, { message: "Today's attendance summary fetched successfully", data: summary });
});

export const checkIn = asyncHandler(async (req, res) => {
  const employeeId = req.body.employeeId || req.params.employeeId;
  const record = await attendanceService.checkIn(employeeId, req.user._id);
  sendSuccess(res, { message: 'Checked in successfully', data: record });
});

export const checkOut = asyncHandler(async (req, res) => {
  const employeeId = req.body.employeeId || req.params.employeeId;
  const record = await attendanceService.checkOut(employeeId, req.user._id);
  sendSuccess(res, { message: 'Checked out successfully', data: record });
});
