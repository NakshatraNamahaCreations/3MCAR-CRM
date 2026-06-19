import QuoteFollowup from '../models/QuoteFollowup.js';
import { AppError } from '../utils/apiResponse.js';

export const createQuoteFollowup = async (data, userId) => {
  if (!data.quoteId) {
    throw new AppError('quoteId is required', 400);
  }
  if (!data.followupDate) {
    throw new AppError('followupDate is required', 400);
  }

  const followup = await QuoteFollowup.create({
    branchId: data.branchId,
    quoteId: data.quoteId,
    enquiryId: data.enquiryId,
    followupDate: data.followupDate,
    followupTime: data.followupTime,
    status: data.status || 'pending',
    remarks: data.remarks,
    assignedTo: data.assignedTo,
    createdBy: userId,
  });

  return followup;
};

export const updateQuoteFollowup = async (id, data) => {
  const allowed = [
    'followupDate',
    'followupTime',
    'status',
    'remarks',
    'assignedTo',
    'enquiryId',
  ];

  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) update[key] = data[key];
  }

  const followup = await QuoteFollowup.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!followup) {
    throw new AppError('Quote followup not found', 404);
  }

  return followup;
};

export const deleteQuoteFollowup = async (id) => {
  const followup = await QuoteFollowup.findByIdAndDelete(id);
  if (!followup) {
    throw new AppError('Quote followup not found', 404);
  }
  return followup;
};

const POPULATE = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'createdBy', select: 'name email role' },
  { path: 'quoteId', select: 'quoteNumber customerName phone status totalAmount' },
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

/** List quote followups (branch-scoped) with optional status / quote / date range. */
export const getAllQuoteFollowups = async (query = {}) => {
  const { branchId, quoteId, status, from, to } = query;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (quoteId) filter.quoteId = quoteId;
  if (status) filter.status = status;
  if (from || to) {
    filter.followupDate = {};
    if (from) filter.followupDate.$gte = startOfDay(from);
    if (to) filter.followupDate.$lte = endOfDay(to);
  }
  return QuoteFollowup.find(filter).populate(POPULATE).sort({ followupDate: -1, createdAt: -1 });
};

export const getFollowupsByQuoteId = async (quoteId) => {
  return QuoteFollowup.find({ quoteId })
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('enquiryId', 'name phone vehicleNumber status')
    .sort({ followupDate: -1, createdAt: -1 });
};

export const getPendingFollowups = async (filters = {}) => {
  const query = { status: 'pending' };

  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.quoteId) query.quoteId = filters.quoteId;

  if (filters.search) {
    query.remarks = { $regex: filters.search, $options: 'i' };
  }

  return QuoteFollowup.find(query)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('enquiryId', 'name phone vehicleNumber status')
    .populate('quoteId', 'quoteNumber customerName phone status')
    .sort({ followupDate: 1 });
};

export const getTodayFollowups = async (filters = {}) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const query = { followupDate: { $gte: start, $lte: end } };

  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.status) query.status = filters.status;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;

  if (filters.search) {
    query.remarks = { $regex: filters.search, $options: 'i' };
  }

  return QuoteFollowup.find(query)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('enquiryId', 'name phone vehicleNumber status')
    .populate('quoteId', 'quoteNumber customerName phone status')
    .sort({ followupTime: 1, followupDate: 1 });
};
