import mongoose from 'mongoose';
const { Schema } = mongoose;

const pettyCashSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['cash_in', 'cash_out'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentPurpose: {
      type: String,
      trim: true,
    },
    paidTo: {
      type: String,
      trim: true,
    },
    receivedFrom: {
      type: String,
      trim: true,
    },
    referenceType: {
      type: String,
      enum: ['expense', 'salary_advance', 'salary_payment', 'purchase', 'refund', 'manual', 'other'],
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
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    closingBalance: {
      type: Number,
      default: 0,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.models.PettyCash || mongoose.model('PettyCash', pettyCashSchema);
