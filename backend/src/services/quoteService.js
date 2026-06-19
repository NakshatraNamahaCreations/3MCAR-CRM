import Quote from '../models/Quote.js';
import Enquiry from '../models/Enquiry.js';
import { AppError } from '../utils/apiResponse.js';
import calculateInvoice from '../utils/invoiceCalculator.js';
import generateNumber from '../utils/generateNumber.js';

const POPULATE = [
  { path: 'enquiryId', select: 'name phone vehicleNumber status' },
  { path: 'createdBy', select: 'name email role' },
  { path: 'lineItems.serviceId', select: 'name price' },
  { path: 'lineItems.productId', select: 'name sellingPrice' },
];

/**
 * Run the shared money math over a quote payload and fold the results back in.
 * Maps taxType -> invoiceType, recomputes each lineItem.total, subtotal, gst, total.
 */
const applyTotals = (payload) => {
  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];

  const computed = calculateInvoice({
    lineItems: lineItems.map((it) => ({
      ...(typeof it.toObject === 'function' ? it.toObject() : it),
      taxPercentage:
        payload.taxType === 'Non-GST'
          ? 0
          : it.taxPercentage ?? payload.gstPercentage ?? 0,
    })),
    discountType: payload.discountType || 'percentage',
    discountValue: payload.discountValue || 0,
    invoiceType: payload.taxType === 'Non-GST' ? 'Non-GST' : 'GST',
  });

  return {
    ...payload,
    lineItems: computed.lineItems,
    subtotal: computed.subtotal,
    gstAmount: computed.gstAmount,
    totalAmount: computed.grandTotal,
  };
};

/**
 * Create a quote. If enquiryId is provided, customer/vehicle details are
 * prefilled from that enquiry. Otherwise a standalone quote is created and
 * customerName + phone must be supplied directly (e.g. for a walk-in).
 */
export const createQuoteFromEnquiry = async (payload, userId) => {
  const { enquiryId } = payload;

  let customerName = payload.customerName;
  let phone = payload.phone;
  let vehicleDetails = payload.vehicleDetails;

  if (enquiryId) {
    const enquiry = await Enquiry.findById(enquiryId);
    if (!enquiry) throw new AppError('Enquiry not found', 404);

    customerName = customerName || enquiry.name;
    phone = phone || enquiry.phone;
    vehicleDetails =
      vehicleDetails ||
      [enquiry.vehicleBrand, enquiry.vehicleModel, enquiry.vehicleYear, enquiry.vehicleNumber]
        .filter(Boolean)
        .join(' ')
        .trim();
  } else {
    if (!customerName || !phone) {
      throw new AppError('customerName and phone are required for a standalone quote', 400);
    }
  }

  const base = {
    ...payload,
    enquiryId: enquiryId || undefined,
    customerName,
    phone,
    vehicleDetails,
    createdBy: userId,
    quoteNumber: await generateNumber('QT'),
  };

  const data = applyTotals(base);
  const quote = await Quote.create(data);
  return Quote.findById(quote._id).populate(POPULATE);
};

/**
 * List quotes with optional filters and search.
 * Filters: status, enquiryId. Search (regex): quoteNumber, customerName, phone.
 */
export const getAllQuotes = async (query = {}) => {
  const { status, enquiryId, search } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;
  if (status) filter.status = status;
  if (enquiryId) filter.enquiryId = enquiryId;

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ quoteNumber: regex }, { customerName: regex }, { phone: regex }];
  }

  return Quote.find(filter).populate(POPULATE).sort({ createdAt: -1 });
};

/**
 * Get a single quote by id.
 */
export const getQuoteById = async (id) => {
  const quote = await Quote.findById(id).populate(POPULATE);
  if (!quote) throw new AppError('Quote not found', 404);
  return quote;
};

/**
 * Get all quotes for a given enquiry.
 */
export const getQuotesByEnquiryId = async (enquiryId) => {
  return Quote.find({ enquiryId }).populate(POPULATE).sort({ createdAt: -1 });
};

/**
 * Update a quote and recompute totals.
 */
export const updateQuote = async (id, payload) => {
  const existing = await Quote.findById(id);
  if (!existing) throw new AppError('Quote not found', 404);

  const update = { ...payload };
  delete update.createdBy;
  delete update.quoteNumber;

  // Merge with existing values so the calculator always has full context.
  const merged = {
    lineItems: update.lineItems ?? existing.lineItems,
    discountType: update.discountType ?? existing.discountType,
    discountValue: update.discountValue ?? existing.discountValue,
    taxType: update.taxType ?? existing.taxType,
    gstPercentage: update.gstPercentage ?? existing.gstPercentage,
  };

  const totals = applyTotals(merged);
  update.lineItems = totals.lineItems;
  update.subtotal = totals.subtotal;
  update.gstAmount = totals.gstAmount;
  update.totalAmount = totals.totalAmount;

  const quote = await Quote.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate(POPULATE);

  return quote;
};

/**
 * Change a quote's status. Stamps confirmedAt when confirmed.
 */
export const changeQuoteStatus = async (id, status) => {
  const allowed = ['draft', 'sent', 'rejected', 'confirmed'];
  if (!allowed.includes(status)) throw new AppError('Invalid status', 400);

  const update = { status };
  if (status === 'confirmed') update.confirmedAt = new Date();

  const quote = await Quote.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate(POPULATE);

  if (!quote) throw new AppError('Quote not found', 404);
  return quote;
};

/**
 * Delete a quote.
 */
export const deleteQuote = async (id) => {
  const quote = await Quote.findByIdAndDelete(id);
  if (!quote) throw new AppError('Quote not found', 404);
  return { _id: id };
};
