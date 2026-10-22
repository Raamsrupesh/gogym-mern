import mongoose from 'mongoose';

const workoutPerformanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exercise: { type: String, required: true, trim: true, maxlength: 120 },
  performedAt: { type: Date, required: true, default: Date.now, index: true },
  weight: { type: Number, min: 0 },
  sets: { type: Number, required: true, min: 1 },
  reps: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true, maxlength: 1000 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

workoutPerformanceSchema.index({ member: 1, exercise: 1, performedAt: 1 });
export default mongoose.model('WorkoutPerformance', workoutPerformanceSchema);
