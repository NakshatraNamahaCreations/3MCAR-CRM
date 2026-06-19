import * as salaryService from '../services/salaryService.js';
import Salary from '../models/Salary.js';
import { sendSuccess, asyncHandler, AppError } from '../utils/apiResponse.js';
import { streamSalarySlipPdf } from '../utils/salarySlipPdf.js';

export const downloadSlip = asyncHandler(async (req, res) => {
  const salary = await Salary.findById(req.params.id).populate('employeeId');
  if (!salary) throw new AppError('Salary record not found', 404);
  const filename = `Salary-${salary.employeeId?.employeeCode || salary._id}-${salary.salaryMonth}-${salary.salaryYear}.pdf`;
  const disposition = req.query.inline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  streamSalarySlipPdf(salary, res);
});

export const generateForEmployee = asyncHandler(async (req, res) => {
  const { employeeId, salaryMonth, salaryYear, bonus, otherDeductions } = req.body;
  if (!employeeId || !salaryMonth || !salaryYear) {
    throw new AppError('employeeId, salaryMonth and salaryYear are required.', 400);
  }
  const salary = await salaryService.generateForEmployee(
    employeeId,
    salaryMonth,
    salaryYear,
    {
      bonus: Number(bonus) || 0,
      otherDeductions: Number(otherDeductions) || 0,
      branchId: req.activeBranchId,
    },
    req.user._id
  );
  sendSuccess(res, {
    message: 'Salary generated successfully.',
    data: salary,
    statusCode: 201,
  });
});

export const generateForAll = asyncHandler(async (req, res) => {
  const { salaryMonth, salaryYear } = req.body;
  if (!salaryMonth || !salaryYear) {
    throw new AppError('salaryMonth and salaryYear are required.', 400);
  }
  const salaries = await salaryService.generateForAll(
    salaryMonth,
    salaryYear,
    req.user._id
  );
  sendSuccess(res, {
    message: `Salary generated for ${salaries.length} employee(s).`,
    data: salaries,
    statusCode: 201,
  });
});

export const updateSalary = asyncHandler(async (req, res) => {
  const salary = await salaryService.updateSalary(req.params.id, req.body);
  sendSuccess(res, { message: 'Salary updated successfully.', data: salary });
});

export const deleteSalary = asyncHandler(async (req, res) => {
  await salaryService.deleteSalary(req.params.id);
  sendSuccess(res, { message: 'Salary deleted successfully.' });
});

export const getByEmployeeId = asyncHandler(async (req, res) => {
  const salaries = await salaryService.getByEmployeeId(
    req.params.employeeId,
    req.query
  );
  sendSuccess(res, { message: 'Salary records fetched.', data: salaries });
});

export const getByMonth = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    throw new AppError('month and year query params are required.', 400);
  }
  const salaries = await salaryService.getByMonth(month, year, {
    ...req.query,
    branchId: req.activeBranchId,
  });
  sendSuccess(res, { message: 'Salary records fetched.', data: salaries });
});

export const markAsPaid = asyncHandler(async (req, res) => {
  const { paymentMode, transactionId } = req.body;
  const salary = await salaryService.markAsPaid(
    req.params.id,
    { paymentMode, transactionId },
    req.user._id
  );
  sendSuccess(res, { message: 'Salary marked as paid.', data: salary });
});

export const getAll = asyncHandler(async (req, res) => {
  const data = await salaryService.getAll({
    ...req.query,
    branchId: req.activeBranchId,
  });
  sendSuccess(res, { message: 'Salary fetched', data });
});

export const summaryReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    throw new AppError('month and year query params are required.', 400);
  }
  const summary = await salaryService.summaryReport(month, year);
  sendSuccess(res, { message: 'Salary summary report.', data: summary });
});

export default {
  generateForEmployee,
  generateForAll,
  updateSalary,
  deleteSalary,
  getByEmployeeId,
  getByMonth,
  markAsPaid,
  summaryReport,
  getAll,
};
