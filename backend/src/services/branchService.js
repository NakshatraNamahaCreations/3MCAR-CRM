import Branch from '../models/Branch.js';
import User from '../models/User.js';
import { AppError } from '../utils/apiResponse.js';

export const createBranch = async (data) => Branch.create(data);

export const getAllBranches = async (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };
  return Branch.find(filter).sort({ isHeadOffice: -1, name: 1 });
};

export const getBranchById = async (id) => {
  const branch = await Branch.findById(id);
  if (!branch) throw new AppError('Branch not found', 404);
  return branch;
};

export const updateBranch = async (id, data) => {
  const branch = await Branch.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!branch) throw new AppError('Branch not found', 404);
  return branch;
};

export const deleteBranch = async (id) => {
  const branch = await Branch.findByIdAndDelete(id);
  if (!branch) throw new AppError('Branch not found', 404);
  return { _id: id };
};

/** Branches the given user may work in (admins get all active branches). */
export const getMyBranches = async (user) => {
  if (user.role === 'admin') return Branch.find({ status: 'active' }).sort({ name: 1 });
  return Branch.find({ _id: { $in: user.branches || [] } }).sort({ name: 1 });
};

/** Set the user's active branch (must be assigned, unless admin). */
export const switchBranch = async (user, branchId) => {
  const branch = await Branch.findById(branchId);
  if (!branch) throw new AppError('Branch not found', 404);
  const assigned = (user.branches || []).map((b) => String(b));
  if (user.role !== 'admin' && !assigned.includes(String(branchId))) {
    throw new AppError('You are not assigned to this branch', 403);
  }
  await User.findByIdAndUpdate(user._id, { activeBranchId: branchId });
  return branch;
};

export default { createBranch, getAllBranches, getBranchById, updateBranch, deleteBranch, getMyBranches, switchBranch };
