import mongoose from 'mongoose';
const { Schema } = mongoose;

const salarySchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    salaryMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    salaryYear: {
      type: Number,
      required: true,
      index: true,
    },
    salaryType: {
      type: String,
      enum: ['monthly', 'daily', 'hourly'],
      default: 'monthly',
    },
    basicSalary: {
      type: Number,
      default: 0,
    },
    // Earnings breakdown (captured from the employee's salary structure)
    hra: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    // Statutory deductions
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    attendanceDeduction: { type: Number, default: 0 },
    totalWorkingDays: {
      type: Number,
      default: 0,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
    },
    paidLeaves: {
      type: Number,
      default: 0,
    },
    unpaidLeaves: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    overtimeAmount: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    advanceDeduction: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentDate: {
      type: Date,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'],
      default: 'bank_transfer',
    },
    transactionId: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

salarySchema.index(
  { employeeId: 1, salaryMonth: 1, salaryYear: 1 },
  { unique: true }
);

export default mongoose.models.Salary || mongoose.model('Salary', salarySchema);
