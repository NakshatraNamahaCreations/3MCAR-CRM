import JobCard from '../models/JobCard.js';
import Appointment from '../models/Appointment.js';
import Quote from '../models/Quote.js';
import Product from '../models/Product.js';
import PPFUsage from '../models/PPFUsage.js';
import { AppError } from '../utils/apiResponse.js';
import generateNumber from '../utils/generateNumber.js';
import { applyStockMovement } from '../utils/stockHelper.js';
import { deductPPFStock } from '../utils/ppfHelper.js';

/**
 * Create a job card from an existing appointment.
 *
 * Pulls the linked (confirmed) quote's line items:
 *  - service items -> selectedServices
 *  - product items -> productUsage, with stock deducted IMMEDIATELY (the quote
 *    is confirmed, so the products are committed). Each deducted line is marked
 *    `deducted: true` so completion doesn't double-deduct. If a product is short
 *    on stock, it's still added but left un-deducted (it deducts at completion).
 *
 * Idempotent: if a job card already exists for the appointment, returns it
 * instead of creating a duplicate (prevents double stock deduction).
 */
export const createFromAppointment = async (appointmentId, userId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new AppError('Appointment not found.', 404);

  // Idempotency guard — never create twice / never double-deduct.
  const existing = await JobCard.findOne({ appointmentId: appointment._id });
  if (existing) return existing;

  const quote = appointment.quoteId ? await Quote.findById(appointment.quoteId) : null;

  let selectedServices = [];
  const productUsage = [];

  if (quote && Array.isArray(quote.lineItems) && quote.lineItems.length) {
    for (const li of quote.lineItems) {
      const qty = li.quantity || 1;
      const unitPrice = li.unitPrice || 0;
      if (li.productId) {
        productUsage.push({
          productId: li.productId,
          productName: li.itemName,
          quantity: qty,
          unitPrice,
          total: li.total != null ? li.total : qty * unitPrice,
          deducted: false,
        });
      } else {
        selectedServices.push({
          serviceId: li.serviceId,
          serviceName: li.itemName,
          price: unitPrice,
          gstPercentage: li.taxPercentage || 0,
        });
      }
    }
  } else {
    // Manual appointment (no quote) — fall back to the appointment's services.
    selectedServices = (appointment.selectedServices || []).map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      price: s.price || 0,
      gstPercentage: 0,
    }));
  }

  const jobCardNumber = await generateNumber('JC');
  const jobCard = await JobCard.create({
    jobCardNumber,
    branchId: appointment.branchId,
    appointmentId: appointment._id,
    enquiryId: appointment.enquiryId,
    quoteId: appointment.quoteId,
    customerId: appointment.customerId,
    vehicleId: appointment.vehicleId,
    selectedServices,
    productUsage,
    status: 'created',
    createdBy: userId,
  });

  // Deduct stock now for the confirmed quote's products (best-effort per item).
  if (productUsage.length) {
    for (const usage of jobCard.productUsage) {
      if (usage.deducted || !usage.productId || !(usage.quantity > 0)) continue;
      try {
        await applyStockMovement({
          productId: usage.productId,
          movementType: 'usage',
          quantity: usage.quantity,
          referenceType: 'job_card',
          referenceId: jobCard._id,
          remarks: `Confirmed quote ${quote?.quoteNumber || ''} - job card ${jobCard.jobCardNumber}`,
          createdBy: userId,
        });
        usage.deducted = true;
      } catch {
        // Insufficient stock — leave un-deducted; it will deduct at completion.
        usage.deducted = false;
      }
    }
    await jobCard.save();
  }

  return jobCard;
};

/** Manually create a job card. */
export const create = async (payload, userId) => {
  const jobCardNumber = await generateNumber('JC');
  const jobCard = await JobCard.create({
    ...payload,
    jobCardNumber,
    status: payload.status || 'created',
    createdBy: userId,
  });
  return jobCard;
};

/** Update a job card. */
export const update = async (id, payload) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  // Protect immutable / lifecycle fields from arbitrary overwrite.
  const blocked = ['jobCardNumber', 'createdBy', 'stockDeducted'];
  Object.keys(payload).forEach((key) => {
    if (!blocked.includes(key)) jobCard[key] = payload[key];
  });

  await jobCard.save();
  return jobCard;
};

/** Delete a job card. */
export const remove = async (id) => {
  const jobCard = await JobCard.findByIdAndDelete(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);
  return jobCard;
};

/** List job cards with optional filters and search. */
export const getAll = async (query = {}) => {
  const { status, customerId, technicianId, search, branchId } = query;
  const filter = {};

  if (branchId) filter.branchId = branchId;
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;
  if (technicianId) filter.assignedTechnicianId = technicianId;
  if (search) filter.jobCardNumber = { $regex: search, $options: 'i' };

  return JobCard.find(filter)
    .populate('customerId')
    .populate('vehicleId')
    .populate('assignedTechnicianId')
    .populate('serviceAdvisorId')
    .sort({ createdAt: -1 });
};

/** Get a single job card by id with populated references. */
export const getById = async (id) => {
  const jobCard = await JobCard.findById(id)
    .populate('customerId')
    .populate('vehicleId')
    .populate('assignedTechnicianId')
    .populate('serviceAdvisorId');
  if (!jobCard) throw new AppError('Job card not found.', 404);
  return jobCard;
};

/** Assign a technician (and optionally a service advisor) -> status='assigned'. */
export const assignTechnician = async (id, { assignedTechnicianId, serviceAdvisorId }) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);
  if (!assignedTechnicianId) throw new AppError('assignedTechnicianId is required.', 400);

  jobCard.assignedTechnicianId = assignedTechnicianId;
  if (serviceAdvisorId) jobCard.serviceAdvisorId = serviceAdvisorId;
  jobCard.status = 'assigned';

  await jobCard.save();
  return jobCard;
};

/** Start work -> status='work_started', startTime=now. */
export const startWork = async (id) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  jobCard.status = 'work_started';
  jobCard.startTime = new Date();

  await jobCard.save();
  return jobCard;
};

/**
 * Add product usage. Looks up Product for name/price. Does NOT deduct stock yet.
 */
export const addProductUsage = async (id, { productId, quantity }) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  const qty = Number(quantity) || 0;
  if (qty <= 0) throw new AppError('Quantity must be greater than zero.', 400);

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found.', 404);

  const unitPrice = product.sellingPrice || 0;
  jobCard.productUsage.push({
    productId: product._id,
    productName: product.productName,
    quantity: qty,
    unitPrice,
    total: qty * unitPrice,
    deducted: false,
  });

  await jobCard.save();
  return jobCard;
};

/**
 * Add PPF usage. Creates a PPFUsage doc and pushes a summary into the job card.
 * Does NOT deduct stock yet.
 */
export const addPPFUsage = async (id, payload, userId) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  if (!payload.ppfProductId) throw new AppError('ppfProductId is required.', 400);

  const ppfDoc = await PPFUsage.create({
    ...payload,
    jobCardId: jobCard._id,
    customerId: payload.customerId || jobCard.customerId,
    vehicleId: payload.vehicleId || jobCard.vehicleId,
    technicianId: payload.technicianId || jobCard.assignedTechnicianId,
    usageDate: payload.usageDate || new Date(),
    deducted: false,
    createdBy: userId,
  });

  jobCard.ppfUsage.push({
    ppfUsageId: ppfDoc._id,
    ppfProductId: ppfDoc.ppfProductId,
    usedSqft: ppfDoc.usedSqft || 0,
    wastageSqft: ppfDoc.wastageSqft || 0,
    total: payload.total || 0,
  });

  await jobCard.save();
  return { jobCard, ppfUsage: ppfDoc };
};

/**
 * Complete the job card. Sets status/completedTime, then deducts all pending
 * product and PPF stock and marks the job card stockDeducted.
 */
export const completeJobCard = async (id, userId) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  jobCard.status = 'work_completed';
  jobCard.completedTime = new Date();

  // Deduct product stock for any usage not yet deducted.
  for (const usage of jobCard.productUsage) {
    if (!usage.deducted && usage.productId && usage.quantity > 0) {
      await applyStockMovement({
        productId: usage.productId,
        movementType: 'usage',
        quantity: usage.quantity,
        referenceType: 'job_card',
        referenceId: jobCard._id,
        createdBy: userId,
      });
      usage.deducted = true;
    }
  }

  // Deduct PPF stock for each linked PPFUsage doc not yet deducted.
  for (const ppf of jobCard.ppfUsage) {
    if (!ppf.ppfUsageId) continue;
    const ppfDoc = await PPFUsage.findById(ppf.ppfUsageId);
    if (ppfDoc && !ppfDoc.deducted) {
      await deductPPFStock({ ppfUsage: ppfDoc, createdBy: userId });
      ppfDoc.deducted = true;
      await ppfDoc.save();
    }
  }

  jobCard.stockDeducted = true;
  await jobCard.save();
  return jobCard;
};

/** Mark delivered. Only allowed when status==='paid'. */
export const markDelivered = async (id) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  if (jobCard.status !== 'paid') {
    throw new AppError('Job card can only be delivered after payment is completed.', 400);
  }

  jobCard.status = 'delivered';
  await jobCard.save();
  return jobCard;
};

/**
 * Generate an invoice from this job card.
 * Delegates to the invoice service, then flags the job card.
 */
export const generateInvoiceFromJobCard = async (id, userId) => {
  const jobCard = await JobCard.findById(id);
  if (!jobCard) throw new AppError('Job card not found.', 404);

  const { createFromJobCard } = await import('../services/invoiceService.js');
  const invoice = await createFromJobCard(jobCard._id, userId);

  jobCard.status = 'invoice_generated';
  await jobCard.save();

  return invoice;
};

export default {
  createFromAppointment,
  create,
  update,
  remove,
  getAll,
  getById,
  assignTechnician,
  startWork,
  addProductUsage,
  addPPFUsage,
  completeJobCard,
  markDelivered,
  generateInvoiceFromJobCard,
};
