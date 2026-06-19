import EnquiryFollowup from '../models/EnquiryFollowup.js';
import Enquiry from '../models/Enquiry.js';
import { AppError } from '../utils/apiResponse.js';

const ENQUIRY_POPULATE = {
  path: 'enquiryId',
  select: 'name phone vehicleNumber vehicleBrand vehicleModel status source',
};

const startOfDay = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (d) => {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const createFollowup = async (payload) => {
  const { enquiryId, followupDate } = payload;

  if (!enquiryId) throw new AppError('enquiryId is required', 400);
  if (!followupDate) throw new AppError('followupDate is required', 400);

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) throw new AppError('Enquiry not found', 404);

  const followup = await EnquiryFollowup.create({
    branchId: payload.branchId,
    enquiryId,
    followupDate,
    followupTime: payload.followupTime,
    status: payload.status,
    remarks: payload.remarks,
    assignedTo: payload.assignedTo,
    createdBy: payload.createdBy,
  });

  return EnquiryFollowup.findById(followup._id)
    .populate(ENQUIRY_POPULATE)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');
};

export const updateFollowup = async (id, payload) => {
  const allowed = ['followupDate', 'followupTime', 'status', 'remarks', 'assignedTo'];
  const update = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }

  const followup = await EnquiryFollowup.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  })
    .populate(ENQUIRY_POPULATE)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');

  if (!followup) throw new AppError('Followup not found', 404);
  return followup;
};

export const deleteFollowup = async (id) => {
  const followup = await EnquiryFollowup.findByIdAndDelete(id);
  if (!followup) throw new AppError('Followup not found', 404);
  return { _id: id };
};

export const getFollowupsByEnquiryId = async (enquiryId) => {
  return EnquiryFollowup.find({ enquiryId })
    .sort({ followupDate: -1, createdAt: -1 })
    .populate(ENQUIRY_POPULATE)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');
};

export const getTodayFollowups = async (filters = {}) => {
  const now = new Date();
  const query = {
    followupDate: { $gte: startOfDay(now), $lte: endOfDay(now) },
  };
  if (filters.status) query.status = filters.status;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.branchId) query.branchId = filters.branchId;

  return EnquiryFollowup.find(query)
    .sort({ followupDate: 1, followupTime: 1 })
    .populate(ENQUIRY_POPULATE)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');
};

export const getOverdueFollowups = async (filters = {}) => {
  const now = new Date();
  const query = {
    followupDate: { $lt: startOfDay(now) },
    status: { $in: ['pending', 'call_later'] },
  };
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.branchId) query.branchId = filters.branchId;

  return EnquiryFollowup.find(query)
    .sort({ followupDate: 1 })
    .populate(ENQUIRY_POPULATE)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');
};

export const getCalendarFollowups = async ({ from, to, ...filters }) => {
  if (!from || !to) throw new AppError('from and to date range are required', 400);

  const query = {
    followupDate: { $gte: startOfDay(from), $lte: endOfDay(to) },
  };
  if (filters.status) query.status = filters.status;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  if (filters.branchId) query.branchId = filters.branchId;

  return EnquiryFollowup.find(query)
    .sort({ followupDate: 1, followupTime: 1 })
    .populate(ENQUIRY_POPULATE)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role');
};
