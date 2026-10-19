import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'main', unique: true },
  businessName: { type: String, default: 'GoGym' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '' },
  openingHours: { type: String, default: '' },
  mapLink: { type: String, default: '' },
  facilities: [String],
  refundPolicy: { type: String, default: '' },
  termsUrl: { type: String, default: '/terms' },
  privacyUrl: { type: String, default: '/privacy' },
  taxConfig: {
    isGstRegistered: { type: Boolean, default: false },
    gstin: { type: String, default: '' },
    taxRatePct: { type: Number, default: 0 },
    sac: { type: String, default: '' },
  },
  chatbotKnowledge: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);