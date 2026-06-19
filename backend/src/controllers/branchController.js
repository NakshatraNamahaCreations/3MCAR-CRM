import * as branchService from '../services/branchService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const create = asyncHandler(async (req, res) => {
  const branch = await branchService.createBranch(req.body);
  sendSuccess(res, { message: 'Branch created', data: branch, statusCode: 201 });
});

export const getAll = asyncHandler(async (req, res) => {
  const branches = await branchService.getAllBranches(req.query);
  sendSuccess(res, { message: 'Branches fetched', data: branches });
});

export const getById = asyncHandler(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id);
  sendSuccess(res, { message: 'Branch fetched', data: branch });
});

export const update = asyncHandler(async (req, res) => {
  const branch = await branchService.updateBranch(req.params.id, req.body);
  sendSuccess(res, { message: 'Branch updated', data: branch });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await branchService.deleteBranch(req.params.id);
  sendSuccess(res, { message: 'Branch deleted', data: result });
});

/** Branches the current user can access (for the branch switcher). */
export const myBranches = asyncHandler(async (req, res) => {
  const branches = await branchService.getMyBranches(req.user);
  sendSuccess(res, {
    message: 'My branches fetched',
    data: { branches, activeBranchId: req.activeBranchId || null },
  });
});

/** Switch the current user's active branch. */
export const switchActive = asyncHandler(async (req, res) => {
  const branch = await branchService.switchBranch(req.user, req.body.branchId);
  sendSuccess(res, { message: 'Active branch switched', data: branch });
});

export default { create, getAll, getById, update, remove, myBranches, switchActive };
