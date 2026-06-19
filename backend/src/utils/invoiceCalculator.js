/**
 * Invoice / quote money math. Pure functions — no DB access.
 *
 * Line item shape: { quantity, unitPrice, taxPercentage }
 * Discount applies to subtotal before tax. GST may be split CGST/SGST (intra-state)
 * or charged as IGST (inter-state).
 */

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Compute a single line total (qty * unitPrice). Tax is handled at invoice level
 * per-line so we can support mixed tax rates.
 */
export const lineTotal = (item) => round((item.quantity || 0) * (item.unitPrice || 0));

/**
 * Calculate full invoice totals.
 * @param {object} params
 * @param {Array} params.lineItems   each { quantity, unitPrice, taxPercentage }
 * @param {'percentage'|'fixed'} params.discountType
 * @param {number} params.discountValue
 * @param {'GST'|'Non-GST'} params.invoiceType
 * @param {boolean} [params.interState=false] if true, use IGST instead of CGST+SGST
 * @returns computed totals
 */
export const calculateInvoice = ({
  lineItems = [],
  discountType = 'percentage',
  discountValue = 0,
  invoiceType = 'GST',
  interState = false,
}) => {
  const itemsWithTotals = lineItems.map((it) => ({
    ...it,
    total: lineTotal(it),
  }));

  const subtotal = round(itemsWithTotals.reduce((s, it) => s + it.total, 0));

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = round((subtotal * (discountValue || 0)) / 100);
  } else {
    discountAmount = round(discountValue || 0);
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const taxableAmount = round(subtotal - discountAmount);

  let gstAmount = 0;
  if (invoiceType === 'GST') {
    // Proportionally apply each line's tax % to its discounted share.
    const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
    gstAmount = round(
      itemsWithTotals.reduce((s, it) => {
        const taxableLine = it.total * discountRatio;
        return s + (taxableLine * (it.taxPercentage || 0)) / 100;
      }, 0)
    );
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (invoiceType === 'GST') {
    if (interState) {
      igstAmount = gstAmount;
    } else {
      cgstAmount = round(gstAmount / 2);
      sgstAmount = round(gstAmount - cgstAmount);
    }
  }

  const grandTotal = round(taxableAmount + gstAmount);

  return {
    lineItems: itemsWithTotals,
    subtotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    grandTotal,
  };
};

export { round };
export default calculateInvoice;
