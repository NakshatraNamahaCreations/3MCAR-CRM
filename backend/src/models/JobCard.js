import mongoose from 'mongoose';

const { Schema } = mongoose;

const selectedServiceSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    serviceName: { type: String, trim: true },
    price: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const productUsageSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, trim: true },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    deducted: { type: Boolean, default: false },
  },
  { _id: false }
);

const ppfUsageSchema = new Schema(
  {
    ppfUsageId: { type: Schema.Types.ObjectId, ref: 'PPFUsage' },
    ppfProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    usedSqft: { type: Number, default: 0 },
    wastageSqft: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const additionalChargeSchema = new Schema(
  {
    label: { type: String, trim: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const jobCardSchema = new Schema(
  {
    jobCardNumber: { type: String, required: true, unique: true, trim: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    serviceAdvisorId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    selectedServices: { type: [selectedServiceSchema], default: [] },
    productUsage: { type: [productUsageSchema], default: [] },
    ppfUsage: { type: [ppfUsageSchema], default: [] },
    labourCharges: { type: Number, default: 0 },
    additionalCharges: { type: [additionalChargeSchema], default: [] },
    status: {
      type: String,
      enum: [
        'created',
        'assigned',
        'work_started',
        'work_completed',
        'invoice_generated',
        'paid',
        'delivered',
        'cancelled',
      ],
      default: 'created',
      index: true,
    },
    startTime: { type: Date },
    completedTime: { type: Date },
    customerComplaints: { type: String, trim: true },
    technicianNotes: { type: String, trim: true },
    finalRemarks: { type: String, trim: true },
    stockDeducted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.JobCard || mongoose.model('JobCard', jobCardSchema);
