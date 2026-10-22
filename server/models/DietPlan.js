import mongoose from 'mongoose';

const dietPlanSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meals: [{
    name: { type: String, required: true, trim: true, maxlength: 100 },
    timing: { type: String, trim: true, maxlength: 100 },
    suggestions: { type: String, required: true, trim: true, maxlength: 2000 },
  }],
  notes: { type: String, trim: true, maxlength: 2000 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('DietPlan', dietPlanSchema);
