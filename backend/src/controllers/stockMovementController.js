import * as stockMovementService from '../services/stockMovementService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const getAllStockMovements = asyncHandler(async (req, res) => {
  const movements = await stockMovementService.getAllStockMovements(req.query);
  return sendSuccess(res, {
    message: 'Stock movements fetched successfully',
    data: movements,
  });
});

export const getMovementsByProduct = asyncHandler(async (req, res) => {
  const movements = await stockMovementService.getMovementsByProduct(req.params.productId);
  return sendSuccess(res, {
    message: 'Product stock movements fetched successfully',
    data: movements,
  });
});
