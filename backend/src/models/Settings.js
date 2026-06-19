import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Global company settings — a single document (singleton).
 * Holds company identity, bank/UPI details and payment terms that appear
 * on quotations and invoices.
 */
const settingsSchema = new Schema(
  {
    // Singleton guard: always the string 'global'.
    key: { type: String, default: 'global', unique: true, index: true },

    // Company information
    companyName: { type: String, trim: true, default: '' },
    tagline: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, default: '' },
    pan: { type: String, trim: true, default: '' },

    // UPI / payment
    upiId: { type: String, trim: true, default: '' },
    upiDisplayName: { type: String, trim: true, default: '' },

    // Bank details
    bankAccountName: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    bankAccountNumber: { type: String, trim: true, default: '' },
    bankIfsc: { type: String, trim: true, default: '' },

    // Payment terms (shown on quotation)
    paymentAdvance: { type: String, trim: true, default: '' },
    paymentBalance: { type: String, trim: true, default: '' },
    paymentModes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
