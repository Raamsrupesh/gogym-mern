import mongoose from 'mongoose';

const dietPlanSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, maxlength: 160, default: 'Personalized diet chart' },
  dietaryRestrictions: { type: String, trim: true, maxlength: 2000 },
  trainerNotes: { type: String, trim: true, maxlength: 2000 },
  meals: [{
    name: { type: String, required: true, trim: true, maxlength: 100 },
    timing: { type: String, trim: true, maxlength: 100 },
    suggestions: { type: String, required: true, trim: true, maxlength: 2000 },
  }],
  document: {
    filename: String,
    originalName: String,
    mimeType: String,
  },
  notes: { type: String, trim: true, maxlength: 2000 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('DietPlan', dietPlanSchema);
