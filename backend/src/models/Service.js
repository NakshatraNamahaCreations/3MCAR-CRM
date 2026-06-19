import mongoose from 'mongoose';
const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    serviceName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    basePrice: {
      type: Number,
      default: 0,
    },
    gstPercentage: {
      type: Number,
      default: 18,
    },
    estimatedDuration: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Service || mongoose.model('Service', serviceSchema);
