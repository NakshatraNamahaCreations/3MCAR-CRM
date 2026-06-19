import Service from '../models/Service.js';
import { AppError } from '../utils/apiResponse.js';

export const createService = async (payload) => {
  const {
    serviceName,
    category,
    description,
    basePrice,
    gstPercentage,
    estimatedDuration,
    status,
    branchId,
  } = payload;

  if (!serviceName || !serviceName.trim()) {
    throw new AppError('serviceName is required', 400);
  }

  const service = await Service.create({
    serviceName: serviceName.trim(),
    category,
    description,
    basePrice,
    gstPercentage,
    estimatedDuration,
    status,
    branchId,
  });

  return service;
};

export const updateService = async (id, payload) => {
  const allowed = [
    'serviceName',
    'category',
    'description',
    'basePrice',
    'gstPercentage',
    'estimatedDuration',
    'status',
  ];

  const update = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }

  const service = await Service.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!service) throw new AppError('Service not found', 404);

  return service;
};

export const deleteService = async (id) => {
  const service = await Service.findByIdAndDelete(id);
  if (!service) throw new AppError('Service not found', 404);
  return service;
};

export const getAllServices = async (query = {}) => {
  const { category, status, search } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) filter.serviceName = { $regex: search, $options: 'i' };

  const services = await Service.find(filter).sort({ createdAt: -1 });
  return services;
};

export const getServiceById = async (id) => {
  const service = await Service.findById(id);
  if (!service) throw new AppError('Service not found', 404);
  return service;
};

export const toggleServiceStatus = async (id) => {
  const service = await Service.findById(id);
  if (!service) throw new AppError('Service not found', 404);

  service.status = service.status === 'active' ? 'inactive' : 'active';
  await service.save();

  return service;
};
