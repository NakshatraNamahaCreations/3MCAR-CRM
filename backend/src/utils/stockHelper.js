/**
 * Stock movement helpers. Every change to Product.currentStock should go through
 * applyStockMovement so the StockMovement ledger stays consistent.
 */
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import { AppError } from './apiResponse.js';

/**
 * Apply a stock change and record a ledger entry atomically (best-effort, single doc).
 * @param {object} params
 * @param {string} params.productId
 * @param {'stock_in'|'stock_out'|'usage'|'adjustment'|'return'} params.movementType
 * @param {number} params.quantity  positive number; direction inferred from movementType
 * @param {'job_card'|'purchase'|'manual'|'ppf_usage'} [params.referenceType]
 * @param {string} [params.referenceId]
 * @param {string} [params.remarks]
 * @param {string} [params.createdBy]
 * @param {boolean} [params.allowNegative=false]
 * @returns {Promise<{product, movement}>}
 */
export const applyStockMovement = async ({
  productId,
  movementType,
  quantity,
  referenceType = 'manual',
  referenceId = null,
  remarks = '',
  createdBy = null,
  allowNegative = false,
}) => {
  const qty = Math.abs(Number(quantity) || 0);
  if (qty <= 0) throw new AppError('Stock quantity must be greater than zero.', 400);

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found.', 404);

  const previousStock = product.currentStock || 0;

  // stock_in and return increase; stock_out, usage decrease; adjustment can be signed via remarks
  const increases = ['stock_in', 'return'];
  const decreases = ['stock_out', 'usage'];

  let newStock;
  if (increases.includes(movementType)) {
    newStock = previousStock + qty;
  } else if (decreases.includes(movementType)) {
    newStock = previousStock - qty;
  } else {
    // adjustment: treat quantity as the delta (caller passes signed value via sign of quantity intent)
    newStock = previousStock + Number(quantity);
  }

  if (newStock < 0 && !allowNegative) {
    throw new AppError(
      `Insufficient stock for "${product.productName}". Available: ${previousStock}, requested: ${qty}.`,
      400
    );
  }

  product.currentStock = newStock;
  await product.save();

  const movement = await StockMovement.create({
    productId: product._id,
    movementType,
    quantity: qty,
    previousStock,
    newStock,
    referenceType,
    referenceId,
    remarks,
    createdBy,
  });

  return { product, movement };
};

/** Returns products at or below their minimum stock threshold. */
export const getLowStockProducts = async () => {
  return Product.find({
    status: 'active',
    $expr: { $lte: ['$currentStock', '$minimumStock'] },
  }).sort({ currentStock: 1 });
};

export default applyStockMovement;
