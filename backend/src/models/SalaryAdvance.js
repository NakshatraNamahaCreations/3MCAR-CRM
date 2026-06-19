import mongoose from 'mongoose';
const { Schema } = mongoose;

const salaryAdvanceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    advanceDate: {
      type: Date,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'],
      default: 'cash',
    },
    repaymentMode: {
      type: String,
      enum: ['salary_deduction', 'manual'],
      default: 'salary_deduction',
    },
    deductionMonth: {
      type: Number,
      min: 1,
      max: 12,
    },
    deductionYear: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'deducted'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    pettyCashId: {
      type: Schema.Types.ObjectId,
      ref: 'PettyCash',
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.SalaryAdvance || mongoose.model('SalaryAdvance', salaryAdvanceSchema);
