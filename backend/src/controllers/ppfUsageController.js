import * as ppfUsageService from '../services/ppfUsageService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'PPF usage fetched', data });
});

export const createPPFUsage = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.createPPFUsage(
    { ...req.body, branchId: req.activeBranchId },
    req.user._id
  );
  sendSuccess(res, {
    message: 'PPF usage record created successfully',
    data,
    statusCode: 201,
  });
});

export const updatePPFUsage = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.updatePPFUsage(req.params.id, req.body);
  sendSuccess(res, { message: 'PPF usage record updated successfully', data });
});

export const deletePPFUsage = asyncHandler(async (req, res) => {
  await ppfUsageService.deletePPFUsage(req.params.id);
  sendSuccess(res, { message: 'PPF usage record deleted successfully' });
});

export const getByJobCardId = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getByJobCardId(req.params.jobCardId);
  sendSuccess(res, { message: 'PPF usage records fetched successfully', data });
});

export const getByVehicleId = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getByVehicleId(req.params.vehicleId);
  sendSuccess(res, { message: 'PPF usage records fetched successfully', data });
});

export const getByCustomerId = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getByCustomerId(req.params.customerId);
  sendSuccess(res, { message: 'PPF usage records fetched successfully', data });
});

export const getByProductId = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getByProductId(req.params.productId);
  sendSuccess(res, { message: 'PPF usage records fetched successfully', data });
});

export const getTotalUsedReport = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getTotalUsedReport();
  sendSuccess(res, { message: 'PPF total used report fetched successfully', data });
});

export const getRemainingStockReport = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.getRemainingStockReport();
  sendSuccess(res, { message: 'PPF remaining stock report fetched successfully', data });
});

export const deductOnCompletion = asyncHandler(async (req, res) => {
  const data = await ppfUsageService.deductOnCompletion(req.params.jobCardId, req.user._id);
  sendSuccess(res, { message: 'PPF stock deducted on completion successfully', data });
});
