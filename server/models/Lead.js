import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  name: String, phone: String, email: String,
  message: String,
  source: { type: String, default: 'website' },
  status: { type: String, enum: ['new', 'contacted', 'trial', 'converted', 'lost'], default: 'new', index: true },
  notes: String,
  lastContactAt: Date,
  nextActionAt: Date,
  convertedMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);