import * as productService from '../services/productService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct({ ...req.body, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Product created successfully',
    data: product,
    statusCode: 201,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Product updated successfully',
    data: product,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  return sendSuccess(res, { message: 'Product deleted successfully' });
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts({ ...req.query, branchId: req.activeBranchId });
  return sendSuccess(res, {
    message: 'Products fetched successfully',
    data: products,
  });
});

export const getLowStock = asyncHandler(async (req, res) => {
  const products = await productService.getLowStock();
  return sendSuccess(res, {
    message: 'Low stock products fetched successfully',
    data: products,
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return sendSuccess(res, {
    message: 'Product fetched successfully',
    data: product,
  });
});

export const addStock = asyncHandler(async (req, res) => {
  const result = await productService.addStock(req.params.id, req.body, req.user._id);
  return sendSuccess(res, {
    message: 'Stock added successfully',
    data: result,
  });
});

export const reduceStock = asyncHandler(async (req, res) => {
  const result = await productService.reduceStock(req.params.id, req.body, req.user._id);
  return sendSuccess(res, {
    message: 'Stock reduced successfully',
    data: result,
  });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const result = await productService.adjustStock(req.params.id, req.body, req.user._id);
  return sendSuccess(res, {
    message: 'Stock adjusted successfully',
    data: result,
  });
});
