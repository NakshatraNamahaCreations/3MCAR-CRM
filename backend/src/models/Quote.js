import mongoose from 'mongoose';
const { Schema } = mongoose;

const lineItemSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  itemName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  taxPercentage: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const quoteSchema = new Schema(
  {
    quoteNumber: { type: String, required: true, unique: true, trim: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    customerName: { type: String, trim: true },
    phone: { type: String, trim: true, index: true },
    vehicleDetails: { type: String, trim: true },
    lineItems: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: { type: Number, default: 0 },
    taxType: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
    gstPercentage: { type: Number, default: 18 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    termsAndConditions: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'rejected', 'confirmed'],
      default: 'draft',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
