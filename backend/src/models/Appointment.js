import mongoose from 'mongoose';
const { Schema } = mongoose;

const selectedServiceSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    serviceName: { type: String, trim: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const appointmentSchema = new Schema(
  {
    appointmentNumber: { type: String, required: true, unique: true, trim: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    appointmentDate: { type: Date, index: true },
    appointmentTime: { type: String, trim: true },
    serviceType: { type: String, trim: true },
    selectedServices: { type: [selectedServiceSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
      default: 'draft',
      index: true,
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
