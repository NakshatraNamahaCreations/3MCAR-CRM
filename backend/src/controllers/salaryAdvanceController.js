import * as salaryAdvanceService from '../services/salaryAdvanceService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createAdvance = asyncHandler(async (req, res) => {
  const advance = await salaryAdvanceService.createAdvance({ ...req.body, branchId: req.activeBranchId });
  sendSuccess(res, {
    message: 'Salary advance created successfully.',
    data: advance,
    statusCode: 201,
  });
});

export const updateAdvance = asyncHandler(async (req, res) => {
  const advance = await salaryAdvanceService.updateAdvance(req.params.id, req.body);
  sendSuccess(res, { message: 'Salary advance updated successfully.', data: advance });
});

export const approveAdvance = asyncHandler(async (req, res) => {
  const advance = await salaryAdvanceService.approveAdvance(req.params.id, req.user._id);
  sendSuccess(res, { message: 'Salary advance approved successfully.', data: advance });
});

export const rejectAdvance = asyncHandler(async (req, res) => {
  const advance = await salaryAdvanceService.rejectAdvance(req.params.id, req.body.remarks);
  sendSuccess(res, { message: 'Salary advance rejected.', data: advance });
});

export const getAdvances = asyncHandler(async (req, res) => {
  const advances = await salaryAdvanceService.getAdvances({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Salary advances fetched successfully.', data: advances });
});

export const getAdvanceById = asyncHandler(async (req, res) => {
  const advance = await salaryAdvanceService.getAdvanceById(req.params.id);
  sendSuccess(res, { message: 'Salary advance fetched successfully.', data: advance });
});

export const getByEmployeeId = asyncHandler(async (req, res) => {
  const advances = await salaryAdvanceService.getByEmployeeId(req.params.employeeId);
  sendSuccess(res, { message: 'Employee salary advances fetched successfully.', data: advances });
});

export const getPending = asyncHandler(async (req, res) => {
  const advances = await salaryAdvanceService.getPending(req.query.status);
  sendSuccess(res, { message: 'Pending salary advances fetched successfully.', data: advances });
});

export const getMonthlyDeductions = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const advances = await salaryAdvanceService.getMonthlyDeductions(month, year);
  sendSuccess(res, { message: 'Monthly deductions fetched successfully.', data: advances });
});
