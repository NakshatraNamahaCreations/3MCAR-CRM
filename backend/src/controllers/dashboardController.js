import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiResponse.js';

// Build a branch filter from the request: single active branch, or the user's
// assigned branches in "All Branches" mode, or {} for admin viewing everything.
const branchFilter = (req) => {
  if (req.activeBranchId) return { branchId: req.activeBranchId };
  if (Array.isArray(req.branchScope) && req.branchScope.length) {
    return { branchId: { $in: req.branchScope } };
  }
  return {};
};

export const getOverview = asyncHandler(async (req, res) => {
  const period = ['today', 'week', 'month'].includes(req.query.period) ? req.query.period : 'month';
  const data = await dashboardService.getOverview(branchFilter(req), period);
  return sendSuccess(res, { message: 'Dashboard overview fetched successfully', data });
});

export const getSummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary();
  return sendSuccess(res, { message: 'Dashboard summary fetched successfully', data });
});

export const getEnquiryStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getEnquiryStats();
  return sendSuccess(res, { message: 'Enquiry stats fetched successfully', data });
});

export const getJobCardStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getJobCardStats();
  return sendSuccess(res, { message: 'Job card stats fetched successfully', data });
});

export const getRevenueStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRevenueStats();
  return sendSuccess(res, { message: 'Revenue stats fetched successfully', data });
});

export const getInventoryStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getInventoryStats();
  return sendSuccess(res, { message: 'Inventory stats fetched successfully', data });
});

export const getPPFStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPPFStats();
  return sendSuccess(res, { message: 'PPF stats fetched successfully', data });
});

export const getPettyCashStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPettyCashStats();
  return sendSuccess(res, { message: 'Petty cash stats fetched successfully', data });
});

export const getHRStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getHRStats();
  return sendSuccess(res, { message: 'HR stats fetched successfully', data });
});

export const getSalaryStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSalaryStats();
  return sendSuccess(res, { message: 'Salary stats fetched successfully', data });
});

export const getAttendanceStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAttendanceStats();
  return sendSuccess(res, { message: 'Attendance stats fetched successfully', data });
});
