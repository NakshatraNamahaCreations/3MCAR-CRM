import * as reportService from '../services/reportService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiResponse.js';

export const enquiryReport = asyncHandler(async (req, res) => {
  const data = await reportService.enquiryReport(req.query);
  sendSuccess(res, { message: 'Enquiry report generated.', data });
});

export const followupReport = asyncHandler(async (req, res) => {
  const data = await reportService.followupReport(req.query);
  sendSuccess(res, { message: 'Follow-up report generated.', data });
});

export const quoteReport = asyncHandler(async (req, res) => {
  const data = await reportService.quoteReport(req.query);
  sendSuccess(res, { message: 'Quote report generated.', data });
});

export const customerReport = asyncHandler(async (req, res) => {
  const data = await reportService.customerReport(req.query);
  sendSuccess(res, { message: 'Customer report generated.', data });
});

export const appointmentReport = asyncHandler(async (req, res) => {
  const data = await reportService.appointmentReport(req.query);
  sendSuccess(res, { message: 'Appointment report generated.', data });
});

export const jobCardReport = asyncHandler(async (req, res) => {
  const data = await reportService.jobCardReport(req.query);
  sendSuccess(res, { message: 'Job card report generated.', data });
});

export const invoiceReport = asyncHandler(async (req, res) => {
  const data = await reportService.invoiceReport(req.query);
  sendSuccess(res, { message: 'Invoice report generated.', data });
});

export const paymentReport = asyncHandler(async (req, res) => {
  const data = await reportService.paymentReport(req.query);
  sendSuccess(res, { message: 'Payment report generated.', data });
});

export const productInventoryReport = asyncHandler(async (req, res) => {
  const data = await reportService.productInventoryReport(req.query);
  sendSuccess(res, { message: 'Product inventory report generated.', data });
});

export const stockMovementReport = asyncHandler(async (req, res) => {
  const data = await reportService.stockMovementReport(req.query);
  sendSuccess(res, { message: 'Stock movement report generated.', data });
});

export const ppfUsageReport = asyncHandler(async (req, res) => {
  const data = await reportService.ppfUsageReport(req.query);
  sendSuccess(res, { message: 'PPF usage report generated.', data });
});

export const expenseReport = asyncHandler(async (req, res) => {
  const data = await reportService.expenseReport(req.query);
  sendSuccess(res, { message: 'Expense report generated.', data });
});

export const pettyCashReport = asyncHandler(async (req, res) => {
  const data = await reportService.pettyCashReport(req.query);
  sendSuccess(res, { message: 'Petty cash report generated.', data });
});

export const dailyCashReport = asyncHandler(async (req, res) => {
  const data = await reportService.dailyCashReport(req.query);
  sendSuccess(res, { message: 'Daily cash report generated.', data });
});

export const employeeReport = asyncHandler(async (req, res) => {
  const data = await reportService.employeeReport(req.query);
  sendSuccess(res, { message: 'Employee report generated.', data });
});

export const attendanceReport = asyncHandler(async (req, res) => {
  const data = await reportService.attendanceReport(req.query);
  sendSuccess(res, { message: 'Attendance report generated.', data });
});

export const monthlyAttendanceReport = asyncHandler(async (req, res) => {
  const data = await reportService.monthlyAttendanceReport(req.query);
  sendSuccess(res, { message: 'Monthly attendance report generated.', data });
});

export const salaryReport = asyncHandler(async (req, res) => {
  const data = await reportService.salaryReport(req.query);
  sendSuccess(res, { message: 'Salary report generated.', data });
});

export const salaryAdvanceReport = asyncHandler(async (req, res) => {
  const data = await reportService.salaryAdvanceReport(req.query);
  sendSuccess(res, { message: 'Salary advance report generated.', data });
});

export const leaveReport = asyncHandler(async (req, res) => {
  const data = await reportService.leaveReport(req.query);
  sendSuccess(res, { message: 'Leave report generated.', data });
});

export const payrollReport = asyncHandler(async (req, res) => {
  const data = await reportService.payrollReport(req.query);
  sendSuccess(res, { message: 'Payroll report generated.', data });
});

export const profitAndLossReport = asyncHandler(async (req, res) => {
  const data = await reportService.profitAndLossReport(req.query);
  sendSuccess(res, { message: 'Profit and loss report generated.', data });
});
