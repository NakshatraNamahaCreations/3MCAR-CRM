import mongoose from 'mongoose';
const { Schema } = mongoose;

const stockMovementSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    movementType: {
      type: String,
      enum: ['stock_in', 'stock_out', 'usage', 'adjustment', 'return'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      default: 0,
    },
    newStock: {
      type: Number,
      default: 0,
    },
    referenceType: {
      type: String,
      enum: ['job_card', 'purchase', 'manual', 'ppf_usage'],
      default: 'manual',
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema);
