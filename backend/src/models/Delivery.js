import mongoose from 'mongoose';
const { Schema } = mongoose;

const deliverySchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    jobCardId: {
      type: Schema.Types.ObjectId,
      ref: 'JobCard',
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    deliveryDate: {
      type: Date,
      index: true,
    },
    deliveryTime: {
      type: String,
      trim: true,
    },
    deliveredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customerSignature: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);
