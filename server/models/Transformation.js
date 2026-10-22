import mongoose from 'mongoose';

const transformationSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  beforeImage: { type: String, required: true },
  afterImage: { type: String, required: true },
  description: { type: String, trim: true, maxlength: 2000 },
  beforeDate: Date,
  afterDate: Date,
  consentGranted: { type: Boolean, default: false },
  consentedAt: Date,
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
}, { timestamps: true });

export default mongoose.model('Transformation', transformationSchema);
