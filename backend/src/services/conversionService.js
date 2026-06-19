import Quote from '../models/Quote.js';
import Enquiry from '../models/Enquiry.js';
import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import Appointment from '../models/Appointment.js';
import generateNumber from '../utils/generateNumber.js';
import { AppError } from '../utils/apiResponse.js';

/**
 * Try to pull an Indian-style registration number out of free-text vehicle
 * details (e.g. "Toyota Innova KA01AB1234"). Returns null if none found.
 */
const deriveVehicleNumber = (text) => {
  if (!text) return null;
  const compact = String(text).toUpperCase().replace(/\s|-/g, '');
  const m = compact.match(/[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}/);
  return m ? m[0] : null;
};

/**
 * Accept a quote and convert the originating enquiry into a customer,
 * (optionally) a vehicle, and a draft appointment.
 *
 * Idempotent: re-running for an already-accepted quote will not create
 * duplicate customers/vehicles/appointments.
 *
 * @param {string} quoteId
 * @param {string} userId - acting user (req.user._id)
 * @returns {Promise<{quote, enquiry, customer, vehicle, appointment}>}
 */
export const acceptQuoteAndConvert = async (quoteId, userId, options = {}) => {
  const quote = await Quote.findById(quoteId);
  if (!quote) {
    throw new AppError('Quote not found', 404);
  }

  // ---- Quote: mark confirmed ----
  if (quote.status !== 'confirmed') {
    quote.status = 'confirmed';
    quote.confirmedAt = new Date();
    await quote.save();
  }

  const branchId = quote.branchId || undefined;

  // ---- Enquiry (optional — standalone quotes have none) ----
  let enquiry = null;
  if (quote.enquiryId) {
    enquiry = await Enquiry.findById(quote.enquiryId);
    if (enquiry) {
      enquiry.status = 'converted';
      if (!enquiry.convertedAt) enquiry.convertedAt = new Date();
    }
  }

  // Source of customer details: the enquiry if present, else the quote itself.
  const custName = enquiry?.name || quote.customerName;
  const custPhone = enquiry?.phone || quote.phone;

  if (!custName || !custPhone) {
    throw new AppError('Quote has no customer name/phone to convert', 400);
  }

  // ---- Customer (reuse by enquiry link, then phone within branch, else create) ----
  let customer = null;
  if (enquiry?.customerId) customer = await Customer.findById(enquiry.customerId);
  if (!customer && custPhone) {
    customer = await Customer.findOne({ phone: custPhone, ...(branchId ? { branchId } : {}) });
  }
  if (!customer) {
    const customerCode = await generateNumber('CUST');
    customer = await Customer.create({
      branchId,
      customerCode,
      name: custName,
      phone: custPhone,
      alternatePhone: enquiry?.alternatePhone,
      email: enquiry?.email,
      source: enquiry?.source,
      createdFromEnquiryId: enquiry?._id,
    });
  }

  if (enquiry) {
    enquiry.customerId = customer._id;
    await enquiry.save();
  }

  // ---- Vehicle ----
  // A vehicle record requires a vehicleNumber. Enquiries carry one; standalone
  // quotes only have free-text vehicleDetails, so we derive a number when the
  // text looks like a plate, otherwise skip (vehicle added later at job-card time).
  let vehicle = null;
  const vehicleNumber = enquiry?.vehicleNumber || deriveVehicleNumber(quote.vehicleDetails);
  if (vehicleNumber) {
    vehicle = await Vehicle.findOne({ customerId: customer._id, vehicleNumber });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        branchId,
        customerId: customer._id,
        vehicleNumber,
        brand: enquiry?.vehicleBrand,
        model: enquiry?.vehicleModel,
        year: enquiry?.vehicleYear,
        vehicleType: enquiry?.vehicleType || '',
        notes: enquiry ? undefined : quote.vehicleDetails,
      });
    }
  }

  // ---- Appointment (idempotent: reuse existing for this quote) ----
  const apptDate = options.appointmentDate || undefined;
  const apptTime = options.appointmentTime || undefined;
  // If a date was supplied, schedule it; otherwise keep it a draft.
  const apptStatus = apptDate ? 'scheduled' : 'draft';

  let appointment = await Appointment.findOne({ quoteId: quote._id });
  if (!appointment) {
    // No need to copy the quote's items here — the appointment links to the
    // quote (quoteId) which is the source of truth; the job card pulls items
    // from the quote on creation. Keeps the appointment lightweight.
    const appointmentNumber = await generateNumber('APT');
    appointment = await Appointment.create({
      branchId,
      appointmentNumber,
      enquiryId: enquiry?._id,
      quoteId: quote._id,
      customerId: customer._id,
      vehicleId: vehicle ? vehicle._id : undefined,
      serviceType: quote.vehicleDetails || undefined,
      appointmentDate: apptDate,
      appointmentTime: apptTime,
      status: apptStatus,
      createdBy: userId,
    });
  } else if (apptDate) {
    // Update date/time on a re-confirm if newly provided.
    appointment.appointmentDate = apptDate;
    appointment.appointmentTime = apptTime;
    if (appointment.status === 'draft') appointment.status = 'scheduled';
    await appointment.save();
  }

  return { quote, enquiry, customer, vehicle, appointment };
};

export default { acceptQuoteAndConvert };
