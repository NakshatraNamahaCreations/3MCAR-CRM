import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
import { AppError } from '../utils/apiResponse.js';

const ALLOWED_FIELDS = [
  'branchId',
  'customerId',
  'vehicleNumber',
  'brand',
  'model',
  'variant',
  'year',
  'vehicleType',
  'fuelType',
  'color',
  'chassisNumber',
  'engineNumber',
  'notes',
];

export const createVehicle = async (payload) => {
  const { customerId, vehicleNumber } = payload;

  if (!customerId || !vehicleNumber) {
    throw new AppError('customerId and vehicleNumber are required', 400);
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const data = {};
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }

  const vehicle = await Vehicle.create(data);
  return vehicle;
};

export const updateVehicle = async (id, payload) => {
  const update = {};
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }

  const vehicle = await Vehicle.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  return vehicle;
};

export const deleteVehicle = async (id) => {
  const vehicle = await Vehicle.findByIdAndDelete(id);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }
  return vehicle;
};

export const getAllVehicles = async (query = {}) => {
  const { branchId, customerId, search } = query;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (customerId) filter.customerId = customerId;
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ vehicleNumber: regex }, { brand: regex }, { model: regex }];
  }
  return Vehicle.find(filter).populate('customerId', 'name phone').sort({ createdAt: -1 });
};

export const getVehiclesByCustomerId = async (customerId, query = {}) => {
  const filter = { customerId };
  if (query.branchId) filter.branchId = query.branchId;
  const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
  return vehicles;
};

export const getVehicleById = async (id) => {
  const vehicle = await Vehicle.findById(id).populate('customerId');
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }
  return vehicle;
};

export const searchVehiclesByNumber = async (q) => {
  if (!q) return [];
  const regex = new RegExp(q, 'i');
  const vehicles = await Vehicle.find({ vehicleNumber: regex })
    .populate('customerId')
    .sort({ createdAt: -1 });
  return vehicles;
};
