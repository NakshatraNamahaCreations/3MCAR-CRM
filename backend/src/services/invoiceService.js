import Invoice from '../models/Invoice.js';
import JobCard from '../models/JobCard.js';
import { AppError } from '../utils/apiResponse.js';
import generateNumber from '../utils/generateNumber.js';
import { calculateInvoice } from '../utils/invoiceCalculator.js';

/**
 * Build invoice line items from a JobCard document.
 */
const buildLineItemsFromJobCard = (jobCard) => {
  const lineItems = [];

  (jobCard.selectedServices || []).forEach((s) => {
    lineItems.push({
      itemType: 'service',
      name: s.serviceName,
      quantity: 1,
      unitPrice: s.price || 0,
      taxPercentage: s.gstPercentage || 18,
    });
  });

  (jobCard.productUsage || []).forEach((p) => {
    lineItems.push({
      itemType: 'product',
      name: p.productName,
      quantity: p.quantity || 1,
      unitPrice: p.unitPrice || 0,
      taxPercentage: 18,
    });
  });

  (jobCard.ppfUsage || []).forEach((pp) => {
    const area = pp.usedSqft != null ? `${pp.usedSqft} sqft` : '';
    lineItems.push({
      itemType: 'ppf',
      name: `PPF ${area}`.trim(),
      quantity: 1,
      unitPrice: pp.total || 0,
      taxPercentage: 18,
    });
  });

  if (jobCard.labourCharges && jobCard.labourCharges > 0) {
    lineItems.push({
      itemType: 'labour',
      name: 'Labour',
      quantity: 1,
      unitPrice: jobCard.labourCharges,
      taxPercentage: 18,
    });
  }

  (jobCard.additionalCharges || []).forEach((a) => {
    lineItems.push({
      itemType: 'additional',
      name: a.label,
      quantity: 1,
      unitPrice: a.amount || 0,
      taxPercentage: 0,
    });
  });

  return lineItems;
};

/**
 * Create an invoice from a JobCard. Exported so the jobcard module can call it.
 */
export const createFromJobCard = async (jobCardId, userId) => {
  const jobCard = await JobCard.findById(jobCardId);
  if (!jobCard) throw new AppError('Job card not found', 404);

  const rawLineItems = buildLineItemsFromJobCard(jobCard);

  const invoiceType = 'GST';
  const discountType = 'percentage';
  const discountValue = 0;

  const computed = calculateInvoice({
    lineItems: rawLineItems,
    discountType,
    discountValue,
    invoiceType,
  });

  const invoiceNumber = await generateNumber('INV');

  const invoice = await Invoice.create({
    invoiceNumber,
    branchId: jobCard.branchId,
    jobCardId: jobCard._id,
    customerId: jobCard.customerId,
    vehicleId: jobCard.vehicleId,
    invoiceDate: new Date(),
    invoiceType,
    lineItems: computed.lineItems,
    subtotal: computed.subtotal,
    discountType,
    discountValue,
    taxableAmount: computed.taxableAmount,
    gstAmount: computed.gstAmount,
    cgstAmount: computed.cgstAmount,
    sgstAmount: computed.sgstAmount,
    igstAmount: computed.igstAmount,
    grandTotal: computed.grandTotal,
    paidAmount: 0,
    balanceAmount: computed.grandTotal,
    paymentStatus: 'unpaid',
    invoiceStatus: 'generated',
    createdBy: userId,
  });

  return invoice;
};

/**
 * List invoices with optional filters and search.
 */
export const getAll = async (query = {}) => {
  const { customerId, paymentStatus, invoiceStatus, invoiceType, search, branchId } = query;
  const filter = {};

  if (branchId) filter.branchId = branchId;
  if (customerId) filter.customerId = customerId;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (invoiceStatus) filter.invoiceStatus = invoiceStatus;
  if (invoiceType) filter.invoiceType = invoiceType;
  if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };

  return Invoice.find(filter)
    .populate('customerId')
    .populate('vehicleId')
    .populate('jobCardId')
    .sort({ createdAt: -1 });
};

export const getById = async (id) => {
  const invoice = await Invoice.findById(id)
    .populate('customerId')
    .populate('vehicleId')
    .populate('jobCardId')
    .populate('createdBy', '-password');
  if (!invoice) throw new AppError('Invoice not found', 404);
  return invoice;
};

export const getByCustomerId = async (customerId) => {
  return Invoice.find({ customerId })
    .populate('vehicleId')
    .populate('jobCardId')
    .sort({ createdAt: -1 });
};

export const getByJobCardId = async (jobCardId) => {
  return Invoice.find({ jobCardId })
    .populate('customerId')
    .populate('vehicleId')
    .sort({ createdAt: -1 });
};

/**
 * Recompute payment status from paid vs grand total.
 */
const derivePaymentStatus = (paidAmount, grandTotal) => {
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= grandTotal) return 'paid';
  return 'partial';
};

export const update = async (id, data) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.invoiceStatus === 'cancelled') {
    throw new AppError('Cannot update a cancelled invoice', 400);
  }

  const editableLineItems = data.lineItems != null;
  const editableDiscount =
    data.discountType != null || data.discountValue != null;
  const editableType = data.invoiceType != null;

  if (editableLineItems || editableDiscount || editableType) {
    const lineItems = data.lineItems != null ? data.lineItems : invoice.lineItems;
    const discountType =
      data.discountType != null ? data.discountType : invoice.discountType;
    const discountValue =
      data.discountValue != null ? data.discountValue : invoice.discountValue;
    const invoiceType =
      data.invoiceType != null ? data.invoiceType : invoice.invoiceType;

    const computed = calculateInvoice({
      lineItems,
      discountType,
      discountValue,
      invoiceType,
    });

    invoice.lineItems = computed.lineItems;
    invoice.subtotal = computed.subtotal;
    invoice.discountType = discountType;
    invoice.discountValue = discountValue;
    invoice.invoiceType = invoiceType;
    invoice.taxableAmount = computed.taxableAmount;
    invoice.gstAmount = computed.gstAmount;
    invoice.cgstAmount = computed.cgstAmount;
    invoice.sgstAmount = computed.sgstAmount;
    invoice.igstAmount = computed.igstAmount;
    invoice.grandTotal = computed.grandTotal;
  }

  if (data.invoiceDate != null) invoice.invoiceDate = data.invoiceDate;
  if (data.paidAmount != null) invoice.paidAmount = data.paidAmount;

  invoice.balanceAmount = Math.max(invoice.grandTotal - invoice.paidAmount, 0);
  invoice.paymentStatus = derivePaymentStatus(invoice.paidAmount, invoice.grandTotal);

  await invoice.save();
  return invoice;
};

export const cancel = async (id) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.invoiceStatus === 'cancelled') {
    throw new AppError('Invoice is already cancelled', 400);
  }
  invoice.invoiceStatus = 'cancelled';
  await invoice.save();
  return invoice;
};

export default {
  createFromJobCard,
  getAll,
  getById,
  getByCustomerId,
  getByJobCardId,
  update,
  cancel,
};
