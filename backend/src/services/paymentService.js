import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import JobCard from '../models/JobCard.js';
import { AppError } from '../utils/apiResponse.js';

/**
 * Recompute an invoice's paid/balance/status from the sum of its payments.
 * Also flips the linked JobCard to 'paid' when fully settled.
 */
const recomputeInvoice = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);

  const agg = await Payment.aggregate([
    { $match: { invoiceId: new mongoose.Types.ObjectId(invoiceId) } },
    { $group: { _id: '$invoiceId', total: { $sum: '$amount' } } },
  ]);

  const paidAmount = agg.length ? agg[0].total : 0;
  const grandTotal = invoice.grandTotal || 0;
  const balanceAmount = grandTotal - paidAmount;

  let paymentStatus = 'unpaid';
  if (balanceAmount <= 0) paymentStatus = 'paid';
  else if (paidAmount > 0) paymentStatus = 'partial';

  invoice.paidAmount = paidAmount;
  invoice.balanceAmount = balanceAmount;
  invoice.paymentStatus = paymentStatus;
  await invoice.save();

  if (paymentStatus === 'paid' && invoice.jobCardId) {
    const jobCard = await JobCard.findById(invoice.jobCardId);
    if (jobCard && jobCard.status !== 'delivered' && jobCard.status !== 'cancelled') {
      jobCard.status = 'paid';
      await jobCard.save();
    }
  }

  return invoice;
};

export const addPayment = async (data, userId) => {
  const { invoiceId, amount, paymentMode } = data;
  if (!invoiceId) throw new AppError('invoiceId is required', 400);
  if (amount === undefined || amount === null || Number(amount) <= 0) {
    throw new AppError('amount must be greater than 0', 400);
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);

  const payment = await Payment.create({
    branchId: data.branchId,
    invoiceId,
    jobCardId: data.jobCardId || invoice.jobCardId,
    customerId: data.customerId || invoice.customerId,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
    amount: Number(amount),
    paymentMode: paymentMode || 'cash',
    transactionId: data.transactionId,
    remarks: data.remarks,
    receivedBy: userId,
  });

  const updatedInvoice = await recomputeInvoice(invoiceId);
  return { payment, invoice: updatedInvoice };
};

export const updatePayment = async (id, data) => {
  const payment = await Payment.findById(id);
  if (!payment) throw new AppError('Payment not found', 404);

  const fields = ['amount', 'paymentMode', 'transactionId', 'remarks', 'paymentDate'];
  fields.forEach((f) => {
    if (data[f] !== undefined) {
      if (f === 'paymentDate') payment.paymentDate = new Date(data[f]);
      else if (f === 'amount') payment.amount = Number(data[f]);
      else payment[f] = data[f];
    }
  });
  await payment.save();

  const invoice = await recomputeInvoice(payment.invoiceId);
  return { payment, invoice };
};

export const deletePayment = async (id) => {
  const payment = await Payment.findById(id);
  if (!payment) throw new AppError('Payment not found', 404);

  const invoiceId = payment.invoiceId;
  await payment.deleteOne();

  const invoice = await recomputeInvoice(invoiceId);
  return { invoice };
};

export const getAll = async (query = {}) => {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.invoiceId) filter.invoiceId = query.invoiceId;
  if (query.customerId) filter.customerId = query.customerId;
  if (query.paymentMode) filter.paymentMode = query.paymentMode;

  return Payment.find(filter)
    .populate('invoiceId', 'invoiceNumber grandTotal')
    .populate('customerId', 'name phone')
    .sort({ createdAt: -1 });
};

export const getByInvoiceId = async (invoiceId) => {
  return Payment.find({ invoiceId })
    .populate('receivedBy', 'name email role')
    .populate('customerId', 'name phone')
    .sort({ paymentDate: -1, createdAt: -1 });
};

export const getByCustomerId = async (customerId) => {
  return Payment.find({ customerId })
    .populate('invoiceId', 'invoiceNumber grandTotal paymentStatus')
    .populate('receivedBy', 'name email role')
    .sort({ paymentDate: -1, createdAt: -1 });
};

export const getSummary = async (filters = {}) => {
  const match = {};
  if (filters.branchId) match.branchId = new mongoose.Types.ObjectId(filters.branchId);
  if (filters.customerId) match.customerId = new mongoose.Types.ObjectId(filters.customerId);
  if (filters.paymentMode) match.paymentMode = filters.paymentMode;
  if (filters.from || filters.to) {
    match.paymentDate = {};
    if (filters.from) match.paymentDate.$gte = new Date(filters.from);
    if (filters.to) match.paymentDate.$lte = new Date(filters.to);
  }

  const byMode = await Payment.aggregate([
    { $match: match },
    { $group: { _id: '$paymentMode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = byMode.reduce((acc, m) => acc + m.total, 0);
  const totalCount = byMode.reduce((acc, m) => acc + m.count, 0);

  return {
    byPaymentMode: byMode.map((m) => ({ paymentMode: m._id, total: m.total, count: m.count })),
    grandTotal,
    totalCount,
  };
};

export const validateBeforeDelivery = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError('Invoice not found', 404);
  return {
    allowed: invoice.paymentStatus === 'paid',
    paymentStatus: invoice.paymentStatus,
    balanceAmount: invoice.balanceAmount,
  };
};
