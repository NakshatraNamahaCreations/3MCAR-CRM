import {
  createQuoteFollowup,
  updateQuoteFollowup,
  deleteQuoteFollowup,
  getAllQuoteFollowups,
  getFollowupsByQuoteId,
  getPendingFollowups,
  getTodayFollowups,
} from '../services/quoteFollowupService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const getAll = asyncHandler(async (req, res) => {
  const followups = await getAllQuoteFollowups({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, { message: 'Quote followups fetched successfully', data: followups });
});

export const create = asyncHandler(async (req, res) => {
  const followup = await createQuoteFollowup({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  return sendSuccess(res, {
    message: 'Quote followup created successfully',
    data: followup,
    statusCode: 201,
  });
});

export const update = asyncHandler(async (req, res) => {
  const followup = await updateQuoteFollowup(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Quote followup updated successfully',
    data: followup,
  });
});

export const remove = asyncHandler(async (req, res) => {
  await deleteQuoteFollowup(req.params.id);
  return sendSuccess(res, {
    message: 'Quote followup deleted successfully',
  });
});

export const getByQuoteId = asyncHandler(async (req, res) => {
  const followups = await getFollowupsByQuoteId(req.params.quoteId);
  return sendSuccess(res, {
    message: 'Quote followups fetched successfully',
    data: followups,
  });
});

export const getPending = asyncHandler(async (req, res) => {
  const followups = await getPendingFollowups({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Pending quote followups fetched successfully',
    data: followups,
  });
});

export const getToday = asyncHandler(async (req, res) => {
  const followups = await getTodayFollowups({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: "Today's quote followups fetched successfully",
    data: followups,
  });
});
