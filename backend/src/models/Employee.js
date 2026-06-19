import mongoose from 'mongoose';

const { Schema } = mongoose;

const documentSchema = new Schema(
  {
    name: { type: String, trim: true },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const employeeSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    employeeCode: { type: String, trim: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    role: {
      type: String,
      enum: [
        'admin',
        'manager',
        'technician',
        'service_advisor',
        'accountant',
        'hr',
        'cleaner',
        'helper',
        'driver',
      ],
      default: 'technician',
      index: true,
    },
    designation: { type: String, trim: true },
    department: { type: String, trim: true, index: true },
    joiningDate: { type: Date },
    salaryType: {
      type: String,
      enum: ['monthly', 'daily', 'hourly'],
      default: 'monthly',
    },
    basicSalary: { type: Number, default: 0 },
    dailyWage: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    // Salary structure — earnings (monthly)
    hra: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    // Salary structure — statutory deductions (monthly)
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    documents: { type: [documentSchema], default: [] },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'resigned', 'terminated'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
