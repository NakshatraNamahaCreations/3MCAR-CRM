import TermsTemplate from '../models/TermsTemplate.js';
import { AppError } from '../utils/apiResponse.js';

export const createTerms = async (payload) => TermsTemplate.create(payload);

export const getAllTerms = async (query = {}) => {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.appliesTo) filter.appliesTo = { $in: [query.appliesTo, 'both'] };
  if (query.status) filter.status = query.status;
  if (query.search) filter.title = { $regex: query.search, $options: 'i' };
  return TermsTemplate.find(filter).sort({ isDefault: -1, title: 1 });
};

export const getTermsById = async (id) => {
  const t = await TermsTemplate.findById(id);
  if (!t) throw new AppError('Terms template not found', 404);
  return t;
};

export const updateTerms = async (id, data) => {
  const t = await TermsTemplate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!t) throw new AppError('Terms template not found', 404);
  return t;
};

export const deleteTerms = async (id) => {
  const t = await TermsTemplate.findByIdAndDelete(id);
  if (!t) throw new AppError('Terms template not found', 404);
  return { _id: id };
};

export default { createTerms, getAllTerms, getTermsById, updateTerms, deleteTerms };
