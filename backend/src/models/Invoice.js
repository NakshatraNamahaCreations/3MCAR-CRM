import mongoose from 'mongoose';

const { Schema } = mongoose;

const lineItemSchema = new Schema(
  {
    itemType: {
      type: String,
      enum: ['service', 'product', 'ppf', 'labour', 'additional'],
      required: true,
    },
    name: { type: String, trim: true, required: true },
    description: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    taxPercentage: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    jobCardId: { type: Schema.Types.ObjectId, ref: 'JobCard', index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    invoiceDate: { type: Date, index: true },
    invoiceType: {
      type: String,
      enum: ['GST', 'Non-GST'],
      default: 'GST',
    },
    lineItems: { type: [lineItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
      index: true,
    },
    invoiceStatus: {
      type: String,
      enum: ['generated', 'cancelled'],
      default: 'generated',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
