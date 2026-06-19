import * as deliveryService from '../services/deliveryService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const deliverVehicle = asyncHandler(async (req, res) => {
  const data = await deliveryService.deliverVehicle({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Vehicle delivered successfully', data, statusCode: 201 });
});

export const getDeliveryDetails = asyncHandler(async (req, res) => {
  const data = await deliveryService.getDeliveryDetails(req.params.jobCardId);
  sendSuccess(res, { message: 'Delivery details fetched successfully', data });
});

export const getDelivered = asyncHandler(async (req, res) => {
  const data = await deliveryService.getDelivered({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Delivered vehicles fetched successfully', data });
});
