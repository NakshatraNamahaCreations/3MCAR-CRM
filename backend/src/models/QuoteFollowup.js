import mongoose from 'mongoose';
const { Schema } = mongoose;

const quoteFollowupSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    quoteId: {
      type: Schema.Types.ObjectId,
      ref: 'Quote',
      required: true,
      index: true,
    },
    enquiryId: {
      type: Schema.Types.ObjectId,
      ref: 'Enquiry',
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
      enum: ['pending', 'call_later', 'confirmed', 'not_interested'],
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
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.models.QuoteFollowup || mongoose.model('QuoteFollowup', quoteFollowupSchema);
