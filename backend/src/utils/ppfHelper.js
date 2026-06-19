/**
 * PPF film usage helpers.
 * PPF films are Product documents with isPPF=true and unitType sqft/roll.
 * Consumed sqft = usedSqft + wastageSqft. Stock is deducted only on job completion.
 */
import { applyStockMovement } from './stockHelper.js';

/** totalConsumedSqft = usedSqft + wastageSqft */
export const totalConsumedSqft = ({ usedSqft = 0, wastageSqft = 0 }) =>
  Number(usedSqft) + Number(wastageSqft);

/**
 * Deduct PPF stock for a usage record (called on job card completion).
 * @returns {Promise<{product, movement}>}
 */
export const deductPPFStock = async ({ ppfUsage, createdBy = null }) => {
  const consumed = totalConsumedSqft(ppfUsage);
  return applyStockMovement({
    productId: ppfUsage.ppfProductId,
    movementType: 'usage',
    quantity: consumed,
    referenceType: 'ppf_usage',
    referenceId: ppfUsage._id,
    remarks: `PPF usage on job ${ppfUsage.jobCardId || ''} - ${ppfUsage.usageArea || ''}`,
    createdBy,
  });
};

export default deductPPFStock;
