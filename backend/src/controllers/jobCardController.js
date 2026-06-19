import * as jobCardService from '../services/jobCardService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createFromAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body;
  const jobCard = await jobCardService.createFromAppointment(appointmentId, req.user._id);
  sendSuccess(res, { message: 'Job card created from appointment.', data: jobCard, statusCode: 201 });
});

export const create = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.create({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Job card created.', data: jobCard, statusCode: 201 });
});

export const update = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Job card updated.', data: jobCard });
});

export const remove = asyncHandler(async (req, res) => {
  await jobCardService.remove(req.params.id);
  sendSuccess(res, { message: 'Job card deleted.' });
});

export const getAll = asyncHandler(async (req, res) => {
  const jobCards = await jobCardService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Job cards fetched.', data: jobCards });
});

export const getById = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.getById(req.params.id);
  sendSuccess(res, { message: 'Job card fetched.', data: jobCard });
});

export const assignTechnician = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.assignTechnician(req.params.id, req.body);
  sendSuccess(res, { message: 'Technician assigned.', data: jobCard });
});

export const startWork = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.startWork(req.params.id);
  sendSuccess(res, { message: 'Work started.', data: jobCard });
});

export const addProductUsage = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.addProductUsage(req.params.id, req.body);
  sendSuccess(res, { message: 'Product usage added.', data: jobCard });
});

export const addPPFUsage = asyncHandler(async (req, res) => {
  const result = await jobCardService.addPPFUsage(req.params.id, req.body, req.user._id);
  sendSuccess(res, { message: 'PPF usage added.', data: result });
});

export const completeJobCard = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.completeJobCard(req.params.id, req.user._id);
  sendSuccess(res, { message: 'Job card completed.', data: jobCard });
});

export const markDelivered = asyncHandler(async (req, res) => {
  const jobCard = await jobCardService.markDelivered(req.params.id);
  sendSuccess(res, { message: 'Job card delivered.', data: jobCard });
});

export const generateInvoiceFromJobCard = asyncHandler(async (req, res) => {
  const invoice = await jobCardService.generateInvoiceFromJobCard(req.params.id, req.user._id);
  sendSuccess(res, { message: 'Invoice generated from job card.', data: invoice, statusCode: 201 });
});
