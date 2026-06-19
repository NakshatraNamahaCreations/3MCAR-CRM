import Product from '../models/Product.js';
import { AppError } from '../utils/apiResponse.js';
import { applyStockMovement, getLowStockProducts } from '../utils/stockHelper.js';

/**
 * Create a product. If openingStock is provided and currentStock is not,
 * currentStock is seeded from openingStock.
 */
export const createProduct = async (data) => {
  const payload = { ...data };

  if (payload.openingStock != null && payload.currentStock == null) {
    payload.currentStock = Number(payload.openingStock) || 0;
  }

  const product = await Product.create(payload);
  return product;
};

export const updateProduct = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found.', 404);
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new AppError('Product not found.', 404);
  return product;
};

export const getAllProducts = async (query = {}) => {
  const { category, status, isPPF, search, branchId } = query;
  const filter = {};

  if (branchId) filter.branchId = branchId;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (isPPF != null && isPPF !== '') {
    filter.isPPF = isPPF === 'true' || isPPF === true;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ productName: regex }, { sku: regex }];
  }

  return Product.find(filter).sort({ createdAt: -1 });
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found.', 404);
  return product;
};

/** Increase stock (stock_in). */
export const addStock = async (id, { quantity, remarks }, createdBy) => {
  const { product, movement } = await applyStockMovement({
    productId: id,
    movementType: 'stock_in',
    quantity,
    referenceType: 'manual',
    remarks,
    createdBy,
  });
  return { product, movement };
};

/** Decrease stock (stock_out). */
export const reduceStock = async (id, { quantity, remarks }, createdBy) => {
  const { product, movement } = await applyStockMovement({
    productId: id,
    movementType: 'stock_out',
    quantity,
    referenceType: 'manual',
    remarks,
    createdBy,
  });
  return { product, movement };
};

/** Adjust stock by a signed delta (adjustment). */
export const adjustStock = async (id, { quantity, remarks }, createdBy) => {
  const { product, movement } = await applyStockMovement({
    productId: id,
    movementType: 'adjustment',
    quantity,
    referenceType: 'manual',
    remarks,
    createdBy,
  });
  return { product, movement };
};

export const getLowStock = async () => {
  return getLowStockProducts();
};
