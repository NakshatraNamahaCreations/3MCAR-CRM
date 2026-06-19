import mongoose from 'mongoose';
const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    expenseDate: {
      type: Date,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'petty_cash', 'other'],
      default: 'cash',
      index: true,
    },
    paidTo: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    pettyCashId: {
      type: Schema.Types.ObjectId,
      ref: 'PettyCash',
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
