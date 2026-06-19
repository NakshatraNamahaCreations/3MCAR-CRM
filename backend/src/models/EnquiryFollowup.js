import mongoose from 'mongoose';

const { Schema } = mongoose;

const enquiryFollowupSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    enquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'Enquiry',
      required: true,
      index: true,
    },
    followupDate: {
      type: Date,
      required: true,
      index: true,
    },
    followupTime: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['call_later', 'confirmed', 'pending', 'not_interested'],
      default: 'pending',
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.models.EnquiryFollowup || mongoose.model('EnquiryFollowup', enquiryFollowupSchema);
