import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'technician', 'service_advisor', 'accountant', 'hr'],
      default: 'service_advisor',
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    // Branches this user is assigned to. Admins may have none and still see all.
    branches: [{ type: Schema.Types.ObjectId, ref: 'Branch', index: true }],
    // The branch the user is currently working in (must be one of `branches`, or any for admin).
    activeBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    lastLoginAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.models.User || mongoose.model('User', userSchema);
