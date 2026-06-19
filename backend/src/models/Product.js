import mongoose from 'mongoose';
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    unitType: {
      type: String,
      enum: ['pcs', 'ml', 'litre', 'meter', 'sqft', 'roll', 'bottle', 'packet'],
      default: 'pcs',
    },
    purchasePrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    gstPercentage: {
      type: Number,
      default: 18,
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    minimumStock: {
      type: Number,
      default: 0,
    },
    openingStock: {
      type: Number,
      default: 0,
    },
    stockLocation: {
      type: String,
      trim: true,
    },
    supplierName: {
      type: String,
      trim: true,
    },
    isPPF: {
      type: Boolean,
      default: false,
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

export default mongoose.models.Product || mongoose.model('Product', productSchema);
