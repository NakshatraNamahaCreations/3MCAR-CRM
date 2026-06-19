import * as appointmentService from '../services/appointmentService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  return sendSuccess(res, {
    message: 'Appointment created successfully',
    data: appointment,
    statusCode: 201,
  });
});

export const getAllAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getAllAppointments({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Appointments fetched successfully',
    data: appointments,
  });
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(req.params.id);
  return sendSuccess(res, {
    message: 'Appointment fetched successfully',
    data: appointment,
  });
});

export const getAppointmentsByCustomerId = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getAppointmentsByCustomerId(req.params.customerId);
  return sendSuccess(res, {
    message: 'Appointments fetched successfully',
    data: appointments,
  });
});

export const getAppointmentsByVehicleId = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getAppointmentsByVehicleId(req.params.vehicleId);
  return sendSuccess(res, {
    message: 'Appointments fetched successfully',
    data: appointments,
  });
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Appointment updated successfully',
    data: appointment,
  });
});

export const changeStatus = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.changeStatus(req.params.id, req.body.status);
  return sendSuccess(res, {
    message: 'Appointment status updated successfully',
    data: appointment,
  });
});

export const deleteAppointment = asyncHandler(async (req, res) => {
  const result = await appointmentService.deleteAppointment(req.params.id);
  return sendSuccess(res, {
    message: 'Appointment deleted successfully',
    data: result,
  });
});

export const createJobCardFromAppointment = asyncHandler(async (req, res) => {
  const jobCard = await appointmentService.createJobCardFromAppointment(req.params.id, req.user._id);
  return sendSuccess(res, {
    message: 'Job card created from appointment successfully',
    data: jobCard,
    statusCode: 201,
  });
});
