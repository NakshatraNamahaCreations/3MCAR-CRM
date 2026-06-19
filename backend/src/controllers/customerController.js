import {
  createCustomer as createCustomerService,
  updateCustomer as updateCustomerService,
  deleteCustomer as deleteCustomerService,
  getAllCustomers as getAllCustomersService,
  getCustomerById as getCustomerByIdService,
  getCustomerProfile as getCustomerProfileService,
} from '../services/customerService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await createCustomerService({ ...req.body, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Customer created successfully',
    data: customer,
    statusCode: 201,
  });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await updateCustomerService(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Customer updated successfully',
    data: customer,
  });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await deleteCustomerService(req.params.id);
  return sendSuccess(res, { message: 'Customer deleted successfully' });
});

export const getAllCustomers = asyncHandler(async (req, res) => {
  const customers = await getAllCustomersService({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Customers fetched successfully',
    data: customers,
  });
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await getCustomerByIdService(req.params.id);
  return sendSuccess(res, {
    message: 'Customer fetched successfully',
    data: customer,
  });
});

export const getCustomerProfile = asyncHandler(async (req, res) => {
  const profile = await getCustomerProfileService(req.params.id);
  return sendSuccess(res, {
    message: 'Customer profile fetched successfully',
    data: profile,
  });
});
