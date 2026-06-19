import Customer from '../models/Customer.js';
import Vehicle from '../models/Vehicle.js';
import Appointment from '../models/Appointment.js';
import JobCard from '../models/JobCard.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { AppError } from '../utils/apiResponse.js';
import generateNumber from '../utils/generateNumber.js';

export const createCustomer = async (payload) => {
  const {
    name,
    phone,
    alternatePhone,
    email,
    address,
    city,
    state,
    pincode,
    source,
    notes,
    createdFromEnquiryId,
    branchId,
  } = payload;

  if (!name || !phone) {
    throw new AppError('Customer name and phone are required', 400);
  }

  const customerCode = await generateNumber('CUST');

  const customer = await Customer.create({
    customerCode,
    name,
    phone,
    alternatePhone,
    email,
    address,
    city,
    state,
    pincode,
    source,
    notes,
    createdFromEnquiryId: createdFromEnquiryId || null,
    branchId,
  });

  return customer;
};

export const updateCustomer = async (id, payload) => {
  const allowed = [
    'name',
    'phone',
    'alternatePhone',
    'email',
    'address',
    'city',
    'state',
    'pincode',
    'source',
    'notes',
    'createdFromEnquiryId',
  ];

  const update = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }

  const customer = await Customer.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  return customer;
};

export const deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  return customer;
};

export const getAllCustomers = async (query = {}) => {
  const { search, city, state, source } = query;
  const filter = {};

  if (query.branchId) filter.branchId = query.branchId;
  if (city) filter.city = city;
  if (state) filter.state = state;
  if (source) filter.source = source;

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
  }

  const customers = await Customer.find(filter).sort({ createdAt: -1 });
  return customers;
};

export const getCustomerById = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  return customer;
};

export const getCustomerProfile = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const [vehicles, appointments, jobCards, invoices, payments] = await Promise.all([
    Vehicle.find({ customerId: id }).sort({ createdAt: -1 }),
    Appointment.find({ customerId: id })
      .populate('vehicleId')
      .sort({ appointmentDate: -1, createdAt: -1 }),
    JobCard.find({ customerId: id })
      .populate('vehicleId')
      .sort({ createdAt: -1 }),
    Invoice.find({ customerId: id }).sort({ invoiceDate: -1, createdAt: -1 }),
    Payment.find({ customerId: id }).sort({ paymentDate: -1, createdAt: -1 }),
  ]);

  return {
    customer,
    vehicles,
    appointments,
    jobCards,
    invoices,
    payments,
  };
};
