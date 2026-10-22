import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  membership: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership' },
  checkedInAt: { type: Date, default: Date.now, index: true },
  dayKey: { type: String, index: true },
  method: { type: String, enum: ['manual', 'qr', 'fingerprint'], default: 'manual' },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

attendanceSchema.index(
  { member: 1, dayKey: 1 },
  { unique: true, partialFilterExpression: { dayKey: { $type: 'string' } } }
);
export default mongoose.model('Attendance', attendanceSchema);