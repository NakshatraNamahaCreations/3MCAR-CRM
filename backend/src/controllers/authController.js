import * as authService from '../services/authService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  sendSuccess(res, { message: 'Login successful', data });
});

export const logout = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Logged out successfully' });
});

export const getProfile = asyncHandler(async (req, res) => {
  const data = await authService.getProfile(req.user);
  sendSuccess(res, { message: 'Profile fetched successfully', data });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  sendSuccess(res, { message: 'Password changed successfully' });
});

export const createUser = asyncHandler(async (req, res) => {
  const data = await authService.createUser(req.body);
  sendSuccess(res, { message: 'User created successfully', data, statusCode: 201 });
});

export const getUsers = asyncHandler(async (req, res) => {
  const data = await authService.getUsers(req.query);
  sendSuccess(res, { message: 'Users fetched successfully', data });
});

export const getUserById = asyncHandler(async (req, res) => {
  const data = await authService.getUserById(req.params.id);
  sendSuccess(res, { message: 'User fetched successfully', data });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = await authService.updateUser(req.params.id, req.body);
  sendSuccess(res, { message: 'User updated successfully', data });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const data = await authService.deleteUser(req.params.id);
  sendSuccess(res, { message: 'User deleted successfully', data });
});

export const toggleStatus = asyncHandler(async (req, res) => {
  const data = await authService.toggleStatus(req.params.id);
  sendSuccess(res, { message: 'User status updated successfully', data });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.params.id, req.body.newPassword);
  sendSuccess(res, { message: 'Password reset successfully', data });
});
