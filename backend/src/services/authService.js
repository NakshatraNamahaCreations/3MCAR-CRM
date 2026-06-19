import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../utils/apiResponse.js';

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  return user;
};

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.status !== 'active') {
    throw new AppError('Your account is inactive. Please contact an administrator.', 403);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user._id);

  return { token, user: sanitizeUser(user) };
};

export const getProfile = async (user) => {
  return sanitizeUser(user);
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!(await user.matchPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();

  return sanitizeUser(user);
};

export const createUser = async (data) => {
  const { name, email, phone, password, role, permissions, status, branches, activeBranchId } = data;

  if (!name || !email || !password) {
    throw new AppError('Name, email and password are required', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError('A user with this email already exists', 400);
  }

  const branchList = Array.isArray(branches) ? branches : [];
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
    permissions,
    status,
    branches: branchList,
    activeBranchId: activeBranchId || branchList[0] || null,
  });

  return sanitizeUser(user);
};

export const getUsers = async (query = {}) => {
  const { role, status, search } = query;
  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  return User.find(filter).sort({ createdAt: -1 });
};

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

export const updateUser = async (id, data) => {
  const allowed = ['name', 'email', 'phone', 'role', 'permissions', 'status', 'branches', 'activeBranchId'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  if (updates.email) {
    const existing = await User.findOne({
      email: updates.email.toLowerCase().trim(),
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError('A user with this email already exists', 400);
    }
  }

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  Object.assign(user, updates);

  if (data.password) {
    user.password = data.password;
  }

  await user.save();

  return sanitizeUser(user);
};

export const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return sanitizeUser(user);
};

export const toggleStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();

  return sanitizeUser(user);
};

/**
 * Admin reset of another user's password (no current-password check).
 */
export const resetPassword = async (id, newPassword) => {
  if (!newPassword || String(newPassword).length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }
  const user = await User.findById(id).select('+password');
  if (!user) throw new AppError('User not found', 404);

  user.password = newPassword; // pre-save hook hashes it
  await user.save();

  return sanitizeUser(user);
};
