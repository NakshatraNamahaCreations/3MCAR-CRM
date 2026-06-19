import Appointment from '../models/Appointment.js';
import { AppError } from '../utils/apiResponse.js';
import generateNumber from '../utils/generateNumber.js';
import { createFromAppointment } from './jobCardService.js';

const POPULATE = [
  { path: 'customerId', select: 'name phone email' },
  { path: 'vehicleId', select: 'make model vehicleNumber' },
  { path: 'quoteId', select: 'quoteNumber totalAmount status' },
  { path: 'createdBy', select: 'name email role' },
];

const VALID_STATUSES = ['draft', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

/**
 * Create a new appointment.
 */
export const createAppointment = async (payload, userId) => {
  const data = { ...payload, createdBy: userId };
  data.appointmentNumber = await generateNumber('APT');

  const appointment = await Appointment.create(data);
  return Appointment.findById(appointment._id).populate(POPULATE);
};

/**
 * List appointments with optional filters.
 * Filters: status, date (matches appointmentDate within that day)
 */
export const getAllAppointments = async (query = {}) => {
  const { status, date, branchId } = query;
  const filter = {};

  if (branchId) filter.branchId = branchId;

  if (status) filter.status = status;

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.appointmentDate = { $gte: start, $lt: end };
  }

  return Appointment.find(filter).populate(POPULATE).sort({ appointmentDate: -1, createdAt: -1 });
};

/**
 * Get a single appointment by id.
 */
export const getAppointmentById = async (id) => {
  const appointment = await Appointment.findById(id).populate(POPULATE);
  if (!appointment) throw new AppError('Appointment not found', 404);
  return appointment;
};

/**
 * Get appointments for a customer.
 */
export const getAppointmentsByCustomerId = async (customerId) => {
  return Appointment.find({ customerId }).populate(POPULATE).sort({ appointmentDate: -1, createdAt: -1 });
};

/**
 * Get appointments for a vehicle.
 */
export const getAppointmentsByVehicleId = async (vehicleId) => {
  return Appointment.find({ vehicleId }).populate(POPULATE).sort({ appointmentDate: -1, createdAt: -1 });
};

/**
 * Update an appointment.
 */
export const updateAppointment = async (id, payload) => {
  const update = { ...payload };
  delete update.createdBy;
  delete update.appointmentNumber;

  const appointment = await Appointment.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate(POPULATE);

  if (!appointment) throw new AppError('Appointment not found', 404);
  return appointment;
};

/**
 * Change appointment status.
 */
export const changeStatus = async (id, status) => {
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const appointment = await Appointment.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate(POPULATE);

  if (!appointment) throw new AppError('Appointment not found', 404);
  return appointment;
};

/**
 * Delete an appointment.
 */
export const deleteAppointment = async (id) => {
  const appointment = await Appointment.findByIdAndDelete(id);
  if (!appointment) throw new AppError('Appointment not found', 404);
  return { _id: id };
};

/**
 * Create a job card from an existing appointment.
 */
export const createJobCardFromAppointment = async (appointmentId, userId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new AppError('Appointment not found', 404);

  return createFromAppointment(appointmentId, userId);
};
