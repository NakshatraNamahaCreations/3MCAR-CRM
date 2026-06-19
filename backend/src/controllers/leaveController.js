import * as leaveService from '../services/leaveService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const applyLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.applyLeave({ ...req.body, branchId: req.activeBranchId });
  sendSuccess(res, {
    message: 'Leave applied successfully.',
    data: leave,
    statusCode: 201,
  });
});

export const updateLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.updateLeave(req.params.id, req.body);
  sendSuccess(res, { message: 'Leave updated successfully.', data: leave });
});

export const approveLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.approveLeave(req.params.id, req.user._id);
  sendSuccess(res, { message: 'Leave approved successfully.', data: leave });
});

export const rejectLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.rejectLeave(req.params.id, req.body.remarks);
  sendSuccess(res, { message: 'Leave rejected.', data: leave });
});

export const getLeaves = asyncHandler(async (req, res) => {
  const leaves = await leaveService.getLeaves({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Leaves fetched successfully.', data: leaves });
});

export const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await leaveService.getLeaveById(req.params.id);
  sendSuccess(res, { message: 'Leave fetched successfully.', data: leave });
});

export const getByEmployeeId = asyncHandler(async (req, res) => {
  const leaves = await leaveService.getByEmployeeId(req.params.employeeId);
  sendSuccess(res, { message: 'Employee leaves fetched successfully.', data: leaves });
});

export const getPending = asyncHandler(async (req, res) => {
  const leaves = await leaveService.getPending();
  sendSuccess(res, { message: 'Pending leaves fetched successfully.', data: leaves });
});

export const getCalendar = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const leaves = await leaveService.getCalendar(startDate, endDate);
  sendSuccess(res, { message: 'Leave calendar fetched successfully.', data: leaves });
});

export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const leaves = await leaveService.getMonthlyReport(month, year);
  sendSuccess(res, { message: 'Monthly leave report fetched successfully.', data: leaves });
});
