import mongoose from 'mongoose';
const { Schema } = mongoose;

const vehicleSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    variant: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
    },
    vehicleType: {
      type: String,
      enum: ['', 'small', 'medium', 'large', 'extra_large'],
      default: '',
    },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'cng', 'electric', 'hybrid', 'other'],
      default: 'petrol',
    },
    color: {
      type: String,
      trim: true,
    },
    chassisNumber: {
      type: String,
      trim: true,
    },
    engineNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
