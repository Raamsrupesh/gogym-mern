import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sets: { type: Number, required: true, min: 1 },
  reps: { type: String, required: true, trim: true },
  targetWeight: { type: Number, min: 0 },
  restSeconds: { type: Number, min: 0 },
  instructions: { type: String, trim: true, maxlength: 2000 },
  day: { type: String, trim: true, maxlength: 40 },
  week: { type: Number, min: 1 },
});

const workoutPlanSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000 },
  exercises: { type: [exerciseSchema], validate: (items) => items.length > 0 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
}, { timestamps: true });

export default mongoose.model('WorkoutPlan', workoutPlanSchema);
