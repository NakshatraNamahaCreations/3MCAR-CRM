import * as paymentService from '../services/paymentService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const addPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.addPayment({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Payment recorded successfully', data, statusCode: 201 });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const data = await paymentService.updatePayment(req.params.id, req.body);
  sendSuccess(res, { message: 'Payment updated successfully', data });
});

export const deletePayment = asyncHandler(async (req, res) => {
  const data = await paymentService.deletePayment(req.params.id);
  sendSuccess(res, { message: 'Payment deleted successfully', data });
});

export const getAll = asyncHandler(async (req, res) => {
  const data = await paymentService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Payments fetched', data });
});

export const getByInvoiceId = asyncHandler(async (req, res) => {
  const data = await paymentService.getByInvoiceId(req.params.invoiceId);
  sendSuccess(res, { message: 'Payments fetched successfully', data });
});

export const getByCustomerId = asyncHandler(async (req, res) => {
  const data = await paymentService.getByCustomerId(req.params.customerId);
  sendSuccess(res, { message: 'Payments fetched successfully', data });
});

export const getSummary = asyncHandler(async (req, res) => {
  const data = await paymentService.getSummary({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Payment summary fetched successfully', data });
});

export const validateBeforeDelivery = asyncHandler(async (req, res) => {
  const data = await paymentService.validateBeforeDelivery(req.params.invoiceId);
  sendSuccess(res, { message: 'Delivery validation completed', data });
});
