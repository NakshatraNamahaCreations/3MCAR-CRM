import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/apiResponse.js';

export const getAllStockMovements = async (query = {}) => {
  const { productId, movementType, startDate, endDate } = query;
  const filter = {};

  if (productId) filter.productId = productId;
  if (movementType) filter.movementType = movementType;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  return StockMovement.find(filter)
    .populate('productId', 'productName sku unitType')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};

export const getMovementsByProduct = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found.', 404);

  return StockMovement.find({ productId })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
};
