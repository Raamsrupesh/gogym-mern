import mongoose from 'mongoose';

const trainerNoteSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekOf: { type: Date, required: true },
  observations: { type: String, trim: true, maxlength: 3000 },
  strengths: { type: String, trim: true, maxlength: 2000 },
  improvements: { type: String, trim: true, maxlength: 2000 },
  goals: { type: String, trim: true, maxlength: 2000 },
  nextWeekAdjustments: { type: String, trim: true, maxlength: 2000 },
  visibility: { type: String, enum: ['private', 'published'], default: 'private', index: true },
}, { timestamps: true });

trainerNoteSchema.index({ member: 1, weekOf: -1 });
export default mongoose.model('TrainerNote', trainerNoteSchema);
