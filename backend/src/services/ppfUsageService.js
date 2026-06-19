import PPFUsage from '../models/PPFUsage.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/apiResponse.js';
import { deductPPFStock, totalConsumedSqft } from '../utils/ppfHelper.js';

const ALLOWED_FIELDS = [
  'branchId',
  'jobCardId',
  'customerId',
  'vehicleId',
  'vehicleNumber',
  'carBrand',
  'carModel',
  'vehicleType',
  'ppfProductId',
  'ppfRollName',
  'rollNumber',
  'totalRollSqft',
  'usedSqft',
  'wastageSqft',
  'usageArea',
  'usageDate',
  'technicianId',
  'remarks',
];

const POPULATE = [
  { path: 'jobCardId' },
  { path: 'customerId' },
  { path: 'vehicleId' },
  { path: 'ppfProductId', select: 'productName sku brand unitType currentStock isPPF' },
  { path: 'technicianId' },
];

export const getAll = async (query = {}) => {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.jobCardId) filter.jobCardId = query.jobCardId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.vehicleId) filter.vehicleId = query.vehicleId;
  if (query.ppfProductId) filter.ppfProductId = query.ppfProductId;

  return PPFUsage.find(filter)
    .populate('ppfProductId', 'productName')
    .populate('customerId', 'name phone')
    .populate('vehicleId', 'vehicleNumber')
    .sort({ createdAt: -1 });
};

export const createPPFUsage = async (payload, userId) => {
  if (!payload.ppfProductId) throw new AppError('ppfProductId is required', 400);
  if (payload.usedSqft === undefined || payload.usedSqft === null) {
    throw new AppError('usedSqft is required', 400);
  }

  const data = {};
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }
  data.usageDate = data.usageDate || new Date();
  data.createdBy = userId;
  data.deducted = false;

  const ppfUsage = await PPFUsage.create(data);

  // Deduct the consumed sqft (used + wastage) from the PPF product's stock now.
  const consumed = totalConsumedSqft(ppfUsage);
  if (consumed > 0) {
    try {
      await deductPPFStock({ ppfUsage, createdBy: userId });
      ppfUsage.deducted = true;
      await ppfUsage.save();
    } catch (err) {
      // Roll back the usage record if stock is insufficient, so we don't leave
      // an un-deducted ghost entry.
      await PPFUsage.findByIdAndDelete(ppfUsage._id);
      throw new AppError(err.message || 'Insufficient PPF stock', 400);
    }
  }

  return ppfUsage.populate(POPULATE);
};

export const updatePPFUsage = async (id, payload) => {
  const existing = await PPFUsage.findById(id);
  if (!existing) throw new AppError('PPF usage record not found', 404);

  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) existing[key] = payload[key];
  }
  // pre-save recomputes remainingSqft
  await existing.save();
  return existing.populate(POPULATE);
};

export const deletePPFUsage = async (id) => {
  const ppfUsage = await PPFUsage.findByIdAndDelete(id);
  if (!ppfUsage) throw new AppError('PPF usage record not found', 404);
  return ppfUsage;
};

export const getByJobCardId = async (jobCardId) => {
  return PPFUsage.find({ jobCardId }).populate(POPULATE).sort({ createdAt: -1 });
};

export const getByVehicleId = async (vehicleId) => {
  return PPFUsage.find({ vehicleId }).populate(POPULATE).sort({ createdAt: -1 });
};

export const getByCustomerId = async (customerId) => {
  return PPFUsage.find({ customerId }).populate(POPULATE).sort({ createdAt: -1 });
};

export const getByProductId = async (ppfProductId) => {
  return PPFUsage.find({ ppfProductId }).populate(POPULATE).sort({ createdAt: -1 });
};

/**
 * Aggregate sum of (usedSqft + wastageSqft) grouped by ppfProductId,
 * populated with product name.
 */
export const getTotalUsedReport = async () => {
  const rows = await PPFUsage.aggregate([
    {
      $group: {
        _id: '$ppfProductId',
        totalUsedSqft: { $sum: '$usedSqft' },
        totalWastageSqft: { $sum: '$wastageSqft' },
        totalConsumedSqft: { $sum: { $add: ['$usedSqft', '$wastageSqft'] } },
        recordsCount: { $sum: 1 },
      },
    },
    { $sort: { totalConsumedSqft: -1 } },
  ]);

  return PPFUsage.populate(rows, {
    path: '_id',
    model: Product,
    select: 'productName sku brand unitType currentStock isPPF',
  }).then((populated) =>
    populated.map((r) => ({
      ppfProductId: r._id?._id || r._id,
      product: r._id || null,
      totalUsedSqft: r.totalUsedSqft,
      totalWastageSqft: r.totalWastageSqft,
      totalConsumedSqft: r.totalConsumedSqft,
      recordsCount: r.recordsCount,
    }))
  );
};

/**
 * For all PPF products (isPPF=true) return currentStock as remaining sqft.
 */
export const getRemainingStockReport = async () => {
  const products = await Product.find({ isPPF: true }).sort({ productName: 1 });
  return products.map((p) => ({
    ppfProductId: p._id,
    productName: p.productName,
    sku: p.sku,
    brand: p.brand,
    unitType: p.unitType,
    remainingSqft: p.currentStock,
    minimumStock: p.minimumStock,
    status: p.status,
  }));
};

/**
 * On job card completion: for each non-deducted PPFUsage of that job,
 * deduct PPF stock then mark deducted.
 */
export const deductOnCompletion = async (jobCardId, userId) => {
  const usages = await PPFUsage.find({ jobCardId, deducted: false });

  const results = [];
  for (const usage of usages) {
    const { product, movement } = await deductPPFStock({
      ppfUsage: usage,
      createdBy: userId,
    });

    usage.deducted = true;
    await usage.save();

    results.push({
      ppfUsageId: usage._id,
      consumedSqft: totalConsumedSqft(usage),
      product,
      movement,
    });
  }

  return {
    jobCardId,
    deductedCount: results.length,
    results,
  };
};
