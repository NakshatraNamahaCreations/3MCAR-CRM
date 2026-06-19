import mongoose from 'mongoose';
const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    totalWorkingHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'present',
        'absent',
        'half_day',
        'paid_leave',
        'unpaid_leave',
        'weekly_off',
        'holiday',
      ],
      default: 'present',
      index: true,
    },
    lateMark: {
      type: Boolean,
      default: false,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
