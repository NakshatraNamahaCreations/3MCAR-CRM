import * as expenseService from '../services/expenseService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.create({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Expense created successfully', data: expense, statusCode: 201 });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Expense updated successfully', data: expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.remove(req.params.id);
  sendSuccess(res, { message: 'Expense deleted successfully' });
});

export const getAllExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Expenses fetched successfully', data: expenses });
});

export const getExpenseReport = asyncHandler(async (req, res) => {
  const data = await expenseService.report(req.query);
  sendSuccess(res, { message: 'Expense report generated successfully', data });
});
