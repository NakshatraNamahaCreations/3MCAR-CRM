import * as enquiryFollowupService from '../services/enquiryFollowupService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const create = asyncHandler(async (req, res) => {
  const followup = await enquiryFollowupService.createFollowup({
    ...req.body,
    branchId: req.activeBranchId,
    createdBy: req.user._id,
  });
  sendSuccess(res, {
    message: 'Followup created successfully',
    data: followup,
    statusCode: 201,
  });
});

export const update = asyncHandler(async (req, res) => {
  const followup = await enquiryFollowupService.updateFollowup(req.params.id, req.body);
  sendSuccess(res, { message: 'Followup updated successfully', data: followup });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await enquiryFollowupService.deleteFollowup(req.params.id);
  sendSuccess(res, { message: 'Followup deleted successfully', data: result });
});

export const getByEnquiryId = asyncHandler(async (req, res) => {
  const followups = await enquiryFollowupService.getFollowupsByEnquiryId(req.params.enquiryId);
  sendSuccess(res, { message: 'Followups fetched successfully', data: followups });
});

export const getToday = asyncHandler(async (req, res) => {
  const followups = await enquiryFollowupService.getTodayFollowups({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: "Today's followups fetched successfully", data: followups });
});

export const getOverdue = asyncHandler(async (req, res) => {
  const followups = await enquiryFollowupService.getOverdueFollowups({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Overdue followups fetched successfully', data: followups });
});

export const getCalendar = asyncHandler(async (req, res) => {
  const followups = await enquiryFollowupService.getCalendarFollowups({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Calendar followups fetched successfully', data: followups });
});
