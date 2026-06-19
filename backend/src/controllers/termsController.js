import * as termsService from '../services/termsService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const create = asyncHandler(async (req, res) => {
  const data = await termsService.createTerms({ ...req.body, branchId: req.activeBranchId, createdBy: req.user._id });
  sendSuccess(res, { message: 'Terms template created', data, statusCode: 201 });
});

export const getAll = asyncHandler(async (req, res) => {
  const data = await termsService.getAllTerms({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Terms templates fetched', data });
});

export const getById = asyncHandler(async (req, res) => {
  const data = await termsService.getTermsById(req.params.id);
  sendSuccess(res, { message: 'Terms template fetched', data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await termsService.updateTerms(req.params.id, req.body);
  sendSuccess(res, { message: 'Terms template updated', data });
});

export const remove = asyncHandler(async (req, res) => {
  const data = await termsService.deleteTerms(req.params.id);
  sendSuccess(res, { message: 'Terms template deleted', data });
});

export default { create, getAll, getById, update, remove };
