import Settings from '../models/Settings.js';

const ALLOWED_FIELDS = [
  'companyName', 'tagline', 'email', 'phone', 'address', 'gstin', 'pan',
  'upiId', 'upiDisplayName',
  'bankAccountName', 'bankName', 'bankAccountNumber', 'bankIfsc',
  'paymentAdvance', 'paymentBalance', 'paymentModes',
];

/** Return the singleton settings document, creating it on first access. */
export const getSettings = async () => {
  let doc = await Settings.findOne({ key: 'global' });
  if (!doc) doc = await Settings.create({ key: 'global' });
  return doc;
};

export const updateSettings = async (payload = {}) => {
  const update = {};
  for (const key of ALLOWED_FIELDS) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }
  const doc = await Settings.findOneAndUpdate(
    { key: 'global' },
    { $set: update, $setOnInsert: { key: 'global' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc;
};
