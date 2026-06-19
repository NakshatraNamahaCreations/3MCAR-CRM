import mongoose from 'mongoose';

const { Schema } = mongoose;

const ppfUsageSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    jobCardId: { type: Schema.Types.ObjectId, ref: 'JobCard', index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    vehicleNumber: { type: String, trim: true },
    carBrand: { type: String, trim: true },
    carModel: { type: String, trim: true },
    vehicleType: { type: String, enum: ['', 'small', 'medium', 'large', 'extra_large'], default: '' },
    ppfProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    ppfRollName: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    totalRollSqft: { type: Number, default: 0 },
    usedSqft: { type: Number, required: true, default: 0 },
    wastageSqft: { type: Number, default: 0 },
    remainingSqft: { type: Number, default: 0 },
    usageArea: { type: String, trim: true },
    usageDate: { type: Date, index: true },
    technicianId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    remarks: { type: String, trim: true },
    deducted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ppfUsageSchema.pre('save', function (next) {
  if (this.totalRollSqft) {
    this.remainingSqft = this.totalRollSqft - (this.usedSqft + this.wastageSqft);
  }
  next();
});

export default mongoose.models.PPFUsage || mongoose.model('PPFUsage', ppfUsageSchema);
