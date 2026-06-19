import {
  createVehicle as createVehicleService,
  updateVehicle as updateVehicleService,
  deleteVehicle as deleteVehicleService,
  getAllVehicles as getAllVehiclesService,
  getVehiclesByCustomerId as getVehiclesByCustomerIdService,
  getVehicleById as getVehicleByIdService,
  searchVehiclesByNumber as searchVehiclesByNumberService,
} from '../services/vehicleService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const getAllVehicles = asyncHandler(async (req, res) => {
  const vehicles = await getAllVehiclesService({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, { message: 'Vehicles fetched successfully', data: vehicles });
});

export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await createVehicleService({ ...req.body, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Vehicle created successfully',
    data: vehicle,
    statusCode: 201,
  });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await updateVehicleService(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Vehicle updated successfully',
    data: vehicle,
  });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  await deleteVehicleService(req.params.id);
  return sendSuccess(res, { message: 'Vehicle deleted successfully' });
});

export const getVehiclesByCustomerId = asyncHandler(async (req, res) => {
  const vehicles = await getVehiclesByCustomerIdService(req.params.customerId, {
    ...req.query,
    branchId: req.activeBranchId,
  });
  return sendSuccess(res, {
    message: 'Vehicles fetched successfully',
    data: vehicles,
  });
});

export const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await getVehicleByIdService(req.params.id);
  return sendSuccess(res, {
    message: 'Vehicle fetched successfully',
    data: vehicle,
  });
});

export const searchVehiclesByNumber = asyncHandler(async (req, res) => {
  const vehicles = await searchVehiclesByNumberService(req.query.q);
  return sendSuccess(res, {
    message: 'Vehicles fetched successfully',
    data: vehicles,
  });
});
