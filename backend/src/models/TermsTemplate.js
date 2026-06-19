import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Reusable Terms & Conditions template. Selected (one or many) when creating a
 * quote/invoice; their content is combined into the document's terms text.
 */
const termsTemplateSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    title: { type: String, required: true, trim: true, index: true },
    content: { type: String, required: true, trim: true },
    appliesTo: { type: String, enum: ['quote', 'invoice', 'both'], default: 'quote', index: true },
    isDefault: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.TermsTemplate || mongoose.model('TermsTemplate', termsTemplateSchema);
