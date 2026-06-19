import * as serviceService from '../services/serviceService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createService = asyncHandler(async (req, res) => {
  const data = await serviceService.createService({ ...req.body, branchId: req.activeBranchId });
  sendSuccess(res, {
    message: 'Service created successfully',
    data,
    statusCode: 201,
  });
});

export const updateService = asyncHandler(async (req, res) => {
  const data = await serviceService.updateService(req.params.id, req.body);
  sendSuccess(res, { message: 'Service updated successfully', data });
});

export const deleteService = asyncHandler(async (req, res) => {
  await serviceService.deleteService(req.params.id);
  sendSuccess(res, { message: 'Service deleted successfully' });
});

export const getAllServices = asyncHandler(async (req, res) => {
  const data = await serviceService.getAllServices({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Services fetched successfully', data });
});

export const getServiceById = asyncHandler(async (req, res) => {
  const data = await serviceService.getServiceById(req.params.id);
  sendSuccess(res, { message: 'Service fetched successfully', data });
});

export const toggleServiceStatus = asyncHandler(async (req, res) => {
  const data = await serviceService.toggleServiceStatus(req.params.id);
  sendSuccess(res, { message: 'Service status updated successfully', data });
});
