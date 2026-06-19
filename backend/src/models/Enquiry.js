import mongoose from 'mongoose';

const { Schema } = mongoose;

const enquirySchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      index: true,
    },
    vehicleBrand: {
      type: String,
      trim: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    vehicleYear: {
      type: Number,
    },
    vehicleType: {
      type: String,
      enum: ['', 'small', 'medium', 'large', 'extra_large'],
      default: '',
    },
    servicesInterested: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      enum: [
        'walk_in',
        'phone_call',
        'referral',
        'website',
        'social_media',
        'existing_customer',
        'other',
      ],
      default: 'walk_in',
    },
    status: {
      type: String,
      enum: ['hot', 'warm', 'cold', 'converted', 'lost'],
      default: 'warm',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    convertedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);
