/**
 * Petty cash helpers. Every petty cash entry maintains opening/closing balance,
 * derived from the most recent transaction's closing balance.
 *
 * Rules:
 * - cash_in  increases balance
 * - cash_out decreases balance (and must not exceed available balance)
 */
import PettyCash from '../models/PettyCash.js';
import { AppError } from './apiResponse.js';

/** Current petty cash balance = closingBalance of the latest transaction. */
export const getCurrentBalance = async () => {
  const last = await PettyCash.findOne().sort({ transactionDate: -1, createdAt: -1 });
  return last ? last.closingBalance || 0 : 0;
};

/**
 * Create a petty cash transaction with correct opening/closing balances.
 * Use this everywhere instead of PettyCash.create() directly so the running
 * balance stays consistent.
 *
 * @param {object} data PettyCash fields (transactionType, amount, etc.)
 * @returns {Promise<PettyCash>}
 */
export const createPettyCashEntry = async (data) => {
  const amount = Math.abs(Number(data.amount) || 0);
  if (amount <= 0) throw new AppError('Petty cash amount must be greater than zero.', 400);

  const openingBalance = await getCurrentBalance();

  let closingBalance;
  if (data.transactionType === 'cash_in') {
    closingBalance = openingBalance + amount;
  } else if (data.transactionType === 'cash_out') {
    if (amount > openingBalance) {
      throw new AppError(
        `Insufficient petty cash balance. Available: ${openingBalance}, requested: ${amount}.`,
        400
      );
    }
    closingBalance = openingBalance - amount;
  } else {
    throw new AppError('Invalid petty cash transactionType.', 400);
  }

  return PettyCash.create({
    ...data,
    amount,
    openingBalance,
    closingBalance,
    transactionDate: data.transactionDate || new Date(),
  });
};

/**
 * Convenience: auto-create a linked cash_out entry for expenses / salary / advances
 * paid by cash. Returns the created PettyCash doc.
 */
export const createLinkedCashOut = async ({
  amount,
  category,
  paymentPurpose,
  paidTo,
  referenceType,
  referenceId,
  handledBy = null,
  approvedBy = null,
  createdBy = null,
  remarks = '',
}) => {
  return createPettyCashEntry({
    transactionType: 'cash_out',
    category,
    amount,
    paymentPurpose,
    paidTo,
    referenceType,
    referenceId,
    handledBy,
    approvedBy,
    createdBy,
    remarks,
    approvalStatus: 'approved',
  });
};

export default createPettyCashEntry;
