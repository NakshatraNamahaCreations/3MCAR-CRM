import Delivery from '../models/Delivery.js';
import Invoice from '../models/Invoice.js';
import JobCard from '../models/JobCard.js';
import Appointment from '../models/Appointment.js';
import { AppError } from '../utils/apiResponse.js';

export const deliverVehicle = async (data, userId) => {
  const { jobCardId } = data;
  if (!jobCardId) throw new AppError('jobCardId is required', 400);

  const jobCard = await JobCard.findById(jobCardId);
  if (!jobCard) throw new AppError('Job card not found', 404);

  // Locate the invoice tied to this job card (explicit or by lookup).
  let invoice = null;
  if (data.invoiceId) invoice = await Invoice.findById(data.invoiceId);
  if (!invoice) invoice = await Invoice.findOne({ jobCardId });
  if (!invoice) throw new AppError('No invoice found for this job card', 404);

  if (invoice.paymentStatus !== 'paid') {
    throw new AppError('Delivery blocked: invoice not fully paid', 400);
  }

  const delivery = await Delivery.create({
    branchId: data.branchId,
    jobCardId,
    invoiceId: invoice._id,
    customerId: data.customerId || jobCard.customerId,
    vehicleId: data.vehicleId || jobCard.vehicleId,
    deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
    deliveryTime: data.deliveryTime,
    deliveredBy: userId,
    customerSignature: data.customerSignature,
    remarks: data.remarks,
  });

  jobCard.status = 'delivered';
  await jobCard.save();

  if (jobCard.appointmentId) {
    const appointment = await Appointment.findById(jobCard.appointmentId);
    if (appointment && appointment.status !== 'cancelled') {
      appointment.status = 'completed';
      await appointment.save();
    }
  }

  return delivery;
};

export const getDeliveryDetails = async (jobCardId) => {
  const delivery = await Delivery.findOne({ jobCardId })
    .populate('jobCardId', 'jobCardNumber status')
    .populate('invoiceId', 'invoiceNumber grandTotal paymentStatus')
    .populate('customerId', 'name phone email')
    .populate('vehicleId', 'registrationNumber make model')
    .populate('deliveredBy', 'name email role');

  if (!delivery) throw new AppError('Delivery record not found', 404);
  return delivery;
};

export const getDelivered = async (filters = {}) => {
  const query = {};
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.deliveredBy) query.deliveredBy = filters.deliveredBy;
  if (filters.from || filters.to) {
    query.deliveryDate = {};
    if (filters.from) query.deliveryDate.$gte = new Date(filters.from);
    if (filters.to) query.deliveryDate.$lte = new Date(filters.to);
  }

  let mongoQuery = Delivery.find(query)
    .populate('jobCardId', 'jobCardNumber status')
    .populate('invoiceId', 'invoiceNumber grandTotal paymentStatus')
    .populate('customerId', 'name phone email')
    .populate('vehicleId', 'registrationNumber make model')
    .populate('deliveredBy', 'name email role')
    .sort({ deliveryDate: -1, createdAt: -1 });

  let results = await mongoQuery;

  if (filters.search) {
    const term = String(filters.search).toLowerCase();
    results = results.filter((d) => {
      const cust = d.customerId?.name?.toLowerCase() || '';
      const veh = d.vehicleId?.registrationNumber?.toLowerCase() || '';
      const jc = d.jobCardId?.jobCardNumber?.toLowerCase() || '';
      return cust.includes(term) || veh.includes(term) || jc.includes(term);
    });
  }

  return results;
};
