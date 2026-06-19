import * as enquiryService from '../services/enquiryService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.createEnquiry({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  return sendSuccess(res, {
    message: 'Enquiry created successfully',
    data: enquiry,
    statusCode: 201,
  });
});

export const getAllEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await enquiryService.getAllEnquiries({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Enquiries fetched successfully',
    data: enquiries,
  });
});

export const getEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.getEnquiryById(req.params.id);
  return sendSuccess(res, {
    message: 'Enquiry fetched successfully',
    data: enquiry,
  });
});

export const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.updateEnquiry(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Enquiry updated successfully',
    data: enquiry,
  });
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const result = await enquiryService.deleteEnquiry(req.params.id);
  return sendSuccess(res, {
    message: 'Enquiry deleted successfully',
    data: result,
  });
});
