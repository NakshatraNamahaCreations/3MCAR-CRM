import Enquiry from '../models/Enquiry.js';
import { AppError } from '../utils/apiResponse.js';

const POPULATE = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'createdBy', select: 'name email role' },
  { path: 'customerId', select: 'name phone' },
];

/**
 * Create a new enquiry.
 */
export const createEnquiry = async (payload, userId) => {
  const data = { ...payload, createdBy: userId };
  const enquiry = await Enquiry.create(data);
  return Enquiry.findById(enquiry._id).populate(POPULATE);
};

/**
 * List enquiries with optional filters and search.
 * Filters: status, source, assignedTo
 * Search (regex): name, phone, vehicleNumber
 */
export const getAllEnquiries = async (query = {}) => {
  const { status, source, assignedTo, search } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { phone: regex }, { vehicleNumber: regex }];
  }

  return Enquiry.find(filter).populate(POPULATE).sort({ createdAt: -1 });
};

/**
 * Get a single enquiry by id.
 */
export const getEnquiryById = async (id) => {
  const enquiry = await Enquiry.findById(id).populate(POPULATE);
  if (!enquiry) throw new AppError('Enquiry not found', 404);
  return enquiry;
};

/**
 * Update an enquiry.
 */
export const updateEnquiry = async (id, payload) => {
  const update = { ...payload };
  delete update.createdBy;

  // When marking converted, stamp convertedAt if not already set.
  if (update.status === 'converted') {
    update.convertedAt = update.convertedAt || new Date();
  }

  const enquiry = await Enquiry.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate(POPULATE);

  if (!enquiry) throw new AppError('Enquiry not found', 404);
  return enquiry;
};

/**
 * Delete an enquiry.
 */
export const deleteEnquiry = async (id) => {
  const enquiry = await Enquiry.findByIdAndDelete(id);
  if (!enquiry) throw new AppError('Enquiry not found', 404);
  return { _id: id };
};
