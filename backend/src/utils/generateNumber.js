/**
 * Sequential, human-readable document number generator.
 *
 * Produces values like ENQ-2026-000001, JC-2026-000123, INV-2026-000045.
 * Uses an atomic Counter collection so numbers are unique and gap-free per (prefix, year).
 */
import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { collection: 'counters' }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next number for a given prefix.
 * @param {string} prefix e.g. 'ENQ', 'JC', 'INV'
 * @param {object} [opts]
 * @param {number} [opts.year] defaults to current year
 * @param {number} [opts.pad] zero-pad width, default 6
 * @returns {Promise<string>} e.g. 'ENQ-2026-000001'
 */
export const generateNumber = async (prefix, opts = {}) => {
  const year = opts.year ?? new Date().getFullYear();
  const pad = opts.pad ?? 6;
  const key = `${prefix}-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seqStr = String(counter.seq).padStart(pad, '0');
  return `${prefix}-${year}-${seqStr}`;
};

export { Counter };
export default generateNumber;
