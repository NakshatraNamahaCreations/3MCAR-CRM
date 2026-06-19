import * as pettyCashService from '../services/pettyCashService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createPettyCash = asyncHandler(async (req, res) => {
  const entry = await pettyCashService.create({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Petty cash entry created successfully', data: entry, statusCode: 201 });
});

export const updatePettyCash = asyncHandler(async (req, res) => {
  const entry = await pettyCashService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Petty cash entry updated successfully', data: entry });
});

export const deletePettyCash = asyncHandler(async (req, res) => {
  await pettyCashService.remove(req.params.id);
  sendSuccess(res, { message: 'Petty cash entry deleted successfully' });
});

export const getAllPettyCash = asyncHandler(async (req, res) => {
  const entries = await pettyCashService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Petty cash entries fetched successfully', data: entries });
});

export const getPettyCashById = asyncHandler(async (req, res) => {
  const entry = await pettyCashService.getById(req.params.id);
  sendSuccess(res, { message: 'Petty cash entry fetched successfully', data: entry });
});

export const getTodaySummary = asyncHandler(async (req, res) => {
  const data = await pettyCashService.getTodaySummary();
  sendSuccess(res, { message: "Today's petty cash summary fetched successfully", data });
});

export const getMonthlySummary = asyncHandler(async (req, res) => {
  const data = await pettyCashService.getMonthlySummary(req.query);
  sendSuccess(res, { message: 'Monthly petty cash summary fetched successfully', data });
});

export const getCurrentBalance = asyncHandler(async (req, res) => {
  const data = await pettyCashService.currentBalance();
  sendSuccess(res, { message: 'Current petty cash balance fetched successfully', data });
});

export const approvePettyCash = asyncHandler(async (req, res) => {
  const entry = await pettyCashService.approve(req.params.id, req.user._id);
  sendSuccess(res, { message: 'Petty cash entry approved successfully', data: entry });
});
